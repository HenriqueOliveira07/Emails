"""
Envio de notificações via WhatsApp Business API.
Suporta Twilio e Meta (WhatsApp Business API direta).
"""
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

PRIORITY_LABELS = {
    "CRITICO": "🔴 CRÍTICO",
    "ALTO": "🟠 ALTO",
    "MEDIO": "🟡 MÉDIO",
    "BAIXO": "🟢 BAIXO",
}


class WhatsAppSender:
    """Envia notificações via WhatsApp."""

    def __init__(self) -> None:
        self._client = httpx.AsyncClient(timeout=15.0)
        self._provider = settings.WHATSAPP_PROVIDER.lower()

    def format_message(self, email_data: Dict[str, Any], ai_result: Dict[str, Any]) -> str:
        """Formata a mensagem de notificação no padrão corporativo."""
        priority_raw = ai_result.get("priority", "BAIXO")
        priority_label = PRIORITY_LABELS.get(priority_raw, f"[{priority_raw}]")

        sender_name = email_data.get("sender_name", "")
        sender_email = email_data.get("sender_email", "")
        remetente = f"{sender_name} <{sender_email}>" if sender_name else sender_email

        received_at: Optional[datetime] = email_data.get("received_at")
        if isinstance(received_at, datetime):
            horario = received_at.astimezone(timezone.utc).strftime("%d/%m/%Y %H:%M")
        else:
            horario = datetime.now().strftime("%d/%m/%Y %H:%M")

        subject = email_data.get("subject", "(Sem assunto)")
        summary = ai_result.get("summary", email_data.get("body_preview", ""))[:400]
        has_attachments = email_data.get("has_attachments", False)
        attachment_count = email_data.get("attachment_count", 0)
        action_required = ai_result.get("action_required", False)
        action_desc = ai_result.get("action_description", "")
        category = ai_result.get("category", "Geral")

        lines = [
            f"[{priority_label}]",
            "Novo e-mail importante recebido",
            "",
            f"Remetente: {remetente}",
            f"Assunto: {subject}",
            f"Categoria: {category}",
            f"Horário: {horario}",
            "",
            "Resumo:",
            summary,
        ]

        if action_required and action_desc:
            lines += ["", f"Ação necessária: {action_desc}"]

        if has_attachments:
            count_str = f"{attachment_count} arquivo(s)" if attachment_count else "arquivos"
            lines += ["", f"Anexos: {count_str}"]

        return "\n".join(lines)

    async def send_email_notification(
        self, email_data: Dict[str, Any], ai_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Envia notificação de e-mail importante via WhatsApp."""
        message = self.format_message(email_data, ai_result)
        return await self._send_message(settings.WHATSAPP_TO_NUMBER, message)

    async def send_daily_summary(self, stats: Dict[str, Any]) -> Dict[str, Any]:
        """Envia resumo diário via WhatsApp."""
        today = datetime.now().strftime("%d/%m/%Y")
        message = (
            f"RESUMO DIÁRIO — {today}\n\n"
            f"E-mails processados: {stats.get('total', 0)}\n"
            f"Críticos: {stats.get('critical', 0)}\n"
            f"Alto: {stats.get('high', 0)}\n"
            f"Médio: {stats.get('medium', 0)}\n"
            f"Baixo/Spam: {stats.get('low', 0)}\n"
            f"Anexos salvos: {stats.get('attachments', 0)}\n"
            f"Notificações enviadas: {stats.get('notifications', 0)}\n"
            f"Erros: {stats.get('errors', 0)}"
        )
        return await self._send_message(settings.WHATSAPP_TO_NUMBER, message)

    async def _send_message(self, to: str, body: str) -> Dict[str, Any]:
        """Envia mensagem via provedor configurado."""
        if self._provider == "twilio":
            return await self._send_twilio(to, body)
        return await self._send_meta(to, body)

    async def _send_twilio(self, to: str, body: str) -> Dict[str, Any]:
        """Envia via Twilio WhatsApp API."""
        url = (
            f"https://api.twilio.com/2010-04-01/Accounts/"
            f"{settings.TWILIO_ACCOUNT_SID}/Messages.json"
        )
        from_number = f"whatsapp:{settings.WHATSAPP_PHONE_NUMBER}"
        to_number = f"whatsapp:{to}"

        try:
            resp = await self._client.post(
                url,
                auth=(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN),
                data={"From": from_number, "To": to_number, "Body": body},
            )
            resp.raise_for_status()
            data = resp.json()
            logger.info("whatsapp_sent_twilio", sid=data.get("sid"), to=to)
            return {"success": True, "external_id": data.get("sid", ""), "provider": "twilio"}
        except httpx.HTTPError as e:
            logger.error("whatsapp_twilio_error", error=str(e), to=to)
            return {"success": False, "error": str(e), "provider": "twilio"}

    async def _send_meta(self, to: str, body: str) -> Dict[str, Any]:
        """Envia via Meta WhatsApp Business API."""
        url = (
            f"https://graph.facebook.com/v19.0/"
            f"{settings.META_WHATSAPP_PHONE_NUMBER_ID}/messages"
        )
        headers = {
            "Authorization": f"Bearer {settings.META_WHATSAPP_ACCESS_TOKEN}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": to.lstrip("+"),
            "type": "text",
            "text": {"body": body},
        }
        try:
            resp = await self._client.post(url, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id", "")
            logger.info("whatsapp_sent_meta", message_id=msg_id, to=to)
            return {"success": True, "external_id": msg_id, "provider": "meta"}
        except httpx.HTTPError as e:
            logger.error("whatsapp_meta_error", error=str(e), to=to)
            return {"success": False, "error": str(e), "provider": "meta"}

    async def close(self) -> None:
        await self._client.aclose()
