"""Real-time layer — in-process WebSocket connection manager + event broadcasting.

The ConnectionManager is process-local. For horizontal scaling (Phase 7+), wire it
behind Redis pub/sub. The public interface (`broadcast(clinic_id, payload)`) stays
identical, so swapping is transparent to producers.
"""
from __future__ import annotations

import asyncio
import uuid
from collections import defaultdict
from typing import Any

import structlog
from fastapi import WebSocket

from src.core.events import DomainEvent, bus

logger = structlog.get_logger(__name__)


class ConnectionManager:
    """One channel per clinic. Broadcasts JSON payloads to all subscribers."""

    def __init__(self) -> None:
        self._connections: dict[uuid.UUID, set[WebSocket]] = defaultdict(set)
        self._lock = asyncio.Lock()

    async def connect(self, clinic_id: uuid.UUID, websocket: WebSocket) -> None:
        await websocket.accept()
        async with self._lock:
            self._connections[clinic_id].add(websocket)
        logger.info(
            "ws_connected", clinic_id=str(clinic_id), total=len(self._connections[clinic_id])
        )

    async def disconnect(self, clinic_id: uuid.UUID, websocket: WebSocket) -> None:
        async with self._lock:
            self._connections[clinic_id].discard(websocket)
            if not self._connections[clinic_id]:
                del self._connections[clinic_id]
        logger.info("ws_disconnected", clinic_id=str(clinic_id))

    async def broadcast(self, clinic_id: uuid.UUID, payload: dict[str, Any]) -> None:
        async with self._lock:
            sockets = list(self._connections.get(clinic_id, ()))
        if not sockets:
            return
        dead: list[WebSocket] = []
        for ws in sockets:
            try:
                await ws.send_json(payload)
            except Exception:  # noqa: BLE001
                dead.append(ws)
        if dead:
            async with self._lock:
                for ws in dead:
                    self._connections[clinic_id].discard(ws)

    def stats(self) -> dict[str, int]:
        return {str(cid): len(sockets) for cid, sockets in self._connections.items()}


# Process-wide singleton
manager = ConnectionManager()


# ── Event bus subscribers — re-broadcast agenda events to WS clients ─────────


async def _on_agenda_event(event: DomainEvent) -> None:
    if event.clinic_id is None:
        return
    await manager.broadcast(
        event.clinic_id,
        {
            "type": event.event_type,
            "event_id": str(event.event_id),
            "aggregate_id": str(event.aggregate_id),
            "occurred_at": event.occurred_at.isoformat(),
            "payload": event.payload,
        },
    )


def register_handlers() -> None:
    """Subscribe broadcaster to all agenda events."""
    for et in (
        "agenda.appointment_scheduled",
        "agenda.appointment_updated",
        "agenda.appointment_status_changed",
        "agenda.patient_checked_in",
    ):
        bus.subscribe(et, _on_agenda_event)
