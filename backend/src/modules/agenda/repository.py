"""Agenda repository — queries com tenant scoping."""
from __future__ import annotations

import uuid
from datetime import datetime

from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.modules.agenda.enums import AppointmentStatus
from src.modules.agenda.models import Appointment, CheckIn, Room


class RoomRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, clinic_id: uuid.UUID, room_id: uuid.UUID) -> Room | None:
        stmt = select(Room).where(
            Room.id == room_id,
            Room.clinic_id == clinic_id,
            Room.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_name(self, clinic_id: uuid.UUID, name: str) -> Room | None:
        stmt = select(Room).where(
            Room.clinic_id == clinic_id,
            Room.name == name,
            Room.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list(self, clinic_id: uuid.UUID, *, include_inactive: bool = False) -> list[Room]:
        stmt = select(Room).where(Room.clinic_id == clinic_id, Room.deleted_at.is_(None))
        if not include_inactive:
            stmt = stmt.where(Room.is_active.is_(True))
        stmt = stmt.order_by(Room.name.asc())
        return list((await self._session.execute(stmt)).scalars())

    def add(self, room: Room) -> None:
        self._session.add(room)


class AppointmentRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get(self, clinic_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment | None:
        stmt = select(Appointment).where(
            Appointment.id == appointment_id,
            Appointment.clinic_id == clinic_id,
            Appointment.deleted_at.is_(None),
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_pin(
        self, clinic_id: uuid.UUID, pin_code: str, *, day_start: datetime, day_end: datetime
    ) -> Appointment | None:
        stmt = select(Appointment).where(
            Appointment.clinic_id == clinic_id,
            Appointment.pin_code == pin_code,
            Appointment.deleted_at.is_(None),
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def get_by_qr(
        self, clinic_id: uuid.UUID, qr_token: str, *, day_start: datetime, day_end: datetime
    ) -> Appointment | None:
        stmt = select(Appointment).where(
            Appointment.clinic_id == clinic_id,
            Appointment.qr_token == qr_token,
            Appointment.deleted_at.is_(None),
            Appointment.starts_at >= day_start,
            Appointment.starts_at < day_end,
        )
        return (await self._session.execute(stmt)).scalar_one_or_none()

    async def list_range(
        self,
        clinic_id: uuid.UUID,
        *,
        start: datetime,
        end: datetime,
        professional_id: uuid.UUID | None = None,
        room_id: uuid.UUID | None = None,
        patient_id: uuid.UUID | None = None,
        statuses: list[AppointmentStatus] | None = None,
    ) -> list[Appointment]:
        conditions = [
            Appointment.clinic_id == clinic_id,
            Appointment.deleted_at.is_(None),
            Appointment.starts_at < end,
            Appointment.ends_at > start,
        ]
        if professional_id is not None:
            conditions.append(Appointment.professional_id == professional_id)
        if room_id is not None:
            conditions.append(Appointment.room_id == room_id)
        if patient_id is not None:
            conditions.append(Appointment.patient_id == patient_id)
        if statuses:
            conditions.append(Appointment.status.in_(statuses))

        stmt = (
            select(Appointment)
            .where(and_(*conditions))
            .order_by(Appointment.starts_at.asc())
        )
        return list((await self._session.execute(stmt)).scalars())

    def add(self, appointment: Appointment) -> None:
        self._session.add(appointment)


class CheckInRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def get_by_appointment(self, appointment_id: uuid.UUID) -> CheckIn | None:
        stmt = select(CheckIn).where(CheckIn.appointment_id == appointment_id)
        return (await self._session.execute(stmt)).scalar_one_or_none()

    def add(self, check_in: CheckIn) -> None:
        self._session.add(check_in)
