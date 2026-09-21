"""Onboarding — public signup end-to-end (clinic + admin + defaults + tokens)."""
from __future__ import annotations

import random
import uuid

import httpx

_W1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
_W2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)


def _dv(digits: str, weights: tuple[int, ...]) -> int:
    rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
    return 0 if rem < 2 else 11 - rem


def _random_cnpj() -> str:
    """Random *valid* CNPJ so each test run creates a fresh clinic."""
    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _W1)
    d2 = _dv(base + str(d1), _W2)
    return f"{base}{d1}{d2}"


def _payload(**overrides) -> dict:
    uid = uuid.uuid4().hex[:8]
    data = {
        "clinic_legal_name": f"Clinica Teste {uid} LTDA",
        "clinic_trade_name": f"Teste {uid}",
        "clinic_cnpj": _random_cnpj(),
        "admin_full_name": "Admin Teste",
        "admin_email": f"admin-{uid}@odonto-signup.com.br",
        "admin_password": "Senha1234",
        "plan": "pro",
    }
    data.update(overrides)
    return data


def _h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _signup(http_client: httpx.Client, **overrides) -> httpx.Response:
    return http_client.post("/api/public/signup", json=_payload(**overrides))


# ── Happy path ────────────────────────────────────────────────


def test_signup_happy_path(http_client: httpx.Client) -> None:
    payload = _payload(plan="pro")
    r = http_client.post("/api/public/signup", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()

    # Tokens
    assert body["token_type"] == "Bearer"
    assert body["access_token"] and body["refresh_token"]
    assert body["expires_in"] > 0
    assert body["trial_ends_at"]

    # Embedded user / clinic
    assert body["user"]["email"] == payload["admin_email"].lower()
    assert body["user"]["role"] == "admin"
    assert body["user"]["is_active"] is True
    assert body["clinic"]["plan"] == "pro"
    assert body["clinic"]["subscription_status"] == "trialing"
    assert body["clinic"]["trial_ends_at"] == body["trial_ends_at"]
    assert "stripe_customer_id" not in body["clinic"]

    # Token actually works and resolves to the new tenant
    me = http_client.get("/api/auth/me", headers=_h(body["access_token"]))
    assert me.status_code == 200, me.text
    me_body = me.json()
    assert me_body["user"]["id"] == body["user"]["id"]
    assert me_body["clinic"]["id"] == body["clinic"]["id"]
    assert me_body["clinic"]["cnpj"] == body["clinic"]["cnpj"]
    assert me_body["clinic"]["subscription_status"] == "trialing"
    # PRO plan features
    assert me_body["features"]["agenda"]["enabled"] is True
    assert me_body["features"]["quotes"]["enabled"] is True
    assert me_body["features"]["contracts"]["enabled"] is False


def test_signup_normalizes_cnpj_and_email(http_client: httpx.Client) -> None:
    raw_cnpj = _random_cnpj()  # unmasked 14 digits
    payload = _payload(clinic_cnpj=raw_cnpj, admin_email=f"MiXeD-{uuid.uuid4().hex[:6]}@Odonto-Signup.Com.Br")
    r = http_client.post("/api/public/signup", json=payload)
    assert r.status_code == 201, r.text
    body = r.json()
    d = raw_cnpj
    assert body["clinic"]["cnpj"] == f"{d[:2]}.{d[2:5]}.{d[5:8]}/{d[8:12]}-{d[12:]}"
    assert body["user"]["email"] == payload["admin_email"].lower()


# ── Conflicts ─────────────────────────────────────────────────


def test_signup_duplicate_cnpj(http_client: httpx.Client) -> None:
    cnpj = _random_cnpj()
    first = _signup(http_client, clinic_cnpj=cnpj)
    assert first.status_code == 201, first.text

    second = _signup(http_client, clinic_cnpj=cnpj)  # different email, same CNPJ
    assert second.status_code == 409, second.text
    assert second.json()["error"]["code"] == "conflict"


def test_signup_duplicate_email(http_client: httpx.Client) -> None:
    email = f"dup-{uuid.uuid4().hex[:8]}@odonto-signup.com.br"
    first = _signup(http_client, admin_email=email)
    assert first.status_code == 201, first.text

    second = _signup(http_client, admin_email=email.upper())  # different CNPJ, same email (case-insensitive)
    assert second.status_code == 409, second.text
    assert second.json()["error"]["code"] == "conflict"


# ── Validation ────────────────────────────────────────────────


def test_signup_invalid_cnpj(http_client: httpx.Client) -> None:
    r = _signup(http_client, clinic_cnpj="11.222.333/0001-82")
    assert r.status_code == 422, r.text
    errors = r.json()["error"]["details"]["errors"]
    assert any("clinic_cnpj" in e["loc"] for e in errors)


def test_signup_weak_password(http_client: httpx.Client) -> None:
    r = _signup(http_client, admin_password="semnumeros")
    assert r.status_code == 422, r.text
    errors = r.json()["error"]["details"]["errors"]
    assert any("admin_password" in e["loc"] for e in errors)

    r = _signup(http_client, admin_password="Ab1")  # too short
    assert r.status_code == 422, r.text


def test_signup_invalid_plan(http_client: httpx.Client) -> None:
    r = _signup(http_client, plan="enterprise")
    assert r.status_code == 422, r.text


# ── Default data ──────────────────────────────────────────────


def test_signup_creates_default_data(http_client: httpx.Client) -> None:
    r = _signup(http_client, plan="clinica")
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]

    procs = http_client.get("/api/procedures", headers=_h(token), params={"page_size": 50})
    assert procs.status_code == 200, procs.text
    assert procs.json()["total"] == 15
    codes = {p["code"] for p in procs.json()["items"]}
    assert {"PROF-01", "REST-1F", "CAN-MOL", "EXO-SIM", "RX-PERI"} <= codes

    specs = http_client.get("/api/specialties", headers=_h(token))
    assert specs.status_code == 200, specs.text
    assert {s["name"] for s in specs.json()} == {"Clínica Geral", "Ortodontia", "Endodontia"}

    rooms = http_client.get("/api/agenda/rooms", headers=_h(token))
    assert rooms.status_code == 200, rooms.text
    assert len(rooms.json()) == 1
    assert rooms.json()[0]["name"] == "Consultório 1"


def test_signup_essencial_plan_has_limited_features(http_client: httpx.Client) -> None:
    r = _signup(http_client, plan="essencial")
    assert r.status_code == 201, r.text
    token = r.json()["access_token"]

    feats = http_client.get("/api/clinic-features", headers=_h(token))
    assert feats.status_code == 200, feats.text
    by_key = {f["feature_key"]: f["enabled"] for f in feats.json()}
    assert len(by_key) == 15
    assert by_key["quotes"] is False
    assert by_key["whatsapp"] is False
    assert by_key["patients"] is True
    assert by_key["agenda"] is True
