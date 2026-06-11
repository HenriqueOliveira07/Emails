"""
Configuração do Alembic para migrações assíncronas com SQLAlchemy + asyncpg.
"""
import asyncio
import os
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Importa Base e todos os modelos para que o autogenerate detecte as tabelas
from app.db.database import Base
from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

# Configuração do Alembic
config = context.config

# Configura logging a partir do arquivo .ini
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

# Sobrescreve a URL de conexão com a variável de ambiente se disponível
database_url = os.getenv("DATABASE_URL", "")
if database_url:
    config.set_main_option("sqlalchemy.url", database_url)


def run_migrations_offline() -> None:
    """Executa migrações no modo offline (sem conexão ativa ao banco)."""
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


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    """Executa migrações usando engine assíncrono (asyncpg)."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Ponto de entrada para migrações online."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
