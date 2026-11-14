import asyncio
import base64
import io
import zipfile
from datetime import datetime, timezone

import pytest

from app.services import prefilter
from app.services.attachment_handler import AttachmentHandler, inspect_content
from app.services.whatsapp_sender import WhatsAppSender


def _email(**kw):
    base = {
        "message_id": "m1",
        "subject": "Aprovação urgente de pagamento",
        "sender_email": "financeiro@empresa.com.br",
        "sender_name": "Financeiro",
        "recipients": ["usuario@empresa.com.br"],
        "cc_recipients": [],
        "headers": {},
        "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
        "has_attachments": True,
        "body_preview": "Fornecedor aguardando aprovação até 12h.",
    }
    base.update(kw)
    return base


# ── Pré-filtro ───────────────────────────────────────────────────────────────
def test_direct_email_passes_with_signals():
    r = prefilter.evaluate(_email())
    assert not r.ignore
    assert r.signals["direct_to_user"] is True
    assert r.signals["after_hours"] is False  # 08:42 em São Paulo


def test_list_unsubscribe_is_ignored():
    r = prefilter.evaluate(_email(headers={"List-Unsubscribe": "<mailto:x@y>"}))
    assert r.ignore and r.reason == "newsletter_list_header"


def test_auto_reply_is_ignored():
    r = prefilter.evaluate(_email(headers={"Auto-Submitted": "auto-replied"}))
    assert r.ignore and r.reason == "resposta_automatica"


def test_noreply_system_alert_not_ignored():
    r = prefilter.evaluate(_email(sender_email="noreply@monitoramento.com", subject="Falha no servidor"))
    assert not r.ignore
    assert r.signals["noreply_sender"] is True


def test_blocked_domain_and_vip():
    assert prefilter.evaluate(_email(sender_email="x@spam.com")).reason == "remetente_bloqueado"
    vip = prefilter.evaluate(_email(sender_email="ceo@empresa.com.br",
                                    headers={"List-Id": "lista"}))
    assert not vip.ignore and vip.force_priority == "ALTO"


def test_priority_floor():
    assert prefilter.apply_floor("BAIXO", "ALTO") == "ALTO"
    assert prefilter.apply_floor("CRITICO", "ALTO") == "CRITICO"
    assert prefilter.apply_floor("MEDIO", None) == "MEDIO"


# ── WhatsApp ─────────────────────────────────────────────────────────────────
def test_whatsapp_format_matches_spec():
    sender = WhatsAppSender()
    msg = sender.format_message(
        {**_email(), "attachment_count": 2},
        {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação.", "category": "Pagamento"},
    )
    asyncio.run(sender.close())
    assert "[CRÍTICO]" in msg
    assert "Remetente: Financeiro <financeiro@empresa.com.br>" in msg
    assert "26/05/2026 08:42" in msg  # horário local, não UTC
    assert "Anexos: 2 arquivo(s)" in msg


# ── Anexos ───────────────────────────────────────────────────────────────────
def _zip(names):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as z:
        for n in names:
            z.writestr(n, "x")
    return buf.getvalue()


def test_inspect_content():
    assert inspect_content("a.pdf", b"%PDF-1.7 ...")[0]
    assert not inspect_content("a.pdf", b"MZ\x90\x00")[0]          # exe disfarçado
    assert not inspect_content("a.png", b"%PDF")[0]                # assinatura errada
    assert inspect_content("a.zip", _zip(["nota.xml"]))[0]
    assert not inspect_content("a.zip", _zip(["fatura.exe"]))[0]


def test_extension_rules(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    assert h._is_extension_allowed("boleto.pdf")[0]
    assert not h._is_extension_allowed("boleto.pdf.exe")[0]
    assert not h._is_extension_allowed("planilha.xlsm")[0]
    assert not h._is_extension_allowed("semextensao")[0]


def test_save_attachments_organized_and_deduplicated(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    data = base64.b64encode(b"%PDF-1.4 conteudo").decode()
    atts = [
        {"name": "nf.pdf", "contentType": "application/pdf", "contentBytes": data},
        {"name": "nf.pdf", "contentType": "application/pdf", "contentBytes": data},
        {"name": "virus.pdf", "contentType": "application/pdf",
         "contentBytes": base64.b64encode(b"MZ...").decode()},
    ]
    saved = asyncio.run(h.save_attachments(_email(sender_name="Fornecedor X"), atts))
    assert len(saved) == 2
    assert saved[0]["filename"] != saved[1]["filename"]
    assert "/2026/05/26/Fornecedor X/" in saved[0]["file_path"]
    assert h.blocked and h.blocked[0]["filename"] == "virus.pdf"


# ── MSAL ─────────────────────────────────────────────────────────────────────
def test_msal_token_expiry_does_not_crash(monkeypatch):
    from app.services import email_reader

    class FakeApp:
        def acquire_token_for_client(self, scopes):
            return {"access_token": "tok", "expires_in": 3599}

    auth = email_reader.MSALAuthenticator.__new__(email_reader.MSALAuthenticator)
    auth._token = None
    auth._token_expiry = None
    auth._app = FakeApp()
    assert auth.get_token() == "tok"
    assert (auth._token_expiry - datetime.now(timezone.utc)).total_seconds() > 3500
