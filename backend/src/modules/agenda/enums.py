"""Agenda enums + state machine."""
from __future__ import annotations

import enum


class AppointmentStatus(str, enum.Enum):
    SCHEDULED = "scheduled"          # criado
    CONFIRMED = "confirmed"          # paciente confirmou (WhatsApp ou manual)
    WAITING_ROOM = "waiting_room"    # check-in feito → na sala de espera
    IN_PROGRESS = "in_progress"      # dentista iniciou o atendimento
    COMPLETED = "completed"          # finalizado (dispara comissão/AR no futuro)
    CANCELLED = "cancelled"          # cancelado a qualquer momento
    NO_SHOW = "no_show"              # não compareceu


# Transições permitidas. Tudo que não estiver listado aqui é bloqueado.
ALLOWED_TRANSITIONS: dict[AppointmentStatus, set[AppointmentStatus]] = {
    AppointmentStatus.SCHEDULED: {
        AppointmentStatus.CONFIRMED,
        AppointmentStatus.WAITING_ROOM,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.CONFIRMED: {
        AppointmentStatus.WAITING_ROOM,
        AppointmentStatus.CANCELLED,
        AppointmentStatus.NO_SHOW,
    },
    AppointmentStatus.WAITING_ROOM: {
        AppointmentStatus.IN_PROGRESS,
        AppointmentStatus.CANCELLED,
    },
    AppointmentStatus.IN_PROGRESS: {
        AppointmentStatus.COMPLETED,
        AppointmentStatus.CANCELLED,
    },
    # Terminais
    AppointmentStatus.COMPLETED: set(),
    AppointmentStatus.CANCELLED: set(),
    AppointmentStatus.NO_SHOW: set(),
}


TERMINAL_STATUSES: set[AppointmentStatus] = {
    AppointmentStatus.COMPLETED,
    AppointmentStatus.CANCELLED,
    AppointmentStatus.NO_SHOW,
}


# Status que NÃO bloqueiam novos agendamentos (EXCLUDE constraint exclui estes)
NON_BLOCKING_STATUSES: tuple[str, ...] = (
    AppointmentStatus.CANCELLED.value,
    AppointmentStatus.NO_SHOW.value,
)


def can_transition(current: AppointmentStatus, target: AppointmentStatus) -> bool:
    return target in ALLOWED_TRANSITIONS.get(current, set())


class CheckInMethod(str, enum.Enum):
    QR_CODE = "qr_code"
    PIN = "pin"
    MANUAL = "manual"
