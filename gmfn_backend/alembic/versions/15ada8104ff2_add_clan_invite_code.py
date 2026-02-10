"""add clan invite_code

Revision ID: 15ada8104ff2
Revises: 36c348739e89
Create Date: 2026-01-XX
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "15ada8104ff2"
down_revision = "36c348739e89"
branch_labels = None
depends_on = None


def _has_column(table_name: str, column_name: str) -> bool:
    bind = op.get_bind()
    insp = sa.inspect(bind)
    cols = [c["name"] for c in insp.get_columns(table_name)]
    return column_name in cols


def upgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    # Safety: if table doesn't exist (fresh/partial states), do nothing
    if not insp.has_table("clans"):
        return

    # 1) Add column if missing (guarded so reruns won't crash)
    if not _has_column("clans", "invite_code"):
        op.add_column(
            "clans",
            sa.Column("invite_code", sa.String(length=32), nullable=True),
        )

    # 2) Backfill existing rows so we can enforce NOT NULL
    #    SQLite-friendly random invite codes:
    #    16 hex chars from randomblob(8) => e.g. "A1B2C3D4E5F6A7B8"
    op.execute(
        """
        UPDATE clans
        SET invite_code = LOWER(SUBSTR(HEX(RANDOMBLOB(8)), 1, 16))
        WHERE invite_code IS NULL OR invite_code = '';
        """
    )

    # 3) Enforce NOT NULL using batch_alter_table (SQLite requires this)
    with op.batch_alter_table("clans") as batch_op:
        batch_op.alter_column(
            "invite_code",
            existing_type=sa.String(length=32),
            nullable=False,
        )

    # 4) Optional: add index if you want fast lookups (guarded via try)
    # If you already have ix_clans_invite_code, this won't be needed.
    try:
        op.create_index("ix_clans_invite_code", "clans", ["invite_code"], unique=False)
    except Exception:
        # Index probably already exists; ignore
        pass


def downgrade() -> None:
    bind = op.get_bind()
    insp = sa.inspect(bind)

    if not insp.has_table("clans"):
        return

    # Drop index if present
    try:
        op.drop_index("ix_clans_invite_code", table_name="clans")
    except Exception:
        pass

    # Drop column (SQLite: batch operation)
    if _has_column("clans", "invite_code"):
        with op.batch_alter_table("clans") as batch_op:
            batch_op.drop_column("invite_code")
