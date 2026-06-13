# Sistema de Monitoramento Inteligente de E-mails

Sistema corporativo completo para monitoramento automatizado de e-mails com classificação por IA (Claude) e notificações instantâneas via WhatsApp. Pronto para produção.

---

## Visão Geral

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                         NGINX — Reverse Proxy (porta 80)                     │
└───────────────────────────┬──────────────────────────┬───────────────────────┘
                            │                          │
               ┌────────────▼────────────┐  ┌──────────▼──────────┐
               │  Frontend Next.js       │  │  Backend FastAPI     │
               │  Dashboard (porta 3000) │  │  REST API (porta 8000)│
               └─────────────────────────┘  └──────────┬──────────┘
                                                        │
          ┌─────────────────────────┬───────────────────┼──────────────────────┐
          │                         │                   │                      │
 ┌────────▼────────┐    ┌───────────▼───────┐  ┌────────▼────────┐  ┌─────────▼──────┐
 │   PostgreSQL 16 │    │    Redis 7         │  │  Celery Beat    │  │  Celery Worker │
 │   (dados)       │    │  (fila / cache)    │  │  (agendador)    │  │  (IA / e-mail) │
 └─────────────────┘    └───────────────────┘  └─────────────────┘  └────────────────┘
```

## Fluxo de Processamento

```
Celery Beat (a cada 60s)
         │
         ▼
 check_new_emails()
         │
         ▼
 OutlookEmailReader ──► Microsoft Graph API (OAuth2 Client Credentials)
         │
         ├─► parse_email() — normaliza campos
         │
         ▼
 AIClassifier (Claude claude-sonnet-4-6)
         │
         ├─► Tool use: classificar_email()
         │     ├── priority: CRITICO | ALTO | MEDIO | BAIXO
         │     ├── category: Pagamento, Contrato, Alerta, etc.
         │     ├── summary: resumo em 2–3 frases
         │     ├── keywords_found: [ "urgente", "vencimento" ]
         │     ├── is_spam: true/false
         │     └── action_required: true/false
         │
         ├── is_spam → ignorar + log
         │
         ├── CRITICO/ALTO ──► WhatsAppSender (Twilio ou Meta)
         │                         └── Notificação instantânea formatada
         │
         ├── has_attachments ──► AttachmentHandler
         │                           ├── Validação de extensão (bloqueia .exe/.bat/etc.)
         │                           ├── OCR em imagens (pytesseract)
         │                           ├── Extração de texto PDF (PyPDF2)
         │                           └── /app/attachments/YYYY/MM/DD/Remetente/
         │
         └── PostgreSQL ──► EmailRecord + EmailAttachment + NotificationLog + ProcessingLog
```

---

## Pré-requisitos

| Requisito | Versão mínima |
|-----------|---------------|
| Docker | 24+ |
| Docker Compose | v2.20+ |
| Conta Azure AD | App Registration configurado |
| API WhatsApp | Twilio ou Meta Business |
| API Anthropic | Claude Sonnet 4 ou superior |

---

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Configure as variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais reais

# 3. Inicie todos os serviços
docker compose up -d

# 4. Acompanhe os logs (aguarde todos os serviços subirem ~30s)
docker compose logs -f backend celery-worker

# 5. Acesse o dashboard
open http://localhost
```

---

## Configuração do Azure AD (Outlook 365)

1. Acesse **portal.azure.com** → **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
2. Nome: `Email Monitor` · Tipo: **Contas neste diretório organizacional**
3. Em **Permissões de API** → **Adicionar permissão** → **Microsoft Graph** → **Permissões do aplicativo**:
   - `Mail.Read`
   - `Mail.ReadWrite`
4. Clique em **Conceder consentimento do administrador**
5. Em **Certificados e segredos** → **Novo segredo do cliente** → copie o valor
6. Copie: **Client ID**, **Client Secret**, **Directory (Tenant) ID**
7. Configure no `.env`:

```env
OUTLOOK_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OUTLOOK_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx~
OUTLOOK_TENANT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
OUTLOOK_EMAIL_ADDRESS=usuario@suaempresa.com.br
```

---

## Configuração WhatsApp

### Opção A — Twilio (recomendado para testes)

```bash
# 1. Crie conta em https://twilio.com/try-twilio
# 2. Ative o WhatsApp Sandbox em Messaging → Try it Out → Send a WhatsApp message
# 3. Configure no .env:
WHATSAPP_PROVIDER=twilio
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_PHONE_NUMBER=+14155238886   # número Twilio Sandbox
WHATSAPP_TO_NUMBER=+5511999999999   # seu número (deve ter joined o sandbox)
```

### Opção B — Meta WhatsApp Business API (produção)

```bash
# 1. Acesse https://developers.facebook.com → Criar app → Tipo: Business
# 2. Adicione o produto "WhatsApp" ao app
# 3. Configure no .env:
WHATSAPP_PROVIDER=meta
META_WHATSAPP_PHONE_NUMBER_ID=xxxxxxxxxxxxxxxx
META_WHATSAPP_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx
WHATSAPP_TO_NUMBER=+5511999999999
```

