"""Billing models — BillingEvent (idempotência + auditoria de webhooks Stripe)."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class BillingEventStatus(str, enum.Enum):
    PENDING = "pending"      # inserido, ainda não processado
    PROCESSED = "processed"  # aplicado com sucesso
    FAILED = "failed"        # erro no processamento (Stripe vai retentar)
    IGNORED = "ignored"      # tipo de evento que não nos interessa


class BillingEvent(Base, TimestampMixin):
    """Um webhook recebido do Stripe.

    ``stripe_event_id`` é único: é o que garante idempotência frente aos
    retries agressivos do Stripe (até 3 dias). O ``payload`` cru é guardado
    inteiro para auditoria/reprocessamento manual.
    """

    __tablename__ = "billing_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    stripe_event_id: Mapped[str] = mapped_column(String(255), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    clinic_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[BillingEventStatus] = mapped_column(
        SAEnum(
            BillingEventStatus,
            native_enum=False,  # VARCHAR(20) + CheckConstraint explícito (migration 0007)
            length=20,
            create_constraint=False,
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=BillingEventStatus.PENDING,
        server_default=BillingEventStatus.PENDING.value,
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        UniqueConstraint("stripe_event_id", name="uq_billing_events_stripe_event_id"),
        CheckConstraint(
            "status IN ('pending', 'processed', 'failed', 'ignored')",
            name="ck_billing_events_status",
        ),
        Index("ix_billing_events_status", "status"),
        Index("ix_billing_events_clinic", "clinic_id"),
        Index("ix_billing_events_type_time", "event_type", "created_at"),
    )
