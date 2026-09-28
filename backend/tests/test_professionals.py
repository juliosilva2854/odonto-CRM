"""Correção #2 — GET /api/professionals + Tarefa 1/3 (edição + convite pendente)."""
from __future__ import annotations

import uuid

import httpx
import pytest

from tests.test_users_crud import (
    RECEPTION_EMAIL,
    RECEPTION_PASSWORD,
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


# ── Tarefa 1: PUT /api/professionals/{id} ─────────────────────


def _reception_token(http_client: httpx.Client) -> str:
    r = http_client.post(
        "/api/auth/login",
        json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def test_update_professional_changes_fields(
    http_client: httpx.Client, admin_token: str
) -> None:
    profs = http_client.get("/api/professionals", headers=_h(admin_token)).json()
    assert profs, "seed deve ter ao menos um dentista"
    prof_id = profs[0]["id"]

    r = http_client.put(
        f"/api/professionals/{prof_id}",
        headers=_h(admin_token),
        json={
            "cro_number": "54321",
            "cro_state": "mg",
            "specialty": "Endodontia",
            "color_hex": "#123ABC",
            "default_commission_pct": 33.25,
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["cro_number"] == "54321"
    assert body["cro_state"] == "MG"  # UF normalizada
    assert body["specialty"] == "Endodontia"
    assert body["color_hex"] == "#123ABC"
    assert str(body["default_commission_pct"]) in ("33.25", "33.2500")


def test_update_professional_requires_admin(http_client: httpx.Client) -> None:
    profs = http_client.get(
        "/api/professionals", headers=_h(_reception_token(http_client))
    ).json()
    target_id = profs[0]["id"] if profs else str(uuid.uuid4())
    r = http_client.put(
        f"/api/professionals/{target_id}",
        headers=_h(_reception_token(http_client)),
        json={
            "cro_number": "111",
            "cro_state": "SP",
            "specialty": None,
            "color_hex": "#000000",
            "default_commission_pct": 10,
        },
    )
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "forbidden"


def test_update_professional_wrong_clinic_returns_404(
    http_client: httpx.Client, admin_token: str
) -> None:
    r = http_client.put(
        f"/api/professionals/{uuid.uuid4()}",
        headers=_h(admin_token),
        json={
            "cro_number": "222",
            "cro_state": "SP",
            "specialty": None,
            "color_hex": "#FFFFFF",
            "default_commission_pct": 20,
        },
    )
    assert r.status_code == 404, r.text
    assert r.json()["error"]["code"] == "not_found"


# ── Tarefa 3: listagem inclui convites pendentes ──────────────


@pytest.mark.asyncio
async def test_list_professionals_includes_pending_invites(
    http_client: httpx.Client,
) -> None:
    token, _ = _signup(http_client)
    email = _new_email("dentpend")
    inv, _mock = await _invite(token, email, "Dr Convite Pendente", "dentist")
    assert inv.status_code == 201, inv.text

    r = http_client.get("/api/professionals", headers=_h(token))
    assert r.status_code == 200, r.text
    match = next((p for p in r.json() if p["email"] == email), None)
    assert match is not None, "dentista com convite pendente deve aparecer"
    assert match["invite_pending"] is True
    assert match["is_active"] is False


def test_professional_out_exposes_invite_pending(
    http_client: httpx.Client, admin_token: str
) -> None:
    r = http_client.get("/api/professionals", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    for p in r.json():
        assert "invite_pending" in p
        assert "is_active" in p
        assert "default_commission_pct" in p
