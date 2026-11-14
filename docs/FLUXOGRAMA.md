# Fluxograma Operacional

## Ciclo de monitoramento (a cada `CHECK_INTERVAL_SECONDS`, padrão 60s)

```mermaid
flowchart TD
    A[Celery Beat<br/>a cada 60s] --> B[check_new_emails]
    B --> C{Graph API:<br/>buscar não lidos}
    C -- erro --> C1[log_error outlook_fetch<br/>ciclo encerrado]
    C -- ok --> D[Para cada e-mail<br/>SAVEPOINT próprio]
    D --> E{Já existe<br/>message_id?}
    E -- sim --> Z[Marcar como lido]
    E -- não --> F[Pré-filtro determinístico]
    F --> F1{Bloqueado / List-Unsubscribe /<br/>Precedence bulk / Auto-Submitted /<br/>remetente marketing?}
    F1 -- sim --> G[log email_ignored] --> Z
    F1 -- não --> H[Sinais de contexto:<br/>Para/CC, nº destinatários, horário,<br/>noreply, VIP, recorrência 24h]
    H --> I[Claude: classificar_email<br/>tool_use estruturado]
    I -- API falhou --> I1[Fallback por palavras-chave]
    I --> J{is_spam?}
    I1 --> J
    J -- sim e não VIP --> G
    J -- não --> K[Aplicar piso de prioridade<br/>VIP ≥ ALTO]
    K --> L{Tem anexos?}
    L -- sim --> M[Baixar anexos]
    M --> M1{Extensão permitida +<br/>magic bytes ok +<br/>ZIP sem executáveis?}
    M1 -- não --> M2[log attachment_blocked]
    M1 -- sim --> M3[Salvar em /Emails_Importantes/<br/>AAAA/MM/DD/Remetente/<br/>nome único]
    M3 --> M4[Extração PDF / OCR<br/>resumo + dados boleto/NF]
    L -- não --> N
    M2 --> N
    M4 --> N[Persistir EmailRecord + anexos]
    N --> O{Prioridade em<br/>WHATSAPP_NOTIFY_PRIORITIES?}
    O -- sim --> P[Enviar WhatsApp<br/>Twilio ou Meta]
    P --> P1[NotificationLog SENT/FAILED]
    O -- não --> Q
    P1 --> Q[log email_processed<br/>tempo de processamento]
    Q --> R[COMMIT] --> Z
    D -. exceção .-> X[ROLLBACK do savepoint<br/>log_error<br/>NÃO marca como lido → reprocessa]
    Z --> S{Mais e-mails?}
    S -- sim --> D
    S -- não --> T[log cycle_complete]
```

## Rotinas agendadas

| Rotina | Agenda | Fila | O que faz |
|---|---|---|---|
| `check_new_emails` | a cada 60s | `high` | Ciclo acima |
| `retry_failed_notifications` | a cada 5 min | `high` | Reenvia WhatsApp com status `FAILED` (máx. 3 tentativas, mesmo dia) |
| `send_daily_summary` | 08:00 (America/Sao_Paulo) | `low` | Resumo do dia via WhatsApp |
| `cleanup_old_logs` | domingo 02:00 | `low` | Remove `processing_logs` com mais de `LOG_RETENTION_DAYS` |

## Garantias

- **Nenhum e-mail se perde**: só é marcado como lido depois do `COMMIT`. Se o processamento falhar, ele continua não lido e entra no próximo ciclo.
- **Idempotência**: `message_id` é único. Reprocessar o mesmo e-mail não gera registro, anexo ou WhatsApp duplicado.
- **Isolamento**: uma falha em um e-mail desfaz apenas o savepoint dele, e o restante do lote segue.
