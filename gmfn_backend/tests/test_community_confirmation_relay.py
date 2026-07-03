from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from fastapi.testclient import TestClient
from sqlalchemy.exc import OperationalError
from sqlalchemy import text

from app.core.auth import PENDING_APPROVAL_SENTINEL, get_current_user
from app.core.security import create_access_token
from app.db.database import SessionLocal, engine
from app.db.models import (
    Clan,
    CommunityConfirmationContact,
    CommunityConfirmationDecision,
    CommunityConfirmationRequest,
    CommunityConfirmationReviewCase,
    CommunityConfirmationReviewEvidence,
    TrustEvent,
    TrustSlip,
    User,
)
from app.db.notification_models import Notification
from app.main import app
import app.api.routes.community_confirmations as community_confirmation_routes
import app.services.community_confirmation_service as community_confirmation_service
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
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (3, 'merchant@example.com', 'hashed', 'merchant')
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
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "sms",
            "requester_callback_contact": "+447712345678",
            "requester_callback_consent": True,
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

        bad_blank_response = client.post(
            f"/community-confirmations/{request_id}/respond",
            json={
                "response_type": "   ",
                "response_reason": "known_in_community",
            },
        )
        assert bad_blank_response.status_code == 422, bad_blank_response.text
        assert "response_type must not be blank" in bad_blank_response.text

        bad_unknown_response = client.post(
            f"/community-confirmations/{request_id}/respond",
            json={
                "response_type": "friend_of_friend",
                "response_reason": "known_in_community",
            },
        )
        assert bad_unknown_response.status_code == 422, bad_unknown_response.text
        assert "Unsupported community confirmation response_type" in bad_unknown_response.text

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
    assert public_data["subject_public_reference"] == "GSN-U-TEST001"
    assert public_data["subject_reference_type"] == "gsn_id"
    assert public_data["requester_callback"]["requested"] is True
    assert public_data["requester_callback"]["channel"] == "sms"
    assert public_data["requester_callback"]["contact_masked"] == "ending 5678"
    assert public_data["requester_callback"]["delivery_status"] == "not_configured"
    assert public_data["requester_callback"]["result_link_is_source_of_truth"] is True
    public_text = json.dumps(public_data)
    assert "subject_user_id" not in public_text
    assert "responder_user_id" not in public_text
    assert "user2@example.com" not in public_text
    assert "+447712345678" not in public_text
    assert "7712345678" not in public_text

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="merchant@example.com",
        role="merchant",
    )
    try:
        bad_blank_decision = client.post(
            f"/community-confirmations/{request_id}/decision",
            json={
                "decision": "   ",
                "issue_reported": False,
                "settled": True,
            },
        )
        assert bad_blank_decision.status_code == 422, bad_blank_decision.text
        assert "decision must not be blank" in bad_blank_decision.text

        bad_extra_decision = client.post(
            f"/community-confirmations/{request_id}/decision",
            json={
                "decision": "partial_release",
                "setled": True,
            },
        )
        assert bad_extra_decision.status_code == 422, bad_extra_decision.text
        assert "Extra inputs are not permitted" in bad_extra_decision.text

        bad_unknown_decision = client.post(
            f"/community-confirmations/{request_id}/decision",
            json={
                "decision": "automatic_release",
                "issue_reported": False,
                "settled": True,
            },
        )
        assert bad_unknown_decision.status_code == 422, bad_unknown_decision.text
        assert "Unsupported community confirmation decision" in bad_unknown_decision.text

        bad_decision_flag = client.post(
            f"/community-confirmations/{request_id}/decision",
            json={
                "decision": "partial_release",
                "issue_reported": 1,
                "settled": True,
            },
        )
        assert bad_decision_flag.status_code == 422, bad_decision_flag.text
        assert "issue_reported must be boolean" in bad_decision_flag.text

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

        bad_status_flag = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "settled",
                "issue_reported": False,
                "settled": "true",
            },
        )
        assert bad_status_flag.status_code == 422, bad_status_flag.text
        assert "settled must be boolean" in bad_status_flag.text

        bad_blank_status = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "   ",
                "issue_reported": False,
                "settled": True,
            },
        )
        assert bad_blank_status.status_code == 422, bad_blank_status.text
        assert "status must not be blank" in bad_blank_status.text

        bad_unknown_status = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "auto_closed",
                "issue_reported": False,
                "settled": True,
            },
        )
        assert bad_unknown_status.status_code == 422, bad_unknown_status.text
        assert "Unsupported community confirmation decision status" in bad_unknown_status.text

        bad_settled_conflict = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "settled",
                "issue_reported": False,
                "settled": False,
            },
        )
        assert bad_settled_conflict.status_code == 422, bad_settled_conflict.text
        assert "status=settled requires settled=true" in bad_settled_conflict.text

        bad_issue_conflict = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "issue_reported",
                "issue_reported": False,
                "settled": False,
            },
        )
        assert bad_issue_conflict.status_code == 422, bad_issue_conflict.text
        assert (
            "status=issue_reported requires issue_reported=true"
            in bad_issue_conflict.text
        )

        bad_cancelled_conflict = client.patch(
            f"/community-confirmations/decisions/{decision_data['decision_id']}",
            json={
                "status": "cancelled",
                "issue_reported": False,
                "settled": True,
            },
        )
        assert bad_cancelled_conflict.status_code == 422, bad_cancelled_conflict.text
        assert (
            "status=cancelled cannot be combined with settled=true"
            in bad_cancelled_conflict.text
        )

        with SessionLocal() as db:
            unchanged_decision = db.get(
                CommunityConfirmationDecision,
                decision_data["decision_id"],
            )
            assert unchanged_decision.status == "recorded"
            assert unchanged_decision.settled is True
            assert (
                db.query(TrustEvent)
                .filter(
                    TrustEvent.event_type
                    == "community_confirmation.decision_status_updated"
                )
                .count()
                == 0
            )

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
        assert request.requester_user_id == 3
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
            "community_confirmation.requester_notified",
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
        requester_notice = (
            db.query(Notification)
            .filter(Notification.user_id == 3)
            .filter(Notification.kind == "community_confirmation.outcome_updated")
            .one()
        )
        assert requester_notice.is_read is False
        assert requester_notice.action_url == f"/community-confirmations/public/{token}"
        assert requester_notice.action_label == "Open result"
        assert "1 of 1 requested community responders have answered" in requester_notice.message
        assert "phone_e164" not in requester_notice.message
        requester_notify_meta = events["community_confirmation.requester_notified"]
        assert requester_notify_meta["request_id"] == request.id
        assert requester_notify_meta["notification_kind"] == "community_confirmation.outcome_updated"
        assert requester_notify_meta["action_url"] == f"/community-confirmations/public/{token}"
        assert requester_notify_meta["private_contacts_exposed"] is False

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


