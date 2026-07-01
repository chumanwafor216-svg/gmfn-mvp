from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.core.auth import PENDING_APPROVAL_SENTINEL, get_current_user
from app.core.trust_event_types import TrustEventType
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanMembership,
    CommunityDomainAffiliation,
    CommunityMemberVerification,
    CommunityMemberVerificationRequest,
    TrustEvent,
    TrustSlip,
    User,
)
from app.main import app
from app.services.trust_slips_services import _community_context, get_trust_slip_payload


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _seed_member_verification_context(
    member_count: int = 5,
    *,
    admin_member_ids: set[int] | None = None,
) -> None:
    admin_member_ids = admin_member_ids or set()
    with SessionLocal() as db:
        db.add(
            Clan(
                id=1,
                name="Onitsha Main Market",
                community_code="GMFN-C-000001",
                invite_code="onitsha-invite",
                status="active",
                invite_uses=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        for user_id in range(1, member_count + 1):
            db.add(
                User(
                    id=user_id,
                    email=f"user{user_id}@example.com",
                    gmfn_id=f"GMFN-P-{user_id:06d}",
                    hashed_password="hashed",
                    role="user",
                )
            )
            db.add(
                ClanMembership(
                    id=user_id,
                    clan_id=1,
                    user_id=user_id,
                    role="admin" if user_id in admin_member_ids else "user",
                    personal_pool_balance=0,
                )
            )
        db.commit()


def _as_user(user_id: int):
    return lambda: Obj(
        id=user_id,
        email=f"user{user_id}@example.com",
        gmfn_id=f"GMFN-P-{user_id:06d}",
        role="user",
    )


def _grant_current_witness_standing(
    subject_user_ids: list[int],
    *,
    verifier_user_id: int = 1,
) -> None:
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        for subject_user_id in subject_user_ids:
            db.add(
                CommunityMemberVerification(
                    clan_id=1,
                    subject_user_id=int(subject_user_id),
                    verifier_user_id=int(verifier_user_id),
                    status="active",
                    verification_year=now.year,
                    valid_until=now + timedelta(days=365),
                    source="test_standing",
                )
            )
        db.commit()


def test_unverified_ordinary_member_cannot_verify_another_member(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        blocked = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert blocked.status_code == 403, blocked.text
        assert "current community witness standing" in blocked.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_admin_can_bootstrap_and_verified_member_can_verify_next_member(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        bootstrapped = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert bootstrapped.status_code == 200, bootstrapped.text
        assert bootstrapped.json()["verification_summary"]["active_verification_count"] == 1

        app.dependency_overrides[get_current_user] = _as_user(2)
        chained = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 3},
        )
        assert chained.status_code == 200, chained.text
        assert chained.json()["verification"]["verifier_user_id"] == 2
        assert chained.json()["verification_summary"]["active_verification_count"] == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_verification_rejects_malformed_body_controls_before_records(
    client: TestClient,
):
    _seed_member_verification_context(member_count=4, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        malformed_direct = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": True,
                "claim_label": False,
                "verification_note": 1.5,
            },
        )
        assert malformed_direct.status_code == 422, malformed_direct.text
        assert "subject_user_id must be an integer id" in malformed_direct.text
        assert "claim_label must be text" in malformed_direct.text
        assert "verification_note must be text" in malformed_direct.text

        app.dependency_overrides[get_current_user] = _as_user(2)
        malformed_request = client.post(
            "/clans/1/member-verification-requests",
            json={
                "verifier_user_id": 1.5,
                "claim_label": False,
                "request_note": 1.5,
            },
        )
        assert malformed_request.status_code == 422, malformed_request.text
        assert "verifier_user_id must be an integer id" in malformed_request.text
        assert "claim_label must be text" in malformed_request.text
        assert "request_note must be text" in malformed_request.text

        valid_request = client.post(
            "/clans/1/member-verification-requests",
            json={
                "verifier_user_id": 1,
                "claim_label": "Line F Electrical",
                "request_note": "Please stand for me as a member of this line.",
            },
        )
        assert valid_request.status_code == 200, valid_request.text
        request_payload = valid_request.json()["request"]
        public_token = request_payload["public_token"]

        app.dependency_overrides[get_current_user] = _as_user(1)
        malformed_decision = client.post(
            f"/clans/1/member-verification-requests/{public_token}/decision",
            json={
                "decision": False,
                "one_time_code": 12345,
                "response_note": 1.5,
            },
        )
        assert malformed_decision.status_code == 422, malformed_decision.text
        assert "decision must be text" in malformed_decision.text
        assert "one_time_code must be text" in malformed_decision.text
        assert "response_note must be text" in malformed_decision.text

        valid_direct = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": 3,
                "claim_label": "Line F Electrical",
                "verification_note": "Known here.",
            },
        )
        assert valid_direct.status_code == 200, valid_direct.text
        verification_id = valid_direct.json()["verification"]["id"]

        malformed_withdraw = client.post(
            f"/clans/1/member-verifications/{verification_id}/withdraw",
            json={"reason": False},
        )
        assert malformed_withdraw.status_code == 422, malformed_withdraw.text
        assert "reason must be text" in malformed_withdraw.text

        with SessionLocal() as db:
            request_row = db.query(CommunityMemberVerificationRequest).one()
            assert request_row.status == "pending"
            verification_row = db.get(CommunityMemberVerification, int(verification_id))
            assert verification_row is not None
            assert verification_row.status == "active"
            assert (
                db.query(TrustEvent)
                .filter(
                    TrustEvent.event_type
                    == TrustEventType.COMMUNITY_MEMBER_VERIFICATION_WITHDRAWN
                )
                .count()
                == 0
            )
            assert db.query(CommunityMemberVerification).count() == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_stale_member_witness_standing_cannot_verify_next_member(
    client: TestClient,
):
    _seed_member_verification_context(member_count=4, admin_member_ids={1})
    _grant_current_witness_standing([3], verifier_user_id=4)

    with SessionLocal() as db:
        stale_backer = db.get(User, 4)
        stale_backer.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = _as_user(3)
        blocked = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert blocked.status_code == 403, blocked.text
        assert "current community witness standing" in blocked.text

        app.dependency_overrides[get_current_user] = _as_user(2)
        blocked_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 3},
        )
        assert blocked_request.status_code == 403, blocked_request.text
        assert "current community witness standing" in blocked_request.text

        app.dependency_overrides[get_current_user] = _as_user(1)
        restored_standing = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 3},
        )
        assert restored_standing.status_code == 200, restored_standing.text

        app.dependency_overrides[get_current_user] = _as_user(3)
        allowed = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert allowed.status_code == 200, allowed.text
        assert allowed.json()["verification"]["verifier_user_id"] == 3
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_requires_verifier_with_current_standing(
    client: TestClient,
):
    _seed_member_verification_context(member_count=4, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        blocked = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 3},
        )
        assert blocked.status_code == 403, blocked.text
        assert "current community witness standing" in blocked.text

        admin_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert admin_request.status_code == 200, admin_request.text

        with SessionLocal() as db:
            db.query(CommunityMemberVerificationRequest).delete()
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(1)
        standing = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 3},
        )
        assert standing.status_code == 200, standing.text

        app.dependency_overrides[get_current_user] = _as_user(2)
        verified_member_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 3},
        )
        assert verified_member_request.status_code == 200, verified_member_request.text
        assert verified_member_request.json()["request"]["verifier_user_id"] == 3
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_decision_rechecks_verifier_current_standing(
    client: TestClient,
):
    _seed_member_verification_context(member_count=4, admin_member_ids={1})
    _grant_current_witness_standing([3], verifier_user_id=4)

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        created = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 3},
        )
        assert created.status_code == 200, created.text
        token = created.json()["request"]["public_token"]
        code = created.json()["request"]["one_time_code"]

        with SessionLocal() as db:
            stale_backer = db.get(User, 4)
            stale_backer.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(3)
        blocked = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert blocked.status_code == 403, blocked.text
        assert "current community witness standing" in blocked.text

        with SessionLocal() as db:
            request_row = db.query(CommunityMemberVerificationRequest).one()
            assert request_row.status == "pending"
            assert db.query(CommunityMemberVerification).count() == 1

        app.dependency_overrides[get_current_user] = _as_user(1)
        restored_standing = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 3},
        )
        assert restored_standing.status_code == 200, restored_standing.text

        app.dependency_overrides[get_current_user] = _as_user(3)
        approved = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["request"]["status"] == "approved"
        assert approved.json()["verification"]["subject_user_id"] == 2
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_surfaces_require_active_community(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    with SessionLocal() as db:
        community = db.get(Clan, 1)
        community.status = "closed"
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        direct = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert direct.status_code == 403, direct.text
        assert "active communities" in direct.text

        summary = client.get("/clans/1/member-verifications/summary?subject_user_id=2")
        assert summary.status_code == 403, summary.text
        assert "active communities" in summary.text

        app.dependency_overrides[get_current_user] = _as_user(2)
        request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert request.status_code == 403, request.text
        assert "active communities" in request.text

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerification).count() == 0
            assert db.query(CommunityMemberVerificationRequest).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_rejects_activation_pending_subject_or_verifier(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    with SessionLocal() as db:
        subject = db.get(User, 2)
        subject.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        pending_subject = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert pending_subject.status_code == 403, pending_subject.text
        assert "active community members" in pending_subject.text

        with SessionLocal() as db:
            subject = db.get(User, 2)
            verifier = db.get(User, 1)
            subject.hashed_password = "hashed"
            verifier.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(2)
        pending_verifier = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert pending_verifier.status_code == 404, pending_verifier.text
        assert "Verifier is not an active member" in pending_verifier.text

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerificationRequest).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_pending_assigned_verifier_cannot_decide_member_witness_request(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        created = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert created.status_code == 200, created.text
        token = created.json()["request"]["public_token"]
        code = created.json()["request"]["one_time_code"]

        with SessionLocal() as db:
            verifier = db.get(User, 1)
            verifier.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(1)
        blocked = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert blocked.status_code == 403, blocked.text
        assert "active community members" in blocked.text

        with SessionLocal() as db:
            request_row = db.query(CommunityMemberVerificationRequest).one()
            assert request_row.status == "pending"
            assert db.query(CommunityMemberVerification).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_members_can_record_and_withdraw_member_witness_verification(
    client: TestClient,
):
    _seed_member_verification_context(member_count=5, admin_member_ids={1})
    _grant_current_witness_standing([3, 4], verifier_user_id=1)

    try:
        created_ids: list[int] = []
        for verifier_id in [1, 3, 4]:
            app.dependency_overrides[get_current_user] = _as_user(verifier_id)
            response = client.post(
                "/clans/1/member-verifications",
                json={
                    "subject_user_id": 2,
                    "claim_label": "Line F Electrical",
                    "verification_note": "Known in this market line.",
                },
            )
            assert response.status_code == 200, response.text
            data = response.json()
            assert data["verification"]["verification_note"] == "Known in this market line."
            created_ids.append(data["verification"]["id"])

        summary = data["verification_summary"]
        assert summary["active_verification_count"] == 3
        assert summary["strength"] == "community_verified"
        assert summary["strength_label"] == "Community evidence"
        assert summary["public_label"] == "Community member evidence found"
        assert summary["renewal_status"] == "active"
        assert summary["renewal_status_label"] == "Active"

        app.dependency_overrides[get_current_user] = _as_user(3)
        withdrawn = client.post(
            f"/clans/1/member-verifications/{created_ids[1]}/withdraw",
            json={"reason": "No longer willing to stand for this member."},
        )
        assert withdrawn.status_code == 200, withdrawn.text
        withdrawn_summary = withdrawn.json()["verification_summary"]
        assert withdrawn_summary["active_verification_count"] == 2
        assert withdrawn_summary["strength"] == "lightly_verified"

        app.dependency_overrides[get_current_user] = _as_user(1)
        fetched = client.get("/clans/1/member-verifications/summary?subject_user_id=2")
        assert fetched.status_code == 200, fetched.text
        fetched_summary = fetched.json()["verification_summary"]
        assert fetched_summary["total_verification_count"] == 3
        fetched_text = json.dumps(fetched_summary, default=str)
        assert "verification_note" not in fetched_text
        assert "withdrawal_reason" not in fetched_text
        assert "Known in this market line." not in fetched_text
        assert "No longer willing to stand for this member." not in fetched_text

        with SessionLocal() as db:
            clan = db.get(Clan, 1)
            trustslip_context = _community_context(
                db,
                user_id=2,
                clan_id=1,
                clan=clan,
                community_name="Onitsha Main Market",
                active_clan_count=1,
                sponsor_count=0,
                unique_counterparties=0,
            )
        assert trustslip_context["member_witness_count"] == 2
        assert trustslip_context["membership_strength"] == "lightly_verified"
        assert trustslip_context["membership_renewal_status"] == "active"
        assert trustslip_context["membership_currentness_label"] == "Current witness window"
        assert "within its recorded validity window" in trustslip_context["membership_currentness_scope"]

        with SessionLocal() as db:
            past = datetime.now(timezone.utc) - timedelta(days=1)
            rows = (
                db.query(CommunityMemberVerification)
                .filter(CommunityMemberVerification.clan_id == 1)
                .filter(CommunityMemberVerification.subject_user_id == 2)
                .filter(CommunityMemberVerification.status == "active")
                .filter(CommunityMemberVerification.withdrawn_at.is_(None))
                .all()
            )
            for row in rows:
                row.valid_until = past
            db.commit()

        expired = client.get("/clans/1/member-verifications/summary?subject_user_id=2")
        assert expired.status_code == 200, expired.text
        expired_summary = expired.json()["verification_summary"]
        assert expired_summary["active_verification_count"] == 0
        assert expired_summary["strength"] == "joined"
        assert expired_summary["renewal_status"] == "expired"
        assert expired_summary["renewal_status_label"] == "Expired"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_yearly_limit_blocks_verification_factory(
    client: TestClient,
):
    _seed_member_verification_context(member_count=23, admin_member_ids={23})
    _grant_current_witness_standing([1], verifier_user_id=23)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        created_ids: list[int] = []
        for subject_user_id in range(2, 22):
            response = client.post(
                "/clans/1/member-verifications",
                json={"subject_user_id": subject_user_id},
            )
            assert response.status_code == 200, response.text
            created_ids.append(response.json()["verification"]["id"])

        blocked = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 22},
        )
        assert blocked.status_code == 409, blocked.text
        assert "yearly member-witness limit" in blocked.text

        withdrawn = client.post(
            f"/clans/1/member-verifications/{created_ids[0]}/withdraw",
            json={"reason": "No longer willing to stand for this member."},
        )
        assert withdrawn.status_code == 200, withdrawn.text
        still_blocked = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 22},
        )
        assert still_blocked.status_code == 409, still_blocked.text
        assert "yearly member-witness limit" in still_blocked.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_creation_respects_yearly_verifier_limit(
    client: TestClient,
):
    _seed_member_verification_context(member_count=23, admin_member_ids={23})
    _grant_current_witness_standing([1], verifier_user_id=23)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        for subject_user_id in range(2, 22):
            response = client.post(
                "/clans/1/member-verifications",
                json={"subject_user_id": subject_user_id},
            )
            assert response.status_code == 200, response.text

        app.dependency_overrides[get_current_user] = _as_user(22)
        blocked = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert blocked.status_code == 409, blocked.text
        assert "yearly member-witness limit" in blocked.text

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerificationRequest).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_rejects_duplicate_current_witness_but_allows_expired_renewal(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        created = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert created.status_code == 200, created.text

        app.dependency_overrides[get_current_user] = _as_user(2)
        duplicate_current = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert duplicate_current.status_code == 409, duplicate_current.text
        assert "already has a current witness confirmation" in duplicate_current.text

        with SessionLocal() as db:
            existing = db.query(CommunityMemberVerification).one()
            existing.valid_until = datetime.now(timezone.utc) - timedelta(days=1)
            db.commit()

        renewal_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert renewal_request.status_code == 200, renewal_request.text
        assert renewal_request.json()["request"]["status"] == "pending"

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerificationRequest).count() == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_allows_renewal_due_window(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        created = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 2},
        )
        assert created.status_code == 200, created.text

        with SessionLocal() as db:
            existing = db.query(CommunityMemberVerification).one()
            existing.valid_until = datetime.now(timezone.utc) + timedelta(days=14)
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(2)
        renewal_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert renewal_request.status_code == 200, renewal_request.text
        assert renewal_request.json()["request"]["status"] == "pending"

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerificationRequest).count() == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_pending_member_witness_request_reserves_verifier_capacity(
    client: TestClient,
):
    _seed_member_verification_context(member_count=24, admin_member_ids={24})
    _grant_current_witness_standing([1], verifier_user_id=24)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        for subject_user_id in range(2, 21):
            response = client.post(
                "/clans/1/member-verifications",
                json={"subject_user_id": subject_user_id},
            )
            assert response.status_code == 200, response.text

        app.dependency_overrides[get_current_user] = _as_user(21)
        first_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert first_request.status_code == 200, first_request.text
        token = first_request.json()["request"]["public_token"]
        code = first_request.json()["request"]["one_time_code"]

        duplicate_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert duplicate_request.status_code == 200, duplicate_request.text
        assert duplicate_request.json()["request"]["public_token"] == token

        app.dependency_overrides[get_current_user] = _as_user(22)
        blocked_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert blocked_request.status_code == 409, blocked_request.text
        assert "yearly member-witness limit" in blocked_request.text

        app.dependency_overrides[get_current_user] = _as_user(1)
        blocked_direct = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 22},
        )
        assert blocked_direct.status_code == 409, blocked_direct.text
        assert "yearly member-witness limit" in blocked_direct.text

        approved = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert approved.status_code == 200, approved.text
        assert approved.json()["verification"]["subject_user_id"] == 21

        with SessionLocal() as db:
            assert db.query(CommunityMemberVerificationRequest).count() == 1
            assert db.query(CommunityMemberVerification).filter(
                CommunityMemberVerification.verifier_user_id == 1,
                CommunityMemberVerification.verification_year
                == datetime.now(timezone.utc).year,
            ).count() == 20
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_database_rejects_duplicate_pending_member_witness_request_pair(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            CommunityMemberVerificationRequest(
                clan_id=1,
                subject_user_id=2,
                verifier_user_id=1,
                requested_by_user_id=2,
                public_token="pending-token-one",
                one_time_code="111111",
                status="pending",
                expires_at=now + timedelta(hours=1),
            )
        )
        db.commit()
        db.add(
            CommunityMemberVerificationRequest(
                clan_id=1,
                subject_user_id=2,
                verifier_user_id=1,
                requested_by_user_id=2,
                public_token="pending-token-two",
                one_time_code="222222",
                status="pending",
                expires_at=now + timedelta(hours=1),
            )
        )
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()

        db.add(
            CommunityMemberVerificationRequest(
                clan_id=1,
                subject_user_id=2,
                verifier_user_id=1,
                requested_by_user_id=2,
                public_token="declined-token",
                one_time_code="333333",
                status="declined",
                expires_at=now + timedelta(hours=1),
            )
        )
        db.commit()
        assert db.query(CommunityMemberVerificationRequest).count() == 2


