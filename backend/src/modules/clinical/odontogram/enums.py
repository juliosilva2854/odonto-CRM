"""Odontogram enums — FDI tooth set (ISO 3950), faces, events, statuses."""
from __future__ import annotations

import enum
from typing import Final


# ── FDI / ISO 3950 ────────────────────────────────────────────
# Permanent dentition: quadrants 1-4. Primary (decidual): quadrants 5-8.
ADULT_TEETH: Final[frozenset[str]] = frozenset(
    f"{q}{n}" for q in "1234" for n in "12345678"
)
PRIMARY_TEETH: Final[frozenset[str]] = frozenset(
    f"{q}{n}" for q in "5678" for n in "12345"
)
ALL_FDI_TEETH: Final[frozenset[str]] = ADULT_TEETH | PRIMARY_TEETH


def is_valid_fdi(code: str) -> bool:
    return code in ALL_FDI_TEETH


class ToothFace(str, enum.Enum):
    """Tooth surfaces. M/D/V/L/O for posteriors; I substitutes O for anteriors.
    B (Buccal) and P (Palatal) are synonyms for V/L depending on arch — kept
    explicit so we don't lose clinical fidelity on import/export."""

    M = "M"  # Mesial
    D = "D"  # Distal
    V = "V"  # Vestibular
    L = "L"  # Lingual
    O = "O"  # Oclusal (posteriors)  # noqa: E741
    I = "I"  # Incisal (anteriors)   # noqa: E741
    B = "B"  # Buccal (synonym for V)
    P = "P"  # Palatal (synonym for L in upper arch)


VALID_FACE_CODES: Final[frozenset[str]] = frozenset(f.value for f in ToothFace)


class OdontogramEventType(str, enum.Enum):
    """Append-only events recorded on the odontogram aggregate."""

    PROCEDURE_ADDED = "procedure_added"          # Plan a procedure on tooth/face(s)
    PROCEDURE_STATUS_CHANGED = "procedure_status_changed"
    PROCEDURE_REMOVED = "procedure_removed"      # Cancellation
    NOTE_ADDED = "note_added"                     # Free observation


class ToothProcedureStatus(str, enum.Enum):
    """Lifecycle of a planned/scheduled procedure on a specific tooth."""

    PLANNED = "planned"              # Just added to the chart
    TO_EXECUTE = "to_execute"        # Quote approved → ready to do
    IN_PROGRESS = "in_progress"      # Started in chair
    DONE = "done"                    # Completed
    CANCELLED = "cancelled"          # Removed or quote rejected


# State machine: target statuses allowed from each origin.
ALLOWED_PROCEDURE_TRANSITIONS: Final[dict[ToothProcedureStatus, set[ToothProcedureStatus]]] = {
    ToothProcedureStatus.PLANNED: {
        ToothProcedureStatus.TO_EXECUTE,
        ToothProcedureStatus.IN_PROGRESS,
        ToothProcedureStatus.CANCELLED,
    },
    ToothProcedureStatus.TO_EXECUTE: {
        ToothProcedureStatus.IN_PROGRESS,
        ToothProcedureStatus.CANCELLED,
        ToothProcedureStatus.PLANNED,  # Allow re-plan if quote is revoked
    },
    ToothProcedureStatus.IN_PROGRESS: {
        ToothProcedureStatus.DONE,
        ToothProcedureStatus.CANCELLED,
    },
    ToothProcedureStatus.DONE: set(),
    ToothProcedureStatus.CANCELLED: set(),
}


def can_transition_procedure(
    current: ToothProcedureStatus, target: ToothProcedureStatus
) -> bool:
    return target in ALLOWED_PROCEDURE_TRANSITIONS.get(current, set())
