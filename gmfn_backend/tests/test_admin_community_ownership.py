from __future__ import annotations

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, TrustEvent


def _seed_pillar_of_hope_case() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id, phone_e164)
                VALUES
                  (1, 'pytest@example.com', 'hashed', 'Platform Admin', 'admin', 'GSN-P-ADMIN', '+447700900001'),
                  (2, 'setup-owner@example.com', 'hashed', 'Earlier Setup Owner', 'user', 'GSN-P-SETUP', '+447700900002'),
                  (3, 'felix@example.com', 'hashed', 'Mr Felix', 'user', 'GSN-P-FELIX', '+447700900003')
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO clans (
                    id, name, description, community_code, created_by_user_id, status, invite_code, invite_uses, created_at
                )
                VALUES (
                    11,
                    'Pillar of Hope',
                    'Pilot community created during earlier setup.',
                    'GSN-C-PILLAR-HOPE',
                    2,
                    'active',
                    'pillar-hope-test-invite',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO clan_memberships (id, clan_id, user_id, role, personal_pool_balance)
                VALUES (21, 11, 2, 'admin', 0)
                """
            )
        )
        db.commit()


def test_community_ownership_preview_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['executed'] is False
    assert body['community']['community_code'] == 'GSN-C-PILLAR-HOPE'
    assert body['requested_owner']['gmfn_id'] == 'GSN-P-FELIX'
    assert body['membership_action'] == 'add_admin'
    assert body['will_preserve_history'] is True

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.created_by_user_id == 2
        felix_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 11, ClanMembership.user_id == 3)
            .first()
        )
        assert felix_membership is None
        assert db.query(TrustEvent).count() == 0


def test_community_ownership_execute_requires_proof_before_mutation(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': True,
            'owner_proof_confirmed': False,
            'reviewer_note': 'Felix confirmed during pilot review.',
        },
    )

    assert response.status_code == 400, response.text
    assert 'Owner proof confirmation is required' in response.text

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.created_by_user_id == 2
        assert (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 11, ClanMembership.user_id == 3)
            .first()
        ) is None
        assert db.query(TrustEvent).count() == 0


def test_community_ownership_execute_records_canonical_owner_and_trust_event(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': True,
            'owner_proof_confirmed': True,
            'reviewer_note': 'Felix confirmed as Pillar of Hope founder during pilot review.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community']['created_by_user_id'] == 3
    assert body['community']['community_code'] == 'GSN-C-PILLAR-HOPE'
    assert body['requested_owner']['gmfn_id'] == 'GSN-P-FELIX'

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.created_by_user_id == 3
        felix_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 11, ClanMembership.user_id == 3)
            .one()
        )
        assert felix_membership.role == 'admin'
        previous_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 11, ClanMembership.user_id == 2)
            .one()
        )
        assert previous_membership.role == 'admin'
        event = db.query(TrustEvent).one()
        assert event.event_type == 'community.ownership_reconciled'
        assert event.clan_id == 11
        assert event.actor_user_id == 1
        assert event.subject_user_id == 3
        assert event.meta is not None
        assert event.meta['previous_created_by_user_id'] == 2
        assert event.meta['canonical_owner_user_id'] == 3
        assert event.meta['history_preserved'] is True
        assert event.meta['other_admins_removed'] is False
