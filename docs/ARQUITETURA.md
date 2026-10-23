# Arquitetura Corporativa e Fluxo Operacional

## Visão de componentes

```mermaid
flowchart LR
    O365[Outlook 365 / Microsoft Graph] -->|poll 1 min| W[Celery Worker]
    B[Celery Beat] --> Q[(Redis - fila)]
    Q --> W
    W --> AI[Claude API - classificação]
    W --> FS[(/Emails_Importantes/AAAA/MM/DD/Remetente)]
    W --> DB[(PostgreSQL)]
    W --> WA[WhatsApp API - Twilio/Meta]
    API[FastAPI] --> DB
    UI[Next.js Dashboard] --> NG[Nginx] --> API
```

## Fluxograma operacional

```mermaid
flowchart TD
    A[Beat dispara a cada 1 min] --> B[Buscar e-mails novos via Graph]
    B --> C{Já processado?}
    C -- sim --> X[Ignorar + log]
    C -- não --> D[Filtro de remetente/spam]
    D -- spam --> X
    D -- ok --> E[Classificar com IA]
    E --> F{Spam/newsletter?}
    F -- sim --> X
    F -- não --> G[Salvar anexos validados]
    G --> H[Persistir no PostgreSQL]
    H --> I{Prioridade >= limiar?}
    I -- sim --> J[Enviar resumo no WhatsApp]
    I -- não --> K[Somente registrar]
    J --> L[Log de notificação]
    K --> L
```

## Camadas e responsabilidades

| Camada | Tecnologia | Função |
|---|---|---|
| Ingestão | Microsoft Graph, Celery Beat | Polling a cada minuto |
| Processamento | Celery + Redis | Filas, retentativas, escala horizontal |
| IA | Claude API (tool use) | Prioridade, categoria, resumo, spam |
| Persistência | PostgreSQL, Alembic | E-mails, anexos, notificações, logs |
| Notificação | WhatsApp (Twilio/Meta) | Resumo estruturado |
| Apresentação | Next.js + Tailwind | Dashboard |
| Borda | Nginx | TLS, proxy reverso |

## Segurança
Credenciais em variáveis de ambiente/segredos, criptografia de tokens (`utils/crypto.py`), validação de tipo/tamanho de anexos, nomes sanitizados e sem duplicidade, logs auditáveis e retenção conforme LGPD.
