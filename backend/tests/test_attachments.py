from datetime import datetime, timezone

from app.services.attachment_handler import AttachmentHandler


def test_path_is_organized_by_date_and_sender(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    p = h._build_path({
        "received_at": datetime(2026, 5, 26, 11, 0, tzinfo=timezone.utc),
        "sender_email": "x@fornecedor.com",
        "sender_name": "Fornecedor/X",
    })
    rel = p.relative_to(tmp_path).parts
    assert rel == ("2026", "05", "26", "Fornecedor_X")


def test_unique_filename_avoids_overwrite(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    (tmp_path / "nota.pdf").write_bytes(b"1")
    first = h._unique_filename(tmp_path, "nota.pdf")
    assert first != "nota.pdf" and first.endswith(".pdf")
    (tmp_path / first).write_bytes(b"2")
    second = h._unique_filename(tmp_path, "nota.pdf")
    assert second not in ("nota.pdf", first)


def test_dangerous_extension_blocked(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    assert h._is_extension_allowed("fatura.pdf")[0] is True
    assert h._is_extension_allowed("fatura.pdf.exe")[0] is False
