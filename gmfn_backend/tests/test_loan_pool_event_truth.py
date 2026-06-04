from sqlalchemy import text

from app.db.database import engine


def test_loan_creation_uses_confirmed_pool_events_for_pool_truth(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO pool_events
                    (clan_id, user_id, event_type, amount, currency, reference)
                VALUES
                    (1, 1, 'deposit.confirmed', 500, 'NGN', 'POOL-TRUTH-1')
                """
            )
        )

    response = client.post(
        "/loans",
        json={"clan_id": 1, "amount": "400", "currency": "NGN"},
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "approved"
    assert str(data["personal_pool_at_request"]) in {"500.00", "500"}
    assert str(data["pool_used"]) in {"400.00", "400"}
    assert str(data["guarantee_gap"]) in {"0.00", "0"}
    assert data["guarantors_required"] == 0


def test_loan_creation_does_not_use_legacy_membership_balance_as_money_truth(
    client,
    override_clan_ctx_member,
    seed_clan_member_membership,
):
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE clan_memberships
                SET personal_pool_balance = 500
                WHERE clan_id = 1 AND user_id = 1
                """
            )
        )

    response = client.post(
        "/loans",
        json={"clan_id": 1, "amount": "400", "currency": "NGN"},
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["status"] == "pending"
    assert str(data["personal_pool_at_request"]) in {"0.00", "0"}
    assert str(data["pool_used"]) in {"0.00", "0"}
    assert str(data["guarantee_gap"]) in {"400.00", "400"}
    assert data["guarantors_required"] > 0
