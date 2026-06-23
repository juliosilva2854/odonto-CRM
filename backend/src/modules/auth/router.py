"""Auth routes — login, refresh, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session
from src.core.feature_flags.service import FeatureFlagService
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.models import User
from src.modules.auth.schemas import LoginIn, MeOut, RefreshIn, TokenOut, UserOut
from src.modules.auth.service import AuthService
from src.modules.tenancy.schemas import ClinicOut
from src.modules.tenancy.service import TenancyService

_settings = get_settings()
router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut, status_code=status.HTTP_200_OK)
async def login(
    payload: LoginIn,
    session: AsyncSession = Depends(get_db_session),
) -> TokenOut:
    _, access, refresh = await AuthService(session).login(payload.email, payload.password)
    return TokenOut(
        access_token=access,
        refresh_token=refresh,
        expires_in=_settings.JWT_EXPIRES_MIN * 60,
    )


@router.post("/refresh", response_model=TokenOut, status_code=status.HTTP_200_OK)
async def refresh(
    payload: RefreshIn,
    session: AsyncSession = Depends(get_db_session),
) -> TokenOut:
    _, access, new_refresh = await AuthService(session).refresh(payload.refresh_token)
    return TokenOut(
        access_token=access,
        refresh_token=new_refresh,
        expires_in=_settings.JWT_EXPIRES_MIN * 60,
    )


@router.get("/me", response_model=MeOut, status_code=status.HTTP_200_OK)
async def me(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db_session),
) -> MeOut:
    """Devolve user + clinic + features ativos. Frontend usa para gating de menus."""
    clinic = await TenancyService(session).get_clinic(user.clinic_id)
    features = await FeatureFlagService(session).get_all(user.clinic_id)
    return MeOut(
        user=UserOut.model_validate(user),
        clinic=ClinicOut.model_validate(clinic).model_dump(mode="json"),
        features=features,
    )
