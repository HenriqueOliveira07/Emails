"""
Tarefas Celery para processamento automático de e-mails.
"""
import asyncio
import time
from contextlib import asynccontextmanager
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


@asynccontextmanager
async def worker_db():
    """Sessão de banco isolada para o event loop da tarefa (ver worker_sessionmaker)."""
    from app.db.database import worker_sessionmaker

    engine, factory = worker_sessionmaker()
    try:
        async with factory() as session:
            yield session
    finally:
        await engine.dispose()


def _acquire_cycle_lock():
    """
    Lock distribuído no Redis: impede dois ciclos simultâneos (beat a cada 60s +
    disparo manual, ou ciclo lento) de processar o mesmo e-mail e duplicar o WhatsApp.
    Retorna o lock adquirido, None se outro ciclo está rodando, ou "nolock" se o
    Redis estiver indisponível (o ciclo segue; a unique constraint do message_id protege o banco).
    """
    from app.config import settings

    try:
        import redis as redis_lib

        client = redis_lib.from_url(settings.REDIS_URL, socket_connect_timeout=3)
        lock = client.lock(
            "email_monitor:check_cycle", timeout=settings.CYCLE_LOCK_TTL_SECONDS, blocking=False
        )
        return lock if lock.acquire(blocking=False) else None
    except Exception as e:  # pragma: no cover - depende de infraestrutura
        logger.warning("cycle_lock_unavailable", error=str(e))
        return "nolock"


PRIORITY_MAP = {
    "CRITICO": "CRITICAL",
    "ALTO": "HIGH",
    "MEDIO": "MEDIUM",
    "BAIXO": "LOW",
}

INVOICE_HINTS = ("boleto", "nota fiscal", "nf-e", "nfe", "danfe", "fatura", "cobrança", "cobranca")


async def _check_new_emails_async() -> Dict[str, Any]:
    lock = _acquire_cycle_lock()
    if lock is None:
        logger.info("cycle_skipped_already_running")
        return {"skipped": "ciclo anterior ainda em execução"}
    try:
        return await _run_cycle()
    finally:
        if lock not in (None, "nolock"):
            try:
                lock.release()
            except Exception:
                pass


async def _run_cycle() -> Dict[str, Any]:
    from app.config import settings
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
        "emails_fetched": 0,
        "emails_processed": 0,
        "emails_ignored": 0,
        "emails_duplicated": 0,
        "attachments_saved": 0,
        "attachments_blocked": 0,
        "notifications_sent": 0,
        "notifications_failed": 0,
        "errors": 0,
    }

    reader = OutlookEmailReader()
    classifier = AIClassifier()
    whatsapp = WhatsAppSender()

    async with worker_db() as db:
        log_svc = LogService(db)
        try:
            try:
                raw_emails = await reader.get_new_emails(max_emails=settings.MAX_EMAILS_PER_BATCH)
            except Exception as e:
                logger.error("email_fetch_failed", error=str(e))
                await log_svc.log_error(
                    "integration_error", "outlook_graph", str(e)[:2000], {"stage": "fetch"}
                )
                await db.commit()
                stats["errors"] += 1
                return {"error": str(e), **stats}

            stats["emails_fetched"] = len(raw_emails)
            ids = [m.get("id", "") for m in raw_emails]
            already = set()
            if ids:
                already = set(
                    (await db.execute(
                        select(EmailRecord.message_id).where(EmailRecord.message_id.in_(ids))
                    )).scalars().all()
                )

            for raw in raw_emails:
                if raw.get("id", "") in already:
                    stats["emails_duplicated"] += 1
                    continue
                await _process_one(
                    raw, db, reader, classifier, whatsapp, log_svc, stats, settings,
                    EmailRecord, EmailAttachment, PriorityLevel,
                    NotificationLog, NotificationChannel, NotificationStatus,
                )

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