def test_activation_pending_responder_cannot_use_stale_confirmation_contact(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        },
    )
    assert created.status_code == 200, created.text
    request_id = int(created.json()["request_id"])

    with SessionLocal() as db:
        pending_user = db.query(User).filter_by(id=2).first()
        pending_user.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="user2@example.com",
        role="user",
    )
    try:
        inbox = client.get("/community-confirmations/inbox")
        assert inbox.status_code == 200, inbox.text
        assert inbox.json()["total"] == 0

        answered = client.post(
            f"/community-confirmations/{request_id}/respond",
            json={
                "response_type": "active_here",
                "response_reason": "known_in_community",
            },
        )
        assert answered.status_code == 403, answered.text
        assert "not eligible" in answered.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)


def test_community_confirmation_request_rejects_boolean_body_ids(
    client: TestClient,
):
    _seed_relay_fixture()

    for field_name in ("subject_user_id", "community_id"):
        payload = {
            "requester_external_label": "Boolean id check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        }
        payload[field_name] = True
        rejected = client.post("/community-confirmations/request", json=payload)
        assert rejected.status_code == 422, (field_name, rejected.text)
        assert "must not be boolean" in rejected.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0


def test_community_confirmation_request_rejects_float_body_ids(
    client: TestClient,
):
    _seed_relay_fixture()

    for field_name in ("subject_user_id", "community_id"):
        payload = {
            "requester_external_label": "Float id check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        }
        payload[field_name] = 1.0
        rejected = client.post("/community-confirmations/request", json=payload)
        assert rejected.status_code == 422, (field_name, rejected.text)
        assert "must not be float" in rejected.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0


def test_community_confirmation_request_requires_explicit_target_shape(
    client: TestClient,
):
    _seed_relay_fixture()

    base_payload = {
        "requester_external_label": "Target shape check",
        "reason_type": "merchant_trust_check",
        "risk_level": "low",
        "mode": "relay",
    }

    rejected_blank_slip = client.post(
        "/community-confirmations/request",
        json={**base_payload, "trust_slip_code": "   "},
    )
    assert rejected_blank_slip.status_code == 422, rejected_blank_slip.text
    assert "trust_slip_code must not be blank" in rejected_blank_slip.text

    rejected_mixed_target = client.post(
        "/community-confirmations/request",
        json={
            **base_payload,
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "subject_user_id": 1,
            "community_id": 1,
        },
    )
    assert rejected_mixed_target.status_code == 422, rejected_mixed_target.text
    assert (
        "Use trust_slip_code or subject_user_id/community_id, not both"
        in rejected_mixed_target.text
    )

    for field_name, payload in (
        ("subject_user_id", {**base_payload, "subject_user_id": 1}),
        ("community_id", {**base_payload, "community_id": 1}),
    ):
        rejected_half_pair = client.post("/community-confirmations/request", json=payload)
        assert rejected_half_pair.status_code == 422, (
            field_name,
            rejected_half_pair.text,
        )
        assert (
            "subject_user_id and community_id must be supplied together"
            in rejected_half_pair.text
        )

    rejected_missing_target = client.post(
        "/community-confirmations/request",
        json=base_payload,
    )
    assert rejected_missing_target.status_code == 422, rejected_missing_target.text
    assert (
        "Provide trust_slip_code or both subject_user_id and community_id"
        in rejected_missing_target.text
    )

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0

    direct_request = client.post(
        "/community-confirmations/request",
        json={**base_payload, "subject_user_id": 1, "community_id": 1},
    )
    assert direct_request.status_code == 200, direct_request.text
    direct_data = direct_request.json()
    assert direct_data["request_id"] > 0
    assert direct_data["community_response"]["private_contacts_exposed"] is False

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        assert request.subject_user_id == 1
        assert request.community_id == 1
        assert request.trust_slip_id is None
        event_types = [row.event_type for row in db.query(TrustEvent).all()]
        assert "community_confirmation.requested" in event_types


def test_community_confirmation_request_rejects_non_bool_callback_consent(
    client: TestClient,
):
    _seed_relay_fixture()

    for bad_value in ("true", 1):
        rejected = client.post(
            "/community-confirmations/request",
            json={
                "requester_external_label": "Non-bool consent check",
                "requester_callback_consent": bad_value,
                "reason_type": "merchant_trust_check",
                "risk_level": "low",
                "mode": "relay",
            },
        )
        assert rejected.status_code == 422, rejected.text
        assert "requester_callback_consent must be boolean" in rejected.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0


def test_community_confirmation_request_rejects_blank_request_controls(
    client: TestClient,
):
    _seed_relay_fixture()

    for field_name in ("reason_type", "risk_level", "mode"):
        payload = {
            "requester_external_label": "Blank control check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        }
        payload[field_name] = "   "
        rejected = client.post("/community-confirmations/request", json=payload)
        assert rejected.status_code == 422, (field_name, rejected.text)
        assert f"{field_name} must not be blank" in rejected.text

    rejected_mode = client.post(
        "/community-confirmations/request",
        json={
            "requester_external_label": "Unknown mode check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant-puls",
        },
    )
    assert rejected_mode.status_code == 422, rejected_mode.text
    assert "Unsupported community confirmation request mode" in rejected_mode.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0


def test_community_confirmation_request_rejects_unknown_body_fields(
    client: TestClient,
):
    _seed_relay_fixture()

    rejected = client.post(
        "/community-confirmations/request",
        json={
            "requester_external_label": "Unknown field check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
            "subject_user_idd": 1,
        },
    )
    assert rejected.status_code == 422, rejected.text
    assert "Extra inputs are not permitted" in rejected.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0


def test_pending_contact_does_not_consume_limited_delivery_slot(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (4, 'active-contact@example.com', 'hashed', 'user')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role)
                VALUES (5, 'pending-contact@example.com', :pending, 'user')
                """
            ),
            {"pending": PENDING_APPROVAL_SENTINEL},
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 4, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clan_memberships (clan_id, user_id, role, personal_pool_balance)
                VALUES (1, 5, 'user', 0)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR REPLACE INTO community_confirmation_policies (
                    id,
                    community_id,
                    relay_enabled,
                    instant_pulse_enabled,
                    minimum_positive_responses,
                    maximum_relay_contacts,
                    response_window_seconds,
                    review_attention_after_hours,
                    review_overdue_after_hours,
                    allow_admin_contacts,
                    allow_sponsor_contacts,
                    allow_voting_member_contacts,
                    allow_subject_nominated_contacts,
                    public_confirmation_enabled
                )
                VALUES (1, 1, 1, 1, 2, 1, 86400, 24, 72, 1, 1, 1, 0, 1)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR REPLACE INTO community_confirmation_contacts (
                    id,
                    community_id,
                    user_id,
                    role_type,
                    active,
                    can_receive_relay_requests,
                    can_receive_instant_pulse,
                    priority_order,
                    standing_status,
                    opted_out_at
                )
                VALUES (10, 1, 5, 'member', 1, 1, 1, 0, 'active', NULL)
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT OR REPLACE INTO community_confirmation_contacts (
                    id,
                    community_id,
                    user_id,
                    role_type,
                    active,
                    can_receive_relay_requests,
                    can_receive_instant_pulse,
                    priority_order,
                    standing_status,
                    opted_out_at
                )
                VALUES (11, 1, 4, 'member', 1, 1, 1, 1, 'active', NULL)
                """
            )
        )

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        },
    )
    assert created.status_code == 200, created.text
    created_data = created.json()
    assert created_data["community_response"]["requests_sent"] >= 2

    with SessionLocal() as db:
        responder_notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .all()
        )
        notified_user_ids = {int(row.user_id) for row in responder_notifications}
        assert 4 in notified_user_ids
        assert 5 not in notified_user_ids


