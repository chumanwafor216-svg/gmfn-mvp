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

PUBLIC_EVIDENCE_SIGNAL_LABELS: dict[str, str] = {
    "identity_verification": "Identity or verification step",
    "invite_or_membership_path": "Invite or membership path",
    "join_preapproval_match_record": "Join preapproval match record",
    "community_participation_record": "Community participation record",
    "notice_acknowledgement": "Notice or What Matters Now acknowledgement",
    "notice_availability_response": "Notice availability response",
    "notice_or_announcement_record": "Notice or announcement record",
    "attendance_or_meeting": "Attendance or meeting response",
    "attendance_session_record": "Attendance session record",
    "attendance_checkin_record": "Attendance check-in record",
    "attendance_parent_notification_record": "Attendance parent-notification log",
    "school_guardian_contact_record": "School guardian contact reference",
    "collection_instruction_record": "Collection instruction record",
    "response_channel_record": "Response channel record",
    "meeting_reminder_record": "Meeting reminder record",
    "meeting_summary_record": "Meeting summary record",
    "community_response": "Community response record",
    "community_non_response_record": "Community non-response record",
    "community_confirmation_request_record": "Community confirmation request record",
    "community_confirmation_workflow_record": "Community confirmation workflow record",
    "community_confirmation_outcome_record": "Community confirmation outcome record",
    "community_confirmation_expiry_record": "Community confirmation expiry record",
    "community_confirmation_decision_record": "Community confirmation provider decision record",
    "community_confirmation_decision_status_record": "Community confirmation decision status record",
    "community_confirmation_preference_record": "Community confirmation preference record",
    "community_confirmation_policy_record": "Community confirmation policy record",
    "community_confirmation_contact_eligibility_record": "Community confirmation contact eligibility record",
    "domain_lifecycle_record": "Community Domain lifecycle record",
    "domain_pilot_reservation_record": "Community Domain pilot reservation record",
    "beneficiary_outcome_record": "Beneficiary outcome record",
    "beneficiary_outcome_confirmation_request": "Beneficiary outcome confirmation request",
    "beneficiary_outcome_delivery_record": "Beneficiary outcome delivery record",
    "beneficiary_outcome_delivery_blocked": "Beneficiary outcome delivery blocked record",
    "beneficiary_outcome_contact_consent_record": "Beneficiary outcome contact consent record",
    "beneficiary_outcome_contact_consent_withdrawal": "Beneficiary outcome contact consent withdrawal",
    "beneficiary_outcome_response_record": "Beneficiary outcome response record",
    "beneficiary_outcome_correction_review": "Beneficiary outcome correction review",
    "approval_or_review": "Approval or review action",
    "neutral_review": "Neutral governance response",
    "admin_or_leadership": "Admin or leadership action",
    "membership_vote_record": "Membership vote record",
    "shop_or_market_listing": "Shop or marketplace listing",
    "spotlight_or_repost": "Spotlight or repost activity",
    "shop_attention": "Shop attention or product-view activity",
    "platform_feature_activation": "Business feature activation",
    "demand_request": "DemandBox request activity",
    "demand_response": "DemandBox response activity",
    "market_wisdom_review": "Market Wisdom or analysis review",
    "commitment_record": "Focus commitment record",
    "commitment_completion": "Commitment completion record",
    "expected_payment_record": "Expected payment record",
    "payment_followup_record": "Payment follow-up record",
    "trustslip_issue_or_share": "TrustSlip issue or share activity",
    "service_or_trade_record": "Service or trade record",
    "repayment_record": "Repayment record",
    "guarantor_support_record": "Guarantor or support record",
    "payment_or_bank_record": "Payment or bank record",
    "payment_proof_review_record": "Payment proof review record",
    "review_or_caution": "Review or caution context",
}

