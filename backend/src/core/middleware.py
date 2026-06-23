"""Request context middleware — populates RequestContext from JWT + headers."""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable

import structlog
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.core.context import RequestContext, set_context
from src.core.security import TokenError, decode_token


class RequestContextMiddleware(BaseHTTPMiddleware):
    """Populates RequestContext for every request. Auth claims are optional."""

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        request_id = uuid.UUID(request.headers.get("X-Request-ID") or str(uuid.uuid4()))

        user_id: uuid.UUID | None = None
        clinic_id: uuid.UUID | None = None
        role: str | None = None

        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header.removeprefix("Bearer ").strip()
            try:
                claims = decode_token(token)
                if claims.get("type") == "access":
                    user_id = uuid.UUID(claims["sub"])
                    clinic_id = uuid.UUID(claims["clinic_id"])
                    role = claims["role"]
            except (TokenError, KeyError, ValueError):
                pass  # invalid token → context stays empty; route deps decide

        ctx = RequestContext(
            request_id=request_id,
            user_id=user_id,
            clinic_id=clinic_id,
            role=role,
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("User-Agent"),
        )
        set_context(ctx)

        structlog.contextvars.bind_contextvars(
            request_id=str(request_id),
            user_id=str(user_id) if user_id else None,
            clinic_id=str(clinic_id) if clinic_id else None,
        )

        try:
            response = await call_next(request)
        finally:
            structlog.contextvars.clear_contextvars()

        response.headers["X-Request-ID"] = str(request_id)
        return response
