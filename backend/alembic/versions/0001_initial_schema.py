"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-06-06 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "email_records",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("message_id", sa.String(512), nullable=False),
        sa.Column("subject", sa.String(1000), nullable=True),
        sa.Column("sender_email", sa.String(320), nullable=False),
        sa.Column("sender_name", sa.String(500), nullable=True),
        sa.Column("recipients", sa.JSON(), nullable=True),
        sa.Column("body_preview", sa.String(2000), nullable=True),
        sa.Column("full_body", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "priority",
            sa.Enum("CRITICO", "ALTO", "MEDIO", "BAIXO", name="prioritylevel"),
            nullable=False,
            server_default="BAIXO",
        ),
        sa.Column("category", sa.String(200), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("keywords_found", sa.JSON(), nullable=True),
        sa.Column("action_required", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("is_spam", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("has_attachments", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("attachment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("whatsapp_sent", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("whatsapp_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_time_ms", sa.Float(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_records_message_id", "email_records", ["message_id"], unique=True)
    op.create_index("ix_email_records_sender_email", "email_records", ["sender_email"])
    op.create_index("ix_email_records_received_at", "email_records", ["received_at"])
    op.create_index("ix_email_records_priority", "email_records", ["priority"])
    op.create_index("ix_email_records_is_spam", "email_records", ["is_spam"])
    op.create_index("ix_email_records_whatsapp_sent", "email_records", ["whatsapp_sent"])

    op.create_table(
        "email_attachments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email_id", sa.Integer(), sa.ForeignKey("email_records.id", ondelete="CASCADE"), nullable=False),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(2000), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("file_type", sa.String(200), nullable=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("ocr_text", sa.Text(), nullable=True),
        sa.Column("pdf_text", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("invoice_data", sa.JSON(), nullable=True),
        sa.Column("is_malicious", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("scan_result", sa.String(500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_email_attachments_email_id", "email_attachments", ["email_id"])

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email_id", sa.Integer(), sa.ForeignKey("email_records.id", ondelete="CASCADE"), nullable=True),
        sa.Column(
            "channel",
            sa.Enum("whatsapp", "email", "webhook", name="notificationchannel"),
            nullable=False,
        ),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("message_body", sa.Text(), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pendente", "enviado", "falhou", "reenvio", name="notificationstatus"),
            nullable=False,
            server_default="pendente",
        ),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_id", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_notification_logs_email_id", "notification_logs", ["email_id"])
    op.create_index("ix_notification_logs_status", "notification_logs", ["status"])

    op.create_table(
        "processing_logs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("action", sa.String(200), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("error_type", sa.String(200), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("context", sa.JSON(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_processing_logs_action", "processing_logs", ["action"])
    op.create_index("ix_processing_logs_timestamp", "processing_logs", ["timestamp"])
    op.create_index("ix_processing_logs_success", "processing_logs", ["success"])


def downgrade() -> None:
    op.drop_table("processing_logs")
    op.drop_table("notification_logs")
    op.drop_table("email_attachments")
    op.drop_table("email_records")
    op.execute("DROP TYPE IF EXISTS prioritylevel")
    op.execute("DROP TYPE IF EXISTS notificationchannel")
    op.execute("DROP TYPE IF EXISTS notificationstatus")
