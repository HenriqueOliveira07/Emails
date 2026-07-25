"""
Configuração do banco de dados com SQLAlchemy assíncrono.
"""
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


class Base(DeclarativeBase):
    """Classe base para todos os modelos SQLAlchemy."""
    pass


# Engine assíncrono
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DATABASE_ECHO,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,
)

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
    """Bootstrap idempotente para ambientes novos (ex.: primeira execução em dev).

    Em produção, o controle de schema é feito via Alembic
    (`alembic upgrade head`, ver backend/alembic/); este `create_all`
    apenas garante que as tabelas existam caso as migrations ainda não
    tenham sido aplicadas.
    """
    # Importa os modelos para garantir que estão registrados
    from app.models.email import EmailRecord, EmailAttachment  # noqa: F401
    from app.models.notification import NotificationLog, ProcessingLog  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables() -> None:
    """Remove todas as tabelas (usar apenas em desenvolvimento)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
