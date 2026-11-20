#!/bin/sh
# Gera a autenticação HTTP Basic do painel a partir de DASHBOARD_USER/DASHBOARD_PASSWORD.
# Sem senha definida, o painel fica sem autenticação (apenas desenvolvimento).
set -eu
AUTH_CONF=/etc/nginx/dashboard_auth.conf
if [ -n "${DASHBOARD_PASSWORD:-}" ]; then
    printf '%s:{PLAIN}%s\n' "${DASHBOARD_USER:-admin}" "$DASHBOARD_PASSWORD" > /etc/nginx/.htpasswd
    chmod 640 /etc/nginx/.htpasswd
    chown root:nginx /etc/nginx/.htpasswd 2>/dev/null || true
    printf 'auth_basic "Email Monitor";\nauth_basic_user_file /etc/nginx/.htpasswd;\n' > "$AUTH_CONF"
    echo "15-dashboard-auth: autenticação do painel ativada para ${DASHBOARD_USER:-admin}"
else
    echo 'auth_basic off;' > "$AUTH_CONF"
    echo "15-dashboard-auth: AVISO - DASHBOARD_PASSWORD vazio, painel sem autenticação"
fi
