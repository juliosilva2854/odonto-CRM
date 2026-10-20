"""Super Admin (platform / cross-tenant) — live HTTP tests.

Each mutating test provisions a *fresh* clinic through the public signup so the
seeded "Demo Odonto" tenant (used by the rest of the suite) is never touched.
"""
from __future__ import annotations

import os
import random
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import pytest

SUPER_EMAIL = os.getenv("DENTAL_SUPER_EMAIL", "super@odonto.com")
SUPER_PASSWORD = os.getenv("DENTAL_SUPER_PASSWORD", "SuperAdmin123!")

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _h(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _parse_dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


@pytest.fixture(scope="module")
def super_token(http_client: httpx.Client) -> str:
    r = http_client.post(
        "/api/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASSWORD}
    )
    assert r.status_code == 200, (
        f"Super admin login failed ({r.status_code}). Create it with "
        "`python -m scripts.create_super_admin`."
    )
    return r.json()["access_token"]


def _new_clinic(http_client: httpx.Client, plan: str = "pro") -> dict:
    uid = uuid.uuid4().hex[:8]
    payload = {
        "clinic_legal_name": f"Clinica SA {uid} LTDA",
        "clinic_trade_name": f"SuperAdmin {uid}",
        "clinic_cnpj": _random_cnpj(),
        "admin_full_name": "Admin SA",
        "admin_email": f"sa-{uid}@odonto-superadmin.com.br",
        "admin_password": "Senha1234",
        "plan": plan,
    }
    r = http_client.post("/api/public/signup", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    return {
        "id": body["clinic"]["id"],
        "trade_name": payload["clinic_trade_name"],
        "admin_email": payload["admin_email"].lower(),
        "admin_token": body["access_token"],
    }


# ── Listing ──────────────────────────────────────────────────


def test_super_admin_can_list_clinics(http_client: httpx.Client, super_token: str) -> None:
    clinic = _new_clinic(http_client)

    r = http_client.get("/api/admin/clinics", headers=_h(super_token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 1
    assert body["page"] == 1
    assert isinstance(body["items"], list) and body["items"]

    # Search narrows down to the freshly created tenant.
    r = http_client.get(
        "/api/admin/clinics",
        headers=_h(super_token),
        params={"search": clinic["trade_name"]},
    )
    assert r.status_code == 200, r.text
    items = r.json()["items"]
    assert [i["id"] for i in items] == [clinic["id"]]
    item = items[0]
    assert item["subscription_status"] == "trialing"
    assert item["plan"] == "pro"
    assert item["users_count"] >= 1

    # Status filter is honoured.
    r = http_client.get(
        "/api/admin/clinics",
        headers=_h(super_token),
        params={"subscription_status": "trialing", "page_size": 100},
    )
    assert r.status_code == 200
    assert all(i["subscription_status"] == "trialing" for i in r.json()["items"])


# ── Authorization ────────────────────────────────────────────


def test_regular_admin_cannot_access_admin(
    http_client: httpx.Client, admin_token: str, dentist_token: str
) -> None:
    for token in (admin_token, dentist_token):
        for method, path in (
            ("GET", "/api/admin/metrics"),
            ("GET", "/api/admin/clinics"),
        ):
            r = http_client.request(method, path, headers=_h(token))
            assert r.status_code == 403, f"{method} {path} → {r.status_code}"
            assert r.json()["error"]["code"] == "forbidden"

    # Mutations are blocked too (clinic id is irrelevant — guard runs first).
    any_id = str(uuid.uuid4())
    r = http_client.post(
        f"/api/admin/clinics/{any_id}/extend-trial", headers=_h(admin_token), json={"days": 7}
    )
    assert r.status_code == 403
    r = http_client.put(
        f"/api/admin/clinics/{any_id}/custom-pricing",
        headers=_h(admin_token),
        json={"custom_price_amount": 1, "stripe_coupon_id": None},
    )
    assert r.status_code == 403

    # Unauthenticated → 401.
    assert http_client.get("/api/admin/clinics").status_code == 401


# ── Impersonation ────────────────────────────────────────────


def test_impersonate_returns_valid_token(http_client: httpx.Client, super_token: str) -> None:
    clinic = _new_clinic(http_client)

    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/impersonate", headers=_h(super_token), json={}
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["token_type"] == "Bearer"
    assert body["expires_in"] > 0
    assert body["clinic_id"] == clinic["id"]
    assert body["email"] == clinic["admin_email"]

    # The token actually works as the clinic admin.
    me = http_client.get("/api/auth/me", headers=_h(body["access_token"]))
    assert me.status_code == 200, me.text
    me_body = me.json()
    assert me_body["user"]["email"] == clinic["admin_email"]
    assert me_body["user"]["role"] == "admin"
    assert me_body["clinic"]["id"] == clinic["id"]

    # And it's a tenant token, not a platform one.
    r = http_client.get("/api/admin/metrics", headers=_h(body["access_token"]))
    assert r.status_code == 403

    # Unknown clinic → 404.
    r = http_client.post(
        f"/api/admin/clinics/{uuid.uuid4()}/impersonate", headers=_h(super_token), json={}
    )
    assert r.status_code == 404


# ── Trial extension ──────────────────────────────────────────


def test_extend_trial_updates_date(http_client: httpx.Client, super_token: str) -> None:
    clinic = _new_clinic(http_client)
    detail = http_client.get(f"/api/admin/clinics/{clinic['id']}", headers=_h(super_token))
    assert detail.status_code == 200, detail.text
    before = _parse_dt(detail.json()["trial_ends_at"])

    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/extend-trial",
        headers=_h(super_token),
        json={"days": 7},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    after = _parse_dt(body["trial_ends_at"])
    assert body["subscription_status"] == "trialing"
    # Still-valid trial → extension stacks on top of the current end date.
    assert abs((after - before) - timedelta(days=7)) < timedelta(seconds=5)

    # Suspended clinic → extension restarts from *now* and re-opens the trial.
    assert (
        http_client.post(
            f"/api/admin/clinics/{clinic['id']}/suspend", headers=_h(super_token), json={}
        ).status_code
        == 200
    )
    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/extend-trial",
        headers=_h(super_token),
        json={"days": 3},
    )
    assert r.status_code == 200, r.text
    assert r.json()["subscription_status"] == "trialing"

    # Validation: days must be 1..365.
    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/extend-trial",
        headers=_h(super_token),
        json={"days": 0},
    )
    assert r.status_code == 422


# ── Metrics ──────────────────────────────────────────────────


def _metrics(http_client: httpx.Client, token: str) -> dict:
    r = http_client.get("/api/admin/metrics", headers=_h(token))
    assert r.status_code == 200, r.text
    return r.json()


def test_metrics_aggregates_correctly(http_client: httpx.Client, super_token: str) -> None:
    m0 = _metrics(http_client, super_token)
    # Internal consistency.
    assert m0["total_clinics"] == (
        m0["active_clinics"]
        + m0["trialing_clinics"]
        + m0["past_due_clinics"]
        + m0["canceled_clinics"]
    )
    assert m0["mrr_brl"] == round(m0["mrr_cents"] / 100, 2)
    assert m0["trials_expiring_count"] == len(m0["trials_expiring"])

    # New clinic → +1 total / +1 trialing.
    clinic = _new_clinic(http_client, plan="pro")
    m1 = _metrics(http_client, super_token)
    assert m1["total_clinics"] == m0["total_clinics"] + 1
    assert m1["trialing_clinics"] == m0["trialing_clinics"] + 1

    # Activate it → counts move and MRR grows by the Pro price (R$ 497,00).
    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/reactivate", headers=_h(super_token), json={}
    )
    assert r.status_code == 200 and r.json()["subscription_status"] == "active"
    m2 = _metrics(http_client, super_token)
    assert m2["active_clinics"] == m1["active_clinics"] + 1
    assert m2["trialing_clinics"] == m1["trialing_clinics"] - 1
    assert m2["mrr_cents"] == m1["mrr_cents"] + 49700

    # Suspend it → leaves MRR, goes to canceled.
    r = http_client.post(
        f"/api/admin/clinics/{clinic['id']}/suspend", headers=_h(super_token), json={}
    )
    assert r.status_code == 200 and r.json()["subscription_status"] == "canceled"
    m3 = _metrics(http_client, super_token)
    assert m3["canceled_clinics"] == m2["canceled_clinics"] + 1
    assert m3["active_clinics"] == m2["active_clinics"] - 1
    assert m3["mrr_cents"] == m1["mrr_cents"]

    # "Trials expiring" only lists trialing clinics ending within the 7-day window.
    now = datetime.now(timezone.utc)
    m4 = _metrics(http_client, super_token)
    for c in m4["trials_expiring"]:
        assert c["subscription_status"] == "trialing"
        assert now < _parse_dt(c["trial_ends_at"]) <= now + timedelta(days=7, minutes=1)
    # A fresh 14-day trial is outside the window.
    fresh = _new_clinic(http_client)
    m5 = _metrics(http_client, super_token)
    assert fresh["id"] not in {c["id"] for c in m5["trials_expiring"]}


# ── Custom pricing (acordo comercial) ────────────────────────


def test_set_custom_pricing_updates_clinic(
    http_client: httpx.Client, super_token: str
) -> None:
    clinic = _new_clinic(http_client)
    url = f"/api/admin/clinics/{clinic['id']}/custom-pricing"

    detail = http_client.get(f"/api/admin/clinics/{clinic['id']}", headers=_h(super_token))
    assert detail.json()["custom_price_amount"] is None
    assert detail.json()["stripe_coupon_id"] is None

    # Set both.
    r = http_client.put(
        url,
        headers=_h(super_token),
        json={"custom_price_amount": 199.0, "stripe_coupon_id": "  FOUNDER50  "},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["id"] == clinic["id"]
    assert body["custom_price_amount"] == 199.0
    assert body["stripe_coupon_id"] == "FOUNDER50"  # trimmed

    # Persisted (GET reflects it).
    detail = http_client.get(f"/api/admin/clinics/{clinic['id']}", headers=_h(super_token))
    assert detail.json()["custom_price_amount"] == 199.0
    assert detail.json()["stripe_coupon_id"] == "FOUNDER50"

    # Decimal precision (2 places) survives the round trip.
    r = http_client.put(
        url, headers=_h(super_token), json={"custom_price_amount": 249.9, "stripe_coupon_id": None}
    )
    assert r.status_code == 200, r.text
    assert r.json()["custom_price_amount"] == pytest.approx(249.9)
    assert r.json()["stripe_coupon_id"] is None

    # Clear everything → back to standard pricing (blank coupon == null).
    r = http_client.put(
        url, headers=_h(super_token), json={"custom_price_amount": None, "stripe_coupon_id": "   "}
    )
    assert r.status_code == 200, r.text
    assert r.json()["custom_price_amount"] is None
    assert r.json()["stripe_coupon_id"] is None

    # Validation: negative price rejected.
    r = http_client.put(
        url, headers=_h(super_token), json={"custom_price_amount": -1, "stripe_coupon_id": None}
    )
    assert r.status_code == 422

    # Unknown clinic → 404.
    r = http_client.put(
        f"/api/admin/clinics/{uuid.uuid4()}/custom-pricing",
        headers=_h(super_token),
        json={"custom_price_amount": 10, "stripe_coupon_id": None},
    )
    assert r.status_code == 404
