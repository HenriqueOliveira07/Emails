# Arquitetura Corporativa e Fluxograma Operacional

## Componentes

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Borda | Nginx | Reverse proxy, TLS, roteamento `/` e `/api` |
| Frontend | Next.js + Tailwind | Dashboard (KPIs, críticos do dia, anexos, falhas, integrações, histórico) |
| API | FastAPI | REST, autenticação, configurações, consulta de logs |
| Fila | Redis + Celery (worker/beat) | Polling a cada 60s, processamento assíncrono |
| IA | Claude API (tool use) | Prioridade, categoria, resumo, detecção de spam |
| Dados | PostgreSQL | E-mails, anexos, notificações, logs auditáveis |
| Integrações | Microsoft Graph (Outlook 365), WhatsApp (Twilio/Meta) | Leitura de e-mails / envio de alertas |
| Armazenamento | `/Emails_Importantes/AAAA/MM/DD/Remetente/` | Anexos com nomes únicos |

## Fluxograma operacional

```mermaid
flowchart TD
    A[Celery Beat - 60s] --> B[check_new_emails]
    B --> C[Microsoft Graph: buscar novos e-mails]
    C --> D{E-mail já processado?}
    D -- Sim --> X[Ignora + log]
    D -- Não --> E[Pré-filtro: spam/newsletter/filtros por remetente]
    E -- Descartado --> X
    E -- Passou --> F[Claude: classificar + resumir]
    F --> G{is_spam?}
    G -- Sim --> X
    G -- Não --> H[Salvar e-mail no PostgreSQL]
    H --> I{Possui anexos?}
    I -- Sim --> J[Validar tipo/tamanho/malware] --> K[Salvar em /Emails_Importantes/AAAA/MM/DD/Remetente/]
    I -- Não --> L
    K --> L{Prioridade CRÍTICO ou ALTO?}
    L -- Sim --> M[Enviar resumo via WhatsApp]
    L -- Não --> N[Apenas registrar]
    M --> O[Log: notificação, tempo de processamento]
    N --> O
    X --> O
    O --> P[Dashboard / API]
    M -. falha .-> R[Retry com backoff + log de erro]
```

## Segurança e LGPD

- Credenciais criptografadas em repouso (`utils/crypto.py`); segredos somente via variáveis de ambiente.
- Sanitização de nomes de arquivo e bloqueio de extensões perigosas (`utils/sanitizer.py`, `utils/file_utils.py`).
- Logs estruturados e auditáveis; minimização de dados pessoais nos logs.
- Princípio do menor privilégio no Azure AD (`Mail.Read`).
