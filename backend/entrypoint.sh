#!/bin/sh
set -e

echo "Aguardando PostgreSQL..."
until pg_isready -h "${PGHOST:-postgres}" -U "${PGUSER:-emails_user}" -d "${PGDATABASE:-emails_db}" 2>/dev/null; do
  sleep 1
done

echo "Executando migrações Alembic..."
alembic upgrade head

echo "Iniciando aplicação..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
