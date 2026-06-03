"""
Aplicação FastAPI principal — Sistema de Monitoramento de E-mails.
"""
import time
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.db.database import create_tables

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Iniciando sistema de monitoramento de e-mails...")
    await create_tables()
    logger.info("Tabelas criadas/verificadas com sucesso")
    yield
    logger.info("Encerrando aplicação")


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Sistema automatizado de monitoramento de e-mails com notificações via WhatsApp",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start) * 1000
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        duration_ms=round(duration_ms, 2),
    )
    return response


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("unhandled_exception", path=request.url.path, error=str(exc))
    return JSONResponse(status_code=500, content={"detail": "Erro interno do servidor"})


from app.api.routes import (  # noqa: E402
    dashboard,
    emails,
    notifications,
    attachments,
    logs as logs_router,
    settings as settings_router,
)

app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(emails.router, prefix="/api/emails", tags=["E-mails"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notificações"])
app.include_router(attachments.router, prefix="/api/attachments", tags=["Anexos"])
app.include_router(logs_router.router, prefix="/api/logs", tags=["Logs"])
app.include_router(settings_router.router, prefix="/api/settings", tags=["Configurações"])


@app.get("/api/health", tags=["Sistema"])
async def health():
    return {"status": "ok", "version": settings.APP_VERSION, "app": settings.APP_NAME}
