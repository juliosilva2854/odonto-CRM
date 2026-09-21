"""Billing schemas. Nenhum id do Stripe é exposto."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from src.modules.billing.enums import PlanTier, SubscriptionStatus


class CheckoutIn(BaseModel):
    plan: PlanTier
    customer_email: EmailStr | None = None


class CheckoutOut(BaseModel):
    checkout_url: str
    session_id: str


class PortalOut(BaseModel):
    portal_url: str


class BillingStatusOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    subscription_status: SubscriptionStatus
    plan: str
    trial_ends_at: datetime | None
    current_period_end: datetime | None
    is_active: bool
    is_trialing: bool
