"""Odontogram models — append-only event log + materialized tooth projection."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.clinical.odontogram.enums import (
    OdontogramEventType,
    ToothProcedureStatus,
)
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class OdontogramEvent(Base):
    """
    Append-only event log. The source of truth for the odontogram aggregate.
    NO updates, NO deletes (LGPD-safe clinical audit trail).

    `tooth_fdi` and `faces` are denormalized snapshots of *what* the event
    targeted at the moment of recording. `payload` stores type-specific data
    (e.g. old_status, new_status for transitions; note text for notes).
    """

    __tablename__ = "odontogram_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    event_type: Mapped[OdontogramEventType] = mapped_column(
        SAEnum(
            OdontogramEventType,
            name="odontogrameventtype",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
    )

    # Target snapshot
    tooth_fdi: Mapped[str | None] = mapped_column(String(2), nullable=True)
    # JSONB list of face codes (e.g. ["M", "O", "D"]). Empty list = whole tooth.
    faces: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)

    # Cross-references
    procedure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procedures.id", ondelete="RESTRICT"),
        nullable=True,
    )
    tooth_procedure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tooth_procedures.id", ondelete="CASCADE"),
        nullable=True,
    )

    # Type-specific extra (old_status, new_status, reason, note text…)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    # Append-only: only created_at, NO updated_at, NO deleted_at.
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        Index("ix_odontoevt_clinic_patient_time", "clinic_id", "patient_id", "created_at"),
        Index("ix_odontoevt_tooth_procedure", "tooth_procedure_id"),
        Index("ix_odontoevt_type", "clinic_id", "event_type"),
    )


class ToothProcedure(Base, TimestampMixin):
    """
    Materialized projection of the events relevant to a single (tooth, procedure)
    pair. Multiple ToothProcedure rows can exist per tooth (e.g. one restoration
    on face M + one canal). The pair (tooth_fdi + procedure + faces) is NOT
    forced unique because clinically a procedure can be re-planned after one is
    cancelled.

    `price_snapshot` and `commission_pct_snapshot` are captured at PLAN time so
    later catalog price changes do not retroactively alter quoted/agreed values.
    """

    __tablename__ = "tooth_procedures"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    tooth_fdi: Mapped[str | None] = mapped_column(String(2), nullable=True)
    faces: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)

    procedure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procedures.id", ondelete="RESTRICT"),
        nullable=False,
    )

    status: Mapped[ToothProcedureStatus] = mapped_column(
        SAEnum(
            ToothProcedureStatus,
            name="toothprocedurestatus",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=ToothProcedureStatus.PLANNED,
    )

    # Snapshots taken at PLAN time
    price_snapshot: Mapped[Decimal] = mapped_column(
        Numeric(10, 2), nullable=False, default=0
    )
    commission_pct_snapshot: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Lifecycle markers
    planned_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_toothproc_clinic_patient", "clinic_id", "patient_id"),
        Index("ix_toothproc_patient_tooth", "patient_id", "tooth_fdi"),
        Index("ix_toothproc_clinic_status", "clinic_id", "status"),
        Index(
            "ix_toothproc_active",
            "clinic_id",
            "patient_id",
            postgresql_where="deleted_at IS NULL",
        ),
    )
