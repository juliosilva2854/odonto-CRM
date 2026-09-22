"""Auth routes — login, refresh, me."""
from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.database import get_db_session
from src.core.feature_flags.service import FeatureFlagService
from src.modules.auth.dependencies import get_current_user
from src.modules.auth.models import User
from src.modules.auth.schemas import (
    ForgotPasswordIn,
    LoginIn,
    MeOut,
    RefreshIn,
    ResetPasswordIn,
    TokenOut,
    UserOut,
)
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


@router.post(
    "/forgot-password",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Solicita reset de senha (sempre 202 — anti-enumeration)",
)
async def forgot_password(
    payload: ForgotPasswordIn,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    await AuthService(session).request_password_reset(payload.email)
    # Resposta idêntica exista ou não o e-mail: não vaza quem tem conta.
    return {"message": "If the email exists, a reset link has been sent."}


@router.post(
    "/reset-password",
    status_code=status.HTTP_200_OK,
    summary="Redefine a senha a partir de um token válido (uso único)",
)
async def reset_password(
    payload: ResetPasswordIn,
    session: AsyncSession = Depends(get_db_session),
) -> dict[str, str]:
    await AuthService(session).reset_password(payload.token, payload.new_password)
    return {"message": "Password updated successfully."}


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
