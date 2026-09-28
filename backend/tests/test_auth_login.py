"""Correção #7 — mensagem específica para conta desativada no login."""
from __future__ import annotations

import httpx
import pytest

from tests.test_users_crud import (
    _h,
    _invite,
    _new_email,
    _reset_password,
    _signup,
    _token_from_mock,
)


@pytest.mark.asyncio
async def test_login_inactive_user_returns_specific_message(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("inactive")
    inv, mock = await _invite(token, email, "Sera Desativado", "reception")
    user_id = inv.json()["id"]

    await _reset_password(_token_from_mock(mock), "SenhaForte123")

    # Login funciona enquanto ativo.
    l1 = http_client.post(
        "/api/auth/login", json={"email": email, "password": "SenhaForte123"}
    )
    assert l1.status_code == 200, l1.text

    # Admin desativa a conta.
    d = http_client.delete(f"/api/users/{user_id}", headers=_h(token))
    assert d.status_code == 200, d.text

    # Agora login com a SENHA CERTA retorna mensagem específica.
    l2 = http_client.post(
        "/api/auth/login", json={"email": email, "password": "SenhaForte123"}
    )
    assert l2.status_code == 401, l2.text
    assert l2.json()["error"]["code"] == "account_deactivated"


@pytest.mark.asyncio
async def test_login_wrong_password_still_generic(
    http_client: httpx.Client,
) -> None:
    _, admin_email = _signup(http_client)

    # Senha errada para e-mail existente → genérico.
    l1 = http_client.post(
        "/api/auth/login", json={"email": admin_email, "password": "SenhaErrada999"}
    )
    assert l1.status_code == 401, l1.text
    assert l1.json()["error"]["code"] == "unauthorized"
    assert "Invalid credentials" in l1.json()["error"]["message"]

    # E-mail inexistente → mesma resposta genérica (anti-enumeration).
    l2 = http_client.post(
        "/api/auth/login",
        json={"email": _new_email("ghost"), "password": "SenhaErrada999"},
    )
    assert l2.status_code == 401, l2.text
    assert l2.json()["error"]["code"] == "unauthorized"
