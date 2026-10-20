"""Billing × acordo comercial — checkout garante o Stripe Customer e aplica o desconto.

Stripe é sempre mockado (nunca API real). O checkout roda in-process (ASGI) para
permitir o patch do ``stripe_client``; o acordo é definido via Super Admin (HTTP).
"""
from __future__ import annotations

import os
import uuid
from decimal import Decimal
from unittest.mock import AsyncMock, patch

import httpx
import pytest

from tests.test_billing import _h, _reset_pool, _set_stripe_customer, _signup

SUPER_EMAIL = os.getenv("DENTAL_SUPER_EMAIL", "super@odonto.com")
SUPER_PASSWORD = os.getenv("DENTAL_SUPER_PASSWORD", "SuperAdmin123!")


@pytest.fixture(scope="module")
def super_token(http_client: httpx.Client) -> str:
    r = http_client.post("/api/auth/login", json={"email": SUPER_EMAIL, "password": SUPER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


def _set_pricing(http_client: httpx.Client, token: str, clinic_id: str, amount, coupon) -> None:
    r = http_client.put(
        f"/api/admin/clinics/{clinic_id}/custom-pricing",
        headers=_h(token),
        json={"custom_price_amount": amount, "stripe_coupon_id": coupon},
    )
    assert r.status_code == 200, r.text


async def _checkout(token: str, calls: list[str], customer_id: str):
    from src.main import app

    async def _customer(**_kw):
        calls.append("create_customer")
        return customer_id

    async def _price(*_a, **_kw):
        calls.append("create_recurring_price")
        return "price_custom_mocked"

    async def _session(**_kw):
        calls.append("create_checkout_session")
        return "https://checkout.stripe.com/c/pay/cs_test_custom", "cs_test_custom"

    with (
        patch("src.core.stripe_client.get_price_id_for_plan", return_value="price_plan_default"),
        patch("src.core.stripe_client.create_customer", new=AsyncMock(side_effect=_customer)) as m_cus,
        patch("src.core.stripe_client.create_recurring_price", new=AsyncMock(side_effect=_price)) as m_price,
        patch("src.core.stripe_client.create_checkout_session", new=AsyncMock(side_effect=_session)) as m_sess,
    ):
        transport = httpx.ASGITransport(app=app)
        async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as client:
            r = await client.post("/api/billing/checkout", headers=_h(token), json={"plan": "pro"})
    return r, m_cus, m_price, m_sess


@pytest.mark.asyncio
async def test_checkout_with_custom_price_and_coupon(
    http_client: httpx.Client, super_token: str
) -> None:
    await _reset_pool()
    signup = _signup(http_client)
    clinic_id, token = signup["clinic"]["id"], signup["access_token"]
    _set_pricing(http_client, super_token, clinic_id, 199.0, "FOUNDER50")

    calls: list[str] = []
    fake_customer = f"cus_custom_{uuid.uuid4().hex[:10]}"
    r, m_cus, m_price, m_sess = await _checkout(token, calls, fake_customer)

    assert r.status_code == 200, r.text
    assert r.json()["session_id"] == "cs_test_custom"
    # Customer garantido ANTES da sessão.
    assert calls == ["create_customer", "create_recurring_price", "create_checkout_session"]
    m_cus.assert_awaited_once()
    # Preço especial vira um Price dinâmico com o valor acordado.
    amount, plan = m_price.await_args.args
    assert Decimal(str(amount)) == Decimal("199.00") and plan == "pro"
    kwargs = m_sess.await_args.kwargs
    assert kwargs["customer_id"] == fake_customer
    assert kwargs["price_id"] == "price_custom_mocked"
    assert kwargs["coupon_id"] == "FOUNDER50"


@pytest.mark.asyncio
async def test_checkout_coupon_only_uses_plan_price_and_existing_customer(
    http_client: httpx.Client, super_token: str
) -> None:
    await _reset_pool()
    signup = _signup(http_client)
    clinic_id, token = signup["clinic"]["id"], signup["access_token"]
    _set_pricing(http_client, super_token, clinic_id, None, "PROMO20")
    existing = f"cus_existing_{uuid.uuid4().hex[:10]}"
    await _set_stripe_customer(clinic_id, existing)
    await _reset_pool()

    calls: list[str] = []
    r, m_cus, m_price, m_sess = await _checkout(token, calls, "cus_should_not_be_created")

    assert r.status_code == 200, r.text
    m_cus.assert_not_awaited()  # idempotente: reaproveita o customer existente
    m_price.assert_not_awaited()  # sem preço especial → price_id padrão do plano
    kwargs = m_sess.await_args.kwargs
    assert kwargs["customer_id"] == existing
    assert kwargs["price_id"] == "price_plan_default"
    assert kwargs["coupon_id"] == "PROMO20"


@pytest.mark.asyncio
async def test_checkout_standard_pricing_has_no_discount(http_client: httpx.Client) -> None:
    await _reset_pool()
    token = _signup(http_client)["access_token"]

    calls: list[str] = []
    r, m_cus, m_price, m_sess = await _checkout(token, calls, f"cus_std_{uuid.uuid4().hex[:10]}")

    assert r.status_code == 200, r.text
    assert calls == ["create_customer", "create_checkout_session"]
    m_price.assert_not_awaited()
    kwargs = m_sess.await_args.kwargs
    assert kwargs["price_id"] == "price_plan_default"
    assert kwargs["coupon_id"] is None
