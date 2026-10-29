# Arquitetura Corporativa

## Visão geral

```mermaid
flowchart LR
    O365[Outlook 365 / Microsoft Graph] -->|poll 1 min| W[Celery Worker]
    B[Celery Beat] --> W
    W --> R[(Redis - fila)]
    W --> AI[Claude API<br/>classificação + resumo]
    W --> FS[(/Emails_Importantes/AAAA/MM/DD/Remetente)]
    W --> PG[(PostgreSQL)]
    W --> WA[WhatsApp API<br/>Twilio / Meta]
    API[FastAPI REST] --> PG
    FE[Next.js Dashboard] --> API
    NG[Nginx] --> FE
    NG --> API
```

## Camadas

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Ingestão | Microsoft Graph (OAuth2 client credentials) | Leitura de e-mails e anexos |
| Orquestração | Celery + Redis | Agendamento (1 min), filas, retentativas |
| Inteligência | Claude API (tool_use) + fallback por palavras-chave | Prioridade, resumo, spam |
| Armazenamento | PostgreSQL + volume de arquivos | Metadados, logs, anexos |
| Notificação | WhatsApp (Twilio / Meta) | Resumo estruturado |
| Apresentação | FastAPI + Next.js + Tailwind | API REST e dashboard |
| Borda | Nginx | Proxy reverso / TLS |

## Fluxograma operacional

```mermaid
flowchart TD
    A[Beat dispara a cada 1 min] --> B[Buscar novos e-mails no Graph]
    B --> C{Já processado?}
    C -- sim --> Z[Ignorar + log]
    C -- não --> D{Remetente spam/noreply?}
    D -- sim --> Y[Registrar como ignorado]
    D -- não --> E[Classificar com Claude]
    E -->|falha| F[Fallback por palavras-chave]
    E --> G{Spam?}
    F --> G
    G -- sim --> Y
    G -- não --> H[Salvar anexos permitidos<br/>validação de extensão e tamanho]
    H --> I[Persistir e-mail no PostgreSQL]
    I --> J{Prioridade >= mínima?}
    J -- não --> K[Fim]
    J -- sim --> L[Enviar WhatsApp]
    L --> M[Registrar notificação e logs]
    M --> K
```

## Segurança e LGPD

- Credenciais em variáveis de ambiente; tokens sensíveis cifrados (Fernet, `utils/crypto.py`).
- Anexos: lista de extensões permitidas, limite de tamanho, nomes sanitizados e sem sobrescrita.
- Logs estruturados e auditáveis; corpo completo do e-mail não é persistido (apenas prévia).
- Retenção configurável e acesso restrito ao volume de anexos.
