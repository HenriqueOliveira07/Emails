import os
import sys
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="emails_tests_"))
os.environ.setdefault("DATABASE_URL", f"sqlite+aiosqlite:///{_TMP / 'test.db'}")
os.environ.setdefault("ATTACHMENTS_BASE_PATH", str(_TMP / "Emails_Importantes"))
os.environ.setdefault("REDIS_URL", "redis://127.0.0.1:1/0")  # inexistente: lock cai em "nolock"
os.environ.setdefault("TIMEZONE", "America/Sao_Paulo")
os.environ.setdefault("WHATSAPP_TO_NUMBER", "+5511999999999")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
