"""Billing routes — endpoints de admin + webhook público do Stripe."""
from __future__ import annotations

import stripe
from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session
from src.core.errors import AppException, ValidationError
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.billing.schemas import BillingStatusOut, CheckoutIn, CheckoutOut, PortalOut
from src.modules.billing.service import BillingService

_settings = get_settings()
router = APIRouter(prefix="/api/billing", tags=["billing"])


@router.get(
    "/status",
    response_model=BillingStatusOut,
    summary="Estado da assinatura da clínica corrente",
)
async def get_status(
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> BillingStatusOut:
    data = await BillingService(session).get_status(user.clinic_id)
    return BillingStatusOut.model_validate(data)


@router.post(
    "/checkout",
    response_model=CheckoutOut,
    status_code=status.HTTP_200_OK,
    summary="Cria uma Checkout Session do Stripe para o plano escolhido",
)
async def create_checkout(
    payload: CheckoutIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> CheckoutOut:
    url, session_id = await BillingService(session).create_checkout(
        user.clinic_id, user, payload
    )
    return CheckoutOut(checkout_url=url, session_id=session_id)


@router.post(
    "/portal",
    response_model=PortalOut,
    status_code=status.HTTP_200_OK,
    summary="Cria uma sessão do Customer Portal do Stripe",
)
async def create_portal(
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> PortalOut:
    url = await BillingService(session).create_portal(
        user.clinic_id, return_url=_settings.STRIPE_PORTAL_RETURN_URL
    )
    return PortalOut(portal_url=url)


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    summary="Webhook do Stripe (público — autenticado pela assinatura HMAC)",
)
async def stripe_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, bool]:
    settings = get_settings()

    if not settings.STRIPE_WEBHOOK_SECRET:
        raise AppException(
            "Webhook not configured",
            code="webhook_not_configured",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature")
    if not sig_header:
        raise ValidationError(
            "Missing Stripe-Signature header",
            code="invalid_signature",
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except stripe.SignatureVerificationError as exc:
        # 400 de propósito: assinatura inválida nunca deve ser retentada.
        raise ValidationError(
            "Invalid signature",
            code="invalid_signature",
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from exc
    except ValueError as exc:
        raise ValidationError(
            "Invalid payload",
            code="invalid_payload",
            status_code=status.HTTP_400_BAD_REQUEST,
        ) from exc

    # Falha de processamento propaga → 500 → Stripe retenta (desejado).
    await BillingService(session).process_webhook_event(event)

    return {"received": True}
