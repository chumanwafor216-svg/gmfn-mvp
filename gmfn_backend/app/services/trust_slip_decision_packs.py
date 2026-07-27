from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Mapping, Optional

from sqlalchemy.orm import Session

from app.db.models import ClanMembership, MarketplaceProduct, MarketplaceShop, ProtectedTradeRecord, TrustEvent, TrustSlip, TrustSlipDecisionPackAccess, TrustSlipDecisionPackConsentShare


@dataclass(frozen=True)
class DecisionPackDefinition:
    key: str
    label: str
    short_label: str
    recipient_question: str
    focus: str
    expected_evidence: tuple[str, ...]
    gsn_sources: tuple[dict[str, str], ...]
    missing_links: tuple[str, ...]
    refuses_to_claim: tuple[str, ...]
    confirmation_reason_type: str
    confirmation_question: str


DECISION_PACKS: tuple[DecisionPackDefinition, ...] = (
    DecisionPackDefinition(
        key="community_standing",
        label="Community Standing Decision Pack",
        short_label="Standing",
        recipient_question="How is this person known where people actually know them?",
        focus="Community role, activity history, witness currentness, and unresolved public cautions.",
        expected_evidence=(
            "Active community membership and role",
            "Member witness or sponsor confirmation",
            "Participation, contribution, responsibility, support, leadership, or recognition TrustEvents",
            "Community confirmation path for live questions",
        ),
        gsn_sources=(
            {"label": "Community Home", "route": "/app/community", "evidence": "member communities, role, owner context"},
            {"label": "Marketplace", "route": "/app/marketplace", "evidence": "local member standing inside one community"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "live or relayed witness response"},
            {"label": "TrustEvents", "route": "/app/trust-events", "evidence": "recorded community activity categories"},
        ),
        missing_links=(
            "Structured reason-specific witness questions",
            "Clear issue-resolution summary tied to the member",
        ),
        refuses_to_claim=("Moral character", "Government identity", "Future behaviour"),
        confirmation_reason_type="community_standing_check",
        confirmation_question="Can current community witnesses confirm how this person is known in this community?",
    ),
    DecisionPackDefinition(
        key="referral_decision",
        label="Referral Decision Pack",
        short_label="Referral",
        recipient_question="Can this person be referred without damaging my credibility?",
        focus=(
            "Who knows the person, how they are placed in community, and whether live "
            "confirmation is needed before referral."
        ),
        expected_evidence=(
            "Relationship route: inviter, sponsor, or known community path",
            "Current witness strength and renewal status",
            "Relevant activity categories behind the referral",
            "Any visible cautions before passing the name on",
        ),
        gsn_sources=(
            {"label": "Invite / Join records", "route": "/app/community", "evidence": "how the person came through a known relationship"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "recipient asks the community before relying"},
            {"label": "TrustSlip", "route": "/app/trust-slip", "evidence": "scoped public referral paper"},
        ),
        missing_links=(
            "Referral outcome record: did the referral succeed, fail, or create a complaint?",
            "Referrer confidence statement tied to a specific purpose",
        ),
        refuses_to_claim=("Automatic suitability", "Guarantee by the referrer", "Recipient duty removed"),
        confirmation_reason_type="referral_check",
        confirmation_question="Can current community witnesses confirm enough relationship evidence for this referral?",
    ),
    DecisionPackDefinition(
        key="guarantor_decision",
        label="Guarantor or Support Decision Pack",
        short_label="Guarantor",
        recipient_question="Is there enough evidence to stand for or support this person?",
        focus=(
            "Responsibility signals, reliability evidence, support boundary, and community "
            "confirmation before accepting risk."
        ),
        expected_evidence=(
            "Repayment history and missed/complete repayment outcomes",
            "Existing support exposure and locked guarantee coverage",
            "People who stood for the person and what happened",
            "Contribution discipline and community responsibility records",
        ),
        gsn_sources=(
            {"label": "Loans & Support", "route": "/app/loans", "evidence": "request reason, amount, guarantors, support status"},
            {"label": "Repayment", "route": "/app/repayment", "evidence": "repayment milestones and completion"},
            {"label": "Guarantor Inbox", "route": "/app/guarantor-inbox", "evidence": "pending and accepted support obligations"},
            {"label": "Finance", "route": "/app/finance", "evidence": "contribution, money-in/out, and readiness signals"},
        ),
        missing_links=(
            "Simple guarantor risk summary in Trust Passport",
            "Outcome history for previous guarantees surfaced as decision evidence",
        ),
        refuses_to_claim=("Loan approval", "Bank guarantee", "Automatic repayment", "Money custody"),
        confirmation_reason_type="guarantor_support_check",
        confirmation_question="Can current community witnesses confirm responsibility evidence before anyone stands for this person?",
    ),
    DecisionPackDefinition(
        key="employment_decision",
        label="Employment Decision Pack",
        short_label="Employment",
        recipient_question="Is there enough evidence to continue an employment conversation?",
        focus="Role, consistency, contribution, leadership or service signals, and the next verification step.",
        expected_evidence=(
            "Declared work role or skill from onboarding, profile, shop, or community record",
            "Work, service, contribution, responsibility, learning, or recognition TrustEvents",
            "Employer/customer/community witness tied to the role being considered",
            "Demand or service response history where the role involved practical work",
        ),
        gsn_sources=(
            {"label": "Trust Passport", "route": "/app/trust", "evidence": "full signed-in work and evidence story"},
            {"label": "Shop / Service profile", "route": "/app/shop/me", "evidence": "declared services, categories, media, public shop face"},
            {"label": "Demand Box", "route": "/app/demand-box", "evidence": "requests answered, quotes, demand response trail"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "ask who has seen this work before"},
        ),
        missing_links=(
            "Structured skill claim field connected to Trust Passport",
            "Completed work record with customer confirmation",
            "Role-specific witness question: has this person done this work before?",
        ),
        refuses_to_claim=("Professional licence", "Right to work", "Future performance", "Employer decision"),
        confirmation_reason_type="employment_role_check",
        confirmation_question="Can current community witnesses confirm this person is known for the work or role being checked?",
    ),
    DecisionPackDefinition(
        key="housing_decision",
        label="Housing Decision Pack",
        short_label="Housing",
        recipient_question="Is there enough community evidence to continue a housing decision?",
        focus=(
            "Payment discipline, repayment evidence, issue-resolution behaviour, community witness, "
            "and live confirmation before tenancy risk."
        ),
        expected_evidence=(
            "Contribution, dues, ROSCA, rent-like, or recurring payment completion where recorded",
            "Repayment history and support follow-through",
            "Community witness that the person is responsible and reachable",
            "Dispute or issue-resolution evidence, including absence of unresolved visible cautions",
        ),
        gsn_sources=(
            {"label": "Finance", "route": "/app/finance", "evidence": "money summary, contribution discipline, records/events"},
            {"label": "ROSCA / Money Pool", "route": "/app/marketplace", "evidence": "local contribution schedules and completion"},
            {"label": "Loans / Repayment", "route": "/app/loans", "evidence": "borrower follow-through and repayment behaviour"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "landlord can ask a community witness before tenancy risk"},
        ),
        missing_links=(
            "Housing-specific reference questions",
            "Previous landlord or accommodation witness route",
            "Issue-resolution summary visible without exposing private disputes",
        ),
        refuses_to_claim=("Credit approval", "Right to rent", "Legal tenancy check", "Guaranteed rent"),
        confirmation_reason_type="housing_reference_check",
        confirmation_question="Can current community witnesses confirm responsible conduct, payment discipline, or issue resolution relevant to housing?",
    ),
    DecisionPackDefinition(
        key="trade_check",
        label="Trade or Skilled Work Decision Pack",
        short_label="Trade",
        recipient_question="Who has seen this person trade, serve, or complete work?",
        focus="Observed service activity, community evidence, visible disputes or cautions, and confirmation before work begins.",
        expected_evidence=(
            "Declared trade/service category such as plumbing, repairs, cleaning, delivery, or sales",
            "Shop, advert, Demand Box, quote, or work-response trail",
            "Customer or community witness that the work happened",
            "Completion, complaint, or issue-resolution outcome where recorded",
        ),
        gsn_sources=(
            {"label": "Shop Gallery", "route": "/app/shop/me", "evidence": "public service profile, media, categories, shop identity"},
            {"label": "Demand Box", "route": "/app/demand-box", "evidence": "requests, responses, quotes, service need trail"},
            {"label": "Marketplace", "route": "/app/marketplace", "evidence": "community where the advert/work relationship began"},
            {"label": "Merchant Verification", "route": "/app/trust-slip", "evidence": "community recognition and trade boundary"},
        ),
        missing_links=(
            "Customer-confirmed completed-job record",
            "Work photos tied to a confirmed job, not only uploaded media",
            "Direct ask-community question: is this person known for this trade?",
        ),
        refuses_to_claim=("Trade licence", "Insurance", "Home safety guarantee", "Future work quality"),
        confirmation_reason_type="trade_skill_check",
        confirmation_question="Can current community witnesses confirm this person is known for this trade or service?",
    ),
    DecisionPackDefinition(
        key="supplier_decision",
        label="Supplier Decision Pack",
        short_label="Supplier",
        recipient_question="Is there enough evidence to continue a supplier or contractor decision?",
        focus=(
            "Business reliability posture, fulfilment evidence where visible, community "
            "standing, and public verification status."
        ),
        expected_evidence=(
            "Shop and supplier profile identity",
            "Fulfilment, delivery, release, or protected trade records where available",
            "Customer/community recognition and merchant verification",
            "Visible dispute, delay, or correction outcome",
        ),
        gsn_sources=(
            {"label": "Marketplace", "route": "/app/marketplace", "evidence": "community trade context and shop exposure"},
            {"label": "Merchant Release", "route": "/merchant-release", "evidence": "release evidence and delivery boundary"},
            {"label": "Vault", "route": "/app/vault", "evidence": "controlled private catalogue or quote access"},
            {"label": "TrustSlip Verify", "route": "/trust-slips/verify", "evidence": "public supplier check before relying"},
        ),
        missing_links=(
            "Supplier fulfilment TrustEvent standard across product lifecycle",
            "Delivery/correction outcome joined to supplier Trust Passport",
        ),
        refuses_to_claim=("Delivery guarantee", "Payment release authority", "Escrow", "Automatic supplier approval"),
        confirmation_reason_type="supplier_reliability_check",
        confirmation_question="Can current community witnesses confirm supplier reliability or completed trade outcomes?",
    ),
    DecisionPackDefinition(
        key="volunteer_decision",
        label="Volunteer Decision Pack",
        short_label="Volunteer",
        recipient_question="Is there enough evidence to accept this person into a volunteer role?",
        focus="Participation, consistency, service posture, witness currentness, and safeguarding caution before placement.",
        expected_evidence=(
            "Participation and contribution records",
            "Responsibility or leadership carried before",
            "Community witness and sponsor currentness",
            "Safeguarding or placement-specific confirmation where the role is sensitive",
        ),
        gsn_sources=(
            {"label": "TrustEvents", "route": "/app/trust-events", "evidence": "participation, support, responsibility, leadership"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "ask current community responders before placement"},
            {"label": "Community Domain outcomes", "route": "/app/community-domain", "evidence": "beneficiary/outcome evidence where domains record it"},
        ),
        missing_links=(
            "Safeguarding-specific community confirmation questions",
            "Volunteer outcome records connected to TrustEvents",
        ),
        refuses_to_claim=("Background check", "Safeguarding clearance", "Legal eligibility", "Future conduct"),
        confirmation_reason_type="volunteer_role_check",
        confirmation_question="Can current community witnesses confirm this person is known for responsible participation or service?",
    ),
    DecisionPackDefinition(
        key="business_partnership",
        label="Business Partnership Decision Pack",
        short_label="Partner",
        recipient_question="Is there enough evidence to continue a business partnership discussion?",
        focus=(
            "Community reliability, responsibility signals, public verification status, and "
            "caution before shared commercial risk."
        ),
        expected_evidence=(
            "Shop, marketplace, and merchant recognition",
            "Finance discipline and repayment/support follow-through",
            "Supplier/trade outcomes and dispute resolution",
            "Community witness from the domain where the person operates",
        ),
        gsn_sources=(
            {"label": "Shop / Marketplace", "route": "/app/marketplace", "evidence": "commerce identity and community exposure"},
            {"label": "Finance", "route": "/app/finance", "evidence": "financial cooperation evidence, not bank approval"},
            {"label": "Trust Passport", "route": "/app/trust", "evidence": "cross-community evidence posture"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "live confirmation before shared risk"},
        ),
        missing_links=(
            "Partnership outcome/correction records",
            "Shared commercial risk checklist tied to evidence categories",
        ),
        refuses_to_claim=("Company due diligence", "Legal authority", "Investment advice", "Guaranteed profit"),
        confirmation_reason_type="partnership_check",
        confirmation_question="Can current community witnesses confirm reliability before shared business risk is taken?",
    ),
    DecisionPackDefinition(
        key="community_membership",
        label="Community Membership Decision Pack",
        short_label="Membership",
        recipient_question="Is there enough evidence to admit or connect this person to a community?",
        focus="Identity context, community route, witness currentness, standing, and first live confirmation step.",
        expected_evidence=(
            "Entry route: invite, join request, sponsor, or domain approval",
            "Identity evidence recorded vs verified",
            "Existing community roles and witness strength",
            "Participation or contribution readiness for the new community",
        ),
        gsn_sources=(
            {"label": "Join / Invite", "route": "/join", "evidence": "entry route and sponsor relationship"},
            {"label": "Identity Integrity", "route": "/app/identity", "evidence": "recorded identity evidence and verification status"},
            {"label": "Community Home", "route": "/app/community", "evidence": "existing communities and roles"},
            {"label": "Community Confirmation", "route": "/community-confirmations", "evidence": "current responders can confirm known relationship"},
        ),
        missing_links=(
            "Admission-purpose confirmation questions",
            "Clear join outcome linked back into Trust Passport evidence",
        ),
        refuses_to_claim=("Citizenship", "Legal immigration status", "Automatic admission", "Universal community endorsement"),
        confirmation_reason_type="membership_admission_check",
        confirmation_question="Can current community witnesses confirm the relationship route before admission or connection?",
    ),
)


