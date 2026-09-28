"""Professionals service — listagem de dentistas da clínica."""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.modules.professionals.repository import ProfessionalRepository
from src.modules.professionals.schemas import ProfessionalOut


class ProfessionalsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ProfessionalRepository(session)

    async def list(self, clinic_id: uuid.UUID) -> list[ProfessionalOut]:
        rows = await self._repo.list_with_user(clinic_id)
        return [
            ProfessionalOut(
                id=prof.id,
                user_id=prof.user_id,
                full_name=user.full_name,
                email=user.email,
                cro_number=prof.cro_number,
                cro_state=prof.cro_state,
                specialty=prof.specialty,
                color_hex=prof.color_hex,
            )
            for prof, user in rows
        ]
