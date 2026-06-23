"""Clinical records service — CRUD + CFO lock enforcement."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ForbiddenError, NotFoundError, ValidationError
from src.core.feature_flags import FeatureFlagService
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.clinical.records.models import (
    ClinicalRecord,
    ClinicalRecordAddendum,
)
from src.modules.clinical.records.repository import (
    ClinicalRecordAddendumRepository,
    ClinicalRecordRepository,
)
from src.modules.clinical.records.schemas import (
    AttachmentIn,
    ClinicalRecordAddendumCreateIn,
    ClinicalRecordCreateIn,
    ClinicalRecordUpdateIn,
)
from src.modules.patients.models import Patient

DEFAULT_LOCK_HOURS = 24
FEATURE_KEY = "clinical_records"


class ClinicalRecordService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ClinicalRecordRepository(session)
        self._add_repo = ClinicalRecordAddendumRepository(session)
        self._features = FeatureFlagService(session)

    # ── helpers ───────────────────────────────────────────────

    async def _load_patient(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> Patient:
        patient = await self._session.get(Patient, patient_id)
        if (
            patient is None
            or patient.clinic_id != clinic_id
            or patient.deleted_at is not None
        ):
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente anonimizado — prontuário indisponível")
        return patient

    async def _resolve_lock_hours(self, clinic_id: uuid.UUID) -> int:
        """Reads `clinical_records.config.lock_hours` from feature flags.
        Falls back to DEFAULT_LOCK_HOURS when missing/invalid."""
        features = await self._features.get_all(clinic_id)
        cfg = features.get(FEATURE_KEY, {}).get("config") or {}
        raw = cfg.get("lock_hours", DEFAULT_LOCK_HOURS)
        try:
            value = int(raw)
        except (TypeError, ValueError):
            return DEFAULT_LOCK_HOURS
        if value < 0:
            return DEFAULT_LOCK_HOURS
        return value

    @staticmethod
    def _attachments_payload(items: list[AttachmentIn]) -> list[dict]:
        return [a.model_dump(exclude_none=True) for a in items]

    def _compute_lock_state(
        self, record: ClinicalRecord, lock_hours: int
    ) -> tuple[bool, datetime]:
        """Returns (is_locked_now, locks_at)."""
        locks_at = record.created_at + timedelta(hours=lock_hours)
        if record.locked_at is not None:
            return True, record.locked_at
        return datetime.now(timezone.utc) >= locks_at, locks_at

    def _ensure_can_edit(
        self,
        record: ClinicalRecord,
        actor: User,
        *,
        is_locked: bool,
    ) -> None:
        if is_locked:
            raise ForbiddenError(
                "Prontuário trancado (lock CFO). Use adendos para registrar alterações.",
                code="clinical_record_locked",
                details={
                    "record_id": str(record.id),
                    "locked_at": (record.locked_at or "").__str__(),
                },
            )
        # Only the original author OR admin can edit during the window.
        if actor.role != UserRole.ADMIN and record.author_user_id != actor.id:
            raise ForbiddenError(
                "Apenas o autor do prontuário (ou admin) pode editar durante a janela",
                code="clinical_record_not_author",
            )

    # ── commands ──────────────────────────────────────────────

    async def create(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor: User,
        data: ClinicalRecordCreateIn,
    ) -> tuple[ClinicalRecord, dict]:
        await self._load_patient(clinic_id, patient_id)

        record = ClinicalRecord(
            clinic_id=clinic_id,
            patient_id=patient_id,
            appointment_id=data.appointment_id,
            author_user_id=actor.id,
            record_type=data.record_type,
            title=data.title.strip(),
            content=data.content,
            attachments=self._attachments_payload(data.attachments),
        )
        self._repo.add(record)
        await self._session.flush()

        lock_hours = await self._resolve_lock_hours(clinic_id)
        is_locked, locks_at = self._compute_lock_state(record, lock_hours)
        return record, {"is_locked": is_locked, "locks_at": locks_at, "lock_hours": lock_hours}

    async def get(
        self, clinic_id: uuid.UUID, record_id: uuid.UUID
    ) -> tuple[ClinicalRecord, dict]:
        record = await self._repo.get(clinic_id, record_id)
        if not record:
            raise NotFoundError("Prontuário não encontrado")
        lock_hours = await self._resolve_lock_hours(clinic_id)
        is_locked, locks_at = self._compute_lock_state(record, lock_hours)
        return record, {"is_locked": is_locked, "locks_at": locks_at, "lock_hours": lock_hours}

    async def list_by_patient(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
    ) -> tuple[list[ClinicalRecord], int, dict]:
        await self._load_patient(clinic_id, patient_id)
        items, total = await self._repo.list_by_patient(
            clinic_id, patient_id, page=page, page_size=page_size
        )
        lock_hours = await self._resolve_lock_hours(clinic_id)
        return items, total, {"lock_hours": lock_hours}

    async def update(
        self,
        clinic_id: uuid.UUID,
        record_id: uuid.UUID,
        actor: User,
        data: ClinicalRecordUpdateIn,
    ) -> tuple[ClinicalRecord, dict]:
        record, meta = await self.get(clinic_id, record_id)
        self._ensure_can_edit(record, actor, is_locked=meta["is_locked"])

        changes = data.model_dump(exclude_unset=True)
        if "title" in changes and changes["title"]:
            record.title = changes["title"].strip()
        if "content" in changes and changes["content"] is not None:
            record.content = changes["content"]
        if "attachments" in changes and changes["attachments"] is not None:
            record.attachments = self._attachments_payload(
                [AttachmentIn.model_validate(a) for a in changes["attachments"]]
            )
        await self._session.flush()

        # Recompute (created_at unchanged → same locks_at).
        is_locked, locks_at = self._compute_lock_state(record, meta["lock_hours"])
        return record, {
            "is_locked": is_locked,
            "locks_at": locks_at,
            "lock_hours": meta["lock_hours"],
        }

    async def add_addendum(
        self,
        clinic_id: uuid.UUID,
        record_id: uuid.UUID,
        actor: User,
        data: ClinicalRecordAddendumCreateIn,
    ) -> ClinicalRecordAddendum:
        record, meta = await self.get(clinic_id, record_id)

        # Mark the record as sealed the first time an addendum is created
        # after the window — useful audit signal.
        if meta["is_locked"] and record.locked_at is None:
            record.locked_at = datetime.now(timezone.utc)
            await self._session.flush()

        addendum = ClinicalRecordAddendum(
            clinic_id=clinic_id,
            record_id=record.id,
            author_user_id=actor.id,
            content=data.content,
            attachments=self._attachments_payload(data.attachments),
            created_at=datetime.now(timezone.utc),
        )
        self._add_repo.add(addendum)
        await self._session.flush()
        return addendum

    async def list_addendums(
        self, clinic_id: uuid.UUID, record_id: uuid.UUID
    ) -> list[ClinicalRecordAddendum]:
        record = await self._repo.get(clinic_id, record_id)
        if not record:
            raise NotFoundError("Prontuário não encontrado")
        return await self._add_repo.list_by_record(record_id)
