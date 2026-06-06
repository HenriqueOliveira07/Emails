# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações via WhatsApp.

---

## Arquitetura do Sistema

```
┌──────────────────────────────────────────────────────────────────────┐
│                          NGINX  (porta 80)                           │
│                    Reverse Proxy / Load Balancer                     │
└──────────────────┬───────────────────────┬───────────────────────────┘
                   │                       │
        ┌──────────▼──────────┐  ┌─────────▼────────┐
        │  Frontend  Next.js  │  │  Backend FastAPI  │
        │    (porta 3000)     │  │   (porta 8000)    │
        └─────────────────────┘  └────────┬──────────┘
                                          │
              ┌───────────────────────────┼────────────────────────┐
              │                           │                        │
    ┌─────────▼──────┐        ┌───────────▼──────┐     ┌──────────▼──────┐
    │  PostgreSQL 16  │        │    Redis  7       │     │  Celery  Beat   │
    │  (persistência) │        │  (fila / cache)   │     │  (agendador)    │
    └─────────────────┘        └──────────────────┘     └──────────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │    Celery  Workers     │
                              │  (processamento + IA)  │
                              └───────────────────────┘
```

---

## Fluxograma Operacional Completo

```
╔══════════════════════════════════════════════════════════════════════╗
║                  CICLO AUTOMÁTICO (a cada 60 s)                     ║
╚══════════════════════════════════════════════════════════════════════╝

Celery Beat
    │
    ▼ dispara task
check_new_emails()
    │
    ├─► OutlookEmailReader ────────────────► Microsoft Graph API
    │        │                                      │
    │        │  GET /users/{email}/messages          │
    │        │  (filter: isRead eq false)            │
    │        │◄─────────────────────────────────────┘
    │        │
    │        ▼
    │   [Para cada e-mail]
    │        │
    │        ├─► Verificar duplicata no PostgreSQL
    │        │       │
    │        │       └─ SE JÁ EXISTE → skip
    │        │
    │        ▼
    │   AIClassifier (Claude API)
    │        │  - Analisa: remetente, assunto, corpo
    │        │  - Identifica palavras-chave críticas
    │        │  - Classifica: CRÍTICO / ALTO / MÉDIO / BAIXO
    │        │  - Detecta spam / newsletters
    │        │  - Gera resumo em 2-3 frases
    │        │  - Indica se requer ação
    │        │
    │        ├─► SE SPAM → log_email_ignored() → próximo e-mail
    │        │
    │        ▼
    │   mark_as_read() no Outlook
    │        │
    │        ▼
    │   AttachmentHandler (se has_attachments)
    │        │  - Baixa anexos via Graph API
    │        │  - Valida extensão e tamanho
    │        │  - Salva em:
    │        │    /app/attachments/Emails_Importantes/
    │        │      └── YYYY/MM/DD/NomeRemetente/
    │        │  - Extrai texto de PDFs (PyPDF2)
    │        │  - Executa OCR em imagens (pytesseract)
    │        │  - Extrai dados de boletos/NF (Claude)
    │        │
    │        ▼
    │   PostgreSQL
    │        │  - Salva EmailRecord completo
    │        │  - Salva EmailAttachment(s)
    │        │
    │        ▼
    │   [SE prioridade CRÍTICO ou ALTO]
    │        │
    │        ▼
    │   WhatsAppSender
    │        │  - Formata mensagem estruturada:
    │        │
    │        │    [CRÍTICO]
    │        │    Novo e-mail importante recebido
    │        │
    │        │    Remetente: nome@empresa.com
    │        │    Assunto: Aprovação urgente de pagamento
    │        │    Categoria: Pagamento
    │        │    Horário: 08:42
    │        │
    │        │    Resumo:
    │        │    Fornecedor aguardando aprovação até 12h.
    │        │
    │        │    Ação necessária: Aprovar até 12h de hoje
    │        │    Anexos: 2 arquivo(s)
    │        │
    │        ├─► Twilio WhatsApp API  (provider=twilio)
    │        └─► Meta Business API   (provider=meta)
    │
    ▼
LogService → ProcessingLog no PostgreSQL
    │
    ▼
Estatísticas do ciclo gravadas
```