def test_live_confirmation_request_requires_active_community(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    with SessionLocal() as db:
        community = db.get(Clan, 1)
        community.status = "closed"
        summary = build_community_confirmation_summary(
            db,
            community_id=1,
            subject_user_id=1,
        )
        db.commit()

    assert summary["community_status"] == "closed"
    assert summary["relay_available"] is False
    assert summary["request_action"] is None
    assert "not active" in summary["plain_language"]

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        },
    )
    assert created.status_code == 400, created.text
    assert "not active" in created.text

    public_request = client.post(
        "/verify/community/GSN-C-000001/confirmation-request",
        json={"requester_external_label": "Public visitor"},
    )
    assert public_request.status_code == 400, public_request.text
    assert "not active" in public_request.text

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind.in_([
                "community_confirmation.request_to_respond",
                "community_verification.request_confirmation",
            ]))
            .all()
        )
        assert notifications == []


def test_live_confirmation_request_rejects_activation_pending_subject(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    with SessionLocal() as db:
        subject = db.get(User, 1)
        subject.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "relay",
        },
    )
    assert created.status_code == 400, created.text
    assert "Subject is not an active member" in created.text

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community_confirmation.request_to_respond")
            .all()
        )
        assert notifications == []


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


def test_community_confirmation_summary_rejects_invalid_subject_query(
    client: TestClient,
):
    _seed_relay_fixture()

    bad_community = client.get("/community-confirmations/community/0/summary")
    assert bad_community.status_code == 422, bad_community.text

    rejected = client.get(
        "/community-confirmations/community/1/summary?subject_user_id=0"
    )
    assert rejected.status_code == 422, rejected.text

    summary = client.get(
        "/community-confirmations/community/1/summary?subject_user_id=1"
    )
    assert summary.status_code == 200, summary.text
    summary_data = summary.json()
    assert summary_data["relay_available"] is True
    assert "phone_e164" not in json.dumps(summary_data)


def test_community_confirmation_path_ids_reject_nonpositive_values(
    client: TestClient,
):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        rejected_contact_setting = client.patch(
            "/community-confirmations/my-contact-settings/0",
            json={"opted_out": True},
        )
        assert rejected_contact_setting.status_code == 422, rejected_contact_setting.text

        rejected_admin_contact = client.patch(
            "/community-confirmations/community/1/contacts/0",
            json={"active": False},
        )
        assert rejected_admin_contact.status_code == 422, rejected_admin_contact.text

        rejected_response = client.post(
            "/community-confirmations/0/respond",
            json={
                "response_type": "active_here",
                "response_reason": "known_in_community",
            },
        )
        assert rejected_response.status_code == 422, rejected_response.text

        rejected_decision_status = client.patch(
            "/community-confirmations/decisions/0",
            json={"status": "settled"},
        )
        assert rejected_decision_status.status_code == 422, rejected_decision_status.text

        rejected_review_assignment = client.patch(
            "/community-confirmations/review-cases/0/assignment",
            json={"assigned_to_user_id": 2},
        )
        assert rejected_review_assignment.status_code == 422, rejected_review_assignment.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(TrustEvent).count() == 0


