"""add membership admission policy

Revision ID: 20261015_membership_admission
Revises: 20261012_spotlight_pacing_state
Create Date: 2026-10-15
"""

from __future__ import annotations

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261015_membership_admission"
down_revision: Union[str, Sequence[str], None] = "20261012_spotlight_pacing_state"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _has_table(bind, table_name: str) -> bool:
    return sa.inspect(bind).has_table(table_name)


def _has_column(bind, table_name: str, column_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(
        column["name"] == column_name
        for column in sa.inspect(bind).get_columns(table_name)
    )


def _has_index(bind, table_name: str, index_name: str) -> bool:
    if not _has_table(bind, table_name):
        return False
    return any(
        index.get("name") == index_name
        for index in sa.inspect(bind).get_indexes(table_name)
    )


def upgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, "clans"):
        if not _has_column(bind, "clans", "admission_mode"):
            op.add_column(
                "clans",
                sa.Column("admission_mode", sa.String(length=32), nullable=True),
            )
        if not _has_column(bind, "clans", "voting_admin_override"):
            op.add_column(
                "clans",
                sa.Column(
                    "voting_admin_override",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
        if not _has_index(bind, "clans", "ix_clans_admission_mode"):
            op.create_index("ix_clans_admission_mode", "clans", ["admission_mode"])

    if _has_table(bind, "clan_invites"):
        if not _has_column(bind, "clan_invites", "admission_mode"):
            op.add_column(
                "clan_invites",
                sa.Column("admission_mode", sa.String(length=32), nullable=True),
            )
        if not _has_column(bind, "clan_invites", "voting_admin_override"):
            op.add_column(
                "clan_invites",
                sa.Column(
                    "voting_admin_override",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                ),
            )
        if not _has_index(bind, "clan_invites", "ix_clan_invites_admission_mode"):
            op.create_index(
                "ix_clan_invites_admission_mode",
                "clan_invites",
                ["admission_mode"],
            )


def downgrade() -> None:
    bind = op.get_bind()

    if _has_table(bind, "clan_invites"):
        if _has_index(bind, "clan_invites", "ix_clan_invites_admission_mode"):
            op.drop_index("ix_clan_invites_admission_mode", table_name="clan_invites")
        if _has_column(bind, "clan_invites", "voting_admin_override"):
            op.drop_column("clan_invites", "voting_admin_override")
        if _has_column(bind, "clan_invites", "admission_mode"):
            op.drop_column("clan_invites", "admission_mode")

    if _has_table(bind, "clans"):
        if _has_index(bind, "clans", "ix_clans_admission_mode"):
            op.drop_index("ix_clans_admission_mode", table_name="clans")
        if _has_column(bind, "clans", "voting_admin_override"):
            op.drop_column("clans", "voting_admin_override")
        if _has_column(bind, "clans", "admission_mode"):
            op.drop_column("clans", "admission_mode")
