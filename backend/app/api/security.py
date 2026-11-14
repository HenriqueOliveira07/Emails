"""
Controle de acesso da API REST.

Autenticação por chave no header `X-API-Key` (comparação em tempo constante).
Se API_KEY estiver vazio e ENVIRONMENT=development, o acesso é liberado;
em produção sem API_KEY configurada, a API recusa todas as requisições (fail-closed).
"""
import hmac

from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str | None = Security(_api_key_header)) -> None:
    expected = settings.API_KEY
    if not expected:
        if settings.ENVIRONMENT == "development":
            return
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="API_KEY não configurada no servidor",
        )
    if not api_key or not hmac.compare_digest(api_key.encode(), expected.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Chave de API inválida")
