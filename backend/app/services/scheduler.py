"""
Scheduler autônomo para execução em ambientes sem Celery.
Roda o loop de verificação de e-mails diretamente como asyncio task.
"""
import asyncio
import time
from datetime import datetime, timezone
from typing import Optional

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

_running = False
_last_run: Optional[datetime] = None
_cycle_count = 0


def is_running() -> bool:
    return _running


def get_last_run() -> Optional[datetime]:
    return _last_run


def get_cycle_count() -> int:
    return _cycle_count


async def run_check_cycle() -> dict:
    """
    Executa um ciclo de verificação de e-mails.
    Pode ser chamado diretamente ou pelo scheduler periódico.
    """
    global _last_run, _cycle_count

    from app.services.email_reader import OutlookEmailReader
    from app.services.ai_classifier import AIClassifier
    from app.services.whatsapp_sender import WhatsAppSender
    from app.services.attachment_handler import AttachmentHandler
    from app.services.log_service import LogService
    from app.db.database import AsyncSessionLocal
    from app.models.email import EmailRecord, EmailAttachment, PriorityLevel
    from app.models.notification import NotificationLog, NotificationChannel, NotificationStatus
    from sqlalchemy import select

    cycle_start = time.monotonic()
    stats = {
        "emails_processed": 0,
        "emails_ignored": 0,
        "attachments_saved": 0,
        "notifications_sent": 0,
        "errors": 0,
        "cycle": _cycle_count + 1,
        "started_at": datetime.now(timezone.utc).isoformat(),
    }

    reader = OutlookEmailReader()
    classifier = AIClassifier()
    whatsapp = WhatsAppSender()
    att_handler = AttachmentHandler()

    try:
        raw_emails = await reader.get_new_emails(max_emails=settings.MAX_EMAILS_PER_BATCH)
    except Exception as e:
        logger.error("scheduler_fetch_failed", error=str(e))
        await reader.close()
        await whatsapp.close()
        stats["errors"] += 1
        return stats

    async with AsyncSessionLocal() as db:
        log_svc = LogService(db)

        for raw in raw_emails:
            email_start = time.monotonic()
            try:
                parsed = reader.parse_email(raw)
                message_id = parsed["message_id"]

                existing = await db.execute(
                    select(EmailRecord).where(EmailRecord.message_id == message_id)
                )
                if existing.scalar_one_or_none():
                    continue

                ai_result = classifier.classify_email(parsed)

                try:
                    await reader.mark_as_read(message_id)
                except Exception:
                    pass

                if ai_result.get("is_spam"):
                    await log_svc.log_email_ignored(message_id, parsed["sender_email"], "spam")
                    stats["emails_ignored"] += 1
                    continue

                attachments_data = []
                if parsed.get("has_attachments"):
                    try:
                        raw_attachments = await reader.get_attachments(message_id)
                        attachments_data = await att_handler.save_attachments(parsed, raw_attachments)
                    except Exception as e:
                        logger.warning("scheduler_attachment_failed", error=str(e))

                priority_map = {
                    "CRITICO": PriorityLevel.CRITICAL,
                    "ALTO": PriorityLevel.HIGH,
                    "MEDIO": PriorityLevel.MEDIUM,
                    "BAIXO": PriorityLevel.LOW,
                }
                priority = priority_map.get(ai_result.get("priority", "BAIXO"), PriorityLevel.LOW)
                duration_ms = (time.monotonic() - email_start) * 1000

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

                await log_svc.log_email_processed(
                    message_id,
                    parsed["sender_email"],
                    parsed["subject"],
                    ai_result.get("priority", ""),
                    duration_ms,
                )
                stats["emails_processed"] += 1

            except Exception as e:
                logger.error("scheduler_email_error", error=str(e))
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

    _last_run = datetime.now(timezone.utc)
    _cycle_count += 1
    stats["duration_ms"] = round((time.monotonic() - cycle_start) * 1000, 2)
    logger.info("scheduler_cycle_done", **stats)
    return stats


async def start_background_scheduler() -> None:
    """
    Inicia o loop de verificação periódica em background.
    Chame durante o startup da aplicação como alternativa ao Celery.
    """
    global _running
    _running = True
    interval = settings.CHECK_INTERVAL_SECONDS
    logger.info("background_scheduler_started", interval_seconds=interval)

    while _running:
        try:
            await run_check_cycle()
        except Exception as e:
            logger.error("scheduler_cycle_exception", error=str(e))
        await asyncio.sleep(interval)


def stop_scheduler() -> None:
    global _running
    _running = False
    logger.info("background_scheduler_stopped")
