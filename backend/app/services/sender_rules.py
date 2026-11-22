"""
Regras determinísticas aplicadas antes/depois da IA:
filtros por remetente (VIP / bloqueados), ajuste por horário e por recorrência.
"""
from datetime import datetime, timezone
from zoneinfo import ZoneInfo
from typing import Any, Dict, Iterable

from app.config import settings

PRIORITY_ORDER = ["BAIXO", "MEDIO", "ALTO", "CRITICO"]


def _matches(sender: str, patterns: Iterable[str]) -> bool:
    sender = (sender or "").lower().strip()
    for p in patterns:
        p = p.lower().strip()
        if not p:
            continue
        if p.startswith("@") and sender.endswith(p):
            return True
        if sender == p:
            return True
    return False


def is_blocked(sender: str) -> bool:
    return _matches(sender, settings.BLOCKED_SENDERS)


def is_vip(sender: str) -> bool:
    return _matches(sender, settings.VIP_SENDERS)


def bump(priority: str, levels: int = 1) -> str:
    idx = PRIORITY_ORDER.index(priority) if priority in PRIORITY_ORDER else 0
    return PRIORITY_ORDER[min(idx + levels, len(PRIORITY_ORDER) - 1)]


def apply_rules(
    email: Dict[str, Any], ai_result: Dict[str, Any], recent_from_sender: int = 0
) -> Dict[str, Any]:
    """
    Ajusta a classificação da IA:
    - VIP: nunca spam, mínimo ALTO
    - Fora do horário comercial + ação requerida: sobe um nível (alerta noturno)
    - Remetente com rajada de e-mails (>=5 nas últimas 24h) sem ação: não sobe; com ação: sobe
    """
    result = dict(ai_result)
    sender = email.get("sender_email", "")
    priority = result.get("priority", "BAIXO")
    reasons = list(result.get("rule_adjustments", []))

    if is_vip(sender):
        result["is_spam"] = False
        if PRIORITY_ORDER.index(priority) < PRIORITY_ORDER.index("ALTO"):
            priority = "ALTO"
            reasons.append("remetente VIP")

    received: datetime = email.get("received_at") or datetime.now(timezone.utc)
    if received.tzinfo is None:
        received = received.replace(tzinfo=timezone.utc)
    hour = received.astimezone(ZoneInfo(settings.TIMEZONE)).hour
    off_hours = hour < settings.BUSINESS_HOURS_START or hour >= settings.BUSINESS_HOURS_END
    if off_hours and result.get("action_required") and priority == "ALTO":
        priority = bump(priority)
        reasons.append("fora do horário comercial com ação requerida")

    if recent_from_sender >= 5 and result.get("action_required") and priority == "MEDIO":
        priority = bump(priority)
        reasons.append(f"recorrência: {recent_from_sender} e-mails em 24h")

    if email.get("importance") == "high" and priority == "BAIXO":
        priority = "MEDIO"
        reasons.append("marcado como alta importância pelo remetente")

    result["priority"] = priority
    result["rule_adjustments"] = reasons
    return result
