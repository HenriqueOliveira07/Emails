"""
Endpoints de gerenciamento de anexos.
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
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    file_type: Optional[str] = Query(None, description="Filtrar por tipo MIME parcial"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com paginação."""
    query = (
        select(EmailAttachment)
        .join(EmailRecord)
        .order_by(EmailAttachment.saved_at.desc())
    )
    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    total_query = select(func.count(EmailAttachment.id))
    if file_type:
        total_query = total_query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    total = (await db.execute(total_query)).scalar() or 0
    result = await db.execute(query.offset(offset).limit(limit))
    attachments = result.scalars().all()

    return {
        "items": [_serialize(a) for a in attachments],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas de anexos por tipo."""
    from sqlalchemy import case

    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    with_pdf = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.pdf_text != "")
    )).scalar() or 0
    with_ocr = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.ocr_text != "")
    )).scalar() or 0

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / 1024 / 1024, 2) if total_size else 0,
        "with_pdf_text": with_pdf,
        "with_ocr_text": with_ocr,
    }


def _serialize(a: EmailAttachment) -> Dict[str, Any]:
    return {
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
    }
