"""Baseline: cria o schema inicial a partir dos modelos SQLAlchemy.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-11-16
"""
from alembic import op

from app.db.database import Base
from app.models import email, notification  # noqa: F401

revision = "0001_baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    Base.metadata.create_all(bind=op.get_bind(), checkfirst=True)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())
