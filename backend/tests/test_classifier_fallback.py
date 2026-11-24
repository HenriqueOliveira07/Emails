from app.services.ai_classifier import AIClassifier


def _classify(subject: str, body: str = "") -> dict:
    clf = AIClassifier.__new__(AIClassifier)  # sem cliente de API
    return clf._fallback_classification({"subject": subject, "body_preview": body})


def test_baixo_sem_palavras_chave():
    r = _classify("Bom dia", "Tudo certo por aqui.")
    assert r["priority"] == "BAIXO"
    assert r["is_spam"] is False


def test_urgente_nao_e_baixo():
    r = _classify("URGENTE: aprovação de pagamento", "Fornecedor aguardando até 12h.")
    assert r["priority"] in ("CRITICO", "ALTO")
    assert r["action_required"] is True


def test_resultado_tem_campos_obrigatorios():
    r = _classify("Contrato para assinatura")
    for key in ("priority", "category", "summary", "keywords_found", "is_spam", "action_required"):
        assert key in r
