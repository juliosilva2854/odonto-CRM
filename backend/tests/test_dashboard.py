"""Dashboard — overview de KPIs (agregados por clínica)."""
from __future__ import annotations

import httpx

from tests.test_users_crud import _h, _signup

_EXPECTED_FIELDS = (
    "greeting_name",
    "appointments_today_count",
    "appointments_today_list",
    "patients_total",
    "patients_new_this_month",
    "quotes_month_total",
    "quotes_month_approved",
    "quotes_month_amount",
    "checkins_today",
    "pending_quotes_count",
    "procedures_top_5",
)


def test_dashboard_overview_returns_all_fields(
    http_client: httpx.Client, admin_token: str
) -> None:
    r = http_client.get("/api/dashboard/overview", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    body = r.json()
    for field in _EXPECTED_FIELDS:
        assert field in body, f"campo ausente: {field}"
    assert isinstance(body["appointments_today_list"], list)
    assert isinstance(body["procedures_top_5"], list)
    assert isinstance(body["greeting_name"], str)


def test_dashboard_respects_clinic_isolation(http_client: httpx.Client) -> None:
    token, _ = _signup(http_client)  # clínica nova e vazia
    r = http_client.get("/api/dashboard/overview", headers=_h(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["patients_total"] == 0
    assert body["appointments_today_count"] == 0
    assert body["quotes_month_total"] == 0
    assert body["appointments_today_list"] == []
    assert body["procedures_top_5"] == []


def test_dashboard_top_procedures_sorted_desc(
    http_client: httpx.Client, admin_token: str
) -> None:
    r = http_client.get("/api/dashboard/overview", headers=_h(admin_token))
    assert r.status_code == 200, r.text
    counts = [p["count"] for p in r.json()["procedures_top_5"]]
    assert counts == sorted(counts, reverse=True)
    assert len(counts) <= 5
