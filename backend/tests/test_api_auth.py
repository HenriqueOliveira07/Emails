import pytest
from fastapi import HTTPException

from app.api import security
from app.config import settings


@pytest.mark.asyncio
async def test_api_key_required(monkeypatch):
    monkeypatch.setattr(settings, "API_KEY", "segredo")
    with pytest.raises(HTTPException) as e:
        await security.require_api_key(None)
    assert e.value.status_code == 401
    with pytest.raises(HTTPException):
        await security.require_api_key("errada")
    await security.require_api_key("segredo")


@pytest.mark.asyncio
async def test_fail_closed_in_production(monkeypatch):
    monkeypatch.setattr(settings, "API_KEY", "")
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    with pytest.raises(HTTPException) as e:
        await security.require_api_key(None)
    assert e.value.status_code == 503
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    await security.require_api_key(None)
