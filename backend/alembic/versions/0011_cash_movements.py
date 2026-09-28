"""S6.3: Finance — cash_movements (caixa diário: entradas/saídas).

Revision ID: 0011_cash_movements
Revises: 0010_anamnesis
Create Date: 2026-07-03 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0011_cash_movements"
down_revision: str | None = "0010_anamnesis"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

MOVEMENT_TYPES = ("income", "expense")
PAYMENT_METHODS = ("cash", "pix", "card_credit", "card_debit", "transfer", "other")


def upgrade() -> None:
    bind = op.get_bind()

    postgresql.ENUM(*MOVEMENT_TYPES, name="cashmovementtype").create(bind, checkfirst=True)
    postgresql.ENUM(*PAYMENT_METHODS, name="cashpaymentmethod").create(bind, checkfirst=True)

    op.create_table(
        "cash_movements",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "type",
            postgresql.ENUM(*MOVEMENT_TYPES, name="cashmovementtype", create_type=False),
            nullable=False,
        ),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("description", sa.String(200), nullable=False),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "payment_method",
            postgresql.ENUM(*PAYMENT_METHODS, name="cashpaymentmethod", create_type=False),
            nullable=False,
        ),
        sa.Column(
            "quote_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("quotes.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "appointment_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("appointments.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_cash_clinic_created", "cash_movements", ["clinic_id", "created_at"])
    op.create_index("ix_cash_clinic_type", "cash_movements", ["clinic_id", "type"])


def downgrade() -> None:
    op.drop_index("ix_cash_clinic_type", table_name="cash_movements")
    op.drop_index("ix_cash_clinic_created", table_name="cash_movements")
    op.drop_table("cash_movements")
    op.execute("DROP TYPE IF EXISTS cashpaymentmethod")
    op.execute("DROP TYPE IF EXISTS cashmovementtype")