```
╔══════════════════════════════════════════════════════════════════════╗
║              TAREFAS AGENDADAS (Celery Beat)                        ║
╚══════════════════════════════════════════════════════════════════════╝

┌─────────────────────┬──────────────────────────┬────────────────────┐
│ Tarefa              │ Agendamento              │ Descrição          │
├─────────────────────┼──────────────────────────┼────────────────────┤
│ check_new_emails    │ A cada 60s               │ Verifica e-mails   │
│ send_daily_summary  │ Diariamente às 08:00     │ Resumo via WA      │
│ retry_failed        │ A cada 5 min             │ Reenvia falhas     │
│ cleanup_old_logs    │ Domingo às 02:00         │ Limpa logs antigos │
└─────────────────────┴──────────────────────────┴────────────────────┘
```

```
╔══════════════════════════════════════════════════════════════════════╗
║                   CLASSIFICAÇÃO DE PRIORIDADE (IA)                  ║
╚══════════════════════════════════════════════════════════════════════╝

Entrada: assunto + corpo + remetente + horário + anexos
    │
    ▼ Claude API (tool_use estruturado)
    │
    ├─► CRÍTICO 🔴  → WhatsApp imediato
    │   Exemplos: sistema parado, emergência, vencimento hoje,
    │             URGENTE, SOS, produção parada
    │
    ├─► ALTO 🟠     → WhatsApp imediato
    │   Exemplos: aprovação, contrato, pagamento, diretoria,
    │             CEO, CFO, assinatura, prazo
    │
    ├─► MÉDIO 🟡    → Salvo no banco, sem notificação
    │   Exemplos: fornecedor, cliente, pendência, relatório,
    │             orçamento, suporte
    │
    ├─► BAIXO 🟢    → Salvo no banco, sem notificação
    │   Exemplos: informativos, atualizações rotineiras
    │
    └─► SPAM  🚫    → Ignorado (não salvo)
        Exemplos: newsletter, noreply, out of office,
                  promoção, unsubscribe
```

---

## Pré-requisitos

- Docker e Docker Compose v2+
- Conta Microsoft Azure com App Registration configurado
- API WhatsApp: Twilio ou Meta Business
- Chave API Anthropic (Claude)

---

## Instalação Rápida

```bash
# 1. Configure as variáveis de ambiente
cp .env.example .env
nano .env  # Preencha todas as variáveis obrigatórias

# 2. Suba os serviços
docker compose up -d

# 3. Verifique os logs
docker compose logs -f celery-worker
docker compose logs -f backend
```

---

## Configuração do Azure AD (Outlook)

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
3. Nome: `Email Monitor`, tipo: **Contas neste diretório organizacional**
4. Em **Permissões de API** adicione (tipo **Aplicativo**):
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `User.Read.All`
5. **Conceder consentimento do administrador**
6. Em **Certificados e segredos** crie um novo segredo
7. Copie: `Client ID`, `Client Secret`, `Tenant ID` → `.env`

---

## Configuração WhatsApp

### Twilio (recomendado para testes)
```
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=seu-auth-token
WHATSAPP_PHONE_NUMBER=+5511999999999
WHATSAPP_TO_NUMBER=+5511888888888
```

### Meta Business API (produção)
```
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=seu-phone-number-id
META_WHATSAPP_ACCESS_TOKEN=seu-access-token-permanente
WHATSAPP_TO_NUMBER=+5511888888888
```

---

## Serviços e Portas

| Serviço        | Porta | Descrição                  |
|----------------|-------|----------------------------|
| Nginx          | 80    | Proxy principal            |
| Frontend       | 3000  | Dashboard Next.js          |
| Backend        | 8000  | API FastAPI + Swagger      |
| Celery Flower  | 5555  | Monitor de tarefas Celery  |

---

## Dashboard — Páginas

Acesse `http://localhost` após iniciar os serviços.

| Rota             | Descrição                                      |
|------------------|------------------------------------------------|
| `/dashboard`     | Visão geral: stats, gráfico, e-mails recentes |
| `/emails`        | Lista completa com filtros e paginação         |
| `/notifications` | Histórico WhatsApp + reenvio + envio manual    |
| `/attachments`   | Arquivos salvos com metadados e caminhos       |
| `/logs`          | Logs de processamento com detalhes JSON        |
| `/settings`      | Config do sistema + ações manuais + keywords   |

---

## API REST

Documentação interativa: `http://localhost:8000/api/docs`

