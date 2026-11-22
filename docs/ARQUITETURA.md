# Arquitetura Corporativa e Fluxograma Operacional

## Visão de componentes

```mermaid
flowchart LR
    subgraph Fontes
        O365[Outlook 365<br/>Microsoft Graph API]
    end
    subgraph Backend[Backend Python]
        BEAT[Celery Beat<br/>agendador 60s] -->|enfileira| REDIS[(Redis<br/>fila high/low)]
        REDIS --> WORKER[Celery Worker]
        WORKER --> RULES[Regras por remetente<br/>VIP / bloqueados / horário / recorrência]
        WORKER --> AI[Classificador Claude API<br/>tool_use estruturado]
        WORKER --> ATT[AttachmentHandler<br/>allowlist + magic bytes + zip bomb<br/>PDF/OCR + boleto/NF]
        WORKER --> WA[WhatsAppSender<br/>Twilio / Meta Cloud API]
        API[FastAPI REST]
    end
    O365 <-->|OAuth2 client credentials| WORKER
    WORKER --> PG[(PostgreSQL<br/>emails, anexos, notificações, logs)]
    API --> PG
    ATT --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
    WA --> PHONE[WhatsApp do usuário]
    FRONT[Next.js Dashboard] -->|/api| NGINX[Nginx] --> API
    FLOWER[Flower] --> REDIS
```

## Fluxograma de processamento de um e-mail

```mermaid
flowchart TD
    A[Beat dispara check_new_emails] --> B[Buscar não lidos via Graph]
    B -->|falha| B1[Log erro integração] --> Z
    B --> C{Já processado?<br/>message_id}
    C -->|sim| R[Marcar como lido]
    C -->|não| D{Remetente bloqueado?}
    D -->|sim| I[Log ignorado] --> R
    D -->|não| E[Savepoint no banco]
    E --> F[Classificar com Claude<br/>fallback por palavras-chave]
    F --> G[Aplicar regras: VIP, horário, recorrência, importância]
    G --> H{Spam / newsletter?}
    H -->|sim| I
    H -->|não| J[Baixar anexos]
    J --> K{Anexo seguro?}
    K -->|não| K1[Bloquear + log de segurança]
    K -->|sim| L[Salvar em AAAA/MM/DD/Remetente<br/>nome único, OCR/PDF, dados boleto/NF]
    K1 --> M
    L --> M[Gravar EmailRecord + anexos]
    M --> N{Prioridade CRÍTICO ou ALTO?}
    N -->|sim| O[Enviar WhatsApp + NotificationLog]
    O -->|falha| O1[Status FAILED<br/>retry a cada 5 min, até 3x]
    N -->|não| P
    O --> P[Log processado + tempo]
    O1 --> P
    P --> Q[Commit] --> R
    E -.erro.-> X[Rollback do savepoint<br/>NÃO marca como lido → reprocessa] --> Z
    R --> Z[Log do ciclo]
```

## Garantias operacionais

| Aspecto | Como é garantido |
|---|---|
| Sem perda de e-mail | Marca como lido **somente após commit**; erro ⇒ reprocessado no próximo ciclo |
| Sem duplicidade no banco | `message_id` único + verificação antes de processar |
| Isolamento de falhas | Savepoint (`begin_nested`) por e-mail |
| Anexos maliciosos | Allowlist de extensões, bloqueio de dupla extensão (`.pdf.exe`), validação de magic bytes, inspeção de ZIP (executáveis internos e zip bomb) |
| Notificação resiliente | `retry_failed_notifications` a cada 5 min |
| Auditoria / LGPD | `processing_logs` com toda ação (processado, ignorado, anexo salvo/bloqueado, WhatsApp, erros, duração); retenção configurável `LOG_RETENTION_DAYS` |
| Credenciais | Variáveis de ambiente + `ENCRYPTION_KEY` (Fernet) para segredos persistidos |

## Rotinas automatizadas (Celery Beat)

| Rotina | Frequência | Fila |
|---|---|---|
| `check_new_emails` | `CHECK_INTERVAL_SECONDS` (padrão 60s) | high |
| `retry_failed_notifications` | 5 min | high |
| `send_daily_summary` (WhatsApp) | diário 08:00 | low |
| `cleanup_old_logs` | domingo 02:00 | low |
