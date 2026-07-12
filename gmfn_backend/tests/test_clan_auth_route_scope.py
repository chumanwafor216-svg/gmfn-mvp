from __future__ import annotations

from datetime import datetime, timezone

from app.db.database import SessionLocal
from app.db.models import Clan, ClanMembership, TrustEvent


def _add_clan(*, clan_id: int, name: str) -> None:
    with SessionLocal() as db:
        db.add(
            Clan(
                id=clan_id,
                name=name,
                invite_code=f"route-scope-{clan_id}",
                invite_created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()


def _membership_count(*, clan_id: int, user_id: int) -> int:
    with SessionLocal() as db:
        return (
            db.query(ClanMembership)
            .filter(
                ClanMembership.clan_id == clan_id,
                ClanMembership.user_id == user_id,
            )
            .count()
        )


def test_pool_and_loans_reject_explicit_non_member_clan_without_autojoin(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _add_clan(clan_id=2, name="Outside Clan")

    pool_response = client.get("/pool/me", headers={"X-Clan-Id": "2"})
    loans_response = client.get("/loans", headers={"X-Clan-Id": "2"})

    assert pool_response.status_code == 403, pool_response.text
    assert loans_response.status_code == 403, loans_response.text
    assert "Join or be approved" in pool_response.text
    assert "Join or be approved" in loans_response.text
    assert _membership_count(clan_id=2, user_id=1) == 0


def test_pool_and_loans_accept_explicit_active_member_clan(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    pool_response = client.get("/pool/me", headers={"X-Clan-Id": "1"})
    loans_response = client.get("/loans", headers={"X-Clan-Id": "1"})

    assert pool_response.status_code == 200, pool_response.text
    assert loans_response.status_code == 200, loans_response.text
    assert pool_response.json()["clan_id"] == 1
    assert loans_response.json()["items"] == []


def test_trust_score_rejects_explicit_non_member_clan_without_autojoin(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _add_clan(clan_id=2, name="Outside Trust Clan")

    response = client.get(
        "/trust/score/explained-clan?limit=8",
        headers={"X-Clan-Id": "2"},
    )

    assert response.status_code == 403, response.text
    assert "Join or be approved" in response.text
    assert _membership_count(clan_id=2, user_id=1) == 0


def test_trust_score_accepts_explicit_active_member_clan(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    with SessionLocal() as db:
        db.add(
            TrustEvent(
                event_type="loan.repaid",
                clan_id=1,
                actor_user_id=1,
                subject_user_id=1,
                meta={"reason": "route_scope_guard"},
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()

    response = client.get(
        "/trust/score/explained-clan?limit=8",
        headers={"X-Clan-Id": "1"},
    )

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["scope"]["clan_id"] == 1
    assert payload["user_id"] == 1
    assert payload["counts"]["loan.repaid"] == 1
