"""Cria/atualiza os produtos e preços dos planos no Stripe (idempotente).

Uso:
    cd backend && python -m scripts.create_stripe_products

Só faz chamadas reais se ``STRIPE_SECRET_KEY`` estiver configurada (``sk_...``).
Caso contrário roda em DRY RUN, imprimindo o que faria.
"""
from __future__ import annotations

import sys

import stripe

from src.core.config import get_settings

settings = get_settings()

CURRENCY = "brl"
INTERVAL = "month"

PLANS = [
    {
        "internal_key": "plan_essencial",
        "env_var": "STRIPE_PRICE_ESSENCIAL",
        "name": "Odonto CRM — Essencial",
        "unit_amount": 29700,  # R$ 297,00
    },
    {
        "internal_key": "plan_pro",
        "env_var": "STRIPE_PRICE_PRO",
        "name": "Odonto CRM — Pro",
        "unit_amount": 49700,  # R$ 497,00
    },
    {
        "internal_key": "plan_clinica",
        "env_var": "STRIPE_PRICE_CLINICA",
        "name": "Odonto CRM — Clínica",
        "unit_amount": 79700,  # R$ 797,00
    },
]


def _find_product(internal_key: str):
    """Busca produto ativo pela metadata ``internal_key``."""
    for product in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        if (product.metadata or {}).get("internal_key") == internal_key:
            return product
    return None


def _find_price(product_id: str, unit_amount: int):
    """Busca preço mensal ativo em BRL com o valor esperado."""
    for price in stripe.Price.list(product=product_id, active=True, limit=100).auto_paging_iter():
        recurring = price.recurring or {}
        if (
            price.currency == CURRENCY
            and price.unit_amount == unit_amount
            and recurring.get("interval") == INTERVAL
        ):
            return price
    return None


def _dry_run() -> None:
    print("DRY RUN — Stripe não configurado (STRIPE_SECRET_KEY ausente ou placeholder).")
    print("Nenhuma chamada à API foi feita. O que seria criado/reutilizado:\n")
    for plan in PLANS:
        print(f"  • Product  name={plan['name']!r} metadata.internal_key={plan['internal_key']}")
        print(
            f"    Price    unit_amount={plan['unit_amount']} currency={CURRENCY} "
            f"recurring.interval={INTERVAL}"
        )
    print("\nConfigure STRIPE_SECRET_KEY no .env e rode novamente para criar de verdade.")


def main() -> int:
    if not settings.stripe_configured:
        _dry_run()
        return 0

    stripe.api_key = settings.STRIPE_SECRET_KEY
    results: dict[str, str] = {}

    for plan in PLANS:
        internal_key = str(plan["internal_key"])
        product = _find_product(internal_key)
        if product is None:
            product = stripe.Product.create(
                name=str(plan["name"]),
                metadata={"internal_key": internal_key},
            )
            print(f"[stripe] Product criado: {product.id} ({plan['name']})")
        else:
            print(f"[stripe] Product reutilizado: {product.id} ({plan['name']})")

        price = _find_price(product.id, int(plan["unit_amount"]))
        if price is None:
            price = stripe.Price.create(
                product=product.id,
                unit_amount=int(plan["unit_amount"]),
                currency=CURRENCY,
                recurring={"interval": INTERVAL},
                metadata={"internal_key": internal_key},
            )
            print(f"[stripe] Price criado: {price.id}")
        else:
            print(f"[stripe] Price reutilizado: {price.id}")

        results[str(plan["env_var"])] = price.id

    print("\n" + "═" * 63)
    print("Cole isso no seu .env:\n")
    for env_var, price_id in results.items():
        print(f"{env_var}={price_id}")
    print("═" * 63)
    return 0


if __name__ == "__main__":
    sys.exit(main())
