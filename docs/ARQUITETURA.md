# Arquitetura e Fluxo Operacional

## Visão geral

```mermaid
flowchart LR
    O365[Outlook 365 / Microsoft Graph] --> W[Celery Worker]
    IMAP[IMAP / Gmail API] --> W
    B[Celery Beat - a cada 1 min] --> W
    W <--> R[(Redis - filas)]
    W --> AI[Claude API - classificação]
    W --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
    W --> WA[WhatsApp API]
    W <--> PG[(PostgreSQL)]
    API[FastAPI] <--> PG
    FE[Next.js Dashboard] --> NG[Nginx] --> API
```

## Fluxograma operacional

```mermaid
flowchart TD
    A[Beat dispara a cada 1 min] --> B[Buscar novos e-mails]
    B --> C{Já processado?}
    C -- sim --> Z[Registrar como ignorado]
    C -- não --> D{Spam / newsletter / filtro de remetente?}
    D -- sim --> Z
    D -- não --> E[Classificar com IA: CRÍTICO / ALTO / MÉDIO / BAIXO]
    E --> F{Possui anexos?}
    F -- sim --> G[Validar tipo e scan de malware]
    G --> H[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/ com nome único]
    F -- não --> I
    H --> I{Prioridade importante?}
    I -- sim --> J[Enviar resumo via WhatsApp]
    I -- não --> K
    J --> K[Persistir resultado e logs no PostgreSQL]
    K --> L[Dashboard atualizado]
    Z --> K
```

## Segurança
- Credenciais criptografadas (Fernet) em repouso; tokens via variáveis de ambiente.
- Anexos validados por extensão/tipo permitido e isolados do restante do sistema.
- Logs auditáveis no banco; dados pessoais minimizados (LGPD).
