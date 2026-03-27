"""add user trust columns

Revision ID: 2bef989afc5f
Revises: 7c13a2345ec5
Create Date: 2026-02-18
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "2bef989afc5f"
down_revision = "7c13a2345ec5"
branch_labels = None
depends_on = None


def _has_column(conn, table: str, column: str) -> bool:
    rows = conn.execute(sa.text(f"PRAGMA table_info('{table}')")).fetchall()
    cols = {r[1] for r in rows}
    return column in cols


def upgrade() -> None:
    bind = op.get_bind()

    if bind.dialect.name != "sqlite":
        op.add_column("users", sa.Column("trust_score", sa.Numeric(10, 4), nullable=False, server_default="0"))
        op.add_column("users", sa.Column("trust_band", sa.String(length=32), nullable=True))
        op.add_column("users", sa.Column("trust_breakdown_json", sa.Text(), nullable=True))
        op.add_column("users", sa.Column("trust_score_updated_at", sa.DateTime(timezone=True), nullable=True))
        return

    if not _has_column(bind, "users", "trust_score"):
        op.add_column("users", sa.Column("trust_score", sa.Numeric(10, 4), nullable=False, server_default="0"))

    if not _has_column(bind, "users", "trust_band"):
        op.add_column("users", sa.Column("trust_band", sa.String(length=32), nullable=True))

    if not _has_column(bind, "users", "trust_breakdown_json"):
        op.add_column("users", sa.Column("trust_breakdown_json", sa.Text(), nullable=True))

    if not _has_column(bind, "users", "trust_score_updated_at"):
        op.add_column("users", sa.Column("trust_score_updated_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("users") as batch:
        for col in ("trust_score_updated_at", "trust_breakdown_json", "trust_band", "trust_score"):
            try:
                batch.drop_column(col)
            except Exception:
                pass