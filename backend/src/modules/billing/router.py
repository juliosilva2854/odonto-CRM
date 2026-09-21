"""Billing routes — somente admin da clínica."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session
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
        user.clinic_id, return_url=_settings.STRIPE_SUCCESS_URL
    )
    return PortalOut(portal_url=url)
