# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações via WhatsApp. Lê continuamente e-mails do Outlook 365, identifica mensagens importantes, extrai anexos e envia alertas estruturados no WhatsApp em tempo real.

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
OutlookEmailReader ──► Microsoft Graph API (e-mails não lidos)
      │
      ▼
AIClassifier (Claude claude-sonnet-4-6)
      │  ┌─────────────────────────────────────┐
      │  │  Analisa: remetente, assunto, corpo  │
      │  │  Retorna: prioridade, categoria,     │
      │  │  resumo, palavras-chave, spam        │
      │  └─────────────────────────────────────┘
      │
      ├── is_spam? ──► Ignorar + Log
      │
      ├── AttachmentHandler
      │     ├── Valida extensão (bloqueia .exe, .bat, etc.)
      │     ├── Limita tamanho (padrão: 25MB)
      │     ├── Extrai texto de PDF (PyPDF2, até 20 pgs)
      │     ├── OCR em imagens (Tesseract pt+en)
      │     └── Salva em /attachments/AAAA/MM/DD/Remetente/
      │
      ├── PostgreSQL ──► EmailRecord + EmailAttachment + Logs
      │
      └── CRÍTICO/ALTO ──► WhatsAppSender ──► Notificação imediata
                │
                ├── Twilio WhatsApp API
                └── Meta WhatsApp Business API
```

## Formato da Notificação WhatsApp

```
[CRÍTICO]
Novo e-mail importante recebido

Remetente: financeiro@empresa.com.br
Assunto: Aprovação urgente de pagamento — venc. hoje
Categoria: Pagamento
Horário: 22/06/2026 08:42

Resumo:
Fornecedor ABC aguarda aprovação do pagamento de R$ 15.000
com vencimento hoje às 12h. Boleto em anexo.

Ação necessária: Aprovar pagamento até 12h

Anexos: 2 arquivo(s)
```

## Pré-requisitos

- Docker e Docker Compose v2+
- Conta Microsoft Azure com App Registration configurado
- API do WhatsApp (Twilio ou Meta Business)
- Chave API da Anthropic (Claude)

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Setup automático (cria .env, gera chaves, sobe serviços)
bash scripts/setup.sh

# Ou manualmente:
cp .env.example .env
# Edite .env com suas credenciais
docker compose up -d
```

## Configuração do Azure AD

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
3. Nome: `Email Monitor`, tipo: **Contas neste diretório organizacional**
4. Em **Permissões de API** adicione (tipo **Aplicativo**):
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `User.Read.All`
5. **Conceder consentimento do administrador**
6. Em **Certificados e segredos** crie um novo segredo (Client Credential)
7. Copie: **Client ID**, **Client Secret**, **Tenant ID** → `.env`

## Configuração WhatsApp

