from __future__ import annotations

from sqlalchemy import event, text

from app.db.database import engine


def _seed_directory() -> None:
    users = [
        {
            "id": user_id,
            "email": f"directory-{user_id}@example.invalid",
            "display_name": f"Owner {user_id:03d}",
            "gmfn_id": f"GMFN-U-DIR{user_id:04d}",
        }
        for user_id in range(1, 28)
    ]

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO users (
                    id, email, hashed_password, display_name, role, gmfn_id
                )
                VALUES (
                    :id, :email, 'hashed', :display_name, 'user', :gmfn_id
                )
                """
            ),
            users,
        )
        conn.execute(
            text(
                """
                INSERT INTO clans (id, name, marketplace_name, invite_code)
                VALUES
                    (1, 'Directory Community', 'Directory Marketplace', 'DIR-ONE'),
                    (2, 'Other Community', 'Other Marketplace', 'DIR-TWO')
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO clan_memberships (
                    id, clan_id, user_id, role, personal_pool_balance
                )
                VALUES (
                    :id, :clan_id, :user_id, 'user', 0
                )
                """
            ),
            [
                {
                    "id": user_id,
                    "clan_id": 1 if user_id <= 26 else 2,
                    "user_id": user_id,
                }
                for user_id in range(1, 28)
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_shops (
                    id,
                    clan_id,
                    owner_user_id,
                    shop_name,
                    description,
                    whatsapp_number,
                    is_active
                )
                VALUES (
                    :id,
                    :clan_id,
                    :owner_user_id,
                    :shop_name,
                    :description,
                    :whatsapp_number,
                    1
                )
                """
            ),
            [
                {
                    "id": shop_id,
                    "clan_id": 1 if shop_id <= 25 else 2,
                    "owner_user_id": shop_id + 1,
                    "shop_name": (
                        f"A Community Shop {shop_id:03d}"
                        if shop_id <= 25
                        else "Outside Community Shop"
                    ),
                    "description": f"Community service number {shop_id}",
                    "whatsapp_number": "+440000000001" if shop_id % 2 == 0 else None,
                }
                for shop_id in range(1, 27)
            ],
        )
        conn.execute(
            text(
                """
                INSERT INTO marketplace_products (
                    id,
                    clan_id,
                    shop_id,
                    seller_user_id,
                    title,
                    description,
                    visibility_mode,
                    is_active
                )
                VALUES (
                    1,
                    1,
                    5,
                    6,
                    'Solar inverter installation',
                    'Renewable energy equipment and fitting',
                    'community_visible',
                    1
                )
                """
            )
        )


def test_shop_directory_is_bounded_paginated_and_community_scoped(
    client,
    override_current_user_user,
):
    _seed_directory()
    selected_statements: list[str] = []

    def record_statement(_conn, _cursor, statement, _parameters, _context, _many):
        if statement.lstrip().upper().startswith("SELECT"):
            selected_statements.append(statement)

    event.listen(engine, "before_cursor_execute", record_statement)
    try:
        first = client.get(
            "/marketplace/shops/directory",
            params={"clan_id": 1, "limit": 20},
        )
    finally:
        event.remove(engine, "before_cursor_execute", record_statement)

    assert first.status_code == 200, first.text
    payload = first.json()
    assert payload["scope"] == "selected_community"
    assert payload["sort"] == "name_ascending"
    assert payload["total"] == 25
    assert len(payload["items"]) == 20
    assert payload["has_more"] is True
    assert payload["next_cursor"]
    assert len(selected_statements) <= 4
    assert all(item["shop_name"] != "Outside Community Shop" for item in payload["items"])

    second = client.get(
        "/marketplace/shops/directory",
        params={
            "clan_id": 1,
            "limit": 20,
            "cursor": payload["next_cursor"],
        },
    )
    assert second.status_code == 200, second.text
    second_payload = second.json()
    assert second_payload["total"] is None
    assert len(second_payload["items"]) == 5
    assert second_payload["has_more"] is False

    first_ids = {item["id"] for item in payload["items"]}
    second_ids = {item["id"] for item in second_payload["items"]}
    assert first_ids.isdisjoint(second_ids)
    assert len(first_ids | second_ids) == 25


def test_shop_directory_searches_products_and_applies_fact_filters(
    client,
    override_current_user_user,
):
    _seed_directory()

    searched = client.get(
        "/marketplace/shops/directory",
        params={"clan_id": 1, "q": "solar", "limit": 20},
    )
    assert searched.status_code == 200, searched.text
    searched_payload = searched.json()
    assert searched_payload["total"] == 1
    assert searched_payload["items"][0]["id"] == 5
    assert searched_payload["items"][0]["offer_count"] == 1

    offers = client.get(
        "/marketplace/shops/directory",
        params={"clan_id": 1, "offers_listed": True, "limit": 20},
    )
    assert offers.status_code == 200, offers.text
    assert offers.json()["total"] == 1
    assert offers.json()["items"][0]["id"] == 5

    contact_ready = client.get(
        "/marketplace/shops/directory",
        params={"clan_id": 1, "contact_ready": True, "limit": 20},
    )
    assert contact_ready.status_code == 200, contact_ready.text
    contact_payload = contact_ready.json()
    assert contact_payload["total"] == 12
    assert all(item["contact_ready"] is True for item in contact_payload["items"])

    invalid_cursor = client.get(
        "/marketplace/shops/directory",
        params={"clan_id": 1, "cursor": "not-a-cursor"},
    )
    assert invalid_cursor.status_code == 400