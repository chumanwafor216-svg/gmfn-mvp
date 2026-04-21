"""add vault access links table

Revision ID: 20260421_add_vault_access_links
Revises: 20260420_add_marketplace_request_clan_id
Create Date: 2026-04-21
"""

from alembic import op
import sqlalchemy as sa


revision = "20260421_add_vault_access_links"
down_revision = "20260420_add_marketplace_request_clan_id"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _has_foreign_key(
    bind,
    table_name: str,
    constraint_name: str,
    constrained_columns: list[str],
    referred_table: str,
) -> bool:
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys(table_name):
        if fk.get("name") == constraint_name:
            return True
        if (
            fk.get("referred_table") == referred_table
            and list(fk.get("constrained_columns") or []) == constrained_columns
        ):
            return True
    return False


def upgrade() -> None:
    bind = op.get_bind()
    has_marketplace_shops = _has_table(bind, "marketplace_shops")

    if not _has_table(bind, "vault_access_links"):
        constraints = [
            sa.ForeignKeyConstraint(
                ["owner_user_id"],
                ["users.id"],
                ondelete="CASCADE",
                name="fk_vault_access_links_owner_user_id_users",
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("token", name="uq_vault_access_links_token"),
        ]
        if has_marketplace_shops:
            constraints.append(
                sa.ForeignKeyConstraint(
                    ["shop_id"],
                    ["marketplace_shops.id"],
                    ondelete="CASCADE",
                    name="fk_vault_access_links_shop_id_marketplace_shops",
                )
            )

        op.create_table(
            "vault_access_links",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("shop_id", sa.Integer(), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("token", sa.String(length=128), nullable=False),
            sa.Column(
                "status",
                sa.String(length=20),
                nullable=False,
                server_default="active",
            ),
            sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("max_views", sa.Integer(), nullable=True),
            sa.Column("views_used", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("allow_download", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("allow_print", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("allow_reshare", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("watermark_enabled", sa.Boolean(), nullable=False, server_default=sa.true()),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column("last_opened_at", sa.DateTime(timezone=True), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                nullable=False,
                server_default=sa.text("CURRENT_TIMESTAMP"),
            ),
            *constraints,
        )
    elif has_marketplace_shops and not _has_foreign_key(
        bind,
        "vault_access_links",
        "fk_vault_access_links_shop_id_marketplace_shops",
        ["shop_id"],
        "marketplace_shops",
    ):
        op.create_foreign_key(
            "fk_vault_access_links_shop_id_marketplace_shops",
            "vault_access_links",
            "marketplace_shops",
            ["shop_id"],
            ["id"],
            ondelete="CASCADE",
        )

    wanted_indexes = {
        "ix_vault_access_links_shop_id": ["shop_id"],
        "ix_vault_access_links_owner_user_id": ["owner_user_id"],
        "ix_vault_access_links_status": ["status"],
        "ix_vault_access_links_expires_at": ["expires_at"],
        "ix_vault_access_links_revoked_at": ["revoked_at"],
    }
    for name, columns in wanted_indexes.items():
        if not _has_index(bind, "vault_access_links", name):
            op.create_index(name, "vault_access_links", columns, unique=False)


def downgrade() -> None:
    bind = op.get_bind()

    for name in [
        "ix_vault_access_links_revoked_at",
        "ix_vault_access_links_expires_at",
        "ix_vault_access_links_status",
        "ix_vault_access_links_owner_user_id",
        "ix_vault_access_links_shop_id",
    ]:
        if _has_index(bind, "vault_access_links", name):
            op.drop_index(name, table_name="vault_access_links")

    if _has_table(bind, "vault_access_links"):
        op.drop_table("vault_access_links")
