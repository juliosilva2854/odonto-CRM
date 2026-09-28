"""Cash routes — caixa diário."""
from __future__ import annotations

import uuid
from datetime import date as date_cls

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.finance.cash.schemas import (
    CashDayOut,
    CashMovementIn,
    CashMovementOut,
    CashMovementUpdateIn,
    CashSummaryOut,
)
from src.modules.finance.cash.service import CashService

router = APIRouter(prefix="/api/finance/cash", tags=["finance-cash"])

_ROLES = [UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION]


@router.get(
    "",
    response_model=CashDayOut,
    dependencies=[Depends(require_feature("financial_core"))],
    summary="Movimentos do dia + totais",
)
async def get_cash_day(
    date: date_cls | None = Query(default=None),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> CashDayOut:
    target = date or date_cls.today()
    return await CashService(session).day(user.clinic_id, target)


@router.get(
    "/summary",
    response_model=CashSummaryOut,
    dependencies=[Depends(require_feature("financial_core"))],
    summary="Resumo agregado por per\u00edodo",
)
async def get_cash_summary(
    start: date_cls = Query(...),
    end: date_cls = Query(...),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> CashSummaryOut:
    return await CashService(session).summary(user.clinic_id, start, end)


@router.post(
    "",
    response_model=CashMovementOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("financial_core"))],
    summary="Cria um movimento de caixa",
)
async def create_cash_movement(
    payload: CashMovementIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> CashMovementOut:
    movement = await CashService(session).create(user.clinic_id, user.id, payload)
    return CashMovementOut.model_validate(movement)


@router.put(
    "/{movement_id}",
    response_model=CashMovementOut,
    dependencies=[Depends(require_feature("financial_core"))],
    summary="Edita um movimento de caixa",
)
async def update_cash_movement(
    movement_id: uuid.UUID,
    payload: CashMovementUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> CashMovementOut:
    movement = await CashService(session).update(user.clinic_id, movement_id, payload)
    return CashMovementOut.model_validate(movement)


@router.delete(
    "/{movement_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    dependencies=[Depends(require_feature("financial_core"))],
    summary="Remove (soft delete) um movimento de caixa",
)
async def delete_cash_movement(
    movement_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role(_ROLES)),
) -> None:
    await CashService(session).delete(user.clinic_id, movement_id)
