"""User repository — queries e mutações sobre auth.User no escopo da clínica."""
from __future__ import annotations

import uuid

from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.enums import UserRole
from src.modules.auth.models import User


class UserRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    def add(self, user: User) -> None:
        self._session.add(user)

    async def get(self, clinic_id: uuid.UUID, user_id: uuid.UUID) -> User | None:
        stmt = select(User).where(
            User.id == user_id,
            User.clinic_id == clinic_id,
            User.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_email_global(self, email: str) -> User | None:
        """Email é único globalmente neste MVP (login resolve só por email)."""
        stmt = select(User).where(User.email == email.lower())
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_by_clinic(
        self, clinic_id: uuid.UUID, *, page: int, page_size: int
    ) -> tuple[list[User], int]:
        base = [User.clinic_id == clinic_id, User.deleted_at.is_(None)]
        total = (
            await self._session.execute(select(func.count(User.id)).where(*base))
        ).scalar_one()
        stmt = (
            select(User)
            .where(*base)
            .order_by(desc(User.created_at))
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        items = list((await self._session.execute(stmt)).scalars())
        return items, total

    async def count_active_admins(self, clinic_id: uuid.UUID) -> int:
        stmt = select(func.count(User.id)).where(
            User.clinic_id == clinic_id,
            User.role == UserRole.ADMIN,
            User.is_active.is_(True),
            User.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one()
