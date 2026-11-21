# Arquitetura e Fluxograma Operacional

## Visão corporativa

```mermaid
flowchart LR
    subgraph M365[Microsoft 365]
        OUT[Outlook 365 / Exchange Online]
    end
    subgraph Stack[Docker Compose]
        NGX[Nginx :80] --> FE[Next.js Dashboard :3000]
        NGX --> API[FastAPI :8000]
        BEAT[Celery Beat<br/>a cada 60s] -->|enfileira| RDS[(Redis<br/>fila high/low)]
        RDS --> WRK[Celery Worker]
        WRK --> PG[(PostgreSQL)]
        API --> PG
        WRK --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
        FLW[Flower :5555] --> RDS
    end
    WRK -->|Graph API + MSAL| OUT
    WRK -->|classificação / resumo| CL[Claude API]
    WRK -->|mensagem| WA[WhatsApp<br/>Twilio ou Meta Cloud API]
```

## Fluxograma de processamento (a cada ciclo)

```mermaid
flowchart TD
    A[Beat dispara check_new_emails] --> B[Busca não lidos na Inbox via Graph]
    B -->|falha| Z1[Log de erro de integração<br/>ciclo encerra; próximo ciclo tenta de novo]
    B --> C{Já existe no banco?}
    C -->|sim| C1[Marca como lido e pula]
    C -->|não| D[Classifica com Claude<br/>fallback: palavras-chave]
    D --> E{Spam / newsletter?}
    E -->|sim| E1[Log 'ignorado' → commit → marca lido]
    E -->|não| F{Tem anexos?}
    F -->|sim| G[Baixa anexos → whitelist de extensões<br/>bloqueia executáveis / inline / > limite]
    G --> H[Salva em /Emails_Importantes/AAAA/MM/DD/Remetente/<br/>renomeia se duplicado · OCR imagens · texto PDF]
    F -->|não| I
    H --> I[Grava EmailRecord + anexos no PostgreSQL]
    I --> J{Prioridade CRÍTICO ou ALTO?}
    J -->|sim| K[Envia WhatsApp formatado<br/>registra NotificationLog]
    J -->|não| L
    K --> L[Commit da transação]
    L --> M[Marca como lido no Outlook]
    D & G & I & K -.->|exceção| R[Rollback só deste e-mail<br/>fica não lido → reprocessado no próximo ciclo]
```

## Rotinas agendadas

| Rotina | Frequência | Fila |
|---|---|---|
| `check_new_emails` | `CHECK_INTERVAL_SECONDS` (padrão 60s) | high |
| `retry_failed_notifications` | 5 min (até 3 tentativas) | high |
| `send_daily_summary` | 08:00 America/Sao_Paulo | low |
| `cleanup_old_logs` | domingo 02:00 (`LOG_RETENTION_DAYS`) | low |

## Garantias de consistência

- **Nenhum e-mail se perde:** ele só é marcado como lido depois que o registro foi gravado no banco.
- **Isolamento de falhas:** cada e-mail é uma transação; se um falhar, ele é desfeito e o resto do lote segue.
- **Idempotência:** `message_id` único evita processar duas vezes e notificar em duplicidade.

## Segurança

- API REST protegida por `X-API-Key` (`API_KEY`); sem chave configurada, o acesso fica livre e um aviso aparece no log (use isso só em desenvolvimento).
- `NEXT_PUBLIC_API_KEY` fica embutida no bundle do dashboard. Exponha o dashboard só na rede interna/VPN, ou coloque SSO (ex.: Azure AD via oauth2-proxy) na frente do Nginx.
- Credenciais criptografadas com Fernet (`ENCRYPTION_KEY`), sem segredos versionados (`.env` fica no `.gitignore`).
- Anexos: whitelist (PDF, XLSX/XLS, DOCX/DOC, CSV, ZIP, imagens, XML, TXT) e bloqueio de executáveis.
- LGPD: retenção configurável de logs; os dados ficam só na infraestrutura própria e no provedor de IA contratado.
