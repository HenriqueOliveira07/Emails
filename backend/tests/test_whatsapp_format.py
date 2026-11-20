from datetime import datetime, timezone

from app.services.whatsapp_sender import WhatsAppSender


def test_message_format_and_local_time():
    msg = WhatsAppSender().format_message(
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
    assert lines[0] == "[CRITICO]"
    assert "Remetente: financeiro@empresa.com" in lines
    assert "Assunto: Aprovação urgente de pagamento" in lines
    # 11:42 UTC -> 08:42 em America/Sao_Paulo
    assert "Horário: 26/05/2026 08:42" in lines
    assert "Anexos: 2 arquivo(s)" in lines


def test_naive_datetime_treated_as_utc():
    msg = WhatsAppSender().format_message(
        {"sender_email": "a@b.com", "received_at": datetime(2026, 1, 1, 12, 0)},
        {"priority": "ALTO", "summary": "x"},
    )
    assert "Horário: 01/01/2026 09:00" in msg
