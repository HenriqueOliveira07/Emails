"""
Utilitários para normalização de texto.
"""
import re

# Prefixos de resposta/encaminhamento a remover (repetidos, case-insensitive)
_PREFIX_RE = re.compile(r"^\s*(re|res|fwd|fw|enc)\s*:\s*", re.IGNORECASE)
_WHITESPACE_RE = re.compile(r"\s+")


def normalize_subject(subject: str) -> str:
    """
    Normaliza um assunto de e-mail para agrupamento por thread:
    remove prefixos repetidos de resposta/encaminhamento (Re:, Res:, Fwd:, Fw:, Enc:),
    coloca em minúsculas e colapsa espaços em branco.
    """
    if not subject:
        return "(sem assunto)"

    text = subject.strip()
    while True:
        new_text = _PREFIX_RE.sub("", text)
        if new_text == text:
            break
        text = new_text

    text = text.lower().strip()
    text = _WHITESPACE_RE.sub(" ", text)

    return text or "(sem assunto)"
