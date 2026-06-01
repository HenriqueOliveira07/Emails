"""
Endpoints de logs de processamento e auditoria.
"""
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.database import get_db
from app.models.notification import ProcessingLog

router = APIRouter()


@router.get("")
async def list_logs(
    action: Optional[str] = Query(None, description="Filtrar por tipo de ação"),
    success: Optional[bool] = Query(None),
    since_hours: int = Query(default=24, description="Logs das últimas N horas"),
    limit: int = Query(default=100, le=500),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Lista logs de processamento com filtros."""
    since = datetime.now(timezone.utc) - timedelta(hours=since_hours)
    query = select(ProcessingLog).where(ProcessingLog.timestamp >= since)

    if action:
        query = query.where(ProcessingLog.action.ilike(f"%{action}%"))
    if success is not None:
        query = query.where(ProcessingLog.success == success)

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(ProcessingLog.timestamp.desc()).offset(offset).limit(limit)
    result = await db.execute(query)
    logs = result.scalars().all()

    return {
        "total": total,
        "items": [_serialize(log) for log in logs],
        "limit": limit,
        "offset": offset,
        "since_hours": since_hours,
    }


@router.get("/summary")
async def log_summary(db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Resumo das ações de log das últimas 24h."""
    since = datetime.now(timezone.utc) - timedelta(hours=24)

    actions_result = await db.execute(
        select(ProcessingLog.action, func.count(ProcessingLog.id), func.sum(
            ProcessingLog.duration_ms
        ))
        .where(ProcessingLog.timestamp >= since)
        .group_by(ProcessingLog.action)
        .order_by(func.count(ProcessingLog.id).desc())
    )

    actions = [
        {
            "action": row[0],
            "count": row[1],
            "avg_duration_ms": round((row[2] or 0) / row[1], 2) if row[1] else 0,
        }
        for row in actions_result
    ]

    error_count = (
        await db.execute(
            select(func.count(ProcessingLog.id)).where(
                ProcessingLog.timestamp >= since,
                ProcessingLog.success == False,  # noqa: E712
            )
        )
    ).scalar() or 0

    total_count = (
        await db.execute(
            select(func.count(ProcessingLog.id)).where(ProcessingLog.timestamp >= since)
        )
    ).scalar() or 0

    return {
        "period_hours": 24,
        "total_events": total_count,
        "error_count": error_count,
        "success_rate": round((total_count - error_count) / total_count * 100, 1) if total_count else 100.0,
        "by_action": actions,
    }


@router.get("/errors")
async def list_errors(
    limit: int = Query(default=50, le=200),
    db: AsyncSession = Depends(get_db),
) -> List[Dict[str, Any]]:
    """Lista os últimos erros de processamento."""
    since = datetime.now(timezone.utc) - timedelta(days=7)
    result = await db.execute(
        select(ProcessingLog)
        .where(ProcessingLog.success == False, ProcessingLog.timestamp >= since)  # noqa: E712
        .order_by(ProcessingLog.timestamp.desc())
        .limit(limit)
    )
    logs = result.scalars().all()
    return [_serialize(log) for log in logs]


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
        "context": log.context,
    }
