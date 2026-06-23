"""Agenda services: Rooms + Appointments + Check-in.

The tri-resource conflict prevention lives in the database (EXCLUDE USING gist).
Here we only catch the IntegrityError and translate it to a domain error.
"""
from __future__ import annotations

import secrets
import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.errors import ConflictError, ForbiddenError, NotFoundError, ValidationError
from src.core.events import bus
from src.modules.agenda import events as agenda_events
from src.modules.agenda.enums import (
    ALLOWED_TRANSITIONS,
    AppointmentStatus,
    CheckInMethod,
    can_transition,
)
from src.modules.agenda.models import Appointment, CheckIn, Room
from src.modules.agenda.repository import (
    AppointmentRepository,
    CheckInRepository,
    RoomRepository,
)
from src.modules.agenda.schemas import (
    AppointmentCreateIn,
    AppointmentUpdateIn,
    RoomCreateIn,
    RoomUpdateIn,
)
from src.modules.auth.models import Professional, User
from src.modules.patients.models import Patient


# ─────────────────────────────────────────────────────────────


def _generate_pin() -> str:
    return f"{secrets.randbelow(10000):04d}"


def _generate_qr_token() -> str:
    return secrets.token_urlsafe(32)[:64]


def _is_exclude_violation(exc: IntegrityError) -> bool:
    msg = str(exc.orig).lower()
    return "conflicting key value violates exclusion constraint" in msg or "no_overlap_" in msg


# ─────────────────────────────────────────────────────────────


class RoomService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = RoomRepository(session)

    async def create(self, clinic_id: uuid.UUID, data: RoomCreateIn) -> Room:
        if await self._repo.get_by_name(clinic_id, data.name):
            raise ConflictError("Sala com este nome já existe", details={"name": data.name})
        room = Room(clinic_id=clinic_id, **data.model_dump())
        self._repo.add(room)
        await self._session.flush()
        return room

    async def get(self, clinic_id: uuid.UUID, room_id: uuid.UUID) -> Room:
        room = await self._repo.get(clinic_id, room_id)
        if not room:
            raise NotFoundError("Sala não encontrada")
        return room

    async def list(self, clinic_id: uuid.UUID, *, include_inactive: bool = False) -> list[Room]:
        return await self._repo.list(clinic_id, include_inactive=include_inactive)

    async def update(
        self, clinic_id: uuid.UUID, room_id: uuid.UUID, data: RoomUpdateIn
    ) -> Room:
        room = await self.get(clinic_id, room_id)
        changes = data.model_dump(exclude_unset=True)
        if "name" in changes and changes["name"] and changes["name"] != room.name:
            existing = await self._repo.get_by_name(clinic_id, changes["name"])
            if existing and existing.id != room.id:
                raise ConflictError("Outra sala já usa este nome")
        for field, value in changes.items():
            setattr(room, field, value)
        await self._session.flush()
        return room

    async def deactivate(self, clinic_id: uuid.UUID, room_id: uuid.UUID) -> None:
        room = await self.get(clinic_id, room_id)
        room.is_active = False
        await self._session.flush()


# ─────────────────────────────────────────────────────────────


