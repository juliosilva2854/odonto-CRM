"""Professionals routes — lista/edita dentistas da cl\u00ednica."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.professionals.schemas import ProfessionalOut, ProfessionalUpdateIn
from src.modules.professionals.service import ProfessionalsService

router = APIRouter(prefix="/api/professionals", tags=["professionals"])


@router.get(
    "",
    response_model=list[ProfessionalOut],
    summary="Lista todos os dentistas da cl\u00ednica (inclui convites pendentes)",
)
async def list_professionals(
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(
        require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])
    ),
) -> list[ProfessionalOut]:
    return await ProfessionalsService(session).list(user.clinic_id)


@router.put(
    "/{professional_id}",
    response_model=ProfessionalOut,
    summary="Edita os dados profissionais de um dentista (admin da pr\u00f3pria cl\u00ednica)",
)
async def update_professional(
    professional_id: uuid.UUID,
    payload: ProfessionalUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> ProfessionalOut:
    return await ProfessionalsService(session).update(
        user.clinic_id, professional_id, payload
    )
