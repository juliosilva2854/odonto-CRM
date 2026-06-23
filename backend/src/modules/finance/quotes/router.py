"""Quote routes."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.core.feature_flags import require_feature
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.finance.quotes.enums import QuoteStatus
from src.modules.finance.quotes.schemas import (
    CancelIn,
    QuoteCreateIn,
    QuoteItemOut,
    QuoteOut,
    RejectIn,
)
from src.modules.finance.quotes.service import QuoteService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/finance/quotes", tags=["finance-quotes"])


@router.post(
    "",
    response_model=QuoteOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("quotes"))],
    summary="Cria um orçamento (snapshots de preço/comissão são congelados aqui)",
)
async def create_quote(
    payload: QuoteCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteOut:
    quote = await QuoteService(session).create(user.clinic_id, user.id, payload)
    return QuoteOut.model_validate(quote)


@router.get(
    "",
    response_model=Page[QuoteOut],
    dependencies=[Depends(require_feature("quotes"))],
)
async def list_quotes(
    patient_id: uuid.UUID | None = None,
    status_in: list[QuoteStatus] | None = Query(default=None, alias="status"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> Page[QuoteOut]:
    items, total = await QuoteService(session).list_by_clinic(
        user.clinic_id,
        patient_id=patient_id,
        status_in=[s.value for s in status_in] if status_in else None,
        page=page,
        page_size=page_size,
    )
    return Page[QuoteOut](
        items=[QuoteOut.model_validate(q) for q in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.get(
    "/{quote_id}",
    response_model=QuoteOut,
    dependencies=[Depends(require_feature("quotes"))],
)
async def get_quote(
    quote_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteOut:
    quote = await QuoteService(session).get(user.clinic_id, quote_id)
    return QuoteOut.model_validate(quote)


# ── Approval / rejection (item-level) ─────────────────────────


@router.post(
    "/{quote_id}/items/{item_id}/approve",
    response_model=QuoteItemOut,
    dependencies=[Depends(require_feature("quotes"))],
    summary="Aprova um item do orçamento (dispara bridge para o odontograma)",
)
async def approve_item(
    quote_id: uuid.UUID,
    item_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteItemOut:
    item, _quote = await QuoteService(session).approve_item(
        user.clinic_id, quote_id, item_id, user.id
    )
    return QuoteItemOut.model_validate(item)


@router.post(
    "/{quote_id}/items/{item_id}/reject",
    response_model=QuoteItemOut,
    dependencies=[Depends(require_feature("quotes"))],
)
async def reject_item(
    quote_id: uuid.UUID,
    item_id: uuid.UUID,
    payload: RejectIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteItemOut:
    item, _quote = await QuoteService(session).reject_item(
        user.clinic_id, quote_id, item_id, user.id, payload
    )
    return QuoteItemOut.model_validate(item)


# ── Quote-level actions ───────────────────────────────────────


@router.post(
    "/{quote_id}/approve",
    response_model=QuoteOut,
    dependencies=[Depends(require_feature("quotes"))],
    summary="Aprova todos os itens pendentes (bulk)",
)
async def approve_quote(
    quote_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteOut:
    quote = await QuoteService(session).approve_quote(user.clinic_id, quote_id, user.id)
    return QuoteOut.model_validate(quote)


@router.post(
    "/{quote_id}/cancel",
    response_model=QuoteOut,
    dependencies=[Depends(require_feature("quotes"))],
)
async def cancel_quote(
    quote_id: uuid.UUID,
    payload: CancelIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.DENTIST, UserRole.RECEPTION])),
) -> QuoteOut:
    quote = await QuoteService(session).cancel(
        user.clinic_id, quote_id, user.id, payload
    )
    return QuoteOut.model_validate(quote)
