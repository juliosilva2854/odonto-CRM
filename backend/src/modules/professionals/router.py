"""Professionals routes — lista dentistas da clínica (para agenda/dropdowns)."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.professionals.schemas import ProfessionalOut
from src.modules.professionals.service import ProfessionalsService

router = APIRouter(prefix="/api/professionals", tags=["professionals"])


@router.get(
    "",
    response_model=list[ProfessionalOut],
    summary="Lista os dentistas (Professional) ativos da clínica",
)
async def list_professionals(
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(
        require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])
    ),
) -> list[ProfessionalOut]:
    return await ProfessionalsService(session).list(user.clinic_id)
