# Arquitetura corporativa e fluxograma operacional

## Componentes

```mermaid
flowchart LR
  subgraph Fontes
    O365[Outlook 365 / Microsoft Graph]
    IMAP[IMAP]
    GM[Gmail API]
  end
  subgraph Backend
    BEAT[Celery Beat - 1 min] --> W[Celery Workers]
    W --> API[FastAPI REST]
  end
  O365 --> W
  IMAP --> W
  GM --> W
  W <--> R[(Redis - filas)]
  W <--> PG[(PostgreSQL)]
  W --> AI[Claude API - classificação e resumo]
  W --> FS[/Emails_Importantes/ano/mes/dia/remetente/]
  W --> WA[WhatsApp API]
  FE[Next.js Dashboard] --> NGX[Nginx] --> API
  API --> PG
```

## Fluxo operacional

```mermaid
flowchart TD
  A[Beat dispara a cada 1 min] --> B[Buscar novos e-mails]
  B --> C{Já processado?}
  C -- sim --> Z[Ignorar e logar]
  C -- não --> D[Filtro de spam/newsletter e filtros por remetente]
  D -- irrelevante --> Z
  D -- ok --> E[Classificação IA + palavras-chave]
  E --> F{Prioridade}
  F -- BAIXO --> G[Registrar sem notificar]
  F -- MÉDIO/ALTO/CRÍTICO --> H[Gerar resumo]
  H --> I[Baixar anexos, validar tipo/malware, renomear sem duplicidade]
  I --> J[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/]
  J --> K[Enviar WhatsApp]
  K --> L{Sucesso?}
  L -- não --> M[Retry com backoff e log de erro]
  L -- sim --> N[Registrar notificação]
  G --> O[Dashboard e logs auditáveis]
  M --> O
  N --> O
  Z --> O
```

## Segurança

- Credenciais criptografadas em repouso (`utils/crypto.py`, Fernet); segredos apenas via variáveis de ambiente.
- Sanitização de nomes e caminhos de anexos; whitelist de extensões (PDF, XLSX, DOCX, CSV, ZIP, imagens, XML).
- Logs auditáveis em banco; dados pessoais minimizados nos logs (LGPD).
- Nginx como único ponto de entrada; PostgreSQL e Redis fora da rede pública.
