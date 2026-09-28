"""Users service — convite, listagem, mudança de papel e desativação.

Proteções de integridade organizacional:
- Não rebaixar/desativar o último admin ativo da clínica.
- Não permitir que o usuário desative a própria conta.

O convite cria um usuário inativo (sem senha utilizável) e dispara o mesmo
fluxo de token do reset de senha — quando o convidado define a senha via
``/api/auth/reset-password`` a conta é ativada.
"""
from __future__ import annotations

import secrets
import uuid

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ConflictError, NotFoundError, ValidationError
from src.core.security import hash_password
from src.modules.auth.enums import UserRole
from src.modules.auth.models import Professional, User
from src.modules.auth.service import AuthService
from src.modules.users.repository import UserRepository
from src.modules.users.schemas import UserInviteIn


class UsersService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = UserRepository(session)

    async def invite(
        self, clinic_id: uuid.UUID, actor: User, data: UserInviteIn
    ) -> tuple[User, Professional | None]:
        email = data.email.lower()
        if await self._repo.get_by_email_global(email) is not None:
            raise ConflictError("This email is already registered")

        user = User(
            clinic_id=clinic_id,
            email=email,
            # Senha aleatória inutilizável: só vale após o convidado definir a dele.
            password_hash=hash_password(secrets.token_urlsafe(24)),
            full_name=data.full_name,
            role=data.role,
            is_active=False,
        )
        self._repo.add(user)
        await self._session.flush()

        # Dentista precisa de um Professional para aparecer na agenda. Criamos
        # com placeholders (admin edita CRO/especialidade depois) na MESMA transação.
        professional: Professional | None = None
        if data.role == UserRole.DENTIST:
            professional = Professional(
                user_id=user.id,
                clinic_id=clinic_id,
                cro_number="00000",
                cro_state="SP",
                specialty="Clínica Geral",
                color_hex="#3B82F6",
                default_commission_pct=40.00,
            )
            self._session.add(professional)
            await self._session.flush()

        # Reaproveita o fluxo de token do reset (mesmo token, mesma rota).
        await AuthService(self._session).issue_reset_token(user, is_invite=True)
        return user, professional

    async def list(
        self, clinic_id: uuid.UUID, *, page: int, page_size: int
    ) -> tuple[list[User], int]:
        return await self._repo.list_by_clinic(clinic_id, page=page, page_size=page_size)

    async def update_role(
        self,
        clinic_id: uuid.UUID,
        actor: User,
        user_id: uuid.UUID,
        new_role: UserRole,
    ) -> User:
        user = await self._repo.get(clinic_id, user_id)
        if user is None:
            raise NotFoundError("User not found")

        # Rebaixar o último admin ativo deixaria a clínica sem gestor.
        if (
            user.role == UserRole.ADMIN
            and new_role != UserRole.ADMIN
            and user.is_active
            and await self._repo.count_active_admins(clinic_id) <= 1
        ):
            raise ConflictError(
                "Cannot demote the last active admin", code="last_admin"
            )

        user.role = new_role
        await self._session.flush()
        return user

    async def deactivate(
        self, clinic_id: uuid.UUID, actor: User, user_id: uuid.UUID
    ) -> User:
        if user_id == actor.id:
            raise ValidationError(
                "You cannot deactivate your own account",
                code="cannot_deactivate_self",
            )

        user = await self._repo.get(clinic_id, user_id)
        if user is None:
            raise NotFoundError("User not found")

        if (
            user.role == UserRole.ADMIN
            and user.is_active
            and await self._repo.count_active_admins(clinic_id) <= 1
        ):
            raise ConflictError(
                "Cannot deactivate the last active admin", code="last_admin"
            )

        user.is_active = False
        await self._session.flush()
        return user

    async def hard_delete(
        self, clinic_id: uuid.UUID, actor: User, user_id: uuid.UUID
    ) -> None:
        """Remoção definitiva (irreversível). Protege último admin e o próprio.

        A checagem de "último admin" vem ANTES da de auto-remoção: se você é o
        único admin ativo, remover a própria conta deixaria a clínica órfã →
        409 last_admin. Havendo outro admin ativo, a auto-remoção cai em 422.
        """
        user = await self._repo.get(clinic_id, user_id)
        if user is None:
            raise NotFoundError("User not found")

        if (
            user.role == UserRole.ADMIN
            and user.is_active
            and await self._repo.count_active_admins(clinic_id) <= 1
        ):
            raise ConflictError(
                "Cannot delete the last active admin", code="last_admin"
            )

        if user_id == actor.id:
            raise ValidationError(
                "You cannot delete your own account",
                code="cannot_delete_self",
            )

        # Vínculos de autoria (agenda/prontuário) exigem manter o histórico.
        if await self._repo.count_linked_records(clinic_id, user_id) > 0:
            raise ConflictError(
                "User has linked records; deactivate instead of deleting",
                code="has_linked_records",
            )

        try:
            await self._repo.hard_delete(clinic_id, user_id)
        except IntegrityError as exc:
            # Ex.: appointments.professional_id (RESTRICT) referenciando o dentista.
            raise ConflictError(
                "User has linked records; deactivate instead of deleting",
                code="has_linked_records",
            ) from exc

    async def resend_invite(
        self, clinic_id: uuid.UUID, actor: User, user_id: uuid.UUID
    ) -> str:
        """Reenvia o convite (novo token) para um usuário que nunca acessou."""
        user = await self._repo.get(clinic_id, user_id)
        if user is None:
            raise NotFoundError("User not found")

        if user.last_login_at is not None:
            raise ConflictError(
                "User has already logged in; cannot resend invite",
                code="already_active",
            )

        # Invalida convites/resets antigos antes de emitir um novo.
        await self._repo.invalidate_active_reset_tokens(user_id)
        await AuthService(self._session).issue_reset_token(user, is_invite=True)
        return user.email
