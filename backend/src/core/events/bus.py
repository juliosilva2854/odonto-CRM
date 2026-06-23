"""In-process Event Bus — synchronous, post-commit safe.

Phase 1: in-process sync (após commit do UoW).
Future: same interface, mas handlers vão para fila Celery via outbox table.
"""
from __future__ import annotations

import uuid
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class DomainEvent:
    """Base for all domain events. Subclasse para tipagem específica."""

    event_type: str
    aggregate_id: uuid.UUID
    clinic_id: uuid.UUID | None = None
    payload: dict[str, Any] = field(default_factory=dict)
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


EventHandler = Callable[[DomainEvent], Awaitable[None]]


class EventBus:
    """In-process pub/sub. Process-local; handlers registered at app startup."""

    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)
        logger.debug("event_handler_registered", event_type=event_type, handler=handler.__name__)

    def on(self, event_type: str) -> Callable[[EventHandler], EventHandler]:
        """Decorator form: @bus.on('clinical.procedure_completed')"""

        def decorator(handler: EventHandler) -> EventHandler:
            self.subscribe(event_type, handler)
            return handler

        return decorator

    async def publish(self, event: DomainEvent) -> None:
        """
        Fan-out sincronamente. Handlers que levantam exception NÃO bloqueiam
        os demais — apenas logam. Para fluxos críticos transacionais, use
        publish_after_commit + outbox pattern (Fase 4+).
        """
        handlers = self._handlers.get(event.event_type, [])
        logger.info(
            "event_publish",
            event_type=event.event_type,
            event_id=str(event.event_id),
            n_handlers=len(handlers),
        )
        for handler in handlers:
            try:
                await handler(event)
            except Exception as exc:  # noqa: BLE001
                logger.exception(
                    "event_handler_failed",
                    event_type=event.event_type,
                    handler=handler.__name__,
                    error=str(exc),
                )


# Process-wide singleton (registrado em main.py)
bus = EventBus()
