"""Dashboard routes — overview de KPIs da clínica."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.dashboard.schemas import DashboardOverviewOut
from src.modules.dashboard.service import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get(
    "/overview",
    response_model=DashboardOverviewOut,
    summary="KPIs agregados da clínica (agenda, pacientes, orçamentos)",
)
async def dashboard_overview(
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(
        require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])
    ),
) -> DashboardOverviewOut:
    return await DashboardService(session).overview(user)
