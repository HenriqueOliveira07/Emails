"""Configuração de testes: SQLite em memória e diretório temporário de anexos."""
import os
import tempfile

_TMP = tempfile.mkdtemp(prefix="emails_test_")
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_TMP}/test.db")
os.environ.setdefault("ATTACHMENTS_BASE_PATH", f"{_TMP}/Emails_Importantes")
os.environ.setdefault("LOGS_BASE_PATH", f"{_TMP}/logs")
os.environ.setdefault("ANTHROPIC_API_KEY", "")
