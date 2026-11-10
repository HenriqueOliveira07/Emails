# Arquitetura Corporativa e Fluxo Operacional

## Componentes

```mermaid
flowchart LR
  O365[Outlook 365 / Microsoft Graph] --> W
  subgraph Backend
    B[Celery Beat 60s] --> W[Celery Worker]
    W --> C[Classificador Claude]
    W --> A[Attachment Handler]
    API[FastAPI] --> PG[(PostgreSQL)]
  end
  W <--> R[(Redis)]
  W --> PG
  W --> WA[WhatsApp Twilio/Meta]
  A --> FS[/Emails_Importantes/AAAA/MM/DD/Remetente/]
  FE[Next.js Dashboard] --> NG[Nginx] --> API
```

## Fluxo operacional

```mermaid
flowchart TD
  S[Beat: a cada 60s] --> F[Buscar e-mails novos no Graph]
  F --> D{Já processado?}
  D -- sim --> L1[Log: ignorado]
  D -- não --> SP{Spam / newsletter / remetente bloqueado?}
  SP -- sim --> L2[Log: ignorado]
  SP -- não --> AI[Claude: prioridade, categoria, resumo]
  AI --> AT[Salvar anexos permitidos, renomeando duplicados]
  AT --> P{CRÍTICO ou ALTO?}
  P -- sim --> WZ[Enviar WhatsApp] --> DB[(Registrar no PostgreSQL)]
  P -- não --> DB
  DB --> DASH[Dashboard / Logs]
```

## Segurança
- Credenciais criptografadas (Fernet); segredos só via `.env`.
- API protegida por `X-API-Key` (`API_ACCESS_TOKEN`); **obrigatório em produção**.
- Anexos: lista de extensões permitidas, executáveis bloqueados, nomes sanitizados.
- Logs auditáveis em banco; retenção configurável (LGPD).

## Limitações conhecidas
Ainda sem integração real testada contra Graph/WhatsApp (requer credenciais), e sem testes de integração.
