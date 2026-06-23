"""Patient + ConsentLog models."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.patients.enums import ConsentScope, Gender
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class Patient(Base, TimestampMixin):
    """
    Patient record. CPF is optional but UNIQUE per clinic when present
    (handled via partial unique index in the migration).

    Anonymization (LGPD "Direito ao Esquecimento") wipes PII but keeps the row
    intact so financial / clinical aggregates remain referentially valid.
    """

    __tablename__ = "patients"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Identification (PII — wiped on anonymize)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    social_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    rg: Mapped[str | None] = mapped_column(String(20), nullable=True)
    birth_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    gender: Mapped[Gender] = mapped_column(
        SAEnum(Gender, name="patientgender", values_callable=lambda x: [i.value for i in x]),
        default=Gender.NOT_INFORMED,
        nullable=False,
    )

    # ── Contact (PII — wiped on anonymize)
    phone_e164: Mapped[str] = mapped_column(String(20), nullable=False)
    secondary_phone_e164: Mapped[str | None] = mapped_column(String(20), nullable=True)
    email: Mapped[str | None] = mapped_column(String(180), nullable=True)

    # ── Address (PII — wiped on anonymize)
    address_street: Mapped[str | None] = mapped_column(String(200), nullable=True)
    address_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    address_complement: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address_neighborhood: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address_city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    address_state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    address_zipcode: Mapped[str | None] = mapped_column(String(10), nullable=True)

    # ── Pediatric / guardian (PII — wiped on anonymize)
    is_minor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    guardian_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    guardian_cpf: Mapped[str | None] = mapped_column(String(14), nullable=True)
    guardian_phone_e164: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Clinical observations (kept — but neutral after anonymize)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── LGPD anonymization marker
    anonymized_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        # Partial unique: CPF unique per clinic when filled and not anonymized
        Index(
            "uq_patient_clinic_cpf",
            "clinic_id",
            "cpf",
            unique=True,
            postgresql_where="cpf IS NOT NULL AND anonymized_at IS NULL",
        ),
        Index("ix_patients_clinic_name", "clinic_id", "full_name"),
        Index("ix_patients_phone", "phone_e164"),
        Index(
            "ix_patients_clinic_active",
            "clinic_id",
            postgresql_where="deleted_at IS NULL",
        ),
    )

    @property
    def is_anonymized(self) -> bool:
        return self.anonymized_at is not None


class PatientConsent(Base, TimestampMixin):
    """
    Versioned consent records. Each grant/revoke creates a new row — append-only.
    Latest row per (patient, scope) is the current state.
    """

    __tablename__ = "patient_consents"

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

    scope: Mapped[ConsentScope] = mapped_column(
        SAEnum(ConsentScope, name="consentscope", values_callable=lambda x: [i.value for i in x]),
        nullable=False,
    )
    granted: Mapped[bool] = mapped_column(Boolean, nullable=False)

    document_version: Mapped[str] = mapped_column(String(20), nullable=False)
    document_text_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)

    granted_via: Mapped[str] = mapped_column(String(30), nullable=False, default="in_person")
    actor_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    actor_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )

    __table_args__ = (
        Index("ix_consent_patient_scope_time", "patient_id", "scope", "created_at"),
        UniqueConstraint(
            "patient_id", "scope", "created_at",
            name="uq_consent_unique_event",
        ),
    )
