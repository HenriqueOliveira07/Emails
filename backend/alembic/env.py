"""
Ambiente Alembic — usa o mesmo metadata dos modelos SQLAlchemy da aplicação
e a DATABASE_URL das configurações (Pydantic Settings), convertendo o driver
assíncrono (asyncpg) para o driver síncrono (psycopg2) usado nas migrations.
"""
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings
from app.db.database import Base
from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _sync_database_url() -> str:
    """Converte a URL assíncrona (postgresql+asyncpg) para síncrona (postgresql+psycopg2)."""
    return settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")


config.set_main_option("sqlalchemy.url", _sync_database_url())


def run_migrations_offline() -> None:
    """Executa migrations em modo 'offline' (gera SQL sem conectar ao banco)."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Executa migrations em modo 'online' (conecta ao banco diretamente)."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
