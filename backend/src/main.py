"""FastAPI application entry point."""
from __future__ import annotations

from contextlib import asynccontextmanager
from collections.abc import AsyncIterator

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from src.core.config import get_settings
from src.core.errors import (
    AppException,
    app_exception_handler,
    unhandled_exception_handler,
    validation_exception_handler,
)
from src.core.logging import configure_logging, get_logger
from src.core.middleware import RequestContextMiddleware
from src.modules.audit import register_handlers as register_audit_handlers
from src.modules.agenda.realtime import register_handlers as register_agenda_realtime
from src.modules.agenda.router import router as agenda_router
from src.modules.auth.router import router as auth_router
from src.modules.clinical.catalog.router import router as catalog_router
from src.modules.patients.router import router as patients_router
from src.modules.tenancy.router import router as tenancy_router

settings = get_settings()
configure_logging()
log = get_logger(__name__)

# ── Register cross-module event handlers (audit, realtime broadcast)
register_audit_handlers()
register_agenda_realtime()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    log.info("app_starting", environment=settings.ENVIRONMENT)
    yield
    log.info("app_stopping")


app = FastAPI(
    title="Dental CRM API",
    version="0.1.0",
    description="CRM Odontológico — monolito modular. Fase 1 (S0+S1): Auth + Tenancy.",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# ── CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.frontend_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

# ── Request context (auth claims → ContextVar)
app.add_middleware(RequestContextMiddleware)

# ── Error handlers
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


# ── Health
@app.get("/api/health", tags=["health"])
async def health() -> dict[str, str]:
    return {"status": "ok", "service": "dental-crm-backend"}


# ── Routers
app.include_router(auth_router)
app.include_router(tenancy_router)
app.include_router(patients_router)
app.include_router(catalog_router)
app.include_router(agenda_router)


@app.get("/api", tags=["health"])
async def root() -> dict[str, str]:
    return {
        "name": "Dental CRM API",
        "version": "0.1.0",
        "docs": "/api/docs",
    }
