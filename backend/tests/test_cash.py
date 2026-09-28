"""Financeiro — caixa diário (cash movements): criação, resumo e isolamento."""
from __future__ import annotations

import random
import uuid
from datetime import date, timedelta
from decimal import Decimal

import httpx

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
ADMIN_PASSWORD = "Senha1234"


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _signup_clinica(http_client: httpx.Client) -> str:
    """Cria clínica no plano 'clinica' (financial_core habilitado)."""
    uid = uuid.uuid4().hex[:8]
    r = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Cash {uid} LTDA",
            "clinic_trade_name": f"Cash {uid}",
            "clinic_cnpj": _random_cnpj(),
            "admin_full_name": "Owner Cash",
            "admin_email": f"owner-{uid}@odonto-cash.com.br",
            "admin_password": ADMIN_PASSWORD,
            "plan": "clinica",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["access_token"]


def _wide_range() -> tuple[str, str]:
    today = date.today()
    return (
        (today - timedelta(days=1)).isoformat(),
        (today + timedelta(days=1)).isoformat(),
    )


def test_create_income_movement(http_client: httpx.Client) -> None:
    token = _signup_clinica(http_client)
    r = http_client.post(
        "/api/finance/cash",
        headers=_h(token),
        json={
            "type": "income",
            "category": "consulta",
            "description": "Pagamento consulta",
            "amount": 250.00,
            "payment_method": "pix",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["type"] == "income"
    assert Decimal(str(body["amount"])) == Decimal("250")
    assert body["payment_method"] == "pix"


def test_create_expense_movement(http_client: httpx.Client) -> None:
    token = _signup_clinica(http_client)
    r = http_client.post(
        "/api/finance/cash",
        headers=_h(token),
        json={
            "type": "expense",
            "category": "material",
            "description": "Compra de resina",
            "amount": 89.90,
            "payment_method": "card_debit",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["type"] == "expense"
    assert Decimal(str(body["amount"])) == Decimal("89.90")


def test_cash_summary_aggregates_correctly(http_client: httpx.Client) -> None:
    token = _signup_clinica(http_client)
    payloads = [
        ("income", "100.00"),
        ("income", "50.00"),
        ("expense", "30.00"),
    ]
    for mtype, amount in payloads:
        r = http_client.post(
            "/api/finance/cash",
            headers=_h(token),
            json={
                "type": mtype,
                "category": "teste",
                "description": "mov",
                "amount": float(amount),
                "payment_method": "cash",
            },
        )
        assert r.status_code == 201, r.text

    start, end = _wide_range()
    s = http_client.get(
        "/api/finance/cash/summary",
        headers=_h(token),
        params={"start": start, "end": end},
    )
    assert s.status_code == 200, s.text
    body = s.json()
    assert Decimal(str(body["total_income"])) == Decimal("150.00")
    assert Decimal(str(body["total_expense"])) == Decimal("30.00")
    assert Decimal(str(body["balance"])) == Decimal("120.00")
    assert body["count"] == 3


def test_cash_respects_clinic_isolation(http_client: httpx.Client) -> None:
    token_a = _signup_clinica(http_client)
    token_b = _signup_clinica(http_client)

    ra = http_client.post(
        "/api/finance/cash",
        headers=_h(token_a),
        json={
            "type": "income",
            "category": "consulta",
            "description": "A only",
            "amount": 500.00,
            "payment_method": "pix",
        },
    )
    assert ra.status_code == 201, ra.text

    start, end = _wide_range()
    sb = http_client.get(
        "/api/finance/cash/summary",
        headers=_h(token_b),
        params={"start": start, "end": end},
    )
    assert sb.status_code == 200, sb.text
    body = sb.json()
    assert body["count"] == 0
    assert Decimal(str(body["total_income"])) == Decimal("0")

    day_b = http_client.get("/api/finance/cash", headers=_h(token_b))
    assert day_b.status_code == 200, day_b.text
    assert day_b.json()["movements"] == []
