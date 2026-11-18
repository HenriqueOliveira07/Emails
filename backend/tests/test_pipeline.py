"""
Testes ponta a ponta do ciclo de processamento, com Outlook, Claude e WhatsApp simulados.

Executar:  cd backend && pytest -q
(usa SQLite em arquivo temporário; não precisa de PostgreSQL/Redis)
"""
import base64
import os
import sys
import tempfile
from pathlib import Path

_TMP = tempfile.mkdtemp(prefix="emails_test_")
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP}/test.db"
os.environ["ATTACHMENTS_BASE_PATH"] = f"{_TMP}/Emails_Importantes"
os.environ["LOGS_BASE_PATH"] = f"{_TMP}/logs"
os.environ.setdefault("WHATSAPP_TO_NUMBER", "+5511999999999")
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import asyncio  # noqa: E402

import pytest  # noqa: E402
from sqlalchemy import select  # noqa: E402

from app.db.database import AsyncSessionLocal, create_tables, drop_tables  # noqa: E402
from app.models.email import EmailAttachment, EmailRecord, PriorityLevel  # noqa: E402
from app.models.notification import NotificationLog  # noqa: E402
from app.services.email_reader import OutlookEmailReader as _RealReader  # noqa: E402
from app.services.whatsapp_sender import WhatsAppSender  # noqa: E402
from app.workers import tasks  # noqa: E402


def _graph_message(mid, subject, sender, body, received="2026-05-26T02:30:00Z", attach=False):
    return {
        "id": mid,
        "subject": subject,
        "from": {"emailAddress": {"address": sender, "name": "Fornecedor X"}},
        "toRecipients": [{"emailAddress": {"address": "eu@empresa.com"}}],
        "body": {"contentType": "html", "content": f"<p>{body}</p>"},
        "bodyPreview": body[:20],
        "receivedDateTime": received,
        "hasAttachments": attach,
        "importance": "high",
    }


class FakeReader:
    def __init__(self, messages, attachments=None):
        self.messages = messages
        self.attachments = attachments or {}
        self.marked = []

    async def get_new_emails(self, max_emails=25):
        return self.messages

    def parse_email(self, raw):
        return _RealReader.parse_email(self, raw)

    async def get_attachments(self, mid):
        return self.attachments.get(mid, [])

    async def mark_as_read(self, mid):
        self.marked.append(mid)

    async def close(self):
        pass


class FakeClassifier:
    seen_bodies = []

    def classify_email(self, parsed):
        self.seen_bodies.append(parsed.get("full_body", ""))
        subj = parsed["subject"].lower()
        if "newsletter" in subj:
            return {"priority": "BAIXO", "is_spam": True, "summary": ""}
        if "explode" in subj:
            raise RuntimeError("falha simulada")
        if "urgente" in subj:
            return {
                "priority": "CRITICO", "is_spam": False, "category": "Financeiro",
                "summary": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
                "keywords_found": ["urgente", "pagamento"], "action_required": True,
                "action_description": "Aprovar pagamento",
            }
        return {"priority": "MEDIO", "is_spam": False, "summary": "Informativo."}


class FakeWhatsApp(WhatsAppSender):
    sent = []

    def __init__(self):
        pass

    async def send_email_notification(self, parsed, ai_result):
        self.sent.append(self.format_message(parsed, ai_result))
        return {"success": True, "external_id": "wamid.TEST"}

    async def close(self):
        pass


@pytest.fixture()
def run_cycle(monkeypatch):
    asyncio.run(drop_tables())
    asyncio.run(create_tables())
    FakeWhatsApp.sent = []
    FakeClassifier.seen_bodies = []

    def _run(reader):
        monkeypatch.setattr("app.services.email_reader.OutlookEmailReader", lambda: reader)
        monkeypatch.setattr("app.services.ai_classifier.AIClassifier", FakeClassifier)
        monkeypatch.setattr("app.services.whatsapp_sender.WhatsAppSender", FakeWhatsApp)
        return asyncio.run(tasks._check_new_emails_async())

    return _run


async def _fetch(model):
    async with AsyncSessionLocal() as db:
        return list((await db.execute(select(model))).scalars())


def test_full_cycle(run_cycle):
    pdf = base64.b64encode(b"%PDF-1.4 fake").decode()
    reader = FakeReader(
        [
            _graph_message("m1", "Aprovação URGENTE de pagamento", "financeiro@fornecedor.com",
                           "Precisamos da aprovação do pagamento até 12h. " * 20, attach=True),
            _graph_message("m2", "Newsletter semanal", "news@marketing.com", "promo"),
            _graph_message("m3", "isso explode", "x@y.com", "boom"),
            _graph_message("m4", "Reunião de alinhamento", "colega@empresa.com", "pauta"),
        ],
        attachments={"m1": [
            {"name": "boleto.pdf", "contentType": "application/pdf", "contentBytes": pdf},
            {"name": "boleto.pdf", "contentType": "application/pdf", "contentBytes": pdf},
            {"name": "virus.exe", "contentType": "application/octet-stream", "contentBytes": pdf},
        ]},
    )
    stats = run_cycle(reader)

    assert stats["emails_processed"] == 2
    assert stats["emails_ignored"] == 1
    assert stats["errors"] == 1
    assert stats["attachments_saved"] == 2
    assert stats["notifications_sent"] == 1

    # E-mail com erro NÃO é marcado como lido (será reprocessado no próximo ciclo)
    assert "m3" not in reader.marked
    assert set(reader.marked) == {"m1", "m2", "m4"}

    # IA recebe o corpo completo, não só o bodyPreview truncado
    assert any(len(b) > 500 for b in FakeClassifier.seen_bodies)

    emails = asyncio.run(_fetch(EmailRecord))
    crit = next(e for e in emails if e.message_id == "m1")
    assert crit.priority == PriorityLevel.CRITICAL and crit.whatsapp_sent

    # Anexos: dia LOCAL (02:30Z = 25/05 23:30 em Brasília), sem duplicidade, .exe bloqueado
    atts = asyncio.run(_fetch(EmailAttachment))
    paths = sorted(a.file_path for a in atts)
    assert len(paths) == 2 and paths[0] != paths[1]
    assert all("/2026/05/25/" in p for p in paths)
    assert all(Path(p).exists() for p in paths)

    # Formato da mensagem WhatsApp
    msg = FakeWhatsApp.sent[0]
    assert msg.startswith("[CRITICO]")
    assert "Remetente: Fornecedor X <financeiro@fornecedor.com>" in msg
    assert "25/05/2026 23:30" in msg
    assert "Anexos: 2 arquivo(s)" in msg
    assert len(asyncio.run(_fetch(NotificationLog))) == 1


def test_duplicate_is_skipped(run_cycle):
    msg = _graph_message("dup", "Aprovação urgente", "a@b.com", "x")
    run_cycle(FakeReader([msg]))
    stats = run_cycle(FakeReader([msg]))
    assert stats["emails_processed"] == 0
    assert len(asyncio.run(_fetch(EmailRecord))) == 1
