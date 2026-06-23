"""Clinical record routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.clinical.records.models import (
    ClinicalRecord,
    ClinicalRecordAddendum,
)
from src.modules.clinical.records.schemas import (
    ClinicalRecordAddendumCreateIn,
    ClinicalRecordAddendumOut,
    ClinicalRecordCreateIn,
    ClinicalRecordOut,
    ClinicalRecordUpdateIn,
)
from src.modules.clinical.records.service import ClinicalRecordService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/clinical", tags=["clinical-records"])


def _to_out(record: ClinicalRecord, meta: dict) -> ClinicalRecordOut:
    out = ClinicalRecordOut.model_validate(record)
    out.is_locked = bool(meta.get("is_locked", False))
    out.locks_at = meta.get("locks_at")
    return out


# ── CRUD ──────────────────────────────────────────────────────


@router.post(
    "/patients/{patient_id}/records",
    response_model=ClinicalRecordOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("clinical_records"))],
    summary="Cria entrada no prontuário (evolução clínica)",
)
async def create_record(
    patient_id: uuid.UUID,
    payload: ClinicalRecordCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ClinicalRecordOut:
    record, meta = await ClinicalRecordService(session).create(
        user.clinic_id, patient_id, user, payload
    )
    return _to_out(record, meta)


@router.get(
    "/patients/{patient_id}/records",
    response_model=Page[ClinicalRecordOut],
    dependencies=[Depends(require_feature("clinical_records"))],
    summary="Lista entradas do prontuário de um paciente (paginado)",
)
async def list_records(
    patient_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> Page[ClinicalRecordOut]:
    items, total, meta_global = await ClinicalRecordService(session).list_by_patient(
        user.clinic_id, patient_id, page=page, page_size=page_size
    )
    # Build per-record lock metadata (same lock_hours for all in this clinic)
    lock_hours = meta_global["lock_hours"]
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    out_items: list[ClinicalRecordOut] = []
    for record in items:
        locks_at = record.created_at + timedelta(hours=lock_hours)
        is_locked = record.locked_at is not None or now >= locks_at
        out_items.append(
            _to_out(record, {"is_locked": is_locked, "locks_at": locks_at})
        )
    return Page[ClinicalRecordOut](
        items=out_items,
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/records/{record_id}",
    response_model=ClinicalRecordOut,
    dependencies=[Depends(require_feature("clinical_records"))],
)
async def get_record(
    record_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ClinicalRecordOut:
    record, meta = await ClinicalRecordService(session).get(user.clinic_id, record_id)
    return _to_out(record, meta)


@router.put(
    "/records/{record_id}",
    response_model=ClinicalRecordOut,
    dependencies=[Depends(require_feature("clinical_records"))],
    summary="Edita prontuário (bloqueado após lock_hours — usar adendos)",
)
async def update_record(
    record_id: uuid.UUID,
    payload: ClinicalRecordUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ClinicalRecordOut:
    record, meta = await ClinicalRecordService(session).update(
        user.clinic_id, record_id, user, payload
    )
    return _to_out(record, meta)


# ── Addendums (append-only) ───────────────────────────────────


@router.post(
    "/records/{record_id}/addendums",
    response_model=ClinicalRecordAddendumOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("clinical_records"))],
    summary="Adiciona adendo (append-only) a um prontuário",
)
async def add_addendum(
    record_id: uuid.UUID,
    payload: ClinicalRecordAddendumCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> ClinicalRecordAddendumOut:
    addendum: ClinicalRecordAddendum = await ClinicalRecordService(session).add_addendum(
        user.clinic_id, record_id, user, payload
    )
    return ClinicalRecordAddendumOut.model_validate(addendum)


@router.get(
    "/records/{record_id}/addendums",
    response_model=list[ClinicalRecordAddendumOut],
    dependencies=[Depends(require_feature("clinical_records"))],
)
async def list_addendums(
    record_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST])),
) -> list[ClinicalRecordAddendumOut]:
    items = await ClinicalRecordService(session).list_addendums(user.clinic_id, record_id)
    return [ClinicalRecordAddendumOut.model_validate(a) for a in items]
