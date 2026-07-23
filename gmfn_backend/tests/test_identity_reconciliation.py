import os
from datetime import datetime, timezone
from decimal import Decimal

from app.core.security import create_access_token, get_password_hash
from app.db.database import SessionLocal
from app.db.identity_models import IdentityRecoveryProfile, IdentityRiskSignal
from app.db.models import (
    Clan,
    ClanMembership,
    TrustEvent,
    TrustSlip,
    User,
    UserPayoutDestination,
)
from app.db.verification_models import IdentityVerificationCheck


def _headers(email: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token({'sub': email})}"}


def _seed_confirmed_duplicate_pair() -> None:
    with SessionLocal() as db:
        admin = User(
            email="identity-reconcile-admin@example.com",
            hashed_password=get_password_hash("admin-secret"),
            role="admin",
            gmfn_id="GMFN-U-ADMIN",
        )
        canonical = User(
            email="canonical-owner@example.com",
            hashed_password=get_password_hash("owner-secret"),
            role="user",
            gmfn_id="GMFN-U-CANONICAL",
            display_name="Owner Person",
            phone_e164="+447903165266",
            phone_verified_at=datetime.now(timezone.utc),
        )
        duplicate = User(
            email="duplicate-owner@example.com",
            hashed_password=get_password_hash("duplicate-secret"),
            role="user",
            gmfn_id="GMFN-U-DUPLICATE",
            display_name="Owner Person",
            phone_e164="+447903165299",
            phone_verified_at=datetime.now(timezone.utc),
        )
        db.add_all([admin, canonical, duplicate])
        db.flush()

        canonical_clan = Clan(
            name="Canonical Community",
            invite_code="canonical-community",
            community_code="GMFN-C-CANON",
            created_by_user_id=int(canonical.id),
            status="active",
        )
        duplicate_clan = Clan(
            name="Duplicate Created Community",
            invite_code="duplicate-community",
            community_code="GMFN-C-DUP",
            created_by_user_id=int(duplicate.id),
            status="active",
        )
        db.add_all([canonical_clan, duplicate_clan])
        db.flush()

        db.add_all(
            [
                ClanMembership(
                    clan_id=int(canonical_clan.id),
                    user_id=int(canonical.id),
                    role="user",
                ),
                ClanMembership(
                    clan_id=int(duplicate_clan.id),
                    user_id=int(duplicate.id),
                    role="admin",
                ),
                UserPayoutDestination(
                    user_id=int(duplicate.id),
                    destination_name="Owner Person",
                    bank_name="Pilot Bank",
                    account_number="0123456789",
                    country="GB",
                    currency="GBP",
                    verification_status="recorded",
                ),
                IdentityVerificationCheck(
                    user_id=int(duplicate.id),
                    verification_type="identity_profile",
                    provider_key="entry.profile_and_device",
                    status="recorded",
                    subject_reference="Owner Person",
                    confidence_score=20,
                ),
                IdentityRiskSignal(
                    user_id=int(duplicate.id),
                    signal_type="device_pattern_changed",
                    severity=5,
                    description="A new device pattern started using this account.",
                ),
                TrustSlip(
                    code="DUPLICATE-SLIP",
                    clan_id=int(duplicate_clan.id),
                    holder_user_id=int(duplicate.id),
                    trust_limit=Decimal("0.00"),
                    currency="GBP",
                    status="active",
                    created_at=datetime.now(timezone.utc),
                    is_current=True,
                ),
                TrustEvent(
                    event_type="identity.phone_verified",
                    clan_id=int(duplicate_clan.id),
                    actor_user_id=int(duplicate.id),
                    subject_user_id=int(duplicate.id),
                ),
            ]
        )
        db.commit()


