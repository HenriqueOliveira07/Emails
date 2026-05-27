"""
Endpoints de gerenciamento de notificações.
"""
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.notification import NotificationLog, NotificationStatus

router = APIRouter()


class ManualNotificationRequest(BaseModel):
    email_id: int
    message: str


@router.get("")
async def list_notifications(
    limit: int = 50, db: AsyncSession = Depends(get_db)
) -> List[Dict[str, Any]]:
    """Lista histórico de notificações."""
    result = await db.execute(
        select(NotificationLog).order_by(NotificationLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [_serialize(n) for n in logs]


@router.get("/{notification_id}")
async def get_notification(
    notification_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Detalhe de uma notificação."""
    result = await db.execute(
        select(NotificationLog).where(NotificationLog.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")
    return _serialize(notif)


@router.post("/manual")
async def send_manual_notification(
    body: ManualNotificationRequest, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Envia uma notificação WhatsApp manual."""
    from app.config import settings
    from app.services.whatsapp_sender import WhatsAppSender
    from datetime import datetime, timezone

    sender = WhatsAppSender()
    result = await sender._send_message(settings.WHATSAPP_TO_NUMBER, body.message)
    await sender.close()

    notif = NotificationLog(
        email_id=body.email_id if body.email_id > 0 else None,
        channel=__import__("app.models.notification", fromlist=["NotificationChannel"]).NotificationChannel.WHATSAPP,
        recipient=settings.WHATSAPP_TO_NUMBER,
        message_body=body.message,
        status=NotificationStatus.SENT if result.get("success") else NotificationStatus.FAILED,
        sent_at=datetime.now(timezone.utc) if result.get("success") else None,
        error_message=result.get("error", ""),
        external_id=result.get("external_id", ""),
    )
    db.add(notif)
    await db.commit()

    return {"success": result.get("success"), "notification_id": notif.id}


@router.post("/{notification_id}/retry")
async def retry_notification(
    notification_id: int, db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Reenvia uma notificação que falhou."""
    from app.services.whatsapp_sender import WhatsAppSender
    from datetime import datetime, timezone

    result = await db.execute(
        select(NotificationLog).where(NotificationLog.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=404, detail="Notificação não encontrada")

    sender = WhatsAppSender()
    send_result = await sender._send_message(notif.recipient, notif.message_body)
    await sender.close()

    if send_result.get("success"):
        notif.status = NotificationStatus.SENT
        notif.sent_at = datetime.now(timezone.utc)
        notif.external_id = send_result.get("external_id", "")
    else:
        notif.status = NotificationStatus.FAILED
        notif.retry_count += 1
        notif.error_message = send_result.get("error", "")

    await db.commit()
    return {"success": send_result.get("success"), "retry_count": notif.retry_count}


def _serialize(n: NotificationLog) -> Dict[str, Any]:
    return {
        "id": n.id,
        "email_id": n.email_id,
        "channel": n.channel.value if n.channel else "whatsapp",
        "recipient": n.recipient,
        "message_body": n.message_body[:200] + "..." if len(n.message_body) > 200 else n.message_body,
        "status": n.status.value if n.status else "pendente",
        "sent_at": n.sent_at.isoformat() if n.sent_at else None,
        "error_message": n.error_message,
        "retry_count": n.retry_count,
        "external_id": n.external_id,
        "created_at": n.created_at.isoformat() if n.created_at else None,
    }
