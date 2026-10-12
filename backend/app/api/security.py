"""Controle de acesso da API por chave (header X-API-Key)."""
import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    """Bloqueia a requisição se API_KEY estiver configurada e o header não conferir."""
    if not settings.API_KEY:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="API key inválida")
