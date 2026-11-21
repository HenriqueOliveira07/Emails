import base64
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi import HTTPException

from app.services.attachment_handler import AttachmentHandler
from app.services.email_reader import MSALAuthenticator


def test_msal_token_expiry_handles_long_lifetimes():
    with patch("app.services.email_reader.msal.ConfidentialClientApplication") as app_cls:
        app_cls.return_value.acquire_token_for_client.return_value = {
            "access_token": "tok", "expires_in": 3599,
        }
        auth = MSALAuthenticator()
        assert auth.get_token() == "tok"
        assert auth.get_token() == "tok"  # usa cache
        assert app_cls.return_value.acquire_token_for_client.call_count == 1
        remaining = (auth._token_expiry - datetime.now(timezone.utc)).total_seconds()
        assert 3500 < remaining <= 3599


def _att(name, data=b"conteudo", **extra):
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(data).decode(), **extra}


@pytest.mark.asyncio
async def test_attachments_saved_by_date_and_sender_with_dedup(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    email = {
        "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
        "sender_email": "x@fornecedor.com",
        "sender_name": "Fornecedor_X",
    }
    saved = await handler.save_attachments(email, [
        _att("nota.pdf"), _att("nota.pdf"), _att("planilha.xlsx"),
        _att("virus.exe"), _att("script.js"), _att("sem_extensao"),
        _att("logo.png", isInline=True),
    ])
    names = [s["filename"] for s in saved]
    assert len(saved) == 3
    assert names[0] == "nota.pdf" and names[1] != "nota.pdf" and names[1].endswith(".pdf")
    dest = tmp_path / "2026" / "05" / "26" / "Fornecedor_X"
    assert sorted(p.name for p in dest.iterdir()) == sorted(names)


@pytest.mark.asyncio
async def test_no_folder_created_when_nothing_saved(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    email = {"received_at": datetime(2026, 1, 2, tzinfo=timezone.utc), "sender_email": "a@b.com"}
    assert await handler.save_attachments(email, [_att("x.exe")]) == []
    assert not (tmp_path / "2026").exists()


def test_fallback_classification_keywords():
    from app.services.ai_classifier import AIClassifier

    clf = AIClassifier()
    r = clf._fallback_classification({"subject": "URGENTE: sistema parado", "body_preview": "falha geral"})
    assert r["priority"] in ("CRITICO", "ALTO") and not r["is_spam"]
    r = clf._fallback_classification({"subject": "Newsletter semanal", "body_preview": "unsubscribe"})
    assert r["is_spam"]


@pytest.mark.asyncio
async def test_api_key_required_when_configured():
    from app.api import security

    with patch.object(security.settings, "API_KEY", "segredo"):
        with pytest.raises(HTTPException):
            await security.require_api_key(None)
        with pytest.raises(HTTPException):
            await security.require_api_key("errada")
        assert await security.require_api_key("segredo") is None
    with patch.object(security.settings, "API_KEY", ""):
        assert await security.require_api_key(None) is None
