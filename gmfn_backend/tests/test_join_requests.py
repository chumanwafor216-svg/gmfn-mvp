from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanInvite, ClanJoinRequest, ClanMembership, User


def _seed_join_context(*, invite_code: str = "legacy-code") -> None:
    with SessionLocal() as db:
        admin = User(id=1, email="admin@example.com", hashed_password="hashed", role="admin")
        clan = Clan(
            id=1,
            name="Aberdeen City ICA",
            marketplace_name="Aberdeen city marketplace",
            invite_code=invite_code,
            invite_created_at=datetime.now(timezone.utc),
            invite_expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            invite_uses=0,
        )
        db.add(admin)
        db.add(clan)
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


def _join_payload(invite_code: str) -> dict[str, str]:
    return {
        "invite_code": invite_code,
        "first_name": "Arinze",
        "surname": "Nnamani",
        "phone_e164": "+2349071733533",
        "country": "Nigeria",
        "business_name": "Business",
        "note": "With God all things are possible",
    }


def test_public_join_request_accepts_clan_invite_record_code(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("package-code"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["community_name"] == "Aberdeen City ICA"
    assert data["request"]["invite_id"] == 1
    assert data["lineage"]["invite_id"] == 1
    assert data["lineage"]["invited_by_user_id"] == 1

    with SessionLocal() as db:
        invite = db.get(ClanInvite, 1)
        join_request = db.query(ClanJoinRequest).first()
        assert invite is not None
        assert invite.uses == 1
        assert join_request is not None
        assert join_request.invite_id == 1


def test_public_join_invite_preview_reports_ready_invite(client):
    _seed_join_context()

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="package-code",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=7),
            )
        )
        db.commit()

    res = client.get("/clans/join-invite/preview?code=package-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is True
    assert data["status"] == "ready"
    assert data["community_name"] == "Aberdeen City ICA"
    assert data["invite_id"] == 1


def test_public_join_invite_preview_reports_invalid_invite_without_throwing(client):
    _seed_join_context()

    res = client.get("/clans/join-invite/preview?code=missing-code")

    assert res.status_code == 200, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["valid"] is False
    assert data["status"] == "not_found"
    assert "fresh GSN invite link" in data["message"]


def test_public_join_request_accepts_short_lived_invite_during_daily_pilot_window(client):
    _seed_join_context()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="short-lived-package",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=now - timedelta(hours=2),
                expires_at=now - timedelta(hours=1),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("short-lived-package"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["request"]["invite_id"] == 1


def test_public_join_request_rejects_short_lived_invite_after_daily_pilot_window(client):
    _seed_join_context()
    now = datetime.now(timezone.utc)

    with SessionLocal() as db:
        db.add(
            ClanInvite(
                id=1,
                clan_id=1,
                created_by_user_id=1,
                code="old-short-lived-package",
                is_active=True,
                max_uses=3,
                uses=0,
                created_at=now - timedelta(hours=26),
                expires_at=now - timedelta(hours=25),
            )
        )
        db.commit()

    res = client.post("/clans/join-requests", json=_join_payload("old-short-lived-package"))

    assert res.status_code == 400, res.text
    assert res.json()["detail"] == "Invitation has expired"


def test_public_join_request_still_accepts_legacy_community_invite_code(client):
    _seed_join_context(invite_code="legacy-code")

    res = client.post("/clans/join-requests", json=_join_payload("legacy-code"))

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["ok"] is True
    assert data["request"]["invite_id"] is None
    assert data["lineage"]["invited_by_user_id"] == 1

    with SessionLocal() as db:
        clan = db.get(Clan, 1)
        assert clan is not None
        assert clan.invite_uses == 1
