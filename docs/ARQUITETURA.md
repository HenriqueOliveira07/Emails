# Arquitetura Corporativa e Fluxograma Operacional

## Visão de componentes

```mermaid
flowchart LR
    subgraph Fontes
        O365[Outlook 365<br/>Microsoft Graph]
    end
    subgraph Plataforma["Plataforma (Docker Compose)"]
        NGINX[Nginx<br/>reverse proxy/TLS]
        FE[Next.js + Tailwind<br/>Painel]
        API[FastAPI<br/>API REST]
        BEAT[Celery Beat<br/>agendador 60s]
        WK[Celery Workers]
        R[(Redis<br/>fila/cache)]
        PG[(PostgreSQL<br/>e-mails, logs, auditoria)]
        FS[/Volume<br/>/Emails_Importantes/]
    end
    subgraph Externos
        CL[Claude API]
        WA[WhatsApp API<br/>Meta Cloud / Twilio]
    end
    NGINX --> FE & API
    FE --> API --> PG
    BEAT --> R --> WK
    WK --> O365
    WK --> CL
    WK --> WA
    WK --> PG
    WK --> FS
```

## Fluxograma operacional (um ciclo)

```mermaid
flowchart TD
    A[Beat dispara check_new_emails a cada 60s] --> B[Token MSAL em cache?]
    B -- não --> B1[Client Credentials Flow] --> C
    B -- sim --> C[GET mensagens não lidas<br/>Graph API]
    C --> D{Já existe message_id<br/>no banco?}
    D -- sim --> Z[Pular]
    D -- não --> E[Classificar com Claude<br/>tool_use estruturado]
    E -- falha API --> E1[Fallback por palavras-chave]
    E & E1 --> F{Spam / newsletter?}
    F -- sim --> G[Log 'ignorado'] --> M[Commit + marcar como lido]
    F -- não --> H[Baixar anexos]
    H --> H1[Validar extensão/MIME/tamanho<br/>bloquear executáveis]
    H1 --> H2[Salvar em AAAA/MM/DD/Remetente<br/>nome único sem duplicidade]
    H2 --> H3[OCR imagens · texto PDF<br/>extração boleto/NF]
    H3 --> I[Gravar EmailRecord + anexos]
    I --> J{Prioridade CRÍTICO ou ALTO?}
    J -- sim --> K[Enviar WhatsApp] --> K1[NotificationLog<br/>SENT / FAILED]
    J -- não --> L[Somente painel]
    K1 & L --> M
    M --> N[Log de ciclo: contagens + tempo]
    I -. exceção .-> X[Rollback + log de erro<br/>e-mail permanece não lido<br/>e é reprocessado no próximo ciclo]
```

## Garantias de processamento

| Garantia | Como |
|---|---|
| Sem perda de e-mail | Marca como lido **somente após** commit no PostgreSQL |
| Sem duplicidade | `message_id` único + verificação antes do processamento |
| Isolamento de falhas | Commit/rollback por e-mail; erro em um não afeta os demais |
| Reenvio de notificações | `retry_failed_notifications` (até 3 tentativas) |
| Retenção LGPD | `cleanup_old_logs` remove logs além de `LOG_RETENTION_DAYS` |

## Rotinas agendadas (Celery Beat)

| Tarefa | Frequência | Função |
|---|---|---|
| `check_new_emails` | 60 s | ciclo principal |
| `retry_failed_notifications` | periódica | reenvia WhatsApp com falha |
| `send_daily_summary` | diária | resumo do dia via WhatsApp |
| `cleanup_old_logs` | diária | retenção de logs |

## Segurança

- Credenciais criptografadas em repouso (`app/utils/crypto.py`, Fernet).
- Sanitização de corpo/HTML e nomes de arquivo (`app/utils/sanitizer.py`).
- Bloqueio de anexos executáveis e limite de tamanho.
- Logs de auditoria persistidos em `processing_logs`.
- Princípio do menor privilégio no Azure AD: permissão `Mail.ReadWrite` restrita via *Application Access Policy* à caixa monitorada.
