"""
Controle de acesso à API via header X-API-Key (comparação em tempo constante).
"""
import hmac

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str | None = Security(_api_key_header)) -> None:
    expected = settings.API_ACCESS_KEY
    if not expected:
        # Desativado (ambiente de desenvolvimento)
        return
    if not api_key or not hmac.compare_digest(api_key.encode(), expected.encode()):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de API inválida ou ausente",
        )
