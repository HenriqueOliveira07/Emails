"""
Rotas de anexos salvos e download seguro.
"""
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.database import get_db
from app.models.email import EmailAttachment, EmailRecord

router = APIRouter()


@router.get("")
async def list_attachments(
    page: int = 1,
    page_size: int = 50,
    file_type: Optional[str] = None,
    sender: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista anexos salvos com filtros por tipo e remetente."""
    page = max(page, 1)
    page_size = min(max(page_size, 1), 200)
    query = select(EmailAttachment, EmailRecord).join(
        EmailRecord, EmailAttachment.email_id == EmailRecord.id
    )
    if file_type:
        query = query.where(EmailAttachment.file_type.ilike(f"%{file_type}%"))
    if sender:
        query = query.where(EmailRecord.sender_email.ilike(f"%{sender}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    rows = (
        await db.execute(
            query.order_by(EmailAttachment.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [
            {
                "id": att.id,
                "email_id": att.email_id,
                "filename": att.filename,
                "original_filename": att.original_filename,
                "file_path": att.file_path,
                "file_size": att.file_size,
                "file_type": att.file_type,
                "sender_email": email.sender_email,
                "subject": email.subject,
                "received_at": email.received_at.isoformat() if email.received_at else None,
                "has_invoice_data": bool(att.invoice_data),
            }
            for att, email in rows
        ],
    }


@router.get("/{attachment_id}/download")
async def download_attachment(attachment_id: int, db: AsyncSession = Depends(get_db)):
    """Download do anexo, restrito ao diretório base configurado."""
    att = await db.get(EmailAttachment, attachment_id)
    if not att:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    base = Path(settings.ATTACHMENTS_BASE_PATH).resolve()
    path = Path(att.file_path).resolve()
    if base not in path.parents or not path.is_file():
        raise HTTPException(status_code=404, detail="Arquivo indisponível")
    return FileResponse(path, filename=att.original_filename or att.filename)
