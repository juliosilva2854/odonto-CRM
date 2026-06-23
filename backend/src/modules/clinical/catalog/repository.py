"""Catalog repositories."""
from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.clinical.catalog.enums import ProcedureCategory
from src.modules.clinical.catalog.models import Procedure, Specialty


class SpecialtyRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, clinic_id: uuid.UUID, specialty_id: uuid.UUID) -> Specialty | None:
        stmt = select(Specialty).where(
            Specialty.id == specialty_id,
            Specialty.clinic_id == clinic_id,
            Specialty.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_name(self, clinic_id: uuid.UUID, name: str) -> Specialty | None:
        stmt = select(Specialty).where(
            Specialty.clinic_id == clinic_id,
            Specialty.name == name,
            Specialty.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list(self, clinic_id: uuid.UUID, *, include_inactive: bool = False) -> list[Specialty]:
        stmt = select(Specialty).where(
            Specialty.clinic_id == clinic_id, Specialty.deleted_at.is_(None)
        )
        if not include_inactive:
            stmt = stmt.where(Specialty.is_active.is_(True))
        stmt = stmt.order_by(Specialty.name.asc())
        return list((await self._session.execute(stmt)).scalars())

    def add(self, specialty: Specialty) -> None:
        self._session.add(specialty)


class ProcedureRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, clinic_id: uuid.UUID, procedure_id: uuid.UUID) -> Procedure | None:
        stmt = select(Procedure).where(
            Procedure.id == procedure_id,
            Procedure.clinic_id == clinic_id,
            Procedure.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_code(self, clinic_id: uuid.UUID, code: str) -> Procedure | None:
        stmt = select(Procedure).where(
            Procedure.clinic_id == clinic_id,
            Procedure.code == code,
            Procedure.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list(
        self,
        clinic_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        category: ProcedureCategory | None = None,
        specialty_id: uuid.UUID | None = None,
        include_inactive: bool = False,
    ) -> tuple[list[Procedure], int]:
        base = [Procedure.clinic_id == clinic_id, Procedure.deleted_at.is_(None)]
        if not include_inactive:
            base.append(Procedure.is_active.is_(True))
        if category is not None:
            base.append(Procedure.category == category)
        if specialty_id is not None:
            base.append(Procedure.specialty_id == specialty_id)
        if search:
            term = f"%{search.strip()}%"
            base.append(
                or_(
                    Procedure.name.ilike(term),
                    Procedure.code.ilike(term),
                    Procedure.tuss_code.ilike(term),
                )
            )

        count_stmt = select(func.count(Procedure.id)).where(*base)
        total = (await self._session.execute(count_stmt)).scalar_one()

        list_stmt = (
            select(Procedure)
            .where(*base)
            .order_by(Procedure.name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self._session.execute(list_stmt)).scalars())
        return items, total

    def add(self, procedure: Procedure) -> None:
        self._session.add(procedure)
