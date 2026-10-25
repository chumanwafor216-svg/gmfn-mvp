from __future__ import annotations

from datetime import datetime, timezone
from types import SimpleNamespace

import pytest

from app.core.auth import get_current_user
from app.db.database import SessionLocal
from app.db.models import (
    Clan,
    ClanInvite,
    ClanMembership,
    MarketplaceShop,
    ProtectedTradeRecord,
    SpotlightCampaign,
    User,
)
from app.main import app


@pytest.fixture(autouse=True)
def _clear_auth_override():
    yield
    app.dependency_overrides.pop(get_current_user, None)


def _login(user_id: int) -> None:
    app.dependency_overrides[get_current_user] = lambda: SimpleNamespace(id=user_id)


def _seed_users() -> None:
    with SessionLocal() as db:
        db.add_all(
            [
                User(
                    id=1,
                    email="referrer@example.com",
                    hashed_password="hashed",
                    display_name="Ada Referrer",
                    gmfn_id="GMFN-U-REF001",
                    role="user",
                ),
                User(
                    id=2,
                    email="participant@example.com",
                    hashed_password="hashed",
                    display_name="Bola Participant",
                    gmfn_id="GMFN-U-PART002",
                    role="user",
                ),
                User(
                    id=3,
                    email="other@example.com",
                    hashed_password="hashed",
                    display_name="Chidi Other",
                    gmfn_id="GMFN-U-OTHR003",
                    role="user",
                ),
            ]
        )
        db.commit()


def _claim(client, *, reference: str, source_kind: str = "direct_referral"):
    return client.post(
        "/network-growth/attributions",
        json={
            "participant_gsn_id": "gmfn-u-part002",
            "source_kind": source_kind,
            "participant_kind": "seller",
            "source_reference": reference,
            "evidence_note": "Introduced during a local business discussion.",
        },
    )


def test_participant_controls_acceptance_and_financial_boundary(client):
    _seed_users()
    _login(1)
    created = _claim(client, reference="meeting-001")
    assert created.status_code == 201, created.text
    claim = created.json()
    assert claim["status"] == "pending"
    assert claim["authority"] == "awaiting_participant"
    assert claim["financial_effect"] == "none"
    assert claim["activation_evidence"] is None

    forbidden = client.post(f"/network-growth/attributions/{claim['id']}/accept")
    assert forbidden.status_code == 403

    _login(2)
    mine = client.get("/network-growth/attributions/mine")
    assert mine.status_code == 200, mine.text
    body = mine.json()
    assert len(body["incoming"]) == 1
    assert body["incoming"][0]["activation_evidence"] is not None
    assert body["outgoing"] == []
    assert body["financial_effect"] == "none"

    accepted = client.post(f"/network-growth/attributions/{claim['id']}/accept")
    assert accepted.status_code == 200, accepted.text
    accepted_body = accepted.json()
    assert accepted_body["status"] == "accepted"
    assert accepted_body["authority"] == "participant_confirmed"
    assert accepted_body["accepted_at"] is not None


def test_competing_statements_are_superseded_by_one_participant_choice(client):
    _seed_users()
    _login(1)
    first = _claim(client, reference="meeting-first")
    assert first.status_code == 201, first.text

    _login(3)
    second = _claim(client, reference="meeting-second")
    assert second.status_code == 201, second.text

    _login(2)
    accepted = client.post(
        f"/network-growth/attributions/{first.json()['id']}/accept"
    )
    assert accepted.status_code == 200, accepted.text

    mine = client.get("/network-growth/attributions/mine").json()
    states = {row["id"]: row["status"] for row in mine["incoming"]}
    assert states[first.json()["id"]] == "accepted"
    assert states[second.json()["id"]] == "superseded"

    _login(3)
    blocked = _claim(client, reference="meeting-third")
    assert blocked.status_code == 409


