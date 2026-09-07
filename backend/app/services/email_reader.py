"""
Leitura de e-mails via Microsoft Graph API com autenticação MSAL.
"""
import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

import httpx
import msal
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

GRAPH_BASE = settings.OUTLOOK_GRAPH_ENDPOINT


class MSALAuthenticator:
    """Autenticação via Client Credentials Flow do Azure AD."""

    def __init__(self) -> None:
        self._token: Optional[str] = None
        self._token_expiry: Optional[datetime] = None
        self._app = msal.ConfidentialClientApplication(
            client_id=settings.OUTLOOK_CLIENT_ID,
            client_credential=settings.OUTLOOK_CLIENT_SECRET,
            authority=settings.OUTLOOK_AUTHORITY,
        )

    def get_token(self) -> str:
        if self._token and self._token_expiry:
            remaining = (self._token_expiry - datetime.now(timezone.utc)).total_seconds()
            if remaining > 60:
                return self._token

        result = self._app.acquire_token_for_client(scopes=settings.OUTLOOK_SCOPE)
        if "access_token" not in result:
            error = result.get("error_description", result.get("error", "Unknown"))
            raise RuntimeError(f"Falha na autenticação MSAL: {error}")

        self._token = result["access_token"]
        expires_in = result.get("expires_in", 3600)
        self._token_expiry = datetime.now(timezone.utc) + timedelta(seconds=expires_in)
        logger.info("msal_token_acquired", expires_in=expires_in)
        return self._token


class OutlookEmailReader:
    """Lê e-mails do Outlook via Microsoft Graph API."""

    def __init__(self) -> None:
        self._auth = MSALAuthenticator()
        self._client = httpx.AsyncClient(timeout=30.0)

    def _headers(self) -> Dict[str, str]:
        return {
            "Authorization": f"Bearer {self._auth.get_token()}",
            "Content-Type": "application/json",
        }

    async def _get(self, url: str, params: Optional[Dict] = None) -> Dict[str, Any]:
        for attempt in range(4):
            try:
                resp = await self._client.get(url, headers=self._headers(), params=params)
                if resp.status_code == 429:
                    retry_after = int(resp.headers.get("Retry-After", 5))
                    await asyncio.sleep(retry_after)
                    continue
                resp.raise_for_status()
                return resp.json()
            except httpx.HTTPStatusError as e:
                if attempt == 3:
                    raise
                wait = 2 ** attempt
                logger.warning("graph_api_retry", attempt=attempt + 1, wait=wait, error=str(e))
                await asyncio.sleep(wait)
        return {}

    async def _patch(self, url: str, payload: Dict) -> None:
        for attempt in range(4):
            try:
                resp = await self._client.patch(url, headers=self._headers(), json=payload)
                resp.raise_for_status()
                return
            except httpx.HTTPStatusError as e:
                if attempt == 3:
                    raise
                await asyncio.sleep(2 ** attempt)

    async def get_new_emails(self, max_emails: int = 25) -> List[Dict[str, Any]]:
        """Busca e-mails não lidos da caixa de entrada."""
        user = settings.OUTLOOK_EMAIL_ADDRESS
        url = f"{GRAPH_BASE}/users/{user}/mailFolders/inbox/messages"
        params = {
            "$filter": "isRead eq false",
            "$orderby": "receivedDateTime desc",
            "$top": max_emails,
            "$select": (
                "id,subject,from,toRecipients,ccRecipients,body,bodyPreview,"
                "receivedDateTime,hasAttachments,importance,conversationId"
            ),
        }
        data = await self._get(url, params=params)
        messages = data.get("value", [])
        logger.info("emails_fetched", count=len(messages))
        return messages

    async def get_attachments(self, message_id: str) -> List[Dict[str, Any]]:
        """Baixa metadados e conteúdo dos anexos de um e-mail."""
        user = settings.OUTLOOK_EMAIL_ADDRESS
        url = f"{GRAPH_BASE}/users/{user}/messages/{message_id}/attachments"
        data = await self._get(url)
        return data.get("value", [])

    async def mark_as_read(self, message_id: str) -> None:
        """Marca e-mail como lido."""
        user = settings.OUTLOOK_EMAIL_ADDRESS
        url = f"{GRAPH_BASE}/users/{user}/messages/{message_id}"
        await self._patch(url, {"isRead": True})

    def parse_email(self, raw: Dict[str, Any]) -> Dict[str, Any]:
        """Extrai campos estruturados de uma mensagem bruta da Graph API."""
        sender = raw.get("from", {}).get("emailAddress", {})
        recipients = [
            r["emailAddress"]["address"]
            for r in raw.get("toRecipients", [])
            if "emailAddress" in r
        ]
        body_content = raw.get("body", {}).get("content", "")
        body_type = raw.get("body", {}).get("contentType", "text")

        received_str = raw.get("receivedDateTime", "")
        try:
            received_at = datetime.fromisoformat(received_str.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            received_at = datetime.now(timezone.utc)

        return {
            "message_id": raw.get("id", ""),
            "subject": raw.get("subject") or "(Sem assunto)",
            "sender_email": sender.get("address", ""),
            "sender_name": sender.get("name", ""),
            "recipients": recipients,
            "body_preview": raw.get("bodyPreview", "")[:2000],
            "full_body": body_content,
            "body_type": body_type,
            "received_at": received_at,
            "has_attachments": raw.get("hasAttachments", False),
            "importance": raw.get("importance", "normal"),
            "conversation_id": raw.get("conversationId", ""),
            "raw_data": {
                "id": raw.get("id"),
                "importance": raw.get("importance"),
                "conversationId": raw.get("conversationId"),
            },
        }

    async def close(self) -> None:
        await self._client.aclose()
