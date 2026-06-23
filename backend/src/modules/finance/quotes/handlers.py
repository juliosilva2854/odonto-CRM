"""Event handlers — bridge Finance (Quotes) ↔ Clinical (Odontogram).

Subscribes to `finance.quote_item_approved` and transitions the linked
ToothProcedure from `planned` → `to_execute`. Uses its own DB session so the
clinical state change survives even if other handlers of the same event fail.
"""
from __future__ import annotations

import uuid

import structlog

from src.core.database import AsyncSessionLocal
from src.core.events import DomainEvent, bus
from src.modules.clinical.odontogram.enums import ToothProcedureStatus
from src.modules.clinical.odontogram.service import OdontogramService
from src.modules.finance.quotes import events as quote_events

logger = structlog.get_logger(__name__)


async def _on_quote_item_approved(event: DomainEvent) -> None:
    tp_id_raw = event.payload.get("tooth_procedure_id")
    if not tp_id_raw or event.clinic_id is None:
        # Item not linked to the odontogram (e.g. prophylaxis) — nothing to do.
        return

    tp_id = uuid.UUID(tp_id_raw)
    actor_user_id = uuid.UUID(event.payload["actor_user_id"])

    async with AsyncSessionLocal() as session:
        try:
            await OdontogramService(session).change_status(
                event.clinic_id,
                tp_id,
                actor_user_id,
                ToothProcedureStatus.TO_EXECUTE,
                reason=f"quote_item_approved:{event.payload.get('quote_item_id')}",
                trigger="quote_approved",
            )
            await session.commit()
        except Exception:
            await session.rollback()
            logger.exception(
                "bridge_quote_to_odontogram_failed",
                tooth_procedure_id=str(tp_id),
                event_id=str(event.event_id),
            )
            raise


def register_handlers() -> None:
    """Wire up finance↔clinical subscribers. Idempotent."""
    bus.subscribe(quote_events.EV_QUOTE_ITEM_APPROVED, _on_quote_item_approved)
