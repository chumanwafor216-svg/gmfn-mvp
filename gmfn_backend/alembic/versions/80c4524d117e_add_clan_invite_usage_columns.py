"""add clan invite usage columns

Revision ID: 80c4524d117e
Revises: 0764d54ac0b4
Create Date: 2026-02-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "80c4524d117e"
down_revision = "0764d54ac0b4"
branch_labels = None
depends_on = None


def _has_column(conn, table: str, column: str) -> bool:
    inspector = sa.inspect(conn)
    cols = {col_info["name"] for col_info in inspector.get_columns(table)}
    return column in cols


def upgrade() -> None:
    bind = op.get_bind()

    # Non-sqlite best-effort
    if bind.dialect.name != "sqlite":
        op.add_column("clans", sa.Column("invite_max_uses", sa.Integer(), nullable=True))
        op.add_column("clans", sa.Column("invite_uses", sa.Integer(), nullable=False, server_default="0"))
        return

    # SQLite-safe, drift-tolerant
    if not _has_column(bind, "clans", "invite_max_uses"):
        op.add_column("clans", sa.Column("invite_max_uses", sa.Integer(), nullable=True))

    if not _has_column(bind, "clans", "invite_uses"):
        op.add_column("clans", sa.Column("invite_uses", sa.Integer(), nullable=False, server_default="0"))


def downgrade() -> None:
    with op.batch_alter_table("clans") as batch:
        try:
            batch.drop_column("invite_uses")
        except Exception:
            pass
        try:
            batch.drop_column("invite_max_uses")
        except Exception:
            pass
