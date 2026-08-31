from __future__ import annotations

import json
from datetime import datetime, timezone

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import Clan, ClanMembership, TrustEvent, User, UserSettings


def _seed_community_admin(
    *,
    phone_e164: str | None = "+447700900123",
    phone_verified: bool = True,
    show_whatsapp_public: bool | None = None,
) -> None:
    if show_whatsapp_public is not None:
        UserSettings.__table__.create(bind=engine, checkfirst=True)

    with SessionLocal() as db:
        user = User(
            id=1,
            email="admin@example.com",
            hashed_password="hashed",
            role="admin",
            phone_e164=phone_e164,
            phone_verified_at=datetime.now(timezone.utc) if phone_verified else None,
        )
        clan = Clan(
            id=1,
            name="Nigerian Society",
            invite_code="nigerian-society",
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
                role="admin",
                personal_pool_balance=0,
            )
        )
        if show_whatsapp_public is not None:
            db.add(
                UserSettings(
                    user_id=1,
                    show_whatsapp_public=show_whatsapp_public,
                )
            )
        db.commit()


def test_clans_me_exposes_verified_public_admin_contact(client, override_current_user):
    _seed_community_admin()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    item = res.json()["items"][0]
    assert item["role"] == "admin"
    assert item["member_role"] == "admin"
    assert item["membership_role"] == "admin"
    assert item["official_contact_ready"] is True
    assert item["official_whatsapp_number"] == "+447700900123"
    assert item["official_whatsapp_label"] == "admin@example.com"
    assert item["governance_profile"] is None


def test_clans_me_exposes_recorded_governance_profile(client, override_current_user):
    _seed_community_admin()

    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="community.governance_profile_selected",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta_json=json.dumps(
                    {
                        "reason": "entry_governance_profile_selected",
                        "community_type": "migrant_community",
                        "community_type_label": "Migrant Community",
                        "governance_weight": "light",
                        "governance_weight_label": "Light",
                        "preset_key": "light_migrant_support_network",
                        "preset_label": "Light Migrant Support Network",
                        "verification_mode": "light_member_verification",
                        "policies": {
                            "allow_public_invite_link": True,
                            "require_admin_approval_after_invite": True,
                        },
                        "requirements": {
                            "member_phone_required": True,
                            "passport_required_by_default": False,
                        },
                        "truth_boundary": "Recorded as setup evidence only.",
                        "private_debug_note": "do not expose",
                    }
                ),
                created_at=datetime(2026, 8, 31, 12, 0, tzinfo=timezone.utc),
            )
        )
        db.commit()

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    profile = res.json()["items"][0]["governance_profile"]
    assert profile["community_type"] == "migrant_community"
    assert profile["governance_weight"] == "light"
    assert profile["preset_key"] == "light_migrant_support_network"
    assert profile["policies"]["require_admin_approval_after_invite"] is True
    assert profile["requirements"]["passport_required_by_default"] is False
    assert profile["source_event_id"] > 0
    assert profile["recorded_at"]
    assert "private_debug_note" not in profile
    assert "reason" not in profile

def test_clans_me_hides_admin_contact_when_whatsapp_public_is_disabled(
    client, override_current_user
):
    _seed_community_admin(show_whatsapp_public=False)

    res = client.get("/clans/me")

    assert res.status_code == 200, res.text
    item = res.json()["items"][0]
    assert item["official_contact_ready"] is False
    assert item["official_whatsapp_number"] is None
    assert item["official_whatsapp_label"] is None


def test_demand_box_uses_verified_public_profile_contact_when_request_has_no_override(
    client, override_current_user
):
    _seed_community_admin()

    create_res = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Need accommodation near RGU",
            "description": "Looking for safe short-term room options.",
        },
    )

    assert create_res.status_code == 200, create_res.text
    assert create_res.json()["whatsapp_number"] == "+447700900123"

    list_res = client.get("/marketplace/requests", params={"clan_id": 1})
    assert list_res.status_code == 200, list_res.text
    assert list_res.json()[0]["whatsapp_number"] == "+447700900123"


def test_demand_box_does_not_use_unverified_profile_phone(client, override_current_user):
    _seed_community_admin(phone_verified=False)

    create_res = client.post(
        "/marketplace/requests",
        json={
            "clan_id": 1,
            "title": "Need transport",
            "description": "Need a lift after the meeting.",
        },
    )

    assert create_res.status_code == 200, create_res.text
    assert create_res.json()["whatsapp_number"] is None

    with engine.begin() as conn:
        stored = conn.execute(
            text("SELECT whatsapp_number FROM marketplace_requests")
        ).scalar_one()
    assert stored is None
