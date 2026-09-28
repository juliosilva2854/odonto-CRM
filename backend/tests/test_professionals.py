"""Correção #2 — GET /api/professionals (lista dentistas ativos da clínica)."""
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


async def _onboard_dentist(
    http_client: httpx.Client, token: str, email: str
) -> None:
    """Convida + ativa (reset de senha) um dentista → vira Professional ativo."""
    r, mock = await _invite(token, email, "Dr Onboard", "dentist")
    assert r.status_code == 201, r.text
    rr = await _reset_password(_token_from_mock(mock), "SenhaForte123")
    assert rr.status_code == 200, rr.text


def test_list_professionals_requires_auth(http_client: httpx.Client) -> None:
    r = http_client.get("/api/professionals")
    assert r.status_code == 401, r.text


def test_list_professionals_returns_expected_fields(
    http_client: httpx.Client, admin_token: str
) -> None:
    r = http_client.get("/api/professionals", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) >= 1
    prof = items[0]
    for field in (
        "id",
        "user_id",
        "full_name",
        "email",
        "cro_number",
        "cro_state",
        "specialty",
        "color_hex",
    ):
        assert field in prof, f"campo ausente: {field}"
    assert "dentist@demo.odonto" in {p["email"] for p in items}


@pytest.mark.asyncio
async def test_list_professionals_returns_only_clinic_users(
    http_client: httpx.Client,
) -> None:
    token_a, _ = _signup(http_client)
    email_a = _new_email("denta")
    await _onboard_dentist(http_client, token_a, email_a)

    token_b, _ = _signup(http_client)
    email_b = _new_email("dentb")
    await _onboard_dentist(http_client, token_b, email_b)

    ra = http_client.get("/api/professionals", headers=_h(token_a))
    assert ra.status_code == 200, ra.text
    emails_a = {p["email"] for p in ra.json()}
    assert email_a in emails_a
    assert email_b not in emails_a  # isolamento por tenant

    rb = http_client.get("/api/professionals", headers=_h(token_b))
    emails_b = {p["email"] for p in rb.json()}
    assert email_b in emails_b
    assert email_a not in emails_b
