from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, CommunityDomain, CommunityDomainPolicy, MarketplaceBroadcast, MarketplaceRequest, MarketplaceShop, TrustEvent, User
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


def _seed_notice_reviewer() -> None:
    with SessionLocal() as db:
        db.add(
            User(
                id=2,
                email="notice-reviewer@example.com",
                hashed_password="hashed",
                role="user",
            )
        )
        db.flush()
        db.add(
            ClanMembership(
                id=2,
                clan_id=1,
                user_id=2,
                role="admin",
                personal_pool_balance=0,
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


def test_community_notice_public_qr_exposes_full_details_without_private_fields(
    client, override_current_user
):
    _seed_notice_community()
    full_body = (
        "Choir practice starts with opening prayer, then section rehearsal, "
        "then final full-group practice. Members should come with notebooks."
    )

    post_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Choir practice Wednesday 7 pm.",
            "full_body": full_body,
            "public_qr_enabled": True,
            "attachment_url": "https://example.org/choir-programme",
            "attachment_label": "Choir programme",
            "attachment_kind": "document",
        },
    )

    assert post_res.status_code == 200, post_res.text
    notice = post_res.json()["notice"]
    assert notice["body"] == "Choir practice Wednesday 7 pm."
    assert notice["full_body"] == full_body
    assert notice["full_word_count"] == 18
    assert notice["attachment_url"] == "https://example.org/choir-programme"
    assert notice["attachment_label"] == "Choir programme"
    assert notice["attachment_kind"] == "document"
    assert notice["public_qr_enabled"] is True
    assert notice["public_code"]
    assert notice["public_path"] == f"/community-notices/{notice['public_code']}"
    assert notice["public_api_path"] == f"/community-notices/public/{notice['public_code']}"

    public_res = client.get(f"/community-notices/public/{notice['public_code']}")

    assert public_res.status_code == 200, public_res.text
    public_notice = public_res.json()["notice"]
    assert public_notice["body"] == "Choir practice Wednesday 7 pm."
    assert public_notice["full_body"] == full_body
    assert public_notice["attachment_url"] == "https://example.org/choir-programme"
    assert public_notice["attachment_label"] == "Choir programme"
    assert public_notice["attachment_kind"] == "document"
    assert public_notice["community"]["name"] == "Nigerian Society"
    assert "posted_by_user_id" not in public_notice
    assert "sender_whatsapp_number" not in public_notice
    assert "acknowledgement_summary" not in public_notice
    assert "availability_summary" not in public_notice
    assert "member lists" in public_notice["boundary"]


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


def test_event_notice_availability_response_updates_live_bulletin(client, override_current_user):
    _seed_notice_community()
    expires_at = datetime.now(timezone.utc) + timedelta(days=2)

    event_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Choir practice on Wednesday. All members are welcome.",
            "expiry_policy": "event",
            "expires_at": expires_at.isoformat(),
        },
    )
    assert event_res.status_code == 200, event_res.text
    notice = event_res.json()["notice"]
    assert notice["availability_enabled"] is True
    assert notice["availability_summary"] == {
        "yes": 0,
        "maybe": 0,
        "no": 0,
        "total": 0,
        "planning_ready": False,
        "own_response": None,
    }

    yes_res = client.post(
        f"/community-notices/{notice['event_id']}/availability",
        json={"clan_id": 1, "response": "yes"},
    )
    assert yes_res.status_code == 200, yes_res.text
    assert yes_res.json()["availability_summary"] == {
        "yes": 1,
        "maybe": 0,
        "no": 0,
        "total": 1,
        "planning_ready": True,
        "own_response": "yes",
    }

    no_res = client.post(
        f"/community-notices/{notice['event_id']}/availability",
        json={"clan_id": 1, "response": "no"},
    )
    assert no_res.status_code == 200, no_res.text
    assert no_res.json()["availability_summary"] == {
        "yes": 0,
        "maybe": 0,
        "no": 1,
        "total": 1,
        "planning_ready": False,
        "own_response": "no",
    }

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    listed_notice = list_res.json()["notices"][0]
    assert listed_notice["body"] == "Choir practice on Wednesday. All members are welcome."
    assert listed_notice["availability_enabled"] is True
    assert listed_notice["availability_summary"]["no"] == 1
    assert listed_notice["availability_summary"]["own_response"] == "no"

    standard_res = client.post(
        "/community-notices",
        json={"clan_id": 1, "body": "Ordinary update without attendance."},
    )
    assert standard_res.status_code == 200, standard_res.text
    blocked_res = client.post(
        f"/community-notices/{standard_res.json()['notice']['event_id']}/availability",
        json={"clan_id": 1, "response": "maybe"},
    )
    assert blocked_res.status_code == 409, blocked_res.text

    poll_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Choir practice needs quick availability response.",
            "availability_enabled": True,
        },
    )
    assert poll_res.status_code == 200, poll_res.text
    poll_notice = poll_res.json()["notice"]
    assert poll_notice["availability_enabled"] is True

    maybe_res = client.post(
        f"/community-notices/{poll_notice['event_id']}/availability",
        json={"clan_id": 1, "response": "maybe"},
    )
    assert maybe_res.status_code == 200, maybe_res.text
    assert maybe_res.json()["availability_summary"]["maybe"] == 1



