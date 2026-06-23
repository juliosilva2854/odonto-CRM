"""Agenda models: Room, Appointment, CheckIn."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.agenda.enums import AppointmentStatus, CheckInMethod
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class Room(Base, TimestampMixin):
    """Consultório físico. Unidade do tri-recurso da agenda."""

    __tablename__ = "rooms"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    equipments: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)
    color_hex: Mapped[str] = mapped_column(String(7), default="#6366F1", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("clinic_id", "name", name="uq_room_clinic_name"),)


class Appointment(Base, TimestampMixin):
    """
    Reserva tri-recurso (profissional + sala + paciente) em janela de tempo.
    Conflitos são bloqueados na camada de banco via EXCLUDE USING gist
    (criadas via SQL bruto na migration 0003).
    """

    __tablename__ = "appointments"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="RESTRICT"),
        nullable=False,
    )
    professional_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("professionals.id", ondelete="RESTRICT"),
        nullable=False,
    )
    room_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("rooms.id", ondelete="RESTRICT"),
        nullable=False,
    )

    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    status: Mapped[AppointmentStatus] = mapped_column(
        SAEnum(
            AppointmentStatus,
            name="appointmentstatus",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=AppointmentStatus.SCHEDULED,
    )

    procedure_hint: Mapped[str | None] = mapped_column(String(180), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Pre-issued check-in codes (set when appointment is created / regenerated)
    pin_code: Mapped[str | None] = mapped_column(String(8), nullable=True)
    qr_token: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # ── Confirmation tracking (for WhatsApp loop later)
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    __table_args__ = (
        CheckConstraint("ends_at > starts_at", name="ck_appointment_time_range"),
        Index("ix_appt_clinic_starts", "clinic_id", "starts_at"),
        Index("ix_appt_prof_starts", "professional_id", "starts_at"),
        Index("ix_appt_room_starts", "room_id", "starts_at"),
        Index("ix_appt_patient", "patient_id"),
        Index("ix_appt_clinic_status", "clinic_id", "status"),
        UniqueConstraint("clinic_id", "qr_token", name="uq_appt_qr_token"),
        # EXCLUDE constraints (3x) são criadas em SQL bruto na migration 0003.
    )


class CheckIn(Base):
    """
    Evento de check-in. 1:1 com appointment (paciente só dá check-in uma vez).
    Não usa TimestampMixin pois é append-only (sem update).
    """

    __tablename__ = "check_ins"

    id: Mapped[uuid.UUID] = uuid_pk()
    appointment_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )

    method: Mapped[CheckInMethod] = mapped_column(
        SAEnum(
            CheckInMethod,
            name="checkinmethod",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
    )

    # Código que efetivamente foi usado (ou NULL para MANUAL)
    code_used: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # NULL para QR/PIN (auto), preenchido p/ MANUAL
    performed_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    actor_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    checked_in_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        Index("ix_checkin_clinic_time", "clinic_id", "checked_in_at"),
    )