def _clean(value: Any, *, limit: int = 360) -> str:
    text = str(value or "").strip()
    if not text:
        return ""
    text = " ".join(text.split())
    return text[:limit]


def _comparable(value: Any) -> str:
    return _clean(value).lower()


def find_decision_pack(value: Any) -> Optional[DecisionPackDefinition]:
    text = _clean(value, limit=160)
    if not text:
        return None
    comparable = _comparable(text)
    for pack in DECISION_PACKS:
        if comparable in {
            _comparable(pack.key),
            _comparable(pack.label),
            _comparable(pack.short_label),
        }:
            return pack
    return None


def normalize_decision_pack_context(params: Mapping[str, Any]) -> Optional[dict[str, Any]]:
    decision_pack_key = _clean(
        params.get("decision_pack") or params.get("decision_pack_key"),
        limit=64,
    )
    label = _clean(params.get("access_purpose") or params.get("purpose"), limit=160)
    recipient_question = _clean(
        params.get("recipient_question") or params.get("decision_question"),
        limit=280,
    )
    focus = _clean(params.get("decision_focus") or params.get("focus"), limit=360)
    scope = _clean(params.get("access_scope"), limit=64) or "public_decision_pack"

    if not any((decision_pack_key, label, recipient_question, focus)):
        return None

    pack = find_decision_pack(decision_pack_key) or find_decision_pack(label)
    context = {
        "decision_pack_key": pack.key if pack else decision_pack_key,
        "access_purpose": pack.label if pack else (label or "General Decision Pack"),
        "recipient_question": (
            pack.recipient_question
            if pack
            else recipient_question or "Can I make a better decision with this evidence?"
        ),
        "decision_focus": (
            pack.focus
            if pack
            else focus
            or "Current public identity, community standing, evidence currentness, and the next verification step."
        ),
        "access_scope": scope,
    }
    if pack:
        context.update(
            {
                "expected_evidence": list(pack.expected_evidence),
                "gsn_sources": [dict(source) for source in pack.gsn_sources],
                "missing_links": list(pack.missing_links),
                "refuses_to_claim": list(pack.refuses_to_claim),
                "confirmation_reason_type": pack.confirmation_reason_type,
                "confirmation_question": pack.confirmation_question,
            }
        )
    else:
        context.update(
            {
                "expected_evidence": [],
                "gsn_sources": [],
                "missing_links": [],
                "refuses_to_claim": [],
                "confirmation_reason_type": "community_standing_check",
                "confirmation_question": "Ask current community witnesses the purpose-specific question before relying.",
            }
        )
    return context


