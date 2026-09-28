"""Dashboard service — monta o overview respeitando o timezone da clínica."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models import User
from src.modules.dashboard.repository import DashboardRepository
from src.modules.dashboard.schemas import (
    DashboardAppointmentOut,
    DashboardOverviewOut,
    DashboardTopProcedureOut,
)
from src.modules.tenancy.models import Clinic


class DashboardService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = DashboardRepository(session)

    async def _clinic_tz(self, clinic_id: uuid.UUID) -> ZoneInfo:
        clinic = await self._session.get(Clinic, clinic_id)
        tz_name = clinic.timezone if clinic and clinic.timezone else "America/Sao_Paulo"
        try:
            return ZoneInfo(tz_name)
        except Exception:
            return ZoneInfo("America/Sao_Paulo")

    async def overview(self, user: User) -> DashboardOverviewOut:
        clinic_id = user.clinic_id
        tz = await self._clinic_tz(clinic_id)

        now_local = datetime.now(tz)
        day_start_local = now_local.replace(hour=0, minute=0, second=0, microsecond=0)
        day_start = day_start_local.astimezone(timezone.utc)
        day_end = day_start_local.replace(hour=23, minute=59, second=59, microsecond=999999).astimezone(
            timezone.utc
        )
        month_start = day_start_local.replace(day=1).astimezone(timezone.utc)

        appts_count = await self._repo.appointments_today_count(clinic_id, day_start, day_end)
        appts_rows = await self._repo.appointments_today_list(clinic_id, day_start, day_end)
        appts_list = [
            DashboardAppointmentOut(
                id=r[0], patient_name=r[1], starts_at=r[2], status=r[3]
            )
            for r in appts_rows
        ]

        patients_total = await self._repo.patients_total(clinic_id)
        patients_new = await self._repo.patients_new_since(clinic_id, month_start)
        quotes_total = await self._repo.quotes_month_total(clinic_id, month_start)
        quotes_approved = await self._repo.quotes_month_approved(clinic_id, month_start)
        quotes_amount = await self._repo.quotes_month_amount(clinic_id, month_start)
        checkins = await self._repo.checkins_today(clinic_id, day_start, day_end)
        pending = await self._repo.pending_quotes_count(clinic_id)
        top_rows = await self._repo.procedures_top(clinic_id, month_start)
        top = [
            DashboardTopProcedureOut(procedure_name=r[0], count=r[1]) for r in top_rows
        ]

        greeting = user.full_name.split(" ")[0] if user.full_name else ""

        return DashboardOverviewOut(
            greeting_name=greeting,
            appointments_today_count=appts_count,
            appointments_today_list=appts_list,
            patients_total=patients_total,
            patients_new_this_month=patients_new,
            quotes_month_total=quotes_total,
            quotes_month_approved=quotes_approved,
            quotes_month_amount=quotes_amount,
            checkins_today=checkins,
            pending_quotes_count=pending,
            procedures_top_5=top,
        )
