"""Agenda routes — rooms, appointments, check-in, WebSocket."""
from __future__ import annotations

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.context import get_context
from src.core.database import AsyncSessionLocal, get_db_session
from src.core.feature_flags import require_feature
from src.core.security import TokenError, decode_token
from src.modules.agenda.enums import AppointmentStatus
from src.modules.agenda.realtime import manager
from src.modules.agenda.schemas import (
    AppointmentBoardItem,
    AppointmentCreateIn,
    AppointmentOut,
    AppointmentStatusChangeIn,
    AppointmentUpdateIn,
    CheckInByCodeIn,
    CheckInOut,
    CheckInPublicResult,
    RoomCreateIn,
    RoomOut,
    RoomUpdateIn,
)
from src.modules.agenda.service import (
    AppointmentService,
    CheckInService,
    RoomService,
)
from src.modules.auth.dependencies import require_role
from src.modules.auth.enums import UserRole
from src.modules.auth.models import Professional, User
from src.modules.patients.models import Patient

router = APIRouter(prefix="/api/agenda", tags=["agenda"])


# ── Rooms ────────────────────────────────────────────────────


@router.post(
    "/rooms",
    response_model=RoomOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("agenda"))],
)
async def create_room(
    payload: RoomCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> RoomOut:
    room = await RoomService(session).create(user.clinic_id, payload)
    return RoomOut.model_validate(room)


@router.get("/rooms", response_model=list[RoomOut], dependencies=[Depends(require_feature("agenda"))])
async def list_rooms(
    include_inactive: bool = Query(False),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> list[RoomOut]:
    rooms = await RoomService(session).list(user.clinic_id, include_inactive=include_inactive)
    return [RoomOut.model_validate(r) for r in rooms]


@router.get("/rooms/{room_id}", response_model=RoomOut, dependencies=[Depends(require_feature("agenda"))])
async def get_room(
    room_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> RoomOut:
    room = await RoomService(session).get(user.clinic_id, room_id)
    return RoomOut.model_validate(room)


@router.put("/rooms/{room_id}", response_model=RoomOut, dependencies=[Depends(require_feature("agenda"))])
async def update_room(
    room_id: uuid.UUID,
    payload: RoomUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> RoomOut:
    room = await RoomService(session).update(user.clinic_id, room_id, payload)
    return RoomOut.model_validate(room)


@router.delete(
    "/rooms/{room_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_model=None,
    dependencies=[Depends(require_feature("agenda"))],
)
async def deactivate_room(
    room_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN])),
) -> None:
    await RoomService(session).deactivate(user.clinic_id, room_id)


# ── Appointments ─────────────────────────────────────────────


@router.post(
    "/appointments",
    response_model=AppointmentOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("agenda"))],
)
async def create_appointment(
    payload: AppointmentCreateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> AppointmentOut:
    appointment = await AppointmentService(session).create(user.clinic_id, user.id, payload)
    return AppointmentOut.model_validate(appointment)


@router.get(
    "/appointments",
    response_model=list[AppointmentBoardItem],
    dependencies=[Depends(require_feature("agenda"))],
)
async def list_appointments(
    start: datetime = Query(..., description="Início do intervalo (ISO 8601)"),
    end: datetime = Query(..., description="Fim do intervalo (ISO 8601)"),
    professional_id: uuid.UUID | None = Query(None),
    room_id: uuid.UUID | None = Query(None),
    patient_id: uuid.UUID | None = Query(None),
    statuses: list[AppointmentStatus] | None = Query(None),
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> list[AppointmentBoardItem]:
    appointments = await AppointmentService(session).list_range(
        user.clinic_id,
        start=start,
        end=end,
        professional_id=professional_id,
        room_id=room_id,
        patient_id=patient_id,
        statuses=statuses,
    )

    # Enrich for board view — fetch related names in batch
    patient_ids = {a.patient_id for a in appointments}
    professional_ids = {a.professional_id for a in appointments}
    room_ids = {a.room_id for a in appointments}

    from sqlalchemy import select

    patients_map: dict[uuid.UUID, str] = {}
    if patient_ids:
        rows = (await session.execute(
            select(Patient.id, Patient.full_name).where(Patient.id.in_(patient_ids))
        )).all()
        patients_map = {r[0]: r[1] for r in rows}

    professionals_map: dict[uuid.UUID, str] = {}
    if professional_ids:
        rows = (await session.execute(
            select(Professional.id, User.full_name)
            .join(User, User.id == Professional.user_id)
            .where(Professional.id.in_(professional_ids))
        )).all()
        professionals_map = {r[0]: r[1] for r in rows}

    from src.modules.agenda.models import Room as RoomModel
    rooms_map: dict[uuid.UUID, str] = {}
    if room_ids:
        rows = (await session.execute(
            select(RoomModel.id, RoomModel.name).where(RoomModel.id.in_(room_ids))
        )).all()
        rooms_map = {r[0]: r[1] for r in rows}

    return [
        AppointmentBoardItem(
            id=a.id,
            starts_at=a.starts_at,
            ends_at=a.ends_at,
            status=a.status,
            patient_id=a.patient_id,
            patient_name=patients_map.get(a.patient_id, "—"),
            professional_id=a.professional_id,
            professional_name=professionals_map.get(a.professional_id, "—"),
            room_id=a.room_id,
            room_name=rooms_map.get(a.room_id, "—"),
            procedure_hint=a.procedure_hint,
            confirmed_at=a.confirmed_at,
        )
        for a in appointments
    ]


@router.get(
    "/appointments/{appointment_id}",
    response_model=AppointmentOut,
    dependencies=[Depends(require_feature("agenda"))],
)
async def get_appointment(
    appointment_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> AppointmentOut:
    appointment = await AppointmentService(session).get(user.clinic_id, appointment_id)
    return AppointmentOut.model_validate(appointment)


@router.put(
    "/appointments/{appointment_id}",
    response_model=AppointmentOut,
    dependencies=[Depends(require_feature("agenda"))],
)
async def update_appointment(
    appointment_id: uuid.UUID,
    payload: AppointmentUpdateIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> AppointmentOut:
    appointment = await AppointmentService(session).update(
        user.clinic_id, appointment_id, user.id, payload
    )
    return AppointmentOut.model_validate(appointment)


@router.post(
    "/appointments/{appointment_id}/status",
    response_model=AppointmentOut,
    dependencies=[Depends(require_feature("agenda"))],
    summary="Transição de status (state machine valida)",
)
async def change_status(
    appointment_id: uuid.UUID,
    payload: AppointmentStatusChangeIn,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> AppointmentOut:
    appointment = await AppointmentService(session).change_status(
        user.clinic_id,
        appointment_id,
        user.id,
        payload.new_status,
        reason=payload.reason,
    )
    return AppointmentOut.model_validate(appointment)


@router.post(
    "/appointments/{appointment_id}/regenerate-codes",
    response_model=AppointmentOut,
    dependencies=[Depends(require_feature("agenda"))],
    summary="Regenera PIN + QR Token (admin/recepção)",
)
async def regenerate_codes(
    appointment_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION])),
) -> AppointmentOut:
    appointment = await AppointmentService(session).regenerate_checkin_codes(
        user.clinic_id, appointment_id
    )
    return AppointmentOut.model_validate(appointment)


# ── Check-in ─────────────────────────────────────────────────


@router.post(
    "/appointments/{appointment_id}/checkin",
    response_model=CheckInOut,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_feature("checkin"))],
    summary="Check-in MANUAL pela recepção",
)
async def checkin_manual(
    appointment_id: uuid.UUID,
    session: AsyncSession = Depends(get_db_session),
    user: User = Depends(require_role([UserRole.ADMIN, UserRole.RECEPTION, UserRole.DENTIST])),
) -> CheckInOut:
    ctx = get_context()
    check_in = await CheckInService(session).checkin_manual(
        user.clinic_id, appointment_id, user, ctx.ip
    )
    return CheckInOut.model_validate(check_in)


