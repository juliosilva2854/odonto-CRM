"""Billing service — orquestra Stripe + estado de assinatura da clínica."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core import stripe_client
from src.core.errors import ValidationError
from src.modules.auth.models import User
from src.modules.billing.enums import SubscriptionStatus
from src.modules.billing.repository import BillingRepository
from src.modules.billing.schemas import CheckoutIn
from src.modules.tenancy.service import TenancyService


class BillingService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._tenancy = TenancyService(session)
        self._repo = BillingRepository(session)

    async def get_status(self, clinic_id: uuid.UUID) -> dict[str, Any]:
        clinic = await self._tenancy.get_clinic(clinic_id)
        is_active = await self._tenancy.is_subscription_active(clinic_id)
        return {
            "subscription_status": clinic.subscription_status,
            "plan": clinic.plan,
            "trial_ends_at": clinic.trial_ends_at,
            "current_period_end": clinic.current_period_end,
            "is_active": is_active,
            "is_trialing": (
                clinic.subscription_status == SubscriptionStatus.TRIALING
                and clinic.trial_ends_at is not None
                and clinic.trial_ends_at > datetime.now(timezone.utc)
            ),
        }

    async def create_checkout(
        self, clinic_id: uuid.UUID, actor: User, data: CheckoutIn
    ) -> tuple[str, str]:
        """Devolve (checkout_url, session_id). Cria o Customer na primeira vez."""
        clinic = await self._tenancy.get_clinic(clinic_id)
        price_id = stripe_client.get_price_id_for_plan(data.plan)
        email = str(data.customer_email) if data.customer_email else actor.email

        customer_id = clinic.stripe_customer_id
        if not customer_id:
            customer_id = await stripe_client.create_customer(
                clinic_id=clinic_id,
                email=email,
                name=clinic.trade_name,
            )
            await self._repo.set_stripe_customer(clinic_id, customer_id)

        return await stripe_client.create_checkout_session(
            customer_id=customer_id,
            price_id=price_id,
            clinic_id=clinic_id,
            customer_email=email,
        )

    async def create_portal(self, clinic_id: uuid.UUID, return_url: str) -> str:
        clinic = await self._tenancy.get_clinic(clinic_id)
        if not clinic.stripe_customer_id:
            raise ValidationError("Clinic has no Stripe customer yet — start a checkout first")
        return await stripe_client.create_portal_session(
            customer_id=clinic.stripe_customer_id,
            return_url=return_url,
        )
