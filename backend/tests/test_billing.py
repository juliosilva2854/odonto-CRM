"""Billing — status, checkout e portal (Stripe mockado; nunca API real)."""
from __future__ import annotations

import hashlib
import hmac
import json
import random
import time
import uuid
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from src.core.config import get_settings

_settings = get_settings()

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)

RECEPTION_EMAIL = "reception@demo.odonto"
RECEPTION_PASSWORD = "Reception@123"


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _signup(http_client: httpx.Client, plan: str = "pro") -> dict:
    uid = uuid.uuid4().hex[:8]
    r = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Billing {uid} LTDA",
            "clinic_trade_name": f"Billing {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Admin Billing",
            "admin_email": f"admin-{uid}@odonto-billing.com.br",
            "admin_password": "Senha1234",
            "plan": plan,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


# ── Status ────────────────────────────────────────────────────


def test_billing_status_returns_trialing(http_client: httpx.Client) -> None:
    token = _signup(http_client)["access_token"]

    r = http_client.get("/api/billing/status", headers=_h(token))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["subscription_status"] == "trialing"
    assert body["plan"] == "pro"
    assert body["trial_ends_at"]
    assert body["current_period_end"] is None
    assert body["is_active"] is True
    assert body["is_trialing"] is True
    # Ids do Stripe nunca vazam
    assert "stripe_customer_id" not in body
    assert "stripe_subscription_id" not in body


def test_billing_status_requires_admin(http_client: httpx.Client) -> None:
    login = http_client.post(
        "/api/auth/login",
        json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
    )
    assert login.status_code == 200, login.text
    r = http_client.get("/api/billing/status", headers=_h(login.json()["access_token"]))
    assert r.status_code == 403, r.text


# ── Checkout ──────────────────────────────────────────────────


@pytest.mark.skipif(
    _settings.stripe_configured,
    reason="Stripe realmente configurado — este teste cobre o modo não-configurado",
)
def test_billing_status_without_stripe_configured(http_client: httpx.Client) -> None:
    token = _signup(http_client)["access_token"]

    r = http_client.post("/api/billing/checkout", headers=_h(token), json={"plan": "pro"})
    assert r.status_code == 422, r.text
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    assert "Stripe not configured" in err["message"]


def test_billing_checkout_requires_admin(http_client: httpx.Client) -> None:
    login = http_client.post(
        "/api/auth/login",
        json={"email": RECEPTION_EMAIL, "password": RECEPTION_PASSWORD},
    )
    assert login.status_code == 200, login.text
    r = http_client.post(
        "/api/billing/checkout",
        headers=_h(login.json()["access_token"]),
        json={"plan": "pro"},
    )
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "forbidden"


@pytest.mark.asyncio
async def test_billing_checkout_returns_url_when_mocked(http_client: httpx.Client) -> None:
    """Roda in-process (ASGI) para poder mockar o stripe_client."""
    from src.main import app

    await _reset_pool()
    token = _signup(http_client)["access_token"]
    fake_customer = f"cus_mocked_{uuid.uuid4().hex[:12]}"

    with (
        patch("src.core.stripe_client.get_price_id_for_plan", return_value="price_mocked"),
        patch(
            "src.core.stripe_client.create_customer",
            new=AsyncMock(return_value=fake_customer),
        ) as mock_customer,
        patch(
            "src.core.stripe_client.create_checkout_session",
            new=AsyncMock(return_value=("https://checkout.stripe.com/c/pay/cs_test_mocked", "cs_test_mocked")),
        ) as mock_checkout,
    ):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as client:
            r = await client.post(
                "/api/billing/checkout", headers=_h(token), json={"plan": "pro"}
            )

    assert r.status_code == 200, r.text
    body = r.json()
    assert body["checkout_url"].startswith("https://checkout.stripe.com/")
    assert body["session_id"] == "cs_test_mocked"
    mock_customer.assert_awaited_once()
    mock_checkout.assert_awaited_once()

    # O customer criado foi persistido, mas não é exposto no /status
    status_resp = http_client.get("/api/billing/status", headers=_h(token))
    assert status_resp.status_code == 200, status_resp.text
    assert "stripe_customer_id" not in status_resp.json()


# ── Portal ────────────────────────────────────────────────────


def test_billing_portal_fails_if_no_customer(http_client: httpx.Client) -> None:
    token = _signup(http_client)["access_token"]

    r = http_client.post("/api/billing/portal", headers=_h(token))
    assert r.status_code == 422, r.text
    err = r.json()["error"]
    assert err["code"] == "validation_error"
    assert "Stripe customer" in err["message"]


# ── Webhook ───────────────────────────────────────────────────

WHSEC = "whsec_test_xxx"


def _sign_payload(payload: bytes, secret: str) -> str:
    timestamp = int(time.time())
    signed = f"{timestamp}.{payload.decode()}"
    sig = hmac.new(secret.encode(), signed.encode(), hashlib.sha256).hexdigest()
    return f"t={timestamp},v1={sig}"


async def _post_webhook(
    body: dict, *, secret: str = WHSEC, signature: str | None = None
) -> httpx.Response:
    """Chama o webhook in-process (ASGI) — permite monkeypatch dos settings."""
    from src.main import app

    await _reset_pool()
    payload = json.dumps(body).encode()
    sig = signature if signature is not None else _sign_payload(payload, secret)
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as client:
        return await client.post(
            "/api/billing/webhook",
            content=payload,
            headers={"Stripe-Signature": sig, "Content-Type": "application/json"},
        )


