"""add supervised activation assistance challenges

Revision ID: 20261106_assisted_activation
Revises: 20261106_activation_phone
Create Date: 2026-11-06
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261106_assisted_activation"
down_revision: Union[str, Sequence[str], None] = "20261106_activation_phone"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "account_activation_assistance_challenges",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activation_grant_id", sa.Integer(), nullable=False),
        sa.Column("join_request_id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("applicant_user_id", sa.Integer(), nullable=False),
        sa.Column("issued_by_user_id", sa.Integer(), nullable=False),
        sa.Column("code_digest", sa.String(length=128), nullable=False),
        sa.Column("verification_note", sa.String(length=240), nullable=False),
        sa.Column("check_attempts", sa.Integer(), server_default="0", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("consumed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("CURRENT_TIMESTAMP"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["activation_grant_id"], ["account_activation_grants.id"],
            name="fk_activation_assist_grant", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["join_request_id"], ["clan_join_requests.id"],
            name="fk_activation_assist_request", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["clan_id"], ["clans.id"],
            name="fk_activation_assist_clan", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["applicant_user_id"], ["users.id"],
            name="fk_activation_assist_applicant", ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["issued_by_user_id"], ["users.id"],
            name="fk_activation_assist_issuer",
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    for column in (
        "activation_grant_id",
        "join_request_id",
        "clan_id",
        "applicant_user_id",
        "issued_by_user_id",
        "expires_at",
        "created_at",
    ):
        op.create_index(
            f"ix_activation_assist_{column}",
            "account_activation_assistance_challenges",
            [column],
            unique=False,
        )


def downgrade() -> None:
    op.drop_table("account_activation_assistance_challenges")
