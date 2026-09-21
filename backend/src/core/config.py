"""Application settings — Pydantic Settings. Fail-fast on missing config."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=True, extra="ignore")

    # ── Environment
    ENVIRONMENT: Literal["development", "staging", "production"] = "development"
    LOG_LEVEL: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"

    # ── Database
    DATABASE_URL: str  # postgresql+asyncpg://user:pass@host:5432/db
    DATABASE_URL_SYNC: str  # used by Alembic (psycopg2)
    DB_ECHO: bool = False

    # ── Redis (reserved for Celery / cache — Fase 5+)
    REDIS_URL: str | None = None

    # ── JWT
    JWT_SECRET: str = Field(min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRES_MIN: int = 60
    JWT_REFRESH_EXPIRES_DAYS: int = 7

    # ── Storage
    STORAGE_BACKEND: Literal["local", "s3"] = "local"
    STORAGE_LOCAL_PATH: Path = Path("/data/storage")
    S3_BUCKET: str | None = None
    S3_REGION: str | None = None
    S3_ACCESS_KEY: str | None = None
    S3_SECRET_KEY: str | None = None

    # ── Jobs
    JOB_RUNNER: Literal["background", "celery"] = "background"

    # ── CORS / Frontend
    FRONTEND_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    @property
    def frontend_origins_list(self) -> list[str]:
        return [o.strip() for o in self.FRONTEND_ORIGINS.split(",") if o.strip()]

    # ── Seed
    SEED_ON_STARTUP: bool = True

    # ── Stripe (all optional — the app boots and runs without billing configured)
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PRICE_ESSENCIAL: str | None = None
    STRIPE_PRICE_PRO: str | None = None
    STRIPE_PRICE_CLINICA: str | None = None
    STRIPE_SUCCESS_URL: str = "http://localhost:5173/billing/success"
    STRIPE_CANCEL_URL: str = "http://localhost:5173/billing/cancel"
    STRIPE_PORTAL_RETURN_URL: str = "http://localhost:5173/settings/billing"

    @property
    def stripe_configured(self) -> bool:
        key = self.STRIPE_SECRET_KEY
        # `PLACEHOLDER` guard: dev/test .env ships fake keys so the app must behave
        # exactly as if Stripe were absent (no real API calls, clear 422).
        return bool(key and key.startswith("sk_") and "PLACEHOLDER" not in key.upper())


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton, cacheado. Erros de config falham aqui no boot."""
    return Settings()
