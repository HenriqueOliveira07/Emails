# Arquitetura e Fluxo Operacional

## Componentes
- **Nginx**: proxy reverso (frontend `/`, API `/api`).
- **Frontend (Next.js + Tailwind)**: dashboard, atualização a cada 30s.
- **Backend (FastAPI)**: API REST, health, configurações.
- **Celery Beat/Workers + Redis**: verificação a cada 60s e processamento assíncrono.
- **PostgreSQL**: e-mails, anexos, notificações, logs de auditoria.
- **Integrações**: Microsoft Graph (Outlook 365), Claude API (classificação/resumo), WhatsApp (Twilio/Meta).

## Fluxograma operacional

```mermaid
flowchart TD
    A[Celery Beat: a cada 60s] --> B[check_new_emails]
    B --> C[Microsoft Graph: buscar não processados]
    C --> D{Já processado?}
    D -- sim --> X[Ignorar + log]
    D -- não --> E{Spam / newsletter / filtro?}
    E -- sim --> X
    E -- não --> F[Claude: prioridade + resumo]
    F --> G[Salvar e-mail no PostgreSQL]
    G --> H{Possui anexos?}
    H -- sim --> I[Validar tipo/tamanho -> salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/]
    H -- não --> J
    I --> J{CRÍTICO ou ALTO?}
    J -- sim --> K[Enviar WhatsApp]
    J -- não --> L[Somente registrar]
    K --> M[Registrar notificação e logs]
    L --> M
    M --> N[Dashboard]
```

## Segurança
Credenciais criptografadas (Fernet), bloqueio de extensões executáveis, nomes de arquivo sanitizados e
deduplicados, logs auditáveis e retenção configurável (LGPD).

## Escalabilidade
Workers Celery horizontais (`--scale celery-worker=N`), fila Redis, pool de conexões PostgreSQL.
