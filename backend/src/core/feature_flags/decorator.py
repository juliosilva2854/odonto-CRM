"""FastAPI dependency to require a feature flag enabled for the current clinic."""
from __future__ import annotations

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import get_context
from src.core.database import get_db_session
from src.core.errors import FeatureNotEnabledError, UnauthorizedError
from src.core.feature_flags.service import FeatureFlagService


def require_feature(feature_key: str):
    """Use as a route dependency:

    >>> @router.get("/x", dependencies=[Depends(require_feature("commission_split"))])
    """

    async def _checker(session: AsyncSession = Depends(get_db_session)) -> None:
        ctx = get_context()
        if ctx.clinic_id is None:
            raise UnauthorizedError("Authentication required")
        service = FeatureFlagService(session)
        if not await service.is_enabled(ctx.clinic_id, feature_key):
            raise FeatureNotEnabledError(
                f"Feature '{feature_key}' not enabled",
                details={"feature": feature_key},
            )

    return _checker
