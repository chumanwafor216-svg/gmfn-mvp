"""add entry phone verifications

Revision ID: 20260418_add_entry_phone_verifications
Revises: 20260418_add_user_display_name
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_entry_phone_verifications"
down_revision = "20260418_add_user_display_name"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_table(bind, "entry_phone_verifications"):
        op.create_table(
            "entry_phone_verifications",
            sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
            sa.Column("display_name", sa.String(length=120), nullable=False),
            sa.Column("phone_e164", sa.String(length=32), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=True),
            sa.Column("code", sa.String(length=12), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        )

    if not _has_index(bind, "entry_phone_verifications", "ix_entry_phone_verifications_phone_e164"):
        op.create_index(
            "ix_entry_phone_verifications_phone_e164",
            "entry_phone_verifications",
            ["phone_e164"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_index(bind, "entry_phone_verifications", "ix_entry_phone_verifications_phone_e164"):
        op.drop_index(
            "ix_entry_phone_verifications_phone_e164",
            table_name="entry_phone_verifications",
        )

    if _has_table(bind, "entry_phone_verifications"):
        op.drop_table("entry_phone_verifications")
