"""
Utilitários de sanitização de dados de entrada.
"""
import re
from html.parser import HTMLParser
from typing import Optional


class HTMLStripper(HTMLParser):
    def __init__(self):
        super().__init__()
        self.reset()
        self._parts: list[str] = []

    def handle_data(self, d: str) -> None:
        self._parts.append(d)

    def get_text(self) -> str:
        return " ".join(self._parts)


def html_to_text(html: str) -> str:
    """Converte HTML para texto puro, removendo tags."""
    if not html:
        return ""
    stripper = HTMLStripper()
    try:
        stripper.feed(html)
        text = stripper.get_text()
    except Exception:
        text = re.sub(r"<[^>]+>", " ", html)

    text = re.sub(r"\s+", " ", text).strip()
    return text


def sanitize_email_address(email: str) -> Optional[str]:
    """Valida e normaliza um endereço de e-mail."""
    if not email:
        return None
    email = email.strip().lower()
    pattern = r"^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$"
    if re.match(pattern, email):
        return email
    return None


def is_spam_sender(sender_email: str, spam_patterns: list[str]) -> bool:
    """Verifica se o remetente corresponde a padrões de spam."""
    sender_lower = sender_email.lower()
    spam_domains = ["noreply", "no-reply", "donotreply", "newsletter", "marketing", "bulk"]
    for pattern in spam_domains + [p.lower() for p in spam_patterns if p]:
        if pattern in sender_lower:
            return True
    return False


def truncate(text: str, max_len: int = 500) -> str:
    """Trunca texto no comprimento máximo."""
    if not text:
        return ""
    if len(text) <= max_len:
        return text
    return text[:max_len - 3] + "..."
