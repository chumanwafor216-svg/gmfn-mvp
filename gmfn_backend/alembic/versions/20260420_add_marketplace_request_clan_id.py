"""add community context to marketplace requests

Revision ID: 20260420_add_marketplace_request_clan_id
Revises: 20260418_add_identity_verification_checks
Create Date: 2026-04-20
"""

from alembic import op
import sqlalchemy as sa


revision = "20260420_add_marketplace_request_clan_id"
down_revision = "20260418_add_identity_verification_checks"
branch_labels = None
depends_on = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def _has_foreign_key(bind, table_name: str, constraint_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(fk["name"] == constraint_name for fk in inspector.get_foreign_keys(table_name))


def upgrade() -> None:
    bind = op.get_bind()

    if not _has_column(bind, "marketplace_requests", "clan_id"):
        op.add_column(
            "marketplace_requests",
            sa.Column("clan_id", sa.Integer(), nullable=True),
        )

    if not _has_index(bind, "marketplace_requests", "ix_marketplace_requests_clan_id"):
        op.create_index(
            "ix_marketplace_requests_clan_id",
            "marketplace_requests",
            ["clan_id"],
            unique=False,
        )

    # SQLite cannot add foreign keys with ALTER TABLE; the ORM still enforces
    # community ownership in the request route for development databases.
    constraint_name = "fk_marketplace_requests_clan_id_clans"
    if bind.dialect.name != "sqlite" and not _has_foreign_key(
        bind,
        "marketplace_requests",
        constraint_name,
    ):
        op.create_foreign_key(
            constraint_name,
            "marketplace_requests",
            "clans",
            ["clan_id"],
            ["id"],
            ondelete="SET NULL",
        )


def downgrade() -> None:
    bind = op.get_bind()

    constraint_name = "fk_marketplace_requests_clan_id_clans"
    if bind.dialect.name != "sqlite" and _has_foreign_key(
        bind,
        "marketplace_requests",
        constraint_name,
    ):
        op.drop_constraint(
            constraint_name,
            "marketplace_requests",
            type_="foreignkey",
        )

    if _has_index(bind, "marketplace_requests", "ix_marketplace_requests_clan_id"):
        op.drop_index("ix_marketplace_requests_clan_id", table_name="marketplace_requests")

    if _has_column(bind, "marketplace_requests", "clan_id"):
        op.drop_column("marketplace_requests", "clan_id")
