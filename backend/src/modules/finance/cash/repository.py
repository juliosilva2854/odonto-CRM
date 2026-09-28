"""Cash repository — sempre no escopo da clínica."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.finance.cash.enums import CashMovementType
from src.modules.finance.cash.models import CashMovement


class CashRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, movement: CashMovement) -> None:
        self._session.add(movement)

    async def get(
        self, clinic_id: uuid.UUID, movement_id: uuid.UUID
    ) -> CashMovement | None:
        stmt = select(CashMovement).where(
            CashMovement.id == movement_id,
            CashMovement.clinic_id == clinic_id,
            CashMovement.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_in_range(
        self, clinic_id: uuid.UUID, start: datetime, end: datetime
    ) -> list[CashMovement]:
        stmt = (
            select(CashMovement)
            .where(
                CashMovement.clinic_id == clinic_id,
                CashMovement.deleted_at.is_(None),
                CashMovement.created_at >= start,
                CashMovement.created_at < end,
            )
            .order_by(desc(CashMovement.created_at))
        )
        return list((await self._session.execute(stmt)).scalars())

    async def summary_in_range(
        self, clinic_id: uuid.UUID, start: datetime, end: datetime
    ) -> tuple[Decimal, Decimal, int]:
        income_col = func.coalesce(
            func.sum(CashMovement.amount).filter(
                CashMovement.type == CashMovementType.INCOME.value
            ),
            0,
        )
        expense_col = func.coalesce(
            func.sum(CashMovement.amount).filter(
                CashMovement.type == CashMovementType.EXPENSE.value
            ),
            0,
        )
        stmt = select(
            income_col,
            expense_col,
            func.count(CashMovement.id),
        ).where(
            CashMovement.clinic_id == clinic_id,
            CashMovement.deleted_at.is_(None),
            CashMovement.created_at >= start,
            CashMovement.created_at < end,
        )
        row = (await self._session.execute(stmt)).one()
        return (Decimal(str(row[0])), Decimal(str(row[1])), int(row[2]))
