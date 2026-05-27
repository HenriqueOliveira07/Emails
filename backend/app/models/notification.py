"""
Modelos SQLAlchemy para logs de notificações e processamento.
"""
import enum
from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    func,
)
from sqlalchemy.orm import relationship

from app.db.database import Base


class NotificationStatus(str, enum.Enum):
    """Status de envio de notificação."""
    PENDING = "pendente"
    SENT = "enviado"
    FAILED = "falhou"
    RETRY = "reenvio"


class NotificationChannel(str, enum.Enum):
    """Canal de notificação."""
    WHATSAPP = "whatsapp"
    EMAIL = "email"
    WEBHOOK = "webhook"


class NotificationLog(Base):
    """Log de notificação enviada."""

    __tablename__ = "notification_logs"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(
        Integer,
        ForeignKey("email_records.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    channel = Column(
        Enum(NotificationChannel),
        nullable=False,
        default=NotificationChannel.WHATSAPP,
    )
    recipient = Column(String(320), nullable=False)  # Número WhatsApp ou e-mail
    message_body = Column(Text, nullable=False)
    status = Column(
        Enum(NotificationStatus),
        nullable=False,
        default=NotificationStatus.PENDING,
        index=True,
    )
    sent_at = Column(DateTime(timezone=True), nullable=True, default=None)
    error_message = Column(Text, nullable=True, default="")
    retry_count = Column(Integer, nullable=False, default=0)
    external_id = Column(String(500), nullable=True, default="")  # ID da mensagem no provider

    # Timestamps
    created_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relacionamento
    email = relationship("EmailRecord", back_populates="notifications")

    def __repr__(self) -> str:
        return (
            f"<NotificationLog id={self.id} "
            f"channel={self.channel} "
            f"status={self.status} "
            f"recipient={self.recipient}>"
        )


class ProcessingLog(Base):
    """Log de ações de processamento do sistema."""

    __tablename__ = "processing_logs"

    id = Column(Integer, primary_key=True, index=True)
    action = Column(String(200), nullable=False, index=True)
    details = Column(JSON, nullable=True, default=dict)
    timestamp = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        index=True,
    )
    duration_ms = Column(Float, nullable=True, default=None)
    success = Column(Boolean, nullable=False, default=True, index=True)
    error_type = Column(String(200), nullable=True, default="")
    error_message = Column(Text, nullable=True, default="")
    context = Column(JSON, nullable=True, default=dict)  # Contexto adicional

    def __repr__(self) -> str:
        return (
            f"<ProcessingLog id={self.id} "
            f"action='{self.action}' "
            f"success={self.success}>"
        )
