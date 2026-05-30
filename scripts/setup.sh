#!/usr/bin/env bash
# Script de configuração inicial do sistema
set -e

echo "=== Sistema de Monitoramento de E-mails ==="
echo ""

# Verificar pré-requisitos
if ! command -v docker &>/dev/null; then
  echo "ERRO: Docker não encontrado. Instale em https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version &>/dev/null; then
  echo "ERRO: Docker Compose v2+ não encontrado."
  exit 1
fi

# Copiar .env se não existir
if [ ! -f .env ]; then
  cp .env.example .env
  echo "Arquivo .env criado. PREENCHA as variáveis obrigatórias antes de continuar!"
  echo ""
  echo "Variáveis obrigatórias:"
  echo "  OUTLOOK_CLIENT_ID, OUTLOOK_CLIENT_SECRET, OUTLOOK_TENANT_ID"
  echo "  OUTLOOK_EMAIL_ADDRESS"
  echo "  ANTHROPIC_API_KEY"
  echo "  WHATSAPP_TO_NUMBER, WHATSAPP_PHONE_NUMBER"
  echo "  TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN  (se usar Twilio)"
  echo ""
  echo "Edite o .env e rode este script novamente."
  exit 0
fi

# Gerar chaves se não preenchidas
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || echo "")
if [ -n "$SECRET_KEY" ] && grep -q "troque-esta-chave" .env; then
  sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
  echo "SECRET_KEY gerada automaticamente."
fi

ENCRYPTION_KEY=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "")
if [ -n "$ENCRYPTION_KEY" ] && grep -q "^ENCRYPTION_KEY=$" .env; then
  sed -i "s/^ENCRYPTION_KEY=$/ENCRYPTION_KEY=$ENCRYPTION_KEY/" .env
  echo "ENCRYPTION_KEY gerada automaticamente."
fi

echo "Iniciando serviços..."
docker compose up -d

echo ""
echo "Aguardando serviços ficarem prontos..."
sleep 10

echo ""
echo "=== Serviços iniciados! ==="
echo "  Dashboard:    http://localhost"
echo "  API Docs:     http://localhost:8000/api/docs"
echo "  Flower:       http://localhost:5555"
echo ""
echo "Logs em tempo real:"
echo "  docker compose logs -f celery-worker"
