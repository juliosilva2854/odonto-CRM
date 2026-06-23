"""Quotes (S4.2) — pricing snapshots, partial approval, finance↔clinical bridge."""
from __future__ import annotations

import time
from decimal import Decimal

import httpx
import pytest


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def planned_tp(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
) -> dict:
    """Plan a fresh tooth procedure and return {tp_id, procedure_id}."""
    r = http_client.post(
        f"/api/clinical/patients/{patient_id}/odontogram/procedures",
        headers=_h(dentist_token),
        json={"procedure_id": procedure_id, "tooth_fdi": "37", "faces": ["O"]},
    )
    r.raise_for_status()
    return {"tp_id": r.json()["id"], "procedure_id": procedure_id}


def _create_quote(
    http_client: httpx.Client,
    token: str,
    patient_id: str,
    items: list[dict],
    **extra,
) -> dict:
    payload = {"patient_id": patient_id, "items": items, **extra}
    r = http_client.post(
        "/api/finance/quotes", headers=_h(token), json=payload
    )
    assert r.status_code == 201, r.text
    return r.json()


# ── Creation ──────────────────────────────────────────────────


def test_create_quote_from_tooth_procedure_snapshots(
    http_client: httpx.Client, dentist_token: str, patient_id: str, planned_tp: dict
):
    quote = _create_quote(
        http_client,
        dentist_token,
        patient_id,
        [
            {
                "procedure_id": planned_tp["procedure_id"],
                "tooth_procedure_id": planned_tp["tp_id"],
                "commission_pct": "40.00",
                "deductions": [{"type": "card_fee", "amount": "15.00", "label": "3x"}],
            }
        ],
        discount_amount="5.00",
    )
    item = quote["items"][0]

    assert quote["number"].startswith("ORC-")
    assert quote["status"] == "draft"
    assert Decimal(item["unit_price"]) > Decimal("0")
    assert Decimal(quote["subtotal"]) == Decimal(item["line_total"])
    assert Decimal(quote["total"]) == Decimal(quote["subtotal"]) - Decimal(quote["discount_amount"])
    assert item["tooth_fdi"] == "37"
    assert item["faces"] == ["O"]
    assert item["procedure_code_snapshot"]
    assert Decimal(item["commission_pct_snapshot"]) == Decimal("40.00")
    assert len(item["deductions"]) == 1


def test_create_quote_with_discount_exceeding_total_returns_422(
    http_client: httpx.Client, dentist_token: str, patient_id: str, planned_tp: dict
):
    r = http_client.post(
        "/api/finance/quotes",
        headers=_h(dentist_token),
        json={
            "patient_id": patient_id,
            "items": [{"procedure_id": planned_tp["procedure_id"], "tooth_procedure_id": planned_tp["tp_id"]}],
            "discount_amount": "999999.99",
        },
    )
    assert r.status_code == 422
    assert r.json()["error"]["code"] == "validation_error"


# ── BRIDGE: approving an item flips the tooth procedure ───────


