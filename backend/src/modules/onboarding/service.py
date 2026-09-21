"""Onboarding service — atomic clinic + admin + default data provisioning."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ConflictError
from src.core.feature_flags.service import FeatureFlagService
from src.core.security import create_access_token, create_refresh_token, hash_password
from src.modules.agenda.models import Room
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.clinical.catalog.models import Procedure, Specialty
from src.modules.onboarding.schemas import SignupIn
from src.modules.onboarding.templates import (
    DEFAULT_PROCEDURES,
    DEFAULT_ROOM,
    DEFAULT_SPECIALTIES,
    DEFAULT_TRIAL_DAYS,
    PLAN_FEATURES,
)
from src.modules.tenancy.models import Clinic, ClinicFeature, SubscriptionStatus
from src.shared.validators import validate_cnpj


class OnboardingService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def signup(self, data: SignupIn) -> tuple[Clinic, User, str, str]:
        """Create clinic + admin user + default data. Returns (clinic, user, access, refresh).

        Runs inside the caller's session/transaction (see `get_db_session`): any failure
        raises and the whole unit of work is rolled back — no partial clinics.
        """
        # 1-3. Validate + uniqueness checks
        cnpj = validate_cnpj(data.clinic_cnpj)
        email = data.admin_email.lower()

        if await self._cnpj_exists(cnpj):
            raise ConflictError("A clinic with this CNPJ already exists")
        if await self._email_exists(email):
            raise ConflictError("This email is already registered")

        # 4-5. Clinic (always starts in trial)
        now = datetime.now(timezone.utc)
        clinic = Clinic(
            legal_name=data.clinic_legal_name,
            trade_name=data.clinic_trade_name,
            cnpj=cnpj,
            timezone=data.clinic_timezone,
            plan=data.plan.value,
            subscription_status=SubscriptionStatus.TRIALING,
            trial_ends_at=now + timedelta(days=DEFAULT_TRIAL_DAYS),
        )
        self._session.add(clinic)
        await self._flush()

        # 6. Admin user
        user = User(
            clinic_id=clinic.id,
            email=email,
            password_hash=hash_password(data.admin_password),
            full_name=data.admin_full_name,
            role=UserRole.ADMIN,
            is_active=True,
        )
        self._session.add(user)

        # 7. Feature flags for the chosen plan
        for feature_key, enabled in PLAN_FEATURES[data.plan].items():
            self._session.add(
                ClinicFeature(
                    clinic_id=clinic.id,
                    feature_key=feature_key,
                    enabled=enabled,
                    config={},
                )
            )

        # 8. Default room
        self._session.add(Room(clinic_id=clinic.id, equipments={}, **DEFAULT_ROOM))

        # 9. Default specialties (flush to get ids for the procedures)
        specialties_by_name: dict[str, Specialty] = {}
        for spec in DEFAULT_SPECIALTIES:
            specialty = Specialty(clinic_id=clinic.id, **spec)
            self._session.add(specialty)
            specialties_by_name[spec["name"]] = specialty
        await self._flush()

        # 10-11. Default procedures
        for spec in DEFAULT_PROCEDURES:
            specialty = specialties_by_name.get(spec["specialty_name"])
            self._session.add(
                Procedure(
                    clinic_id=clinic.id,
                    code=spec["code"],
                    tuss_code=spec.get("tuss_code"),
                    name=spec["name"],
                    description=spec.get("description"),
                    category=spec["category"],
                    specialty_id=specialty.id if specialty else None,
                    requires_tooth=spec.get("requires_tooth", True),
                    requires_faces=spec.get("requires_faces", False),
                    base_price=spec["base_price"],
                    default_duration_min=spec.get("default_duration_min", 30),
                    is_active=True,
                )
            )
        await self._flush()

        # Fresh clinic — make sure no stale flag cache exists for this id.
        FeatureFlagService.invalidate(clinic.id)

        # 12. Tokens
        access = create_access_token(subject=user.id, clinic_id=clinic.id, role=user.role.value)
        refresh = create_refresh_token(subject=user.id, clinic_id=clinic.id)
        return clinic, user, access, refresh

    # ── helpers ──────────────────────────────────────────────

    async def _cnpj_exists(self, cnpj: str) -> bool:
        stmt = select(Clinic.id).where(Clinic.cnpj == cnpj).limit(1)
        return (await self._session.execute(stmt)).first() is not None

    async def _email_exists(self, email: str) -> bool:
        # Login resolves users by email alone (scalar_one_or_none), so the email must be
        # globally unique in this MVP — not only per clinic.
        stmt = select(User.id).where(User.email == email).limit(1)
        return (await self._session.execute(stmt)).first() is not None

    async def _flush(self) -> None:
        """Flush, translating unique-constraint races into a 409 instead of a 500."""
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Clinic or user already exists") from exc
