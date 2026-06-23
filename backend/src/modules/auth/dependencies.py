"""Auth deps — current user resolver + RBAC guard."""
from __future__ import annotations

from collections.abc import Iterable

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import get_context
from src.core.database import get_db_session
from src.core.errors import ForbiddenError, UnauthorizedError
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.auth.service import AuthService


async def get_current_user(
    session: AsyncSession = Depends(get_db_session),
) -> User:
    ctx = get_context()
    if ctx.user_id is None:
        raise UnauthorizedError("Authentication required")
    return await AuthService(session).get_user(ctx.user_id)


def require_role(allowed: Iterable[UserRole]):
    allowed_set = {r.value if isinstance(r, UserRole) else r for r in allowed}

    async def _checker(user: User = Depends(get_current_user)) -> User:
        if user.role.value not in allowed_set:
            raise ForbiddenError(
                "Insufficient role",
                details={"required": sorted(allowed_set), "actual": user.role.value},
            )
        return user

    return _checker
