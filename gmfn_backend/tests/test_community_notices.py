from __future__ import annotations

from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, User
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
