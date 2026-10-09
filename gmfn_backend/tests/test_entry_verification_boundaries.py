import json

from sqlalchemy import text

from app.db.database import SessionLocal, engine
from app.db.models import TrustEvent
from app.db.verification_models import IdentityVerificationCheck


def test_entry_identity_verification_rejects_coerced_public_controls_before_check_write(client):
    bank_res = client.post(
        "/entry/bank/verify",
        json={
            "verification_id": True,
            "destination_name": "Pilot Member",
            "bank_name": "Pilot Bank",
            "account_number": 12345678,
            "country": "GB",
        },
    )
    assert bank_res.status_code == 422, bank_res.text

    official_res = client.post(
        "/entry/official-id/record",
        json={
            "verification_id": 1.0,
            "document_type": "Passport",
            "document_reference": 1234567,
            "country": True,
        },
    )
    assert official_res.status_code == 422, official_res.text

    with SessionLocal() as db:
        assert db.query(IdentityVerificationCheck).count() == 0


def test_signed_in_identity_verification_rejects_coerced_controls_before_writes(
    client,
    override_current_user_user,
):
    with SessionLocal() as db:
        existing_check_count = db.query(IdentityVerificationCheck).count()
        existing_event_count = (
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == 1)
            .filter(
                TrustEvent.event_type.in_(
                    [
                        "identity.phone_registered",
                        "identity.phone_verified",
                        "identity.official_id_recorded",
                    ]
                )
            )
            .count()
        )

    start_res = client.post(
        "/entry/signed-in/phone/start",
        json={"phone_e164": 447700900123, "country": ["GB"]},
    )
    assert start_res.status_code == 422, start_res.text

    confirm_res = client.post(
        "/entry/signed-in/phone/confirm",
        json={"verification_id": True, "code": 123456},
    )
    assert confirm_res.status_code == 422, confirm_res.text

    official_res = client.post(
        "/entry/signed-in/official-id/record",
        json={
            "document_type": 12345,
            "document_reference": False,
            "country": "GB",
        },
    )
    assert official_res.status_code == 422, official_res.text

    with SessionLocal() as db:
        assert db.query(IdentityVerificationCheck).count() == existing_check_count
        assert (
            db.query(TrustEvent)
            .filter(TrustEvent.subject_user_id == 1)
            .filter(
                TrustEvent.event_type.in_(
                    [
                        "identity.phone_registered",
                        "identity.phone_verified",
                        "identity.official_id_recorded",
                    ]
                )
            )
            .count()
        ) == existing_event_count


def _seed_verified_entry_phone_session(verification_id: int = 501) -> int:
    with engine.begin() as conn:
        conn.execute(
            text(
                """
                INSERT INTO entry_phone_verifications (
                    id,
                    display_name,
                    phone_e164,
                    code,
                    phone_country_hint,
                    created_at,
                    expires_at,
                    verified_at
                ) VALUES (
                    :id,
                    'Pipeline Credit Tester',
                    '+447700900501',
                    '123456',
                    'GB',
                    CURRENT_TIMESTAMP,
                    datetime('now', '+1 day'),
                    CURRENT_TIMESTAMP
                )
                """
            ),
            {"id": int(verification_id)},
        )
    return int(verification_id)


