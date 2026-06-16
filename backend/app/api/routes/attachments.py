"""
Endpoints para listagem e consulta de anexos salvos.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord

router = APIRouter()


@router.get("")
async def list_attachments(
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    file_type: Optional[str] = Query(default=None, description="Filtro por extensão: pdf, xlsx..."),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com informações do e-mail de origem."""
    query = select(EmailAttachment).order_by(EmailAttachment.saved_at.desc())

    if file_type:
        query = query.where(EmailAttachment.filename.ilike(f"%.{file_type}"))

    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0

    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0

    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    attachments = result.scalars().all()

    return {
        "total": total,
        "total_size_mb": round(total_size / 1024 / 1024, 2),
        "items": [_serialize(a) for a in attachments],
        "limit": limit,
        "offset": offset,
    }


@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhes de um anexo específico incluindo texto extraído."""
    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    data = _serialize(att)
    data["ocr_text"] = att.ocr_text or ""
    data["pdf_text"] = att.pdf_text or ""
    data["ai_summary"] = att.ai_summary or ""
    return data


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
        "invoice_data": a.invoice_data or {},
        "is_malicious": a.is_malicious,
    }
