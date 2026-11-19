"""Testes unitários dos serviços de classificação, formatação e anexos."""
import asyncio
import base64
from datetime import datetime, timezone
from pathlib import Path

from app.services.ai_classifier import AIClassifier
from app.services.attachment_handler import AttachmentHandler
from app.services.whatsapp_sender import WhatsAppSender


def _email(**kw):
    base = {
        "message_id": "m1",
        "subject": "Aprovação urgente de pagamento",
        "sender_email": "financeiro@empresa.com",
        "sender_name": "Fornecedor X",
        "body_preview": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
        "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
        "has_attachments": True,
        "attachment_count": 2,
    }
    base.update(kw)
    return base


def test_fallback_classifies_critical_keywords():
    result = AIClassifier()._fallback_classification(_email())
    assert result["priority"] in ("CRITICO", "ALTO")
    assert result["is_spam"] is False
    assert result["keywords_found"]


def test_fallback_detects_newsletter_as_spam():
    result = AIClassifier()._fallback_classification(
        _email(subject="Newsletter semanal", body_preview="Clique para descadastrar / unsubscribe")
    )
    assert result["is_spam"] is True


def test_whatsapp_message_format_matches_spec():
    sender = WhatsAppSender()
    msg = sender.format_message(
        _email(), {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação."}
    )
    asyncio.run(sender.close())
    lines = msg.splitlines()
    assert lines[0] == "[CRÍTICO]"
    assert lines[1] == "Novo e-mail importante recebido"
    assert "Remetente: Fornecedor X <financeiro@empresa.com>" in msg
    assert "Assunto: Aprovação urgente de pagamento" in msg
    # 11:42 UTC = 08:42 em São Paulo
    assert "Horário: 26/05/2026 08:42" in msg
    assert "Resumo:" in msg
    assert "Anexos: 2 arquivo(s)" in msg


def _att(name: str, content: bytes):
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(content).decode()}


def test_attachments_saved_by_date_and_sender_without_overwrite(tmp_path: Path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    saved = asyncio.run(
        handler.save_attachments(
            _email(),
            [_att("nota.xml", b"<nfe/>"), _att("nota.xml", b"<nfe2/>"), _att("planilha.csv", b"a,b")],
        )
    )
    assert len(saved) == 3
    dest = tmp_path / "2026" / "05" / "26" / "Fornecedor_X"
    files = sorted(p.name for p in dest.iterdir())
    assert len(files) == 3
    assert "nota.xml" in files
    assert len({s["file_path"] for s in saved}) == 3  # nenhum sobrescrito


def test_dangerous_and_disguised_executables_are_blocked(tmp_path: Path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    saved = asyncio.run(
        handler.save_attachments(
            _email(),
            [_att("virus.exe", b"MZ..."), _att("fatura.pdf", b"MZ\x90\x00 disfarcado"), _att("ok.pdf", b"%PDF-1.4")],
        )
    )
    assert [s["original_filename"] for s in saved] == ["ok.pdf"]


def test_folder_uses_local_date_not_utc(tmp_path: Path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    # 01:30 UTC do dia 27 = 22:30 do dia 26 em São Paulo
    path = handler._build_path(_email(received_at=datetime(2026, 5, 27, 1, 30, tzinfo=timezone.utc)))
    assert path.parts[-4:] == ("2026", "05", "26", "Fornecedor_X")
