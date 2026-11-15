from app.services.ai_classifier import AIClassifier


def _clf():
    return AIClassifier.__new__(AIClassifier)  # sem cliente de rede


def test_fallback_critical_keyword():
    r = _clf()._fallback_classification({"subject": "URGENTE: sistema parado", "body_preview": ""})
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["is_spam"] is False


def test_fallback_low_when_no_keywords():
    r = _clf()._fallback_classification({"subject": "Bom dia", "body_preview": "tudo bem?"})
    assert r["priority"] == "BAIXO"
