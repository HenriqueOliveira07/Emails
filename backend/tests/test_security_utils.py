import asyncio

import pytest
from fastapi import HTTPException

from app.config import settings
from app.security import require_api_key
from app.utils.sanitizer import html_to_text, truncate


def test_api_key_disabled(monkeypatch):
    monkeypatch.setattr(settings, "API_ACCESS_TOKEN", "")
    assert asyncio.run(require_api_key(None)) is None


def test_api_key_enforced(monkeypatch):
    monkeypatch.setattr(settings, "API_ACCESS_TOKEN", "segredo")
    assert asyncio.run(require_api_key("segredo")) is None
    for bad in (None, "errado"):
        with pytest.raises(HTTPException) as e:
            asyncio.run(require_api_key(bad))
        assert e.value.status_code == 401


def test_sanitizer():
    assert "alert" not in html_to_text("<p>Oi</p><script>alert(1)</script>")
    assert len(truncate("x" * 1000, 50)) <= 55
