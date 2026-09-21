"""S5.2: Billing — billing_events (webhook idempotency + audit trail).

Revision ID: 0007_billing_events
Revises: 0006_subscription
Create Date: 2026-06-01 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0007_billing_events"
down_revision: str | None = "0006_subscription"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

BILLING_EVENT_STATUSES = ("pending", "processed", "failed", "ignored")


def upgrade() -> None:
    op.create_table(
        "billing_events",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("stripe_event_id", sa.String(255), nullable=False),
        sa.Column("event_type", sa.String(100), nullable=False),
        sa.Column("payload", postgresql.JSONB, nullable=False),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("error", sa.Text, nullable=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("stripe_event_id", name="uq_billing_events_stripe_event_id"),
        sa.CheckConstraint(
            "status IN ('pending', 'processed', 'failed', 'ignored')",
            name="ck_billing_events_status",
        ),
    )

    op.create_index("ix_billing_events_status", "billing_events", ["status"])
    op.create_index("ix_billing_events_clinic", "billing_events", ["clinic_id"])
    op.create_index(
        "ix_billing_events_type_time", "billing_events", ["event_type", "created_at"]
    )


def downgrade() -> None:
    op.drop_index("ix_billing_events_type_time", table_name="billing_events")
    op.drop_index("ix_billing_events_clinic", table_name="billing_events")
    op.drop_index("ix_billing_events_status", table_name="billing_events")
    op.drop_table("billing_events")
