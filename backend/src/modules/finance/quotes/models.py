"""Quote + QuoteItem models.

Pricing semantics:
- `unit_price` × `quantity` − `discount_amount` = `line_total` (per item)
- Quote `subtotal` = Σ items.line_total
- Quote `total`    = subtotal − discount_amount

Commission semantics (snapshot at quote creation, frozen forever):
- `commission_pct_snapshot`: percentage (e.g. 40.00 = 40%)
- `commission_amount_snapshot`: optional nominal override
- `deductions`: JSONB list of `{type, amount, label?}` — subtracted from
  line_total BEFORE applying commission % (rule: "comissão sobre o líquido").
  The Split module (S11) will compute the final amount; we just hold the
  inputs immutable here.
"""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Numeric, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.modules.finance.quotes.enums import QuoteItemStatus, QuoteStatus
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class Quote(Base, TimestampMixin):
    __tablename__ = "quotes"

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

    # Human-readable identifier (e.g. ORC-2026-000123). Unique per clinic.
    number: Mapped[str] = mapped_column(String(30), nullable=False)

    status: Mapped[QuoteStatus] = mapped_column(
        SAEnum(
            QuoteStatus,
            name="quotestatus",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=QuoteStatus.DRAFT,
    )

    # Money — Decimal(10, 2) is plenty for clinic-sized totals.
    subtotal: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )
    approved_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    items: Mapped[list["QuoteItem"]] = relationship(
        "QuoteItem",
        back_populates="quote",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    __table_args__ = (
        UniqueConstraint("clinic_id", "number", name="uq_quote_clinic_number"),
        Index("ix_quote_clinic_patient", "clinic_id", "patient_id"),
        Index("ix_quote_clinic_status", "clinic_id", "status"),
    )


class QuoteItem(Base, TimestampMixin):
    __tablename__ = "quote_items"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    quote_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Catalog snapshot
    procedure_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("procedures.id", ondelete="RESTRICT"),
        nullable=False,
    )
    procedure_code_snapshot: Mapped[str] = mapped_column(String(32), nullable=False)
    procedure_name_snapshot: Mapped[str] = mapped_column(String(200), nullable=False)

    # Clinical link (optional — many quote items target a planned tooth)
    tooth_procedure_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("tooth_procedures.id", ondelete="SET NULL"),
        nullable=True,
    )
    tooth_fdi: Mapped[str | None] = mapped_column(String(2), nullable=True)
    faces: Mapped[list[str]] = mapped_column(JSONB, default=list, nullable=False)

    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Pricing
    quantity: Mapped[Decimal] = mapped_column(Numeric(7, 2), nullable=False, default=1)
    unit_price: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False, default=0)
    line_total: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)

    # Commission snapshots (frozen at create time)
    commission_pct_snapshot: Mapped[Decimal | None] = mapped_column(
        Numeric(5, 2), nullable=True
    )
    commission_amount_snapshot: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )

    # JSONB list of {type, amount, label?}
    deductions: Mapped[list[dict[str, Any]]] = mapped_column(
        JSONB, default=list, nullable=False
    )

    status: Mapped[QuoteItemStatus] = mapped_column(
        SAEnum(
            QuoteItemStatus,
            name="quoteitemstatus",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
        default=QuoteItemStatus.PENDING,
    )

    # Item-level approval bookkeeping
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    decided_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=True
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)

    quote: Mapped["Quote"] = relationship("Quote", back_populates="items")

    __table_args__ = (
        Index("ix_quoteitem_quote", "quote_id"),
        Index("ix_quoteitem_clinic_status", "clinic_id", "status"),
        Index("ix_quoteitem_tooth_procedure", "tooth_procedure_id"),
    )
