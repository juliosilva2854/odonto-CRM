"""Agenda WhatsApp — extended edge cases (statuses, roles, timezone, tenant isolation)."""
from __future__ import annotations

from datetime import datetime
from urllib.parse import parse_qs, urlparse
from zoneinfo import ZoneInfo

import httpx
import pytest

from tests.test_agenda_whatsapp import _create_appointment, _h, agenda_resources  # noqa: F401
from src.modules.agenda.whatsapp_templates import format_when


@pytest.fixture(scope="module")
def reception_token(http_client: httpx.Client) -> str:
    r = http_client.post(
        "/api/auth/login",
        json={"email": "reception@demo.odonto", "password": "Reception@123"},
    )
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _status(c: httpx.Client, tok: str, aid: str, s: str) -> None:
    r = c.post(f"/api/agenda/appointments/{aid}/status", headers=_h(tok),
               json={"new_status": s, "reason": "teste"})
    assert r.status_code == 200, r.text


def _send(c: httpx.Client, tok: str, aid: str, tpl: str | None = None) -> httpx.Response:
    kw = {"json": {"template": tpl}} if tpl else {}
    return c.post(f"/api/agenda/appointments/{aid}/send-whatsapp", headers=_h(tok), **kw)


# Reception role allowed + timezone of message matches clinic tz
def test_reception_allowed_and_message_in_sao_paulo_tz(http_client, reception_token, admin_token, agenda_resources):
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    r = _send(http_client, reception_token, appt["id"])
    assert r.status_code == 200, r.text
    body = r.json()
    starts = datetime.fromisoformat(appt["starts_at"].replace("Z", "+00:00"))
    expected = format_when(starts, "America/Sao_Paulo").capitalize()
    assert f"*{expected}*" in body["message"]
    local = starts.astimezone(ZoneInfo("America/Sao_Paulo"))
    assert local.strftime("%H:%M") in body["message"]
    assert parse_qs(urlparse(body["whatsapp_url"]).query)["text"] == [body["message"]]


# Confirmed status allowed; status unchanged after send
def test_confirmed_allowed_status_unchanged(http_client, admin_token, agenda_resources):
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    _status(http_client, admin_token, appt["id"], "confirmed")
    r = _send(http_client, admin_token, appt["id"], "reminder")
    assert r.status_code == 200, r.text
    got = http_client.get(f"/api/agenda/appointments/{appt['id']}", headers=_h(admin_token)).json()
    assert got["status"] == "confirmed"


# Non-messageable statuses -> 422 appointment_not_messageable
@pytest.mark.parametrize("path", [
    ["no_show"],
    ["waiting_room"],
    ["waiting_room", "in_progress"],
    ["waiting_room", "in_progress", "completed"],
])
def test_non_messageable_statuses(http_client, admin_token, agenda_resources, path):
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    for s in path:
        _status(http_client, admin_token, appt["id"], s)
    r = _send(http_client, admin_token, appt["id"])
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "appointment_not_messageable"


# Invalid UUID path -> 422 ; empty json body {} -> default confirmation
def test_invalid_uuid_and_empty_body(http_client, admin_token, agenda_resources):
    r = http_client.post("/api/agenda/appointments/not-a-uuid/send-whatsapp", headers=_h(admin_token))
    assert r.status_code == 422
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    r = http_client.post(f"/api/agenda/appointments/{appt['id']}/send-whatsapp",
                         headers=_h(admin_token), json={})
    assert r.status_code == 200, r.text
    assert r.json()["template"] == "confirmation"


# Super admin (tenant-less) cannot use clinic endpoint
def test_super_admin_cannot_send(http_client, admin_token, agenda_resources):
    appt = _create_appointment(http_client, admin_token, agenda_resources)
    lr = http_client.post("/api/auth/login", json={"email": "super@odonto.com", "password": "SuperAdmin123!"})
    assert lr.status_code == 200
    r = _send(http_client, lr.json()["access_token"], appt["id"])
    assert r.status_code in (401, 403, 404), r.text
