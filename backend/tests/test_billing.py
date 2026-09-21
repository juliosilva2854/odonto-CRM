"""Billing — status, checkout e portal (Stripe mockado; nunca API real)."""
from __future__ import annotations

import random
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
