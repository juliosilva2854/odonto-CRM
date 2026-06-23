"""S4.2: Finance — Quotes (orçamentos) + QuoteItems with item-level approval.

Revision ID: 0005_quotes
Revises: 0004_clinical_records
Create Date: 2026-02-01 00:30:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0005_quotes"
down_revision: str | None = "0004_clinical_records"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

QUOTE_STATUSES = (
    "draft",
    "sent",
    "approved_partial",
    "approved",
    "rejected",
    "cancelled",
    "expired",
)
QUOTE_ITEM_STATUSES = ("pending", "approved", "rejected")


def upgrade() -> None:
    bind = op.get_bind()

    postgresql.ENUM(*QUOTE_STATUSES, name="quotestatus").create(bind, checkfirst=True)
    postgresql.ENUM(*QUOTE_ITEM_STATUSES, name="quoteitemstatus").create(bind, checkfirst=True)

    # ── quotes ──────────────────────────────────────────────
    op.create_table(
        "quotes",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "patient_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("patients.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("number", sa.String(30), nullable=False),
        sa.Column(
            "status",
            postgresql.ENUM(*QUOTE_STATUSES, name="quotestatus", create_type=False),
            nullable=False,
            server_default="draft",
        ),
        sa.Column("subtotal", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("total", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("valid_until", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column(
            "approved_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_unique_constraint(
        "uq_quote_clinic_number", "quotes", ["clinic_id", "number"]
    )
    op.create_index("ix_quote_clinic_patient", "quotes", ["clinic_id", "patient_id"])
    op.create_index("ix_quote_clinic_status", "quotes", ["clinic_id", "status"])

    # ── quote_items ─────────────────────────────────────────
    op.create_table(
        "quote_items",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "quote_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("quotes.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "procedure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("procedures.id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("procedure_code_snapshot", sa.String(32), nullable=False),
        sa.Column("procedure_name_snapshot", sa.String(200), nullable=False),
        sa.Column(
            "tooth_procedure_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("tooth_procedures.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("tooth_fdi", sa.String(2), nullable=True),
        sa.Column(
            "faces",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("quantity", sa.Numeric(7, 2), nullable=False, server_default="1"),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("discount_amount", sa.Numeric(10, 2), nullable=False, server_default="0"),
        sa.Column("line_total", sa.Numeric(10, 2), nullable=False),
        sa.Column("commission_pct_snapshot", sa.Numeric(5, 2), nullable=True),
        sa.Column("commission_amount_snapshot", sa.Numeric(10, 2), nullable=True),
        sa.Column(
            "deductions",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'[]'::jsonb"),
        ),
        sa.Column(
            "status",
            postgresql.ENUM(*QUOTE_ITEM_STATUSES, name="quoteitemstatus", create_type=False),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("decided_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "decided_by_user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_quoteitem_quote", "quote_items", ["quote_id"])
    op.create_index("ix_quoteitem_clinic_status", "quote_items", ["clinic_id", "status"])
    op.create_index("ix_quoteitem_tooth_procedure", "quote_items", ["tooth_procedure_id"])


def downgrade() -> None:
    op.drop_index("ix_quoteitem_tooth_procedure", table_name="quote_items")
    op.drop_index("ix_quoteitem_clinic_status", table_name="quote_items")
    op.drop_index("ix_quoteitem_quote", table_name="quote_items")
    op.drop_table("quote_items")

    op.drop_index("ix_quote_clinic_status", table_name="quotes")
    op.drop_index("ix_quote_clinic_patient", table_name="quotes")
    op.drop_constraint("uq_quote_clinic_number", "quotes", type_="unique")
    op.drop_table("quotes")

    op.execute("DROP TYPE IF EXISTS quoteitemstatus")
    op.execute("DROP TYPE IF EXISTS quotestatus")
