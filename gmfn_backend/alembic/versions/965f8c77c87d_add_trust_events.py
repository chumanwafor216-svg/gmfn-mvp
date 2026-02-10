"""add trust events

Revision ID: 965f8c77c87d
Revises: bf29c5edc3af
Create Date: 2026-01-29 09:05:18.829432

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '965f8c77c87d'
down_revision: Union[str, Sequence[str], None] = 'bf29c5edc3af'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "trust_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("loan_id", sa.Integer(), nullable=False),
        sa.Column("guarantor_id", sa.Integer(), nullable=True),
        sa.Column("actor_user_id", sa.Integer(), nullable=False),
        sa.Column("subject_user_id", sa.Integer(), nullable=False),
        sa.Column("meta_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )

    op.create_index("ix_trust_events_event_type", "trust_events", ["event_type"])
    op.create_index("ix_trust_events_clan_id", "trust_events", ["clan_id"])
    op.create_index("ix_trust_events_loan_id", "trust_events", ["loan_id"])
    op.create_index("ix_trust_events_actor_user_id", "trust_events", ["actor_user_id"])
    op.create_index("ix_trust_events_subject_user_id", "trust_events", ["subject_user_id"])
    op.create_index("ix_trust_events_created_at", "trust_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_trust_events_created_at", table_name="trust_events")
    op.drop_index("ix_trust_events_subject_user_id", table_name="trust_events")
    op.drop_index("ix_trust_events_actor_user_id", table_name="trust_events")
    op.drop_index("ix_trust_events_loan_id", table_name="trust_events")
    op.drop_index("ix_trust_events_clan_id", table_name="trust_events")
    op.drop_index("ix_trust_events_event_type", table_name="trust_events")

    op.drop_table("trust_events")

