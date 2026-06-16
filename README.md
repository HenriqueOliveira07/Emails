# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações em tempo real via WhatsApp.

---

## Arquitetura

```
┌──────────────────────────────────────────────────────────────────────┐
│                        NGINX (porta 80)                              │
│               Reverse Proxy / WebSocket / Load Balancer              │
└────────────┬──────────────────────────────┬─────────────────────────┘
             │                              │
   ┌──────────▼──────────┐       ┌──────────▼──────────┐
   │  Frontend — Next.js  │       │  Backend — FastAPI   │
   │    Dashboard (3000)  │◄─WS──►  API REST + WS (8000)│
   └──────────────────────┘       └──────────┬──────────┘
                                             │
              ┌──────────────────────────────┼──────────────────┐
              │                              │                  │
   ┌──────────▼──────┐            ┌──────────▼──────┐   ┌──────▼──────────┐
   │  PostgreSQL 16  │            │    Redis 7       │   │  Celery Beat    │
   │  (dados + logs) │            │ (fila + cache)   │   │  (agendador)    │
   └─────────────────┘            └─────────────────┘   └──────┬──────────┘
                                           │                   │
                                  ┌────────▼────────┐         │
                                  │  Celery Workers  │◄────────┘
                                  │  check_new_emails│
                                  └────────┬────────┘
                                           │
              ┌────────────────────────────┼───────────────────┐
              │                            │                   │
   ┌──────────▼──────┐          ┌──────────▼──────┐   ┌───────▼────────┐
   │ Microsoft Graph │          │   Claude AI      │   │ WhatsApp API   │
   │ (Outlook 365)   │          │  (Classificação) │   │ (Twilio/Meta)  │
   └─────────────────┘          └─────────────────┘   └────────────────┘
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
  OutlookEmailReader ──────► Microsoft Graph API
  (busca não lidos)                    │
         │                             │
         ▼                        E-mails brutos
  parse_email()
         │
         ▼
  AIClassifier (Claude) ─────► Prioridade + Categoria + Resumo
         │
         ├── is_spam? ──────────────► Ignorar + Log
         │
         ├── CRÍTICO / ALTO ─────────► WhatsAppSender ──► Notificação imediata
         │                         └──► WebSocket ──────► Dashboard em tempo real
         │
         ├── has_attachments? ──────► AttachmentHandler
         │                        ├── PDF ──► PyPDF2 (extração texto)
         │                        ├── IMG ──► Tesseract OCR
         │                        ├── NF/Boleto ──► Claude extração dados
         │                        └── /Emails_Importantes/YYYY/MM/DD/Remetente/
         │
         └── PostgreSQL ──────────► EmailRecord + EmailAttachment + NotificationLog
```

---

## Funcionalidades

| Categoria | Detalhe |
|-----------|---------|
| Leitura | Outlook 365 via Microsoft Graph API, poll a cada 60s |
| Classificação IA | Claude classifica prioridade, categoria, resumo e palavras-chave |
| Notificação | WhatsApp via Twilio ou Meta Business API |
| Tempo real | WebSocket: painel atualiza automaticamente quando e-mail chega |
| Anexos | Salvamento automático com OCR, PDF text, extração de NF/boleto |
| Anti-spam | IA detecta newsletters, auto-replies, marketing |
| Reenvio | Falhas de WhatsApp são reprocessadas automaticamente |
| Dashboard | Next.js com gráficos, tabelas filtráveis, logs ao vivo |
| Segurança | Criptografia Fernet, sem credenciais em texto plano |
| Logs | Auditoria completa com retenção configurável (padrão 90 dias) |
| Resumo diário | WhatsApp às 08h com estatísticas do dia anterior |

---

## Prioridades

| Nível | Cor | Critério | WhatsApp |
|-------|-----|----------|----------|
| CRÍTICO | 🔴 | Sistema parado, emergência, vencimento hoje, "URGENTE", "SOS" | ✅ Imediato |
| ALTO | 🟠 | Aprovação, contrato, pagamento, nota fiscal, diretoria | ✅ Imediato |
| MÉDIO | 🟡 | Fornecedor, cliente, pendência, orçamento, relatório | ❌ |
| BAIXO | 🟢 | Informativo, atualização rotineira, newsletter | ❌ |

---

## Pré-requisitos

- Docker Engine 24+ e Docker Compose v2
- Conta Microsoft Azure com App Registration (Graph API)
- Conta Twilio **ou** Meta Business API (WhatsApp)
- Chave de API da Anthropic (Claude)

---

## Instalação

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite .env preenchendo todas as variáveis obrigatórias (ver seção abaixo)

# 3. Suba os serviços (a migração do banco roda automaticamente)
docker compose up -d

# 4. Acompanhe os logs
docker compose logs -f celery-worker

