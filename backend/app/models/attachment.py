"""
Re-exportação do modelo de anexo para compatibilidade.
O modelo EmailAttachment está definido em email.py.
"""
from app.models.email import EmailAttachment

__all__ = ["EmailAttachment"]
