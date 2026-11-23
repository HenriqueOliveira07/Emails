"""
Conversão de datas para o fuso horário configurado (padrão America/Sao_Paulo).
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from app.config import settings


def local_tz():
    try:
        return ZoneInfo(settings.TIMEZONE)
    except (ZoneInfoNotFoundError, ValueError):
        return timezone.utc


def to_local(dt: datetime | None) -> datetime:
    """Converte para o fuso local; datas sem tzinfo são tratadas como UTC."""
    if dt is None:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(local_tz())


def local_day_start() -> datetime:
    """Início do dia atual no fuso local (00:00), com tzinfo — usado em 'críticos do dia'."""
    now = to_local(None)
    return now.replace(hour=0, minute=0, second=0, microsecond=0)
