"""Users Pydantic schemas."""
from __future__ import annotations

import uuid

from pydantic import BaseModel, EmailStr, Field

# Reutiliza o UserOut do módulo auth (mesma projeção) para não duplicar contrato.
from src.modules.auth.schemas import UserOut  # noqa: F401  (re-export)
from src.modules.auth.enums import UserRole


class UserInviteIn(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=1, max_length=180)
    role: UserRole


class UserRoleUpdateIn(BaseModel):
    role: UserRole


class InvitedUserOut(UserOut):
    """UserOut + id do Professional criado quando o convite é para dentista."""

    professional_id: uuid.UUID | None = None


class ResendInviteOut(BaseModel):
    sent: bool
    email: EmailStr
