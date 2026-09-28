"""Professional repository — queries no escopo da clínica (JOIN em User)."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.models import Professional, User


class ProfessionalRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def list_with_user(
        self, clinic_id: uuid.UUID
    ) -> list[tuple[Professional, User]]:
        """Retorna (Professional, User) dos dentistas ATIVOS da clínica.

        Ordenado por User.full_name. Filtra clinic_id + User.is_active + soft-delete.
        """
        stmt = (
            select(Professional, User)
            .join(User, User.id == Professional.user_id)
            .where(
                Professional.clinic_id == clinic_id,
                Professional.deleted_at.is_(None),
                User.is_active.is_(True),
                User.deleted_at.is_(None),
            )
            .order_by(User.full_name.asc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [(row[0], row[1]) for row in rows]
