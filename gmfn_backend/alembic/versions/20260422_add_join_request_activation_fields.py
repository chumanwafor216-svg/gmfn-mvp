"""add join request activation delivery fields

Revision ID: 20260422_add_join_request_activation_fields
Revises: 20260421_add_vault_access_links
Create Date: 2026-04-22
"""

from alembic import op
import sqlalchemy as sa


revision = "20260422_add_join_request_activation_fields"
down_revision = "20260421_add_vault_access_links"
branch_labels = None
depends_on = None


def _has_table(bind, table_name: str) -> bool:
    inspector = sa.inspect(bind)
    return table_name in inspector.get_table_names()


def _has_column(bind, table_name: str, column_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(col["name"] == column_name for col in inspector.get_columns(table_name))


def _has_index(bind, table_name: str, index_name: str) -> bool:
    inspector = sa.inspect(bind)
    return any(idx["name"] == index_name for idx in inspector.get_indexes(table_name))


def upgrade() -> None:
    bind = op.get_bind()
    table = "clan_join_requests"

    if not _has_table(bind, table):
        return

    wanted_columns = [
        ("activation_link", sa.Column("activation_link", sa.Text(), nullable=True)),
        ("activation_message", sa.Column("activation_message", sa.Text(), nullable=True)),
        (
            "activation_generated_at",
            sa.Column("activation_generated_at", sa.DateTime(timezone=True), nullable=True),
        ),
        (
            "activation_delivery_status",
            sa.Column("activation_delivery_status", sa.String(length=20), nullable=True),
        ),
        (
            "activation_delivered_at",
            sa.Column("activation_delivered_at", sa.DateTime(timezone=True), nullable=True),
        ),
    ]

    for column_name, column in wanted_columns:
        if not _has_column(bind, table, column_name):
            op.add_column(table, column)

    if not _has_index(bind, table, "ix_clan_join_requests_activation_delivery_status"):
        op.create_index(
            "ix_clan_join_requests_activation_delivery_status",
            table,
            ["activation_delivery_status"],
            unique=False,
        )


def downgrade() -> None:
    bind = op.get_bind()
    table = "clan_join_requests"

    if not _has_table(bind, table):
        return

    if _has_index(bind, table, "ix_clan_join_requests_activation_delivery_status"):
        op.drop_index("ix_clan_join_requests_activation_delivery_status", table_name=table)

    for column_name in [
        "activation_delivered_at",
        "activation_delivery_status",
        "activation_generated_at",
        "activation_message",
        "activation_link",
    ]:
        if _has_column(bind, table, column_name):
            op.drop_column(table, column_name)

