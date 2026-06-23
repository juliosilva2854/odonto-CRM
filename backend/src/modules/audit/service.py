"""Audit service — write data_access_logs in own transactional scope.

A separate session is used so the audit row is persisted EVEN IF the parent
request transaction rolls back. The audit trail must outlive failed transactions.
"""
from __future__ import annotations

import uuid

import structlog

from src.core.database import AsyncSessionLocal
from src.modules.audit.models import DataAccessLog

logger = structlog.get_logger(__name__)


async def log_data_access(
    *,
    clinic_id: uuid.UUID,
    actor_user_id: uuid.UUID,
    patient_id: uuid.UUID,
    resource_type: str,
    resource_id: uuid.UUID,
    purpose: str,
    actor_ip: str | None,
) -> None:
    """Persist a DataAccessLog row in its own session (out-of-band)."""
    async with AsyncSessionLocal() as session:
        try:
            session.add(
                DataAccessLog(
                    clinic_id=clinic_id,
                    actor_user_id=actor_user_id,
                    patient_id=patient_id,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    purpose=purpose,
                    actor_ip=actor_ip,
                )
            )
            await session.commit()
        except Exception as exc:  # noqa: BLE001
            await session.rollback()
            logger.exception(
                "data_access_log_failed",
                actor_user_id=str(actor_user_id),
                patient_id=str(patient_id),
                error=str(exc),
            )
