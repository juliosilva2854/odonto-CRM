"""Onboarding enums."""
from __future__ import annotations

import enum


class PlanTier(str, enum.Enum):
    """Commercial plan chosen at signup. Drives the initial feature-flag set."""

    ESSENCIAL = "essencial"
    PRO = "pro"
    CLINICA = "clinica"
