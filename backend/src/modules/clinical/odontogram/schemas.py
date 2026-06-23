"""Odontogram Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from src.modules.clinical.odontogram.enums import (
    ALL_FDI_TEETH,
    OdontogramEventType,
    ToothProcedureStatus,
    VALID_FACE_CODES,
)


# ── Validators ────────────────────────────────────────────────


def _validate_fdi(v: Any) -> str | None:
    if v is None or v == "":
        return None
    s = str(v).strip()
    if s not in ALL_FDI_TEETH:
        raise ValueError(f"tooth_fdi inválido (esperado FDI/ISO 3950): {s}")
    return s


def _validate_faces(v: Any) -> list[str]:
    if v is None:
        return []
    if not isinstance(v, list):
        raise ValueError("faces deve ser lista")
    out: list[str] = []
    seen: set[str] = set()
    for face in v:
        s = str(face).strip().upper()
        if s not in VALID_FACE_CODES:
            raise ValueError(
                f"face inválida: {s}. Válidas: {sorted(VALID_FACE_CODES)}"
            )
        if s in seen:
            continue
        seen.add(s)
        out.append(s)
    return out


# ── ToothProcedure (projection) ───────────────────────────────


class ToothProcedureOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    tooth_fdi: str | None
    faces: list[str]
    procedure_id: uuid.UUID
    status: ToothProcedureStatus
    price_snapshot: Decimal
    commission_pct_snapshot: Decimal | None
    notes: str | None
    planned_by_user_id: uuid.UUID
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class OdontogramSnapshotOut(BaseModel):
    """Current materialized state of a patient's odontogram."""

    patient_id: uuid.UUID
    procedures: list[ToothProcedureOut]


# ── Events ────────────────────────────────────────────────────


class OdontogramEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    event_type: OdontogramEventType
    tooth_fdi: str | None
    faces: list[str]
    procedure_id: uuid.UUID | None
    tooth_procedure_id: uuid.UUID | None
    payload: dict[str, Any]
    notes: str | None
    actor_user_id: uuid.UUID
    created_at: datetime


class AddProcedureIn(BaseModel):
    """Plans a procedure on a tooth/face. Emits PROCEDURE_ADDED event +
    creates a ToothProcedure projection row."""

    procedure_id: uuid.UUID
    tooth_fdi: str | None = Field(
        default=None,
        description="Código FDI/ISO 3950 do dente. Pode ser nulo p/ procedimentos gerais (ex: profilaxia).",
    )
    faces: list[str] = Field(default_factory=list, max_length=6)
    notes: str | None = Field(default=None, max_length=1000)
    price_override: Decimal | None = Field(
        default=None, ge=Decimal("0"), max_digits=10, decimal_places=2,
        description="Sobrescreve o base_price do catálogo no snapshot. Padrão: base_price.",
    )

    @field_validator("tooth_fdi", mode="before")
    @classmethod
    def _v_fdi(cls, v: Any) -> str | None:
        return _validate_fdi(v)

    @field_validator("faces", mode="before")
    @classmethod
    def _v_faces(cls, v: Any) -> list[str]:
        return _validate_faces(v)


class StatusChangeIn(BaseModel):
    new_status: ToothProcedureStatus
    reason: str | None = Field(default=None, max_length=500)


class RemoveProcedureIn(BaseModel):
    reason: str | None = Field(default=None, max_length=500)


class NoteIn(BaseModel):
    tooth_fdi: str | None = None
    text: str = Field(min_length=1, max_length=2000)

    @field_validator("tooth_fdi", mode="before")
    @classmethod
    def _v_fdi(cls, v: Any) -> str | None:
        return _validate_fdi(v)
