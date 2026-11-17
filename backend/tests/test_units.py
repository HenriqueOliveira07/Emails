import base64
from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.whatsapp_sender import WhatsAppSender
from app.utils.timeutils import find_keywords, to_local


# ── palavras-chave ──────────────────────────────────────────────────────────
def test_keywords_ignore_accents_and_case():
    assert find_keywords("APROVACAO pendente", ["aprovação"]) == ["aprovação"]


def test_keywords_whole_word_prefix_only():
    assert find_keywords("filme de terror", ["erro"]) == []
    assert find_keywords("houve falhas no servidor", ["falha"]) == ["falha"]


# ── classificação fallback (sem API key) ────────────────────────────────────
@pytest.mark.parametrize("subject,body,expected", [
    ("URGENTE: sistema parado", "a produção parou", "CRITICO"),
    ("Contrato para assinatura", "segue contrato", "ALTO"),
    ("Bom dia", "apenas um olá", "BAIXO"),
])
def test_fallback_priorities(subject, body, expected):
    r = AIClassifier().classify_email({"subject": subject, "body_preview": body})
    assert r["priority"] == expected
    assert r["is_spam"] is False


def test_fallback_detects_newsletter():
    r = AIClassifier().classify_email({"subject": "Newsletter semanal", "body_preview": "clique para descadastrar"})
    assert r["is_spam"] is True


# ── formato WhatsApp ────────────────────────────────────────────────────────
def test_whatsapp_format_matches_spec():
    sender = WhatsAppSender()
    msg = sender.format_message(
        {
            "sender_email": "financeiro@empresa.com",
            "subject": "Aprovação urgente de pagamento",
            "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
            "has_attachments": True,
            "attachment_count": 2,
        },
        {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação do pagamento até hoje às 12h."},
    )
    lines = msg.splitlines()
    assert lines[0] == "[CRÍTICO]"
    assert "Remetente: financeiro@empresa.com" in lines
    assert "Horário: 26/05/2026 08:42" in lines  # 11:42 UTC = 08:42 em São Paulo
    assert "Anexos: 2 arquivo(s)" in lines


def test_to_local_converts_naive_as_utc():
    assert to_local(datetime(2026, 1, 1, 3, 0)).hour == 0


# ── anexos ──────────────────────────────────────────────────────────────────
def _att(name, data, **extra):
    return {"name": name, "contentBytes": base64.b64encode(data).decode(), **extra}


PDF = b"%PDF-1.4\n%fake"


@pytest.mark.asyncio
async def test_attachments_organized_and_deduplicated(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    email = {
        "sender_name": "Fornecedor X",
        "sender_email": "x@forn.com",
        "received_at": datetime(2026, 5, 26, 12, 0, tzinfo=timezone.utc),
    }
    saved = await h.save_attachments(email, [_att("nota.pdf", PDF), _att("nota.pdf", PDF)])
    assert len(saved) == 2
    folder = tmp_path / "2026" / "05" / "26" / "Fornecedor_X"
    assert {p.name for p in folder.iterdir()} == {saved[0]["filename"], saved[1]["filename"]}
    assert saved[0]["filename"] != saved[1]["filename"]


@pytest.mark.asyncio
async def test_attachments_use_local_date(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    # 01:30 UTC do dia 27 ainda é dia 26 em São Paulo
    email = {"sender_email": "a@b.com", "received_at": datetime(2026, 5, 27, 1, 30, tzinfo=timezone.utc)}
    saved = await h.save_attachments(email, [_att("a.csv", b"x;y\n1;2")])
    assert "/2026/05/26/a/" in saved[0]["file_path"]


@pytest.mark.asyncio
@pytest.mark.parametrize("att", [
    _att("virus.exe", b"MZ\x90\x00"),
    _att("fatura.pdf.exe", b"MZ\x90\x00"),
    _att("fatura.pdf", b"MZ\x90\x00disfarcado"),
    _att("planilha.xlsx", b"not a zip"),
    _att("script.js", b"alert(1)"),
    _att("logo.png", b"\x89PNG....", isInline=True, contentType="image/png"),
    {"@odata.type": "#microsoft.graph.itemAttachment", "name": "fwd.eml"},
])
async def test_attachments_blocked(tmp_path, att):
    h = AttachmentHandler(base_path=str(tmp_path))
    assert await h.save_attachments({"sender_email": "a@b.com"}, [att]) == []


# ── MSAL ────────────────────────────────────────────────────────────────────
def test_msal_token_cached_with_real_expiry():
    with patch("app.services.email_reader.msal.ConfidentialClientApplication") as app_cls:
        app_cls.return_value.acquire_token_for_client.return_value = {
            "access_token": "tok", "expires_in": 3599,
        }
        from app.services.email_reader import MSALAuthenticator
        auth = MSALAuthenticator()
        assert auth.get_token() == "tok"
        assert auth.get_token() == "tok"
        assert app_cls.return_value.acquire_token_for_client.call_count == 1