class AppointmentService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._repo = AppointmentRepository(session)
        self._rooms = RoomRepository(session)

    async def _validate_resources(
        self, clinic_id: uuid.UUID, *, patient_id, professional_id, room_id
    ) -> None:
        patient = await self._session.get(Patient, patient_id)
        if (
            patient is None
            or patient.clinic_id != clinic_id
            or patient.deleted_at is not None
        ):
            raise NotFoundError("Paciente não encontrado")
        if patient.anonymized_at is not None:
            raise ValidationError("Paciente anonimizado não pode ser agendado")

        professional = await self._session.get(Professional, professional_id)
        if (
            professional is None
            or professional.clinic_id != clinic_id
            or professional.deleted_at is not None
        ):
            raise NotFoundError("Profissional não encontrado")

        room = await self._rooms.get(clinic_id, room_id)
        if not room:
            raise NotFoundError("Sala não encontrada")
        if not room.is_active:
            raise ValidationError("Sala desativada")

    async def create(
        self,
        clinic_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: AppointmentCreateIn,
    ) -> Appointment:
        await self._validate_resources(
            clinic_id,
            patient_id=data.patient_id,
            professional_id=data.professional_id,
            room_id=data.room_id,
        )

        pin = _generate_pin() if data.generate_checkin_codes else None
        qr = _generate_qr_token() if data.generate_checkin_codes else None

        appointment = Appointment(
            clinic_id=clinic_id,
            patient_id=data.patient_id,
            professional_id=data.professional_id,
            room_id=data.room_id,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            status=AppointmentStatus.SCHEDULED,
            procedure_hint=data.procedure_hint,
            notes=data.notes,
            pin_code=pin,
            qr_token=qr,
            created_by_user_id=actor_user_id,
        )
        self._repo.add(appointment)

        try:
            await self._session.flush()
        except IntegrityError as exc:
            if _is_exclude_violation(exc):
                raise ConflictError(
                    "Conflito de agendamento: profissional, sala ou paciente já ocupados neste horário",
                    code="agenda_conflict",
                ) from exc
            raise ConflictError("Conflito ao criar agendamento") from exc

        await bus.publish(
            agenda_events.appointment_scheduled(
                appointment.id,
                clinic_id,
                {
                    "appointment_id": str(appointment.id),
                    "patient_id": str(appointment.patient_id),
                    "professional_id": str(appointment.professional_id),
                    "room_id": str(appointment.room_id),
                    "starts_at": appointment.starts_at.isoformat(),
                    "ends_at": appointment.ends_at.isoformat(),
                    "status": appointment.status.value,
                    "actor_user_id": str(actor_user_id),
                },
            )
        )
        return appointment

    async def get(self, clinic_id: uuid.UUID, appointment_id: uuid.UUID) -> Appointment:
        appointment = await self._repo.get(clinic_id, appointment_id)
        if not appointment:
            raise NotFoundError("Agendamento não encontrado")
        return appointment

    async def list_range(
        self,
        clinic_id: uuid.UUID,
        *,
        start: datetime,
        end: datetime,
        professional_id: uuid.UUID | None,
        room_id: uuid.UUID | None,
        patient_id: uuid.UUID | None,
        statuses: list[AppointmentStatus] | None,
    ) -> list[Appointment]:
        if end <= start:
            raise ValidationError("Intervalo inválido: end deve ser maior que start")
        if (end - start).days > 92:
            raise ValidationError("Intervalo máximo de busca é 92 dias")
        return await self._repo.list_range(
            clinic_id,
            start=start,
            end=end,
            professional_id=professional_id,
            room_id=room_id,
            patient_id=patient_id,
            statuses=statuses,
        )

    async def update(
        self,
        clinic_id: uuid.UUID,
        appointment_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        data: AppointmentUpdateIn,
    ) -> Appointment:
        appointment = await self.get(clinic_id, appointment_id)
        if appointment.status in {
            AppointmentStatus.COMPLETED,
            AppointmentStatus.CANCELLED,
            AppointmentStatus.NO_SHOW,
        }:
            raise ValidationError("Agendamento finalizado não pode ser editado")

        changes = data.model_dump(exclude_unset=True)
        if "room_id" in changes and changes["room_id"]:
            room = await self._rooms.get(clinic_id, changes["room_id"])
            if not room or not room.is_active:
                raise ValidationError("Sala inválida ou inativa")

        for field, value in changes.items():
            setattr(appointment, field, value)

        try:
            await self._session.flush()
        except IntegrityError as exc:
            if _is_exclude_violation(exc):
                raise ConflictError(
                    "Conflito de horário: profissional, sala ou paciente já ocupados",
                    code="agenda_conflict",
                ) from exc
            raise ConflictError("Conflito ao atualizar agendamento") from exc

        await bus.publish(
            agenda_events.appointment_updated(
                appointment.id,
                clinic_id,
                {
                    "appointment_id": str(appointment.id),
                    "actor_user_id": str(actor_user_id),
                    "changed_fields": list(changes.keys()),
                },
            )
        )
        return appointment

    async def change_status(
        self,
        clinic_id: uuid.UUID,
        appointment_id: uuid.UUID,
        actor_user_id: uuid.UUID,
        new_status: AppointmentStatus,
        *,
        reason: str | None = None,
    ) -> Appointment:
        appointment = await self.get(clinic_id, appointment_id)
        old = appointment.status
        if old == new_status:
            return appointment
        if not can_transition(old, new_status):
            raise ValidationError(
                f"Transição inválida: {old.value} → {new_status.value}",
                details={"allowed": [s.value for s in ALLOWED_TRANSITIONS.get(old, set())]},
            )

        appointment.status = new_status
        if new_status == AppointmentStatus.CONFIRMED:
            appointment.confirmed_at = datetime.now(timezone.utc)
        await self._session.flush()

        await bus.publish(
            agenda_events.appointment_status_changed(
                appointment.id,
                clinic_id,
                old_status=old.value,
                new_status=new_status.value,
                extra={
                    "actor_user_id": str(actor_user_id),
                    "reason": reason,
                },
            )
        )
        return appointment

    async def regenerate_checkin_codes(
        self, clinic_id: uuid.UUID, appointment_id: uuid.UUID
    ) -> Appointment:
        appointment = await self.get(clinic_id, appointment_id)
        appointment.pin_code = _generate_pin()
        appointment.qr_token = _generate_qr_token()
        await self._session.flush()
        return appointment


