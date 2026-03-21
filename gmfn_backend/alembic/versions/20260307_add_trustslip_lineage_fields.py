"""add trustslip lineage fields

Revision ID: 20260307_add_trustslip_lineage_fields
Revises: 20260307_add_trustslip_snapshot_fields
Create Date: 2026-03-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


revision = "20260307_add_trustslip_lineage_fields"
down_revision = "20260307_add_trustslip_snapshot_fields"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    cols = [c["name"] for c in inspector.get_columns(table_name)]
    return column_name in cols


def _has_index(table_name: str, index_name: str) -> bool:
    bind = op.get_bind()
    inspector = inspect(bind)
    indexes = [ix["name"] for ix in inspector.get_indexes(table_name)]
    return index_name in indexes


def upgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if not _has_column("trust_slips", "is_current"):
        op.add_column(
            "trust_slips",
            sa.Column(
                "is_current",
                sa.Boolean(),
                nullable=False,
                server_default="1",
            ),
        )

    if not _has_column("trust_slips", "issued_reason"):
        op.add_column(
            "trust_slips",
            sa.Column(
                "issued_reason",
                sa.String(length=255),
                nullable=True,
            ),
        )

    if not _has_column("trust_slips", "supersedes_trust_slip_id"):
        op.add_column(
            "trust_slips",
            sa.Column(
                "supersedes_trust_slip_id",
                sa.Integer(),
                nullable=True,
            ),
        )

    if not _has_column("trust_slips", "superseded_by_trust_slip_id"):
        op.add_column(
            "trust_slips",
            sa.Column(
                "superseded_by_trust_slip_id",
                sa.Integer(),
                nullable=True,
            ),
        )

    if not _has_index("trust_slips", "ix_trust_slips_is_current"):
        op.create_index(
            "ix_trust_slips_is_current",
            "trust_slips",
            ["is_current"],
            unique=False,
        )

    # SQLite cannot add FK constraints with ALTER TABLE safely here.
    # We keep lineage columns without DB-level FK constraints for SQLite.
    # On non-SQLite, add the foreign keys.
    if dialect != "sqlite":
        op.create_foreign_key(
            "fk_trust_slips_supersedes",
            "trust_slips",
            "trust_slips",
            ["supersedes_trust_slip_id"],
            ["id"],
            ondelete="SET NULL",
        )
        op.create_foreign_key(
            "fk_trust_slips_superseded_by",
            "trust_slips",
            "trust_slips",
            ["superseded_by_trust_slip_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()
    dialect = bind.dialect.name

    if dialect != "sqlite":
        try:
            op.drop_constraint("fk_trust_slips_superseded_by", "trust_slips", type_="foreignkey")
        except Exception:
            pass
        try:
            op.drop_constraint("fk_trust_slips_supersedes", "trust_slips", type_="foreignkey")
        except Exception:
            pass

    if _has_index("trust_slips", "ix_trust_slips_is_current"):
        op.drop_index("ix_trust_slips_is_current", table_name="trust_slips")

    if _has_column("trust_slips", "superseded_by_trust_slip_id"):
        op.drop_column("trust_slips", "superseded_by_trust_slip_id")

    if _has_column("trust_slips", "supersedes_trust_slip_id"):
        op.drop_column("trust_slips", "supersedes_trust_slip_id")

    if _has_column("trust_slips", "issued_reason"):
        op.drop_column("trust_slips", "issued_reason")

    if _has_column("trust_slips", "is_current"):
        op.drop_column("trust_slips", "is_current")