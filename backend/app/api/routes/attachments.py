"""
Endpoints de gerenciamento de anexos.
"""
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord

router = APIRouter()


@router.get("")
async def list_attachments(
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Lista todos os anexos salvos."""
    result = await db.execute(
        select(EmailAttachment, EmailRecord.sender_email, EmailRecord.subject)
        .join(EmailRecord, EmailAttachment.email_id == EmailRecord.id)
        .order_by(EmailAttachment.saved_at.desc())
        .offset(offset)
        .limit(limit)
    )
    rows = result.all()
    return [
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
            "has_ai_summary": bool(att.ai_summary),
            "invoice_data": att.invoice_data,
            "is_malicious": att.is_malicious,
            "sender_email": sender_email,
            "subject": subject,
        }
        for att, sender_email, subject in rows
    ]


@router.get("/{attachment_id}")
async def get_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhes de um anexo específico."""
    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    return {
        "id": att.id,
        "email_id": att.email_id,
        "filename": att.filename,
        "original_filename": att.original_filename,
        "file_path": att.file_path,
        "file_size": att.file_size,
        "file_type": att.file_type,
        "saved_at": att.saved_at.isoformat() if att.saved_at else None,
        "ocr_text": att.ocr_text,
        "pdf_text": att.pdf_text,
        "ai_summary": att.ai_summary,
        "invoice_data": att.invoice_data,
        "is_malicious": att.is_malicious,
        "scan_result": att.scan_result,
    }


@router.post("/{attachment_id}/summarize")
async def summarize_attachment(
    attachment_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Gera resumo de IA para um anexo PDF."""
    from app.services.ai_classifier import AIClassifier

    result = await db.execute(
        select(EmailAttachment).where(EmailAttachment.id == attachment_id)
    )
    att = result.scalar_one_or_none()
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")

    text = att.pdf_text or att.ocr_text
    if not text:
        raise HTTPException(status_code=400, detail="Nenhum texto extraído disponível para este anexo")

    classifier = AIClassifier()
    summary = classifier.summarize_pdf(text)
    att.ai_summary = summary
    await db.commit()

    return {"success": True, "summary": summary}
