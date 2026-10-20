"""Pydantic schemas for agenda — rooms, appointments, check-ins."""
from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Annotated, Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from src.modules.agenda.enums import AppointmentStatus, CheckInMethod
from src.modules.agenda.whatsapp_templates import WhatsAppTemplate

_HEX_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
HexColor = Annotated[str, Field(min_length=7, max_length=7)]


def _validate_hex(v: Any) -> str:
    s = str(v)
    if not _HEX_RE.match(s):
        raise ValueError("color must be in #RRGGBB format")
    return s.upper()


# ── Rooms ────────────────────────────────────────────────────


class RoomCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=60)
    description: str | None = None
    equipments: dict[str, Any] = Field(default_factory=dict)
    color_hex: HexColor = "#6366F1"
    is_active: bool = True

    @field_validator("color_hex", mode="before")
    @classmethod
    def _v_hex(cls, v: Any) -> str:
        return _validate_hex(v)


class RoomUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=60)
    description: str | None = None
    equipments: dict[str, Any] | None = None
    color_hex: HexColor | None = None
    is_active: bool | None = None

    @field_validator("color_hex", mode="before")
    @classmethod
    def _v_hex(cls, v: Any) -> str | None:
        return None if v is None else _validate_hex(v)


class RoomOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    name: str
    description: str | None
    equipments: dict[str, Any]
    color_hex: str
    is_active: bool
    created_at: datetime


# ── Appointments ─────────────────────────────────────────────


class AppointmentCreateIn(BaseModel):
    patient_id: uuid.UUID
    professional_id: uuid.UUID
    room_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    procedure_hint: str | None = Field(default=None, max_length=180)
    notes: str | None = None
    generate_checkin_codes: bool = Field(
        default=True,
        description="Se True, gera pin_code (4 dígitos) + qr_token automaticamente",
    )

    @model_validator(mode="after")
    def _validate_range(self) -> AppointmentCreateIn:
        if self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class AppointmentUpdateIn(BaseModel):
    """Reschedule / change room or professional. Status muda por endpoint dedicado."""

    professional_id: uuid.UUID | None = None
    room_id: uuid.UUID | None = None
    starts_at: datetime | None = None
    ends_at: datetime | None = None
    procedure_hint: str | None = Field(default=None, max_length=180)
    notes: str | None = None

    @model_validator(mode="after")
    def _validate_range(self) -> AppointmentUpdateIn:
        if self.starts_at and self.ends_at and self.ends_at <= self.starts_at:
            raise ValueError("ends_at must be after starts_at")
        return self


class AppointmentStatusChangeIn(BaseModel):
    new_status: AppointmentStatus
    reason: str | None = Field(default=None, max_length=300)


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    patient_id: uuid.UUID
    professional_id: uuid.UUID
    room_id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    procedure_hint: str | None
    notes: str | None
    pin_code: str | None
    qr_token: str | None
    confirmed_at: datetime | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class AppointmentBoardItem(BaseModel):
    """Item enriquecido p/ board de agenda (com nome do paciente e dentista)."""

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    starts_at: datetime
    ends_at: datetime
    status: AppointmentStatus
    patient_id: uuid.UUID
    patient_name: str
    professional_id: uuid.UUID
    professional_name: str
    room_id: uuid.UUID
    room_name: str
    procedure_hint: str | None
    confirmed_at: datetime | None


# ── Check-in ─────────────────────────────────────────────────


class CheckInManualIn(BaseModel):
    """Check-in manual feito pela secretária (já autenticada)."""

    method: CheckInMethod = CheckInMethod.MANUAL


class CheckInByCodeIn(BaseModel):
    """Check-in público anônimo via PIN (4 dígitos) ou QR token (64 chars)."""

    code: str = Field(min_length=4, max_length=64)
    clinic_id: uuid.UUID


class CheckInOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    appointment_id: uuid.UUID
    method: CheckInMethod
    checked_in_at: datetime


class CheckInPublicResult(BaseModel):
    """Resposta segura para endpoint público — não vaza PII."""

    ok: bool
    appointment_id: uuid.UUID | None = None
    patient_first_name: str | None = None
    professional_name: str | None = None
    room_name: str | None = None
    starts_at: datetime | None = None
    message: str


# ── WhatsApp (Click-to-Chat) ─────────────────────────────────


class SendWhatsAppIn(BaseModel):
    template: WhatsAppTemplate = WhatsAppTemplate.CONFIRMATION
    # Anexa o link da teleconsulta (Jitsi) — suportado no template de confirmação.
    include_teleconsultation: bool = False


class TeleconsultationOut(BaseModel):
    """Sala de vídeo (Jitsi Meet) derivada do ID do agendamento."""

    appointment_id: uuid.UUID
    room_name: str
    room_url: str


class SendWhatsAppOut(BaseModel):
    """Mensagem renderizada + deep-link wa.me para a recepção abrir."""

    appointment_id: uuid.UUID
    template: WhatsAppTemplate
    template_label: str
    patient_name: str
    phone_e164: str
    message: str
    whatsapp_url: str
    teleconsultation_url: str | None = None