def test_community_confirmation_callback_preview_records_safe_delivery_state(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    monkeypatch.setenv("GMFN_CONFIRMATION_CALLBACK_DELIVERY_MODE", "preview")
    monkeypatch.setenv("FRONTEND_BASE_URL", "https://pilot.gsn.example")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    bad_channel = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "email",
            "requester_callback_contact": "+447712345678",
            "requester_callback_consent": True,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert bad_channel.status_code == 422, bad_channel.text
    assert (
        "Unsupported community confirmation requester_callback_channel"
        in bad_channel.text
    )

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0

    bad_contact = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "whatsapp",
            "requester_callback_contact": "merchant@example.com",
            "requester_callback_consent": True,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert bad_contact.status_code == 422, bad_contact.text
    assert "requester_callback_contact must be a valid phone contact" in bad_contact.text

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0

    missing_callback_consent = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "whatsapp",
            "requester_callback_contact": "+447712345678",
            "requester_callback_consent": False,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert missing_callback_consent.status_code == 422, missing_callback_consent.text
    assert (
        "requester_callback_consent must be true when callback channel or contact is supplied"
        in missing_callback_consent.text
    )

    missing_callback_contact = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "whatsapp",
            "requester_callback_consent": True,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert missing_callback_contact.status_code == 422, missing_callback_contact.text
    assert (
        "requester_callback_channel and requester_callback_contact must be supplied together"
        in missing_callback_contact.text
    )

    missing_callback_channel = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_contact": "+447712345678",
            "requester_callback_consent": True,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert missing_callback_channel.status_code == 422, missing_callback_channel.text
    assert (
        "requester_callback_channel and requester_callback_contact must be supplied together"
        in missing_callback_channel.text
    )

    with SessionLocal() as db:
        assert db.query(CommunityConfirmationRequest).count() == 0
        assert db.query(TrustEvent).count() == 0

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
        json={
            "trust_slip_code": "CCR-TRUSTSLIP-1",
            "requester_external_label": "Merchant counter check",
            "requester_callback_channel": "whatsapp",
            "requester_callback_contact": "+447712345678",
            "requester_callback_consent": True,
            "reason_type": "merchant_trust_check",
            "risk_level": "low",
            "mode": "instant_pulse",
        },
    )
    assert created.status_code == 200, created.text
    token = created.json()["public_token"]

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=2,
        email="user2@example.com",
        role="user",
    )
    try:
        inbox = client.get("/community-confirmations/inbox")
        assert inbox.status_code == 200, inbox.text
        request_id = inbox.json()["items"][0]["id"]

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
    callback = public_data["requester_callback"]
    assert callback["requested"] is True
    assert callback["channel"] == "whatsapp"
    assert callback["contact_masked"] == "ending 5678"
    assert callback["delivery_status"] == "preview_ready"
    assert "No SMS or WhatsApp provider was called" in callback["delivery_note"]
    public_text = json.dumps(public_data)
    assert "+447712345678" not in public_text
    assert "7712345678" not in public_text

    with SessionLocal() as db:
        request = db.query(CommunityConfirmationRequest).one()
        summary = json.loads(request.outcome_summary_json or "{}")
        stored_callback = summary["requester_callback"]
        attempt = stored_callback["last_delivery_attempt"]
        assert stored_callback["delivery_status"] == "preview_ready"
        assert attempt["mode"] == "preview"
        assert attempt["channel"] == "whatsapp"
        assert attempt["contact_masked"] == "ending 5678"
        assert attempt["result_url"] == (
            f"https://pilot.gsn.example/community-confirmations/public/{token}"
        )
        assert "+447712345678" not in json.dumps(attempt)
        assert "7712345678" not in json.dumps(attempt)


def test_public_community_verify_accepts_gsn_gmfn_and_trustslip_aliases(client: TestClient):
    _seed_relay_fixture()

    for key in ("GSN-C-000001", "gsn-c-000001", "GMFN-C-000001", "GSN-COM-0001", "1"):
        response = client.get(f"/verify/community/{key}")
        assert response.status_code == 200, {"key": key, "body": response.text}
        data = response.json()
        assert data["community_id"] == 1
        assert data["community_name"] == "Test Clan"
        assert data["community_code"] == "GSN-C-000001"
        assert data["community_type"] == "organized_community"
        assert data["community_type_label"] == "Organized community"
        assert data["community_type_source"] == "Default public category"
        assert data["community_public_face_status"] == "basic_public_record"
        assert data["community_public_face_label"] == "Basic public record"
        assert "not a full community profile" in data["community_public_face_scope"]
        assert data["community_next_evidence_label"] == "Use controlled confirmation before relying on a claim"
        assert "scoped member credential" in data["community_next_evidence_scope"]
        assert "Do not rely on the display name alone" in data["community_next_evidence_scope"]
        assert data["community_record_started_at"]
        assert data["community_record_started_label"].startswith("GSN record since ")
        assert "not the date the real-world community was founded" in data["community_record_started_scope"]
        assert data["community_mobility_label"] == "Portable Community ID anchor"
        assert "outside the original room" in data["community_mobility_scope"]
        assert "does not transfer trust or approve a transaction" in data["community_mobility_scope"]
        assert data["community_reader_decision_label"] == "First check, not final decision"
        assert "serious trade, lending, membership" in data["community_reader_decision_scope"]
        assert "ask for current scoped evidence before acting" in data["community_reader_decision_scope"]
        assert data["community_evidence_currentness_status"] == "active_basic_record"
        assert data["community_evidence_currentness_label"] == "Active recorded Community ID"
        assert "Parent community acknowledgement" in data["community_evidence_currentness_scope"]
        assert data["public_record"] == "Recorded in GSN"
        assert data["domain_label"] == "GSN Community ID Domain"
        assert data["domain_status"] == "Recorded community domain"
        assert data["domain_lifecycle_status"] == "recorded"
        assert data["domain_lifecycle_label"] == "Recorded in GSN"
        assert "Paid protected domain ownership" in data["domain_lifecycle_note"]
        assert "Community ID is the record anchor" in data["domain_evidence_scope"]
        assert "Community ID is the record anchor" in data["domain_proof_scope"]
        assert "not exposed" in data["membership_credential_status"]
        assert data["official_affiliate_status"] == "not_asserted"
        assert data["official_affiliate_label"] == "No parent community affiliate claim on this record"
        assert "Parent community acknowledgement needs its own record" in data["official_affiliate_note"]
        assert "acknowledged under the parent community" in data["group_affiliation_status"]
        assert "does not automatically verify every person" in data["public_limitation"]
        assert data["member_confirmation"] == "By controlled request only"
        assert data["request_confirmation_available"] is True
        assert "active_member_count" not in data
        assert "contactable_reference_count" not in data
        assert "sponsor_signal_count" not in data
        assert "plain_language" not in data
        assert "description" not in data
        assert "hidden_by_design" not in data


def test_public_community_verify_accepts_trustslip_fallback_for_uncoded_clan(client: TestClient):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO clans (
                    id,
                    name,
                    invite_code,
                    status,
                    invite_uses,
                    created_at
                )
                VALUES (
                    8,
                    'Uncoded Clan',
                    'uncoded-invite',
                    'active',
                    0,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )

    response = client.get("/verify/community/GSN-COM-0008")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["community_id"] == 8
    assert data["community_name"] == "Uncoded Clan"
    assert data["status"] == "active"


