# Arquitetura Corporativa

| Camada | Tecnologia | Responsabilidade |
|---|---|---|
| Borda | Nginx | Reverse proxy, TLS, rate limit |
| Frontend | Next.js + TailwindCSS | Dashboard (métricas, críticos, anexos, falhas, integrações, histórico) |
| API | FastAPI | REST, autenticação, configurações, consulta de dados |
| Fila | Redis + Celery (worker/beat) | Polling a cada 60s, processamento assíncrono, retentativas |
| IA | Claude API (tool_use) | Prioridade, categoria, resumo, spam; fallback por palavras-chave |
| Dados | PostgreSQL | E-mails, anexos, notificações, logs auditáveis |
| Integrações | Microsoft Graph (Outlook 365), WhatsApp API | Leitura de e-mails / envio de alertas |
| Armazenamento | `/Emails_Importantes/AAAA/MM/DD/Remetente/` | Anexos (PDF, XLSX, DOCX, CSV, ZIP, imagens, XML) |

## Segurança
- Credenciais criptografadas (Fernet) e segredos só por variáveis de ambiente.
- Anexos: lista de extensões permitidas, sanitização de nomes, bloqueio de executáveis.
- Logs estruturados e auditáveis; dados mínimos do corpo do e-mail armazenados (LGPD).

## Escalabilidade
Workers Celery escalam horizontalmente; a API é stateless; Redis desacopla a leitura do processamento.
