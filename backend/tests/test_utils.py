import pytest

from app.utils.crypto import CredentialEncryptor, generate_key
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address, truncate


def test_crypto_roundtrip():
    enc = CredentialEncryptor(generate_key())
    token = enc.encrypt("segredo")
    assert token != "segredo"
    assert enc.decrypt(token) == "segredo"


def test_crypto_invalid_token():
    with pytest.raises(ValueError):
        CredentialEncryptor(generate_key()).decrypt("lixo")


def test_sanitize_email_address():
    assert sanitize_email_address(" Fin@Empresa.com ") == "fin@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_spam_sender():
    assert is_spam_sender("no-reply@x.com", [])
    assert not is_spam_sender("financeiro@x.com", [])


def test_truncate_and_html():
    assert truncate("a" * 600, 10) == "a" * 7 + "..."
    assert "olá" in html_to_text("<p>olá</p><script>x()</script>")
