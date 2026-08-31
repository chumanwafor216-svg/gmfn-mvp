from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, MarketplaceRequest, TrustEvent, User
from app.db.notification_models import Notification


def _seed_notice_community(
    *,
    membership_role: str = "admin",
    notice_posting_policy: str = "members",
) -> None:
    with SessionLocal() as db:
        user = User(
            id=1,
            email="notice-admin@example.com",
            hashed_password="hashed",
            role="admin" if membership_role == "admin" else "user",
            phone_e164="+447700900123",
            phone_verified_at=datetime.now(timezone.utc),
        )
        clan = Clan(
            id=1,
            name="Nigerian Society",
            invite_code="notice-board-test",
            invite_created_at=datetime.now(timezone.utc),
            created_by_user_id=1,
            notice_posting_policy=notice_posting_policy,
        )
        db.add_all([user, clan])
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role=membership_role,
                personal_pool_balance=0,
            )
        )
        if membership_role == "admin":
            member = User(
                id=2,
                email="notice-member@example.com",
                hashed_password="hashed",
                role="user",
            )
            outsider = User(
                id=3,
                email="notice-outsider@example.com",
                hashed_password="hashed",
                role="user",
            )
            db.add_all([member, outsider])
            db.flush()
            db.add(
                ClanMembership(
                    id=2,
                    clan_id=1,
                    user_id=2,
                    role="member",
                    personal_pool_balance=0,
                )
            )
        db.commit()


def _seed_notice_governance_profile_event(
    *,
    enable_community_records: bool = True,
    allow_member_record_submissions: bool = False,
    require_admin_approval_for_records: bool = True,
) -> None:
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.governance_profile_selected",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "community_type": "migrant_community",
                        "community_type_label": "Migrant Community",
                        "governance_weight": "light",
                        "governance_weight_label": "Light",
                        "preset_key": "light_migrant_support_network",
                        "preset_label": "Light Migrant Support Network",
                        "verification_mode": "light_member_verification",
                        "policies": {
                            "enable_community_records": enable_community_records,
                            "allow_member_record_submissions": allow_member_record_submissions,
                            "require_admin_approval_for_records": require_admin_approval_for_records,
                        },
                        "requirements": {
                            "member_phone_required": True,
                            "rules_acceptance_required": True,
                        },
                        "truth_boundary": "Recorded as setup evidence only.",
                    }
                ),
            )
        )
        db.commit()


def test_community_officer_can_post_and_members_can_read_notice(
    client, override_current_user
):
    _seed_notice_community()

    post_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Meeting Saturday 4 pm.",
        },
    )

    assert post_res.status_code == 200, post_res.text
    posted_body = post_res.json()
    notice = posted_body["notice"]
    assert notice["body"] == "Meeting Saturday 4 pm."
    assert notice["word_count"] == 4
    assert notice["posting_policy"] == "members"
    assert notice["expiry_policy"] == "standard"
    assert notice["expires_at"]
    assert notice["active_board_status"] == "active"
    assert notice["is_archived"] is False
    assert notice["sender_whatsapp_number"] == "+447700900123"
    assert notice["sender_whatsapp_label"] == "notice-admin@example.com"
    assert posted_body["notification_kind"] == "community.notice.posted"
    assert posted_body["posting_policy"] == "members"
    assert posted_body["notifications_created"] == 1
    assert "does not broadcast" in posted_body["boundary"]

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    body = list_res.json()
    assert body["comments_enabled"] is False
    assert body["reactions_enabled"] is False
    assert body["thread_enabled"] is False
    assert body["default_expiry_policy"] == "standard"
    assert body["default_expires_after_days"] == 7
    assert body["urgent_expires_after_hours"] == 48
    assert body["posting_policy"] == "members"
    assert body["can_post_notice"] is True
    assert body["notices"][0]["body"] == "Meeting Saturday 4 pm."

    with SessionLocal() as db:
        notifications = (
            db.query(Notification)
            .filter(Notification.kind == "community.notice.posted")
            .order_by(Notification.id.asc())
            .all()
        )
        assert len(notifications) == 1
        assert notifications[0].user_id == 2
        assert notifications[0].title == "Official community notice"
        assert notifications[0].message == "Meeting Saturday 4 pm."
        assert notifications[0].action_url == (
            "/app/marketplace?clan_id=1#marketplace-official-board"
        )
        assert notifications[0].action_label == "Open Official Board"
        assert notifications[0].is_read is False


