#!/usr/bin/env bash
# =============================================================================
#  Script de configuração inicial do Sistema de Monitoramento de E-mails
# =============================================================================
set -euo pipefail

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
fail() { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

log "=== Sistema de Monitoramento de E-mails — Setup ==="

# Verifica dependências
command -v docker >/dev/null 2>&1 || fail "Docker não encontrado. Instale em https://docker.com"
command -v python3 >/dev/null 2>&1 || warn "Python3 não encontrado (necessário para gerar chaves)"

# Cria .env a partir do exemplo
if [ ! -f ".env" ]; then
    cp .env.example .env
    log ".env criado a partir de .env.example"
else
    warn ".env já existe, pulando cópia"
fi

# Gera SECRET_KEY
if command -v python3 >/dev/null 2>&1; then
    SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
    sed -i "s/troque-esta-chave-por-uma-segura-em-producao/${SECRET}/" .env
    log "SECRET_KEY gerada automaticamente"

    # Gera ENCRYPTION_KEY (Fernet)
    if python3 -c "from cryptography.fernet import Fernet" 2>/dev/null; then
        ENC_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
        sed -i "s|^ENCRYPTION_KEY=$|ENCRYPTION_KEY=${ENC_KEY}|" .env
        log "ENCRYPTION_KEY (Fernet) gerada automaticamente"
    else
        warn "Biblioteca 'cryptography' não instalada. ENCRYPTION_KEY deve ser gerada manualmente."
        warn "Execute: python3 -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
    fi

    # Gera POSTGRES_PASSWORD
    PG_PASS=$(python3 -c "import secrets; print(secrets.token_urlsafe(16))")
    sed -i "s/senha_forte_aqui/${PG_PASS}/g" .env
    log "POSTGRES_PASSWORD gerada automaticamente"
fi

echo ""
log "=== Próximos Passos ==="
echo ""
echo "1. Edite o arquivo .env e preencha as credenciais obrigatórias:"
echo ""
echo "   OUTLOOK_CLIENT_ID       → Azure App Registration Client ID"
echo "   OUTLOOK_CLIENT_SECRET   → Azure App Registration Secret"
echo "   OUTLOOK_TENANT_ID       → Azure Tenant ID"
echo "   OUTLOOK_EMAIL_ADDRESS   → E-mail a monitorar"
echo ""
echo "   ANTHROPIC_API_KEY       → Chave da API Claude (anthropic.com)"
echo ""
echo "   WHATSAPP_TO_NUMBER      → Seu número WhatsApp (ex: +5511999999999)"
echo "   TWILIO_ACCOUNT_SID      → Account SID do Twilio"
echo "   TWILIO_AUTH_TOKEN       → Auth Token do Twilio"
echo "   WHATSAPP_PHONE_NUMBER   → Número WhatsApp Twilio (ex: +14155238886)"
echo ""
echo "2. Suba os serviços:"
echo "   docker compose up -d"
echo ""
echo "3. Verifique os logs:"
echo "   docker compose logs -f backend"
echo "   docker compose logs -f celery-worker"
echo ""
echo "4. Acesse o dashboard:"
echo "   http://localhost"
echo ""
echo "5. Documentação da API:"
echo "   http://localhost:8000/api/docs"
echo ""
echo "6. Monitor de tarefas (Celery Flower):"
echo "   http://localhost:5555"
echo ""
log "Setup concluído! Configure o .env e execute 'docker compose up -d'"
