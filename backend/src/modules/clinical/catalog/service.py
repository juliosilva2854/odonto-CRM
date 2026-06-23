"""Catalog service — CRUD para especialidades e procedimentos."""
from __future__ import annotations

import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ConflictError, NotFoundError
from src.modules.clinical.catalog.enums import ProcedureCategory
from src.modules.clinical.catalog.models import Procedure, Specialty
from src.modules.clinical.catalog.repository import ProcedureRepository, SpecialtyRepository
from src.modules.clinical.catalog.schemas import (
    ProcedureCreateIn,
    ProcedureUpdateIn,
    SpecialtyCreateIn,
    SpecialtyUpdateIn,
)


class SpecialtyService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = SpecialtyRepository(session)

    async def create(self, clinic_id: uuid.UUID, data: SpecialtyCreateIn) -> Specialty:
        if await self._repo.get_by_name(clinic_id, data.name):
            raise ConflictError("Especialidade já cadastrada", details={"name": data.name})
        specialty = Specialty(clinic_id=clinic_id, **data.model_dump())
        self._repo.add(specialty)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Conflito ao criar especialidade") from exc
        return specialty

    async def get(self, clinic_id: uuid.UUID, specialty_id: uuid.UUID) -> Specialty:
        specialty = await self._repo.get(clinic_id, specialty_id)
        if not specialty:
            raise NotFoundError("Especialidade não encontrada")
        return specialty

    async def list(self, clinic_id: uuid.UUID, *, include_inactive: bool = False) -> list[Specialty]:
        return await self._repo.list(clinic_id, include_inactive=include_inactive)

    async def update(
        self, clinic_id: uuid.UUID, specialty_id: uuid.UUID, data: SpecialtyUpdateIn
    ) -> Specialty:
        specialty = await self.get(clinic_id, specialty_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] and changes["name"] != specialty.name:
            existing = await self._repo.get_by_name(clinic_id, changes["name"])
            if existing and existing.id != specialty.id:
                raise ConflictError("Especialidade com este nome já existe")
        for field, value in changes.items():
            setattr(specialty, field, value)
        await self._session.flush()
        return specialty


class ProcedureService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ProcedureRepository(session)
        self._spec_repo = SpecialtyRepository(session)

    async def create(self, clinic_id: uuid.UUID, data: ProcedureCreateIn) -> Procedure:
        if await self._repo.get_by_code(clinic_id, data.code):
            raise ConflictError("Procedimento com este código já existe", details={"code": data.code})
        if data.specialty_id is not None:
            if not await self._spec_repo.get(clinic_id, data.specialty_id):
                raise NotFoundError(
                    "Especialidade vinculada não encontrada",
                    details={"specialty_id": str(data.specialty_id)},
                )
        procedure = Procedure(clinic_id=clinic_id, **data.model_dump())
        self._repo.add(procedure)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Conflito ao criar procedimento") from exc
        return procedure

    async def get(self, clinic_id: uuid.UUID, procedure_id: uuid.UUID) -> Procedure:
        procedure = await self._repo.get(clinic_id, procedure_id)
        if not procedure:
            raise NotFoundError("Procedimento não encontrado")
        return procedure

    async def list(
        self,
        clinic_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        category: ProcedureCategory | None,
        specialty_id: uuid.UUID | None,
        include_inactive: bool,
    ) -> tuple[list[Procedure], int]:
        return await self._repo.list(
            clinic_id,
            page=page,
            page_size=page_size,
            search=search,
            category=category,
            specialty_id=specialty_id,
            include_inactive=include_inactive,
        )

    async def update(
        self, clinic_id: uuid.UUID, procedure_id: uuid.UUID, data: ProcedureUpdateIn
    ) -> Procedure:
        procedure = await self.get(clinic_id, procedure_id)
        changes = data.model_dump(exclude_unset=True)
        if "code" in changes and changes["code"] and changes["code"] != procedure.code:
            existing = await self._repo.get_by_code(clinic_id, changes["code"])
            if existing and existing.id != procedure.id:
                raise ConflictError("Procedimento com este código já existe")
        if "specialty_id" in changes and changes["specialty_id"] is not None:
            if not await self._spec_repo.get(clinic_id, changes["specialty_id"]):
                raise NotFoundError("Especialidade vinculada não encontrada")
        for field, value in changes.items():
            setattr(procedure, field, value)
        await self._session.flush()
        return procedure

    async def deactivate(self, clinic_id: uuid.UUID, procedure_id: uuid.UUID) -> None:
        procedure = await self.get(clinic_id, procedure_id)
        procedure.is_active = False
        await self._session.flush()
