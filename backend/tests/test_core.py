import base64
from datetime import datetime, timezone
from unittest.mock import patch

import pytest

from app.services.attachment_handler import AttachmentHandler
from app.services.ai_classifier import AIClassifier
from app.services.whatsapp_sender import WhatsAppSender

EMAIL = {
    "message_id": "abc",
    "subject": "Aprovação urgente de pagamento",
    "sender_email": "financeiro@empresa.com",
    "sender_name": "Fornecedor X",
    "body_preview": "Fornecedor aguardando aprovação do pagamento até hoje às 12h.",
    "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
    "has_attachments": True,
    "attachment_count": 2,
}


def _att(name: str, data: bytes) -> dict:
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(data).decode()}


def test_msal_token_expiry_does_not_overflow():
    from app.services import email_reader

    with patch.object(email_reader.msal, "ConfidentialClientApplication") as app_cls:
        app_cls.return_value.acquire_token_for_client.return_value = {
            "access_token": "tok", "expires_in": 3599,
        }
        auth = email_reader.MSALAuthenticator()
        assert auth.get_token() == "tok"
        assert auth.get_token() == "tok"  # cache
        assert app_cls.return_value.acquire_token_for_client.call_count == 1


@pytest.mark.asyncio
async def test_attachments_saved_in_date_sender_folder_without_duplicates(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    saved = await h.save_attachments(EMAIL, [_att("nota.pdf", b"%PDF-1.4"), _att("nota.pdf", b"%PDF-1.4")])
    assert len(saved) == 2
    assert saved[0]["file_path"].startswith(str(tmp_path / "2026" / "05" / "26" / "Fornecedor_X"))
    assert saved[0]["filename"] != saved[1]["filename"]


@pytest.mark.asyncio
async def test_malicious_attachments_blocked(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    saved = await h.save_attachments(EMAIL, [
        _att("virus.exe", b"MZ..."),
        _att("fatura.pdf.exe", b"x"),
        _att("fake.pdf", b"MZ\x90\x00"),
        _att("script.vbs", b"x"),
        _att("planilha.xlsx", b"PK\x03\x04"),
    ])
    assert [s["original_filename"] for s in saved] == ["planilha.xlsx"]


def test_invoice_extraction():
    text = (
        "Boleto 34191.79001 01043.510047 91020.150008 1 96610000012345 "
        "CNPJ 12.345.678/0001-90 Valor R$ 1.234,56 Vencimento: 30/11/2026"
    )
    data = AttachmentHandler.extract_invoice_data(text)
    assert data["linha_digitavel"].startswith("34191")
    assert data["cnpjs"] == ["12.345.678/0001-90"]
    assert data["valores"] == ["1.234,56"]
    assert data["vencimento"] == "30/11/2026"


def test_nfe_xml_parse_and_xxe_block(tmp_path):
    xml = tmp_path / "nfe.xml"
    xml.write_text(
        '<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe"><NFe><infNFe Id="NFe3526">'
        "<ide><nNF>123</nNF></ide><emit><CNPJ>12345678000190</CNPJ><xNome>ACME</xNome></emit>"
        "<total><ICMSTot><vNF>99.90</vNF></ICMSTot></total></infNFe></NFe></nfeProc>"
    )
    data = AttachmentHandler._parse_nfe_xml(xml)
    assert data["numero"] == "123" and data["valor_total"] == "99.90" and data["chave_nfe"] == "3526"
    evil = tmp_path / "evil.xml"
    evil.write_text('<!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/passwd">]><x>&e;</x>')
    assert AttachmentHandler._parse_nfe_xml(evil) == {}


def test_whatsapp_message_format():
    msg = WhatsAppSender().format_message(
        EMAIL, {"priority": "CRITICO", "summary": "Fornecedor aguardando aprovação."}
    )
    assert msg.startswith("[CRÍTICO]\nNovo e-mail importante recebido")
    assert "financeiro@empresa.com" in msg
    assert "Assunto: Aprovação urgente de pagamento" in msg
    assert "Horário: 26/05/2026 05:42" in msg  # 08:42 UTC -> America/Sao_Paulo
    assert msg.endswith("Anexos: 2 arquivos")


def test_fallback_classification_keywords():
    c = AIClassifier.__new__(AIClassifier)
    res = c._fallback_classification(EMAIL)
    assert res["priority"] in ("CRITICO", "ALTO")
    assert res["is_spam"] is False
    spam = c._fallback_classification({**EMAIL, "subject": "Newsletter semanal", "body_preview": "descadastrar"})
    assert spam["is_spam"] is True


@pytest.mark.asyncio
async def test_api_key_protection(monkeypatch):
    from fastapi import HTTPException

    from app.api import security

    monkeypatch.setattr(security.settings, "API_ACCESS_KEY", "s3cret")
    with pytest.raises(HTTPException):
        await security.require_api_key(None)
    with pytest.raises(HTTPException):
        await security.require_api_key("wrong")
    await security.require_api_key("s3cret")
