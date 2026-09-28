"""S6.1: Auth — users.last_login_at (rastreio de primeiro acesso / convite pendente).

Revision ID: 0009_user_last_login
Revises: 0008_password_reset_tokens
Create Date: 2026-07-01 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0009_user_last_login"
down_revision: str | None = "0008_password_reset_tokens"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "last_login_at")
