"""durable member-credit purchase quotes and collection links"""

from alembic import op
import sqlalchemy as sa

revision = "20261017_member_credit_purchase_link_v1"
down_revision = "20261016_relay_governance_v1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    order_columns = {column["name"] for column in inspector.get_columns("member_credit_purchase_orders")}
    if "terms_json" not in order_columns:
        op.add_column("member_credit_purchase_orders", sa.Column("terms_json", sa.Text(), nullable=True))
    _create_quote_table()
    _create_collection_table()
    inspector = sa.inspect(bind)
    payment_columns = {column["name"] for column in inspector.get_columns("member_credit_provider_payments")}
    foreign_keys = inspector.get_foreign_keys("member_credit_provider_payments")
    has_collection_fk = any(key.get("constrained_columns") == ["collection_attempt_id"] for key in foreign_keys)
    with op.batch_alter_table("member_credit_provider_payments") as batch_op:
        if "collection_attempt_id" not in payment_columns:
            batch_op.add_column(sa.Column("collection_attempt_id", sa.Integer(), nullable=True))
        if not has_collection_fk:
            batch_op.create_foreign_key("fk_member_credit_payment_collection_attempt_v1", "member_credit_collection_attempts", ["collection_attempt_id"], ["id"], ondelete="RESTRICT")


def _create_quote_table() -> None:
    op.create_table(
        "member_credit_purchase_quotes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_key", sa.String(96), nullable=False),
        sa.Column("member_user_id", sa.Integer(), nullable=False),
        sa.Column("pack_version_id", sa.Integer(), nullable=False),
        sa.Column("pack_code", sa.String(80), nullable=False),
        sa.Column("catalog_version", sa.Integer(), nullable=False),
        sa.Column("credit_units", sa.Integer(), nullable=False),
        sa.Column("amount_minor", sa.Integer(), nullable=False),
        sa.Column("currency", sa.String(8), nullable=False),
        sa.Column("terms_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(24), server_default="issued", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("confirmed_purchase_order_id", sa.Integer(), nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["member_user_id"], ["users.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["pack_version_id"], ["member_credit_pack_versions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["confirmed_purchase_order_id"], ["member_credit_purchase_orders.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quote_key", name="uq_member_credit_purchase_quote_key_v1"),
        sa.UniqueConstraint("member_user_id", "idempotency_key", name="uq_member_credit_quote_member_idem_v1"),
        sa.UniqueConstraint("confirmed_purchase_order_id", name="uq_member_credit_quote_confirmed_order_v1"),
    )
    op.create_index("ix_member_credit_quote_member_created_v1", "member_credit_purchase_quotes", ["member_user_id", "created_at"])


def _create_collection_table() -> None:
    op.create_table(
        "member_credit_collection_attempts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("attempt_key", sa.String(96), nullable=False),
        sa.Column("purchase_order_id", sa.Integer(), nullable=False),
        sa.Column("provider_key", sa.String(64), nullable=False),
        sa.Column("merchant_key", sa.String(96), nullable=False),
        sa.Column("collection_reference", sa.String(160), nullable=False),
        sa.Column("provider_session_id", sa.String(160), nullable=True),
        sa.Column("provider_payload_json", sa.Text(), nullable=True),
        sa.Column("status", sa.String(32), server_default="creating", nullable=False),
        sa.Column("idempotency_key", sa.String(128), nullable=False),
        sa.Column("request_fingerprint", sa.String(64), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["purchase_order_id"], ["member_credit_purchase_orders.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("attempt_key", name="uq_member_credit_collection_attempt_key_v1"),
        sa.UniqueConstraint("purchase_order_id", name="uq_member_credit_collection_order_v1"),
        sa.UniqueConstraint("provider_key", "merchant_key", "collection_reference", name="uq_member_credit_collection_reference_v1"),
        sa.UniqueConstraint("purchase_order_id", "idempotency_key", name="uq_member_credit_collection_order_idem_v1"),
    )


def downgrade() -> None:
    bind = op.get_bind()
    counts = [
        int(bind.execute(sa.text("SELECT COUNT(*) FROM member_credit_provider_payments WHERE collection_attempt_id IS NOT NULL")).scalar() or 0),
        int(bind.execute(sa.text("SELECT COUNT(*) FROM member_credit_collection_attempts")).scalar() or 0),
        int(bind.execute(sa.text("SELECT COUNT(*) FROM member_credit_purchase_quotes")).scalar() or 0),
        int(bind.execute(sa.text("SELECT COUNT(*) FROM member_credit_purchase_orders WHERE terms_json IS NOT NULL")).scalar() or 0),
    ]
    if any(counts):
        raise RuntimeError("Unsafe downgrade refused: durable member-credit purchase evidence exists; roll forward instead.")
    with op.batch_alter_table("member_credit_provider_payments") as batch_op:
        batch_op.drop_constraint("fk_member_credit_payment_collection_attempt_v1", type_="foreignkey")
        batch_op.drop_column("collection_attempt_id")
    op.drop_table("member_credit_collection_attempts")
    op.drop_index("ix_member_credit_quote_member_created_v1", table_name="member_credit_purchase_quotes")
    op.drop_table("member_credit_purchase_quotes")
    op.drop_column("member_credit_purchase_orders", "terms_json")
