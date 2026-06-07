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
    assert rosca["consumer"] == "rosca_cycle_engine"
    assert rosca["engine_ready"] is True


def test_community_package_use_rejects_rosca_now_that_engine_consumes_credit(
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

    assert res.status_code == 400
    assert "ROSCA cycle engine" in res.json()["detail"]


def test_community_package_use_requires_active_credit(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package/use",
        json={"clan_id": 1, "package_code": "community_meeting_pack", "units": 1},
    )

    assert res.status_code == 409
    assert "No active package credit" in res.json()["detail"]
