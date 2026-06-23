"""Audit enums — LGPD purposes."""
from __future__ import annotations

import enum


class DataAccessPurpose(str, enum.Enum):
    """Reason logged into data_access_logs (LGPD Art. 37)."""

    CONSULTATION = "consultation"           # clinical consultation in progress
    QUOTE_CREATION = "quote_creation"       # generating a quote/treatment plan
    FINANCIAL = "financial"                 # collecting payment / checking balance
    SCHEDULING = "scheduling"               # booking an appointment
    ANAMNESIS = "anamnesis"                 # filling/reading anamnesis form
    EXPORT = "export"                       # exporting record (PDF, print)
    SUPPORT = "support"                     # admin support / data fix
    OTHER = "other"
