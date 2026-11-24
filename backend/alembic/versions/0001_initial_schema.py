"""Schema inicial: e-mails, anexos, notificações e logs de processamento.

Revision ID: 0001_initial
Revises:
Create Date: 2026-11-24
"""
from alembic import op

from app.db.database import Base
import app.models  # noqa: F401

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Cria todas as tabelas/enums a partir dos modelos (idempotente: checkfirst).
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind(), checkfirst=True)
