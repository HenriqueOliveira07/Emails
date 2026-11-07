"""Controle de acesso da API via chave (header X-API-Key)."""
import hmac

from fastapi import Header, HTTPException, status

from app.config import settings


async def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Se API_ACCESS_KEY estiver definida, exige o header X-API-Key correto."""
    expected = getattr(settings, "API_ACCESS_KEY", "") or ""
    if not expected:
        return
    if not x_api_key or not hmac.compare_digest(x_api_key, expected):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Chave de API inválida")
