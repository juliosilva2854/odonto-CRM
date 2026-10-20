"""Super Admin routes — platform-level, cross-tenant (prefix /api/admin)."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_super_admin
from src.modules.auth.models import User
from src.modules.superadmin.schemas import (
    BillingEventOut,
    ClinicDetailOut,
    ClinicSummaryOut,
    CustomPricingIn,
    ExtendTrialIn,
    ImpersonateOut,
    SuperAdminMetricsOut,
)
from src.modules.superadmin.service import SuperAdminService
from src.modules.tenancy.models import SubscriptionStatus
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/admin", tags=["super-admin"])


@router.get("/metrics", response_model=SuperAdminMetricsOut)
async def get_metrics(
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> SuperAdminMetricsOut:
    data = await SuperAdminService(session).get_metrics()
    return SuperAdminMetricsOut.model_validate(data)


@router.get("/clinics", response_model=Page[ClinicSummaryOut])
async def list_clinics(
    search: str | None = Query(None),
    subscription_status: SubscriptionStatus | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> Page[ClinicSummaryOut]:
    items, total = await SuperAdminService(session).list_clinics(
        search=search, status=subscription_status, page=page, page_size=page_size
    )
    return Page[ClinicSummaryOut](
        items=[ClinicSummaryOut.model_validate(i) for i in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/clinics/{clinic_id}", response_model=ClinicDetailOut)
async def get_clinic_detail(
    clinic_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> ClinicDetailOut:
    data = await SuperAdminService(session).get_clinic_detail(clinic_id)
    return ClinicDetailOut.model_validate(data)


@router.get(
    "/clinics/{clinic_id}/billing-events",
    response_model=list[BillingEventOut],
)
async def list_billing_events(
    clinic_id: uuid.UUID,
    limit: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> list[BillingEventOut]:
    rows = await SuperAdminService(session).list_billing_events(clinic_id, limit=limit)
    return [BillingEventOut.model_validate(r) for r in rows]


@router.post(
    "/clinics/{clinic_id}/impersonate",
    response_model=ImpersonateOut,
    status_code=status.HTTP_200_OK,
    summary="Gera um token de acesso para operar como admin da clínica",
)
async def impersonate(
    clinic_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    actor: User = Depends(require_super_admin),
) -> ImpersonateOut:
    data = await SuperAdminService(session).impersonate(clinic_id, actor.id)
    return ImpersonateOut.model_validate(data)


@router.post("/clinics/{clinic_id}/extend-trial", response_model=ClinicSummaryOut)
async def extend_trial(
    clinic_id: uuid.UUID,
    payload: ExtendTrialIn,
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> ClinicSummaryOut:
    data = await SuperAdminService(session).extend_trial(clinic_id, payload.days)
    return ClinicSummaryOut.model_validate(data)


@router.post("/clinics/{clinic_id}/suspend", response_model=ClinicSummaryOut)
async def suspend(
    clinic_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> ClinicSummaryOut:
    data = await SuperAdminService(session).suspend(clinic_id)
    return ClinicSummaryOut.model_validate(data)


@router.post("/clinics/{clinic_id}/reactivate", response_model=ClinicSummaryOut)
async def reactivate(
    clinic_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> ClinicSummaryOut:
    data = await SuperAdminService(session).reactivate(clinic_id)
    return ClinicSummaryOut.model_validate(data)


@router.put("/clinics/{clinic_id}/custom-pricing", response_model=ClinicDetailOut)
async def set_custom_pricing(
    clinic_id: uuid.UUID,
    payload: CustomPricingIn,
    session: AsyncSession = Depends(get_db_session),
    _: User = Depends(require_super_admin),
) -> ClinicDetailOut:
    data = await SuperAdminService(session).set_custom_pricing(
        clinic_id,
        custom_price_amount=payload.custom_price_amount,
        stripe_coupon_id=payload.stripe_coupon_id,
    )
    return ClinicDetailOut.model_validate(data)
