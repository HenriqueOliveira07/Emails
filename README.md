# Sistema de Monitoramento de E-mails com WhatsApp

Sistema corporativo automatizado para monitoramento inteligente de e-mails com classificação por IA (Claude) e notificações via WhatsApp.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                         NGINX (porta 80)                        │
│                    Reverse Proxy / Load Balancer                │
└────────────────────┬───────────────────────┬────────────────────┘
                     │                       │
          ┌──────────▼──────────┐  ┌────────▼────────┐
          │   Frontend Next.js  │  │  Backend FastAPI │
          │     (porta 3000)    │  │   (porta 8000)   │
          └─────────────────────┘  └────────┬────────┘
                                            │
                     ┌──────────────────────┼──────────────────────┐
                     │                      │                      │
           ┌─────────▼──────┐    ┌──────────▼──────┐    ┌─────────▼──────┐
           │   PostgreSQL   │    │     Redis        │    │  Celery Beat   │
           │    (dados)     │    │  (fila/cache)    │    │  (agendador)   │
           └────────────────┘    └─────────────────┘    └────────────────┘
                                          │
                              ┌───────────▼───────────┐
                              │    Celery Workers      │
                              │  (processamento IA)    │
                              └───────────────────────┘
```

## Fluxo de Processamento

```
Celery Beat (60s)
      │
      ▼
check_new_emails()
      │
      ▼
OutlookEmailReader ──► Microsoft Graph API
      │
      ▼
AIClassifier (Claude) ──► Prioridade + Resumo
      │
      ├── CRÍTICO/ALTO ──► WhatsAppSender ──► Notificação imediata
      │
      ├── AttachmentHandler ──► /Emails_Importantes/YYYY/MM/DD/Sender/
      │
      └── PostgreSQL ──► Registro completo + Logs
```

## Pré-requisitos

- Docker e Docker Compose v2+
- Conta Microsoft Azure com App Registration configurado
- API do WhatsApp (Twilio ou Meta Business)
- Chave API da Anthropic (Claude)

## Instalação Rápida

```bash
# 1. Clone o repositório
git clone https://github.com/henriqueoliveira07/emails.git
cd emails

# 2. Configure as variáveis de ambiente
cp .env.example .env
nano .env  # Preencha todas as variáveis obrigatórias

# 3. Suba os serviços
docker compose up -d

# 4. Verifique os logs
docker compose logs -f backend
docker compose logs -f celery-worker
```

## Configuração do Azure AD

1. Acesse [portal.azure.com](https://portal.azure.com)
2. **Azure Active Directory** → **Registros de aplicativo** → **Novo registro**
3. Nome: `Email Monitor`, tipo: **Contas neste diretório organizacional**
4. Em **Permissões de API** adicione (tipo **Aplicativo**):
   - `Mail.Read`
   - `Mail.ReadWrite`
   - `User.Read.All`
5. **Conceder consentimento do administrador**
6. Em **Certificados e segredos** crie um novo segredo
7. Copie: Client ID, Client Secret, Tenant ID → `.env`

## Configuração WhatsApp

### Twilio (recomendado para testes)
1. Crie conta em [twilio.com](https://twilio.com)
2. Ative o WhatsApp Sandbox
3. Configure `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`
4. `WHATSAPP_PROVIDER=twilio`

### Meta Business API (produção)
1. Crie app em [developers.facebook.com](https://developers.facebook.com)
2. Adicione produto **WhatsApp**
3. Configure `META_WHATSAPP_PHONE_NUMBER_ID`, `META_WHATSAPP_ACCESS_TOKEN`
4. `WHATSAPP_PROVIDER=meta`

## Serviços e Portas

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| Nginx | 80 | Proxy principal |
| Frontend | 3000 | Dashboard Next.js |
| Backend | 8000 | API FastAPI |
| Flower | 5555 | Monitor Celery |

## Dashboard

Acesse `http://localhost` após iniciar os serviços.

**Funcionalidades:**
- Estatísticas em tempo real (atualização a cada 30s)
- Gráfico de distribuição por prioridade
- Tabela de e-mails com detalhes expandíveis
- Log de notificações WhatsApp enviadas
- Indicador de status das integrações
- Botão "Verificar Agora" para disparo manual

## API REST

Documentação completa: `http://localhost:8000/api/docs`

Principais endpoints:

```
GET  /api/dashboard/stats          # Estatísticas do dia
GET  /api/dashboard/recent-emails  # E-mails recentes
GET  /api/emails                   # Lista com filtros
POST /api/emails/{id}/reclassify   # Re-classificar com IA
GET  /api/dashboard/health         # Status das integrações
POST /api/settings/trigger-check   # Disparar verificação manual
POST /api/settings/trigger-summary # Enviar resumo diário
```

## Organização de Anexos