def test_public_community_verify_degrades_when_confirmation_schema_missing(
    client: TestClient,
    monkeypatch,
):
    _seed_relay_fixture()

    def missing_policy(*args, **kwargs):
        raise OperationalError(
            "SELECT community_confirmation_policies.id FROM community_confirmation_policies",
            {"community_id": 1},
            Exception("no such table: community_confirmation_policies"),
        )

    monkeypatch.setattr(
        community_confirmation_service,
        "get_or_create_confirmation_policy",
        missing_policy,
    )

    response = client.get("/verify/community/GSN-C-000001")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["community_id"] == 1
    assert data["community_name"] == "Test Clan"
    assert data["relay_available"] is False
    assert data["relay_availability"] == "Not available"
    assert data["community_next_evidence_label"] == "Ask for scoped member or group evidence"
    assert "Do not rely on the display name alone" in data["community_next_evidence_scope"]
    assert data["request_confirmation_available"] is False
    assert "plain_language" not in data
    assert "active_member_count" not in data
    assert "hidden_by_design" not in data
    assert "community_confirmation_policies" not in response.text
    assert "SELECT" not in response.text


def test_public_verification_routes_do_not_leak_missing_schema_sql(
    client: TestClient,
    monkeypatch,
):
    def missing_domain_table(*args, **kwargs):
        raise OperationalError(
            "SELECT community_domain_affiliations.id FROM community_domain_affiliations",
            {"community_id": 1},
            Exception("no such table: community_domain_affiliations"),
        )

    monkeypatch.setattr(
        community_confirmation_routes,
        "public_community_verification",
        missing_domain_table,
    )

    response = client.get("/verify/community/GSN-C-000001")
    assert response.status_code == 503, response.text
    assert "refresh the server database setup" in response.text
    assert "community_domain_affiliations" not in response.text
    assert "SELECT" not in response.text

    def missing_member_table(*args, **kwargs):
        raise OperationalError(
            "SELECT community_member_verifications.id FROM community_member_verifications",
            {"community_id": 1, "member_id": 1},
            Exception("no such table: community_member_verifications"),
        )

    monkeypatch.setattr(
        community_confirmation_routes,
        "public_community_member_verification",
        missing_member_table,
    )

    response = client.get("/verify/community/GSN-C-000001/member/GMFN-U-000001")
    assert response.status_code == 503, response.text
    assert "refresh the server database setup" in response.text
    assert "community_member_verifications" not in response.text
    assert "SELECT" not in response.text


def test_public_community_verify_does_not_offer_relay_for_inactive_community(
    client: TestClient,
):
    _seed_relay_fixture()

    with SessionLocal() as db:
        community = db.get(Clan, 1)
        community.status = "closed"
        db.commit()

    response = client.get("/verify/community/GSN-C-000001")
    assert response.status_code == 200, response.text
    data = response.json()
    assert data["status"] == "closed"
    assert data["relay_available"] is False
    assert data["relay_availability"] == "Not available"
    assert data["request_confirmation_available"] is False
    assert data["community_next_evidence_label"] == "Ask for scoped member or group evidence"
    assert data["community_evidence_currentness_status"] == "inactive_record"
    assert data["community_evidence_currentness_label"] == "Community record is not active"
    assert "historical or unavailable" in data["community_evidence_currentness_scope"]


def test_public_community_verify_confirmation_request_uses_controlled_relay(
    client: TestClient,
):
    _seed_relay_fixture()

    response = client.post(
        "/verify/community/GSN-C-000001/confirmation-request",
        json={"requester_external_label": "Public visitor"},
    )
    assert response.status_code == 200, response.text
    data = response.json()
    payload_text = json.dumps(data)
    assert data["community_id"] == 1
    assert data["status"] == "requested"
    assert data["request_channel"] == "controlled_relay"
    assert data["recipient_notification_count"] >= 1
    assert data["private_contacts_exposed"] is False
    assert "phone_e164" not in payload_text
    assert "raw member phone" not in payload_text.lower()

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community_verification.request_confirmation")
            .all()
        )
        assert len(notifications) >= 1
        notification_text = " ".join(
            f"{row.title} {row.message} {row.action_url}" for row in notifications
        )
        assert "community-confirmations" in notification_text
        assert "private member contacts stay protected" in notification_text.lower()
        assert "phone_e164" not in notification_text

        events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_verification.confirmation_requested")
            .all()
        )
        assert len(events) >= 1
        meta = json.loads(events[-1].meta_json or "{}")
        assert meta["community_id"] == 1
        assert meta["request_channel"] == "controlled_relay"
        assert meta["private_contacts_exposed"] is False
        assert meta["recipient_notification_count"] >= 1


def test_public_community_confirmation_request_skips_activation_pending_recipients(
    client: TestClient,
):
    _seed_relay_fixture()

    with SessionLocal() as db:
        pending_admin = db.get(User, 1)
        pending_member = db.get(User, 2)
        pending_admin.hashed_password = PENDING_APPROVAL_SENTINEL
        pending_member.hashed_password = PENDING_APPROVAL_SENTINEL
        db.commit()

    response = client.post(
        "/verify/community/GSN-C-000001/confirmation-request",
        json={"requester_external_label": "Public visitor"},
    )
    assert response.status_code == 400, response.text
    assert "No controlled relay recipient" in response.text

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community_verification.request_confirmation")
            .all()
        )
        assert notifications == []


