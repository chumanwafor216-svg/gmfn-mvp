from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.clan_auth import list_visible_user_clans
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    EntryPhoneVerification,
    MarketplaceBroadcast,
    MarketplaceProduct,
    MarketplaceShop,
    TrustEvent,
    User,
    UserPayoutDestination,
)
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

def test_community_ownership_execute_can_create_missing_community_from_stuck_intake(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_stuck_intake_case()
    with SessionLocal() as db:
        db.query(ClanMembership).filter(ClanMembership.clan_id == 11).delete()
        db.query(Clan).filter(Clan.id == 11).delete()
        db.commit()

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
    assert preview_body['will_create_community'] is True
    assert preview_body['will_create_owner_identity'] is True
    assert preview_body['community']['name'] == 'Pillar of Hope'
    assert preview_body['community']['community_code'] == 'Will be created'
    assert preview_body['membership_action'] == 'create_community_and_owner_identity'

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Pillar of Hope',
            'entry_verification_id': 31,
            'execute': True,
            'owner_proof_confirmed': True,
            'reviewer_note': 'Felix confirmed as Pillar of Hope founder after missing-community onboarding block.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['created_community'] is True
    assert body['created_owner_identity'] is True
    assert body['community']['name'] == 'Pillar of Hope'
    assert body['community']['community_code'].startswith('GSN-C-')
    assert body['requested_owner']['display_name'] == 'Mr Felix'
    assert body['requested_owner']['gmfn_id'].startswith('GMFN-U-')

    with SessionLocal() as db:
        felix = db.query(User).filter(User.phone_e164 == '+447480608648').one()
        clan = db.query(Clan).filter(Clan.name == 'Pillar of Hope').one()
        assert clan.created_by_user_id == felix.id
        assert clan.status == 'active'
        assert clan.community_code.startswith('GSN-C-')
        membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == felix.id)
            .one()
        )
        assert membership.role == 'admin'
        intake = db.get(EntryPhoneVerification, 31)
        assert intake is not None
        assert intake.consumed_at is not None
        event_types = {row.event_type for row in db.query(TrustEvent).all()}
        assert 'community.created_from_stuck_intake' in event_types
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


def _seed_pillar_domain_ownership_case() -> None:
    with SessionLocal() as db:
        db.execute(
            text(
                """
                INSERT INTO users (id, email, hashed_password, display_name, role, gmfn_id, phone_e164)
                VALUES
                  (1, 'pytest@example.com', 'hashed', 'Platform Admin', 'admin', 'GSN-P-ADMIN', '+447700900001'),
                  (2, 'domain-setup-owner@example.com', 'hashed', 'Earlier Domain Setup Owner', 'user', 'GSN-P-DOMAINSETUP', '+447700900002'),
                  (3, 'felix-domain@example.com', 'hashed', 'Mr Felix', 'user', 'GSN-P-FELIX', '+447700900003')
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO community_domains (
                    id, domain_name, display_name, domain_type, template_key,
                    owner_user_id, status, verification_status, country, state, public_profile
                )
                VALUES (
                    51, 'pillar-of-hope', 'Pillar of Hope', 'ngo_project_network',
                    'ngo_project_network', 2, 'draft', 'unverified', 'United Kingdom',
                    'Scotland / Aberdeen', 'Pilot domain bought during setup.'
                )
                """
            )
        )
        db.execute(
            text(
                """
                INSERT INTO community_domain_memberships (id, community_domain_id, user_id, role, status, title)
                VALUES (61, 51, 2, 'owner', 'active', 'Earlier setup owner')
                """
            )
        )
        db.commit()