---

## Configuração da API Claude

```bash
# Gere sua chave em https://console.anthropic.com
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxxxxx
CLAUDE_MODEL=claude-sonnet-4-6
CLAUDE_MAX_TOKENS=1024
```

---

## Serviços e Portas

| Serviço | Porta | URL | Descrição |
|---------|-------|-----|-----------|
| Nginx | 80 | http://localhost | Proxy reverso principal |
| Frontend | 3000 | http://localhost:3000 | Dashboard Next.js |
| Backend API | 8000 | http://localhost:8000/api/docs | FastAPI + Swagger |
| Celery Flower | 5555 | http://localhost:5555 | Monitor de tarefas |

---

## Dashboard — Páginas Disponíveis

| Rota | Descrição |
|------|-----------|
| `/dashboard` | Visão geral com stats, gráfico de prioridades e e-mails recentes |
| `/emails` | Lista completa de e-mails com filtros por prioridade, remetente e anexos |
| `/notifications` | Histórico de notificações WhatsApp enviadas com opção de reenvio |
| `/attachments` | Galeria de anexos salvos com busca por nome/remetente/assunto |
| `/logs` | Logs de processamento do sistema com filtros por ação e status |
| `/settings` | Configurações do sistema, status de integrações e ações manuais |

---

## Sistema de Prioridades

| Nível | Emoji | Descrição | WhatsApp | Exemplos |
|-------|-------|-----------|----------|---------- |
| CRÍTICO | 🔴 | Ação imediata necessária | ✅ Instantâneo | Sistema parado, emergência, vencimento hoje |
| ALTO | 🟠 | Ação necessária em horas | ✅ Instantâneo | Aprovação pendente, contrato, pagamento, diretoria |
| MÉDIO | 🟡 | Ação necessária no dia | ❌ | Fornecedores, clientes, pendências, relatórios |
| BAIXO | 🟢 | Informativo | ❌ | Newsletters, atualizações rotineiras |
| SPAM | ⚫ | Ignorado | ❌ | No-reply, marketing, respostas automáticas |

---

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: Financeiro <financeiro@empresa.com.br>
Assunto: Aprovação urgente de pagamento — fornecedor ABC
Categoria: Pagamento
Horário: 13/06/2026 08:42

Resumo:
Fornecedor ABC aguarda aprovação do pagamento de R$ 45.000,00
referente à NF 12345. Prazo limite: hoje às 12h00.

Ação necessária: Aprovar pagamento no sistema ERP até 12h

Anexos: 2 arquivo(s)
```

---

## Organização de Anexos

```
/app/attachments/
└── 2026/
    └── 06/
        └── 13/
            ├── Financeiro_empresa/
            │   ├── NF_12345.pdf
            │   └── boleto_junho_2026.pdf
            └── Fornecedor_ABC/
                ├── contrato_servicos_a3f2b1.docx
                └── proposta_comercial.xlsx
```

Nomenclatura automática para evitar duplicidades: `{nome_original}_{hash6}{ext}`

---

## API REST — Principais Endpoints

```
GET  /api/health                           # Status da aplicação
GET  /api/dashboard/stats                  # Estatísticas do dia
GET  /api/dashboard/recent-emails          # E-mails recentes
GET  /api/dashboard/notifications          # Histórico de notificações
GET  /api/dashboard/processing-logs        # Logs de processamento
GET  /api/dashboard/health                 # Status das integrações

GET  /api/emails                           # Listar e-mails (filtros: priority, sender, has_attachments)
GET  /api/emails/{id}                      # Detalhes de um e-mail
POST /api/emails/{id}/reclassify           # Re-classificar com IA
GET  /api/emails/{id}/attachments          # Anexos de um e-mail
PATCH /api/emails/{id}/priority            # Atualizar prioridade manualmente

GET  /api/notifications                    # Listar notificações
POST /api/notifications/{id}/retry         # Reenviar notificação

GET  /api/settings                         # Configurações (sem credenciais)
GET  /api/settings/keywords                # Palavras-chave de prioridade
POST /api/settings/trigger-check           # Disparar verificação manual
POST /api/settings/trigger-summary         # Enviar resumo diário agora
```

Documentação interativa: **http://localhost:8000/api/docs**

---

## Variáveis de Ambiente Obrigatórias

```env
# Segurança
SECRET_KEY=<32+ chars aleatórios>
ENCRYPTION_KEY=<chave Fernet base64>

# Banco
POSTGRES_PASSWORD=<senha forte>

# Azure / Outlook
OUTLOOK_CLIENT_ID=
OUTLOOK_CLIENT_SECRET=
OUTLOOK_TENANT_ID=
OUTLOOK_EMAIL_ADDRESS=

