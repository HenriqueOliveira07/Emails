from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address


def test_sanitize_email():
    assert sanitize_email_address("  Financeiro@Empresa.com ") == "financeiro@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_spam_sender():
    assert is_spam_sender("newsletter@loja.com", [])
    assert not is_spam_sender("diretor@empresa.com", [])


def test_html_to_text():
    assert "Olá" in html_to_text("<p>Olá <b>mundo</b></p>")
