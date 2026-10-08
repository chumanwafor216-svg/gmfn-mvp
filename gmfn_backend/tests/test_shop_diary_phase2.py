from __future__ import annotations

from sqlalchemy import text

from app.db.database import engine


CONFIRMED_DETAIL = "Linked Trade Evidence is not confirmed enough for a Shop Diary confirmed activity"


def _seed_user(user_id: int, *, email: str | None = None, role: str = "user", gmfn_id: str | None = None) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT OR IGNORE INTO users (id, email, hashed_password, role, gmfn_id)
                VALUES (:id, :email, 'hashed', :role, :gmfn_id)
                """
            ),
            {
                "id": user_id,
                "email": email or f"shop-diary-user-{user_id}@example.com",
                "role": role,
                "gmfn_id": gmfn_id,
            },
        )
        if gmfn_id:
            conn.execute(text("UPDATE users SET gmfn_id = :gmfn_id WHERE id = :id"), {"id": user_id, "gmfn_id": gmfn_id})


def _seed_shop(*, shop_id: int, owner_user_id: int, clan_id: int | None = 1, name: str | None = None) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id, clan_id, owner_user_id, shop_name, description, is_active, created_at
                )
                VALUES (:id, :clan_id, :owner_user_id, :name, 'Shop Diary test shop', 1, CURRENT_TIMESTAMP)
                """
            ),
            {
                "id": shop_id,
                "clan_id": clan_id,
                "owner_user_id": owner_user_id,
                "name": name or f"Diary Test Shop {shop_id}",
            },
        )


