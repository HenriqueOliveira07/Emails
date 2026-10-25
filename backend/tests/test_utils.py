from app.utils.file_utils import human_readable_size
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address, truncate


def test_html_to_text_strips_tags():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"


def test_sanitize_email_address():
    assert sanitize_email_address(" Fin@Empresa.com ") == "fin@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_spam_sender_default_and_custom_patterns():
    assert is_spam_sender("no-reply@x.com", [])
    assert not is_spam_sender("financeiro@x.com", [])
    assert is_spam_sender("promo@ofertas.com", ["ofertas"])


def test_truncate_and_size():
    assert truncate("a" * 10, 5) == "aa..."
    assert human_readable_size(2048) == "2.0 KB"
