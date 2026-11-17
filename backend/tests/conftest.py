import os
import sys
import tempfile
from pathlib import Path

_TMP = Path(tempfile.mkdtemp(prefix="emails_test_"))

# Precisa vir antes de qualquer import de app.* (settings é lido no import)
os.environ.update({
    "DATABASE_URL": f"sqlite+aiosqlite:///{_TMP / 'test.db'}",
    "ATTACHMENTS_BASE_PATH": str(_TMP / "Emails_Importantes"),
    "LOGS_BASE_PATH": str(_TMP / "logs"),
    "ANTHROPIC_API_KEY": "",
    "WHATSAPP_TO_NUMBER": "+5511999999999",
    "TIMEZONE": "America/Sao_Paulo",
})
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
