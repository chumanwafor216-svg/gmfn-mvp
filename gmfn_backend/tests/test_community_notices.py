from __future__ import annotations

from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, User


def _seed_notice_community(*, membership_role: str = "admin") -> None:
    with SessionLocal() as db:
        user = User(
            id=1,
            email="notice-admin@example.com",
            hashed_password="hashed",
            role="admin" if membership_role == "admin" else "user",
        )
        clan = Clan(
            id=1,
            name="Nigerian Society",
            invite_code="notice-board-test",
            invite_created_at=datetime.now(timezone.utc),
            created_by_user_id=1,
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
    notice = post_res.json()["notice"]
    assert notice["body"] == "Meeting Saturday 4 pm."
    assert notice["word_count"] == 4

    list_res = client.get("/community-notices", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    body = list_res.json()
    assert body["comments_enabled"] is False
    assert body["reactions_enabled"] is False
    assert body["thread_enabled"] is False
    assert body["notices"][0]["body"] == "Meeting Saturday 4 pm."


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


def test_non_officer_cannot_post_community_notice(
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

    assert res.status_code == 403, res.text
    assert "community officer" in res.text


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

