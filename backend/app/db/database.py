"""
Configuração do banco de dados com SQLAlchemy assíncrono.
"""
import os
from typing import AsyncGenerator

from sqlalchemy.pool import NullPool

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy."""
    pass


# Engine assíncrono
# - Workers Celery criam um event loop novo por tarefa; conexões em pool
#   ficariam presas ao loop anterior ("attached to a different loop").
#   Por isso usamos NullPool quando DB_USE_NULLPOOL=1 (definido nos workers).
# - SQLite (testes locais) não aceita pool_size/max_overflow.
_engine_kwargs: dict = {"echo": settings.DATABASE_ECHO, "pool_pre_ping": True}
if os.getenv("DB_USE_NULLPOOL") == "1" or settings.DATABASE_URL.startswith("sqlite"):
    _engine_kwargs["poolclass"] = NullPool
else:
    _engine_kwargs.update(
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_recycle=3600,
    )

engine = create_async_engine(settings.DATABASE_URL, **_engine_kwargs)

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
