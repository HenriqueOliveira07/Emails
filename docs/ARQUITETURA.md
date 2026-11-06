# Arquitetura Corporativa e Fluxograma Operacional

## 1. Visão geral dos componentes

```mermaid
flowchart LR
    subgraph Externo
        O365[Outlook 365\nMicrosoft Graph]
        CL[Claude API]
        WA[WhatsApp API]
    end
    subgraph Plataforma[Docker Compose]
        NG[Nginx] --> FE[Next.js Dashboard]
        NG --> API[FastAPI]
        BEAT[Celery Beat 60s] --> RQ[(Redis)]
        RQ --> WK[Celery Workers]
        API --> PG[(PostgreSQL)]
        WK --> PG
        WK --> FS[(/Emails_Importantes)]
    end
    WK <--> O365
    WK --> CL
    WK --> WA
```

## 2. Fluxograma operacional

```mermaid
flowchart TD
    A[Celery Beat: a cada 1 min] --> B[check_new_emails]
    B --> C[Buscar novos e-mails via Microsoft Graph]
    C --> D{Já processado?}
    D -- sim --> Z[Ignorar + log]
    D -- não --> E[Filtro de spam/newsletter + filtros por remetente]
    E -- irrelevante --> Z
    E -- relevante --> F[Classificação IA: CRÍTICO/ALTO/MÉDIO/BAIXO]
    F --> G[Salvar anexos AAAA/MM/DD/Remetente\nvalidação de tipo e anti-malware, nome único]
    G --> H{Prioridade >= limiar?}
    H -- não --> I[Registrar no banco e logs]
    H -- sim --> J[Enviar resumo via WhatsApp]
    J -- falha --> K[Retry com backoff + log de erro]
    J -- ok --> I
    I --> L[Dashboard: métricas, histórico, status]
```

## 3. Camadas e responsabilidades

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Borda | Nginx | TLS, roteamento, rate limit |
| Apresentação | Next.js + Tailwind | Dashboard, histórico, status |
| API | FastAPI | REST, autenticação, configurações |
| Processamento | Celery + Redis | Polling, IA, anexos, notificações |
| Persistência | PostgreSQL | E-mails, anexos, notificações, logs |
| Arquivos | Volume `/Emails_Importantes` | Anexos por ano/mês/dia/remetente |

## 4. Segurança e LGPD

- Credenciais criptografadas em repouso (`utils/crypto.py`); segredos apenas via variáveis de ambiente.
- Sanitização de nomes/conteúdo (`utils/sanitizer.py`) e allowlist de extensões (PDF, XLSX, DOCX, CSV, ZIP, imagens, XML).
- Logs auditáveis sem corpo completo do e-mail; minimização de dados e retenção configurável.
- Princípio do menor privilégio nas permissões do app no Azure (somente `Mail.Read`).

## 5. Escalabilidade

- Workers Celery horizontais (`docker compose up --scale worker=N`).
- Idempotência por `message_id` evita duplicidade em reprocessamentos.
- Filas separadas por tipo de tarefa permitem priorizar notificações críticas.
