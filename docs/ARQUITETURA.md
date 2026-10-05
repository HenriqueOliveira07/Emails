# Arquitetura e Fluxo Operacional

## Componentes

```mermaid
flowchart LR
    O365[Outlook 365 / Microsoft Graph] -->|poll 1 min| W[Celery Worker]
    B[Celery Beat] --> W
    W --> R[(Redis - fila)]
    W --> C[Claude API - classificação]
    W --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
    W --> WA[WhatsApp - Twilio / Meta]
    W --> PG[(PostgreSQL)]
    API[FastAPI] --> PG
    FE[Next.js Dashboard] --> NG[Nginx] --> API
```

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Ingestão | Microsoft Graph (MSAL) | Leitura de e-mails e anexos |
| Fila | Redis + Celery (+ Beat, Flower) | Processamento assíncrono, retries |
| IA | Claude API (fallback por palavras-chave) | Prioridade, resumo, spam |
| Notificação | WhatsApp (Twilio / Meta) | Resumo estruturado |
| Persistência | PostgreSQL | E-mails, anexos, notificações, logs |
| API/UI | FastAPI + Next.js/Tailwind | Dashboard e REST |

## Fluxo operacional

```mermaid
flowchart TD
    A[Beat dispara a cada 1 min] --> B[Buscar e-mails novos]
    B --> C{Já processado?}
    C -- sim --> X[Ignorar + log]
    C -- não --> D{Remetente spam/newsletter?}
    D -- sim --> X
    D -- não --> E[Classificar com IA]
    E --> F{Spam?}
    F -- sim --> X
    F -- não --> G[Salvar anexos por Ano/Mês/Dia/Remetente]
    G --> H[OCR / resumo de PDF]
    H --> I{Prioridade >= mínima?}
    I -- não --> J[Registrar no banco]
    I -- sim --> K[Enviar WhatsApp]
    K --> J
    J --> L[Atualizar dashboard e logs]
```

## Segurança
Credenciais cifradas (Fernet), validação de extensões/tamanho de anexos, nomes de arquivo sanitizados e únicos, logs estruturados auditáveis, mascaramento de dados sensíveis (LGPD).
