"""add private per-user Spotlight campaign preferences"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261126_spotlight_campaign_preferences"
down_revision: Union[str, Sequence[str], None] = "20261125_product_likes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "spotlight_campaign_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("campaign_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("saved", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("liked", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["campaign_id"],
            ["spotlight_campaigns.id"],
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "campaign_id",
            "user_id",
            name="uq_spotlight_campaign_preferences_campaign_user",
        ),
    )
    op.create_index(
        "ix_spotlight_campaign_preferences_id",
        "spotlight_campaign_preferences",
        ["id"],
        unique=False,
    )
    op.create_index(
        "ix_spotlight_campaign_preferences_campaign_id",
        "spotlight_campaign_preferences",
        ["campaign_id"],
        unique=False,
    )
    op.create_index(
        "ix_spotlight_campaign_preferences_user_id",
        "spotlight_campaign_preferences",
        ["user_id"],
        unique=False,
    )
    op.create_index(
        "ix_spotlight_campaign_preferences_user_saved",
        "spotlight_campaign_preferences",
        ["user_id", "saved", "updated_at"],
        unique=False,
    )
    op.create_index(
        "ix_spotlight_campaign_preferences_user_liked",
        "spotlight_campaign_preferences",
        ["user_id", "liked", "updated_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_spotlight_campaign_preferences_user_liked",
        table_name="spotlight_campaign_preferences",
    )
    op.drop_index(
        "ix_spotlight_campaign_preferences_user_saved",
        table_name="spotlight_campaign_preferences",
    )
    op.drop_index(
        "ix_spotlight_campaign_preferences_user_id",
        table_name="spotlight_campaign_preferences",
    )
    op.drop_index(
        "ix_spotlight_campaign_preferences_campaign_id",
        table_name="spotlight_campaign_preferences",
    )
    op.drop_index(
        "ix_spotlight_campaign_preferences_id",
        table_name="spotlight_campaign_preferences",
    )
    op.drop_table("spotlight_campaign_preferences")
