"""
Endpoints de gerenciamento de anexos salvos.
"""
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord
from app.utils.file_utils import get_dir_size_mb

router = APIRouter()


@router.get("")
async def list_attachments(
    email_id: Optional[int] = Query(None),
    file_type: Optional[str] = Query(None),
    has_ocr: Optional[bool] = Query(None),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista anexos com filtros opcionais."""
    query = select(EmailAttachment)

    if email_id is not None:
        query = query.where(EmailAttachment.email_id == email_id)
    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))
    if has_ocr is not None:
        if has_ocr:
            query = query.where(EmailAttachment.ocr_text != "")
        else:
            query = query.where(EmailAttachment.ocr_text == "")

    total = (await db.execute(
        select(func.count(EmailAttachment.id))
    )).scalar() or 0

    query = query.order_by(EmailAttachment.saved_at.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    attachments = result.scalars().all()

    return {
        "total": total,
        "items": [_serialize(a) for a in attachments],
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def attachment_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas gerais de anexos."""
    from app.config import settings

    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    with_ocr = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.ocr_text != "")
    )).scalar() or 0
    with_pdf = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.pdf_text != "")
    )).scalar() or 0
    malicious = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.is_malicious == True)  # noqa: E712
    )).scalar() or 0

    disk_mb = 0.0
    try:
        disk_mb = get_dir_size_mb(settings.ATTACHMENTS_BASE_PATH)
    except Exception:
        pass

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2) if total_size else 0,
        "disk_usage_mb": round(disk_mb, 2),
        "with_ocr_text": with_ocr,
        "with_pdf_text": with_pdf,
        "malicious_blocked": malicious,
    }


@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhes completos de um anexo."""
    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    data = _serialize(att)
    data["ocr_text"] = att.ocr_text or ""
    data["pdf_text"] = att.pdf_text[:2000] if att.pdf_text else ""
    data["ai_summary"] = att.ai_summary or ""
    data["invoice_data"] = att.invoice_data or {}
    return data


@router.post("/{attachment_id}/summarize")
async def summarize_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Gera resumo IA para um anexo PDF."""
    from app.services.ai_classifier import AIClassifier

    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    text = att.pdf_text or att.ocr_text or ""
    if not text:
        raise HTTPException(status_code=400, detail="Nenhum texto extraído disponível para resumo")

    classifier = AIClassifier()
    summary = classifier.summarize_pdf(text)
    att.ai_summary = summary
    await db.commit()

    return {"success": True, "summary": summary}


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
        "is_malicious": a.is_malicious,
        "scan_result": a.scan_result,
    }
