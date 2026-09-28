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


async def _resend(token: str, user_id: str) -> tuple[httpx.Response, AsyncMock]:
    from src.main import app

    await _reset_pool()
    with patch(
        "src.core.email_client.send_password_reset_email", new=AsyncMock()
    ) as mock:
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as c:
            r = await c.post(
                f"/api/users/{user_id}/resend-invite", headers=_h(token)
            )
    return r, mock


def _token_from_mock(mock: AsyncMock) -> str:
    reset_url = mock.await_args.kwargs["reset_url"]
    return parse_qs(urlparse(reset_url).query)["token"][0]


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


# ── Correção #3: convite de dentista cria Professional ─────────


@pytest.mark.asyncio
async def test_invite_dentist_creates_professional_automatically(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("dentprof")
    r, _ = await _invite(token, email, "Dr Auto Prof", "dentist")
    assert r.status_code == 201, r.text
    assert r.json()["professional_id"] is not None


@pytest.mark.asyncio
async def test_invite_reception_does_not_create_professional(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("recepnoprof")
    r, _ = await _invite(token, email, "Recep Sem Prof", "reception")
    assert r.status_code == 201, r.text
    assert r.json()["professional_id"] is None


@pytest.mark.asyncio
async def test_invite_dentist_can_login_and_appear_in_agenda(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("dentagenda")
    r, mock = await _invite(token, email, "Dr Agenda", "dentist")
    assert r.status_code == 201, r.text

    rr = await _reset_password(_token_from_mock(mock), "SenhaForte123")
    assert rr.status_code == 200, rr.text

    login = http_client.post(
        "/api/auth/login", json={"email": email, "password": "SenhaForte123"}
    )
    assert login.status_code == 200, login.text

    profs = http_client.get("/api/professionals", headers=_h(token))
    assert profs.status_code == 200, profs.text
    assert email in {p["email"] for p in profs.json()}


# ── Correção #5: hard delete ───────────────────────────────────


@pytest.mark.asyncio
async def test_hard_delete_removes_user_and_professional(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("harddel")
    inv, _ = await _invite(token, email, "Dentista Some", "dentist")
    user_id = inv.json()["id"]

    r = http_client.delete(f"/api/users/{user_id}/hard", headers=_h(token))
    assert r.status_code == 204, r.text

    lst = http_client.get("/api/users", headers=_h(token), params={"page_size": 100})
    assert email not in {u["email"] for u in lst.json()["items"]}

    # E-mail liberado (user + professional removidos): novo convite reaproveita.
    reinv, _ = await _invite(token, email, "De Novo", "dentist")
    assert reinv.status_code == 201, reinv.text


@pytest.mark.asyncio
async def test_cannot_hard_delete_self(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    admin_id = _my_id(http_client, token)

    # Segundo admin ATIVO para que a auto-remoção não caia na trava de último admin.
    email2 = _new_email("admin2")
    r, mock = await _invite(token, email2, "Admin Dois", "admin")
    assert r.status_code == 201, r.text
    await _reset_password(_token_from_mock(mock), "SenhaForte123")

    d = http_client.delete(f"/api/users/{admin_id}/hard", headers=_h(token))
    assert d.status_code == 422, d.text
    assert d.json()["error"]["code"] == "cannot_delete_self"


def test_cannot_hard_delete_last_admin(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    admin_id = _my_id(http_client, token)

    d = http_client.delete(f"/api/users/{admin_id}/hard", headers=_h(token))
    assert d.status_code == 409, d.text
    assert d.json()["error"]["code"] == "last_admin"


def test_hard_delete_fails_if_has_linked_records(
    http_client: httpx.Client, admin_token: str
) -> None:
    # O dentista do seed é professional em appointments (RESTRICT) e/ou autor de
    # registros → hard delete deve ser bloqueado com 409 has_linked_records.
    users = http_client.get(
        "/api/users", headers=_h(admin_token), params={"page_size": 100}
    ).json()["items"]
    dentist = next(u for u in users if u["email"] == "dentist@demo.odonto")

    r = http_client.delete(
        f"/api/users/{dentist['id']}/hard", headers=_h(admin_token)
    )
    assert r.status_code == 409, r.text
    assert r.json()["error"]["code"] == "has_linked_records"


# ── Correção #6: reenviar convite ──────────────────────────────


@pytest.mark.asyncio
async def test_resend_invite_generates_new_token(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)
    email = _new_email("resend")
    inv, mock1 = await _invite(token, email, "Reenvio", "reception")
    user_id = inv.json()["id"]
    token1 = _token_from_mock(mock1)

    r2, mock2 = await _resend(token, user_id)
    assert r2.status_code == 200, r2.text
    assert r2.json()["sent"] is True
    assert r2.json()["email"] == email

    token2 = _token_from_mock(mock2)
    assert token2 != token1

    rr = await _reset_password(token2, "SenhaForte123")
    assert rr.status_code == 200, rr.text


@pytest.mark.asyncio
async def test_resend_invite_invalidates_old_tokens(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("resendinv")
    inv, mock1 = await _invite(token, email, "Reenvio Invalida", "reception")
    user_id = inv.json()["id"]
    token1 = _token_from_mock(mock1)

    r2, _ = await _resend(token, user_id)
    assert r2.status_code == 200, r2.text

    rr = await _reset_password(token1, "SenhaForte123")
    assert rr.status_code == 400, rr.text
    assert rr.json()["error"]["code"] == "invalid_token"


@pytest.mark.asyncio
async def test_resend_invite_fails_if_user_already_logged_in(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("logged")
    inv, mock = await _invite(token, email, "Ja Logou", "reception")
    user_id = inv.json()["id"]

    await _reset_password(_token_from_mock(mock), "SenhaForte123")
    login = http_client.post(
        "/api/auth/login", json={"email": email, "password": "SenhaForte123"}
    )
    assert login.status_code == 200, login.text

    r2, _ = await _resend(token, user_id)
    assert r2.status_code == 409, r2.text
    assert r2.json()["error"]["code"] == "already_active"
