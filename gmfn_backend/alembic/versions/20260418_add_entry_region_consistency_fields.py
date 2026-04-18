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


def upgrade() -> None:
    op.add_column(
        "entry_phone_verifications",
        sa.Column("browser_locale", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("browser_timezone", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("phone_country_hint", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("locale_country_hint", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("region_consistency_status", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("region_consistency_note", sa.Text(), nullable=True),
    )

    op.add_column(
        "user_payout_destinations",
        sa.Column("phone_country_hint", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "user_payout_destinations",
        sa.Column("locale_country_hint", sa.String(length=16), nullable=True),
    )
    op.add_column(
        "user_payout_destinations",
        sa.Column("region_consistency_status", sa.String(length=32), nullable=True),
    )
    op.add_column(
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
