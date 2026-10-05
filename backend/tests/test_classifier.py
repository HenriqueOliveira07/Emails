from app.services.ai_classifier import AIClassifier


def _classifier():
    # Evita criar cliente real; testamos apenas o fallback por palavras-chave.
    return AIClassifier.__new__(AIClassifier)


def test_fallback_critical():
    r = _classifier()._fallback_classification(
        {"subject": "URGENTE: aprovação de pagamento", "body_preview": "vence hoje"}
    )
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["action_required"] is True


def test_fallback_low():
    r = _classifier()._fallback_classification({"subject": "bom dia", "body_preview": "oi"})
    assert r["priority"] == "BAIXO"
    assert r["action_required"] is False
