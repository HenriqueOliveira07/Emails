from datetime import datetime, timezone

from app.services.attachment_handler import AttachmentHandler


def test_path_uses_local_date_and_sender(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    # 01:30 UTC de 27/05 = 22:30 de 26/05 em São Paulo
    p = h._build_path({
        "received_at": datetime(2026, 5, 27, 1, 30, tzinfo=timezone.utc),
        "sender_email": "x@fornecedor.com",
        "sender_name": "Fornecedor X",
    })
    assert p.relative_to(tmp_path).parts == ("2026", "05", "26", "Fornecedor X")


def test_unique_filename_avoids_overwrite(tmp_path):
    h = AttachmentHandler(base_path=str(tmp_path))
    (tmp_path / "nota.pdf").write_bytes(b"a")
    assert h._unique_filename(tmp_path, "nota.pdf") != "nota.pdf"
