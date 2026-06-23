"""Odontogram (S4.1) — event-sourcing, projection, state machine, validators."""
from __future__ import annotations

import httpx
import pytest


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def test_add_procedure_creates_projection_and_event(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
):
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/procedures",
        headers=_h(dentist_token),
        json={"procedure_id": procedure_id, "tooth_fdi": "26", "faces": ["O"], "notes": "Test"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["tooth_fdi"] == "26"
    assert body["faces"] == ["O"]
    assert body["status"] == "planned"
    assert body["price_snapshot"] is not None

    snapshot = http_client.get(
        f"/api/clinical/patients/{patient_id}/odontogram",
        headers=_h(dentist_token),
    ).json()
    assert any(p["id"] == body["id"] for p in snapshot["procedures"])

    events = http_client.get(
        f"/api/clinical/patients/{patient_id}/odontogram/events",
        headers=_h(dentist_token),
    ).json()
    assert events["total"] >= 1
    assert any(
        e["event_type"] == "procedure_added" and e["tooth_procedure_id"] == body["id"]
        for e in events["items"]
    )


def test_invalid_fdi_returns_422(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
):
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/procedures",
        headers=_h(dentist_token),
        json={"procedure_id": procedure_id, "tooth_fdi": "99", "faces": ["O"]},
    )
    assert r.status_code == 422


def test_invalid_face_returns_422(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
):
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/procedures",
        headers=_h(dentist_token),
        json={"procedure_id": procedure_id, "tooth_fdi": "16", "faces": ["Z"]},
    )
    assert r.status_code == 422


@pytest.fixture
def fresh_tooth_procedure(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
) -> str:
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/procedures",
        headers=_h(dentist_token),
        json={"procedure_id": procedure_id, "tooth_fdi": "27", "faces": ["O"]},
    )
    r.raise_for_status()
    return r.json()["id"]


def test_state_machine_valid_transition(
    http_client: httpx.Client, dentist_token: str, fresh_tooth_procedure: str
):
    tp_id = fresh_tooth_procedure
    r = http_client.post(
        f"/api/clinical/odontogram/procedures/{tp_id}/status",
        headers=_h(dentist_token),
        json={"new_status": "to_execute", "reason": "Quote approved (manual)"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "to_execute"


def test_state_machine_invalid_transition(
    http_client: httpx.Client, dentist_token: str, fresh_tooth_procedure: str
):
    tp_id = fresh_tooth_procedure
    r = http_client.post(
        f"/api/clinical/odontogram/procedures/{tp_id}/status",
        headers=_h(dentist_token),
        json={"new_status": "done"},
    )
    assert r.status_code == 422
    body = r.json()
    assert body["error"]["code"] == "validation_error"


def test_remove_procedure_cancels(
    http_client: httpx.Client, dentist_token: str, fresh_tooth_procedure: str
):
    tp_id = fresh_tooth_procedure
    r = http_client.request(
        "DELETE",
        f"/api/clinical/odontogram/procedures/{tp_id}",
        headers=_h(dentist_token),
        json={"reason": "duplicate planning"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"


def test_add_note(
    http_client: httpx.Client, dentist_token: str, patient_id: str
):
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/notes",
        headers=_h(dentist_token),
        json={"tooth_fdi": "16", "text": "Sensibilidade ao frio"},
    )
    assert r.status_code == 201
    assert r.json()["event_type"] == "note_added"