def test_community_notice_source_and_acknowledgement_are_scoped_to_selected_community(
    client, override_current_user
):
    _seed_notice_community()

    post_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Saturday exercise by 9:40am.",
        },
    )
    assert post_res.status_code == 200, post_res.text
    posted_notice = post_res.json()["notice"]
    assert posted_notice["source_community_id"] == 1
    assert posted_notice["source_community_name"] == "Nigerian Society"
    assert posted_notice["source_community_code"] == "notice-board-test"
    assert posted_notice["acknowledgement_enabled"] is True
    assert posted_notice["acknowledgement_summary"] == {
        "acknowledged": 0,
        "own_acknowledged": False,
    }

    ack_res = client.post(
        f"/community-notices/{posted_notice['event_id']}/acknowledgements",
        json={"clan_id": 1},
    )
    assert ack_res.status_code == 200, ack_res.text
    assert ack_res.json()["acknowledgement_summary"] == {
        "acknowledged": 1,
        "own_acknowledged": True,
    }

    repeat_ack_res = client.post(
        f"/community-notices/{posted_notice['event_id']}/acknowledgements",
        json={"clan_id": 1},
    )
    assert repeat_ack_res.status_code == 200, repeat_ack_res.text
    assert repeat_ack_res.json()["acknowledgement_summary"] == {
        "acknowledged": 1,
        "own_acknowledged": True,
    }

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    listed_notice = list_res.json()["notices"][0]
    assert listed_notice["source_community_name"] == "Nigerian Society"
    assert listed_notice["acknowledgement_summary"] == {
        "acknowledged": 1,
        "own_acknowledged": True,
    }

    with SessionLocal() as db:
        ack_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.notice.acknowledged")
            .all()
        )
        assert len(ack_events) == 1
        meta = json.loads(ack_events[0].meta_json)
        assert meta["notice_event_id"] == posted_notice["event_id"]
        assert ack_events[0].clan_id == 1


def test_community_notice_board_lists_demand_box_signals_without_response_thread(
    client, override_current_user
):
    _seed_notice_community()

    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        requester = db.get(User, 2)
        requester.gmfn_id = "GSN-PLUMBER-NEED"
        requester.trust_band = "good"
        db.add(
            MarketplaceRequest(
                id=1,
                clan_id=1,
                user_id=2,
                title="Need a plumber",
                category="repairs",
                urgency="high",
                area="North side",
                status="open",
                created_at=now,
                expires_at=now + timedelta(hours=24),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    body = list_res.json()

    assert body["comments_enabled"] is False
    assert body["reactions_enabled"] is False
    assert body["thread_enabled"] is False
    assert body["demand_signals_enabled"] is True
    assert body["demand_signal_count"] == 1
    assert "Responding stays in Demand Box" in body["demand_signal_boundary"]

    signal = body["demand_signals"][0]
    assert signal["source"] == "demand_box"
    assert signal["request_id"] == 1
    assert signal["title"] == "Need a plumber"
    assert signal["category"] == "repairs"
    assert signal["urgency"] == "high"
    assert signal["area"] == "North side"
    assert signal["requester_gmfn_id"] == "GSN-PLUMBER-NEED"
    assert signal["requester_trust_band"] == "good"
    assert "whatsapp_number" not in signal

    with SessionLocal() as db:
        notifications = db.query(Notification).all()
        assert notifications == []


def test_community_notice_rejects_more_than_fifty_words(
    client, override_current_user
):
    _seed_notice_community()
    too_long = " ".join(f"word{i}" for i in range(51))

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": too_long,
        },
    )

    assert res.status_code == 422, res.text
    assert "50 words or fewer" in res.text