async def _process_one(
    raw, db, reader, classifier, whatsapp, log_svc, stats, settings,
    EmailRecord, EmailAttachment, PriorityLevel,
    NotificationLog, NotificationChannel, NotificationStatus,
) -> None:
    """
    Processa um e-mail de forma isolada: cada e-mail é commitado sozinho, então
    uma falha em um não descarta o trabalho dos demais nem deixa a sessão inválida.
    """
    from app.services.attachment_handler import AttachmentHandler
    from sqlalchemy.exc import IntegrityError

    email_start = time.monotonic()
    message_id = raw.get("id", "")
    try:
        parsed = reader.parse_email(raw)

        ai_result = classifier.classify_email(parsed)
        priority = PriorityLevel[PRIORITY_MAP.get(ai_result.get("priority", "BAIXO"), "LOW")]
        is_spam = bool(ai_result.get("is_spam"))

        # Anexos (somente para e-mails não-spam)
        attachments_data = []
        att_handler = AttachmentHandler()
        if parsed.get("has_attachments") and not is_spam:
            try:
                raw_attachments = await reader.get_attachments(message_id)
                attachments_data = await att_handler.save_attachments(parsed, raw_attachments)
            except Exception as e:
                stats["errors"] += 1
                await log_svc.log_error(
                    "integration_error", "attachment_download", str(e)[:2000],
                    {"message_id": message_id},
                )
            for blocked in att_handler.blocked:
                stats["attachments_blocked"] += 1
                await log_svc.log_error(
                    "attachment_blocked", "security", blocked["reason"],
                    {"message_id": message_id, "filename": blocked["filename"]},
                )

        # Resumo de PDFs e extração de boletos/NF (apenas prioridades relevantes, p/ controlar custo)
        if priority in (PriorityLevel.CRITICAL, PriorityLevel.HIGH, PriorityLevel.MEDIUM):
            for att in attachments_data:
                text = att.get("pdf_text") or att.get("ocr_text") or ""
                if len(text) < 50:
                    continue
                att["ai_summary"] = classifier.summarize_pdf(text)
                haystack = (text[:3000] + " " + att["original_filename"]).lower()
                if any(h in haystack for h in INVOICE_HINTS):
                    att["invoice_data"] = classifier.extract_invoice_data(text)

        duration_ms = (time.monotonic() - email_start) * 1000
        email_record = EmailRecord(
            message_id=message_id,
            subject=parsed["subject"][:1000],
            sender_email=parsed["sender_email"] or "desconhecido",
            sender_name=(parsed["sender_name"] or "")[:500],
            recipients=parsed["recipients"],
            body_preview=parsed["body_preview"],
            full_body=parsed.get("full_body", ""),
            received_at=parsed["received_at"],
            processed_at=datetime.now(timezone.utc),
            priority=priority,
            category=ai_result.get("category", "Geral"),
            ai_summary=ai_result.get("summary", ""),
            keywords_found=ai_result.get("keywords_found", []),
            action_required=bool(ai_result.get("action_required", False)),
            is_spam=is_spam,
            has_attachments=bool(attachments_data),
            attachment_count=len(attachments_data),
            processing_time_ms=duration_ms,
            raw_data=parsed.get("raw_data", {}),
        )
        db.add(email_record)
        await db.flush()

        if is_spam:
            # Spam/newsletter fica registrado (para deduplicar e para auditoria) mas não notifica
            await log_svc.log_email_ignored(message_id, parsed["sender_email"], "spam/newsletter")
            stats["emails_ignored"] += 1
            await db.commit()
            return

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
                ai_summary=att.get("ai_summary", ""),
                invoice_data=att.get("invoice_data", {}),
            ))
            stats["attachments_saved"] += 1
            await log_svc.log_attachment_saved(
                email_record.id, att["filename"], att["file_path"], att["file_size"]
            )

        # Commit antes do WhatsApp: se o envio travar/falhar, o e-mail já está salvo
        # e não será reprocessado (o que geraria notificação duplicada).
        await db.commit()

        if priority in (PriorityLevel.CRITICAL, PriorityLevel.HIGH):
            parsed["attachment_count"] = len(attachments_data)
            message_body = whatsapp.format_message(parsed, ai_result)
            wa_result = await whatsapp.send_email_notification(parsed, ai_result)
            whatsapp_sent = bool(wa_result.get("success", False))

            db.add(NotificationLog(
                email_id=email_record.id,
                channel=NotificationChannel.WHATSAPP,
                recipient=settings.WHATSAPP_TO_NUMBER,
                message_body=message_body,
                status=NotificationStatus.SENT if whatsapp_sent else NotificationStatus.FAILED,
                sent_at=datetime.now(timezone.utc) if whatsapp_sent else None,
                error_message=wa_result.get("error", ""),
                external_id=wa_result.get("external_id", ""),
            ))
            if whatsapp_sent:
                email_record.whatsapp_sent = True
                email_record.whatsapp_sent_at = datetime.now(timezone.utc)
                stats["notifications_sent"] += 1
            else:
                stats["notifications_failed"] += 1

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
            (time.monotonic() - email_start) * 1000,
        )
        await db.commit()
        stats["emails_processed"] += 1

        if settings.MARK_AS_READ:
            try:
                await reader.mark_as_read(message_id)
            except Exception as e:
                logger.warning("mark_as_read_failed", message_id=message_id, error=str(e))

    except IntegrityError:
        # Outro worker salvou o mesmo e-mail primeiro
        await db.rollback()
        stats["emails_duplicated"] += 1
    except Exception as e:
        await db.rollback()
        stats["errors"] += 1
        logger.error("email_processing_error", message_id=message_id, error=str(e))
        try:
            await log_svc.log_error(
                "email_processing_error", type(e).__name__, str(e)[:2000],
                {"message_id": message_id},
            )
            await db.commit()
        except Exception:
            await db.rollback()


