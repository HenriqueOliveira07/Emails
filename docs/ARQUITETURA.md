# Arquitetura Corporativa e Fluxograma Operacional

## 1. Visão de componentes

```mermaid
flowchart LR
    subgraph Externos
        O365[(Outlook 365<br/>Microsoft Graph)]
        WA[WhatsApp API<br/>Twilio / Meta Cloud]
        CL[Claude API]
    end

    subgraph Plataforma["Docker Compose"]
        NG[NGINX<br/>reverse proxy]
        FE[Next.js + Tailwind<br/>Painel]
        BE[FastAPI<br/>API REST + X-API-Key]
        BEAT[Celery Beat<br/>agendador 60s]
        WK[Celery Workers<br/>filas high / low]
        RD[(Redis<br/>broker + resultados)]
        PG[(PostgreSQL<br/>e-mails, anexos, notificações, logs)]
        FS[/Volume<br/>/Emails_Importantes/]
        FL[Flower<br/>monitor de filas]
    end

    NG --> FE
    NG --> BE
    FE -->|/api| BE
    BEAT -->|enfileira| RD
    RD --> WK
    BE -->|trigger manual| RD
    WK -->|OAuth2 client credentials| O365
    WK -->|tool use: classificar_email| CL
    WK -->|notificação| WA
    WK --> PG
    WK --> FS
    BE --> PG
    BE -->|download seguro| FS
    FL --> RD
```

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Ingestão | Microsoft Graph (MSAL) | Busca e-mails não lidos, anexos e marca como lido |
| Orquestração | Celery Beat + Redis | Ciclo a cada `CHECK_INTERVAL_SECONDS` (padrão 60s), retry de notificações (5 min), resumo diário (08:00), limpeza de logs (domingo 02:00) |
| Inteligência | Claude API (tool use) + fallback por palavras-chave | Prioridade, categoria, resumo, detecção de spam/newsletter, ação requerida |
| Notificação | Twilio ou Meta WhatsApp Cloud API | Mensagem no formato `[CRÍTICO] …` para CRÍTICO e ALTO |
| Armazenamento | PostgreSQL + volume de arquivos | Registro completo e auditável; anexos em `/Emails_Importantes/AAAA/MM/DD/Remetente/` |
| Apresentação | FastAPI + Next.js | API REST protegida e painel (dashboard, e-mails, notificações, anexos, logs, configurações) |

## 2. Fluxograma operacional (um ciclo)

```mermaid
flowchart TD
    A([Celery Beat dispara<br/>check_new_emails]) --> B[Obter token MSAL<br/>cache até expirar]
    B --> C{Graph API OK?}
    C -- não --> C1[Log erro de integração<br/>outlook_fetch] --> Z
    C -- sim --> D[Lista de e-mails não lidos]
    D --> E{Para cada e-mail}
    E --> F{Já processado?<br/>message_id no banco}
    F -- sim --> E
    F -- não --> G[Classificar com Claude<br/>fallback: palavras-chave]
    G --> H[Marcar como lido no Outlook]
    H --> I{Spam / newsletter?}
    I -- sim --> I1[Log e-mail ignorado] --> E
    I -- não --> J{Possui anexos?}
    J -- sim --> K[Validar: extensão permitida,<br/>dupla extensão, magic bytes, tamanho]
    K --> K1[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/<br/>nome único]
    K1 --> K2[PDF → texto · Imagem → OCR · XML → NF-e<br/>extrair boleto/CNPJ/valor/vencimento]
    K2 --> L
    J -- não --> L[Gravar EmailRecord + anexos<br/>savepoint por e-mail]
    L --> M{Prioridade CRÍTICO ou ALTO?}
    M -- sim --> N[Enviar WhatsApp] --> N1{Enviado?}
    N1 -- sim --> N2[NotificationLog SENT]
    N1 -- não --> N3[NotificationLog FAILED<br/>retry a cada 5 min, até 3x]
    M -- não --> O
    N2 --> O[Log e-mail processado + duração]
    N3 --> O
    O --> E
    E -- fim do lote --> P[Log do ciclo: processados, ignorados,<br/>anexos, notificações, tempo total]
    P --> Z([Fim do ciclo])
```

Uma falha num e-mail desfaz apenas o *savepoint* daquele e-mail. Ela vira um log `email_processing` com o tipo do erro, e o restante do lote segue normalmente.

## 3. Segurança e LGPD

- **Controle de acesso:** todas as rotas `/api/*`, exceto `/api/health`, exigem o header `X-API-Key` (`API_ACCESS_KEY`), comparado em tempo constante.
- **Credenciais:** ficam em variáveis de ambiente/`.env` (fora do Git), com utilitário Fernet em `app/utils/crypto.py` para criptografar segredos em repouso.
- **Anexos maliciosos:** a lista de extensões permitidas fica fixa no código, com bloqueio de dupla extensão (`fatura.pdf.exe`), detecção de executáveis disfarçados por assinatura binária (MZ, ELF, Mach-O), proteção contra XXE nos XMLs e limite de tamanho.
- **Download:** o arquivo é resolvido dentro do diretório base, o que impede *path traversal*.
- **Auditoria:** a tabela `processing_logs` registra cada ação com sucesso/erro, tipo, mensagem e duração. A retenção é configurável (`LOG_RETENTION_DAYS`).
- **Minimização (LGPD):** a API de configurações não expõe credenciais, e a retenção de logs é limitada.

## 4. Escalabilidade

- Os workers escalam horizontalmente (`docker compose up -d --scale celery-worker=4`). A deduplicação por `message_id` (índice único) evita processamento duplo.
- Há filas separadas: `high` para ingestão e notificações e `low` para resumo e limpeza.
- `worker_prefetch_multiplier=1` e `task_acks_late=True` fazem uma tarefa interrompida voltar para a fila.
- O pool asyncpg é descartado ao fim de cada tarefa Celery, porque cada uma roda num event loop próprio.
