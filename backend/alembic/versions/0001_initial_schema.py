"""schema inicial — e-mails, anexos, notificações e logs

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-07-02

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "0001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False: os tipos ENUM são criados explicitamente abaixo (checkfirst=True)
# para evitar que o SQLAlchemy tente recriá-los ao criar cada tabela.
# Os tokens usam os *nomes* dos membros Python Enum (ex: "CRITICAL"), não os
# valores em português (ex: "CRITICO") — é esse o comportamento padrão do
# sqlalchemy.Enum(PythonEnumClass) sem values_callable, usado nos modelos.
priority_level = postgresql.ENUM(
    "CRITICAL", "HIGH", "MEDIUM", "LOW", name="prioritylevel", create_type=False
)
notification_channel = postgresql.ENUM(
    "WHATSAPP", "EMAIL", "WEBHOOK", name="notificationchannel", create_type=False
)
notification_status = postgresql.ENUM(
    "PENDING", "SENT", "FAILED", "RETRY", name="notificationstatus", create_type=False
)


def upgrade() -> None:
    bind = op.get_bind()
    priority_level.create(bind, checkfirst=True)
    notification_channel.create(bind, checkfirst=True)
    notification_status.create(bind, checkfirst=True)

    op.create_table(
        "email_records",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("message_id", sa.String(512), nullable=False),
        sa.Column("subject", sa.String(1000), nullable=True),
        sa.Column("sender_email", sa.String(320), nullable=False),
        sa.Column("sender_name", sa.String(500), nullable=True),
        sa.Column("recipients", sa.JSON(), nullable=True),
        sa.Column("body_preview", sa.String(2000), nullable=True),
        sa.Column("full_body", sa.Text(), nullable=True),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("processed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("priority", priority_level, nullable=False, server_default="LOW"),
        sa.Column("category", sa.String(200), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("keywords_found", sa.JSON(), nullable=True),
        sa.Column("action_required", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_spam", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("has_attachments", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("attachment_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("whatsapp_sent", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("whatsapp_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("processing_time_ms", sa.Float(), nullable=True),
        sa.Column("raw_data", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("message_id"),
    )
    op.create_index("ix_email_records_id", "email_records", ["id"])
    op.create_index("ix_email_records_message_id", "email_records", ["message_id"])
    op.create_index("ix_email_records_sender_email", "email_records", ["sender_email"])
    op.create_index("ix_email_records_received_at", "email_records", ["received_at"])
    op.create_index("ix_email_records_priority", "email_records", ["priority"])
    op.create_index("ix_email_records_is_spam", "email_records", ["is_spam"])
    op.create_index("ix_email_records_whatsapp_sent", "email_records", ["whatsapp_sent"])

    op.create_table(
        "email_attachments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "email_id",
            sa.Integer(),
            sa.ForeignKey("email_records.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("filename", sa.String(500), nullable=False),
        sa.Column("original_filename", sa.String(500), nullable=False),
        sa.Column("file_path", sa.String(2000), nullable=False),
        sa.Column("file_size", sa.Integer(), nullable=True),
        sa.Column("file_type", sa.String(200), nullable=True),
        sa.Column("saved_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("ocr_text", sa.Text(), nullable=True),
        sa.Column("pdf_text", sa.Text(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column("invoice_data", sa.JSON(), nullable=True),
        sa.Column("is_malicious", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("scan_result", sa.String(500), nullable=True),
    )
    op.create_index("ix_email_attachments_id", "email_attachments", ["id"])
    op.create_index("ix_email_attachments_email_id", "email_attachments", ["email_id"])

    op.create_table(
        "notification_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "email_id",
            sa.Integer(),
            sa.ForeignKey("email_records.id", ondelete="CASCADE"),
            nullable=True,
        ),
        sa.Column("channel", notification_channel, nullable=False, server_default="WHATSAPP"),
        sa.Column("recipient", sa.String(320), nullable=False),
        sa.Column("message_body", sa.Text(), nullable=False),
        sa.Column("status", notification_status, nullable=False, server_default="PENDING"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("retry_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("external_id", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notification_logs_id", "notification_logs", ["id"])
    op.create_index("ix_notification_logs_email_id", "notification_logs", ["email_id"])
    op.create_index("ix_notification_logs_status", "notification_logs", ["status"])

    op.create_table(
        "processing_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("action", sa.String(200), nullable=False),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("duration_ms", sa.Float(), nullable=True),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("error_type", sa.String(200), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("context", sa.JSON(), nullable=True),
    )
    op.create_index("ix_processing_logs_id", "processing_logs", ["id"])
    op.create_index("ix_processing_logs_action", "processing_logs", ["action"])
    op.create_index("ix_processing_logs_timestamp", "processing_logs", ["timestamp"])
    op.create_index("ix_processing_logs_success", "processing_logs", ["success"])


def downgrade() -> None:
    op.drop_table("processing_logs")
    op.drop_table("notification_logs")
    op.drop_table("email_attachments")
    op.drop_table("email_records")

    bind = op.get_bind()
    notification_status.drop(bind, checkfirst=True)
    notification_channel.drop(bind, checkfirst=True)
    priority_level.drop(bind, checkfirst=True)
