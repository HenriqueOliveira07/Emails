import pytest

from app.services.ai_classifier import AIClassifier
from app.utils.crypto import CredentialEncryptor, generate_key
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address


@pytest.fixture
def classifier():
    return AIClassifier()


def test_fallback_critical(classifier):
    r = classifier._fallback_classification(
        {"subject": "Falha crítica: parada da produção", "body_preview": "urgente"}
    )
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["is_spam"] is False


def test_fallback_low_when_no_keywords(classifier):
    r = classifier._fallback_classification({"subject": "oi", "body_preview": "tudo bem?"})
    assert r["priority"] == "BAIXO"


def test_sanitize_email_address():
    assert sanitize_email_address("  Foo@Empresa.com ") == "foo@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_is_spam_sender():
    assert is_spam_sender("no-reply@x.com", [])
    assert not is_spam_sender("financeiro@empresa.com", [])


def test_html_to_text_strips_tags():
    assert "olá" in html_to_text("<p>olá <b>mundo</b></p>")


def test_crypto_roundtrip():
    enc = CredentialEncryptor(generate_key())
    assert enc.decrypt(enc.encrypt("segredo")) == "segredo"
