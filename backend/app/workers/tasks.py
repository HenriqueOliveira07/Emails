"""
Tarefas Celery para processamento automático de e-mails.
"""
import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import structlog

from app.workers.celery_app import celery_app

logger = structlog.get_logger(__name__)


def run_async(coro):
    """Executa coroutine em contexto síncrono do Celery."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _sender_matches(sender_email: str, pattern: str) -> bool:
    """Compara um e-mail contra um padrão de e-mail exato ou domínio (@dominio.com)."""
    sender_email = (sender_email or "").lower()
    pattern = pattern.lower()
    if pattern.startswith("@"):
        return sender_email.endswith(pattern)
    return sender_email == pattern


def is_sender_blocked(sender_email: str, blocklist: list) -> bool:
    """Filtro personalizado: remetentes sempre ignorados (ex: fornecedores de spam conhecidos)."""
    return any(_sender_matches(sender_email, p) for p in blocklist)


def get_sender_priority_override(sender_email: str, overrides: dict) -> Optional[str]:
    """Filtro personalizado: força a prioridade para remetentes específicos (ex: diretoria)."""
    for pattern, priority in overrides.items():
        if _sender_matches(sender_email, pattern):
            return priority
    return None


@celery_app.task(
    bind=True,
    name="app.workers.tasks.check_new_emails",
    max_retries=3,
    default_retry_delay=30,
    soft_time_limit=300,
    time_limit=360,
)
def check_new_emails(self) -> Dict[str, Any]:
    """
    Tarefa principal: busca e-mails novos, classifica com IA,
    salva anexos e envia notificações WhatsApp.
    """
    return run_async(_check_new_emails_async())


async def _check_new_emails_async() -> Dict[str, Any]:
    from app.config import settings
    from app.db.database import AsyncSessionLocal
    from app.models.email import EmailRecord, EmailAttachment, PriorityLevel
    from app.models.notification import NotificationLog, NotificationChannel, NotificationStatus
    from app.services.email_reader import OutlookEmailReader
    from app.services.ai_classifier import AIClassifier
    from app.services.whatsapp_sender import WhatsAppSender
    from app.services.attachment_handler import AttachmentHandler
    from app.services.log_service import LogService
    from sqlalchemy import select

    cycle_start = time.monotonic()
    stats = {
        "emails_processed": 0,
        "emails_ignored": 0,
        "attachments_saved": 0,
        "notifications_sent": 0,
        "errors": 0,
    }

    reader = OutlookEmailReader()
    classifier = AIClassifier()
    whatsapp = WhatsAppSender()
    att_handler = AttachmentHandler()

    try:
        raw_emails = await reader.get_new_emails(max_emails=settings.MAX_EMAILS_PER_BATCH)
    except Exception as e:
        logger.error("email_fetch_failed", error=str(e))
        await reader.close()
        await whatsapp.close()
        return {"error": str(e), **stats}

    async with AsyncSessionLocal() as db:
        log_svc = LogService(db)

        for raw in raw_emails:
            email_start = time.monotonic()
            try:
                parsed = reader.parse_email(raw)
                message_id = parsed["message_id"]

                # Verificar duplicata
                existing = await db.execute(
                    select(EmailRecord).where(EmailRecord.message_id == message_id)
                )
                if existing.scalar_one_or_none():
                    continue

                # Filtro personalizado: remetente sempre ignorado
                if is_sender_blocked(parsed["sender_email"], settings.SENDER_BLOCKLIST):
                    try:
                        await reader.mark_as_read(message_id)
                    except Exception:
                        pass
                    await log_svc.log_email_ignored(message_id, parsed["sender_email"], "sender_blocklist")
                    stats["emails_ignored"] += 1
                    continue

                # Classificar com IA
                ai_result = classifier.classify_email(parsed)

                # Marcar como lido no Outlook
                try:
                    await reader.mark_as_read(message_id)
                except Exception:
                    pass

                if ai_result.get("is_spam"):
                    await log_svc.log_email_ignored(message_id, parsed["sender_email"], "spam")
                    stats["emails_ignored"] += 1
                    continue

                # Filtro personalizado: prioridade forçada por remetente (ex: diretoria)
                priority_override = get_sender_priority_override(
                    parsed["sender_email"], settings.SENDER_PRIORITY_OVERRIDES
                )
                if priority_override:
                    ai_result["priority"] = priority_override

                # Processar anexos
                attachments_data = []
                if parsed.get("has_attachments"):
                    try:
                        raw_attachments = await reader.get_attachments(message_id)
                        attachments_data = await att_handler.save_attachments(parsed, raw_attachments)
                        for att in attachments_data:
                            doc_text = att.get("pdf_text") or att.get("ocr_text")
                            if doc_text:
                                att["invoice_data"] = classifier.extract_invoice_data(doc_text)
                    except Exception as e:
                        logger.warning("attachment_processing_failed", error=str(e))

                # Mapeamento de prioridade
                priority_map = {
                    "CRITICO": PriorityLevel.CRITICAL,
                    "ALTO": PriorityLevel.HIGH,
                    "MEDIO": PriorityLevel.MEDIUM,
                    "BAIXO": PriorityLevel.LOW,
                }
                priority = priority_map.get(ai_result.get("priority", "BAIXO"), PriorityLevel.LOW)

                duration_ms = (time.monotonic() - email_start) * 1000

                # Salvar e-mail no banco
                email_record = EmailRecord(
                    message_id=message_id,
                    subject=parsed["subject"],
                    sender_email=parsed["sender_email"],
                    sender_name=parsed["sender_name"],
                    recipients=parsed["recipients"],
                    body_preview=parsed["body_preview"],
                    full_body=parsed.get("full_body", ""),
                    received_at=parsed["received_at"],
                    processed_at=datetime.now(timezone.utc),
                    priority=priority,
                    category=ai_result.get("category", "Geral"),
                    ai_summary=ai_result.get("summary", ""),
                    keywords_found=ai_result.get("keywords_found", []),
                    action_required=ai_result.get("action_required", False),
                    is_spam=False,
                    has_attachments=bool(attachments_data),
                    attachment_count=len(attachments_data),
                    processing_time_ms=duration_ms,
                    raw_data=parsed.get("raw_data", {}),
                )
                db.add(email_record)
                await db.flush()

                # Salvar anexos no banco
                for att in attachments_data:
                    att_record = EmailAttachment(
                        email_id=email_record.id,
                        filename=att["filename"],
                        original_filename=att["original_filename"],
                        file_path=att["file_path"],
                        file_size=att["file_size"],
                        file_type=att["file_type"],
                        ocr_text=att.get("ocr_text", ""),
                        pdf_text=att.get("pdf_text", ""),
                        invoice_data=att.get("invoice_data", {}),
                    )
                    db.add(att_record)
                    stats["attachments_saved"] += 1
                    await log_svc.log_attachment_saved(
                        email_record.id, att["filename"], att["file_path"], att["file_size"]
                    )

                # Enviar WhatsApp se for CRÍTICO ou ALTO
                whatsapp_sent = False
                if priority in (PriorityLevel.CRITICAL, PriorityLevel.HIGH):
                    parsed["attachment_count"] = len(attachments_data)
                    wa_result = await whatsapp.send_email_notification(parsed, ai_result)
                    whatsapp_sent = wa_result.get("success", False)

                    notif = NotificationLog(
                        email_id=email_record.id,
                        channel=NotificationChannel.WHATSAPP,
                        recipient=settings.WHATSAPP_TO_NUMBER,
                        message_body=whatsapp.format_message(parsed, ai_result),
                        status=NotificationStatus.SENT if whatsapp_sent else NotificationStatus.FAILED,
                        sent_at=datetime.now(timezone.utc) if whatsapp_sent else None,
                        error_message=wa_result.get("error", ""),
                        external_id=wa_result.get("external_id", ""),
                    )
                    db.add(notif)

                    if whatsapp_sent:
                        email_record.whatsapp_sent = True
                        email_record.whatsapp_sent_at = datetime.now(timezone.utc)
                        stats["notifications_sent"] += 1

                    await log_svc.log_whatsapp_sent(
                        email_record.id,
                        settings.WHATSAPP_TO_NUMBER,
                        ai_result.get("priority", ""),
                        whatsapp_sent,
                        wa_result.get("external_id", ""),
                        wa_result.get("error", ""),
                    )

                await log_svc.log_email_processed(
                    message_id,
                    parsed["sender_email"],
                    parsed["subject"],
                    ai_result.get("priority", ""),
                    duration_ms,
                )
                stats["emails_processed"] += 1

            except Exception as e:
                logger.error("email_processing_error", error=str(e))
                stats["errors"] += 1

        await db.commit()

        cycle_ms = (time.monotonic() - cycle_start) * 1000
        await log_svc.log_cycle_complete(
            stats["emails_processed"],
            stats["emails_ignored"],
            stats["attachments_saved"],
            stats["notifications_sent"],
            cycle_ms,
        )
        await db.commit()

    await reader.close()
    await whatsapp.close()
    logger.info("cycle_done", **stats)
    return stats


@celery_app.task(name="app.workers.tasks.send_daily_summary")
def send_daily_summary() -> Dict[str, Any]:
    return run_async(_send_daily_summary_async())


async def _send_daily_summary_async() -> Dict[str, Any]:
    from app.db.database import AsyncSessionLocal
    from app.models.email import EmailRecord, PriorityLevel
    from app.models.email import EmailAttachment
    from app.models.notification import NotificationLog, NotificationStatus
    from app.services.whatsapp_sender import WhatsAppSender
    from sqlalchemy import func, select
    from datetime import date

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    async with AsyncSessionLocal() as db:
        total = (await db.execute(
            select(func.count(EmailRecord.id)).where(EmailRecord.processed_at >= today_start)
        )).scalar() or 0

        critical = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.priority == PriorityLevel.CRITICAL,
            )
        )).scalar() or 0

        high = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.priority == PriorityLevel.HIGH,
            )
        )).scalar() or 0

        medium = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.priority == PriorityLevel.MEDIUM,
            )
        )).scalar() or 0

        low = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.priority == PriorityLevel.LOW,
            )
        )).scalar() or 0

        attachments = (await db.execute(
            select(func.count(EmailAttachment.id)).join(EmailRecord).where(
                EmailRecord.processed_at >= today_start
            )
        )).scalar() or 0

        notifications = (await db.execute(
            select(func.count(NotificationLog.id)).where(
                NotificationLog.created_at >= today_start,
                NotificationLog.status == NotificationStatus.SENT,
            )
        )).scalar() or 0

    stats = {
        "total": total,
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "attachments": attachments,
        "notifications": notifications,
        "errors": 0,
    }

    sender = WhatsAppSender()
    await sender.send_daily_summary(stats)
    await sender.close()
    return stats


@celery_app.task(name="app.workers.tasks.retry_failed_notifications")
def retry_failed_notifications() -> Dict[str, Any]:
    return run_async(_retry_failed_async())


async def _retry_failed_async() -> Dict[str, Any]:
    from app.db.database import AsyncSessionLocal
    from app.models.notification import NotificationLog, NotificationStatus
    from app.models.email import EmailRecord
    from app.services.whatsapp_sender import WhatsAppSender
    from app.services.ai_classifier import AIClassifier
    from sqlalchemy import select
    from datetime import date

    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    retried = 0

    async with AsyncSessionLocal() as db:
        failed = (await db.execute(
            select(NotificationLog).where(
                NotificationLog.status == NotificationStatus.FAILED,
                NotificationLog.retry_count < 3,
                NotificationLog.created_at >= today_start,
            )
        )).scalars().all()

        sender = WhatsAppSender()
        for notif in failed:
            try:
                result = await sender._send_message(notif.recipient, notif.message_body)
                if result.get("success"):
                    notif.status = NotificationStatus.SENT
                    notif.sent_at = datetime.now(timezone.utc)
                    notif.external_id = result.get("external_id", "")
                    retried += 1
                else:
                    notif.retry_count += 1
            except Exception as e:
                notif.retry_count += 1
                notif.error_message = str(e)

        await db.commit()
        await sender.close()

    return {"retried": retried, "total_failed": len(failed)}


@celery_app.task(name="app.workers.tasks.cleanup_old_logs")
def cleanup_old_logs() -> Dict[str, Any]:
    return run_async(_cleanup_async())


async def _cleanup_async() -> Dict[str, Any]:
    from app.db.database import AsyncSessionLocal
    from app.models.notification import ProcessingLog
    from app.config import settings
    from sqlalchemy import delete

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.LOG_RETENTION_DAYS)

    async with AsyncSessionLocal() as db:
        result = await db.execute(
            delete(ProcessingLog).where(ProcessingLog.timestamp < cutoff)
        )
        deleted = result.rowcount
        await db.commit()

    logger.info("logs_cleaned", deleted=deleted, cutoff=cutoff.isoformat())
    return {"deleted": deleted}
