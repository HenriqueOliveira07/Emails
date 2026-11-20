from app.services.ai_classifier import AIClassifier


def _classify(subject, body=""):
    return AIClassifier()._fallback_classification({"subject": subject, "body_preview": body})


def test_urgent_payment_is_critical_or_high():
    r = _classify("URGENTE: aprovação de pagamento", "Fornecedor aguarda até 12h")
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["action_required"] is True
    assert r["is_spam"] is False


def test_newsletter_is_spam():
    r = _classify("Newsletter semanal", "Clique aqui para descadastrar unsubscribe")
    assert r["is_spam"] is True
    assert r["priority"] == "BAIXO"


def test_plain_message_is_low():
    r = _classify("Oi", "tudo bem?")
    assert r["priority"] == "BAIXO"
    assert r["action_required"] is False
