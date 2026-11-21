"""
Controle de acesso da API REST via header X-API-Key.
"""
import hmac

import structlog
from fastapi import HTTPException, Security, status
from fastapi.security import APIKeyHeader

from app.config import settings

logger = structlog.get_logger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(api_key: str | None = Security(_api_key_header)) -> None:
    expected = settings.API_KEY
    if not expected:
        # Modo desenvolvimento: sem chave configurada, acesso liberado.
        return
    if not api_key or not hmac.compare_digest(api_key, expected):
        logger.warning("api_auth_failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida ou ausente",
        )
