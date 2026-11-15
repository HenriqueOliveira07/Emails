import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")
os.environ.setdefault("TIMEZONE", "America/Sao_Paulo")
