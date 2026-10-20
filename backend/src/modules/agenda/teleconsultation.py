"""Teleconsulta via Jitsi Meet (gratuito, open-source, sem credenciais).

O Jitsi cria a sala sob demanda a partir do nome na URL — não há API nem
estado a persistir. O nome é derivado do ID (UUID v4) do agendamento, o que
o torna estável (mesmo link para dentista e paciente) e não adivinhável.
"""
from __future__ import annotations

import uuid

JITSI_BASE_URL = "https://meet.jit.si"
ROOM_PREFIX = "OdontoCRM"


def teleconsultation_room_name(appointment_id: uuid.UUID | str) -> str:
    """``OdontoCRM-<appointment_id>``."""
    return f"{ROOM_PREFIX}-{appointment_id}"


def build_teleconsultation_url(appointment_id: uuid.UUID | str) -> str:
    """``https://meet.jit.si/OdontoCRM-<appointment_id>``."""
    return f"{JITSI_BASE_URL}/{teleconsultation_room_name(appointment_id)}"
