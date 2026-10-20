"""Agenda — WhatsApp Click-to-Chat confirmation (templates + endpoint)."""
from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

import httpx
import pytest

from src.modules.agenda.whatsapp_templates import (
    AppointmentMessageContext,
    WhatsAppTemplate,
    build_whatsapp_url,
    clean_phone,
    format_when,
    render_message,
)


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ── Pure template unit tests ─────────────────────────────────


def _ctx(**overrides) -> AppointmentMessageContext:
    data = {
        "patient_name": "Maria Silva",
        "clinic_name": "Demo Odonto",
        # 2026-10-20 14:00 UTC == 11:00 in São Paulo (UTC-3), a Tuesday.
        "starts_at": datetime(2026, 10, 20, 14, 0, tzinfo=timezone.utc),
        "timezone": "America/Sao_Paulo",
        "professional_name": "Dr. Demo",
        "procedure_hint": "Profilaxia",
        "pin_code": "1234",
    }
    data.update(overrides)
    return AppointmentMessageContext(**data)


def test_format_when_uses_clinic_timezone_and_ptbr_weekday() -> None:
    dt = datetime(2026, 10, 20, 14, 0, tzinfo=timezone.utc)
    assert format_when(dt, "America/Sao_Paulo") == "terça-feira, 20/10/2026 às 11:00"
    # Invalid tz falls back to São Paulo instead of crashing.
    assert format_when(dt, "Not/AZone") == "terça-feira, 20/10/2026 às 11:00"


def test_render_templates_ptbr() -> None:
    conf = render_message(WhatsAppTemplate.CONFIRMATION, _ctx())
    assert conf.startswith("Olá, Sr(a). Maria Silva.")
    assert "clínica Demo Odonto" in conf
    assert "*Terça-feira, 20/10/2026 às 11:00*" in conf
    assert "Profissional: Dr. Demo" in conf
    assert "Procedimento: Profilaxia" in conf
    assert "*SIM*" in conf

    rem = render_message(WhatsAppTemplate.REMINDER, _ctx(procedure_hint=None))
    assert "lembrar" in rem and "Procedimento:" not in rem

    chk = render_message(WhatsAppTemplate.CHECKIN, _ctx())
    assert "*1234*" in chk
    with pytest.raises(ValueError):
        render_message(WhatsAppTemplate.CHECKIN, _ctx(pin_code=None))


def test_whatsapp_url_building() -> None:
    assert clean_phone("+55 (11) 98888-7777") == "5511988887777"
    assert build_whatsapp_url("", "oi") is None
    url = build_whatsapp_url("+5511988887777", "Olá\nLinha 2 & *negrito*")
    parsed = urlparse(url)
    assert parsed.netloc == "wa.me" and parsed.path == "/5511988887777"
    assert parse_qs(parsed.query)["text"] == ["Olá\nLinha 2 & *negrito*"]


# ── Live HTTP endpoint ───────────────────────────────────────


@pytest.fixture(scope="module")
def agenda_resources(http_client: httpx.Client, admin_token: str, patient_id: str) -> dict:
    profs = http_client.get("/api/professionals", headers=_h(admin_token)).json()
    rooms = http_client.get("/api/agenda/rooms", headers=_h(admin_token)).json()
    assert profs and rooms, "Seed data missing — run scripts.seed_baseline first"
    return {"professional_id": profs[0]["id"], "room_id": rooms[0]["id"], "patient_id": patient_id}


def _create_appointment(http_client: httpx.Client, token: str, res: dict) -> dict:
    """Create an appointment in a random far-future slot (retry on conflict)."""
    for _ in range(10):
        start = datetime(2028, 1, 1, 10, 0, tzinfo=timezone.utc) + timedelta(
            days=random.randint(0, 700), minutes=30 * random.randint(0, 16)
        )
        r = http_client.post(
            "/api/agenda/appointments",
            headers=_h(token),
            json={
                **res,
                "starts_at": start.isoformat(),
                "ends_at": (start + timedelta(minutes=30)).isoformat(),
                "procedure_hint": "Avaliação WhatsApp",
            },
        )
        if r.status_code == 201:
            return r.json()
        assert r.status_code == 409, r.text
    raise AssertionError("Could not find a free slot for the test appointment")


def test_send_whatsapp_confirmation_returns_wa_link(
    http_client: httpx.Client, admin_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    url = f"/api/agenda/appointments/{appt['id']}/send-whatsapp"

    # Body is optional → defaults to the confirmation template.
    r = http_client.post(url, headers=_h(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["appointment_id"] == appt["id"]
    assert body["template"] == "confirmation"
    assert body["template_label"] == "Confirmação de consulta"
    assert body["phone_e164"].startswith("+")
    assert "Gostaríamos de confirmar a sua consulta" in body["message"]
    assert "Procedimento: Avaliação WhatsApp" in body["message"]

    parsed = urlparse(body["whatsapp_url"])
    assert parsed.scheme == "https" and parsed.netloc == "wa.me"
    assert parsed.path == "/" + clean_phone(body["phone_e164"])
    assert parse_qs(parsed.query)["text"] == [body["message"]]

    # Status is untouched (sending is not confirming).
    got = http_client.get(f"/api/agenda/appointments/{appt['id']}", headers=_h(admin_token))
    assert got.json()["status"] == "scheduled"


def test_send_whatsapp_reminder_and_checkin_templates(
    http_client: httpx.Client, admin_token: str, dentist_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    url = f"/api/agenda/appointments/{appt['id']}/send-whatsapp"

    r = http_client.post(url, headers=_h(dentist_token), json={"template": "reminder"})
    assert r.status_code == 200, r.text
    assert r.json()["template"] == "reminder"
    assert "10 minutos de antecedência" in r.json()["message"]

    r = http_client.post(url, headers=_h(admin_token), json={"template": "checkin"})
    assert r.status_code == 200, r.text
    assert f"*{appt['pin_code']}*" in r.json()["message"]

    r = http_client.post(url, headers=_h(admin_token), json={"template": "bogus"})
    assert r.status_code == 422


def test_send_whatsapp_rejects_terminal_appointment(
    http_client: httpx.Client, admin_token: str, agenda_resources: dict
) -> None:
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    r = http_client.post(
        f"/api/agenda/appointments/{appt['id']}/status",
        headers=_h(admin_token),
        json={"new_status": "cancelled", "reason": "teste whatsapp"},
    )
    assert r.status_code == 200, r.text

    r = http_client.post(
        f"/api/agenda/appointments/{appt['id']}/send-whatsapp", headers=_h(admin_token)
    )
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "appointment_not_messageable"


def test_send_whatsapp_not_found_and_auth(
    http_client: httpx.Client, admin_token: str
) -> None:
    fake = "00000000-0000-0000-0000-000000000000"
    r = http_client.post(f"/api/agenda/appointments/{fake}/send-whatsapp", headers=_h(admin_token))
    assert r.status_code == 404
    r = http_client.post(f"/api/agenda/appointments/{fake}/send-whatsapp")
    assert r.status_code == 401
