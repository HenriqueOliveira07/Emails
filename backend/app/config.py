"""
Configuração central da aplicação usando Pydantic Settings.
Todas as variáveis de ambiente são carregadas e validadas aqui.
"""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, validator
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # -------------------------------------------------------------------------
    # Aplicação
    # -------------------------------------------------------------------------
    APP_NAME: str = "Sistema de Monitoramento de E-mails"
    APP_VERSION: str = "1.0.0"
    ENVIRONMENT: str = Field(default="production", description="development | production")
    DEBUG: bool = False
    LOG_LEVEL: str = Field(default="INFO", description="DEBUG | INFO | WARNING | ERROR")

    # -------------------------------------------------------------------------
    # Segurança
    # -------------------------------------------------------------------------
    SECRET_KEY: str = Field(
        default="troque-esta-chave-secreta-em-producao-32chars",
        description="Chave secreta JWT - mude em produção",
    )
    ENCRYPTION_KEY: str = Field(
        default="",
        description="Chave Fernet base64 para criptografia de credenciais",
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    API_ACCESS_KEY: str = Field(
        default="",
        description=(
            "Chave compartilhada exigida no header X-API-Key para acessar a API/dashboard. "
            "Deixe vazio apenas em desenvolvimento local."
        ),
    )

    # -------------------------------------------------------------------------
    # Banco de Dados PostgreSQL
    # -------------------------------------------------------------------------
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://emails_user:emails_pass@localhost:5432/emails_db",
        description="URL de conexão com o PostgreSQL (asyncpg)",
    )
    DATABASE_POOL_SIZE: int = 10
    DATABASE_MAX_OVERFLOW: int = 20
    DATABASE_ECHO: bool = False

    # -------------------------------------------------------------------------
    # Redis
    # -------------------------------------------------------------------------
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="URL de conexão com o Redis",
    )
    REDIS_RESULT_BACKEND: str = Field(
        default="redis://localhost:6379/1",
        description="Backend de resultados do Celery",
    )

    # -------------------------------------------------------------------------
    # Microsoft Outlook / Graph API
    # -------------------------------------------------------------------------
    OUTLOOK_CLIENT_ID: str = Field(
        default="",
        description="Client ID do App Registration no Azure AD",
    )
    OUTLOOK_CLIENT_SECRET: str = Field(
        default="",
        description="Client Secret do App Registration no Azure AD",
    )
    OUTLOOK_TENANT_ID: str = Field(
        default="",
        description="Tenant ID do Azure AD (Directory ID)",
    )
    OUTLOOK_EMAIL_ADDRESS: str = Field(
        default="",
        description="Endereço de e-mail a ser monitorado",
    )
    OUTLOOK_GRAPH_ENDPOINT: str = "https://graph.microsoft.com/v1.0"
    OUTLOOK_AUTHORITY: str = Field(default="", description="Auto-preenchido pelo sistema")
    OUTLOOK_SCOPE: List[str] = ["https://graph.microsoft.com/.default"]

    # -------------------------------------------------------------------------
    # WhatsApp Business API
    # -------------------------------------------------------------------------
    WHATSAPP_PROVIDER: str = Field(
        default="twilio",
        description="Provedor WhatsApp: 'twilio' ou 'meta' (WhatsApp Business API direta)",
    )
    WHATSAPP_API_URL: str = Field(
        default="https://api.twilio.com/2010-04-01",
        description="URL base da API do WhatsApp",
    )
    WHATSAPP_TOKEN: str = Field(
        default="",
        description="Token de autenticação da API WhatsApp / Auth Token Twilio",
    )
    WHATSAPP_PHONE_NUMBER: str = Field(
        default="",
        description="Número do remetente WhatsApp (formato: +5511999999999)",
    )
    WHATSAPP_TO_NUMBER: str = Field(
        default="",
        description="Número do destinatário das notificações (formato: +5511999999999)",
    )
    # Twilio específico
    TWILIO_ACCOUNT_SID: str = Field(default="", description="Account SID do Twilio")
    TWILIO_AUTH_TOKEN: str = Field(default="", description="Auth Token do Twilio")
    # Meta específico
    META_WHATSAPP_PHONE_NUMBER_ID: str = Field(
        default="", description="Phone Number ID da Meta Business API"
    )
    META_WHATSAPP_ACCESS_TOKEN: str = Field(
        default="", description="Access Token permanente da Meta"
    )

    # -------------------------------------------------------------------------
    # Claude / Anthropic API
    # -------------------------------------------------------------------------
    ANTHROPIC_API_KEY: str = Field(
        default="",
        description="Chave da API da Anthropic (Claude)",
    )
    CLAUDE_MODEL: str = Field(
        default="claude-sonnet-4-6",
        description="Modelo Claude a usar para classificação",
    )
    CLAUDE_MAX_TOKENS: int = 1024

    # -------------------------------------------------------------------------
    # Sentry (monitoramento de erros)
    # -------------------------------------------------------------------------
    SENTRY_DSN: str = Field(
        default="",
        description="DSN do Sentry para monitoramento de erros (opcional)",
    )

    # -------------------------------------------------------------------------
    # Configurações de Processamento
    # -------------------------------------------------------------------------
    CHECK_INTERVAL_SECONDS: int = Field(
        default=60,
        description="Intervalo de verificação de novos e-mails em segundos",
    )
    MAX_EMAILS_PER_BATCH: int = Field(
        default=25,
        description="Número máximo de e-mails processados por ciclo",
    )
    ATTACHMENTS_BASE_PATH: str = Field(
        default="/app/Emails_Importantes",
        description="Caminho base para salvar anexos (organizado por ano/mês/dia/remetente)",
    )
    MAX_ATTACHMENT_SIZE_MB: int = Field(
        default=25,
        description="Tamanho máximo de anexo em MB",
    )
    ALLOWED_ATTACHMENT_TYPES: List[str] = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/csv",
        "application/zip",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/xml",
        "text/xml",
        "text/plain",
    ]

    # -------------------------------------------------------------------------
    # Palavras-chave de Prioridade (Português)
    # -------------------------------------------------------------------------
    PRIORITY_CRITICAL_KEYWORDS: List[str] = [
        "urgente",
        "urgentíssimo",
        "emergência",
        "emergencia",
        "crítico",
        "critico",
        "parada",
        "parado",
        "falha crítica",
        "falha critica",
        "sistema fora",
        "produção parada",
        "producao parada",
        "URGENTE",
        "SOS",
        "imediato",
        "imediatamente",
        "agora",
        "hoje impreterivelmente",
        "prazo vencendo",
        "vencimento hoje",
    ]
    PRIORITY_HIGH_KEYWORDS: List[str] = [
        "aprovação",
        "aprovacao",
        "aprovação urgente",
        "contrato",
        "assinatura",
        "pagamento",
        "fatura",
        "boleto",
        "nota fiscal",
        "nf-e",
        "proposta",
        "licitação",
        "licitacao",
        "prazo",
        "deadline",
        "reunião importante",
        "reuniao importante",
        "decisão",
        "decisao",
        "autorização",
        "autorizacao",
        "diretoria",
        "presidente",
        "CEO",
        "CFO",
    ]
    PRIORITY_MEDIUM_KEYWORDS: List[str] = [
        "fornecedor",
        "cliente",
        "pendência",
        "pendencia",
        "atualização",
        "atualizacao",
        "relatório",
        "relatorio",
        "solicitação",
        "solicitacao",
        "orçamento",
        "orcamento",
        "pedido",
        "entrega",
        "suporte",
        "manutenção",
        "manutencao",
    ]
    SPAM_KEYWORDS: List[str] = [
        "newsletter",
        "unsubscribe",
        "descadastrar",
        "promoção",
        "promocao",
        "oferta",
        "desconto",
        "compre agora",
        "clique aqui",
        "noreply",
        "no-reply",
        "donotreply",
        "auto-reply",
        "automatic reply",
        "resposta automática",
        "fora do escritório",
        "out of office",
        "ausente",
    ]

    # -------------------------------------------------------------------------
    # CORS
    # -------------------------------------------------------------------------
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:80",
        "http://frontend:3000",
    ]

    # -------------------------------------------------------------------------
    # Logs
    # -------------------------------------------------------------------------
    LOGS_BASE_PATH: str = Field(
        default="/app/logs",
        description="Caminho base para arquivos de log",
    )
    LOG_RETENTION_DAYS: int = Field(
        default=90,
        description="Dias para manter logs antes de excluir",
    )

    def model_post_init(self, __context) -> None:
        """Configurações computadas após inicialização."""
        if not self.OUTLOOK_AUTHORITY and self.OUTLOOK_TENANT_ID:
            object.__setattr__(
                self,
                "OUTLOOK_AUTHORITY",
                f"https://login.microsoftonline.com/{self.OUTLOOK_TENANT_ID}",
            )


# Instância singleton das configurações
settings = Settings()
