# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações em tempo real via WhatsApp.

---

## Arquitetura do Sistema

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          NGINX (porta 80)                                   │
│                     Reverse Proxy / Load Balancer                           │
└──────────────────────┬──────────────────────────────┬───────────────────────┘
                       │                              │
          ┌────────────▼───────────┐    ┌─────────────▼──────────┐
          │   Frontend Next.js 14  │    │    Backend FastAPI      │
          │   TailwindCSS          │    │    Python 3.12          │
          │   React Query          │    │    SQLAlchemy 2.0       │
          │   Recharts             │    │    (porta 8000)         │
          │   (porta 3000)         │    └─────────────┬──────────┘
          └────────────────────────┘                  │
                                       ┌──────────────┼──────────────┐
                                       │              │              │
                             ┌─────────▼───┐  ┌───────▼────┐  ┌─────▼──────┐
                             │ PostgreSQL  │  │   Redis    │  │  Celery    │
                             │    16       │  │    7       │  │  Workers   │
                             │  (dados)    │  │ (broker)   │  │  + Beat    │
                             └─────────────┘  └────────────┘  └────────────┘
                                                                      │
                                              ┌───────────────────────┤
                                              │                       │
                                   ┌──────────▼──────┐     ┌─────────▼──────┐
                                   │  Microsoft      │     │  WhatsApp API  │
                                   │  Graph API      │     │  Twilio / Meta │
                                   │  (Outlook 365)  │     │                │
                                   └─────────────────┘     └────────────────┘
                                              │
                                   ┌──────────▼──────┐
                                   │   Claude API    │
                                   │  (Anthropic)    │
                                   │  Classificação  │
                                   │  + Resumo IA    │
                                   └─────────────────┘
```

---

## Fluxo de Processamento Detalhado

```
Celery Beat (a cada 60s)
        │
        ▼
check_new_emails()
        │
        ▼
OutlookEmailReader ──────► Microsoft Graph API
        │                   (e-mails não lidos)
        │
        ▼
Para cada e-mail:
        │
        ├─► parse_email() — extrai campos estruturados
        │
        ├─► Verifica duplicata no PostgreSQL
        │
        ├─► AIClassifier.classify_email() ──► Claude API
        │         │
        │         └─► retorna: priority, category, summary,
        │                      keywords_found, is_spam,
        │                      action_required
        │
        ├─► is_spam? ──► Loga e ignora
        │
        ├─► AttachmentHandler.save_attachments()
        │         │
        │         ├─► Valida extensão (bloqueia .exe, .bat...)
        │         ├─► Salva em /attachments/YYYY/MM/DD/Remetente/
        │         ├─► Extrai texto de PDF (PyPDF2)
        │         └─► OCR em imagens (pytesseract)
        │
        ├─► Salva EmailRecord no PostgreSQL
        │
        ├─► priority == CRÍTICO ou ALTO?
        │         │
        │         └─► WhatsAppSender.send_email_notification()
        │                   │
        │                   ├─► Formata mensagem corporativa
        │                   └─► Envia via Twilio ou Meta API
        │
        └─► LogService — registra tudo no ProcessingLog

Tarefas agendadas adicionais:
  • send_daily_summary()        — todo dia às 8h
  • retry_failed_notifications() — a cada 5 min
  • cleanup_old_logs()           — domingo às 2h
```

---

## Pré-requisitos

- **Docker** e **Docker Compose v2+**
- **Azure App Registration** com permissões `Mail.Read` e `Mail.ReadWrite`
- **WhatsApp Business API** (Twilio ou Meta)
- **Chave API Anthropic** (Claude)

---

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Configure as variáveis de ambiente
cp .env.example .env
nano .env  # Preencha todas as variáveis obrigatórias

# 3. Suba todos os serviços
docker compose up -d

# 4. Acompanhe os logs
docker compose logs -f celery-worker
```

Acesse o dashboard: **http://localhost**

---

## Configuração do Azure AD (Outlook 365)

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory → Registros de aplicativo → Novo registro**
3. Nome: `Email Monitor` | Tipo: contas neste diretório organizacional
4. Em **Permissões de API** adicione as permissões de **Aplicativo**:
   - `Mail.Read`
   - `Mail.ReadWrite`
