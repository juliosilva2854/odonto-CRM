"""S0+S1 baseline: extensions + tenancy + auth.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-01-01 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0001_baseline"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # ── Required extensions (used in later phases by agenda EXCLUDE constraint)
    op.execute("CREATE EXTENSION IF NOT EXISTS btree_gist")
    op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    # ── clinics
    op.create_table(
        "clinics",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("legal_name", sa.String(200), nullable=False),
        sa.Column("trade_name", sa.String(200), nullable=False),
        sa.Column("cnpj", sa.String(18), nullable=False),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="America/Sao_Paulo"),
        sa.Column("plan", sa.String(30), nullable=False, server_default="standard"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("cnpj", name="uq_clinics_cnpj"),
    )

    # ── clinic_features
    op.create_table(
        "clinic_features",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("feature_key", sa.String(60), nullable=False),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column(
            "config",
            postgresql.JSONB(astext_type=sa.Text()),
            nullable=False,
            server_default=sa.text("'{}'::jsonb"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("clinic_id", "feature_key", name="uq_clinic_feature"),
    )

    # ── users
    user_role = postgresql.ENUM(
        "admin", "dentist", "reception", name="userrole", create_type=True
    )
    user_role.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "users",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("email", sa.String(180), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("full_name", sa.String(180), nullable=False),
        sa.Column(
            "role",
            postgresql.ENUM(
                "admin", "dentist", "reception", name="userrole", create_type=False
            ),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("clinic_id", "email", name="uq_user_clinic_email"),
    )
    op.create_index("ix_users_clinic_role", "users", ["clinic_id", "role"])

    # ── professionals
    op.create_table(
        "professionals",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column(
            "clinic_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("clinics.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("cro_number", sa.String(20), nullable=False),
        sa.Column("cro_state", sa.String(2), nullable=False),
        sa.Column("specialty", sa.String(80), nullable=True),
        sa.Column(
            "default_commission_pct",
            sa.Numeric(5, 2),
            nullable=False,
            server_default=sa.text("0"),
        ),
        sa.Column("color_hex", sa.String(7), nullable=False, server_default="#3B82F6"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("professionals")
    op.drop_index("ix_users_clinic_role", table_name="users")
    op.drop_table("users")
    op.execute("DROP TYPE IF EXISTS userrole")
    op.drop_table("clinic_features")
    op.drop_table("clinics")
