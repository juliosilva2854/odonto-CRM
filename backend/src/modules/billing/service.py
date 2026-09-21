"""Billing service — orquestra Stripe + estado de assinatura da clínica."""
from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from src.core import stripe_client
from src.core.errors import ValidationError
from src.core.logging import get_logger
from src.modules.auth.models import User
from src.modules.billing.enums import SubscriptionStatus
from src.modules.billing.repository import BillingEventRepository, BillingRepository
from src.modules.billing.schemas import CheckoutIn
from src.modules.tenancy.models import Clinic
from src.modules.tenancy.service import TenancyService

log = get_logger(__name__)

# Stripe subscription.status → nosso SubscriptionStatus
_STRIPE_STATUS_MAP = {
    "active": SubscriptionStatus.ACTIVE,
    "trialing": SubscriptionStatus.ACTIVE,
    "past_due": SubscriptionStatus.PAST_DUE,
    "incomplete": SubscriptionStatus.PAST_DUE,
    "canceled": SubscriptionStatus.CANCELED,
    "unpaid": SubscriptionStatus.CANCELED,
    "incomplete_expired": SubscriptionStatus.CANCELED,
}

_HANDLED_EVENTS = (
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
)


def _to_dt(unix_ts: Any) -> datetime | None:
    if not unix_ts:
        return None
    return datetime.fromtimestamp(int(unix_ts), tz=timezone.utc)


def _as_plain_dict(event: Any) -> dict[str, Any]:
    """StripeObject → dict puro (JSONB não aceita StripeObject).

    ``StripeObject`` é subclasse de ``dict``, então o round-trip via json
    resolve os objetos aninhados sem usar API interna/deprecada do SDK.
    """
    return json.loads(json.dumps(event, default=str))


