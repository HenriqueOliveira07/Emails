"""
Configuração do Alembic para migrações assíncronas com SQLAlchemy 2.0.
"""
import asyncio
from logging.config import fileConfig

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.config import settings
from app.db.database import Base

# Importa os modelos para garantir que estão registrados no metadata
from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

# Objeto de configuração do Alembic, provê acesso aos valores do alembic.ini
config = context.config

# Sobrescreve a URL do banco com a variável de ambiente/settings da aplicação
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Interpreta o arquivo de configuração para logging do Python
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Metadata alvo usado pelo autogenerate
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Executa migrações em modo 'offline' (gera SQL sem conectar ao banco)."""
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
    """Cria um engine assíncrono e associa uma conexão com o contexto."""
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    """Executa migrações em modo 'online' (conecta ao banco via engine assíncrono)."""
    asyncio.run(run_async_migrations())


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
