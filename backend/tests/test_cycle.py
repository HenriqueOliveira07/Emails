"""Ciclo completo com Outlook, Claude e WhatsApp simulados e banco SQLite."""
import base64
from datetime import datetime, timezone

import pytest
from sqlalchemy import func, select

from app.services.ai_classifier import AIClassifier as RealClassifier
from app.services.email_reader import OutlookEmailReader as RealReader
from app.services.whatsapp_sender import WhatsAppSender as RealWhatsApp
from app.workers import tasks


def _msg(mid, subject, body, attachments=False):
    return {
        "id": mid,
        "subject": subject,
        "from": {"emailAddress": {"address": "financeiro@empresa.com", "name": "Financeiro"}},
        "toRecipients": [{"emailAddress": {"address": "eu@empresa.com"}}],
        "body": {"contentType": "text", "content": body},
        "bodyPreview": body[:255],
        "receivedDateTime": datetime.now(timezone.utc).isoformat(),
        "hasAttachments": attachments,
    }


INBOX = [
    _msg("m1", "URGENTE: aprovação de pagamento", "Fornecedor aguarda aprovação até 12h", True),
    _msg("m2", "Newsletter semanal", "clique aqui para descadastrar"),
    _msg("m3", "Relatório mensal do fornecedor", "Segue relatório"),
    _msg("m4", "explode", "corpo"),
]


class FakeReader:
    def __init__(self):
        pass

    async def get_new_emails(self, max_emails=25, since=None):
        return INBOX

    async def get_attachments(self, message_id):
        return [{"name": "boleto.pdf", "contentBytes": base64.b64encode(b"%PDF-1.4 x").decode()}]

    def parse_email(self, raw):
        if raw["subject"] == "explode":
            raise ValueError("e-mail malformado")
        return RealReader.parse_email(self, raw)

    async def mark_as_read(self, mid):
        pass

    async def close(self):
        pass


class FakeClassifier:
    def classify_email(self, parsed):
        return RealClassifier._fallback_classification(self, parsed)

    def summarize_pdf(self, text):
        return ""

    def extract_invoice_data(self, text):
        return {}


class FakeWhatsApp:
    sent = []

    def format_message(self, e, a):
        return RealWhatsApp.format_message(self, e, a)

    async def send_email_notification(self, e, a):
        FakeWhatsApp.sent.append(self.format_message(e, a))
        return {"success": True, "external_id": "wamid.1"}

    async def close(self):
        pass


@pytest.fixture
async def db_ready():
    from app.db.database import Base
    from app.models import email, notification  # noqa: F401

    engine, _ = __import__("app.db.database", fromlist=["x"]).worker_sessionmaker()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    await engine.dispose()


async def test_full_cycle(monkeypatch, db_ready):
    monkeypatch.setattr("app.services.email_reader.OutlookEmailReader", FakeReader)
    monkeypatch.setattr("app.services.ai_classifier.AIClassifier", FakeClassifier)
    monkeypatch.setattr("app.services.whatsapp_sender.WhatsAppSender", FakeWhatsApp)
    FakeWhatsApp.sent = []

    stats = await tasks._check_new_emails_async()
    assert stats["emails_fetched"] == 4
    assert stats["emails_processed"] == 2          # m1 (crítico) e m3 (médio)
    assert stats["emails_ignored"] == 1            # newsletter
    assert stats["errors"] == 1                    # m4 falhou sem derrubar os demais
    assert stats["attachments_saved"] == 1
    assert stats["notifications_sent"] == 1
    assert FakeWhatsApp.sent[0].startswith("[CRÍTICO]")

    # Segundo ciclo: nada é reprocessado nem renotificado
    stats2 = await tasks._check_new_emails_async()
    assert stats2["emails_duplicated"] == 3
    assert stats2["notifications_sent"] == 0
    assert len(FakeWhatsApp.sent) == 1

    from app.models.email import EmailRecord
    from app.models.notification import ProcessingLog

    async with tasks.worker_db() as db:
        assert (await db.execute(select(func.count(EmailRecord.id)))).scalar() == 3
        errors = (await db.execute(
            select(func.count(ProcessingLog.id)).where(ProcessingLog.success == False)  # noqa: E712
        )).scalar()
        assert errors >= 2  # m4 falhou nos dois ciclos e ficou auditado
