"""
Endpoints de gerenciamento de e-mails.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord, PriorityLevel

router = APIRouter()


class PriorityUpdate(BaseModel):
    priority: str


@router.get("")
async def list_emails(
    priority: Optional[str] = Query(None),
    has_attachments: Optional[bool] = Query(None),
    sender: Optional[str] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista e-mails com filtros opcionais."""
    query = select(EmailRecord).where(EmailRecord.is_spam == False)  # noqa: E712

    if priority:
        level_map = {
            "CRITICO": PriorityLevel.CRITICAL,
            "ALTO": PriorityLevel.HIGH,
            "MEDIO": PriorityLevel.MEDIUM,
            "BAIXO": PriorityLevel.LOW,
        }
        if priority.upper() in level_map:
            query = query.where(EmailRecord.priority == level_map[priority.upper()])

    if has_attachments is not None:
        query = query.where(EmailRecord.has_attachments == has_attachments)

    if sender:
        query = query.where(EmailRecord.sender_email.ilike(f"%{sender}%"))

    count_query = select(func.count()).select_from(
        select(EmailRecord).where(EmailRecord.is_spam == False).subquery()  # noqa: E712
    )
    if priority:
        level_map_count = {
            "CRITICO": PriorityLevel.CRITICAL,
            "ALTO": PriorityLevel.HIGH,
            "MEDIO": PriorityLevel.MEDIUM,
            "BAIXO": PriorityLevel.LOW,
        }
        if priority.upper() in level_map_count:
            count_query = select(func.count(EmailRecord.id)).where(
                EmailRecord.is_spam == False,  # noqa: E712
                EmailRecord.priority == level_map_count[priority.upper()],
            )
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(EmailRecord.received_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    emails = result.scalars().all()

    return {
        "items": [_serialize(e) for e in emails],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{email_id}")
async def get_email(email_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Detalhes completos de um e-mail."""
    email = await _get_or_404(email_id, db)
    data = _serialize(email)
    data["full_body"] = email.full_body
    data["keywords_found"] = email.keywords_found
    data["recipients"] = email.recipients
    data["raw_data"] = email.raw_data
    return data


@router.post("/{email_id}/reclassify")
async def reclassify_email(email_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Re-executa a classificação de IA em um e-mail."""
    from app.services.ai_classifier import AIClassifier

    email = await _get_or_404(email_id, db)
    classifier = AIClassifier()
    ai_result = classifier.classify_email({
        "subject": email.subject,
        "sender_email": email.sender_email,
        "sender_name": email.sender_name,
        "body_preview": email.body_preview,
        "full_body": email.full_body,
        "has_attachments": email.has_attachments,
    })

    priority_map = {
        "CRITICO": PriorityLevel.CRITICAL,
        "ALTO": PriorityLevel.HIGH,
        "MEDIO": PriorityLevel.MEDIUM,
        "BAIXO": PriorityLevel.LOW,
    }
    email.priority = priority_map.get(ai_result.get("priority", "BAIXO"), PriorityLevel.LOW)
    email.category = ai_result.get("category", email.category)
    email.ai_summary = ai_result.get("summary", email.ai_summary)
    email.keywords_found = ai_result.get("keywords_found", [])
    email.action_required = ai_result.get("action_required", False)

    await db.commit()
    return {"success": True, "new_priority": email.priority.value, "ai_result": ai_result}


@router.get("/{email_id}/attachments")
async def get_attachments(email_id: int, db: AsyncSession = Depends(get_db)) -> List[Dict]:
    """Lista anexos de um e-mail."""
    await _get_or_404(email_id, db)
    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.email_id == email_id)
    )
    atts = result.scalars().all()
    return [
        {
            "id": a.id,
            "filename": a.filename,
            "original_filename": a.original_filename,
            "file_path": a.file_path,
            "file_size": a.file_size,
            "file_type": a.file_type,
            "saved_at": a.saved_at.isoformat() if a.saved_at else None,
            "has_ocr": bool(a.ocr_text),
            "has_pdf_text": bool(a.pdf_text),
            "has_ai_summary": bool(a.ai_summary),
            "invoice_data": a.invoice_data,
        }
        for a in atts
    ]


@router.patch("/{email_id}/priority")
async def update_priority(
    email_id: int, body: PriorityUpdate, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Atualiza manualmente a prioridade de um e-mail."""
    priority_map = {
        "CRITICO": PriorityLevel.CRITICAL,
        "ALTO": PriorityLevel.HIGH,
        "MEDIO": PriorityLevel.MEDIUM,
        "BAIXO": PriorityLevel.LOW,
    }
    if body.priority.upper() not in priority_map:
        raise HTTPException(status_code=400, detail=f"Prioridade inválida: {body.priority}")

    email = await _get_or_404(email_id, db)
    email.priority = priority_map[body.priority.upper()]
    await db.commit()
    return {"success": True, "priority": email.priority.value}


async def _get_or_404(email_id: int, db: AsyncSession) -> EmailRecord:
    result = await db.execute(select(EmailRecord).where(EmailRecord.id == email_id))
    email = result.scalar_one_or_none()
    if not email:
        raise HTTPException(status_code=404, detail="E-mail não encontrado")
    return email


def _serialize(e: EmailRecord) -> Dict[str, Any]:
    return {
        "id": e.id,
        "message_id": e.message_id,
        "subject": e.subject,
        "sender_email": e.sender_email,
        "sender_name": e.sender_name,
        "body_preview": e.body_preview,
        "received_at": e.received_at.isoformat() if e.received_at else None,
        "processed_at": e.processed_at.isoformat() if e.processed_at else None,
        "priority": e.priority.value if e.priority else "BAIXO",
        "category": e.category,
        "ai_summary": e.ai_summary,
        "action_required": e.action_required,
        "has_attachments": e.has_attachments,
        "attachment_count": e.attachment_count,
        "whatsapp_sent": e.whatsapp_sent,
        "whatsapp_sent_at": e.whatsapp_sent_at.isoformat() if e.whatsapp_sent_at else None,
        "is_spam": e.is_spam,
        "processing_time_ms": e.processing_time_ms,
    }
