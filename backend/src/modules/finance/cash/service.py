"""Cash service — caixa diário (entradas/saídas) + resumos por período."""
from __future__ import annotations

import uuid
from datetime import date as date_cls
from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError
from src.modules.finance.cash.models import CashMovement
from src.modules.finance.cash.repository import CashRepository
from src.modules.finance.cash.schemas import (
    CashDayOut,
    CashMovementIn,
    CashMovementOut,
    CashMovementUpdateIn,
    CashSummaryOut,
)
from src.modules.tenancy.models import Clinic


class CashService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = CashRepository(session)

    async def _clinic_tz(self, clinic_id: uuid.UUID) -> ZoneInfo:
        clinic = await self._session.get(Clinic, clinic_id)
        tz_name = clinic.timezone if clinic and clinic.timezone else "America/Sao_Paulo"
        try:
            return ZoneInfo(tz_name)
        except Exception:
            return ZoneInfo("America/Sao_Paulo")

    def _range_utc(
        self, tz: ZoneInfo, start_date: date_cls, end_date: date_cls
    ) -> tuple[datetime, datetime]:
        start = datetime.combine(start_date, time.min, tzinfo=tz).astimezone(timezone.utc)
        # end é exclusivo: começo do dia seguinte ao end_date
        end = datetime.combine(
            end_date + timedelta(days=1), time.min, tzinfo=tz
        ).astimezone(timezone.utc)
        return start, end

    async def day(self, clinic_id: uuid.UUID, target: date_cls) -> CashDayOut:
        tz = await self._clinic_tz(clinic_id)
        start, end = self._range_utc(tz, target, target)
        movements = await self._repo.list_in_range(clinic_id, start, end)
        income, expense, count = await self._repo.summary_in_range(clinic_id, start, end)
        return CashDayOut(
            date=target.isoformat(),
            movements=[CashMovementOut.model_validate(m) for m in movements],
            summary=CashSummaryOut(
                total_income=income,
                total_expense=expense,
                balance=income - expense,
                count=count,
            ),
        )

    async def summary(
        self, clinic_id: uuid.UUID, start_date: date_cls, end_date: date_cls
    ) -> CashSummaryOut:
        tz = await self._clinic_tz(clinic_id)
        start, end = self._range_utc(tz, start_date, end_date)
        income, expense, count = await self._repo.summary_in_range(clinic_id, start, end)
        return CashSummaryOut(
            total_income=income,
            total_expense=expense,
            balance=income - expense,
            count=count,
        )

    async def create(
        self, clinic_id: uuid.UUID, actor_user_id: uuid.UUID, data: CashMovementIn
    ) -> CashMovement:
        movement = CashMovement(
            clinic_id=clinic_id,
            type=data.type,
            category=data.category,
            description=data.description,
            amount=data.amount,
            payment_method=data.payment_method,
            quote_id=data.quote_id,
            appointment_id=data.appointment_id,
            created_by_user_id=actor_user_id,
        )
        self._repo.add(movement)
        await self._session.flush()
        return movement

    async def update(
        self, clinic_id: uuid.UUID, movement_id: uuid.UUID, data: CashMovementUpdateIn
    ) -> CashMovement:
        movement = await self._repo.get(clinic_id, movement_id)
        if movement is None:
            raise NotFoundError("Movimento n\u00e3o encontrado")
        patch = data.model_dump(exclude_unset=True)
        for field, value in patch.items():
            setattr(movement, field, value)
        await self._session.flush()
        return movement

    async def delete(self, clinic_id: uuid.UUID, movement_id: uuid.UUID) -> None:
        movement = await self._repo.get(clinic_id, movement_id)
        if movement is None:
            raise NotFoundError("Movimento n\u00e3o encontrado")
        movement.deleted_at = datetime.now(timezone.utc)
        await self._session.flush()
