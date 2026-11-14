"""Teste de integração do pipeline de um e-mail com SQLite em memória e serviços falsos."""
import base64
from datetime import datetime, timezone

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from app.config import settings
from app.db.database import Base
from app.models.email import EmailAttachment, EmailRecord
from app.models.notification import NotificationLog, ProcessingLog
from app.services.attachment_handler import AttachmentHandler
from app.services.email_reader import OutlookEmailReader
from app.services.log_service import LogService
from app.workers.tasks import _process_one


class FakeReader:
    parse_email = OutlookEmailReader.parse_email

    async def get_attachments(self, message_id):
        return [{"name": "boleto.pdf", "contentType": "application/pdf",
                 "contentBytes": base64.b64encode(b"%PDF-1.4 x").decode()}]


class FakeClassifier:
    def classify_email(self, e):
        assert "signals" in e
        return {"priority": "CRITICO", "category": "Pagamento", "summary": "Aprovar até 12h.",
                "keywords_found": ["urgente"], "is_spam": False, "action_required": True}

    def extract_invoice_data(self, t):
        return {}

    def summarize_pdf(self, t):
        return ""


class FakeWhatsApp:
    def __init__(self):
        self.sent = []

    async def send_email_notification(self, parsed, ai):
        self.sent.append(parsed["subject"])
        return {"success": True, "external_id": "wamid.1"}

    def format_message(self, parsed, ai):
        return "msg"


RAW = {
    "id": "AAMk-1",
    "subject": "URGENTE: aprovação de pagamento",
    "from": {"emailAddress": {"address": "financeiro@empresa.com.br", "name": "Financeiro"}},
    "toRecipients": [{"emailAddress": {"address": "usuario@empresa.com.br"}}],
    "body": {"content": "corpo", "contentType": "text"},
    "bodyPreview": "Fornecedor aguardando aprovação",
    "receivedDateTime": "2026-05-26T11:42:00Z",
    "hasAttachments": True,
}


@pytest.mark.asyncio
async def test_process_one_end_to_end(tmp_path):
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as c:
        await c.run_sync(Base.metadata.create_all)
    Session = async_sessionmaker(engine, expire_on_commit=False)
    wa = FakeWhatsApp()

    async with Session() as db:
        args = (db, LogService(db), FakeReader(), FakeClassifier(), wa,
                AttachmentHandler(base_path=str(tmp_path)), settings)
        out = await _process_one(RAW, *args)
        await db.commit()
        assert out["stats"]["emails_processed"] == 1
        assert out["stats"]["attachments_saved"] == 1
        assert out["stats"]["notifications_sent"] == 1

        # Reprocessar o mesmo e-mail não duplica nada
        out2 = await _process_one(RAW, *args)
        await db.commit()
        assert out2["stats"]["emails_processed"] == 0

        assert len((await db.execute(select(EmailRecord))).scalars().all()) == 1
        assert len((await db.execute(select(EmailAttachment))).scalars().all()) == 1
        assert len((await db.execute(select(NotificationLog))).scalars().all()) == 1
        actions = {l.action for l in (await db.execute(select(ProcessingLog))).scalars().all()}
        assert {"email_processed", "attachment_saved", "whatsapp_sent"} <= actions
    assert wa.sent == ["URGENTE: aprovação de pagamento"]
    await engine.dispose()