def test_community_notice_archive_hides_expired_notice_but_keeps_memory(
    client, override_current_user
):
    _seed_notice_community()

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.notice.posted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "Expired food collection yesterday.",
                        "word_count": 4,
                        "expiry_policy": "event",
                        "expires_at": (
                            datetime.now(timezone.utc) - timedelta(hours=2)
                        ).isoformat(),
                        "comments_enabled": False,
                        "reactions_enabled": False,
                        "thread_enabled": False,
                    }
                ),
            )
        )
        db.add(
            TrustEvent(
                event_type="community.notice.posted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "Food collection this Friday.",
                        "word_count": 4,
                        "expiry_policy": "standard",
                        "expires_at": (
                            datetime.now(timezone.utc) + timedelta(days=7)
                        ).isoformat(),
                        "comments_enabled": False,
                        "reactions_enabled": False,
                        "thread_enabled": False,
                    }
                ),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 5})

    assert list_res.status_code == 200, list_res.text
    payload = list_res.json()
    bodies = [item["body"] for item in payload["notices"]]
    assert "Food collection this Friday." in bodies
    assert "Expired food collection yesterday." not in bodies
    assert payload["archived_notice_count"] == 1

    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.notice.posted")
            .count()
            == 2
        )



def test_community_notice_post_respects_disabled_light_governance_records_policy(
    client, override_current_user
):
    _seed_notice_community()
    _seed_notice_governance_profile_event(enable_community_records=False)

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Do not create this selected record.",
        },
    )

    assert res.status_code == 403, res.text
    detail = res.json()["detail"]
    assert detail["code"] == "community_records_disabled"
    assert detail["governance_profile_key"] == "light_migrant_support_network"
    assert detail["community_records_policy"]["community_records_enabled"] is False
    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.notice.posted")
            .count()
            == 0
        )

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    list_body = list_res.json()
    assert list_body["can_post_notice"] is False
    assert list_body["community_records_policy"]["community_records_enabled"] is False


def test_member_record_submission_policy_blocks_member_notice_when_closed(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")
    _seed_notice_governance_profile_event(
        enable_community_records=True,
        allow_member_record_submissions=False,
        require_admin_approval_for_records=True,
    )

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Member cannot publish this directly.",
        },
    )

    assert res.status_code == 403, res.text
    detail = res.json()["detail"]
    assert detail["code"] == "community_member_record_submissions_disabled"
    assert detail["community_records_policy"]["member_record_submissions_enabled"] is False


def test_member_record_submission_policy_blocks_live_publish_when_admin_review_required(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")
    _seed_notice_governance_profile_event(
        enable_community_records=True,
        allow_member_record_submissions=True,
        require_admin_approval_for_records=True,
    )

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Member record needs admin review first.",
        },
    )

    assert res.status_code == 403, res.text
    detail = res.json()["detail"]
    assert detail["code"] == "community_record_admin_approval_required"
    assert detail["community_records_policy"]["admin_approval_required_for_records"] is True


def test_admin_notice_post_reports_light_governance_records_policy(
    client, override_current_user
):
    _seed_notice_community()
    _seed_notice_governance_profile_event(
        enable_community_records=True,
        allow_member_record_submissions=False,
        require_admin_approval_for_records=True,
    )

    post_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Selected record preserved by admin.",
        },
    )

    assert post_res.status_code == 200, post_res.text
    policy = post_res.json()["community_records_policy"]
    assert policy["governance_profile_key"] == "light_migrant_support_network"
    assert policy["community_records_enabled"] is True
    assert policy["member_record_submissions_enabled"] is False
    assert policy["admin_approval_required_for_records"] is True

    settings_res = client.get("/community-notices/settings", params={"clan_id": 1})
    assert settings_res.status_code == 200, settings_res.text
    assert settings_res.json()["community_records_policy"] == policy

    with SessionLocal() as db:
        event = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.notice.posted")
            .order_by(TrustEvent.id.desc())
            .first()
        )
        meta = json.loads(event.meta_json or "{}")
        event_policy = meta["community_records_policy"]
        assert event_policy["governance_profile_key"] == "light_migrant_support_network"
        assert event_policy["admin_approval_required_for_records"] is True

def test_member_can_post_when_notice_board_is_open(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Welcome dinner this Sunday.",
        },
    )

    assert res.status_code == 200, res.text
    body = res.json()
    assert body["posting_policy"] == "members"
    assert body["notice"]["body"] == "Welcome dinner this Sunday."
    assert body["notice"]["sender_whatsapp_number"] == "+447700900123"


def test_admin_can_lock_notice_board_to_admin_only(client, override_current_user):
    _seed_notice_community()

    settings_res = client.patch(
        "/community-notices/settings",
        params={"clan_id": 1},
        json={"posting_policy": "admins"},
    )
    assert settings_res.status_code == 200, settings_res.text
    assert settings_res.json()["posting_policy"] == "admins"

    read_res = client.get("/community-notices/settings", params={"clan_id": 1})
    assert read_res.status_code == 200, read_res.text
    assert read_res.json()["posting_policy"] == "admins"
    assert read_res.json()["can_manage_notice_settings"] is True


