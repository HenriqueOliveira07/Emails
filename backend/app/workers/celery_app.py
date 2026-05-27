"""
Configuração do Celery com Redis como broker e backend de resultados.
"""
from celery import Celery
from celery.schedules import crontab

from app.config import settings

celery_app = Celery(
    "email_monitor",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_RESULT_BACKEND,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="America/Sao_Paulo",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_routes={
        "app.workers.tasks.check_new_emails": {"queue": "high"},
        "app.workers.tasks.send_daily_summary": {"queue": "low"},
        "app.workers.tasks.retry_failed_notifications": {"queue": "high"},
        "app.workers.tasks.cleanup_old_logs": {"queue": "low"},
    },
    beat_schedule={
        "check-emails": {
            "task": "app.workers.tasks.check_new_emails",
            "schedule": settings.CHECK_INTERVAL_SECONDS,
            "options": {"queue": "high"},
        },
        "daily-summary": {
            "task": "app.workers.tasks.send_daily_summary",
            "schedule": crontab(hour=8, minute=0),
            "options": {"queue": "low"},
        },
        "retry-failed-notifications": {
            "task": "app.workers.tasks.retry_failed_notifications",
            "schedule": 300,  # a cada 5 minutos
            "options": {"queue": "high"},
        },
        "cleanup-old-logs": {
            "task": "app.workers.tasks.cleanup_old_logs",
            "schedule": crontab(hour=2, minute=0, day_of_week=0),  # domingo às 2h
            "options": {"queue": "low"},
        },
    },
)
