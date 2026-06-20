"""
Endpoints para listagem e consulta global de anexos salvos.
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
    file_type: Optional[str] = Query(None, description="Filtrar por MIME type (ex: application/pdf)"),
    sender: Optional[str] = Query(None, description="Filtrar por remetente"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com filtros opcionais."""
    query = (
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.sender_name, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
    )

    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))

    if sender:
        query = query.where(
            (EmailRecord.sender_email.ilike(f"%{sender}%"))
            | (EmailRecord.sender_name.ilike(f"%{sender}%"))
        )

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(EmailAttachment.saved_at.desc()).offset(offset).limit(limit)
    rows = (await db.execute(query)).all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
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
                "invoice_data": att.invoice_data,
                "sender_email": sender_email,
                "sender_name": sender_name,
                "email_subject": subject,
            }
            for att, sender_email, sender_name, subject in rows
        ],
    }


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas de anexos salvos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0

    type_counts_q = (
        select(EmailAttachment.file_type, func.count(EmailAttachment.id))
        .group_by(EmailAttachment.file_type)
        .order_by(func.count(EmailAttachment.id).desc())
        .limit(10)
    )
    type_rows = (await db.execute(type_counts_q)).all()

    return {
        "total_files": total,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size else 0,
        "by_type": {row[0] or "unknown": row[1] for row in type_rows},
    }