class BillingService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._tenancy = TenancyService(session)
        self._repo = BillingRepository(session)
        self._repo_events = BillingEventRepository(session)

    async def get_status(self, clinic_id: uuid.UUID) -> dict[str, Any]:
        clinic = await self._tenancy.get_clinic(clinic_id)
        is_active = await self._tenancy.is_subscription_active(clinic_id)
        return {
            "subscription_status": clinic.subscription_status,
            "plan": clinic.plan,
            "trial_ends_at": clinic.trial_ends_at,
            "current_period_end": clinic.current_period_end,
            "is_active": is_active,
            "is_trialing": (
                clinic.subscription_status == SubscriptionStatus.TRIALING
                and clinic.trial_ends_at is not None
                and clinic.trial_ends_at > datetime.now(timezone.utc)
            ),
        }

    async def create_checkout(
        self, clinic_id: uuid.UUID, actor: User, data: CheckoutIn
    ) -> tuple[str, str]:
        """Devolve (checkout_url, session_id). Cria o Customer na primeira vez."""
        clinic = await self._tenancy.get_clinic(clinic_id)
        price_id = stripe_client.get_price_id_for_plan(data.plan)
        email = str(data.customer_email) if data.customer_email else actor.email

        customer_id = clinic.stripe_customer_id
        if not customer_id:
            customer_id = await stripe_client.create_customer(
                clinic_id=clinic_id,
                email=email,
                name=clinic.trade_name,
            )
            await self._repo.set_stripe_customer(clinic_id, customer_id)

        return await stripe_client.create_checkout_session(
            customer_id=customer_id,
            price_id=price_id,
            clinic_id=clinic_id,
            customer_email=email,
        )

    async def create_portal(self, clinic_id: uuid.UUID, return_url: str) -> str:
        clinic = await self._tenancy.get_clinic(clinic_id)
        if not clinic.stripe_customer_id:
            raise ValidationError("Clinic has no Stripe customer yet — start a checkout first")
        return await stripe_client.create_portal_session(
            customer_id=clinic.stripe_customer_id,
            return_url=return_url,
        )

    # ── Webhook ──────────────────────────────────────────────

    async def process_webhook_event(self, event: Any) -> None:
        """Processa um evento JÁ VERIFICADO do Stripe, de forma idempotente.

        Duplicatas (retry do Stripe) são no-op. Falhas apenas logam e propagam:
        o `uow_scope` faz rollback do request inteiro (inclusive da linha em
        `billing_events`), o router devolve 500 e o Stripe retenta do zero.
        """
        payload = _as_plain_dict(event)
        stripe_event_id = str(payload.get("id"))
        event_type = str(payload.get("type"))

        record = await self._repo_events.try_insert_event(
            stripe_event_id=stripe_event_id,
            event_type=event_type,
            payload=payload,
        )
        if record is None:
            log.info("billing_webhook_duplicate", stripe_event_id=stripe_event_id)
            return

        if event_type not in _HANDLED_EVENTS:
            await self._handle_unknown(payload)
            await self._repo_events.mark_ignored(record.id)
            return

        handlers = {
            "checkout.session.completed": self._handle_checkout_completed,
            "customer.subscription.created": self._handle_subscription_created,
            "customer.subscription.updated": self._handle_subscription_updated,
            "customer.subscription.deleted": self._handle_subscription_deleted,
            "invoice.paid": self._handle_invoice_paid,
            "invoice.payment_failed": self._handle_invoice_payment_failed,
        }

        try:
            clinic_id = await handlers[event_type](payload)
        except Exception as exc:
            # Falha não é persistida de propósito: o uow_scope faz rollback do
            # request inteiro (inclusive deste billing_event), mantendo a
            # atomicidade — o retry do Stripe reprocessa do zero. O rastro da
            # falha fica no log estruturado.
            log.exception(
                "billing_webhook_processing_failed",
                stripe_event_id=stripe_event_id,
                event_type=event_type,
                error=str(exc),
                error_type=type(exc).__name__,
            )
            raise

        await self._repo_events.mark_processed(record.id, clinic_id)
        log.info(
            "billing_webhook_processed",
            stripe_event_id=stripe_event_id,
            event_type=event_type,
            clinic_id=str(clinic_id) if clinic_id else None,
        )

    # ── Handlers ─────────────────────────────────────────────

    async def _handle_checkout_completed(self, event: dict[str, Any]) -> uuid.UUID | None:
        session_obj = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(session_obj.get("customer"))
        if clinic is None:
            return None
        await self._repo.set_subscription(
            clinic.id,
            stripe_subscription_id=session_obj.get("subscription"),
        )
        return clinic.id

    async def _handle_subscription_created(self, event: dict[str, Any]) -> uuid.UUID | None:
        sub = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(sub.get("customer"))
        if clinic is None:
            return None
        await self._repo.set_subscription(
            clinic.id,
            stripe_subscription_id=sub.get("id"),
            status=_STRIPE_STATUS_MAP.get(sub.get("status", ""), SubscriptionStatus.ACTIVE),
            current_period_end=_to_dt(sub.get("current_period_end")),
        )
        return clinic.id

    async def _handle_subscription_updated(self, event: dict[str, Any]) -> uuid.UUID | None:
        sub = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(sub.get("customer"))
        if clinic is None:
            return None
        await self._repo.set_subscription(
            clinic.id,
            stripe_subscription_id=sub.get("id"),
            status=_STRIPE_STATUS_MAP.get(sub.get("status", "")),
            current_period_end=_to_dt(sub.get("current_period_end")),
        )
        return clinic.id

    async def _handle_subscription_deleted(self, event: dict[str, Any]) -> uuid.UUID | None:
        sub = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(sub.get("customer"))
        if clinic is None:
            return None
        # Mantém stripe_customer_id (reassinatura reaproveita o Customer).
        await self._repo.clear_subscription(clinic.id)
        return clinic.id

    async def _handle_invoice_paid(self, event: dict[str, Any]) -> uuid.UUID | None:
        invoice = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(invoice.get("customer"))
        if clinic is None:
            return None
        lines = (invoice.get("lines") or {}).get("data") or []
        period_end = (lines[0].get("period") or {}).get("end") if lines else None
        await self._repo.set_subscription(
            clinic.id,
            status=SubscriptionStatus.ACTIVE,
            current_period_end=_to_dt(period_end),
        )
        return clinic.id

    async def _handle_invoice_payment_failed(self, event: dict[str, Any]) -> uuid.UUID | None:
        invoice = event["data"]["object"]
        clinic = await self._find_clinic_by_customer(invoice.get("customer"))
        if clinic is None:
            return None
        await self._repo.set_subscription(clinic.id, status=SubscriptionStatus.PAST_DUE)
        return clinic.id

    async def _handle_unknown(self, event: dict[str, Any]) -> None:
        log.info("billing_webhook_ignored", event_type=event.get("type"))

    # ── helpers ──────────────────────────────────────────────

    async def _find_clinic_by_customer(self, customer_id: str | None) -> Clinic | None:
        if not customer_id:
            return None
        clinic = await self._repo.get_by_stripe_customer(customer_id)
        if clinic is None:
            log.warning("billing_webhook_unknown_customer", stripe_customer_id=customer_id)
        return clinic
