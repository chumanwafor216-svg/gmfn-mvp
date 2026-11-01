from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import pytest

from app.db.database import SessionLocal
from app.db.models import TrustSlip
from app.services import trust_slips_services


def _snapshot_slip(payload: dict, *, checksum: str | None) -> TrustSlip:
    return TrustSlip(
        code="CHECKSUM-TEST",
        clan_id=1,
        holder_user_id=1,
        trust_limit=0,
        currency="NGN",
        status="active",
        snapshot_json=json.dumps(payload, ensure_ascii=False),
        snapshot_version="trustslip-snapshot/v2",
        snapshot_checksum=checksum,
        is_current=True,
    )


def test_snapshot_checksum_verifier_matches_existing_v2_writer_without_mutation(seed_clan_admin_membership):
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        slip = TrustSlip(
            code="CHECKSUM-WRITER-COMPAT",
            clan_id=1,
            holder_user_id=1,
            trust_limit=Decimal("0.00"),
            currency="NGN",
            status="active",
            expires_at=now + timedelta(days=7),
            created_at=now,
            is_current=True,
        )
        db.add(slip)
        db.flush()
        written = trust_slips_services.store_trust_slip_snapshot(
            db,
            slip=slip,
            full_payload={
                "code": slip.code,
                "gmfn_id": "GSN-U-CHECKSUM",
                "status": "active",
                "expires_at": slip.expires_at.isoformat(),
                "currency": "NGN",
            },
            visibility_level="standard",
            commit=False,
        )
        before_json = slip.snapshot_json
        before_checksum = slip.snapshot_checksum

        result = trust_slips_services.verify_trust_slip_snapshot_checksum(slip)

        assert written["snapshot_version"] == "trustslip-snapshot/v2"
        assert result == {
            "status": "verified",
            "verified": True,
            "legacy_compatible": False,
            "computed_checksum": before_checksum,
        }
        assert slip.snapshot_json == before_json
        assert slip.snapshot_checksum == before_checksum
    finally:
        db.close()


def test_snapshot_checksum_verifier_detects_tampering_without_rewriting_snapshot():
    original = {"snapshot_version": "trustslip-snapshot/v2", "status": "active"}
    slip = _snapshot_slip(original, checksum=trust_slips_services._snapshot_checksum(original))
    slip.snapshot_json = json.dumps({**original, "status": "revoked"})
    tampered_json = slip.snapshot_json

    result = trust_slips_services.verify_trust_slip_snapshot_checksum(slip)

    assert result["status"] == "checksum_mismatch"
    assert result["verified"] is False
    assert slip.snapshot_json == tampered_json


def test_snapshot_checksum_verifier_preserves_legacy_missing_checksum_compatibility():
    payload = {"snapshot_version": "trustslip-snapshot/v2", "status": "active"}
    slip = _snapshot_slip(payload, checksum=None)

    result = trust_slips_services.verify_trust_slip_snapshot_checksum(slip)

    assert result["status"] == "legacy_checksum_missing"
    assert result["verified"] is False
    assert result["legacy_compatible"] is True
    assert result["computed_checksum"] == trust_slips_services._snapshot_checksum(payload)


def test_snapshot_checksum_verifier_rejects_unreadable_snapshot():
    slip = _snapshot_slip({}, checksum="not-used")
    slip.snapshot_json = "{not-json"

    result = trust_slips_services.verify_trust_slip_snapshot_checksum(slip)

    assert result == {
        "status": "snapshot_unreadable",
        "verified": False,
        "legacy_compatible": False,
        "computed_checksum": None,
    }


def _new_unsaved_slip(*, code: str) -> TrustSlip:
    now = datetime(2026, 10, 31, 12, 0, tzinfo=timezone.utc)
    return TrustSlip(
        code=code,
        clan_id=1,
        holder_user_id=1,
        trust_limit=Decimal("0.00"),
        currency="NGN",
        status="active",
        expires_at=now + timedelta(days=7),
        created_at=now,
        is_current=True,
    )