def test_approve_item_triggers_odontogram_bridge(
    http_client: httpx.Client, dentist_token: str, patient_id: str, planned_tp: dict
):
    quote = _create_quote(
        http_client,
        dentist_token,
        patient_id,
        [{"procedure_id": planned_tp["procedure_id"], "tooth_procedure_id": planned_tp["tp_id"]}],
    )
    item_id = quote["items"][0]["id"]

    # Approve item
    r = http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{item_id}/approve",
        headers=_h(dentist_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    # Allow in-process handler to finish (synchronous bus but defensive)
    time.sleep(0.2)

    # Verify the odontogram projection moved to to_execute
    snap = http_client.get(
        f"/api/clinical/patients/{patient_id}/odontogram",
        headers=_h(dentist_token),
    ).json()
    tp = next(p for p in snap["procedures"] if p["id"] == planned_tp["tp_id"])
    assert tp["status"] == "to_execute", f"Expected to_execute, got {tp['status']}"

    # Quote should now be APPROVED (single item, all decided positively)
    q = http_client.get(
        f"/api/finance/quotes/{quote['id']}",
        headers=_h(dentist_token),
    ).json()
    assert q["status"] == "approved"
    assert q["approved_at"] is not None

    # The trigger event should be in the odontogram log
    events = http_client.get(
        f"/api/clinical/patients/{patient_id}/odontogram/events",
        headers=_h(dentist_token),
        params={"page": 1, "page_size": 50},
    ).json()
    bridged = [
        e for e in events["items"]
        if e["tooth_procedure_id"] == planned_tp["tp_id"]
        and e["event_type"] == "procedure_status_changed"
        and e["payload"].get("trigger") == "quote_approved"
    ]
    assert bridged, "Expected at least one quote-triggered status change event"


# ── Partial approval state machine ────────────────────────────


def test_partial_approval_state(
    http_client: httpx.Client, dentist_token: str, patient_id: str, procedure_id: str
):
    # Plan two procedures
    tp_ids = []
    for fdi in ("17", "27"):
        r = http_client.post(
            f"/api/clinical/patients/{patient_id}/odontogram/procedures",
            headers=_h(dentist_token),
            json={"procedure_id": procedure_id, "tooth_fdi": fdi, "faces": ["O"]},
        )
        tp_ids.append(r.json()["id"])

    quote = _create_quote(
        http_client,
        dentist_token,
        patient_id,
        [
            {"procedure_id": procedure_id, "tooth_procedure_id": tp_ids[0]},
            {"procedure_id": procedure_id, "tooth_procedure_id": tp_ids[1]},
        ],
    )
    i0 = quote["items"][0]["id"]
    i1 = quote["items"][1]["id"]

    # Approve only one → approved_partial
    http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{i0}/approve", headers=_h(dentist_token)
    ).raise_for_status()
    q = http_client.get(f"/api/finance/quotes/{quote['id']}", headers=_h(dentist_token)).json()
    assert q["status"] == "approved_partial"

    # Reject the other → still approved_partial (1 approved + 1 rejected, no pending)
    http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{i1}/reject",
        headers=_h(dentist_token),
        json={"reason": "Paciente recusou"},
    ).raise_for_status()
    q = http_client.get(f"/api/finance/quotes/{quote['id']}", headers=_h(dentist_token)).json()
    assert q["status"] == "approved_partial"


def test_double_decision_is_blocked(
    http_client: httpx.Client, dentist_token: str, patient_id: str, planned_tp: dict
):
    quote = _create_quote(
        http_client,
        dentist_token,
        patient_id,
        [{"procedure_id": planned_tp["procedure_id"], "tooth_procedure_id": planned_tp["tp_id"]}],
    )
    item_id = quote["items"][0]["id"]
    http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{item_id}/approve",
        headers=_h(dentist_token),
    ).raise_for_status()

    # Try to reject already-approved item
    r = http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{item_id}/reject",
        headers=_h(dentist_token),
        json={"reason": "late change"},
    )
    assert r.status_code == 422


# ── Cancellation ──────────────────────────────────────────────


def test_cancel_quote(
    http_client: httpx.Client, dentist_token: str, patient_id: str, planned_tp: dict
):
    quote = _create_quote(
        http_client,
        dentist_token,
        patient_id,
        [{"procedure_id": planned_tp["procedure_id"], "tooth_procedure_id": planned_tp["tp_id"]}],
    )
    r = http_client.post(
        f"/api/finance/quotes/{quote['id']}/cancel",
        headers=_h(dentist_token),
        json={"reason": "duplicado"},
    )
    assert r.status_code == 200
    assert r.json()["status"] == "cancelled"

    # Subsequent operations forbidden
    item_id = quote["items"][0]["id"]
    r = http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{item_id}/approve",
        headers=_h(dentist_token),
    )
    assert r.status_code == 422


# ── Ad-hoc item (no tooth_procedure_id) does NOT bridge ───────


def test_adhoc_item_does_not_trigger_bridge(
    http_client: httpx.Client, dentist_token: str, patient_id: str
):
    # Find a procedure that does not require a tooth
    procs = http_client.get(
        "/api/procedures",
        headers=_h(dentist_token),
        params={"page": 1, "page_size": 30},
    ).json()["items"]
    candidate = next(
        (p for p in procs if not p["requires_tooth"]), None
    )
    if candidate is None:
        pytest.skip("No procedure with requires_tooth=False in catalog")

    quote = _create_quote(
        http_client, dentist_token, patient_id,
        [{"procedure_id": candidate["id"]}],
    )
    item_id = quote["items"][0]["id"]
    r = http_client.post(
        f"/api/finance/quotes/{quote['id']}/items/{item_id}/approve",
        headers=_h(dentist_token),
    )
    assert r.status_code == 200
    assert r.json()["status"] == "approved"
    assert r.json()["tooth_procedure_id"] is None


# ── Listing ───────────────────────────────────────────────────


def test_list_quotes_paginated(
    http_client: httpx.Client, dentist_token: str, patient_id: str
):
    r = http_client.get(
        "/api/finance/quotes",
        headers=_h(dentist_token),
        params={"page": 1, "page_size": 5, "patient_id": patient_id},
    )
    assert r.status_code == 200
    body = r.json()
    assert "items" in body and "total" in body
