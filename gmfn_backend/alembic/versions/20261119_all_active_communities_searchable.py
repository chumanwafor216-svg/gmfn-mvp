"""make every active community searchable"""

from alembic import op
import sqlalchemy as sa


revision = "20261119_universal_clan_search"
down_revision = "20261118_corrected_community_entry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            UPDATE clans
            SET search_join_enabled = TRUE
            WHERE status = 'active'
            """
        )
    )
    with op.batch_alter_table("clans") as batch_op:
        batch_op.alter_column(
            "search_join_enabled",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=sa.true(),
        )


def downgrade() -> None:
    with op.batch_alter_table("clans") as batch_op:
        batch_op.alter_column(
            "search_join_enabled",
            existing_type=sa.Boolean(),
            existing_nullable=False,
            server_default=sa.false(),
        )