# ─────────────────────────────────────────────────────────────


class CheckInService:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session
        self._appts = AppointmentRepository(session)
        self._checkins = CheckInRepository(session)

    @staticmethod
    def _day_window(reference: datetime) -> tuple[datetime, datetime]:
        """Returns [start_of_day_utc, start_of_next_day_utc) for reference."""
        ref_utc = reference.astimezone(timezone.utc)
        day_start = ref_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        return day_start, day_start + timedelta(days=1)

    async def _execute_checkin(
        self,
        appointment: Appointment,
        *,
        method: CheckInMethod,
        code_used: str | None,
        performed_by_user_id: uuid.UUID | None,
        ip: str | None,
    ) -> CheckIn:
        # Verifica se já há check-in
        existing = await self._checkins.get_by_appointment(appointment.id)
        if existing:
            raise ConflictError("Check-in já realizado para este agendamento")

        if appointment.status not in {
            AppointmentStatus.SCHEDULED,
            AppointmentStatus.CONFIRMED,
        }:
            raise ValidationError(
                f"Check-in não permitido no status atual: {appointment.status.value}"
            )

        now = datetime.now(timezone.utc)
        check_in = CheckIn(
            appointment_id=appointment.id,
            clinic_id=appointment.clinic_id,
            method=method,
            code_used=code_used,
            performed_by_user_id=performed_by_user_id,
            actor_ip=ip,
            checked_in_at=now,
        )
        self._checkins.add(check_in)

        old = appointment.status
        appointment.status = AppointmentStatus.WAITING_ROOM
        await self._session.flush()

        # Publish status change AND patient_checked_in event for the realtime layer.
        await bus.publish(
            agenda_events.appointment_status_changed(
                appointment.id,
                appointment.clinic_id,
                old_status=old.value,
                new_status=AppointmentStatus.WAITING_ROOM.value,
                extra={"trigger": "checkin", "method": method.value},
            )
        )
        await bus.publish(
            agenda_events.patient_checked_in(
                appointment.id,
                appointment.clinic_id,
                {
                    "appointment_id": str(appointment.id),
                    "patient_id": str(appointment.patient_id),
                    "professional_id": str(appointment.professional_id),
                    "room_id": str(appointment.room_id),
                    "method": method.value,
                    "checked_in_at": now.isoformat(),
                },
            )
        )
        return check_in

    async def checkin_manual(
        self,
        clinic_id: uuid.UUID,
        appointment_id: uuid.UUID,
        actor: User,
        ip: str | None,
    ) -> CheckIn:
        appointment = await self._appts.get(clinic_id, appointment_id)
        if not appointment:
            raise NotFoundError("Agendamento não encontrado")
        return await self._execute_checkin(
            appointment,
            method=CheckInMethod.MANUAL,
            code_used=None,
            performed_by_user_id=actor.id,
            ip=ip,
        )

    async def checkin_by_code(
        self,
        clinic_id: uuid.UUID,
        code: str,
        *,
        ip: str | None,
    ) -> tuple[Appointment, CheckIn]:
        """Anonymous flow — patient using their own phone/totem."""
        code = code.strip()
        now = datetime.now(timezone.utc)
        day_start, day_end = self._day_window(now)

        appointment: Appointment | None = None
        method: CheckInMethod | None = None

        # Try PIN first (4 digits)
        if code.isdigit() and len(code) == 4:
            appointment = await self._appts.get_by_pin(
                clinic_id, code, day_start=day_start, day_end=day_end
            )
            if appointment:
                method = CheckInMethod.PIN

        # Fallback to QR token
        if appointment is None:
            appointment = await self._appts.get_by_qr(
                clinic_id, code, day_start=day_start, day_end=day_end
            )
            if appointment:
                method = CheckInMethod.QR_CODE

        if appointment is None or method is None:
            raise NotFoundError(
                "Código inválido ou expirado",
                code="checkin_code_invalid",
            )

        # Window validation — disallow check-in too early/late (1h tolerance)
        window_start = appointment.starts_at - timedelta(hours=2)
        window_end = appointment.ends_at + timedelta(minutes=15)
        if not (window_start <= now <= window_end):
            raise ForbiddenError(
                "Fora da janela de check-in para este agendamento",
                code="checkin_window_closed",
            )

        check_in = await self._execute_checkin(
            appointment,
            method=method,
            code_used=code,
            performed_by_user_id=None,
            ip=ip,
        )
        return appointment, check_in