def test_expired_community_confirmation_records_trust_event(client: TestClient, monkeypatch):
    _seed_relay_fixture()
    monkeypatch.setenv("GMFN_SECRET_KEY", "test-secret")
    requester_token = create_access_token({"sub": "merchant@example.com"})

    created = client.post(
        "/community-confirmations/request",
        headers={"Authorization": f"Bearer {requester_token}"},
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
            "community_confirmation.non_response_recorded",
            "community_confirmation.requester_notified",
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
        assert expired_meta["non_response_count"] == 1
        assert expired_meta["private_contacts_exposed"] is False
        non_response_event = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.non_response_recorded")
            .one()
        )
        assert non_response_event.actor_user_id == 2
        assert non_response_event.subject_user_id == 1
        non_response_meta = json.loads(non_response_event.meta_json or "{}")
        assert non_response_meta["request_id"] == request.id
        assert non_response_meta["status"] == "expired"
        assert non_response_meta["outwardly_anonymous"] is True
        assert non_response_meta["internally_attributable"] is True
        assert non_response_meta["private_contacts_exposed"] is False
        requester_notice = (
            db.query(Notification)
            .filter(Notification.user_id == 3)
            .filter(Notification.kind == "community_confirmation.request_expired")
            .one()
        )
        assert requester_notice.is_read is False
        assert requester_notice.action_url == f"/community-confirmations/public/{token}"
        assert requester_notice.action_label == "Open expired result"
        assert "response window has closed" in requester_notice.message
        requester_notify_meta = json.loads(
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community_confirmation.requester_notified")
            .one()
            .meta_json
            or "{}"
        )
        assert requester_notify_meta["request_id"] == request.id
        assert requester_notify_meta["notification_kind"] == "community_confirmation.request_expired"
        assert requester_notify_meta["action_url"] == f"/community-confirmations/public/{token}"
        assert requester_notify_meta["private_contacts_exposed"] is False


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
        bad_blank_status = client.patch(
            f"/community-confirmations/{request_id}/status",
            json={
                "status": "   ",
                "status_reason": "manual_review_needed",
            },
        )
        assert bad_blank_status.status_code == 422, bad_blank_status.text
        assert "status must not be blank" in bad_blank_status.text

        bad_unknown_request_status = client.patch(
            f"/community-confirmations/{request_id}/status",
            json={
                "status": "auto_closed",
                "status_reason": "manual_review_needed",
            },
        )
        assert bad_unknown_request_status.status_code == 422, bad_unknown_request_status.text
        assert (
            "Unsupported community confirmation request status"
            in bad_unknown_request_status.text
        )

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

        bad_scan_limit = client.post(
            "/community-confirmations/review-cases/scan-sla-events?community_id=1&limit=0"
        )
        assert bad_scan_limit.status_code == 422, bad_scan_limit.text

        bad_scan_community = client.post(
            "/community-confirmations/review-cases/scan-sla-events?community_id=0"
        )
        assert bad_scan_community.status_code == 422, bad_scan_community.text

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

        bad_blank_status = client.get(
            "/community-confirmations/review-cases/inbox?status=&sort=urgency"
        )
        assert bad_blank_status.status_code == 422, bad_blank_status.text
        assert "status must not be blank" in bad_blank_status.text

        bad_unknown_status = client.get(
            "/community-confirmations/review-cases/inbox?status=stale&sort=urgency"
        )
        assert bad_unknown_status.status_code == 422, bad_unknown_status.text
        assert "Unsupported community confirmation review case status" in bad_unknown_status.text

        bad_blank_scope = client.get(
            "/community-confirmations/review-cases/inbox?status=open&scope="
        )
        assert bad_blank_scope.status_code == 422, bad_blank_scope.text
        assert "scope must not be blank" in bad_blank_scope.text

        bad_unknown_scope = client.get(
            "/community-confirmations/review-cases/inbox?status=open&scope=everyone"
        )
        assert bad_unknown_scope.status_code == 422, bad_unknown_scope.text
        assert "Unsupported community confirmation review case scope" in bad_unknown_scope.text

        bad_blank_sort = client.get(
            "/community-confirmations/review-cases/inbox?status=open&sort="
        )
        assert bad_blank_sort.status_code == 422, bad_blank_sort.text
        assert "sort must not be blank" in bad_blank_sort.text

        bad_unknown_sort = client.get(
            "/community-confirmations/review-cases/inbox?status=open&sort=random"
        )
        assert bad_unknown_sort.status_code == 422, bad_unknown_sort.text
        assert "Unsupported community confirmation review case sort" in bad_unknown_sort.text

        bad_limit = client.get(
            "/community-confirmations/review-cases/inbox?status=open&limit=0"
        )
        assert bad_limit.status_code == 422, bad_limit.text

        bad_offset = client.get(
            "/community-confirmations/review-cases/inbox?status=open&offset=-1"
        )
        assert bad_offset.status_code == 422, bad_offset.text

        bad_community = client.get(
            "/community-confirmations/review-cases/inbox?status=open&community_id=0"
        )
        assert bad_community.status_code == 422, bad_community.text

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

        bad_assignment = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}/assignment",
            json={
                "assigned_to_user_id": True,
                "assignment_note": "Boolean user ids must not become user one.",
            },
        )
        assert bad_assignment.status_code == 422, bad_assignment.text
        assert "must not be boolean" in bad_assignment.text

        bad_float_assignment = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}/assignment",
            json={
                "assigned_to_user_id": 2.0,
                "assignment_note": "Float user ids must not be rounded.",
            },
        )
        assert bad_float_assignment.status_code == 422, bad_float_assignment.text
        assert "must not be float" in bad_float_assignment.text

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

        bad_blank_evidence_type = client.post(
            f"/community-confirmations/review-cases/{review_case_id}/evidence",
            json={
                "evidence_type": "   ",
                "title": "Merchant follow-up note",
            },
        )
        assert bad_blank_evidence_type.status_code == 422, bad_blank_evidence_type.text
        assert "evidence_type must not be blank" in bad_blank_evidence_type.text

        bad_unknown_evidence_type = client.post(
            f"/community-confirmations/review-cases/{review_case_id}/evidence",
            json={
                "evidence_type": "rumor",
                "title": "Merchant follow-up note",
            },
        )
        assert bad_unknown_evidence_type.status_code == 422, bad_unknown_evidence_type.text
        assert (
            "Unsupported community confirmation review evidence type"
            in bad_unknown_evidence_type.text
        )

        bad_blank_evidence = client.post(
            f"/community-confirmations/review-cases/{review_case_id}/evidence",
            json={
                "evidence_type": "merchant_note",
                "title": "   ",
                "body": "Blank evidence titles should be rejected at the boundary.",
            },
        )
        assert bad_blank_evidence.status_code == 422, bad_blank_evidence.text
        assert "title must not be blank" in bad_blank_evidence.text

        bad_extra_evidence = client.post(
            f"/community-confirmations/review-cases/{review_case_id}/evidence",
            json={
                "evidence_type": "merchant_note",
                "title": "Merchant follow-up note",
                "private_contacts_exposed": True,
            },
        )
        assert bad_extra_evidence.status_code == 422, bad_extra_evidence.text
        assert "Extra inputs are not permitted" in bad_extra_evidence.text

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

        bad_blank_review_status = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "   ",
                "resolution": "insufficient_evidence",
                "trust_impact": "caution",
            },
        )
        assert bad_blank_review_status.status_code == 422, bad_blank_review_status.text
        assert "status must not be blank" in bad_blank_review_status.text

        bad_blank_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "   ",
                "trust_impact": "caution",
            },
        )
        assert bad_blank_resolution.status_code == 422, bad_blank_resolution.text
        assert "resolution must not be blank" in bad_blank_resolution.text

        bad_blank_trust_impact = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "insufficient_evidence",
                "trust_impact": "   ",
            },
        )
        assert bad_blank_trust_impact.status_code == 422, bad_blank_trust_impact.text
        assert "trust_impact must not be blank" in bad_blank_trust_impact.text

        bad_unknown_review_status = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "auto_resolved",
                "resolution": "insufficient_evidence",
                "trust_impact": "caution",
            },
        )
        assert bad_unknown_review_status.status_code == 422, bad_unknown_review_status.text
        assert (
            "Unsupported community confirmation review status"
            in bad_unknown_review_status.text
        )

        bad_unknown_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "unclear",
                "trust_impact": "caution",
            },
        )
        assert bad_unknown_resolution.status_code == 422, bad_unknown_resolution.text
        assert (
            "Unsupported community confirmation review resolution"
            in bad_unknown_resolution.text
        )

        bad_unknown_trust_impact = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "insufficient_evidence",
                "trust_impact": "severe",
            },
        )
        assert bad_unknown_trust_impact.status_code == 422, bad_unknown_trust_impact.text
        assert (
            "Unsupported community confirmation review trust impact"
            in bad_unknown_trust_impact.text
        )

        bad_missing_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "trust_impact": "caution",
            },
        )
        assert bad_missing_resolution.status_code == 422, bad_missing_resolution.text
        assert "status=resolved requires resolution" in bad_missing_resolution.text

        bad_missing_trust_impact = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "resolved",
                "resolution": "insufficient_evidence",
            },
        )
        assert bad_missing_trust_impact.status_code == 422, bad_missing_trust_impact.text
        assert "status=resolved requires trust_impact" in bad_missing_trust_impact.text

        bad_dismissed_missing_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "dismissed",
            },
        )
        assert (
            bad_dismissed_missing_resolution.status_code == 422
        ), bad_dismissed_missing_resolution.text
        assert (
            "status=dismissed requires resolution=dismissed"
            in bad_dismissed_missing_resolution.text
        )

        bad_dismissed_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "dismissed",
                "resolution": "insufficient_evidence",
                "trust_impact": "none",
            },
        )
        assert bad_dismissed_resolution.status_code == 422, bad_dismissed_resolution.text
        assert (
            "status=dismissed requires resolution=dismissed"
            in bad_dismissed_resolution.text
        )

        bad_dismissed_impact = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "dismissed",
                "resolution": "dismissed",
                "trust_impact": "caution",
            },
        )
        assert bad_dismissed_impact.status_code == 422, bad_dismissed_impact.text
        assert "status=dismissed cannot carry trust impact" in bad_dismissed_impact.text

        bad_open_with_resolution = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "open",
                "resolution": "dismissed",
            },
        )
        assert bad_open_with_resolution.status_code == 422, bad_open_with_resolution.text
        assert (
            "resolution and trust_impact are only allowed when resolving or dismissing a review"
            in bad_open_with_resolution.text
        )

        bad_in_review_with_impact = client.patch(
            f"/community-confirmations/review-cases/{review_case_id}",
            json={
                "status": "in_review",
                "trust_impact": "caution",
            },
        )
        assert bad_in_review_with_impact.status_code == 422, bad_in_review_with_impact.text
        assert (
            "resolution and trust_impact are only allowed when resolving or dismissing a review"
            in bad_in_review_with_impact.text
        )

        with SessionLocal() as db:
            unchanged_review_case = db.get(
                CommunityConfirmationReviewCase,
                review_case_id,
            )
            assert unchanged_review_case.status == "in_review"
            assert unchanged_review_case.resolution is None
            assert unchanged_review_case.trust_impact == "none"
            assert (
                db.query(TrustEvent)
                .filter(
                    TrustEvent.event_type
                    == "community_confirmation.review_case_resolved"
                )
                .count()
                == 0
            )

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
        bad_settings_filter = client.get(
            "/community-confirmations/my-contact-settings?community_id=0"
        )
        assert bad_settings_filter.status_code == 422, bad_settings_filter.text

        settings = client.get("/community-confirmations/my-contact-settings")
        assert settings.status_code == 200, settings.text
        settings_data = settings.json()
        assert settings_data["total"] == 1
        assert settings_data["items"][0]["community_id"] == 1
        assert settings_data["items"][0]["can_receive_relay_requests"] is True
        assert settings_data["items"][0]["can_receive_instant_pulse"] is True
        assert "phone_e164" not in json.dumps(settings_data)

        bad_preference = client.patch(
            "/community-confirmations/my-contact-settings/1",
            json={"opted_out": "true"},
        )
        assert bad_preference.status_code == 422, bad_preference.text
        assert "opted_out must be boolean" in bad_preference.text

        bad_extra_preference = client.patch(
            "/community-confirmations/my-contact-settings/1",
            json={"opted_out": True, "admin_override": True},
        )
        assert bad_extra_preference.status_code == 422, bad_extra_preference.text
        assert "Extra inputs are not permitted" in bad_extra_preference.text

        bad_opt_out_conflict = client.patch(
            "/community-confirmations/my-contact-settings/1",
            json={
                "opted_out": True,
                "can_receive_relay_requests": True,
            },
        )
        assert bad_opt_out_conflict.status_code == 422, bad_opt_out_conflict.text
        assert (
            "opted_out cannot be combined with receiving relay or instant pulse requests"
            in bad_opt_out_conflict.text
        )

        bad_instant_conflict = client.patch(
            "/community-confirmations/my-contact-settings/1",
            json={
                "can_receive_relay_requests": False,
                "can_receive_instant_pulse": True,
            },
        )
        assert bad_instant_conflict.status_code == 422, bad_instant_conflict.text
        assert (
            "can_receive_instant_pulse requires receiving relay requests"
            in bad_instant_conflict.text
        )

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

        bad_policy_flag = client.patch(
            "/community-confirmations/community/1/policy",
            json={"relay_enabled": "false"},
        )
        assert bad_policy_flag.status_code == 422, bad_policy_flag.text
        assert "relay_enabled must be boolean" in bad_policy_flag.text

        bad_extra_policy = client.patch(
            "/community-confirmations/community/1/policy",
            json={"relay_enabled": True, "secret_escalation": True},
        )
        assert bad_extra_policy.status_code == 422, bad_extra_policy.text
        assert "Extra inputs are not permitted" in bad_extra_policy.text

        bad_review_window_order = client.patch(
            "/community-confirmations/community/1/policy",
            json={
                "review_attention_after_hours": 48,
                "review_overdue_after_hours": 48,
            },
        )
        assert bad_review_window_order.status_code == 422, bad_review_window_order.text
        assert (
            "review_overdue_after_hours must be greater than review_attention_after_hours"
            in bad_review_window_order.text
        )

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

        bad_contact_flag = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"active": 1},
        )
        assert bad_contact_flag.status_code == 422, bad_contact_flag.text
        assert "active must be boolean" in bad_contact_flag.text

        bad_instant_contact = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={
                "can_receive_relay_requests": False,
                "can_receive_instant_pulse": True,
            },
        )
        assert bad_instant_contact.status_code == 422, bad_instant_contact.text
        assert (
            "can_receive_instant_pulse requires an active contact that can receive relay requests"
            in bad_instant_contact.text
        )

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


