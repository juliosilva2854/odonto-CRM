"""Anamnesis routes — aninhadas em /api/patients/{id}/anamnesis."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.patients.anamnesis.schemas import AnamnesisCreateIn, AnamnesisOut
from src.modules.patients.anamnesis.service import AnamnesisService

router = APIRouter(prefix="/api/patients", tags=["anamnesis"])

_ROLES = [UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION]


@router.get(
    "/{patient_id}/anamnesis",
    response_model=AnamnesisOut,
    dependencies=[Depends(require_feature("anamnesis"))],
    summary="\u00daltima vers\u00e3o da anamnese (404 se nunca respondeu)",
)
async def get_anamnesis(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> AnamnesisOut:
    record = await AnamnesisService(session).get_latest(user.clinic_id, patient_id)
    return AnamnesisOut.model_validate(record)


@router.post(
    "/{patient_id}/anamnesis",
    response_model=AnamnesisOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("anamnesis"))],
    summary="Cria uma nova vers\u00e3o da anamnese (append-only)",
)
async def create_anamnesis(
    patient_id: uuid.UUID,
    payload: AnamnesisCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> AnamnesisOut:
    record = await AnamnesisService(session).create(
        user.clinic_id, patient_id, user.id, payload
    )
    return AnamnesisOut.model_validate(record)


@router.get(
    "/{patient_id}/anamnesis/history",
    response_model=list[AnamnesisOut],
    dependencies=[Depends(require_feature("anamnesis"))],
    summary="Hist\u00f3rico completo de anamneses (todas as vers\u00f5es)",
)
async def anamnesis_history(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> list[AnamnesisOut]:
    records = await AnamnesisService(session).history(user.clinic_id, patient_id)
    return [AnamnesisOut.model_validate(r) for r in records]
