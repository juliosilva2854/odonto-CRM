"""Pydantic schemas for tenancy."""
from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ClinicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    legal_name: str
    trade_name: str
    cnpj: str
    timezone: str
    plan: str


class FeatureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    feature_key: str
    enabled: bool
    config: dict[str, Any] = Field(default_factory=dict)


class FeatureUpdateIn(BaseModel):
    enabled: bool
    config: dict[str, Any] | None = None
