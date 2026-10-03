import pytest

from app.utils.file_utils import human_readable_size, ensure_dir, cleanup_empty_dirs
from app.utils.sanitizer import html_to_text, sanitize_email_address, is_spam_sender


def test_html_to_text_strips_tags():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"


@pytest.mark.parametrize("raw,expected", [
    ("  Fin@Empresa.com ", "fin@empresa.com"),
    ("invalido", None),
    ("", None),
])
def test_sanitize_email(raw, expected):
    assert sanitize_email_address(raw) == expected


def test_spam_sender():
    assert is_spam_sender("noreply@x.com", [])
    assert not is_spam_sender("financeiro@x.com", [])


def test_human_readable_size():
    assert human_readable_size(512) == "512.0 B"
    assert human_readable_size(2048) == "2.0 KB"


def test_cleanup_empty_dirs(tmp_path):
    ensure_dir(tmp_path / "a" / "b")
    assert cleanup_empty_dirs(tmp_path) == 2
