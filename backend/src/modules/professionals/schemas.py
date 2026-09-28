"""Professionals Pydantic schemas."""
from __future__ import annotations

import uuid

from pydantic import BaseModel, ConfigDict, EmailStr


class ProfessionalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    full_name: str
    email: EmailStr
    cro_number: str
    cro_state: str
    specialty: str | None
    color_hex: str
