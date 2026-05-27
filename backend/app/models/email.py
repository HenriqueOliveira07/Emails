"""
Modelos SQLAlchemy para e-mails e anexos.
"""
import enum
from datetime import datetime
from typing import Optional, List, Any, Dict

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


class PriorityLevel(str, enum.Enum):
    """Níveis de prioridade de e-mail."""
    CRITICAL = "CRITICO"
    HIGH = "ALTO"
    MEDIUM = "MEDIO"
    LOW = "BAIXO"


class EmailRecord(Base):
    """Registro de e-mail processado pelo sistema."""

    __tablename__ = "email_records"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String(512), unique=True, nullable=False, index=True)
    subject = Column(String(1000), nullable=True, default="(Sem assunto)")
    sender_email = Column(String(320), nullable=False, index=True)
    sender_name = Column(String(500), nullable=True, default="")
    recipients = Column(JSON, nullable=True, default=list)  # Lista de destinatários
    body_preview = Column(String(2000), nullable=True, default="")
    full_body = Column(Text, nullable=True, default="")
    received_at = Column(DateTime(timezone=True), nullable=False, index=True)
    processed_at = Column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    # Classificação por IA
    priority = Column(
        Enum(PriorityLevel),
        nullable=False,
        default=PriorityLevel.LOW,
        index=True,
    )
    category = Column(String(200), nullable=True, default="Geral")
    ai_summary = Column(Text, nullable=True, default="")
    keywords_found = Column(JSON, nullable=True, default=list)
    action_required = Column(Boolean, nullable=False, default=False)
    is_spam = Column(Boolean, nullable=False, default=False, index=True)

    # Anexos
    has_attachments = Column(Boolean, nullable=False, default=False)
    attachment_count = Column(Integer, nullable=False, default=0)

    # Notificações
    whatsapp_sent = Column(Boolean, nullable=False, default=False, index=True)
    whatsapp_sent_at = Column(DateTime(timezone=True), nullable=True, default=None)

    # Metadados de processamento
    processing_time_ms = Column(Float, nullable=True, default=None)
    raw_data = Column(JSON, nullable=True, default=dict)  # Dados brutos da Graph API

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

    # Relacionamentos
    attachments = relationship(
        "EmailAttachment",
        back_populates="email",
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    notifications = relationship(
        "NotificationLog",
        back_populates="email",
        cascade="all, delete-orphan",
        lazy="selectin",
    )

    def __repr__(self) -> str:
        return (
            f"<EmailRecord id={self.id} "
            f"from={self.sender_email} "
            f"priority={self.priority} "
            f"subject='{self.subject[:50]}'>"
        )

    @property
    def priority_display(self) -> str:
        """Retorna o nome de exibição da prioridade em português."""
        mapping = {
            PriorityLevel.CRITICAL: "CRÍTICO",
            PriorityLevel.HIGH: "ALTO",
            PriorityLevel.MEDIUM: "MÉDIO",
            PriorityLevel.LOW: "BAIXO",
        }
        return mapping.get(self.priority, "BAIXO")

    @property
    def priority_emoji(self) -> str:
        """Retorna emoji correspondente à prioridade."""
        mapping = {
            PriorityLevel.CRITICAL: "🔴",
            PriorityLevel.HIGH: "🟠",
            PriorityLevel.MEDIUM: "🟡",
            PriorityLevel.LOW: "🟢",
        }
        return mapping.get(self.priority, "🟢")


class EmailAttachment(Base):
    """Anexo de e-mail salvo no sistema de arquivos."""

    __tablename__ = "email_attachments"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(
        Integer,
        ForeignKey("email_records.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    filename = Column(String(500), nullable=False)  # Nome sanitizado no disco
    original_filename = Column(String(500), nullable=False)  # Nome original
    file_path = Column(String(2000), nullable=False)  # Caminho absoluto no disco
    file_size = Column(Integer, nullable=True, default=0)  # Tamanho em bytes
    file_type = Column(String(200), nullable=True, default="")  # MIME type
    saved_at = Column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    ocr_text = Column(Text, nullable=True, default="")  # Texto extraído por OCR
    pdf_text = Column(Text, nullable=True, default="")  # Texto extraído de PDF
    ai_summary = Column(Text, nullable=True, default="")  # Resumo por IA
    invoice_data = Column(JSON, nullable=True, default=dict)  # Dados de NF/boleto
    is_malicious = Column(Boolean, nullable=False, default=False)
    scan_result = Column(String(500), nullable=True, default="")

    # Relacionamento
    email = relationship("EmailRecord", back_populates="attachments")

    def __repr__(self) -> str:
        return (
            f"<EmailAttachment id={self.id} "
            f"email_id={self.email_id} "
            f"filename='{self.filename}'>"
        )

    @property
    def file_size_human(self) -> str:
        """Retorna o tamanho do arquivo em formato legível."""
        if not self.file_size:
            return "0 B"
        size = self.file_size
        for unit in ["B", "KB", "MB", "GB"]:
            if size < 1024:
                return f"{size:.1f} {unit}"
            size /= 1024
        return f"{size:.1f} TB"
