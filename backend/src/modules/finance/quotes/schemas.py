"""Quote Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.clinical.odontogram.enums import ALL_FDI_TEETH, VALID_FACE_CODES
from src.modules.finance.quotes.enums import (
    DeductionType,
    QuoteItemStatus,
    QuoteStatus,
)


# ── Inputs ────────────────────────────────────────────────────


class DeductionIn(BaseModel):
    type: DeductionType
    amount: Decimal = Field(ge=Decimal("0"), max_digits=10, decimal_places=2)
    label: str | None = Field(default=None, max_length=120)


class QuoteItemCreateIn(BaseModel):
    """Two construction modes:
    - With `tooth_procedure_id`: snapshots tooth/face/price from the existing
      ToothProcedure. `procedure_id` must match.
    - Without it (ad-hoc): caller MUST provide `procedure_id` (mandatory) and
      may set `tooth_fdi`+`faces` if procedure requires them.
    """

    procedure_id: uuid.UUID
    tooth_procedure_id: uuid.UUID | None = None
    tooth_fdi: str | None = None
    faces: list[str] = Field(default_factory=list, max_length=6)
    description: str | None = Field(default=None, max_length=500)

    quantity: Decimal = Field(default=Decimal("1"), gt=Decimal("0"), max_digits=7, decimal_places=2)
    unit_price_override: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=10, decimal_places=2
    )
    discount_amount: Decimal = Field(
        default=Decimal("0"), ge=Decimal("0"), max_digits=10, decimal_places=2
    )

    # Commission inputs (snapshots). If omitted, service falls back to
    # Procedure.commission_pct_override or null.
    commission_pct: Decimal | None = Field(
        default=None, ge=Decimal("0"), le=Decimal("100"), max_digits=5, decimal_places=2
    )
    commission_amount: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=10, decimal_places=2
    )

    deductions: list[DeductionIn] = Field(default_factory=list, max_length=10)

    @field_validator("tooth_fdi", mode="before")
    @classmethod
    def _v_fdi(cls, v: Any) -> str | None:
        if v is None or v == "":
            return None
        s = str(v).strip()
        if s not in ALL_FDI_TEETH:
            raise ValueError(f"tooth_fdi inválido: {s}")
        return s

    @field_validator("faces", mode="before")
    @classmethod
    def _v_faces(cls, v: Any) -> list[str]:
        if v is None:
            return []
        out: list[str] = []
        seen: set[str] = set()
        for face in v:
            s = str(face).strip().upper()
            if s not in VALID_FACE_CODES:
                raise ValueError(f"face inválida: {s}")
            if s in seen:
                continue
            seen.add(s)
            out.append(s)
        return out


class QuoteCreateIn(BaseModel):
    patient_id: uuid.UUID
    items: list[QuoteItemCreateIn] = Field(min_length=1, max_length=50)
    discount_amount: Decimal = Field(
        default=Decimal("0"), ge=Decimal("0"), max_digits=10, decimal_places=2
    )
    notes: str | None = Field(default=None, max_length=2000)
    valid_until: datetime | None = None


class RejectIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class CancelIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


# ── Outputs ───────────────────────────────────────────────────


class QuoteItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    quote_id: uuid.UUID
    procedure_id: uuid.UUID
    procedure_code_snapshot: str
    procedure_name_snapshot: str
    tooth_procedure_id: uuid.UUID | None
    tooth_fdi: str | None
    faces: list[str]
    description: str | None
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal
    line_total: Decimal
    commission_pct_snapshot: Decimal | None
    commission_amount_snapshot: Decimal | None
    deductions: list[dict[str, Any]]
    status: QuoteItemStatus
    decided_at: datetime | None
    decided_by_user_id: uuid.UUID | None
    rejection_reason: str | None
    created_at: datetime
    updated_at: datetime


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    number: str
    status: QuoteStatus
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    notes: str | None
    valid_until: datetime | None
    created_by_user_id: uuid.UUID
    approved_by_user_id: uuid.UUID | None
    approved_at: datetime | None
    items: list[QuoteItemOut]
    created_at: datetime
    updated_at: datetime
