"""Quote enums + state machines."""
from __future__ import annotations

import enum
from typing import Final


class QuoteStatus(str, enum.Enum):
    DRAFT = "draft"                       # Em elaboração
    SENT = "sent"                          # Enviado ao paciente
    APPROVED_PARTIAL = "approved_partial"  # Pelo menos 1 item aprovado, mas não todos
    APPROVED = "approved"                  # Todos os itens aprovados
    REJECTED = "rejected"                  # Todos os itens rejeitados
    CANCELLED = "cancelled"                # Cancelado (manual)
    EXPIRED = "expired"                    # valid_until ultrapassado


class QuoteItemStatus(str, enum.Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


# Item-level transitions: only pending → approved / rejected (terminal)
ALLOWED_ITEM_TRANSITIONS: Final[dict[QuoteItemStatus, set[QuoteItemStatus]]] = {
    QuoteItemStatus.PENDING: {QuoteItemStatus.APPROVED, QuoteItemStatus.REJECTED},
    QuoteItemStatus.APPROVED: set(),
    QuoteItemStatus.REJECTED: set(),
}


def can_transition_item(
    current: QuoteItemStatus, target: QuoteItemStatus
) -> bool:
    return target in ALLOWED_ITEM_TRANSITIONS.get(current, set())


class DeductionType(str, enum.Enum):
    """Pre-commission deductions captured for the future Split module.
    Stored as JSONB list on each QuoteItem; reused later by the financial
    settlement engine without re-computing snapshots."""

    CARD_FEE = "card_fee"             # Taxa de cartão (percentual ou nominal)
    LAB_FEE = "lab_fee"                # Custos de laboratório (prótese, ortodontia)
    MATERIAL = "material"              # Material clínico repassado
    PLATFORM_FEE = "platform_fee"      # Fee da plataforma (caso aplicável)
    OTHER = "other"
