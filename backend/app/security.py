"""Controle de acesso da API via token (header X-API-Key)."""
import hmac
from typing import Optional

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_api_key(x_api_key: Optional[str] = Header(default=None)) -> None:
    expected = settings.API_ACCESS_TOKEN
    if not expected:
        return  # autenticação desabilitada (desenvolvimento)
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token de acesso inválido")