def test_live_truelayer_bank_verify_is_blocked_without_pipeline_credit_config(
    client,
    monkeypatch,
):
    from app.services.verification_adapters.bank_truelayer_gb import TrueLayerGBBankVerificationAdapter

    verification_id = _seed_verified_entry_phone_session(601)
    monkeypatch.setenv("GMFN_VERIFICATION_MODE", "live")
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "token")
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_ACCOUNT_ID", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_DEFAULT_PROVIDER_COST", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", raising=False)
    monkeypatch.delenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", raising=False)

    calls = {"count": 0}

    def fake_request_json(self, *, method, url, body=None, idempotency_key=None):
        calls["count"] += 1
        return {"id": "should-not-run"}

    monkeypatch.setattr(TrueLayerGBBankVerificationAdapter, "_request_json", fake_request_json)

    res = client.post(
        "/entry/bank/verify",
        json={
            "verification_id": verification_id,
            "destination_name": "John Doe",
            "bank_name": "Pilot Bank",
            "account_number": "12345678",
            "sort_code": "12-34-56",
            "country": "GB",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["provider_key"] == "bank.gb.truelayer"
    assert body["status"] == "unavailable"
    assert "Pipeline Credit gate" in body["explanation"]
    assert calls["count"] == 0

    with engine.begin() as conn:
        debit_count = conn.execute(text("SELECT COUNT(*) FROM pipeline_credit_ledger_entries")).scalar()
        provider_json = conn.execute(
            text(
                """
                SELECT provider_response_json
                FROM identity_verification_checks
                WHERE entry_phone_verification_id = :verification_id
                """
            ),
            {"verification_id": verification_id},
        ).scalar()
    assert debit_count == 0
    assert "blocked_missing_pipeline_credit_config" in provider_json


def test_live_truelayer_bank_verify_debits_pipeline_credit_before_provider_call(
    client,
    monkeypatch,
):

    from app.services.pipeline_credit_service import allocate_pipeline_credits
    from app.services.verification_adapters.bank_truelayer_gb import TrueLayerGBBankVerificationAdapter

    verification_id = _seed_verified_entry_phone_session(602)
    with SessionLocal() as db:
        entry = allocate_pipeline_credits(
            db,
            owner_type="platform",
            amount="5.00",
            idempotency_key="alloc-truelayer-route-test",
            note="Test platform provider account",
        )
        account_id = int(entry.account_id)

    monkeypatch.setenv("GMFN_VERIFICATION_MODE", "live")
    monkeypatch.setenv("GMFN_BANK_PROVIDER_GB", "truelayer")
    monkeypatch.setenv("TRUELAYER_ACCESS_TOKEN", "token")
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_ACCOUNT_ID_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", str(account_id))
    monkeypatch.setenv("GSN_PIPELINE_CREDIT_COST_BANK_GB_TRUELAYER_ACCOUNT_HOLDER_VERIFICATION", "1.25")

    seen_idempotency_keys = []
    responses = [
        {"id": "ahv-pipeline-1"},
        {"id": "ahv-pipeline-1", "status": "completed", "match_result": {"type": "match"}},
    ]

    def fake_request_json(self, *, method, url, body=None, idempotency_key=None):
        seen_idempotency_keys.append(idempotency_key)
        return responses.pop(0)

    monkeypatch.setattr(TrueLayerGBBankVerificationAdapter, "_request_json", fake_request_json)

    res = client.post(
        "/entry/bank/verify",
        json={
            "verification_id": verification_id,
            "destination_name": "John Doe",
            "bank_name": "Pilot Bank",
            "account_number": "12345678",
            "sort_code": "12-34-56",
            "country": "GB",
        },
    )
    assert res.status_code == 201, res.text
    body = res.json()
    assert body["status"] == "matched"
    assert body["provider_key"] == "bank.gb.truelayer"
    assert len(seen_idempotency_keys) == 2
    assert seen_idempotency_keys[0].startswith("provider-spend:bank.gb.truelayer:entry-bank:602:")
    assert seen_idempotency_keys[1] is None

    with engine.begin() as conn:
        rows = conn.execute(
            text(
                """
                SELECT credit_amount, balance_after, workflow_key, provider_key, idempotency_key
                FROM pipeline_credit_ledger_entries
                WHERE entry_type = 'debit'
                """
            )
        ).fetchall()
        provider_json = conn.execute(
            text(
                """
                SELECT provider_response_json
                FROM identity_verification_checks
                WHERE entry_phone_verification_id = :verification_id
                """
            ),
            {"verification_id": verification_id},
        ).scalar()

    assert len(rows) == 1
    assert str(rows[0][0]) == "-1.25"
    assert str(rows[0][1]) == "3.75"
    assert rows[0][2] == "bank.gb.truelayer.account_holder_verification"
    assert rows[0][3] == "bank.gb.truelayer"
    assert rows[0][4] == seen_idempotency_keys[0]
    provider_payload = json.loads(provider_json)
    assert provider_payload["pipeline_credit_gate"]["ok"] is True
    assert provider_payload["pipeline_credit_gate"]["ledger_entry"]["credit_amount"] == "-1.25"
