"""Clinical Records (S4.1) — CFO lock window + addendums."""
from __future__ import annotations

import httpx
import pytest


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def reset_lock_hours(http_client: httpx.Client, admin_token: str):
    """Ensure default lock_hours=24 before and after each test."""

    def _set(hours: int) -> None:
        r = http_client.put(
            "/api/clinic-features/clinical_records",
            headers=_h(admin_token),
            json={"enabled": True, "config": {"lock_hours": hours}},
        )
        r.raise_for_status()

    _set(24)
    yield _set
    _set(24)


def test_create_and_edit_within_window(
    http_client: httpx.Client,
    dentist_token: str,
    patient_id: str,
    reset_lock_hours,
):
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/records",
        headers=_h(dentist_token),
        json={"title": "Consulta", "content": "Texto inicial"},
    )
    assert r.status_code == 201
    record = r.json()
    assert record["is_locked"] is False

    r = http_client.put(
        f"/api/clinical/records/{record['id']}",
        headers=_h(dentist_token),
        json={"content": "Texto editado dentro da janela"},
    )
    assert r.status_code == 200
    assert r.json()["content"] == "Texto editado dentro da janela"


def test_lock_blocks_edit_and_allows_addendum(
    http_client: httpx.Client,
    dentist_token: str,
    patient_id: str,
    reset_lock_hours,
):
    reset_lock_hours(0)  # Force immediate lock

    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/records",
        headers=_h(dentist_token),
        json={"title": "Lock", "content": "baseline"},
    )
    assert r.status_code == 201
    rec_id = r.json()["id"]

    # Get → is_locked=True
    g = http_client.get(f"/api/clinical/records/{rec_id}", headers=_h(dentist_token))
    assert g.json()["is_locked"] is True

    # Edit blocked
    e = http_client.put(
        f"/api/clinical/records/{rec_id}",
        headers=_h(dentist_token),
        json={"content": "blocked"},
    )
    assert e.status_code == 403
    assert e.json()["error"]["code"] == "clinical_record_locked"

    # Addendum allowed
    a = http_client.post(
        f"/api/clinical/records/{rec_id}/addendums",
        headers=_h(dentist_token),
        json={"content": "addendum content"},
    )
    assert a.status_code == 201

    # locked_at sealed
    g2 = http_client.get(f"/api/clinical/records/{rec_id}", headers=_h(dentist_token))
    assert g2.json()["locked_at"] is not None

    # List addendums
    lst = http_client.get(
        f"/api/clinical/records/{rec_id}/addendums", headers=_h(dentist_token)
    )
    assert lst.status_code == 200
    assert len(lst.json()) >= 1


def test_list_records_paginated(
    http_client: httpx.Client, dentist_token: str, patient_id: str, reset_lock_hours
):
    r = http_client.get(
        f"/api/clinical/patients/{patient_id}/records",
        headers=_h(dentist_token),
        params={"page": 1, "page_size": 5},
    )
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
