"""Quote repositories."""
from __future__ import annotations

import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.finance.quotes.models import Quote, QuoteItem


class QuoteRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, quote: Quote) -> None:
        self._session.add(quote)

    async def get(
        self, clinic_id: uuid.UUID, quote_id: uuid.UUID
    ) -> Quote | None:
        stmt = (
            select(Quote)
            .where(
                Quote.id == quote_id,
                Quote.clinic_id == clinic_id,
                Quote.deleted_at.is_(None),
            )
            .options(selectinload(Quote.items))
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_by_clinic(
        self,
        clinic_id: uuid.UUID,
        *,
        patient_id: uuid.UUID | None,
        status_in: list[str] | None,
        page: int,
        page_size: int,
    ) -> tuple[list[Quote], int]:
        base = [Quote.clinic_id == clinic_id, Quote.deleted_at.is_(None)]
        if patient_id:
            base.append(Quote.patient_id == patient_id)
        if status_in:
            base.append(Quote.status.in_(status_in))

        total = (
            await self._session.execute(select(func.count(Quote.id)).where(*base))
        ).scalar_one()

        stmt = (
            select(Quote)
            .where(*base)
            .order_by(desc(Quote.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
            .options(selectinload(Quote.items))
        )
        items = list((await self._session.execute(stmt)).scalars())
        return items, total

    async def next_number(self, clinic_id: uuid.UUID, year: int) -> str:
        """Generate next humanly-friendly number per clinic+year: ORC-YYYY-NNNNNN."""
        prefix = f"ORC-{year}-"
        stmt = (
            select(func.count(Quote.id))
            .where(
                Quote.clinic_id == clinic_id,
                Quote.number.like(f"{prefix}%"),
            )
        )
        count = (await self._session.execute(stmt)).scalar_one()
        return f"{prefix}{count + 1:06d}"


class QuoteItemRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(
        self, clinic_id: uuid.UUID, item_id: uuid.UUID
    ) -> QuoteItem | None:
        stmt = select(QuoteItem).where(
            QuoteItem.id == item_id,
            QuoteItem.clinic_id == clinic_id,
            QuoteItem.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()
