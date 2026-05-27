"""
Serviço de logging estruturado para auditoria completa do sistema.
"""
import time
from typing import Any, Dict, Optional

import structlog
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import ProcessingLog

logger = structlog.get_logger(__name__)

# Configura structlog para output JSON em produção
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.add_log_level,
        structlog.processors.StackInfoRenderer(),
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(20),  # INFO=20
    context_class=dict,
    logger_factory=structlog.PrintLoggerFactory(),
)


class LogService:
    """Registra eventos de processamento no banco de dados e nos logs estruturados."""

    def __init__(self, db: Optional[AsyncSession] = None) -> None:
        self._db = db

    async def _persist(self, action: str, details: Dict, duration_ms: Optional[float],
                       success: bool, error_type: str = "", error_msg: str = "") -> None:
        if self._db is None:
            return
        entry = ProcessingLog(
            action=action,
            details=details,
            duration_ms=duration_ms,
            success=success,
            error_type=error_type,
            error_message=error_msg,
        )
        self._db.add(entry)
        await self._db.flush()

    async def log_email_processed(
        self,
        message_id: str,
        sender: str,
        subject: str,
        priority: str,
        duration_ms: float,
    ) -> None:
        details = {
            "message_id": message_id,
            "sender": sender,
            "subject": subject[:100],
            "priority": priority,
        }
        logger.info("email_processed", **details, duration_ms=duration_ms)
        await self._persist("email_processed", details, duration_ms, True)

    async def log_email_ignored(self, message_id: str, sender: str, reason: str) -> None:
        details = {"message_id": message_id, "sender": sender, "reason": reason}
        logger.info("email_ignored", **details)
        await self._persist("email_ignored", details, None, True)

    async def log_attachment_saved(
        self, email_id: int, filename: str, file_path: str, size_bytes: int
    ) -> None:
        details = {
            "email_id": email_id,
            "filename": filename,
            "file_path": file_path,
            "size_bytes": size_bytes,
        }
        logger.info("attachment_saved", **details)
        await self._persist("attachment_saved", details, None, True)

    async def log_whatsapp_sent(
        self, email_id: int, recipient: str, priority: str, success: bool,
        external_id: str = "", error: str = ""
    ) -> None:
        details = {
            "email_id": email_id,
            "recipient": recipient,
            "priority": priority,
            "external_id": external_id,
        }
        if success:
            logger.info("whatsapp_notification_sent", **details)
        else:
            logger.error("whatsapp_notification_failed", error=error, **details)
        await self._persist(
            "whatsapp_sent", details, None, success,
            error_msg=error if not success else ""
        )

    async def log_error(
        self, action: str, error_type: str, error_msg: str, context: Dict
    ) -> None:
        logger.error("system_error", action=action, error_type=error_type, error=error_msg, **context)
        await self._persist(action, context, None, False, error_type, error_msg)

    async def log_cycle_complete(self, emails_processed: int, emails_ignored: int,
                                  attachments_saved: int, notifications_sent: int,
                                  duration_ms: float) -> None:
        details = {
            "emails_processed": emails_processed,
            "emails_ignored": emails_ignored,
            "attachments_saved": attachments_saved,
            "notifications_sent": notifications_sent,
        }
        logger.info("cycle_complete", **details, duration_ms=duration_ms)
        await self._persist("cycle_complete", details, duration_ms, True)
