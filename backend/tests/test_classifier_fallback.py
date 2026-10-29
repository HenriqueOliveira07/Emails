from app.services.ai_classifier import AIClassifier
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address


def _clf():
    # evita inicialização do cliente real
    return AIClassifier.__new__(AIClassifier)


def test_fallback_critical_keyword():
    r = _clf()._fallback_classification(
        {"subject": "Aprovação urgente de pagamento", "body_preview": ""}
    )
    assert r["priority"] == "CRITICO"
    assert not r["is_spam"]


def test_fallback_low_priority():
    r = _clf()._fallback_classification({"subject": "Oi", "body_preview": "bom dia"})
    assert r["priority"] == "BAIXO"


def test_sanitizer():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"
    assert sanitize_email_address(" A@B.com ") == "a@b.com"
    assert sanitize_email_address("invalido") is None
    assert is_spam_sender("noreply@x.com", [])
    assert not is_spam_sender("financeiro@x.com", [])
