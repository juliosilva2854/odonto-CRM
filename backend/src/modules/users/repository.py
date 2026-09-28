"""User repository — queries e mutações sobre auth.User no escopo da clínica."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import delete, desc, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.auth.enums import UserRole
from src.modules.auth.models import PasswordResetToken, Professional, User


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

    async def count_linked_records(
        self, clinic_id: uuid.UUID, user_id: uuid.UUID
    ) -> int:
        """Conta vínculos que impedem hard delete (agenda + prontuário).

        Importado localmente para evitar acoplamento circular de módulos.
        """
        from src.modules.agenda.models import Appointment
        from src.modules.clinical.records.models import ClinicalRecord

        appts = (
            await self._session.execute(
                select(func.count(Appointment.id)).where(
                    Appointment.clinic_id == clinic_id,
                    Appointment.created_by_user_id == user_id,
                )
            )
        ).scalar_one()
        records = (
            await self._session.execute(
                select(func.count(ClinicalRecord.id)).where(
                    ClinicalRecord.clinic_id == clinic_id,
                    ClinicalRecord.author_user_id == user_id,
                )
            )
        ).scalar_one()
        return int(appts) + int(records)

    async def invalidate_active_reset_tokens(self, user_id: uuid.UUID) -> None:
        """Marca como usados todos os tokens de reset/convite ainda ativos."""
        await self._session.execute(
            update(PasswordResetToken)
            .where(
                PasswordResetToken.user_id == user_id,
                PasswordResetToken.used_at.is_(None),
            )
            .values(used_at=datetime.now(timezone.utc))
        )

    async def hard_delete(self, clinic_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """Remove definitivamente o usuário e dependentes diretos.

        Deleta tokens de reset e professionals antes do próprio user. Vínculos
        restritivos (ex.: appointments.professional_id) disparam IntegrityError,
        tratado na camada de serviço como conflito.
        """
        await self._session.execute(
            delete(PasswordResetToken).where(PasswordResetToken.user_id == user_id)
        )
        await self._session.execute(
            delete(Professional).where(Professional.user_id == user_id)
        )
        await self._session.execute(
            delete(User).where(User.id == user_id, User.clinic_id == clinic_id)
        )
        await self._session.flush()
