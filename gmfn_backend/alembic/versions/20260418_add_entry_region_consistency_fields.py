"""add entry region consistency fields

Revision ID: 20260418_add_entry_region_consistency_fields
Revises: 20260418_add_notifications_table
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_entry_region_consistency_fields"
down_revision = "20260418_add_notifications_table"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    if not _has_table(bind, table_name):
        return False
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _add_column_if_missing(table_name: str, column: sa.Column) -> None:
    bind = op.get_bind()
    if not _has_column(bind, table_name, column.name):
        op.add_column(table_name, column)


def upgrade() -> None:
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("browser_locale", sa.String(length=32), nullable=True),
    )
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("browser_timezone", sa.String(length=64), nullable=True),
    )
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("phone_country_hint", sa.String(length=16), nullable=True),
    )
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("locale_country_hint", sa.String(length=16), nullable=True),
    )
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("region_consistency_status", sa.String(length=32), nullable=True),
    )
    _add_column_if_missing(
        "entry_phone_verifications",
        sa.Column("region_consistency_note", sa.Text(), nullable=True),
    )

    _add_column_if_missing(
        "user_payout_destinations",
        sa.Column("phone_country_hint", sa.String(length=16), nullable=True),
    )
    _add_column_if_missing(
        "user_payout_destinations",
        sa.Column("locale_country_hint", sa.String(length=16), nullable=True),
    )
    _add_column_if_missing(
        "user_payout_destinations",
        sa.Column("region_consistency_status", sa.String(length=32), nullable=True),
    )
    _add_column_if_missing(
        "user_payout_destinations",
        sa.Column("region_consistency_note", sa.Text(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("user_payout_destinations", "region_consistency_note")
    op.drop_column("user_payout_destinations", "region_consistency_status")
    op.drop_column("user_payout_destinations", "locale_country_hint")
    op.drop_column("user_payout_destinations", "phone_country_hint")

    op.drop_column("entry_phone_verifications", "region_consistency_note")
    op.drop_column("entry_phone_verifications", "region_consistency_status")
    op.drop_column("entry_phone_verifications", "locale_country_hint")
    op.drop_column("entry_phone_verifications", "phone_country_hint")
    op.drop_column("entry_phone_verifications", "browser_timezone")
    op.drop_column("entry_phone_verifications", "browser_locale")
