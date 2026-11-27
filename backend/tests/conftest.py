import os
import sys
from pathlib import Path

import pytest

# Configuração isolada para testes — precisa vir antes de importar `app`
_TMP = Path(os.environ.get("PYTEST_TMPDIR", "/tmp")) / "emails_test"
_TMP.mkdir(parents=True, exist_ok=True)
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_TMP / 'test.db'}"
os.environ["ATTACHMENTS_BASE_PATH"] = str(_TMP / "attachments")
os.environ["ANTHROPIC_API_KEY"] = "test"
os.environ["WHATSAPP_TO_NUMBER"] = "+5511999999999"
os.environ["VIP_SENDERS"] = '["ceo@empresa.com"]'
os.environ["BLOCKED_SENDERS"] = '["@spam.example"]'

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


@pytest.fixture
def tmp_attachments(tmp_path):
    return tmp_path / "att"
