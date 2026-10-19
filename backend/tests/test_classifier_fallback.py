from app.services.ai_classifier import AIClassifier


def _classifier() -> AIClassifier:
    return AIClassifier.__new__(AIClassifier)  # sem cliente Anthropic


def test_critical_keyword():
    r = _classifier()._fallback_classification(
        {"subject": "Falha crítica na produção", "body_preview": "parada total"}
    )
    assert r["priority"] in ("CRITICO", "ALTO")
    assert not r["is_spam"]


def test_low_priority_default():
    r = _classifier()._fallback_classification(
        {"subject": "Bom dia", "body_preview": "tudo bem?"}
    )
    assert r["priority"] == "BAIXO"
    assert not r["action_required"]
