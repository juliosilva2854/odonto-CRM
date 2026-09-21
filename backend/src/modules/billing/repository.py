"""Billing repositories — estado de assinatura na Clinic + eventos de webhook."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.billing.enums import SubscriptionStatus
from src.modules.billing.models import BillingEvent, BillingEventStatus
from src.modules.tenancy.models import Clinic


class BillingRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_clinic_billing(self, clinic_id: uuid.UUID) -> Clinic | None:
        stmt = select(Clinic).where(Clinic.id == clinic_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_stripe_customer(self, customer_id: str) -> Clinic | None:
        stmt = select(Clinic).where(Clinic.stripe_customer_id == customer_id)
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


class BillingEventRepository:
    """Persistência dos webhooks do Stripe (idempotência + auditoria)."""

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def try_insert_event(
        self, stripe_event_id: str, event_type: str, payload: dict[str, Any]
    ) -> BillingEvent | None:
        """Insere o evento. Devolve ``None`` se já existia (duplicata).

        O INSERT roda em SAVEPOINT: sem isso, a unique violation abortaria a
        transação inteira do request no Postgres.
        """
        event = BillingEvent(
            stripe_event_id=stripe_event_id,
            event_type=event_type,
            payload=payload,
            status=BillingEventStatus.PENDING,
        )
        try:
            async with self._session.begin_nested():
                self._session.add(event)
                await self._session.flush()
        except IntegrityError:
            return None
        return event

    async def get_by_stripe_event_id(self, stripe_event_id: str) -> BillingEvent | None:
        stmt = select(BillingEvent).where(BillingEvent.stripe_event_id == stripe_event_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def mark_processed(self, event_id: uuid.UUID, clinic_id: uuid.UUID | None) -> None:
        await self._update(
            event_id,
            {
                "status": BillingEventStatus.PROCESSED,
                "clinic_id": clinic_id,
                "processed_at": datetime.now(timezone.utc),
            },
        )

    async def mark_failed(self, event_id: uuid.UUID, error: str) -> None:
        await self._update(
            event_id,
            {
                "status": BillingEventStatus.FAILED,
                "error": error[:2000],
                "processed_at": datetime.now(timezone.utc),
            },
        )

    async def mark_ignored(self, event_id: uuid.UUID) -> None:
        await self._update(
            event_id,
            {
                "status": BillingEventStatus.IGNORED,
                "processed_at": datetime.now(timezone.utc),
            },
        )

    # ── helpers ──────────────────────────────────────────────

    async def _update(self, event_id: uuid.UUID, values: dict) -> None:
        await self._session.execute(
            update(BillingEvent).where(BillingEvent.id == event_id).values(**values)
        )
        await self._session.flush()