# Anthropic
ANTHROPIC_API_KEY=

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
WHATSAPP_PHONE_NUMBER=
WHATSAPP_TO_NUMBER=
```

Gerar chaves de segurança:
```bash
# SECRET_KEY
python -c "import secrets; print(secrets.token_hex(32))"

# ENCRYPTION_KEY
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## Comandos Úteis

```bash
# Ver todos os serviços
docker compose ps

# Logs em tempo real
docker compose logs -f celery-worker
docker compose logs -f backend

# Disparar verificação manual via CLI
docker compose exec backend python -c "
from app.workers.tasks import check_new_emails
result = check_new_emails.delay()
print('Task ID:', result.id)
"

# Executar migrations (necessário ao atualizar schema)
docker compose exec backend alembic upgrade head

# Acessar o banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Escalar workers para processamento paralelo
docker compose up -d --scale celery-worker=3

# Monitorar tarefas em tempo real
open http://localhost:5555   # Flower UI

# Backup do banco
docker compose exec postgres pg_dump -U emails_user emails_db > backup.sql

# Parar tudo
docker compose down

# Parar e remover volumes (CUIDADO: apaga todos os dados)
docker compose down -v
```

---

## Migrations com Alembic

```bash
# Aplicar todas as migrations pendentes
docker compose exec backend alembic upgrade head

# Ver histórico de migrations
docker compose exec backend alembic history

# Gerar nova migration após alterar models
docker compose exec backend alembic revision --autogenerate -m "descricao"

# Reverter última migration
docker compose exec backend alembic downgrade -1
```

---

## Segurança e LGPD

| Medida | Implementação |
|--------|---------------|
| Criptografia de credenciais | Fernet (AES-128-CBC + HMAC-SHA256) |
| Autenticação API | JWT tokens com expiração |
| Validação de anexos | Whitelist de extensões, bloqueio de executáveis |
| Tamanho de anexo | Limite configurável (padrão 25 MB) |
| Logs de auditoria | Todos os eventos registrados com timestamp |
| Retenção de logs | Purge automático (padrão 90 dias) |
| Sem texto plano | Senhas e tokens nunca em logs |
| Pool de conexões | SQLAlchemy com pool_pre_ping e pool_recycle |

---

## Funcionalidades de IA

| Funcionalidade | Descrição |
|----------------|-----------|
| Classificação de prioridade | Claude analisa remetente, assunto e corpo |
| Resumo inteligente | 2–3 frases objetivas do conteúdo principal |
| Detecção de spam | Newsletters, no-reply, respostas automáticas |
| Identificação de ação | Se o e-mail exige ação do destinatário |
| Extração de PDF | PyPDF2 extrai texto para contexto da IA |
| OCR em imagens | pytesseract (português + inglês) |
| Extração financeira | Dados de boletos e notas fiscais |
| Fallback por keywords | Classifica sem IA se API falhar |

---

## Stack Tecnológica

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Backend | Python + FastAPI | 3.12 / 0.111 |
| IA | Claude (Anthropic) | claude-sonnet-4-6 |
| Banco de dados | PostgreSQL | 16 |
| Cache / Fila | Redis | 7 |
| Workers | Celery | 5.4 |
| ORM | SQLAlchemy (async) | 2.0 |
| Frontend | Next.js + TailwindCSS | 14 / 3.4 |
| Gráficos | Recharts | 2.12 |
| E-mail | Microsoft Graph API | v1.0 |
| Autenticação | MSAL (Client Credentials) | 1.28 |
| WhatsApp | Twilio / Meta Business API | — |
| Container | Docker + Docker Compose | — |
| Proxy | Nginx | alpine |
| Monitoramento | Flower (Celery) | 2.0 |

---

## Troubleshooting

**Backend não inicia / erro de conexão PostgreSQL:**
```bash
docker compose logs postgres
# Aguarde o health check: "database system is ready to accept connections"
```

**E-mails não são buscados:**
```bash
docker compose logs celery-worker
# Verifique OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_TENANT_ID no .env
# Confirme que as permissões Mail.Read foram concedidas no Azure
```

**WhatsApp não envia:**
```bash
# Para Twilio Sandbox: o número destino precisa ter enviado "join <palavra>" para o sandbox
# Verifique TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN
docker compose exec backend python -c "
from app.services.whatsapp_sender import WhatsAppSender
import asyncio
s = WhatsAppSender()
r = asyncio.run(s._send_message('+5511999999999', 'Teste'))
print(r)
"
```

**Claude API falha:**
```bash
# O sistema cai automaticamente para classificação por palavras-chave
# Verifique ANTHROPIC_API_KEY
docker compose exec backend python -c "
import anthropic, os
c = anthropic.Anthropic(api_key=os.environ['ANTHROPIC_API_KEY'])
print(c.messages.create(model='claude-haiku-4-5-20251001', max_tokens=10, messages=[{'role':'user','content':'ok'}]).content)
"
```

---

## Licença

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
