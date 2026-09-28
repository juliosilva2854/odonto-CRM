"""Anamnese digital — criação append-only, histórico e feature flag."""
from __future__ import annotations

import uuid

import httpx
import pytest

from tests.test_users_crud import _h

_QUESTIONNAIRE = {
    "alergias": {
        "type": "checkbox",
        "options": ["dipirona", "penicilina"],
        "value": ["dipirona"],
    },
    "fumante": {"type": "checkbox", "value": True},
    "observacoes": {"type": "text", "value": "Sem queixas"},
}


def _new_patient(http_client: httpx.Client, token: str) -> str:
    r = http_client.post(
        "/api/patients",
        headers=_h(token),
        json={
            "full_name": f"Paciente Anamnese {uuid.uuid4().hex[:6]}",
            "gender": "not_informed",
            "phone_e164": "+5511999990000",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


def test_create_anamnesis(http_client: httpx.Client, admin_token: str) -> None:
    patient_id = _new_patient(http_client, admin_token)
    r = http_client.post(
        f"/api/patients/{patient_id}/anamnesis",
        headers=_h(admin_token),
        json={"questionnaire": _QUESTIONNAIRE, "notes": "primeira versao"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["patient_id"] == patient_id
    assert body["questionnaire"]["fumante"]["value"] is True
    assert body["notes"] == "primeira versao"
    assert body["answered_by_user_id"]


def test_anamnesis_history_returns_all_versions(
    http_client: httpx.Client, admin_token: str
) -> None:
    patient_id = _new_patient(http_client, admin_token)
    for i in range(2):
        r = http_client.post(
            f"/api/patients/{patient_id}/anamnesis",
            headers=_h(admin_token),
            json={"questionnaire": _QUESTIONNAIRE, "notes": f"v{i}"},
        )
        assert r.status_code == 201, r.text

    hist = http_client.get(
        f"/api/patients/{patient_id}/anamnesis/history", headers=_h(admin_token)
    )
    assert hist.status_code == 200, hist.text
    versions = hist.json()
    assert len(versions) == 2
    # mais recente primeiro
    assert versions[0]["created_at"] >= versions[1]["created_at"]

    latest = http_client.get(
        f"/api/patients/{patient_id}/anamnesis", headers=_h(admin_token)
    )
    assert latest.status_code == 200, latest.text
    assert latest.json()["id"] == versions[0]["id"]


def test_anamnesis_get_returns_404_if_empty(
    http_client: httpx.Client, admin_token: str
) -> None:
    patient_id = _new_patient(http_client, admin_token)
    r = http_client.get(
        f"/api/patients/{patient_id}/anamnesis", headers=_h(admin_token)
    )
    assert r.status_code == 404, r.text
    assert r.json()["error"]["code"] == "not_found"


async def _disable_feature(clinic_id: str, feature_key: str) -> None:
    from sqlalchemy import select

    from src.core.database import AsyncSessionLocal, engine
    from src.modules.tenancy.models import ClinicFeature

    await engine.dispose(close=False)
    async with AsyncSessionLocal() as s:
        row = (
            await s.execute(
                select(ClinicFeature).where(
                    ClinicFeature.clinic_id == uuid.UUID(clinic_id),
                    ClinicFeature.feature_key == feature_key,
                )
            )
        ).scalar_one_or_none()
        assert row is not None
        row.enabled = False
        await s.commit()


@pytest.mark.asyncio
async def test_anamnesis_requires_feature_enabled(http_client: httpx.Client) -> None:
    # Signup direto para capturar clinic_id SEM chamar /me (que popularia o
    # cache de features do servidor com anamnesis=True antes de desabilitar).
    import random

    _w1 = (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)
    _w2 = (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2)

    def _dv(digits: str, weights: tuple[int, ...]) -> int:
        rem = sum(int(d) * w for d, w in zip(digits, weights, strict=True)) % 11
        return 0 if rem < 2 else 11 - rem

    base = f"{random.randint(10_000_000, 99_999_999):08d}0001"
    d1 = _dv(base, _w1)
    cnpj = f"{base}{d1}{_dv(base + str(d1), _w2)}"
    uid = uuid.uuid4().hex[:8]

    signup = http_client.post(
        "/api/public/signup",
        json={
            "clinic_legal_name": f"Clinica Anam {uid} LTDA",
            "clinic_trade_name": f"Anam {uid}",
            "clinic_cnpj": cnpj,
            "admin_full_name": "Owner Anam",
            "admin_email": f"owner-{uid}@odonto-anam.com.br",
            "admin_password": "Senha1234",
            "plan": "pro",
        },
    )
    assert signup.status_code == 201, signup.text
    payload = signup.json()
    token = payload["access_token"]
    clinic_id = payload["clinic"]["id"]

    await _disable_feature(clinic_id, "anamnesis")

    r = http_client.post(
        f"/api/patients/{uuid.uuid4()}/anamnesis",
        headers=_h(token),
        json={"questionnaire": _QUESTIONNAIRE, "notes": None},
    )
    assert r.status_code == 403, r.text
    assert r.json()["error"]["code"] == "feature_not_enabled"
