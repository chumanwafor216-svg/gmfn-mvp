from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


def _seed_rosca_entitlement() -> None:
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
                    2,
                    0,
                    'active',
                    :starts_at,
                    :expires_at,
                    'TEST-ROSCA-REF'
                )
                """
            ),
            {
                "starts_at": now - timedelta(days=1),
                "expires_at": now + timedelta(days=365),
            },
        )


def test_community_package_status_reports_active_rosca_units(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_rosca_entitlement()

    res = client.get("/payment-instructions/community-package/status?clan_id=1")

    assert res.status_code == 200
    body = res.json()
    rosca = next(
        item for item in body["packages"] if item["package_code"] == "rosca_cycle"
    )
    assert rosca["active_remaining"] == 2
    assert rosca["consumer"] == "rosca_usage_record"
    assert rosca["engine_ready"] is False


def test_community_package_use_consumes_rosca_unit_and_records_usage(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_rosca_entitlement()

    res = client.post(
        "/payment-instructions/community-package/use",
        json={
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "units": 1,
            "reference_key": "meeting-2026-06",
            "note": "Aberdeen Nigerian community contribution meeting",
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["ok"] is True
    assert body["consumed"] == 1
    assert body["remaining_after"] == 1
    assert body["engine_status"]["engine_ready"] is False

    with engine.begin() as conn:
        entitlement = conn.execute(
            text(
                """
                SELECT quantity_used
                FROM feature_entitlements
                WHERE payment_reference = 'TEST-ROSCA-REF'
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
        trust = conn.execute(
            text(
                """
                SELECT event_type
                FROM trust_events
                WHERE event_type = 'feature.rosca_cycle.used'
                """
            )
        ).first()

    assert entitlement is not None
    assert entitlement.quantity_used == 1
    assert usage is not None
    assert usage.feature_code == "rosca_cycle"
    assert usage.units_used == 1
    assert usage.reference_key == "meeting-2026-06"
    assert trust is not None


def test_community_package_use_requires_active_credit(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package/use",
        json={"clan_id": 1, "package_code": "rosca_cycle", "units": 1},
    )

    assert res.status_code == 409
    assert "No active package credit" in res.json()["detail"]
