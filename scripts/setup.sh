#!/usr/bin/env bash
# =============================================================================
# Setup inicial do Sistema de Monitoramento de E-mails
# =============================================================================
set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error()   { echo -e "${RED}[ERRO]${NC} $1"; exit 1; }

echo ""
echo "=================================================="
echo "  Sistema de Monitoramento de E-mails com WhatsApp"
echo "=================================================="
echo ""

# Verificar dependências
info "Verificando dependências..."

command -v docker >/dev/null 2>&1 || error "Docker não encontrado. Instale em: https://docs.docker.com/get-docker/"
command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 || error "Docker Compose v2 não encontrado."

success "Docker e Docker Compose encontrados"

# Verificar se .env existe
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        warn "Arquivo .env não encontrado. Criando a partir do .env.example..."
        cp .env.example .env
        warn "IMPORTANTE: Edite o arquivo .env com suas credenciais antes de continuar!"
        warn "Execute: nano .env"
        echo ""
        read -rp "Pressione ENTER após editar o .env para continuar, ou Ctrl+C para cancelar..."
    else
        error "Arquivo .env.example não encontrado. Clone o repositório corretamente."
    fi
else
    success "Arquivo .env encontrado"
fi

# Verificar variáveis críticas
info "Verificando variáveis de ambiente críticas..."

check_var() {
    local var_name=$1
    local var_value
    var_value=$(grep -E "^${var_name}=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
    if [ -z "$var_value" ] || [[ "$var_value" == *"exemplo"* ]] || [[ "$var_value" == *"xxxx"* ]]; then
        warn "  $var_name não configurado ou usando valor de exemplo"
        return 1
    fi
    success "  $var_name configurado"
    return 0
}

MISSING=0
check_var "OUTLOOK_CLIENT_ID" || MISSING=$((MISSING+1))
check_var "OUTLOOK_CLIENT_SECRET" || MISSING=$((MISSING+1))
check_var "OUTLOOK_TENANT_ID" || MISSING=$((MISSING+1))
check_var "OUTLOOK_EMAIL_ADDRESS" || MISSING=$((MISSING+1))
check_var "WHATSAPP_TO_NUMBER" || MISSING=$((MISSING+1))
check_var "ANTHROPIC_API_KEY" || MISSING=$((MISSING+1))
check_var "POSTGRES_PASSWORD" || MISSING=$((MISSING+1))

if [ "$MISSING" -gt 0 ]; then
    warn "$MISSING variável(eis) não configurada(s). O sistema pode não funcionar corretamente."
    read -rp "Continuar mesmo assim? (s/N): " confirm
    [[ "$confirm" =~ ^[sS]$ ]] || { echo "Abortando."; exit 0; }
fi

# Gerar chaves se não configuradas
info "Verificando chaves de segurança..."

SECRET_KEY=$(grep -E "^SECRET_KEY=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$SECRET_KEY" ] || [[ "$SECRET_KEY" == *"troque"* ]]; then
    NEW_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
    sed -i "s|^SECRET_KEY=.*|SECRET_KEY=${NEW_SECRET}|" .env
    success "SECRET_KEY gerado automaticamente"
fi

ENCRYPTION_KEY=$(grep -E "^ENCRYPTION_KEY=" .env | cut -d'=' -f2- | tr -d '"' | tr -d "'")
if [ -z "$ENCRYPTION_KEY" ]; then
    NEW_ENC=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "")
    if [ -n "$NEW_ENC" ]; then
        sed -i "s|^ENCRYPTION_KEY=.*|ENCRYPTION_KEY=${NEW_ENC}|" .env
        success "ENCRYPTION_KEY gerado automaticamente"
    else
        warn "Não foi possível gerar ENCRYPTION_KEY automaticamente. Configure manualmente."
    fi
fi

# Build e start
info "Construindo imagens Docker (pode demorar na primeira vez)..."
docker compose build --parallel

info "Iniciando serviços..."
docker compose up -d

# Aguardar banco de dados
info "Aguardando banco de dados ficar pronto..."
RETRIES=30
until docker compose exec -T postgres pg_isready -U emails_user -d emails_db >/dev/null 2>&1; do
    RETRIES=$((RETRIES-1))
    if [ "$RETRIES" -eq 0 ]; then
        error "Timeout aguardando PostgreSQL. Verifique os logs: docker compose logs postgres"
    fi
    echo -n "."
    sleep 2
done
echo ""
success "PostgreSQL pronto"

# Aguardar backend
info "Aguardando backend ficar pronto..."
RETRIES=20
until curl -sf http://localhost:8000/api/health >/dev/null 2>&1; do
    RETRIES=$((RETRIES-1))
    if [ "$RETRIES" -eq 0 ]; then
        warn "Backend não respondeu no tempo esperado. Verificando logs..."
        docker compose logs --tail=20 backend
        break
    fi
    echo -n "."
    sleep 3
done
echo ""

# Verificar status
echo ""
echo "=================================================="
echo "  Status dos Serviços"
echo "=================================================="
docker compose ps
echo ""

# Verificar integrações
info "Verificando integrações..."
HEALTH=$(curl -sf http://localhost:8000/api/dashboard/health 2>/dev/null || echo '{}')
echo "$HEALTH" | python3 -c "
import json, sys
data = json.load(sys.stdin)
services = data.get('services', {})
for svc, info in services.items():
    status = info.get('status', 'unknown')
    icon = 'OK' if status == 'ok' else 'ERRO'
    print(f'  [{icon}] {svc}: {status}')
" 2>/dev/null || true

echo ""
echo "=================================================="
echo "  Sistema iniciado com sucesso!"
echo "=================================================="
echo ""
echo "  Dashboard:     http://localhost"
echo "  API Docs:      http://localhost/api/docs"
echo "  Flower:        http://localhost:5555"
echo ""
echo "  Logs:          docker compose logs -f"
echo "  Parar:         docker compose down"
echo "  Reiniciar:     docker compose restart"
echo ""

# Disparar verificação inicial
info "Disparando verificação inicial de e-mails..."
curl -sf -X POST http://localhost/api/settings/trigger-check >/dev/null 2>&1 && \
    success "Verificação inicial enfileirada" || \
    warn "Não foi possível disparar verificação inicial (normal se o backend ainda estiver inicializando)"

echo ""
success "Setup concluído!"
