import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ.setdefault("ATTACHMENTS_BASE_PATH", "/tmp/emails_test_attachments")
