"""Auth Pydantic schemas."""
from __future__ import annotations

import uuid
from typing import Any

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from src.modules.auth.enums import UserRole


class LoginIn(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=200)


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "Bearer"
    expires_in: int


class RefreshIn(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool


class MeOut(BaseModel):
    user: UserOut
    clinic: dict[str, Any]
    features: dict[str, dict[str, Any]]
