from __future__ import annotations

import json
from typing import Any, Mapping, Optional

PUBLIC_EVIDENCE_FAMILY_LABELS: dict[str, str] = {
    "identity_membership": "Identity and membership evidence",
    "community_participation": "Community participation evidence",
    "service_trade": "Service or trade evidence",
    "business_visibility": "Business visibility and promotion effort",
    "demand_activity": "DemandBox and request-response evidence",
    "business_analysis": "Business analysis and Market Wisdom evidence",
    "focus_commitment": "Focus commitment and follow-through evidence",
    "community_responsiveness": "Community notice and response evidence",
    "leadership_governance": "Leadership and governance participation evidence",
    "trust_document_activity": "Trust document activity",
    "relationship_path": "Relationship path evidence",
}

PUBLIC_EVIDENCE_FAMILY_USES: dict[str, str] = {
    "identity_membership": "Use this to check whether the holder has a visible identity/community anchor.",
    "community_participation": "Use this to check whether the holder has repeated community activity, not only a profile claim.",
    "service_trade": "Use this to ask who observed the service, trade, fulfilment, or marketplace behaviour.",
    "business_visibility": "Use this to see whether the holder repeatedly made an offer visible through shop, Spotlight, repost, or marketplace promotion activity.",
    "demand_activity": "Use this to see whether the holder created, answered, or engaged demand/request flows; ask for outcomes before relying.",
    "business_analysis": "Use this to see whether the holder used business-reading or Market Wisdom tools; this is effort evidence, not proof of success.",
    "focus_commitment": "Use this to see whether the holder recorded promise-to-proof activity; ask for completion evidence before relying.",
    "community_responsiveness": "Use this to see whether the holder acknowledged notices, responded to community calls, or appeared in meeting/attendance evidence.",
    "leadership_governance": "Use this to see whether the holder participated in admin, owner, approval, or governance responsibilities.",
    "trust_document_activity": "Use this to confirm that the public trust-document trail exists and remains current.",
    "relationship_path": "Use this to ask who brought the holder into the community and in what capacity.",
}

SENSITIVE_EVIDENCE_FAMILY_LABELS: dict[str, str] = {
    "finance_repayment": "Financial or repayment evidence",
    "guarantor_support": "Guarantor or support-risk evidence",
    "bank_payment": "Bank, payment, payout, or withdrawal evidence",
    "dispute_caution": "Dispute, rejection, default, or caution evidence",
}

PACK_EVIDENCE_FAMILY_FILTERS: dict[str, tuple[str, ...]] = {
    "community_standing": (
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "leadership_governance",
        "focus_commitment",
        "relationship_path",
        "trust_document_activity",
    ),
    "referral_decision": (
        "relationship_path",
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "leadership_governance",
        "trust_document_activity",
    ),
    "guarantor_decision": (
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "focus_commitment",
        "relationship_path",
        "finance_repayment",
        "guarantor_support",
        "bank_payment",
        "dispute_caution",
    ),
    "employment_decision": (
        "identity_membership",
        "community_participation",
        "service_trade",
        "business_visibility",
        "demand_activity",
        "business_analysis",
        "focus_commitment",
        "relationship_path",
        "trust_document_activity",
    ),
    "housing_decision": (
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "focus_commitment",
        "relationship_path",
        "finance_repayment",
        "dispute_caution",
    ),
    "trade_check": (
        "service_trade",
        "business_visibility",
        "demand_activity",
        "business_analysis",
        "community_participation",
        "relationship_path",
        "trust_document_activity",
        "dispute_caution",
    ),
    "supplier_decision": (
        "service_trade",
        "business_visibility",
        "demand_activity",
        "business_analysis",
        "community_participation",
        "relationship_path",
        "bank_payment",
        "dispute_caution",
    ),
    "volunteer_decision": (
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "leadership_governance",
        "focus_commitment",
        "relationship_path",
        "dispute_caution",
    ),
    "business_partnership": (
        "service_trade",
        "business_visibility",
        "demand_activity",
        "business_analysis",
        "focus_commitment",
        "leadership_governance",
        "community_responsiveness",
        "community_participation",
        "relationship_path",
        "finance_repayment",
        "guarantor_support",
        "bank_payment",
        "dispute_caution",
    ),
    "community_membership": (
        "identity_membership",
        "community_participation",
        "community_responsiveness",
        "leadership_governance",
        "focus_commitment",
        "relationship_path",
        "trust_document_activity",
        "dispute_caution",
    ),
}

_ACTIVITY_LABELS: dict[str, str] = {
    "identity_membership": "Community verification",
    "relationship_path": "Community verification",
    "community_participation": "Community activity",
    "community_responsiveness": "Community response",
    "leadership_governance": "Leadership and governance",
    "focus_commitment": "Focus commitments",
    "business_analysis": "Business analysis",
    "business_visibility": "Business visibility",
    "demand_activity": "DemandBox activity",
    "service_trade": "Trade activity",
    "trust_document_activity": "Trust document activity",
    "finance_repayment": "Repayment discipline",
    "guarantor_support": "Support and borrowing",
    "bank_payment": "Contribution records",
    "dispute_caution": "Review or caution context",
}

ALL_EVIDENCE_FAMILY_LABELS: dict[str, str] = {
    **PUBLIC_EVIDENCE_FAMILY_LABELS,
    **SENSITIVE_EVIDENCE_FAMILY_LABELS,
}

EVIDENCE_FAMILY_META_KEY = "evidence_family"
EVIDENCE_FAMILY_SOURCE_META_KEY = "evidence_family_source"
EVIDENCE_FAMILY_LABEL_META_KEY = "evidence_family_label"
EVIDENCE_FAMILY_SOURCE_INFERRED = "event_type_inferred"
EVIDENCE_FAMILY_SOURCE_DECLARED = "declared"


