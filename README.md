# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails Outlook com classificação por IA (Claude) e notificações via WhatsApp.

---

## Arquitetura Corporativa

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            INTERNET / INTRANET                          │
└──────────────────────────────────┬──────────────────────────────────────┘
                                   │ HTTP :80
                    ┌──────────────▼──────────────┐
                    │       NGINX (Reverse Proxy)  │
                    │   Rate limiting · SSL · CORS │
                    └──────────┬──────────┬────────┘
                               │          │
              ┌────────────────▼─┐      ┌─▼──────────────────────┐
              │  Frontend Next.js │      │    Backend FastAPI       │
              │  Dashboard :3000  │      │    REST API :8000        │
              │                  │      │    /api/docs (Swagger)   │
              └──────────────────┘      └──────────────┬──────────┘
                                                       │
              ┌───────────────────────────────────────┤
              │                                        │
   ┌──────────▼──────────┐              ┌─────────────▼──────────┐
   │     PostgreSQL 16    │              │       Redis 7           │
   │  emails_records      │              │  Broker (DB 0)          │
   │  email_attachments   │              │  Results (DB 1)         │
   │  notification_logs   │              │  AOF persistence        │
   │  processing_logs     │              └─────────────┬──────────┘
   └─────────────────────┘                            │
                                         ┌────────────┴────────────┐
                              ┌──────────▼──────┐     ┌────────────▼──────┐
                              │  Celery Worker   │     │   Celery Beat      │
                              │  Queues:         │     │   Scheduler        │
                              │  • high          │     │   (crontab)        │
                              │  • low           │     └───────────────────┘
                              └─────────────────┘
                                         │
                    ┌────────────────────┼────────────────────┐
                    │                    │                     │
         ┌──────────▼────────┐ ┌────────▼───────┐ ┌─────────▼────────┐
         │  Microsoft Graph  │ │  Claude API     │ │  WhatsApp API    │
         │  (Outlook 365)    │ │  (Anthropic)    │ │  Twilio / Meta   │
         └───────────────────┘ └────────────────┘ └──────────────────┘
```

---

## Fluxograma Operacional

```
╔══════════════════════════════════════════════════════════════════════╗
║                    CICLO DE PROCESSAMENTO (60s)                      ║
╚══════════════════════════════════════════════════════════════════════╝

  Celery Beat
      │ agenda a cada CHECK_INTERVAL_SECONDS
      ▼
┌─────────────────────┐
│  check_new_emails() │ ◄── Tarefa Celery (fila: high)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│  OutlookEmailReader │────►│  Microsoft Graph API  │
│  GET /messages      │     │  isRead eq false      │
│  (até 25 por ciclo) │◄────│  orderby: date desc   │
└──────────┬──────────┘     └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  Verificar duplicata│──► JÁ EXISTE? ──► SKIP
│  (message_id único) │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│  AIClassifier       │────►│    Claude API         │
│  classify_email()   │     │  tool_use protocol    │
│                     │◄────│  structured output    │
└──────────┬──────────┘     └──────────────────────┘
           │
           ▼
     ┌─────┴──────┐
     │  É SPAM?   │
     └─────┬──────┘
           │
     SIM ──┤──► log_email_ignored() ──► SKIP
           │
     NÃO ──▼
           │
           ▼
┌─────────────────────┐
│  AttachmentHandler  │──► /attachments/YYYY/MM/DD/Sender/
│  save_attachments() │    • PDF extraction (PyPDF2)
│                     │    • OCR imagens (pytesseract)
│                     │    • Bloqueio de .exe/.bat/.sh
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  mark_as_read()     │──► Microsoft Graph API (PATCH)
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  EmailRecord        │──► PostgreSQL
│  + EmailAttachment  │    (persistência completa)
└──────────┬──────────┘
           │
           ▼
     ┌─────┴──────────────────┐
     │  PRIORIDADE?           │
     └─────┬──────────────────┘
           │
    CRÍTICO/ALTO ──▼
           │
┌─────────────────────┐     ┌──────────────────────┐
│  WhatsAppSender     │────►│  Twilio / Meta API    │
│  send_notification()│     │                      │
│                     │◄────│  Entrega imediata     │
└──────────┬──────────┘     └──────────────────────┘
           │
           ▼