```
/Emails_Importantes/            (volume Docker `attachments_data`)
└── 2026/
    └── 05/
        └── 26/                 (data local, fuso TIMEZONE — padrão America/Sao_Paulo)
            └── Fornecedor_X/   (nome do remetente, espaços viram "_")
                ├── boleto_maio_2026.pdf
                ├── boleto_maio_2026_abc6f2.pdf   (duplicata renomeada)
                └── nf_12345.xml
```

Regras de segurança aplicadas a cada anexo:

- Só são salvos tipos da lista permitida: PDF, XLSX/XLS, DOCX/DOC, CSV, ZIP, imagens (JPG, PNG, GIF, BMP, TIFF, WEBP), XML e TXT.
- Executáveis e scripts são bloqueados, inclusive com dupla extensão (`fatura.pdf.exe`).
- O conteúdo é conferido pelos *magic bytes*: um executável renomeado para `.pdf` é bloqueado.
- Imagens embutidas na assinatura (logos inline) e itens anexados (e-mails encaminhados) são ignorados.

## Prioridades

| Nível | Cor | Exemplos | WhatsApp |
|-------|-----|----------|----------|
| CRÍTICO | 🔴 | Sistema parado, emergência, vencimento hoje | ✅ Imediato |
| ALTO | 🟠 | Aprovações, contratos, pagamentos, diretoria | ✅ Imediato |
| MÉDIO | 🟡 | Fornecedores, clientes, pendências | ❌ |
| BAIXO | 🟢 | Informativos, atualizações rotineiras | ❌ |

## Testes

```bash
cd backend
python -m venv .venv && . .venv/bin/activate
pip install -r requirements-dev.txt aiosqlite
pytest -q
```

A suíte roda sem serviços externos: usa SQLite e simula Outlook e WhatsApp. Ela cobre a classificação por palavras-chave (sem acentos, só palavras inteiras), o formato da mensagem WhatsApp, a organização e o bloqueio de anexos, o cache do token MSAL e um ciclo completo de ponta a ponta, incluindo a deduplicação entre ciclos.

## Garantias do ciclo de leitura

- **Sem sobreposição:** um lock no Redis impede que dois ciclos de 1 minuto rodem ao mesmo tempo e notifiquem em duplicidade.
- **Sem perda:** o e-mail só é marcado como lido no Outlook depois de gravado no banco. Se algo falhar, ele continua não lido e é reprocessado.
- **Isolamento de falhas:** cada e-mail roda num savepoint próprio, então um e-mail com erro não desfaz o lote. A falha fica registrada em `processing_logs`.
- **IA resiliente:** sem `ANTHROPIC_API_KEY`, ou se a API falhar, a classificação cai para as regras de palavras-chave.

## Comandos Úteis

```bash
# Ver logs em tempo real
docker compose logs -f celery-worker

# Disparar verificação manual
docker compose exec backend python -c "
from app.workers.tasks import check_new_emails
check_new_emails.delay()
"

# Acessar banco de dados
docker compose exec postgres psql -U emails_user -d emails_db

# Escalar workers
docker compose up -d --scale celery-worker=3

# Ver tarefas no Flower
open http://localhost:5555
```

## Segurança e LGPD

- Credenciais criptografadas com Fernet (AES-128-CBC + HMAC-SHA256)
- Tokens JWT com expiração configurável
- Validação de tipos de arquivo (bloqueio de executáveis)
- Logs de auditoria completos com retenção configurável
- Sem armazenamento de senhas em texto plano
- Conexões PostgreSQL com pool e timeout

## Variáveis de Ambiente Obrigatórias

```
OUTLOOK_CLIENT_ID          # Azure App Registration
OUTLOOK_CLIENT_SECRET      # Azure App Secret
OUTLOOK_TENANT_ID          # Azure Tenant ID
OUTLOOK_EMAIL_ADDRESS      # E-mail a monitorar
ANTHROPIC_API_KEY          # Claude API
WHATSAPP_TO_NUMBER         # Seu número WhatsApp
TWILIO_ACCOUNT_SID         # Twilio Account SID
TWILIO_AUTH_TOKEN          # Twilio Auth Token
WHATSAPP_PHONE_NUMBER      # Número Twilio WhatsApp
```

## Tecnologias

| Categoria | Tecnologia |
|-----------|-----------|
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 |
| IA | Claude (Anthropic) claude-sonnet-4-6 |
| Fila | Celery 5, Redis 7 |
| Banco | PostgreSQL 16 |
| Frontend | Next.js 14, TailwindCSS, Recharts |
| E-mail | Microsoft Graph API, MSAL |
| WhatsApp | Twilio / Meta Business API |
| Container | Docker, Docker Compose |
| Proxy | Nginx |

---

Desenvolvido para ambiente corporativo — escalável, seguro e pronto para produção.