def _context_list(context: Mapping[str, Any], key: str) -> list[Any]:
    value = context.get(key)
    return list(value) if isinstance(value, (list, tuple)) else []


def _context_source_rows(context: Mapping[str, Any]) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    for raw in _context_list(context, "gsn_sources"):
        if not isinstance(raw, Mapping):
            continue
        label = _clean(raw.get("label"), limit=120)
        route = _clean(raw.get("route"), limit=160)
        evidence = _clean(raw.get("evidence"), limit=260)
        if label or evidence:
            rows.append({"label": label, "route": route, "evidence": evidence})
    return rows


def _context_boundaries(context: Mapping[str, Any], *, limit: int = 3) -> str:
    values = [_clean(value, limit=96) for value in _context_list(context, "refuses_to_claim")]
    values = [value for value in values if value]
    return ", ".join(values[:limit]) or "the final decision"


def build_decision_pack_access_payload(
    context: Optional[dict[str, Any]],
    *,
    recorded: bool,
) -> dict[str, Any]:
    if not context:
        return {}
    status = "backend_access_recorded" if recorded else "backend_access_context_only"
    return {
        "decision_pack": context["decision_pack_key"],
        "access_purpose": context["access_purpose"],
        "share_purpose": context["access_purpose"],
        "access_scope": context["access_scope"],
        "access_note": context["recipient_question"],
        "decision_pack_focus": context["decision_focus"],
        "share_access_record": {
            "recipient_label": "TrustSlip recipient",
            "purpose": context["access_purpose"],
            "scope": context["access_scope"],
            "note": context["recipient_question"],
            "focus": context["decision_focus"],
            "status": status,
        },
    }

PACK_RELEVANCE_SIGNALS: dict[str, tuple[str, ...]] = {
    "community_standing": (
        "community_identity",
        "membership_currentness",
        "member_witness",
        "community_activity",
        "relationship_evidence",
        "community_confirmation",
    ),
    "referral_decision": (
        "relationship_evidence",
        "member_witness",
        "community_activity",
        "membership_currentness",
        "community_confirmation",
    ),
    "guarantor_decision": (
        "membership_currentness",
        "member_witness",
        "community_activity",
        "relationship_evidence",
        "live_confirmation",
    ),
    "employment_decision": (
        "community_activity",
        "holder_role",
        "membership_currentness",
        "relationship_evidence",
        "live_confirmation",
    ),
    "housing_decision": (
        "membership_currentness",
        "community_activity",
        "community_identity",
        "member_witness",
        "live_confirmation",
    ),
    "trade_check": (
        "community_activity",
        "holder_role",
        "relationship_evidence",
        "merchant_public_status",
        "live_confirmation",
    ),
    "supplier_decision": (
        "merchant_public_status",
        "community_activity",
        "relationship_evidence",
        "membership_currentness",
        "live_confirmation",
    ),
    "volunteer_decision": (
        "community_identity",
        "membership_currentness",
        "community_activity",
        "member_witness",
        "live_confirmation",
    ),
    "business_partnership": (
        "merchant_public_status",
        "community_activity",
        "relationship_evidence",
        "membership_currentness",
        "live_confirmation",
    ),
    "community_membership": (
        "community_identity",
        "membership_currentness",
        "member_witness",
        "community_activity",
        "live_confirmation",
    ),
}


def _profile_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    text = _clean(value, limit=16).lower()
    return text in {"1", "true", "yes", "active", "verified", "current"}


def _profile_int(value: Any) -> int:
    try:
        parsed = int(float(str(value or "0")))
    except Exception:
        return 0
    return parsed if parsed > 0 else 0


def _nested(payload: Mapping[str, Any], *keys: str) -> Any:
    current: Any = payload
    for key in keys:
        if not isinstance(current, Mapping):
            return None
        current = current.get(key)
    return current


def _first_payload_value(payload: Mapping[str, Any], *paths: tuple[str, ...]) -> Any:
    for path in paths:
        value = _nested(payload, *path)
        if value not in (None, "", [], {}):
            return value
    return None


def _relationship_summary_text(value: Any) -> str:
    if not isinstance(value, Mapping):
        return ""
    label = _clean(value.get("summary_label") or value.get("relationship_label"), limit=160)
    count = _profile_int(value.get("evidence_count"))
    if label and count:
        return f"{label}; {count} relationship evidence item{'s' if count != 1 else ''} visible."
    if label:
        return label
    rows = value.get("rows")
    if isinstance(rows, list) and rows:
        first = rows[0] if isinstance(rows[0], Mapping) else {}
        row_label = _clean(first.get("relationship_label"), limit=160)
        if row_label:
            return row_label
    return ""


