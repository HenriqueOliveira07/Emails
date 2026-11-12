# Arquitetura Corporativa

## Visão em camadas

```mermaid
flowchart LR
  subgraph Fontes
    O365[Outlook 365<br/>Microsoft Graph]
    IMAP[IMAP / Gmail API<br/>opcional]
  end
  subgraph Plataforma["Plataforma (Docker Compose)"]
    NGX[NGINX<br/>TLS + proxy]
    FE[Next.js + Tailwind<br/>Dashboard]
    API[FastAPI<br/>API REST]
    BEAT[Celery Beat<br/>agendador 60s]
    WRK[Celery Workers<br/>filas high / low]
    RDS[(Redis<br/>fila + cache)]
    PG[(PostgreSQL<br/>e-mails, anexos, logs)]
    FS[/Volume<br/>/Emails_Importantes/]
  end
  subgraph Externos
    CL[Claude API]
    WA[WhatsApp<br/>Meta Cloud API / Twilio]
  end
  NGX --> FE & API
  FE --> API
  BEAT --> RDS --> WRK
  WRK --> O365 & IMAP
  WRK --> CL
  WRK --> WA
  WRK --> PG & FS
  API --> PG & RDS
```

## Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Ingestão | Microsoft Graph (MSAL client credentials) | Ler assunto, remetente, destinatários, corpo, anexos, data/hora |
| Orquestração | Celery Beat + Redis | Disparo a cada 60s, filas `high` (e-mails) e `low` (relatórios/limpeza) |
| Inteligência | Claude API (fallback por palavras-chave) | Prioridade CRÍTICO/ALTO/MÉDIO/BAIXO, resumo, categoria, spam |
| Notificação | WhatsApp (Meta ou Twilio) | Mensagem estruturada para CRÍTICO/ALTO |
| Arquivos | Volume Docker | `/Emails_Importantes/AAAA/MM/DD/Remetente/` com nomes únicos |
| Persistência | PostgreSQL + SQLAlchemy async + Alembic | Registros, anexos, notificações, logs de processamento |
| Apresentação | Next.js + React Query | KPIs, críticos do dia, falhas, status das integrações, histórico |

## Segurança e LGPD

- Credenciais em variáveis de ambiente; segredos sensíveis criptografados com Fernet (`app/utils/crypto.py`).
- Tokens OAuth2 de curta duração (MSAL), nunca persistidos em disco.
- Bloqueio de extensões executáveis e limite de tamanho por anexo.
- Sanitização de nomes de arquivos/pastas (sem path traversal).
- Logs de processamento auditáveis no PostgreSQL (quem/quando/o quê/duração).
- Minimização: o WhatsApp recebe apenas resumo, nunca o corpo integral nem anexos.
- Retenção configurável e limpeza de pastas vazias pela rotina diária.

## Escalabilidade

- Workers stateless: escale com `docker compose up -d --scale celery-worker=N`.
- Deduplicação por `message_id` do Graph evita reprocessamento entre workers.
- Pool de conexões do banco descartado ao fim de cada tarefa Celery (loop asyncio isolado por tarefa).
