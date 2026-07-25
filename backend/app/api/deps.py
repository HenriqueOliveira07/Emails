"""Dependências compartilhadas de controle de acesso da API."""
import hmac

from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str = Depends(_api_key_header)) -> None:
    """Exige o header X-API-Key quando API_ACCESS_KEY está configurada.

    Se API_ACCESS_KEY não estiver definida (padrão em ambientes de
    desenvolvimento), o acesso permanece liberado. Em produção, defina
    API_ACCESS_KEY no .env para proteger o dashboard e a API REST.
    """
    if not settings.API_ACCESS_KEY:
        return
    if not api_key or not hmac.compare_digest(api_key, settings.API_ACCESS_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de API inválida ou ausente",
        )
