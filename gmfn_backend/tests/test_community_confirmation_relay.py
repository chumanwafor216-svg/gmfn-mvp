from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy import text

from app.core.auth import get_current_user
from app.db.database import SessionLocal, engine
from app.db.models import (
    CommunityConfirmationContact,
    CommunityConfirmationDecision,
    CommunityConfirmationRequest,
    CommunityConfirmationReviewCase,
    CommunityConfirmationReviewEvidence,
    TrustEvent,
    TrustSlip,
)
from app.db.notification_models import Notification
from app.main import app
from app.services.community_confirmation_service import build_community_confirmation_summary
from app.services.trust_score_service import compute_trust_breakdown


class Obj:
    def __init__(self, **kwargs):
        self.__dict__.update(kwargs)


def _seed_relay_fixture() -> None:
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (1, 'pytest@example.com', 'hashed', 'admin')
                """
            )
        )
        conn.execute(
            text(
                """
                UPDATE users
                SET display_name = 'Ada Test',
                    gmfn_id = 'GSN-U-TEST001',
                    phone_verified_at = CURRENT_TIMESTAMP
                WHERE id = 1
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (2, 'user2@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clans (
                    id,
                    name,
                    invite_code,
                    community_code,
                    status,
                    invite_uses,
                    created_at
                )
                VALUES (
                    1,
                    'Test Clan',
                    'test-invite-1',
                    'GSN-C-000001',
                    'active',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 1, 'admin', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 2, 'user', 0)
                """
            )
        )

    with SessionLocal() as db:
        membership_count = db.execute(
            text("SELECT COUNT(*) FROM clan_memberships WHERE clan_id = 1")
        ).scalar_one()
        assert membership_count == 2
        db.add(
            TrustSlip(
                code="CCR-TRUSTSLIP-1",
                clan_id=1,
                holder_user_id=1,
                trust_limit=Decimal("0.00"),
                currency="NGN",
                status="active",
                expires_at=now + timedelta(days=14),
                created_at=now,
                is_current=True,
            )
        )
        db.commit()


def test_community_confirmation_relay_keeps_public_outcome_aggregate_only(
    client: TestClient,
):
    _seed_relay_fixture()

    created = client.post(
        "/community-confirmations/request",
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert created.status_code == 200, created.text
    token = created.json()["public_token"]
    created_data = created.json()

    token = created_data["public_token"]
    assert created_data["community_response"]["requests_sent"] == 1
    assert created_data["community_response"]["active_member_count"] == 2
    assert created_data["community_response"]["private_contacts_exposed"] is False
    assert "responder_user_id" not in json.dumps(created_data)
    assert "phone_e164" not in json.dumps(created_data)
    with SessionLocal() as db:
        responder_notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .all()
        )
        assert len(responder_notifications) == 1
        responder_notice = responder_notifications[0]
        assert responder_notice.user_id == 2
        assert responder_notice.is_read is False
        assert "/app/community-confirmations" in (responder_notice.action_url or "")
        assert "request_id=" in (responder_notice.action_url or "")
        assert responder_notice.action_label == "Respond"
        assert "Respond only if you genuinely know them" in responder_notice.message

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="user2@example.com",
        role="user",
    )
    try:
        inbox = client.get("/community-confirmations/inbox")
        assert inbox.status_code == 200, inbox.text
        inbox_data = inbox.json()
        assert inbox_data["total"] == 1
        request_id = inbox_data["items"][0]["id"]
        subject_profile = inbox_data["items"][0]["subject_profile"]
        assert subject_profile["display_name"] == "Ada Test"
        assert subject_profile["gmfn_id"] == "GSN-U-TEST001"
        assert subject_profile["phone_verified"] is True
        assert subject_profile["membership_status"] == "active"
        assert "phone_e164" not in json.dumps(subject_profile)

        answered = client.post(
            f"/community-confirmations/{request_id}/respond",
            json={
                "response_type": "active_here",
                "response_reason": "known_in_community",
                "response_note": "Known here for this level of check.",
            },
        )
        assert answered.status_code == 200, answered.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    public = client.get(f"/community-confirmations/public/{token}")
    assert public.status_code == 200, public.text
    public_data = public.json()
    assert public_data["community_response"]["confirmed_known_count"] == 1
    assert public_data["community_response"]["active_member_count"] == 2
    assert public_data["community_response"]["responses_received"] == 1
    assert public_data["community_response"]["community_confidence"] == "limited"
    assert public_data["community_response"]["private_contacts_exposed"] is False
    public_text = json.dumps(public_data)
    assert "responder_user_id" not in public_text
    assert "user2@example.com" not in public_text

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="merchant@example.com",
        role="merchant",
    )
    try:
        decision = client.post(
            f"/community-confirmations/{request_id}/decision",
            json={
                "decision": "partial_release",
                "amount_band": "low",
                "issue_reported": False,
                "settled": True,
                "decision_note": "Released a reduced low-risk item after confirmation.",
            },
        )
        assert decision.status_code == 200, decision.text
        decision_data = decision.json()
        assert decision_data["decision_recorded"] is True
        assert decision_data["decision_id"] > 0
        assert decision_data["decision"] == "partial_release"

        status_update = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "settled",
                "issue_reported": False,
                "settled": True,
                "decision_note": "Reduced release was settled without an issue.",
            },
        )
        assert status_update.status_code == 200, status_update.text
        status_data = status_update.json()
        assert status_data["decision_updated"] is True
        assert status_data["status"] == "settled"
        assert status_data["settled"] is True

        fetched_decision = client.get(f"/community-confirmations/{request_id}/decision")
        assert fetched_decision.status_code == 200, fetched_decision.text
        fetched_data = fetched_decision.json()
        assert fetched_data["decision_found"] is True
        assert fetched_data["decision_id"] == decision_data["decision_id"]
        assert fetched_data["decision"] == "partial_release"
        assert fetched_data["status"] == "settled"
        assert fetched_data["private_contacts_exposed"] is False
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        assert request.subject_user_id == 1
        assert request.community_id == 1
        assert request.status == "responded"
        decision_row = db.query(CommunityConfirmationDecision).one()
        assert decision_row.request_id == request.id
        assert decision_row.actor_user_id == 2
        assert decision_row.subject_user_id == 1
        assert decision_row.decision == "partial_release"
        assert decision_row.amount_band == "low"
        assert decision_row.status == "settled"
        assert decision_row.settled is True
        assert decision_row.confidence_snapshot["confidence_level"] == "limited"

        event_types = [row.event_type for row in db.query(TrustEvent).order_by(TrustEvent.id).all()]
        assert event_types == [
            "community_confirmation.requested",
            "community_confirmation.delivery_pool_prepared",
            "community_confirmation.response_recorded",
            "community_confirmation.outcome_recorded",
            "community_confirmation.merchant_decision_recorded",
            "community_confirmation.decision_status_updated",
        ]
        events = {row.event_type: json.loads(row.meta_json or "{}") for row in db.query(TrustEvent).all()}
        requested_meta = events["community_confirmation.requested"]
        assert requested_meta["eligible_contact_count"] == 1
        assert requested_meta["delivery_contact_count"] == 1
        assert requested_meta["responder_notifications_created"] == 1
        assert requested_meta["active_member_count"] == 2
        assert requested_meta["private_contacts_exposed"] is False

        delivery_meta = events["community_confirmation.delivery_pool_prepared"]
        assert delivery_meta["delivery_channel"] == "in_app_confirmation_inbox"
        assert delivery_meta["eligible_contact_count"] == 1
        assert delivery_meta["delivery_contact_count"] == 1
        assert delivery_meta["responder_notifications_created"] == 1
        assert delivery_meta["private_contacts_exposed"] is False

        response_meta = events["community_confirmation.response_recorded"]
        assert response_meta["response_type"] == "active_here"
        assert response_meta["response_category"] == "positive"
        assert response_meta["response_reason"] == "known_in_community"
        assert response_meta["response_note"] == "Known here for this level of check."
        assert response_meta["response_note_present"] is True
        assert response_meta["responder_notification_marked_read"] is True
        assert response_meta["outwardly_anonymous"] is True
        assert response_meta["internally_attributable"] is True
        assert response_meta["counted_in_outcome"] is True
        responder_notice_after = (
            db.query(Notification)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .one()
        )
        assert responder_notice_after.is_read is True
        assert responder_notice_after.read_at is not None

        outcome_meta = events["community_confirmation.outcome_recorded"]
        assert outcome_meta["confidence_level"] == "limited"
        assert outcome_meta["responses_received"] == 1
        assert outcome_meta["positive_count"] == 1
        assert outcome_meta["eligible_contact_count"] == 1
        assert outcome_meta["active_member_count"] == 2
        assert outcome_meta["private_contacts_exposed"] is False

        decision_meta = events["community_confirmation.merchant_decision_recorded"]
        assert decision_meta["decision_id"] == decision_row.id
        assert decision_meta["decision"] == "partial_release"
        assert decision_meta["decision_status"] == "recorded"
        assert decision_meta["amount_band"] == "low"
        assert decision_meta["confidence_level"] == "limited"
        assert decision_meta["responses_received"] == 1
        assert decision_meta["private_contacts_exposed"] is False

        status_meta = events["community_confirmation.decision_status_updated"]
        assert status_meta["decision_id"] == decision_row.id
        assert status_meta["previous_status"] == "recorded"
        assert status_meta["status"] == "settled"
        assert status_meta["settled"] is True
        assert status_meta["private_contacts_exposed"] is False


def test_trustslip_verify_includes_privacy_safe_community_confirmation(
):
    _seed_relay_fixture()

    with SessionLocal() as db:
        summary = build_community_confirmation_summary(
            db,
            community_id=1,
            subject_user_id=1,
        )
        contacts = [
            {
                "community_id": row.community_id,
                "user_id": row.user_id,
                "active": row.active,
                "relay": row.can_receive_relay_requests,
                "instant": row.can_receive_instant_pulse,
                "opted_out_at": row.opted_out_at,
            }
            for row in db.query(CommunityConfirmationContact).all()
        ]

    assert summary["relay_available"] is True, {"summary": summary, "contacts": contacts}
    assert summary["approval_type"] == "Response-based community confirmation"
    assert summary["contactable_reference_count"] == 1
    assert summary["active_member_count"] == 2
    assert "calculated from responses" in summary["plain_language"]
    assert "private contact details stay protected" in summary["plain_language"]


def test_expired_community_confirmation_records_trust_event(client: TestClient):
    _seed_relay_fixture()

    created = client.post(
        "/community-confirmations/request",
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert created.status_code == 200, created.text
    token = created.json()["public_token"]

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        request.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
        request.status = "pending"
        db.commit()

    public = client.get(f"/community-confirmations/public/{token}")
    assert public.status_code == 200, public.text
    assert public.json()["status"] == "expired"

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        assert request.status == "expired"
        event_types = [row.event_type for row in db.query(TrustEvent).order_by(TrustEvent.id).all()]
        assert event_types == [
            "community_confirmation.requested",
            "community_confirmation.delivery_pool_prepared",
            "community_confirmation.request_expired",
        ]
        expired_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.request_expired")
            .one()
            .meta_json
            or "{}"
        )
        assert expired_meta["request_id"] == request.id
        assert expired_meta["previous_status"] == "pending"
        assert expired_meta["status"] == "expired"
        assert expired_meta["private_contacts_exposed"] is False


def test_confirmation_request_status_update_records_trust_event(client: TestClient):
    _seed_relay_fixture()

    created = client.post(
        "/community-confirmations/request",
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert created.status_code == 200, created.text
    token = created.json()["public_token"]

    with SessionLocal() as db:
        request_id = db.query(CommunityConfirmationRequest.id).scalar()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        updated = client.patch(
            f"/community-confirmations/{request_id}/status",
            json={
                "status": "under_review",
                "status_reason": "manual_review_needed",
                "status_note": "Admin paused this confirmation for review.",
            },
        )
        assert updated.status_code == 200, updated.text
        updated_data = updated.json()
        assert updated_data["request_updated"] is True
        assert updated_data["status"] == "under_review"
        assert updated_data["private_contacts_exposed"] is False
        assert updated_data["request"]["status"] == "under_review"
        assert updated_data["review_case"]["status"] == "open"
        assert updated_data["request"]["review_case"]["status"] == "open"

        review_case_id = updated_data["review_case"]["review_case_id"]
        old_review_time = datetime.now(timezone.utc) - timedelta(hours=5)
        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    INSERT OR IGNORE INTO community_confirmation_policies (community_id)
                    VALUES (1)
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE community_confirmation_policies
                    SET review_attention_after_hours = 2,
                        review_overdue_after_hours = 4
                    WHERE community_id = 1
                    """
                )
            )
            conn.execute(
                text(
                    """
                    UPDATE community_confirmation_review_cases
                    SET created_at = :old_time,
                        updated_at = :old_time
                    WHERE id = :review_case_id
                    """
                ),
                {"old_time": old_review_time.isoformat(), "review_case_id": review_case_id},
            )
            fresh_created = datetime.now(timezone.utc)
            fresh_expires = fresh_created + timedelta(minutes=10)
            conn.execute(
                text(
                    """
                    INSERT INTO community_confirmation_requests (
                        public_token,
                        requester_user_id,
                        subject_user_id,
                        community_id,
                        reason_type,
                        risk_level,
                        mode,
                        status,
                        created_at,
                        expires_at
                    )
                    VALUES (
                        'fresh-review-token',
                        1,
                        1,
                        1,
                        'merchant_trust_check',
                        'low',
                        'instant_pulse',
                        'under_review',
                        :fresh_created,
                        :fresh_expires
                    )
                    """
                ),
                {
                    "fresh_created": fresh_created.isoformat(),
                    "fresh_expires": fresh_expires.isoformat(),
                },
            )
            fresh_request_id = conn.execute(
                text(
                    """
                    SELECT id
                    FROM community_confirmation_requests
                    WHERE public_token = 'fresh-review-token'
                    """
                )
            ).scalar_one()
            conn.execute(
                text(
                    """
                    INSERT INTO community_confirmation_review_cases (
                        request_id,
                        community_id,
                        subject_user_id,
                        opened_by_user_id,
                        status,
                        review_reason,
                        trust_impact,
                        created_at,
                        updated_at
                    )
                    VALUES (
                        :request_id,
                        1,
                        1,
                        1,
                        'open',
                        'manual_review_needed',
                        'none',
                        :fresh_created,
                        :fresh_created
                    )
                    """
                ),
                {
                    "request_id": fresh_request_id,
                    "fresh_created": fresh_created.isoformat(),
                },
            )

        scan = client.post("/community-confirmations/review-cases/scan-sla-events?community_id=1")
        assert scan.status_code == 200, scan.text
        scan_data = scan.json()
        assert scan_data["scan_completed"] is True
        assert scan_data["scanned"] == 2
        assert scan_data["overdue_cases"] == 1
        assert scan_data["needs_attention_cases"] == 0
        assert scan_data["events_recorded"] == 1
        assert scan_data["notifications_created"] == 1
        assert scan_data["recorded_by_status"]["overdue"] == 1
        assert scan_data["sample_recorded_items"][0]["review_case_id"] == review_case_id
        assert scan_data["private_contacts_exposed"] is False
        assert "does not change trust scores" in scan_data["policy_note"]

        inbox = client.get(
            "/community-confirmations/review-cases/inbox?status=open&sort=urgency&limit=1"
        )
        assert inbox.status_code == 200, inbox.text
        inbox_data = inbox.json()
        assert inbox_data["total"] == 1
        assert inbox_data["returned_count"] == 1
        assert inbox_data["total_available"] == 2
        assert inbox_data["sort"] == "urgency"
        assert inbox_data["offset"] == 0
        assert inbox_data["limit"] == 1
        assert inbox_data["has_more"] is True
        assert inbox_data["next_offset"] == 1
        assert inbox_data["previous_offset"] is None
        assert inbox_data["items"][0]["review_case_id"] == review_case_id
        assert inbox_data["items"][0]["review_sla_status"] == "overdue"
        assert inbox_data["items"][0]["review_sla_label"] == "Overdue"
        assert inbox_data["items"][0]["review_age_hours"] >= 4
        assert inbox_data["items"][0]["review_attention_after_hours"] == 2
        assert inbox_data["items"][0]["review_overdue_after_hours"] == 4
        assert "more than 4 hours" in inbox_data["items"][0]["review_sla_meaning"]
        assert inbox_data["items"][0]["public_token"] == token
        assert inbox_data["items"][0]["request_status"] == "under_review"
        assert inbox_data["items"][0]["reason_type"] == "merchant_trust_check"
        assert inbox_data["items"][0]["risk_level"] == "low"
        assert inbox_data["items"][0]["private_contacts_exposed"] is False
        assert "phone_e164" not in json.dumps(inbox_data)
        with SessionLocal() as db:
            sla_events = (
                db.query(TrustEvent)
                .filter(TrustEvent.event_type == "community_confirmation.review_case_overdue")
                .all()
            )
            assert len(sla_events) == 1
            sla_meta = json.loads(sla_events[0].meta_json or "{}")
            assert sla_meta["review_case_id"] == review_case_id
            assert sla_meta["status"] == "overdue"
            assert sla_meta["age_hours"] >= 4
            assert sla_meta["attention_after_hours"] == 2
            assert sla_meta["overdue_after_hours"] == 4
            assert sla_meta["affects_trust_reading"] is False
            assert "audit evidence only" in sla_meta["policy_note"]
            assert sla_meta["private_contacts_exposed"] is False
            sla_notifications = (
                db.query(Notification)
                .filter(Notification.kind == "community_confirmation.review_case_overdue")
                .all()
            )
            assert len(sla_notifications) == 1
            notification = sla_notifications[0]
            assert notification.user_id == 1
            assert notification.is_read is False
            assert "/app/community-confirmations" in (notification.action_url or "")
            assert f"case_id={review_case_id}" in (notification.action_url or "")
            assert "more than 4 hours" in notification.message
            assert notification.action_label == "Review case"

        second_page = client.get(
            "/community-confirmations/review-cases/inbox?status=open&sort=urgency&limit=1&offset=1"
        )
        assert second_page.status_code == 200, second_page.text
        second_page_data = second_page.json()
        assert second_page_data["total"] == 1
        assert second_page_data["returned_count"] == 1
        assert second_page_data["total_available"] == 2
        assert second_page_data["offset"] == 1
        assert second_page_data["has_more"] is False
        assert second_page_data["next_offset"] is None
        assert second_page_data["previous_offset"] == 0
        assert second_page_data["items"][0]["public_token"] == "fresh-review-token"

        with engine.begin() as conn:
            conn.execute(
                text(
                    """
                    DELETE FROM community_confirmation_review_cases
                    WHERE request_id = :fresh_request_id
                    """
                ),
                {"fresh_request_id": fresh_request_id},
            )
            conn.execute(
                text(
                    """
                    DELETE FROM community_confirmation_requests
                    WHERE id = :fresh_request_id
                    """
                ),
                {"fresh_request_id": fresh_request_id},
            )

        unassigned_before = client.get(
            "/community-confirmations/review-cases/inbox?status=open&scope=unassigned"
        )
        assert unassigned_before.status_code == 200, unassigned_before.text
        assert unassigned_before.json()["total"] == 1

        assigned = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}/assignment",
            json={
                "assigned_to_user_id": 2,
                "assignment_note": "Assigning this review to an eligible community member.",
            },
        )
        assert assigned.status_code == 200, assigned.text
        assigned_data = assigned.json()
        assert assigned_data["review_case_assigned"] is True
        assert assigned_data["review_case"]["assigned_to_user_id"] == 2
        assert assigned_data["review_case"]["status"] == "in_review"

        unassigned_after = client.get(
            "/community-confirmations/review-cases/inbox?status=all&scope=unassigned"
        )
        assert unassigned_after.status_code == 200, unassigned_after.text
        assert unassigned_after.json()["total"] == 0

        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=2,
            email="user2@example.com",
            role="user",
        )
        assigned_to_me = client.get(
            "/community-confirmations/review-cases/inbox?status=all&scope=assigned_to_me"
        )
        assert assigned_to_me.status_code == 200, assigned_to_me.text
        assigned_to_me_data = assigned_to_me.json()
        assert assigned_to_me_data["total"] == 1
        assert assigned_to_me_data["scope"] == "assigned_to_me"
        assert assigned_to_me_data["items"][0]["review_case_id"] == review_case_id
        assert assigned_to_me_data["items"][0]["assigned_to_user_id"] == 2
        app.dependency_overrides[get_current_user] = lambda: Obj(
            id=1,
            email="pytest@example.com",
            role="admin",
        )

        evidence = client.post(
            f"/community-confirmations/review-cases/{review_case_id}/evidence",
            json={
                "evidence_type": "merchant_note",
                "title": "Merchant follow-up note",
                "body": "Merchant reported that the confirmation evidence was still thin.",
                "external_ref": "internal-review-note-1",
            },
        )
        assert evidence.status_code == 200, evidence.text
        evidence_data = evidence.json()
        assert evidence_data["evidence_added"] is True
        assert evidence_data["evidence"]["evidence_type"] == "merchant_note"
        assert evidence_data["evidence"]["private_contacts_exposed"] is False

        evidence_list = client.get(
            f"/community-confirmations/review-cases/{review_case_id}/evidence"
        )
        assert evidence_list.status_code == 200, evidence_list.text
        evidence_list_data = evidence_list.json()
        assert evidence_list_data["total"] == 1
        assert evidence_list_data["items"][0]["title"] == "Merchant follow-up note"
        assert evidence_list_data["private_contacts_exposed"] is False

        resolved = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "insufficient_evidence",
                "trust_impact": "caution",
                "resolution_note": "Resolved as caution because evidence was still thin.",
            },
        )
        assert resolved.status_code == 200, resolved.text
        resolved_data = resolved.json()
        assert resolved_data["review_case_updated"] is True
        assert resolved_data["review_case"]["status"] == "resolved"
        assert resolved_data["review_case"]["resolution"] == "insufficient_evidence"
        assert resolved_data["review_case"]["trust_impact"] == "caution"
        assert resolved_data["review_case"]["trust_reading_effect"]["label"] == "Adds caution"
        assert resolved_data["review_case"]["trust_reading_effect"]["trust_delta"] == "-0.03"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        assert request.status == "closed"
        review_case = db.query(CommunityConfirmationReviewCase).one()
        assert review_case.request_id == request.id
        assert review_case.status == "resolved"
        assert review_case.assigned_to_user_id == 2
        assert review_case.resolution == "insufficient_evidence"
        assert review_case.trust_impact == "caution"
        evidence_row = db.query(CommunityConfirmationReviewEvidence).one()
        assert evidence_row.review_case_id == review_case.id
        assert evidence_row.evidence_type == "merchant_note"
        assert evidence_row.visibility == "internal"
        event_types = [row.event_type for row in db.query(TrustEvent).order_by(TrustEvent.id).all()]
        assert event_types == [
            "community_confirmation.requested",
            "community_confirmation.delivery_pool_prepared",
            "community_confirmation.request_status_updated",
            "community_confirmation.review_case_opened",
            "community_confirmation.review_case_overdue",
            "community_confirmation.review_case_assigned",
            "community_confirmation.review_evidence_added",
            "community_confirmation.review_case_resolved",
        ]
        status_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.request_status_updated")
            .one()
            .meta_json
            or "{}"
        )
        assert status_meta["request_id"] == request.id
        assert status_meta["previous_status"] == "pending"
        assert status_meta["status"] == "under_review"
        assert status_meta["status_reason"] == "manual_review_needed"
        assert status_meta["status_note"] == "Admin paused this confirmation for review."
        assert status_meta["status_note_present"] is True
        assert status_meta["private_contacts_exposed"] is False

        opened_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.review_case_opened")
            .one()
            .meta_json
            or "{}"
        )
        assert opened_meta["review_case_id"] == review_case.id
        assert opened_meta["request_id"] == request.id
        assert opened_meta["review_reason"] == "manual_review_needed"
        assert opened_meta["review_note_present"] is True
        assert opened_meta["private_contacts_exposed"] is False

        assigned_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.review_case_assigned")
            .one()
            .meta_json
            or "{}"
        )
        assert assigned_meta["review_case_id"] == review_case.id
        assert assigned_meta["previous_assigned_to_user_id"] is None
        assert assigned_meta["assigned_to_user_id"] == 2
        assert assigned_meta["previous_status"] == "open"
        assert assigned_meta["status"] == "in_review"
        assert assigned_meta["assignment_note_present"] is True
        assert assigned_meta["private_contacts_exposed"] is False

        evidence_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.review_evidence_added")
            .one()
            .meta_json
            or "{}"
        )
        assert evidence_meta["review_case_id"] == review_case.id
        assert evidence_meta["evidence_id"] == evidence_row.id
        assert evidence_meta["evidence_type"] == "merchant_note"
        assert evidence_meta["body_present"] is True
        assert evidence_meta["external_ref_present"] is True
        assert evidence_meta["visibility"] == "internal"
        assert evidence_meta["private_contacts_exposed"] is False

        resolved_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.review_case_resolved")
            .one()
            .meta_json
            or "{}"
        )
        assert resolved_meta["review_case_id"] == review_case.id
        assert resolved_meta["previous_status"] == "in_review"
        assert resolved_meta["status"] == "resolved"
        assert resolved_meta["resolution"] == "insufficient_evidence"
        assert resolved_meta["trust_impact"] == "caution"
        assert resolved_meta["trust_delta"] == "-0.03"
        assert resolved_meta["affects_trust_reading"] is True
        assert resolved_meta["trust_reading_effect"]["label"] == "Adds caution"
        assert resolved_meta["trust_reading_effect"]["trust_delta"] == "-0.03"
        assert resolved_meta["request_status"] == "closed"
        assert "Only resolved review outcomes" in resolved_meta["policy_note"]
        assert resolved_meta["private_contacts_exposed"] is False

        trust_breakdown = compute_trust_breakdown(db, user_id=int(review_case.subject_user_id))
        assert trust_breakdown["penalties"]["community_confirmation_review"] == "0.03"
        assert trust_breakdown["counts"]["community_confirmation_reviews_resolved"] == 1
        assert trust_breakdown["counts"]["community_confirmation_review_caution"] == 1
        assert trust_breakdown["latest_source"] == "community_confirmation.review_case_resolved"


