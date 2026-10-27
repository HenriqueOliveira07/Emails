# Arquitetura e Fluxograma Operacional

## Arquitetura

```mermaid
flowchart LR
  OL[Outlook 365 / Graph API] --> W[Celery Beat - 1 min]
  W --> R[(Redis - fila)]
  R --> T[Celery Worker]
  T --> C[Classificador IA - Claude API]
  T --> A[Handler de anexos]
  T --> DB[(PostgreSQL)]
  C --> WA[WhatsApp API]
  A --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
  API[FastAPI] --> DB
  FE[Next.js Dashboard] --> API
  NG[Nginx] --> FE
  NG --> API
```

## Fluxo operacional

```mermaid
flowchart TD
  A[Buscar novos e-mails] --> B{Spam / newsletter?}
  B -- sim --> L1[Log: ignorado]
  B -- nao --> C[Classificar prioridade com IA]
  C --> D{Importante?}
  D -- nao --> L1
  D -- sim --> E[Validar e salvar anexos]
  E --> F[Gerar resumo]
  F --> G[Enviar WhatsApp]
  G --> H[Registrar logs e metricas]
  H --> I[Dashboard]
```

## Seguranca
Credenciais criptografadas (`utils/crypto.py`), sanitizacao e validacao de anexos (`utils/sanitizer.py`, `utils/file_utils.py`), logs auditaveis, minimizacao de dados (LGPD).
