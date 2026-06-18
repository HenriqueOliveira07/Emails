# Arquitetura — Sistema de Monitoramento de E-mails

## Visão Geral

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        NGINX  (porta 80)                                 │
│                   Reverse Proxy / Load Balancer                          │
└───────────────────────────┬──────────────────────────┬───────────────────┘
                            │                          │
               ┌────────────▼────────────┐  ┌─────────▼─────────┐
               │   Frontend  Next.js 14  │  │  Backend FastAPI   │
               │      (porta 3000)       │  │    (porta 8000)    │
               │  TailwindCSS + Recharts │  │  SQLAlchemy Async  │
               └─────────────────────────┘  └─────────┬─────────┘
                                                       │
                        ┌──────────────────────────────┼──────────────────┐
                        │                              │                  │
             ┌──────────▼──────┐           ┌───────────▼──────┐  ┌───────▼──────┐
             │   PostgreSQL 16  │           │    Redis 7        │  │ Celery Beat  │
             │   (dados/audit) │           │  (broker/cache)   │  │ (scheduler)  │
             └─────────────────┘           └──────────────────┘  └──────┬───────┘
                                                                         │
                                              ┌──────────────────────────┤
                                              │                          │
                                   ┌──────────▼──────────┐   ┌──────────▼──────────┐
                                   │  Celery Worker       │   │   Celery Flower      │
                                   │  (processamento IA)  │   │   (porta 5555)       │
                                   └─────────────────────┘   └─────────────────────┘
```

## Fluxo de Processamento de E-mails

```
╔══════════════════════════════════════════════════════════════════════════╗
║                        CICLO A CADA 60 SEGUNDOS                         ║
╚══════════════════════════════════════════════════════════════════════════╝

Celery Beat
    │
    │  check_new_emails.delay()
    ▼
Celery Worker
    │
    ├─► OutlookEmailReader
    │       │
    │       ├─► MSAL Auth (Client Credentials Flow)
    │       │       └─► Azure AD Token (cache 55min)
    │       │
    │       └─► Microsoft Graph API
    │               GET /users/{email}/mailFolders/inbox/messages
    │               $filter=isRead eq false  |  $top=25
    │
    │  [Para cada e-mail]
    │
    ├─► Verificação de Duplicata (PostgreSQL)
    │
    ├─► AIClassifier (Claude claude-sonnet-4-6)
    │       │
    │       ├─► Tool use: classificar_email
    │       │       ├── priority: CRITICO | ALTO | MEDIO | BAIXO
    │       │       ├── category: Pagamento | Contrato | Suporte | ...
    │       │       ├── summary: resumo objetivo em 2-3 frases
    │       │       ├── keywords_found: ["urgente", "aprovação", ...]
    │       │       ├── is_spam: true | false
    │       │       └── action_required: true | false
    │       │
    │       └─► Fallback por palavras-chave (se API falhar)
    │
    ├─► [is_spam == true] ──► Log "ignorado" → próximo e-mail
    │
    ├─► mark_as_read (Graph API PATCH)
    │
    ├─► AttachmentHandler (se has_attachments)
    │       │
    │       ├─► Validar extensão (bloqueia .exe .bat .sh .ps1 ...)
    │       ├─► Validar tamanho (max 25 MB)
    │       ├─► Salvar em /attachments/YYYY/MM/DD/Remetente/
    │       ├─► Sanitizar nome (evita path traversal)
    │       ├─► Garantir unicidade (hash suffix se duplicado)
    │       ├─► Extrair texto PDF (PyPDF2)
    │       └─► OCR imagens (pytesseract)
    │
    ├─► Salvar EmailRecord no PostgreSQL
    │       ├── message_id, subject, sender, recipients
    │       ├── body_preview, full_body
    │       ├── priority, category, ai_summary
    │       ├── keywords_found, action_required
    │       └── processing_time_ms
    │
    ├─► [priority == CRITICO | ALTO] ──► WhatsAppSender
    │       │
    │       ├─► Formatar mensagem corporativa:
    │       │       [CRITICO]
    │       │       Novo e-mail importante recebido
    │       │
    │       │       Remetente: financeiro@empresa.com
    │       │       Assunto: Aprovação urgente de pagamento
    │       │       Categoria: Pagamento
    │       │       Horário: 27/05/2026 08:42
    │       │
    │       │       Resumo:
    │       │       Fornecedor aguardando aprovação do pagamento...
    │       │
    │       │       Ação necessária: Aprovar até 12h de hoje
    │       │       Anexos: 2 arquivo(s)
    │       │
    │       ├─► Twilio WhatsApp API
    │       │   POST /Accounts/{SID}/Messages.json
    │       │   From: whatsapp:+55119...
    │       │   To: whatsapp:+55118...
    │       │
    │       └─► Meta Business API (alternativa)
    │           POST /v19.0/{PhoneNumberID}/messages
    │
    ├─► Salvar NotificationLog (status, external_id, retry_count)
    │
    └─► LogService → ProcessingLog (auditoria completa)
