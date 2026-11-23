import base64
import io
import zipfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.email_reader import MSALAuthenticator, OutlookEmailReader
from app.services.whatsapp_sender import WhatsAppSender

PDF = b"%PDF-1.4\n%fake\n"


def _att(name, content, **extra):
    return {"name": name, "contentBytes": base64.b64encode(content).decode(), **extra}


def test_msal_token_expiry_does_not_crash(monkeypatch):
    auth = MSALAuthenticator.__new__(MSALAuthenticator)
    auth._token = None
    auth._token_expiry = None

    class FakeApp:
        calls = 0

        def acquire_token_for_client(self, scopes):
            FakeApp.calls += 1
            return {"access_token": "tok", "expires_in": 3599}

    auth._app = FakeApp()
    assert auth.get_token() == "tok"
    assert auth._token_expiry > datetime.now(timezone.utc) + timedelta(minutes=50)
    auth.get_token()
    assert FakeApp.calls == 1  # token reutilizado do cache


def test_parse_email_html_body_and_cc():
    reader = OutlookEmailReader.__new__(OutlookEmailReader)
    parsed = reader.parse_email({
        "id": "AAA",
        "subject": "Teste",
        "from": {"emailAddress": {"address": "a@x.com", "name": "A"}},
        "toRecipients": [{"emailAddress": {"address": "me@x.com"}}],
        "ccRecipients": [{"emailAddress": {"address": "cc@x.com"}}],
        "body": {"contentType": "html", "content": "<p>Olá <b>mundo</b></p>"},
        "receivedDateTime": "2026-05-26T11:42:00Z",
    })
    assert parsed["body_text"] == "Olá mundo"
    assert parsed["recipients"] == ["me@x.com", "cc@x.com"]
    assert parsed["received_at"].tzinfo is not None


def test_fallback_keywords_use_whole_words():
    clf = AIClassifier.__new__(AIClassifier)
    r = clf._fallback_classification({"subject": "Produção parada na linha 3", "body_text": ""})
    assert r["priority"] == "CRITICO" and not r["is_spam"]
    r = clf._fallback_classification({"subject": "Aprovação de pagamento", "body_text": ""})
    assert r["priority"] == "ALTO"
    # 'clientela' não deve casar com 'cliente'
    r = clf._fallback_classification({"subject": "Nossa clientela cresceu", "body_text": ""})
    assert r["priority"] == "BAIXO"
    r = clf._fallback_classification({"subject": "Newsletter de novembro", "body_text": ""})
    assert r["is_spam"]


def test_classifier_falls_back_when_api_errors():
    clf = AIClassifier.__new__(AIClassifier)

    class Boom:
        class messages:
            @staticmethod
            def create(**kw):
                raise ConnectionError("rede fora")

    clf._client = Boom()
    r = clf.classify_email({"subject": "URGENTE: servidor fora", "sender_email": "ti@x.com"})
    assert r["priority"] == "CRITICO"
    assert r["classified_by"] == "fallback_keywords"


def test_whatsapp_message_format_uses_local_time():
    sender = WhatsAppSender.__new__(WhatsAppSender)
    msg = sender.format_message(
        {
            "sender_email": "financeiro@empresa.com",
            "subject": "Aprovação urgente de pagamento",
            "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
            "has_attachments": True,
            "attachment_count": 2,
        },
        {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação até 12h."},
    )
    lines = msg.splitlines()
    assert lines[0] == "[CRÍTICO]"
    assert "Remetente: financeiro@empresa.com" in msg
    assert "Horário: 26/05/2026 08:42" in msg  # 11:42 UTC = 08:42 em São Paulo
    assert "Anexos: 2 arquivos" in msg


@pytest.mark.asyncio
async def test_attachments_folder_structure_and_dedup(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path / "Emails_Importantes"))
    email = {
        "sender_name": "Fornecedor X",
        "sender_email": "x@forn.com",
        # 01:30 UTC do dia 27 ainda é dia 26 em São Paulo
        "received_at": datetime(2026, 5, 27, 1, 30, tzinfo=timezone.utc),
    }
    saved = await h.save_attachments(email, [_att("nf.pdf", PDF), _att("nf.pdf", PDF)])
    assert len(saved) == 2
    p1, p2 = Path(saved[0]["file_path"]), Path(saved[1]["file_path"])
    assert p1.parent == tmp_path / "Emails_Importantes" / "2026" / "05" / "26" / "Fornecedor X"
    assert p1.name == "nf.pdf" and p2.name != "nf.pdf" and p2.exists()


@pytest.mark.asyncio
async def test_malicious_attachments_are_blocked(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        z.writestr("fatura.exe", b"MZ...")
    saved = await h.save_attachments(
        {"sender_email": "a@b.com", "received_at": datetime.now(timezone.utc)},
        [
            _att("fatura.pdf", b"MZ\x90\x00 executavel"),   # exe disfarçado de PDF
            _att("script.ps1", b"Write-Host"),               # extensão perigosa
            _att("planilha.xlsm", b"PK\x03\x04"),            # macro
            _att("pacote.zip", buf.getvalue()),              # zip com exe
            _att("ok.csv", b"a,b\n1,2\n"),
            _att("logo.png", b"\x89PNG", isInline=True),     # imagem de assinatura
        ],
    )
    assert [s["original_filename"] for s in saved] == ["ok.csv"]
    assert len(h.blocked) == 4
