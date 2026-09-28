"""CashMovement model — caixa diário (entradas/saídas)."""
from __future__ import annotations

import uuid
from decimal import Decimal

from sqlalchemy import ForeignKey, Index, Numeric, String
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.finance.cash.enums import CashMovementType, CashPaymentMethod
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class CashMovement(Base, TimestampMixin):
    __tablename__ = "cash_movements"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    type: Mapped[CashMovementType] = mapped_column(
        SAEnum(
            CashMovementType,
            name="cashmovementtype",
            values_callable=lambda x: [i.value for i in x],
            create_type=False,
        ),
        nullable=False,
    )
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    payment_method: Mapped[CashPaymentMethod] = mapped_column(
        SAEnum(
            CashPaymentMethod,
            name="cashpaymentmethod",
            values_callable=lambda x: [i.value for i in x],
            create_type=False,
        ),
        nullable=False,
    )
    quote_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("quotes.id", ondelete="SET NULL"),
        nullable=True,
    )
    appointment_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("appointments.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id"), nullable=False
    )

    __table_args__ = (
        Index("ix_cash_clinic_created", "clinic_id", "created_at"),
        Index("ix_cash_clinic_type", "clinic_id", "type"),
    )
