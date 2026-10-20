"""Agenda — Teleconsulta (Jitsi Meet): helpers, template WhatsApp e endpoint."""
from __future__ import annotations

from datetime import datetime, timezone

import httpx
import pytest

from src.modules.agenda.teleconsultation import (
    build_teleconsultation_url,
    teleconsultation_room_name,
)
from src.modules.agenda.whatsapp_templates import (
    AppointmentMessageContext,
    WhatsAppTemplate,
    render_message,
)
from tests.test_agenda_whatsapp import _create_appointment, _h

APPT_ID = "3f2b8c1e-9d4a-4c7e-b1a2-5e6f7a8b9c0d"


# ── Pure unit tests ──────────────────────────────────────────


def test_room_name_and_url_derive_from_appointment_id() -> None:
    assert teleconsultation_room_name(APPT_ID) == f"OdontoCRM-{APPT_ID}"
    assert build_teleconsultation_url(APPT_ID) == f"https://meet.jit.si/OdontoCRM-{APPT_ID}"


def _ctx(**overrides) -> AppointmentMessageContext:
    data = {
        "patient_name": "Maria Silva",
        "clinic_name": "Demo Odonto",
        "starts_at": datetime(2026, 10, 20, 14, 0, tzinfo=timezone.utc),
        "timezone": "America/Sao_Paulo",
        "professional_name": "Dr. Demo",
    }
    data.update(overrides)
    return AppointmentMessageContext(**data)


def test_confirmation_template_includes_teleconsultation_link() -> None:
    url = build_teleconsultation_url(APPT_ID)
    msg = render_message(WhatsAppTemplate.CONFIRMATION, _ctx(teleconsultation_url=url))
    assert "*teleconsulta*" in msg
    # URL on its own line so WhatsApp turns it into a tappable link.
    assert url in msg.splitlines()
    # Link comes before the confirmation question.
    assert msg.index(url) < msg.index("*SIM*")


def test_confirmation_template_without_link_is_unchanged() -> None:
    msg = render_message(WhatsAppTemplate.CONFIRMATION, _ctx())
    assert "teleconsulta" not in msg
    assert "meet.jit.si" not in msg


# ── Live HTTP endpoint ───────────────────────────────────────


@pytest.fixture(scope="module")
def agenda_resources(http_client: httpx.Client, admin_token: str, patient_id: str) -> dict:
    profs = http_client.get("/api/professionals", headers=_h(admin_token)).json()
    rooms = http_client.get("/api/agenda/rooms", headers=_h(admin_token)).json()
    assert profs and rooms, "Seed data missing — run scripts.seed_baseline first"
    return {"professional_id": profs[0]["id"], "room_id": rooms[0]["id"], "patient_id": patient_id}


def _status(http_client: httpx.Client, token: str, appt_id: str, new_status: str) -> None:
    r = http_client.post(
        f"/api/agenda/appointments/{appt_id}/status",
        headers=_h(token),
        json={"new_status": new_status, "reason": "teste teleconsulta"},
    )
    assert r.status_code == 200, r.text


def test_teleconsultation_endpoint_returns_jitsi_room(
    http_client: httpx.Client, admin_token: str, dentist_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    url = f"/api/agenda/appointments/{appt['id']}/teleconsultation"

    r = http_client.get(url, headers=_h(dentist_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body == {
        "appointment_id": appt["id"],
        "room_name": f"OdontoCRM-{appt['id']}",
        "room_url": f"https://meet.jit.si/OdontoCRM-{appt['id']}",
    }

    # Stable: same room on every call.
    assert http_client.get(url, headers=_h(admin_token)).json() == body

    # Allowed while in progress (re-join), blocked once finished.
    _status(http_client, admin_token, appt["id"], "confirmed")
    assert http_client.get(url, headers=_h(admin_token)).status_code == 200
    _status(http_client, admin_token, appt["id"], "waiting_room")
    r = http_client.get(url, headers=_h(admin_token))
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "appointment_not_teleconsultable"
    _status(http_client, admin_token, appt["id"], "in_progress")
    assert http_client.get(url, headers=_h(admin_token)).status_code == 200
    _status(http_client, admin_token, appt["id"], "completed")
    r = http_client.get(url, headers=_h(admin_token))
    assert r.status_code == 422


def test_teleconsultation_rejects_cancelled_unknown_and_anonymous(
    http_client: httpx.Client, admin_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    _status(http_client, admin_token, appt["id"], "cancelled")
    r = http_client.get(
        f"/api/agenda/appointments/{appt['id']}/teleconsultation", headers=_h(admin_token)
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "appointment_not_teleconsultable"

    fake = "00000000-0000-0000-0000-000000000000"
    r = http_client.get(f"/api/agenda/appointments/{fake}/teleconsultation", headers=_h(admin_token))
    assert r.status_code == 404
    r = http_client.get(f"/api/agenda/appointments/{fake}/teleconsultation")
    assert r.status_code == 401


def test_send_whatsapp_confirmation_with_teleconsultation_link(
    http_client: httpx.Client, admin_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    url = f"/api/agenda/appointments/{appt['id']}/send-whatsapp"
    room_url = f"https://meet.jit.si/OdontoCRM-{appt['id']}"

    r = http_client.post(
        url,
        headers=_h(admin_token),
        json={"template": "confirmation", "include_teleconsultation": True},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["teleconsultation_url"] == room_url
    assert room_url in body["message"]
    assert "*teleconsulta*" in body["message"]

    # Default (flag off) keeps the classic message.
    r = http_client.post(url, headers=_h(admin_token))
    assert r.status_code == 200
    assert r.json()["teleconsultation_url"] is None
    assert "meet.jit.si" not in r.json()["message"]

    # Flag only supported with the confirmation template.
    r = http_client.post(
        url,
        headers=_h(admin_token),
        json={"template": "reminder", "include_teleconsultation": True},
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "teleconsultation_template_unsupported"
