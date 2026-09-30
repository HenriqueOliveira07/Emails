# Arquitetura Corporativa e Fluxograma Operacional

## Visão geral

```mermaid
flowchart LR
    subgraph Fontes
        O365[Outlook 365 / Microsoft Graph]
        IMAP[IMAP / Gmail API]
    end
    subgraph Plataforma
        NGX[Nginx - TLS / reverse proxy]
        API[FastAPI - API REST]
        BEAT[Celery Beat - a cada 1 min]
        WRK[Celery Workers]
        RED[(Redis - filas)]
        PG[(PostgreSQL)]
        FS[(/Emails_Importantes/ AAAA/MM/DD/Remetente)]
        UI[Next.js + Tailwind - Painel]
    end
    subgraph Externos
        CL[Claude API - classificação e resumo]
        WA[WhatsApp API - Twilio / Meta]
    end
    O365 --> WRK
    IMAP --> WRK
    BEAT --> RED --> WRK
    WRK --> CL
    WRK --> WA
    WRK --> PG
    WRK --> FS
    UI --> NGX --> API --> PG
    API --> RED
```

## Fluxograma operacional

```mermaid
flowchart TD
    A[Celery Beat dispara verificação 1/min] --> B[Buscar novos e-mails - Graph / IMAP]
    B --> C{Já processado? message-id no banco}
    C -- sim --> Z[Ignorar e registrar log]
    C -- não --> D[Sanitizar corpo e extrair metadados]
    D --> E{Spam / newsletter / filtro de remetente?}
    E -- sim --> Y[Marcar IGNORADO + log]
    E -- não --> F[Classificação por IA + palavras-chave]
    F --> G{Prioridade}
    G -- BAIXO --> X[Registrar sem notificar]
    G -- MÉDIO / ALTO / CRÍTICO --> H[Gerar resumo inteligente]
    H --> I{Possui anexos?}
    I -- sim --> J[Validar tipo/tamanho/assinatura, renomear sem duplicidade, salvar em AAAA/MM/DD/Remetente]
    I -- não --> K
    J --> K[Enviar mensagem WhatsApp]
    K --> L{Sucesso?}
    L -- sim --> M[Registrar notificação + tempo de processamento]
    L -- não --> N[Retry com backoff exponencial + log de erro]
    N --> K
    M --> O[Dashboard atualizado]
```

## Camadas e responsabilidades

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Apresentação | Next.js, TailwindCSS | Dashboard: métricas, críticos do dia, anexos, falhas, integrações, histórico |
| Borda | Nginx | TLS, rate limiting, roteamento `/api` e `/` |
| API | FastAPI | REST, autenticação, configurações, consulta de e-mails/notificações |
| Processamento | Celery + Redis | Polling a cada 1 min, pipeline assíncrono, retries, escala horizontal de workers |
| IA | Claude API (OpenAI opcional) | Prioridade, resumo, tipo (aprovação, cobrança, contrato...) |
| Persistência | PostgreSQL | E-mails, anexos, notificações, logs auditáveis |
| Armazenamento | Volume `/Emails_Importantes/` | Anexos organizados por Ano/Mês/Dia/Remetente |

## Escalabilidade e resiliência

- Workers Celery stateless: `docker compose up --scale worker=N`.
- Idempotência por `message-id`; reprocessamento seguro.
- Retries com backoff exponencial em Graph, Claude e WhatsApp; falhas registradas em log e no painel.
- Healthchecks nos containers; filas desacopladas por Redis.

## Segurança e LGPD

- Credenciais e tokens criptografados em repouso (Fernet); segredos apenas via variáveis de ambiente.
- Anexos: lista de extensões permitidas (PDF, XLSX, DOCX, CSV, ZIP, imagens, XML), limite de tamanho, checagem de assinatura/magic bytes, nomes sanitizados contra path traversal.
- Logs auditáveis com mascaramento de dados pessoais; retenção configurável.
- Princípio do menor privilégio no Azure AD (`Mail.Read`); acesso ao painel autenticado.

## Roadmap (funcionalidades avançadas)

Aprendizado contínuo de prioridades (feedback do usuário), resposta automática opcional, resumo de PDF, OCR de imagens, extração de dados de boletos/NF-e, agrupamento por assunto, filtros por remetente.
