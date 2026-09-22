"""Password reset — forgot/reset flow (email_client mockado, sem envio real).

Os endpoints /api/auth/forgot-password e /reset-password são públicos
(allowlisted no subscription gate). Os testes que precisam capturar o token
rodam in-process (ASGI) para poder mockar o email_client e ler a reset_url.
"""
from __future__ import annotations

import hashlib
import random
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from src.core.config import get_settings

_settings = get_settings()

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)

OLD_PASSWORD = "Senha1234"
NEW_PASSWORD = "NovaSenha987"


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _signup(http_client: httpx.Client) -> str:
    """Cria uma clínica+admin e devolve o e-mail do admin."""
    uid = uuid.uuid4().hex[:8]
    email = f"admin-{uid}@odonto-reset.com.br"
    r = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Reset {uid} LTDA",
            "clinic_trade_name": f"Reset {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Admin Reset",
            "admin_email": email,
            "admin_password": OLD_PASSWORD,
            "plan": "pro",
        },
    )
    assert r.status_code == 201, r.text
    return email


async def _reset_pool() -> None:
    from src.core.database import engine

    await engine.dispose(close=False)


async def _forgot(email: str) -> tuple[httpx.Response, AsyncMock]:
    """Chama forgot-password in-process mockando o email_client."""
    from src.main import app

    await _reset_pool()
    with patch(
        "src.core.email_client.send_password_reset_email", new=AsyncMock()
    ) as mock:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
            r = await c.post("/api/auth/forgot-password", json={"email": email})
    return r, mock


async def _reset(token: str, new_password: str) -> httpx.Response:
    from src.main import app

    await _reset_pool()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
        return await c.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": new_password},
        )


def _token_from_mock(mock: AsyncMock) -> str:
    mock.assert_awaited_once()
    url = mock.await_args.kwargs["reset_url"]
    return parse_qs(urlparse(url).query)["token"][0]


async def _expire_token(raw_token: str) -> None:
    """Força a expiração do token direto no banco (engine próprio, NullPool)."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    past = datetime.now(timezone.utc) - timedelta(hours=2)
    engine = create_async_engine(_settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text(
                    "UPDATE password_reset_tokens SET expires_at = :p "
                    "WHERE token_hash = :h"
                ),
                {"p": past, "h": token_hash},
            )
    finally:
        await engine.dispose()


# ── Tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_forgot_password_unknown_email_returns_202_no_email(
    http_client: httpx.Client,
) -> None:
    r, mock = await _forgot(f"ghost-{uuid.uuid4().hex[:8]}@nowhere.example")
    assert r.status_code == 202, r.text
    assert mock.await_count == 0  # anti-enumeration: nada enviado


@pytest.mark.asyncio
async def test_forgot_password_known_email_returns_202_and_sends(
    http_client: httpx.Client,
) -> None:
    email = _signup(http_client)
    r, mock = await _forgot(email)
    assert r.status_code == 202, r.text
    mock.assert_awaited_once()
    assert mock.await_args.kwargs["is_invite"] is False


@pytest.mark.asyncio
async def test_forgot_password_is_case_insensitive(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    r, mock = await _forgot(email.upper())
    assert r.status_code == 202, r.text
    mock.assert_awaited_once()


@pytest.mark.asyncio
async def test_reset_password_success_allows_login(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    _, mock = await _forgot(email)
    token = _token_from_mock(mock)

    r = await _reset(token, NEW_PASSWORD)
    assert r.status_code == 200, r.text

    login = http_client.post(
        "/api/auth/login", json={"email": email, "password": NEW_PASSWORD}
    )
    assert login.status_code == 200, login.text
    assert login.json()["access_token"]


@pytest.mark.asyncio
async def test_old_password_rejected_after_reset(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    _, mock = await _forgot(email)
    token = _token_from_mock(mock)
    assert (await _reset(token, NEW_PASSWORD)).status_code == 200

    login = http_client.post(
        "/api/auth/login", json={"email": email, "password": OLD_PASSWORD}
    )
    assert login.status_code == 401, login.text


@pytest.mark.asyncio
async def test_reset_token_is_single_use(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    _, mock = await _forgot(email)
    token = _token_from_mock(mock)

    assert (await _reset(token, NEW_PASSWORD)).status_code == 200
    second = await _reset(token, "OutraSenha123")
    assert second.status_code == 400, second.text
    assert second.json()["error"]["code"] == "invalid_token"


@pytest.mark.asyncio
async def test_reset_invalid_token_400(http_client: httpx.Client) -> None:
    r = await _reset("totally-invalid-token-value-123456", NEW_PASSWORD)
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_token"


@pytest.mark.asyncio
async def test_reset_expired_token_400(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    _, mock = await _forgot(email)
    token = _token_from_mock(mock)

    await _expire_token(token)
    r = await _reset(token, NEW_PASSWORD)
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_token"


@pytest.mark.asyncio
async def test_reset_weak_password_422(http_client: httpx.Client) -> None:
    email = _signup(http_client)
    _, mock = await _forgot(email)
    token = _token_from_mock(mock)

    r = await _reset(token, "123")  # < 8 chars
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "validation_error"
