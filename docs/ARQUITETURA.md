# Arquitetura Corporativa e Fluxograma Operacional

## Visão geral

```mermaid
flowchart LR
  subgraph Fontes
    O365[Outlook 365 / Microsoft Graph]
    IMAP[IMAP / Gmail]
  end
  subgraph Plataforma
    NGINX[Nginx] --> FE[Next.js Dashboard]
    NGINX --> API[FastAPI]
    BEAT[Celery Beat 1 min] --> RQ[(Redis)]
    RQ --> WK[Celery Workers]
    API --> PG[(PostgreSQL)]
    WK --> PG
    WK --> AI[Claude API]
    WK --> FS[(/Emails_Importantes)]
  end
  O365 --> WK
  IMAP --> WK
  WK --> WA[WhatsApp: Twilio / Meta]
```

## Fluxograma operacional

```mermaid
flowchart TD
  A[Celery Beat dispara a cada 1 min] --> B[Buscar novos e-mails]
  B --> C{E-mail já processado?}
  C -- sim --> L1[Log: ignorado - duplicado]
  C -- não --> D{Spam / newsletter / remetente bloqueado?}
  D -- sim --> L2[Log: ignorado]
  D -- não --> E[Classificar com IA + palavras-chave]
  E --> F{Prioridade}
  F -- BAIXO --> L3[Registrar sem notificar]
  F -- MÉDIO/ALTO/CRÍTICO --> G{Tem anexos?}
  G -- sim --> H[Validar tipo/tamanho e varrer - sanitizar]
  H --> I[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/ com nome único]
  G -- não --> J
  I --> J[Gerar resumo e enviar WhatsApp]
  J --> K{Envio OK?}
  K -- sim --> M[Registrar notificação]
  K -- não --> N[Retry com backoff e log de erro]
  M --> O[Atualizar dashboard e métricas]
  N --> O
```

## Decisões e camadas

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Entrada | Nginx | TLS, roteamento, rate limit |
| API | FastAPI | REST, dashboard, configurações |
| Fila | Redis + Celery | Polling a cada minuto, retries, escala horizontal |
| IA | Claude API (fallback por regras) | Prioridade, resumo, extração |
| Dados | PostgreSQL | E-mails, anexos, notificações, logs auditáveis |
| Armazenamento | Volume `/Emails_Importantes` | Anexos por ano/mês/dia/remetente |

## Segurança e LGPD

- Credenciais criptografadas (Fernet) e segredos só via variáveis de ambiente.
- Validação de extensão/tamanho de anexos e sanitização de nomes (anti path traversal).
- Logs auditáveis; retenção configurável; minimização de dados no WhatsApp (somente resumo).
- Controle de acesso à API por token.
