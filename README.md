# Sistema de Monitoramento de E-mails com IA e WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails via **Microsoft Outlook / Graph API**, classificação de prioridade com **Claude AI (Anthropic)** e envio de notificações em tempo real via **WhatsApp Business API**.

---

## Arquitetura

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NGINX  (porta 80)                             │
│                     Reverse Proxy / Load Balancer                      │
└────────────────────┬──────────────────────────┬────────────────────────┘
                     │                          │
          ┌──────────▼──────────┐    ┌──────────▼──────────┐
          │   Frontend Next.js  │    │  Backend FastAPI     │
          │     (porta 3000)    │    │   (porta 8000)       │
          │  Dashboard moderno  │    │  REST API + CORS     │
          └─────────────────────┘    └──────────┬──────────┘
                                                │
               ┌────────────────────────────────┼────────────────────────┐
               │                                │                        │
    ┌──────────▼──────┐            ┌────────────▼──────┐    ┌───────────▼──────┐
    │   PostgreSQL    │            │      Redis         │    │  Celery Beat     │
    │  (porta 5432)   │            │   (porta 6379)     │    │  (Agendador)     │
    │  Dados + Logs   │            │  Broker + Cache    │    │  Tarefas cron    │
    └─────────────────┘            └────────────────────┘    └───────────────────┘
                                             │
                               ┌─────────────▼─────────────┐
                               │       Celery Workers       │
                               │   (Filas: high + low)      │
                               └─────────────┬─────────────┘
                                             │
              ┌──────────────────────────────┼──────────────────────────┐
              │                              │                          │
   ┌──────────▼──────────┐    ┌─────────────▼──────────┐    ┌──────────▼──────────┐
   │  Microsoft Graph     │    │    Claude AI (Anthropic) │    │  WhatsApp Business  │
   │  API (Outlook)       │    │  Classificação + Resumo  │    │  API (Twilio/Meta)  │
   └─────────────────────┘    └──────────────────────────┘    └────────────────────┘
```

---

## Fluxo de Processamento

```
Celery Beat (a cada 60s)
        │
        ▼
check_new_emails()
        │
        ▼
OutlookEmailReader ──► Microsoft Graph API
  (busca não-lidos)
        │
        ▼
   parse_email()
  (extrai campos)
        │
        ▼
AIClassifier (Claude)
        │
        ├── Prioridade: CRÍTICO / ALTO / MÉDIO / BAIXO
        ├── Categoria: Pagamento, Contrato, Suporte...
        ├── Resumo: 2-3 frases objetivas
        ├── Palavras-chave encontradas
        ├── Ação necessária: sim/não
        └── É spam: sim/não ──► IGNORAR
                │
        ┌───────▼──────────────────────────────┐
        │                                      │
  ┌─────▼──────┐                    ┌──────────▼──────────────┐
  │ AttachmentHandler               │  WhatsApp (CRÍTICO/ALTO) │
  │  Salva /YYYY/MM/DD/Sender/      │  Twilio ou Meta API      │
  │  OCR imagens                    │  Resumo estruturado       │
  │  Extrai texto PDF               └─────────────────────────┘
  │  Extrai dados NF/boleto
  └───────────────────────────────────────────────────────────┐
                                                              │
                                                   ┌──────────▼──────────┐
                                                   │     PostgreSQL       │
                                                   │  email_records       │
                                                   │  email_attachments   │
                                                   │  notification_logs   │
                                                   │  processing_logs     │
                                                   └─────────────────────┘
```

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: Financeiro <financeiro@empresa.com.br>
Assunto: Aprovação urgente de pagamento
Categoria: Pagamento
Horário: 05/06/2026 08:42

Resumo:
Fornecedor aguardando aprovação do pagamento referente à NF-e 1234.
Prazo impreterivelmente até hoje às 12h. Valor: R$ 45.000,00.

Ação necessária: Aprovar pagamento no sistema SAP até 12h.

Anexos: 2 arquivo(s)
```

---

## Estrutura de Diretórios

```
/
├── backend/
│   ├── Dockerfile
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   │       └── 0001_initial_schema.py
│   ├── requirements.txt
│   └── app/
│       ├── main.py                  # FastAPI app entry point
│       ├── config.py                # Pydantic Settings
│       ├── api/routes/
│       │   ├── dashboard.py         # /api/dashboard/*
│       │   ├── emails.py            # /api/emails/*
│       │   ├── notifications.py     # /api/notifications/*
│       │   └── settings.py         # /api/settings/*
│       ├── db/database.py           # SQLAlchemy async engine
│       ├── models/
│       │   ├── email.py             # EmailRecord, EmailAttachment
│       │   └── notification.py      # NotificationLog, ProcessingLog
│       ├── services/
│       │   ├── ai_classifier.py     # Claude API
│       │   ├── email_reader.py      # Microsoft Graph API (MSAL)
│       │   ├── whatsapp_sender.py   # Twilio / Meta WhatsApp
│       │   ├── attachment_handler.py# Save + PDF + OCR
│       │   └── log_service.py       # Logging estruturado
│       ├── utils/
│       │   ├── crypto.py            # Fernet encryption
│       │   ├── file_utils.py        # Dir helpers
│       │   └── sanitizer.py        # HTML → text, validação
│       └── workers/
│           ├── celery_app.py        # Celery + beat schedule
│           └── tasks.py             # check_emails, summary, retry, cleanup
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/
│       │   ├── dashboard/page.tsx   # Painel principal
│       │   ├── emails/page.tsx      # Listagem + filtros + detalhes
│       │   ├── notifications/page.tsx
│       │   ├── attachments/page.tsx
│       │   ├── logs/page.tsx
│       │   └── settings/page.tsx
│       ├── components/
│       │   ├── Dashboard/           # StatsCard, PriorityChart, EmailTable...
│       │   └── Layout/              # Sidebar, Header
│       └── lib/
│           ├── api.ts               # Axios + todas as funções de API
│           └── QueryProvider.tsx
│
├── nginx/nginx.conf
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## Instalação

### 1. Clonar e configurar

```bash
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

