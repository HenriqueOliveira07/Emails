# Sistema de Monitoramento de E-mails com IA + WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude com prompt caching), notificações via WhatsApp e painel de controle moderno.

---

## Arquitetura do Sistema

```
╔══════════════════════════════════════════════════════════════════════╗
║                        NGINX (porta 80)                             ║
║                   Reverse Proxy / Load Balancer                     ║
╚══════════════╦═══════════════════════════════╦═══════════════════════╝
               ║                               ║
    ╔══════════▼══════════╗         ╔══════════▼══════════╗
    ║  Frontend Next.js   ║         ║   Backend FastAPI   ║
    ║    (porta 3000)     ║         ║    (porta 8000)     ║
    ║  TailwindCSS +      ║         ║  SQLAlchemy Async   ║
    ║  React Query        ║         ║  Pydantic Settings  ║
    ╚═════════════════════╝         ╚══════════╦══════════╝
                                              ║
              ╔═══════════════════════════════╬═════════════════════════╗
              ║                              ║                         ║
   ╔══════════▼══════════╗      ╔═══════════▼═══════════╗  ╔══════════▼══════╗
   ║     PostgreSQL 16   ║      ║       Redis 7          ║  ║  Celery Beat   ║
   ║   (dados + logs)    ║      ║  (broker + cache)      ║  ║  (agendador)   ║
   ╚═════════════════════╝      ╚══════════╦════════════╝  ╚════════════════╝
                                           ║
                               ╔═══════════▼═══════════╗
                               ║    Celery Workers      ║
                               ║  (processamento IA)    ║
                               ╚═══════════╦═══════════╝
                                           ║
              ╔════════════════════════════╬════════════════════════════╗
              ║                            ║                            ║
   ╔══════════▼══════════╗    ╔════════════▼════════════╗  ╔═══════════▼══════════╗
   ║  Microsoft Graph    ║    ║    Claude AI (Anthropic) ║  ║  WhatsApp Business  ║
   ║  API (Outlook 365)  ║    ║  claude-sonnet-4-6      ║  ║  (Twilio / Meta)    ║
   ║  MSAL Auth          ║    ║  Prompt Caching         ║  ║                     ║
   ╚═════════════════════╝    ╚═════════════════════════╝  ╚═════════════════════╝
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
        │              (IMAP como fallback)
        ▼
Verificar duplicatas (PostgreSQL)
        │
        ▼
AIClassifier (Claude) ──► Prioridade + Resumo + Categoria
        │                  (Prompt Caching: -90% custo)
        ├── SPAM ──────────────────────────────► Ignorar + Log
        │
        ├── CRÍTICO/ALTO ──► WhatsAppSender ──► Notificação imediata
        │
        ├── AttachmentHandler ──► /app/attachments/YYYY/MM/DD/Remetente/
        │                        OCR (imagens) + PDF text + IA summary
        │
        └── PostgreSQL ──► EmailRecord + Logs completos
```

---

## Funcionalidades

### Leitura de E-mails
- **Microsoft Outlook 365** via Graph API (MSAL + Client Credentials Flow)
- **IMAP** como fallback (Gmail, Yahoo, qualquer servidor IMAP padrão)
- Verificação automática a cada 60 segundos (configurável)
- Lê: assunto, remetente, destinatários, corpo, anexos, data/hora, importância

### Classificação por IA (Claude)
- **Prioridades**: CRÍTICO, ALTO, MÉDIO, BAIXO
- **Prompt Caching**: system prompt cacheado → reduz custo em ~90%
- **Batch API**: classifica múltiplos e-mails em lote → reduz custo em 50%
- Detecta spam, newsletters e respostas automáticas
- Extrai palavras-chave e gera resumo em português
- Identifica se requer ação imediata e descreve a ação
- Fallback por palavras-chave quando API indisponível

### Notificações WhatsApp
Enviadas automaticamente para e-mails **CRÍTICO** e **ALTO**:
```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: financeiro@empresa.com
Assunto: Aprovação urgente de pagamento
Categoria: Pagamento
Horário: 08/06/2026 08:42

Resumo:
Fornecedor aguardando aprovação do pagamento até hoje às 12h.

Ação necessária: Aprovar pagamento no sistema financeiro.

Anexos: 2 arquivo(s)
```

