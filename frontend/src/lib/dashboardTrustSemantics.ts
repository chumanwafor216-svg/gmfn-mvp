export type DashboardTrustEvidenceState =
  | "unknown"
  | "insufficient"
  | "starter_building"
  | "adverse";

type TrustEvidenceSemanticInput = {
  rawClass: unknown;
  trustExplanation: any;
};

const INFORMATIONAL_NOTIFICATION_KINDS = new Set([
  "marketplace.shop.broadcast_created",
  "marketplace.shop.product_created",
  "demand_posted",
  // The live join-request collection is the source of truth for whether an
  // approval is still pending. The notification remains as history after a
  // decision and must not keep the Attention Guide active by itself.
  "approval_request",
]);

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function positiveNumber(...values: unknown[]): boolean {
  return values.some((value) => (numberOrNull(value) || 0) > 0);
}

function hasPositiveFlag(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  return Object.values(value as Record<string, unknown>).some(
    (item) => item === true
  );
}

export function classifyDashboardTrustEvidence(
  input: TrustEvidenceSemanticInput
): DashboardTrustEvidenceState {
  const rawClass = String(input.rawClass || "").trim().toUpperCase();
  if (rawClass !== "D") return "unknown";

  const explanation = input.trustExplanation || {};
  const computed = explanation.computed || explanation.trust || {};
  const counts = computed.counts || explanation.counts || {};
  const penalties = computed.penalties || explanation.penalties || {};
  const gains = computed.gains || explanation.gains || {};
  const starterEvidence =
    computed.starter_evidence_summary ||
    computed.starter_proof_summary ||
    explanation.starter_evidence_summary ||
    explanation.starter_proof_summary ||
    {};

  const hasSemanticBreakdown = Boolean(
    Object.keys(counts).length ||
      Object.keys(penalties).length ||
      Object.keys(gains).length ||
      Object.keys(starterEvidence).length
  );
  if (!hasSemanticBreakdown) return "unknown";

  const hasAdverseEvidence = positiveNumber(
    penalties.total,
    penalties.missed,
    penalties.default,
    penalties.fraud,
    penalties.community_confirmation_review,
    counts.missed_payments,
    counts.defaults,
    counts.fraud_flags,
    counts.community_confirmation_review_negative,
    counts.community_confirmation_review_caution,
    counts.identity_photo_rejected_active,
    counts.identity_photo_needs_more_active
  );
  if (hasAdverseEvidence) return "adverse";

  const hasStarterEvidence =
    hasPositiveFlag(starterEvidence) ||
    positiveNumber(
      gains.total,
      gains.identity_phone,
      gains.identity_bank,
      gains.identity_official_id,
      gains.identity_photo,
      gains.identity_region
    );

  return hasStarterEvidence ? "starter_building" : "insufficient";
}

export function isInformationalDashboardNotification(kind: unknown): boolean {
  return INFORMATIONAL_NOTIFICATION_KINDS.has(
    String(kind || "").trim().toLowerCase()
  );
}

export function dashboardNotificationRequiresAttention(
  notification: {
    kind?: unknown;
    attention_actionable?: unknown;
  },
  bucket: "actNow" | "dueSoon" | "watch"
): boolean {
  if (typeof notification.attention_actionable === "boolean") {
    return notification.attention_actionable;
  }
  if (isInformationalDashboardNotification(notification.kind)) return false;
  return bucket === "actNow";
}
