"""add join request applicant fields

Revision ID: 662d715feb98
Revises: f3c2c95a3767
Create Date: 2026-03-19 09:29:54.399350
"""

from alembic import op
import sqlalchemy as sa

revision = "662d715feb98"
down_revision = "f3c2c95a3767"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "clan_join_votes",
        sa.Column("clan_id", sa.Integer(), nullable=True),
    )
    op.add_column(
        "clan_join_votes",
        sa.Column("vote", sa.String(length=10), nullable=True),
    )
    op.create_index(
        "ix_clan_join_votes_clan_id",
        "clan_join_votes",
        ["clan_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_clan_join_votes_clan_id", table_name="clan_join_votes")
    op.drop_column("clan_join_votes", "vote")
    op.drop_column("clan_join_votes", "clan_id")