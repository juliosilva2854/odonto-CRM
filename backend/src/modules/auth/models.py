"""Auth domain models: User + Professional."""
from __future__ import annotations

import uuid

from sqlalchemy import Boolean, ForeignKey, Index, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Enum as SAEnum

from src.modules.auth.enums import UserRole
from src.shared.db.base_model import Base, TimestampMixin, uuid_pk


class User(Base, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    email: Mapped[str] = mapped_column(String(180), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str] = mapped_column(String(180), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="userrole", values_callable=lambda x: [i.value for i in x]),
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("clinic_id", "email", name="uq_user_clinic_email"),
        Index("ix_users_clinic_role", "clinic_id", "role"),
    )


class Professional(Base, TimestampMixin):
    """Dentist-specific profile. 1:1 with User when role=DENTIST."""

    __tablename__ = "professionals"

    id: Mapped[uuid.UUID] = uuid_pk()
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    clinic_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clinics.id", ondelete="CASCADE"),
        nullable=False,
    )
    cro_number: Mapped[str] = mapped_column(String(20), nullable=False)
    cro_state: Mapped[str] = mapped_column(String(2), nullable=False)
    specialty: Mapped[str | None] = mapped_column(String(80), nullable=True)
    default_commission_pct: Mapped[float] = mapped_column(
        Numeric(5, 2), default=0, nullable=False
    )
    color_hex: Mapped[str] = mapped_column(String(7), default="#3B82F6", nullable=False)
