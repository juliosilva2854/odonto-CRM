"""Odontogram routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.clinical.odontogram.schemas import (
    AddProcedureIn,
    NoteIn,
    OdontogramEventOut,
    OdontogramSnapshotOut,
    RemoveProcedureIn,
    StatusChangeIn,
    ToothProcedureOut,
)
from src.modules.clinical.odontogram.service import OdontogramService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/clinical", tags=["clinical-odontogram"])


# ── Snapshot (projection) ─────────────────────────────────────


@router.get(
    "/patients/{patient_id}/odontogram",
    response_model=OdontogramSnapshotOut,
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Estado atual (materializado) do odontograma do paciente",
)
async def get_odontogram(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> OdontogramSnapshotOut:
    procedures = await OdontogramService(session).snapshot(user.clinic_id, patient_id)
    return OdontogramSnapshotOut(
        patient_id=patient_id,
        procedures=[ToothProcedureOut.model_validate(p) for p in procedures],
    )


# ── Event log ─────────────────────────────────────────────────


@router.get(
    "/patients/{patient_id}/odontogram/events",
    response_model=Page[OdontogramEventOut],
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Histórico (append-only) de eventos do odontograma",
)
async def list_odontogram_events(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> Page[OdontogramEventOut]:
    items, total = await OdontogramService(session).list_events(
        user.clinic_id, patient_id, page=page, page_size=page_size
    )
    return Page[OdontogramEventOut](
        items=[OdontogramEventOut.model_validate(e) for e in items],
        page=page,
        page_size=page_size,
        total=total,
    )


# ── Commands ──────────────────────────────────────────────────


@router.post(
    "/patients/{patient_id}/odontogram/procedures",
    response_model=ToothProcedureOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Planeja um procedimento no odontograma (dente/face)",
)
async def add_procedure(
    patient_id: uuid.UUID,
    payload: AddProcedureIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ToothProcedureOut:
    tp, _event = await OdontogramService(session).add_procedure(
        user.clinic_id, patient_id, user.id, payload
    )
    return ToothProcedureOut.model_validate(tp)


@router.post(
    "/odontogram/procedures/{tp_id}/status",
    response_model=ToothProcedureOut,
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Muda o status de um procedimento do odontograma (state machine valida)",
)
async def change_procedure_status(
    tp_id: uuid.UUID,
    payload: StatusChangeIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ToothProcedureOut:
    tp, _event = await OdontogramService(session).change_status(
        user.clinic_id, tp_id, user.id, payload.new_status, reason=payload.reason
    )
    return ToothProcedureOut.model_validate(tp)


@router.delete(
    "/odontogram/procedures/{tp_id}",
    response_model=ToothProcedureOut,
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Remove (cancela) um procedimento planejado",
)
async def remove_procedure(
    tp_id: uuid.UUID,
    payload: RemoveProcedureIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ToothProcedureOut:
    tp, _event = await OdontogramService(session).remove_procedure(
        user.clinic_id, tp_id, user.id, payload
    )
    return ToothProcedureOut.model_validate(tp)


@router.post(
    "/patients/{patient_id}/odontogram/notes",
    response_model=OdontogramEventOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("odontogram"))],
    summary="Registra uma anotação livre no histórico do odontograma",
)
async def add_note(
    patient_id: uuid.UUID,
    payload: NoteIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> OdontogramEventOut:
    event = await OdontogramService(session).add_note(
        user.clinic_id, patient_id, user.id, payload
    )
    return OdontogramEventOut.model_validate(event)
