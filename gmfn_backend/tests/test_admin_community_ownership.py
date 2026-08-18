from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, EntryPhoneVerification, TrustEvent, User, UserPayoutDestination
from app.db.verification_models import IdentityVerificationCheck


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


def _seed_pillar_stuck_intake_case() -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id, phone_e164)
                VALUES
                  (1, 'pytest@example.com', 'hashed', 'Platform Admin', 'admin', 'GSN-P-ADMIN', '+447700900001'),
                  (2, 'setup-owner@example.com', 'hashed', 'Earlier Setup Owner', 'user', 'GSN-P-SETUP', '+447700900002')
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
        intake = EntryPhoneVerification(
            id=31,
            display_name='Mr Felix',
            phone_e164='+447480608648',
            email='felix.pillar@example.com',
            code='123456',
            expires_at=now + timedelta(hours=6),
            verified_at=None,
            bank_details_recorded_at=now,
            bank_account_name='Felix Pillar',
            bank_name='Pilot Bank',
            bank_account_number='1234567890',
            bank_country='GB',
            bank_currency='GBP',
            bank_phone_number='+447480608648',
            phone_country_hint='GB',
            locale_country_hint='GB',
            region_consistency_status='matched',
            region_consistency_note='Phone and bank region align for pilot repair.',
        )
        db.add(intake)
        db.add(
            IdentityVerificationCheck(
                id=41,
                entry_phone_verification_id=31,
                verification_type='identity_photo',
                region_code='GB',
                provider_key='manual_pilot',
                status='recorded',
                confidence_score=70,
                explanation='Founder selfie evidence recorded during onboarding.',
                provider_response_json='{"evidence_url":"/uploads/felix-selfie.jpg"}',
            )
        )
        db.commit()


def test_community_ownership_lookup_finds_stuck_intake_without_gsn_identity(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_stuck_intake_case()

    response = client.get(
        '/admin/community-ownership/lookup',
        params={
            'community_name': 'Pillar of Hope',
            'owner_query': '+447480608648',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['communities'][0]['name'] == 'Pillar of Hope'
    assert body['owners'] == []
    assert body['owner_intakes'][0]['entry_verification_id'] == 31
    assert body['owner_intakes'][0]['display_name'] == 'Mr Felix'
    assert body['owner_intakes'][0]['has_gsn_identity'] is False
    assert body['owner_intakes'][0]['stage'] == 'ready_for_community'


def test_community_ownership_lookup_and_preview_accept_hyphenated_community_record(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_stuck_intake_case()
    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        clan.name = 'Pillar-of-hope'
        clan.community_code = 'pillar-of-hope'
        db.commit()

    lookup_response = client.get(
        '/admin/community-ownership/lookup',
        params={
            'community_name': 'Pillar of Hope',
            'owner_query': '+447480608648',
        },
    )

    assert lookup_response.status_code == 200, lookup_response.text
    lookup_body = lookup_response.json()
    assert lookup_body['communities'][0]['name'] == 'Pillar-of-hope'
    assert lookup_body['owner_intakes'][0]['entry_verification_id'] == 31

    preview_response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'entry_verification_id': 31,
            'execute': False,
        },
    )

    assert preview_response.status_code == 200, preview_response.text
    preview_body = preview_response.json()
    assert preview_body['mode'] == 'preview'
    assert preview_body['community']['name'] == 'Pillar-of-hope'
    assert preview_body['will_create_owner_identity'] is True


def test_community_ownership_preview_from_intake_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_stuck_intake_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'entry_verification_id': 31,
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['will_create_owner_identity'] is True
    assert body['requested_owner']['display_name'] == 'Mr Felix'
    assert body['membership_action'] == 'create_identity_then_add_admin'

    with SessionLocal() as db:
        assert db.query(User).filter(User.phone_e164 == '+447480608648').first() is None
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.created_by_user_id == 2
        assert db.get(EntryPhoneVerification, 31).consumed_at is None


def test_community_ownership_execute_creates_gsn_identity_from_stuck_intake(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_stuck_intake_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'entry_verification_id': 31,
            'execute': True,
            'owner_proof_confirmed': True,
            'reviewer_note': 'Felix confirmed as Pillar of Hope founder after duplicate-name onboarding block.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['created_owner_identity'] is True
    assert body['community']['community_code'] == 'GSN-C-PILLAR-HOPE'
    assert body['requested_owner']['display_name'] == 'Mr Felix'
    assert body['requested_owner']['gmfn_id'].startswith('GMFN-U-')

    with SessionLocal() as db:
        felix = db.query(User).filter(User.phone_e164 == '+447480608648').one()
        assert felix.gmfn_id.startswith('GMFN-U-')
        assert felix.display_name == 'Mr Felix'
        assert felix.profile_image_url == '/uploads/felix-selfie.jpg'
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.created_by_user_id == felix.id
        membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 11, ClanMembership.user_id == felix.id)
            .one()
        )
        assert membership.role == 'admin'
        payout = db.query(UserPayoutDestination).filter(UserPayoutDestination.user_id == felix.id).one()
        assert payout.bank_name == 'Pilot Bank'
        assert payout.account_number == '1234567890'
        intake = db.get(EntryPhoneVerification, 31)
        assert intake is not None
        assert intake.consumed_at is not None
        check = db.get(IdentityVerificationCheck, 41)
        assert check is not None
        assert check.user_id == felix.id
        event_types = {row.event_type for row in db.query(TrustEvent).all()}
        assert 'identity.phone_registered' in event_types
        assert 'identity.bank_destination_recorded' in event_types
        assert 'identity.photo_evidence_recorded' in event_types
        assert 'community.ownership_reconciled' in event_types
def test_community_ownership_lookup_finds_owner_by_local_phone(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.get(
        '/admin/community-ownership/lookup',
        params={
            'community_name': 'Pillar of Hope',
            'owner_query': '07700 900003',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['communities'][0]['name'] == 'Pillar of Hope'
    assert body['owners'][0]['display_name'] == 'Mr Felix'
    assert body['owners'][0]['gmfn_id'] == 'GSN-P-FELIX'
    assert body['owners'][0]['phone_last4'] == '0003'


def test_community_ownership_execute_accepts_local_phone_owner_signal(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'owner_phone_e164': '07700 900003',
            'execute': True,
            'owner_proof_confirmed': True,
            'reviewer_note': 'Felix phone number confirmed during Pillar of Hope pilot review.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community']['created_by_user_id'] == 3
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
