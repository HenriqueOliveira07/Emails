"""
Helpers de fuso horário e normalização de texto usados em várias camadas.
"""
import re
import unicodedata
from datetime import datetime, timezone
from functools import lru_cache
from typing import Iterable, List, Optional
from zoneinfo import ZoneInfo

from app.config import settings


@lru_cache(maxsize=4)
def _zone(name: str) -> ZoneInfo:
    return ZoneInfo(name)


def to_local(dt: Optional[datetime]) -> datetime:
    """Converte para o fuso configurado (TIMEZONE). Datas sem tz são tratadas como UTC."""
    if dt is None:
        dt = datetime.now(timezone.utc)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(_zone(settings.TIMEZONE))


def normalize(text: str) -> str:
    """Minúsculas e sem acentos: 'Aprovação' -> 'aprovacao'."""
    decomposed = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in decomposed if not unicodedata.combining(c)).lower()


def find_keywords(text: str, keywords: Iterable[str]) -> List[str]:
    """
    Retorna as palavras-chave presentes no texto, ignorando acentos e caixa,
    casando apenas palavras inteiras (prefixo permitido: 'falha' casa 'falhas',
    mas 'erro' não casa 'terror').
    """
    norm = normalize(text)
    found = []
    for kw in keywords:
        nkw = normalize(kw).strip()
        if nkw and re.search(r"(?<![a-z0-9])" + re.escape(nkw), norm):
            found.append(kw)
    return found