def _decision_signal(payload: Mapping[str, Any], key: str) -> dict[str, str]:
    merchant_view = payload.get("merchant_view") if isinstance(payload.get("merchant_view"), Mapping) else {}
    merchant_summary = (
        merchant_view.get("merchant_summary")
        if isinstance(merchant_view.get("merchant_summary"), Mapping)
        else {}
    )
    community_context = (
        payload.get("community_context")
        if isinstance(payload.get("community_context"), Mapping)
        else {}
    )

    if key == "community_identity":
        label = _clean(payload.get("identity_status_label"), limit=180) or _clean(
            _nested(payload, "identity_context", "identity_status_label"), limit=180
        )
        verified = _profile_bool(payload.get("identity_verified"))
        return {
            "key": key,
            "label": "Identity and community anchor",
            "status": "available" if verified or label else "gap",
            "value": label or "Identity/community anchor is not visible on this public paper.",
            "decision_use": "Check that the public holder and community record match the person in front of you.",
        }

    if key == "membership_currentness":
        label = _clean(
            _first_payload_value(
                payload,
                ("membership_currentness_label",),
                ("merchant_view", "membership_currentness_label"),
                ("merchant_view", "merchant_summary", "membership_currentness_label"),
                ("community_context", "membership_currentness_label"),
            ),
            limit=180,
        )
        scope = _clean(
            _first_payload_value(
                payload,
                ("membership_currentness_scope",),
                ("merchant_view", "membership_currentness_scope"),
                ("merchant_view", "merchant_summary", "membership_currentness_scope"),
                ("community_context", "membership_currentness_scope"),
            ),
            limit=260,
        )
        caution = any(word in label.lower() for word in ("expired", "due", "not started", "not shown"))
        return {
            "key": key,
            "label": "Membership currentness",
            "status": "caution" if caution or not label else "available",
            "value": label or "Membership currentness is not shown.",
            "decision_use": scope or "Use this to decide whether fresh witnesses or live confirmation are needed.",
        }

    if key == "member_witness":
        count = _profile_int(
            _first_payload_value(
                payload,
                ("member_witness_count",),
                ("merchant_view", "member_witness_count"),
                ("merchant_view", "merchant_summary", "member_witness_count"),
                ("community_context", "member_witness_count"),
            )
        )
        return {
            "key": key,
            "label": "Member witness evidence",
            "status": "available" if count else "gap",
            "value": f"{count} member witness record{'s' if count != 1 else ''} visible." if count else "No member witness count is visible on this public paper.",
            "decision_use": "Use witness depth as a prompt for live confirmation, not as automatic approval.",
        }

    if key == "community_activity":
        count = _profile_int(
            _first_payload_value(
                payload,
                ("community_activity_count",),
                ("merchant_view", "community_activity_count"),
                ("merchant_view", "merchant_summary", "community_activity_count"),
                ("community_context", "community_activity_count"),
            )
        )
        categories = _first_payload_value(
            payload,
            ("community_activity_categories",),
            ("merchant_view", "community_activity_categories"),
            ("merchant_view", "merchant_summary", "community_activity_categories"),
            ("community_context", "community_activity_categories"),
        )
        category_text = ""
        if isinstance(categories, list):
            category_text = ", ".join(_clean(item, limit=40) for item in categories[:3] if _clean(item, limit=40))
        label = _clean(
            _first_payload_value(
                payload,
                ("community_activity_label",),
                ("merchant_view", "community_activity_label"),
                ("merchant_view", "merchant_summary", "community_activity_label"),
                ("community_context", "community_activity_label"),
            ),
            limit=180,
        )
        value = label or (f"{count} community activity event{'s' if count != 1 else ''} visible." if count else "No community activity is visible on this public paper.")
        if count and category_text:
            value = f"{value} Categories: {category_text}."
        return {
            "key": key,
            "label": "Observed community activity",
            "status": "available" if count else "gap",
            "value": value,
            "decision_use": "Use activity depth to judge whether the person is known through repeated behaviour, not only a profile claim.",
        }

    if key == "holder_role":
        role = _clean(
            _first_payload_value(
                payload,
                ("holder_role",),
                ("merchant_view", "holder_role"),
                ("merchant_view", "merchant_summary", "holder_role"),
                ("community_context", "holder_role"),
            ),
            limit=100,
        )
        return {
            "key": key,
            "label": "Role or responsibility",
            "status": "available" if role and role.lower() != "member" else "caution",
            "value": role or "Role is not shown beyond ordinary membership.",
            "decision_use": "Use role evidence as context only; ask who observed the responsibility if it matters.",
        }

    if key == "relationship_evidence":
        relationship = _first_payload_value(
            payload,
            ("relationship_evidence_summary",),
            ("merchant_view", "relationship_evidence_summary"),
            ("merchant_view", "merchant_summary", "relationship_evidence_summary"),
        )
        text = _relationship_summary_text(relationship)
        return {
            "key": key,
            "label": "Relationship provenance",
            "status": "available" if text else "gap",
            "value": text or "No public relationship provenance is visible on this paper.",
            "decision_use": "Use this to ask who actually knows the holder and in what capacity.",
        }

    if key == "merchant_public_status":
        active = _profile_bool(payload.get("merchant_verify_active"))
        return {
            "key": key,
            "label": "Public trade status",
            "status": "available" if active else "caution",
            "value": "Merchant/public verification is active." if active else "Merchant/public verification is not active or not shown.",
            "decision_use": "Use this as a public-record status only; it is not escrow, delivery, or payment approval.",
        }

    if key in {"community_confirmation", "live_confirmation"}:
        confirmation = payload.get("community_confirmation") if isinstance(payload.get("community_confirmation"), Mapping) else {}
        relay = _profile_bool(confirmation.get("relay_available")) or _profile_bool(confirmation.get("instant_pulse_available"))
        plain = _clean(confirmation.get("plain_language"), limit=260)
        return {
            "key": key,
            "label": "Live community confirmation",
            "status": "available" if relay else "caution",
            "value": plain or ("Live community confirmation can be requested." if relay else "Live community confirmation is not available on this TrustSlip yet."),
            "decision_use": "For important decisions, request live confirmation before relying on this public paper.",
        }

    return {
        "key": key,
        "label": "Evidence signal",
        "status": "gap",
        "value": "This signal is not available on the public TrustSlip paper.",
        "decision_use": "Ask for the full Trust Passport or direct community confirmation if this evidence matters.",
    }



PUBLIC_EVENT_CATEGORY_LABELS: dict[str, str] = {
    "identity_membership": "Identity and membership evidence",
    "community_participation": "Community participation evidence",
    "service_trade": "Service or trade evidence",
    "trust_document_activity": "Trust document activity",
    "relationship_path": "Relationship path evidence",
}

PUBLIC_EVENT_CATEGORY_USES: dict[str, str] = {
    "identity_membership": "Use this to check whether the holder has a visible identity/community anchor.",
    "community_participation": "Use this to check whether the holder has repeated community activity, not only a profile claim.",
    "service_trade": "Use this to ask who observed the service, trade, fulfilment, or marketplace behaviour.",
    "trust_document_activity": "Use this to confirm that the public trust-document trail exists and remains current.",
    "relationship_path": "Use this to ask who brought the holder into the community and in what capacity.",
}

