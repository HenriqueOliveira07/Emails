"""
Endpoints de gerenciamento de anexos.
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
    file_type: Optional[str] = Query(None, description="Filtrar por tipo MIME"),
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
        query = query.where(EmailRecord.sender_email.ilike(f"%{sender}%"))

    count_query = select(func.count(EmailAttachment.id)).join(
        EmailRecord, EmailAttachment.email_id == EmailRecord.id
    )
    if file_type:
        count_query = count_query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))
    if sender:
        count_query = count_query.where(EmailRecord.sender_email.ilike(f"%{sender}%"))

    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(EmailAttachment.saved_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    rows = result.all()

    return {
        "total": total,
        "limit": limit,
        "offset": offset,
        "items": [
            {
                "id": att.id,
                "email_id": att.email_id,
                "sender_email": sender_email,
                "sender_name": sender_name,
                "email_subject": subject,
                "filename": att.filename,
                "original_filename": att.original_filename,
                "file_path": att.file_path,
                "file_size": att.file_size,
                "file_size_human": _human_size(att.file_size or 0),
                "file_type": att.file_type,
                "saved_at": att.saved_at.isoformat() if att.saved_at else None,
                "has_ocr": bool(att.ocr_text),
                "has_pdf_text": bool(att.pdf_text),
                "has_ai_summary": bool(att.ai_summary),
                "invoice_data": att.invoice_data,
                "is_malicious": att.is_malicious,
            }
            for att, sender_email, sender_name, subject in rows
        ],
    }


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas gerais dos anexos salvos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0

    type_counts_result = await db.execute(
        select(EmailAttachment.file_type, func.count(EmailAttachment.id))
        .group_by(EmailAttachment.file_type)
        .order_by(func.count(EmailAttachment.id).desc())
        .limit(10)
    )
    by_type = {row[0] or "desconhecido": row[1] for row in type_counts_result.all()}

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_human": _human_size(total_size),
        "by_type": by_type,
    }


@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhes de um anexo específico."""
    result = await db.execute(
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.sender_name, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
        .where(EmailAttachment.id == attachment_id)
    )
    row = result.first()
    if not row:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    att, sender_email, sender_name, subject = row
    return {
        "id": att.id,
        "email_id": att.email_id,
        "sender_email": sender_email,
        "sender_name": sender_name,
        "email_subject": subject,
        "filename": att.filename,
        "original_filename": att.original_filename,
        "file_path": att.file_path,
        "file_size": att.file_size,
        "file_size_human": _human_size(att.file_size or 0),
        "file_type": att.file_type,
        "saved_at": att.saved_at.isoformat() if att.saved_at else None,
        "ocr_text": att.ocr_text,
        "pdf_text": att.pdf_text,
        "ai_summary": att.ai_summary,
        "invoice_data": att.invoice_data,
        "is_malicious": att.is_malicious,
        "scan_result": att.scan_result,
    }


def _human_size(size_bytes: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"
