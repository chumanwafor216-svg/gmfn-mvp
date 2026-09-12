"""add clan qr preapprovals

Revision ID: 20260912_clan_qr_preapprovals
Revises: 20260912_clan_invite_qr_policy
Create Date: 2026-09-12
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260912_clan_qr_preapprovals"
down_revision: Union[str, Sequence[str], None] = "20260912_clan_invite_qr_policy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def upgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "clan_qr_preapprovals"):
        return

    op.create_table(
        "clan_qr_preapprovals",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("added_by_user_id", sa.Integer(), nullable=False),
        sa.Column("match_type", sa.String(length=16), nullable=False),
        sa.Column("match_value", sa.String(length=160), nullable=False),
        sa.Column("display_name", sa.String(length=160), nullable=True),
        sa.Column("phone_e164", sa.String(length=32), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("gmfn_id", sa.String(length=64), nullable=True),
        sa.Column("approval_note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.Column("matched_user_id", sa.Integer(), nullable=True),
        sa.Column("matched_join_request_id", sa.Integer(), nullable=True),
        sa.Column("matched_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["added_by_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["clan_id"], ["clans.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["matched_join_request_id"], ["clan_join_requests.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["matched_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("clan_id", "match_type", "match_value", name="uq_clan_qr_preapproval_match"),
    )
    op.create_index("ix_clan_qr_preapprovals_clan_id", "clan_qr_preapprovals", ["clan_id"])
    op.create_index("ix_clan_qr_preapprovals_added_by_user_id", "clan_qr_preapprovals", ["added_by_user_id"])
    op.create_index("ix_clan_qr_preapprovals_matched_user_id", "clan_qr_preapprovals", ["matched_user_id"])
    op.create_index("ix_clan_qr_preapprovals_matched_join_request_id", "clan_qr_preapprovals", ["matched_join_request_id"])
    op.create_index("ix_clan_qr_preapprovals_status", "clan_qr_preapprovals", ["status"])
    op.create_index("ix_clan_qr_preapprovals_clan_status", "clan_qr_preapprovals", ["clan_id", "status"])
    op.create_index("ix_clan_qr_preapprovals_match", "clan_qr_preapprovals", ["match_type", "match_value"])


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "clan_qr_preapprovals"):
        op.drop_table("clan_qr_preapprovals")