PUBLIC_EVIDENCE_SIGNAL_USES: dict[str, str] = {
    "identity_verification": "Use as an identity/community anchor signal, not legal identity proof.",
    "invite_or_membership_path": "Use to ask who brought the holder in and in what capacity.",
    "join_preapproval_match_record": "Use to see a preapproved join path matched the holder; not a character endorsement by itself.",
    "community_participation_record": "Use as ordinary participation evidence, not a character score.",
    "notice_acknowledgement": "Use to see whether the holder reads and acknowledges community notices.",
    "notice_availability_response": "Use to see whether the holder responded to a notice availability or need question.",
    "notice_or_announcement_record": "Use to see whether the holder posted or handled community notices; not proof that members read them.",
    "attendance_or_meeting": "Use to see whether the holder appears in community attendance or meeting records.",
    "attendance_session_record": "Use to see an attendance window was opened; not proof that the holder attended.",
    "attendance_checkin_record": "Use to see attendance was recorded; not exact location tracking or automatic parent notification.",
    "attendance_parent_notification_record": "Use to see a parent-notification log was recorded; not proof of WhatsApp, SMS, or email delivery.",
    "school_guardian_contact_record": "Use to see a guardian contact reference was recorded for follow-up; not parent identity verification or legal consent.",
    "collection_instruction_record": "Use to see a governed collection instruction was published; not payment proof or proof GSN held money.",
    "response_channel_record": "Use to see a response channel was opened; not proof that members responded.",
    "meeting_reminder_record": "Use to see that a meeting reminder was created; not proof that the holder attended.",
    "meeting_summary_record": "Use to see that a meeting summary was recorded; ask who attended or approved it if important.",
    "community_response": "Use to see whether the holder responds to community calls or requests.",
    "community_non_response_record": "Use to see that an eligible community responder did not answer within the recorded window.",
    "community_confirmation_request_record": "Use to see that a community confirmation request was opened; not proof that witnesses answered.",
    "community_confirmation_workflow_record": "Use as confirmation workflow context, not as a witness answer or endorsement.",
    "community_confirmation_outcome_record": "Use to see that a community confirmation outcome was recorded; check the visible summary before relying.",
    "community_confirmation_expiry_record": "Use to see that the response window closed; not proof of refusal or fault by itself.",
    "community_confirmation_decision_record": "Use to see how a provider recorded their next step after confirmation; not a GSN approval.",
    "community_confirmation_decision_status_record": "Use to see the provider decision status trail; check issue and settlement context before relying.",
    "community_confirmation_preference_record": "Use to see whether the member changed confirmation availability preferences.",
    "community_confirmation_policy_record": "Use to see whether an admin changed confirmation policy or thresholds.",
    "community_confirmation_contact_eligibility_record": "Use to see whether an admin changed who can receive confirmation requests.",
    "domain_lifecycle_record": "Use to see an admin lifecycle change for a Community Domain; not proof of member quality.",
    "domain_pilot_reservation_record": "Use to see a Community Domain pilot was reserved or started; not proof of paid continuation or success.",
    "beneficiary_outcome_record": "Use to see a beneficiary outcome was recorded; not a final sponsor report or independent confirmation by itself.",
    "beneficiary_outcome_confirmation_request": "Use to see an outcome confirmation request was opened; not proof that a witness answered.",
    "beneficiary_outcome_delivery_record": "Use to see confirmation delivery activity; ask who received or corrected it before relying.",
    "beneficiary_outcome_delivery_blocked": "Use to see delivery was blocked by a safety or consent boundary; not proof of fault by itself.",
    "beneficiary_outcome_contact_consent_record": "Use to see contact consent was recorded for outcome follow-up; not consent for unrelated use.",
    "beneficiary_outcome_contact_consent_withdrawal": "Use to see contact consent was withdrawn; not proof of wrongdoing by itself.",
    "beneficiary_outcome_response_record": "Use to see a beneficiary outcome response was recorded; inspect the response summary before relying.",
    "beneficiary_outcome_correction_review": "Use to see a beneficiary outcome correction was reviewed; not proof of the final outcome by itself.",
    "approval_or_review": "Use to see whether the holder has handled approval or review responsibility.",
    "neutral_review": "Use to see governance participation without forcing a positive or negative judgement.",
    "admin_or_leadership": "Use to see responsibility exposure; ask who observed the leadership if it matters.",
    "membership_vote_record": "Use to see membership governance participation; inspect vote meaning before relying.",
    "shop_or_market_listing": "Use as market presence evidence, not proof of sales success.",
    "spotlight_or_repost": "Use as visibility and repeated promotion effort, not proof of demand or profit.",
    "shop_attention": "Use as attention/engagement context, not proof of purchase or satisfaction.",
    "platform_feature_activation": "Use as platform/business effort evidence, not proof that the feature produced results.",
    "demand_request": "Use as demand/request activity; ask what happened after the request.",
    "demand_response": "Use as request-response effort; ask for outcome evidence before relying.",
    "market_wisdom_review": "Use as business-reading effort, not proof of market success.",
    "commitment_record": "Use as promise-to-proof activity; ask whether it was completed.",
    "commitment_completion": "Use as completion evidence, still subject to context and witness checks.",
    "expected_payment_record": "Use to see an expected payment or obligation was opened; not proof that money moved.",
    "payment_followup_record": "Use to see payment follow-up or reminder activity; not proof of payment or default by itself.",
    "trustslip_issue_or_share": "Use as trust-document currentness/activity, not an endorsement.",
    "service_or_trade_record": "Use as service/trade evidence; ask who observed the outcome.",
    "repayment_record": "Use as repayment context; ask for private details before money-risk reliance.",
    "guarantor_support_record": "Use as support-risk context; it is not current willingness.",
    "payment_or_bank_record": "Use as payment/bank context only where the receiver has authority to review it.",
    "payment_proof_review_record": "Use to see payment proof was submitted for review; not bank confirmation or a receipt.",
    "review_or_caution": "Use as a prompt for private review, not as a public finding of fault.",
}
PUBLIC_EVIDENCE_SIGNAL_FAMILIES: dict[str, str] = {
    "identity_verification": "identity_membership",
    "invite_or_membership_path": "relationship_path",
    "join_preapproval_match_record": "relationship_path",
    "community_participation_record": "community_participation",
    "notice_acknowledgement": "community_responsiveness",
    "notice_availability_response": "community_responsiveness",
    "notice_or_announcement_record": "community_responsiveness",
    "attendance_or_meeting": "community_responsiveness",
    "attendance_session_record": "community_responsiveness",
    "attendance_checkin_record": "community_responsiveness",
    "attendance_parent_notification_record": "community_responsiveness",
    "school_guardian_contact_record": "community_responsiveness",
    "collection_instruction_record": "leadership_governance",
    "response_channel_record": "community_responsiveness",
    "meeting_reminder_record": "community_responsiveness",
    "meeting_summary_record": "community_responsiveness",
    "community_response": "community_responsiveness",
    "community_non_response_record": "community_responsiveness",
    "community_confirmation_request_record": "identity_membership",
    "community_confirmation_workflow_record": "identity_membership",
    "community_confirmation_outcome_record": "identity_membership",
    "community_confirmation_expiry_record": "identity_membership",
    "community_confirmation_decision_record": "service_trade",
    "community_confirmation_decision_status_record": "service_trade",
    "community_confirmation_preference_record": "community_responsiveness",
    "community_confirmation_policy_record": "leadership_governance",
    "community_confirmation_contact_eligibility_record": "leadership_governance",
    "domain_lifecycle_record": "leadership_governance",
    "domain_pilot_reservation_record": "leadership_governance",
    "beneficiary_outcome_record": "community_participation",
    "beneficiary_outcome_confirmation_request": "community_responsiveness",
    "beneficiary_outcome_delivery_record": "community_responsiveness",
    "beneficiary_outcome_delivery_blocked": "community_responsiveness",
    "beneficiary_outcome_contact_consent_record": "community_responsiveness",
    "beneficiary_outcome_contact_consent_withdrawal": "community_responsiveness",
    "beneficiary_outcome_response_record": "community_responsiveness",
    "beneficiary_outcome_correction_review": "leadership_governance",
    "approval_or_review": "leadership_governance",
    "neutral_review": "leadership_governance",
    "admin_or_leadership": "leadership_governance",
    "membership_vote_record": "leadership_governance",
    "shop_or_market_listing": "service_trade",
    "spotlight_or_repost": "business_visibility",
    "shop_attention": "business_visibility",
    "platform_feature_activation": "business_visibility",
    "demand_request": "demand_activity",
    "demand_response": "demand_activity",
    "market_wisdom_review": "business_analysis",
    "commitment_record": "focus_commitment",
    "commitment_completion": "focus_commitment",
    "expected_payment_record": "focus_commitment",
    "payment_followup_record": "focus_commitment",
    "trustslip_issue_or_share": "trust_document_activity",
    "service_or_trade_record": "service_trade",
    "repayment_record": "finance_repayment",
    "guarantor_support_record": "guarantor_support",
    "payment_or_bank_record": "bank_payment",
    "payment_proof_review_record": "bank_payment",
    "review_or_caution": "dispute_caution",
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
EVIDENCE_SIGNAL_META_KEY = "evidence_signal"
EVIDENCE_SIGNAL_SOURCE_META_KEY = "evidence_signal_source"
EVIDENCE_SIGNAL_LABEL_META_KEY = "evidence_signal_label"
EVIDENCE_SIGNAL_CONFLICT_META_KEY = "evidence_signal_conflict"
EVIDENCE_SIGNAL_REJECTED_META_KEY = "evidence_signal_rejected"
EVIDENCE_SIGNAL_CONFLICT_FAMILY_META_KEY = "evidence_signal_conflict_family"
EVIDENCE_FAMILY_SOURCE_INFERRED = "event_type_inferred"
EVIDENCE_FAMILY_SOURCE_DECLARED = "declared"


def _event_text(value: Any) -> str:
    return str(value or "").strip().lower().replace("-", "_").replace(".", "_")


def _normalize_family(value: Any) -> Optional[str]:
    text = _event_text(value)
    if text in ALL_EVIDENCE_FAMILY_LABELS:
        return text
    return None


def _normalize_signal(value: Any) -> Optional[str]:
    text = _event_text(value)
    if text in PUBLIC_EVIDENCE_SIGNAL_LABELS:
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


def _community_domain_activity_text(meta: Any) -> str:
    mapped = _meta_mapping(meta)
    if not mapped:
        return ""
    source = _event_text(mapped.get("source"))
    reason = _event_text(mapped.get("reason"))
    if "community_domain_activity" not in source and "community_domain_activity" not in reason:
        return ""
    parts = [
        mapped.get("activity_type"),
        mapped.get("evidence_dimension"),
    ]
    return "_".join(_event_text(part) for part in parts if part)


def _infer_community_domain_activity_family(meta: Any) -> Optional[str]:
    text = _community_domain_activity_text(meta)
    if not text:
        return None
    if any(token in text for token in ("leadership", "governance", "coordinator", "committee")):
        return "leadership_governance"
    if any(token in text for token in ("fee_follow_up", "finance_follow_up")):
        return "focus_commitment"
    if any(token in text for token in ("notice", "attendance", "arrival", "dismissal", "follow_up", "support", "welfare", "pastoral", "care", "belonging")):
        return "community_responsiveness"
    if any(token in text for token in ("service", "contribution", "project", "learning", "training", "participation")):
        return "community_participation"
    return "community_participation"


def _infer_community_domain_activity_signal(meta: Any) -> Optional[str]:
    text = _community_domain_activity_text(meta)
    if not text:
        return None
    if any(token in text for token in ("attendance", "arrival", "dismissal")):
        return "attendance_or_meeting"
    if "notice" in text:
        return "notice_acknowledgement"
    if any(token in text for token in ("leadership", "governance", "coordinator", "committee")):
        return "admin_or_leadership"
    if any(token in text for token in ("fee_follow_up", "finance_follow_up")):
        return "commitment_record"
    if any(token in text for token in ("follow_up", "support", "welfare", "pastoral", "care", "belonging")):
        return "community_response"
    if any(token in text for token in ("service", "contribution", "project", "learning", "training", "participation")):
        return "community_participation_record"
    return "community_participation_record"


def _community_confirmation_decision_status_has_open_issue(meta: Any) -> bool:
    mapped = _meta_mapping(meta)
    if not mapped:
        return False
    if mapped.get("issue_reported") is True and mapped.get("settled") is not True:
        return True
    status = _event_text(mapped.get("status"))
    if status in {"under_review", "disputed"} and mapped.get("settled") is not True:
        return True
    return False


def evidence_family_from_meta(meta: Any) -> Optional[str]:
    mapped = _meta_mapping(meta)
    if not mapped:
        return None
    return _normalize_family(
        mapped.get(EVIDENCE_FAMILY_META_KEY)
        or mapped.get("public_evidence_family")
        or mapped.get("trust_evidence_family")
    )


def evidence_signal_from_meta(meta: Any) -> Optional[str]:
    mapped = _meta_mapping(meta)
    if not mapped:
        return None
    return _normalize_signal(
        mapped.get(EVIDENCE_SIGNAL_META_KEY)
        or mapped.get("public_evidence_signal")
        or mapped.get("trust_evidence_signal")
    )


def evidence_family_for_signal(signal: Any) -> Optional[str]:
    normalized = _normalize_signal(signal)
    if not normalized:
        return None
    return PUBLIC_EVIDENCE_SIGNAL_FAMILIES.get(normalized)


def evidence_signal_matches_family(signal: Any, family: Any) -> bool:
    signal_family = evidence_family_for_signal(signal)
    normalized_family = _normalize_family(family)
    return bool(signal_family and normalized_family and signal_family == normalized_family)


def infer_trust_event_evidence_family(event_type: Any, meta: Any = None) -> Optional[str]:
    text = _event_text(event_type)
    if not text:
        return None
    if "community_domain_activity_recorded" in text:
        meta_family = _infer_community_domain_activity_family(meta)
        if meta_family:
            return meta_family
    if any(token in text for token in ("community_confirmation_review_case", "community_confirmation_review_evidence", "community_confirmation_request_status_updated")):
        return "leadership_governance"
    if "join_request_vote_recorded" in text:
        return "leadership_governance"
    if "community_domain_collection_instruction" in text:
        return "leadership_governance"
    if "community_domain_lifecycle_changed" in text or "community_domain_pilot_reservation_started" in text:
        return "leadership_governance"
    if "join_request_qr_preapproval_matched" in text:
        return "relationship_path"
    if any(token in text for token in (
        "community_domain_attendance_session_opened",
        "community_domain_attendance_checkin_recorded",
        "community_domain_attendance_parent_notification_logged",
        "community_domain_school_guardian_contact_recorded",
        "community_domain_response_channel_opened",
        "community_domain_response_recorded",
    )):
        return "community_responsiveness"
    if "community_meeting" in text:
        return "community_responsiveness"
    if "community_confirmation_decision_status_updated" in text:
        return "dispute_caution" if _community_confirmation_decision_status_has_open_issue(meta) else "service_trade"
    if "community_confirmation_merchant_decision_recorded" in text:
        return "service_trade"
    if "community_confirmation_contact_preference_updated" in text:
        return "community_responsiveness"
    if "community_confirmation_policy_updated" in text or "community_confirmation_contact_eligibility_updated" in text:
        return "leadership_governance"
    if "community_domain_beneficiary_outcome_correction_reviewed" in text:
        return "leadership_governance"
    if any(token in text for token in (
        "community_domain_beneficiary_outcome_confirmation_requested",
        "community_domain_beneficiary_outcome_confirmation_delivery_prepared",
        "community_domain_beneficiary_outcome_confirmation_delivery_recorded",
        "community_domain_beneficiary_outcome_confirmation_delivery_receipt_corrected",
        "community_domain_beneficiary_outcome_provider_send_blocked",
        "community_domain_beneficiary_outcome_contact_consent_recorded",
        "community_domain_beneficiary_outcome_contact_consent_withdrawn",
        "community_domain_beneficiary_outcome_confirmation_response",
        "community_domain_beneficiary_outcome_response_recorded",
    )):
        return "community_responsiveness"
    if "community_domain_beneficiary_outcome_recorded" in text:
        return "community_participation"
    if any(token in text for token in ("default", "missed", "overdue", "declined", "rejected", "revoked", "frozen", "dispute", "complaint")):
        return "dispute_caution"
    if "expected_payment" in text or "payment_reminder" in text:
        return "focus_commitment"
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
    if text.startswith("feature_") and any(token in text for token in ("activated", "used", "opened")):
        return "business_visibility"
    if "subscription_activated" in text or "subscription" in text and "activated" in text:
        return "business_visibility"
    if any(token in text for token in ("demand_box", "demandbox", "marketplace_request", "request_response", "quote_request")):
        return "demand_activity"
    if any(token in text for token in ("spotlight", "repost", "broadcast", "promotion", "promoted", "product_view", "shop_follow", "shop_followed", "shop_unfollowed")):
        return "business_visibility"
    if "notice_review_decided" in text:
        return "leadership_governance"
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


def infer_trust_event_evidence_signal(event_type: Any, meta: Any = None) -> Optional[str]:
    text = _event_text(event_type)
    if not text:
        return None
    if "community_domain_activity_recorded" in text:
        meta_signal = _infer_community_domain_activity_signal(meta)
        if meta_signal:
            return meta_signal
    if any(token in text for token in ("community_confirmation_review_case", "community_confirmation_review_evidence", "community_confirmation_request_status_updated")):
        return "approval_or_review"
    if "join_request_vote_recorded" in text:
        return "membership_vote_record"
    if "community_domain_collection_instruction" in text:
        return "collection_instruction_record"
    if "community_domain_lifecycle_changed" in text:
        return "domain_lifecycle_record"
    if "community_domain_pilot_reservation_started" in text:
        return "domain_pilot_reservation_record"
    if "join_request_qr_preapproval_matched" in text:
        return "join_preapproval_match_record"
    if "community_domain_attendance_session_opened" in text:
        return "attendance_session_record"
    if "community_domain_attendance_checkin_recorded" in text:
        return "attendance_checkin_record"
    if "community_domain_attendance_parent_notification_logged" in text:
        return "attendance_parent_notification_record"
    if "community_domain_school_guardian_contact_recorded" in text:
        return "school_guardian_contact_record"
    if "community_domain_response_channel_opened" in text:
        return "response_channel_record"
    if "community_domain_response_recorded" in text:
        return "community_response"
    if "community_meeting_reminder_created" in text:
        return "meeting_reminder_record"
    if "community_meeting_summary_recorded" in text:
        return "meeting_summary_record"
    if "community_meeting" in text:
        return "attendance_or_meeting"
    if "community_confirmation_decision_status_updated" in text:
        return "review_or_caution" if _community_confirmation_decision_status_has_open_issue(meta) else "community_confirmation_decision_status_record"
    if "community_confirmation_merchant_decision_recorded" in text:
        return "community_confirmation_decision_record"
    if "community_confirmation_contact_preference_updated" in text:
        return "community_confirmation_preference_record"
    if "community_confirmation_policy_updated" in text:
        return "community_confirmation_policy_record"
    if "community_confirmation_contact_eligibility_updated" in text:
        return "community_confirmation_contact_eligibility_record"
    if "community_domain_beneficiary_outcome_correction_reviewed" in text:
        return "beneficiary_outcome_correction_review"
    if "community_domain_beneficiary_outcome_provider_send_blocked" in text:
        return "beneficiary_outcome_delivery_blocked"
    if "community_domain_beneficiary_outcome_contact_consent_withdrawn" in text:
        return "beneficiary_outcome_contact_consent_withdrawal"
    if "community_domain_beneficiary_outcome_contact_consent_recorded" in text:
        return "beneficiary_outcome_contact_consent_record"
    if "community_domain_beneficiary_outcome_confirmation_requested" in text:
        return "beneficiary_outcome_confirmation_request"
    if any(token in text for token in (
        "community_domain_beneficiary_outcome_confirmation_delivery_prepared",
        "community_domain_beneficiary_outcome_confirmation_delivery_recorded",
        "community_domain_beneficiary_outcome_confirmation_delivery_receipt_corrected",
    )):
        return "beneficiary_outcome_delivery_record"
    if "community_domain_beneficiary_outcome_confirmation_response" in text or "community_domain_beneficiary_outcome_response_recorded" in text:
        return "beneficiary_outcome_response_record"
    if "community_domain_beneficiary_outcome_recorded" in text:
        return "beneficiary_outcome_record"
    if "community_confirmation_requested" in text:
        return "community_confirmation_request_record"
    if any(token in text for token in ("community_confirmation_delivery_pool_prepared", "community_confirmation_requester_notified")):
        return "community_confirmation_workflow_record"
    if "community_confirmation_outcome_recorded" in text:
        return "community_confirmation_outcome_record"
    if "community_confirmation_request_expired" in text:
        return "community_confirmation_expiry_record"
    if any(token in text for token in ("default", "missed", "overdue", "declined", "rejected", "revoked", "frozen", "dispute", "complaint")):
        return "review_or_caution"
    if "payment_reminder" in text:
        return "payment_followup_record"
    if "expected_payment" in text:
        return "expected_payment_record"
    if "payment_proof" in text or "proof_logged" in text:
        return "payment_proof_review_record"
    if any(token in text for token in ("bank", "payment", "payout", "withdrawal", "deposit", "vault_payment")):
        return "payment_or_bank_record"
    if any(token in text for token in ("repayment", "repaid", "loan_", "loan")):
        return "repayment_record"
    if "guarantor" in text:
        return "guarantor_support_record"
    if any(token in text for token in ("trust_slip", "trustslip", "decision_pack", "public_verify", "verification_paper")):
        return "trustslip_issue_or_share"
    if any(token in text for token in ("commitment_completed", "commitment_complete", "commitment_done", "milestone_completed", "fulfilled")):
        return "commitment_completion"
    if any(token in text for token in ("commitment", "focus", "milestone", "checkin", "promise")):
        return "commitment_record"
    if any(token in text for token in ("market_wisdom", "wisdom", "opportunity_engine", "analytics", "analysis", "intelligence", "matrix")):
        return "market_wisdom_review"
    if text.startswith("feature_") and any(token in text for token in ("activated", "used", "opened")):
        return "platform_feature_activation"
    if "subscription_activated" in text or "subscription" in text and "activated" in text:
        return "platform_feature_activation"
    if any(token in text for token in ("demand_box", "demandbox", "marketplace_request", "request_response", "quote_request")):
        if any(token in text for token in ("answered", "answer", "response", "responded", "fulfilled", "accepted")):
            return "demand_response"
        return "demand_request"
    if any(token in text for token in ("spotlight", "repost", "broadcast", "promotion", "promoted")):
        return "spotlight_or_repost"
    if any(token in text for token in ("product_view", "shop_follow", "shop_followed", "shop_unfollowed")):
        return "shop_attention"
    if "notice_review_decided" in text:
        return "approval_or_review"
    if any(token in text for token in ("notice_posted", "notice_submitted", "announcement_posted", "announcement_submitted")):
        return "notice_or_announcement_record"
    if "notice_availability_response" in text:
        return "notice_availability_response"
    if any(token in text for token in ("notice", "announcement", "acknowledged", "acknowledgement", "what_matters")):
        return "notice_acknowledgement"
    if any(token in text for token in ("attendance", "attended", "meeting")):
        return "attendance_or_meeting"
    if "non_response" in text:
        return "community_non_response_record"
    if "response" in text:
        return "community_response"
    if any(token in text for token in ("approval", "approved", "review")):
        return "approval_or_review"
    if "neutral" in text:
        return "neutral_review"
    if any(token in text for token in ("owner", "admin", "governance", "delegate", "committee", "leader")):
        return "admin_or_leadership"
    if any(token in text for token in ("identity", "phone", "photo", "member_verified", "community_member_verified", "verification", "verified", "confirmation")):
        return "identity_verification"
    if any(token in text for token in ("invite", "clan_join", "joined", "membership")):
        return "invite_or_membership_path"
    if any(token in text for token in ("marketplace", "merchant", "delivery", "service", "trade", "vault_order")):
        return "service_or_trade_record"
    if "shop" in text:
        return "shop_or_market_listing"
    if any(token in text for token in ("community", "contribution", "participation", "role")):
        return "community_participation_record"
    return None

def public_trust_event_evidence_family(event_type: Any, meta: Any = None) -> Optional[str]:
    return evidence_family_from_meta(meta) or infer_trust_event_evidence_family(event_type, meta)


def public_trust_event_evidence_family_from_record(event: Any) -> Optional[str]:
    return public_trust_event_evidence_family(
        getattr(event, "event_type", None),
        _event_meta(event),
    )


def public_trust_event_evidence_signal(event_type: Any, meta: Any = None) -> Optional[str]:
    family = public_trust_event_evidence_family(event_type, meta)
    signal = evidence_signal_from_meta(meta) or infer_trust_event_evidence_signal(event_type, meta)
    if family and signal and not evidence_signal_matches_family(signal, family):
        return None
    return signal


def public_trust_event_evidence_signal_from_record(event: Any) -> Optional[str]:
    return public_trust_event_evidence_signal(
        getattr(event, "event_type", None),
        _event_meta(event),
    )


def annotate_trust_event_meta_with_evidence_family(
    *,
    event_type: Any,
    meta: Optional[dict[str, Any]],
) -> Optional[dict[str, Any]]:
    family = public_trust_event_evidence_family(event_type, meta)
    existing_signal = evidence_signal_from_meta(meta)
    inferred_signal = infer_trust_event_evidence_signal(event_type, meta)
    signal = existing_signal or inferred_signal
    signal_conflict: Optional[str] = None
    if family and existing_signal and not evidence_signal_matches_family(existing_signal, family):
        signal_conflict = existing_signal
        signal = None
    elif family and inferred_signal and not existing_signal and not evidence_signal_matches_family(inferred_signal, family):
        signal = None
    if not family and not signal and not signal_conflict:
        return meta
    enriched: dict[str, Any] = dict(meta or {})
    if family:
        had_family = evidence_family_from_meta(enriched) is not None
        enriched[EVIDENCE_FAMILY_META_KEY] = family
        enriched[EVIDENCE_FAMILY_LABEL_META_KEY] = ALL_EVIDENCE_FAMILY_LABELS[family]
        enriched.setdefault(
            EVIDENCE_FAMILY_SOURCE_META_KEY,
            EVIDENCE_FAMILY_SOURCE_DECLARED if had_family else EVIDENCE_FAMILY_SOURCE_INFERRED,
        )
    if signal_conflict:
        for key in (
            EVIDENCE_SIGNAL_META_KEY,
            EVIDENCE_SIGNAL_LABEL_META_KEY,
            EVIDENCE_SIGNAL_SOURCE_META_KEY,
            "public_evidence_signal",
            "trust_evidence_signal",
        ):
            enriched.pop(key, None)
        enriched[EVIDENCE_SIGNAL_CONFLICT_META_KEY] = "family_mismatch"
        enriched[EVIDENCE_SIGNAL_REJECTED_META_KEY] = signal_conflict
        if family:
            enriched[EVIDENCE_SIGNAL_CONFLICT_FAMILY_META_KEY] = family
    elif signal:
        had_signal = evidence_signal_from_meta(enriched) is not None
        enriched[EVIDENCE_SIGNAL_META_KEY] = signal
        enriched[EVIDENCE_SIGNAL_LABEL_META_KEY] = PUBLIC_EVIDENCE_SIGNAL_LABELS[signal]
        enriched.setdefault(
            EVIDENCE_SIGNAL_SOURCE_META_KEY,
            EVIDENCE_FAMILY_SOURCE_DECLARED if had_signal else EVIDENCE_FAMILY_SOURCE_INFERRED,
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