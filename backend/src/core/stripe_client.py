"""Cliente Stripe — wrapper fino sobre o SDK oficial.

Responsabilidades:
- Configurar a API key global (idempotente)
- Expor helpers tipados para Customer, Checkout e Subscription
- Levantar ``AppException`` em erros do Stripe (nunca vazar ``stripe.StripeError``)

Decisão: o SDK oficial (>=11) expõe variantes nativas ``*_async`` que usam
``httpx`` por baixo — usamos elas em vez de ``anyio.to_thread.run_sync`` para
evitar ocupar o threadpool do event loop com I/O de rede.
"""
from __future__ import annotations

import uuid
from collections.abc import Iterator
from contextlib import contextmanager

import stripe

from src.core.config import get_settings
from src.core.errors import AppException, ValidationError
from src.modules.onboarding.enums import PlanTier

_settings = get_settings()
_api_key_set = False


def _ensure_configured() -> None:
    """Configura a API key uma única vez. Levanta 422 se Stripe não estiver setado."""
    global _api_key_set
    if not _settings.stripe_configured:
        raise ValidationError("Stripe not configured")
    if not _api_key_set:
        stripe.api_key = _settings.STRIPE_SECRET_KEY
        _api_key_set = True


@contextmanager
def _stripe_errors() -> Iterator[None]:
    """Traduz qualquer erro do SDK em AppException, preservando o código do Stripe."""
    try:
        yield
    except stripe.StripeError as exc:
        raise AppException(
            getattr(exc, "user_message", None) or "Stripe request failed",
            code="stripe_error",
            status_code=502,
            details={
                "stripe_code": getattr(exc, "code", None),
                "stripe_type": type(exc).__name__,
            },
        ) from exc


def get_price_id_for_plan(plan: PlanTier) -> str:
    """Mapeia um PlanTier para o price_id configurado no ambiente."""
    _ensure_configured()
    prices = {
        PlanTier.ESSENCIAL: _settings.STRIPE_PRICE_ESSENCIAL,
        PlanTier.PRO: _settings.STRIPE_PRICE_PRO,
        PlanTier.CLINICA: _settings.STRIPE_PRICE_CLINICA,
    }
    price_id = prices[plan]
    if not price_id or "PLACEHOLDER" in price_id.upper():
        raise ValidationError(
            "Stripe price not configured for this plan",
            details={"plan": plan.value},
        )
    return price_id


async def create_customer(clinic_id: uuid.UUID, email: str, name: str) -> str:
    """Cria um Customer no Stripe e devolve o id (``cus_...``)."""
    _ensure_configured()
    with _stripe_errors():
        customer = await stripe.Customer.create_async(
            email=email,
            name=name,
            metadata={"clinic_id": str(clinic_id)},
        )
    return customer.id


async def create_checkout_session(
    customer_id: str,
    price_id: str,
    clinic_id: uuid.UUID,
    customer_email: str | None = None,
) -> tuple[str, str]:
    """Cria uma Checkout Session (``mode=subscription``) e devolve (url, session_id)."""
    _ensure_configured()
    params: dict = {
        "mode": "subscription",
        "customer": customer_id,
        "line_items": [{"price": price_id, "quantity": 1}],
        "success_url": _settings.STRIPE_SUCCESS_URL,
        "cancel_url": _settings.STRIPE_CANCEL_URL,
        "client_reference_id": str(clinic_id),
        "metadata": {"clinic_id": str(clinic_id)},
        "subscription_data": {"metadata": {"clinic_id": str(clinic_id)}},
    }
    if customer_email:
        params["customer_update"] = {"address": "auto"}

    with _stripe_errors():
        session = await stripe.checkout.Session.create_async(**params)
    if not session.url:
        raise AppException("Stripe did not return a checkout URL", code="stripe_error", status_code=502)
    return session.url, session.id


async def create_portal_session(customer_id: str, return_url: str) -> str:
    """Cria uma sessão do Customer Portal e devolve a URL."""
    _ensure_configured()
    with _stripe_errors():
        session = await stripe.billing_portal.Session.create_async(
            customer=customer_id,
            return_url=return_url,
        )
    return session.url


async def retrieve_subscription(subscription_id: str):
    """Busca uma Subscription no Stripe (usado pelo webhook)."""
    _ensure_configured()
    with _stripe_errors():
        return await stripe.Subscription.retrieve_async(subscription_id)
