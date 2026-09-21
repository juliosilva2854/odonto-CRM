"""Alembic env.py — async-aware migrations.

Uses sync engine (psycopg2) for actual DDL execution because Alembic offline
mode and most online tooling expect sync. The application runtime uses asyncpg.
"""
from __future__ import annotations

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from src.core.config import get_settings

# Import all models so Base.metadata is populated for autogenerate
from src.shared.db.base_model import Base
from src.modules.tenancy import models as _tenancy_models  # noqa: F401
from src.modules.auth import models as _auth_models  # noqa: F401
from src.modules.patients import models as _patients_models  # noqa: F401
from src.modules.clinical.catalog import models as _catalog_models  # noqa: F401
from src.modules.clinical.odontogram import models as _odontogram_models  # noqa: F401
from src.modules.clinical.records import models as _records_models  # noqa: F401
from src.modules.finance.quotes import models as _quotes_models  # noqa: F401
from src.modules.audit import models as _audit_models  # noqa: F401
from src.modules.agenda import models as _agenda_models  # noqa: F401
from src.modules.billing import models as _billing_models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

settings = get_settings()
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL_SYNC)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
