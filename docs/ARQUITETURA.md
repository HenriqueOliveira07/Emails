# Arquitetura e Fluxo Operacional

## Visão geral

```mermaid
flowchart LR
    subgraph Fontes
        O365[Outlook 365<br/>Microsoft Graph API]
    end
    subgraph Orquestração
        BEAT[Celery Beat<br/>a cada 60s] -->|enfileira| REDIS[(Redis<br/>broker + lock)]
        REDIS --> WORKER[Celery Workers<br/>filas high / low]
    end
    subgraph Inteligência
        CLAUDE[Claude API<br/>classificação + resumo]
        FALLBACK[Fallback por<br/>palavras-chave]
    end
    subgraph Saídas
        WA[WhatsApp<br/>Twilio / Meta]
        FS[/Emails_Importantes/<br/>AAAA/MM/DD/Remetente/]
        PG[(PostgreSQL<br/>e-mails, anexos,<br/>notificações, logs)]
    end
    O365 --> WORKER
    WORKER --> CLAUDE
    CLAUDE -. erro/timeout .-> FALLBACK
    WORKER --> WA
    WORKER --> FS
    WORKER --> PG
    API[FastAPI /api] --> PG
    API --> REDIS
    UI[Next.js Dashboard] --> NGINX[Nginx] --> API
```

| Camada | Componente | Responsabilidade |
|---|---|---|
| Ingestão | `services/email_reader.py` | Autenticação MSAL (client credentials), busca por janela de `receivedDateTime`, download de anexos |
| IA | `services/ai_classifier.py` | Prioridade (CRÍTICO/ALTO/MÉDIO/BAIXO), categoria, resumo, spam, ação requerida; resumo de PDF e extração de boleto/NF |
| Anexos | `services/attachment_handler.py` | Whitelist de extensões, bloqueio de executáveis/macros, verificação de assinatura binária, inspeção de ZIP, OCR, texto de PDF |
| Notificação | `services/whatsapp_sender.py` | Formato padronizado, horário local, Twilio ou Meta Cloud API |
| Orquestração | `workers/tasks.py` | Ciclo com lock distribuído, isolamento por e-mail, retentativas, resumo diário, limpeza de logs |
| Auditoria | `services/log_service.py` | Log JSON estruturado (stdout) + tabela `processing_logs` |
| API | `api/routes/*` | Dashboard, e-mails, notificações, configurações, health |

## Fluxograma operacional (um ciclo)

```mermaid
flowchart TD
    A([Beat dispara check_new_emails]) --> B{Lock Redis<br/>adquirido?}
    B -- não --> Z1([Pula: ciclo anterior em andamento])
    B -- sim --> C[Busca e-mails recebidos<br/>nos últimos N minutos]
    C -- falha --> E1[Log integration_error<br/>outlook_graph] --> Z2([Fim])
    C --> D[Descarta message_ids<br/>já presentes no banco]
    D --> F[Para cada e-mail novo]
    F --> G[Classifica com Claude]
    G -- API indisponível --> G2[Fallback palavras-chave]
    G --> H{Spam /<br/>newsletter?}
    G2 --> H
    H -- sim --> I[Registra is_spam=true<br/>log email_ignored] --> F
    H -- não --> J{Possui anexos?}
    J -- sim --> K[Valida extensão + conteúdo<br/>bloqueia maliciosos]
    K --> L[Salva em /Emails_Importantes/<br/>AAAA/MM/DD/Remetente/<br/>nome único]
    L --> M[OCR / texto PDF<br/>resumo + dados de boleto/NF]
    J -- não --> N
    M --> N[Grava e-mail + anexos<br/>COMMIT]
    N --> O{CRÍTICO ou ALTO?}
    O -- não --> Q
    O -- sim --> P[Envia WhatsApp<br/>registra NotificationLog]
    P -- falhou --> P2[status FAILED<br/>retry a cada 5 min, até 3x]
    P --> Q[Log email_processed<br/>tempo de processamento]
    P2 --> Q
    Q --> F
    F -- fim da lista --> R[Log cycle_complete] --> S([Libera lock])
```

## Garantias de robustez

- **Sem e-mails perdidos:** a busca usa uma janela de tempo (`EMAIL_LOOKBACK_MINUTES`), não o status "não lido". Abrir o e-mail no Outlook antes do ciclo não faz o sistema perdê-lo, e o sistema não altera o status de leitura do usuário (`MARK_AS_READ=false` por padrão).
- **Sem notificações duplicadas:** `message_id` é único no banco, o e-mail é gravado (commit) **antes** do envio do WhatsApp e um lock Redis impede ciclos concorrentes.
- **Falha isolada:** cada e-mail é processado e commitado individualmente; um e-mail malformado gera um `email_processing_error` auditado e não descarta os demais.
- **Event loop seguro:** cada tarefa Celery usa engine próprio com `NullPool` (conexões asyncpg não podem ser compartilhadas entre event loops).
- **IA com degradação controlada:** qualquer erro da Claude API cai no classificador por palavras-chave (busca por palavra inteira), marcado com `classified_by=fallback_keywords`.

## Segurança de anexos

| Verificação | Exemplo bloqueado |
|---|---|
| Extensão perigosa | `.exe`, `.ps1`, `.js`, `.hta`, `.lnk`, `.iso` |
| Arquivos com macro | `.xlsm`, `.docm`, `.pptm` |
| Fora da whitelist | qualquer extensão não listada em `ALLOWED_EXTENSIONS` |
| Executável disfarçado | `fatura.pdf` cujo conteúdo começa com `MZ` |
| Conteúdo × extensão | `.pdf` sem cabeçalho `%PDF` |
| ZIP | contendo executável, corrompido ou protegido por senha |

Imagens inline (logos de assinatura) e itens anexados (convites, e-mails encaminhados como item) não são salvos.

Cada bloqueio gera um registro `attachment_blocked` em `processing_logs`.

## Modelo de dados

```mermaid
erDiagram
    email_records ||--o{ email_attachments : possui
    email_records ||--o{ notification_logs : gera
    email_records {
        int id PK
        string message_id UK
        string sender_email
        string subject
        datetime received_at
        enum priority
        string category
        text ai_summary
        bool is_spam
        bool whatsapp_sent
    }
    email_attachments {
        int id PK
        int email_id FK
        string file_path
        text pdf_text
        text ocr_text
        text ai_summary
        json invoice_data
    }
    notification_logs {
        int id PK
        int email_id FK
        enum status
        int retry_count
        string external_id
    }
    processing_logs {
        int id PK
        string action
        json details
        bool success
        float duration_ms
    }
```
