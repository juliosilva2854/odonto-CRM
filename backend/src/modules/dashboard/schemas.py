"""Dashboard Pydantic schemas."""
from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from src.modules.agenda.enums import AppointmentStatus


class DashboardAppointmentOut(BaseModel):
    id: uuid.UUID
    patient_name: str
    starts_at: datetime
    status: AppointmentStatus


class DashboardTopProcedureOut(BaseModel):
    procedure_name: str
    count: int


class DashboardOverviewOut(BaseModel):
    greeting_name: str
    appointments_today_count: int
    appointments_today_list: list[DashboardAppointmentOut]
    patients_total: int
    patients_new_this_month: int
    quotes_month_total: int
    quotes_month_approved: int
    quotes_month_amount: Decimal
    checkins_today: int
    pending_quotes_count: int
    procedures_top_5: list[DashboardTopProcedureOut]
