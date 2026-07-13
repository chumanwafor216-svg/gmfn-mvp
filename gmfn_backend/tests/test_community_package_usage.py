import json
from datetime import datetime, timedelta, timezone

from sqlalchemy import text

from app.db.database import engine


def _seed_domain_feature_policy(feature_key: str, mode: str = "off") -> None:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO community_domains (
                    id,
                    domain_name,
                    display_name,
                    domain_type,
                    template_key,
                    owner_user_id,
                    clan_id,
                    status,
                    verification_status,
                    created_at,
                    updated_at
                )
                VALUES (
                    806,
                    'package-policy-test-domain',
                    'Package Policy Test Domain',
                    'ngo_project_network',
                    'ngo_project_network',
                    1,
                    1,
                    'active',
                    'unverified',
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            )
        )
        conn.execute(
            text(
                """
                INSERT INTO community_domain_policies (
                    id,
                    community_domain_id,
                    policy_key,
                    action_key,
                    scope_type,
                    review_mode,
                    required_role,
                    status,
                    policy_summary,
                    config_json,
                    created_by_user_id,
                    created_at,
                    updated_at
                )
                VALUES (
                    807,
                    806,
                    'domain.feature_policy',
                    'domain.features.configure',
                    'domain',
                    'domain_admin_review',
                    'owner_admin',
                    'active',
                    'Package route feature policy test',
                    :config_json,
                    1,
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"config_json": json.dumps({"features": {feature_key: mode}})},
        )


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
                    1,
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


def test_community_package_status_reports_active_rosca_yearly_service(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_rosca_entitlement()

    res = client.get("/payment-instructions/community-package/status?clan_id=1")

    assert res.status_code == 200
    body = res.json()
    rosca = next(
        item for item in body["packages"] if item["package_code"] == "rosca_cycle"
    )
    assert rosca["active_remaining"] == 1
    assert rosca["consumer"] == "rosca_cycle_engine"
    assert rosca["engine_ready"] is True
    assert "yearly service" in rosca["message"]


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


def test_rosca_package_instruction_respects_disabled_community_domain_rosca_policy(
    client, override_current_user, seed_clan_admin_membership
):
    _seed_domain_feature_policy("rosca_cycles", "off")

    res = client.post(
        "/payment-instructions/community-package",
        json={
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "currency": "GBP",
        },
    )

    assert res.status_code == 403, res.text
    detail = res.json()["detail"]
    assert detail["code"] == "community_domain_feature_disabled"
    assert detail["feature_key"] == "rosca_cycles"
    assert "Do not create a ROSCA yearly service payment" in detail["message"]

    with engine.begin() as conn:
        created = conn.execute(
            text(
                """
                SELECT COUNT(*)
                FROM expected_payments
                WHERE expected_type = 'community_package_subscription'
                """
            )
        ).scalar_one()
    assert created == 0


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


def test_community_package_instruction_rejects_malformed_boundary_fields(
    client, override_current_user, seed_clan_admin_membership
):
    for field_name in ("package_code", "currency"):
        payload = {
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "currency": "GBP",
        }
        payload[field_name] = False
        rejected_bool_text = client.post(
            "/payment-instructions/community-package",
            json=payload,
        )
        assert rejected_bool_text.status_code == 422, (
            field_name,
            rejected_bool_text.text,
        )
        assert f"{field_name} must be text" in rejected_bool_text.text

        payload[field_name] = 1.5
        rejected_float_text = client.post(
            "/payment-instructions/community-package",
            json=payload,
        )
        assert rejected_float_text.status_code == 422, (
            field_name,
            rejected_float_text.text,
        )
        assert f"{field_name} must be text" in rejected_float_text.text

    for field_name in ("clan_id", "quantity_total", "shop_id"):
        payload = {
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "currency": "GBP",
        }
        payload[field_name] = True
        rejected_bool_number = client.post(
            "/payment-instructions/community-package",
            json=payload,
        )
        assert rejected_bool_number.status_code == 422, (
            field_name,
            rejected_bool_number.text,
        )
        assert f"{field_name} must be an integer" in rejected_bool_number.text

        payload[field_name] = 1.5
        rejected_float_number = client.post(
            "/payment-instructions/community-package",
            json=payload,
        )
        assert rejected_float_number.status_code == 422, (
            field_name,
            rejected_float_number.text,
        )
        assert f"{field_name} must be an integer" in rejected_float_number.text

    for bad_value in (False, 60):
        payload = {
            "clan_id": 1,
            "package_code": "rosca_cycle",
            "quantity_total": 1,
            "amount": bad_value,
            "currency": "GBP",
        }
        rejected_amount = client.post(
            "/payment-instructions/community-package",
            json=payload,
        )
        assert rejected_amount.status_code == 422, rejected_amount.text
        assert "amount must be a decimal string" in rejected_amount.text


def test_community_package_use_rejects_rosca_now_that_yearly_service_engine_controls_access(
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


def test_community_package_use_rejects_malformed_boundary_fields(
    client, override_current_user, seed_clan_admin_membership
):
    for field_name in ("package_code", "reference_key", "note"):
        payload = {
            "clan_id": 1,
            "package_code": "extra_members",
            "units": 1,
            "reference_key": "membership-top-up",
            "note": "Use one package credit.",
        }
        payload[field_name] = False
        rejected_bool_text = client.post(
            "/payment-instructions/community-package/use",
            json=payload,
        )
        assert rejected_bool_text.status_code == 422, (
            field_name,
            rejected_bool_text.text,
        )
        assert f"{field_name} must be text" in rejected_bool_text.text

        payload[field_name] = 1.5
        rejected_float_text = client.post(
            "/payment-instructions/community-package/use",
            json=payload,
        )
        assert rejected_float_text.status_code == 422, (
            field_name,
            rejected_float_text.text,
        )
        assert f"{field_name} must be text" in rejected_float_text.text

    for field_name in ("clan_id", "units", "shop_id"):
        payload = {
            "clan_id": 1,
            "package_code": "extra_members",
            "units": 1,
        }
        payload[field_name] = True
        rejected_bool_number = client.post(
            "/payment-instructions/community-package/use",
            json=payload,
        )
        assert rejected_bool_number.status_code == 422, (
            field_name,
            rejected_bool_number.text,
        )
        assert f"{field_name} must be an integer" in rejected_bool_number.text

        payload[field_name] = 1.5
        rejected_float_number = client.post(
            "/payment-instructions/community-package/use",
            json=payload,
        )
        assert rejected_float_number.status_code == 422, (
            field_name,
            rejected_float_number.text,
        )
        assert f"{field_name} must be an integer" in rejected_float_number.text


def test_community_package_use_requires_active_credit(
    client, override_current_user, seed_clan_admin_membership
):
    res = client.post(
        "/payment-instructions/community-package/use",
        json={"clan_id": 1, "package_code": "extra_members", "units": 1},
    )

    assert res.status_code == 409
    assert "No active package credit" in res.json()["detail"]