5. Clique em **Conceder consentimento do administrador**
6. Em **Certificados e segredos** → crie um novo segredo
7. Copie para o `.env`:
   - `OUTLOOK_CLIENT_ID` → ID do aplicativo (cliente)
   - `OUTLOOK_CLIENT_SECRET` → Valor do segredo
   - `OUTLOOK_TENANT_ID` → ID do diretório (locatário)

---

## Configuração do WhatsApp

### Twilio (recomendado para desenvolvimento)

```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER=+14155238886   # número do sandbox Twilio
WHATSAPP_TO_NUMBER=+5511999999999   # seu número
```

### Meta Business API (produção)

```bash
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxx
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxx...
WHATSAPP_TO_NUMBER=+5511999999999
```

---

## Serviços e Portas

| Serviço           | Porta | Descrição                          |
|-------------------|-------|------------------------------------|
| Nginx             | 80    | Proxy principal (entrada)          |
| Frontend Next.js  | 3000  | Dashboard de monitoramento         |
| Backend FastAPI   | 8000  | API REST + Swagger Docs            |
| Flower            | 5555  | Monitor de tarefas Celery          |

---

## Páginas do Dashboard

| Página              | Rota              | Descrição                              |
|---------------------|-------------------|----------------------------------------|
| Dashboard           | `/dashboard`      | Visão geral, gráficos e e-mails recentes |
| E-mails             | `/emails`         | Listagem completa com filtros          |
| Notificações        | `/notifications`  | Histórico WhatsApp + envio manual      |
| Anexos              | `/attachments`    | Arquivos salvos com metadados IA       |
| Logs                | `/logs`           | Eventos de processamento do sistema    |
| Configurações       | `/settings`       | Status das integrações + ações manuais |

---

## API REST — Principais Endpoints

Documentação completa: **http://localhost:8000/api/docs**

```
GET  /api/health                           # Status geral
GET  /api/dashboard/stats                  # Estatísticas do dia
GET  /api/dashboard/recent-emails          # E-mails recentes
GET  /api/dashboard/health                 # Status das integrações
GET  /api/dashboard/processing-logs        # Logs de processamento

GET  /api/emails                           # Lista com filtros (priority, sender, has_attachments)
GET  /api/emails/{id}                      # Detalhes completos de um e-mail
POST /api/emails/{id}/reclassify           # Re-classificar com IA
GET  /api/emails/{id}/attachments          # Anexos de um e-mail
PATCH /api/emails/{id}/priority            # Atualizar prioridade manualmente

GET  /api/attachments                      # Lista de anexos (filter: file_type, sender)
GET  /api/attachments/stats                # Estatísticas de armazenamento
GET  /api/attachments/{id}                 # Detalhes de um anexo

GET  /api/notifications                    # Histórico de notificações
GET  /api/notifications/{id}              # Detalhe de uma notificação
POST /api/notifications/manual             # Enviar WhatsApp manual
POST /api/notifications/{id}/retry        # Reenviar notificação com falha

GET  /api/settings                         # Configurações atuais
GET  /api/settings/keywords                # Palavras-chave de prioridade
POST /api/settings/trigger-check           # Disparar verificação manual
POST /api/settings/trigger-summary         # Enviar resumo diário
```

---

## Organização de Anexos

```
/app/attachments/
├── 2026/
│   ├── 05/
│   │   └── 26/
│   │       ├── Financeiro_Empresa/
│   │       │   ├── boleto_maio_2026.pdf
│   │       │   └── nf_12345.xml
│   │       └── Fornecedor_ABC/
│   │           └── contrato_servicos_a1b2c3.docx
│   └── 06/
│       └── 02/
│           └── ...
```

---

## Sistema de Prioridades

| Nível     | Cor | Exemplos                                             | WhatsApp      |
|-----------|-----|------------------------------------------------------|---------------|
| CRÍTICO   | 🔴  | Sistema parado, emergência, vencimento hoje, SOS     | ✅ Imediato  |
| ALTO      | 🟠  | Aprovação, contrato, pagamento, decisão de diretoria | ✅ Imediato  |
| MÉDIO     | 🟡  | Fornecedor, cliente, pendência, relatório            | ❌           |
| BAIXO     | 🟢  | Informativo, atualização rotineira                   | ❌           |

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: João Silva <financeiro@empresa.com>
Assunto: Aprovação urgente de pagamento
Categoria: Pagamento
Horário: 02/06/2026 08:42