def test_market_need_pulse_reuses_notice_availability_engine(client, override_current_user):
    _seed_notice_community()

    pulse_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Do you need school uniform tailoring this month?",
            "availability_enabled": False,
            "notice_mode": "market_need_pulse",
        },
    )
    assert pulse_res.status_code == 200, pulse_res.text
    payload = pulse_res.json()
    notice = payload["notice"]
    assert payload["message"] == "Community need question posted to the Community Notice Board."
    assert "not a buyer list or sales proof" in payload["boundary"]
    assert notice["notice_mode"] == "market_need_pulse"
    assert notice["notice_kind"] == "market_need_pulse"
    assert notice["market_need_pulse"] is True
    assert notice["availability_enabled"] is True
    assert notice["availability_summary"] == {
        "yes": 0,
        "maybe": 0,
        "no": 0,
        "total": 0,
        "planning_ready": False,
        "own_response": None,
    }

    response_res = client.post(
        f"/community-notices/{notice['event_id']}/availability",
        json={"clan_id": 1, "response": "yes"},
    )
    assert response_res.status_code == 200, response_res.text
    assert response_res.json()["message"] == "Community need response saved."
    assert response_res.json()["availability_summary"]["yes"] == 1

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    listed_notice = list_res.json()["notices"][0]
    assert listed_notice["notice_mode"] == "market_need_pulse"
    assert listed_notice["notice_kind"] == "market_need_pulse"
    assert listed_notice["market_need_pulse"] is True
    assert listed_notice["availability_summary"]["own_response"] == "yes"

def test_notice_acknowledgement_roll_call_is_admin_only(client, override_current_user):
    _seed_notice_community()

    post_res = client.post(
        "/community-notices",
        json={"clan_id": 1, "body": "Sunday school practice on Thursday."},
    )
    assert post_res.status_code == 200, post_res.text
    notice = post_res.json()["notice"]

    with SessionLocal() as db:
        admin = db.get(User, 1)
        member = db.get(User, 2)
        admin.display_name = "Chuma Admin"
        member.display_name = "Ada Member"
        db.add(
            TrustEvent(
                event_type="community.notice.acknowledged",
                clan_id=1,
                actor_user_id=2,
                subject_user_id=2,
                created_at=datetime.now(timezone.utc),
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_acknowledged",
                        "notice_event_id": int(notice["event_id"]),
                        "notice_id": notice["notice_id"],
                        "acknowledgement": "seen",
                    },
                    separators=(",", ":"),
                ),
            )
        )
        db.commit()

    roll_call_res = client.get(
        f"/community-notices/{notice['event_id']}/acknowledgements",
        params={"clan_id": 1},
    )
    assert roll_call_res.status_code == 200, roll_call_res.text
    payload = roll_call_res.json()
    assert payload["summary"] == {
        "acknowledged": 1,
        "not_acknowledged": 1,
        "total_members": 2,
    }
    assert [row["display_name"] for row in payload["acknowledged"]] == ["Ada Member"]
    assert [row["display_name"] for row in payload["not_acknowledged"]] == ["Chuma Admin"]
    assert "email" not in payload["acknowledged"][0]


