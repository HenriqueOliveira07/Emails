from datetime import datetime, timezone

from app.services.whatsapp_sender import WhatsAppSender


def test_format_uses_accented_label_and_local_time():
    sender = WhatsAppSender.__new__(WhatsAppSender)
    msg = sender.format_message(
        {
            "sender_email": "financeiro@empresa.com",
            "subject": "Aprovação urgente de pagamento",
            "received_at": datetime(2026, 5, 26, 11, 42, tzinfo=timezone.utc),
            "has_attachments": True,
            "attachment_count": 2,
        },
        {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação."},
    )
    assert msg.startswith("[CRÍTICO]")
    assert "26/05/2026 08:42" in msg  # UTC-3
    assert "2 arquivo" in msg