def test_responder_can_opt_out_of_confirmation_relay(client: TestClient):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="user2@example.com",
        role="user",
    )
    try:
        settings = client.get("/community-confirmations/my-contact-settings")
        assert settings.status_code == 200, settings.text
        settings_data = settings.json()
        assert settings_data["total"] == 1
        assert settings_data["items"][0]["community_id"] == 1
        assert settings_data["items"][0]["can_receive_relay_requests"] is True
        assert settings_data["items"][0]["can_receive_instant_pulse"] is True
        assert "phone_e164" not in json.dumps(settings_data)

        updated = client.patch(
            "/community-confirmations/my-contact-settings/1",
            json={"opted_out": True},
        )
        assert updated.status_code == 200, updated.text
        updated_data = updated.json()
        assert updated_data["can_receive_relay_requests"] is False
        assert updated_data["can_receive_instant_pulse"] is False
        assert updated_data["opted_out_at"]
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        summary = build_community_confirmation_summary(
            db,
            community_id=1,
            subject_user_id=1,
        )
        events = db.query(TrustEvent).order_by(TrustEvent.id).all()
    assert summary["relay_available"] is False
    assert summary["contactable_reference_count"] == 0
    assert [row.event_type for row in events] == [
        "community_confirmation.contact_preference_updated"
    ]
    preference_meta = json.loads(events[0].meta_json or "{}")
    assert preference_meta["contact_user_id"] == 2
    assert preference_meta["changed_fields"] == [
        "can_receive_relay_requests",
        "can_receive_instant_pulse",
        "opted_out",
    ]
    assert preference_meta["after"]["opted_out"] is True
    assert preference_meta["member_controlled"] is True
    assert preference_meta["private_contacts_exposed"] is False

    created = client.post(
        "/community-confirmations/request",
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert created.status_code == 400
    assert "No eligible community confirmation contacts" in created.text


def test_community_admin_can_manage_confirmation_policy_and_contacts(client: TestClient):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        policy = client.get("/community-confirmations/community/1/policy")
        assert policy.status_code == 200, policy.text
        policy_data = policy.json()
        assert policy_data["policy"]["relay_enabled"] is True
        assert policy_data["policy"]["review_attention_after_hours"] == 24
        assert policy_data["policy"]["review_overdue_after_hours"] == 72
        assert policy_data["policy"]["contactable_reference_count"] == 2
        assert policy_data["community"]["community_code"] == "GSN-C-000001"
        assert "phone_e164" not in json.dumps(policy_data)
        assert "user2@example.com" not in json.dumps(policy_data)

        updated_policy = client.patch(
            "/community-confirmations/community/1/policy",
            json={
                "minimum_positive_responses": 3,
                "instant_pulse_enabled": False,
                "review_attention_after_hours": 48,
                "review_overdue_after_hours": 120,
            },
        )
        assert updated_policy.status_code == 200, updated_policy.text
        assert updated_policy.json()["policy"]["minimum_positive_responses"] == 3
        assert updated_policy.json()["policy"]["instant_pulse_enabled"] is False
        assert updated_policy.json()["policy"]["review_attention_after_hours"] == 48
        assert updated_policy.json()["policy"]["review_overdue_after_hours"] == 120

        paused = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"active": False, "can_receive_relay_requests": False},
        )
        assert paused.status_code == 200, paused.text
        contact = [
            row for row in paused.json()["contacts"] if int(row["user_id"]) == 2
        ][0]
        assert contact["receiving_requests"] is False
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        summary = build_community_confirmation_summary(
            db,
            community_id=1,
            subject_user_id=1,
        )
        events = db.query(TrustEvent).order_by(TrustEvent.id).all()
    assert summary["relay_available"] is False
    assert summary["contactable_reference_count"] == 0
    assert [row.event_type for row in events] == [
        "community_confirmation.policy_updated",
        "community_confirmation.contact_eligibility_updated",
    ]
    policy_meta = json.loads(events[0].meta_json or "{}")
    assert policy_meta["changed_fields"] == [
        "instant_pulse_enabled",
        "minimum_positive_responses",
        "review_attention_after_hours",
        "review_overdue_after_hours",
    ]
    assert policy_meta["after"]["minimum_positive_responses"] == 3
    assert policy_meta["after"]["instant_pulse_enabled"] is False
    assert policy_meta["after"]["review_attention_after_hours"] == 48
    assert policy_meta["after"]["review_overdue_after_hours"] == 120
    assert policy_meta["admin_controlled"] is True
    assert policy_meta["private_contacts_exposed"] is False
    contact_meta = json.loads(events[1].meta_json or "{}")
    assert contact_meta["contact_user_id"] == 2
    assert contact_meta["changed_fields"] == [
        "active",
        "can_receive_relay_requests",
        "can_receive_instant_pulse",
    ]
    assert contact_meta["after"]["active"] is False
    assert contact_meta["after"]["can_receive_relay_requests"] is False
    assert contact_meta["after"]["can_receive_instant_pulse"] is False
    assert contact_meta["admin_controlled"] is True
    assert contact_meta["private_contacts_exposed"] is False


def test_non_admin_cannot_manage_confirmation_policy(client: TestClient):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="user2@example.com",
        role="user",
    )
    try:
        policy = client.get("/community-confirmations/community/1/policy")
        assert policy.status_code == 403

        changed = client.patch(
            "/community-confirmations/community/1/contacts/1",
            json={"active": False},
        )
        assert changed.status_code == 403
    finally:
        app.dependency_overrides.pop(get_current_user, None)
