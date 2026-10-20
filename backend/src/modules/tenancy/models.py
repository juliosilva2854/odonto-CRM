"""Tenancy: Clinic + ClinicFeature (+ subscription/billing state)."""
from __future__ import annotations

import enum
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class SubscriptionStatus(str, enum.Enum):
    TRIALING = "trialing"    # período de teste (válido enquanto trial_ends_at > now)
    ACTIVE = "active"        # assinatura paga e em dia
    PAST_DUE = "past_due"    # pagamento falhou / em atraso
    CANCELED = "canceled"    # cancelada (spelling alinhado ao Stripe)


class Clinic(Base, TimestampMixin):
    __tablename__ = "clinics"

    id: Mapped[uuid.UUID] = uuid_pk()
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="America/Sao_Paulo", nullable=False)
    plan: Mapped[str] = mapped_column(String(30), default="standard", nullable=False)

    # ── Subscription / billing (Stripe-ready) ───────────────
    trial_ends_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    subscription_status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(
            SubscriptionStatus,
            name="subscriptionstatus",
            values_callable=lambda x: [i.value for i in x],
            create_type=False,
        ),
        nullable=False,
        default=SubscriptionStatus.TRIALING,
        server_default=SubscriptionStatus.TRIALING.value,
    )
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    current_period_end: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # ── Custom pricing (acordos comerciais / descontos) ──────
    # Se ``custom_price_amount`` estiver preenchido, o checkout cria um Price
    # dinâmico com este valor (R$) em vez do price_id do plano. Se
    # ``stripe_coupon_id`` estiver preenchido, o cupom é aplicado no checkout.
    custom_price_amount: Mapped[Decimal | None] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    stripe_coupon_id: Mapped[str | None] = mapped_column(String(100), nullable=True)

    __table_args__ = (
        Index("ix_clinics_subscription_status", "subscription_status"),
        Index(
            "uq_clinics_stripe_customer_id",
            "stripe_customer_id",
            unique=True,
            postgresql_where="stripe_customer_id IS NOT NULL",
        ),
    )


class ClinicFeature(Base, TimestampMixin):
    """Feature flags per clinic. Drives runtime module gating."""

    __tablename__ = "clinic_features"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    feature_key: Mapped[str] = mapped_column(String(60), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    config: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict, nullable=False)

    __table_args__ = (UniqueConstraint("clinic_id", "feature_key", name="uq_clinic_feature"),)
