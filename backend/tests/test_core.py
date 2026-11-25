"""Testes unitários das regras de classificação, sanitização e anexos."""
import base64
from datetime import datetime, timezone

import pytest

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.utils.sanitizer import html_to_text, is_spam_sender, sanitize_email_address


@pytest.fixture
def classifier():
    return AIClassifier()


def test_fallback_critico(classifier):
    r = classifier._fallback_classification(
        {"subject": "URGENTE: sistema parado", "body_preview": "Falha geral na produção"}
    )
    assert r["priority"] == "CRITICO"
    assert r["action_required"] is True
    assert r["is_spam"] is False


def test_fallback_baixo_sem_palavras(classifier):
    r = classifier._fallback_classification({"subject": "Oi", "body_preview": "tudo bem?"})
    assert r["priority"] == "BAIXO"


def test_spam_sender():
    assert is_spam_sender("noreply@loja.com", [])
    assert is_spam_sender("promo@ofertas.com", ["ofertas.com"])
    assert not is_spam_sender("financeiro@empresa.com", [])


def test_sanitize_email():
    assert sanitize_email_address("  Fulano@Empresa.COM ") == "fulano@empresa.com"
    assert sanitize_email_address("invalido") is None


def test_html_to_text():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"


def _att(name, data: bytes):
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(data).decode()}


@pytest.mark.asyncio
async def test_attachments_path_dedup_and_block(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    email = {
        "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
        "sender_email": "x@fornecedor.com",
        "sender_name": "Fornecedor X",
    }
    saved = await h.save_attachments(
        email,
        [
            _att("nota.csv", b"a,b\n1,2"),
            _att("nota.csv", b"a,b\n3,4"),
            _att("virus.exe", b"MZ..."),
            _att("fatura.pdf", b"MZ disfarcado"),
            _att("../../etc/passwd.txt", b"x"),
        ],
    )
    names = [s["filename"] for s in saved]
    assert len(saved) == 3
    assert names[0] == "nota.csv" and names[1] != "nota.csv"
    for s in saved:
        assert s["file_path"].startswith(str(tmp_path / "2026" / "05" / "26" / "Fornecedor X"))
