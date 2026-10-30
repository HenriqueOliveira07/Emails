import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("ANTHROPIC_API_KEY", "test")

from app.services.ai_classifier import AIClassifier  # noqa: E402


def test_fallback_returns_valid_priority():
    clf = AIClassifier()
    result = clf._fallback_classification(
        {"subject": "URGENTE: aprovação de pagamento", "body_preview": "vencimento hoje"}
    )
    assert result["priority"] in {"CRITICO", "ALTO", "MEDIO", "BAIXO"}
