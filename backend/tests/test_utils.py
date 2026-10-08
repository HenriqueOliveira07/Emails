from app.utils.sanitizer import html_to_text, is_spam_sender, truncate
from app.utils.file_utils import human_readable_size


def test_html_to_text_strips_tags():
    assert "Olá" in html_to_text("<p>Olá <b>mundo</b></p>")


def test_truncate_limits_length():
    assert len(truncate("a" * 1000, 100)) <= 103


def test_spam_sender_pattern():
    assert is_spam_sender("noreply@x.com", ["noreply"])
    assert not is_spam_sender("financeiro@x.com", ["noreply"])


def test_human_readable_size():
    assert human_readable_size(2048)
