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


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Singleton, cacheado. Erros de config falham aqui no boot."""
    return Settings()
