"""Agenda domain events."""
from __future__ import annotations

import uuid
from typing import Any

from src.core.events import DomainEvent


def appointment_scheduled(
    appointment_id: uuid.UUID, clinic_id: uuid.UUID, payload: dict[str, Any]
) -> DomainEvent:
    return DomainEvent(
        event_type="agenda.appointment_scheduled",
        aggregate_id=appointment_id,
        clinic_id=clinic_id,
        payload=payload,
    )


def appointment_updated(
    appointment_id: uuid.UUID, clinic_id: uuid.UUID, payload: dict[str, Any]
) -> DomainEvent:
    return DomainEvent(
        event_type="agenda.appointment_updated",
        aggregate_id=appointment_id,
        clinic_id=clinic_id,
        payload=payload,
    )


def appointment_status_changed(
    appointment_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    old_status: str,
    new_status: str,
    extra: dict[str, Any] | None = None,
) -> DomainEvent:
    return DomainEvent(
        event_type="agenda.appointment_status_changed",
        aggregate_id=appointment_id,
        clinic_id=clinic_id,
        payload={
            "appointment_id": str(appointment_id),
            "old_status": old_status,
            "new_status": new_status,
            **(extra or {}),
        },
    )


def patient_checked_in(
    appointment_id: uuid.UUID, clinic_id: uuid.UUID, payload: dict[str, Any]
) -> DomainEvent:
    return DomainEvent(
        event_type="agenda.patient_checked_in",
        aggregate_id=appointment_id,
        clinic_id=clinic_id,
        payload=payload,
    )
