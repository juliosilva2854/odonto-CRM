"""Cash enums."""
from __future__ import annotations

import enum


class CashMovementType(str, enum.Enum):
    INCOME = "income"
    EXPENSE = "expense"


class CashPaymentMethod(str, enum.Enum):
    CASH = "cash"
    PIX = "pix"
    CARD_CREDIT = "card_credit"
    CARD_DEBIT = "card_debit"
    TRANSFER = "transfer"
    OTHER = "other"