```

## Tarefas Agendadas (Celery Beat)

| Tarefa | Frequência | Fila | Descrição |
|--------|-----------|------|-----------|
| `check_new_emails` | A cada 60s | `high` | Verificação principal |
| `retry_failed_notifications` | A cada 5min | `high` | Reenvio de notificações com falha |
| `send_daily_summary` | Diário 08:00 | `low` | Resumo WhatsApp do dia |
| `cleanup_old_logs` | Domingo 02:00 | `low` | Limpeza de logs antigos |

## Classificação de Prioridade

```
ENTRADA: Assunto + Remetente + Corpo (3000 chars) + Importância + Anexos
    │
    ▼
Claude claude-sonnet-4-6 (tool_use: classificar_email)
    │
    ├─► CRÍTICO  🔴  → WhatsApp imediato
    │   Triggers: parada de sistema, emergência, vencimento hoje
    │             palavras: URGENTE, SOS, emergência, falha crítica
    │
    ├─► ALTO     🟠  → WhatsApp imediato
    │   Triggers: aprovações, contratos, pagamentos, decisões de diretoria
    │             palavras: aprovação, contrato, assinatura, CEO, CFO
    │
    ├─► MÉDIO    🟡  → Apenas registro (sem notificação)
    │   Triggers: fornecedores, clientes, pendências gerais
    │             palavras: fornecedor, cliente, orçamento, pedido
    │
    ├─► BAIXO    🟢  → Apenas registro (sem notificação)
    │   Triggers: informativos, atualizações rotineiras
    │
    └─► SPAM     ⛔  → Ignorado completamente
        Triggers: newsletter, noreply, marketing, respostas automáticas
```

## Organização de Anexos

```
/app/attachments/
└── 2026/
    └── 05/
        └── 27/
            ├── Financeiro_Empresa/
            │   ├── boleto_maio_2026.pdf
            │   ├── nf_12345.xml
            │   └── contrato_fornecedor_abc6f2.docx  ← hash suffix evita duplicata
            └── Suporte_Ti/
                ├── relatorio_incidente.docx
                └── screenshot_erro_a3b2c1.png
```

## Segurança

| Camada | Mecanismo |
|--------|-----------|
| Credenciais | Fernet (AES-128-CBC + HMAC-SHA256) |
| Tokens | JWT com expiração configurável |
| Arquivos | Whitelist de extensões + verificação de tamanho |
| Uploads | Bloqueio de extensões executáveis (.exe, .bat, .sh, .ps1...) |
| Banco | Connection pool + SSL + timeout |
| Logs | Auditoria completa com retenção configurável (padrão 90 dias) |
| LGPD | Dados não transmitidos a terceiros além das APIs configuradas |

## API REST — Endpoints Principais

```
GET  /api/health                         Sistema saudável?
GET  /api/dashboard/stats                Estatísticas do dia
GET  /api/dashboard/recent-emails        E-mails recentes (paginado)
GET  /api/dashboard/notifications        Histórico de notificações
GET  /api/dashboard/health               Status de todas as integrações
GET  /api/emails?priority=CRITICO        E-mails com filtros
GET  /api/emails/{id}                    Detalhes completos (com full_body)
GET  /api/emails/{id}/attachments        Anexos de um e-mail
POST /api/emails/{id}/reclassify         Re-classificar com IA
PATCH /api/emails/{id}/priority          Ajuste manual de prioridade
GET  /api/notifications                  Histórico completo
POST /api/notifications/manual           Envio manual de WhatsApp
POST /api/notifications/{id}/retry       Reenviar notificação com falha
GET  /api/settings                       Configurações atuais (sem credenciais)
GET  /api/settings/keywords              Palavras-chave de prioridade
POST /api/settings/trigger-check         Disparar verificação manual
POST /api/settings/trigger-summary       Enviar resumo diário agora
```

## Stack Tecnológica

| Categoria | Tecnologia | Versão |
|-----------|-----------|--------|
| Backend | Python + FastAPI | 3.12 / 0.111 |
| ORM | SQLAlchemy (async) | 2.0 |
| Banco | PostgreSQL | 16 |
| Driver async | asyncpg | 0.29 |
| Cache/Fila | Redis | 7 |
| Worker | Celery + Flower | 5.4 |
| IA | Claude (Anthropic) | sonnet-4-6 |
| Auth | MSAL (Azure AD) | 1.28 |
| E-mail API | Microsoft Graph API | v1.0 |
| WhatsApp | Twilio / Meta Business | v19 |
| HTTP Client | httpx (async) | 0.27 |
| Logs | structlog (JSON) | 24.1 |
| Frontend | Next.js + TailwindCSS | 14 / 3.4 |
| Charts | Recharts | 2.12 |
| Container | Docker + Compose | v2 |
| Proxy | Nginx | alpine |