cp .env.example .env
nano .env   # Preencha as variáveis obrigatórias
```

### 2. Subir os serviços

```bash
docker compose up -d --build
```

### 3. Verificar logs

```bash
docker compose logs -f backend
docker compose logs -f celery-worker
docker compose logs -f celery-beat
```

### 4. Acessar

| Serviço | URL |
|---------|-----|
| Dashboard | http://localhost |
| API Docs | http://localhost/api/docs |
| Celery Flower | http://localhost:5555 |

---

## Configuração Azure AD (Outlook)

1. [portal.azure.com](https://portal.azure.com) → Azure AD → Registros de aplicativo → Novo
2. Permissões de aplicativo no Microsoft Graph: `Mail.Read`, `Mail.ReadWrite`
3. **Conceder consentimento do administrador**
4. Criar segredo em Certificados e segredos
5. Copiar para `.env`: `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT_ID`, `OUTLOOK_EMAIL_ADDRESS`

---

## Configuração WhatsApp

### Twilio (testes)
```env
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxx
TWILIO_AUTH_TOKEN=seu_token
WHATSAPP_PHONE_NUMBER=+14155238886
WHATSAPP_TO_NUMBER=+5511999999999
```

### Meta Business API (produção)
```env
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=id_do_numero
META_WHATSAPP_ACCESS_TOKEN=token_permanente
WHATSAPP_PHONE_NUMBER=+5511999999999
WHATSAPP_TO_NUMBER=+5511888888888
```

---

## Variáveis de Ambiente Obrigatórias

| Variável | Descrição |
|----------|-----------|
| `ANTHROPIC_API_KEY` | Chave API Claude (Anthropic) |
| `OUTLOOK_CLIENT_ID` | Azure App Client ID |
| `OUTLOOK_CLIENT_SECRET` | Azure App Secret |
| `OUTLOOK_TENANT_ID` | Azure Tenant ID |
| `OUTLOOK_EMAIL_ADDRESS` | E-mail monitorado |
| `WHATSAPP_TO_NUMBER` | Número destino notificações |
| `POSTGRES_PASSWORD` | Senha PostgreSQL |
| `SECRET_KEY` | Chave JWT (min 32 chars) |

---

## Classificação de Prioridade

| Nível | Critério | Notificação |
|-------|----------|-------------|
| 🔴 CRÍTICO | Sistema parado, emergência, vencimento hoje | WhatsApp imediato |
| 🟠 ALTO | Aprovação, contrato, pagamento, diretoria | WhatsApp imediato |
| 🟡 MÉDIO | Fornecedor, cliente, pendência, relatório | Apenas registro |
| 🟢 BAIXO | Informativo, atualização rotineira | Apenas registro |
| ⬛ SPAM | Newsletter, auto-reply, marketing | Descartado |

---

## Organização dos Anexos

```
/app/attachments/
└── 2026/06/05/Financeiro_financeiro@empresa.com/
    ├── NF_12345.pdf
    └── Boleto_vencimento_a8f2b1.pdf
```

**Aceitos:** PDF, XLSX, DOCX, CSV, ZIP, JPG, PNG, XML, TXT  
**Bloqueados:** EXE, BAT, CMD, SH, PS1, VBS, JS, JAR, MSI (maliciosos)

---

## Tarefas Automatizadas

| Tarefa | Frequência | Fila |
|--------|-----------|------|
| `check_new_emails` | A cada 60s | high |
| `retry_failed_notifications` | A cada 5min | high |
| `send_daily_summary` | Diariamente 08h | low |
| `cleanup_old_logs` | Domingos 02h | low |

---

## API REST Endpoints

```
GET  /api/dashboard/stats
GET  /api/dashboard/recent-emails
GET  /api/dashboard/notifications
GET  /api/dashboard/processing-logs
GET  /api/dashboard/health

GET   /api/emails
GET   /api/emails/{id}
GET   /api/emails/{id}/attachments
POST  /api/emails/{id}/reclassify
PATCH /api/emails/{id}/priority

GET  /api/notifications
POST /api/notifications/manual
POST /api/notifications/{id}/retry

GET  /api/settings
GET  /api/settings/keywords
POST /api/settings/trigger-check
POST /api/settings/trigger-summary
```

---

## Segurança

- Credenciais em variáveis de ambiente
- Criptografia Fernet (AES-128) com `ENCRYPTION_KEY`
- Bloqueio de extensões de arquivo perigosas
- Validação de tamanho de anexos
- CORS configurado
- JWT com expiração
- Logs de auditoria para conformidade LGPD

---

## Desenvolvimento Local

```bash
# Infraestrutura
docker compose up postgres redis -d

# Backend
cd backend && pip install -r requirements.txt
uvicorn app.main:app --reload

# Worker
celery -A app.workers.celery_app worker --loglevel=debug -Q high,low

# Beat
celery -A app.workers.celery_app beat --loglevel=info

# Frontend
cd frontend && npm install && npm run dev
```

---

## Licença

MIT — uso livre para fins corporativos e educacionais.
