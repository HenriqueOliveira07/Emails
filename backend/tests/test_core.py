"""Testes unitários dos componentes principais (sem dependências externas)."""
import asyncio
import base64
from datetime import datetime, timezone

import pytest

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.whatsapp_sender import WhatsAppSender
from app.utils.sanitizer import is_spam_sender


# ── Classificação (fallback por palavras-chave) ─────────────────────────────
@pytest.fixture
def classifier():
    return AIClassifier.__new__(AIClassifier)  # sem cliente de rede


@pytest.mark.parametrize(
    "subject,expected",
    [
        ("URGENTE: sistema parado na produção", "CRITICO"),
        ("Aprovação de contrato pendente", "ALTO"),
        ("Bom dia, tudo certo?", "BAIXO"),
    ],
)
def test_fallback_priority(classifier, subject, expected):
    result = classifier._fallback_classification({"subject": subject, "body_preview": ""})
    assert result["priority"] == expected
    assert result["is_spam"] is False


def test_fallback_detects_newsletter(classifier):
    result = classifier._fallback_classification(
        {"subject": "Newsletter semanal", "body_preview": "clique para descadastrar"}
    )
    assert result["is_spam"] is True


def test_spam_sender_uses_custom_patterns():
    assert is_spam_sender("noreply@loja.com", [])
    assert is_spam_sender("promo@ofertas.com.br", ["ofertas.com.br"])
    assert not is_spam_sender("financeiro@empresa.com", ["ofertas.com.br"])


# ── Anexos ───────────────────────────────────────────────────────────────────
def _att(name, data: bytes):
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(data).decode()}


def test_attachments_organized_and_deduplicated(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    email = {
        "received_at": datetime(2026, 5, 26, 11, 0, tzinfo=timezone.utc),
        "sender_email": "contato@fornecedorx.com",
        "sender_name": "Fornecedor X",
    }
    atts = [
        _att("nota.pdf", b"%PDF-1.4 a"),
        _att("nota.pdf", b"%PDF-1.4 b"),
        _att("virus.exe", b"MZ..."),
        _att("planilha.xlsx", b"MZ disfarcado"),
        _att("dados.csv", b"a,b\n1,2"),
    ]
    saved = asyncio.run(handler.save_attachments(email, atts))
    names = sorted(s["filename"] for s in saved)

    dest = tmp_path / "2026" / "05" / "26" / "Fornecedor X"
    assert dest.is_dir()
    assert len(saved) == 3  # .exe e executável disfarçado bloqueados
    assert "dados.csv" in names and "nota.pdf" in names
    assert len(set(names)) == 3  # sem sobrescrita


# ── WhatsApp ─────────────────────────────────────────────────────────────────
def test_whatsapp_message_format():
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
    assert msg.startswith("🔴 [CRÍTICO]\nNovo e-mail importante recebido")
    assert "Remetente: financeiro@empresa.com" in msg
    assert "26/05/2026 08:42" in msg  # convertido para America/Sao_Paulo
    assert "Anexos: 2 arquivo(s)" in msg
