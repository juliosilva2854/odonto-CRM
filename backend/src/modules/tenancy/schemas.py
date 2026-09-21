"""Pydantic schemas for tenancy."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from src.modules.tenancy.models import SubscriptionStatus


class ClinicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    legal_name: str
    trade_name: str
    cnpj: str
    timezone: str
    plan: str

    # Subscription state exposed to the frontend (paywall / trial banner).
    # stripe_customer_id / stripe_subscription_id are intentionally NOT exposed.
    subscription_status: SubscriptionStatus
    trial_ends_at: datetime | None = None
    current_period_end: datetime | None = None


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature_key: str
    enabled: bool
    config: dict[str, Any] = Field(default_factory=dict)


class FeatureUpdateIn(BaseModel):
    enabled: bool
    config: dict[str, Any] | None = None
