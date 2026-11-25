"""add private per-user marketplace product likes"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20261125_product_likes"
down_revision: Union[str, Sequence[str], None] = "20261123_product_saves"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "marketplace_product_likes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", "user_id", name="uq_marketplace_product_likes_product_user"),
    )
    op.create_index("ix_marketplace_product_likes_id", "marketplace_product_likes", ["id"], unique=False)
    op.create_index("ix_marketplace_product_likes_user", "marketplace_product_likes", ["user_id", "created_at"], unique=False)
    op.create_index("ix_marketplace_product_likes_product", "marketplace_product_likes", ["product_id", "created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_marketplace_product_likes_product", table_name="marketplace_product_likes")
    op.drop_index("ix_marketplace_product_likes_user", table_name="marketplace_product_likes")
    op.drop_index("ix_marketplace_product_likes_id", table_name="marketplace_product_likes")
    op.drop_table("marketplace_product_likes")