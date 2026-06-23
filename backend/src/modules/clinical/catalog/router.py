"""Catalog routes — specialties + procedures."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.clinical.catalog.enums import ProcedureCategory
from src.modules.clinical.catalog.schemas import (
    ProcedureCreateIn,
    ProcedureOut,
    ProcedureUpdateIn,
    SpecialtyCreateIn,
    SpecialtyOut,
    SpecialtyUpdateIn,
)
from src.modules.clinical.catalog.service import ProcedureService, SpecialtyService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api", tags=["clinical-catalog"])


# ── Specialties ────────────────────────────────────────


@router.post("/specialties", response_model=SpecialtyOut, status_code=status.HTTP_201_CREATED)
async def create_specialty(
    payload: SpecialtyCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> SpecialtyOut:
    specialty = await SpecialtyService(session).create(user.clinic_id, payload)
    return SpecialtyOut.model_validate(specialty)


@router.get("/specialties", response_model=list[SpecialtyOut])
async def list_specialties(
    include_inactive: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> list[SpecialtyOut]:
    items = await SpecialtyService(session).list(user.clinic_id, include_inactive=include_inactive)
    return [SpecialtyOut.model_validate(s) for s in items]


@router.get("/specialties/{specialty_id}", response_model=SpecialtyOut)
async def get_specialty(
    specialty_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> SpecialtyOut:
    specialty = await SpecialtyService(session).get(user.clinic_id, specialty_id)
    return SpecialtyOut.model_validate(specialty)


@router.put("/specialties/{specialty_id}", response_model=SpecialtyOut)
async def update_specialty(
    specialty_id: uuid.UUID,
    payload: SpecialtyUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> SpecialtyOut:
    specialty = await SpecialtyService(session).update(user.clinic_id, specialty_id, payload)
    return SpecialtyOut.model_validate(specialty)


# ── Procedures ─────────────────────────────────────────


@router.post("/procedures", response_model=ProcedureOut, status_code=status.HTTP_201_CREATED)
async def create_procedure(
    payload: ProcedureCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> ProcedureOut:
    procedure = await ProcedureService(session).create(user.clinic_id, payload)
    return ProcedureOut.model_validate(procedure)


@router.get("/procedures", response_model=Page[ProcedureOut])
async def list_procedures(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    category: ProcedureCategory | None = Query(None),
    specialty_id: uuid.UUID | None = Query(None),
    include_inactive: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> Page[ProcedureOut]:
    items, total = await ProcedureService(session).list(
        user.clinic_id,
        page=page,
        page_size=page_size,
        search=search,
        category=category,
        specialty_id=specialty_id,
        include_inactive=include_inactive,
    )
    return Page[ProcedureOut](
        items=[ProcedureOut.model_validate(p) for p in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get("/procedures/{procedure_id}", response_model=ProcedureOut)
async def get_procedure(
    procedure_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> ProcedureOut:
    procedure = await ProcedureService(session).get(user.clinic_id, procedure_id)
    return ProcedureOut.model_validate(procedure)


@router.put("/procedures/{procedure_id}", response_model=ProcedureOut)
async def update_procedure(
    procedure_id: uuid.UUID,
    payload: ProcedureUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> ProcedureOut:
    procedure = await ProcedureService(session).update(user.clinic_id, procedure_id, payload)
    return ProcedureOut.model_validate(procedure)


@router.delete(
    "/procedures/{procedure_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
)
async def deactivate_procedure(
    procedure_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    await ProcedureService(session).deactivate(user.clinic_id, procedure_id)