def test_identity_recovery_rejects_non_text_controls_before_profile_write(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    with SessionLocal() as db:
        user = User(
            email="recovery-boundary@example.com",
            hashed_password=get_password_hash("owner-secret"),
            role="user",
            gmfn_id="GMFN-U-RECOVERY",
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        user_id = int(user.id)

    setup_res = client.post(
        "/identity-risk/recovery/setup",
        json={
            "questions": [
                {"prompt": "What private word did you keep for GSN?", "answer": "Harbor"},
                {"prompt": 12345, "answer": "Lantern"},
                {"prompt": "What answer do you keep for trust recovery?", "answer": False},
            ]
        },
        headers=_headers("recovery-boundary@example.com"),
    )
    assert setup_res.status_code == 422, setup_res.text

    verify_res = client.post(
        "/identity-risk/recovery/verify",
        json={"answers": ["Harbor", 12345, True]},
        headers=_headers("recovery-boundary@example.com"),
    )
    assert verify_res.status_code == 422, verify_res.text

    with SessionLocal() as db:
        assert (
            db.query(IdentityRecoveryProfile)
            .filter(IdentityRecoveryProfile.user_id == user_id)
            .count()
        ) == 0
        assert (
            db.query(IdentityRiskSignal)
            .filter(IdentityRiskSignal.user_id == user_id)
            .count()
        ) == 0


def test_admin_identity_reconciliation_dry_run_does_not_mutate(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GMFN-U-DUPLICATE",
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["mode"] == "dry_run"
    assert body["audit_event_id"] is None
    assert any(
        row["table"] == "trust_slips"
        and row["column"] == "holder_user_id"
        and row["action"] == "would_update"
        for row in body["operations"]
    )

    with SessionLocal() as db:
        duplicate = db.query(User).filter(User.gmfn_id == "GMFN-U-DUPLICATE").one()
        assert duplicate.email == "duplicate-owner@example.com"
        assert duplicate.phone_e164 == "+447903165299"
        slip = db.query(TrustSlip).filter(TrustSlip.code == "DUPLICATE-SLIP").one()
        assert int(slip.holder_user_id) == int(duplicate.id)


def test_admin_identity_reconciliation_rejects_coerced_identity_controls(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_user_id": True,
            "duplicate_gmfn_id": 12345,
            "owner_confirmed": "true",
            "execute": "false",
            "reviewer_note": {"note": "not text"},
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 422, res.text

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        duplicate = db.query(User).filter(User.gmfn_id == "GMFN-U-DUPLICATE").one()
        assert canonical.email == "canonical-owner@example.com"
        assert duplicate.email == "duplicate-owner@example.com"
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "identity.duplicate_reconciled")
            .count()
        ) == 0


def test_admin_identity_reconciliation_accepts_gsn_gmfn_alias_ids(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        canonical.gmfn_id = "GSN-U-CANONICAL"
        db.add(canonical)
        db.commit()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GSN-U-DUPLICATE",
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 200, res.text
    assert res.json()["mode"] == "dry_run"


def test_admin_identity_reconciliation_requires_owner_confirmation_for_execute(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GMFN-U-DUPLICATE",
            "execute": True,
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 409, res.text
    assert "Owner confirmation is required" in res.text


def test_admin_identity_reconciliation_executes_owner_confirmed_merge(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GMFN-U-DUPLICATE",
            "owner_confirmed": True,
            "execute": True,
            "reviewer_note": "Product owner confirmed both records are the same person.",
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["mode"] == "execute"
    assert body["audit_event_id"]

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        duplicate = db.query(User).filter(User.email == "merged-user-3@merged.gmfn.local").one()
        assert duplicate.gmfn_id == "MERGED-U-000003"
        assert duplicate.phone_e164 is None
        assert duplicate.phone_verified_at is None
        assert duplicate.hashed_password == "PENDING_APPROVAL"

        duplicate_clan = db.query(Clan).filter(Clan.community_code == "GMFN-C-DUP").one()
        assert int(duplicate_clan.created_by_user_id) == int(canonical.id)
        assert (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == int(duplicate_clan.id),
                ClanMembership.user_id == int(canonical.id),
            )
            .one()
            .role
            == "admin"
        )
        assert (
            db.query(UserPayoutDestination)
            .filter(UserPayoutDestination.user_id == int(canonical.id))
            .one()
            .account_number
            == "0123456789"
        )
        assert (
            db.query(IdentityVerificationCheck)
            .filter(IdentityVerificationCheck.user_id == int(canonical.id))
            .count()
            == 1
        )
        assert (
            db.query(IdentityRiskSignal)
            .filter(IdentityRiskSignal.user_id == int(canonical.id))
            .count()
            == 1
        )
        assert (
            db.query(TrustSlip)
            .filter(TrustSlip.code == "DUPLICATE-SLIP")
            .one()
            .holder_user_id
            == int(canonical.id)
        )
        trust_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == int(canonical.id))
            .order_by(TrustEvent.id.asc())
            .all()
        )
        assert {row.event_type for row in trust_events} >= {
            "identity.phone_verified",
            "identity.duplicate_reconciled",
        }


def test_admin_identity_reconciliation_moves_verified_phone_when_canonical_empty(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        canonical.phone_e164 = None
        canonical.phone_verified_at = None
        db.add(canonical)
        db.commit()

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GMFN-U-DUPLICATE",
            "owner_confirmed": True,
            "execute": True,
            "reviewer_note": "Owner confirmed duplicate phone belongs to canonical account holder.",
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 200, res.text
    body = res.json()
    phone_operation = next(
        row
        for row in body["operations"]
        if row["table"] == "users" and row["column"] == "phone_e164"
    )
    verified_operation = next(
        row
        for row in body["operations"]
        if row["table"] == "users" and row["column"] == "phone_verified_at"
    )
    assert phone_operation["action"] == "updated"
    assert verified_operation["action"] == "updated"

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        duplicate = db.query(User).filter(User.email == "merged-user-3@merged.gmfn.local").one()
        assert canonical.phone_e164 == "+447903165299"
        assert canonical.phone_verified_at is not None
        assert duplicate.phone_e164 is None
        assert duplicate.phone_verified_at is None


def test_admin_identity_reconciliation_keeps_different_canonical_phone(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    _seed_confirmed_duplicate_pair()

    with SessionLocal() as db:
        canonical_before = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        canonical_verified_at = canonical_before.phone_verified_at

    res = client.post(
        "/identity-risk/admin/reconcile-duplicate",
        json={
            "canonical_gmfn_id": "GMFN-U-CANONICAL",
            "duplicate_gmfn_id": "GMFN-U-DUPLICATE",
            "owner_confirmed": True,
            "execute": True,
            "reviewer_note": "Owner confirmed duplicate record but canonical phone remains primary.",
        },
        headers=_headers("identity-reconcile-admin@example.com"),
    )

    assert res.status_code == 200, res.text
    phone_operation = next(
        row
        for row in res.json()["operations"]
        if row["table"] == "users" and row["column"] == "phone_e164"
    )
    assert phone_operation["action"] == "skipped_conflict"

    with SessionLocal() as db:
        canonical = db.query(User).filter(User.gmfn_id == "GMFN-U-CANONICAL").one()
        duplicate = db.query(User).filter(User.email == "merged-user-3@merged.gmfn.local").one()
        assert canonical.phone_e164 == "+447903165266"
        assert canonical.phone_verified_at == canonical_verified_at
        assert duplicate.phone_e164 is None
        assert duplicate.phone_verified_at is None
