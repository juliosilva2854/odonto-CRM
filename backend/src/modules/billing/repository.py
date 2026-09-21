"""Billing repository — mutações atômicas do estado de assinatura na Clinic."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.billing.enums import SubscriptionStatus
from src.modules.tenancy.models import Clinic


class BillingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_clinic_billing(self, clinic_id: uuid.UUID) -> Clinic | None:
        stmt = select(Clinic).where(Clinic.id == clinic_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def set_stripe_customer(self, clinic_id: uuid.UUID, customer_id: str) -> None:
        await self._update(clinic_id, {"stripe_customer_id": customer_id})

    async def set_subscription(
        self,
        clinic_id: uuid.UUID,
        *,
        stripe_subscription_id: str | None = None,
        status: SubscriptionStatus | None = None,
        current_period_end: datetime | None = None,
    ) -> None:
        values: dict = {}
        if stripe_subscription_id is not None:
            values["stripe_subscription_id"] = stripe_subscription_id
        if status is not None:
            values["subscription_status"] = status
        if current_period_end is not None:
            values["current_period_end"] = current_period_end
        if values:
            await self._update(clinic_id, values)

    async def clear_subscription(self, clinic_id: uuid.UUID) -> None:
        await self._update(
            clinic_id,
            {
                "stripe_subscription_id": None,
                "subscription_status": SubscriptionStatus.CANCELED,
            },
        )

    async def mark_trial_active(self, clinic_id: uuid.UUID, trial_ends_at: datetime) -> None:
        await self._update(
            clinic_id,
            {
                "subscription_status": SubscriptionStatus.TRIALING,
                "trial_ends_at": trial_ends_at,
            },
        )

    # ── helpers ──────────────────────────────────────────────

    async def _update(self, clinic_id: uuid.UUID, values: dict) -> None:
        await self._session.execute(
            update(Clinic).where(Clinic.id == clinic_id).values(**values)
        )
        await self._session.flush()
