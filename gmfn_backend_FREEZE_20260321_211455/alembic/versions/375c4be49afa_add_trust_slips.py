"""add trust slips (SQLite-safe, idempotent)

Revision ID: 375c4be49afa
Revises: 7a32a1e5470f
Create Date: 2026-02-18

Why:
SQLite test runs were failing with:
  sqlite3.OperationalError: table trust_slips already exists

Root causes can include:
- schema created before Alembic (create_all), or
- duplicate migrations creating same table.

Fix:
- On SQLite, if trust_slips already exists, do nothing (idempotent).
- On other dialects, create normally.
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "375c4be49afa"
down_revision = "7a32a1e5470f"
branch_labels = None
depends_on = None


def _has_table(name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    return bool(insp.has_table(name))


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    # SQLite hardening: if table already exists, do nothing.
    if dialect == "sqlite" and _has_table("trust_slips"):
        return

    op.create_table(
        "trust_slips",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("holder_user_id", sa.Integer(), nullable=False),
        sa.Column("trust_limit", sa.Numeric(18, 2), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="NGN"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_release_at", sa.DateTime(timezone=True), nullable=True),
    )

    # indexes (safe / helpful)
    op.create_index("ix_trust_slips_clan_id_v1", "trust_slips", ["clan_id"])
    op.create_index("ix_trust_slips_holder_user_id_v1", "trust_slips", ["holder_user_id"])
    op.create_index("uq_trust_slips_code_v1", "trust_slips", ["code"], unique=True)


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect == "sqlite":
        op.execute("DROP TABLE IF EXISTS trust_slips")
        return

    op.drop_index("uq_trust_slips_code_v1", table_name="trust_slips")
    op.drop_index("ix_trust_slips_holder_user_id_v1", table_name="trust_slips")
    op.drop_index("ix_trust_slips_clan_id_v1", table_name="trust_slips")
    op.drop_table("trust_slips")