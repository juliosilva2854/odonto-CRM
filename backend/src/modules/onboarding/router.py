"""Onboarding routes — public signup (no auth)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session
from src.modules.auth.schemas import UserOut
from src.modules.onboarding.schemas import SignupIn, SignupOut
from src.modules.onboarding.service import OnboardingService
from src.modules.tenancy.schemas import ClinicOut

_settings = get_settings()
router = APIRouter(prefix="/api/public", tags=["public"])


@router.post(
    "/signup",
    response_model=SignupOut,
    status_code=status.HTTP_201_CREATED,
    summary="Cria clínica + admin + dados default e devolve tokens (trial de 14 dias)",
)
async def signup(
    payload: SignupIn,
    session: AsyncSession = Depends(get_db_session),
) -> SignupOut:
    clinic, user, access, refresh = await OnboardingService(session).signup(payload)
    return SignupOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=_settings.JWT_EXPIRES_MIN * 60,
        user=UserOut.model_validate(user),
        clinic=ClinicOut.model_validate(clinic),
        trial_ends_at=clinic.trial_ends_at,  # type: ignore[arg-type]  # always set at signup
    )
