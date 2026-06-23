"""Audit / LGPD models. Sprint S2 ships DataAccessLog only.

AuditLog (mutation tracking) e ConsentLog (versioned consents) entram em sprints futuros
ou estão alocados em outros módulos (ConsentLog → patients/PatientConsent).
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.db.base_model import Base, uuid_pk


class DataAccessLog(Base):
    """
    LGPD Art. 37: registro de QUEM acessou (leu) dados sensíveis de paciente.
    Append-only — nunca UPDATE/DELETE. Sem mixin de timestamps porque only created.
    """

    __tablename__ = "data_access_logs"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    actor_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id"),
        nullable=False,
    )
    patient_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("patients.id", ondelete="CASCADE"),
        nullable=False,
    )

    resource_type: Mapped[str] = mapped_column(String(60), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    purpose: Mapped[str] = mapped_column(String(60), nullable=False)
    actor_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)

    accessed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    __table_args__ = (
        Index("ix_access_patient_time", "patient_id", "accessed_at"),
        Index("ix_access_actor_time", "actor_user_id", "accessed_at"),
        Index("ix_access_clinic_time", "clinic_id", "accessed_at"),
    )