def test_community_admin_contact_update_rejects_unknown_role_or_standing_status(
    client: TestClient,
):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        existing_policy = client.get("/community-confirmations/community/1/policy")
        assert existing_policy.status_code == 200, existing_policy.text

        bad_blank_role = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"role_type": "   "},
        )
        assert bad_blank_role.status_code == 422, bad_blank_role.text
        assert "role_type must not be blank" in bad_blank_role.text

        bad_blank_standing = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"standing_status": "   "},
        )
        assert bad_blank_standing.status_code == 422, bad_blank_standing.text
        assert "standing_status must not be blank" in bad_blank_standing.text

        bad_role = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"role_type": "regional_chair"},
        )
        assert bad_role.status_code == 422
        assert "Unsupported community confirmation contact role type" in bad_role.text

        bad_standing = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"standing_status": "trusted_elite"},
        )
        assert bad_standing.status_code == 422
        assert (
            "Unsupported community confirmation contact standing status"
            in bad_standing.text
        )

        unchanged_policy = client.get("/community-confirmations/community/1/policy")
        assert unchanged_policy.status_code == 200, unchanged_policy.text
        contact = [
            row
            for row in unchanged_policy.json()["contacts"]
            if int(row["user_id"]) == 2
        ][0]
        assert contact["role_type"] == "member"
        assert contact["standing_status"] == "active"
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        events = db.query(TrustEvent).order_by(TrustEvent.id).all()

    assert events == []


