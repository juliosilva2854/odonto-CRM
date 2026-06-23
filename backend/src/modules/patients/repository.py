"""Patient repository — queries scoped to current clinic context."""
from __future__ import annotations

import uuid

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.patients.models import Patient, PatientConsent


class PatientRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_id(self, clinic_id: uuid.UUID, patient_id: uuid.UUID) -> Patient | None:
        stmt = select(Patient).where(
            Patient.id == patient_id,
            Patient.clinic_id == clinic_id,
            Patient.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_cpf(self, clinic_id: uuid.UUID, cpf: str) -> Patient | None:
        stmt = select(Patient).where(
            Patient.clinic_id == clinic_id,
            Patient.cpf == cpf,
            Patient.deleted_at.is_(None),
            Patient.anonymized_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list(
        self,
        clinic_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None = None,
        include_anonymized: bool = False,
    ) -> tuple[list[Patient], int]:
        base = [Patient.clinic_id == clinic_id, Patient.deleted_at.is_(None)]
        if not include_anonymized:
            base.append(Patient.anonymized_at.is_(None))
        if search:
            term = f"%{search.strip()}%"
            base.append(
                or_(
                    Patient.full_name.ilike(term),
                    Patient.social_name.ilike(term),
                    Patient.cpf.ilike(term),
                    Patient.phone_e164.ilike(term),
                    Patient.email.ilike(term),
                )
            )

        count_stmt = select(func.count(Patient.id)).where(*base)
        total = (await self._session.execute(count_stmt)).scalar_one()

        list_stmt = (
            select(Patient)
            .where(*base)
            .order_by(Patient.full_name.asc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self._session.execute(list_stmt)).scalars())
        return items, total

    def add(self, patient: Patient) -> None:
        self._session.add(patient)


class PatientConsentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_by_patient(self, patient_id: uuid.UUID) -> list[PatientConsent]:
        stmt = (
            select(PatientConsent)
            .where(PatientConsent.patient_id == patient_id)
            .order_by(PatientConsent.created_at.desc())
        )
        return list((await self._session.execute(stmt)).scalars())

    async def current_state(self, patient_id: uuid.UUID) -> list[PatientConsent]:
        """Returns the latest PatientConsent per scope (current state)."""
        # Subquery: latest created_at per scope
        latest = (
            select(
                PatientConsent.scope,
                func.max(PatientConsent.created_at).label("max_ts"),
            )
            .where(PatientConsent.patient_id == patient_id)
            .group_by(PatientConsent.scope)
            .subquery()
        )
        stmt = (
            select(PatientConsent)
            .join(
                latest,
                (PatientConsent.scope == latest.c.scope)
                & (PatientConsent.created_at == latest.c.max_ts),
            )
            .where(PatientConsent.patient_id == patient_id)
        )
        return list((await self._session.execute(stmt)).scalars())

    def add(self, consent: PatientConsent) -> None:
        self._session.add(consent)