Suporta:
- **Twilio** (recomendado para testes e produção)
- **Meta WhatsApp Business API** (produção)
- Reenvio automático em caso de falha (até 3 tentativas)
- Resumo diário às 08:00 com estatísticas do dia

### Salvamento de Anexos
Organização automática em `/app/attachments/YYYY/MM/DD/Remetente/`

Tipos suportados: PDF, XLSX, XLS, DOCX, DOC, CSV, ZIP, JPG, PNG, GIF, XML, TXT

Funcionalidades:
- OCR em imagens (Tesseract, idiomas PT+EN)
- Extração de texto de PDFs (PyPDF2)
- Resumo automático por IA (Claude)
- Extração de dados de boletos e notas fiscais
- Bloqueio de executáveis maliciosos (.exe, .bat, .sh, etc.)
- Nomes únicos (sem sobrescrever arquivos)

### Painel de Controle (Dashboard)
- Estatísticas em tempo real (atualização a cada 30s)
- Gráfico de distribuição por prioridade (pizza)
- Tabela de e-mails com filtros e detalhes expandíveis
- Re-classificação de e-mails com IA via interface
- Log de notificações WhatsApp com opção de reenvio
- Página de logs com resumo de ações e erros
- Página de configurações com status das integrações
- Indicador de saúde dos serviços (PostgreSQL, Redis)

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
nano .env  # Preencha todas as variáveis obrigatórias

# 3. Suba os serviços
docker compose up -d

# 4. Verifique os logs
docker compose logs -f backend
docker compose logs -f celery-worker
```

Acesse o painel em: **http://localhost**

---

## Configuração do Azure AD (Outlook 365)

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
3. Nome: `Email Monitor`, tipo: **Contas neste diretório organizacional**
4. Em **Permissões de API** adicione (tipo **Aplicativo**):
   - `Mail.Read`
   - `Mail.ReadWrite`
5. **Conceder consentimento do administrador**
6. Em **Certificados e segredos** crie um novo segredo
7. Copie: `Client ID`, `Client Secret`, `Tenant ID` → `.env`

---

## Configuração WhatsApp

### Twilio (recomendado)
1. Crie conta em [twilio.com](https://twilio.com)
2. Ative o **WhatsApp Sandbox** (ou número aprovado em produção)
3. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `WHATSAPP_PHONE_NUMBER`
4. Set `WHATSAPP_PROVIDER=twilio`

### Meta Business API (produção)
1. Crie app em [developers.facebook.com](https://developers.facebook.com)
2. Adicione produto **WhatsApp** e configure um número
3. Configure `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`
4. Set `WHATSAPP_PROVIDER=meta`

---

## Configuração IMAP (alternativa ao Outlook)

Para Gmail:
1. Ative autenticação de 2 fatores na conta Google
2. Gere um App Password em: **myaccount.google.com/apppasswords**
3. Configure no `.env`:
```
USE_IMAP_FALLBACK=true
IMAP_HOST=imap.gmail.com
IMAP_PORT=993
IMAP_USERNAME=seu@gmail.com
IMAP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

---

## Serviços e Portas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Nginx | 80 | Proxy principal |
| Frontend | 3000 | Dashboard Next.js |
| Backend | 8000 | API FastAPI + Docs |
| Flower | 5555 | Monitor Celery |

---

## API REST

Documentação interativa: **http://localhost:8000/api/docs**

