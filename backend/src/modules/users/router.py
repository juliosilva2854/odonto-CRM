"""User management routes — admin-only."""
from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.database import get_db_session
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import User
from src.modules.users.schemas import (
    InvitedUserOut,
    ResendInviteOut,
    UserInviteIn,
    UserOut,
    UserRoleUpdateIn,
)
from src.modules.users.service import UsersService
from src.shared.schemas.pagination import Page

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post(
    "/invite",
    response_model=InvitedUserOut,
    status_code=status.HTTP_201_CREATED,
    summary="Convida um novo usuário (cria conta inativa + envia token de definição de senha)",
)
async def invite_user(
    payload: UserInviteIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> InvitedUserOut:
    created, professional = await UsersService(session).invite(
        user.clinic_id, user, payload
    )
    return InvitedUserOut(
        **UserOut.model_validate(created).model_dump(),
        professional_id=professional.id if professional else None,
    )


@router.get("", response_model=Page[UserOut])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> Page[UserOut]:
    items, total = await UsersService(session).list(
        user.clinic_id, page=page, page_size=page_size
    )
    return Page[UserOut](
        items=[UserOut.model_validate(u) for u in items],
        page=page,
        page_size=page_size,
        total=total,
    )


@router.put("/{user_id}/role", response_model=UserOut)
async def update_user_role(
    user_id: uuid.UUID,
    payload: UserRoleUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> UserOut:
    updated = await UsersService(session).update_role(
        user.clinic_id, user, user_id, payload.role
    )
    return UserOut.model_validate(updated)


@router.delete("/{user_id}", response_model=UserOut)
async def deactivate_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> UserOut:
    deactivated = await UsersService(session).deactivate(user.clinic_id, user, user_id)
    return UserOut.model_validate(deactivated)


@router.delete(
    "/{user_id}/hard",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    summary="Exclui o usuário definitivamente (irreversível)",
)
async def hard_delete_user(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    await UsersService(session).hard_delete(user.clinic_id, user, user_id)


@router.post(
    "/{user_id}/resend-invite",
    response_model=ResendInviteOut,
    summary="Reenvia o convite (novo token) para um usuário que nunca acessou",
)
async def resend_invite(
    user_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> ResendInviteOut:
    email = await UsersService(session).resend_invite(user.clinic_id, user, user_id)
    return ResendInviteOut(sent=True, email=email)
