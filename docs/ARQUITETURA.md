# Arquitetura Corporativa

## Visão de componentes

```mermaid
flowchart LR
  OL[Outlook 365 / Microsoft Graph] -->|polling 1 min| W[Celery Worker]
  B[Celery Beat] --> Q[(Redis)]
  Q --> W
  W --> AI[Claude API]
  W --> DB[(PostgreSQL)]
  W --> FS[/Emails_Importantes/ano/mes/dia/remetente/]
  W --> WA[WhatsApp API]
  API[FastAPI] --> DB
  UI[Next.js Dashboard] --> NG[Nginx] --> API
```

## Fluxograma operacional

```mermaid
flowchart TD
  A[Beat dispara a cada 1 min] --> B[Buscar novos e-mails via Graph]
  B --> C{Já processado?}
  C -- sim --> Z[Ignorar + log]
  C -- não --> D{Remetente em lista de spam?}
  D -- sim --> Z
  D -- não --> E[Claude: classificar + resumir]
  E --> F{Spam/newsletter?}
  F -- sim --> Z
  F -- não --> G[Salvar anexos permitidos]
  G --> H{Prioridade >= mínima?}
  H -- não --> L[Registrar no banco]
  H -- sim --> I[Enviar WhatsApp]
  I --> L
  L --> M[Dashboard / logs]
```

## Segurança
- Credenciais via variáveis de ambiente; criptografia de tokens em repouso (`utils/crypto.py`).
- Anexos: lista de extensões permitidas, nomes sanitizados e deduplicados.
- Logs estruturados e auditáveis; minimização de dados conforme LGPD.
- Nginx como único ponto de entrada; demais serviços em rede interna do Compose.

## Escalabilidade
Workers Celery escaláveis horizontalmente (`docker compose up --scale worker=N`); fila Redis desacopla leitura, IA e envio.