def _seed_trade(
    *,
    trade_id: int,
    trade_shop_id: int | None,
    creator_user_id: int = 1,
    seller_user_id: int | None = 1,
    buyer_user_id: int | None = 2,
    release_status: str = "not_requested",
    receipt_status: str = "not_confirmed",
) -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO protected_trade_records (
                    id, trade_code, clan_id, creator_user_id, seller_user_id, buyer_user_id,
                    shop_id, item_title, terms_summary, currency, status, payment_status,
                    release_status, receipt_status, dispute_status, created_at, updated_at
                )
                VALUES (
                    :trade_id, :trade_code, 1, :creator_user_id, :seller_user_id, :buyer_user_id,
                    :trade_shop_id, 'Catering order', 'Weekend food tray', 'NGN', 'closed', 'not_started',
                    :release_status, :receipt_status, 'none', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
                )
                """
            ),
            {
                "trade_id": trade_id,
                "trade_code": f"GSN-TRADE-PHASE2-{trade_id}",
                "creator_user_id": creator_user_id,
                "seller_user_id": seller_user_id,
                "buyer_user_id": buyer_user_id,
                "trade_shop_id": trade_shop_id,
                "release_status": release_status,
                "receipt_status": receipt_status,
            },
        )


def _seed_shop_and_trade(
    *,
    trade_id: int,
    trade_shop_id: int | None,
    release_status: str = "not_requested",
    receipt_status: str = "not_confirmed",
) -> None:
    _seed_shop(shop_id=101, owner_user_id=1, name="Diary Test Shop")
    _seed_trade(
        trade_id=trade_id,
        trade_shop_id=trade_shop_id,
        release_status=release_status,
        receipt_status=receipt_status,
    )


def _diary_payload(**overrides):
    payload = {
        "clan_id": 1,
        "shop_id": 101,
        "activity_type": "customer_delivery",
        "note": "Delivered a real customer update for the shop diary.",
        "is_public": True,
    }
    payload.update(overrides)
    return payload


def test_shop_diary_owner_can_create_entry_for_own_shop(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _seed_shop(shop_id=101, owner_user_id=1)

    res = client.post("/shop-diaries", json=_diary_payload(evidence_class="owner_update"))

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["shop_id"] == 101
    assert body["owner_user_id"] == 1
    assert body["evidence_class"] == "owner_update"
    assert body["protected_trade_id"] is None


def test_shop_diary_owner_entry_defaults_to_owner_update_and_does_not_self_assert_system_recorded(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop_and_trade(trade_id=201, trade_shop_id=101)

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            activity_type="work_completed",
            note="Completed three catering orders today.",
            evidence_class="system_recorded",
        ),
    )

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["evidence_class"] == "owner_update"
    assert body["evidence_label"] == "Owner update"
    assert "shop owner says" in body["evidence_boundary"]
    assert body["protected_trade_id"] is None


def test_shop_diary_confirmed_activity_requires_confirmed_trade_for_same_shop(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop_and_trade(
        trade_id=202,
        trade_shop_id=101,
        release_status="released",
        receipt_status="confirmed",
    )

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            note="Delivered the confirmed catering order.",
            protected_trade_id=202,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["evidence_class"] == "counterparty_confirmed"
    assert body["evidence_label"] == "Confirmed activity"
    assert body["protected_trade_id"] == 202
    assert body["protected_trade_code"] == "GSN-TRADE-PHASE2-202"
    assert body["protected_trade_outcome"]["derived_outcome_state"] == "MUTUALLY_CONFIRMED"


def test_shop_diary_rejects_trade_evidence_without_same_shop_scope(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop_and_trade(
        trade_id=203,
        trade_shop_id=None,
        release_status="released",
        receipt_status="confirmed",
    )

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            note="This should not link to an unscoped record.",
            protected_trade_id=203,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "Trade Evidence must belong to this shop"


def test_shop_diary_rejects_entry_for_another_users_shop(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop(shop_id=102, owner_user_id=2)

    res = client.post("/shop-diaries", json=_diary_payload(shop_id=102))

    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "Only the shop owner can manage this diary"


def test_shop_diary_rejects_cross_shop_trade_evidence(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop(shop_id=101, owner_user_id=1)
    _seed_shop(shop_id=102, owner_user_id=2)
    _seed_trade(
        trade_id=204,
        trade_shop_id=102,
        creator_user_id=1,
        seller_user_id=1,
        buyer_user_id=2,
        release_status="released",
        receipt_status="confirmed",
    )

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            protected_trade_id=204,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "Trade Evidence must belong to this shop"


def test_shop_diary_rejects_unauthorized_trade_evidence_link(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_user(3)
    _seed_shop(shop_id=101, owner_user_id=1)
    _seed_trade(
        trade_id=205,
        trade_shop_id=101,
        creator_user_id=2,
        seller_user_id=2,
        buyer_user_id=3,
        release_status="released",
        receipt_status="confirmed",
    )

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            protected_trade_id=205,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 403, res.text
    assert res.json()["detail"] == "You cannot link that Trade Evidence record"


def test_shop_diary_rejects_unconfirmed_trade_evidence_link(
    client,
    override_current_user_user,
    seed_clan_member_membership,
    seed_user2_non_member,
):
    _seed_shop_and_trade(trade_id=206, trade_shop_id=101)

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            protected_trade_id=206,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 400, res.text
    assert res.json()["detail"] == CONFIRMED_DETAIL


def test_shop_diary_rejects_missing_trade_evidence_record(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    _seed_shop(shop_id=101, owner_user_id=1)

    res = client.post(
        "/shop-diaries",
        json=_diary_payload(
            protected_trade_id=9999,
            evidence_class="counterparty_confirmed",
        ),
    )

    assert res.status_code == 404, res.text
    assert res.json()["detail"] == "Linked Trade Evidence record was not found"


def test_shop_diary_rejects_malformed_ids_and_missing_shop(
    client,
    override_current_user_user,
    seed_clan_member_membership,
):
    malformed = client.post("/shop-diaries", json=_diary_payload(protected_trade_id=True))
    assert malformed.status_code == 422, malformed.text

    missing_shop = client.post("/shop-diaries", json=_diary_payload(shop_id=404))
    assert missing_shop.status_code == 404, missing_shop.text
    assert missing_shop.json()["detail"] == "Shop not found"


def test_shop_diary_public_list_returns_only_public_active_non_insight_entries(
    client,
    seed_clan_member_membership,
):
    _seed_user(1, gmfn_id="GMFN-DIARY-OWNER")
    _seed_shop(shop_id=101, owner_user_id=1)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO shop_diary_entries (
                    id, clan_id, shop_id, owner_user_id, activity_type, evidence_class, note,
                    occurred_at, is_public, is_active, created_at, updated_at
                )
                VALUES
                    (301, 1, 101, 1, 'work_completed', 'owner_update', 'Visible newest update', '2026-10-08 12:00:00', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (302, 1, 101, 1, 'work_completed', 'owner_update', 'Private update', '2026-10-08 13:00:00', 0, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (303, 1, 101, 1, 'work_completed', 'owner_update', 'Inactive update', '2026-10-08 14:00:00', 1, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
                    (304, 1, 101, 1, 'work_completed', 'gsn_insight', 'Hidden insight update', '2026-10-08 15:00:00', 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                """
            )
        )

    res = client.get("/shop-diaries/public/GMFN-DIARY-OWNER")

    assert res.status_code == 200, res.text
    items = res.json()["items"]
    assert [item["id"] for item in items] == [301]
    assert items[0]["note"] == "Visible newest update"
    assert items[0]["evidence_class"] == "owner_update"


def test_shop_diary_admin_can_create_for_shop_when_explicitly_allowed(
    client,
    override_current_user,
    seed_clan_admin_membership,
    seed_user2_non_member,
):
    _seed_shop(shop_id=102, owner_user_id=2)

    res = client.post(
        "/shop-diaries",
        json={
            "clan_id": 1,
            "shop_id": 102,
            "activity_type": "business_milestone",
            "note": "Admin recorded a migration-support diary entry.",
            "evidence_class": "owner_update",
            "is_public": False,
        },
    )

    assert res.status_code == 201, res.text
    body = res.json()
    assert body["shop_id"] == 102
    assert body["owner_user_id"] == 2
    assert body["evidence_class"] == "owner_update"