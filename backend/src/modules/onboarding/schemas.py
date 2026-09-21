"""Onboarding Pydantic schemas."""
from __future__ import annotations

from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from pydantic import BaseModel, EmailStr, Field, field_validator

from src.modules.auth.schemas import UserOut
from src.modules.onboarding.enums import PlanTier
from src.modules.tenancy.schemas import ClinicOut
from src.shared.validators import validate_cnpj


class SignupIn(BaseModel):
    # ── Clinic
    clinic_legal_name: str = Field(min_length=2, max_length=200)
    clinic_trade_name: str = Field(min_length=2, max_length=200)
    clinic_cnpj: str
    clinic_timezone: str = "America/Sao_Paulo"

    # ── Admin user
    admin_full_name: str = Field(min_length=2, max_length=180)
    admin_email: EmailStr
    admin_password: str = Field(min_length=8, max_length=200)

    # ── Initial plan (clinic always starts in `trialing`; this only selects the feature set)
    plan: PlanTier

    @field_validator("clinic_cnpj", mode="before")
    @classmethod
    def _v_cnpj(cls, v: Any) -> str:
        if not isinstance(v, str):
            raise ValueError("CNPJ must be a string")
        return validate_cnpj(v)

    @field_validator("clinic_timezone")
    @classmethod
    def _v_timezone(cls, v: str) -> str:
        try:
            ZoneInfo(v)
        except (ZoneInfoNotFoundError, ValueError) as exc:
            raise ValueError("Invalid IANA timezone") from exc
        return v

    @field_validator("admin_password")
    @classmethod
    def _v_password(cls, v: str) -> str:
        if not any(c.isalpha() for c in v) or not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one letter and one number")
        return v


class SignupOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int
    user: UserOut
    clinic: ClinicOut
    trial_ends_at: datetime
