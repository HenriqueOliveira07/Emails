# Arquitetura Corporativa e Fluxograma Operacional

## Visão de componentes

```mermaid
flowchart LR
  subgraph Fontes
    O365[Outlook 365<br/>Microsoft Graph API]
  end
  subgraph Plataforma["Plataforma (Docker Compose)"]
    BEAT[Celery Beat<br/>agendador 60s]
    W[Celery Workers<br/>filas high / low]
    API[FastAPI<br/>API REST]
    PG[(PostgreSQL)]
    R[(Redis<br/>broker + cache)]
    FS[/Volume<br/>/Emails_Importantes/]
    NX[Nginx<br/>TLS + proxy]
    FE[Next.js Dashboard]
  end
  subgraph Externos
    CL[Claude API]
    WA[WhatsApp<br/>Twilio / Meta Cloud]
  end

  BEAT -->|enfileira check_new_emails| R --> W
  W -->|OAuth2 client credentials| O365
  W -->|classificação + resumo| CL
  W -->|notificação| WA
  W --> PG
  W --> FS
  FE --> NX --> API --> PG
  API --> R
```

## Fluxograma operacional (ciclo de 1 minuto)

```mermaid
flowchart TD
  A([Beat dispara a cada 60s]) --> B[Buscar e-mails não lidos<br/>via Graph API]
  B --> C{Já processado?<br/>message_id no Postgres}
  C -- sim --> Z[Ignorar]
  C -- não --> D{Remetente/assunto<br/>bate em filtro de spam?}
  D -- sim --> L1[Log: e-mail ignorado] --> MR
  D -- não --> E[Classificar com Claude<br/>prioridade · categoria · resumo]
  E -- falha na API --> E2[Fallback por palavras-chave]
  E --> F{is_spam?}
  E2 --> F
  F -- sim --> L1
  F -- não --> G{Possui anexos?}
  G -- sim --> H[Validar extensão + assinatura binária<br/>bloquear executáveis]
  H --> I[Salvar em /AAAA/MM/DD/Remetente/<br/>nome único]
  I --> J[PDF: extrair texto · Imagem: OCR]
  G -- não --> K
  J --> K[Persistir e-mail + anexos]
  K --> P{Prioridade ≥ limiar?<br/>CRÍTICO / ALTO}
  P -- sim --> W[Enviar WhatsApp]
  W -- erro --> RT[Marcar FAILED<br/>retry a cada 5 min]
  W -- ok --> L2[Log notificação]
  P -- não --> L3[Somente registrar]
  L2 --> MR[Marcar como lido]
  L3 --> MR
  RT --> MR
  MR --> END([Log do ciclo + tempo de processamento])
```

## Rotinas agendadas

| Rotina | Frequência | Fila | Função |
|---|---|---|---|
| `check_new_emails` | `CHECK_INTERVAL_SECONDS` (60s) | high | Ciclo principal acima |
| `retry_failed_notifications` | 5 min | high | Reenvia WhatsApp com falha |
| `send_daily_summary` | 08:00 diário | low | Resumo do dia anterior no WhatsApp |
| `cleanup_old_logs` | Domingo 02:00 | low | Remove logs além de `LOG_RETENTION_DAYS` |

## Segurança e LGPD

- **Credenciais**: segredos só via variáveis de ambiente / `.env` (fora do git); valores sensíveis guardados no banco são cifrados com Fernet (`app/utils/crypto.py`).
- **Autenticação Graph**: app registration com permissão mínima `Mail.Read` + `Mail.ReadWrite` (para marcar como lido), restrita à caixa via *Application Access Policy*.
- **Anexos maliciosos**: allowlist de extensões, blocklist de executáveis, detecção de executável disfarçado por *magic bytes*, limite de tamanho.
- **Auditoria**: toda ação gera registro em `processing_logs` (tabela) + log estruturado JSON.
- **Minimização (LGPD)**: retenção configurável, corpo completo pode ser descartado; a Claude API recebe apenas os primeiros 3.000 caracteres do corpo.

## Escalabilidade

- Workers stateless — escale com `docker compose up --scale celery-worker=N`.
- Idempotência por `message_id` único evita duplicidade em execuções concorrentes.
- `task_acks_late` + `prefetch_multiplier=1` garantem reprocessamento se um worker cair.
