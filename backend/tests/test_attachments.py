import base64
import io
import zipfile
from datetime import datetime, timezone

import pytest

from app.services.attachment_handler import AttachmentHandler


def _att(name, content):
    return {"name": name, "contentBytes": base64.b64encode(content).decode()}


EMAIL = {
    "received_at": datetime(2026, 5, 26, 8, 42, tzinfo=timezone.utc),
    "sender_email": "contato@fornecedorx.com",
    "sender_name": "Fornecedor X",
}


@pytest.mark.asyncio
async def test_saves_in_date_sender_tree_and_dedups(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    pdf = b"%PDF-1.4 minimal"
    saved = await h.save_attachments(EMAIL, [_att("nota.pdf", pdf), _att("nota.pdf", pdf)])
    assert len(saved) == 2
    expected_dir = tmp_path / "2026" / "05" / "26" / "Fornecedor X"
    assert all(str(expected_dir) in s["file_path"] for s in saved)
    assert saved[0]["filename"] != saved[1]["filename"]


@pytest.mark.asyncio
@pytest.mark.parametrize("name,content", [
    ("virus.exe", b"MZ\x90\x00"),
    ("fatura.pdf.exe", b"MZ\x90\x00"),
    ("fatura.pdf", b"MZ\x90\x00"),          # executável renomeado
    ("script.unknown", b"hello"),            # fora da allowlist
])
async def test_blocks_malicious(tmp_path, name, content):
    h = AttachmentHandler(base_path=str(tmp_path))
    saved = await h.save_attachments(EMAIL, [_att(name, content)])
    assert saved == []
    assert h.blocked and h.blocked[0]["filename"] == name


@pytest.mark.asyncio
async def test_blocks_zip_with_executable(tmp_path):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        zf.writestr("setup.exe", b"MZ")
    h = AttachmentHandler(base_path=str(tmp_path))
    assert await h.save_attachments(EMAIL, [_att("docs.zip", buf.getvalue())]) == []


@pytest.mark.asyncio
async def test_path_traversal_sanitized(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    saved = await h.save_attachments(EMAIL, [_att("../../etc/passwd.csv", b"a,b\n1,2")])
    assert len(saved) == 1
    assert saved[0]["file_path"].startswith(str(tmp_path))
