"""
Classificação inteligente de e-mails usando Claude API.
"""
import json
from typing import Any, Dict, List, Optional

import anthropic
import structlog

from app.config import settings

logger = structlog.get_logger(__name__)

CLASSIFICATION_TOOL = {
    "name": "classificar_email",
    "description": "Classifica e resume um e-mail corporativo em português",
    "input_schema": {
        "type": "object",
        "properties": {
            "priority": {
                "type": "string",
                "enum": ["CRITICO", "ALTO", "MEDIO", "BAIXO"],
                "description": "Nível de prioridade do e-mail",
            },
            "category": {
                "type": "string",
                "description": "Categoria do e-mail (ex: Pagamento, Contrato, Suporte, Alerta Operacional)",
            },
            "summary": {
                "type": "string",
                "description": "Resumo objetivo em 2-3 frases do conteúdo principal",
            },
            "keywords_found": {
                "type": "array",
                "items": {"type": "string"},
                "description": "Palavras-chave críticas encontradas no e-mail",
            },
            "is_spam": {
                "type": "boolean",
                "description": "True se for spam, newsletter, resposta automática ou marketing",
            },
            "action_required": {
                "type": "boolean",
                "description": "True se o e-mail exige ação imediata do destinatário",
            },
            "action_description": {
                "type": "string",
                "description": "Descrição breve da ação necessária, se houver",
            },
        },
        "required": ["priority", "category", "summary", "keywords_found", "is_spam", "action_required"],
    },
}

SYSTEM_PROMPT = """Você é um assistente especializado em classificar e-mails corporativos brasileiros.

REGRAS DE PRIORIDADE:
- CRITICO: sistemas parados, falhas críticas, emergências, vencimento HOJE, palavras como URGENTE/SOS/emergência
- ALTO: aprovações pendentes, contratos para assinar, pagamentos, decisões importantes de diretoria
- MEDIO: fornecedores, clientes, pendências gerais, solicitações, relatórios, orçamentos
- BAIXO: informativos, newsletters, respostas automáticas, atualizações rotineiras

SPAM/IGNORAR:
- Newsletters e marketing
- Respostas automáticas ("Fora do escritório", "Auto-reply")
- Promoções e ofertas comerciais
- E-mails de noreply sem conteúdo acionável

Analise o e-mail fornecido e classifique seguindo estritamente as regras acima.
Responda sempre em português."""


class AIClassifier:
    """Classifica e-mails usando Claude API com structured output via tool_use."""

    def __init__(self) -> None:
        self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)

    def classify_email(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Classifica um e-mail e retorna prioridade, categoria e resumo.

        Returns:
            Dict com priority, category, summary, keywords_found, is_spam, action_required
        """
        subject = email_data.get("subject", "(Sem assunto)")
        sender = email_data.get("sender_email", "")
        sender_name = email_data.get("sender_name", "")
        body = email_data.get("body_preview", "") or email_data.get("full_body", "")
        body_trimmed = body[:3000] if body else ""
        has_attachments = email_data.get("has_attachments", False)
        importance = email_data.get("importance", "normal")

        user_message = f"""E-mail para classificar:

Remetente: {sender_name} <{sender}>
Assunto: {subject}
Importância (sistema): {importance}
Possui anexos: {"Sim" if has_attachments else "Não"}

Corpo:
{body_trimmed}

Classifique este e-mail."""

        try:
            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=settings.CLAUDE_MAX_TOKENS,
                system=SYSTEM_PROMPT,
                tools=[CLASSIFICATION_TOOL],
                tool_choice={"type": "any"},
                messages=[{"role": "user", "content": user_message}],
            )

            for block in response.content:
                if block.type == "tool_use" and block.name == "classificar_email":
                    result = block.input
                    logger.info(
                        "email_classified",
                        sender=sender,
                        subject=subject[:60],
                        priority=result.get("priority"),
                        is_spam=result.get("is_spam"),
                    )
                    return result

        except anthropic.APIError as e:
            logger.error("claude_api_error", error=str(e))

        return self._fallback_classification(email_data)

    def _fallback_classification(self, email_data: Dict[str, Any]) -> Dict[str, Any]:
        """Classificação por palavras-chave caso a API falhe."""
        text = (
            (email_data.get("subject", "") + " " + email_data.get("body_preview", "")).lower()
        )

        spam_kws = [kw.lower() for kw in settings.SPAM_KEYWORDS]
        if any(kw in text for kw in spam_kws):
            return {
                "priority": "BAIXO",
                "category": "Spam/Newsletter",
                "summary": "E-mail identificado como spam ou newsletter.",
                "keywords_found": [],
                "is_spam": True,
                "action_required": False,
                "action_description": "",
            }

        critical_kws = [kw.lower() for kw in settings.PRIORITY_CRITICAL_KEYWORDS]
        high_kws = [kw.lower() for kw in settings.PRIORITY_HIGH_KEYWORDS]
        medium_kws = [kw.lower() for kw in settings.PRIORITY_MEDIUM_KEYWORDS]

        found_critical = [kw for kw in critical_kws if kw in text]
        found_high = [kw for kw in high_kws if kw in text]
        found_medium = [kw for kw in medium_kws if kw in text]

        if found_critical:
            priority = "CRITICO"
            keywords = found_critical
        elif found_high:
            priority = "ALTO"
            keywords = found_high
        elif found_medium:
            priority = "MEDIO"
            keywords = found_medium
        else:
            priority = "BAIXO"
            keywords = []

        return {
            "priority": priority,
            "category": "Geral",
            "summary": email_data.get("body_preview", "")[:300],
            "keywords_found": keywords,
            "is_spam": False,
            "action_required": priority in ("CRITICO", "ALTO"),
            "action_description": "",
        }

    def summarize_pdf(self, pdf_text: str) -> str:
        """Gera um resumo de texto extraído de PDF."""
        if not pdf_text or len(pdf_text) < 50:
            return ""
        trimmed = pdf_text[:4000]
        try:
            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=512,
                messages=[{
                    "role": "user",
                    "content": (
                        f"Resuma em até 3 frases objetivas o seguinte documento corporativo:\n\n{trimmed}"
                    ),
                }],
            )
            return response.content[0].text if response.content else ""
        except anthropic.APIError:
            return ""

    def extract_invoice_data(self, text: str) -> Dict[str, Any]:
        """Extrai dados estruturados de boletos e notas fiscais."""
        if not text:
            return {}
        trimmed = text[:3000]
        extract_tool = {
            "name": "extrair_dados_financeiros",
            "description": "Extrai dados de boletos e notas fiscais",
            "input_schema": {
                "type": "object",
                "properties": {
                    "tipo": {"type": "string", "enum": ["boleto", "nota_fiscal", "contrato", "outro"]},
                    "valor": {"type": "string"},
                    "vencimento": {"type": "string"},
                    "emitente": {"type": "string"},
                    "numero_documento": {"type": "string"},
                    "cnpj_cpf": {"type": "string"},
                },
                "required": ["tipo"],
            },
        }
        try:
            response = self._client.messages.create(
                model=settings.CLAUDE_MODEL,
                max_tokens=512,
                tools=[extract_tool],
                tool_choice={"type": "any"},
                messages=[{
                    "role": "user",
                    "content": f"Extraia os dados financeiros deste documento:\n\n{trimmed}",
                }],
            )
            for block in response.content:
                if block.type == "tool_use":
                    return block.input
        except anthropic.APIError:
            pass
        return {}
