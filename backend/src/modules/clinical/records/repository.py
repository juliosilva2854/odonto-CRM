"""Clinical record repositories."""
from __future__ import annotations

import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.clinical.records.models import (
    ClinicalRecord,
    ClinicalRecordAddendum,
)


class ClinicalRecordRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, record: ClinicalRecord) -> None:
        self._session.add(record)

    async def get(
        self, clinic_id: uuid.UUID, record_id: uuid.UUID
    ) -> ClinicalRecord | None:
        stmt = select(ClinicalRecord).where(
            ClinicalRecord.id == record_id,
            ClinicalRecord.clinic_id == clinic_id,
            ClinicalRecord.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_by_patient(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
    ) -> tuple[list[ClinicalRecord], int]:
        base = [
            ClinicalRecord.clinic_id == clinic_id,
            ClinicalRecord.patient_id == patient_id,
            ClinicalRecord.deleted_at.is_(None),
        ]
        total = (
            await self._session.execute(select(func.count(ClinicalRecord.id)).where(*base))
        ).scalar_one()
        stmt = (
            select(ClinicalRecord)
            .where(*base)
            .order_by(desc(ClinicalRecord.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self._session.execute(stmt)).scalars())
        return items, total


class ClinicalRecordAddendumRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, addendum: ClinicalRecordAddendum) -> None:
        self._session.add(addendum)

    async def list_by_record(
        self, record_id: uuid.UUID
    ) -> list[ClinicalRecordAddendum]:
        stmt = (
            select(ClinicalRecordAddendum)
            .where(ClinicalRecordAddendum.record_id == record_id)
            .order_by(ClinicalRecordAddendum.created_at.asc())
        )
        return list((await self._session.execute(stmt)).scalars())
