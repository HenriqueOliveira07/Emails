"""
Modelos SQLAlchemy para filtros personalizados por remetente e
aprendizado contínuo de prioridades a partir de correções manuais.
"""
import enum

from sqlalchemy import Column, DateTime, Enum, Integer, String, func

from app.db.database import Base


class SenderFilterAction(str, enum.Enum):
    """Ação aplicada quando um e-mail casa com um filtro de remetente."""
    BLOCK = "BLOCK"
    FORCE_CRITICAL = "FORCE_CRITICAL"
    FORCE_HIGH = "FORCE_HIGH"
    FORCE_MEDIUM = "FORCE_MEDIUM"
    FORCE_LOW = "FORCE_LOW"
    VIP = "VIP"


class SenderFilter(Base):
    """Filtro personalizado aplicado a e-mails de um remetente ou domínio."""

    __tablename__ = "sender_filters"

    id = Column(Integer, primary_key=True, index=True)
    # E-mail exato (ex: cobranca@fornecedor.com) ou sufixo de domínio (ex: @fornecedor.com)
    pattern = Column(String(320), nullable=False, index=True)
    action = Column(Enum(SenderFilterAction), nullable=False)
    reason = Column(String(500), nullable=True, default="")
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    def __repr__(self) -> str:
        return f"<SenderFilter id={self.id} pattern='{self.pattern}' action={self.action}>"


class PriorityCorrection(Base):
    """Registro de correção manual de prioridade, usado para aprendizado contínuo."""

    __tablename__ = "priority_corrections"

    id = Column(Integer, primary_key=True, index=True)
    sender_email = Column(String(320), nullable=False, index=True)
    subject = Column(String(1000), nullable=True, default="")
    ai_priority = Column(String(20), nullable=True, default="")
    corrected_priority = Column(String(20), nullable=False)
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )

    def __repr__(self) -> str:
        return (
            f"<PriorityCorrection id={self.id} sender={self.sender_email} "
            f"{self.ai_priority}->{self.corrected_priority}>"
        )
