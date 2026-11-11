"""Testes unitários das regras centrais (sem rede, sem banco)."""
import base64
from datetime import datetime, timedelta, timezone

import pytest

from app.config import local_time, settings
from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.email_reader import MSALAuthenticator, OutlookEmailReader
from app.services.whatsapp_sender import WhatsAppSender


def _email(subject, body="", sender="financeiro@empresa.com", received="2026-11-11T11:42:00Z"):
    reader = OutlookEmailReader.__new__(OutlookEmailReader)
    return reader.parse_email({
        "id": "msg-1",
        "subject": subject,
        "from": {"emailAddress": {"address": sender, "name": "Financeiro"}},
        "receivedDateTime": received,
        "hasAttachments": True,
        "bodyPreview": body,
    })


def test_fallback_critical_and_dedup_keywords():
    res = AIClassifier()._fallback_classification(
        _email("Aprovação urgente de pagamento", "URGENTE: pagamento até 12h")
    )
    assert res["priority"] == "CRITICO"
    assert len(res["keywords_found"]) == len(set(res["keywords_found"]))
    assert {"urgente", "pagamento"} <= set(res["keywords_found"])


def test_fallback_marketing_word_does_not_drop_invoice():
    res = AIClassifier()._fallback_classification(
        _email("Boleto com desconto", "Pagamento do boleto com desconto até sexta")
    )
    assert res["is_spam"] is False
    assert res["priority"] == "ALTO"


def test_fallback_newsletter_is_spam():
    res = AIClassifier()._fallback_classification(
        _email("Newsletter semanal", "Clique aqui para ofertas", sender="noreply@loja.com")
    )
    assert res["is_spam"] is True


def test_whatsapp_message_uses_local_time():
    parsed = _email("Aprovação urgente de pagamento", "Fornecedor aguardando aprovação")
    parsed["attachment_count"] = 2
    msg = WhatsAppSender().format_message(parsed, {"priority": "CRITICO", "summary": "Resumo"})
    assert msg.startswith("[CRITICO]")
    expected = local_time(parsed["received_at"]).strftime("%H:%M")
    assert f"Horário: 11/11/2026 {expected}" in msg
    assert "Anexos: 2" in msg


def test_attachment_folder_uses_local_date(tmp_path, monkeypatch):
    monkeypatch.setattr(settings, "TIMEZONE", "America/Sao_Paulo")
    handler = AttachmentHandler()
    handler._base = tmp_path
    # 01:30 UTC do dia 12 = 22:30 BRT do dia 11
    parsed = _email("x", received="2026-11-12T01:30:00Z")
    path = handler._build_path(parsed)
    assert path.relative_to(tmp_path).parts[:3] == ("2026", "11", "11")


@pytest.mark.asyncio
async def test_attachment_dedup_and_block(tmp_path):
    handler = AttachmentHandler()
    handler._base = tmp_path
    parsed = _email("x")
    data = base64.b64encode(b"conteudo").decode()
    atts = [
        {"name": "nota.pdf", "contentType": "application/pdf", "contentBytes": data},
        {"name": "nota.pdf", "contentType": "application/pdf", "contentBytes": data},
        {"name": "virus.exe", "contentType": "application/octet-stream", "contentBytes": data},
    ]
    saved = await handler.save_attachments(parsed, atts)
    names = [s["filename"] for s in saved]
    assert len(saved) == 2 and len(set(names)) == 2
    assert all(not n.endswith(".exe") for n in names)


def test_msal_token_expiry_does_not_overflow(monkeypatch):
    auth = MSALAuthenticator.__new__(MSALAuthenticator)
    auth._token = None
    auth._token_expiry = None

    class FakeApp:
        def acquire_token_for_client(self, scopes):
            return {"access_token": "tok", "expires_in": 3599}

    auth._app = FakeApp()
    assert auth.get_token() == "tok"
    assert auth._token_expiry - datetime.now(timezone.utc) > timedelta(minutes=59)
