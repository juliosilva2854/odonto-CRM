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
        """Retorna (Professional, User) de TODOS os dentistas da clínica.

        Inclui inativos (convite pendente). Só exclui usuários soft-deletados.
        Ordenado por User.full_name.
        """
        stmt = (
            select(Professional, User)
            .join(User, User.id == Professional.user_id)
            .where(
                Professional.clinic_id == clinic_id,
                Professional.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
            .order_by(User.full_name.asc())
        )
        rows = (await self._session.execute(stmt)).all()
        return [(row[0], row[1]) for row in rows]

    async def get_with_user(
        self, clinic_id: uuid.UUID, professional_id: uuid.UUID
    ) -> tuple[Professional, User] | None:
        """Retorna (Professional, User) de um dentista específico da clínica."""
        stmt = (
            select(Professional, User)
            .join(User, User.id == Professional.user_id)
            .where(
                Professional.id == professional_id,
                Professional.clinic_id == clinic_id,
                Professional.deleted_at.is_(None),
                User.deleted_at.is_(None),
            )
        )
        row = (await self._session.execute(stmt)).first()
        if row is None:
            return None
        return (row[0], row[1])