def test_unexpired_prior_year_pending_request_reserves_current_capacity(
    client: TestClient,
):
    _seed_member_verification_context(member_count=24, admin_member_ids={24})
    _grant_current_witness_standing([1], verifier_user_id=24)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        for subject_user_id in range(2, 21):
            response = client.post(
                "/clans/1/member-verifications",
                json={"subject_user_id": subject_user_id},
            )
            assert response.status_code == 200, response.text

        app.dependency_overrides[get_current_user] = _as_user(21)
        pending = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert pending.status_code == 200, pending.text

        with SessionLocal() as db:
            row = db.query(CommunityMemberVerificationRequest).one()
            row.created_at = datetime.now(timezone.utc) - timedelta(days=370)
            row.expires_at = datetime.now(timezone.utc) + timedelta(hours=1)
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(22)
        blocked_request = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert blocked_request.status_code == 409, blocked_request.text
        assert "yearly member-witness limit" in blocked_request.text

        app.dependency_overrides[get_current_user] = _as_user(1)
        blocked_direct = client.post(
            "/clans/1/member-verifications",
            json={"subject_user_id": 22},
        )
        assert blocked_direct.status_code == 409, blocked_direct.text
        assert "yearly member-witness limit" in blocked_direct.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_can_renew_expired_existing_witness_record(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        created = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": 2,
                "claim_label": "Line F Electrical",
                "verification_note": "Known in this market line.",
            },
        )
        assert created.status_code == 200, created.text
        original = created.json()["verification"]
        original_valid_until = original["valid_until"]

        with SessionLocal() as db:
            row = db.get(CommunityMemberVerification, int(original["id"]))
            assert row is not None
            row.valid_until = datetime.now(timezone.utc) - timedelta(days=1)
            row.verification_year = datetime.now(timezone.utc).year - 1
            db.commit()

        renewed = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": 2,
                "claim_label": "Line F Electrical renewed",
                "verification_note": "Still known in this market line.",
            },
        )
        assert renewed.status_code == 200, renewed.text
        renewed_body = renewed.json()
        renewed_verification = renewed_body["verification"]
        assert renewed_verification["id"] == original["id"]
        assert renewed_verification["claim_label"] == "Line F Electrical renewed"
        assert renewed_verification["valid_until"] != original_valid_until
        assert renewed_body["verification_summary"]["active_verification_count"] == 1
        assert renewed_body["verification_summary"]["renewal_status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_direct_record_refreshes_renewal_due_window(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        created = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": 2,
                "claim_label": "Line F Electrical",
                "verification_note": "Known in this market line.",
            },
        )
        assert created.status_code == 200, created.text
        original = created.json()["verification"]
        original_valid_until = original["valid_until"]

        with SessionLocal() as db:
            row = db.get(CommunityMemberVerification, int(original["id"]))
            assert row is not None
            row.valid_until = datetime.now(timezone.utc) + timedelta(days=14)
            db.commit()

        renewed = client.post(
            "/clans/1/member-verifications",
            json={
                "subject_user_id": 2,
                "claim_label": "Line F Electrical renewed early",
                "verification_note": "Still known in this market line.",
            },
        )
        assert renewed.status_code == 200, renewed.text
        renewed_body = renewed.json()
        renewed_verification = renewed_body["verification"]
        assert renewed_verification["id"] == original["id"]
        assert renewed_verification["claim_label"] == "Line F Electrical renewed early"
        assert renewed_verification["valid_until"] != original_valid_until
        assert renewed_body["verification_summary"]["renewal_status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_requires_assigned_verifier_and_one_time_code(
    client: TestClient,
):
    _seed_member_verification_context(member_count=4, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        created = client.post(
            "/clans/1/member-verification-requests",
            json={
                "verifier_user_id": 1,
                "claim_label": "Line F Electrical",
                "request_note": "Please stand for me as a member of this line.",
            },
        )
        assert created.status_code == 200, created.text
        request_payload = created.json()["request"]
        token = request_payload["public_token"]
        code = request_payload["one_time_code"]
        assert request_payload["status"] == "pending"
        assert request_payload["subject_user_id"] == 2
        assert request_payload["verifier_user_id"] == 1
        assert "member_witness_request=" in request_payload["approval_path"]

        subject_view = client.get(f"/clans/1/member-verification-requests/{token}")
        assert subject_view.status_code == 200, subject_view.text
        assert subject_view.json()["request"]["one_time_code"] == code

        app.dependency_overrides[get_current_user] = _as_user(1)
        verifier_view = client.get(f"/clans/1/member-verification-requests/{token}")
        assert verifier_view.status_code == 200, verifier_view.text
        assert "one_time_code" not in verifier_view.json()["request"]

        app.dependency_overrides[get_current_user] = _as_user(3)
        blocked = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert blocked.status_code == 403, blocked.text

        app.dependency_overrides[get_current_user] = _as_user(1)
        wrong_code = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": "000000"},
        )
        assert wrong_code.status_code == 400, wrong_code.text
        assert "one-time witness code" in wrong_code.text

        approved = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={
                "decision": "approve",
                "one_time_code": code,
                "response_note": "Known here and active in this line.",
            },
        )
        assert approved.status_code == 200, approved.text
        approved_body = approved.json()
        assert approved_body["request"]["status"] == "approved"
        assert approved_body["request"]["resulting_verification_id"] == approved_body["verification"]["id"]
        assert approved_body["verification"]["source"] == "member_witness_request"
        assert approved_body["verification_summary"]["active_verification_count"] == 1
        assert approved_body["verification_summary"]["strength"] == "lightly_verified"

        replay = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert replay.status_code == 200, replay.text
        assert replay.json()["request"]["status"] == "approved"
        assert replay.json()["verification_summary"]["active_verification_count"] == 1

        with SessionLocal() as db:
            request_row = db.query(CommunityMemberVerificationRequest).one()
            assert request_row.status == "approved"
            verification_row = db.query(CommunityMemberVerification).one()
            assert verification_row.subject_user_id == 2
            assert verification_row.verifier_user_id == 1
            event_types = [row.event_type for row in db.query(TrustEvent).order_by(TrustEvent.id).all()]
            assert event_types == [
                "community_member_verification_requested",
                "community_member_verified",
                "community_member_verification_approved",
            ]
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_process_events_do_not_inflate_public_activity(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        created = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert created.status_code == 200, created.text
        token = created.json()["request"]["public_token"]
        code = created.json()["request"]["one_time_code"]

        app.dependency_overrides[get_current_user] = _as_user(1)
        approved = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert approved.status_code == 200, approved.text

        app.dependency_overrides.pop(get_current_user, None)
        public = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
        assert public.status_code == 200, public.text
        body = public.json()
        assert body["member_witness_count"] == 1
        assert body["community_activity_count"] == 1
        assert body["community_activity_categories"] == ["Community verification"]
        assert "1 broad community activity event(s)" in body["community_trust_reading_scope"]
        assert "community_member_verification_requested" not in public.text
        assert "community_member_verification_approved" not in public.text

        with SessionLocal() as db:
            event_types = [
                row.event_type
                for row in db.query(TrustEvent).order_by(TrustEvent.id).all()
            ]
            assert event_types == [
                "community_member_verification_requested",
                "community_member_verified",
                "community_member_verification_approved",
            ]
            trustslip = get_trust_slip_payload(db, user_id=2)
        assert trustslip["community_activity_count"] == 1
        assert trustslip["community_activity_categories"] == ["Community verification"]
        assert "community_member_verification_requested" not in json.dumps(
            trustslip,
            default=str,
        )
        assert "community_member_verification_approved" not in json.dumps(
            trustslip,
            default=str,
        )
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_member_witness_request_expires_before_approval(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    try:
        app.dependency_overrides[get_current_user] = _as_user(2)
        created = client.post(
            "/clans/1/member-verification-requests",
            json={"verifier_user_id": 1},
        )
        assert created.status_code == 200, created.text
        token = created.json()["request"]["public_token"]
        code = created.json()["request"]["one_time_code"]

        with SessionLocal() as db:
            row = db.query(CommunityMemberVerificationRequest).one()
            row.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(1)
        expired = client.post(
            f"/clans/1/member-verification-requests/{token}/decision",
            json={"decision": "approve", "one_time_code": code},
        )
        assert expired.status_code == 410, expired.text
        assert "expired" in expired.text

        with SessionLocal() as db:
            request_row = db.query(CommunityMemberVerificationRequest).one()
            assert request_row.status == "expired"
            assert db.query(CommunityMemberVerification).count() == 0
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_public_member_credential_shows_aggregate_membership_without_private_witnesses(
    client: TestClient,
):
    _seed_member_verification_context(member_count=5, admin_member_ids={1})
    _grant_current_witness_standing([3, 4], verifier_user_id=1)

    try:
        for verifier_id in [1, 3, 4]:
            app.dependency_overrides[get_current_user] = _as_user(verifier_id)
            response = client.post(
                "/clans/1/member-verifications",
                json={
                    "subject_user_id": 2,
                    "claim_label": "Line F Electrical",
                    "verification_note": "Known in this market line.",
                },
            )
            assert response.status_code == 200, response.text

        next_renewal = datetime.now(timezone.utc) + timedelta(days=14)
        long_renewal = datetime.now(timezone.utc) + timedelta(days=220)
        with SessionLocal() as db:
            due_row = (
                db.query(CommunityMemberVerification)
                .filter(CommunityMemberVerification.clan_id == 1)
                .filter(CommunityMemberVerification.subject_user_id == 2)
                .filter(CommunityMemberVerification.verifier_user_id == 1)
                .one()
            )
            later_row = (
                db.query(CommunityMemberVerification)
                .filter(CommunityMemberVerification.clan_id == 1)
                .filter(CommunityMemberVerification.subject_user_id == 2)
                .filter(CommunityMemberVerification.verifier_user_id == 3)
                .one()
            )
            due_row.valid_until = next_renewal
            later_row.valid_until = long_renewal
            db.commit()

        app.dependency_overrides[get_current_user] = _as_user(1)
        summary_response = client.get(
            "/clans/1/member-verifications/summary",
            params={"subject_user_id": 2},
        )
        assert summary_response.status_code == 200, summary_response.text
        verification_summary = summary_response.json()["verification_summary"]
        assert verification_summary["renewal_status"] == "active"
        assert verification_summary["next_witness_renewal_status"] == "renewal_due"
        assert verification_summary["next_witness_renewal_status_label"] == "Renewal Due"
        assert verification_summary["next_witness_renewal_at"]

        app.dependency_overrides.pop(get_current_user, None)
        public = client.get("/verify/community/GSN-C-000001/member/GSN-P-000002")
        assert public.status_code == 200, public.text
        body = public.json()
        assert body["community_code"] == "GMFN-C-000001"
        assert body["community_public_face_status"] == "basic_public_record"
        assert body["community_public_face_label"] == "Basic public record"
        assert body["official_affiliate_status"] == "not_asserted"
        assert body["official_affiliate_label"] == "No parent-domain affiliate claim on this record"
        assert body["community_evidence_currentness_status"] == "active_basic_record"
        assert body["community_evidence_currentness_label"] == "Active recorded Community ID"
        assert "Parent-domain acknowledgement" in body["community_evidence_currentness_scope"]
        assert body["member_gsn_id"] == "GMFN-P-000002"
        assert body["membership_status"] == "active"
        assert body["member_witness_count"] == 3
        assert body["membership_strength"] == "community_verified"
        assert body["public_label"] == "Community member evidence found"
        assert body["membership_renewal_status"] == "active"
        assert body["next_witness_renewal_status"] == "renewal_due"
        assert body["next_witness_renewal_status_label"] == "Renewal Due"
        assert body["next_witness_renewal_at"]
        assert body["community_activity_count"] == 3
        assert body["community_activity_label"] == "Community activity recorded"
        assert "Community verification" in body["community_activity_categories"]
        assert body["community_activity_latest_at"]
        assert body["community_trust_reading_label"] == "Community member evidence"
        assert "active membership" in body["community_trust_reading_scope"]
        assert "Community evidence" in body["community_trust_reading_scope"]
        assert "3 broad community activity event(s)" in body["community_trust_reading_scope"]
        assert "not a universal trust score" in body["community_trust_reading_scope"]
        assert body["membership_currentness_label"] == "Current witness window"
        assert "within its recorded validity window" in body["membership_currentness_scope"]
        assert "read witness strength" in body["membership_currentness_scope"]
        assert "verifier_display_name" not in body
        assert "verification_note" not in body
        assert "event_type" not in body
        assert "private" in body["privacy_note"].lower()

        with SessionLocal() as db:
            trustslip = get_trust_slip_payload(db, user_id=2)
        assert trustslip["community_evidence_currentness_status"] == "active_basic_record"
        assert trustslip["community_evidence_currentness_label"] == "Active recorded Community ID"
        assert "Parent-domain acknowledgement" in trustslip["community_evidence_currentness_scope"]
        assert trustslip["community_activity_count"] == 3
        assert trustslip["community_activity_label"] == "Community activity recorded"
        assert "Community verification" in trustslip["community_activity_categories"]
        assert trustslip["membership_currentness_label"] == "Current witness window"
        assert "TrustSlip, community activity" in trustslip["membership_currentness_scope"]
        assert trustslip["next_witness_renewal_status"] == "renewal_due"
        assert trustslip["next_witness_renewal_status_label"] == "Renewal Due"
        assert trustslip["next_witness_renewal_at"]
        assert trustslip["merchant_summary"]["community_evidence_currentness_status"] == "active_basic_record"
        assert (
            trustslip["merchant_summary"]["community_evidence_currentness_label"]
            == "Active recorded Community ID"
        )
        assert trustslip["merchant_summary"]["community_activity_count"] == 3
        assert trustslip["merchant_summary"]["membership_currentness_label"] == "Current witness window"
        assert trustslip["merchant_summary"]["next_witness_renewal_status"] == "renewal_due"
        assert "event_type" not in trustslip
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_public_member_credential_shows_parent_domain_currentness(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})

    with SessionLocal() as db:
        db.add(
            Clan(
                id=2,
                name="Anambra Traders Umbrella",
                community_code="GMFN-C-000900",
                invite_code="anambra-umbrella",
                status="active",
                invite_uses=0,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.add(
            CommunityDomainAffiliation(
                parent_clan_id=2,
                affiliate_clan_id=1,
                requested_by_user_id=1,
                decided_by_user_id=1,
                status="approved",
                request_note="Line group asks to be acknowledged under the parent domain.",
                decision_note="Acknowledged as an affiliate under the parent domain.",
                decided_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    public = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
    assert public.status_code == 200, public.text
    body = public.json()
    assert body["community_public_face_status"] == "affiliate_acknowledged_record"
    assert body["community_public_face_label"] == "Affiliate acknowledged public record"
    assert body["official_affiliate_status"] == "approved"
    assert body["official_affiliate_label"] == "Acknowledged affiliate under parent domain"
    assert body["community_evidence_currentness_status"] == "current_parent_acknowledgement"
    assert body["community_evidence_currentness_label"] == "Current parent-domain acknowledgement"
    assert "current parent-domain acknowledgement" in body["community_evidence_currentness_scope"]
    assert "member, shop, subgroup" in body["community_evidence_currentness_scope"]

    with SessionLocal() as db:
        trustslip = get_trust_slip_payload(db, user_id=2)
    assert trustslip["community_evidence_currentness_status"] == "current_parent_acknowledgement"
    assert trustslip["community_evidence_currentness_label"] == "Current parent-domain acknowledgement"
    assert (
        trustslip["merchant_summary"]["community_evidence_currentness_status"]
        == "current_parent_acknowledgement"
    )
    assert (
        trustslip["community_context"]["community_evidence_currentness_status"]
        == "current_parent_acknowledgement"
    )


def test_member_witness_strength_excludes_inactive_or_pending_verifiers(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3, admin_member_ids={1})
    _grant_current_witness_standing([2], verifier_user_id=1)
    _grant_current_witness_standing([2], verifier_user_id=3)

    try:
        app.dependency_overrides[get_current_user] = _as_user(1)
        summary = client.get("/clans/1/member-verifications/summary?subject_user_id=2")
        assert summary.status_code == 200, summary.text
        assert summary.json()["verification_summary"]["active_verification_count"] == 2

        public = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
        assert public.status_code == 200, public.text
        assert public.json()["member_witness_count"] == 2

        with SessionLocal() as db:
            trustslip = get_trust_slip_payload(db, user_id=2)
        assert trustslip["member_witness_count"] == 2

        with SessionLocal() as db:
            pending_verifier = db.get(User, 3)
            pending_verifier.hashed_password = PENDING_APPROVAL_SENTINEL
            db.commit()

        summary_after_pending = client.get(
            "/clans/1/member-verifications/summary?subject_user_id=2"
        )
        assert summary_after_pending.status_code == 200, summary_after_pending.text
        assert (
            summary_after_pending.json()["verification_summary"]["active_verification_count"]
            == 1
        )

        public_after_pending = client.get(
            "/verify/community/GMFN-C-000001/member/GMFN-P-000002"
        )
        assert public_after_pending.status_code == 200, public_after_pending.text
        assert public_after_pending.json()["member_witness_count"] == 1

        with SessionLocal() as db:
            trustslip_after_pending = get_trust_slip_payload(db, user_id=2)
        assert trustslip_after_pending["member_witness_count"] == 1

        with SessionLocal() as db:
            pending_verifier = db.get(User, 3)
            pending_verifier.hashed_password = "hashed"
            verifier_membership = (
                db.query(ClanMembership)
                .filter(ClanMembership.clan_id == 1)
                .filter(ClanMembership.user_id == 3)
                .first()
            )
            verifier_membership.left_at = datetime.now(timezone.utc)
            db.commit()

        public_after_left = client.get(
            "/verify/community/GMFN-C-000001/member/GMFN-P-000002"
        )
        assert public_after_left.status_code == 200, public_after_left.text
        assert public_after_left.json()["member_witness_count"] == 1

        with SessionLocal() as db:
            trustslip_after_left = get_trust_slip_payload(db, user_id=2)
        assert trustslip_after_left["member_witness_count"] == 1
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_external_registration_evidence_is_not_personal_public_activity(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)
    recorded_at = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type=TrustEventType.COMMUNITY_EXTERNAL_REGISTRATION_RECORDED,
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "reason": "community_external_registration_recorded",
                        "verification_effect": "none",
                        "evidence_fingerprint": "should-not-leak",
                    }
                ),
                created_at=recorded_at,
            )
        )
        db.add(
            TrustEvent(
                event_type=TrustEventType.COMMUNITY_MEMBER_VERIFIED,
                clan_id=1,
                actor_user_id=2,
                subject_user_id=1,
                meta_json=json.dumps({"reason": "ordinary_member_activity"}),
                created_at=recorded_at + timedelta(seconds=1),
            )
        )
        db.commit()

    public = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000001")
    assert public.status_code == 200, public.text
    body = public.json()
    assert body["community_activity_count"] == 1
    assert body["community_activity_label"] == "Community activity recorded"
    assert body["community_activity_categories"] == ["Community verification"]
    assert body["community_trust_reading_label"] == "Active membership; witness evidence not started"
    assert "0 broad community activity" not in body["community_trust_reading_scope"]
    assert "1 broad community activity event(s)" in body["community_trust_reading_scope"]
    assert body["membership_currentness_label"] == "Witness renewal not started"
    assert "no current witness validity window" in body["membership_currentness_scope"]
    assert "community_external_registration_recorded" not in public.text
    assert "should-not-leak" not in public.text

    with SessionLocal() as db:
        trustslip = get_trust_slip_payload(db, user_id=1)
    trustslip_text = json.dumps(trustslip, default=str)
    assert trustslip["community_activity_count"] == 1
    assert trustslip["community_activity_label"] == "Community activity recorded"
    assert trustslip["community_activity_categories"] == ["Community verification"]
    assert trustslip["membership_currentness_label"] == "Witness renewal not started"
    assert "no current witness validity window" in trustslip["membership_currentness_scope"]
    assert trustslip["merchant_summary"]["community_activity_count"] == 1
    assert trustslip["merchant_summary"]["membership_currentness_label"] == "Witness renewal not started"
    assert "community_external_registration_recorded" not in trustslip_text
    assert "should-not-leak" not in trustslip_text


def test_backend_trustslip_verify_page_links_scoped_member_credential(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)
    issued_at = datetime(2026, 6, 19, 9, 30, tzinfo=timezone.utc)

    with SessionLocal() as db:
        db.add(
            TrustSlip(
                code="MEMBER-CREDENTIAL-PAPER",
                clan_id=1,
                holder_user_id=2,
                trust_limit=Decimal("0.00"),
                currency="NGN",
                status="active",
                expires_at=issued_at + timedelta(days=7),
                created_at=issued_at,
                is_current=True,
            )
        )
        db.commit()

    response = client.get("/trust-slips/verify/MEMBER-CREDENTIAL-PAPER/page")
    assert response.status_code == 200, response.text
    assert "Member credential" in response.text
    assert "/verify/community/GMFN-C-000001/member/GMFN-P-000002" in response.text
    assert "Open scoped credential" in response.text

    lite = client.get("/trust-slips/verify/MEMBER-CREDENTIAL-PAPER/lite")
    assert lite.status_code == 200, lite.text
    assert "Member credential" in lite.text
    assert "/verify/community/GMFN-C-000001/member/GMFN-P-000002" in lite.text

    verify_json = client.get("/trust-slips/verify/MEMBER-CREDENTIAL-PAPER")
    assert verify_json.status_code == 200, verify_json.text
    verify_data = verify_json.json()
    assert verify_data["member_credential_page"] == "/verify/community/GMFN-C-000001/member/GMFN-P-000002"
    assert verify_data["membership_currentness_label"] == "Witness renewal not started"
    assert "no current witness validity window" in verify_data["membership_currentness_scope"]
    assert (
        verify_data["merchant_view"]["member_credential_page"]
        == "/verify/community/GMFN-C-000001/member/GMFN-P-000002"
    )
    assert verify_data["merchant_view"]["membership_currentness_label"] == "Witness renewal not started"

    share_text = client.get("/trust-slips/verify/MEMBER-CREDENTIAL-PAPER/share-text")
    assert share_text.status_code == 200, share_text.text
    share_data = share_text.json()
    assert share_data["member_credential_page"] == "/verify/community/GMFN-C-000001/member/GMFN-P-000002"
    assert "Member credential: /verify/community/GMFN-C-000001/member/GMFN-P-000002" in share_data["text"]
    assert "Evidence only: not credit approval, payment instruction, or release permission." in share_data["text"]


def test_backend_trustslip_suppresses_member_credential_for_pending_holder(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)
    issued_at = datetime(2026, 6, 19, 9, 30, tzinfo=timezone.utc)

    with SessionLocal() as db:
        pending_user = db.get(User, 2)
        pending_user.hashed_password = PENDING_APPROVAL_SENTINEL
        db.add(
            TrustSlip(
                code="PENDING-MEMBER-CREDENTIAL-PAPER",
                clan_id=1,
                holder_user_id=2,
                trust_limit=Decimal("0.00"),
                currency="NGN",
                status="active",
                expires_at=issued_at + timedelta(days=7),
                created_at=issued_at,
                is_current=True,
            )
        )
        db.commit()

    verify_json = client.get("/trust-slips/verify/PENDING-MEMBER-CREDENTIAL-PAPER")
    assert verify_json.status_code == 200, verify_json.text
    verify_data = verify_json.json()
    assert verify_data["member_credential_page"] is None
    assert "member_credential_page" not in verify_data["merchant_view"]

    page = client.get("/trust-slips/verify/PENDING-MEMBER-CREDENTIAL-PAPER/page")
    assert page.status_code == 200, page.text
    assert "/verify/community/GMFN-C-000001/member/GMFN-P-000002" not in page.text
    assert "Open scoped credential" not in page.text

    share_text = client.get("/trust-slips/verify/PENDING-MEMBER-CREDENTIAL-PAPER/share-text")
    assert share_text.status_code == 200, share_text.text
    share_data = share_text.json()
    assert share_data["member_credential_page"] is None
    assert "Member credential:" not in share_data["text"]


def test_backend_trustslip_suppresses_member_credential_for_closed_community(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)
    issued_at = datetime(2026, 6, 19, 9, 30, tzinfo=timezone.utc)

    with SessionLocal() as db:
        community = db.get(Clan, 1)
        community.status = "closed"
        db.add(
            TrustSlip(
                code="CLOSED-COMMUNITY-MEMBER-CREDENTIAL-PAPER",
                clan_id=1,
                holder_user_id=2,
                trust_limit=Decimal("0.00"),
                currency="NGN",
                status="active",
                expires_at=issued_at + timedelta(days=7),
                created_at=issued_at,
                is_current=True,
            )
        )
        db.commit()

    verify_json = client.get("/trust-slips/verify/CLOSED-COMMUNITY-MEMBER-CREDENTIAL-PAPER")
    assert verify_json.status_code == 200, verify_json.text
    verify_data = verify_json.json()
    assert verify_data["member_credential_page"] is None
    assert "member_credential_page" not in verify_data["merchant_view"]

    lite = client.get("/trust-slips/verify/CLOSED-COMMUNITY-MEMBER-CREDENTIAL-PAPER/lite")
    assert lite.status_code == 200, lite.text
    assert "/verify/community/GMFN-C-000001/member/GMFN-P-000002" not in lite.text
    assert "Open scoped credential" not in lite.text

    share_text = client.get("/trust-slips/verify/CLOSED-COMMUNITY-MEMBER-CREDENTIAL-PAPER/share-text")
    assert share_text.status_code == 200, share_text.text
    share_data = share_text.json()
    assert share_data["member_credential_page"] is None
    assert "Member credential:" not in share_data["text"]


def test_public_member_credential_requires_active_membership(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)

    with SessionLocal() as db:
        membership = (
            db.query(ClanMembership)
            .filter(ClanMembership.clan_id == 1)
            .filter(ClanMembership.user_id == 2)
            .first()
        )
        membership.left_at = datetime.now(timezone.utc)
        db.commit()

    response = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
    assert response.status_code == 404, response.text
    assert "Member not found in this community" in response.text


def test_public_member_credential_rejects_activation_pending_member(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)

    with SessionLocal() as db:
        pending_user = db.get(User, 2)
        pending_user.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    response = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
    assert response.status_code == 404, response.text
    assert "Member not found in this community" in response.text


def test_public_member_credential_requires_active_community(
    client: TestClient,
):
    _seed_member_verification_context(member_count=2)

    with SessionLocal() as db:
        community = db.get(Clan, 1)
        community.status = "closed"
        db.commit()

    response = client.get("/verify/community/GMFN-C-000001/member/GMFN-P-000002")
    assert response.status_code == 404, response.text
    assert "Community not found" in response.text


def test_community_confirmation_summary_excludes_activation_pending_members(
    client: TestClient,
):
    _seed_member_verification_context(member_count=3)

    with SessionLocal() as db:
        pending_user = db.get(User, 3)
        pending_user.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    response = client.get("/community-confirmations/community/1/summary?subject_user_id=1")
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["active_member_count"] == 2
    assert body["contactable_reference_count"] == 1