Resumo:
Fornecedor aguardando aprovação do pagamento de R$ 45.000
até hoje às 12h. Contrato vence hoje.

Ação necessária: Aprovar pagamento no sistema até 12h

Anexos: 2 arquivo(s)
```

---

## Comandos Úteis

```bash
# Ver todos os logs em tempo real
docker compose logs -f

# Ver apenas o worker de processamento
docker compose logs -f celery-worker

# Disparar verificação manualmente via CLI
docker compose exec backend python -c "
from app.workers.tasks import check_new_emails
result = check_new_emails.delay()
print('Task ID:', result.id)
"

# Acessar o banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Listar e-mails críticos
docker compose exec postgres psql -U emails_user -d emails_db -c \
  "SELECT sender_email, subject, received_at FROM email_records WHERE priority='CRITICO' ORDER BY received_at DESC LIMIT 10;"

# Escalar workers para maior throughput
docker compose up -d --scale celery-worker=3

# Parar tudo
docker compose down

# Recriar tudo do zero (dados preservados nos volumes)
docker compose down && docker compose up -d --build

# Apagar TODOS os dados (irreversível)
docker compose down -v
```

---

## Migrações de Banco (Alembic)

```bash
# Aplicar todas as migrações
docker compose exec backend alembic upgrade head

# Ver histórico de migrações
docker compose exec backend alembic history

# Criar nova migração após alterar modelos
docker compose exec backend alembic revision --autogenerate -m "descricao da mudanca"

# Reverter última migração
docker compose exec backend alembic downgrade -1
```

---

## Segurança e LGPD

- **Criptografia de credenciais** com Fernet (AES-128-CBC + HMAC-SHA256)
- **Tokens JWT** com expiração configurável
- **Validação de tipos de arquivo** — bloqueia `.exe`, `.bat`, `.ps1`, `.sh`, etc.
- **Logs de auditoria completos** com retenção configurável (padrão: 90 dias)
- **Sem senhas em texto plano** — apenas hashes e tokens criptografados
- **Pool de conexões** PostgreSQL com timeout e reconexão automática
- **Rate limiting** na Graph API com retry exponencial
- **Sanitização** de nomes de arquivo e diretório

---

## Variáveis de Ambiente Obrigatórias

```bash
# Azure / Outlook
OUTLOOK_CLIENT_ID=         # ID do App Registration no Azure
OUTLOOK_CLIENT_SECRET=     # Client Secret
OUTLOOK_TENANT_ID=         # Directory (Tenant) ID
OUTLOOK_EMAIL_ADDRESS=     # E-mail a monitorar

# IA
ANTHROPIC_API_KEY=         # Chave da API Claude (Anthropic)

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=        # Account SID
TWILIO_AUTH_TOKEN=         # Auth Token
WHATSAPP_PHONE_NUMBER=     # Número remetente (+5511...)
WHATSAPP_TO_NUMBER=        # Seu número para receber (+5511...)

# Segurança
SECRET_KEY=                # 64 hex chars (python -c "import secrets; print(secrets.token_hex(32))")
POSTGRES_PASSWORD=         # Senha forte para o banco
```

---

## Stack Tecnológica

| Categoria     | Tecnologia                                      |
|---------------|-------------------------------------------------|
| Backend       | Python 3.12, FastAPI 0.111, SQLAlchemy 2.0     |
| IA            | Claude claude-sonnet-4-6 (Anthropic)            |
| Fila          | Celery 5, Redis 7, Flower                       |
| Banco         | PostgreSQL 16, Alembic (migrações)              |
| Frontend      | Next.js 14, TailwindCSS 3, Recharts, React Query |
| E-mail        | Microsoft Graph API, MSAL                       |
| WhatsApp      | Twilio / Meta Business API                      |
| OCR           | pytesseract + Tesseract OCR (PT + EN)           |
| PDF           | PyPDF2                                          |
| Container     | Docker, Docker Compose                          |
| Proxy         | Nginx Alpine                                    |
| Logs          | structlog (JSON estruturado)                    |
| Monitoramento | Sentry (opcional)                               |

---

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
