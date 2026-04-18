"""add entry bank details and payout destinations

Revision ID: 20260418_add_entry_bank_details_and_payout_destinations
Revises: 20260418_add_entry_phone_verifications
Create Date: 2026-04-18
"""

from alembic import op
import sqlalchemy as sa


revision = "20260418_add_entry_bank_details_and_payout_destinations"
down_revision = "20260418_add_entry_phone_verifications"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_account_name", sa.String(length=160), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_name", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_account_number", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_country", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_currency", sa.String(length=8), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_phone_number", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("driver_licence_number", sa.String(length=120), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("driver_licence_country", sa.String(length=64), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("driver_licence_note", sa.Text(), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("bank_details_recorded_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "entry_phone_verifications",
        sa.Column("driver_licence_recorded_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_table(
        "user_payout_destinations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("destination_name", sa.String(length=160), nullable=False),
        sa.Column("bank_name", sa.String(length=120), nullable=False),
        sa.Column("account_number", sa.String(length=64), nullable=False),
        sa.Column("phone_number", sa.String(length=32), nullable=True),
        sa.Column("country", sa.String(length=64), nullable=True),
        sa.Column("currency", sa.String(length=8), nullable=True),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column(
            "verification_status",
            sa.String(length=32),
            nullable=False,
            server_default="recorded",
        ),
        sa.Column("verification_note", sa.Text(), nullable=True),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("CURRENT_TIMESTAMP"),
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", name="uq_user_payout_destination_user_id"),
    )
    op.create_index(
        op.f("ix_user_payout_destinations_id"),
        "user_payout_destinations",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_user_payout_destinations_user_id"),
        "user_payout_destinations",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_payout_destinations_user_id"), table_name="user_payout_destinations")
    op.drop_index(op.f("ix_user_payout_destinations_id"), table_name="user_payout_destinations")
    op.drop_table("user_payout_destinations")

    op.drop_column("entry_phone_verifications", "bank_details_recorded_at")
    op.drop_column("entry_phone_verifications", "driver_licence_recorded_at")
    op.drop_column("entry_phone_verifications", "driver_licence_note")
    op.drop_column("entry_phone_verifications", "driver_licence_country")
    op.drop_column("entry_phone_verifications", "driver_licence_number")
    op.drop_column("entry_phone_verifications", "bank_note")
    op.drop_column("entry_phone_verifications", "bank_phone_number")
    op.drop_column("entry_phone_verifications", "bank_currency")
    op.drop_column("entry_phone_verifications", "bank_country")
    op.drop_column("entry_phone_verifications", "bank_account_number")
    op.drop_column("entry_phone_verifications", "bank_name")
    op.drop_column("entry_phone_verifications", "bank_account_name")
