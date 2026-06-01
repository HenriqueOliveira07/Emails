"""
Leitura de e-mails via IMAP como fallback ao Microsoft Graph API.
Suporta Gmail, Yahoo, e qualquer servidor IMAP padrão.
"""
import email
import imaplib
import re
from datetime import datetime, timezone
from email.header import decode_header
from email.utils import parsedate_to_datetime
from typing import Any, Dict, List, Optional, Tuple

import structlog

from app.config import settings

logger = structlog.get_logger(__name__)


def _decode_header_value(value: str) -> str:
    """Decodifica cabeçalhos de e-mail com codificação MIME."""
    if not value:
        return ""
    parts = decode_header(value)
    decoded = []
    for part, charset in parts:
        if isinstance(part, bytes):
            try:
                decoded.append(part.decode(charset or "utf-8", errors="replace"))
            except (LookupError, UnicodeDecodeError):
                decoded.append(part.decode("latin-1", errors="replace"))
        else:
            decoded.append(part)
    return " ".join(decoded)


def _get_body(msg) -> Tuple[str, str]:
    """Extrai corpo do e-mail (texto puro ou HTML)."""
    text_body = ""
    html_body = ""

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            if content_type == "text/plain":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    text_body = payload.decode(charset, errors="replace")
            elif content_type == "text/html":
                payload = part.get_payload(decode=True)
                if payload:
                    charset = part.get_content_charset() or "utf-8"
                    html_body = payload.decode(charset, errors="replace")
    else:
        content_type = msg.get_content_type()
        payload = msg.get_payload(decode=True)
        if payload:
            charset = msg.get_content_charset() or "utf-8"
            body = payload.decode(charset, errors="replace")
            if content_type == "text/html":
                html_body = body
            else:
                text_body = body

    return text_body, html_body


def _get_attachments_info(msg) -> List[Dict[str, Any]]:
    """Extrai informações de anexos sem o conteúdo binário completo."""
    attachments = []
    if not msg.is_multipart():
        return attachments

    for part in msg.walk():
        disposition = part.get_content_disposition()
        if disposition and "attachment" in disposition.lower():
            filename = part.get_filename()
            if filename:
                filename = _decode_header_value(filename)
                payload = part.get_payload(decode=True) or b""
                attachments.append({
                    "name": filename,
                    "contentType": part.get_content_type(),
                    "contentBytes": __import__("base64").b64encode(payload).decode() if payload else "",
                    "size": len(payload),
                })
    return attachments


class IMAPEmailReader:
    """Lê e-mails via IMAP."""

    def __init__(
        self,
        host: str,
        port: int = 993,
        username: str = "",
        password: str = "",
        use_ssl: bool = True,
    ) -> None:
        self._host = host
        self._port = port
        self._username = username or settings.IMAP_USERNAME
        self._password = password or settings.IMAP_PASSWORD
        self._use_ssl = use_ssl
        self._conn: Optional[imaplib.IMAP4_SSL | imaplib.IMAP4] = None

    def connect(self) -> None:
        """Abre conexão IMAP."""
        try:
            if self._use_ssl:
                self._conn = imaplib.IMAP4_SSL(self._host, self._port)
            else:
                self._conn = imaplib.IMAP4(self._host, self._port)
            self._conn.login(self._username, self._password)
            logger.info("imap_connected", host=self._host, user=self._username)
        except imaplib.IMAP4.error as e:
            logger.error("imap_connect_failed", error=str(e))
            raise

    def disconnect(self) -> None:
        """Fecha conexão IMAP."""
        if self._conn:
            try:
                self._conn.logout()
            except Exception:
                pass
            self._conn = None

    def get_new_emails(self, max_emails: int = 25) -> List[Dict[str, Any]]:
        """Busca e-mails não lidos via IMAP."""
        if not self._conn:
            self.connect()

        assert self._conn is not None
        self._conn.select("INBOX")
        _, data = self._conn.search(None, "UNSEEN")
        uids = data[0].split()

        if not uids:
            return []

        emails = []
        for uid in uids[-max_emails:]:
            try:
                _, msg_data = self._conn.fetch(uid, "(RFC822)")
                raw = msg_data[0][1]
                if not isinstance(raw, bytes):
                    continue

                msg = email.message_from_bytes(raw)
                parsed = self._parse_message(uid.decode(), msg)
                emails.append(parsed)
            except Exception as e:
                logger.warning("imap_message_parse_failed", uid=uid, error=str(e))

        logger.info("imap_emails_fetched", count=len(emails))
        return emails

    def mark_as_read(self, message_id: str) -> None:
        """Marca e-mail como lido via IMAP."""
        if not self._conn:
            return
        try:
            self._conn.store(message_id.encode(), "+FLAGS", "\\Seen")
        except Exception as e:
            logger.warning("imap_mark_read_failed", uid=message_id, error=str(e))

    def _parse_message(self, uid: str, msg) -> Dict[str, Any]:
        """Converte mensagem IMAP para o formato padrão do sistema."""
        subject = _decode_header_value(msg.get("Subject", "(Sem assunto)"))
        from_raw = _decode_header_value(msg.get("From", ""))
        sender_name, sender_email = self._parse_from(from_raw)

        to_raw = msg.get("To", "")
        recipients = [addr.strip() for addr in to_raw.split(",") if addr.strip()]

        date_str = msg.get("Date", "")
        try:
            received_at = parsedate_to_datetime(date_str).astimezone(timezone.utc)
        except Exception:
            received_at = datetime.now(timezone.utc)

        text_body, html_body = _get_body(msg)
        body = text_body or html_body
        attachments = _get_attachments_info(msg)

        return {
            "message_id": f"imap:{uid}:{msg.get('Message-ID', uid)}",
            "subject": subject,
            "sender_email": sender_email,
            "sender_name": sender_name,
            "recipients": recipients,
            "body_preview": body[:2000],
            "full_body": body,
            "body_type": "html" if html_body else "text",
            "received_at": received_at,
            "has_attachments": len(attachments) > 0,
            "importance": "normal",
            "conversation_id": msg.get("Thread-Index", ""),
            "raw_data": {"uid": uid, "message_id": msg.get("Message-ID", "")},
            "_attachments": attachments,
        }

    @staticmethod
    def _parse_from(from_str: str) -> Tuple[str, str]:
        """Extrai nome e e-mail do campo From."""
        match = re.match(r'"?([^"<]*)"?\s*<?([^>]+@[^>]+)>?', from_str.strip())
        if match:
            name = match.group(1).strip()
            email_addr = match.group(2).strip().lower()
            return name, email_addr
        email_match = re.search(r'[\w._%+-]+@[\w.-]+\.[a-zA-Z]{2,}', from_str)
        if email_match:
            return "", email_match.group(0).lower()
        return "", from_str.strip().lower()
