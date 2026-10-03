# Arquitetura e Fluxo Operacional

## Visão geral

```mermaid
flowchart LR
    O365[Outlook 365 / Microsoft Graph] -->|poll 1 min| B[Celery Beat]
    B --> Q[(Redis - fila)]
    Q --> W[Celery Workers]
    W --> AI[Claude API<br/>classificação + resumo]
    W --> AT[Attachment Handler<br/>/Emails_Importantes/AAAA/MM/DD/Remetente]
    W --> WA[WhatsApp API<br/>Twilio / Meta]
    W --> DB[(PostgreSQL)]
    API[FastAPI REST] --> DB
    UI[Next.js Dashboard] --> API
    NG[Nginx] --> UI
    NG --> API
```

## Fluxograma operacional

```mermaid
flowchart TD
    A[Início: tarefa agendada a cada 1 min] --> B[Buscar novos e-mails via Graph API]
    B --> C{E-mail já processado?}
    C -- Sim --> Z[Ignorar e registrar log]
    C -- Não --> D{Remetente spam/noreply?}
    D -- Sim --> Z
    D -- Não --> E[Classificar com IA: prioridade, categoria, resumo, spam]
    E --> F{IA indica spam/newsletter?}
    F -- Sim --> Z
    F -- Não --> G[Baixar e validar anexos<br/>extensão, tamanho, conteúdo malicioso]
    G --> H[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente<br/>renomeando duplicados]
    H --> I[OCR de imagens / texto de PDF]
    I --> J{Prioridade >= mínima configurada?}
    J -- Não --> K[Persistir no banco]
    J -- Sim --> L[Enviar resumo no WhatsApp]
    L --> K
    K --> M[Registrar logs e tempos]
    M --> N[Dashboard atualizado]
    Z --> N
```

## Camadas

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Ingestão | Microsoft Graph (OAuth2 client credentials) | Ler e-mails e anexos |
| Orquestração | Celery + Redis | Agendamento, filas, retentativas |
| IA | Claude API (tool_use) | Prioridade, resumo, spam |
| Persistência | PostgreSQL + Alembic | E-mails, anexos, notificações, logs |
| Entrega | Twilio / Meta WhatsApp | Notificação estruturada |
| API | FastAPI | Dashboard, notificações, configurações |
| UI | Next.js + Tailwind | Painel de controle |

## Segurança e LGPD

- Credenciais apenas via variáveis de ambiente; tokens/segredos criptografados (`utils/crypto.py`).
- Anexos validados por extensão permitida, tamanho e inspeção básica antes de gravar.
- Logs de processamento e notificações auditáveis em tabelas próprias.
- Recomenda-se política de retenção e base legal documentada para o conteúdo de e-mails (LGPD).

## Migrações

```bash
cd backend && alembic upgrade head
```