async def _sql_one(query: str, params: dict):
    """Query direta num engine próprio (NullPool) — evita reuso de conexão entre loops."""
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(_settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            return (await conn.execute(text(query), params)).first()
    finally:
        await engine.dispose()


async def _set_stripe_customer(clinic_id: str, customer_id: str) -> None:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(_settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.execute(
                text("UPDATE clinics SET stripe_customer_id = :c WHERE id = CAST(:i AS uuid)"),
                {"c": customer_id, "i": clinic_id},
            )
    finally:
        await engine.dispose()


async def _reset_pool() -> None:
    """Abandona conexões do pool global criadas em outro event loop."""
    from src.core.database import engine

    await engine.dispose(close=False)


def _subscription_event(customer_id: str, *, event_type: str, status: str = "active") -> dict:
    return {
        "id": f"evt_{uuid.uuid4().hex[:20]}",
        "type": event_type,
        "data": {
            "object": {
                "id": f"sub_{uuid.uuid4().hex[:14]}",
                "object": "subscription",
                "customer": customer_id,
                "status": status,
                "current_period_end": int(time.time()) + 30 * 86400,
            }
        },
    }


def test_webhook_rejects_invalid_signature(http_client: httpx.Client) -> None:
    r = http_client.post(
        "/api/billing/webhook",
        content=b'{"type":"test"}',
        headers={"Stripe-Signature": "t=1,v1=invalid", "Content-Type": "application/json"},
    )
    assert r.status_code == 400, r.text
    assert r.json()["error"]["code"] == "invalid_signature"


@pytest.mark.asyncio
async def test_webhook_requires_secret_configured(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(_settings, "STRIPE_WEBHOOK_SECRET", None)
    r = await _post_webhook({"id": "evt_x", "type": "test"})
    assert r.status_code == 503, r.text
    assert r.json()["error"]["code"] == "webhook_not_configured"


@pytest.mark.asyncio
async def test_webhook_processes_subscription_created(
    http_client: httpx.Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(_settings, "STRIPE_WEBHOOK_SECRET", WHSEC)
    clinic_id = _signup(http_client)["clinic"]["id"]
    customer_id = f"cus_test_{uuid.uuid4().hex[:12]}"
    await _set_stripe_customer(clinic_id, customer_id)

    event = _subscription_event(customer_id, event_type="customer.subscription.created")
    r = await _post_webhook(event)
    assert r.status_code == 200, r.text
    assert r.json() == {"received": True}

    clinic = await _sql_one(
        "SELECT subscription_status, stripe_subscription_id, current_period_end "
        "FROM clinics WHERE id = CAST(:i AS uuid)",
        {"i": clinic_id},
    )
    assert clinic.subscription_status == "active"
    assert clinic.stripe_subscription_id == event["data"]["object"]["id"]
    assert clinic.current_period_end is not None

    row = await _sql_one(
        "SELECT status, event_type, clinic_id FROM billing_events WHERE stripe_event_id = :e",
        {"e": event["id"]},
    )
    assert row.status == "processed"
    assert row.event_type == "customer.subscription.created"
    assert str(row.clinic_id) == clinic_id


@pytest.mark.asyncio
async def test_webhook_idempotent(
    http_client: httpx.Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr(_settings, "STRIPE_WEBHOOK_SECRET", WHSEC)
    clinic_id = _signup(http_client)["clinic"]["id"]
    customer_id = f"cus_test_{uuid.uuid4().hex[:12]}"
    await _set_stripe_customer(clinic_id, customer_id)

    event = _subscription_event(customer_id, event_type="customer.subscription.created")

    first = await _post_webhook(event)
    assert first.status_code == 200, first.text

    # Estado depois do 1o processamento
    before = await _sql_one(
        "SELECT subscription_status, stripe_subscription_id FROM clinics "
        "WHERE id = CAST(:i AS uuid)",
        {"i": clinic_id},
    )

    # Retry do Stripe com o MESMO event id
    second = await _post_webhook(event)
    assert second.status_code == 200, second.text

    count = await _sql_one(
        "SELECT count(*) AS n FROM billing_events WHERE stripe_event_id = :e",
        {"e": event["id"]},
    )
    assert count.n == 1

    after = await _sql_one(
        "SELECT subscription_status, stripe_subscription_id FROM clinics "
        "WHERE id = CAST(:i AS uuid)",
        {"i": clinic_id},
    )
    assert after.subscription_status == before.subscription_status
    assert after.stripe_subscription_id == before.stripe_subscription_id


@pytest.mark.asyncio
async def test_webhook_unknown_event_marked_ignored(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(_settings, "STRIPE_WEBHOOK_SECRET", WHSEC)
    event = {
        "id": f"evt_{uuid.uuid4().hex[:20]}",
        "type": "customer.discount.created",
        "data": {"object": {"id": "di_123"}},
    }
    r = await _post_webhook(event)
    assert r.status_code == 200, r.text

    row = await _sql_one(
        "SELECT status, clinic_id FROM billing_events WHERE stripe_event_id = :e",
        {"e": event["id"]},
    )
    assert row.status == "ignored"
    assert row.clinic_id is None
