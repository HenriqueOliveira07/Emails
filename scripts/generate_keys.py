#!/usr/bin/env python3
"""
Utilitário para gerar chaves de segurança do sistema.

Uso:
    python3 scripts/generate_keys.py
"""
import secrets
from cryptography.fernet import Fernet

print("=" * 60)
print("  Gerador de Chaves — Sistema de Monitoramento de E-mails")
print("=" * 60)
print()

secret_key = secrets.token_hex(32)
print(f"SECRET_KEY={secret_key}")
print()

enc_key = Fernet.generate_key().decode()
print(f"ENCRYPTION_KEY={enc_key}")
print()

pg_pass = secrets.token_urlsafe(16)
print(f"POSTGRES_PASSWORD={pg_pass}")
print()

print("Copie os valores acima para o seu arquivo .env")
print("NUNCA compartilhe estas chaves ou as comita no repositório!")
