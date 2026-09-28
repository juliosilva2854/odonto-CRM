"""Anamnesis service — criação (append-only), última versão e histórico."""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError
from src.modules.patients.anamnesis.models import AnamnesisRecord
from src.modules.patients.anamnesis.repository import AnamnesisRepository
from src.modules.patients.anamnesis.schemas import AnamnesisCreateIn
from src.modules.patients.models import Patient


class AnamnesisService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AnamnesisRepository(session)

    async def _ensure_patient(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> Patient:
        patient = await self._session.get(Patient, patient_id)
        if (
            patient is None
            or patient.clinic_id != clinic_id
            or patient.deleted_at is not None
        ):
            raise NotFoundError("Paciente n\u00e3o encontrado")
        return patient

    async def get_latest(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> AnamnesisRecord:
        await self._ensure_patient(clinic_id, patient_id)
        record = await self._repo.get_latest(clinic_id, patient_id)
        if record is None:
            raise NotFoundError("Nenhuma anamnese registrada para este paciente")
        return record

    async def history(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> list[AnamnesisRecord]:
        await self._ensure_patient(clinic_id, patient_id)
        return await self._repo.list_by_patient(clinic_id, patient_id)

    async def create(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: AnamnesisCreateIn,
    ) -> AnamnesisRecord:
        await self._ensure_patient(clinic_id, patient_id)
        record = AnamnesisRecord(
            clinic_id=clinic_id,
            patient_id=patient_id,
            questionnaire=data.questionnaire,
            notes=data.notes,
            answered_by_user_id=actor_user_id,
        )
        self._repo.add(record)
        await self._session.flush()
        return record
