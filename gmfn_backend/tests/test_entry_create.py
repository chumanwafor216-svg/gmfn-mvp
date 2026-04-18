import os


def test_entry_phone_verification_then_create_and_phone_login(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Mama Chuks",
            "phone_e164": "+2348012345678",
            "browser_locale": "en-NG",
            "browser_timezone": "Africa/Lagos",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    assert start_body["ok"] is True
    assert start_body["verification_id"] > 0
    assert start_body["phone_e164"] == "+2348012345678"
    assert start_body["otp_preview"]

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text
    confirm_body = confirm_res.json()

    assert confirm_body["ok"] is True
    assert confirm_body["verified"] is True
    assert confirm_body["display_name"] == "Mama Chuks"

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Mama Chuks",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
            "currency": "NGN",
            "driver_licence_number": "LAG-DRV-9911",
            "driver_licence_country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    bank_body = bank_res.json()

    assert bank_body["ok"] is True
    assert bank_body["bank_details_recorded"] is True

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Rising Market Women",
            "clan_description": "Daily trade support circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    assert create_body["ok"] is True
    assert create_body["display_name"] == "Mama Chuks"
    assert create_body["nickname"] == "Mama Chuks"
    assert create_body["phone_e164"] == "+2348012345678"
    assert create_body["next_step"] == "activate-membership"
    assert create_body["email"].endswith("@founder-entry.gsnmail.app")

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348012345678",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    me_res = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_res.status_code == 200, me_res.text
    me_body = me_res.json()

    assert me_body["display_name"] == "Mama Chuks"
    assert me_body["nickname"] == "Mama Chuks"
    assert me_body["phone_e164"] == "+2348012345678"

    payout_res = client.get(
        "/withdrawal-destinations/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert payout_res.status_code == 200, payout_res.text
    payout_body = payout_res.json()

    assert payout_body["destination_name"] == "Mama Chuks"
    assert payout_body["bank_name"] == "Pilot Community Bank"
    assert payout_body["verification_status"] == "phone_verified_bank_recorded_region_matched"
    assert payout_body["region_consistency_status"] == "matched"

    observe_res = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-one",
        },
    )
    assert observe_res.status_code == 200, observe_res.text
    observe_body = observe_res.json()
    assert observe_body["continuity"]["status"] == "trusted"

    risk_res = client.get(
        "/identity-risk/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert risk_res.status_code == 200, risk_res.text
    risk_body = risk_res.json()
    assert risk_body["continuity"]["status"] == "trusted"
    assert risk_body["device_count"] >= 1

    trust_res = client.get(
        "/trust-events/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert trust_res.status_code == 200, trust_res.text
    trust_body = trust_res.json()
    event_types = [item["event_type"] for item in trust_body["items"]]

    assert "identity.phone_verified" in event_types
    assert "identity.bank_destination_recorded" in event_types
    assert "identity.drivers_licence_recorded" in event_types
    assert "identity.region_consistent" in event_types

    explained_res = client.get(
        "/trust/score/explained",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert explained_res.status_code == 200, explained_res.text
    explained_body = explained_res.json()
    assert explained_body["starter_proof_summary"]["phone_verified"] is True
    assert explained_body["starter_proof_summary"]["bank_recorded"] is True
    assert explained_body["starter_proof_summary"]["drivers_licence_recorded"] is True
    assert explained_body["starter_proof_summary"]["region_consistent"] is True
    assert float(explained_body["standing_score"]) >= 0.95

    notifications_res = client.get(
        "/notifications/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert notifications_res.status_code == 200, notifications_res.text
    notifications_body = notifications_res.json()
    notification_titles = [item["title"] for item in notifications_body["items"]]
    assert "Starter trust has been established" in notification_titles


def test_entry_create_requires_verified_phone_first(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Street Boss",
            "phone_e164": "+2348099999999",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Unverified Circle",
        },
    )
    assert create_res.status_code == 400, create_res.text
    assert "Phone verification must be completed first" in create_res.text


def test_entry_create_requires_bank_details_after_verified_phone(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Market Chair",
            "phone_e164": "+2348066666666",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Awaiting Bank Circle",
        },
    )
    assert create_res.status_code == 400, create_res.text
    assert "Bank details must be completed before community creation" in create_res.text


def test_entry_phone_confirm_rejects_wrong_code(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader Bee",
            "phone_e164": "+2348077777777",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": "000000",
        },
    )
    assert confirm_res.status_code == 400, confirm_res.text
    assert "Verification code is not correct" in confirm_res.text


def test_entry_bank_details_require_verified_phone_first(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader Bee",
            "phone_e164": "+2348077777777",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trader Bee",
            "bank_name": "Pilot Community Bank",
            "account_number": "1234567890",
        },
    )
    assert bank_res.status_code == 400, bank_res.text
    assert "Phone verification must be completed first" in bank_res.text


