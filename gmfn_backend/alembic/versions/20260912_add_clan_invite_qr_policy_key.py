"""add clan invite qr policy key

Revision ID: 20260912_clan_invite_qr_policy
Revises: 20260911_market_attention
Create Date: 2026-09-12
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260912_clan_invite_qr_policy"
down_revision: Union[str, Sequence[str], None] = "20260911_market_attention"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_column(bind, table_name: str, column_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(column["name"] == column_name for column in sa.inspect(bind).get_columns(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "clan_invites") and not _has_column(bind, "clan_invites", "qr_policy_key"):
        op.add_column("clan_invites", sa.Column("qr_policy_key", sa.String(length=32), nullable=True))


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, "clan_invites") and _has_column(bind, "clan_invites", "qr_policy_key"):
        op.drop_column("clan_invites", "qr_policy_key")