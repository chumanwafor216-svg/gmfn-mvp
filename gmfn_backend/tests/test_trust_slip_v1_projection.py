from __future__ import annotations

import copy
import json

import pytest

from app.services.trust_slip_v1_projection import (
    OUTCOMES,
    QUESTION_ORDER,
    EvidenceBundleValidationError,
    authorize_stage_a_evidence_bundle,
    project_trust_slip_v1,
)


def _public_count(count: int) -> dict:
    if count < 3:
        return {"exact_count": None, "count_band": "fewer_than_3", "suppressed": True}
    return {"exact_count": count, "count_band": "3_or_more", "suppressed": False}


def _bundle(*, purpose: str = "general", witness_count: int = 0, counterparty_count: int = 0) -> dict:
    witness_suppressed = witness_count < 3
    bundle = {
        "bundle_version": "trustslip-v1-evidence/v1",
        "purpose": purpose,
        "collected_at": "2026-10-31T12:00:00+00:00",
        "historical_snapshot_reconstruction": False,
        "identity": {
            "recorded": {
                "member_name": True,
                "gsn_id": True,
                "phone": True,
                "bank_details": False,
                "official_id": True,
            },
            "verification_records": {
                "phone": True,
                "bank_details": False,
                "official_id": True,
                "community_identity_confirmation": False,
            },
            "independently_verified": False,
            "independent_verification_method": None,
            "limitation": (
                "Recorded and workflow verification facts are not described as independent identity verification."
            ),
        },
        "current_trust_slip_lifecycle": {
            "status_recorded": "active",
            "expired": False,
            "revoked": False,
            "frozen": False,
            "superseded": False,
            "disputed": False,
        },
        "activity": {
            "sample_count": 2,
            "sample_limit": 200,
            "sample_truncated": False,
            "families": [
                {
                    "family": "focus_commitment",
                    "sample_count": 2,
                    "signals": ["commitment_completion", "commitment_record"],
                }
            ],
            "sensitive_caution_present": False,
        },
        "adverse_or_caution": {
            "adverse_event_present": False,
            "correction_or_adverse_event_present": False,
            "non_clean_lifecycle_marker_present": False,
            "community_review_caution_present": False,
            "unresolved_trade_dispute_present": False,
        },
        "witnesses": {
            "public_count": _public_count(witness_count),
            "response_presence": (
                {"favourable": None, "caution": None, "adverse": None}
                if witness_suppressed
                else {"favourable": True, "caution": False, "adverse": False}
            ),
            "response_breakdown_suppressed": witness_suppressed,
        },
        "shop": None,
        "projection_safety": {
            "favourable_conclusion_allowed": False,
            "sufficiency_evaluated": False,
            "sample_truncated": False,
            "adverse_or_caution_present": False,
        },
        "limitations": [],
    }
    if purpose == "shop_review":
        bundle["shop"] = {
            "active_shop_recorded": True,
            "active_offer_count": 2,
            "trade_record_count": 1,
            "completed_trade_record_count": 1,
            "unresolved_trade_dispute_count": 0,
            "counterparties": _public_count(counterparty_count),
        }
    return bundle


def _projection(bundle: dict) -> dict:
    return project_trust_slip_v1(authorize_stage_a_evidence_bundle(bundle))


@pytest.mark.parametrize("purpose", ["general", "shop_review"])
def test_approved_purposes_generate_exactly_eight_ordered_answers(purpose):
    projection = _projection(_bundle(purpose=purpose, witness_count=3, counterparty_count=3))

    assert projection["purpose"] == purpose
    assert len(projection["answers"]) == 8
    assert tuple(answer["question_id"] for answer in projection["answers"]) == QUESTION_ORDER


@pytest.mark.parametrize(
    "purpose",
    ["opportunity_review", "protected_trade_review", "community_role_review", "GENERAL"],
)
def test_unapproved_purposes_are_rejected(purpose):
    with pytest.raises(EvidenceBundleValidationError, match="purpose_unsupported"):
        authorize_stage_a_evidence_bundle(_bundle(purpose=purpose))


def test_empty_purpose_is_rejected():
    with pytest.raises(EvidenceBundleValidationError, match="purpose_must_be_text_or_none"):
        authorize_stage_a_evidence_bundle(_bundle(purpose=""))


def test_projection_requires_authorized_typed_evidence():
    with pytest.raises(TypeError, match="requires_authorized_evidence_bundle"):
        project_trust_slip_v1(_bundle())


def test_all_seven_statuses_are_represented_without_changing_vocabulary():
    bundle = _bundle(purpose="shop_review", witness_count=3, counterparty_count=1)
    bundle["witnesses"]["response_presence"] = {
        "favourable": True,
        "caution": False,
        "adverse": True,
    }
    bundle["adverse_or_caution"]["adverse_event_present"] = True
    bundle["adverse_or_caution"]["correction_or_adverse_event_present"] = True
    bundle["projection_safety"]["adverse_or_caution_present"] = True

    outcomes = {answer["outcome"] for answer in _projection(bundle)["answers"]}

    assert outcomes == OUTCOMES


