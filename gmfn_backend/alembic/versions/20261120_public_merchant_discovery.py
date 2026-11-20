"""add explicit public merchant discovery publication authority"""

from alembic import op
import sqlalchemy as sa


revision = "20261120_public_merchant_discovery"
down_revision = "20261119_universal_clan_search"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "marketplace_public_discovery_publications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("public_id", sa.String(length=64), nullable=False),
        sa.Column("shop_id", sa.Integer(), nullable=False),
        sa.Column("product_id", sa.Integer(), nullable=False),
        sa.Column("owner_user_id", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=20), server_default="hidden", nullable=False),
        sa.Column(
            "authority_version",
            sa.String(length=40),
            server_default="public-discovery-v1",
            nullable=False,
        ),
        sa.Column(
            "authority_source",
            sa.String(length=32),
            server_default="owner_confirmed",
            nullable=False,
        ),
        sa.Column(
            "notice_version",
            sa.String(length=40),
            server_default="legacy-confirmation-v1",
            nullable=False,
        ),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "state_changed_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "state IN ('published', 'hidden', 'paused', 'withdrawn')",
            name="ck_marketplace_public_discovery_state_v1",
        ),
        sa.CheckConstraint(
            "authority_source = 'owner_confirmed'",
            name="ck_marketplace_public_discovery_authority_v1",
        ),
        sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["product_id"], ["marketplace_products.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["shop_id"], ["marketplace_shops.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("product_id", name="uq_marketplace_public_discovery_product_v1"),
        sa.UniqueConstraint("public_id"),
    )
    op.create_index(
        "ix_marketplace_public_discovery_state_expiry_v1",
        "marketplace_public_discovery_publications",
        ["state", "expires_at"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_shop_state_v1",
        "marketplace_public_discovery_publications",
        ["shop_id", "state"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_public_id_v1",
        "marketplace_public_discovery_publications",
        ["public_id"],
        unique=True,
    )
    op.create_index(
        "ix_marketplace_public_discovery_product_id_v1",
        "marketplace_public_discovery_publications",
        ["product_id"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_owner_user_id_v1",
        "marketplace_public_discovery_publications",
        ["owner_user_id"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_shop_id_v1",
        "marketplace_public_discovery_publications",
        ["shop_id"],
    )

    op.create_table(
        "marketplace_public_discovery_search_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("query_hash", sa.String(length=64), nullable=True),
        sa.Column("result_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("excluded_unavailable_count", sa.Integer(), server_default="0", nullable=False),
        sa.Column("zero_result", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("has_category_filter", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("has_area_filter", sa.Boolean(), server_default=sa.false(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_marketplace_public_discovery_search_created_v1",
        "marketplace_public_discovery_search_events",
        ["created_at"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_search_zero_v1",
        "marketplace_public_discovery_search_events",
        ["zero_result", "created_at"],
    )
    op.create_index(
        "ix_marketplace_public_discovery_search_query_hash_v1",
        "marketplace_public_discovery_search_events",
        ["query_hash"],
    )


def downgrade() -> None:
    op.drop_table("marketplace_public_discovery_search_events")
    op.drop_table("marketplace_public_discovery_publications")