def test_community_admin_policy_and_contact_numeric_controls_reject_booleans(
    client: TestClient,
):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        bad_policy_number = client.patch(
            "/community-confirmations/community/1/policy",
            json={"minimum_positive_responses": True},
        )
        assert bad_policy_number.status_code == 422, bad_policy_number.text
        assert "must not be boolean" in bad_policy_number.text

        bad_policy_float = client.patch(
            "/community-confirmations/community/1/policy",
            json={"minimum_positive_responses": 1.0},
        )
        assert bad_policy_float.status_code == 422, bad_policy_float.text
        assert "must not be float" in bad_policy_float.text

        bad_contact_priority = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"priority_order": True},
        )
        assert bad_contact_priority.status_code == 422, bad_contact_priority.text
        assert "must not be boolean" in bad_contact_priority.text

        bad_contact_priority_float = client.patch(
            "/community-confirmations/community/1/contacts/2",
            json={"priority_order": 1.0},
        )
        assert (
            bad_contact_priority_float.status_code == 422
        ), bad_contact_priority_float.text
        assert "must not be float" in bad_contact_priority_float.text
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        events = db.query(TrustEvent).order_by(TrustEvent.id).all()

    assert events == []


def test_community_confirmation_path_ids_reject_zero_before_service_logic(
    client: TestClient,
):
    _seed_relay_fixture()

    app.dependency_overrides[get_current_user] = lambda: Obj(
        id=1,
        email="pytest@example.com",
        role="admin",
    )
    try:
        cases = [
            (
                "patch",
                "/community-confirmations/my-contact-settings/0",
                {"opted_out": True},
            ),
            (
                "get",
                "/community-confirmations/community/0/policy",
                None,
            ),
            (
                "patch",
                "/community-confirmations/community/0/policy",
                {"relay_enabled": False},
            ),
            (
                "patch",
                "/community-confirmations/community/1/contacts/0",
                {"active": False},
            ),
            (
                "post",
                "/community-confirmations/0/respond",
                {
                    "response_type": "active_here",
                    "response_reason": "known_in_community",
                },
            ),
            (
                "post",
                "/community-confirmations/0/decision",
                {"decision": "release_goods"},
            ),
            (
                "get",
                "/community-confirmations/0/decision",
                None,
            ),
            (
                "patch",
                "/community-confirmations/decisions/0",
                {"status": "cancelled"},
            ),
            (
                "patch",
                "/community-confirmations/0/status",
                {"status": "cancelled"},
            ),
            (
                "get",
                "/community-confirmations/0/review-case",
                None,
            ),
            (
                "patch",
                "/community-confirmations/review-cases/0/assignment",
                {"assigned_to_user_id": 1},
            ),
            (
                "get",
                "/community-confirmations/review-cases/0/evidence",
                None,
            ),
            (
                "post",
                "/community-confirmations/review-cases/0/evidence",
                {
                    "evidence_type": "note",
                    "title": "Boundary check",
                    "body": "This must not reach review evidence service logic.",
                },
            ),
            (
                "patch",
                "/community-confirmations/review-cases/0",
                {"status": "open"},
            ),
            (
                "get",
                "/community-confirmations/community/0/summary",
                None,
            ),
        ]

        for method, path, payload in cases:
            request = getattr(client, method)
            response = request(path, json=payload) if payload is not None else request(path)
            assert response.status_code == 422, (method, path, response.text)
    finally:
        app.dependency_overrides.pop(get_current_user, None)

    with SessionLocal() as db:
        assert db.query(TrustEvent).count() == 0
        assert db.query(CommunityConfirmationDecision).count() == 0
        assert db.query(CommunityConfirmationReviewEvidence).count() == 0


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
