"""Dashboard repository — SQL agregado sempre filtrado por clinic_id."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.agenda.enums import AppointmentStatus
from src.modules.agenda.models import Appointment, CheckIn
from src.modules.finance.quotes.enums import QuoteStatus
from src.modules.finance.quotes.models import Quote, QuoteItem
from src.modules.patients.models import Patient

_NON_BLOCKING = (
    AppointmentStatus.CANCELLED.value,
    AppointmentStatus.NO_SHOW.value,
)
_APPROVED = (QuoteStatus.APPROVED.value, QuoteStatus.APPROVED_PARTIAL.value)
_PENDING = (QuoteStatus.DRAFT.value, QuoteStatus.SENT.value)


class DashboardRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def appointments_today_count(
        self, clinic_id: uuid.UUID, day_start: datetime, day_end: datetime
    ) -> int:
        stmt = select(func.count(Appointment.id)).where(
            Appointment.clinic_id == clinic_id,
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
            Appointment.status.notin_(_NON_BLOCKING),
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def appointments_today_list(
        self, clinic_id: uuid.UUID, day_start: datetime, day_end: datetime, limit: int = 5
    ) -> list[tuple[uuid.UUID, str, datetime, str]]:
        stmt = (
            select(
                Appointment.id,
                Patient.full_name,
                Appointment.starts_at,
                Appointment.status,
            )
            .join(Patient, Patient.id == Appointment.patient_id)
            .where(
                Appointment.clinic_id == clinic_id,
                Appointment.starts_at >= day_start,
                Appointment.starts_at < day_end,
                Appointment.status.notin_(_NON_BLOCKING),
            )
            .order_by(Appointment.starts_at.asc())
            .limit(limit)
        )
        rows = (await self._session.execute(stmt)).all()
        return [(r[0], r[1], r[2], r[3].value if hasattr(r[3], "value") else r[3]) for r in rows]

    async def patients_total(self, clinic_id: uuid.UUID) -> int:
        stmt = select(func.count(Patient.id)).where(
            Patient.clinic_id == clinic_id,
            Patient.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def patients_new_since(
        self, clinic_id: uuid.UUID, month_start: datetime
    ) -> int:
        stmt = select(func.count(Patient.id)).where(
            Patient.clinic_id == clinic_id,
            Patient.deleted_at.is_(None),
            Patient.created_at >= month_start,
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def quotes_month_total(
        self, clinic_id: uuid.UUID, month_start: datetime
    ) -> int:
        stmt = select(func.count(Quote.id)).where(
            Quote.clinic_id == clinic_id,
            Quote.deleted_at.is_(None),
            Quote.created_at >= month_start,
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def quotes_month_approved(
        self, clinic_id: uuid.UUID, month_start: datetime
    ) -> int:
        stmt = select(func.count(Quote.id)).where(
            Quote.clinic_id == clinic_id,
            Quote.deleted_at.is_(None),
            Quote.created_at >= month_start,
            Quote.status.in_(_APPROVED),
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def quotes_month_amount(
        self, clinic_id: uuid.UUID, month_start: datetime
    ) -> Decimal:
        stmt = select(func.coalesce(func.sum(Quote.total), 0)).where(
            Quote.clinic_id == clinic_id,
            Quote.deleted_at.is_(None),
            Quote.created_at >= month_start,
            Quote.status.in_(_APPROVED),
        )
        return Decimal(str((await self._session.execute(stmt)).scalar_one()))

    async def checkins_today(
        self, clinic_id: uuid.UUID, day_start: datetime, day_end: datetime
    ) -> int:
        stmt = select(func.count(CheckIn.id)).where(
            CheckIn.clinic_id == clinic_id,
            CheckIn.checked_in_at >= day_start,
            CheckIn.checked_in_at < day_end,
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def pending_quotes_count(self, clinic_id: uuid.UUID) -> int:
        stmt = select(func.count(Quote.id)).where(
            Quote.clinic_id == clinic_id,
            Quote.deleted_at.is_(None),
            Quote.status.in_(_PENDING),
        )
        return (await self._session.execute(stmt)).scalar_one()

    async def procedures_top(
        self, clinic_id: uuid.UUID, month_start: datetime, limit: int = 5
    ) -> list[tuple[str, int]]:
        count_col = func.count(QuoteItem.id).label("cnt")
        stmt = (
            select(QuoteItem.procedure_name_snapshot, count_col)
            .where(
                QuoteItem.clinic_id == clinic_id,
                QuoteItem.deleted_at.is_(None),
                QuoteItem.created_at >= month_start,
            )
            .group_by(QuoteItem.procedure_name_snapshot)
            .order_by(count_col.desc(), QuoteItem.procedure_name_snapshot.asc())
            .limit(limit)
        )
        rows = (await self._session.execute(stmt)).all()
        return [(r[0], r[1]) for r in rows]