SENSITIVE_EVENT_CATEGORY_LABELS: dict[str, str] = {
    "finance_repayment": "Financial or repayment evidence",
    "guarantor_support": "Guarantor or support-risk evidence",
    "bank_payment": "Bank, payment, payout, or withdrawal evidence",
    "dispute_caution": "Dispute, rejection, default, or caution evidence",
}

PACK_EVENT_CATEGORY_FILTERS: dict[str, tuple[str, ...]] = {
    "community_standing": (
        "identity_membership",
        "community_participation",
        "relationship_path",
        "trust_document_activity",
    ),
    "referral_decision": (
        "relationship_path",
        "identity_membership",
        "community_participation",
        "trust_document_activity",
    ),
    "guarantor_decision": (
        "identity_membership",
        "community_participation",
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
        "relationship_path",
        "trust_document_activity",
    ),
    "housing_decision": (
        "identity_membership",
        "community_participation",
        "relationship_path",
        "finance_repayment",
        "dispute_caution",
    ),
    "trade_check": (
        "service_trade",
        "community_participation",
        "relationship_path",
        "trust_document_activity",
        "dispute_caution",
    ),
    "supplier_decision": (
        "service_trade",
        "community_participation",
        "relationship_path",
        "bank_payment",
        "dispute_caution",
    ),
    "volunteer_decision": (
        "identity_membership",
        "community_participation",
        "relationship_path",
        "dispute_caution",
    ),
    "business_partnership": (
        "service_trade",
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
        "relationship_path",
        "trust_document_activity",
        "dispute_caution",
    ),
}


def _event_text(value: Any) -> str:
    return _clean(value, limit=96).lower().replace("-", "_").replace(".", "_")


def _public_event_category(event_type: Any) -> Optional[str]:
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
    if any(token in text for token in ("identity", "phone", "photo", "member_verified", "community_member_verified")):
        return "identity_membership"
    if any(token in text for token in ("invite", "clan_join", "joined", "membership")):
        return "relationship_path" if "invite" in text else "identity_membership"
    if any(token in text for token in ("marketplace", "merchant", "shop", "delivery", "service", "trade", "vault_order")):
        return "service_trade"
    if any(token in text for token in ("community", "contribution", "participation", "role", "leader", "committee")):
        return "community_participation"
    if "trust_slip" in text or "trustslip" in text:
        return "trust_document_activity"
    return None


def _event_category_row(category: str, rows: list[TrustEvent]) -> dict[str, Any]:
    latest = max((getattr(row, "created_at", None) for row in rows), default=None)
    return {
        "key": category,
        "label": PUBLIC_EVENT_CATEGORY_LABELS.get(category, "Public evidence category"),
        "status": "available" if rows else "gap",
        "evidence_count": len(rows),
        "latest_at": latest.isoformat() if latest else None,
        "source": "redacted_trust_events",
        "decision_use": PUBLIC_EVENT_CATEGORY_USES.get(
            category,
            "Use this as a public pointer only; ask for direct confirmation before relying on it.",
        ),
    }


PRIVATE_META_ALLOWLIST = {
    "status",
    "role",
    "source",
    "category",
    "community_id",
    "community_code",
    "shop_id",
    "product_id",
    "trust_slip_id",
    "confirmation_status",
    "visibility",
    "reason_code",
}

PRIVATE_META_BLOCK_TOKENS = (
    "address",
    "bank",
    "contact",
    "email",
    "ip",
    "location",
    "note",
    "payment",
    "phone",
    "private",
    "reference",
    "secret",
    "token",
)


def _private_event_label(event_type: Any) -> str:
    text = _clean(event_type, limit=96).replace(".", " ").replace("_", " ").replace("-", " ")
    text = " ".join(text.split())
    return text.title() if text else "Trust Event"


def _scrub_private_event_meta(meta: Any) -> dict[str, str]:
    if not isinstance(meta, Mapping):
        return {}

    safe: dict[str, str] = {}
    for raw_key, raw_value in meta.items():
        key = _clean(raw_key, limit=64).lower()
        if not key:
            continue
        if key not in PRIVATE_META_ALLOWLIST:
            continue
        if any(token in key for token in PRIVATE_META_BLOCK_TOKENS):
            continue

        value = _clean(raw_value, limit=96)
        if not value:
            continue
        if any(token in value.lower() for token in ("secret", "private", "password", "token")):
            continue
        safe[key] = value

    return safe


def _coerce_positive_int(value: Any) -> Optional[int]:
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        return None
    return parsed if parsed > 0 else None


def _holder_active_community_ids(
    db: Session,
    *,
    holder_user_id: int,
    primary_clan_id: Any = None,
) -> set[int]:
    community_ids: set[int] = set()
    primary_id = _coerce_positive_int(primary_clan_id)
    if primary_id is not None:
        community_ids.add(primary_id)

    rows = (
        db.query(ClanMembership.clan_id)
        .filter(ClanMembership.user_id == int(holder_user_id))
        .filter(ClanMembership.left_at.is_(None))
        .all()
    )
    for row in rows:
        raw_id = row[0] if isinstance(row, tuple) else getattr(row, "clan_id", None)
        community_id = _coerce_positive_int(raw_id)
        if community_id is not None:
            community_ids.add(community_id)

    return community_ids


def _decision_pack_evidence_scope(
    *,
    active_community_ids: set[int],
    primary_clan_id: Any = None,
) -> dict[str, Any]:
    primary_id = _coerce_positive_int(primary_clan_id)
    active_count = len(active_community_ids)
    reading_scope = "primary_plus_wider" if active_count > 1 else "primary_only"
    return {
        "reading_scope": reading_scope,
        "primary_community_id": primary_id,
        "included_active_community_count": active_count,
        "includes_holder_level_records": True,
        "public_summary": (
            f"Purpose evidence may include holder records from {active_count} active community contexts."
            if active_count > 1
            else "Purpose evidence is currently anchored to the primary community plus holder-level records."
        ),
        "boundary": (
            "This Decision Pack may include records from the holder's active community footprint, "
            "but it does not mean every community gives the same judgement."
        ),
    }


WORK_DECLARATION_PACKS = {
    "employment_decision",
    "trade_check",
    "supplier_decision",
    "business_partnership",
}


def _claim_row(
    *,
    key: str,
    label: str,
    value: str,
    source: str,
    status: str = "available",
    count: int = 1,
    decision_use: str,
) -> dict[str, Any]:
    return {
        "key": key,
        "label": _clean(label, limit=96),
        "status": _clean(status, limit=32) or "available",
        "value": _clean(value, limit=280),
        "source": _clean(source, limit=80),
        "evidence_count": _profile_int(count),
        "decision_use": _clean(decision_use, limit=240),
    }


