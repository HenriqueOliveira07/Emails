"""Ciclo completo com Outlook e WhatsApp simulados e banco SQLite."""
import base64
from unittest.mock import AsyncMock, patch

import pytest
from sqlalchemy import func, select

from app.db.database import AsyncSessionLocal, create_tables


def _raw(mid, subject, body, sender="financeiro@empresa.com", has_att=False):
    return {
        "id": mid,
        "subject": subject,
        "from": {"emailAddress": {"address": sender, "name": "Financeiro"}},
        "toRecipients": [{"emailAddress": {"address": "eu@empresa.com"}}],
        "body": {"content": body, "contentType": "text"},
        "bodyPreview": body,
        "receivedDateTime": "2026-05-26T11:42:00Z",
        "hasAttachments": has_att,
    }


@pytest.mark.asyncio
async def test_full_cycle():
    from app.models.email import EmailAttachment, EmailRecord, PriorityLevel
    from app.models.notification import NotificationLog
    from app.workers.tasks import _check_new_emails_async

    await create_tables()
    inbox = [
        _raw("m1", "Aprovação urgente de pagamento", "Fornecedor aguarda aprovação até 12h", has_att=True),
        _raw("m2", "Newsletter de novembro", "clique para descadastrar", sender="news@loja.com"),
        _raw("m3", "Bom dia", "só passando para dizer oi"),
    ]
    attachments = [{"name": "boleto.pdf", "contentBytes": base64.b64encode(b"%PDF-1.4 x").decode()}]

    with patch("app.services.email_reader.OutlookEmailReader.__init__", return_value=None), \
         patch("app.services.email_reader.OutlookEmailReader.get_new_emails", AsyncMock(return_value=inbox)), \
         patch("app.services.email_reader.OutlookEmailReader.get_attachments", AsyncMock(return_value=attachments)), \
         patch("app.services.email_reader.OutlookEmailReader.mark_as_read", AsyncMock()) as mark, \
         patch("app.services.email_reader.OutlookEmailReader.close", AsyncMock()), \
         patch("app.services.whatsapp_sender.WhatsAppSender._send_message",
               AsyncMock(return_value={"success": True, "external_id": "wamid.1"})) as send:
        stats = await _check_new_emails_async()
        # segundo ciclo com a mesma caixa não pode duplicar nada
        stats2 = await _check_new_emails_async()

    assert stats["emails_processed"] == 2
    assert stats["emails_ignored"] == 1
    assert stats["attachments_saved"] == 1
    assert stats["notifications_sent"] == 1
    assert stats["errors"] == 0
    assert stats2["emails_processed"] == 0 and stats2["notifications_sent"] == 0

    assert send.await_count == 1
    body = send.await_args.args[1]
    assert body.startswith("[CRÍTICO]") and "Anexos: 1 arquivo(s)" in body
    assert mark.await_count >= 3

    async with AsyncSessionLocal() as db:
        assert (await db.execute(select(func.count(EmailRecord.id)))).scalar() == 2
        assert (await db.execute(select(func.count(EmailAttachment.id)))).scalar() == 1
        assert (await db.execute(select(func.count(NotificationLog.id)))).scalar() == 1
        m1 = (await db.execute(select(EmailRecord).where(EmailRecord.message_id == "m1"))).scalar_one()
        assert m1.priority == PriorityLevel.CRITICAL and m1.whatsapp_sent
