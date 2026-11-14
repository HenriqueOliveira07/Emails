"""
Pré-filtro determinístico executado ANTES da IA.

Objetivos:
- Descartar newsletters, marketing e respostas automáticas sem gastar chamadas à API.
- Aplicar listas de bloqueio/permissão por remetente ou domínio (filtros personalizados).
- Fornecer sinais objetivos (destinatário direto, CC, horário, anexos) que a IA
  recebe como contexto para calibrar a prioridade.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from app.config import settings

# Cabeçalhos RFC que indicam envio em massa / automático
_BULK_PRECEDENCE = {"bulk", "list", "junk"}
_AUTO_SUBMITTED_OK = {"", "no"}
_NOREPLY_MARKERS = ("noreply", "no-reply", "donotreply", "do-not-reply", "mailer-daemon")
_MARKETING_MARKERS = ("newsletter", "marketing", "promo", "news@", "bulk")


@dataclass
class PrefilterResult:
    ignore: bool = False
    reason: str = ""
    force_priority: Optional[str] = None  # ex.: VIP -> "ALTO" como piso
    signals: Dict[str, Any] = field(default_factory=dict)


def _domain(addr: str) -> str:
    return addr.rsplit("@", 1)[-1].lower() if "@" in addr else ""


def _matches(addr: str, patterns: List[str]) -> bool:
    """Casa por endereço completo ou por domínio (ex.: '@fornecedor.com.br')."""
    addr = addr.lower()
    dom = _domain(addr)
    for p in patterns:
        p = p.strip().lower()
        if not p:
            continue
        if p.startswith("@") and dom == p[1:]:
            return True
        if p == addr:
            return True
    return False


def evaluate(email: Dict[str, Any]) -> PrefilterResult:
    sender = (email.get("sender_email") or "").lower()
    headers = {k.lower(): (v or "") for k, v in (email.get("headers") or {}).items()}
    me = (settings.OUTLOOK_EMAIL_ADDRESS or "").lower()

    to_list = [r.lower() for r in email.get("recipients", [])]
    cc_list = [r.lower() for r in email.get("cc_recipients", [])]

    received: Optional[datetime] = email.get("received_at")
    local_hour = None
    if isinstance(received, datetime):
        try:
            local_hour = received.astimezone(ZoneInfo(settings.TIMEZONE)).hour
        except Exception:
            local_hour = received.hour

    signals = {
        "direct_to_user": bool(me and me in to_list),
        "only_cc": bool(me and me in cc_list and me not in to_list),
        "recipient_count": len(to_list) + len(cc_list),
        "after_hours": local_hour is not None
        and (local_hour < settings.BUSINESS_HOUR_START or local_hour >= settings.BUSINESS_HOUR_END),
        "has_attachments": bool(email.get("has_attachments")),
        "importance": email.get("importance", "normal"),
        "vip_sender": _matches(sender, settings.VIP_SENDERS),
    }

    # 1) Permissão explícita sempre vence
    if _matches(sender, settings.ALLOWED_SENDERS) or signals["vip_sender"]:
        return PrefilterResult(
            force_priority="ALTO" if signals["vip_sender"] else None, signals=signals
        )

    # 2) Bloqueio explícito
    if _matches(sender, settings.BLOCKED_SENDERS):
        return PrefilterResult(ignore=True, reason="remetente_bloqueado", signals=signals)

    # 3) Cabeçalhos de lista / envio em massa
    if headers.get("list-unsubscribe") or headers.get("list-id"):
        return PrefilterResult(ignore=True, reason="newsletter_list_header", signals=signals)
    if headers.get("precedence", "").strip().lower() in _BULK_PRECEDENCE:
        return PrefilterResult(ignore=True, reason="precedence_bulk", signals=signals)
    auto = headers.get("auto-submitted", "").strip().lower()
    if auto not in _AUTO_SUBMITTED_OK or headers.get("x-autoreply") or headers.get("x-autorespond"):
        return PrefilterResult(ignore=True, reason="resposta_automatica", signals=signals)

    # 4) Remetentes típicos de marketing (sem palavras críticas no assunto)
    subject = (email.get("subject") or "").lower()
    has_critical = any(k.lower() in subject for k in settings.PRIORITY_CRITICAL_KEYWORDS)
    if not has_critical and any(m in sender for m in _MARKETING_MARKERS):
        return PrefilterResult(ignore=True, reason="remetente_marketing", signals=signals)

    # noreply NÃO é descartado automaticamente: alertas de sistemas (monitoramento,
    # ERP, bancos) costumam vir de noreply. Apenas sinalizamos para a IA.
    signals["noreply_sender"] = any(m in sender for m in _NOREPLY_MARKERS)
    return PrefilterResult(signals=signals)


PRIORITY_ORDER = ["BAIXO", "MEDIO", "ALTO", "CRITICO"]


def apply_floor(priority: str, floor: Optional[str]) -> str:
    """Garante prioridade mínima (ex.: remetente VIP nunca abaixo de ALTO)."""
    if not floor or floor not in PRIORITY_ORDER:
        return priority
    if priority not in PRIORITY_ORDER:
        return floor
    return max(priority, floor, key=PRIORITY_ORDER.index)