```
GET  /api/health                        Status da aplicação
GET  /api/dashboard/stats               Estatísticas do dia
GET  /api/dashboard/recent-emails       E-mails recentes
GET  /api/dashboard/notifications       Histórico de notificações
GET  /api/dashboard/processing-logs     Logs de processamento
GET  /api/dashboard/health              Status das integrações
GET  /api/emails                        Lista com filtros
GET  /api/emails/attachments            Todos os anexos
GET  /api/emails/{id}                   Detalhe do e-mail
POST /api/emails/{id}/reclassify        Re-classificar com IA
PATCH /api/emails/{id}/priority         Atualizar prioridade
GET  /api/emails/{id}/attachments       Anexos do e-mail
GET  /api/notifications                 Lista notificações
POST /api/notifications/manual          Envio manual WhatsApp
POST /api/notifications/{id}/retry      Reenviar falha
GET  /api/settings                      Configurações atuais
POST /api/settings/trigger-check        Disparar verificação
POST /api/settings/trigger-summary      Enviar resumo diário
```

---

## Organização de Anexos

```
/app/attachments/
└── Emails_Importantes/
    └── 2026/
        └── 06/
            └── 06/
                └── Financeiro_Empresa/
                    ├── boleto_junho_2026.pdf
                    ├── contrato_fornecedor_a1b2c3.docx
                    └── nf_12345.xml
```

Regras de salvamento:
- Extensões permitidas: PDF, XLSX, XLS, DOCX, DOC, CSV, ZIP, JPG, PNG, GIF, XML, TXT
- Extensões bloqueadas: EXE, BAT, CMD, SH, PS1, VBS, JS, JAR
- Tamanho máximo por arquivo: `MAX_ATTACHMENT_SIZE_MB` (padrão: 25 MB)
- Nomes com duplicatas recebem hash curto (6 chars)

---

## Banco de Dados (Alembic)

```bash
# Executar migrations
docker compose exec backend alembic upgrade head

# Criar nova migration
docker compose exec backend alembic revision --autogenerate -m "descricao"

# Histórico
docker compose exec backend alembic history
```

---

## Comandos Úteis

```bash
# Logs em tempo real
docker compose logs -f celery-worker

# Verificação manual via CLI
docker compose exec backend python -c "
from app.workers.tasks import check_new_emails
check_new_emails.delay()
"

# Banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Escalar workers
docker compose up -d --scale celery-worker=3

# Monitor Celery
open http://localhost:5555
```

---

## Segurança e LGPD

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Tokens JWT com expiração configurável
- Validação rigorosa de tipos e tamanho de arquivos (bloqueio de executáveis)
- Logs de auditoria completos com retenção configurável (`LOG_RETENTION_DAYS`)
- Sem armazenamento de senhas em texto plano
- Pool de conexões PostgreSQL com health check e timeout
- CORS configurável por ambiente

---

## Variáveis de Ambiente Obrigatórias

```
OUTLOOK_CLIENT_ID          Azure App Registration Client ID
OUTLOOK_CLIENT_SECRET      Azure App Secret
OUTLOOK_TENANT_ID          Azure Tenant/Directory ID
OUTLOOK_EMAIL_ADDRESS      E-mail a monitorar

ANTHROPIC_API_KEY          Chave Claude API (sk-ant-...)

WHATSAPP_TO_NUMBER         Número que recebe alertas (+5511...)
TWILIO_ACCOUNT_SID         (se WHATSAPP_PROVIDER=twilio)
TWILIO_AUTH_TOKEN          (se WHATSAPP_PROVIDER=twilio)
WHATSAPP_PHONE_NUMBER      (número Twilio WhatsApp)
```

---

## Stack Tecnológica

| Categoria   | Tecnologia                              |
|-------------|------------------------------------------|
| Backend     | Python 3.12, FastAPI, SQLAlchemy 2.0    |
| IA          | Claude claude-sonnet-4-6 (Anthropic)    |
| Fila        | Celery 5 + Redis 7                       |
| Banco       | PostgreSQL 16 + Alembic                  |
| Frontend    | Next.js 14, TailwindCSS, Recharts        |
| E-mail      | Microsoft Graph API, MSAL                |
| WhatsApp    | Twilio / Meta Business API               |
| Container   | Docker, Docker Compose                   |
| Proxy       | Nginx                                    |
| Monitoração | Celery Flower, Sentry (opcional)         |

---

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
