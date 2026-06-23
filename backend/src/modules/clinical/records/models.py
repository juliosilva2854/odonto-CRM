"""Clinical record models — ClinicalRecord + ClinicalRecordAddendum (append-only)."""
from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.clinical.records.enums import ClinicalRecordType
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class ClinicalRecord(Base, TimestampMixin):
    """
    A single clinical record entry. Editable only during the configurable
    `lock_hours` window (default 24h, from feature flag `clinical_records`
    config). After that, becomes immutable — addendums must be used instead.

    `locked_at` is set lazily by the service when an edit attempt happens
    *after* the window. This gives us auditable proof of when the record was
    sealed without requiring a background job.
    """

    __tablename__ = "clinical_records"

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
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    record_type: Mapped[ClinicalRecordType] = mapped_column(
        SAEnum(
            ClinicalRecordType,
            name="clinicalrecordtype",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=ClinicalRecordType.EVOLUTION,
    )

    title: Mapped[str] = mapped_column(String(180), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # JSONB list of {filename, url, mime, size_bytes, sha256}
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )

    # Lock bookkeeping
    locked_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    __table_args__ = (
        Index("ix_clrec_clinic_patient_time", "clinic_id", "patient_id", "created_at"),
        Index("ix_clrec_author", "clinic_id", "author_user_id"),
        Index("ix_clrec_appointment", "appointment_id"),
    )


class ClinicalRecordAddendum(Base):
    """
    Append-only addendum to a locked record. Each addendum is itself immutable
    after creation (no edits, no deletes — CFO compliance).
    """

    __tablename__ = "clinical_record_addendums"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    record_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinical_records.id", ondelete="CASCADE"),
        nullable=False,
    )
    author_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    content: Mapped[str] = mapped_column(Text, nullable=False)
    attachments: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    __table_args__ = (
        Index("ix_clrec_add_record_time", "record_id", "created_at"),
    )
