from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


def _seed_rosca_credit(quantity: int = 1) -> None:
    now = datetime.now(timezone.utc)
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO feature_entitlements (
                    owner_user_id,
                    clan_id,
                    shop_id,
                    feature_code,
                    plan_code,
                    quantity_total,
                    quantity_used,
                    status,
                    starts_at,
                    expires_at,
                    payment_reference
                )
                VALUES (
                    1,
                    1,
                    NULL,
                    'rosca_cycle',
                    'rosca_cycle_pack',
                    :quantity,
                    0,
                    'active',
                    :starts_at,
                    :expires_at,
                    'TEST-ROSCA-ENGINE-REF'
                )
                """
            ),
            {
                "quantity": int(quantity),
                "starts_at": now - timedelta(days=1),
                "expires_at": now + timedelta(days=365),
            },
        )


def test_rosca_cycle_creation_consumes_credit_and_creates_contribution_schedule(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_credit()

    res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "June contribution circle",
            "contribution_amount": "25.00",
            "currency": "GBP",
            "interval_days": 14,
        },
    )

    assert res.status_code == 200
    body = res.json()
    cycle = body["cycle"]
    assert body["engine_ready"] is True
    assert cycle["status"] == "collecting"
    assert cycle["total_rounds"] == 2
    assert cycle["total_expected_contributions"] == 4
    assert cycle["total_confirmed_contributions"] == 0
    assert cycle["member_user_ids"] == [1, 2]
    assert cycle["payout_order_user_ids"] == [1, 2]
    assert cycle["rounds"][0]["expected_count"] == 2
    assert cycle["rounds"][0]["payout_user_id"] == 1

    with engine.begin() as conn:
        entitlement = conn.execute(
            text(
                """
                SELECT quantity_used
                FROM feature_entitlements
                WHERE payment_reference = 'TEST-ROSCA-ENGINE-REF'
                """
            )
        ).first()
        usage = conn.execute(
            text(
                """
                SELECT feature_code, units_used, reference_key
                FROM feature_usage_events
                WHERE feature_code = 'rosca_cycle'
                """
            )
        ).first()
        expected_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM expected_payments
                WHERE expected_type = 'contribution'
                  AND meta_json LIKE '%"source": "rosca.cycle"%'
                """
            )
        ).scalar_one()
        pool_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM pool_events
                WHERE note LIKE 'ROSCA contribution:%'
                """
            )
        ).scalar_one()
        started_event = conn.execute(
            text(
                """
                SELECT event_type
                FROM trust_events
                WHERE event_type = 'rosca.cycle.started'
                """
            )
        ).first()

    assert entitlement is not None
    assert entitlement.quantity_used == 1
    assert usage is not None
    assert usage.units_used == 1
    assert usage.reference_key == cycle["cycle_id"]
    assert expected_count == 4
    assert pool_count == 4
    assert started_event is not None


def test_rosca_cycle_creation_requires_paid_credit(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "contribution_amount": "25.00",
            "currency": "GBP",
        },
    )

    assert res.status_code == 400
    assert "No active ROSCA package credit" in res.json()["detail"]


def test_rosca_payout_requires_confirmed_round_then_records_payout(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_credit()

    create_res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "Ready payout circle",
            "contribution_amount": "10.00",
            "currency": "GBP",
        },
    )
    assert create_res.status_code == 200
    cycle_id = create_res.json()["cycle"]["cycle_id"]

    blocked = client.post(
        f"/rosca/cycles/{cycle_id}/rounds/1/payout?clan_id=1",
        json={"note": "too early"},
    )
    assert blocked.status_code == 400
    assert "All round contributions" in blocked.json()["detail"]

    with engine.begin() as conn:
        conn.execute(
            text(
                """
                UPDATE expected_payments
                SET status = 'confirmed',
                    paid_amount = amount,
                    remaining_amount = 0,
                    status_reason = 'test_confirmed'
                WHERE reference_display LIKE '%-R1-%'
                """
            )
        )

    payout = client.post(
        f"/rosca/cycles/{cycle_id}/rounds/1/payout?clan_id=1",
        json={"note": "paid outside GSN after bank match"},
    )
    assert payout.status_code == 200
    cycle = payout.json()["cycle"]
    first_round = cycle["rounds"][0]
    assert first_round["ready_for_payout"] is True
    assert first_round["payout_recorded"] is True
    assert first_round["status"] == "payout_recorded"

    with engine.begin() as conn:
        event = conn.execute(
            text(
                """
                SELECT event_type, meta_json
                FROM trust_events
                WHERE event_type = 'rosca.round.payout_recorded'
                """
            )
        ).first()

    assert event is not None
    assert '"external_money_moved_by_gsn": false' in event.meta_json
