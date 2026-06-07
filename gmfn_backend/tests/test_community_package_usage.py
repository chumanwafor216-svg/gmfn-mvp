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


def _seed_meeting_entitlement() -> None:
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
                    'community_meeting_pack',
                    'community_meeting_pack',
                    1,
                    0,
                    'active',
                    :starts_at,
                    :expires_at,
                    'TEST-MEETING-REF'
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


def test_community_package_status_reports_meeting_engine_ready(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_meeting_entitlement()

    res = client.get("/payment-instructions/community-package/status?clan_id=1")

    assert res.status_code == 200
    body = res.json()
    meeting = next(
        item for item in body["packages"] if item["package_code"] == "community_meeting_pack"
    )
    assert meeting["active_remaining"] == 1
    assert meeting["consumer"] == "community_meeting_evidence_engine"
    assert meeting["engine_ready"] is True


def test_rosca_package_instruction_is_sixty_pounds_yearly(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package",
        json={
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "currency": "GBP",
        },
    )

    assert res.status_code == 200
    body = res.json()
    assert body["amount"] == "60.00"
    assert body["currency"] == "GBP"
    assert body["package_code"] == "rosca_cycle"
    assert body["meta"]["billing_cycle"] == "annual"
    assert body["meta"]["pricing_model"] == "annual_service"


def test_rosca_package_instruction_rejects_old_one_pound_amount(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package",
        json={
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "amount": "1.00",
            "currency": "GBP",
        },
    )

    assert res.status_code == 400
    assert "amount does not match" in res.json()["detail"]


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


def test_community_package_use_rejects_meeting_pack_now_that_engine_consumes_credit(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_meeting_entitlement()

    res = client.post(
        "/payment-instructions/community-package/use",
        json={"clan_id": 1, "package_code": "community_meeting_pack", "units": 1},
    )

    assert res.status_code == 400
    assert "Community Meeting engine" in res.json()["detail"]


def test_community_package_use_requires_active_credit(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package/use",
        json={"clan_id": 1, "package_code": "extra_members", "units": 1},
    )

    assert res.status_code == 409
    assert "No active package credit" in res.json()["detail"]
