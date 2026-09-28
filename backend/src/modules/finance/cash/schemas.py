"""Cash Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from src.modules.finance.cash.enums import CashMovementType, CashPaymentMethod


class CashMovementIn(BaseModel):
    type: CashMovementType
    category: str = Field(min_length=1, max_length=50)
    description: str = Field(min_length=1, max_length=200)
    amount: Decimal = Field(gt=Decimal("0"), max_digits=10, decimal_places=2)
    payment_method: CashPaymentMethod
    quote_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None


class CashMovementUpdateIn(BaseModel):
    type: CashMovementType | None = None
    category: str | None = Field(default=None, min_length=1, max_length=50)
    description: str | None = Field(default=None, min_length=1, max_length=200)
    amount: Decimal | None = Field(
        default=None, gt=Decimal("0"), max_digits=10, decimal_places=2
    )
    payment_method: CashPaymentMethod | None = None
    quote_id: uuid.UUID | None = None
    appointment_id: uuid.UUID | None = None


class CashMovementOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    clinic_id: uuid.UUID
    type: CashMovementType
    category: str
    description: str
    amount: Decimal
    payment_method: CashPaymentMethod
    quote_id: uuid.UUID | None
    appointment_id: uuid.UUID | None
    created_by_user_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


class CashSummaryOut(BaseModel):
    total_income: Decimal
    total_expense: Decimal
    balance: Decimal
    count: int


class CashDayOut(BaseModel):
    date: str
    movements: list[CashMovementOut]
    summary: CashSummaryOut
