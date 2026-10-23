from app.utils.file_utils import cleanup_empty_dirs, human_readable_size
from app.utils.sanitizer import html_to_text, truncate


def test_html_to_text_strips_tags():
    assert html_to_text("<p>Olá <b>mundo</b></p>") == "Olá mundo"


def test_html_to_text_empty():
    assert html_to_text("") == ""


def test_truncate_limits_length():
    assert len(truncate("a" * 1000, 50)) <= 55


def test_human_readable_size():
    assert human_readable_size(512).startswith("512")
    assert "KB" in human_readable_size(2048)


def test_cleanup_empty_dirs(tmp_path):
    (tmp_path / "a" / "b").mkdir(parents=True)
    keep = tmp_path / "c"
    keep.mkdir()
    (keep / "f.txt").write_text("x")
    assert cleanup_empty_dirs(tmp_path) == 2
    assert keep.exists()
