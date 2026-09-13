"""
Dependências compartilhadas da API, incluindo controle de acesso.
"""
import hmac

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import APIKeyHeader

from app.config import settings

logger = structlog.get_logger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

_warned_open_api = False


async def require_api_key(api_key: str = Depends(_api_key_header)) -> None:
    """
    Exige o header `X-API-Key` em todas as rotas protegidas.

    Se `settings.API_KEY` não estiver configurada, a API permanece aberta
    (apenas para desenvolvimento local) e um aviso é registrado no log.
    """
    global _warned_open_api

    if not settings.API_KEY:
        if not _warned_open_api:
            logger.warning(
                "api_running_without_authentication",
                message="API_KEY não configurada — endpoints estão sem controle de acesso.",
            )
            _warned_open_api = True
        return

    if not api_key or not hmac.compare_digest(api_key, settings.API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciais inválidas ou ausentes (header X-API-Key).",
        )