def _event_text(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(".", "_")


def _normalize_family(value: Any) -> Optional[str]:
    text = _event_text(value)
    if text in ALL_EVIDENCE_FAMILY_LABELS:
        return text
    return None


def _meta_mapping(value: Any) -> Optional[Mapping[str, Any]]:
    if isinstance(value, Mapping):
        return value
    if isinstance(value, str) and value.strip():
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, Mapping) else None
        except Exception:
            return None
    return None


def _event_meta(value: Any) -> Optional[Mapping[str, Any]]:
    if value is None:
        return None
    meta = getattr(value, "meta", None)
    mapped = _meta_mapping(meta)
    if mapped is not None:
        return mapped
    return _meta_mapping(getattr(value, "meta_json", None))


def evidence_family_from_meta(meta: Any) -> Optional[str]:
    mapped = _meta_mapping(meta)
    if not mapped:
        return None
    return _normalize_family(
        mapped.get(EVIDENCE_FAMILY_META_KEY)
        or mapped.get("public_evidence_family")
        or mapped.get("trust_evidence_family")
    )


def infer_trust_event_evidence_family(event_type: Any) -> Optional[str]:
    text = _event_text(event_type)
    if not text:
        return None
    if any(token in text for token in ("default", "missed", "overdue", "declined", "rejected", "revoked", "frozen", "dispute", "complaint")):
        return "dispute_caution"
    if any(token in text for token in ("bank", "payment", "payout", "withdrawal", "deposit", "vault_payment")):
        return "bank_payment"
    if any(token in text for token in ("repayment", "repaid", "loan_", "loan")):
        return "finance_repayment"
    if "guarantor" in text:
        return "guarantor_support"
    if any(token in text for token in ("trust_slip", "trustslip", "decision_pack", "public_verify", "verification_paper")):
        return "trust_document_activity"
    if any(token in text for token in ("commitment", "focus", "milestone", "checkin", "promise")):
        return "focus_commitment"
    if any(token in text for token in ("market_wisdom", "wisdom", "opportunity_engine", "analytics", "analysis", "intelligence", "matrix")):
        return "business_analysis"
    if text.startswith("feature_") and "activated" in text:
        return "business_visibility"
    if "subscription_activated" in text or "subscription" in text and "activated" in text:
        return "business_visibility"
    if any(token in text for token in ("demand_box", "demandbox", "marketplace_request", "request_response", "quote_request")):
        return "demand_activity"
    if any(token in text for token in ("spotlight", "repost", "broadcast", "promotion", "promoted", "product_view", "shop_follow", "shop_followed", "shop_unfollowed")):
        return "business_visibility"
    if any(token in text for token in ("notice", "announcement", "acknowledged", "acknowledgement", "attendance", "attended", "meeting", "response", "what_matters")):
        return "community_responsiveness"
    if any(token in text for token in ("owner", "admin", "approval", "approved", "neutral", "governance", "delegate", "committee", "leader")):
        return "leadership_governance"
    if any(token in text for token in ("identity", "phone", "photo", "member_verified", "community_member_verified", "verification", "verified", "confirmation")):
        return "identity_membership"
    if any(token in text for token in ("invite", "clan_join", "joined", "membership")):
        return "relationship_path" if "invite" in text else "identity_membership"
    if any(token in text for token in ("marketplace", "merchant", "shop", "delivery", "service", "trade", "vault_order")):
        return "service_trade"
    if any(token in text for token in ("community", "contribution", "participation", "role")):
        return "community_participation"
    return None


def public_trust_event_evidence_family(event_type: Any, meta: Any = None) -> Optional[str]:
    return evidence_family_from_meta(meta) or infer_trust_event_evidence_family(event_type)


def public_trust_event_evidence_family_from_record(event: Any) -> Optional[str]:
    return public_trust_event_evidence_family(
        getattr(event, "event_type", None),
        _event_meta(event),
    )


def annotate_trust_event_meta_with_evidence_family(
    *,
    event_type: Any,
    meta: Optional[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    family = public_trust_event_evidence_family(event_type, meta)
    if not family:
        return meta
    enriched: dict[str, Any] = dict(meta or {})
    had_family = evidence_family_from_meta(enriched) is not None
    enriched[EVIDENCE_FAMILY_META_KEY] = family
    enriched[EVIDENCE_FAMILY_LABEL_META_KEY] = ALL_EVIDENCE_FAMILY_LABELS[family]
    enriched.setdefault(
        EVIDENCE_FAMILY_SOURCE_META_KEY,
        EVIDENCE_FAMILY_SOURCE_DECLARED if had_family else EVIDENCE_FAMILY_SOURCE_INFERRED,
    )
    return enriched


def public_member_activity_label(event_type: Any, meta: Any = None) -> str:
    text = _event_text(event_type)
    if text in {"community_followed", "community_unfollowed"}:
        return "Community attention"
    if text in {"marketplace_shop_followed", "marketplace_shop_unfollowed"}:
        return "Shop attention"
    family = public_trust_event_evidence_family(text, meta)
    if family:
        return _ACTIVITY_LABELS.get(family, "Community activity")
    if "rosca" in text or "contribution" in text or "pool" in text:
        return "Contribution records"
    if "repay" in text or "settle" in text:
        return "Repayment discipline"
    return "Community activity"


def public_member_activity_label_from_record(event: Any) -> str:
    return public_member_activity_label(
        getattr(event, "event_type", None),
        _event_meta(event),
    )
