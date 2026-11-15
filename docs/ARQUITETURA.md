# Arquitetura e Fluxo Operacional

## Componentes

```mermaid
flowchart LR
  subgraph Fontes
    O365[Outlook 365<br/>Microsoft Graph API]
  end
  subgraph Backend
    BEAT[Celery Beat<br/>agenda a cada 1 min] --> Q[(Redis<br/>fila)]
    Q --> W[Celery Worker]
    API[FastAPI<br/>API REST]
  end
  W -->|lê não lidos| O365
  W -->|classifica / resume| CLAUDE[Claude API]
  W -->|salva anexos| FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
  W -->|notifica CRÍTICO/ALTO| WA[WhatsApp<br/>Twilio ou Meta]
  W --> PG[(PostgreSQL<br/>e-mails, anexos, logs)]
  API --> PG
  FE[Next.js Dashboard] -->|/api| NG[Nginx] --> API
```

## Fluxo de um ciclo

```mermaid
flowchart TD
  A[Beat dispara check_new_emails] --> B[Busca até N e-mails não lidos]
  B --> C{Já existe no banco?}
  C -- sim --> C1[Marca como lido e pula]
  C -- não --> D[Classifica com Claude<br/>fallback: palavras-chave]
  D --> E{Spam / newsletter?}
  E -- sim --> E1[Log 'ignorado' + marca como lido]
  E -- não --> F[Savepoint no banco]
  F --> G[Salva anexos permitidos<br/>bloqueia extensões perigosas<br/>OCR / texto de PDF / dados de boleto]
  G --> H[Persiste e-mail + anexos]
  H --> I{Prioridade CRÍTICO ou ALTO?}
  I -- sim --> J[Envia WhatsApp + registra notificação]
  I -- não --> K
  J --> K[Log 'processado' + commit do savepoint]
  K --> L[Marca como lido no Outlook]
  F -. erro .-> X[Rollback só deste e-mail<br/>log de erro<br/>continua não lido → reprocessa no próximo ciclo]
```

## Garantias de processamento

| Situação | Comportamento |
|---|---|
| Falha ao processar um e-mail | Rollback apenas daquele e-mail (savepoint); demais do lote são gravados |
| Falha antes de persistir | E-mail permanece **não lido** e é reprocessado no próximo ciclo |
| Persistiu mas falhou ao marcar como lido | No próximo ciclo é detectado como duplicado e apenas marcado como lido (sem nova notificação) |
| Claude API indisponível | Classificação por palavras-chave configuráveis |
| WhatsApp falhou | Notificação gravada como `FAILED`; tarefa `retry_failed_notifications` tenta até 3 vezes |

## Rotinas agendadas (Celery Beat)

| Tarefa | Função |
|---|---|
| `check_new_emails` | Ciclo principal (intervalo `CHECK_INTERVAL_SECONDS`) |
| `retry_failed_notifications` | Reenvia notificações WhatsApp falhas (a cada 5 min) |
| `send_daily_summary` | Resumo diário via WhatsApp (08:00) |
| `cleanup_old_logs` | Remove logs mais antigos que `LOG_RETENTION_DAYS` (domingo 02:00) |

## Fuso horário

Horários das mensagens e as pastas `AAAA/MM/DD` usam `TIMEZONE` (padrão `America/Sao_Paulo`),
evitando que um e-mail recebido às 22h seja arquivado na pasta do dia seguinte (UTC).
