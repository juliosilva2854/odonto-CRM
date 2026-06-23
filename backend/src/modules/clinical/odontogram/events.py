"""Odontogram domain events."""
from __future__ import annotations

import uuid
from typing import Any

from src.core.events import DomainEvent


def event_recorded(
    event_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    patient_id: uuid.UUID,
    event_type: str,
    payload: dict[str, Any],
) -> DomainEvent:
    return DomainEvent(
        event_type="clinical.odontogram.event_recorded",
        aggregate_id=event_id,
        clinic_id=clinic_id,
        payload={
            "patient_id": str(patient_id),
            "odontogram_event_type": event_type,
            **payload,
        },
    )


def procedure_status_changed(
    tooth_procedure_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    patient_id: uuid.UUID,
    old_status: str,
    new_status: str,
    trigger: str = "manual",
) -> DomainEvent:
    return DomainEvent(
        event_type="clinical.odontogram.procedure_status_changed",
        aggregate_id=tooth_procedure_id,
        clinic_id=clinic_id,
        payload={
            "patient_id": str(patient_id),
            "tooth_procedure_id": str(tooth_procedure_id),
            "old_status": old_status,
            "new_status": new_status,
            "trigger": trigger,
        },
    )