def test_notice_acknowledgement_roll_call_allows_community_owner(client, override_current_user):
    _seed_notice_community(membership_role="owner")

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.notice.posted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                created_at=datetime.now(timezone.utc),
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "Owner should see the roll call.",
                        "word_count": 6,
                        "expiry_policy": "standard",
                    }
                ),
            )
        )
        db.commit()
        notice_event_id = db.query(TrustEvent.id).scalar()

    roll_call_res = client.get(
        f"/community-notices/{notice_event_id}/acknowledgements",
        params={"clan_id": 1},
    )
    assert roll_call_res.status_code == 200, roll_call_res.text
    assert roll_call_res.json()["summary"]["total_members"] == 1


def test_member_cannot_read_notice_acknowledgement_roll_call(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")
    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.notice.posted",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                created_at=now,
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "Members only see the acknowledgement count.",
                        "word_count": 6,
                        "expiry_policy": "standard",
                        "expires_at": (now + timedelta(days=7)).isoformat(),
                    }
                ),
            )
        )
        db.commit()
        notice_event_id = db.query(TrustEvent.id).scalar()

    roll_call_res = client.get(
        f"/community-notices/{notice_event_id}/acknowledgements",
        params={"clan_id": 1},
    )
    assert roll_call_res.status_code == 403, roll_call_res.text
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


def test_community_notice_board_can_read_across_active_member_communities(
    client, override_current_user
):
    _seed_notice_community()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add_all(
            [
                Clan(
                    id=2,
                    name="Pillar of Hope",
                    invite_code="pillar-notices",
                    invite_created_at=now,
                    created_by_user_id=1,
                    notice_posting_policy="members",
                ),
                Clan(
                    id=3,
                    name="Left community",
                    invite_code="left-notices",
                    invite_created_at=now,
                    created_by_user_id=3,
                    notice_posting_policy="members",
                ),
            ]
        )
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=3,
                    clan_id=2,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=4,
                    clan_id=3,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                    left_at=now,
                ),
            ]
        )
        for clan_id, body, offset in [
            (1, "Selected community meeting tonight.", 1),
            (2, "Pillar welfare visit tomorrow.", 2),
            (3, "Left community hidden notice.", 3),
        ]:
            db.add(
                TrustEvent(
                    event_type="community.notice.posted",
                    clan_id=clan_id,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now + timedelta(minutes=offset),
                    meta_json=json.dumps(
                        {
                            "source": "community_notice_board",
                            "reason": "community_notice_posted",
                            "body": body,
                            "word_count": 4,
                            "expiry_policy": "standard",
                            "expires_at": (now + timedelta(days=7)).isoformat(),
                            "comments_enabled": False,
                            "reactions_enabled": False,
                            "thread_enabled": False,
                        }
                    ),
                )
            )
        db.commit()

    list_res = client.get(
        "/community-notices",
        params={"clan_id": 1, "scope": "my_communities", "limit": 10},
    )
    assert list_res.status_code == 200, list_res.text
    payload = list_res.json()
    bodies = [item["body"] for item in payload["notices"]]

    assert payload["scope"] == "my_communities"
    assert payload["read_clan_ids"] == [1, 2]
    assert payload["source_community_count"] == 2
    assert payload["can_post_notice"] is True
    assert "Pillar welfare visit tomorrow." in bodies
    assert "Selected community meeting tonight." in bodies
    assert "Left community hidden notice." not in bodies
    pillar_notice = next(
        item for item in payload["notices"] if item["body"] == "Pillar welfare visit tomorrow."
    )
    assert pillar_notice["clan_id"] == 2
    assert pillar_notice["source_community_name"] == "Pillar of Hope"
    assert "Posting remains inside the selected community" in payload["boundary"]

    selected_res = client.get(
        "/community-notices",
        params={"clan_id": 1, "scope": "selected", "limit": 10},
    )
    assert selected_res.status_code == 200, selected_res.text
    selected_bodies = [item["body"] for item in selected_res.json()["notices"]]
    assert "Selected community meeting tonight." in selected_bodies
    assert "Pillar welfare visit tomorrow." not in selected_bodies

