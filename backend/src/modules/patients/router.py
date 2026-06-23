"""Patient routes — CRUD + LGPD anonymize + consents."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import get_context
from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import get_current_user, require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.patients.schemas import (
    AnonymizeIn,
    ConsentCreateIn,
    ConsentCurrentStateOut,
    ConsentOut,
    PatientCreateIn,
    PatientOut,
    PatientSummary,
    PatientUpdateIn,
)
from src.modules.patients.service import PatientService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/patients", tags=["patients"])


@router.post(
    "",
    response_model=PatientOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("patients"))],
    summary="Cadastrar novo paciente",
)
async def create_patient(
    payload: PatientCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> PatientOut:
    patient = await PatientService(session).create(user.clinic_id, user.id, payload)
    return PatientOut.model_validate(patient)


@router.get(
    "",
    response_model=Page[PatientSummary],
    dependencies=[Depends(require_feature("patients"))],
    summary="Listar pacientes (paginado, busca por nome/cpf/telefone/email)",
)
async def list_patients(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: str | None = Query(None, min_length=1, max_length=100),
    include_anonymized: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> Page[PatientSummary]:
    items, total = await PatientService(session).list(
        user.clinic_id,
        page=page,
        page_size=page_size,
        search=search,
        include_anonymized=include_anonymized,
    )
    return Page[PatientSummary](
        items=[PatientSummary.model_validate(p) for p in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/{patient_id}",
    response_model=PatientOut,
    dependencies=[Depends(require_feature("patients"))],
    summary="Detalhe do paciente (registra DataAccessLog — LGPD)",
)
async def get_patient(
    patient_id: uuid.UUID,
    purpose: str = Query("consultation", max_length=60),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> PatientOut:
    ctx = get_context()
    patient = await PatientService(session).get(
        user.clinic_id,
        patient_id,
        actor_user_id=user.id,
        purpose=purpose,
        ip=ctx.ip,
    )
    return PatientOut.model_validate(patient)


@router.put(
    "/{patient_id}",
    response_model=PatientOut,
    dependencies=[Depends(require_feature("patients"))],
    summary="Atualização parcial",
)
async def update_patient(
    patient_id: uuid.UUID,
    payload: PatientUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> PatientOut:
    patient = await PatientService(session).update(user.clinic_id, patient_id, user.id, payload)
    return PatientOut.model_validate(patient)


@router.delete(
    "/{patient_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    dependencies=[Depends(require_feature("patients"))],
    summary="Soft delete (paciente fica oculto, dados preservados)",
)
async def delete_patient(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    ctx = get_context()
    await PatientService(session).soft_delete(ctx.clinic_id, patient_id)  # type: ignore[arg-type]


@router.post(
    "/{patient_id}/anonymize",
    response_model=PatientOut,
    dependencies=[Depends(require_feature("patients"))],
    summary="LGPD — Direito ao Esquecimento (admin, irreversível)",
)
async def anonymize_patient(
    patient_id: uuid.UUID,
    payload: AnonymizeIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> PatientOut:
    patient = await PatientService(session).anonymize(
        user.clinic_id, patient_id, user.id, payload.reason
    )
    return PatientOut.model_validate(patient)


# ── Consents ────────────────────────────────────────────────


@router.post(
    "/{patient_id}/consents",
    response_model=ConsentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("patients"))],
    summary="Registrar grant/revoke de consentimento (LGPD versionado)",
)
async def record_consent(
    patient_id: uuid.UUID,
    payload: ConsentCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> ConsentOut:
    ctx = get_context()
    consent = await PatientService(session).record_consent(
        user.clinic_id, patient_id, user.id, payload, ip=ctx.ip
    )
    return ConsentOut.model_validate(consent)


@router.get(
    "/{patient_id}/consents",
    response_model=list[ConsentOut],
    dependencies=[Depends(require_feature("patients"))],
    summary="Histórico completo de consentimentos (auditoria LGPD)",
)
async def list_consents(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _user: User = Depends(get_current_user),
) -> list[ConsentOut]:
    consents = await PatientService(session).list_consents(patient_id)
    return [ConsentOut.model_validate(c) for c in consents]


@router.get(
    "/{patient_id}/consents/current",
    response_model=list[ConsentCurrentStateOut],
    dependencies=[Depends(require_feature("patients"))],
    summary="Estado atual de consentimento por escopo",
)
async def current_consent_state(
    patient_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    _user: User = Depends(get_current_user),
) -> list[ConsentCurrentStateOut]:
    consents = await PatientService(session).current_consent_state(patient_id)
    return [
        ConsentCurrentStateOut(
            scope=c.scope,
            granted=c.granted,
            document_version=c.document_version,
            last_changed_at=c.created_at,
        )
        for c in consents
    ]
