"""Catalog Pydantic schemas."""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.clinical.catalog.enums import ProcedureCategory

_COLOR_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")


def _validate_hex(v: Any) -> str:
    s = str(v)
    if not _COLOR_HEX_RE.match(s):
        raise ValueError("color must be in #RRGGBB format")
    return s.upper()


def _validate_hex_optional(v: Any) -> str | None:
    if v is None:
        return None
    return _validate_hex(v)


def _clean_tuss(v: Any) -> str | None:
    if v is None or v == "":
        return None
    digits = re.sub(r"\D", "", str(v))
    if not digits:
        raise ValueError("tuss_code must contain digits")
    return digits


HexColor = Annotated[str, Field(min_length=7, max_length=7)]


# ── Specialty ─────────────────────────────────────────


class SpecialtyCreateIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    description: str | None = None
    is_active: bool = True


class SpecialtyUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    description: str | None = None
    is_active: bool | None = None


class SpecialtyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    name: str
    description: str | None
    is_active: bool
    created_at: datetime


# ── Procedure ─────────────────────────────────────────


class ProcedureCreateIn(BaseModel):
    code: str = Field(min_length=1, max_length=20, description="Código interno da clínica")
    tuss_code: str | None = Field(default=None, max_length=20, description="Código TUSS (opcional)")
    name: str = Field(min_length=2, max_length=180)
    description: str | None = None
    category: ProcedureCategory
    specialty_id: uuid.UUID | None = None
    requires_tooth: bool = True
    requires_faces: bool = False
    default_color_hex: HexColor = "#3B82F6"
    completed_color_hex: HexColor = "#10B981"
    base_price: Decimal = Field(ge=Decimal("0"), max_digits=10, decimal_places=2)
    default_duration_min: int = Field(ge=5, le=480, default=30)
    commission_pct_override: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=5, decimal_places=2
    )
    is_active: bool = True

    @field_validator("default_color_hex", "completed_color_hex", mode="before")
    @classmethod
    def _v_hex(cls, v: Any) -> str:
        return _validate_hex(v)

    @field_validator("tuss_code", mode="before")
    @classmethod
    def _v_tuss(cls, v: Any) -> str | None:
        return _clean_tuss(v)


class ProcedureUpdateIn(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=20)
    tuss_code: str | None = Field(default=None, max_length=20)
    name: str | None = Field(default=None, min_length=2, max_length=180)
    description: str | None = None
    category: ProcedureCategory | None = None
    specialty_id: uuid.UUID | None = None
    requires_tooth: bool | None = None
    requires_faces: bool | None = None
    default_color_hex: HexColor | None = None
    completed_color_hex: HexColor | None = None
    base_price: Decimal | None = Field(default=None, ge=Decimal("0"), max_digits=10, decimal_places=2)
    default_duration_min: int | None = Field(default=None, ge=5, le=480)
    commission_pct_override: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=5, decimal_places=2
    )
    is_active: bool | None = None

    @field_validator("default_color_hex", "completed_color_hex", mode="before")
    @classmethod
    def _v_hex(cls, v: Any) -> str | None:
        return _validate_hex_optional(v)

    @field_validator("tuss_code", mode="before")
    @classmethod
    def _v_tuss(cls, v: Any) -> str | None:
        return _clean_tuss(v)


class ProcedureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    code: str
    tuss_code: str | None
    name: str
    description: str | None
    category: ProcedureCategory
    specialty_id: uuid.UUID | None
    requires_tooth: bool
    requires_faces: bool
    default_color_hex: str
    completed_color_hex: str
    base_price: Decimal
    default_duration_min: int
    commission_pct_override: Decimal | None
    is_active: bool
    created_at: datetime