┌─────────────────────┐
│  NotificationLog    │──► PostgreSQL (status, SID, erros)
│  ProcessingLog      │
└─────────────────────┘

  ─────────────────────────────────────────────────────────────────
  ROTINAS ADICIONAIS (Celery Beat)
  ─────────────────────────────────────────────────────────────────
  • Diariamente às 08:00  → send_daily_summary() via WhatsApp
  • A cada 5 minutos      → retry_failed_notifications()
  • Domingo às 02:00      → cleanup_old_logs() (retenção: 90 dias)
```

---

## Pré-requisitos

- Docker e Docker Compose v2+
- Conta Microsoft Azure com App Registration configurado
- API do WhatsApp (Twilio ou Meta Business)
- Chave API da Anthropic (Claude)

---

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env preenchendo todas as variáveis obrigatórias

# 3. Suba todos os serviços
docker compose up -d --build

# 4. Verifique os logs
docker compose logs -f backend
docker compose logs -f celery-worker
```

Acesse o dashboard em `http://localhost` após a inicialização.

---

## Configuração do Azure AD

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
3. Nome: `Email Monitor`, tipo: **Contas neste diretório organizacional**
4. Em **Permissões de API** adicione (tipo **Aplicativo**):
   - `Mail.Read`
   - `Mail.ReadWrite`
5. **Conceder consentimento do administrador**
6. Em **Certificados e segredos** → **Novo segredo do cliente**
7. Copie **Client ID**, **Client Secret**, **Tenant ID** para `.env`

---

## Configuração WhatsApp

### Twilio (recomendado para testes)
```
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu-auth-token
WHATSAPP_PHONE_NUMBER=+14155238886  # número do sandbox Twilio
```

### Meta Business API (produção)
```
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
META_WHATSAPP_ACCESS_TOKEN=seu-access-token-permanente
```

---

## Serviços e Portas

| Serviço | Porta | URL |
|---------|-------|-----|
| Dashboard | 80 | `http://localhost` |
| Backend API | 8000 | `http://localhost:8000/api/docs` |
| Flower (Celery Monitor) | 5555 | `http://localhost:5555` |

---

## Páginas do Dashboard

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Visão geral — stats, gráfico de prioridade, tabela de e-mails |
| `/emails` | Lista completa com filtros por prioridade e busca |
| `/notifications` | Histórico de notificações WhatsApp enviadas |
| `/attachments` | Arquivos salvos com metadados e indicadores de OCR/IA |
| `/logs` | Eventos de processamento em tempo real |
| `/settings` | Configurações, status dos serviços e ações manuais |

---

## API REST — Referência

```
GET  /api/dashboard/stats             Estatísticas do dia
GET  /api/dashboard/recent-emails     E-mails recentes
GET  /api/dashboard/notifications     Log de notificações
GET  /api/dashboard/processing-logs   Logs de processamento
GET  /api/dashboard/health            Status das integrações

GET  /api/emails                      Lista com filtros (priority, sender, has_attachments)
GET  /api/emails/{id}                 Detalhes completos
POST /api/emails/{id}/reclassify      Re-classificar com IA
GET  /api/emails/{id}/attachments     Anexos do e-mail
PATCH /api/emails/{id}/priority       Atualizar prioridade manualmente

GET  /api/attachments                 Lista todos os anexos
GET  /api/attachments/stats           Estatísticas de anexos

GET  /api/notifications               Lista notificações
POST /api/notifications/manual        Enviar WhatsApp manual
POST /api/notifications/{id}/retry    Retentar notificação

GET  /api/settings                    Configurações (sem credenciais)
GET  /api/settings/keywords           Palavras-chave de classificação
POST /api/settings/trigger-check      Disparar verificação agora
POST /api/settings/trigger-summary    Enviar resumo diário agora
```

---

## Organização de Anexos

```
/app/attachments/
├── 2026/
│   ├── 01/
│   │   └── 15/
│   │       └── Financeiro_Empresa/
│   │           ├── boleto_jan_2026.pdf
│   │           └── nf_00123.xml
│   └── 06/
│       └── 24/
│           └── Fornecedor_ABC/
│               ├── contrato_2026_a1b2c3.docx
│               └── proposta_comercial.xlsx
```

