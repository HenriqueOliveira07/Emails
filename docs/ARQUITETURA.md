# Arquitetura e Fluxo Operacional

## Visão de componentes

```mermaid
flowchart LR
    subgraph Externos
        O365[Outlook 365<br/>Microsoft Graph]
        CL[Claude API]
        WA[WhatsApp<br/>Twilio / Meta]
    end

    subgraph Docker["docker compose"]
        NG[Nginx :80] --> FE[Next.js Dashboard :3000]
        NG --> API[FastAPI :8000]
        BEAT[Celery Beat<br/>agendador 60s] -->|enfileira| RD[(Redis<br/>broker)]
        RD --> WK[Celery Workers<br/>filas high / low]
        API -->|trigger manual| RD
        API --> PG[(PostgreSQL)]
        WK --> PG
        WK --> FS[/Volume<br/>Emails_Importantes/]
        FL[Flower :5555] --> RD
    end

    WK <-->|MSAL client credentials| O365
    WK <-->|tool_use estruturado| CL
    WK -->|notificação| WA
```

| Camada | Responsabilidade | Escala |
|---|---|---|
| Celery Beat | Dispara `check_new_emails` a cada `CHECK_INTERVAL_SECONDS` | 1 réplica (singleton) |
| Celery Worker | Leitura, IA, anexos, WhatsApp, logs | Horizontal (`--scale celery-worker=N`) |
| FastAPI | API REST do painel, gatilhos manuais | Horizontal atrás do Nginx |
| PostgreSQL | E-mails, anexos, notificações, logs de auditoria | Vertical / réplica de leitura |
| Redis | Broker + backend de resultados | Sentinel/Cluster em produção |

## Fluxograma operacional (um ciclo)

```mermaid
flowchart TD
    A([Beat: a cada 60s]) --> B[Buscar não lidos<br/>Graph API]
    B -->|erro| B1[Log integration_error] --> Z([Fim do ciclo])
    B --> C{Para cada e-mail}
    C --> D{Já processado?<br/>message_id}
    D -->|sim| R[Marcar como lido] --> C
    D -->|não| E{Remetente bloqueado?}
    E -->|sim| I[Log email_ignored] --> R
    E -->|não| F[Classificar com Claude<br/>fallback: palavras-chave]
    F --> G{VIP?}
    G -->|sim| G1[Nunca spam,<br/>+1 nível de prioridade] --> H
    G -->|não| H{Spam / newsletter?}
    H -->|sim| I
    H -->|não| J{Tem anexos?}
    J -->|sim| K[Validar: allowlist, dupla extensão,<br/>assinatura executável, ZIP]
    K --> L[Salvar em Emails_Importantes/AAAA/MM/DD/Remetente/<br/>nome único]
    L --> M[Extrair texto: PDF / OCR / XML<br/>Resumo IA + dados de boleto/NF]
    M --> N
    J -->|não| N[Gravar EmailRecord + anexos]
    N --> O{CRÍTICO ou ALTO?}
    O -->|sim| P[Enviar WhatsApp<br/>gravar NotificationLog]
    O -->|não| Q
    P --> Q[Log email_processed + tempo]
    Q --> R
    C -->|erro em um e-mail| X[Rollback do savepoint<br/>log email_processing_error<br/>NÃO marca como lido → reprocessa]
    X --> C
    C -->|fim| Y[Log cycle_complete] --> Z
```

### Garantias do ciclo

- **Idempotência**: `message_id` único; reprocessar não duplica registro nem notificação.
- **Isolamento de falhas**: cada e-mail roda dentro de um *savepoint*; um erro não desfaz o lote.
- **Sem perda**: e-mails só são marcados como lidos depois de gravados; falhas voltam no próximo ciclo.
- **Retentativa de WhatsApp**: `retry_failed_notifications` a cada 5 min (até 3 tentativas).
- **Resumo diário**: `send_daily_summary` às 08:00 (America/Sao_Paulo).
- **Retenção**: `cleanup_old_logs` semanal, conforme `LOG_RETENTION_DAYS` (LGPD).

## Modelo de dados

```mermaid
erDiagram
    email_records ||--o{ email_attachments : possui
    email_records ||--o{ notification_logs : gera
    email_records {
        int id PK
        string message_id UK
        string sender_email
        enum priority "CRITICO|ALTO|MEDIO|BAIXO"
        string category
        text ai_summary
        bool action_required
        bool whatsapp_sent
        float processing_time_ms
    }
    email_attachments {
        int id PK
        int email_id FK
        string file_path
        text pdf_text
        text ocr_text
        text ai_summary
        json invoice_data
    }
    notification_logs {
        int id PK
        int email_id FK
        enum status "pendente|enviado|falhou"
        int retry_count
        string external_id
    }
    processing_logs {
        int id PK
        string action
        bool success
        float duration_ms
        json details
    }
```

## Segurança

| Controle | Implementação |
|---|---|
| Credenciais | Somente via variáveis de ambiente / `.env` (fora do git); utilitário Fernet em `app/utils/crypto.py` |
| Graph API | Client Credentials (MSAL), token em memória com renovação 60s antes de expirar |
| Anexos maliciosos | Allowlist de extensões, bloqueio de dupla extensão e macros (`.docm/.xlsm`), detecção de assinatura executável, inspeção de ZIP (executáveis, path traversal, zip bomb) |
| Auditoria | `processing_logs` registra processados, ignorados, anexos, WhatsApp, erros e tempos |
| LGPD | Retenção configurável, sem senhas em texto plano, dados mínimos na notificação |

### Limitações conhecidas / próximos passos

- **Autenticação do painel/API**: a API ainda não exige login. Em produção, exponha apenas
  pela VPN/rede interna ou habilite `auth_basic` no Nginx até a implementação de JWT.
- **Antivírus**: a inspeção de anexos é heurística; para ambiente regulado, integre ClamAV
  (`clamd`) antes de gravar o arquivo.
- **Tempo real**: o polling é de 60s. Para latência menor, use *change notifications*
  (webhooks) do Microsoft Graph apontando para um endpoint da API.
- **Migrações**: tabelas são criadas no startup (`create_all`); adote Alembic antes de
  alterar o schema em produção.
