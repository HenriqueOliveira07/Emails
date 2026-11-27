import base64
import io
import zipfile
from datetime import datetime, timezone

import pytest

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.email_reader import MSALAuthenticator
from app.services.whatsapp_sender import WhatsAppSender
from app.workers.tasks import apply_vip_boost, classify_sender

EMAIL = {
    "subject": "Aprovação urgente de pagamento",
    "sender_email": "financeiro@empresa.com",
    "sender_name": "Financeiro",
    "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
    "has_attachments": True,
    "attachment_count": 2,
    "body_preview": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
}


def _att(name, data: bytes, ctype="application/octet-stream"):
    return {"name": name, "contentType": ctype, "contentBytes": base64.b64encode(data).decode()}


# --- Classificação (fallback por palavras-chave) ---------------------------------

@pytest.mark.parametrize(
    "subject,expected",
    [
        ("URGENTE: produção parada", "CRITICO"),
        ("Contrato para assinatura", "ALTO"),
        ("Pendência com fornecedor", "MEDIO"),
        ("Bom dia", "BAIXO"),
    ],
)
def test_fallback_priority(subject, expected):
    result = AIClassifier.__new__(AIClassifier)._fallback_classification(
        {"subject": subject, "body_preview": ""}
    )
    assert result["priority"] == expected
    assert result["is_spam"] is False


def test_fallback_detects_newsletter():
    r = AIClassifier.__new__(AIClassifier)._fallback_classification(
        {"subject": "Newsletter semanal", "body_preview": "clique para unsubscribe"}
    )
    assert r["is_spam"] is True


# --- WhatsApp: formato da mensagem ------------------------------------------------

def test_whatsapp_format_matches_spec():
    sender = WhatsAppSender.__new__(WhatsAppSender)
    msg = sender.format_message(EMAIL, {"priority": "CRITICO", "summary": "Fornecedor aguardando.", "category": "Pagamento"})
    lines = msg.splitlines()
    assert lines[0] == "[CRÍTICO]"
    assert "Remetente: Financeiro <financeiro@empresa.com>" in msg
    assert "Assunto: Aprovação urgente de pagamento" in msg
    assert "Horário: 26/05/2026 05:42" in msg  # convertido para America/Sao_Paulo
    assert "Resumo:\nFornecedor aguardando." in msg
    assert "Anexos: 2 arquivos" in msg


def test_whatsapp_format_without_attachments():
    sender = WhatsAppSender.__new__(WhatsAppSender)
    msg = sender.format_message({**EMAIL, "has_attachments": False, "attachment_count": 0}, {"priority": "ALTO"})
    assert msg.startswith("[ALTO]")
    assert "Anexos: nenhum" in msg


# --- Anexos -----------------------------------------------------------------------

@pytest.mark.asyncio
async def test_attachments_path_and_dedup(tmp_attachments):
    h = AttachmentHandler(base_path=str(tmp_attachments))
    saved = await h.save_attachments(EMAIL, [_att("boleto.pdf", b"%PDF-1.4 x"), _att("boleto.pdf", b"%PDF-1.4 y")])
    assert len(saved) == 2
    expected_dir = tmp_attachments / "Emails_Importantes" / "2026" / "05" / "26" / "Financeiro"
    assert all(str(expected_dir) in s["file_path"] for s in saved)
    assert saved[0]["filename"] != saved[1]["filename"]


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "name,data",
    [
        ("virus.exe", b"MZ\x90\x00"),
        ("fatura.pdf.exe", b"x"),
        ("fatura.pdf", b"MZ\x90\x00disfarcado"),
        ("macro.docm", b"x"),
        ("script.unknownext", b"x"),
    ],
)
async def test_attachments_blocked(tmp_attachments, name, data):
    h = AttachmentHandler(base_path=str(tmp_attachments))
    assert await h.save_attachments(EMAIL, [_att(name, data)]) == []


@pytest.mark.asyncio
async def test_zip_with_executable_blocked_and_clean_zip_saved(tmp_attachments):
    def make_zip(inner):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as zf:
            zf.writestr(inner, b"data")
        return buf.getvalue()

    h = AttachmentHandler(base_path=str(tmp_attachments))
    assert await h.save_attachments(EMAIL, [_att("docs.zip", make_zip("run.exe"))]) == []
    saved = await h.save_attachments(EMAIL, [_att("docs.zip", make_zip("planilha.xlsx"))])
    assert len(saved) == 1


@pytest.mark.asyncio
async def test_allowed_types_saved(tmp_attachments):
    h = AttachmentHandler(base_path=str(tmp_attachments))
    names = ["a.pdf", "b.xlsx", "c.docx", "d.csv", "e.png", "f.jpg", "g.xml"]
    saved = await h.save_attachments(EMAIL, [_att(n, b"conteudo") for n in names])
    assert sorted(s["original_filename"] for s in saved) == sorted(names)


# --- MSAL: expiração do token (regressão: ValueError em datetime.replace) ---------

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
    assert auth.get_token() == "tok"
    assert FakeApp.calls == 1  # token reutilizado do cache


# --- Filtros por remetente --------------------------------------------------------

def test_sender_filters():
    assert classify_sender("CEO@empresa.com") == "vip"
    assert classify_sender("promo@spam.example") == "block"
    assert classify_sender("x@outro.com") == ""
    boosted = apply_vip_boost({"priority": "BAIXO", "is_spam": True})
    assert boosted == {"priority": "MEDIO", "is_spam": False}
