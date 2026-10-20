"""WhatsApp message templates (pt-BR) for appointment communication.

The platform uses WhatsApp **Click-to-Chat** (``https://wa.me/<phone>?text=``):
the backend renders the message and the deep-link, the receptionist's browser
opens WhatsApp Web / app with the text pre-filled. Zero credentials, zero
third-party API — same approach used by the quote follow-up button.

Tone: "Boutique Clinic" register — formal treatment (Sr(a). / o(a) senhor(a)),
no emojis, WhatsApp ``*bold*`` markup for the key info.
"""
from __future__ import annotations

import enum
from dataclasses import dataclass
from datetime import datetime
from urllib.parse import quote
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

DEFAULT_TIMEZONE = "America/Sao_Paulo"

_WEEKDAYS_PT = (
    "segunda-feira",
    "terça-feira",
    "quarta-feira",
    "quinta-feira",
    "sexta-feira",
    "sábado",
    "domingo",
)


class WhatsAppTemplate(str, enum.Enum):
    CONFIRMATION = "confirmation"  # pede confirmação de presença
    REMINDER = "reminder"          # lembrete (véspera / dia)
    CHECKIN = "checkin"            # instruções de check-in com PIN


TEMPLATE_LABELS: dict[WhatsAppTemplate, str] = {
    WhatsAppTemplate.CONFIRMATION: "Confirmação de consulta",
    WhatsAppTemplate.REMINDER: "Lembrete de consulta",
    WhatsAppTemplate.CHECKIN: "Instruções de check-in",
}


@dataclass(frozen=True)
class AppointmentMessageContext:
    patient_name: str
    clinic_name: str
    starts_at: datetime
    timezone: str = DEFAULT_TIMEZONE
    professional_name: str | None = None
    room_name: str | None = None
    procedure_hint: str | None = None
    pin_code: str | None = None


def _local(dt: datetime, tz_name: str) -> datetime:
    try:
        tz = ZoneInfo(tz_name or DEFAULT_TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        tz = ZoneInfo(DEFAULT_TIMEZONE)
    return dt.astimezone(tz)


def format_when(dt: datetime, tz_name: str = DEFAULT_TIMEZONE) -> str:
    """``terça-feira, 21/10/2026 às 09:00`` (clinic local time)."""
    local = _local(dt, tz_name)
    weekday = _WEEKDAYS_PT[local.weekday()]
    return f"{weekday}, {local:%d/%m/%Y} às {local:%H:%M}"


def _details_block(ctx: AppointmentMessageContext) -> list[str]:
    lines = [f"*{format_when(ctx.starts_at, ctx.timezone).capitalize()}*"]
    if ctx.professional_name:
        lines.append(f"Profissional: {ctx.professional_name}")
    if ctx.procedure_hint:
        lines.append(f"Procedimento: {ctx.procedure_hint}")
    return lines


def render_message(template: WhatsAppTemplate, ctx: AppointmentMessageContext) -> str:
    name = ctx.patient_name.strip()
    clinic = ctx.clinic_name.strip()

    if template is WhatsAppTemplate.CONFIRMATION:
        parts = [
            f"Olá, Sr(a). {name}. Como o(a) senhor(a) está?",
            "",
            f"Aqui é da recepção da clínica {clinic}. Gostaríamos de confirmar a sua consulta:",
            "",
            *_details_block(ctx),
            "",
            "O(a) senhor(a) confirma a sua presença? Basta responder *SIM* para "
            "confirmar ou nos avisar caso precise reagendar.",
        ]
    elif template is WhatsAppTemplate.REMINDER:
        parts = [
            f"Olá, Sr(a). {name}.",
            "",
            f"Passando para lembrar da sua consulta na clínica {clinic}:",
            "",
            *_details_block(ctx),
            "",
            "Pedimos, por gentileza, que chegue com 10 minutos de antecedência. "
            "Caso não possa comparecer, nos avise por aqui. Até breve!",
        ]
    elif template is WhatsAppTemplate.CHECKIN:
        if not ctx.pin_code:
            raise ValueError("pin_code is required for the check-in template")
        parts = [
            f"Olá, Sr(a). {name}.",
            "",
            f"A sua consulta na clínica {clinic} está agendada para:",
            "",
            *_details_block(ctx),
            "",
            f"Ao chegar, informe o código *{ctx.pin_code}* no totem da recepção "
            "para realizar o seu check-in de forma rápida.",
        ]
    else:  # pragma: no cover — exhaustive enum
        raise ValueError(f"Unknown template: {template}")

    return "\n".join(parts)


def clean_phone(phone: str | None) -> str:
    """Digits only (wa.me format). ``+55 (11) 98888-7777`` → ``5511988887777``."""
    return "".join(ch for ch in (phone or "") if ch.isdigit())


def build_whatsapp_url(phone: str | None, message: str) -> str | None:
    digits = clean_phone(phone)
    if not digits:
        return None
    return f"https://wa.me/{digits}?text={quote(message, safe='')}"
