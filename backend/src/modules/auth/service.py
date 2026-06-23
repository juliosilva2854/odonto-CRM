"""Auth service — login, refresh, fetch current user."""
from __future__ import annotations

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.errors import UnauthorizedError
from src.core.security import (
    TokenError,
    create_access_token,
    create_refresh_token,
    decode_token,
    verify_password,
)
from src.modules.auth.models import User

_settings = get_settings()


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
