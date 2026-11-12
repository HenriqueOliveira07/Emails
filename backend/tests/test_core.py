"""Testes unitários das regras centrais (sem dependências externas)."""
from datetime import datetime, timezone

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.utils.sanitizer import html_to_text


def _classify(subject: str, body: str = "") -> dict:
    return AIClassifier()._fallback_classification({"subject": subject, "body_preview": body})


def test_fallback_detects_critical_keyword():
    r = _classify("URGENTE: falha no servidor de produção")
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["action_required"] is True


def test_fallback_low_when_no_keywords():
    assert _classify("Olá", "tudo bem?")["priority"] == "BAIXO"


def test_attachment_path_by_date_and_sender(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    p = h._build_path({
        "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
        "sender_email": "contato@fornecedor.com",
        "sender_name": "Fornecedor X",
    })
    assert p == tmp_path / "2026" / "05" / "26" / "Fornecedor X"


def test_unique_filename_avoids_overwrite(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    (tmp_path / "nota.pdf").write_bytes(b"x")
    new = h._unique_filename(tmp_path, "nota.pdf")
    assert new != "nota.pdf" and new.endswith(".pdf")


def test_dangerous_extension_blocked(tmp_path):
    ok, _ = AttachmentHandler(base_path=str(tmp_path))._is_extension_allowed("fatura.exe")
    assert ok is False


def test_sanitizer_dir_traversal():
    assert "/" not in AttachmentHandler._sanitize_dirname("../../etc")


def test_html_to_text():
    assert "Olá" in html_to_text("<p>Olá <b>mundo</b></p>")