def test_member_is_blocked_when_notice_board_is_admin_only(
    client, override_current_user_user
):
    _seed_notice_community(
        membership_role="member",
        notice_posting_policy="admins",
    )

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Welcome dinner this Sunday.",
        },
    )

    assert res.status_code == 403, res.text
    assert "admin-only" in res.text


def test_community_notice_rejects_malformed_boundary_controls(
    client, override_current_user
):
    _seed_notice_community()

    bad_clan = client.get("/community-notices", params={"clan_id": False})
    assert bad_clan.status_code == 422, bad_clan.text

    bad_body = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": False,
        },
    )
    assert bad_body.status_code == 422, bad_body.text
    assert "body must be text" in bad_body.text


def test_community_notice_board_surfaces_meeting_interest_as_planning_notice(
    client, override_current_user
):
    _seed_notice_community()
    scheduled_at = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.meeting.reminder_created",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "meeting_id": "MTG-C1-NOTICE-BOARD",
                        "title": "Monthly planning meeting",
                        "purpose": "Agree the next community support priorities.",
                        "scheduled_at": scheduled_at,
                    }
                ),
            )
        )
        db.add(
            TrustEvent(
                event_type="community.meeting.interest_recorded",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "meeting_id": "MTG-C1-NOTICE-BOARD",
                        "interest_response": "yes",
                        "responder_user_id": 1,
                    }
                ),
            )
        )
        db.add(
            TrustEvent(
                event_type="community.meeting.interest_recorded",
                clan_id=1,
                actor_user_id=2,
                subject_user_id=2,
                meta_json=json.dumps(
                    {
                        "meeting_id": "MTG-C1-NOTICE-BOARD",
                        "interest_response": "maybe",
                        "responder_user_id": 2,
                    }
                ),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 3})

    assert list_res.status_code == 200, list_res.text
    payload = list_res.json()
    notice = payload["notices"][0]
    assert notice["source"] == "community_meeting"
    assert notice["notice_kind"] == "meeting_planning"
    assert notice["meeting_id"] == "MTG-C1-NOTICE-BOARD"
    assert notice["title"] == "Monthly planning meeting"
    assert notice["purpose"] == "Agree the next community support priorities."
    assert notice["scheduled_at"] == scheduled_at
    assert notice["planning_status"] == "Members are already responding"
    assert notice["interest_summary"]["yes"] == 1
    assert notice["interest_summary"]["maybe"] == 1
    assert notice["interest_summary"]["no"] == 0
    assert notice["interest_summary"]["total"] == 2
    assert notice["interest_summary"]["planning_ready"] is True
    assert notice["interest_summary"]["own_response"] == "yes"
    assert "not final attendance" in notice["board_hint"]

def test_community_notice_board_hides_expired_meeting_reminders(
    client, override_current_user
):
    _seed_notice_community()
    past_scheduled_at = (datetime.now(timezone.utc) - timedelta(hours=2)).isoformat()
    future_scheduled_at = (datetime.now(timezone.utc) + timedelta(days=1)).isoformat()

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.meeting.reminder_created",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "meeting_id": "MTG-C1-OLD-NOTICE",
                        "title": "Old planning meeting",
                        "purpose": "This should leave the live bulletin.",
                        "scheduled_at": past_scheduled_at,
                    }
                ),
            )
        )
        db.add(
            TrustEvent(
                event_type="community.meeting.reminder_created",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "meeting_id": "MTG-C1-FUTURE-NOTICE",
                        "title": "Future planning meeting",
                        "purpose": "This should stay on the live bulletin.",
                        "scheduled_at": future_scheduled_at,
                    }
                ),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 5})

    assert list_res.status_code == 200, list_res.text
    payload = list_res.json()
    meeting_ids = [item.get("meeting_id") for item in payload["notices"]]
    titles = [item["title"] for item in payload["notices"]]
    assert "MTG-C1-FUTURE-NOTICE" in meeting_ids
    assert "Future planning meeting" in titles
    assert "MTG-C1-OLD-NOTICE" not in meeting_ids
    assert "Old planning meeting" not in titles
    assert payload["archived_notice_count"] == 1
