'''Separate Spotlight entitlement from serving state and add bounded leases.

Revision ID: 20261016_spotlight_lifecycle
Revises: 20261015_membership_admission
Create Date: 2026-10-16
'''

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = '20261016_spotlight_lifecycle'
down_revision = '20261015_membership_admission'
branch_labels = None
depends_on = None


def _has_table(bind, name: str) -> bool:
    return sa.inspect(bind).has_table(name)


def _columns(bind, table: str) -> set[str]:
    if not _has_table(bind, table):
        return set()
    return {str(row['name']) for row in sa.inspect(bind).get_columns(table)}


def _add_column(bind, table: str, column: sa.Column) -> None:
    if column.name not in _columns(bind, table):
        op.add_column(table, column)


def upgrade() -> None:
    bind = op.get_bind()
    _add_column(bind, 'spotlight_campaigns', sa.Column('serving_status', sa.String(32), nullable=False, server_default='serving'))
    _add_column(bind, 'spotlight_campaigns', sa.Column('content_version', sa.Integer(), nullable=False, server_default='1'))
    _add_column(bind, 'spotlight_campaigns', sa.Column('authorized_expires_at', sa.DateTime(timezone=True), nullable=True))
    _add_column(bind, 'spotlight_campaigns', sa.Column('serving_status_changed_at', sa.DateTime(timezone=True), nullable=True))
    _add_column(bind, 'marketplace_broadcasts', sa.Column('serving_status', sa.String(32), nullable=False, server_default='serving'))
    _add_column(bind, 'marketplace_broadcasts', sa.Column('publication_key', sa.String(96), nullable=True))
    _add_column(bind, 'marketplace_broadcasts', sa.Column('content_version', sa.Integer(), nullable=False, server_default='1'))
    _add_column(bind, 'marketplace_broadcasts', sa.Column('authorized_expires_at', sa.DateTime(timezone=True), nullable=True))
    _add_column(bind, 'marketplace_broadcasts', sa.Column('serving_status_changed_at', sa.DateTime(timezone=True), nullable=True))
    _add_column(bind, 'spotlight_exposure_events', sa.Column('content_version', sa.Integer(), nullable=False, server_default='1'))
    _add_column(bind, 'spotlight_exposure_events', sa.Column('presentation_id', sa.String(80), nullable=True))
    _add_column(bind, 'marketplace_product_reposts', sa.Column('publication_key', sa.String(96), nullable=True))

    bind.execute(sa.text('UPDATE spotlight_campaigns SET authorized_expires_at = expires_at WHERE authorized_expires_at IS NULL'))
    bind.execute(sa.text('UPDATE marketplace_broadcasts SET authorized_expires_at = expires_at WHERE authorized_expires_at IS NULL'))

    if not _has_table(bind, 'spotlight_content_versions'):
        op.create_table(
            'spotlight_content_versions',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('campaign_id', sa.Integer(), nullable=False),
            sa.Column('version', sa.Integer(), nullable=False),
            sa.Column('content_kind', sa.String(40), nullable=False),
            sa.Column('content_fingerprint', sa.String(64), nullable=False),
            sa.Column('source_product_id', sa.Integer(), nullable=True),
            sa.Column('message', sa.Text(), nullable=False, server_default=''),
            sa.Column('image_url', sa.Text(), nullable=True),
            sa.Column('video_url', sa.Text(), nullable=True),
            sa.Column('change_kind', sa.String(32), nullable=False, server_default='activation'),
            sa.Column('activated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
            sa.Column('replaced_at', sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint(['campaign_id'], ['spotlight_campaigns.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['source_product_id'], ['marketplace_products.id'], ondelete='SET NULL'),
            sa.UniqueConstraint('campaign_id', 'version', name='uq_spotlight_content_version_campaign_v1'),
        )

    if not _has_table(bind, 'spotlight_presentation_leases'):
        op.create_table(
            'spotlight_presentation_leases',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('presentation_id', sa.String(80), nullable=False),
            sa.Column('issuance_key', sa.String(96), nullable=False),
            sa.Column('viewer_user_id', sa.Integer(), nullable=False),
            sa.Column('campaign_id', sa.Integer(), nullable=False),
            sa.Column('placement_broadcast_id', sa.Integer(), nullable=False),
            sa.Column('content_version', sa.Integer(), nullable=False),
            sa.Column('surface', sa.String(80), nullable=False),
            sa.Column('status', sa.String(24), nullable=False, server_default='issued'),
            sa.Column('issued_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('lease_expires_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('qualified_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('invalidated_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('invalidation_reason', sa.String(64), nullable=True),
            sa.ForeignKeyConstraint(['viewer_user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['campaign_id'], ['spotlight_campaigns.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['placement_broadcast_id'], ['marketplace_broadcasts.id'], ondelete='CASCADE'),
            sa.UniqueConstraint('presentation_id', name='uq_spotlight_presentation_id_v1'),
            sa.UniqueConstraint('viewer_user_id', 'surface', 'issuance_key', name='uq_spotlight_presentation_issuance_v1'),
        )

    bind.execute(sa.text('''
        INSERT INTO spotlight_content_versions (
            campaign_id, version, content_kind, content_fingerprint,
            source_product_id, message, image_url, video_url,
            change_kind, activated_at
        )
        SELECT c.id, 1, c.content_kind, c.content_fingerprint,
               c.source_product_id, COALESCE(b.message, ''), b.image_url, b.video_url,
               'migration_backfill', c.activated_at
        FROM spotlight_campaigns c
        LEFT JOIN marketplace_broadcasts b ON b.id = (
            SELECT MIN(b2.id) FROM marketplace_broadcasts b2
            WHERE b2.spotlight_campaign_id = c.id
        )
        WHERE NOT EXISTS (
            SELECT 1 FROM spotlight_content_versions v
            WHERE v.campaign_id = c.id AND v.version = 1
        )
    '''))

    indexes = (
        ('ix_spotlight_campaigns_serving_status', 'spotlight_campaigns', ['serving_status']),
        ('ix_spotlight_campaigns_authorized_expiry', 'spotlight_campaigns', ['authorized_expires_at']),
        ('ix_spotlight_campaigns_serving_status_changed_at', 'spotlight_campaigns', ['serving_status_changed_at']),
        ('ix_marketplace_broadcasts_serving_status', 'marketplace_broadcasts', ['serving_status']),
        ('ix_marketplace_broadcasts_publication_key', 'marketplace_broadcasts', ['publication_key']),
        ('ix_marketplace_broadcasts_authorized_expiry', 'marketplace_broadcasts', ['authorized_expires_at']),
        ('ix_marketplace_broadcasts_serving_status_changed_at', 'marketplace_broadcasts', ['serving_status_changed_at']),
        ('ix_spotlight_exposure_events_presentation_id', 'spotlight_exposure_events', ['presentation_id']),
        ('ix_spotlight_content_versions_campaign_id', 'spotlight_content_versions', ['campaign_id']),
        ('ix_spotlight_content_versions_campaign_active', 'spotlight_content_versions', ['campaign_id', 'replaced_at']),
        ('ix_marketplace_product_reposts_publication_key', 'marketplace_product_reposts', ['publication_key']),
        ('ix_spotlight_presentation_leases_viewer_user_id', 'spotlight_presentation_leases', ['viewer_user_id']),
        ('ix_spotlight_presentation_leases_campaign_id', 'spotlight_presentation_leases', ['campaign_id']),
        ('ix_spotlight_presentation_leases_placement_broadcast_id', 'spotlight_presentation_leases', ['placement_broadcast_id']),
        ('ix_spotlight_presentation_leases_status', 'spotlight_presentation_leases', ['status']),
        ('ix_spotlight_presentation_lease_expiry', 'spotlight_presentation_leases', ['lease_expires_at']),
        ('ix_spotlight_presentation_campaign_status', 'spotlight_presentation_leases', ['campaign_id', 'status']),
    )
    for name, table, columns in indexes:
        existing = {str(row.get('name')) for row in sa.inspect(bind).get_indexes(table)}
        if name not in existing:
            op.create_index(name, table, columns)

    unique_indexes = (
        (
            'uq_marketplace_broadcast_publication_key_v1',
            'marketplace_broadcasts',
            ['author_user_id', 'publication_key', 'clan_id'],
        ),
        (
            'uq_marketplace_repost_publication_key_v1',
            'marketplace_product_reposts',
            ['reposted_by_user_id', 'publication_key'],
        ),
    )
    for name, table, columns in unique_indexes:
        existing = {str(row.get('name')) for row in sa.inspect(bind).get_indexes(table)}
        if name not in existing:
            op.create_index(name, table, columns, unique=True)

    duplicate_usage = bind.execute(sa.text('''
        SELECT COUNT(*) FROM (
            SELECT owner_user_id, feature_code, reference_key, entitlement_id
            FROM feature_usage_events
            WHERE reference_key IS NOT NULL
            GROUP BY owner_user_id, feature_code, reference_key, entitlement_id
            HAVING COUNT(*) > 1
        ) duplicates
    ''')).scalar() or 0
    if int(duplicate_usage) > 0:
        raise RuntimeError(
            'Feature usage idempotency migration found duplicate non-null references; '
            'review them explicitly before retry-safety can be enabled.'
        )
    usage_indexes = {str(row.get('name')) for row in sa.inspect(bind).get_indexes('feature_usage_events')}
    if 'uq_feature_usage_reference_entitlement_v1' not in usage_indexes:
        op.create_index(
            'uq_feature_usage_reference_entitlement_v1',
            'feature_usage_events',
            ['owner_user_id', 'feature_code', 'reference_key', 'entitlement_id'],
            unique=True,
        )


def downgrade() -> None:
    bind = op.get_bind()
    if _has_table(bind, 'spotlight_campaigns'):
        used = bind.execute(sa.text('''
            SELECT COUNT(*) FROM spotlight_campaigns
            WHERE serving_status <> 'serving' OR content_version > 1
        ''')).scalar() or 0
        used += bind.execute(sa.text('''
            SELECT COUNT(*) FROM marketplace_broadcasts
            WHERE publication_key IS NOT NULL
        ''')).scalar() or 0
        used += bind.execute(sa.text('''
            SELECT COUNT(*) FROM marketplace_product_reposts
            WHERE publication_key IS NOT NULL
        ''')).scalar() or 0
        if int(used) > 0:
            raise RuntimeError(
                'Unsafe Spotlight rollback refused: lifecycle writers have been used. '
                'Readers that ignore serving state must not be restored.'
            )

    usage_indexes = {str(row.get('name')) for row in sa.inspect(bind).get_indexes('feature_usage_events')}
    if 'uq_feature_usage_reference_entitlement_v1' in usage_indexes:
        op.drop_index('uq_feature_usage_reference_entitlement_v1', table_name='feature_usage_events')

    for table in ('spotlight_presentation_leases', 'spotlight_content_versions'):
        if _has_table(bind, table):
            op.drop_table(table)

    for table, names in (
        (
            'marketplace_product_reposts',
            (
                'uq_marketplace_repost_publication_key_v1',
                'ix_marketplace_product_reposts_publication_key',
            ),
        ),
        ('spotlight_exposure_events', ('ix_spotlight_exposure_events_presentation_id',)),
        (
            'marketplace_broadcasts',
            (
                'uq_marketplace_broadcast_publication_key_v1',
                'ix_marketplace_broadcasts_publication_key',
                'ix_marketplace_broadcasts_serving_status',
                'ix_marketplace_broadcasts_authorized_expiry',
                'ix_marketplace_broadcasts_serving_status_changed_at',
            ),
        ),
        (
            'spotlight_campaigns',
            (
                'ix_spotlight_campaigns_serving_status',
                'ix_spotlight_campaigns_authorized_expiry',
                'ix_spotlight_campaigns_serving_status_changed_at',
            ),
        ),
    ):
        existing = {str(row.get('name')) for row in sa.inspect(bind).get_indexes(table)}
        for name in names:
            if name in existing:
                op.drop_index(name, table_name=table)

    for table, names in (
        ('marketplace_product_reposts', ('publication_key',)),
        ('spotlight_exposure_events', ('presentation_id', 'content_version')),
        ('marketplace_broadcasts', ('publication_key', 'serving_status_changed_at', 'authorized_expires_at', 'content_version', 'serving_status')),
        ('spotlight_campaigns', ('serving_status_changed_at', 'authorized_expires_at', 'content_version', 'serving_status')),
    ):
        present = _columns(bind, table)
        drop_names = [name for name in names if name in present]
        if drop_names:
            with op.batch_alter_table(table) as batch:
                for name in drop_names:
                    batch.drop_column(name)
