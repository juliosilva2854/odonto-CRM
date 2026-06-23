"""Tenancy: Clinic + ClinicFeature."""
from __future__ import annotations

import uuid
from typing import Any

from sqlalchemy import Boolean, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class Clinic(Base, TimestampMixin):
    __tablename__ = "clinics"

    id: Mapped[uuid.UUID] = uuid_pk()
    legal_name: Mapped[str] = mapped_column(String(200), nullable=False)
    trade_name: Mapped[str] = mapped_column(String(200), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(18), unique=True, nullable=False)
    timezone: Mapped[str] = mapped_column(String(50), default="America/Sao_Paulo", nullable=False)
    plan: Mapped[str] = mapped_column(String(30), default="standard", nullable=False)


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