def _decision_pack_declared_claims(
    db: Session,
    *,
    holder_user_id: int,
    pack_key: str,
    active_community_ids: set[int],
) -> list[dict[str, Any]]:
    if pack_key not in WORK_DECLARATION_PACKS:
        return []

    claims: list[dict[str, Any]] = []
    shop = (
        db.query(MarketplaceShop)
        .filter(MarketplaceShop.owner_user_id == int(holder_user_id))
        .filter(MarketplaceShop.is_active.is_(True))
        .order_by(MarketplaceShop.created_at.desc(), MarketplaceShop.id.desc())
        .first()
    )
    if shop is not None:
        name = _clean(getattr(shop, "name", None), limit=120)
        description = _clean(getattr(shop, "description", None), limit=180)
        value = f"Shop profile: {name}" if name else "Active shop profile is present."
        if description:
            value = f"{value}. Public description: {description}"
        claims.append(
            _claim_row(
                key="shop_service_declaration",
                label="Shop/service declaration",
                value=value,
                source="marketplace_shop",
                decision_use="Use this as the holder's declared service face. Ask witnesses or customers before treating it as proven skill.",
            )
        )

    product_query = (
        db.query(MarketplaceProduct)
        .filter(MarketplaceProduct.seller_user_id == int(holder_user_id))
        .filter(MarketplaceProduct.is_active.is_(True))
    )
    if active_community_ids:
        product_query = product_query.filter(MarketplaceProduct.clan_id.in_(active_community_ids))
    products = (
        product_query.order_by(MarketplaceProduct.created_at.desc(), MarketplaceProduct.id.desc())
        .limit(6)
        .all()
    )
    product_titles = [_clean(getattr(product, "name", None), limit=80) for product in products]
    product_titles = [title for title in product_titles if title]
    if product_titles:
        claims.append(
            _claim_row(
                key="listed_service_or_item",
                label="Listed service or item",
                value="Active listing titles include: " + ", ".join(product_titles[:4]),
                source="marketplace_products",
                count=len(product_titles),
                decision_use="Use listings as declared service scope only. They do not prove completion, licence, or future work quality.",
            )
        )

    trades = (
        db.query(ProtectedTradeRecord)
        .filter(ProtectedTradeRecord.seller_user_id == int(holder_user_id))
        .order_by(ProtectedTradeRecord.created_at.desc(), ProtectedTradeRecord.id.desc())
        .limit(20)
        .all()
    )
    if trades:
        completed = [
            trade
            for trade in trades
            if _clean(getattr(trade, "release_status", None), limit=40).lower() == "released"
            or _clean(getattr(trade, "receipt_status", None), limit=40).lower() in {"confirmed", "received"}
            or _clean(getattr(trade, "status", None), limit=40).lower() in {"released", "completed", "closed"}
        ]
        titles = [_clean(getattr(trade, "item_title", None), limit=80) for trade in trades]
        titles = [title for title in titles if title]
        value = f"{len(trades)} protected trade record{'s' if len(trades) != 1 else ''} found for this seller"
        if completed:
            value = f"{value}; {len(completed)} show release, receipt, or completion status"
        if titles:
            value = f"{value}. Recent: {', '.join(titles[:3])}"
        claims.append(
            _claim_row(
                key="protected_trade_seller_record",
                label="Protected trade record",
                value=value,
                source="protected_trade_records",
                count=len(trades),
                decision_use="Use protected trade records as transaction evidence. They are not escrow, insurance, professional licensing, or a workmanship guarantee.",
            )
        )

    if not claims:
        claims.append(
            _claim_row(
                key="structured_work_claim_gap",
                label="Structured work claim",
                status="gap",
                value="No active shop, listing, or protected-trade record is visible for this Decision Pack yet.",
                source="decision_pack_extract",
                count=0,
                decision_use="Ask the holder for a shop/service profile, completed-work evidence, or live community confirmation before relying on the work claim.",
            )
        )

    return claims[:4]


def _private_event_scope(
    row: TrustEvent,
    *,
    primary_clan_id: Any = None,
    active_community_ids: set[int],
) -> str:
    row_clan_id = _coerce_positive_int(getattr(row, "clan_id", None))
    primary_id = _coerce_positive_int(primary_clan_id)
    if row_clan_id is None:
        return "holder_record"
    if primary_id is not None and row_clan_id == primary_id:
        return "primary_community"
    if row_clan_id in active_community_ids:
        return "other_active_community"
    return "outside_active_community"


def _filter_query_to_holder_active_footprint(query: Any, *, active_community_ids: set[int]) -> Any:
    if active_community_ids:
        return query.filter((TrustEvent.clan_id.in_(active_community_ids)) | (TrustEvent.clan_id.is_(None)))
    return query.filter(TrustEvent.clan_id.is_(None))


def _private_event_reference(
    row: TrustEvent,
    *,
    slip: TrustSlip,
    active_community_ids: set[int],
) -> dict[str, Any]:
    created_at = getattr(row, "created_at", None)
    return {
        "id": int(row.id),
        "label": _private_event_label(getattr(row, "event_type", None)),
        "created_at": created_at.isoformat() if created_at else None,
        "scope": _private_event_scope(
            row,
            primary_clan_id=getattr(slip, "clan_id", None),
            active_community_ids=active_community_ids,
        ),
        "safe_meta": _scrub_private_event_meta(getattr(row, "meta", None)),
    }


def _private_event_category_row(
    category: str,
    rows: list[TrustEvent],
    *,
    slip: TrustSlip,
    active_community_ids: set[int],
) -> dict[str, Any]:
    latest = max((getattr(row, "created_at", None) for row in rows), default=None)
    label = PUBLIC_EVENT_CATEGORY_LABELS.get(category) or SENSITIVE_EVENT_CATEGORY_LABELS.get(category) or "Private evidence category"
    return {
        "key": category,
        "label": label,
        "status": "available" if rows else "gap",
        "evidence_count": len(rows),
        "latest_at": latest.isoformat() if latest else None,
        "source": "holder_private_trust_events",
        "event_refs": [
            _private_event_reference(row, slip=slip, active_community_ids=active_community_ids)
            for row in rows[:3]
        ],
        "decision_use": PUBLIC_EVENT_CATEGORY_USES.get(
            category,
            "Use this as holder-side provenance only; share through consented Trust Passport or live confirmation.",
        ),
    }


def build_decision_pack_private_evidence_extract(
    db: Session,
    *,
    slip: TrustSlip,
    context: Optional[dict[str, Any]],
    limit: int = 80,
) -> dict[str, Any]:
    if not context:
        return {}

    holder_user_id = getattr(slip, "holder_user_id", None)
    if holder_user_id is None:
        return {}

    pack_key = context.get("decision_pack_key") or "community_standing"
    category_filter = PACK_EVENT_CATEGORY_FILTERS.get(pack_key) or (
        "identity_membership",
        "community_participation",
        "relationship_path",
        "trust_document_activity",
    )

    active_community_ids = _holder_active_community_ids(
        db,
        holder_user_id=int(holder_user_id),
        primary_clan_id=getattr(slip, "clan_id", None),
    )
    query = _filter_query_to_holder_active_footprint(
        db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(holder_user_id)),
        active_community_ids=active_community_ids,
    )
    rows = (
        query.order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(max(1, min(int(limit or 80), 200)))
        .all()
    )

    grouped: dict[str, list[TrustEvent]] = {category: [] for category in category_filter}
    for row in rows:
        category = _public_event_category(getattr(row, "event_type", None))
        if category in grouped:
            grouped[category].append(row)

    categories = [
        _private_event_category_row(
            category,
            grouped.get(category, []),
            slip=slip,
            active_community_ids=active_community_ids,
        )
        for category in category_filter
    ]
    declared_claims = _decision_pack_declared_claims(
        db,
        holder_user_id=int(holder_user_id),
        pack_key=pack_key,
        active_community_ids=active_community_ids,
    )
    return {
        "source": "holder_private_decision_pack_extract",
        "decision_pack": pack_key,
        "access_purpose": context.get("access_purpose") or "Decision Pack",
        "recipient_question": context.get("recipient_question") or "Can I make a better decision with this evidence?",
        "evidence_scope": _decision_pack_evidence_scope(
            active_community_ids=active_community_ids,
            primary_clan_id=getattr(slip, "clan_id", None),
        ),
        "categories": categories,
        "declared_claims": declared_claims,
        "declaration_boundary_note": "Declared shop, listing, or trade records are evidence pointers only. They do not prove licence, insurance, work quality, or future performance.",
        "privacy_note": "Authenticated holder preview only. Event references are provenance pointers for consented review, not a public evidence paper.",
        "boundary_note": "This private preview is not a score, approval, guarantee, payment instruction, dispute disclosure, or public TrustSlip output.",
    }


