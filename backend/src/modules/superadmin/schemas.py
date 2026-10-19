"""Super Admin Pydantic schemas (platform-level, cross-tenant)."""
from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from src.modules.tenancy.models import SubscriptionStatus


class ClinicSummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    legal_name: str
    trade_name: str
    cnpj: str
    plan: str
    subscription_status: SubscriptionStatus
    trial_ends_at: datetime | None = None
    current_period_end: datetime | None = None
    created_at: datetime
    users_count: int = 0


class ClinicDetailOut(ClinicSummaryOut):
    admin_email: str | None = None
    patients_count: int = 0
    stripe_customer_linked: bool = False


class SuperAdminMetricsOut(BaseModel):
    total_clinics: int
    active_clinics: int
    trialing_clinics: int
    past_due_clinics: int
    canceled_clinics: int
    mrr_cents: int
    mrr_brl: float
    trials_expiring_count: int
    trials_expiring: list[ClinicSummaryOut]


class ImpersonateOut(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int
    clinic_id: uuid.UUID
    user_id: uuid.UUID
    email: str


class ExtendTrialIn(BaseModel):
    days: int = Field(default=7, ge=1, le=365)
