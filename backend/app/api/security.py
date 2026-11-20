"""
Controle de acesso à API REST via header X-API-Key.

A chave é comparada em tempo constante. Quando API_ACCESS_KEY está vazio a
verificação é desativada e um aviso é registrado na inicialização — use isso
apenas em desenvolvimento local.
"""
import hmac
from typing import Optional

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: Optional[str] = Security(api_key_header)) -> None:
    expected = settings.API_ACCESS_KEY
    if not expected:
        return
    if not api_key or not hmac.compare_digest(api_key.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="X-API-Key ausente ou inválida",
        )