def build_decision_pack_evidence_extract(
    db: Session,
    *,
    slip: TrustSlip,
    context: Optional[dict[str, Any]],
    limit: int = 250,
) -> dict[str, Any]:
    if not context:
        return {}

    holder_user_id = getattr(slip, "holder_user_id", None)
    if holder_user_id is None:
        return {}

    pack_key = context.get("decision_pack_key") or "general_decision_pack"
    category_filter = PACK_EVENT_CATEGORY_FILTERS.get(pack_key) or (
        "identity_membership",
        "community_participation",
        "relationship_path",
        "trust_document_activity",
    )
    public_categories = [category for category in category_filter if category in PUBLIC_EVENT_CATEGORY_LABELS]
    sensitive_categories = [category for category in category_filter if category in SENSITIVE_EVENT_CATEGORY_LABELS]

    active_community_ids = _holder_active_community_ids(
        db,
        holder_user_id=int(holder_user_id),
        primary_clan_id=getattr(slip, "clan_id", None),
    )
    query = _filter_query_to_holder_active_footprint(
        db.query(TrustEvent).filter(TrustEvent.subject_user_id == int(holder_user_id)),
        active_community_ids=active_community_ids,
    )
    rows = (
        query.order_by(TrustEvent.created_at.desc(), TrustEvent.id.desc())
        .limit(max(1, min(int(limit or 250), 500)))
        .all()
    )

    grouped: dict[str, list[TrustEvent]] = {category: [] for category in public_categories}
    for row in rows:
        category = _public_event_category(getattr(row, "event_type", None))
        if category in grouped:
            grouped[category].append(row)

    categories = [_event_category_row(category, grouped.get(category, [])) for category in public_categories]
    declared_claims = _decision_pack_declared_claims(
        db,
        holder_user_id=int(holder_user_id),
        pack_key=pack_key,
        active_community_ids=active_community_ids,
    )
    return {
        "source": "trust_events_redacted_extract",
        "source_note": "Aggregated from TrustEvent categories only. Raw TrustEvents, actor details, notes, metadata, payment references, and private contacts are not exposed publicly.",
        "evidence_scope": _decision_pack_evidence_scope(
            active_community_ids=active_community_ids,
            primary_clan_id=getattr(slip, "clan_id", None),
        ),
        "categories": categories,
        "declared_claims": declared_claims,
        "declaration_boundary_note": "Declared shop, listing, or trade records are evidence pointers only. They do not prove licence, insurance, work quality, or future performance.",
        "private_review_required": [
            {
                "key": category,
                "label": SENSITIVE_EVENT_CATEGORY_LABELS[category],
                "status": "private_review_required",
                "decision_use": "Ask the holder for the full Trust Passport or live community confirmation if this sensitive evidence matters.",
            }
            for category in sensitive_categories
        ],
        "boundary_note": "This extract shows public-safe category counts only. It is not a raw event timeline, score, approval, guarantee, repayment history, or dispute disclosure.",
    }
