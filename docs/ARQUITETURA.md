# Arquitetura e Fluxo Operacional

## Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Proxy | Nginx | Entrada única (`/` → frontend, `/api/` → backend) |
| API | FastAPI | Dashboard, e-mails, notificações, configurações (protegida por `X-API-Key`) |
| Agendador | Celery Beat | Dispara `check_new_emails` a cada 60s, resumo diário, retry, limpeza de logs |
| Workers | Celery + Redis | Leitura Graph API, classificação Claude, anexos, WhatsApp |
| Banco | PostgreSQL | E-mails, anexos, notificações e logs de processamento |
| Frontend | Next.js + Tailwind | Painel de controle |

## Fluxograma operacional

```mermaid
flowchart TD
    A[Celery Beat - 60s] --> B[check_new_emails]
    B --> C[Microsoft Graph: e-mails não lidos]
    C --> D{message_id já existe?}
    D -- sim --> Z[Pula]
    D -- não --> E{Remetente bloqueado?}
    E -- sim --> L1[Log: ignorado]
    E -- não --> F[Claude: prioridade, resumo, spam]
    F --> G{Spam/newsletter?}
    G -- sim --> L1
    G -- não --> H[Baixa e valida anexos]
    H --> I[/Emails_Importantes/AAAA/MM/DD/Remetente/]
    I --> J[(PostgreSQL)]
    J --> K{CRÍTICO ou ALTO?}
    K -- sim --> M[WhatsApp Twilio/Meta]
    M --> N[NotificationLog]
    K -- não --> O[Apenas painel]
    N --> P[Logs de processamento]
    O --> P
    M -. falha .-> R[retry_failed_notifications]
```

## Segurança

- `API_KEY`: define-a no `.env`; todas as rotas `/api/*` (exceto `/api/health`) exigem `X-API-Key`. Vazia = desativado (somente desenvolvimento).
- `NEXT_PUBLIC_API_KEY` é exposta no bundle do navegador; em produção prefira injetar o header no Nginx e proteger o acesso ao painel (VPN/SSO/basic auth).
- Credenciais criptografadas (Fernet), bloqueio de extensões executáveis, logs auditáveis com retenção configurável.
- `BLOCKED_SENDER_PATTERNS`: filtro personalizado por remetente.

## Limitações conhecidas

- Gmail/IMAP: apenas Outlook 365 (Graph) está implementado.
- Sem migrações Alembic (tabelas via `create_all`).
- Aprendizado contínuo e resposta automática não implementados.