def _minimal_payload() -> dict:
    return {
        "code": "V2-V3-COMPAT",
        "gmfn_id": "GSN-U-COMPAT",
        "member_name": "Recorded Holder",
        "status": "active",
        "expires_at": "2026-11-07T12:00:00+00:00",
        "currency": "NGN",
        "identity_context": {
            "phone_recorded": True,
            "phone_verified": True,
            "official_id_recorded": True,
            "official_id_verified": True,
        },
    }


def _clear_trustslip_runtime_environments(monkeypatch) -> None:
    for name in trust_slips_services._TRUSTSLIP_V1_RUNTIME_ENVIRONMENT_NAMES:
        monkeypatch.delenv(name, raising=False)


def test_disabled_shadow_writer_is_byte_compatible_with_existing_v2_writer(
    seed_clan_admin_membership,
    monkeypatch,
):
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "false")
    monkeypatch.setattr(trust_slips_services, "_now_iso", lambda: "2026-10-31T12:00:00+00:00")
    db = SessionLocal()
    try:
        direct_slip = _new_unsaved_slip(code="DIRECT-V2")
        guarded_slip = _new_unsaved_slip(code="GUARDED-V2")
        db.add_all([direct_slip, guarded_slip])
        db.flush()

        direct = trust_slips_services.store_trust_slip_snapshot(
            db,
            slip=direct_slip,
            full_payload=_minimal_payload(),
            visibility_level="standard",
            commit=False,
        )
        guarded = trust_slips_services._store_newly_issued_trust_slip_snapshot(
            db,
            slip=guarded_slip,
            full_payload=_minimal_payload(),
            visibility_level="standard",
            v1_purpose="general",
            commit=False,
        )

        assert direct_slip.snapshot_version == guarded_slip.snapshot_version == "trustslip-snapshot/v2"
        assert direct_slip.snapshot_json == guarded_slip.snapshot_json
        assert direct_slip.snapshot_checksum == guarded_slip.snapshot_checksum
        assert direct == guarded
        assert "trustslip_v1_projection" not in json.loads(guarded_slip.snapshot_json)
    finally:
        db.close()


@pytest.mark.parametrize("purpose", ["general", "shop_review"])
def test_enabled_nonproduction_shadow_writer_stores_verifiable_complete_v3_snapshot(
    seed_clan_admin_membership,
    monkeypatch,
    purpose,
):
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    monkeypatch.setattr(trust_slips_services, "_now_iso", lambda: "2026-10-31T12:00:00+00:00")
    db = SessionLocal()
    try:
        slip = _new_unsaved_slip(code=f"V3-{purpose.upper()}")
        db.add(slip)
        db.flush()

        payload = _minimal_payload()
        payload.update(
            {
                "phone": "+441234567890",
                "address": "PRIVATE ADDRESS",
                "price": "999.00",
                "transaction_id": "PRIVATE-TX",
                "private_note": "PRIVATE NOTE",
            }
        )
        written = trust_slips_services._store_newly_issued_trust_slip_snapshot(
            db,
            slip=slip,
            full_payload=payload,
            visibility_level="standard",
            v1_purpose=purpose,
            commit=False,
        )
        stored = json.loads(slip.snapshot_json)

        assert slip.snapshot_version == "trustslip-snapshot/v3"
        assert written["snapshot_checksum"] == slip.snapshot_checksum
        assert stored["trustslip_v1_projection"]["purpose"] == purpose
        assert len(stored["trustslip_v1_projection"]["answers"]) == 8
        projection_json = json.dumps(stored["trustslip_v1_projection"])
        for private_value in (
            "Recorded Holder",
            "GSN-U-COMPAT",
            "+441234567890",
            "PRIVATE ADDRESS",
            "999.00",
            "PRIVATE-TX",
            "PRIVATE NOTE",
        ):
            assert private_value not in projection_json
        assert trust_slips_services.verify_trust_slip_snapshot_checksum(slip)["status"] == "verified"

        stored["trustslip_v1_projection"]["answers"][0]["outcome"] = "supported_favourable"
        slip.snapshot_json = json.dumps(stored, ensure_ascii=False)
        assert trust_slips_services.verify_trust_slip_snapshot_checksum(slip)["status"] == "checksum_mismatch"
    finally:
        db.close()