def build_decision_pack_profile(
    context: Optional[dict[str, Any]],
    *,
    public_payload: Mapping[str, Any],
    evidence_extract: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    if not context:
        return {}

    pack_key = context.get("decision_pack_key") or "general_decision_pack"
    signal_keys = PACK_RELEVANCE_SIGNALS.get(pack_key) or (
        "community_identity",
        "membership_currentness",
        "community_activity",
        "live_confirmation",
    )
    visible_signals = [_decision_signal(public_payload, key) for key in signal_keys]
    expected_evidence = [
        _clean(value, limit=260)
        for value in _context_list(context, "expected_evidence")
        if _clean(value, limit=260)
    ]
    missing_links = [
        _clean(value, limit=260)
        for value in _context_list(context, "missing_links")
        if _clean(value, limit=260)
    ]
    gsn_sources = _context_source_rows(context)
    boundary_list = _context_boundaries(context)
    expected_signals = [
        {
            "key": f"expected_evidence_{index + 1}",
            "label": "Expected evidence" if index == 0 else f"Expected evidence {index + 1}",
            "status": "expected",
            "value": evidence,
            "decision_use": (
                "Check whether this evidence is visible, current, or confirmed by the community before relying."
            ),
        }
        for index, evidence in enumerate(expected_evidence[:5])
    ]
    declared_claims = []
    if isinstance(evidence_extract, Mapping) and isinstance(evidence_extract.get("declared_claims"), list):
        declared_claims = [claim for claim in evidence_extract.get("declared_claims", []) if isinstance(claim, Mapping)]
    declared_signal = []
    if declared_claims:
        first_claim = declared_claims[0]
        declared_signal = [
            {
                "key": "declared_work_service_claim",
                "label": "Declared work/service claim",
                "status": _clean(first_claim.get("status"), limit=32) or "available",
                "value": _clean(first_claim.get("value"), limit=260) or "Declared work/service evidence is visible.",
                "decision_use": "Treat this as a claim pointer. Ask for customer, community, or completed-work confirmation before relying.",
            }
        ]
    signals = expected_signals + declared_signal + visible_signals
    signal_gaps = [signal for signal in visible_signals + declared_signal if signal.get("status") in {"gap", "caution"}]
    missing_gap_rows = [
        {
            "key": f"missing_link_{index + 1}",
            "label": "Architecture gap" if index == 0 else f"Architecture gap {index + 1}",
            "reason": gap,
            "next_step": "Ask for live community confirmation or the fuller Trust Passport before relying on this point.",
        }
        for index, gap in enumerate(missing_links[:4])
    ]
    checks = [
        "Match the visible holder, GSN ID, community, and expiry with the person presenting the TrustSlip.",
        "Ask for live community confirmation before relying on this paper for important risk.",
    ]
    checks.extend(
        f"{source['label']}: {source['evidence']}"
        for source in gsn_sources[:4]
        if source.get("label") or source.get("evidence")
    )
    if signal_gaps or missing_links:
        checks.append("Treat missing or caution signals as questions to resolve, not as negative proof.")

    return {
        "decision_pack": pack_key,
        "access_purpose": context.get("access_purpose") or "Decision Pack",
        "recipient_question": context.get("recipient_question") or "Can I make a better decision with this evidence?",
        "evidence_filter": list(signal_keys),
        "expected_evidence": expected_evidence,
        "gsn_sources": gsn_sources,
        "missing_links": missing_links,
        "refuses_to_claim": [
            _clean(value, limit=120)
            for value in _context_list(context, "refuses_to_claim")
            if _clean(value, limit=120)
        ],
        "community_confirmation_prompt": {
            "reason_type": _clean(
                context.get("confirmation_reason_type"),
                limit=48,
            )
            or "community_standing_check",
            "question": _clean(
                context.get("confirmation_question"),
                limit=320,
            )
            or "Ask current community witnesses the purpose-specific question before relying.",
            "boundary": "Responses are community witness evidence only; they are not licences, guarantees, approvals, or final decisions.",
        },
        "relevant_signals": signals[:10],
        "gaps_to_check": [
            {
                "key": signal.get("key"),
                "label": signal.get("label"),
                "reason": signal.get("value"),
                "next_step": signal.get("decision_use"),
            }
            for signal in signal_gaps[:4]
        ] + missing_gap_rows,
        "recommended_checks": checks[:8],
        "evidence_extract": evidence_extract or {},
        "basis_note": (
            "Generated from public TrustSlip signals and the shared GSN Decision Pack evidence matrix; "
            "no private Trust Passport contents are exposed."
        ),
        "boundary_note": (
            "This profile highlights relevant evidence and gaps. It does not score the person, "
            f"guarantee future behaviour, make the decision for the recipient, or prove {boundary_list}."
        ),
    }

def _bounded_non_negative_count(value: Any, *, limit: int = 1000) -> int:
    if isinstance(value, bool):
        return 0
    try:
        number = int(value or 0)
    except Exception:
        return 0
    return max(0, min(number, limit))


def _safe_export_format(value: Any) -> str:
    text = _clean(value, limit=24).lower().replace("-", "_").replace(" ", "_")
    return text if text in {"summary", "json"} else "summary"


def record_decision_pack_consent_share(
    db: Session,
    *,
    slip: TrustSlip,
    context: Optional[dict[str, Any]],
    export_format: str,
    category_count: int = 0,
    event_ref_count: int = 0,
) -> Optional[TrustSlipDecisionPackConsentShare]:
    if not context:
        return None

    row = TrustSlipDecisionPackConsentShare(
        trust_slip_id=int(slip.id),
        clan_id=int(slip.clan_id) if getattr(slip, "clan_id", None) else None,
        holder_user_id=int(slip.holder_user_id) if getattr(slip, "holder_user_id", None) else None,
        code=str(slip.code),
        decision_pack_key=context["decision_pack_key"] or None,
        access_purpose=context["access_purpose"],
        recipient_question=context["recipient_question"],
        decision_focus=context["decision_focus"],
        consent_scope="holder_private_decision_pack",
        source="holder_private_preview",
        export_format=_safe_export_format(export_format),
        category_count=_bounded_non_negative_count(category_count),
        event_ref_count=_bounded_non_negative_count(event_ref_count),
        status="recorded",
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def decision_pack_consent_share_to_holder_row(row: TrustSlipDecisionPackConsentShare) -> dict[str, Any]:
    created_at = getattr(row, "created_at", None)
    return {
        "id": int(row.id),
        "trust_slip_id": int(row.trust_slip_id),
        "code": _clean(row.code, limit=64),
        "decision_pack": _clean(row.decision_pack_key, limit=64),
        "access_purpose": _clean(row.access_purpose, limit=160),
        "recipient_question": _clean(row.recipient_question, limit=280),
        "decision_focus": _clean(row.decision_focus, limit=360),
        "consent_scope": _clean(row.consent_scope, limit=64),
        "source": _clean(row.source, limit=64),
        "export_format": _clean(row.export_format, limit=24),
        "category_count": int(getattr(row, "category_count", 0) or 0),
        "event_ref_count": int(getattr(row, "event_ref_count", 0) or 0),
        "status": _clean(row.status, limit=32),
        "created_at": created_at.isoformat() if created_at else None,
    }


def list_decision_pack_consent_shares_for_holder(
    db: Session,
    *,
    holder_user_id: int,
    limit: int = 12,
) -> list[dict[str, Any]]:
    bounded_limit = max(1, min(int(limit or 12), 50))
    rows = (
        db.query(TrustSlipDecisionPackConsentShare)
        .filter(TrustSlipDecisionPackConsentShare.holder_user_id == int(holder_user_id))
        .order_by(
            TrustSlipDecisionPackConsentShare.created_at.desc(),
            TrustSlipDecisionPackConsentShare.id.desc(),
        )
        .limit(bounded_limit)
        .all()
    )
    return [decision_pack_consent_share_to_holder_row(row) for row in rows]


def record_decision_pack_access(
    db: Session,
    *,
    slip: TrustSlip,
    context: Optional[dict[str, Any]],
    visibility_level: str,
    status: str,
) -> Optional[TrustSlipDecisionPackAccess]:
    if not context:
        return None

    access = TrustSlipDecisionPackAccess(
        trust_slip_id=int(slip.id),
        clan_id=int(slip.clan_id) if getattr(slip, "clan_id", None) else None,
        holder_user_id=int(slip.holder_user_id) if getattr(slip, "holder_user_id", None) else None,
        code=str(slip.code),
        decision_pack_key=context["decision_pack_key"] or None,
        access_purpose=context["access_purpose"],
        recipient_question=context["recipient_question"],
        decision_focus=context["decision_focus"],
        access_scope=context["access_scope"],
        source="public_verify",
        visibility_level=_clean(visibility_level, limit=20) or None,
        status=_clean(status, limit=32) or None,
    )
    db.add(access)
    db.commit()
    db.refresh(access)
    return access


def decision_pack_access_to_public_row(access: TrustSlipDecisionPackAccess) -> dict[str, Any]:
    created_at = getattr(access, "created_at", None)
    return {
        "id": int(access.id),
        "trust_slip_id": int(access.trust_slip_id),
        "code": _clean(access.code, limit=64),
        "decision_pack": _clean(access.decision_pack_key, limit=64),
        "access_purpose": _clean(access.access_purpose, limit=160),
        "recipient_question": _clean(access.recipient_question, limit=280),
        "decision_focus": _clean(access.decision_focus, limit=360),
        "access_scope": _clean(access.access_scope, limit=64),
        "source": _clean(access.source, limit=64),
        "visibility_level": _clean(access.visibility_level, limit=20),
        "status": _clean(access.status, limit=32),
        "created_at": created_at.isoformat() if created_at else None,
    }


def list_decision_pack_accesses_for_holder(
    db: Session,
    *,
    holder_user_id: int,
    limit: int = 12,
) -> list[dict[str, Any]]:
    bounded_limit = max(1, min(int(limit or 12), 50))
    rows = (
        db.query(TrustSlipDecisionPackAccess)
        .filter(TrustSlipDecisionPackAccess.holder_user_id == int(holder_user_id))
        .order_by(TrustSlipDecisionPackAccess.created_at.desc(), TrustSlipDecisionPackAccess.id.desc())
        .limit(bounded_limit)
        .all()
    )
    return [decision_pack_access_to_public_row(row) for row in rows]
