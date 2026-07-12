from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import text

from app.api.routes import loans as loans_route
from app.api.routes import pool as pool_route
from app.db.database import SessionLocal, engine
from app.db.models import Clan, ClanMembership, TrustEvent
from app.services import pool_service


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


def test_pool_routes_degrade_when_optional_accounting_columns_are_unavailable(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    monkeypatch,
):
    monkeypatch.setattr(
        pool_service,
        "_table_has_columns",
        lambda db, table_name, column_names: False,
    )
    monkeypatch.setattr(
        pool_route,
        "_table_has_columns",
        lambda db, table_name, column_names: False,
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 250, 'NGN', 'POOL-DRIFT-1')
                """
            )
        )

    headers = {"X-Clan-Id": "1"}
    pool_response = client.get("/pool/me?currency=NGN&limit=20", headers=headers)
    summary_response = client.get("/pool/me/summary?currency=NGN", headers=headers)

    assert pool_response.status_code == 200, pool_response.text
    pool_payload = pool_response.json()
    assert Decimal(str(pool_payload["available_balance"])) == Decimal("250.00")
    assert Decimal(str(pool_payload["reserved_pool"])) == Decimal("0")

    assert summary_response.status_code == 200, summary_response.text
    summary_payload = summary_response.json()
    assert summary_payload["communities_count"] == 1
    assert (
        Decimal(str(summary_payload["totals"]["guarantee_locked_as_guarantor"]))
        == Decimal("0")
    )


def test_loans_list_degrades_when_optional_accounting_columns_are_unavailable(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    monkeypatch,
):
    monkeypatch.setattr(
        loans_route,
        "_loan_table_columns",
        lambda db: {
            "id",
            "borrower_user_id",
            "clan_id",
            "amount",
            "currency",
            "status",
            "guarantors_required",
            "created_at",
        },
    )

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO loans
                    (id, borrower_user_id, clan_id, amount, currency, status, guarantors_required)
                VALUES
                    (77, 1, 1, 125, 'NGN', 'pending', 0)
                """
            )
        )

    response = client.get("/loans", headers={"X-Clan-Id": "1"})

    assert response.status_code == 200, response.text
    payload = response.json()
    assert payload["total"] == 1
    item = payload["items"][0]
    assert item["id"] == 77
    assert Decimal(str(item["amount"])) == Decimal("125.00")
    assert Decimal(str(item["pool_used"])) == Decimal("0")
    assert Decimal(str(item["guarantee_gap"])) == Decimal("0")
