'''Add provider audit and abuse-control fields for phone verification.

Revision ID: 20261019_phone_verification_provider_audit_v1
Revises: 20261018_spotlight_payload_retention_v1
'''

from alembic import op
import sqlalchemy as sa


revision = '20261019_phone_verification_provider_audit_v1'
down_revision = '20261018_spotlight_payload_retention_v1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table('entry_phone_verifications') as batch_op:
        batch_op.alter_column(
            'code', existing_type=sa.String(length=12), nullable=True
        )
        batch_op.add_column(sa.Column('code_digest', sa.String(length=128), nullable=True))
        batch_op.add_column(sa.Column('provider_key', sa.String(length=64), nullable=True))
        batch_op.add_column(
            sa.Column('provider_verification_id', sa.String(length=128), nullable=True)
        )
        batch_op.add_column(sa.Column('provider_status', sa.String(length=48), nullable=True))
        batch_op.add_column(sa.Column('provider_response_json', sa.Text(), nullable=True))
        batch_op.add_column(sa.Column('provider_error_code', sa.String(length=64), nullable=True))
        batch_op.add_column(sa.Column('owner_user_id', sa.Integer(), nullable=True))
        batch_op.add_column(
            sa.Column('provider_send_attempts', sa.Integer(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('provider_check_attempts', sa.Integer(), server_default='0', nullable=False)
        )
        batch_op.add_column(
            sa.Column('pipeline_credit_ledger_entry_id', sa.Integer(), nullable=True)
        )
        batch_op.add_column(
            sa.Column('last_provider_send_attempt_at', sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.add_column(
            sa.Column('last_provider_check_attempt_at', sa.DateTime(timezone=True), nullable=True)
        )
        batch_op.create_index(
            'ix_entry_phone_verifications_owner_user_id',
            ['owner_user_id'],
            unique=False,
        )
        batch_op.create_index(
            'ix_entry_phone_verifications_provider_verification_id',
            ['provider_verification_id'],
            unique=False,
        )
        batch_op.create_index(
            'ix_entry_phone_verifications_pipeline_credit_ledger_entry_id',
            ['pipeline_credit_ledger_entry_id'],
            unique=False,
        )


def downgrade() -> None:
    with op.batch_alter_table('entry_phone_verifications') as batch_op:
        batch_op.drop_index('ix_entry_phone_verifications_pipeline_credit_ledger_entry_id')
        batch_op.drop_index('ix_entry_phone_verifications_provider_verification_id')
        batch_op.drop_index('ix_entry_phone_verifications_owner_user_id')
        batch_op.drop_column('last_provider_check_attempt_at')
        batch_op.drop_column('last_provider_send_attempt_at')
        batch_op.drop_column('pipeline_credit_ledger_entry_id')
        batch_op.drop_column('provider_check_attempts')
        batch_op.drop_column('provider_send_attempts')
        batch_op.drop_column('provider_error_code')
        batch_op.drop_column('owner_user_id')
        batch_op.drop_column('provider_response_json')
        batch_op.drop_column('provider_status')
        batch_op.drop_column('provider_verification_id')
        batch_op.drop_column('provider_key')
        batch_op.drop_column('code_digest')
        batch_op.alter_column(
            'code', existing_type=sa.String(length=12), nullable=False
        )
