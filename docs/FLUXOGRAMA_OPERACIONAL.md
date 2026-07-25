# Fluxograma Operacional

Fluxo de decisão executado a cada ciclo de processamento (`check_new_emails`,
`app/workers/tasks.py`).

```mermaid
flowchart TD
    A[Celery Beat dispara ciclo a cada CHECK_INTERVAL_SECONDS] --> B[Buscar e-mails não lidos via Microsoft Graph]
    B --> C{Há novos e-mails?}
    C -- Não --> Z[Registrar ciclo vazio e aguardar próximo tick]
    C -- Sim --> D[Para cada e-mail]
    D --> E{Já processado?<br/>message_id existe no banco}
    E -- Sim --> D
    E -- Não --> F[Classificar com IA - Claude]
    F --> G{É spam / newsletter / auto-reply?}
    G -- Sim --> H[Registrar como ignorado] --> D
    G -- Não --> I{Possui anexos?}
    I -- Sim --> J[Salvar em Emails_Importantes/AAAA/MM/DD/Remetente]
    J --> K[OCR em imagens / extração de texto em PDF]
    K --> L{Parece boleto/fatura/nota fiscal?}
    L -- Sim --> M[Extrair dados financeiros estruturados via IA]
    L -- Não --> N
    M --> N[Persistir anexo no banco]
    I -- Não --> N
    N --> O[Salvar e-mail classificado no banco]
    O --> P{Prioridade é CRÍTICO ou ALTO?}
    P -- Sim --> Q[Enviar notificação WhatsApp formatada]
    Q --> R{Envio teve sucesso?}
    R -- Sim --> S[Marcar e-mail como notificado]
    R -- Não --> T[Registrar falha para reenvio automático]
    P -- Não --> U[Somente registrar no dashboard]
    S --> D
    T --> D
    U --> D
    D --> V[Registrar métricas do ciclo:<br/>processados, ignorados, anexos, notificações, erros]
    V --> Z
```

## Tarefas periódicas complementares

Agendadas em `app/workers/celery_app.py::beat_schedule`:

| Tarefa | Frequência configurada | Função |
|---|---|---|
| `check_new_emails` | A cada `CHECK_INTERVAL_SECONDS` (padrão 60s) | Fluxo principal acima |
| `retry_failed_notifications` | A cada 5 min | Reenvia notificações WhatsApp que falharam (até 3 tentativas/dia) |
| `send_daily_summary` | Diariamente às 08:00 (America/Sao_Paulo) | Envia resumo consolidado via WhatsApp |
| `cleanup_old_logs` | Domingos às 02:00 (America/Sao_Paulo) | Remove `processing_logs` mais antigos que `LOG_RETENTION_DAYS` |
