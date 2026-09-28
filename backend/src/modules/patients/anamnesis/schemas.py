"""Anamnesis Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class AnamnesisCreateIn(BaseModel):
    questionnaire: dict[str, Any] = Field(...)
    notes: str | None = Field(default=None, max_length=4000)


class AnamnesisOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    questionnaire: dict[str, Any]
    notes: str | None
    answered_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
