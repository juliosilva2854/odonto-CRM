"""Odontograma module — event-sourced tooth/face state per patient.

Architecture:
- `OdontogramEvent`: append-only event log (the source of truth, immutable).
- `ToothProcedure`: materialized projection (aggregate state, mutable),
  rebuilt deterministically from the events. Optimized for fast reads
  by the frontend (32-tooth chart rendering).
"""
