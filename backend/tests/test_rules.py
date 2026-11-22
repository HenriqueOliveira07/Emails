from datetime import datetime, timezone

from app.config import settings
from app.services import sender_rules


def test_vip_and_blocked(monkeypatch):
    monkeypatch.setattr(settings, "VIP_SENDERS", ["@banco.com.br"])
    monkeypatch.setattr(settings, "BLOCKED_SENDERS", ["promo@loja.com"])
    assert sender_rules.is_vip("gerente@banco.com.br")
    assert sender_rules.is_blocked("PROMO@loja.com")
    assert not sender_rules.is_blocked("vendas@loja.com")

    r = sender_rules.apply_rules(
        {"sender_email": "x@banco.com.br", "received_at": datetime(2026, 5, 26, 13, tzinfo=timezone.utc)},
        {"priority": "BAIXO", "is_spam": True},
    )
    assert r["priority"] == "ALTO" and r["is_spam"] is False


def test_off_hours_escalation(monkeypatch):
    monkeypatch.setattr(settings, "VIP_SENDERS", [])
    # 03:00 UTC = 00:00 em São Paulo
    r = sender_rules.apply_rules(
        {"sender_email": "a@b.com", "received_at": datetime(2026, 5, 26, 3, tzinfo=timezone.utc)},
        {"priority": "ALTO", "action_required": True},
    )
    assert r["priority"] == "CRITICO"


def test_business_hours_no_change(monkeypatch):
    monkeypatch.setattr(settings, "VIP_SENDERS", [])
    r = sender_rules.apply_rules(
        {"sender_email": "a@b.com", "received_at": datetime(2026, 5, 26, 14, tzinfo=timezone.utc)},
        {"priority": "ALTO", "action_required": True},
    )
    assert r["priority"] == "ALTO"
