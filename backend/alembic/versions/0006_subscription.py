"""S5: Billing — subscription/trial fields on clinics (Stripe-ready).

Revision ID: 0006_subscription
Revises: 0005_quotes
Create Date: 2026-02-15 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0006_subscription"
down_revision: str | None = "0005_quotes"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SUBSCRIPTION_STATUSES = ("trialing", "active", "past_due", "canceled")


def upgrade() -> None:
    bind = op.get_bind()

    # ── Enums
    postgresql.ENUM(*SUBSCRIPTION_STATUSES, name="subscriptionstatus").create(
        bind, checkfirst=True
    )

    # ── clinics: subscription columns
    op.add_column(
        "clinics",
        sa.Column("trial_ends_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "clinics",
        sa.Column(
            "subscription_status",
            postgresql.ENUM(*SUBSCRIPTION_STATUSES, name="subscriptionstatus", create_type=False),
            nullable=False,
            server_default="trialing",
        ),
    )
    op.add_column(
        "clinics",
        sa.Column("stripe_customer_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "clinics",
        sa.Column("stripe_subscription_id", sa.String(255), nullable=True),
    )
    op.add_column(
        "clinics",
        sa.Column("current_period_end", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Indexes
    op.create_index("ix_clinics_subscription_status", "clinics", ["subscription_status"])
    op.create_index(
        "uq_clinics_stripe_customer_id",
        "clinics",
        ["stripe_customer_id"],
        unique=True,
        postgresql_where=sa.text("stripe_customer_id IS NOT NULL"),
    )

    # Grandfather existing clinics: they become 'active' so they're not
    # locked out when the subscription middleware lands.
    op.execute(
        "UPDATE clinics SET subscription_status = 'active' "
        "WHERE subscription_status = 'trialing'"
    )


def downgrade() -> None:
    op.drop_index("uq_clinics_stripe_customer_id", table_name="clinics")
    op.drop_index("ix_clinics_subscription_status", table_name="clinics")

    op.drop_column("clinics", "current_period_end")
    op.drop_column("clinics", "stripe_subscription_id")
    op.drop_column("clinics", "stripe_customer_id")
    op.drop_column("clinics", "subscription_status")
    op.drop_column("clinics", "trial_ends_at")

    op.execute("DROP TYPE IF EXISTS subscriptionstatus")
