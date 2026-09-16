"""
Endpoints de configuração do sistema.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.models.sender_filter import SenderFilter, SenderFilterAction

router = APIRouter()


class CheckIntervalUpdate(BaseModel):
    seconds: int


class SenderFilterCreate(BaseModel):
    pattern: str
    action: str
    reason: Optional[str] = ""


@router.get("")
async def get_settings() -> Dict[str, Any]:
    """Retorna configurações atuais (sem expor credenciais)."""
    return {
        "app_name": settings.APP_NAME,
        "app_version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
        "check_interval_seconds": settings.CHECK_INTERVAL_SECONDS,
        "max_emails_per_batch": settings.MAX_EMAILS_PER_BATCH,
        "max_attachment_size_mb": settings.MAX_ATTACHMENT_SIZE_MB,
        "claude_model": settings.CLAUDE_MODEL,
        "whatsapp_provider": settings.WHATSAPP_PROVIDER,
        "log_retention_days": settings.LOG_RETENTION_DAYS,
        "integrations": {
            "outlook_configured": bool(settings.OUTLOOK_CLIENT_ID and settings.OUTLOOK_CLIENT_SECRET),
            "whatsapp_configured": bool(settings.WHATSAPP_TO_NUMBER),
            "claude_configured": bool(settings.ANTHROPIC_API_KEY),
            "email_address": settings.OUTLOOK_EMAIL_ADDRESS or "não configurado",
            "whatsapp_to": settings.WHATSAPP_TO_NUMBER or "não configurado",
        },
        "priority_keywords": {
            "critical": settings.PRIORITY_CRITICAL_KEYWORDS,
            "high": settings.PRIORITY_HIGH_KEYWORDS,
            "medium": settings.PRIORITY_MEDIUM_KEYWORDS,
        },
    }


@router.get("/keywords")
async def get_keywords() -> Dict[str, Any]:
    """Retorna as palavras-chave de prioridade configuradas."""
    return {
        "CRITICO": settings.PRIORITY_CRITICAL_KEYWORDS,
        "ALTO": settings.PRIORITY_HIGH_KEYWORDS,
        "MEDIO": settings.PRIORITY_MEDIUM_KEYWORDS,
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


@router.get("/sender-filters")
async def list_sender_filters(db: AsyncSession = Depends(get_db)) -> List[Dict[str, Any]]:
    """Lista todos os filtros personalizados por remetente."""
    result = await db.execute(select(SenderFilter).order_by(SenderFilter.created_at.desc()))
    filters = result.scalars().all()
    return [_serialize_filter(f) for f in filters]


@router.post("/sender-filters")
async def create_sender_filter(
    body: SenderFilterCreate, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Cria um novo filtro personalizado por remetente/domínio."""
    action = body.action.upper()
    if action not in SenderFilterAction.__members__:
        raise HTTPException(status_code=400, detail=f"Ação inválida: {body.action}")

    sender_filter = SenderFilter(
        pattern=body.pattern.strip(),
        action=SenderFilterAction[action],
        reason=body.reason or "",
    )
    db.add(sender_filter)
    await db.commit()
    await db.refresh(sender_filter)
    return _serialize_filter(sender_filter)


@router.delete("/sender-filters/{filter_id}")
async def delete_sender_filter(filter_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Remove um filtro personalizado por remetente."""
    result = await db.execute(select(SenderFilter).where(SenderFilter.id == filter_id))
    sender_filter = result.scalar_one_or_none()
    if not sender_filter:
        raise HTTPException(status_code=404, detail="Filtro não encontrado")

    await db.delete(sender_filter)
    await db.commit()
    return {"success": True}


def _serialize_filter(f: SenderFilter) -> Dict[str, Any]:
    return {
        "id": f.id,
        "pattern": f.pattern,
        "action": f.action.value if f.action else "",
        "reason": f.reason,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }
