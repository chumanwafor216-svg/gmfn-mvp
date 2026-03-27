"""make trust_events clan_id and loan_id nullable

Revision ID: 6c4b341e82a7
Revises: 965f8c77c87d
Create Date: 2026-01-XX
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "6c4b341e82a7"
down_revision = "965f8c77c87d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ✅ Guard: only run if the table exists (important for SQLite + safety)
    if not inspector.has_table("trust_events"):
        return

    with op.batch_alter_table("trust_events") as batch_op:
        batch_op.alter_column(
            "clan_id",
            existing_type=sa.Integer(),
            nullable=True,
        )
        batch_op.alter_column(
            "loan_id",
            existing_type=sa.Integer(),
            nullable=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if not inspector.has_table("trust_events"):
        return

    with op.batch_alter_table("trust_events") as batch_op:
        batch_op.alter_column(
            "clan_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
        batch_op.alter_column(
            "loan_id",
            existing_type=sa.Integer(),
            nullable=False,
        )
