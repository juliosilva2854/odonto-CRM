"""SubscriptionGateMiddleware — bloqueia requests de clínicas inadimplentes.

Roda depois do ``RequestContextMiddleware``. Lê o JWT do header
``Authorization`` (não revalida a assinatura como autoridade — só precisamos
do claim ``clinic_id``), consulta o estado da assinatura no banco e devolve
**402 Payment Required** quando ela está inativa.

Regras:
- ``active``                                  → passa
- ``trialing`` e ``trial_ends_at`` no futuro  → passa
- ``trialing`` com trial expirado             → bloqueia
- ``past_due`` / ``canceled``                 → bloqueia

Rotas sempre liberadas (prefixo): ``/api/auth/*``, ``/api/billing/*``
(inclusive o webhook), ``/api/public/*``, ``/api/health``, ``/docs``,
``/redoc``, ``/api/docs``, ``/api/redoc``, ``/api/openapi.json``.

Requests anônimos (sem Bearer) não são bloqueados: quem decide é a rota,
que devolve 401 — assim login e signup nunca quebram.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

from fastapi import Request, Response
from sqlalchemy import select
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.core.security import TokenError, decode_token
from src.modules.tenancy.models import Clinic, SubscriptionStatus

_settings = get_settings()

ALLOWLIST_PREFIXES: list[str] = [
    "/api/auth",
    "/api/billing",
    "/api/public",
    "/api/health",
    "/api/docs",
    "/api/redoc",
    "/api/openapi.json",
    "/docs",
    "/redoc",
]


def _is_allowlisted(path: str) -> bool:
    return any(path.startswith(prefix) for prefix in ALLOWLIST_PREFIXES)


def _is_active(status: SubscriptionStatus | str, trial_ends_at: datetime | None) -> bool:
    value = status.value if isinstance(status, SubscriptionStatus) else str(status)
    if value == SubscriptionStatus.ACTIVE.value:
        return True
    if value == SubscriptionStatus.TRIALING.value:
        # trial_ends_at NULL = trial sem prazo (clínicas pré-0006 / seed): não bloqueia.
        return trial_ends_at is None or trial_ends_at > datetime.now(timezone.utc)
    return False


def _blocked_response(
    status: SubscriptionStatus | str, trial_ends_at: datetime | None
) -> JSONResponse:
    value = status.value if isinstance(status, SubscriptionStatus) else str(status)
    return JSONResponse(
        status_code=402,
        content={
            "error": {
                "code": "subscription_inactive",
                "message": "Sua assinatura está inativa. Regularize para continuar.",
                "details": {
                    "subscription_status": value,
                    "trial_ends_at": (
                        trial_ends_at.astimezone(timezone.utc)
                        .isoformat()
                        .replace("+00:00", "Z")
                        if trial_ends_at
                        else None
                    ),
                },
            }
        },
    )


class SubscriptionGateMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if not _settings.SUBSCRIPTION_GATE_ENABLED:
            return await call_next(request)

        path = request.url.path
        if not path.startswith("/api") or _is_allowlisted(path):
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return await call_next(request)

        try:
            claims = decode_token(auth_header.removeprefix("Bearer ").strip())
            if claims.get("type") != "access":
                return await call_next(request)
            clinic_id = uuid.UUID(claims["clinic_id"])
        except (TokenError, KeyError, ValueError):
            return await call_next(request)  # defensivo: a rota devolve 401

        async with AsyncSessionLocal() as session:
            row = (
                await session.execute(
                    select(Clinic.subscription_status, Clinic.trial_ends_at).where(
                        Clinic.id == clinic_id
                    )
                )
            ).first()

        if row is None:
            return await call_next(request)  # clínica órfã: a rota decide

        if _is_active(row.subscription_status, row.trial_ends_at):
            return await call_next(request)

        return _blocked_response(row.subscription_status, row.trial_ends_at)