@celery_app.task(name="app.workers.tasks.send_daily_summary")
def send_daily_summary() -> Dict[str, Any]:
    return run_async(_send_daily_summary_async())


async def _send_daily_summary_async() -> Dict[str, Any]:
    from app.models.email import EmailRecord, PriorityLevel
    from app.models.email import EmailAttachment
    from app.models.notification import NotificationLog, NotificationStatus, ProcessingLog
    from app.services.whatsapp_sender import WhatsAppSender
    from sqlalchemy import func, select
    from datetime import date

    from app.utils.timeutils import local_day_start

    today_start = local_day_start()

    async with worker_db() as db:
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

        errors = (await db.execute(
            select(func.count(ProcessingLog.id)).where(
                ProcessingLog.timestamp >= today_start,
                ProcessingLog.success == False,  # noqa: E712
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
        "errors": errors,
    }

    sender = WhatsAppSender()
    await sender.send_daily_summary(stats)
    await sender.close()
    return stats


@celery_app.task(name="app.workers.tasks.retry_failed_notifications")
def retry_failed_notifications() -> Dict[str, Any]:
    return run_async(_retry_failed_async())


async def _retry_failed_async() -> Dict[str, Any]:
    from app.models.notification import NotificationLog, NotificationStatus
    from app.models.email import EmailRecord
    from app.services.whatsapp_sender import WhatsAppSender
    from app.services.ai_classifier import AIClassifier
    from sqlalchemy import select
    from datetime import date

    from app.utils.timeutils import local_day_start

    today_start = local_day_start()
    retried = 0

    async with worker_db() as db:
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
    from app.models.notification import ProcessingLog
    from app.config import settings
    from sqlalchemy import delete

    cutoff = datetime.now(timezone.utc) - timedelta(days=settings.LOG_RETENTION_DAYS)

    async with worker_db() as db:
        result = await db.execute(
            delete(ProcessingLog).where(ProcessingLog.timestamp < cutoff)
        )
        deleted = result.rowcount
        await db.commit()

    logger.info("logs_cleaned", deleted=deleted, cutoff=cutoff.isoformat())
    return {"deleted": deleted}
