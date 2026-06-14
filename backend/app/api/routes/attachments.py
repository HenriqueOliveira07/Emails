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

MIME_FILTER_MAP = {
    "pdf": "application/pdf",
    "excel": "spreadsheetml",
    "word": "wordprocessingml",
    "image": "image/",
    "csv": "text/csv",
    "zip": "zip",
    "xml": "xml",
}


@router.get("")
async def list_attachments(
    file_type: Optional[str] = Query(None, description="Filtro: pdf, excel, word, image, csv, zip, xml"),
    limit: int = Query(default=50, le=200),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista todos os anexos salvos com metadados do e-mail de origem."""
    query = (
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
    )

    if file_type and file_type in MIME_FILTER_MAP:
        mime_fragment = MIME_FILTER_MAP[file_type]
        query = query.where(EmailAttachment.file_type.ilike(f"%{mime_fragment}%"))

    total_query = select(func.count(EmailAttachment.id))
    if file_type and file_type in MIME_FILTER_MAP:
        total_query = total_query.where(
            EmailAttachment.file_type.ilike(f"%{MIME_FILTER_MAP[file_type]}%")
        )
    total = (await db.execute(total_query)).scalar() or 0

    size_query = select(func.sum(EmailAttachment.file_size))
    total_size = (await db.execute(size_query)).scalar() or 0

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
            "file_size": att.file_size or 0,
            "file_type": att.file_type or "",
            "saved_at": att.saved_at.isoformat() if att.saved_at else None,
            "has_ocr": bool(att.ocr_text),
            "has_pdf_text": bool(att.pdf_text),
            "has_ai_summary": bool(att.ai_summary),
            "invoice_data": att.invoice_data or {},
            "is_malicious": att.is_malicious,
            "sender_email": sender_email,
            "subject": subject,
        })

    return {
        "total": total,
        "total_size_bytes": total_size,
        "items": items,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhe de um anexo com dados extraídos."""
    row = (await db.execute(
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
        .where(EmailAttachment.id == attachment_id)
    )).first()

    if not row:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    att, sender_email, subject = row
    return {
        "id": att.id,
        "email_id": att.email_id,
        "filename": att.filename,
        "original_filename": att.original_filename,
        "file_path": att.file_path,
        "file_size": att.file_size or 0,
        "file_type": att.file_type or "",
        "saved_at": att.saved_at.isoformat() if att.saved_at else None,
        "ocr_text": att.ocr_text or "",
        "pdf_text": att.pdf_text or "",
        "ai_summary": att.ai_summary or "",
        "invoice_data": att.invoice_data or {},
        "is_malicious": att.is_malicious,
        "scan_result": att.scan_result or "",
        "sender_email": sender_email,
        "subject": subject,
    }


@router.post("/{attachment_id}/summarize")
async def summarize_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Gera ou regenera o resumo IA de um anexo PDF/OCR."""
    from app.services.ai_classifier import AIClassifier

    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    text = att.pdf_text or att.ocr_text or ""
    if not text:
        raise HTTPException(status_code=400, detail="Anexo sem texto extraível para resumir")

    classifier = AIClassifier()
    summary = classifier.summarize_pdf(text)
    att.ai_summary = summary
    await db.commit()

    return {"success": True, "attachment_id": attachment_id, "summary": summary}


@router.post("/{attachment_id}/extract-invoice")
async def extract_invoice_data(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Extrai dados financeiros (boleto, NF) de um anexo."""
    from app.services.ai_classifier import AIClassifier

    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    text = att.pdf_text or att.ocr_text or ""
    if not text:
        raise HTTPException(status_code=400, detail="Sem texto disponível para extração")

    classifier = AIClassifier()
    invoice_data = classifier.extract_invoice_data(text)
    att.invoice_data = invoice_data
    await db.commit()

    return {"success": True, "attachment_id": attachment_id, "invoice_data": invoice_data}


@router.get("/stats/summary")
async def attachments_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas gerais dos anexos."""
    total = (await db.execute(select(func.count(EmailAttachment.id)))).scalar() or 0
    total_size = (await db.execute(select(func.sum(EmailAttachment.file_size)))).scalar() or 0
    with_pdf = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.pdf_text != "")
    )).scalar() or 0
    with_ocr = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.ocr_text != "")
    )).scalar() or 0
    malicious = (await db.execute(
        select(func.count(EmailAttachment.id)).where(EmailAttachment.is_malicious == True)  # noqa: E712
    )).scalar() or 0

    return {
        "total_attachments": total,
        "total_size_bytes": total_size,
        "total_size_mb": round((total_size or 0) / (1024 * 1024), 2),
        "with_pdf_text": with_pdf,
        "with_ocr": with_ocr,
        "malicious_blocked": malicious,
    }