def test_entry_bank_details_require_explanation_for_cross_region_mismatch(client):
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trader UK",
            "phone_e164": "+447700900123",
            "browser_locale": "en-GB",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trader UK",
            "bank_name": "Pilot Community Bank",
            "account_number": "1234567890",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 400, bank_res.text
    assert "do not match yet" in bank_res.text


def test_entry_cross_region_mismatch_can_be_recorded_with_explanation(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Mama Diaspora",
            "phone_e164": "+447700900123",
            "browser_locale": "en-GB",
            "browser_timezone": "Europe/London",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Mama Diaspora",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
            "currency": "NGN",
            "note": "I live in the UK but I still use my Nigerian community account.",
        },
    )
    assert bank_res.status_code == 200, bank_res.text
    bank_body = bank_res.json()
    assert bank_body["region_consistency_status"] == "explained_mismatch"

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Diaspora Market Circle",
            "clan_description": "Cross-border trade support circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+447700900123",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    payout_res = client.get(
        "/withdrawal-destinations/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert payout_res.status_code == 200, payout_res.text
    payout_body = payout_res.json()
    assert payout_body["verification_status"] == "phone_verified_bank_recorded_region_explained"
    assert payout_body["region_consistency_status"] == "explained_mismatch"

    trust_res = client.get(
        "/trust-events/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert trust_res.status_code == 200, trust_res.text
    trust_body = trust_res.json()
    event_types = [item["event_type"] for item in trust_body["items"]]
    assert "identity.region_mismatch_explained" in event_types


def test_identity_risk_observation_moves_to_watch_on_new_device(client):
    os.environ["GMFN_SECRET_KEY"] = "pytest-secret"
    os.environ["GMFN_DEV_MODE"] = "1"

    start_res = client.post(
        "/entry/phone/start",
        json={
            "display_name": "Trust Watch",
            "phone_e164": "+2348091234567",
        },
    )
    assert start_res.status_code == 201, start_res.text
    start_body = start_res.json()

    confirm_res = client.post(
        "/entry/phone/confirm",
        json={
            "verification_id": start_body["verification_id"],
            "code": start_body["otp_preview"],
        },
    )
    assert confirm_res.status_code == 200, confirm_res.text

    bank_res = client.post(
        "/entry/bank-details",
        json={
            "verification_id": start_body["verification_id"],
            "destination_name": "Trust Watch",
            "bank_name": "Pilot Community Bank",
            "account_number": "0123456789",
            "country": "NG",
        },
    )
    assert bank_res.status_code == 200, bank_res.text

    create_res = client.post(
        "/entry/create",
        json={
            "verification_id": start_body["verification_id"],
            "clan_name": "Trust Watch Circle",
        },
    )
    assert create_res.status_code == 201, create_res.text
    create_body = create_res.json()

    activate_res = client.post(
        "/auth/activate-membership",
        json={
            "gmfn_id": create_body["gmfn_id"],
            "password": "secret123",
            "confirm_password": "secret123",
        },
    )
    assert activate_res.status_code == 200, activate_res.text

    login_res = client.post(
        "/auth/login",
        data={
            "username": "+2348091234567",
            "password": "secret123",
        },
    )
    assert login_res.status_code == 200, login_res.text
    token = login_res.json()["access_token"]

    first_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-one",
        },
    )
    assert first_observe.status_code == 200, first_observe.text
    assert first_observe.json()["continuity"]["status"] == "trusted"

    second_observe = client.post(
        "/identity-risk/observe",
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": "pytest-browser",
            "X-Client-Fingerprint": "trusted-device-two",
        },
    )
    assert second_observe.status_code == 200, second_observe.text
    assert second_observe.json()["continuity"]["status"] == "watch"

    risk_res = client.get(
        "/identity-risk/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert risk_res.status_code == 200, risk_res.text
    risk_body = risk_res.json()
    assert risk_body["continuity"]["status"] == "watch"
    assert risk_body["device_count"] >= 2
    assert risk_body["signal_count"] >= 1
