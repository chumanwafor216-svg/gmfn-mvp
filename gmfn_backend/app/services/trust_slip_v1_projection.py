from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Any, Mapping, Optional

from app.core.trust_evidence_families import (
    PUBLIC_EVIDENCE_FAMILY_LABELS,
    PUBLIC_EVIDENCE_SIGNAL_LABELS,
    evidence_signal_matches_family,
)
from app.services.trust_slip_v1_evidence import EVIDENCE_BUNDLE_VERSION, MAX_EVENT_SAMPLE


PROJECTION_VERSION = "trustslip-v1-projection/v1"
SUPPORTED_PURPOSES = frozenset({"general", "shop_review"})
OUTCOMES = frozenset(
    {
        "supported_favourable",
        "supported_adverse",
        "mixed",
        "insufficient",
        "unavailable",
        "private_review_required",
        "not_applicable",
    }
)
QUESTION_ORDER = (
    "identity",
    "relevant_experience",
    "comparable_activity",
    "commitment_performance",
    "witnesses",
    "recency",
    "unresolved_problems",
    "uncertainty",
)
_QUESTION_TEXT = {
    "identity": "What identity information is recorded, and is any of it independently verified?",
    "relevant_experience": "Is there recorded experience relevant to this purpose?",
    "comparable_activity": "Is there recorded activity comparable to this purpose?",
    "commitment_performance": "What does the evidence show about recorded commitment performance?",
    "witnesses": "What authorised witness or counterparty evidence is available?",
    "recency": "How recent is the relevant evidence?",
    "unresolved_problems": "Are unresolved problems, disputes or adverse evidence recorded?",
    "uncertainty": "What important uncertainty or private evidence remains?",
}
_KNOWN_LIMITATIONS = frozenset({"activity_sample_truncated_no_favourable_conclusion"})


class EvidenceBundleValidationError(ValueError):
    pass


@dataclass(frozen=True)
class IdentityEvidence:
    recorded: tuple[str, ...]
    verification_records: tuple[str, ...]
    independently_verified: bool


@dataclass(frozen=True)
class LifecycleEvidence:
    status_recorded: Optional[str]
    expired: bool
    revoked: bool
    frozen: bool
    superseded: bool
    disputed: bool


@dataclass(frozen=True)
class ActivityFamilyEvidence:
    family: str
    sample_count: int
    signals: tuple[str, ...]


@dataclass(frozen=True)
class ActivityEvidence:
    sample_count: int
    sample_limit: int
    sample_truncated: bool
    families: tuple[ActivityFamilyEvidence, ...]
    sensitive_caution_present: bool


@dataclass(frozen=True)
class AdverseEvidence:
    adverse_event_present: bool
    correction_or_adverse_event_present: bool
    non_clean_lifecycle_marker_present: bool
    community_review_caution_present: bool
    unresolved_trade_dispute_present: bool


@dataclass(frozen=True)
class PublicGroupCount:
    exact_count: Optional[int]
    count_band: str
    suppressed: bool


@dataclass(frozen=True)
class WitnessEvidence:
    public_count: PublicGroupCount
    favourable_response_present: Optional[bool]
    caution_response_present: Optional[bool]
    adverse_response_present: Optional[bool]
    response_breakdown_suppressed: bool


@dataclass(frozen=True)
class ShopEvidence:
    active_shop_recorded: bool
    active_offer_count: int
    trade_record_count: int
    completed_trade_record_count: int
    unresolved_trade_dispute_count: int
    counterparties: PublicGroupCount


@dataclass(frozen=True)
class ProjectionSafety:
    stage_a_favourable_conclusion_allowed: bool
    stage_a_sufficiency_evaluated: bool
    sample_truncated: bool
    adverse_or_caution_present: bool


