"""schema inicial

Revision ID: 0001
Revises:
Create Date: 2026-09-10

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

priority_level = sa.Enum("CRITICO", "ALTO", "MEDIO", "BAIXO", name="prioritylevel")
notification_status = sa.Enum("pendente", "enviado", "falhou", "reenvio", name="notificationstatus")
notification_channel = sa.Enum("whatsapp", "email", "webhook", name="notificationchannel")


def upgrade() -> None:
    op.create_table(
        "email_records",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("message_id", sa.String(length=512), nullable=False, unique=True, index=True),
        sa.Column("subject", sa.String(length=1000), nullable=True),
        sa.Column("sender_email", sa.String(length=320), nullable=False, index=True),
        sa.Column("sender_name", sa.String(length=500), nullable=True),
        sa.Column("recipients", sa.JSON(), nullable=True),
        sa.Column("body_preview", sa.String(length=2000), nullable=True),
        sa.Column("full_body", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False, index=True),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", priority_level, nullable=False, index=True),
        sa.Column("category", sa.String(length=200), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("keywords_found", sa.JSON(), nullable=True),
        sa.Column("action_required", sa.Boolean(), nullable=False),
        sa.Column("is_spam", sa.Boolean(), nullable=False, index=True),
        sa.Column("has_attachments", sa.Boolean(), nullable=False),
        sa.Column("attachment_count", sa.Integer(), nullable=False),
        sa.Column("whatsapp_sent", sa.Boolean(), nullable=False, index=True),
        sa.Column("whatsapp_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_time_ms", sa.Float(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "email_attachments",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "email_id",
            sa.Integer(),
            sa.ForeignKey("email_records.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column("filename", sa.String(length=500), nullable=False),
        sa.Column("original_filename", sa.String(length=500), nullable=False),
        sa.Column("file_path", sa.String(length=2000), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("file_type", sa.String(length=200), nullable=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ocr_text", sa.Text(), nullable=True),
        sa.Column("pdf_text", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("invoice_data", sa.JSON(), nullable=True),
        sa.Column("is_malicious", sa.Boolean(), nullable=False),
        sa.Column("scan_result", sa.String(length=500), nullable=True),
    )

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "email_id",
            sa.Integer(),
            sa.ForeignKey("email_records.id", ondelete="CASCADE"),
            nullable=True,
            index=True,
        ),
        sa.Column("channel", notification_channel, nullable=False),
        sa.Column("recipient", sa.String(length=320), nullable=False),
        sa.Column("message_body", sa.Text(), nullable=False),
        sa.Column("status", notification_status, nullable=False, index=True),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False),
        sa.Column("external_id", sa.String(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_table(
        "processing_logs",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column("action", sa.String(length=200), nullable=False, index=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False, index=True),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, index=True),
        sa.Column("error_type", sa.String(length=200), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("context", sa.JSON(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table("processing_logs")
    op.drop_table("notification_logs")
    op.drop_table("email_attachments")
    op.drop_table("email_records")
    notification_channel.drop(op.get_bind(), checkfirst=True)
    notification_status.drop(op.get_bind(), checkfirst=True)
    priority_level.drop(op.get_bind(), checkfirst=True)
