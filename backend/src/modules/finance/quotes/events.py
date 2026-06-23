"""Quote domain events."""
from __future__ import annotations

import uuid
from decimal import Decimal
from typing import Any

from src.core.events import DomainEvent

# Event type constants — keep one source of truth.
EV_QUOTE_CREATED = "finance.quote_created"
EV_QUOTE_ITEM_APPROVED = "finance.quote_item_approved"
EV_QUOTE_ITEM_REJECTED = "finance.quote_item_rejected"
EV_QUOTE_APPROVED = "finance.quote_approved"
EV_QUOTE_APPROVED_PARTIAL = "finance.quote_approved_partial"
EV_QUOTE_REJECTED = "finance.quote_rejected"
EV_QUOTE_CANCELLED = "finance.quote_cancelled"


def _decimal_to_str(v: Decimal | None) -> str | None:
    return str(v) if v is not None else None


def quote_created(
    quote_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    patient_id: uuid.UUID,
    total: Decimal,
    items_count: int,
) -> DomainEvent:
    return DomainEvent(
        event_type=EV_QUOTE_CREATED,
        aggregate_id=quote_id,
        clinic_id=clinic_id,
        payload={
            "patient_id": str(patient_id),
            "total": _decimal_to_str(total),
            "items_count": items_count,
        },
    )


def quote_item_approved(
    item_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    quote_id: uuid.UUID,
    patient_id: uuid.UUID,
    tooth_procedure_id: uuid.UUID | None,
    procedure_id: uuid.UUID,
    line_total: Decimal,
    actor_user_id: uuid.UUID,
    extra: dict[str, Any] | None = None,
) -> DomainEvent:
    return DomainEvent(
        event_type=EV_QUOTE_ITEM_APPROVED,
        aggregate_id=item_id,
        clinic_id=clinic_id,
        payload={
            "quote_item_id": str(item_id),
            "quote_id": str(quote_id),
            "patient_id": str(patient_id),
            "tooth_procedure_id": str(tooth_procedure_id) if tooth_procedure_id else None,
            "procedure_id": str(procedure_id),
            "line_total": _decimal_to_str(line_total),
            "actor_user_id": str(actor_user_id),
            **(extra or {}),
        },
    )


def quote_item_rejected(
    item_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    quote_id: uuid.UUID,
    tooth_procedure_id: uuid.UUID | None,
    reason: str | None,
    actor_user_id: uuid.UUID,
) -> DomainEvent:
    return DomainEvent(
        event_type=EV_QUOTE_ITEM_REJECTED,
        aggregate_id=item_id,
        clinic_id=clinic_id,
        payload={
            "quote_item_id": str(item_id),
            "quote_id": str(quote_id),
            "tooth_procedure_id": str(tooth_procedure_id) if tooth_procedure_id else None,
            "reason": reason,
            "actor_user_id": str(actor_user_id),
        },
    )


def quote_status_changed(
    quote_id: uuid.UUID,
    clinic_id: uuid.UUID,
    *,
    new_status: str,
    actor_user_id: uuid.UUID,
    reason: str | None = None,
) -> DomainEvent:
    return DomainEvent(
        event_type={
            "approved": EV_QUOTE_APPROVED,
            "approved_partial": EV_QUOTE_APPROVED_PARTIAL,
            "rejected": EV_QUOTE_REJECTED,
            "cancelled": EV_QUOTE_CANCELLED,
        }.get(new_status, f"finance.quote_{new_status}"),
        aggregate_id=quote_id,
        clinic_id=clinic_id,
        payload={
            "quote_id": str(quote_id),
            "new_status": new_status,
            "actor_user_id": str(actor_user_id),
            "reason": reason,
        },
    )
