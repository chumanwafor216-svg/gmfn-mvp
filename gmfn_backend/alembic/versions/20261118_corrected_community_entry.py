"""add corrected community entry policy and lineage fields"""

from alembic import op
import sqlalchemy as sa


revision = "20261118_corrected_community_entry"
down_revision = "20261112_pipeline_credit_control_plane"
branch_labels = None
depends_on = None


def _has_column(bind, table_name: str, column_name: str) -> bool:
    return column_name in {
        column["name"] for column in sa.inspect(bind).get_columns(table_name)
    }


def _has_index(bind, table_name: str, index_name: str) -> bool:
    return index_name in {
        index["name"] for index in sa.inspect(bind).get_indexes(table_name)
    }


def upgrade() -> None:
    bind = op.get_bind()
    with op.batch_alter_table("clans") as batch_op:
        if not _has_column(bind, "clans", "search_join_enabled"):
            batch_op.add_column(
                sa.Column(
                    "search_join_enabled",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )
        if not _has_column(bind, "clans", "search_join_admission_mode"):
            batch_op.add_column(
                sa.Column(
                    "search_join_admission_mode",
                    sa.String(length=32),
                    nullable=False,
                    server_default="community_vote",
                )
            )
        if not _has_column(bind, "clans", "search_join_admin_override"):
            batch_op.add_column(
                sa.Column(
                    "search_join_admin_override",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )
        if not _has_column(bind, "clans", "creation_request_key"):
            batch_op.add_column(sa.Column("creation_request_key", sa.String(length=64)))

    bind = op.get_bind()
    if not _has_index(bind, "clans", "ix_clans_creation_request_key"):
        op.create_index(
            "ix_clans_creation_request_key",
            "clans",
            ["creation_request_key"],
            unique=True,
        )

    bind = op.get_bind()
    with op.batch_alter_table("clan_join_requests") as batch_op:
        if not _has_column(bind, "clan_join_requests", "request_source"):
            batch_op.add_column(
                sa.Column(
                    "request_source",
                    sa.String(length=24),
                    nullable=False,
                    server_default="invite",
                )
            )
        if not _has_column(bind, "clan_join_requests", "admission_mode_snapshot"):
            batch_op.add_column(sa.Column("admission_mode_snapshot", sa.String(length=32)))
        if not _has_column(bind, "clan_join_requests", "admin_override_snapshot"):
            batch_op.add_column(
                sa.Column(
                    "admin_override_snapshot",
                    sa.Boolean(),
                    nullable=False,
                    server_default=sa.false(),
                )
            )

    bind = op.get_bind()
    if not _has_index(bind, "clan_join_requests", "ix_clan_join_requests_request_source"):
        op.create_index(
            "ix_clan_join_requests_request_source",
            "clan_join_requests",
            ["request_source"],
        )

    bind = op.get_bind()
    with op.batch_alter_table("entry_phone_verifications") as batch_op:
        if not _has_column(bind, "entry_phone_verifications", "identity_request_key"):
            batch_op.add_column(sa.Column("identity_request_key", sa.String(length=64)))
    bind = op.get_bind()
    if not _has_index(
        bind,
        "entry_phone_verifications",
        "ix_entry_phone_verifications_identity_request_key",
    ):
        op.create_index(
            "ix_entry_phone_verifications_identity_request_key",
            "entry_phone_verifications",
            ["identity_request_key"],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_index(
        bind,
        "entry_phone_verifications",
        "ix_entry_phone_verifications_identity_request_key",
    ):
        op.drop_index(
            "ix_entry_phone_verifications_identity_request_key",
            table_name="entry_phone_verifications",
        )
    with op.batch_alter_table("entry_phone_verifications") as batch_op:
        if _has_column(op.get_bind(), "entry_phone_verifications", "identity_request_key"):
            batch_op.drop_column("identity_request_key")

    bind = op.get_bind()
    if _has_index(bind, "clan_join_requests", "ix_clan_join_requests_request_source"):
        op.drop_index("ix_clan_join_requests_request_source", table_name="clan_join_requests")
    with op.batch_alter_table("clan_join_requests") as batch_op:
        for column_name in (
            "admin_override_snapshot",
            "admission_mode_snapshot",
            "request_source",
        ):
            if _has_column(op.get_bind(), "clan_join_requests", column_name):
                batch_op.drop_column(column_name)

    bind = op.get_bind()
    if _has_index(bind, "clans", "ix_clans_creation_request_key"):
        op.drop_index("ix_clans_creation_request_key", table_name="clans")
    with op.batch_alter_table("clans") as batch_op:
        for column_name in (
            "creation_request_key",
            "search_join_admin_override",
            "search_join_admission_mode",
            "search_join_enabled",
        ):
            if _has_column(op.get_bind(), "clans", column_name):
                batch_op.drop_column(column_name)
