# Arquitetura e Fluxo Operacional

## Componentes

```mermaid
flowchart LR
  U[Usuário] --> N[Nginx]
  N --> F[Next.js Dashboard]
  N --> B[FastAPI]
  B --> P[(PostgreSQL)]
  B --> R[(Redis)]
  R --> W[Celery Workers]
  BT[Celery Beat 60s] --> R
  W --> G[Microsoft Graph / Outlook 365]
  W --> C[Claude API]
  W --> WA[WhatsApp API]
  W --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
  W --> P
```

## Fluxo operacional

```mermaid
flowchart TD
  A[Beat dispara a cada 60s] --> B[Buscar e-mails novos no Graph]
  B --> C{Já processado?}
  C -- sim --> X[Ignorar e logar]
  C -- não --> D[Classificar com Claude]
  D -->|falha da API| D2[Fallback por palavras-chave]
  D --> E{Spam / newsletter?}
  D2 --> E
  E -- sim --> X
  E -- não --> F[Atribuir prioridade CRÍTICO/ALTO/MÉDIO/BAIXO]
  F --> G{Tem anexos?}
  G -- sim --> H[Validar tipo e sanitizar, salvar em AAAA/MM/DD/Remetente com nome único]
  G -- não --> I
  H --> I{Prioridade >= limiar?}
  I -- sim --> J[Enviar resumo no WhatsApp]
  I -- não --> K[Apenas registrar]
  J --> L[Persistir resultado e logs]
  K --> L
  L --> M[Dashboard]
```

## Segurança
Credenciais criptografadas (Fernet), validação de extensão/tamanho de anexos, nomes sanitizados contra path traversal, logs estruturados e auditáveis, retenção conforme LGPD.
