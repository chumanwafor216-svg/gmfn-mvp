from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Optional


TRUST_POLICY_VERSION = "TP-2026-02-PH1"


@dataclass(frozen=True)
class TrustDeltaRule:
    event_type: str
    delta: Decimal
    label: str
    kind: str  # "positive" | "negative" | "neutral"


# Conservative: map only what we are sure about.
RULES: dict[str, TrustDeltaRule] = {
    # Positive repayment policy
    "repayment.confirmed": TrustDeltaRule("repayment.confirmed", Decimal("0.10"), "Borrower repaid in full", "positive"),
    "loan.repaid": TrustDeltaRule("loan.repaid", Decimal("0.10"), "Borrower repaid in full", "positive"),
    "repayment.completed": TrustDeltaRule("repayment.completed", Decimal("0.10"), "Borrower repaid in full", "positive"),

    # Guarantor benefit (only if you emit these explicitly)
    "guarantor.repayment.confirmed": TrustDeltaRule("guarantor.repayment.confirmed", Decimal("0.03"), "Guarantor supported a successful repayment", "positive"),
    "guarantor.support.confirmed": TrustDeltaRule("guarantor.support.confirmed", Decimal("0.03"), "Guarantor supported a successful repayment", "positive"),

    # Onboarding identity proofs
    "identity.phone_verified": TrustDeltaRule("identity.phone_verified", Decimal("0.50"), "Verified phone attached to identity", "positive"),
    "identity.bank_destination_recorded": TrustDeltaRule("identity.bank_destination_recorded", Decimal("0.80"), "Verified-phone holder recorded a bank destination", "positive"),
    "identity.drivers_licence_recorded": TrustDeltaRule("identity.drivers_licence_recorded", Decimal("0.40"), "Driver's licence proof recorded", "positive"),
    "identity.region_consistent": TrustDeltaRule("identity.region_consistent", Decimal("0.20"), "Phone and bank region signals aligned at onboarding", "positive"),
    "identity.region_mismatch_explained": TrustDeltaRule("identity.region_mismatch_explained", Decimal("0.00"), "Cross-region onboarding was explained and recorded for review", "neutral"),

    # Negative events (admin-controlled)
    "repayment.missed": TrustDeltaRule("repayment.missed", Decimal("-0.10"), "Borrower missed repayment (admin-reviewed)", "negative"),
    "repayment.late": TrustDeltaRule("repayment.late", Decimal("-0.05"), "Borrower repaid late (admin-reviewed)", "negative"),

    # Dispute/fraud markers (neutral by default; policy can tighten later)
    "dispute.opened": TrustDeltaRule("dispute.opened", Decimal("0.00"), "Dispute opened (marker)", "neutral"),
    "fraud.flagged": TrustDeltaRule("fraud.flagged", Decimal("0.00"), "Fraud flagged (marker)", "neutral"),
}


def policy_version() -> str:
    return TRUST_POLICY_VERSION


def infer_delta(event_type: str) -> Optional[Decimal]:
    t = (event_type or "").strip().lower()
    rule = RULES.get(t)
    return rule.delta if rule else None


def infer_delta_str(event_type: str) -> Optional[str]:
    d = infer_delta(event_type)
    if d is None:
        return None
    s = f"{d:+f}"
    # trim trailing zeros
    if "." in s:
        s = s.rstrip("0").rstrip(".")
    return s


def rule_label(event_type: str) -> Optional[str]:
    t = (event_type or "").strip().lower()
    rule = RULES.get(t)
    return rule.label if rule else None


def rule_kind(event_type: str) -> Optional[str]:
    t = (event_type or "").strip().lower()
    rule = RULES.get(t)
    return rule.kind if rule else None
