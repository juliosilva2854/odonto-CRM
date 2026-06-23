"""Odontogram service — orchestrates events + projection updates."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError, ValidationError
from src.core.events import bus
from src.modules.clinical.catalog.models import Procedure
from src.modules.clinical.catalog.repository import ProcedureRepository
from src.modules.clinical.odontogram import events as odo_events
from src.modules.clinical.odontogram.enums import (
    ALL_FDI_TEETH,
    OdontogramEventType,
    ToothProcedureStatus,
    can_transition_procedure,
)
from src.modules.clinical.odontogram.models import OdontogramEvent, ToothProcedure
from src.modules.clinical.odontogram.repository import (
    OdontogramEventRepository,
    ToothProcedureRepository,
)
from src.modules.clinical.odontogram.schemas import (
    AddProcedureIn,
    NoteIn,
    RemoveProcedureIn,
)
from src.modules.patients.models import Patient


class OdontogramService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._events = OdontogramEventRepository(session)
        self._procs = ToothProcedureRepository(session)
        self._catalog = ProcedureRepository(session)

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
            raise ValidationError("Paciente anonimizado — odontograma indisponível")
        return patient

    async def _load_procedure(
        self, clinic_id: uuid.UUID, procedure_id: uuid.UUID
    ) -> Procedure:
        procedure = await self._catalog.get(clinic_id, procedure_id)
        if not procedure:
            raise NotFoundError("Procedimento não encontrado no catálogo")
        if not procedure.is_active:
            raise ValidationError("Procedimento inativo no catálogo")
        return procedure

    # ── reads ─────────────────────────────────────────────────

    async def snapshot(
        self, clinic_id: uuid.UUID, patient_id: uuid.UUID
    ) -> list[ToothProcedure]:
        await self._load_patient(clinic_id, patient_id)
        return await self._procs.list_active_by_patient(clinic_id, patient_id)

    async def list_events(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        *,
        page: int,
        page_size: int,
    ) -> tuple[list[OdontogramEvent], int]:
        await self._load_patient(clinic_id, patient_id)
        return await self._events.list_by_patient(
            clinic_id, patient_id, page=page, page_size=page_size
        )

    # ── commands ──────────────────────────────────────────────

    async def add_procedure(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: AddProcedureIn,
    ) -> tuple[ToothProcedure, OdontogramEvent]:
        await self._load_patient(clinic_id, patient_id)
        procedure = await self._load_procedure(clinic_id, data.procedure_id)

        # Business rules tied to catalog metadata
        if procedure.requires_tooth and data.tooth_fdi is None:
            raise ValidationError(
                "Procedimento exige indicação do dente (FDI)",
                details={"procedure_id": str(procedure.id)},
            )
        if procedure.requires_faces and not data.faces:
            raise ValidationError(
                "Procedimento exige ao menos uma face do dente",
                details={"procedure_id": str(procedure.id)},
            )
        if data.tooth_fdi is not None and data.tooth_fdi not in ALL_FDI_TEETH:
            # Defensive — schema validator already covers, but double-check.
            raise ValidationError("Código FDI inválido", details={"tooth_fdi": data.tooth_fdi})

        now = datetime.now(timezone.utc)
        price_snapshot: Decimal = (
            data.price_override
            if data.price_override is not None
            else Decimal(procedure.base_price)
        )
        commission_snapshot: Decimal | None = (
            Decimal(procedure.commission_pct_override)
            if procedure.commission_pct_override is not None
            else None
        )

        tp = ToothProcedure(
            clinic_id=clinic_id,
            patient_id=patient_id,
            tooth_fdi=data.tooth_fdi,
            faces=list(data.faces),
            procedure_id=procedure.id,
            status=ToothProcedureStatus.PLANNED,
            price_snapshot=price_snapshot,
            commission_pct_snapshot=commission_snapshot,
            notes=data.notes,
            planned_by_user_id=actor_user_id,
        )
        self._procs.add(tp)
        await self._session.flush()

        event = OdontogramEvent(
            clinic_id=clinic_id,
            patient_id=patient_id,
            event_type=OdontogramEventType.PROCEDURE_ADDED,
            tooth_fdi=data.tooth_fdi,
            faces=list(data.faces),
            procedure_id=procedure.id,
            tooth_procedure_id=tp.id,
            payload={
                "price_snapshot": str(price_snapshot),
                "commission_pct_snapshot": (
                    str(commission_snapshot) if commission_snapshot is not None else None
                ),
                "procedure_code": procedure.code,
                "procedure_name": procedure.name,
            },
            notes=data.notes,
            actor_user_id=actor_user_id,
            created_at=now,
        )
        self._events.add(event)
        await self._session.flush()

        await bus.publish(
            odo_events.event_recorded(
                event.id,
                clinic_id,
                patient_id=patient_id,
                event_type=event.event_type.value,
                payload={
                    "tooth_procedure_id": str(tp.id),
                    "procedure_id": str(procedure.id),
                    "tooth_fdi": data.tooth_fdi,
                    "faces": list(data.faces),
                    "actor_user_id": str(actor_user_id),
                },
            )
        )
        return tp, event

    async def change_status(
        self,
        clinic_id: uuid.UUID,
        tp_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        new_status: ToothProcedureStatus,
        *,
        reason: str | None = None,
        trigger: str = "manual",
    ) -> tuple[ToothProcedure, OdontogramEvent]:
        tp = await self._procs.get(clinic_id, tp_id)
        if tp is None:
            raise NotFoundError("Procedimento do odontograma não encontrado")

        old_status = tp.status
        if old_status == new_status:
            # Idempotent: still record a no-op? We choose NOT to spam events.
            event = await self._record_status_event(
                clinic_id, tp, actor_user_id,
                old_status=old_status, new_status=new_status,
                trigger=trigger, reason=reason, no_change=True,
            )
            return tp, event

        if not can_transition_procedure(old_status, new_status):
            raise ValidationError(
                f"Transição inválida: {old_status.value} → {new_status.value}",
                details={
                    "tooth_procedure_id": str(tp.id),
                    "current_status": old_status.value,
                },
            )

        now = datetime.now(timezone.utc)
        tp.status = new_status
        if new_status == ToothProcedureStatus.IN_PROGRESS and tp.started_at is None:
            tp.started_at = now
        if new_status == ToothProcedureStatus.DONE:
            tp.completed_at = now

        await self._session.flush()

        event = await self._record_status_event(
            clinic_id, tp, actor_user_id,
            old_status=old_status, new_status=new_status,
            trigger=trigger, reason=reason, no_change=False,
        )

        await bus.publish(
            odo_events.procedure_status_changed(
                tp.id, clinic_id,
                patient_id=tp.patient_id,
                old_status=old_status.value,
                new_status=new_status.value,
                trigger=trigger,
            )
        )
        return tp, event

    async def _record_status_event(
        self,
        clinic_id: uuid.UUID,
        tp: ToothProcedure,
        actor_user_id: uuid.UUID,
        *,
        old_status: ToothProcedureStatus,
        new_status: ToothProcedureStatus,
        trigger: str,
        reason: str | None,
        no_change: bool,
    ) -> OdontogramEvent:
        event = OdontogramEvent(
            clinic_id=clinic_id,
            patient_id=tp.patient_id,
            event_type=OdontogramEventType.PROCEDURE_STATUS_CHANGED,
            tooth_fdi=tp.tooth_fdi,
            faces=list(tp.faces or []),
            procedure_id=tp.procedure_id,
            tooth_procedure_id=tp.id,
            payload={
                "old_status": old_status.value,
                "new_status": new_status.value,
                "reason": reason,
                "trigger": trigger,
                "no_change": no_change,
            },
            actor_user_id=actor_user_id,
            created_at=datetime.now(timezone.utc),
        )
        self._events.add(event)
        await self._session.flush()
        return event

    async def remove_procedure(
        self,
        clinic_id: uuid.UUID,
        tp_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: RemoveProcedureIn,
    ) -> tuple[ToothProcedure, OdontogramEvent]:
        tp = await self._procs.get(clinic_id, tp_id)
        if tp is None:
            raise NotFoundError("Procedimento do odontograma não encontrado")
        if tp.status == ToothProcedureStatus.DONE:
            raise ValidationError("Procedimento concluído não pode ser removido")

        now = datetime.now(timezone.utc)
        tp.status = ToothProcedureStatus.CANCELLED
        tp.deleted_at = now
        await self._session.flush()

        event = OdontogramEvent(
            clinic_id=clinic_id,
            patient_id=tp.patient_id,
            event_type=OdontogramEventType.PROCEDURE_REMOVED,
            tooth_fdi=tp.tooth_fdi,
            faces=list(tp.faces or []),
            procedure_id=tp.procedure_id,
            tooth_procedure_id=tp.id,
            payload={"reason": data.reason},
            actor_user_id=actor_user_id,
            created_at=now,
        )
        self._events.add(event)
        await self._session.flush()

        await bus.publish(
            odo_events.event_recorded(
                event.id, clinic_id,
                patient_id=tp.patient_id,
                event_type=event.event_type.value,
                payload={
                    "tooth_procedure_id": str(tp.id),
                    "reason": data.reason,
                },
            )
        )
        return tp, event

    async def add_note(
        self,
        clinic_id: uuid.UUID,
        patient_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: NoteIn,
    ) -> OdontogramEvent:
        await self._load_patient(clinic_id, patient_id)
        event = OdontogramEvent(
            clinic_id=clinic_id,
            patient_id=patient_id,
            event_type=OdontogramEventType.NOTE_ADDED,
            tooth_fdi=data.tooth_fdi,
            faces=[],
            payload={"text": data.text},
            notes=data.text,
            actor_user_id=actor_user_id,
            created_at=datetime.now(timezone.utc),
        )
        self._events.add(event)
        await self._session.flush()

        await bus.publish(
            odo_events.event_recorded(
                event.id, clinic_id,
                patient_id=patient_id,
                event_type=event.event_type.value,
                payload={"text_preview": data.text[:120]},
            )
        )
        return event
