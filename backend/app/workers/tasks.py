"""
Tarefas Celery para processamento automático de e-mails.
"""
import asyncio
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict

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


PRIORITY_MAP_KEYS = {"CRITICO": "CRITICAL", "ALTO": "HIGH", "MEDIO": "MEDIUM", "BAIXO": "LOW"}


async def _check_new_emails_async() -> Dict[str, Any]:
    from app.config import settings
    from app.db.database import AsyncSessionLocal
    from app.services.ai_classifier import AIClassifier
    from app.services.attachment_handler import AttachmentHandler
    from app.services.email_reader import OutlookEmailReader
    from app.services.log_service import LogService
    from app.services.whatsapp_sender import WhatsAppSender

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
        try:
            raw_emails = await reader.get_new_emails(max_emails=settings.MAX_EMAILS_PER_BATCH)
        except Exception as e:
            logger.error("email_fetch_failed", error=str(e))
            async with AsyncSessionLocal() as db:
                await LogService(db).log_error("outlook_fetch", type(e).__name__, str(e))
                await db.commit()
            return {"error": str(e), **stats}

        async with AsyncSessionLocal() as db:
            log_svc = LogService(db)

            for raw in raw_emails:
                to_mark_read = None
                try:
                    # Savepoint por e-mail: uma falha não descarta o lote inteiro.
                    async with db.begin_nested():
                        outcome = await _process_one(
                            raw, db, log_svc, reader, classifier, whatsapp, att_handler, settings
                        )
                    await db.commit()
                    to_mark_read = outcome.get("message_id")
                    for k, v in outcome.get("stats", {}).items():
                        stats[k] += v
                except Exception as e:
                    stats["errors"] += 1
                    logger.error("email_processing_error", error=str(e), message_id=raw.get("id"))
                    try:
                        await log_svc.log_error(
                            "email_processing", type(e).__name__, str(e),
                            {"message_id": raw.get("id"), "subject": raw.get("subject")},
                        )
                        await db.commit()
                    except Exception:
                        await db.rollback()
                    # Não marca como lido: o e-mail será reprocessado no próximo ciclo.
                    continue

                # Marca como lido somente depois de persistido com sucesso.
                if to_mark_read:
                    try:
                        await reader.mark_as_read(to_mark_read)
                    except Exception as e:
                        logger.warning("mark_as_read_failed", error=str(e))

            cycle_ms = (time.monotonic() - cycle_start) * 1000
            await log_svc.log_cycle_complete(
                stats["emails_processed"],
                stats["emails_ignored"],
                stats["attachments_saved"],
                stats["notifications_sent"],
                cycle_ms,
            )
            await db.commit()
    finally:
        await reader.close()
        await whatsapp.close()

    logger.info("cycle_done", **stats)
    return stats


FINANCIAL_MARKERS = ("boleto", "nota fiscal", "danfe", "nf-e", "linha digitável",
                     "linha digitavel", "vencimento", "cnpj")


async def _enrich_attachments(attachments_data, classifier, ai_result) -> None:
    """Resumo de PDFs e extração de dados de boletos/NF a partir do texto (PDF ou OCR)."""
    summaries = []
    for att in attachments_data:
        text = att.get("pdf_text") or att.get("ocr_text") or ""
        if len(text) < 50:
            continue
        lowered = text.lower()
        if any(m in lowered for m in FINANCIAL_MARKERS):
            att["invoice_data"] = await asyncio.to_thread(classifier.extract_invoice_data, text)
        if att.get("pdf_text"):
            summary = await asyncio.to_thread(classifier.summarize_pdf, att["pdf_text"])
            if summary:
                att.setdefault("invoice_data", {})
                att["invoice_data"]["resumo"] = summary
                summaries.append(f"{att['original_filename']}: {summary}")
    if summaries:
        ai_result["attachment_summaries"] = summaries


