"""Users CRUD — convite, listagem, papel e desativação (admin-only).

Invites disparam e-mail → rodam in-process (ASGI) com o email_client mockado.
Testes de último-admin usam clínicas recém-criadas (signup) para isolamento.
"""
from __future__ import annotations

import random
import uuid
from unittest.mock import AsyncMock, patch
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from src.core.config import get_settings

_settings = get_settings()

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)

RECEPTION_EMAIL = "reception@demo.odonto"
RECEPTION_PASSWORD = "Reception@123"
ADMIN_PASSWORD = "Senha1234"


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _new_email(tag: str) -> str:
    return f"{tag}-{uuid.uuid4().hex[:8]}@odonto-users.com.br"


def _signup(http_client: httpx.Client) -> tuple[str, str]:
    """Cria clínica+admin. Devolve (access_token, admin_email)."""
    uid = uuid.uuid4().hex[:8]
    email = f"owner-{uid}@odonto-users.com.br"
    r = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Users {uid} LTDA",
            "clinic_trade_name": f"Users {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Owner Admin",
            "admin_email": email,
            "admin_password": ADMIN_PASSWORD,
            "plan": "pro",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"], email


def _my_id(http_client: httpx.Client, token: str) -> str:
    r = http_client.get("/api/auth/me", headers=_h(token))
    assert r.status_code == 200, r.text
    return r.json()["user"]["id"]


def _reception_token(http_client: httpx.Client) -> str:
    r = http_client.post(
        "/api/auth/login",
        json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


async def _reset_pool() -> None:
    from src.core.database import engine

    await engine.dispose(close=False)


async def _invite(
    token: str, email: str, full_name: str, role: str
) -> tuple[httpx.Response, AsyncMock]:
    from src.main import app

    await _reset_pool()
    with patch(
        "src.core.email_client.send_password_reset_email", new=AsyncMock()
    ) as mock:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
            r = await c.post(
                "/api/users/invite",
                headers=_h(token),
                json={"email": email, "full_name": full_name, "role": role},
            )
    return r, mock


async def _reset_password(token: str, new_password: str) -> httpx.Response:
    from src.main import app

    await _reset_pool()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
        return await c.post(
            "/api/auth/reset-password",
            json={"token": token, "new_password": new_password},
        )


# ── Tests ──────────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_invite_requires_admin(http_client: httpx.Client) -> None:
    r, _ = await _invite(
        _reception_token(http_client), _new_email("x"), "X", "dentist"
    )
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_invite_creates_inactive_user_and_sends_email(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("dentist")
    r, mock = await _invite(token, email, "Dr. Convidado", "dentist")
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == email
    assert body["role"] == "dentist"
    assert body["is_active"] is False
    mock.assert_awaited_once()
    assert mock.await_args.kwargs["is_invite"] is True


@pytest.mark.asyncio
async def test_invite_duplicate_email_conflict(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    email = _new_email("dup")
    r1, _ = await _invite(token, email, "Primeiro", "reception")
    assert r1.status_code == 201, r1.text
    r2, _ = await _invite(token, email, "Segundo", "reception")
    assert r2.status_code == 409, r2.text
    assert r2.json()["error"]["code"] == "conflict"


@pytest.mark.asyncio
async def test_invited_user_activates_via_reset_then_login(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("accept")
    r, mock = await _invite(token, email, "Aceita Convite", "reception")
    assert r.status_code == 201, r.text

    reset_url = mock.await_args.kwargs["reset_url"]
    reset_token = parse_qs(urlparse(reset_url).query)["token"][0]

    rr = await _reset_password(reset_token, "MinhaSenha123")
    assert rr.status_code == 200, rr.text

    login = http_client.post(
        "/api/auth/login", json={"email": email, "password": "MinhaSenha123"}
    )
    assert login.status_code == 200, login.text


@pytest.mark.asyncio
async def test_list_users_as_admin(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    email = _new_email("listed")
    await _invite(token, email, "Listado", "dentist")

    r = http_client.get("/api/users", headers=_h(token), params={"page_size": 100})
    assert r.status_code == 200, r.text
    body = r.json()
    emails = {u["email"] for u in body["items"]}
    assert email in emails
    assert body["total"] >= 2  # admin + convidado


@pytest.mark.asyncio
async def test_list_users_requires_admin(http_client: httpx.Client) -> None:
    r = http_client.get("/api/users", headers=_h(_reception_token(http_client)))
    assert r.status_code == 403, r.text


@pytest.mark.asyncio
async def test_update_role_ok(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    email = _new_email("role")
    inv, _ = await _invite(token, email, "Muda Papel", "reception")
    user_id = inv.json()["id"]

    r = http_client.put(
        f"/api/users/{user_id}/role", headers=_h(token), json={"role": "dentist"}
    )
    assert r.status_code == 200, r.text
    assert r.json()["role"] == "dentist"


@pytest.mark.asyncio
async def test_cannot_demote_last_admin(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    admin_id = _my_id(http_client, token)

    r = http_client.put(
        f"/api/users/{admin_id}/role", headers=_h(token), json={"role": "dentist"}
    )
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "last_admin"


@pytest.mark.asyncio
async def test_cannot_deactivate_self(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    admin_id = _my_id(http_client, token)

    r = http_client.delete(f"/api/users/{admin_id}", headers=_h(token))
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "cannot_deactivate_self"


@pytest.mark.asyncio
async def test_deactivate_invited_user_ok(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    email = _new_email("deact")
    inv, _ = await _invite(token, email, "Vai Desativar", "dentist")
    user_id = inv.json()["id"]

    r = http_client.delete(f"/api/users/{user_id}", headers=_h(token))
    assert r.status_code == 200, r.text
    assert r.json()["is_active"] is False