@dataclass(frozen=True)
class AuthorizedTrustSlipV1Evidence:
    bundle_version: str
    purpose: str
    collected_at: str
    identity: IdentityEvidence
    lifecycle: LifecycleEvidence
    activity: ActivityEvidence
    adverse: AdverseEvidence
    witnesses: WitnessEvidence
    shop: Optional[ShopEvidence]
    safety: ProjectionSafety
    limitations: tuple[str, ...]


def _mapping(value: Any, label: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise EvidenceBundleValidationError(f"{label}_must_be_mapping")
    return value


def _exact_keys(value: Mapping[str, Any], expected: set[str], label: str) -> None:
    actual = set(value.keys())
    if actual != expected:
        raise EvidenceBundleValidationError(f"{label}_keys_invalid")


def _boolean(value: Any, label: str) -> bool:
    if not isinstance(value, bool):
        raise EvidenceBundleValidationError(f"{label}_must_be_boolean")
    return value


def _non_negative_int(value: Any, label: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise EvidenceBundleValidationError(f"{label}_must_be_non_negative_integer")
    return value


def _optional_text(value: Any, label: str) -> Optional[str]:
    if value is None:
        return None
    if not isinstance(value, str) or not value.strip():
        raise EvidenceBundleValidationError(f"{label}_must_be_text_or_none")
    return value.strip()


def _public_group_count(value: Any, label: str) -> PublicGroupCount:
    mapped = _mapping(value, label)
    _exact_keys(mapped, {"exact_count", "count_band", "suppressed"}, label)
    suppressed = _boolean(mapped["suppressed"], f"{label}_suppressed")
    band = _optional_text(mapped["count_band"], f"{label}_count_band")
    exact = mapped["exact_count"]
    if suppressed:
        if exact is not None or band != "fewer_than_3":
            raise EvidenceBundleValidationError(f"{label}_suppression_invalid")
        return PublicGroupCount(exact_count=None, count_band="fewer_than_3", suppressed=True)
    exact_count = _non_negative_int(exact, f"{label}_exact_count")
    if exact_count < 3 or band != "3_or_more":
        raise EvidenceBundleValidationError(f"{label}_public_count_invalid")
    return PublicGroupCount(exact_count=exact_count, count_band="3_or_more", suppressed=False)


def authorize_stage_a_evidence_bundle(raw: Mapping[str, Any]) -> AuthorizedTrustSlipV1Evidence:
    bundle = _mapping(raw, "evidence_bundle")
    _exact_keys(
        bundle,
        {
            "bundle_version",
            "purpose",
            "collected_at",
            "historical_snapshot_reconstruction",
            "identity",
            "current_trust_slip_lifecycle",
            "activity",
            "adverse_or_caution",
            "witnesses",
            "shop",
            "projection_safety",
            "limitations",
        },
        "evidence_bundle",
    )
    if bundle["bundle_version"] != EVIDENCE_BUNDLE_VERSION:
        raise EvidenceBundleValidationError("evidence_bundle_version_unsupported")
    purpose = _optional_text(bundle["purpose"], "purpose")
    if purpose not in SUPPORTED_PURPOSES:
        raise EvidenceBundleValidationError("purpose_unsupported")
    collected_at = _optional_text(bundle["collected_at"], "collected_at")
    try:
        datetime.fromisoformat(str(collected_at).replace("Z", "+00:00"))
    except Exception as exc:
        raise EvidenceBundleValidationError("collected_at_invalid") from exc
    if bundle["historical_snapshot_reconstruction"] is not False:
        raise EvidenceBundleValidationError("historical_snapshot_reconstruction_forbidden")

    identity_raw = _mapping(bundle["identity"], "identity")
    _exact_keys(
        identity_raw,
        {
            "recorded",
            "verification_records",
            "independently_verified",
            "independent_verification_method",
            "limitation",
        },
        "identity",
    )
    recorded_raw = _mapping(identity_raw["recorded"], "identity_recorded")
    verification_raw = _mapping(identity_raw["verification_records"], "identity_verification_records")
    identity_keys = {"member_name", "gsn_id", "phone", "bank_details", "official_id"}
    verification_keys = {"phone", "bank_details", "official_id", "community_identity_confirmation"}
    _exact_keys(recorded_raw, identity_keys, "identity_recorded")
    _exact_keys(verification_raw, verification_keys, "identity_verification_records")
    independently_verified = _boolean(identity_raw["independently_verified"], "independently_verified")
    method = identity_raw["independent_verification_method"]
    if independently_verified or method is not None:
        raise EvidenceBundleValidationError("independent_identity_verification_not_authorised")
    if identity_raw["limitation"] != (
        "Recorded and workflow verification facts are not described as independent identity verification."
    ):
        raise EvidenceBundleValidationError("identity_limitation_invalid")
    identity = IdentityEvidence(
        recorded=tuple(sorted(key for key in identity_keys if _boolean(recorded_raw[key], f"recorded_{key}"))),
        verification_records=tuple(
            sorted(key for key in verification_keys if _boolean(verification_raw[key], f"verification_{key}"))
        ),
        independently_verified=False,
    )

    lifecycle_raw = _mapping(bundle["current_trust_slip_lifecycle"], "lifecycle")
    _exact_keys(
        lifecycle_raw,
        {"status_recorded", "expired", "revoked", "frozen", "superseded", "disputed"},
        "lifecycle",
    )
    lifecycle = LifecycleEvidence(
        status_recorded=_optional_text(lifecycle_raw["status_recorded"], "status_recorded"),
        expired=_boolean(lifecycle_raw["expired"], "expired"),
        revoked=_boolean(lifecycle_raw["revoked"], "revoked"),
        frozen=_boolean(lifecycle_raw["frozen"], "frozen"),
        superseded=_boolean(lifecycle_raw["superseded"], "superseded"),
        disputed=_boolean(lifecycle_raw["disputed"], "disputed"),
    )

    activity_raw = _mapping(bundle["activity"], "activity")
    _exact_keys(
        activity_raw,
        {"sample_count", "sample_limit", "sample_truncated", "families", "sensitive_caution_present"},
        "activity",
    )
    sample_count = _non_negative_int(activity_raw["sample_count"], "sample_count")
    sample_limit = _non_negative_int(activity_raw["sample_limit"], "sample_limit")
    if sample_limit != MAX_EVENT_SAMPLE or sample_count > sample_limit:
        raise EvidenceBundleValidationError("activity_sample_bounds_invalid")
    family_rows = activity_raw["families"]
    if not isinstance(family_rows, list):
        raise EvidenceBundleValidationError("activity_families_must_be_list")
    parsed_families: list[ActivityFamilyEvidence] = []
    seen_families: set[str] = set()
    for row in family_rows:
        mapped = _mapping(row, "activity_family")
        _exact_keys(mapped, {"family", "sample_count", "signals"}, "activity_family")
        family = _optional_text(mapped["family"], "activity_family_name")
        if family not in PUBLIC_EVIDENCE_FAMILY_LABELS or family in seen_families:
            raise EvidenceBundleValidationError("activity_family_invalid")
        seen_families.add(family)
        family_count = _non_negative_int(mapped["sample_count"], "activity_family_count")
        signals_raw = mapped["signals"]
        if not isinstance(signals_raw, list):
            raise EvidenceBundleValidationError("activity_signals_must_be_list")
        if any(
            not isinstance(signal, str)
            or signal not in PUBLIC_EVIDENCE_SIGNAL_LABELS
            or not evidence_signal_matches_family(signal, family)
            for signal in signals_raw
        ):
            raise EvidenceBundleValidationError("activity_signal_invalid")
        signals = tuple(sorted(set(signals_raw)))
        parsed_families.append(ActivityFamilyEvidence(family=family, sample_count=family_count, signals=signals))
    if sum(row.sample_count for row in parsed_families) > sample_count:
        raise EvidenceBundleValidationError("activity_family_counts_exceed_sample")
    activity = ActivityEvidence(
        sample_count=sample_count,
        sample_limit=sample_limit,
        sample_truncated=_boolean(activity_raw["sample_truncated"], "sample_truncated"),
        families=tuple(sorted(parsed_families, key=lambda row: row.family)),
        sensitive_caution_present=_boolean(
            activity_raw["sensitive_caution_present"], "sensitive_caution_present"
        ),
    )

    adverse_raw = _mapping(bundle["adverse_or_caution"], "adverse")
    adverse_keys = {
        "adverse_event_present",
        "correction_or_adverse_event_present",
        "non_clean_lifecycle_marker_present",
        "community_review_caution_present",
        "unresolved_trade_dispute_present",
    }
    _exact_keys(adverse_raw, adverse_keys, "adverse")
    adverse = AdverseEvidence(**{key: _boolean(adverse_raw[key], key) for key in adverse_keys})

    witnesses_raw = _mapping(bundle["witnesses"], "witnesses")
    _exact_keys(
        witnesses_raw,
        {"public_count", "response_presence", "response_breakdown_suppressed"},
        "witnesses",
    )
    witness_count = _public_group_count(witnesses_raw["public_count"], "witness_count")
    response_raw = _mapping(witnesses_raw["response_presence"], "response_presence")
    _exact_keys(response_raw, {"favourable", "caution", "adverse"}, "response_presence")
    response_suppressed = _boolean(
        witnesses_raw["response_breakdown_suppressed"], "response_breakdown_suppressed"
    )
    response_values = (response_raw["favourable"], response_raw["caution"], response_raw["adverse"])
    if response_suppressed:
        if not witness_count.suppressed or any(value is not None for value in response_values):
            raise EvidenceBundleValidationError("suppressed_response_breakdown_invalid")
    elif witness_count.suppressed or any(not isinstance(value, bool) for value in response_values):
        raise EvidenceBundleValidationError("response_breakdown_invalid")
    witnesses = WitnessEvidence(
        public_count=witness_count,
        favourable_response_present=response_raw["favourable"],
        caution_response_present=response_raw["caution"],
        adverse_response_present=response_raw["adverse"],
        response_breakdown_suppressed=response_suppressed,
    )

    shop: Optional[ShopEvidence] = None
    if bundle["shop"] is not None:
        shop_raw = _mapping(bundle["shop"], "shop")
        _exact_keys(
            shop_raw,
            {
                "active_shop_recorded",
                "active_offer_count",
                "trade_record_count",
                "completed_trade_record_count",
                "unresolved_trade_dispute_count",
                "counterparties",
            },
            "shop",
        )
        shop = ShopEvidence(
            active_shop_recorded=_boolean(shop_raw["active_shop_recorded"], "active_shop_recorded"),
            active_offer_count=_non_negative_int(shop_raw["active_offer_count"], "active_offer_count"),
            trade_record_count=_non_negative_int(shop_raw["trade_record_count"], "trade_record_count"),
            completed_trade_record_count=_non_negative_int(
                shop_raw["completed_trade_record_count"], "completed_trade_record_count"
            ),
            unresolved_trade_dispute_count=_non_negative_int(
                shop_raw["unresolved_trade_dispute_count"], "unresolved_trade_dispute_count"
            ),
            counterparties=_public_group_count(shop_raw["counterparties"], "counterparties"),
        )
    if purpose == "shop_review" and shop is None:
        raise EvidenceBundleValidationError("shop_review_requires_shop_evidence")
    if purpose == "general" and shop is not None:
        raise EvidenceBundleValidationError("general_must_not_include_shop_evidence")

    safety_raw = _mapping(bundle["projection_safety"], "projection_safety")
    _exact_keys(
        safety_raw,
        {
            "favourable_conclusion_allowed",
            "sufficiency_evaluated",
            "sample_truncated",
            "adverse_or_caution_present",
        },
        "projection_safety",
    )
    safety = ProjectionSafety(
        stage_a_favourable_conclusion_allowed=_boolean(
            safety_raw["favourable_conclusion_allowed"], "favourable_conclusion_allowed"
        ),
        stage_a_sufficiency_evaluated=_boolean(safety_raw["sufficiency_evaluated"], "sufficiency_evaluated"),
        sample_truncated=_boolean(safety_raw["sample_truncated"], "safety_sample_truncated"),
        adverse_or_caution_present=_boolean(
            safety_raw["adverse_or_caution_present"], "safety_adverse_or_caution_present"
        ),
    )
    if safety.sample_truncated != activity.sample_truncated:
        raise EvidenceBundleValidationError("projection_safety_truncation_mismatch")
    if safety.stage_a_favourable_conclusion_allowed or safety.stage_a_sufficiency_evaluated:
        raise EvidenceBundleValidationError("stage_a_projection_authority_invalid")

    limitations_raw = bundle["limitations"]
    if not isinstance(limitations_raw, list) or any(item not in _KNOWN_LIMITATIONS for item in limitations_raw):
        raise EvidenceBundleValidationError("limitations_invalid")
    limitations = tuple(sorted(set(limitations_raw)))
    if activity.sample_truncated != ("activity_sample_truncated_no_favourable_conclusion" in limitations):
        raise EvidenceBundleValidationError("truncation_limitation_mismatch")

    return AuthorizedTrustSlipV1Evidence(
        bundle_version=EVIDENCE_BUNDLE_VERSION,
        purpose=purpose,
        collected_at=collected_at,
        identity=identity,
        lifecycle=lifecycle,
        activity=activity,
        adverse=adverse,
        witnesses=witnesses,
        shop=shop,
        safety=safety,
        limitations=limitations,
    )


def _answer(question_id: str, outcome: str, summary: str, evidence: Mapping[str, Any], limitations=()) -> dict[str, Any]:
    if outcome not in OUTCOMES:
        raise ValueError("trustslip_v1_outcome_invalid")
    return {
        "question_id": question_id,
        "question": _QUESTION_TEXT[question_id],
        "outcome": outcome,
        "summary": summary,
        "evidence": dict(evidence),
        "limitations": list(limitations),
    }


def _family(evidence: AuthorizedTrustSlipV1Evidence, family: str) -> Optional[ActivityFamilyEvidence]:
    return next((row for row in evidence.activity.families if row.family == family), None)


def _identity_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    if evidence.identity.independently_verified:
        outcome = "supported_favourable"
        summary = "An approved independent identity-verification method is recorded."
    elif evidence.identity.recorded or evidence.identity.verification_records:
        outcome = "insufficient"
        summary = "Identity information and workflow checks are recorded, but independent identity verification is not established."
    else:
        outcome = "unavailable"
        summary = "No authorised identity evidence is available in this projection."
    return _answer(
        "identity",
        outcome,
        summary,
        {
            "recorded_fields": list(evidence.identity.recorded),
            "verification_record_fields": list(evidence.identity.verification_records),
            "independently_verified": evidence.identity.independently_verified,
        },
        ("recorded_identity_is_not_independent_verification",) if not evidence.identity.independently_verified else (),
    )


def _relevant_experience_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    if evidence.purpose == "shop_review":
        shop = evidence.shop
        assert shop is not None
        present = shop.active_shop_recorded or shop.active_offer_count > 0 or shop.trade_record_count > 0
        if not present:
            outcome = "unavailable"
        elif evidence.activity.sample_truncated:
            outcome = "insufficient"
        elif shop.unresolved_trade_dispute_count > 0:
            outcome = "mixed"
        else:
            outcome = "supported_favourable"
        return _answer(
            "relevant_experience",
            outcome,
            "Recorded Shop and trade facts were assessed for relevance; a match is not proof of trustworthiness.",
            {
                "active_shop_recorded": shop.active_shop_recorded,
                "active_offer_count": shop.active_offer_count,
                "trade_record_count": shop.trade_record_count,
            },
            evidence.limitations,
        )
    relevant_count = sum(row.sample_count for row in evidence.activity.families)
    outcome = "unavailable" if relevant_count == 0 else (
        "insufficient" if evidence.activity.sample_truncated else "supported_favourable"
    )
    return _answer(
        "relevant_experience",
        outcome,
        "Authorised activity families provide purpose-relevant context, not a character score.",
        {"recorded_family_count": len(evidence.activity.families), "sampled_record_count": relevant_count},
        evidence.limitations,
    )


def _comparable_activity_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    if evidence.purpose == "shop_review":
        shop = evidence.shop
        assert shop is not None
        if shop.completed_trade_record_count > 0 and shop.unresolved_trade_dispute_count > 0:
            outcome = "mixed"
        elif shop.completed_trade_record_count > 0 and not evidence.activity.sample_truncated:
            outcome = "supported_favourable"
        elif shop.trade_record_count > 0 or shop.active_offer_count > 0:
            outcome = "insufficient"
        else:
            outcome = "unavailable"
        return _answer(
            "comparable_activity",
            outcome,
            "Comparable Shop activity is reported only from holder-scoped aggregate records.",
            {
                "completed_trade_record_count": shop.completed_trade_record_count,
                "trade_record_count": shop.trade_record_count,
                "unresolved_trade_dispute_count": shop.unresolved_trade_dispute_count,
            },
            evidence.limitations,
        )
    if evidence.activity.sample_count == 0:
        outcome = "unavailable"
    elif evidence.activity.sample_truncated:
        outcome = "insufficient"
    elif len(evidence.activity.families) >= 2:
        outcome = "supported_favourable"
    else:
        outcome = "insufficient"
    return _answer(
        "comparable_activity",
        outcome,
        "The projection records comparable activity breadth without inferring outcomes that were not recorded.",
        {"recorded_family_count": len(evidence.activity.families), "sampled_record_count": evidence.activity.sample_count},
        evidence.limitations,
    )


def _commitment_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    if evidence.purpose == "shop_review":
        return _answer(
            "commitment_performance",
            "not_applicable",
            "General commitment evidence is outside the bounded Shop-review purpose.",
            {},
        )
    family = _family(evidence, "focus_commitment")
    if family is None:
        outcome = "unavailable"
        signals: tuple[str, ...] = ()
    else:
        signals = family.signals
        if "commitment_completion" in signals and evidence.adverse.correction_or_adverse_event_present:
            outcome = "mixed"
        elif "commitment_completion" in signals and not evidence.activity.sample_truncated:
            outcome = "supported_favourable"
        else:
            outcome = "insufficient"
    return _answer(
        "commitment_performance",
        outcome,
        "Recorded commitment creation is not treated as completion; completion requires its own authorised signal.",
        {"signals": list(signals)},
        evidence.limitations,
    )


def _witness_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    witnesses = evidence.witnesses
    if witnesses.public_count.suppressed:
        outcome = "private_review_required"
    elif witnesses.adverse_response_present and witnesses.favourable_response_present:
        outcome = "mixed"
    elif witnesses.adverse_response_present:
        outcome = "supported_adverse"
    elif witnesses.caution_response_present:
        outcome = "mixed"
    elif witnesses.favourable_response_present:
        outcome = "supported_favourable"
    else:
        outcome = "insufficient"
    return _answer(
        "witnesses",
        outcome,
        "Public witness evidence uses privacy-safe group reporting and never identifies individual contributors.",
        {
            "count_band": witnesses.public_count.count_band,
            "exact_count": witnesses.public_count.exact_count,
            "response_breakdown_suppressed": witnesses.response_breakdown_suppressed,
            "favourable_response_present": witnesses.favourable_response_present,
            "caution_response_present": witnesses.caution_response_present,
            "adverse_response_present": witnesses.adverse_response_present,
        },
        ("small_group_details_suppressed",) if witnesses.public_count.suppressed else (),
    )


def _recency_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    return _answer(
        "recency",
        "unavailable",
        "The authorised Stage A bundle does not expose source-specific evidence dates or validity windows.",
        {"projection_collected_at": evidence.collected_at},
        ("source_specific_recency_not_available",),
    )


def _unresolved_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    adverse = evidence.adverse
    unresolved = (
        evidence.lifecycle.disputed
        or adverse.adverse_event_present
        or adverse.community_review_caution_present
        or adverse.unresolved_trade_dispute_present
    )
    if unresolved:
        outcome = "supported_adverse"
    elif adverse.correction_or_adverse_event_present or adverse.non_clean_lifecycle_marker_present:
        outcome = "mixed"
    else:
        outcome = "insufficient"
    return _answer(
        "unresolved_problems",
        outcome,
        "Absence of an unresolved marker is not converted into favourable evidence.",
        {
            "trustslip_disputed_at_issuance": evidence.lifecycle.disputed,
            "adverse_event_present": adverse.adverse_event_present,
            "community_review_caution_present": adverse.community_review_caution_present,
            "unresolved_trade_dispute_present": adverse.unresolved_trade_dispute_present,
            "non_clean_lifecycle_marker_present": adverse.non_clean_lifecycle_marker_present,
        },
    )


def _uncertainty_answer(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    counterparty_suppressed = bool(evidence.shop and evidence.shop.counterparties.suppressed)
    privacy_review = evidence.witnesses.public_count.suppressed or counterparty_suppressed
    if privacy_review:
        outcome = "private_review_required"
    elif evidence.activity.sample_truncated:
        outcome = "insufficient"
    elif evidence.activity.sensitive_caution_present or evidence.adverse.correction_or_adverse_event_present:
        outcome = "mixed"
    else:
        outcome = "insufficient"
    return _answer(
        "uncertainty",
        outcome,
        "Uncertainty remains explicit; private, missing and incomplete evidence is never silently treated as favourable.",
        {
            "activity_sample_truncated": evidence.activity.sample_truncated,
            "sensitive_caution_present": evidence.activity.sensitive_caution_present,
            "witness_group_suppressed": evidence.witnesses.public_count.suppressed,
            "counterparty_group_suppressed": counterparty_suppressed,
        },
        evidence.limitations,
    )


def project_trust_slip_v1(evidence: AuthorizedTrustSlipV1Evidence) -> dict[str, Any]:
    if not isinstance(evidence, AuthorizedTrustSlipV1Evidence):
        raise TypeError("project_trust_slip_v1_requires_authorized_evidence_bundle")
    answers = [
        _identity_answer(evidence),
        _relevant_experience_answer(evidence),
        _comparable_activity_answer(evidence),
        _commitment_answer(evidence),
        _witness_answer(evidence),
        _recency_answer(evidence),
        _unresolved_answer(evidence),
        _uncertainty_answer(evidence),
    ]
    if tuple(answer["question_id"] for answer in answers) != QUESTION_ORDER:
        raise RuntimeError("trustslip_v1_question_order_invalid")
    return {
        "projection_version": PROJECTION_VERSION,
        "purpose": evidence.purpose,
        "generated_at": evidence.collected_at,
        "evidence_at_issuance": {
            "bundle_version": evidence.bundle_version,
            "trustslip_lifecycle": {
                "status_recorded": evidence.lifecycle.status_recorded,
                "expired": evidence.lifecycle.expired,
                "revoked": evidence.lifecycle.revoked,
                "frozen": evidence.lifecycle.frozen,
                "superseded": evidence.lifecycle.superseded,
                "disputed": evidence.lifecycle.disputed,
            },
        },
        "current_validity": {
            "embedded": False,
            "instruction": "Evaluate current TrustSlip expiry, revocation, supersession and dispute state separately.",
        },
        "answers": answers,
        "privacy": {
            "small_group_threshold": 3,
            "identifying_details_included": False,
        },
    }
