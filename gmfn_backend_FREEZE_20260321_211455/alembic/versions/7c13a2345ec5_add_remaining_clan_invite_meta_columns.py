"""add remaining clan invite meta columns

Revision ID: 7c13a2345ec5
Revises: 80c4524d117e
Create Date: 2026-02-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "7c13a2345ec5"
down_revision = "80c4524d117e"
branch_labels = None
depends_on = None


def _has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(sa.text(f"PRAGMA table_info('{table}')")).fetchall()
    cols = {r[1] for r in rows}  # (cid, name, type, notnull, dflt_value, pk)
    return column in cols


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "sqlite":
        op.add_column("clans", sa.Column("invite_created_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column("clans", sa.Column("invite_expires_at", sa.DateTime(timezone=True), nullable=True))
        op.add_column("clans", sa.Column("max_members", sa.Integer(), nullable=True))
        op.add_column("clans", sa.Column("auto_refill_invites", sa.Boolean(), nullable=False, server_default="0"))
        op.add_column("clans", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))
        return

    # SQLite-safe drift-tolerant adds
    if not _has_column(bind, "clans", "invite_created_at"):
        op.add_column("clans", sa.Column("invite_created_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_column(bind, "clans", "invite_expires_at"):
        op.add_column("clans", sa.Column("invite_expires_at", sa.DateTime(timezone=True), nullable=True))

    if not _has_column(bind, "clans", "max_members"):
        op.add_column("clans", sa.Column("max_members", sa.Integer(), nullable=True))

    if not _has_column(bind, "clans", "auto_refill_invites"):
        op.add_column("clans", sa.Column("auto_refill_invites", sa.Boolean(), nullable=False, server_default="0"))

    if not _has_column(bind, "clans", "created_at"):
        op.add_column("clans", sa.Column("created_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("clans") as batch:
        for col in ("created_at", "auto_refill_invites", "max_members", "invite_expires_at", "invite_created_at"):
            try:
                batch.drop_column(col)
            except Exception:
                pass