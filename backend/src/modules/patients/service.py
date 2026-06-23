"""Patient service: CRUD + LGPD anonymization + consent management."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.events import bus
from src.core.errors import ConflictError, NotFoundError, ValidationError
from src.modules.patients import events
from src.modules.patients.models import Patient, PatientConsent
from src.modules.patients.repository import PatientConsentRepository, PatientRepository
from src.modules.patients.schemas import (
    ConsentCreateIn,
    PatientCreateIn,
    PatientUpdateIn,
)


class PatientService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = PatientRepository(session)
        self._consents = PatientConsentRepository(session)

    # ── CRUD ───────────────────────────────────────────────
    async def create(
        self,
        clinic_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: PatientCreateIn,
    ) -> Patient:
        if data.cpf:
            existing = await self._repo.get_by_cpf(clinic_id, data.cpf)
            if existing:
                raise ConflictError("CPF já cadastrado nesta clínica", details={"cpf": data.cpf})

        patient = Patient(clinic_id=clinic_id, **data.model_dump())
        self._repo.add(patient)
        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Conflito ao gravar paciente", details={"error": str(exc.orig)}) from exc

        await bus.publish(events.patient_created(patient.id, clinic_id, actor_user_id))
        return patient

    async def get(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        actor_user_id: uuid.UUID,
        purpose: str = "consultation",
        ip: str | None = None,
    ) -> Patient:
        patient = await self._repo.get_by_id(clinic_id, patient_id)
        if not patient:
            raise NotFoundError("Paciente não encontrado")

        # ── LGPD: emit access event (handler writes data_access_logs)
        await bus.publish(
            events.patient_accessed(
                patient.id,
                clinic_id,
                actor_user_id,
                resource_type="patient",
                resource_id=patient.id,
                purpose=purpose,
                ip=ip,
            )
        )
        return patient

    async def list(
        self,
        clinic_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
        search: str | None,
        include_anonymized: bool,
    ) -> tuple[list[Patient], int]:
        return await self._repo.list(
            clinic_id,
            page=page,
            page_size=page_size,
            search=search,
            include_anonymized=include_anonymized,
        )

    async def update(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: PatientUpdateIn,
    ) -> Patient:
        patient = await self._repo.get_by_id(clinic_id, patient_id)
        if not patient:
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente anonimizado não pode ser editado")

        changes = data.model_dump(exclude_unset=True)
        if "cpf" in changes and changes["cpf"] and changes["cpf"] != patient.cpf:
            existing = await self._repo.get_by_cpf(clinic_id, changes["cpf"])
            if existing and existing.id != patient.id:
                raise ConflictError("CPF já cadastrado nesta clínica")

        for field, value in changes.items():
            setattr(patient, field, value)

        try:
            await self._session.flush()
        except IntegrityError as exc:
            raise ConflictError("Conflito ao atualizar paciente", details={"error": str(exc.orig)}) from exc

        await bus.publish(events.patient_updated(patient.id, clinic_id, actor_user_id))
        return patient

    async def soft_delete(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
    ) -> None:
        patient = await self._repo.get_by_id(clinic_id, patient_id)
        if not patient:
            raise NotFoundError("Paciente não encontrado")
        patient.deleted_at = datetime.now(timezone.utc)
        await self._session.flush()

    # ── LGPD: Direito ao Esquecimento ──────────────────────
    async def anonymize(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        reason: str,
    ) -> Patient:
        """
        Wipes PII while keeping the row alive for financial / clinical FK integrity.
        Irreversible.
        """
        patient = await self._repo.get_by_id(clinic_id, patient_id)
        if not patient:
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente já está anonimizado")

        anonymized_token = patient.id.hex[:8].upper()
        patient.full_name = f"Paciente Anonimizado #{anonymized_token}"
        patient.social_name = None
        patient.cpf = None
        patient.rg = None
        patient.birth_date = None
        patient.phone_e164 = "+550000000000"
        patient.secondary_phone_e164 = None
        patient.email = None
        patient.address_street = None
        patient.address_number = None
        patient.address_complement = None
        patient.address_neighborhood = None
        patient.address_city = None
        patient.address_state = None
        patient.address_zipcode = None
        patient.guardian_name = None
        patient.guardian_cpf = None
        patient.guardian_phone_e164 = None
        patient.notes = f"[Anonimizado em {datetime.now(timezone.utc).isoformat()}] Motivo: {reason}"
        patient.anonymized_at = datetime.now(timezone.utc)

        await self._session.flush()
        await bus.publish(events.patient_anonymized(patient.id, clinic_id, actor_user_id))
        return patient

    # ── Consents ───────────────────────────────────────────
    async def record_consent(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: ConsentCreateIn,
        *,
        ip: str | None = None,
    ) -> PatientConsent:
        patient = await self._repo.get_by_id(clinic_id, patient_id)
        if not patient:
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente anonimizado: consentimentos congelados")

        consent = PatientConsent(
            clinic_id=clinic_id,
            patient_id=patient_id,
            scope=data.scope,
            granted=data.granted,
            document_version=data.document_version,
            document_text_sha256=data.document_text_sha256,
            granted_via=data.granted_via,
            actor_ip=ip,
            actor_user_id=actor_user_id,
        )
        self._consents.add(consent)
        await self._session.flush()
        return consent

    async def list_consents(self, patient_id: uuid.UUID) -> list[PatientConsent]:
        return await self._consents.list_by_patient(patient_id)

    async def current_consent_state(self, patient_id: uuid.UUID) -> list[PatientConsent]:
        return await self._consents.current_state(patient_id)
