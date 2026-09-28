"""Professionals service — listagem e edição de dentistas da clínica."""
from __future__ import annotations

import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import NotFoundError
from src.modules.auth.models import Professional, User
from src.modules.professionals.repository import ProfessionalRepository
from src.modules.professionals.schemas import ProfessionalOut, ProfessionalUpdateIn


class ProfessionalsService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = ProfessionalRepository(session)

    @staticmethod
    def _to_out(prof: Professional, user: User) -> ProfessionalOut:
        return ProfessionalOut(
            id=prof.id,
            user_id=prof.user_id,
            full_name=user.full_name,
            email=user.email,
            cro_number=prof.cro_number,
            cro_state=prof.cro_state,
            specialty=prof.specialty,
            color_hex=prof.color_hex,
            default_commission_pct=prof.default_commission_pct,
            is_active=user.is_active,
            invite_pending=user.last_login_at is None,
        )

    async def list(self, clinic_id: uuid.UUID) -> list[ProfessionalOut]:
        rows = await self._repo.list_with_user(clinic_id)
        return [self._to_out(prof, user) for prof, user in rows]

    async def update(
        self,
        clinic_id: uuid.UUID,
        professional_id: uuid.UUID,
        data: ProfessionalUpdateIn,
    ) -> ProfessionalOut:
        found = await self._repo.get_with_user(clinic_id, professional_id)
        if found is None:
            raise NotFoundError("Profissional n\u00e3o encontrado")
        prof, user = found

        prof.cro_number = data.cro_number
        prof.cro_state = data.cro_state
        prof.specialty = data.specialty
        prof.color_hex = data.color_hex
        prof.default_commission_pct = data.default_commission_pct
        await self._session.flush()

        return self._to_out(prof, user)
