"""Teste de ponta a ponta do ciclo de processamento com integrações simuladas."""
import asyncio
import base64

import pytest

from app.services.email_reader import OutlookEmailReader as _RealReader
from app.workers import tasks


def _raw(msg_id, subject, body, attachments=False):
    return {
        "id": msg_id,
        "subject": subject,
        "from": {"emailAddress": {"address": "financeiro@empresa.com", "name": "Fornecedor X"}},
        "toRecipients": [{"emailAddress": {"address": "eu@empresa.com"}}],
        "body": {"content": body, "contentType": "text"},
        "bodyPreview": body,
        "receivedDateTime": "2026-05-26T11:42:00Z",
        "hasAttachments": attachments,
    }


class FakeReader:
    marked = []

    async def get_new_emails(self, max_emails=25):
        return [
            _raw("a1", "URGENTE: aprovação de pagamento", "Aprovar pagamento hoje", attachments=True),
            _raw("a2", "Newsletter da semana", "unsubscribe newsletter promoção"),
            _raw("boom", "Contrato", "Falha simulada"),
        ]

    def parse_email(self, raw):
        if raw["id"] == "boom":
            raise RuntimeError("falha simulada")
        return _RealReader.parse_email(self, raw)

    async def get_attachments(self, message_id):
        return [{"name": "boleto.pdf", "contentType": "application/pdf",
                 "contentBytes": base64.b64encode(b"%PDF-1.4 teste").decode()}]

    async def mark_as_read(self, message_id):
        FakeReader.marked.append(message_id)

    async def close(self):
        pass


class FakeWhatsApp:
    sent = []

    def format_message(self, parsed, ai):
        return f"[{ai['priority']}] {parsed['subject']}"

    async def send_email_notification(self, parsed, ai):
        FakeWhatsApp.sent.append(parsed["subject"])
        return {"success": True, "external_id": "wamid.1"}

    async def close(self):
        pass


@pytest.fixture(autouse=True)
def _patch(monkeypatch):
    import app.services.email_reader as er
    import app.services.whatsapp_sender as ws
    monkeypatch.setattr(er, "OutlookEmailReader", FakeReader)
    monkeypatch.setattr(ws, "WhatsAppSender", FakeWhatsApp)
    FakeReader.marked.clear()
    FakeWhatsApp.sent.clear()


def test_cycle_processes_ignores_and_isolates_failures():
    from app.db.database import create_tables, AsyncSessionLocal
    from app.models.email import EmailRecord
    from sqlalchemy import select

    async def run():
        await create_tables()
        stats = await tasks._check_new_emails_async()
        async with AsyncSessionLocal() as db:
            rows = (await db.execute(select(EmailRecord))).scalars().all()
        return stats, rows

    stats, rows = asyncio.run(run())
    assert stats["emails_processed"] == 1
    assert stats["emails_ignored"] == 1
    assert stats["errors"] == 1
    assert stats["attachments_saved"] == 1
    assert stats["notifications_sent"] == 1
    assert [r.message_id for r in rows] == ["a1"]
    # e-mail que falhou não é marcado como lido → será reprocessado
    assert "boom" not in FakeReader.marked
    assert set(FakeReader.marked) == {"a1", "a2"}

    # Segundo ciclo: duplicata não gera nova notificação
    FakeWhatsApp.sent.clear()
    stats2, _ = asyncio.run(run())
    assert stats2["emails_processed"] == 0
    assert FakeWhatsApp.sent == []
