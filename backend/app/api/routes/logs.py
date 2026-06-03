"""
Endpoints de logs de processamento do sistema.
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

    total = (await db.execute(
        select(func.count(ProcessingLog.id))
    )).scalar() or 0

    query = query.order_by(ProcessingLog.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "total": total,
        "items": [_serialize(log) for log in logs],
        "limit": limit,
        "offset": offset,
    }


@router.get("/stats")
async def log_stats(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Estatísticas de processamento do dia atual."""
    today_start = datetime.combine(date.today(), datetime.min.time()).replace(tzinfo=timezone.utc)

    total = (await db.execute(
        select(func.count(ProcessingLog.id)).where(ProcessingLog.timestamp >= today_start)
    )).scalar() or 0

    errors = (await db.execute(
        select(func.count(ProcessingLog.id)).where(
            ProcessingLog.timestamp >= today_start,
            ProcessingLog.success == False,  # noqa: E712
        )
    )).scalar() or 0

    by_action = {}
    actions_result = await db.execute(
        select(ProcessingLog.action, func.count(ProcessingLog.id))
        .where(ProcessingLog.timestamp >= today_start)
        .group_by(ProcessingLog.action)
        .order_by(func.count(ProcessingLog.id).desc())
        .limit(10)
    )
    for action, count in actions_result.all():
        by_action[action] = count

    avg_duration = (await db.execute(
        select(func.avg(ProcessingLog.duration_ms)).where(
            ProcessingLog.timestamp >= today_start,
            ProcessingLog.action == "email_processed",
        )
    )).scalar()

    return {
        "date": date.today().isoformat(),
        "total_logs": total,
        "errors": errors,
        "success_rate": round((total - errors) / total * 100, 1) if total > 0 else 100.0,
        "by_action": by_action,
        "avg_processing_ms": round(float(avg_duration), 2) if avg_duration else None,
    }


@router.delete("/cleanup")
async def cleanup_old_logs(
    days: int = Query(default=30, ge=1, le=365),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Remove logs mais antigos que N dias."""
    from datetime import timedelta
    from sqlalchemy import delete

    cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    result = await db.execute(
        delete(ProcessingLog).where(ProcessingLog.timestamp < cutoff)
    )
    deleted = result.rowcount
    await db.commit()

    return {"deleted": deleted, "cutoff": cutoff.isoformat()}


def _serialize(log: ProcessingLog) -> Dict[str, Any]:
    return {
        "id": log.id,
        "action": log.action,
        "success": log.success,
        "duration_ms": log.duration_ms,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None,
        "error_type": log.error_type,
        "error_message": log.error_message,
        "details": log.details,
    }
