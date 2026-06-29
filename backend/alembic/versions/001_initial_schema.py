"""Initial schema - email monitoring system

Revision ID: 001
Revises: None
Create Date: 2026-06-29
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_records",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("message_id", sa.String(512), unique=True, nullable=False, index=True),
        sa.Column("subject", sa.String(1000), nullable=True, default="(Sem assunto)"),
        sa.Column("sender_email", sa.String(320), nullable=False, index=True),
        sa.Column("sender_name", sa.String(500), nullable=True, default=""),
        sa.Column("recipients", sa.JSON(), nullable=True, default=list),
        sa.Column("body_preview", sa.String(2000), nullable=True, default=""),
        sa.Column("full_body", sa.Text(), nullable=True, default=""),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", sa.Enum("CRITICO", "ALTO", "MEDIO", "BAIXO", name="prioritylevel"), nullable=False, default="BAIXO", index=True),
        sa.Column("category", sa.String(200), nullable=True, default="Geral"),
        sa.Column("ai_summary", sa.Text(), nullable=True, default=""),
        sa.Column("keywords_found", sa.JSON(), nullable=True, default=list),
        sa.Column("action_required", sa.Boolean(), nullable=False, default=False),
        sa.Column("is_spam", sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column("has_attachments", sa.Boolean(), nullable=False, default=False),
        sa.Column("attachment_count", sa.Integer(), nullable=False, default=0),
        sa.Column("whatsapp_sent", sa.Boolean(), nullable=False, default=False, index=True),
        sa.Column("whatsapp_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_time_ms", sa.Float(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=True, default=dict),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "email_attachments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("email_id", sa.Integer(), sa.ForeignKey("email_records.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(2000), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True, default=0),
        sa.Column("file_type", sa.String(200), nullable=True, default=""),
        sa.Column("saved_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("ocr_text", sa.Text(), nullable=True, default=""),
        sa.Column("pdf_text", sa.Text(), nullable=True, default=""),
        sa.Column("ai_summary", sa.Text(), nullable=True, default=""),
        sa.Column("invoice_data", sa.JSON(), nullable=True, default=dict),
        sa.Column("is_malicious", sa.Boolean(), nullable=False, default=False),
        sa.Column("scan_result", sa.String(500), nullable=True, default=""),
    )

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("email_id", sa.Integer(), sa.ForeignKey("email_records.id", ondelete="CASCADE"), nullable=True, index=True),
        sa.Column("channel", sa.Enum("whatsapp", "email", "webhook", name="notificationchannel"), nullable=False, default="whatsapp"),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("message_body", sa.Text(), nullable=False),
        sa.Column("status", sa.Enum("pendente", "enviado", "falhou", "reenvio", name="notificationstatus"), nullable=False, default="pendente", index=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True, default=""),
        sa.Column("retry_count", sa.Integer(), nullable=False, default=0),
        sa.Column("external_id", sa.String(500), nullable=True, default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )

    op.create_table(
        "processing_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("action", sa.String(200), nullable=False, index=True),
        sa.Column("details", sa.JSON(), nullable=True, default=dict),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now(), index=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, default=True, index=True),
        sa.Column("error_type", sa.String(200), nullable=True, default=""),
        sa.Column("error_message", sa.Text(), nullable=True, default=""),
        sa.Column("context", sa.JSON(), nullable=True, default=dict),
    )


def downgrade() -> None:
    op.drop_table("processing_logs")
    op.drop_table("notification_logs")
    op.drop_table("email_attachments")
    op.drop_table("email_records")
    op.execute("DROP TYPE IF EXISTS prioritylevel")
    op.execute("DROP TYPE IF EXISTS notificationchannel")
    op.execute("DROP TYPE IF EXISTS notificationstatus")
