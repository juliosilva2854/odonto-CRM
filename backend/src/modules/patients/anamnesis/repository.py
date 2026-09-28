"""Anamnesis repository — sempre no escopo da clínica + paciente."""
from __future__ import annotations

import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.patients.anamnesis.models import AnamnesisRecord


class AnamnesisRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, record: AnamnesisRecord) -> None:
        self._session.add(record)

    async def get_latest(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> AnamnesisRecord | None:
        stmt = (
            select(AnamnesisRecord)
            .where(
                AnamnesisRecord.clinic_id == clinic_id,
                AnamnesisRecord.patient_id == patient_id,
                AnamnesisRecord.deleted_at.is_(None),
            )
            .order_by(desc(AnamnesisRecord.created_at))
            .limit(1)
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_by_patient(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> list[AnamnesisRecord]:
        stmt = (
            select(AnamnesisRecord)
            .where(
                AnamnesisRecord.clinic_id == clinic_id,
                AnamnesisRecord.patient_id == patient_id,
                AnamnesisRecord.deleted_at.is_(None),
            )
            .order_by(desc(AnamnesisRecord.created_at))
        )
        return list((await self._session.execute(stmt)).scalars())
