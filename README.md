# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações via WhatsApp.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (porta 80)                        │
│                    Reverse Proxy / Load Balancer                │
└────────────────────┬───────────────────────┬────────────────────┘
                     │                       │
          ┌──────────▼──────────┐  ┌────────▼────────┐
          │   Frontend Next.js  │  │  Backend FastAPI │
          │     (porta 3000)    │  │   (porta 8000)   │
          └─────────────────────┘  └────────┬────────┘
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     │                      │                      │
           ┌─────────▼──────┐    ┌──────────▼──────┐    ┌─────────▼──────┐
           │   PostgreSQL   │    │     Redis        │    │  Celery Beat   │
           │    (dados)     │    │  (fila/cache)    │    │  (agendador)   │
           └────────────────┘    └─────────────────┘    └────────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │    Celery Workers      │
                              │  (processamento IA)    │
                              └───────────────────────┘
```

## Fluxo de Processamento

```
Celery Beat (60s)
      │
      ▼
check_new_emails()
      │
      ▼
OutlookEmailReader ──► Microsoft Graph API
      │
      ▼
AIClassifier (Claude) ──► Prioridade + Resumo + Palavras-chave
      │
      ├── CRÍTICO/ALTO ──► WhatsAppSender ──► Notificação imediata
      │
      ├── AttachmentHandler ──► /app/attachments/YYYY/MM/DD/Remetente/
      │
      └── PostgreSQL ──► EmailRecord + NotificationLog + ProcessingLog
```

## Níveis de Prioridade

| Nível | Critério |
|-------|----------|
| CRÍTICO | Sistemas parados, emergências, vencimento hoje |
| ALTO | Aprovações, contratos, pagamentos, diretoria |
| MÉDIO | Fornecedores, clientes, solicitações gerais |
| BAIXO | Informativos, rotina, newsletters |

## Requisitos

- Docker 24+ e Docker Compose v2+
- Conta Microsoft Azure com App Registration
- API WhatsApp Business (Twilio ou Meta)
- Chave da API Anthropic (Claude)

## Instalação Rápida

### 1. Clonar e configurar

```bash
git clone https://github.com/henriqueoliveira07/emails.git
cd emails
cp .env.example .env
```

### 2. Editar variáveis de ambiente

```bash
nano .env
```

Preencha **obrigatoriamente**:

```env
# Azure AD (Outlook)
OUTLOOK_CLIENT_ID=seu-client-id
OUTLOOK_CLIENT_SECRET=seu-client-secret
OUTLOOK_TENANT_ID=seu-tenant-id
OUTLOOK_EMAIL_ADDRESS=usuario@empresa.com

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=seu-auth-token
WHATSAPP_PHONE_NUMBER=+5511999999999
WHATSAPP_TO_NUMBER=+5511888888888

# Claude AI
ANTHROPIC_API_KEY=sk-ant-xxxxxxxx

