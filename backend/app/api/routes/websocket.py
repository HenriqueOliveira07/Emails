"""
WebSocket para atualizações em tempo real do painel de controle.
Clientes conectados recebem estatísticas atualizadas a cada 30 segundos
e notificações de novos e-mails críticos/altos conforme chegam.
"""
import asyncio
import json
from datetime import date, datetime, timezone
from typing import Set

import structlog
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from sqlalchemy import func, select

from app.db.database import AsyncSessionLocal
from app.models.email import EmailAttachment, EmailRecord, PriorityLevel
from app.models.notification import NotificationLog, NotificationStatus, ProcessingLog

router = APIRouter()
logger = structlog.get_logger(__name__)

_connections: Set[WebSocket] = set()


async def broadcast(data: dict) -> None:
    """Envia mensagem para todos os WebSocket conectados."""
    dead = set()
    msg = json.dumps(data)
    for ws in _connections.copy():
        try:
            await ws.send_text(msg)
        except Exception:
            dead.add(ws)
    _connections.difference_update(dead)


async def _get_live_stats() -> dict:
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)
    async with AsyncSessionLocal() as db:
        total = (await db.execute(
            select(func.count(EmailRecord.id)).where(EmailRecord.processed_at >= today_start)
        )).scalar() or 0

        by_priority = {}
        for level in PriorityLevel:
            count = (await db.execute(
                select(func.count(EmailRecord.id)).where(
                    EmailRecord.processed_at >= today_start,
                    EmailRecord.priority == level,
                    EmailRecord.is_spam.is_(False),
                )
            )).scalar() or 0
            by_priority[level.value] = count

        spam = (await db.execute(
            select(func.count(EmailRecord.id)).where(
                EmailRecord.processed_at >= today_start,
                EmailRecord.is_spam.is_(True),
            )
        )).scalar() or 0

        attachments = (await db.execute(
            select(func.count(EmailAttachment.id))
            .join(EmailRecord)
            .where(EmailRecord.processed_at >= today_start)
        )).scalar() or 0

        wa_sent = (await db.execute(
            select(func.count(NotificationLog.id)).where(
                NotificationLog.created_at >= today_start,
                NotificationLog.status == NotificationStatus.SENT,
            )
        )).scalar() or 0

        errors = (await db.execute(
            select(func.count(ProcessingLog.id)).where(
                ProcessingLog.timestamp >= today_start,
                ProcessingLog.success.is_(False),
            )
        )).scalar() or 0

    return {
        "type": "stats_update",
        "date": date.today().isoformat(),
        "total_emails": total,
        "by_priority": by_priority,
        "spam": spam,
        "attachments_saved": attachments,
        "whatsapp_sent": wa_sent,
        "errors": errors,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.websocket("/ws/dashboard")
async def dashboard_ws(websocket: WebSocket) -> None:
    """WebSocket que entrega stats em tempo real para o painel."""
    await websocket.accept()
    _connections.add(websocket)
    logger.info("ws_connected", total=len(_connections))

    try:
        stats = await _get_live_stats()
        await websocket.send_text(json.dumps(stats))

        while True:
            await asyncio.sleep(30)
            stats = await _get_live_stats()
            await websocket.send_text(json.dumps(stats))
    except WebSocketDisconnect:
        logger.info("ws_disconnected")
    except Exception as e:
        logger.warning("ws_error", error=str(e))
    finally:
        _connections.discard(websocket)


async def notify_new_email(email_data: dict, ai_result: dict) -> None:
    """Chamado pelo worker quando um e-mail crítico/alto é detectado."""
    if not _connections:
        return
    priority = ai_result.get("priority", "")
    if priority not in ("CRITICO", "ALTO"):
        return
    msg = {
        "type": "new_email",
        "priority": priority,
        "subject": email_data.get("subject", ""),
        "sender": email_data.get("sender_email", ""),
        "summary": ai_result.get("summary", "")[:200],
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    await broadcast(msg)
