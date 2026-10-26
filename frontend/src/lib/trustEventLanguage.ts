const TRUST_EVENT_LABELS: Record<string, string> = {
  "repayment.made": "Repayment recorded",
  "repayment.created": "Payment confirmed",
  repayment_created: "Payment confirmed",
  "repayment.auto_applied": "Confirmed payment applied to support",
  "repayment.claimed": "Payment reported by member",
  repayment_claimed: "Payment reported by member",
  "repayment.claim": "Payment reported by member",
  "repayment.schedule.created": "Repayment plan recorded",
  repayment_schedule_created: "Repayment plan recorded",
  "repayment.reversed": "Repayment record reversed",
  repayment_reversed: "Repayment record reversed",
  loan_fully_repaid: "Full repayment recorded",
  "loan.repaid": "Full repayment recorded",
  loan_repaid: "Full repayment recorded",
  full_repayment: "Full repayment recorded",
  loan_fully_repaid_reversed: "Full repayment status reversed",
  guarantor_success: "Support outcome recorded",
  guarantor_repayment_success: "Support repayment outcome recorded",
  guarantor_supported_repaid: "Supported repayment recorded",
  guarantor_success_reversed: "Support outcome reversed",
  missed_payment: "Missed payment recorded",
  repayment_missed: "Missed payment recorded",
  late_payment: "Late payment recorded",
  overdue: "Overdue payment recorded",
  default: "Support default recorded",
  loan_defaulted: "Support default recorded",
  "loan.defaulted": "Support default recorded",
  fraud_flag: "Fraud or abuse caution recorded",
  "identity.phone_verified": "Verified phone recorded",
  "identity.bank_destination_recorded": "Bank destination recorded",
  "identity.drivers_licence_recorded": "Driver's licence recorded",
  "identity.official_id_recorded": "Official ID recorded",
  "identity.photo_evidence_recorded": "Photo evidence recorded",
  "identity.photo_evidence_verified": "Photo evidence verified",
  "identity.photo_evidence_verified_reversed": "Photo verification reversed",
  "identity.photo_evidence_rejected": "Photo evidence not accepted",
  "identity.photo_evidence_needs_more": "More photo evidence needed",
  "identity.photo_evidence_review_corrected": "Photo evidence review corrected",
  "identity.region_consistent": "Region consistency confirmed",
  "identity.region_mismatch_explained": "Cross-region explanation recorded",
  "identity.bank_verification_checked": "Bank verification checked",
  "identity.drivers_licence_verification_checked":
    "Driver's licence verification checked",
  "community_confirmation.review_case_resolved":
    "Community confirmation review resolved",
};

const TRUST_RISK_FLAG_LABELS: Record<string, string> = {
  default_history: "Default history recorded",
  recent_default_pressure: "Recent default pressure recorded",
  repayment_delay_detected: "Repayment delay recorded",
  no_verified_repayment_history: "No verified repayment history",
  guarantee_without_repayment_confirmation:
    "Support exists without confirmed repayment",
  high_trust_volatility: "Trust evidence changed sharply",
  low_network_breadth: "Limited network evidence",
  low_network_diversity: "Limited network diversity",
  thin_network: "Limited network evidence",
  single_clan_concentration: "Evidence concentrated in one community",
  no_recorded_sponsor: "No recorded supporter",
  low_sponsor_support: "Limited supporter evidence",
  graph_isolated: "No connected community evidence",
};

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function replaceSupportTerms(value: string): string {
  return value
    .replace(/Guarantors/g, "Supporters")
    .replace(/guarantors/g, "supporters")
    .replace(/Guarantor/g, "Supporter")
    .replace(/guarantor/g, "supporter");
}

export function trustEventLabel(
  eventType: unknown,
  fallback = "Evidence event"
): string {
  const raw = safeText(eventType);
  if (!raw) return fallback;

  const known = TRUST_EVENT_LABELS[raw.toLowerCase()];
  if (known) return known;

  return replaceSupportTerms(raw)
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^\w/, (char) => char.toUpperCase());
}

export function trustEvidenceText(value: unknown, fallback = ""): string {
  const raw = safeText(value);
  if (!raw) return fallback;

  const known = TRUST_EVENT_LABELS[raw.toLowerCase()];
  if (known) return known;

  if (/^[a-z0-9]+(?:[._-][a-z0-9]+)+$/i.test(raw)) {
    return trustEventLabel(raw, fallback);
  }

  return replaceSupportTerms(raw);
}

export function trustRiskFlagLabel(value: unknown): string {
  const raw = safeText(value);
  if (!raw) return "Trust caution recorded";

  return (
    TRUST_RISK_FLAG_LABELS[raw.toLowerCase()] ||
    trustEventLabel(raw, "Trust caution recorded")
  );
}