### Twilio (recomendado para testes)
1. Crie conta em [twilio.com](https://twilio.com)
2. Ative o **WhatsApp Sandbox**
3. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
4. `WHATSAPP_PROVIDER=twilio`

### Meta Business API (produção)
1. Crie app em [developers.facebook.com](https://developers.facebook.com)
2. Adicione produto **WhatsApp**
3. Configure `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`
4. `WHATSAPP_PROVIDER=meta`

## Serviços e Portas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Nginx | 80 | Proxy principal |
| Frontend | 3000 | Dashboard Next.js |
| Backend | 8000 | API FastAPI + Docs |
| Flower | 5555 | Monitor Celery |

## Páginas do Dashboard

Acesse `http://localhost` após iniciar os serviços.

| Página | URL | Descrição |
|--------|-----|-----------|
| Dashboard | `/dashboard` | Visão geral: stats, gráficos, e-mails recentes |
| E-mails | `/emails` | Lista completa com filtros e reclassificação |
| Notificações | `/notifications` | Histórico WhatsApp + reenvio manual |
| Anexos | `/attachments` | Galeria de arquivos por e-mail/remetente |
| Logs | `/logs` | Auditoria completa do sistema |
| Configurações | `/settings` | Status das integrações e parâmetros |

## Prioridades

| Nível | Cor | Exemplos | WhatsApp |
|-------|-----|----------|----------|
| CRÍTICO | 🔴 | Sistema parado, emergência, vencimento hoje | ✅ Imediato |
| ALTO | 🟠 | Aprovações, contratos, pagamentos, diretoria | ✅ Imediato |
| MÉDIO | 🟡 | Fornecedores, clientes, pendências | ❌ |
| BAIXO | 🟢 | Informativos, atualizações rotineiras | ❌ |

## Organização de Anexos

```
/app/attachments/
└── 2026/
    └── 06/
        └── 22/
            ├── Fornecedor_ABC/
            │   ├── boleto_junho_2026.pdf
            │   └── nf_98765.xml
            └── Diretoria_Empresa/
                └── contrato_renovacao_a1b2c3.docx
```

## API REST

Documentação interativa: `http://localhost:8000/api/docs`

```
GET  /api/dashboard/stats          # Estatísticas do dia
GET  /api/dashboard/weekly-stats   # Histórico 7 dias
GET  /api/dashboard/recent-emails  # E-mails recentes
GET  /api/dashboard/notifications  # Notificações recentes
GET  /api/dashboard/processing-logs# Logs de processamento
GET  /api/dashboard/health         # Status das integrações

GET  /api/emails                   # Lista com filtros
GET  /api/emails/{id}              # Detalhes + corpo completo
POST /api/emails/{id}/reclassify   # Re-classificar com IA
PATCH/api/emails/{id}/priority     # Alterar prioridade manualmente
GET  /api/emails/{id}/attachments  # Anexos de um e-mail

GET  /api/notifications            # Histórico completo
POST /api/notifications/manual     # Enviar mensagem manual
POST /api/notifications/{id}/retry # Reenviar falha

GET  /api/settings                 # Configurações atuais
GET  /api/settings/keywords        # Palavras-chave por prioridade
POST /api/settings/trigger-check   # Disparar verificação agora
POST /api/settings/trigger-summary # Enviar resumo diário
```

## Tarefas Automáticas (Celery Beat)

| Tarefa | Frequência | Fila | Descrição |
|--------|-----------|------|-----------|
| `check_new_emails` | A cada 60s | high | Pipeline principal de e-mails |
| `retry_failed_notifications` | A cada 5min | high | Reenvio de falhas WhatsApp |
| `send_daily_summary` | Diário 08h | low | Resumo diário no WhatsApp |
| `cleanup_old_logs` | Domingo 02h | low | Limpeza de logs antigos |

## Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f celery-worker
docker compose logs -f backend

# Disparar verificação manual via CLI
docker compose exec backend python -c "
from app.workers.tasks import check_new_emails
check_new_emails.delay()
print('Tarefa enviada para fila')
"

# Acessar banco de dados
docker compose exec postgres psql -U emails_user -d emails_db -c "\dt"

# Escalar workers para mais throughput
docker compose up -d --scale celery-worker=3

# Executar migrações Alembic
docker compose exec backend alembic upgrade head

# Ver tarefas no Flower
open http://localhost:5555

# Reiniciar apenas um serviço
docker compose restart celery-worker
```

## Stack Tecnológica

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Backend | Python + FastAPI | 3.12 / 0.111 |
| IA | Claude (Anthropic) | claude-sonnet-4-6 |
| Fila | Celery + Redis | 5.4 / 7 |
| Banco | PostgreSQL + asyncpg | 16 |
| Frontend | Next.js + TailwindCSS | 14 / 3.4 |
| Gráficos | Recharts | 2.12 |
| E-mail | Microsoft Graph API + MSAL | v1.0 |
| WhatsApp | Twilio / Meta Business API | — |
| Container | Docker Compose + Nginx | — |
| Migrações | Alembic | 1.13 |

## Segurança e LGPD

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Validação de tipos de arquivo (bloqueio de executáveis: .exe, .bat, .ps1, etc.)
- Logs de auditoria completos com retenção configurável (padrão: 90 dias)
- Sem armazenamento de senhas em texto plano
- Conexões PostgreSQL com pool e timeout
- Autenticação MSAL com Client Credentials Flow (sem senha de usuário)
- Separação de segredos via variáveis de ambiente

## Variáveis de Ambiente Obrigatórias

```bash
# Azure / Outlook
OUTLOOK_CLIENT_ID=        # App Registration Client ID
OUTLOOK_CLIENT_SECRET=    # App Registration Secret
OUTLOOK_TENANT_ID=        # Azure Tenant ID
OUTLOOK_EMAIL_ADDRESS=    # E-mail a monitorar (ex: notificacoes@empresa.com)

# IA
ANTHROPIC_API_KEY=        # sk-ant-...

# WhatsApp (escolha um provedor)
WHATSAPP_PROVIDER=twilio  # ou 'meta'
WHATSAPP_TO_NUMBER=       # +55119...  (seu número que recebe alertas)
WHATSAPP_PHONE_NUMBER=    # +55119...  (número que envia)
TWILIO_ACCOUNT_SID=       # ACxxx...
TWILIO_AUTH_TOKEN=        # token

# Banco
POSTGRES_PASSWORD=        # senha forte
```

---

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
