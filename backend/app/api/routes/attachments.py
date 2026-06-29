"""
Endpoints de gerenciamento de anexos salvos.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord

router = APIRouter()


@router.get("")
async def list_attachments(
    file_type: Optional[str] = Query(None),
    sender: Optional[str] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com filtros."""
    query = select(EmailAttachment).join(EmailRecord)

    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    if sender:
        query = query.where(EmailRecord.sender_email.ilike(f"%{sender}%"))

    total_q = select(func.count(EmailAttachment.id)).join(EmailRecord)
    if file_type:
        total_q = total_q.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))
    if sender:
        total_q = total_q.where(EmailRecord.sender_email.ilike(f"%{sender}%"))
    total = (await db.execute(total_q)).scalar() or 0

    query = query.order_by(EmailAttachment.saved_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    attachments = result.scalars().all()

    items = []
    for a in attachments:
        email = await db.get(EmailRecord, a.email_id)
        items.append({
            "id": a.id,
            "email_id": a.email_id,
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
            "is_malicious": a.is_malicious,
            "sender_email": email.sender_email if email else "",
            "sender_name": email.sender_name if email else "",
            "email_subject": email.subject if email else "",
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatisticas gerais dos anexos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    with_ocr = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.ocr_text != "")
    )).scalar() or 0
    with_pdf = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.pdf_text != "")
    )).scalar() or 0

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size else 0,
        "with_ocr": with_ocr,
        "with_pdf_text": with_pdf,
    }