def test_community_notice_board_defaults_to_ten_live_announcements(client, override_current_user):
    _seed_notice_community()

    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        for index in range(11):
            db.add(
                TrustEvent(
                    event_type="community.notice.posted",
                    clan_id=1,
                    actor_user_id=1,
                    subject_user_id=1,
                    created_at=now + timedelta(minutes=index),
                    meta_json=json.dumps(
                        {
                            "source": "community_notice_board",
                            "reason": "community_notice_posted",
                            "body": f"Official bulletin notice {index + 1}",
                            "word_count": 4,
                            "expiry_policy": "standard",
                            "expires_at": (now + timedelta(days=7)).isoformat(),
                            "comments_enabled": False,
                            "reactions_enabled": False,
                            "thread_enabled": False,
                        }
                    ),
                )
            )
        db.commit()

    default_res = client.get("/community-notices", params={"clan_id": 1})
    assert default_res.status_code == 200, default_res.text
    default_notices = default_res.json()["notices"]
    assert len(default_notices) == 10
    assert default_notices[0]["body"] == "Official bulletin notice 11"
    assert default_notices[-1]["body"] == "Official bulletin notice 2"

    too_many_res = client.get("/community-notices", params={"clan_id": 1, "limit": 11})
    assert too_many_res.status_code == 422, too_many_res.text


def test_community_notice_board_keeps_marketplace_broadcasts_out_of_central_board(
    client, override_current_user
):
    _seed_notice_community()

    post_res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Official meeting stays on bulletin.",
        },
    )
    assert post_res.status_code == 200, post_res.text

    now = datetime.now(timezone.utc)
    with SessionLocal() as db:
        db.add(
            MarketplaceShop(
                id=1,
                clan_id=1,
                owner_user_id=2,
                name="Nevito food shop",
                description="Local food seller",
                whatsapp_number="+447717143500",
                is_active=True,
                created_at=now,
            )
        )
        db.add(
            MarketplaceBroadcast(
                id=1,
                clan_id=1,
                author_user_id=2,
                shop_id=1,
                message="Fresh rice bags available for collection today",
                image_url="/uploads/marketplace/images/rice.jpg",
                priority_mode="free",
                visibility_scope="direct_communities",
                expires_at=now + timedelta(days=2),
                created_at=now + timedelta(minutes=5),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 3})
    assert list_res.status_code == 200, list_res.text
    body = list_res.json()
    notices = body["notices"]

    assert len(notices) == 1
    assert notices[0]["source"] == "community_notice_board"
    assert notices[0]["body"] == "Official meeting stays on bulletin."
    assert all(notice.get("source") != "marketplace_broadcast" for notice in notices)
    assert all(notice.get("notice_scope") != "marketplace" for notice in notices)
    assert all("marketplace_broadcast_id" not in notice for notice in notices)
    assert body["previous_announcements"] == []

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


def test_community_notice_rejects_non_http_attachment_link(
    client, override_current_user
):
    _seed_notice_community()

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Choir practice Wednesday 7 pm.",
            "attachment_url": "javascript:alert(1)",
            "attachment_label": "Unsafe link",
        },
    )

    assert res.status_code == 422, res.text
    assert "http or https" in res.text


def test_community_notice_accepts_gsn_uploaded_media_attachment(
    client, override_current_user
):
    _seed_notice_community()

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Youth programme video is ready.",
            "attachment_url": "/uploads/marketplace/videos/programme.mp4",
            "attachment_label": "Open video",
            "attachment_kind": "video",
            "public_qr_enabled": True,
        },
    )

    assert res.status_code == 200, res.text
    notice = res.json()["notice"]
    assert notice["attachment_url"] == "/uploads/marketplace/videos/programme.mp4"
    assert notice["attachment_label"] == "Open video"
    assert notice["attachment_kind"] == "video"

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 3})
    assert list_res.status_code == 200, list_res.text
    listed = list_res.json()["notices"][0]
    assert listed["attachment_url"] == "/uploads/marketplace/videos/programme.mp4"
    assert listed["attachment_label"] == "Open video"
    assert listed["attachment_kind"] == "video"

    public_code = listed["public_code"]
    public_res = client.get(f"/community-notices/public/{public_code}")
    assert public_res.status_code == 200, public_res.text
    public_notice = public_res.json()["notice"]
    assert public_notice["attachment_url"] == "/uploads/marketplace/videos/programme.mp4"
    assert public_notice["attachment_label"] == "Open video"
    assert public_notice["attachment_kind"] == "video"


