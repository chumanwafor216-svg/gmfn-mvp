"""clan invites, join requests and voting

Revision ID: ddac49b3215c
Revises: d52331b29d03
Create Date: 2026-02-08
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "ddac49b3215c"
down_revision = "d52331b29d03"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -------------------------
    # Clan invites
    # -------------------------
    op.create_table(
        "clan_invites",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=64), nullable=False, unique=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("max_uses", sa.Integer(), nullable=True),
        sa.Column("uses", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.create_index("ix_clan_invites_clan_id", "clan_invites", ["clan_id"])
    op.create_index("ix_clan_invites_code", "clan_invites", ["code"], unique=True)

    # -------------------------
    # Clan join requests
    # -------------------------
    op.create_table(
        "clan_join_requests",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("clan_id", sa.Integer(), nullable=False),
        sa.Column("requester_user_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index("ix_clan_join_requests_clan_id", "clan_join_requests", ["clan_id"])
    op.create_index(
        "ix_clan_join_requests_requester_user_id",
        "clan_join_requests",
        ["requester_user_id"],
    )
    op.create_index(
        "ix_clan_join_requests_status",
        "clan_join_requests",
        ["status"],
    )

    # -------------------------
    # Clan join votes
    # -------------------------
    op.create_table(
        "clan_join_votes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("join_request_id", sa.Integer(), nullable=False),
        sa.Column("voter_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_index(
        "ix_clan_join_votes_join_request_id",
        "clan_join_votes",
        ["join_request_id"],
    )
    op.create_index(
        "ix_clan_join_votes_voter_user_id",
        "clan_join_votes",
        ["voter_user_id"],
    )


def downgrade() -> None:
    # SQLite-safe drop order
    op.drop_index("ix_clan_join_votes_voter_user_id", table_name="clan_join_votes")
    op.drop_index("ix_clan_join_votes_join_request_id", table_name="clan_join_votes")
    op.drop_table("clan_join_votes")

    op.drop_index("ix_clan_join_requests_status", table_name="clan_join_requests")
    op.drop_index("ix_clan_join_requests_requester_user_id", table_name="clan_join_requests")
    op.drop_index("ix_clan_join_requests_clan_id", table_name="clan_join_requests")
    op.drop_table("clan_join_requests")

    op.drop_index("ix_clan_invites_code", table_name="clan_invites")
    op.drop_index("ix_clan_invites_clan_id", table_name="clan_invites")
    op.drop_table("clan_invites")
