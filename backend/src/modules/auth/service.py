"""Auth service — login, refresh, fetch current user, password reset."""
from __future__ import annotations

import hashlib
import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core import email_client
from src.core.config import get_settings
from src.core.errors import AppException, UnauthorizedError
from src.core.logging import get_logger
from src.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from src.modules.auth.models import PasswordResetToken, User

_settings = get_settings()
log = get_logger(__name__)

# Janela de validade do token de reset/convite.
RESET_TOKEN_TTL_HOURS = 1


def _hash_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


class AuthService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def login(self, email: str, password: str) -> tuple[User, str, str]:
        stmt = select(User).where(User.email == email.lower(), User.is_active.is_(True))
        user = (await self._session.execute(stmt)).scalar_one_or_none()

        # Avoid user enumeration: same error for wrong email / wrong password.
        if user is None or not verify_password(password, user.password_hash):
            raise UnauthorizedError("Invalid credentials")

        access = create_access_token(subject=user.id, clinic_id=user.clinic_id, role=user.role.value)
        refresh = create_refresh_token(subject=user.id, clinic_id=user.clinic_id)
        return user, access, refresh

    async def refresh(self, refresh_token: str) -> tuple[User, str, str]:
        try:
            claims = decode_token(refresh_token)
        except TokenError as exc:
            raise UnauthorizedError("Invalid refresh token") from exc

        if claims.get("type") != "refresh":
            raise UnauthorizedError("Invalid token type")

        user_id = uuid.UUID(claims["sub"])
        user = await self._session.get(User, user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError("User inactive or not found")

        access = create_access_token(subject=user.id, clinic_id=user.clinic_id, role=user.role.value)
        new_refresh = create_refresh_token(subject=user.id, clinic_id=user.clinic_id)
        return user, access, new_refresh

    async def get_user(self, user_id: uuid.UUID) -> User:
        user = await self._session.get(User, user_id)
        if user is None or not user.is_active:
            raise UnauthorizedError("User inactive or not found")
        return user

    # ── Password reset / invite ──────────────────────────────

    async def issue_reset_token(self, user: User, *, is_invite: bool = False) -> None:
        """Gera um token de uso único (1h), persiste só o hash e dispara o e-mail.

        Reutilizado tanto pelo forgot-password quanto pelo convite de usuário.
        Falha no envio de e-mail é logada mas NÃO propaga (o token já existe).
        """
        raw = secrets.token_urlsafe(32)
        now = datetime.now(timezone.utc)
        self._session.add(
            PasswordResetToken(
                user_id=user.id,
                clinic_id=user.clinic_id,
                token_hash=_hash_token(raw),
                purpose="invite" if is_invite else "reset",
                expires_at=now + timedelta(hours=RESET_TOKEN_TTL_HOURS),
            )
        )
        await self._session.flush()

        reset_url = f"{_settings.FRONTEND_BASE_URL}/reset-password?token={raw}"
        try:
            await email_client.send_password_reset_email(
                to=user.email, reset_url=reset_url, is_invite=is_invite
            )
        except Exception as exc:  # noqa: BLE001 — e-mail nunca deve derrubar o fluxo
            log.exception(
                "password_reset_email_failed", user_id=str(user.id), error=str(exc)
            )

    async def request_password_reset(self, email: str) -> None:
        """Anti-enumeration: sempre silencioso. Só gera token se o usuário existir."""
        stmt = select(User).where(
            User.email == email.lower(), User.is_active.is_(True)
        )
        user = (await self._session.execute(stmt)).scalar_one_or_none()
        if user is None:
            log.info("password_reset_requested_unknown_email")
            return
        await self.issue_reset_token(user, is_invite=False)

    async def reset_password(self, token: str, new_password: str) -> None:
        now = datetime.now(timezone.utc)
        stmt = select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(token),
            PasswordResetToken.deleted_at.is_(None),
        )
        record = (await self._session.execute(stmt)).scalar_one_or_none()

        if (
            record is None
            or record.used_at is not None
            or record.expires_at <= now
        ):
            raise AppException(
                "Invalid or expired token",
                code="invalid_token",
                status_code=400,
            )

        user = await self._session.get(User, record.user_id)
        if user is None:
            raise AppException(
                "Invalid or expired token",
                code="invalid_token",
                status_code=400,
            )

        user.password_hash = hash_password(new_password)
        user.is_active = True  # ativa contas convidadas ao definir a senha
        record.used_at = now
        await self._session.flush()
        log.info("password_reset_completed", user_id=str(user.id))