def test_community_notice_rejects_unowned_relative_attachment_path(
    client, override_current_user
):
    _seed_notice_community()

    res = client.post(
        "/community-notices",
        json={
            "clan_id": 1,
            "body": "Unsafe relative document path.",
            "attachment_url": "/uploads/private/document.pdf",
            "attachment_label": "Open document",
        },
    )

    assert res.status_code == 422, res.text
    assert "GSN uploaded media path" in res.text


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
                created_at=datetime.now(timezone.utc) - timedelta(days=10),
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "Legacy cultural day notice.",
                        "word_count": 4,
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
                created_at=datetime.now(timezone.utc),
                meta_json=json.dumps(
                    {
                        "source": "community_notice_board",
                        "reason": "community_notice_posted",
                        "body": "29th August 2026 is Igbo cultural association day.",
                        "word_count": 8,
                        "expiry_policy": "pinned",
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
    assert "Legacy cultural day notice." not in bodies
    assert "29th August 2026 is Igbo cultural association day." not in bodies
    previous_bodies = [item["body"] for item in payload["previous_announcements"]]
    assert "29th August 2026 is Igbo cultural association day." in previous_bodies
    assert payload["archived_notice_count"] == 3

    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.notice.posted")
            .count()
            == 4
        )



def test_community_notice_board_includes_linked_domain_notices_and_previous_trail(
    client, override_current_user
):
    _seed_notice_community()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        domain_owner = User(
            id=4,
            email="domain-owner@example.com",
            hashed_password="hashed",
            role="user",
        )
        db.add(domain_owner)
        db.flush()
        linked_domain = CommunityDomain(
            id=10,
            domain_name="igbo-cultural-association",
            display_name="Igbo Cultural Association",
            domain_type="generic_association",
            template_key="generic_association",
            owner_user_id=4,
            clan_id=1,
            status="active",
            verification_status="verified",
        )
        off_domain = CommunityDomain(
            id=11,
            domain_name="quiet-domain",
            display_name="Quiet Domain",
            domain_type="generic_association",
            template_key="generic_association",
            owner_user_id=4,
            clan_id=1,
            status="active",
            verification_status="verified",
        )
        db.add_all([linked_domain, off_domain])
        db.flush()
        db.add(
            CommunityDomainPolicy(
                community_domain_id=11,
                policy_key="domain.feature_policy",
                action_key="domain.feature_policy.update",
                status="active",
                config_json=json.dumps({"features": {"announcement_board": "off"}}),
                created_by_user_id=4,
            )
        )
        db.add(
            TrustEvent(
                event_type="community_domain.notice.posted",
                clan_id=1,
                actor_user_id=4,
                subject_user_id=4,
                created_at=now,
                meta_json=json.dumps(
                    {
                        "source": "community_domain_notice_board",
                        "reason": "community_domain_notice_posted",
                        "community_domain_id": 10,
                        "body": "Igbo cultural association meeting this week.",
                        "word_count": 6,
                        "expiry_policy": "standard",
                        "expires_at": (now + timedelta(days=7)).isoformat(),
                        "public_qr_enabled": True,
                        "public_code": "public-domain-code",
                    }
                ),
            )
        )
        for index in range(12):
            db.add(
                TrustEvent(
                    event_type="community_domain.notice.posted",
                    clan_id=1,
                    actor_user_id=4,
                    subject_user_id=4,
                    created_at=now - timedelta(days=10, minutes=index),
                    meta_json=json.dumps(
                        {
                            "source": "community_domain_notice_board",
                            "reason": "community_domain_notice_posted",
                            "community_domain_id": 10,
                            "body": f"Expired domain notice {index}.",
                            "word_count": 4,
                            "expiry_policy": "standard",
                        }
                    ),
                )
            )
        db.add(
            TrustEvent(
                event_type="community_domain.notice.posted",
                clan_id=1,
                actor_user_id=4,
                subject_user_id=4,
                created_at=now,
                meta_json=json.dumps(
                    {
                        "source": "community_domain_notice_board",
                        "reason": "community_domain_notice_posted",
                        "community_domain_id": 11,
                        "body": "Hidden domain board notice.",
                        "word_count": 4,
                        "expiry_policy": "standard",
                        "expires_at": (now + timedelta(days=7)).isoformat(),
                    }
                ),
            )
        )
        db.commit()

    list_res = client.get("/community-notices", params={"clan_id": 1, "limit": 5})

    assert list_res.status_code == 200, list_res.text
    payload = list_res.json()
    bodies = [item["body"] for item in payload["notices"]]
    assert "Igbo cultural association meeting this week." in bodies
    assert "Hidden domain board notice." not in bodies
    domain_notice = next(
        item
        for item in payload["notices"]
        if item["body"] == "Igbo cultural association meeting this week."
    )
    assert domain_notice["source"] == "community_domain_notice_board"
    assert domain_notice["notice_scope"] == "community_domain"
    assert domain_notice["notice_kind"] == "official_domain_notice"
    assert domain_notice["source_domain_name"] == "Igbo Cultural Association"
    assert domain_notice["public_qr_enabled"] is True
    assert domain_notice["public_path"] == "/community-notices/public-domain-code"
    assert domain_notice["acknowledgement_enabled"] is True
    assert domain_notice["acknowledgement_summary"] == {
        "acknowledged": 0,
        "own_acknowledged": False,
    }
    ack_res = client.post(
        f"/community-notices/{domain_notice['event_id']}/acknowledgements",
        json={"clan_id": 1},
    )
    assert ack_res.status_code == 200, ack_res.text
    assert ack_res.json()["acknowledgement_summary"] == {
        "acknowledged": 1,
        "own_acknowledged": True,
    }
    assert payload["previous_announcement_limit"] == 10
    assert len(payload["previous_announcements"]) == 10
    previous_bodies = [item["body"] for item in payload["previous_announcements"]]
    assert "Expired domain notice 0." in previous_bodies
    assert "Expired domain notice 10." not in previous_bodies
    assert all(item["active_board_status"] == "archived" for item in payload["previous_announcements"])

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


def test_member_record_submission_policy_routes_member_notice_to_review_queue(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")
    _seed_notice_reviewer()
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

    assert res.status_code == 200, res.text
    payload = res.json()
    assert payload["submitted_for_review"] is True
    assert payload["submission"]["body"] == "Member record needs admin review first."
    assert payload["submission"]["review_status"] == "pending"
    assert payload["community_records_policy"]["admin_approval_required_for_records"] is True
    assert payload["admin_notifications_created"] == 1
    assert payload["notifications_created"] == 1
    assert "not visible" in payload["boundary"]

    with SessionLocal() as db:
        notification = db.query(Notification).filter(
            Notification.kind == "community.notice.submitted"
        ).one()
        assert notification.user_id == 2
        assert f"notice_review_submission_id={payload['submission']['submission_event_id']}" in notification.action_url
        assert notification.action_label == "Review record"
        assert notification.is_read is False

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    list_payload = list_res.json()
    assert list_payload["notices"] == []
    assert list_payload["can_post_notice"] is False
    assert list_payload["can_submit_notice_for_review"] is True

    with SessionLocal() as db:
        membership = db.query(ClanMembership).filter(ClanMembership.user_id == 1).one()
        membership.role = "admin"
        db.commit()

    queue_res = client.get("/community-notices/review-queue", params={"clan_id": 1})
    assert queue_res.status_code == 200, queue_res.text
    queue_payload = queue_res.json()
    assert queue_payload["pending_review_count"] == 1
    submission = queue_payload["submissions"][0]
    assert submission["body"] == "Member record needs admin review first."

    approve_res = client.post(
        f"/community-notices/review-queue/{submission['submission_event_id']}/decision",
        json={
            "clan_id": 1,
            "decision": "approve",
            "reviewer_note": "Approved from Community Records review.",
        },
    )
    assert approve_res.status_code == 200, approve_res.text
    approve_payload = approve_res.json()
    assert approve_payload["decision"] == "approve"
    assert approve_payload["notice"]["body"] == "Member record needs admin review first."
    assert approve_payload["notice"]["review_status"] == "approved"
    assert approve_payload["notice"]["approved_submission_event_id"] == submission["submission_event_id"]
    assert approve_payload["review_notifications_retired"] == 1
    assert approve_payload["submitter_notification_created"] == 1

    repeat_res = client.post(
        f"/community-notices/review-queue/{submission['submission_event_id']}/decision",
        json={"clan_id": 1, "decision": "approve"},
    )
    assert repeat_res.status_code == 409, repeat_res.text

    final_list_res = client.get("/community-notices", params={"clan_id": 1})
    assert final_list_res.status_code == 200, final_list_res.text
    final_payload = final_list_res.json()
    assert len(final_payload["notices"]) == 1
    assert final_payload["notices"][0]["body"] == "Member record needs admin review first."
    assert final_payload["pending_notice_review_count"] == 0

    with SessionLocal() as db:
        assert db.query(TrustEvent).filter(TrustEvent.event_type == "community.notice.submitted").count() == 1
        assert db.query(TrustEvent).filter(TrustEvent.event_type == "community.notice.review_decided").count() == 1
        assert db.query(TrustEvent).filter(TrustEvent.event_type == "community.notice.posted").count() == 1
        notification = db.query(Notification).filter(
            Notification.kind == "community.notice.submitted"
        ).one()
        assert notification.is_read is True
        assert notification.read_at is not None
        result_notification = db.query(Notification).filter(
            Notification.kind == "community.notice.review_decided"
        ).one()
        assert result_notification.user_id == 1
        assert result_notification.title == "Community record approved"
        assert result_notification.action_label == "Open Community"
        assert f"notice_review_submission_id={submission['submission_event_id']}" in result_notification.action_url


def test_member_record_review_rejection_records_decision_without_publishing(
    client, override_current_user_user
):
    _seed_notice_community(membership_role="member")
    _seed_notice_reviewer()
    _seed_notice_governance_profile_event(
        enable_community_records=True,
        allow_member_record_submissions=True,
        require_admin_approval_for_records=True,
    )

    submit_res = client.post(
        "/community-notices",
        json={"clan_id": 1, "body": "This record should not publish."},
    )
    assert submit_res.status_code == 200, submit_res.text
    submit_payload = submit_res.json()
    assert submit_payload["admin_notifications_created"] == 1
    submission_id = submit_payload["submission"]["submission_event_id"]

    with SessionLocal() as db:
        notification = db.query(Notification).filter(
            Notification.kind == "community.notice.submitted"
        ).one()
        assert notification.user_id == 2
        assert f"notice_review_submission_id={submission_id}" in notification.action_url
        assert notification.is_read is False

    with SessionLocal() as db:
        membership = db.query(ClanMembership).filter(ClanMembership.user_id == 1).one()
        membership.role = "admin"
        db.commit()

    reject_res = client.post(
        f"/community-notices/review-queue/{submission_id}/decision",
        json={
            "clan_id": 1,
            "decision": "reject",
            "reviewer_note": "Rejected from Community Records review.",
        },
    )
    assert reject_res.status_code == 200, reject_res.text
    reject_payload = reject_res.json()
    assert reject_payload["decision"] == "reject"
    assert reject_payload["notice"] is None
    assert reject_payload["review_notifications_retired"] == 1
    assert reject_payload["submitter_notification_created"] == 1
    assert "without publishing" in reject_payload["message"]

    final_list_res = client.get("/community-notices", params={"clan_id": 1})
    assert final_list_res.status_code == 200, final_list_res.text
    assert final_list_res.json()["notices"] == []

    queue_res = client.get("/community-notices/review-queue", params={"clan_id": 1})
    assert queue_res.status_code == 200, queue_res.text
    assert queue_res.json()["submissions"] == []

    with SessionLocal() as db:
        assert db.query(TrustEvent).filter(TrustEvent.event_type == "community.notice.review_decided").count() == 1
        assert db.query(TrustEvent).filter(TrustEvent.event_type == "community.notice.posted").count() == 0
        notification = db.query(Notification).filter(
            Notification.kind == "community.notice.submitted"
        ).one()
        assert notification.is_read is True
        assert notification.read_at is not None
        result_notification = db.query(Notification).filter(
            Notification.kind == "community.notice.review_decided"
        ).one()
        assert result_notification.user_id == 1
        assert result_notification.title == "Community record was not posted"
        assert result_notification.action_label == "Open Community"
        assert f"notice_review_submission_id={submission_id}" in result_notification.action_url


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