def test_community_domain_ownership_preview_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_domain_ownership_case()

    response = client.post(
        '/admin/community-domain-ownership/reconcile',
        json={
            'domain_name': 'pillar-of-hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['executed'] is False
    assert body['community_domain']['domain_name'] == 'pillar-of-hope'
    assert body['community_domain']['owner_user_id'] == 2
    assert body['requested_owner']['gmfn_id'] == 'GSN-P-FELIX'
    assert body['membership_action'] == 'add_owner'
    assert body['will_delete_domain'] is False
    assert body['will_preserve_history'] is True

    with SessionLocal() as db:
        owner_id = db.execute(text('SELECT owner_user_id FROM community_domains WHERE id = 51')).scalar_one()
        felix_membership = db.execute(
            text(
                """
                SELECT COUNT(*) FROM community_domain_memberships
                WHERE community_domain_id = 51 AND user_id = 3
                """
            )
        ).scalar_one()
        assert owner_id == 2
        assert felix_membership == 0
        assert db.query(TrustEvent).count() == 0


def test_community_domain_ownership_execute_requires_proof_before_mutation(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_domain_ownership_case()

    response = client.post(
        '/admin/community-domain-ownership/reconcile',
        json={
            'domain_name': 'pillar-of-hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': True,
            'owner_proof_confirmed': False,
            'reviewer_note': 'Felix confirmed domain ownership during pilot review.',
        },
    )

    assert response.status_code == 400, response.text
    assert 'Owner proof confirmation is required' in response.text

    with SessionLocal() as db:
        owner_id = db.execute(text('SELECT owner_user_id FROM community_domains WHERE id = 51')).scalar_one()
        assert owner_id == 2
        assert db.query(TrustEvent).count() == 0


def test_community_domain_ownership_execute_transfers_owner_and_keeps_history(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_domain_ownership_case()

    response = client.post(
        '/admin/community-domain-ownership/reconcile',
        json={
            'domain_name': 'Pillar of Hope',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'execute': True,
            'owner_proof_confirmed': True,
            'reviewer_note': 'Felix confirmed as Pillar of Hope domain owner during pilot review.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community_domain']['owner_user_id'] == 3
    assert body['community_domain']['domain_name'] == 'pillar-of-hope'
    assert body['requested_owner']['gmfn_id'] == 'GSN-P-FELIX'

    with SessionLocal() as db:
        owner_id = db.execute(text('SELECT owner_user_id FROM community_domains WHERE id = 51')).scalar_one()
        assert owner_id == 3
        previous_role = db.execute(
            text(
                """
                SELECT role FROM community_domain_memberships
                WHERE community_domain_id = 51 AND user_id = 2
                """
            )
        ).scalar_one()
        felix_role = db.execute(
            text(
                """
                SELECT role FROM community_domain_memberships
                WHERE community_domain_id = 51 AND user_id = 3
                """
            )
        ).scalar_one()
        assert previous_role == 'admin'
        assert felix_role == 'owner'
        event = db.query(TrustEvent).one()
        assert event.event_type == 'community_domain.ownership_reconciled'
        assert event.actor_user_id == 1
        assert event.subject_user_id == 3
        assert event.meta['domain_name'] == 'pillar-of-hope'
        assert event.meta['previous_owner_user_id'] == 2
        assert event.meta['canonical_owner_user_id'] == 3
        assert event.meta['history_preserved'] is True
        assert event.meta['domain_deleted'] is False
        assert event.meta['duplicate_domain_created'] is False

def test_community_lifecycle_preview_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-lifecycle',
        json={
            'community_name': 'Pillar of Hope',
            'status': 'dormant',
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['executed'] is False
    assert body['community']['community_code'] == 'GSN-C-PILLAR-HOPE'
    assert body['current_status'] == 'active'
    assert body['requested_status'] == 'dormant'
    assert body['will_hide_from_member_home'] is True
    assert body['will_preserve_history'] is True
    assert body['will_delete_community'] is False
    assert body['will_remove_members'] is False

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.closed_at is None
        assert db.query(TrustEvent).count() == 0


def test_community_lifecycle_execute_requires_confirmation_before_mutation(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-lifecycle',
        json={
            'community_name': 'Pillar of Hope',
            'status': 'closed',
            'execute': True,
            'lifecycle_confirmed': False,
            'reviewer_note': 'Pilot setup example should be closed after owner review.',
        },
    )

    assert response.status_code == 400, response.text
    assert 'Lifecycle confirmation is required' in response.text

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.closed_at is None
        assert db.query(TrustEvent).count() == 0


def test_community_lifecycle_execute_closes_ordinary_community_without_deleting_history(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    response = client.post(
        '/admin/community-lifecycle',
        json={
            'community_name': 'Pillar of Hope',
            'status': 'closed',
            'execute': True,
            'lifecycle_confirmed': True,
            'reviewer_note': 'Pillar of Hope was a pilot setup example and should stop normal operation.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community']['status'] == 'closed'
    assert body['will_hide_from_member_home'] is True
    assert body['will_delete_community'] is False
    assert body['will_remove_members'] is False

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.status == 'closed'
        assert clan.closed_at is not None
        assert 'pilot setup example' in (clan.closed_reason or '')
        memberships = db.query(ClanMembership).filter(ClanMembership.clan_id == 11).all()
        assert len(memberships) == 1
        assert memberships[0].user_id == 2
        assert memberships[0].left_at is None
        event = db.query(TrustEvent).one()
        assert event.event_type == 'community.lifecycle_changed'
        assert event.actor_user_id == 1
        assert event.subject_user_id == 2
        assert event.meta['previous_status'] == 'active'
        assert event.meta['requested_status'] == 'closed'
        assert event.meta['history_preserved'] is True
        assert event.meta['community_deleted'] is False
        assert event.meta['members_removed'] is False
        assert event.meta['member_home_hidden'] is True


def test_closed_community_is_hidden_from_member_home(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()
    client.post(
        '/admin/community-lifecycle',
        json={
            'community_name': 'Pillar of Hope',
            'status': 'closed',
            'execute': True,
            'lifecycle_confirmed': True,
            'reviewer_note': 'Pillar of Hope was a pilot setup example and should stop normal operation.',
        },
    )

    with SessionLocal() as db:
        setup_owner = db.get(User, 2)
        assert setup_owner is not None
        visible = list_visible_user_clans(db=db, user=setup_owner)
        assert all(clan.community_code != 'GSN-C-PILLAR-HOPE' for clan in visible)

def _seed_platform_admin_only() -> None:
    with SessionLocal() as db:
        db.add(
            User(
                id=1,
                email='pytest@example.com',
                hashed_password='hashed',
                display_name='Platform Admin',
                role='admin',
                gmfn_id='GSN-P-ADMIN',
                phone_e164='+447700900001',
            )
        )
        db.commit()


def _seed_steward_setup_release_case() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email='pytest@example.com',
                    hashed_password='hashed',
                    display_name='Platform Admin',
                    role='admin',
                    gmfn_id='GSN-P-ADMIN',
                    phone_e164='+447700900001',
                ),
                User(
                    id=3,
                    email='felix@example.com',
                    hashed_password='hashed',
                    display_name='Mr Felix',
                    role='user',
                    gmfn_id='GSN-P-FELIX',
                    phone_e164='+447700900003',
                ),
                Clan(
                    id=31,
                    name='Mamacita Foundation',
                    description='Prepared from a steward brief.',
                    marketplace_name='Mamacita Foundation Marketplace',
                    community_code='GSN-C-MAMACITA',
                    created_by_user_id=1,
                    status='steward_setup',
                    invite_code='mamacita-steward-invite',
                    invite_uses=0,
                    closed_reason='Steward setup pending owner acceptance.',
                ),
                ClanMembership(
                    id=41,
                    clan_id=31,
                    user_id=1,
                    role='admin',
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()


def test_community_steward_setup_preview_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_platform_admin_only()

    response = client.post(
        '/admin/community-steward-setup',
        json={
            'community_name': 'Mamacita Foundation',
            'description': 'Prepared from a remote organisation brief.',
            'marketplace_name': 'Mamacita Foundation Marketplace',
            'representative_reference': 'Representative will confirm after call.',
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['executed'] is False
    assert body['current_status'] == 'missing'
    assert body['requested_status'] == 'steward_setup'
    assert body['will_create_community'] is True
    assert body['will_claim_verified_owner'] is False
    assert body['will_hide_from_member_home'] is True
    assert body['will_delete_community'] is False

    with SessionLocal() as db:
        assert db.query(Clan).filter(Clan.name == 'Mamacita Foundation').first() is None
        assert db.query(TrustEvent).count() == 0


def test_community_steward_setup_execute_creates_hidden_reserved_shell(
    client: TestClient,
    override_current_user,
):
    _seed_platform_admin_only()

    response = client.post(
        '/admin/community-steward-setup',
        json={
            'community_name': 'Mamacita Foundation',
            'description': 'Prepared from a remote organisation brief.',
            'marketplace_name': 'Mamacita Foundation Marketplace',
            'marketplace_description': 'Local sellers and support activity will be reviewed by the owner.',
            'representative_reference': 'Representative will confirm after call.',
            'setup_confirmed': True,
            'execute': True,
            'reviewer_note': 'Prepared only as a hidden steward setup pending real owner acceptance.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community']['status'] == 'steward_setup'
    assert body['will_claim_verified_owner'] is False
    assert body['will_hide_from_member_home'] is True

    with SessionLocal() as db:
        clan = db.query(Clan).filter(Clan.name == 'Mamacita Foundation').one()
        assert clan.status == 'steward_setup'
        assert clan.created_by_user_id == 1
        assert clan.community_code == f'GSN-C-{int(clan.id):06d}'
        assert 'pending real owner acceptance' in (clan.closed_reason or '')
        admin_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == clan.id, ClanMembership.user_id == 1)
            .one()
        )
        assert admin_membership.role == 'admin'
        admin_user = db.get(User, 1)
        assert admin_user is not None
        visible = list_visible_user_clans(db=db, user=admin_user)
        assert all(row.id != clan.id for row in visible)
        event = db.query(TrustEvent).one()
        assert event.event_type == 'community.steward_setup_prepared'
        assert event.meta['owner_acceptance_required'] is True
        assert event.meta['verified_owner_claimed'] is False
        assert event.meta['member_home_hidden'] is True


def test_community_steward_setup_blocks_active_name_overwrite(
    client: TestClient,
    override_current_user,
):
    _seed_pillar_of_hope_case()

    preview = client.post(
        '/admin/community-steward-setup',
        json={
            'community_name': 'Pillar of Hope',
            'execute': False,
        },
    )
    assert preview.status_code == 200, preview.text
    assert preview.json()['blocked_by_active_community'] is True

    execute = client.post(
        '/admin/community-steward-setup',
        json={
            'community_name': 'Pillar of Hope',
            'setup_confirmed': True,
            'execute': True,
            'reviewer_note': 'Attempting to reuse an active community name must be blocked.',
        },
    )
    assert execute.status_code == 409, execute.text

    with SessionLocal() as db:
        clan = db.get(Clan, 11)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.created_by_user_id == 2
        assert db.query(TrustEvent).count() == 0


def test_community_ownership_release_activates_steward_setup(
    client: TestClient,
    override_current_user,
):
    _seed_steward_setup_release_case()

    response = client.post(
        '/admin/community-ownership/reconcile',
        json={
            'community_name': 'Mamacita Foundation',
            'owner_gmfn_id': 'GSN-P-FELIX',
            'owner_proof_confirmed': True,
            'execute': True,
            'reviewer_note': 'Felix accepted the prepared setup and proof was checked before release.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['community']['status'] == 'active'
    assert body['will_activate_steward_setup'] is False

    with SessionLocal() as db:
        clan = db.get(Clan, 31)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.closed_at is None
        assert clan.closed_reason is None
        assert clan.created_by_user_id == 3
        felix_membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 31, ClanMembership.user_id == 3)
            .one()
        )
        assert felix_membership.role == 'admin'
        event = db.query(TrustEvent).filter(TrustEvent.event_type == 'community.ownership_reconciled').one()
        assert event.meta['previous_status'] == 'steward_setup'
        assert event.meta['released_steward_setup'] is True
        assert event.meta['owner_acceptance_required_before_release'] is False

def _seed_pilot_cleanup_case() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email='pytest@example.com',
                    hashed_password='hashed',
                    display_name='Platform Admin',
                    role='admin',
                    gmfn_id='GSN-P-ADMIN',
                    phone_e164='+447700900001',
                ),
                User(
                    id=2,
                    email='setup-owner@example.com',
                    hashed_password='hashed',
                    display_name='Earlier Setup Owner',
                    role='user',
                    gmfn_id='GSN-P-SETUP',
                    phone_e164='+447700900002',
                ),
                Clan(
                    id=51,
                    name='Pillar Pilot Cleanup',
                    description='Public real organisation details entered during setup testing.',
                    marketplace_name='Pillar Real Marketplace',
                    marketplace_description='Public seller details entered during pilot setup.',
                    community_code='GSN-C-PILOT-CLEANUP',
                    created_by_user_id=2,
                    status='active',
                    invite_code='pillar-pilot-cleanup',
                    invite_uses=0,
                ),
                ClanMembership(
                    id=61,
                    clan_id=51,
                    user_id=2,
                    role='admin',
                    personal_pool_balance=0,
                ),
                MarketplaceShop(
                    id=71,
                    clan_id=51,
                    owner_user_id=2,
                    name='Felix Real Shop',
                    description='Real public shop description from setup testing.',
                    whatsapp_number='+447700900777',
                    telegram_handle='realhandle',
                    image_url='https://example.com/shop.jpg',
                    is_active=True,
                ),
                MarketplaceProduct(
                    id=81,
                    clan_id=51,
                    shop_id=71,
                    seller_user_id=2,
                    name='Real Product',
                    description='Real public product description from setup testing.',
                    price='20.00',
                    currency='GBP',
                    image_url='https://example.com/product.jpg',
                    video_url='https://example.com/product.mp4',
                    visibility_mode='community_visible',
                    is_active=True,
                ),
                MarketplaceBroadcast(
                    id=91,
                    clan_id=51,
                    author_user_id=2,
                    shop_id=71,
                    message='Real public pilot broadcast.',
                    image_url='https://example.com/broadcast.jpg',
                    video_url='https://example.com/broadcast.mp4',
                    expires_at=(datetime.now(timezone.utc) + timedelta(days=1)).replace(tzinfo=None),
                ),
            ]
        )
        db.commit()


def test_pilot_data_cleanup_preview_is_read_only(
    client: TestClient,
    override_current_user,
):
    _seed_pilot_cleanup_case()

    response = client.post(
        '/admin/pilot-data-cleanup',
        json={
            'community_name': 'Pillar Pilot Cleanup',
            'execute': False,
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'preview'
    assert body['executed'] is False
    assert body['community']['community_code'] == 'GSN-C-PILOT-CLEANUP'
    assert body['requested_status'] == 'closed'
    assert body['counts']['shops_total'] == 1
    assert body['counts']['shops_active'] == 1
    assert body['counts']['products_total'] == 1
    assert body['counts']['products_active'] == 1
    assert body['counts']['broadcasts_total'] == 1
    assert body['counts']['broadcasts_open'] == 1
    assert body['will_clear_community_public_fields'] is True
    assert body['will_deactivate_shops'] is True
    assert body['will_deactivate_products'] is True
    assert body['will_expire_broadcasts'] is True
    assert body['will_delete_community'] is False
    assert body['will_preserve_memberships'] is True

    with SessionLocal() as db:
        clan = db.get(Clan, 51)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.description == 'Public real organisation details entered during setup testing.'
        assert clan.marketplace_name == 'Pillar Real Marketplace'
        shop = db.get(MarketplaceShop, 71)
        product = db.get(MarketplaceProduct, 81)
        broadcast = db.get(MarketplaceBroadcast, 91)
        assert shop is not None and shop.is_active is True and shop.name == 'Felix Real Shop'
        assert product is not None and product.is_active is True and product.name == 'Real Product'
        assert broadcast is not None and broadcast.message == 'Real public pilot broadcast.'
        assert db.query(ClanMembership).filter(ClanMembership.clan_id == 51).count() == 1
        assert db.query(TrustEvent).count() == 0


def test_pilot_data_cleanup_execute_requires_confirmation_before_mutation(
    client: TestClient,
    override_current_user,
):
    _seed_pilot_cleanup_case()

    response = client.post(
        '/admin/pilot-data-cleanup',
        json={
            'community_name': 'Pillar Pilot Cleanup',
            'execute': True,
            'cleanup_confirmed': False,
            'reviewer_note': 'Clean public pilot details while preserving history.',
        },
    )

    assert response.status_code == 400, response.text
    assert 'Cleanup confirmation is required' in response.text

    with SessionLocal() as db:
        clan = db.get(Clan, 51)
        assert clan is not None
        assert clan.status == 'active'
        assert clan.description == 'Public real organisation details entered during setup testing.'
        assert db.get(MarketplaceShop, 71).is_active is True
        assert db.get(MarketplaceProduct, 81).is_active is True
        assert db.get(MarketplaceBroadcast, 91).message == 'Real public pilot broadcast.'
        assert db.query(TrustEvent).count() == 0


def test_pilot_data_cleanup_execute_scrubs_public_marketplace_without_deleting_history(
    client: TestClient,
    override_current_user,
):
    _seed_pilot_cleanup_case()

    response = client.post(
        '/admin/pilot-data-cleanup',
        json={
            'community_name': 'Pillar Pilot Cleanup',
            'scrub_public_fields': True,
            'close_community': True,
            'deactivate_marketplace_items': True,
            'cleanup_confirmed': True,
            'execute': True,
            'reviewer_note': 'Real public pilot details were used during setup testing and should be cleaned.',
        },
    )

    assert response.status_code == 200, response.text
    body = response.json()
    assert body['mode'] == 'execute'
    assert body['executed'] is True
    assert body['community']['status'] == 'closed'
    assert body['counts']['shops_active'] == 0
    assert body['counts']['products_active'] == 0
    assert body['counts']['broadcasts_open'] == 0
    assert body['will_delete_community'] is False
    assert body['will_delete_users'] is False
    assert body['will_remove_members'] is False
    assert body['will_free_name_for_new_duplicate'] is False

    with SessionLocal() as db:
        clan = db.get(Clan, 51)
        assert clan is not None
        assert clan.status == 'closed'
        assert clan.description is None
        assert clan.marketplace_name is None
        assert clan.marketplace_description is None
        assert clan.closed_at is not None
        assert 'Pilot data cleanup' in (clan.closed_reason or '')
        assert db.get(User, 2) is not None
        membership = db.query(ClanMembership).filter(ClanMembership.clan_id == 51, ClanMembership.user_id == 2).one()
        assert membership.role == 'admin'

        shop = db.get(MarketplaceShop, 71)
        assert shop is not None
        assert shop.is_active is False
        assert shop.name == 'Archived pilot shop 71'
        assert shop.description is None
        assert shop.whatsapp_number is None
        assert shop.telegram_handle is None
        assert shop.image_url is None

        product = db.get(MarketplaceProduct, 81)
        assert product is not None
        assert product.is_active is False
        assert product.name == 'Archived pilot item 81'
        assert product.description is None
        assert product.price is None
        assert product.image_url is None
        assert product.video_url is None
        assert product.visibility_mode == 'archived_pilot_cleanup'

        broadcast = db.get(MarketplaceBroadcast, 91)
        assert broadcast is not None
        assert broadcast.message == 'Pilot broadcast archived.'
        assert broadcast.image_url is None
        assert broadcast.video_url is None
        assert broadcast.expires_at is not None

        visible = list_visible_user_clans(db=db, user=db.get(User, 2))
        assert all(row.id != 51 for row in visible)

        event = db.query(TrustEvent).filter(TrustEvent.event_type == 'community.pilot_data_cleaned').one()
        assert event.clan_id == 51
        assert event.actor_user_id == 1
        assert event.subject_user_id == 2
        assert event.meta['history_preserved'] is True
        assert event.meta['identity_records_preserved'] is True
        assert event.meta['community_deleted'] is False
        assert event.meta['users_deleted'] is False
        assert event.meta['members_removed'] is False
        assert event.meta['name_freed_for_duplicate'] is False
        assert event.meta['before_counts']['shops_active'] == 1
        assert event.meta['before_counts']['products_active'] == 1
        assert event.meta['before_counts']['broadcasts_open'] == 1
