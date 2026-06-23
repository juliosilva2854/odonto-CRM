"""Tenancy routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import get_context
from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.tenancy.schemas import ClinicOut, FeatureOut, FeatureUpdateIn
from src.modules.tenancy.service import TenancyService

router = APIRouter(prefix="/api", tags=["tenancy"])


@router.get(
    "/clinics/me",
    response_model=ClinicOut,
    summary="Clínica corrente (do usuário autenticado)",
)
async def get_my_clinic(
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> ClinicOut:
    ctx = get_context()
    clinic = await TenancyService(session).get_clinic(ctx.clinic_id)  # type: ignore[arg-type]
    return ClinicOut.model_validate(clinic)


@router.get(
    "/clinic-features",
    response_model=list[FeatureOut],
    summary="Lista feature flags da clínica corrente",
)
async def list_features(
    session: AsyncSession = Depends(get_db_session),
    _user=Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> list[FeatureOut]:
    ctx = get_context()
    features = await TenancyService(session).list_features(ctx.clinic_id)  # type: ignore[arg-type]
    return [FeatureOut.model_validate(f) for f in features]


@router.put(
    "/clinic-features/{feature_key}",
    response_model=FeatureOut,
    status_code=status.HTTP_200_OK,
    summary="Liga/desliga uma feature (somente admin)",
)
async def upsert_feature(
    feature_key: str,
    payload: FeatureUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    _admin=Depends(require_role([UserRole.ADMIN])),
) -> FeatureOut:
    ctx = get_context()
    feature = await TenancyService(session).set_feature(
        ctx.clinic_id,  # type: ignore[arg-type]
        feature_key,
        enabled=payload.enabled,
        config=payload.config,
    )
    return FeatureOut.model_validate(feature)
