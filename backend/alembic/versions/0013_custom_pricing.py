"""0013: Custom Pricing — descontos / preços especiais por clínica.

Adiciona em ``clinics``:
- ``custom_price_amount``  Numeric(10,2) nullable — se preenchido, ignora o
  preço do plano padrão e cria um Stripe Price dinâmico com este valor (R$).
- ``stripe_coupon_id``     String(100) nullable — se preenchido, aplica o cupom
  (``discounts``) na Checkout Session.

Revision ID: 0013_custom_pricing
Revises: 0012_super_admin
Create Date: 2026-07-12 00:00:00
"""
from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0013_custom_pricing"
down_revision: str | None = "0012_super_admin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "clinics",
        sa.Column("custom_price_amount", sa.Numeric(10, 2), nullable=True),
    )
    op.add_column(
        "clinics",
        sa.Column("stripe_coupon_id", sa.String(100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("clinics", "stripe_coupon_id")
    op.drop_column("clinics", "custom_price_amount")
