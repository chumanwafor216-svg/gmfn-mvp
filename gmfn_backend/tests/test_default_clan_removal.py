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
