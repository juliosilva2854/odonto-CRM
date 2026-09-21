"""Independent live-HTTP verification of the SubscriptionGateMiddleware.

Hits the running uvicorn on 127.0.0.1:8765 (no ASGI in-process) to catch
regressions the in-process suite might mask (middleware ordering, real DB
sessions, real ASGI stack). Covers:

- Extra business routes are gated (not only /api/patients).
- Allowlist is honoured for billing (incl. webhook), auth, health, docs.
- Anonymous / malformed tokens => 401 (not 402).
- Regression: seed 'Demo Odonto' (trial_ends_at NULL) is NOT blocked.
"""
from __future__ import annotations

import os
import random
import uuid

import httpx
import psycopg2
import pytest

BASE_URL = os.environ.get("LIVE_BASE_URL", "http://127.0.0.1:8765")
DSN = "postgresql://dental:dental@localhost:5432/dental_crm"

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _sql(query: str, params: tuple = ()) -> None:
    conn = psycopg2.connect(DSN)
    try:
        with conn.cursor() as cur:
            cur.execute(query, params)
        conn.commit()
    finally:
        conn.close()


@pytest.fixture(scope="module")
def client() -> httpx.Client:
    with httpx.Client(base_url=BASE_URL, timeout=15.0) as c:
        yield c


def _signup(client: httpx.Client) -> dict:
    uid = uuid.uuid4().hex[:8]
    email = f"gate2-{uid}@odonto-verify.com.br"
    r = client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Verify Gate {uid} LTDA",
            "clinic_trade_name": f"VG {uid}",
            "clinic_cnpj": _cnpj(),
            "admin_full_name": "Admin Verify",
            "admin_email": email,
            "admin_password": "Senha1234",
            "plan": "pro",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    return {
        "token": body["access_token"],
        "clinic_id": body["clinic"]["id"],
        "email": email,
        "password": "Senha1234",
    }


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ── Ensure gate is enabled on the running server ──────────────


def test_gate_is_enabled_on_running_server(client: httpx.Client) -> None:
    """Sanity: anonymous business route → 401 (means routing reached auth);
    with a canceled clinic we must get 402 later — proves gate ON."""
    r = client.get("/api/patients")
    assert r.status_code == 401, r.text


# ── Multiple business routes blocked when canceled ────────────


@pytest.mark.parametrize(
    "path",
    [
        "/api/patients",
        "/api/agenda/appointments",
        "/api/finance/quotes",
        "/api/procedures",
        "/api/specialties",
        "/api/clinic-features",
        "/api/clinics/me",
    ],
)
def test_business_routes_blocked_when_canceled(client: httpx.Client, path: str) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'canceled' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.get(path, headers=_h(acc["token"]))
    assert r.status_code == 402, f"{path} -> {r.status_code} {r.text}"
    body = r.json()
    assert body["error"]["code"] == "subscription_inactive"
    assert body["error"]["details"]["subscription_status"] == "canceled"


# ── Trial expired blocks on multiple routes ───────────────────


@pytest.mark.parametrize(
    "path", ["/api/patients", "/api/agenda/appointments", "/api/finance/quotes"]
)
def test_business_routes_blocked_when_trial_expired(
    client: httpx.Client, path: str
) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET trial_ends_at = now() - interval '1 day' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.get(path, headers=_h(acc["token"]))
    assert r.status_code == 402, r.text
    body = r.json()
    assert body["error"]["code"] == "subscription_inactive"
    assert body["error"]["details"]["subscription_status"] == "trialing"
    assert body["error"]["details"]["trial_ends_at"] is not None


def test_past_due_blocks(client: httpx.Client) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'past_due' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.get("/api/patients", headers=_h(acc["token"]))
    assert r.status_code == 402
    assert r.json()["error"]["details"]["subscription_status"] == "past_due"


def test_active_bypasses_expired_trial(client: httpx.Client) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET trial_ends_at = now() - interval '1 day', "
        "subscription_status = 'active' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.get("/api/patients", headers=_h(acc["token"]))
    assert r.status_code == 200, r.text


# ── Allowlist ─────────────────────────────────────────────────


def test_billing_status_accessible_when_past_due(client: httpx.Client) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'past_due' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.get("/api/billing/status", headers=_h(acc["token"]))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subscription_status"] == "past_due"
    assert body["is_active"] is False
    # No leaks
    assert "stripe_customer_id" not in body
    assert "stripe_subscription_id" not in body