@pytest.mark.parametrize("runtime_environment", ["production", "prod", "live", "staging", "stage"])
def test_shadow_writes_reject_live_and_staging_environments(monkeypatch, runtime_environment):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", runtime_environment)

    with pytest.raises(RuntimeError, match="forbidden_in_live_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_require_explicit_environment_even_when_pytest_marker_is_true(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("PYTEST_RUNNING", "true")

    with pytest.raises(RuntimeError, match="require_explicit_non_production_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_reject_missing_runtime_environments(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")

    with pytest.raises(RuntimeError, match="require_explicit_non_production_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_reject_blank_runtime_environment(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "")

    with pytest.raises(RuntimeError, match="malformed_runtime_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_reject_valid_environment_with_present_blank_variable(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    monkeypatch.setenv("ENVIRONMENT", "")

    with pytest.raises(RuntimeError, match="malformed_runtime_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_reject_valid_environment_with_whitespace_only_variable(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    monkeypatch.setenv("ENVIRONMENT", "  \t  ")

    with pytest.raises(RuntimeError, match="malformed_runtime_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_accept_multiple_agreeing_nonproduction_environments(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    monkeypatch.setenv("GMFN_ENVIRONMENT", "test")
    monkeypatch.setenv("ENVIRONMENT", "test")
    monkeypatch.setenv("RENDER_ENV", "test")

    assert trust_slips_services._trustslip_v1_shadow_writes_enabled() is True


@pytest.mark.parametrize("runtime_environment", ["qa", "test environment", "development,test"])
def test_shadow_writes_reject_unknown_or_malformed_environment(monkeypatch, runtime_environment):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", runtime_environment)

    with pytest.raises(RuntimeError, match="require_explicit_non_production_environment"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


def test_shadow_writes_reject_conflicting_runtime_environments(monkeypatch):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    monkeypatch.setenv("ENVIRONMENT", "production")

    with pytest.raises(RuntimeError, match="conflicting_runtime_environments"):
        trust_slips_services._trustslip_v1_shadow_writes_enabled()


@pytest.mark.parametrize("flag_value", [None, "", "false", "0", "off", "malformed"])
def test_disabled_or_malformed_flag_cannot_enable_v3(monkeypatch, flag_value):
    _clear_trustslip_runtime_environments(monkeypatch)
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "")
    monkeypatch.setenv("ENVIRONMENT", "qa")
    monkeypatch.setenv("PYTEST_RUNNING", "true")
    if flag_value is None:
        monkeypatch.delenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, raising=False)
    else:
        monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, flag_value)

    assert trust_slips_services._trustslip_v1_shadow_writes_enabled() is False


def test_generic_snapshot_ensure_never_generates_v3_even_when_shadow_flag_is_enabled(
    seed_clan_admin_membership,
    monkeypatch,
):
    monkeypatch.setenv(trust_slips_services.TRUSTSLIP_V1_SNAPSHOT_WRITES_ENV, "true")
    monkeypatch.setenv("GSN_RUNTIME_ENVIRONMENT", "test")
    db = SessionLocal()
    try:
        slip = _new_unsaved_slip(code="GENERIC-ENSURE-V2")
        db.add(slip)
        db.flush()

        snapshot = trust_slips_services.ensure_trust_slip_snapshot(
            db,
            slip=slip,
            user=None,
            full_payload=_minimal_payload(),
            commit=False,
        )

        assert snapshot["snapshot_version"] == "trustslip-snapshot/v2"
        assert slip.snapshot_version == "trustslip-snapshot/v2"
        assert "trustslip_v1_projection" not in json.loads(slip.snapshot_json)
    finally:
        db.close()
