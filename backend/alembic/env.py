"""Ambiente Alembic (modo síncrono, driver psycopg2/asyncpg convertido)."""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import create_engine, pool

from app.config import settings
from app.db.database import Base
from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

config = context.config
if config.config_file_name:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _sync_url() -> str:
    url = str(settings.DATABASE_URL)
    return url.replace("+asyncpg", "+psycopg2") if "+asyncpg" in url else url


def run_migrations_offline() -> None:
    context.configure(url=_sync_url(), target_metadata=target_metadata, literal_binds=True)
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_sync_url(), poolclass=pool.NullPool)
    with engine.connect() as conn:
        context.configure(connection=conn, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
