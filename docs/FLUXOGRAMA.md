# Fluxograma Operacional

```mermaid
flowchart TD
  A[Celery Beat — a cada 60s] --> B[check_new_emails]
  B --> C{Graph API OK?}
  C -- não --> C1[Log de erro de integração<br/>retry com backoff] --> Z[Fim do ciclo]
  C -- sim --> D[Para cada e-mail novo]
  D --> E{Já processado?<br/>message_id}
  E -- sim --> D
  E -- não --> G[Claude: classificar<br/>prioridade, resumo, categoria, spam]
  G -- falha --> G1[Fallback por palavras-chave]
  G --> F{Spam / newsletter?}
  G1 --> F
  F -- sim --> F1[Marcar IGNORADO + log] --> D
  F -- não --> H
  H{Tem anexos?}
  H -- sim --> I[Validar extensão/tamanho<br/>salvar em AAAA/MM/DD/Remetente<br/>OCR / resumo PDF]
  H -- não --> J
  I --> J{Prioridade CRÍTICO ou ALTO?}
  J -- sim --> K[Enviar WhatsApp<br/>registrar NotificationLog]
  J -- não --> L
  K --> L[Gravar EmailRecord + ProcessingLog<br/>tempo de processamento]
  L --> D
  D -- fim da lista --> M[Estatísticas do ciclo] --> Z
```

## Rotinas agendadas

| Rotina | Frequência | Função |
|---|---|---|
| `check_new_emails` | 60s | Ciclo principal acima |
| `send_daily_summary` | diária, 08:00 | Resumo do dia via WhatsApp |
| `retry_failed_notifications` | 5 min | Reenvio de notificações WhatsApp que falharam |
| `cleanup_old_logs` | semanal, domingo 02:00 | Retenção de logs e limpeza de pastas vazias |
