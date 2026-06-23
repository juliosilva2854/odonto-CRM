"""Catalog models: Specialty + Procedure (TUSS-ready)."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Integer, Numeric, String, Text, UniqueConstraint
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.modules.clinical.catalog.enums import ProcedureCategory
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class Specialty(Base, TimestampMixin):
    """Clinical taxonomy. Ex: 'Endodontia', 'Ortodontia'."""

    __tablename__ = "specialties"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (UniqueConstraint("clinic_id", "name", name="uq_specialty_clinic_name"),)


class Procedure(Base, TimestampMixin):
    """
    Catalog item. TUSS-ready: tuss_code maps to Brazilian standard codes when applicable
    (private practice procedures may have no TUSS code — kept optional).
    """

    __tablename__ = "procedures"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )

    # ── Codes
    code: Mapped[str] = mapped_column(String(20), nullable=False)  # clinic-internal
    tuss_code: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Identification
    name: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[ProcedureCategory] = mapped_column(
        SAEnum(
            ProcedureCategory,
            name="procedurecategory",
            values_callable=lambda x: [i.value for i in x],
        ),
        nullable=False,
    )
    specialty_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("specialties.id", ondelete="SET NULL"),
        nullable=True,
    )

    # ── Behavior in odontogram (used in Sprint S7+)
    requires_tooth: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    requires_faces: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    default_color_hex: Mapped[str] = mapped_column(String(7), default="#3B82F6", nullable=False)
    completed_color_hex: Mapped[str] = mapped_column(String(7), default="#10B981", nullable=False)

    # ── Pricing & schedule
    base_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    default_duration_min: Mapped[int] = mapped_column(Integer, default=30, nullable=False)
    commission_pct_override: Mapped[float | None] = mapped_column(Numeric(5, 2), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("clinic_id", "code", name="uq_procedure_clinic_code"),
        Index("ix_procedures_clinic_category", "clinic_id", "category"),
        Index("ix_procedures_clinic_specialty", "clinic_id", "specialty_id"),
        Index("ix_procedures_tuss", "tuss_code"),
        Index(
            "ix_procedures_clinic_active",
            "clinic_id",
            postgresql_where="is_active = true AND deleted_at IS NULL",
        ),
    )