Regras de nomenclatura:
- Caracteres especiais removidos automaticamente
- Duplicatas resolvidas com hash MD5 de 6 caracteres
- Extensões perigosas (`.exe`, `.bat`, `.sh`, `.ps1`, etc.) bloqueadas
- Limite de tamanho configurável (padrão: 25 MB)

---

## Prioridades e Classificação

| Nível | Cor | Critérios | WhatsApp |
|-------|-----|-----------|----------|
| CRÍTICO | 🔴 | Sistema parado, emergência, vencimento hoje, SOS | ✅ Imediato |
| ALTO | 🟠 | Aprovações, contratos, pagamentos, diretoria | ✅ Imediato |
| MÉDIO | 🟡 | Fornecedores, clientes, pendências, orçamentos | ❌ |
| BAIXO | 🟢 | Informativos, atualizações, newsletters | ❌ |

Classificação com fallback em dois níveis:
1. **Claude API** (prioridade): análise semântica completa com `tool_use`
2. **Palavras-chave** (fallback): regex sobre assunto + corpo do e-mail

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: Financeiro Empresa <financeiro@empresa.com.br>
Assunto: Aprovação urgente de pagamento — vencimento hoje
Categoria: Pagamento
Horário: 24/06/2026 08:42

Resumo:
Fornecedor aguardando aprovação do pagamento de R$ 45.000
até hoje às 12h. Boleto em anexo.

Ação necessária: Aprovar pagamento até 12:00

Anexos: 2 arquivo(s)
```

---

## Banco de Dados

### Tabelas

| Tabela | Descrição |
|--------|-----------|
| `email_records` | E-mails processados com classificação IA |
| `email_attachments` | Anexos com metadados, OCR e resumo IA |
| `notification_logs` | Histórico de notificações WhatsApp |
| `processing_logs` | Auditoria de todos os eventos do sistema |

### Migrações

```bash
# Aplicar migrações (alternativa ao auto-create na inicialização)
docker compose exec backend alembic upgrade head

# Criar nova migração após alterar modelos
docker compose exec backend alembic revision --autogenerate -m "descrição"
```

---

## Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f celery-worker

# Disparar verificação manual
curl -X POST http://localhost:8000/api/settings/trigger-check

# Acessar banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Escalar workers para mais paralelismo
docker compose up -d --scale celery-worker=3

# Monitorar filas Celery
open http://localhost:5555

# Rebuild após mudanças
docker compose up -d --build backend celery-worker
```

---

## Segurança e LGPD

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Tokens JWT com expiração configurável
- Validação de extensão e tamanho de arquivos
- Bloqueio de extensões potencialmente maliciosas
- Logs de auditoria com retenção configurável (padrão: 90 dias)
- Conexões PostgreSQL com pool, timeout e reconexão automática
- Variáveis de ambiente isoladas por contêiner
- Sem armazenamento de senhas em texto plano

---

## Variáveis de Ambiente Obrigatórias

```bash
# Azure / Outlook
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=
OUTLOOK_EMAIL_ADDRESS=

# IA
ANTHROPIC_API_KEY=

# WhatsApp (Twilio)
WHATSAPP_TO_NUMBER=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_PHONE_NUMBER=

# Banco de dados
POSTGRES_PASSWORD=

# Segurança
SECRET_KEY=          # python -c "import secrets; print(secrets.token_hex(32))"
ENCRYPTION_KEY=      # python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Backend | Python + FastAPI | 3.12 / 0.111 |
| ORM | SQLAlchemy (async) | 2.0 |
| IA | Claude API (Anthropic) | claude-sonnet-4-6 |
| Fila | Celery + Redis | 5.4 / 7 |
| Banco | PostgreSQL | 16 |
| Driver | asyncpg | 0.29 |
| Frontend | Next.js + TailwindCSS | 14 / 3.4 |
| Gráficos | Recharts | 2.12 |
| E-mail | Microsoft Graph API + MSAL | v1.0 |
| WhatsApp | Twilio / Meta Business API | — |
| OCR | Tesseract + pytesseract | 5 |
| PDF | PyPDF2 | 3.0 |
| Container | Docker + Docker Compose | — |
| Proxy | Nginx | alpine |
| Monitoramento | Celery Flower | 2.0 |

---

> Sistema desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
