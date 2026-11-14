import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("OUTLOOK_EMAIL_ADDRESS", "usuario@empresa.com.br")
os.environ.setdefault("ATTACHMENTS_BASE_PATH", "/tmp/emails-test-attachments")
os.environ.setdefault("VIP_SENDERS", '["ceo@empresa.com.br"]')
os.environ.setdefault("BLOCKED_SENDERS", '["@spam.com"]')
