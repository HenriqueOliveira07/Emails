from app.utils.sanitizer import html_to_text, sanitize_email_address
from app.services.ai_classifier import AIClassifier


def test_html_to_text_strips_tags():
    assert "olá" in html_to_text("<p>olá <b>mundo</b></p>")


def test_sanitize_email():
    assert sanitize_email_address("A@B.com") in ("a@b.com", "A@B.com")
    assert sanitize_email_address("lixo") is None


def test_fallback_classification_urgent():
    r = AIClassifier._fallback_classification(
        AIClassifier.__new__(AIClassifier),
        {"subject": "URGENTE aprovação de pagamento", "body": "vencimento hoje", "sender": "x@y.com"},
    )
    assert r["priority"] in ("CRÍTICO", "ALTO", "CRITICO")
