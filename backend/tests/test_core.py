"""Testes unitários das regras centrais (sem dependências externas)."""
import base64
from datetime import datetime, timezone

import pytest

from app.services.attachment_handler import AttachmentHandler
from app.services.ai_classifier import AIClassifier
from app.services.whatsapp_sender import WhatsAppSender


def _email(**kw):
    base = {
        "message_id": "m1",
        "subject": "Aprovação urgente de pagamento",
        "sender_email": "financeiro@empresa.com",
        "sender_name": "",
        "body_preview": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
        "full_body": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
        "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
        "has_attachments": True,
        "attachment_count": 2,
    }
    base.update(kw)
    return base


def test_whatsapp_format_matches_spec():
    msg = WhatsAppSender().format_message(
        _email(), {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação.", "category": "Pagamento"}
    )
    lines = msg.splitlines()
    assert lines[0] == "[CRÍTICO]"
    assert "Remetente: financeiro@empresa.com" in msg
    assert "Horário: 26/05/2026 08:42" in msg  # UTC -> America/Sao_Paulo
    assert "Anexos: 2 arquivo(s)" in msg


def test_fallback_classification_detects_keywords():
    clf = AIClassifier.__new__(AIClassifier)
    result = clf._fallback_classification(_email())
    assert result["priority"] in {"CRITICO", "ALTO"}
    assert result["is_spam"] is False


def test_attachment_path_and_dedup(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    d = h._build_path(_email(sender_name="Fornecedor X"))
    assert d.relative_to(tmp_path).parts[:3] == ("2026", "05", "26")
    d.mkdir(parents=True, exist_ok=True)
    (d / "nota.pdf").write_bytes(b"x")
    assert h._unique_filename(d, "nota.pdf") != "nota.pdf"


@pytest.mark.parametrize("name,ok", [("a.pdf", True), ("b.xlsx", True), ("c.exe", False), ("d.xml", True)])
def test_extension_filter(name, ok):
    assert AttachmentHandler()._is_extension_allowed(name)[0] is ok
