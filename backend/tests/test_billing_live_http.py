"""Live HTTP smoke tests against the running uvicorn (127.0.0.1:8765).

Confirms the review-request contracts after the mark_failed() removal:
 - admin status trialing + no stripe_* fields leaked
 - non-admin 403 on status/checkout
 - checkout 422 validation_error when Stripe not configured
 - portal 422 validation_error when clinic has no stripe_customer_id
 - webhook 400 invalid_signature (with bad header and missing header)
"""
from __future__ import annotations

import random
import string

import httpx

BASE = "http://127.0.0.1:8765"


def _cnpj_check(digits: list[int], weights: list[int]) -> int:
    s = sum(d * w for d, w in zip(digits, weights))
    r = s % 11
    return 0 if r < 2 else 11 - r


def _random_cnpj() -> str:
    base = [random.randint(0, 9) for _ in range(8)] + [0, 0, 0, 1]
    d1 = _cnpj_check(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    d2 = _cnpj_check(base + [d1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2])
    return "".join(str(d) for d in base + [d1, d2])


def _random_email() -> str:
    tag = "".join(random.choices(string.ascii_lowercase, k=8))
    return f"test_{tag}@example.com"


def _signup_admin() -> tuple[httpx.Client, dict]:
    client = httpx.Client(base_url=BASE, timeout=15.0)
    email = _random_email()
    password = "Admin@1234"
    r = client.post(
        "/api/public/signup",
        json={
            "clinic_cnpj": _random_cnpj(),
            "clinic_trade_name": "TEST Clinic",
            "clinic_legal_name": "TEST Clinic LTDA",
            "admin_email": email,
            "admin_password": password,
            "admin_full_name": "Test Admin",
            "plan": "pro",
        },
    )
    assert r.status_code in (200, 201), r.text
    # login
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    token = r.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client, {"email": email}


def _login(email: str, password: str) -> httpx.Client:
    client = httpx.Client(base_url=BASE, timeout=15.0)
    r = client.post("/api/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, r.text
    client.headers["Authorization"] = f"Bearer {r.json()['access_token']}"
    return client


def test_health_ok():
    r = httpx.get(f"{BASE}/api/health", timeout=5.0)
    assert r.status_code == 200
    assert r.json().get("status") == "ok"


def test_admin_status_trialing_and_no_stripe_ids_leaked():
    client, _ = _signup_admin()
    r = client.get("/api/billing/status")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subscription_status"] == "trialing"
    assert body["is_active"] is True
    assert body["is_trialing"] is True
    assert "stripe_customer_id" not in body
    assert "stripe_subscription_id" not in body


def test_non_admin_403_on_status_and_checkout():
    client = _login("reception@demo.odonto", "Reception@123")
    r = client.get("/api/billing/status")
    assert r.status_code == 403, r.text
    r = client.post("/api/billing/checkout", json={"plan": "pro"})
    assert r.status_code == 403, r.text


def test_checkout_422_when_stripe_not_configured():
    client, _ = _signup_admin()
    r = client.post("/api/billing/checkout", json={"plan": "pro"})
    assert r.status_code == 422, r.text
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    assert "Stripe not configured" in err["message"]


def test_portal_422_when_no_stripe_customer():
    client, _ = _signup_admin()
    r = client.post("/api/billing/portal")
    assert r.status_code == 422, r.text
    assert r.json()["error"]["code"] == "validation_error"


def test_webhook_400_invalid_signature_bad_header():
    r = httpx.post(
        f"{BASE}/api/billing/webhook",
        content=b'{"id":"evt_x","type":"customer.subscription.created"}',
        headers={"Stripe-Signature": "t=1,v1=invalid", "Content-Type": "application/json"},
        timeout=5.0,
    )
    # Note: with STRIPE_WEBHOOK_SECRET=whsec_PLACEHOLDER, secret IS set,
    # so we expect signature verification path -> 400 invalid_signature.
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_signature"


def test_webhook_400_missing_signature_header():
    r = httpx.post(
        f"{BASE}/api/billing/webhook",
        content=b"{}",
        headers={"Content-Type": "application/json"},
        timeout=5.0,
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_signature"
