"""0012: Super Admin — platform role + tenant-less users.

- Adiciona o valor 'super_admin' ao enum ``userrole``.
- Torna ``users.clinic_id`` nullable (super admin não pertence a clínica).
- Adiciona ``users.is_super_admin`` (default FALSE).

Revision ID: 0012_super_admin
Revises: 0011_cash_movements
Create Date: 2026-07-10 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0012_super_admin"
down_revision: str | None = "0011_cash_movements"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # 1. Novo valor no enum userrole (PG 12+ permite dentro de transação; o
    #    valor não é usado nesta mesma migração, então não há restrição).
    op.execute("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'super_admin'")

    # 2. clinic_id passa a ser opcional.
    op.alter_column(
        "users",
        "clinic_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=True,
    )

    # 3. Flag de super admin.
    op.add_column(
        "users",
        sa.Column(
            "is_super_admin",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "is_super_admin")
    # Remover linhas órfãs (sem clínica) antes de reimpor o NOT NULL.
    op.execute("DELETE FROM users WHERE clinic_id IS NULL")
    op.alter_column(
        "users",
        "clinic_id",
        existing_type=postgresql.UUID(as_uuid=True),
        nullable=False,
    )
    # Valores de enum não podem ser removidos no PostgreSQL — 'super_admin' fica.
