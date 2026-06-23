"""Domain events emitted by the patients module."""
from __future__ import annotations

import uuid

from src.core.events import DomainEvent


def patient_created(patient_id: uuid.UUID, clinic_id: uuid.UUID, actor_user_id: uuid.UUID) -> DomainEvent:
    return DomainEvent(
        event_type="patients.created",
        aggregate_id=patient_id,
        clinic_id=clinic_id,
        payload={"patient_id": str(patient_id), "actor_user_id": str(actor_user_id)},
    )


def patient_updated(patient_id: uuid.UUID, clinic_id: uuid.UUID, actor_user_id: uuid.UUID) -> DomainEvent:
    return DomainEvent(
        event_type="patients.updated",
        aggregate_id=patient_id,
        clinic_id=clinic_id,
        payload={"patient_id": str(patient_id), "actor_user_id": str(actor_user_id)},
    )


def patient_anonymized(patient_id: uuid.UUID, clinic_id: uuid.UUID, actor_user_id: uuid.UUID) -> DomainEvent:
    return DomainEvent(
        event_type="patients.anonymized",
        aggregate_id=patient_id,
        clinic_id=clinic_id,
        payload={"patient_id": str(patient_id), "actor_user_id": str(actor_user_id)},
    )


def patient_accessed(
    patient_id: uuid.UUID,
    clinic_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    *,
    resource_type: str,
    resource_id: uuid.UUID,
    purpose: str,
    ip: str | None,
) -> DomainEvent:
    return DomainEvent(
        event_type="patients.accessed",
        aggregate_id=patient_id,
        clinic_id=clinic_id,
        payload={
            "patient_id": str(patient_id),
            "actor_user_id": str(actor_user_id),
            "resource_type": resource_type,
            "resource_id": str(resource_id),
            "purpose": purpose,
            "ip": ip,
        },
    )
