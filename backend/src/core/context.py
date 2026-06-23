"""RequestContext: per-request state (user, clinic, request_id, ip).

Stored in a ContextVar so any layer (repository, service, event handler) can read
without parameter-drilling.
"""
from __future__ import annotations

import uuid
from contextvars import ContextVar
from dataclasses import dataclass


@dataclass(frozen=True)
class RequestContext:
    request_id: uuid.UUID
    user_id: uuid.UUID | None = None
    clinic_id: uuid.UUID | None = None
    role: str | None = None
    ip: str | None = None
    user_agent: str | None = None


_ctx_var: ContextVar[RequestContext | None] = ContextVar("request_context", default=None)


def set_context(ctx: RequestContext) -> None:
    _ctx_var.set(ctx)


def get_context() -> RequestContext:
    """Returns the current request's context. Raises if not set (developer error)."""
    ctx = _ctx_var.get()
    if ctx is None:
        raise RuntimeError("RequestContext not set — middleware likely not installed")
    return ctx


def get_context_optional() -> RequestContext | None:
    return _ctx_var.get()
