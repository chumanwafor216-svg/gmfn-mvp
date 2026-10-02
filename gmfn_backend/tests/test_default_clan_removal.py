from __future__ import annotations

from datetime import datetime, timezone

import pytest
from fastapi import HTTPException

from app.core import clan_auth
from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, User


def test_list_my_clans_hides_default_clan_from_visible_results(client, override_current_user):
    with SessionLocal() as db:
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        default_clan = Clan(
            id=1,
            name="Default Clan",
            invite_code="default-code",
            invite_created_at=datetime.now(timezone.utc),
        )
        db.add_all([user, default_clan])
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0


def test_list_my_clans_returns_multiple_active_non_default_memberships(client, override_current_user):
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        first_clan = Clan(
            id=2,
            name="Active Clan One",
            invite_code="active-one",
            community_code="GMFN-C-ACTIVE-ONE",
            status="active",
            invite_created_at=now,
        )
        second_clan = Clan(
            id=3,
            name="Active Clan Two",
            invite_code="active-two",
            community_code="GMFN-C-ACTIVE-TWO",
            status="active",
            invite_created_at=now,
        )
        db.add_all([user, first_clan, second_clan])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=2,
                    user_id=1,
                    role="admin",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=3,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 2
    assert [item["id"] for item in data["items"]] == [3, 2]


def test_list_my_clans_hides_inactive_left_or_default_communities(client, override_current_user):
    with SessionLocal() as db:
        now = datetime.now(timezone.utc)
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        visible_clan = Clan(
            id=2,
            name="Visible Clan",
            invite_code="visible-code",
            community_code="GMFN-C-VISIBLE",
            status="active",
            invite_created_at=now,
        )
        inactive_clan = Clan(
            id=3,
            name="Inactive Clan",
            invite_code="inactive-code",
            community_code="GMFN-C-INACTIVE",
            status="inactive",
            invite_created_at=now,
        )
        left_clan = Clan(
            id=4,
            name="Left Clan",
            invite_code="left-code",
            community_code="GMFN-C-LEFT",
            status="active",
            invite_created_at=now,
        )
        default_clan = Clan(
            id=5,
            name="Default Clan",
            invite_code="default-code",
            community_code="GMFN-C-DEFAULT",
            status="active",
            invite_created_at=now,
        )
        db.add_all([user, visible_clan, inactive_clan, left_clan, default_clan])
        db.flush()
        db.add_all(
            [
                ClanMembership(
                    id=2,
                    clan_id=2,
                    user_id=1,
                    role="admin",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=3,
                    clan_id=3,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                ),
                ClanMembership(
                    id=4,
                    clan_id=4,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                    left_at=now,
                ),
                ClanMembership(
                    id=5,
                    clan_id=5,
                    user_id=1,
                    role="member",
                    personal_pool_balance=0,
                ),
            ]
        )
        db.commit()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["total"] == 1
    assert data["items"][0]["id"] == 2

def test_get_current_clan_membership_no_longer_falls_back_to_default_clan():
    with SessionLocal() as db:
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        default_clan = Clan(
            id=1,
            name="Default Clan",
            invite_code="default-code",
            invite_created_at=datetime.now(timezone.utc),
        )
        db.add_all([user, default_clan])
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

        with pytest.raises(HTTPException) as exc:
            clan_auth.get_current_clan_membership(
                x_clan_id=None,
                db=db,
                current_user=user,
            )

    assert exc.value.status_code == 404
    assert "Create or join a community first" in str(exc.value.detail)


def test_get_current_clan_membership_rejects_explicit_non_member_clan():
    with SessionLocal() as db:
        user = User(
            id=1,
            email="member@example.com",
            hashed_password="hashed",
            role="user",
        )
        other_clan = Clan(
            id=2,
            name="Other Clan",
            invite_code="other-code",
            invite_created_at=datetime.now(timezone.utc),
        )
        db.add_all([user, other_clan])
        db.commit()

        with pytest.raises(HTTPException) as exc:
            clan_auth.get_current_clan_membership(
                x_clan_id=2,
                db=db,
                current_user=user,
            )

        memberships = db.query(ClanMembership).all()

    assert exc.value.status_code == 403
    assert "Join or be approved" in str(exc.value.detail)
    assert memberships == []


def test_get_current_clan_membership_accepts_explicit_active_member_clan():
    with SessionLocal() as db:
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        clan = Clan(
            id=2,
            name="Active Clan",
            invite_code="active-code",
            invite_created_at=datetime.now(timezone.utc),
        )
        db.add_all([user, clan])
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=2,
                user_id=1,
                role="user",
                personal_pool_balance=0,
            )
        )
        db.commit()

        selected_clan, membership, current_user = clan_auth.get_current_clan_membership(
            x_clan_id=2,
            db=db,
            current_user=user,
        )
        selected_clan_id = int(selected_clan.id)
        current_user_id = int(current_user.id)
        membership_role = membership.role

    assert selected_clan_id == 2
    assert current_user_id == 1
    assert membership_role == "admin"


def test_list_my_clans_hides_legacy_gmfn_default_clan_from_visible_results(
    client, override_current_user
):
    with SessionLocal() as db:
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
        )
        default_clan = Clan(
            id=1,
            name="GMFN Default Clan",
            invite_code="default-code",
            invite_created_at=datetime.now(timezone.utc),
        )
        db.add_all([user, default_clan])
        db.flush()
        db.add(
            ClanMembership(
                id=1,
                clan_id=1,
                user_id=1,
                role="admin",
                personal_pool_balance=0,
            )
        )
        db.commit()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["items"] == []
    assert data["total"] == 0
