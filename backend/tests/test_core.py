import asyncio

import pytest
from fastapi import HTTPException

from app.api.security import require_api_key
from app.config import settings
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address, truncate


def test_html_to_text():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"


def test_sanitize_email():
    assert sanitize_email_address(" Fin@Empresa.com ") == "fin@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_spam_sender_builtin_and_custom():
    assert is_spam_sender("noreply@x.com", [])
    assert not is_spam_sender("joao@x.com", [])
    assert is_spam_sender("promo@loja.com", ["LOJA.com"])


def test_truncate():
    assert truncate("a" * 10, 5) == "aa..."


def test_api_key(monkeypatch):
    monkeypatch.setattr(settings, "API_KEY", "segredo")
    with pytest.raises(HTTPException):
        asyncio.run(require_api_key(None))
    with pytest.raises(HTTPException):
        asyncio.run(require_api_key("errada"))
    assert asyncio.run(require_api_key("segredo")) is None
    monkeypatch.setattr(settings, "API_KEY", "")
    assert asyncio.run(require_api_key(None)) is None
