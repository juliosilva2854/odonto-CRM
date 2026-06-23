"""Catalog enums — Specialty taxonomy + Procedure category."""
from __future__ import annotations

import enum


class ProcedureCategory(str, enum.Enum):
    DIAGNOSTIC = "diagnostic"
    PREVENTIVE = "preventive"
    RESTORATIVE = "restorative"
    ENDODONTIC = "endodontic"
    SURGICAL = "surgical"
    PROSTHETIC = "prosthetic"
    ORTHODONTIC = "orthodontic"
    PERIODONTAL = "periodontal"
    AESTHETIC = "aesthetic"
    OTHER = "other"
