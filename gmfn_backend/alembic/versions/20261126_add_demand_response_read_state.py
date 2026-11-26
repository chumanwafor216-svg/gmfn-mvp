"""add durable Demand Box response read state"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261126_add_demand_response_read_state"
down_revision: Union[str, Sequence[str], None] = "20261126_spotlight_campaign_preferences"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "marketplace_request_responses",
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "UPDATE marketplace_request_responses SET read_at = created_at WHERE read_at IS NULL"
    )
    op.create_index(
        "ix_marketplace_response_recipient_unread_v1",
        "marketplace_request_responses",
        ["recipient_user_id", "read_at", "marketplace_request_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_marketplace_response_recipient_unread_v1",
        table_name="marketplace_request_responses",
    )
    op.drop_column("marketplace_request_responses", "read_at")
