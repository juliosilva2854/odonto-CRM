"""Feature Flag Service — per-clinic toggles with in-memory cache."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.tenancy.models import ClinicFeature

_CACHE_TTL = timedelta(seconds=60)


class FeatureFlagService:
    """
    Lookup of enabled features for a clinic. In-memory cache reduces DB hits.
    Cache invalidation: cache expires by TTL OR via `invalidate(clinic_id)`
    (called by FeatureFlagChanged handler in the future).
    """

    _cache: dict[uuid.UUID, tuple[dict[str, dict[str, Any]], datetime]] = {}

    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    @classmethod
    def invalidate(cls, clinic_id: uuid.UUID) -> None:
        cls._cache.pop(clinic_id, None)

    @classmethod
    def invalidate_all(cls) -> None:
        cls._cache.clear()

    async def _load(self, clinic_id: uuid.UUID) -> dict[str, dict[str, Any]]:
        stmt = select(ClinicFeature).where(ClinicFeature.clinic_id == clinic_id)
        result = await self._session.execute(stmt)
        features: dict[str, dict[str, Any]] = {}
        for f in result.scalars():
            features[f.feature_key] = {"enabled": f.enabled, "config": f.config or {}}
        self._cache[clinic_id] = (features, datetime.now(timezone.utc) + _CACHE_TTL)
        return features

    async def get_all(self, clinic_id: uuid.UUID) -> dict[str, dict[str, Any]]:
        cached = self._cache.get(clinic_id)
        if cached and cached[1] > datetime.now(timezone.utc):
            return cached[0]
        return await self._load(clinic_id)

    async def is_enabled(self, clinic_id: uuid.UUID, feature_key: str) -> bool:
        features = await self.get_all(clinic_id)
        return features.get(feature_key, {}).get("enabled", False)
