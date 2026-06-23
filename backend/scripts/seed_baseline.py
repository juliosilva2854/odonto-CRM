"""Seed baseline: demo clinic + 3 users + default feature flags.

Idempotent — pode rodar várias vezes sem duplicar.
"""
from __future__ import annotations

import asyncio
import uuid

from sqlalchemy import select

from src.core.database import AsyncSessionLocal
from src.core.security import hash_password
from src.modules.auth.enums import UserRole
from src.modules.auth.models import Professional, User
from src.modules.tenancy.models import Clinic, ClinicFeature

# ── Default feature flags. Drives which modules are visible / enabled.
DEFAULT_FEATURES: dict[str, bool] = {
    "patients": True,
    "anamnesis": True,
    "agenda": True,
    "checkin": True,
    "clinical_records": True,
    "odontogram": True,
    "quotes": True,
    "contracts": True,
    "financial_core": True,
    "commission_split": True,
    "recurring_charges": True,
    "online_payment": False,        # Fase 6
    "whatsapp": False,              # Fase 5
    "email": False,
    "dashboard_bi": False,          # Fase 6
}


SEED_CLINIC = {
    "legal_name": "Demo Odonto Clínica LTDA",
    "trade_name": "Demo Odonto",
    "cnpj": "00.000.000/0001-00",
    "timezone": "America/Sao_Paulo",
    "plan": "premium",
}

SEED_USERS = [
    {
        "email": "admin@demo.odonto",
        "password": "Admin@123",
        "full_name": "Administrador Demo",
        "role": UserRole.ADMIN,
    },
    {
        "email": "dentist@demo.odonto",
        "password": "Dentist@123",
        "full_name": "Dr. Demo Dentista",
        "role": UserRole.DENTIST,
        "professional": {
            "cro_number": "12345",
            "cro_state": "SP",
            "specialty": "Clínica Geral",
            "default_commission_pct": 40.00,
            "color_hex": "#10B981",
        },
    },
    {
        "email": "reception@demo.odonto",
        "password": "Reception@123",
        "full_name": "Recepção Demo",
        "role": UserRole.RECEPTION,
    },
]


async def _get_or_create_clinic(session) -> Clinic:
    stmt = select(Clinic).where(Clinic.cnpj == SEED_CLINIC["cnpj"])
    clinic = (await session.execute(stmt)).scalar_one_or_none()
    if clinic:
        return clinic
    clinic = Clinic(**SEED_CLINIC)
    session.add(clinic)
    await session.flush()
    print(f"[seed] Created clinic: {clinic.trade_name} ({clinic.id})")
    return clinic


async def _seed_features(session, clinic: Clinic) -> None:
    stmt = select(ClinicFeature.feature_key).where(ClinicFeature.clinic_id == clinic.id)
    existing = {row[0] for row in (await session.execute(stmt)).all()}
    created = 0
    for key, enabled in DEFAULT_FEATURES.items():
        if key in existing:
            continue
        session.add(ClinicFeature(clinic_id=clinic.id, feature_key=key, enabled=enabled, config={}))
        created += 1
    if created:
        await session.flush()
        print(f"[seed] Created {created} feature flag(s)")


async def _seed_users(session, clinic: Clinic) -> None:
    for spec in SEED_USERS:
        stmt = select(User).where(
            User.clinic_id == clinic.id, User.email == spec["email"].lower()
        )
        user = (await session.execute(stmt)).scalar_one_or_none()
        if user:
            continue
        user = User(
            id=uuid.uuid4(),
            clinic_id=clinic.id,
            email=spec["email"].lower(),
            password_hash=hash_password(spec["password"]),
            full_name=spec["full_name"],
            role=spec["role"],
            is_active=True,
        )
        session.add(user)
        await session.flush()
        print(f"[seed] Created user: {user.email} ({user.role.value})")

        if spec["role"] == UserRole.DENTIST and "professional" in spec:
            prof = Professional(
                user_id=user.id,
                clinic_id=clinic.id,
                **spec["professional"],
            )
            session.add(prof)
            await session.flush()
            print(f"[seed] Created professional profile for {user.email}")


async def run_seed() -> None:
    async with AsyncSessionLocal() as session:
        try:
            clinic = await _get_or_create_clinic(session)
            await _seed_features(session, clinic)
            await _seed_users(session, clinic)
            await session.commit()
            print("[seed] Done.")
        except Exception:
            await session.rollback()
            raise


def main() -> None:
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