def test_projection_json_is_deterministic_for_same_authorized_bundle():
    evidence = authorize_stage_a_evidence_bundle(_bundle(purpose="shop_review", witness_count=3))

    first = json.dumps(project_trust_slip_v1(evidence), sort_keys=True, separators=(",", ":"))
    second = json.dumps(project_trust_slip_v1(evidence), sort_keys=True, separators=(",", ":"))

    assert first == second


def test_missing_or_truncated_evidence_never_becomes_favourable():
    missing = _bundle()
    missing["activity"].update({"sample_count": 0, "families": []})
    missing_projection = _projection(missing)
    relevant = next(row for row in missing_projection["answers"] if row["question_id"] == "relevant_experience")
    comparable = next(row for row in missing_projection["answers"] if row["question_id"] == "comparable_activity")
    assert relevant["outcome"] == "unavailable"
    assert comparable["outcome"] == "unavailable"

    truncated = _bundle()
    truncated["activity"].update({"sample_count": 200, "sample_truncated": True})
    truncated["projection_safety"]["sample_truncated"] = True
    truncated["limitations"] = ["activity_sample_truncated_no_favourable_conclusion"]
    truncated_projection = _projection(truncated)
    sample_based = {
        row["question_id"]: row["outcome"]
        for row in truncated_projection["answers"]
        if row["question_id"] in {"relevant_experience", "comparable_activity", "commitment_performance"}
    }
    assert "supported_favourable" not in sample_based.values()


def test_witness_and_counterparty_privacy_thresholds_are_enforced():
    one = _projection(_bundle(purpose="shop_review", witness_count=1, counterparty_count=1))
    two = _projection(_bundle(purpose="shop_review", witness_count=2, counterparty_count=2))
    three = _projection(_bundle(purpose="shop_review", witness_count=3, counterparty_count=3))

    one_witness = next(row for row in one["answers"] if row["question_id"] == "witnesses")
    two_witness = next(row for row in two["answers"] if row["question_id"] == "witnesses")
    three_witness = next(row for row in three["answers"] if row["question_id"] == "witnesses")
    assert one_witness["evidence"] == two_witness["evidence"]
    assert one_witness["evidence"]["exact_count"] is None
    assert three_witness["evidence"]["exact_count"] == 3
    assert three_witness["evidence"]["response_breakdown_suppressed"] is False

    encoded_one = json.dumps(one)
    encoded_two = json.dumps(two)
    assert '"exact_count": 1' not in encoded_one
    assert '"exact_count": 2' not in encoded_two


@pytest.mark.parametrize(
    "private_key, private_value",
    [
        ("name", "PRIVATE PERSON"),
        ("phone", "+441234567890"),
        ("address", "PRIVATE ADDRESS"),
        ("price", "999.00"),
        ("transaction_id", "PRIVATE-TX"),
        ("private_note", "PRIVATE NOTE"),
    ],
)
def test_private_or_unknown_source_fields_are_rejected(private_key, private_value):
    bundle = _bundle()
    bundle["witnesses"][private_key] = private_value

    with pytest.raises(EvidenceBundleValidationError, match="witnesses_keys_invalid"):
        authorize_stage_a_evidence_bundle(bundle)


def test_recorded_identity_is_never_labelled_independently_verified():
    projection = _projection(_bundle())
    identity = next(row for row in projection["answers"] if row["question_id"] == "identity")

    assert identity["outcome"] == "insufficient"
    assert identity["evidence"]["independently_verified"] is False
    assert "not established" in identity["summary"]


def test_current_validity_is_not_merged_into_evidence_at_issuance():
    projection = _projection(_bundle())

    assert projection["evidence_at_issuance"]["trustslip_lifecycle"]["status_recorded"] == "active"
    assert projection["current_validity"]["embedded"] is False
    assert "separately" in projection["current_validity"]["instruction"]


def test_input_bundle_is_not_mutated():
    bundle = _bundle(purpose="shop_review", witness_count=3, counterparty_count=3)
    before = copy.deepcopy(bundle)

    _projection(bundle)

    assert bundle == before


def test_malformed_signal_and_impossible_family_counts_are_rejected_cleanly():
    malformed = _bundle()
    malformed["activity"]["families"][0]["signals"] = [{"private": "value"}]
    with pytest.raises(EvidenceBundleValidationError, match="activity_signal_invalid"):
        authorize_stage_a_evidence_bundle(malformed)

    impossible = _bundle()
    impossible["activity"]["families"][0]["sample_count"] = 3
    with pytest.raises(EvidenceBundleValidationError, match="activity_family_counts_exceed_sample"):
        authorize_stage_a_evidence_bundle(impossible)
