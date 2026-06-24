"""
Endpoints de configuração do sistema.
"""
from typing import Any, Dict

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter()


class CheckIntervalUpdate(BaseModel):
    seconds: int


@router.get("")
async def get_settings() -> Dict[str, Any]:
    """Retorna configurações atuais (sem expor credenciais)."""
    return {
        "app_name": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "check_interval_seconds": settings.CHECK_INTERVAL_SECONDS,
        "max_emails_per_batch": settings.MAX_EMAILS_PER_BATCH,
        "max_attachment_size_mb": settings.MAX_ATTACHMENT_SIZE_MB,
        "claude_model": settings.CLAUDE_MODEL,
        "whatsapp_provider": settings.WHATSAPP_PROVIDER,
        "log_retention_days": settings.LOG_RETENTION_DAYS,
        "outlook_email_address": settings.OUTLOOK_EMAIL_ADDRESS or "não configurado",
        "integrations": {
            "outlook_configured": bool(settings.OUTLOOK_CLIENT_ID and settings.OUTLOOK_CLIENT_SECRET),
            "whatsapp_configured": bool(settings.WHATSAPP_TO_NUMBER),
            "claude_configured": bool(settings.ANTHROPIC_API_KEY),
            "whatsapp_to": settings.WHATSAPP_TO_NUMBER or "não configurado",
        },
    }


@router.get("/keywords")
async def get_keywords() -> Dict[str, Any]:
    """Retorna as palavras-chave de prioridade configuradas."""
    return {
        "critical": settings.PRIORITY_CRITICAL_KEYWORDS,
        "high": settings.PRIORITY_HIGH_KEYWORDS,
        "medium": settings.PRIORITY_MEDIUM_KEYWORDS,
        "spam": settings.SPAM_KEYWORDS,
    }


@router.post("/trigger-check")
async def trigger_email_check() -> Dict[str, Any]:
    """Dispara manualmente uma verificação de e-mails."""
    from app.workers.tasks import check_new_emails
    task = check_new_emails.delay()
    return {"task_id": task.id, "status": "queued", "message": "Verificação de e-mails iniciada"}


@router.post("/trigger-summary")
async def trigger_daily_summary() -> Dict[str, Any]:
    """Dispara manualmente o envio do resumo diário."""
    from app.workers.tasks import send_daily_summary
    task = send_daily_summary.delay()
    return {"task_id": task.id, "status": "queued", "message": "Resumo diário iniciado"}