def test_billing_checkout_returns_422_not_402_when_blocked(client: httpx.Client) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'past_due' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.post(
        "/api/billing/checkout", headers=_h(acc["token"]), json={"plan": "pro"}
    )
    assert r.status_code != 402, "checkout must never be 402 (allowlisted)"
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "validation_error"


def test_auth_login_and_me_accessible_when_canceled(client: httpx.Client) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'canceled' WHERE id = %s",
        (acc["clinic_id"],),
    )
    login = client.post(
        "/api/auth/login",
        json={"email": acc["email"], "password": acc["password"]},
    )
    assert login.status_code == 200, login.text
    new_token = login.json()["access_token"]
    me = client.get("/api/auth/me", headers=_h(new_token))
    assert me.status_code == 200, me.text


def test_health_openapi_docs_no_token(client: httpx.Client) -> None:
    for path in ("/api/health", "/api/openapi.json", "/api/docs"):
        r = client.get(path)
        assert r.status_code == 200, f"{path} -> {r.status_code}"


# CRITICAL: webhook must never be 402 — Stripe would retry indefinitely
def test_webhook_never_402_invalid_signature(client: httpx.Client) -> None:
    r = client.post(
        "/api/billing/webhook",
        headers={"Stripe-Signature": "t=1,v1=deadbeef"},
        content=b'{"id":"evt_test","type":"noop"}',
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_signature"


def test_webhook_never_402_missing_signature(client: httpx.Client) -> None:
    r = client.post(
        "/api/billing/webhook", content=b'{"id":"evt_test","type":"noop"}'
    )
    assert r.status_code == 400, r.text


# Webhook must also be reachable even when the requesting IP corresponds to a
# blocked clinic (webhook has no Authorization header, so gate doesn't lookup
# a clinic anyway — but we still assert it doesn't 402).
def test_webhook_never_402_even_with_bearer_of_blocked_clinic(
    client: httpx.Client,
) -> None:
    acc = _signup(client)
    _sql(
        "UPDATE clinics SET subscription_status = 'canceled' WHERE id = %s",
        (acc["clinic_id"],),
    )
    r = client.post(
        "/api/billing/webhook",
        headers={
            "Stripe-Signature": "t=1,v1=deadbeef",
            "Authorization": f"Bearer {acc['token']}",
        },
        content=b'{"id":"evt_test","type":"noop"}',
    )
    assert r.status_code != 402
    assert r.status_code == 400


# ── Anonymous / malformed → 401 (never 402) ───────────────────


def test_anonymous_on_business_route_is_401(client: httpx.Client) -> None:
    r = client.get("/api/patients")
    assert r.status_code == 401
    assert r.status_code != 402


def test_malformed_token_is_401(client: httpx.Client) -> None:
    r = client.get(
        "/api/patients", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert r.status_code == 401
    assert r.status_code != 402


def test_expired_or_bad_signature_token_is_401(client: httpx.Client) -> None:
    # Well-formed 3-part JWT with garbage signature
    fake = (
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9."
        "eyJzdWIiOiJ4IiwiY2xpbmljX2lkIjoiMDAwMDAwMDAtMDAwMC0wMDAwLTAwMDAtMDAwMDAwMDAwMDAwIiwidHlwZSI6ImFjY2VzcyIsImV4cCI6MX0."
        "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA"
    )
    r = client.get("/api/patients", headers={"Authorization": f"Bearer {fake}"})
    assert r.status_code == 401
    assert r.status_code != 402


# ── Regression: seed Demo Odonto (trial_ends_at NULL) not blocked ──


@pytest.mark.parametrize(
    "email,password",
    [
        ("admin@demo.odonto", "Admin@123"),
        ("dentist@demo.odonto", "Dentist@123"),
        ("reception@demo.odonto", "Reception@123"),
    ],
)
def test_demo_seed_users_not_blocked(
    client: httpx.Client, email: str, password: str
) -> None:
    login = client.post(
        "/api/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200, login.text
    token = login.json()["access_token"]
    r = client.get("/api/patients", headers=_h(token))
    assert r.status_code == 200, r.text
    # And another business route
    # /api/agenda/appointments requires start/end query params — a 422
    # (validation reached) also proves the gate let the request through.
    r2 = client.get("/api/agenda/appointments", headers=_h(token))
    assert r2.status_code != 402, r2.text
    assert r2.status_code in (200, 422), r2.text
    # And a route with no required params
    r3 = client.get("/api/procedures", headers=_h(token))
    assert r3.status_code == 200, r3.text
