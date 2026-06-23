"""Event handlers — bridge between domain events and audit logs.

Registered at app startup via `register_handlers()`.
"""
from __future__ import annotations

import uuid

from src.core.events import DomainEvent, bus
from src.modules.audit.service import log_data_access


async def _on_patient_accessed(event: DomainEvent) -> None:
    """Subscriber for `patients.accessed`. Persists DataAccessLog."""
    if event.clinic_id is None:
        return
    await log_data_access(
        clinic_id=event.clinic_id,
        actor_user_id=uuid.UUID(event.payload["actor_user_id"]),
        patient_id=uuid.UUID(event.payload["patient_id"]),
        resource_type=event.payload["resource_type"],
        resource_id=uuid.UUID(event.payload["resource_id"]),
        purpose=event.payload["purpose"],
        actor_ip=event.payload.get("ip"),
    )


def register_handlers() -> None:
    """Wire up audit subscribers. Idempotent — re-registering is harmless in tests."""
    bus.subscribe("patients.accessed", _on_patient_accessed)
