"""Odontogram repositories — append-only event log + projection access."""
from __future__ import annotations

import uuid

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.clinical.odontogram.models import OdontogramEvent, ToothProcedure


class OdontogramEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, event: OdontogramEvent) -> None:
        self._session.add(event)

    async def list_by_patient(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
    ) -> tuple[list[OdontogramEvent], int]:
        from sqlalchemy import func

        base = [
            OdontogramEvent.clinic_id == clinic_id,
            OdontogramEvent.patient_id == patient_id,
        ]
        total = (
            await self._session.execute(
                select(func.count(OdontogramEvent.id)).where(*base)
            )
        ).scalar_one()

        stmt = (
            select(OdontogramEvent)
            .where(*base)
            .order_by(desc(OdontogramEvent.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self._session.execute(stmt)).scalars())
        return items, total


class ToothProcedureRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, tp: ToothProcedure) -> None:
        self._session.add(tp)

    async def get(
        self, clinic_id: uuid.UUID, tp_id: uuid.UUID
    ) -> ToothProcedure | None:
        stmt = select(ToothProcedure).where(
            ToothProcedure.id == tp_id,
            ToothProcedure.clinic_id == clinic_id,
            ToothProcedure.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_active_by_patient(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> list[ToothProcedure]:
        stmt = (
            select(ToothProcedure)
            .where(
                ToothProcedure.clinic_id == clinic_id,
                ToothProcedure.patient_id == patient_id,
                ToothProcedure.deleted_at.is_(None),
            )
            .order_by(ToothProcedure.tooth_fdi.asc().nullsfirst(), ToothProcedure.created_at.asc())
        )
        return list((await self._session.execute(stmt)).scalars())
