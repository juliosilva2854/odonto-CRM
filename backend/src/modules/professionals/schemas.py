"""Professionals Pydantic schemas."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


class ProfessionalUpdateIn(BaseModel):
    """Edição dos dados profissionais do dentista (admin da própria clínica)."""

    cro_number: str = Field(min_length=1, max_length=20)
    cro_state: str = Field(min_length=2, max_length=2)
    specialty: str | None = Field(default=None, max_length=80)
    color_hex: str = Field(pattern=r"^#[0-9A-Fa-f]{6}$")
    default_commission_pct: Decimal = Field(
        ge=Decimal("0"), le=Decimal("100"), max_digits=5, decimal_places=2
    )

    @field_validator("cro_number", mode="before")
    @classmethod
    def _strip_cro(cls, v: Any) -> Any:
        return v.strip() if isinstance(v, str) else v

    @field_validator("cro_state")
    @classmethod
    def _upper_uf(cls, v: str) -> str:
        return v.strip().upper()

    @field_validator("specialty", mode="before")
    @classmethod
    def _norm_specialty(cls, v: Any) -> Any:
        if v is None:
            return None
        s = str(v).strip()
        return s or None


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
    default_commission_pct: Decimal
    is_active: bool
    invite_pending: bool