```
GET  /api/dashboard/stats           # Estatísticas do dia
GET  /api/dashboard/recent-emails   # E-mails recentes
GET  /api/dashboard/notifications   # Notificações recentes
GET  /api/dashboard/health          # Status das integrações
GET  /api/emails                    # Lista com filtros (priority, sender, has_attachments)
GET  /api/emails/{id}               # Detalhes completos de um e-mail
POST /api/emails/{id}/reclassify    # Re-classificar com IA
PATCH /api/emails/{id}/priority     # Alterar prioridade manualmente
GET  /api/emails/{id}/attachments   # Anexos de um e-mail
GET  /api/attachments               # Lista de todos os anexos
GET  /api/attachments/stats         # Estatísticas de armazenamento
POST /api/attachments/{id}/summarize # Gerar resumo IA de anexo
GET  /api/notifications             # Histórico de notificações
POST /api/notifications/manual      # Enviar notificação manual
POST /api/notifications/{id}/retry  # Reenviar notificação falha
GET  /api/logs                      # Logs de processamento
GET  /api/logs/summary              # Resumo de logs (24h)
GET  /api/logs/errors               # Apenas erros
GET  /api/settings                  # Configurações do sistema
POST /api/settings/trigger-check    # Disparar verificação manual
POST /api/settings/trigger-summary  # Enviar resumo diário
```

---

## Prioridades e Palavras-chave

| Nível | Cor | Exemplos | WhatsApp |
|-------|-----|----------|----------|
| CRÍTICO | 🔴 | urgente, emergência, sistema parado, SOS, vencimento hoje | ✅ Imediato |
| ALTO | 🟠 | aprovação, contrato, pagamento, assinatura, diretoria, CEO | ✅ Imediato |
| MÉDIO | 🟡 | fornecedor, cliente, pendência, relatório, orçamento | ❌ |
| BAIXO | 🟢 | informativos, atualizações rotineiras | ❌ |

---

## Organização de Anexos

```
/app/attachments/
└── 2026/
    └── 06/
        └── 01/
            ├── Financeiro_Empresa/
            │   ├── boleto_junho_2026.pdf
            │   └── nf_12345_abc123.xml
            └── TI_Sistemas/
                └── relatorio_mensal_a1b2c3.xlsx
```

---

## Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f celery-worker
docker compose logs -f backend

# Disparar verificação manual via CLI
docker compose exec backend python -c "
import asyncio
from app.services.scheduler import run_check_cycle
asyncio.run(run_check_cycle())
"

# Acessar banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Escalar workers para mais throughput
docker compose up -d --scale celery-worker=3

# Ver tarefas em tempo real
open http://localhost:5555  # Flower UI

# Rebuild após mudanças
docker compose up -d --build backend
```

---

## Segurança e LGPD

- Credenciais criptografadas com **Fernet** (AES-128-CBC + HMAC-SHA256)
- Sem armazenamento de senhas em texto plano
- Tokens com expiração configurável
- Validação de tipos de arquivo (bloqueio de executáveis)
- Logs de auditoria completos com retenção configurável (padrão: 90 dias)
- Pool de conexões PostgreSQL com timeout e recycle
- Proteção contra injeção de SQL via SQLAlchemy ORM
- CORS configurável por ambiente

---

## Variáveis de Ambiente Obrigatórias

```env
# Azure AD (Outlook 365)
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=
OUTLOOK_EMAIL_ADDRESS=

# Anthropic (Claude)
ANTHROPIC_API_KEY=

# WhatsApp
WHATSAPP_TO_NUMBER=
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_PHONE_NUMBER=

# Segurança
SECRET_KEY=        # python -c "import secrets; print(secrets.token_hex(32))"
POSTGRES_PASSWORD= # senha forte
```

---

## Stack Tecnológico

| Categoria | Tecnologia |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 Async |
| IA | Claude claude-sonnet-4-6 + Prompt Caching + Batch API |
| Fila | Celery 5, Redis 7 |
| Banco | PostgreSQL 16 |
| Frontend | Next.js 14, TailwindCSS, Recharts, React Query |
| E-mail | Microsoft Graph API (MSAL) + IMAP fallback |
| WhatsApp | Twilio / Meta WhatsApp Business API |
| OCR | Tesseract (PT+EN) |
| PDF | PyPDF2 |
| Container | Docker, Docker Compose |
| Proxy | Nginx |
| Logs | structlog (JSON estruturado) |
| Segurança | cryptography (Fernet), python-jose (JWT) |

---

Desenvolvido para ambiente corporativo real — escalável, seguro, pronto para produção.