@router.post(
    "/checkin/by-code",
    response_model=CheckInPublicResult,
    summary="Check-in PÚBLICO por PIN (4 dígitos) ou QR Token — sem autenticação",
)
async def checkin_by_code(
    payload: CheckInByCodeIn,
    session: AsyncSession = Depends(get_db_session),
) -> CheckInPublicResult:
    ctx = get_context()
    try:
        appointment, _check_in = await CheckInService(session).checkin_by_code(
            payload.clinic_id, payload.code, ip=ctx.ip
        )
    except Exception as exc:  # noqa: BLE001
        # Don't leak which code is valid — generic message.
        return CheckInPublicResult(ok=False, message=str(exc) if hasattr(exc, "message") else "Não foi possível confirmar o check-in")

    # Fetch lightweight details for confirmation UI
    from sqlalchemy import select

    from src.modules.agenda.models import Room as RoomModel

    patient = await session.get(Patient, appointment.patient_id)
    professional_row = (await session.execute(
        select(User.full_name)
        .join(Professional, Professional.user_id == User.id)
        .where(Professional.id == appointment.professional_id)
    )).scalar_one_or_none()
    room = await session.get(RoomModel, appointment.room_id)

    first_name = patient.full_name.split(" ")[0] if patient and patient.full_name else None
    return CheckInPublicResult(
        ok=True,
        appointment_id=appointment.id,
        patient_first_name=first_name,
        professional_name=professional_row,
        room_name=room.name if room else None,
        starts_at=appointment.starts_at,
        message="Check-in realizado com sucesso. Aguarde na sala de espera.",
    )


# ── WebSocket — live agenda updates ──────────────────────────


@router.websocket("/ws")
async def agenda_ws(websocket: WebSocket, token: str = Query(...)) -> None:
    """
    WebSocket scoped to the clinic of the authenticated user.
    Client provides JWT access_token via `?token=...` (browsers can't send custom headers on WS).
    Server pushes JSON on every agenda event in the clinic.
    """
    try:
        claims = decode_token(token)
        if claims.get("type") != "access":
            await websocket.close(code=1008, reason="invalid_token_type")
            return
        clinic_id = uuid.UUID(claims["clinic_id"])
    except (TokenError, KeyError, ValueError):
        await websocket.close(code=1008, reason="invalid_token")
        return

    await manager.connect(clinic_id, websocket)
    try:
        # Send initial hello so client can confirm channel
        await websocket.send_json({"type": "system.connected", "clinic_id": str(clinic_id)})
        while True:
            # We don't expect client → server messages beyond heartbeat pings.
            msg = await websocket.receive_text()
            if msg.strip() == "ping":
                await websocket.send_json({"type": "system.pong"})
    except WebSocketDisconnect:
        pass
    finally:
        await manager.disconnect(clinic_id, websocket)


@router.get("/ws/stats", include_in_schema=False)
async def ws_stats(user: User = Depends(require_role([UserRole.ADMIN]))) -> dict:
    return {"connections_per_clinic": manager.stats()}


# Keep AsyncSessionLocal usage explicit (lint-friendly) — used here so type checkers
# do not warn about implicit unused imports.
_ = AsyncSessionLocal
