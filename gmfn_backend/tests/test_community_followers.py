from __future__ import annotations

import json
import os
from datetime import datetime, timezone

from app.core.security import create_access_token
from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, CommunityFollower, TrustEvent, User
from app.services.trust_slips_services import get_trust_slip_payload


def _seed_followable_community() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email="community-owner@example.com",
                    hashed_password="hashed",
                    display_name="Community Owner",
                    role="user",
                    gmfn_id="GMFN-U-COMMOWNER",
                ),
                User(
                    id=2,
                    email="community-follower@example.com",
                    hashed_password="hashed",
                    display_name="Community Follower",
                    role="user",
                    gmfn_id="GMFN-U-COMMFOLLOW",
                ),
                Clan(
                    id=1,
                    name="Followable Community",
                    marketplace_name="Followable Marketplace",
                    community_code="GMFN-C-FOLLOW",
                    invite_code="community-follow-code",
                    status="active",
                    invite_uses=0,
                    created_at=datetime.now(timezone.utc),
                ),
                ClanMembership(
                    clan_id=1,
                    user_id=2,
                    role="user",
                ),
            ]
        )
        db.commit()


def test_community_follow_status_count_unfollow_and_neutral_trust_events(client):
    os.environ["SECRET_KEY"] = "pytest-community-follow-secret"
    _seed_followable_community()
    token = create_access_token({"sub": "community-follower@example.com"})
    headers = {"Authorization": f"Bearer {token}"}

    status_before = client.get("/clans/1/follow-status", headers=headers)
    assert status_before.status_code == 200, status_before.text
    assert status_before.json()["is_following"] is False
    assert status_before.json()["can_follow"] is True
    assert status_before.json()["follower_count"] == 0

    first_follow = client.post("/clans/1/follow", headers=headers)
    assert first_follow.status_code == 200, first_follow.text
    assert first_follow.json()["is_following"] is True
    assert first_follow.json()["already_following"] is False
    assert first_follow.json()["follower_count"] == 1

    with SessionLocal() as db:
        assert db.query(CommunityFollower).count() == 1
        follow_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.followed")
            .all()
        )
    assert len(follow_events) == 1
    assert int(follow_events[0].clan_id) == 1
    assert int(follow_events[0].actor_user_id) == 2
    assert int(follow_events[0].subject_user_id) == 2
    follow_meta = json.loads(follow_events[0].meta_json)
    assert follow_meta["community_id"] == 1
    assert follow_meta["trust_delta"] == "0.00"
    assert follow_meta["signal_strength"] == "weak_group_interest"
    assert follow_meta["group_context"] is True
    assert follow_meta["not_membership"] is True
    assert follow_meta["not_endorsement"] is True
    assert follow_meta["not_verification"] is True
    assert follow_meta["not_payment_evidence"] is True

    with SessionLocal() as db:
        trustslip = get_trust_slip_payload(db, user_id=2)
    assert trustslip["community_activity_count"] == 1
    assert trustslip["community_activity_categories"] == ["Community attention"]

    second_follow = client.post("/clans/1/follow", headers=headers)
    assert second_follow.status_code == 200, second_follow.text
    assert second_follow.json()["already_following"] is True
    assert second_follow.json()["follower_count"] == 1
    with SessionLocal() as db:
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.followed")
            .count()
        ) == 1

    public_count = client.get("/clans/1/followers/count")
    assert public_count.status_code == 200, public_count.text
    assert public_count.json()["follower_count"] == 1

    unfollow = client.delete("/clans/1/follow", headers=headers)
    assert unfollow.status_code == 200, unfollow.text
    assert unfollow.json()["is_following"] is False
    assert unfollow.json()["follower_count"] == 0

    with SessionLocal() as db:
        assert db.query(CommunityFollower).count() == 0
        unfollow_events = (
            db.query(TrustEvent)
            .filter(TrustEvent.event_type == "community.unfollowed")
            .all()
        )
    assert len(unfollow_events) == 1
    assert int(unfollow_events[0].clan_id) == 1
    assert int(unfollow_events[0].actor_user_id) == 2
    assert int(unfollow_events[0].subject_user_id) == 2
    unfollow_meta = json.loads(unfollow_events[0].meta_json)
    assert unfollow_meta["trust_delta"] == "0.00"
    assert unfollow_meta["signal_strength"] == "weak_group_interest"
    assert unfollow_meta["not_membership"] is True
