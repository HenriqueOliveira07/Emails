"""
Configuração do banco de dados com SQLAlchemy assíncrono.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool

from app.config import settings


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy."""
    pass


# Engine assíncrono
_pool_kwargs = (
    {}
    if settings.DATABASE_URL.startswith("sqlite")  # SQLite só é usado nos testes
    else {
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    }
)
engine = create_async_engine(settings.DATABASE_URL, echo=settings.DATABASE_ECHO, **_pool_kwargs)

# Session factory assíncrona
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


def worker_sessionmaker():
    """
    Cria engine + session factory exclusivos para tarefas Celery.

    Cada tarefa Celery roda em um event loop novo (asyncio.new_event_loop),
    e conexões asyncpg ficam presas ao loop onde foram criadas. Reutilizar o
    pool global entre loops gera "attached to a different loop". Com NullPool
    cada conexão é aberta e fechada dentro do próprio loop da tarefa.
    """
    worker_engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DATABASE_ECHO,
        poolclass=NullPool,
    )
    factory = async_sessionmaker(
        worker_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autoflush=False,
    )
    return worker_engine, factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency injection para sessão de banco de dados."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def create_tables() -> None:
    """Cria todas as tabelas no banco de dados."""
    # Importa os modelos para garantir que estão registrados
    from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
    from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables() -> None:
    """Remove todas as tabelas (usar apenas em desenvolvimento)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
