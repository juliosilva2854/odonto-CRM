"""Tenancy service: read/update clinic config, features and subscription state."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError
from src.core.feature_flags.service import FeatureFlagService
from src.modules.tenancy.models import Clinic, ClinicFeature, SubscriptionStatus


class TenancyService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_clinic(self, clinic_id: uuid.UUID) -> Clinic:
        clinic = await self._session.get(Clinic, clinic_id)
        if not clinic:
            raise NotFoundError("Clinic not found")
        return clinic

    async def is_subscription_active(self, clinic_id: uuid.UUID) -> bool:
        """Return True when the clinic is allowed to use paid features.

        Rules:
        - ``active``   → always True
        - ``trialing`` → True only while ``trial_ends_at`` is in the future
          (a ``trialing`` clinic without ``trial_ends_at`` is treated as expired)
        - ``past_due`` / ``canceled`` → False
        """
        clinic = await self.get_clinic(clinic_id)

        if clinic.subscription_status == SubscriptionStatus.ACTIVE:
            return True

        if clinic.subscription_status == SubscriptionStatus.TRIALING:
            if clinic.trial_ends_at is None:
                return False
            return clinic.trial_ends_at > datetime.now(timezone.utc)

        return False

    async def list_features(self, clinic_id: uuid.UUID) -> list[ClinicFeature]:
        stmt = select(ClinicFeature).where(ClinicFeature.clinic_id == clinic_id).order_by(
            ClinicFeature.feature_key
        )
        result = await self._session.execute(stmt)
        return list(result.scalars())

    async def set_feature(
        self,
        clinic_id: uuid.UUID,
        feature_key: str,
        *,
        enabled: bool,
        config: dict[str, Any] | None = None,
    ) -> ClinicFeature:
        stmt = select(ClinicFeature).where(
            ClinicFeature.clinic_id == clinic_id,
            ClinicFeature.feature_key == feature_key,
        )
        feature = (await self._session.execute(stmt)).scalar_one_or_none()
        if feature is None:
            feature = ClinicFeature(
                clinic_id=clinic_id,
                feature_key=feature_key,
                enabled=enabled,
                config=config or {},
            )
            self._session.add(feature)
        else:
            feature.enabled = enabled
            if config is not None:
                feature.config = config
        await self._session.flush()
        FeatureFlagService.invalidate(clinic_id)
        return feature
