import os
import sys
import tempfile
from pathlib import Path

# Configuração isolada antes de importar a aplicação
_tmp = Path(tempfile.mkdtemp(prefix="emails_tests_"))
os.environ["DATABASE_URL"] = f"sqlite+aiosqlite:///{_tmp / 'test.db'}"
os.environ["ATTACHMENTS_BASE_PATH"] = str(_tmp / "Emails_Importantes")
os.environ["LOGS_BASE_PATH"] = str(_tmp / "logs")
os.environ["ANTHROPIC_API_KEY"] = ""
os.environ["API_ACCESS_KEY"] = "chave-de-teste"
os.environ["TIMEZONE"] = "America/Sao_Paulo"

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
