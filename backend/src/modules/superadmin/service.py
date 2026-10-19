"""Super Admin service — cross-tenant metrics, clinic ops and impersonation."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.errors import NotFoundError, ValidationError
from src.core.security import create_access_token
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.patients.models import Patient
from src.modules.tenancy.models import Clinic, SubscriptionStatus

_settings = get_settings()

# Estimativa de MRR por plano (em centavos). Espelha create_stripe_products.
PLAN_PRICE_CENTS: dict[str, int] = {
    "essencial": 29700,
    "pro": 49700,
    "clinica": 79700,
    "standard": 29700,
}
_DEFAULT_PRICE_CENTS = 29700

# Janela (dias) para considerar um trial "vencendo em breve".
TRIAL_EXPIRING_WINDOW_DAYS = 7


class SuperAdminService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    # ── Métricas ─────────────────────────────────────────────
    async def get_metrics(self) -> dict[str, Any]:
        now = datetime.now(timezone.utc)

        # Contagem por status de assinatura.
        rows = (
            await self._session.execute(
                select(Clinic.subscription_status, func.count(Clinic.id)).group_by(
                    Clinic.subscription_status
                )
            )
        ).all()
        by_status: dict[str, int] = {}
        for status_val, count in rows:
            key = status_val.value if isinstance(status_val, SubscriptionStatus) else str(status_val)
            by_status[key] = int(count)

        active = by_status.get(SubscriptionStatus.ACTIVE.value, 0)
        trialing = by_status.get(SubscriptionStatus.TRIALING.value, 0)
        past_due = by_status.get(SubscriptionStatus.PAST_DUE.value, 0)
        canceled = by_status.get(SubscriptionStatus.CANCELED.value, 0)
        total = sum(by_status.values())

        # MRR estimado: soma do preço do plano das clínicas ativas.
        active_plans = (
            await self._session.execute(
                select(Clinic.plan).where(
                    Clinic.subscription_status == SubscriptionStatus.ACTIVE
                )
            )
        ).scalars().all()
        mrr_cents = sum(
            PLAN_PRICE_CENTS.get((plan or "").lower(), _DEFAULT_PRICE_CENTS)
            for plan in active_plans
        )

        # Trials vencendo nos próximos N dias.
        window_end = now + timedelta(days=TRIAL_EXPIRING_WINDOW_DAYS)
        expiring_clinics = (
            await self._session.execute(
                select(Clinic)
                .where(
                    Clinic.subscription_status == SubscriptionStatus.TRIALING,
                    Clinic.trial_ends_at.is_not(None),
                    Clinic.trial_ends_at > now,
                    Clinic.trial_ends_at <= window_end,
                )
                .order_by(Clinic.trial_ends_at.asc())
            )
        ).scalars().all()

        return {
            "total_clinics": total,
            "active_clinics": active,
            "trialing_clinics": trialing,
            "past_due_clinics": past_due,
            "canceled_clinics": canceled,
            "mrr_cents": mrr_cents,
            "mrr_brl": round(mrr_cents / 100, 2),
            "trials_expiring_count": len(expiring_clinics),
            "trials_expiring": [
                await self._to_summary(c) for c in expiring_clinics
            ],
        }

    # ── Listagem / detalhe ───────────────────────────────────
    async def list_clinics(
        self,
        *,
        search: str | None = None,
        status: SubscriptionStatus | None = None,
        page: int = 1,
        page_size: int = 20,
    ) -> tuple[list[dict[str, Any]], int]:
        conditions = []
        if search:
            like = f"%{search.strip()}%"
            conditions.append(
                or_(
                    Clinic.trade_name.ilike(like),
                    Clinic.legal_name.ilike(like),
                    Clinic.cnpj.ilike(like),
                )
            )
        if status is not None:
            conditions.append(Clinic.subscription_status == status)

        total = (
            await self._session.execute(
                select(func.count(Clinic.id)).where(*conditions)
            )
        ).scalar_one()

        clinics = (
            await self._session.execute(
                select(Clinic)
                .where(*conditions)
                .order_by(Clinic.created_at.desc())
                .offset((page - 1) * page_size)
                .limit(page_size)
            )
        ).scalars().all()

        items = [await self._to_summary(c) for c in clinics]
        return items, int(total)

    async def get_clinic_detail(self, clinic_id: uuid.UUID) -> dict[str, Any]:
        clinic = await self._session.get(Clinic, clinic_id)
        if clinic is None:
            raise NotFoundError("Clinic not found")

        summary = await self._to_summary(clinic)

        patients_count = (
            await self._session.execute(
                select(func.count(Patient.id)).where(Patient.clinic_id == clinic_id)
            )
        ).scalar_one()

        admin_email = (
            await self._session.execute(
                select(User.email)
                .where(
                    User.clinic_id == clinic_id,
                    User.role == UserRole.ADMIN,
                    User.is_active.is_(True),
                )
                .order_by(User.created_at.asc())
                .limit(1)
            )
        ).scalar_one_or_none()

        return {
            **summary,
            "patients_count": int(patients_count),
            "admin_email": admin_email,
            "stripe_customer_linked": clinic.stripe_customer_id is not None,
        }

    # ── Ações ────────────────────────────────────────────────
    async def impersonate(
        self, clinic_id: uuid.UUID, actor_id: uuid.UUID
    ) -> dict[str, Any]:
        clinic = await self._session.get(Clinic, clinic_id)
        if clinic is None:
            raise NotFoundError("Clinic not found")

        admin = (
            await self._session.execute(
                select(User)
                .where(
                    User.clinic_id == clinic_id,
                    User.role == UserRole.ADMIN,
                    User.is_active.is_(True),
                )
                .order_by(User.created_at.asc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if admin is None:
            raise ValidationError(
                "This clinic has no active admin to impersonate",
                code="no_impersonable_admin",
            )

        token = create_access_token(
            subject=admin.id,
            clinic_id=clinic_id,
            role=admin.role.value,
            extra={"impersonated_by": str(actor_id)},
        )
        return {
            "access_token": token,
            "token_type": "Bearer",
            "expires_in": _settings.JWT_EXPIRES_MIN * 60,
            "clinic_id": clinic_id,
            "user_id": admin.id,
            "email": admin.email,
        }

    async def extend_trial(self, clinic_id: uuid.UUID, days: int) -> dict[str, Any]:
        clinic = await self._session.get(Clinic, clinic_id)
        if clinic is None:
            raise NotFoundError("Clinic not found")

        now = datetime.now(timezone.utc)
        base = clinic.trial_ends_at if clinic.trial_ends_at and clinic.trial_ends_at > now else now
        clinic.trial_ends_at = base + timedelta(days=days)
        clinic.subscription_status = SubscriptionStatus.TRIALING
        await self._session.flush()
        return await self._to_summary(clinic)

    async def suspend(self, clinic_id: uuid.UUID) -> dict[str, Any]:
        clinic = await self._session.get(Clinic, clinic_id)
        if clinic is None:
            raise NotFoundError("Clinic not found")
        clinic.subscription_status = SubscriptionStatus.CANCELED
        await self._session.flush()
        return await self._to_summary(clinic)

    async def reactivate(self, clinic_id: uuid.UUID) -> dict[str, Any]:
        clinic = await self._session.get(Clinic, clinic_id)
        if clinic is None:
            raise NotFoundError("Clinic not found")
        clinic.subscription_status = SubscriptionStatus.ACTIVE
        await self._session.flush()
        return await self._to_summary(clinic)

    # ── helpers ──────────────────────────────────────────────
    async def _to_summary(self, clinic: Clinic) -> dict[str, Any]:
        users_count = (
            await self._session.execute(
                select(func.count(User.id)).where(User.clinic_id == clinic.id)
            )
        ).scalar_one()
        return {
            "id": clinic.id,
            "legal_name": clinic.legal_name,
            "trade_name": clinic.trade_name,
            "cnpj": clinic.cnpj,
            "plan": clinic.plan,
            "subscription_status": clinic.subscription_status,
            "trial_ends_at": clinic.trial_ends_at,
            "current_period_end": clinic.current_period_end,
            "created_at": clinic.created_at,
            "users_count": int(users_count),
        }
