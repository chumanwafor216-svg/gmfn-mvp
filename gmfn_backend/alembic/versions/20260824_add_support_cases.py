"""add support case desk

Revision ID: 20260824_support_cases
Revises: 20260726_trustslip_dp_consent_share
Create Date: 2026-08-24
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "20260824_support_cases"
down_revision = "20260726_trustslip_dp_consent_share"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _create_index(bind, table_name: str, index_name: str, columns: list[str], *, unique: bool = False) -> None:
    if not _has_index(bind, table_name, index_name):
        op.create_index(index_name, table_name, columns, unique=unique)


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "support_cases"):
        op.create_table(
            "support_cases",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("public_id", sa.String(length=40), nullable=False),
            sa.Column("requester_user_id", sa.Integer(), nullable=False),
            sa.Column("clan_id", sa.Integer(), nullable=True),
            sa.Column("assigned_admin_user_id", sa.Integer(), nullable=True),
            sa.Column("issue_type", sa.String(length=40), nullable=False),
            sa.Column("subject", sa.String(length=160), nullable=False),
            sa.Column("status", sa.String(length=24), nullable=False, server_default="waiting_admin"),
            sa.Column("priority", sa.String(length=20), nullable=False, server_default="normal"),
            sa.Column("source_path", sa.String(length=512), nullable=True),
            sa.Column("last_message_preview", sa.String(length=220), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("last_activity_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(["assigned_admin_user_id"], ["users.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["requester_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_table(bind, "support_case_messages"):
        op.create_table(
            "support_case_messages",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("support_case_id", sa.Integer(), nullable=False),
            sa.Column("author_user_id", sa.Integer(), nullable=False),
            sa.Column("author_role", sa.String(length=16), nullable=False),
            sa.Column("body", sa.Text(), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["author_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["support_case_id"], ["support_cases.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    if not _has_table(bind, "support_case_attachments"):
        op.create_table(
            "support_case_attachments",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("support_case_id", sa.Integer(), nullable=False),
            sa.Column("message_id", sa.Integer(), nullable=True),
            sa.Column("uploaded_by_user_id", sa.Integer(), nullable=False),
            sa.Column("file_name", sa.String(length=255), nullable=False),
            sa.Column("content_type", sa.String(length=120), nullable=False),
            sa.Column("storage_key", sa.String(length=512), nullable=False),
            sa.Column("url", sa.String(length=512), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
            sa.ForeignKeyConstraint(["message_id"], ["support_case_messages.id"], ondelete="SET NULL"),
            sa.ForeignKeyConstraint(["support_case_id"], ["support_cases.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["uploaded_by_user_id"], ["users.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
        )

    _create_index(bind, "support_cases", "ix_support_cases_id", ["id"])
    _create_index(bind, "support_cases", "ix_support_cases_public_id", ["public_id"], unique=True)
    _create_index(bind, "support_cases", "ix_support_cases_requester_user_id", ["requester_user_id"])
    _create_index(bind, "support_cases", "ix_support_cases_clan_id", ["clan_id"])
    _create_index(bind, "support_cases", "ix_support_cases_assigned_admin_user_id", ["assigned_admin_user_id"])
    _create_index(bind, "support_cases", "ix_support_cases_issue_type", ["issue_type"])
    _create_index(bind, "support_cases", "ix_support_cases_status", ["status"])
    _create_index(bind, "support_cases", "ix_support_cases_requester_status", ["requester_user_id", "status"])
    _create_index(bind, "support_cases", "ix_support_cases_status_updated", ["status", "updated_at"])
    _create_index(bind, "support_cases", "ix_support_cases_clan_status", ["clan_id", "status"])

    _create_index(bind, "support_case_messages", "ix_support_case_messages_id", ["id"])
    _create_index(bind, "support_case_messages", "ix_support_case_messages_support_case_id", ["support_case_id"])
    _create_index(bind, "support_case_messages", "ix_support_case_messages_author_user_id", ["author_user_id"])
    _create_index(bind, "support_case_messages", "ix_support_case_messages_case_created", ["support_case_id", "created_at"])
    _create_index(bind, "support_case_messages", "ix_support_case_messages_author", ["author_user_id"])

    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_id", ["id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_support_case_id", ["support_case_id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_message_id", ["message_id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_uploaded_by_user_id", ["uploaded_by_user_id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_case", ["support_case_id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_message", ["message_id"])
    _create_index(bind, "support_case_attachments", "ix_support_case_attachments_uploader", ["uploaded_by_user_id"])


def downgrade() -> None:
    bind = op.get_bind()
    for table_name, indexes in (
        (
            "support_case_attachments",
            [
                "ix_support_case_attachments_uploader",
                "ix_support_case_attachments_message",
                "ix_support_case_attachments_case",
                "ix_support_case_attachments_uploaded_by_user_id",
                "ix_support_case_attachments_message_id",
                "ix_support_case_attachments_support_case_id",
                "ix_support_case_attachments_id",
            ],
        ),
        (
            "support_case_messages",
            [
                "ix_support_case_messages_author",
                "ix_support_case_messages_case_created",
                "ix_support_case_messages_author_user_id",
                "ix_support_case_messages_support_case_id",
                "ix_support_case_messages_id",
            ],
        ),
        (
            "support_cases",
            [
                "ix_support_cases_clan_status",
                "ix_support_cases_status_updated",
                "ix_support_cases_requester_status",
                "ix_support_cases_status",
                "ix_support_cases_issue_type",
                "ix_support_cases_assigned_admin_user_id",
                "ix_support_cases_clan_id",
                "ix_support_cases_requester_user_id",
                "ix_support_cases_public_id",
                "ix_support_cases_id",
            ],
        ),
    ):
        for index_name in indexes:
            if _has_index(bind, table_name, index_name):
                op.drop_index(index_name, table_name=table_name)

    for table_name in ("support_case_attachments", "support_case_messages", "support_cases"):
        if _has_table(bind, table_name):
            op.drop_table(table_name)