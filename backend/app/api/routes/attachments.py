"""
Endpoints REST para listagem e consulta de anexos.
"""
from typing import Any, Dict, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, func, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord

logger = structlog.get_logger(__name__)

router = APIRouter()


def _serialize(att: EmailAttachment, include_email: bool = True) -> Dict[str, Any]:
    base = {
        "id": att.id,
        "email_id": att.email_id,
        "filename": att.filename,
        "original_filename": att.original_filename,
        "file_path": att.file_path,
        "file_size": att.file_size,
        "file_size_human": att.file_size_human,
        "file_type": att.file_type,
        "saved_at": att.saved_at.isoformat() if att.saved_at else None,
        "ai_summary": att.ai_summary or "",
        "has_invoice_data": bool(att.invoice_data),
        "invoice_data": att.invoice_data or {},
        "has_ocr": bool(att.ocr_text),
        "has_pdf_text": bool(att.pdf_text),
        "is_malicious": att.is_malicious,
        "scan_result": att.scan_result or "",
    }
    if include_email and att.email:
        base["email"] = {
            "subject": att.email.subject,
            "sender_email": att.email.sender_email,
            "sender_name": att.email.sender_name,
            "priority": att.email.priority.value if att.email.priority else "BAIXO",
            "received_at": att.email.received_at.isoformat() if att.email.received_at else None,
        }
    return base


@router.get("/", summary="Listar todos os anexos")
async def list_attachments(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    file_type: Optional[str] = Query(None, description="Filtrar por tipo MIME (ex: application/pdf)"),
    sender: Optional[str] = Query(None, description="Filtrar por remetente do e-mail"),
    malicious_only: bool = Query(False, description="Somente anexos marcados como maliciosos"),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com paginação e filtros."""
    query = (
        select(EmailAttachment)
        .options(selectinload(EmailAttachment.email))
        .order_by(desc(EmailAttachment.saved_at))
    )

    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))
    if malicious_only:
        query = query.where(EmailAttachment.is_malicious == True)  # noqa: E712
    if sender:
        query = query.join(EmailRecord).where(
            EmailRecord.sender_email.ilike(f"%{sender}%")
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    result = await db.execute(query.limit(limit).offset(offset))
    items = result.scalars().all()

    return {
        "items": [_serialize(a) for a in items],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats", summary="Estatísticas de anexos")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Retorna estatísticas gerais dos anexos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    malicious = (
        await db.execute(
            select(func.count(EmailAttachment.id)).where(EmailAttachment.is_malicious == True)  # noqa: E712
        )
    ).scalar() or 0

    type_counts_raw = await db.execute(
        select(EmailAttachment.file_type, func.count(EmailAttachment.id))
        .group_by(EmailAttachment.file_type)
        .order_by(func.count(EmailAttachment.id).desc())
        .limit(10)
    )
    by_type = {row[0] or "desconhecido": row[1] for row in type_counts_raw.all()}

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_human": _human_size(total_size),
        "malicious_count": malicious,
        "by_file_type": by_type,
    }


@router.get("/{attachment_id}", summary="Detalhes de um anexo")
async def get_attachment(
    attachment_id: int,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Retorna detalhes completos de um anexo, incluindo texto extraído."""
    result = await db.execute(
        select(EmailAttachment)
        .options(selectinload(EmailAttachment.email))
        .where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    data = _serialize(att, include_email=True)
    data["ocr_text"] = att.ocr_text or ""
    data["pdf_text"] = att.pdf_text or ""
    return data


def _human_size(size_bytes: int) -> str:
    if not size_bytes:
        return "0 B"
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f} PB"
