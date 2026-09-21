"""Subscription gate — 402 para clínicas inadimplentes (middleware)."""
from __future__ import annotations

import random
import uuid

import httpx
import pytest

from src.core.config import get_settings

_settings = get_settings()

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)

GATED_PATH = "/api/patients"


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


def _signup(http_client: httpx.Client) -> dict:
    uid = uuid.uuid4().hex[:8]
    r = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Gate {uid} LTDA",
            "clinic_trade_name": f"Gate {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Admin Gate",
            "admin_email": f"admin-{uid}@odonto-gate.com.br",
            "admin_password": "Senha1234",
            "plan": "pro",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    return {
        "token": body["access_token"],
        "clinic_id": body["clinic"]["id"],
        "email": f"admin-{uid}@odonto-gate.com.br",
        "password": "Senha1234",
    }


async def _sql_exec(query: str, params: dict) -> None:
    from sqlalchemy import text
    from sqlalchemy.ext.asyncio import create_async_engine
    from sqlalchemy.pool import NullPool

    engine = create_async_engine(_settings.DATABASE_URL, poolclass=NullPool)
    try:
        async with engine.begin() as conn:
            await conn.execute(text(query), params)
    finally:
        await engine.dispose()


async def _reset_pool() -> None:
    from src.core.database import engine

    await engine.dispose(close=False)


async def _set_status(clinic_id: str, status: str) -> None:
    await _sql_exec(
        "UPDATE clinics SET subscription_status = :s WHERE id = CAST(:i AS uuid)",
        {"s": status, "i": clinic_id},
    )


async def _expire_trial(clinic_id: str) -> None:
    await _sql_exec(
        "UPDATE clinics SET trial_ends_at = now() - interval '1 day' "
        "WHERE id = CAST(:i AS uuid)",
        {"i": clinic_id},
    )


def _assert_blocked(response: httpx.Response, expected_status: str) -> None:
    assert response.status_code == 402, response.text
    err = response.json()["error"]
    assert err["code"] == "subscription_inactive"
    assert "assinatura" in err["message"].lower()
    assert err["details"]["subscription_status"] == expected_status


# ── Regras de bloqueio ────────────────────────────────────────


def test_trialing_active_passes(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    r = http_client.get(GATED_PATH, headers=_h(account["token"]))
    assert r.status_code == 200, r.text


@pytest.mark.asyncio
async def test_trial_expired_blocks(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    await _expire_trial(account["clinic_id"])

    r = http_client.get(GATED_PATH, headers=_h(account["token"]))
    _assert_blocked(r, "trialing")
    assert r.json()["error"]["details"]["trial_ends_at"] is not None


@pytest.mark.asyncio
async def test_past_due_blocks(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    await _set_status(account["clinic_id"], "past_due")

    r = http_client.get(GATED_PATH, headers=_h(account["token"]))
    _assert_blocked(r, "past_due")


@pytest.mark.asyncio
async def test_canceled_blocks(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    await _set_status(account["clinic_id"], "canceled")

    r = http_client.get(GATED_PATH, headers=_h(account["token"]))
    _assert_blocked(r, "canceled")


@pytest.mark.asyncio
async def test_active_subscription_passes(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    # Trial expirado, mas assinatura paga → passa
    await _expire_trial(account["clinic_id"])
    await _set_status(account["clinic_id"], "active")

    r = http_client.get(GATED_PATH, headers=_h(account["token"]))
    assert r.status_code == 200, r.text


# ── Allowlist ─────────────────────────────────────────────────


@pytest.mark.asyncio
async def test_billing_routes_always_accessible_when_blocked(
    http_client: httpx.Client,
) -> None:
    account = _signup(http_client)
    await _set_status(account["clinic_id"], "past_due")

    status_resp = http_client.get("/api/billing/status", headers=_h(account["token"]))
    assert status_resp.status_code == 200, status_resp.text
    assert status_resp.json()["subscription_status"] == "past_due"
    assert status_resp.json()["is_active"] is False

    checkout = http_client.post(
        "/api/billing/checkout", headers=_h(account["token"]), json={"plan": "pro"}
    )
    assert checkout.status_code == 422, checkout.text  # stripe off, e NÃO 402
    assert checkout.json()["error"]["code"] == "validation_error"


@pytest.mark.asyncio
async def test_auth_routes_always_accessible_when_blocked(http_client: httpx.Client) -> None:
    account = _signup(http_client)
    await _set_status(account["clinic_id"], "canceled")

    login = http_client.post(
        "/api/auth/login",
        json={"email": account["email"], "password": account["password"]},
    )
    assert login.status_code == 200, login.text
    assert login.json()["access_token"]

    me = http_client.get("/api/auth/me", headers=_h(account["token"]))
    assert me.status_code == 200, me.text


def test_health_always_accessible(http_client: httpx.Client) -> None:
    r = http_client.get("/api/health")
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "ok"


def test_anonymous_requests_not_blocked(http_client: httpx.Client) -> None:
    r = http_client.get(GATED_PATH)
    assert r.status_code == 401, r.text


# ── Kill switch ───────────────────────────────────────────────


@pytest.mark.asyncio
async def test_gate_can_be_disabled(
    http_client: httpx.Client, monkeypatch: pytest.MonkeyPatch
) -> None:
    """Com o gate desligado, clínica bloqueada passa (roda in-process)."""
    from src.main import app

    account = _signup(http_client)
    await _set_status(account["clinic_id"], "canceled")

    # Servidor externo continua bloqueando
    blocked = http_client.get(GATED_PATH, headers=_h(account["token"]))
    _assert_blocked(blocked, "canceled")

    monkeypatch.setattr(_settings, "SUBSCRIPTION_GATE_ENABLED", False)
    await _reset_pool()
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://asgi") as client:
        r = await client.get(GATED_PATH, headers=_h(account["token"]))
    assert r.status_code == 200, r.text