# 5. Acesse o painel
open http://localhost
```

---

## Configuração do Azure AD (Outlook)

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory → Registros de Aplicativo → Novo Registro**
   - Nome: `Email Monitor`
   - Tipo: Contas neste diretório organizacional
3. **Permissões de API → Adicionar (tipo Aplicativo)**:
   - `Mail.Read`
   - `Mail.ReadWrite`
4. **Conceder consentimento do administrador**
5. **Certificados e Segredos → Novo segredo** — copie o valor
6. Copie para `.env`: `OUTLOOK_CLIENT_ID`, `OUTLOOK_CLIENT_SECRET`, `OUTLOOK_TENANT_ID`

---

## Configuração do WhatsApp

### Opção 1 — Twilio (recomendado para testes)
```bash
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu-auth-token
WHATSAPP_PHONE_NUMBER=+14155238886   # número do Twilio Sandbox
WHATSAPP_TO_NUMBER=+5511999999999   # seu número
```

### Opção 2 — Meta Business API (produção)
```bash
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
META_WHATSAPP_ACCESS_TOKEN=seu-token-permanente
WHATSAPP_TO_NUMBER=+5511999999999
```

---

## Variáveis de Ambiente Obrigatórias

```bash
# Azure / Outlook
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=
OUTLOOK_EMAIL_ADDRESS=usuario@empresa.com.br

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_PHONE_NUMBER=
WHATSAPP_TO_NUMBER=

# Claude
ANTHROPIC_API_KEY=sk-ant-...

# Banco
POSTGRES_PASSWORD=senha_forte_aqui
```

---

## Serviços e Portas

| Serviço | Porta | URL |
|---------|-------|-----|
| Dashboard (via Nginx) | 80 | http://localhost |
| Backend API | 8000 | http://localhost:8000/api/docs |
| Flower (Celery monitor) | via /flower/ | http://localhost/flower/ |

---

## Organização de Anexos

```
/app/attachments/
└── 2026/
    └── 06/
        └── 16/
            └── Financeiro_Empresa/
                ├── boleto_junho_2026.pdf
                ├── nf_00045_abc6f2.xml
                └── contrato_fornecedor_k8p3.docx
```

---

## API REST — Principais Endpoints

```
GET  /api/dashboard/stats              # Estatísticas do dia
GET  /api/dashboard/recent-emails      # E-mails recentes
GET  /api/dashboard/notifications      # Histórico de notificações
GET  /api/dashboard/processing-logs    # Logs de processamento
GET  /api/dashboard/health             # Saúde das integrações

GET  /api/emails                       # Lista e-mails (filtros: priority, sender, has_attachments)
GET  /api/emails/{id}                  # Detalhe completo com corpo
POST /api/emails/{id}/reclassify       # Re-classificar com IA
GET  /api/emails/{id}/attachments      # Anexos de um e-mail
PATCH /api/emails/{id}/priority        # Atualizar prioridade manualmente

GET  /api/attachments                  # Lista todos os anexos
GET  /api/attachments/{id}             # Detalhe com texto extraído

GET  /api/notifications                # Histórico de notificações WhatsApp
POST /api/notifications/manual         # Enviar mensagem manual
POST /api/notifications/{id}/retry     # Reenviar falha

POST /api/settings/trigger-check       # Disparar verificação agora
POST /api/settings/trigger-summary     # Enviar resumo diário

WS   /ws/dashboard                     # WebSocket em tempo real
```

Documentação interativa: **http://localhost:8000/api/docs**

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: financeiro@empresa.com
Assunto: Aprovação urgente de pagamento
Categoria: Pagamento
Horário: 16/06/2026 08:42

Resumo:
Fornecedor aguarda aprovação do pagamento até hoje às 12h.
Boleto no valor de R$ 45.000,00 com vencimento improrrogável.

Ação necessária: Aprovar pagamento até 12h de hoje

Anexos: 2 arquivo(s)
```

---

## Comandos Úteis

```bash
# Disparar verificação manual via curl
curl -X POST http://localhost:8000/api/settings/trigger-check

# Ver logs em tempo real
docker compose logs -f celery-worker

# Escalar workers para alta demanda
docker compose up -d --scale celery-worker=4

# Acessar banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Executar nova migração
docker compose exec backend alembic upgrade head

# Ver tarefas no Flower
open http://localhost/flower/

# Backup dos anexos
tar -czf backup_anexos_$(date +%Y%m%d).tar.gz $(docker volume inspect emails_attachments_data -f '{{.Mountpoint}}')
```

---

## Segurança e LGPD

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Nenhuma senha ou token armazenado em texto plano no banco
- Validação rigorosa de tipos de arquivo (extensões perigosas bloqueadas)
- Logs de auditoria com retenção configurável (padrão 90 dias)
- CORS configurável por origem
- WebSocket autenticado via protocolo de handshake HTTP
- Anexos maliciosos detectados e descartados antes do salvamento

---

## Stack Tecnológica

| Categoria | Tecnologia |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 async |
| IA | Claude `claude-sonnet-4-6` (Anthropic) |
| Fila | Celery 5 + Redis 7 |
| Agendador | Celery Beat |
| Banco | PostgreSQL 16 |
| Migrações | Alembic |
| Frontend | Next.js 14, TailwindCSS, Recharts, React Query |
| Tempo Real | WebSocket nativo (FastAPI + Next.js) |
| E-mail | Microsoft Graph API + MSAL |
| WhatsApp | Twilio / Meta Business API |
| OCR | Tesseract (+ pytesseract) |
| PDF | PyPDF2 |
| Container | Docker, Docker Compose |
| Proxy | Nginx |
| Monitor | Celery Flower |
| Logs | structlog (JSON estruturado) |

---

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