# Segurança
POSTGRES_PASSWORD=senha_forte_aqui
SECRET_KEY=chave-jwt-aleatoria-32-chars
```

### 3. Subir o sistema

```bash
docker compose up -d
```

### 4. Verificar status

```bash
docker compose ps
docker compose logs -f backend
```

### 5. Acessar

| Serviço | URL |
|---------|-----|
| Dashboard | http://localhost |
| API Docs | http://localhost/api/docs |
| Flower (Celery) | http://localhost:5555 |

---

## Configuração do Azure AD

### Criar App Registration

1. Acesse [portal.azure.com](https://portal.azure.com)
2. Azure Active Directory → App Registrations → New Registration
3. Name: `EmailMonitor`
4. Supported account types: `Single tenant`
5. Clique em **Register**

### Configurar Permissões

1. API Permissions → Add a permission → Microsoft Graph
2. Application permissions → Mail:
   - `Mail.Read`
   - `Mail.ReadWrite`
3. Grant admin consent

### Obter Credenciais

- **Client ID**: Overview → Application (client) ID
- **Tenant ID**: Overview → Directory (tenant) ID
- **Client Secret**: Certificates & secrets → New client secret

---

## Configuração WhatsApp

### Opção 1: Twilio (Recomendado para testes)

1. Criar conta em [twilio.com](https://twilio.com)
2. Ativar WhatsApp Sandbox
3. Configurar:

```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxx
TWILIO_AUTH_TOKEN=xxxxx
WHATSAPP_PHONE_NUMBER=+14155238886
WHATSAPP_TO_NUMBER=+5511999999999
```

### Opção 2: Meta Business API (Produção)

1. [developers.facebook.com](https://developers.facebook.com) → Create App
2. Add WhatsApp Business product
3. Configurar:

```env
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
META_WHATSAPP_ACCESS_TOKEN=seu-access-token-permanente
WHATSAPP_TO_NUMBER=+5511999999999
```

---

## Estrutura de Arquivos

```
email-monitor/
├── backend/
│   ├── app/
│   │   ├── main.py                    # FastAPI app principal
│   │   ├── config.py                  # Configurações (Pydantic Settings)
│   │   ├── db/database.py             # Engine SQLAlchemy async
│   │   ├── models/
│   │   │   ├── email.py               # EmailRecord, EmailAttachment
│   │   │   └── notification.py        # NotificationLog, ProcessingLog
│   │   ├── services/
│   │   │   ├── email_reader.py        # Leitura via Microsoft Graph API
│   │   │   ├── ai_classifier.py       # Classificação com Claude AI
│   │   │   ├── whatsapp_sender.py     # Envio via Twilio / Meta
│   │   │   ├── attachment_handler.py  # Salvamento de anexos + OCR + PDF
│   │   │   └── log_service.py         # Logging estruturado + auditoria
│   │   ├── api/routes/
│   │   │   ├── dashboard.py           # Stats, emails recentes, health
│   │   │   ├── emails.py              # CRUD de e-mails + reclassificar
│   │   │   ├── notifications.py       # Notificações + reenvio manual
│   │   │   └── settings.py            # Config + trigger manual
│   │   ├── workers/
│   │   │   ├── celery_app.py          # Configuração Celery + Beat
│   │   │   └── tasks.py               # Tarefas automáticas agendadas
│   │   └── utils/
│   │       ├── crypto.py              # Criptografia Fernet (AES-128)
│   │       ├── file_utils.py          # Utilitários de arquivo
│   │       └── sanitizer.py           # Sanitização e validação
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── app/
│       │   ├── dashboard/page.tsx     # Painel principal com gráficos
│       │   ├── emails/page.tsx        # Lista com filtros
│       │   ├── notifications/page.tsx # Histórico + envio manual
│       │   ├── attachments/page.tsx   # Arquivos salvos
│       │   ├── logs/page.tsx          # Eventos do sistema
│       │   └── settings/page.tsx      # Configurações + ações manuais
│       └── components/
│           ├── Dashboard/             # StatsCard, EmailTable, PriorityChart, NotificationLog
│           └── Layout/                # Sidebar, Header com health check
├── nginx/nginx.conf                   # Reverse proxy
├── docker-compose.yml                 # 7 serviços orquestrados
├── .env.example                       # Template de configuração
└── README.md
```

---

## API REST

### Endpoints Principais

| Método | URL | Descrição |
|--------|-----|-----------|
| GET | `/api/health` | Status geral |
| GET | `/api/dashboard/stats` | Estatísticas do dia |
| GET | `/api/dashboard/recent-emails` | E-mails recentes |
| GET | `/api/dashboard/notifications` | Histórico de notificações |
| GET | `/api/dashboard/health` | Saúde das integrações |
| GET | `/api/emails` | Lista e-mails com filtros |
| GET | `/api/emails/{id}` | Detalhes de um e-mail |
| POST | `/api/emails/{id}/reclassify` | Reclassificar com IA |
| GET | `/api/emails/attachments` | Todos os anexos salvos |
| GET | `/api/emails/{id}/attachments` | Anexos de um e-mail |
| GET | `/api/notifications` | Lista notificações |
| POST | `/api/notifications/manual` | Enviar WhatsApp manual |
| POST | `/api/notifications/{id}/retry` | Reenviar notificação falha |
| GET | `/api/settings` | Configurações atuais |
| POST | `/api/settings/trigger-check` | Forçar verificação de e-mails |
| POST | `/api/settings/trigger-summary` | Enviar resumo diário |

Documentação interativa: `http://localhost/api/docs`

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: financeiro@empresa.com
Assunto: Aprovação urgente de pagamento
Categoria: Pagamento
Horário: 07/06/2026 08:42

Resumo:
Fornecedor aguardando aprovação do pagamento até hoje às 12h.
Valor: R$ 45.000,00. NF anexada.

Ação necessária: Aprovar pagamento no sistema até 12h.

Anexos: 2 arquivo(s)
```

---

## Organização dos Anexos

```
/app/attachments/
└── 2026/
    └── 06/
        └── 07/
            └── Fornecedor_ABC/
                ├── contrato_servico.pdf
                ├── nota_fiscal_nf123.pdf
                └── planilha_orcamento_a1b2c3.xlsx
```

Tipos salvos: PDF, XLSX, XLS, DOCX, DOC, CSV, ZIP, JPG, PNG, GIF, XML, TXT

---

## Tarefas Agendadas (Celery Beat)

| Tarefa | Frequência | Descrição |
|--------|------------|-----------|
| `check_new_emails` | A cada 60s | Verificação principal de e-mails |
| `send_daily_summary` | Diário às 8h | Resumo diário via WhatsApp |
| `retry_failed_notifications` | A cada 5min | Reenvio de notificações falhas |
| `cleanup_old_logs` | Domingo às 2h | Limpeza de logs antigos |

---

## Segurança

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Tokens JWT com expiração configurável
- Sanitização de nomes de arquivos (prevenção path traversal)
- Bloqueio de extensões perigosas (.exe, .bat, .sh, .ps1, .cmd...)
- Limite de tamanho de anexos configurável (padrão: 25MB)
- Logs auditáveis de todas as ações com timestamps
- CORS configurável por ambiente

---

## Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f celery-worker

# Forçar verificação manual
curl -X POST http://localhost/api/settings/trigger-check

# Monitorar Celery
open http://localhost:5555

# Reiniciar worker
docker compose restart celery-worker

# Backup do banco
docker compose exec postgres pg_dump -U emails_user emails_db > backup.sql

# Reconstruir após alterações
docker compose up -d --build backend celery-worker celery-beat

# Gerar nova chave de criptografia
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Gerar SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"
```

---

## Monitoramento

- **Flower**: Interface Celery em `http://localhost:5555`
- **API Docs**: Swagger UI em `http://localhost/api/docs`
- **ReDoc**: Documentação em `http://localhost/api/redoc`
- **Health Check**: `GET /api/dashboard/health`
- **Logs estruturados**: JSON via structlog (stdout + arquivo)
