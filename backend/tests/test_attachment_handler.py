import asyncio
import base64
from datetime import datetime, timezone

from app.services.attachment_handler import AttachmentHandler


def _att(name: str, data: bytes = b"conteudo") -> dict:
    return {"name": name, "contentType": "", "contentBytes": base64.b64encode(data).decode()}


EMAIL = {
    "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
    "sender_email": "financeiro@fornecedorx.com",
    "sender_name": "Fornecedor X",
}


def test_path_organizado_por_data_e_remetente(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    saved = asyncio.run(handler.save_attachments(EMAIL, [_att("boleto.pdf")]))
    assert len(saved) == 1
    expected_dir = tmp_path / "2026" / "05" / "26" / "Fornecedor X"
    assert (expected_dir / "boleto.pdf").exists()


def test_renomeia_duplicados(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    saved = asyncio.run(
        handler.save_attachments(EMAIL, [_att("nf.xml", b"a"), _att("nf.xml", b"b"), _att("nf.xml", b"c")])
    )
    names = [s["filename"] for s in saved]
    assert len(set(names)) == 3
    assert names[0] == "nf.xml"


def test_bloqueia_extensoes_perigosas(tmp_path):
    handler = AttachmentHandler(base_path=str(tmp_path))
    saved = asyncio.run(handler.save_attachments(EMAIL, [_att("fatura.pdf.exe"), _att("script.ps1")]))
    assert saved == []


def test_sanitiza_nomes():
    assert "/" not in AttachmentHandler._sanitize_filename("../../etc/passwd")
    assert AttachmentHandler._sanitize_dirname('Empresa: "X"/Y') == "Empresa_ _X__Y"
