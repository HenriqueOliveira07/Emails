"""
Endpoints do painel de controle principal.
"""
from datetime import date, datetime, timezone
from typing import Any, Dict, List

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord, PriorityLevel
from app.models.notification import NotificationLog, NotificationStatus, ProcessingLog

router = APIRouter()


@router.get("/stats")
async def get_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas do dia atual."""
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total = (await db.execute(
        select(func.count(EmailRecord.id)).where(EmailRecord.processed_at >= today_start)
    )).scalar() or 0

    by_priority = {}
    for level in PriorityLevel:
        count = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.priority == level,
                EmailRecord.is_spam == False,  # noqa: E712
            )
        )).scalar() or 0
        by_priority[level.value] = count

    spam_count = (await db.execute(
        select(func.count(EmailRecord.id)).where(
            EmailRecord.processed_at >= today_start,
            EmailRecord.is_spam == True,  # noqa: E712
        )
    )).scalar() or 0

    attachments_today = (await db.execute(
        select(func.count(EmailAttachment.id))
        .join(EmailRecord)
        .where(EmailRecord.processed_at >= today_start)
    )).scalar() or 0

    whatsapp_sent = (await db.execute(
        select(func.count(NotificationLog.id)).where(
            NotificationLog.created_at >= today_start,
            NotificationLog.status == NotificationStatus.SENT,
        )
    )).scalar() or 0

    errors_today = (await db.execute(
        select(func.count(ProcessingLog.id)).where(
            ProcessingLog.timestamp >= today_start,
            ProcessingLog.success == False,  # noqa: E712
        )
    )).scalar() or 0

    return {
        "date": date.today().isoformat(),
        "total_emails": total,
        "by_priority": by_priority,
        "spam": spam_count,
        "attachments_saved": attachments_today,
        "whatsapp_sent": whatsapp_sent,
        "errors": errors_today,
    }


@router.get("/recent-emails")
async def get_recent_emails(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista os e-mails mais recentes processados."""
    result = await db.execute(
        select(EmailRecord)
        .where(EmailRecord.is_spam == False)  # noqa: E712
        .order_by(EmailRecord.received_at.desc())
        .offset(offset)
        .limit(limit)
    )
    emails = result.scalars().all()

    total = (await db.execute(
        select(func.count(EmailRecord.id)).where(EmailRecord.is_spam == False)  # noqa: E712
    )).scalar() or 0

    return {
        "total": total,
        "items": [_serialize_email(e) for e in emails],
        "limit": limit,
        "offset": offset,
    }


@router.get("/notifications")
async def get_notifications(
    limit: int = 30, db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Histórico de notificações enviadas."""
    result = await db.execute(
        select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": n.id,
            "channel": n.channel.value if n.channel else "whatsapp",
            "recipient": n.recipient,
            "status": n.status.value if n.status else "pendente",
            "sent_at": n.sent_at.isoformat() if n.sent_at else None,
            "error_message": n.error_message,
            "retry_count": n.retry_count,
        }
        for n in logs
    ]


@router.get("/processing-logs")
async def get_processing_logs(
    limit: int = 50, db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Últimos eventos de processamento."""
    result = await db.execute(
        select(ProcessingLog).order_by(ProcessingLog.timestamp.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": log.id,
            "action": log.action,
            "success": log.success,
            "duration_ms": log.duration_ms,
            "timestamp": log.timestamp.isoformat(),
            "error_type": log.error_type,
            "error_message": log.error_message,
            "details": log.details,
        }
        for log in logs
    ]


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Verifica saúde de todas as integrações."""
    status: Dict[str, Any] = {"overall": "ok", "services": {}}

    # PostgreSQL
    try:
        await db.execute(select(func.now()))
        status["services"]["postgresql"] = {"status": "ok"}
    except Exception as e:
        status["services"]["postgresql"] = {"status": "error", "error": str(e)}
        status["overall"] = "degraded"

    # Redis
    try:
        import redis as redis_lib
        r = redis_lib.from_url(
            __import__("app.config", fromlist=["settings"]).settings.REDIS_URL
        )
        r.ping()
        status["services"]["redis"] = {"status": "ok"}
    except Exception as e:
        status["services"]["redis"] = {"status": "error", "error": str(e)}
        status["overall"] = "degraded"

    # Celery
    try:
        from app.workers.celery_app import celery_app
        inspect = celery_app.control.inspect(timeout=2.0)
        active = inspect.active()
        status["services"]["celery"] = {
            "status": "ok" if active is not None else "no_workers",
            "workers": len(active) if active else 0,
        }
        if active is None:
            status["overall"] = "degraded"
    except Exception as e:
        status["services"]["celery"] = {"status": "error", "error": str(e)}
        status["overall"] = "degraded"

    # Integrations configured
    from app.config import settings as app_settings
    status["integrations"] = {
        "outlook": bool(app_settings.OUTLOOK_CLIENT_ID and app_settings.OUTLOOK_CLIENT_SECRET),
        "whatsapp": bool(app_settings.WHATSAPP_TO_NUMBER),
        "claude": bool(app_settings.ANTHROPIC_API_KEY),
    }

    return status


def _serialize_email(e: EmailRecord) -> Dict[str, Any]:
    return {
        "id": e.id,
        "message_id": e.message_id,
        "subject": e.subject,
        "sender_email": e.sender_email,
        "sender_name": e.sender_name,
        "received_at": e.received_at.isoformat() if e.received_at else None,
        "priority": e.priority.value if e.priority else "BAIXO",
        "category": e.category,
        "ai_summary": e.ai_summary,
        "has_attachments": e.has_attachments,
        "attachment_count": e.attachment_count,
        "whatsapp_sent": e.whatsapp_sent,
        "action_required": e.action_required,
        "processing_time_ms": e.processing_time_ms,
    }
