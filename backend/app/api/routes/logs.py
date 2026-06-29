"""
Endpoints de gerenciamento de logs de processamento.
"""
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.notification import ProcessingLog

router = APIRouter()


@router.get("")
async def list_logs(
    action: Optional[str] = Query(None),
    success: Optional[bool] = Query(None),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista logs de processamento com filtros."""
    query = select(ProcessingLog)

    if action:
        query = query.where(ProcessingLog.action.ilike(f"%{action}%"))

    if success is not None:
        query = query.where(ProcessingLog.success == success)

    total_q = select(func.count(ProcessingLog.id))
    if action:
        total_q = total_q.where(ProcessingLog.action.ilike(f"%{action}%"))
    if success is not None:
        total_q = total_q.where(ProcessingLog.success == success)
    total = (await db.execute(total_q)).scalar() or 0

    query = query.order_by(ProcessingLog.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "items": [
            {
                "id": log.id,
                "action": log.action,
                "success": log.success,
                "duration_ms": log.duration_ms,
                "timestamp": log.timestamp.isoformat() if log.timestamp else None,
                "error_type": log.error_type,
                "error_message": log.error_message,
                "details": log.details,
                "context": log.context,
            }
            for log in logs
        ],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def log_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatisticas dos logs."""
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total_today = (await db.execute(
        select(func.count(ProcessingLog.id)).where(ProcessingLog.timestamp >= today_start)
    )).scalar() or 0

    errors_today = (await db.execute(
        select(func.count(ProcessingLog.id)).where(
            ProcessingLog.timestamp >= today_start,
            ProcessingLog.success == False,  # noqa: E712
        )
    )).scalar() or 0

    total_all = (await db.execute(select(func.count(ProcessingLog.id)))).scalar() or 0
    errors_all = (await db.execute(
        select(func.count(ProcessingLog.id)).where(ProcessingLog.success == False)  # noqa: E712
    )).scalar() or 0

    actions_result = await db.execute(
        select(ProcessingLog.action, func.count(ProcessingLog.id))
        .where(ProcessingLog.timestamp >= today_start)
        .group_by(ProcessingLog.action)
    )
    actions_today = {row[0]: row[1] for row in actions_result.all()}

    return {
        "total_today": total_today,
        "errors_today": errors_today,
        "total_all": total_all,
        "errors_all": errors_all,
        "actions_today": actions_today,
    }