def test_participant_can_challenge_an_accepted_claim_and_allow_new_review(client):
    _seed_users()
    _login(1)
    first = _claim(client, reference="meeting-first").json()
    _login(2)
    assert client.post(
        f"/network-growth/attributions/{first['id']}/accept"
    ).status_code == 200
    challenged = client.post(
        f"/network-growth/attributions/{first['id']}/challenge",
        json={"reason": "This person did not introduce me to GSN."},
    )
    assert challenged.status_code == 200, challenged.text
    assert challenged.json()["status"] == "challenged"
    assert challenged.json()["authority"] == "participant_challenged"

    _login(3)
    replacement = _claim(client, reference="actual-introduction")
    assert replacement.status_code == 201, replacement.text
    assert replacement.json()["status"] == "pending"


def test_invite_source_requires_exact_existing_invite_membership(client):
    _seed_users()
    with SessionLocal() as db:
        clan = Clan(
            id=10,
            name="Growth Test Community",
            status="active",
            invite_code="growth-test-community",
        )
        db.add(clan)
        db.flush()
        invite = ClanInvite(
            id=20,
            clan_id=10,
            created_by_user_id=1,
            code="growth-invite",
            is_active=True,
            max_uses=1,
            uses=1,
            created_at=datetime.now(timezone.utc),
        )
        db.add(invite)
        db.flush()
        db.add(
            ClanMembership(
                clan_id=10,
                user_id=2,
                role="user",
                invited_by_user_id=1,
                invite_id=20,
            )
        )
        db.commit()

    _login(1)
    verified = client.post(
        "/network-growth/attributions",
        json={
            "participant_gsn_id": "GMFN-U-PART002",
            "source_kind": "community_invite",
            "invite_id": 20,
            "clan_id": 10,
        },
    )
    assert verified.status_code == 201, verified.text
    assert verified.json()["source_evidence_status"] == "verified_invite_record"

    _login(3)
    denied = client.post(
        "/network-growth/attributions",
        json={
            "participant_gsn_id": "GMFN-U-PART002",
            "source_kind": "community_invite",
            "invite_id": 20,
        },
    )
    assert denied.status_code == 403


def test_activation_evidence_is_derived_only_for_the_participant(client):
    _seed_users()
    with SessionLocal() as db:
        db.add(
            Clan(
                id=10,
                name="Activation Community",
                status="active",
                invite_code="activation-community",
            )
        )
        db.flush()
        db.add(ClanMembership(clan_id=10, user_id=2, role="user"))
        shop = MarketplaceShop(clan_id=10, owner_user_id=2, name="Bola Shop")
        db.add(shop)
        db.flush()
        db.add(
            SpotlightCampaign(
                owner_user_id=2,
                shop_id=shop.id,
                origin_clan_id=10,
                content_fingerprint="growth-test-campaign",
                source_kind="direct_broadcast",
            )
        )
        db.add(
            ProtectedTradeRecord(
                trade_code="GSN-TRADE-GROWTH-001",
                clan_id=10,
                creator_user_id=2,
                seller_user_id=2,
                buyer_user_id=1,
                shop_id=shop.id,
            )
        )
        db.commit()

    _login(1)
    claim = _claim(client, reference="activation-evidence").json()
    outgoing = client.get("/network-growth/attributions/mine").json()["outgoing"][0]
    assert outgoing["activation_evidence"] is None

    _login(2)
    incoming = client.get("/network-growth/attributions/mine").json()["incoming"][0]
    evidence = incoming["activation_evidence"]
    assert evidence["community_membership"]["recorded"] is True
    assert evidence["shop_created"]["recorded"] is True
    assert evidence["spotlight_campaign_activated"]["recorded"] is True
    assert evidence["protected_trade_recorded"]["recorded"] is True
    assert "not reward eligibility" in evidence["boundary"]
    assert incoming["id"] == claim["id"]


def test_self_claim_and_unreferenced_manual_claim_are_rejected(client):
    _seed_users()
    _login(2)
    self_claim = client.post(
        "/network-growth/attributions",
        json={
            "participant_gsn_id": "GMFN-U-PART002",
            "source_kind": "direct_referral",
            "source_reference": "self",
        },
    )
    assert self_claim.status_code == 409

    _login(1)
    empty = client.post(
        "/network-growth/attributions",
        json={
            "participant_gsn_id": "GMFN-U-PART002",
            "source_kind": "other",
        },
    )
    assert empty.status_code == 422
