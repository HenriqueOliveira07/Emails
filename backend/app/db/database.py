"""
Configuração do banco de dados com SQLAlchemy assíncrono.
"""
from contextlib import asynccontextmanager
from typing import AsyncGenerator, AsyncIterator

from sqlalchemy.pool import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy."""
    pass


def _engine_kwargs() -> dict:
    # SQLite (usado nos testes) não aceita pool_size/max_overflow
    if settings.DATABASE_URL.startswith("sqlite"):
        return {"echo": settings.DATABASE_ECHO}
    return {
        "echo": settings.DATABASE_ECHO,
        "pool_size": settings.DATABASE_POOL_SIZE,
        "max_overflow": settings.DATABASE_MAX_OVERFLOW,
        "pool_pre_ping": True,
        "pool_recycle": 3600,
    }


# Engine assíncrono (processo da API — um único event loop)
engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs())

# Session factory assíncrona
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


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


@asynccontextmanager
async def worker_session() -> AsyncIterator[AsyncSession]:
    """
    Sessão para tarefas Celery.

    Cada tarefa roda em um event loop novo (ver workers.tasks.run_async); conexões
    asyncpg ficam presas ao loop em que foram criadas, então reutilizar o pool
    global causaria "attached to a different loop" a partir da 2ª execução no
    mesmo processo. Aqui criamos um engine sem pool e o descartamos ao final.
    """
    worker_engine = create_async_engine(
        settings.DATABASE_URL, echo=settings.DATABASE_ECHO, poolclass=NullPool
    )
    factory = async_sessionmaker(worker_engine, class_=AsyncSession, expire_on_commit=False)
    try:
        async with factory() as session:
            yield session
    finally:
        await worker_engine.dispose()
