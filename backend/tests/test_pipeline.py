"""Teste ponta-a-ponta do ciclo check_new_emails com integrações simuladas."""
import base64

import pytest
from sqlalchemy import select

from app.db.database import create_tables, drop_tables, worker_session
from app.models.email import EmailRecord, PriorityLevel
from app.models.notification import NotificationLog, ProcessingLog
from app.services.ai_classifier import AIClassifier
from app.services.email_reader import OutlookEmailReader
from app.services.whatsapp_sender import WhatsAppSender
from app.workers import tasks

_parse = OutlookEmailReader.parse_email
_fallback = AIClassifier._fallback_classification
_format = WhatsAppSender.format_message


def _raw(mid, subject, sender="financeiro@empresa.com", attachments=False):
    return {
        "id": mid,
        "subject": subject,
        "from": {"emailAddress": {"address": sender, "name": "Financeiro"}},
        "toRecipients": [{"emailAddress": {"address": "eu@empresa.com"}}],
        "body": {"content": subject, "contentType": "text"},
        "bodyPreview": subject,
        "receivedDateTime": "2026-05-26T11:42:00Z",
        "hasAttachments": attachments,
    }


INBOX = [
    _raw("m1", "URGENTE: aprovação de pagamento", attachments=True),
    _raw("m2", "Newsletter semanal unsubscribe"),
    _raw("m3", "Pendência com fornecedor"),
    _raw("m4", "BOOM"),  # força erro no classificador
    _raw("m5", "Oferta", sender="promo@spam.example"),
    _raw("m6", "Bom dia", sender="ceo@empresa.com"),
]


class FakeReader:
    marked = []

    def parse_email(self, raw):
        return _parse(self, raw)

    async def get_new_emails(self, max_emails=25):
        return INBOX

    async def get_attachments(self, mid):
        return [{"name": "boleto.pdf", "contentType": "application/pdf",
                 "contentBytes": base64.b64encode(b"%PDF-1.4 teste").decode()}]

    async def mark_as_read(self, mid):
        FakeReader.marked.append(mid)

    async def close(self):
        pass


class FakeClassifier:
    def classify_email(self, e):
        if e["subject"] == "BOOM":
            raise RuntimeError("falha simulada")
        return _fallback(self, e)

    def summarize_pdf(self, t):
        return ""

    def extract_invoice_data(self, t):
        return {}


class FakeWhatsApp:
    sent = []

    def format_message(self, e, r):
        return _format(self, e, r)

    async def send_email_notification(self, e, r):
        FakeWhatsApp.sent.append(e["message_id"])
        return {"success": True, "external_id": "wamid.1"}

    async def close(self):
        pass


@pytest.mark.asyncio
async def test_full_cycle(monkeypatch, tmp_path):
    await drop_tables()
    await create_tables()
    monkeypatch.setattr("app.services.email_reader.OutlookEmailReader", FakeReader)
    monkeypatch.setattr("app.services.ai_classifier.AIClassifier", FakeClassifier)
    monkeypatch.setattr("app.services.whatsapp_sender.WhatsAppSender", FakeWhatsApp)
    from app.config import settings
    monkeypatch.setattr(settings, "ATTACHMENTS_BASE_PATH", str(tmp_path))

    stats = await tasks._check_new_emails_async()
    assert stats == {
        "emails_processed": 3,  # m1, m3, m6
        "emails_ignored": 2,    # m2 (spam), m5 (bloqueado)
        "attachments_saved": 1,
        "notifications_sent": 1,
        "errors": 1,            # m4
    }
    # m4 falhou: não deve ser marcado como lido (será reprocessado)
    assert "m4" not in FakeReader.marked
    assert FakeWhatsApp.sent == ["m1"]

    async with worker_session() as db:
        rows = {r.message_id: r for r in (await db.execute(select(EmailRecord))).scalars()}
        assert set(rows) == {"m1", "m3", "m6"}
        assert rows["m1"].priority == PriorityLevel.CRITICAL
        assert rows["m1"].whatsapp_sent is True
        assert rows["m6"].priority == PriorityLevel.MEDIUM  # VIP subiu de BAIXO
        assert (tmp_path / "Emails_Importantes/2026/05/26/Financeiro/boleto.pdf").exists()
        notif = (await db.execute(select(NotificationLog))).scalars().one()
        assert notif.message_body.startswith("[CRÍTICO]")
        actions = [l.action for l in (await db.execute(select(ProcessingLog))).scalars()]
        assert "email_processing_error" in actions
        assert actions.count("email_ignored") == 2
        assert "cycle_complete" in actions

    # Segunda execução: nada novo é reprocessado (deduplicação)
    FakeWhatsApp.sent.clear()
    stats2 = await tasks._check_new_emails_async()
    assert stats2["emails_processed"] == 0 and FakeWhatsApp.sent == []