async def _process_one(raw, db, log_svc, reader, classifier, whatsapp, att_handler, settings):
    """Processa um único e-mail. Lança exceção em caso de falha (savepoint é revertido)."""
    from sqlalchemy import func, select

    from app.models.email import EmailAttachment, EmailRecord, PriorityLevel
    from app.models.notification import NotificationChannel, NotificationLog, NotificationStatus
    from app.services import prefilter

    email_start = time.monotonic()
    local = {"emails_processed": 0, "emails_ignored": 0, "attachments_saved": 0,
             "notifications_sent": 0}

    parsed = reader.parse_email(raw)
    message_id = parsed["message_id"]

    existing = await db.execute(select(EmailRecord.id).where(EmailRecord.message_id == message_id))
    if existing.scalar_one_or_none():
        return {"message_id": message_id, "stats": local}

    # 1) Pré-filtro determinístico (sem custo de IA)
    pf = prefilter.evaluate(parsed)
    if pf.ignore:
        await log_svc.log_email_ignored(message_id, parsed["sender_email"], pf.reason)
        local["emails_ignored"] = 1
        return {"message_id": message_id, "stats": local}

    # 2) Recorrência do remetente nas últimas 24h (sinal para a IA)
    since = datetime.now(timezone.utc) - timedelta(hours=24)
    recent = (await db.execute(
        select(func.count(EmailRecord.id)).where(
            EmailRecord.sender_email == parsed["sender_email"],
            EmailRecord.received_at >= since,
        )
    )).scalar() or 0
    pf.signals["recent_from_sender"] = recent
    parsed["signals"] = pf.signals

    # 3) Classificação por IA (chamada síncrona isolada em thread)
    ai_result = await asyncio.to_thread(classifier.classify_email, parsed)
    if ai_result.get("is_spam") and not pf.force_priority:
        await log_svc.log_email_ignored(message_id, parsed["sender_email"], "ia_spam")
        local["emails_ignored"] = 1
        return {"message_id": message_id, "stats": local}

    priority_label = prefilter.apply_floor(ai_result.get("priority", "BAIXO"), pf.force_priority)
    ai_result["priority"] = priority_label
    priority = PriorityLevel[PRIORITY_MAP_KEYS.get(priority_label, "LOW")]

    # 4) Anexos
    attachments_data = []
    if parsed.get("has_attachments"):
        try:
            raw_attachments = await reader.get_attachments(message_id)
            attachments_data = await att_handler.save_attachments(parsed, raw_attachments)
            for b in att_handler.blocked:
                await log_svc.log_error("attachment_blocked", "SecurityBlock", b["reason"],
                                        {"message_id": message_id, "filename": b["filename"]})
            await _enrich_attachments(attachments_data, classifier, ai_result)
        except Exception as e:
            logger.warning("attachment_processing_failed", error=str(e))
            await log_svc.log_error("attachment_processing", type(e).__name__, str(e),
                                    {"message_id": message_id})

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
        raw_data={**parsed.get("raw_data", {}), "signals": pf.signals},
    )
    db.add(email_record)
    await db.flush()

    for att in attachments_data:
        db.add(EmailAttachment(
            email_id=email_record.id,
            filename=att["filename"],
            original_filename=att["original_filename"],
            file_path=att["file_path"],
            file_size=att["file_size"],
            file_type=att["file_type"],
            ocr_text=att.get("ocr_text", ""),
            pdf_text=att.get("pdf_text", ""),
            invoice_data=att.get("invoice_data", {}),
        ))
        local["attachments_saved"] += 1
        await log_svc.log_attachment_saved(
            email_record.id, att["filename"], att["file_path"], att["file_size"]
        )

    # 5) WhatsApp
    if priority_label in settings.WHATSAPP_NOTIFY_PRIORITIES:
        parsed["attachment_count"] = len(attachments_data)
        wa_result = await whatsapp.send_email_notification(parsed, ai_result)
        sent = wa_result.get("success", False)
        db.add(NotificationLog(
            email_id=email_record.id,
            channel=NotificationChannel.WHATSAPP,
            recipient=settings.WHATSAPP_TO_NUMBER,
            message_body=whatsapp.format_message(parsed, ai_result),
            status=NotificationStatus.SENT if sent else NotificationStatus.FAILED,
            sent_at=datetime.now(timezone.utc) if sent else None,
            error_message=wa_result.get("error", ""),
            external_id=wa_result.get("external_id", ""),
        ))
        if sent:
            email_record.whatsapp_sent = True
            email_record.whatsapp_sent_at = datetime.now(timezone.utc)
            local["notifications_sent"] = 1
        await log_svc.log_whatsapp_sent(
            email_record.id, settings.WHATSAPP_TO_NUMBER, priority_label, sent,
            wa_result.get("external_id", ""), wa_result.get("error", ""),
        )

    await log_svc.log_email_processed(
        message_id, parsed["sender_email"], parsed["subject"], priority_label, duration_ms
    )
    local["emails_processed"] = 1
    return {"message_id": message_id, "stats": local}


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
