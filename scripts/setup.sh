#!/bin/bash
# Script de setup inicial do sistema de monitoramento de e-mails

set -e

echo "=== Setup: Sistema de Monitoramento de E-mails ==="
echo ""

# Verifica se .env existe
if [ ! -f ".env" ]; then
  echo "[1/4] Criando .env a partir do .env.example..."
  cp .env.example .env
  echo "     -> ATENÇÃO: Edite o arquivo .env com suas credenciais antes de continuar!"
  echo ""
else
  echo "[1/4] Arquivo .env já existe."
fi

# Gera chave secreta se não configurada
if grep -q "troque-esta-chave-por-uma-segura-em-producao" .env; then
  SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))" 2>/dev/null || openssl rand -hex 32)
  sed -i "s/troque-esta-chave-por-uma-segura-em-producao/$SECRET/" .env
  echo "[2/4] Chave SECRET_KEY gerada automaticamente."
fi

# Gera chave de criptografia Fernet se vazia
if grep -q "^ENCRYPTION_KEY=$" .env; then
  FERNET=$(python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())" 2>/dev/null || echo "")
  if [ -n "$FERNET" ]; then
    sed -i "s|^ENCRYPTION_KEY=$|ENCRYPTION_KEY=$FERNET|" .env
    echo "[3/4] Chave ENCRYPTION_KEY (Fernet) gerada automaticamente."
  else
    echo "[3/4] Instale o pacote 'cryptography' para gerar ENCRYPTION_KEY automaticamente."
  fi
fi

echo "[4/4] Iniciando serviços Docker..."
docker compose up -d

echo ""
echo "=== Setup concluído! ==="
echo ""
echo "Serviços disponíveis:"
echo "  Dashboard:  http://localhost"
echo "  API (docs): http://localhost:8000/api/docs"
echo "  Flower:     http://localhost:5555"
echo ""
echo "Para ver os logs:"
echo "  docker compose logs -f celery-worker"
echo "  docker compose logs -f backend"
