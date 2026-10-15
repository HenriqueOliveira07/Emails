# Arquitetura e Fluxo Operacional

## Componentes

| Camada | Tecnologia | Função |
|---|---|---|
| Entrada | Microsoft Graph (Outlook 365) | Leitura de e-mails e anexos |
| API | FastAPI | REST, dashboard, configurações |
| Fila | Redis + Celery (worker + beat) | Polling a cada 1 min, processamento assíncrono |
| IA | Claude API (fallback por palavras-chave) | Prioridade, resumo, spam |
| Saída | WhatsApp (Twilio / Meta Cloud API) | Notificações |
| Dados | PostgreSQL | E-mails, anexos, notificações, logs |
| Frontend | Next.js + Tailwind | Painel de controle |
| Borda | Nginx | Proxy reverso / TLS |

## Fluxograma operacional

```mermaid
flowchart TD
    A[Celery beat: a cada 1 min] --> B[Buscar novos e-mails via Microsoft Graph]
    B --> C{Já processado?}
    C -- sim --> X[Ignorar + log]
    C -- não --> D{Remetente spam/newsletter?}
    D -- sim --> X
    D -- não --> E[Classificação IA: prioridade, categoria, resumo]
    E -- falha da API --> F[Fallback por palavras-chave]
    E --> G{Spam?}
    F --> G
    G -- sim --> X
    G -- não --> H[Salvar anexos em /Emails_Importantes/AAAA/MM/DD/Remetente/]
    H --> I{Prioridade relevante?}
    I -- sim --> J[Enviar resumo via WhatsApp]
    I -- não --> K[Apenas registrar]
    J --> L[Registrar notificação e logs]
    K --> L
    L --> M[Dashboard atualizado]
```

## Segurança
Credenciais criptografadas (Fernet), logs auditáveis, validação de extensão/tamanho de anexos, nomes de arquivo sanitizados e sem sobrescrita, mascaramento de dados pessoais nos logs (LGPD).
