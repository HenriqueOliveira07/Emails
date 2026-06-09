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
    filename: Optional[str] = Query(None),
    file_type: Optional[str] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista anexos salvos com metadados e informações do e-mail."""
    query = (
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
    )

    if filename:
        query = query.where(
            EmailAttachment.filename.ilike(f"%{filename}%")
            | EmailAttachment.original_filename.ilike(f"%{filename}%")
        )
    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    count_query = select(func.count(EmailAttachment.id))
    if filename:
        count_query = count_query.where(
            EmailAttachment.filename.ilike(f"%{filename}%")
            | EmailAttachment.original_filename.ilike(f"%{filename}%")
        )
    if file_type:
        count_query = count_query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(EmailAttachment.saved_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(query)).all()

    items = []
    for att, sender_email, subject in rows:
        items.append({
            "id": att.id,
            "email_id": att.email_id,
            "filename": att.filename,
            "original_filename": att.original_filename,
            "file_path": att.file_path,
            "file_size": att.file_size,
            "file_type": att.file_type,
            "saved_at": att.saved_at.isoformat() if att.saved_at else None,
            "has_ocr": bool(att.ocr_text),
            "has_pdf_text": bool(att.pdf_text),
            "has_ai_summary": bool(att.ai_summary),
            "invoice_data": att.invoice_data,
            "is_malicious": att.is_malicious,
            "sender_email": sender_email,
            "subject": subject,
        })

    return {"items": items, "total": total, "limit": limit, "offset": offset}


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas gerais dos anexos salvos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    malicious = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.is_malicious == True)  # noqa: E712
    )).scalar() or 0
    with_ocr = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.ocr_text != "")
    )).scalar() or 0
    with_pdf = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.pdf_text != "")
    )).scalar() or 0

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / 1024 / 1024, 2) if total_size else 0,
        "malicious_blocked": malicious,
        "with_ocr": with_ocr,
        "with_pdf_text": with_pdf,
    }
