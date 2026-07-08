"""
Dependências de autenticação para os endpoints da API.
"""
from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_api_key(x_api_key: str = Header(default="")) -> None:
    """
    Exige o header X-API-Key em toda chamada à API quando API_KEY está configurada.

    Se API_KEY não estiver definida em settings (ambiente de desenvolvimento),
    a verificação é ignorada.
    """
    if not settings.API_KEY:
        return
    if x_api_key != settings.API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Chave de API inválida ou ausente",
        )
