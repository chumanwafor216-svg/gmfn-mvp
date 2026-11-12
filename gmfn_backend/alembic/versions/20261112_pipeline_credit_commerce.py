"""add configurable customer Pipeline Credit commerce"""

from alembic import op
import sqlalchemy as sa


revision = "20261112_pipeline_credit_commerce"
down_revision = "20261110_public_profile"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("pipeline_credit_accounts") as batch_op:
        batch_op.add_column(
            sa.Column(
                "account_purpose",
                sa.String(length=32),
                server_default="provider_operations",
                nullable=False,
            )
        )
        batch_op.add_column(
            sa.Column("pricing_region", sa.String(length=32), server_default="global", nullable=False)
        )
        batch_op.add_column(
            sa.Column("balance", sa.Numeric(precision=18, scale=2), server_default=sa.text("0"), nullable=False)
        )
        batch_op.add_column(
            sa.Column("version", sa.Integer(), server_default=sa.text("0"), nullable=False)
        )

    op.execute(
        """
        UPDATE pipeline_credit_accounts
        SET balance = COALESCE(
                (
                    SELECT balance_after
                    FROM pipeline_credit_ledger_entries
                    WHERE pipeline_credit_ledger_entries.account_id = pipeline_credit_accounts.id
                    ORDER BY pipeline_credit_ledger_entries.id DESC
                    LIMIT 1
                ),
                0
            ),
            version = COALESCE(
                (
                    SELECT COUNT(*)
                    FROM pipeline_credit_ledger_entries
                    WHERE pipeline_credit_ledger_entries.account_id = pipeline_credit_accounts.id
                ),
                0
            )
        """
    )
    op.create_index(
        "ix_pipeline_credit_accounts_purpose_v1",
        "pipeline_credit_accounts",
        ["account_purpose", "owner_type"],
    )

    op.create_table(
        "pipeline_credit_pricing_policies",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=False),
        sa.Column("currency", sa.String(length=8), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("credits_per_currency_unit", sa.Numeric(precision=18, scale=4), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="active", nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("region_code", "currency", "version", name="uq_pipeline_credit_pricing_policy_v1"),
    )
    op.create_index(
        "ix_pipeline_credit_pricing_policy_active_v1",
        "pipeline_credit_pricing_policies",
        ["region_code", "currency", "status"],
    )

    op.create_table(
        "pipeline_credit_service_versions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("service_code", sa.String(length=96), nullable=False),
        sa.Column("service_label", sa.String(length=120), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("pricing_mode", sa.String(length=24), nullable=False),
        sa.Column("credit_cost", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("cash_reference_amount", sa.Numeric(precision=18, scale=2), nullable=True),
        sa.Column("cash_reference_currency", sa.String(length=8), nullable=True),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.Column("unit_label", sa.String(length=80), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="active", nullable=False),
        sa.Column("terms_json", sa.Text(), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("service_code", "region_code", "version", name="uq_pipeline_credit_service_version_v1"),
    )
    op.create_index(
        "ix_pipeline_credit_service_active_v1",
        "pipeline_credit_service_versions",
        ["service_code", "region_code", "status"],
    )

    op.create_table(
        "pipeline_credit_service_quotes",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote_key", sa.String(length=96), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("service_version_id", sa.Integer(), nullable=False),
        sa.Column("service_code", sa.String(length=96), nullable=False),
        sa.Column("region_code", sa.String(length=32), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("unit_credit_cost", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("total_credit_cost", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("context_json", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="issued", nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("spent_order_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["account_id"], ["pipeline_credit_accounts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["service_version_id"], ["pipeline_credit_service_versions.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("quote_key", name="uq_pipeline_credit_service_quote_key_v1"),
        sa.UniqueConstraint("actor_user_id", "idempotency_key", name="uq_pipeline_credit_service_quote_idem_v1"),
    )
    op.create_index(
        "ix_pipeline_credit_service_quote_actor_v1",
        "pipeline_credit_service_quotes",
        ["actor_user_id", "created_at"],
    )

    op.create_table(
        "pipeline_credit_service_spend_orders",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_user_id", sa.Integer(), nullable=False),
        sa.Column("account_id", sa.Integer(), nullable=False),
        sa.Column("quote_id", sa.Integer(), nullable=False),
        sa.Column("service_version_id", sa.Integer(), nullable=False),
        sa.Column("service_code", sa.String(length=96), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("total_credit_cost", sa.Numeric(precision=18, scale=2), nullable=False),
        sa.Column("status", sa.String(length=24), server_default="pending", nullable=False),
        sa.Column("idempotency_key", sa.String(length=160), nullable=False),
        sa.Column("request_fingerprint", sa.String(length=64), nullable=False),
        sa.Column("ledger_entry_id", sa.Integer(), nullable=True),
        sa.Column("delivery_reference_type", sa.String(length=64), nullable=True),
        sa.Column("delivery_reference_id", sa.String(length=128), nullable=True),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["account_id"], ["pipeline_credit_accounts.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["quote_id"], ["pipeline_credit_service_quotes.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["service_version_id"], ["pipeline_credit_service_versions.id"], ondelete="RESTRICT"),
        sa.ForeignKeyConstraint(["ledger_entry_id"], ["pipeline_credit_ledger_entries.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("idempotency_key", name="uq_pipeline_credit_service_spend_idem_v1"),
        sa.UniqueConstraint("quote_id", name="uq_pipeline_credit_service_spend_quote_v1"),
    )
    op.create_index(
        "ix_pipeline_credit_service_spend_actor_v1",
        "pipeline_credit_service_spend_orders",
        ["actor_user_id", "created_at"],
    )


def downgrade() -> None:
    bind = op.get_bind()
    commerce_count = 0
    for table in (
        "pipeline_credit_service_spend_orders",
        "pipeline_credit_service_quotes",
        "pipeline_credit_service_versions",
        "pipeline_credit_pricing_policies",
    ):
        commerce_count += int(bind.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar() or 0)
    customer_accounts = int(
        bind.execute(
            sa.text(
                "SELECT COUNT(*) FROM pipeline_credit_accounts WHERE account_purpose = 'customer_service'"
            )
        ).scalar()
        or 0
    )
    if commerce_count or customer_accounts:
        raise RuntimeError("Unsafe downgrade refused: Pipeline Credit commerce evidence exists; roll forward instead.")

    op.drop_index("ix_pipeline_credit_service_spend_actor_v1", table_name="pipeline_credit_service_spend_orders")
    op.drop_table("pipeline_credit_service_spend_orders")
    op.drop_index("ix_pipeline_credit_service_quote_actor_v1", table_name="pipeline_credit_service_quotes")
    op.drop_table("pipeline_credit_service_quotes")
    op.drop_index("ix_pipeline_credit_service_active_v1", table_name="pipeline_credit_service_versions")
    op.drop_table("pipeline_credit_service_versions")
    op.drop_index("ix_pipeline_credit_pricing_policy_active_v1", table_name="pipeline_credit_pricing_policies")
    op.drop_table("pipeline_credit_pricing_policies")
    op.drop_index("ix_pipeline_credit_accounts_purpose_v1", table_name="pipeline_credit_accounts")
    with op.batch_alter_table("pipeline_credit_accounts") as batch_op:
        batch_op.drop_column("version")
        batch_op.drop_column("balance")
        batch_op.drop_column("pricing_region")
        batch_op.drop_column("account_purpose")
