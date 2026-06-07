from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import Base as BankBase
from app.db.database import SessionLocal, engine
from app.services.reconciliation_service import create_bank_event, reconcile_batch


def _seed_rosca_yearly_service(quantity: int = 1) -> None:
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


def test_rosca_cycle_creation_uses_yearly_service_without_consuming_entitlement(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()

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
    assert entitlement.quantity_used == 0
    assert usage is None
    assert expected_count == 4
    assert pool_count == 4
    assert started_event is not None

    obligations_res = client.get("/rosca/obligations/me?clan_id=1")
    assert obligations_res.status_code == 200
    obligations = obligations_res.json()["obligations"]
    assert len(obligations) == 2
    assert obligations[0]["source"] == "rosca.cycle"
    assert obligations[0]["writes_commitment_trust_event"] is False


def test_rosca_yearly_service_allows_multiple_cycles_without_consuming_entitlement(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()

    for title in ["June contribution circle", "July contribution circle"]:
        res = client.post(
            "/rosca/cycles",
            json={
                "clan_id": 1,
                "title": title,
                "contribution_amount": "25.00",
                "currency": "GBP",
                "interval_days": 14,
            },
        )
        assert res.status_code == 200

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
        cycle_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type = 'rosca.cycle.started'
                """
            )
        ).scalar_one()
        usage_count = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM feature_usage_events
                WHERE feature_code = 'rosca_cycle'
                """
            )
        ).scalar_one()

    assert entitlement is not None
    assert entitlement.quantity_used == 0
    assert cycle_count == 2
    assert usage_count == 0


def test_rosca_cycle_creation_requires_paid_yearly_service(
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
    assert "No active ROSCA yearly service" in res.json()["detail"]


def test_rosca_default_payout_order_prioritizes_highest_trust_score(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET trust_score = 40 WHERE id = 1"))
        conn.execute(text("UPDATE users SET trust_score = 92 WHERE id = 2"))

    res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "Trust ordered circle",
            "contribution_amount": "25.00",
            "currency": "GBP",
        },
    )

    assert res.status_code == 200
    cycle = res.json()["cycle"]
    assert cycle["member_user_ids"] == [1, 2]
    assert cycle["payout_order_user_ids"] == [2, 1]
    assert cycle["rounds"][0]["payout_user_id"] == 2

    first_meta = cycle["rounds"][0]["contributions"][0]["meta"]
    assert first_meta["payout_order_policy"]["payout_order_strategy"] == (
        "trust_score_desc_membership_order_tiebreak"
    )
    assert first_meta["payout_order_policy"]["trust_scores_by_user_id"] == {
        "1": 40,
        "2": 92,
    }


def test_rosca_explicit_payout_order_overrides_trust_score_priority(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()
    with engine.begin() as conn:
        conn.execute(text("UPDATE users SET trust_score = 40 WHERE id = 1"))
        conn.execute(text("UPDATE users SET trust_score = 92 WHERE id = 2"))

    res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "Manual order circle",
            "contribution_amount": "25.00",
            "currency": "GBP",
            "payout_order_user_ids": [1, 2],
        },
    )

    assert res.status_code == 200
    cycle = res.json()["cycle"]
    assert cycle["payout_order_user_ids"] == [1, 2]
    assert cycle["rounds"][0]["payout_user_id"] == 1

    first_meta = cycle["rounds"][0]["contributions"][0]["meta"]
    assert first_meta["payout_order_policy"]["payout_order_strategy"] == (
        "explicit_admin_order"
    )


def test_rosca_payout_requires_confirmed_round_then_records_payout(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()

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


def test_rosca_notifications_are_created_without_commitment_trust_events(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()

    res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "Notification circle",
            "contribution_amount": "15.00",
            "currency": "GBP",
        },
    )
    assert res.status_code == 200

    with engine.begin() as conn:
        cycle_notifications = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE kind = 'rosca.cycle_started'
                """
            )
        ).scalar_one()
        commitment_events = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM trust_events
                WHERE event_type LIKE 'commitment.%'
                """
            )
        ).scalar_one()

    assert cycle_notifications == 2
    assert commitment_events == 0


def test_rosca_reconciliation_creates_contribution_and_round_ready_notifications(
    client,
    override_current_user,
    seed_user2_member_membership,
):
    _seed_rosca_yearly_service()

    create_res = client.post(
        "/rosca/cycles",
        json={
            "clan_id": 1,
            "title": "Bank matched circle",
            "contribution_amount": "10.00",
            "currency": "GBP",
        },
    )
    assert create_res.status_code == 200
    cycle = create_res.json()["cycle"]
    round_one_refs = [
        row["reference_display"]
        for row in cycle["rounds"][0]["contributions"]
    ]

    BankBase.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        for index, reference in enumerate(round_one_refs, start=1):
            create_bank_event(
                db,
                clan_id=1,
                source_type="statement_csv",
                source_id=f"rosca-file-{index}",
                direction="credit",
                amount="10.00",
                currency="GBP",
                reference_raw=reference,
                description_raw="rosca contribution",
                bank_txn_id=f"ROSCA-TXN-{index}",
            )

        stats = reconcile_batch(db, clan_id=1, limit=50)
        assert stats["confirmed"] >= 2
    finally:
        db.close()

    with engine.begin() as conn:
        confirmed_notifications = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM notifications
                WHERE kind = 'rosca.contribution_confirmed'
                """
            )
        ).scalar_one()
        ready_notification = conn.execute(
            text(
                """
                SELECT user_id, action_url
                FROM notifications
                WHERE kind = 'rosca.round_ready'
                """
            )
        ).first()

    assert confirmed_notifications == 2
    assert ready_notification is not None
    assert ready_notification.user_id == 1
    assert "rosca_cycle=" in ready_notification.action_url

    obligations_res = client.get("/rosca/obligations/me?clan_id=1")
    assert obligations_res.status_code == 200
    obligations = obligations_res.json()["obligations"]
    assert len(obligations) == 1
    assert obligations[0]["round_number"] == 2
