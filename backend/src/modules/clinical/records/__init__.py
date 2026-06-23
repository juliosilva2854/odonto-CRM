"""Clinical records module — Prontuário (evolução clínica + anexos).

Implements CFO-compliant lock: after a configurable window (default 24h) records
become immutable; only addendums (append-only) are allowed.
"""
