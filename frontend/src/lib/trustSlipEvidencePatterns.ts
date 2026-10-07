import type { GsnIconName } from "../components/GsnLegacyIcon";

export type TrustSlipEvidencePatternTone = "strong" | "building" | "check";

export type TrustSlipEvidencePatternItem = {
  key: string;
  icon: GsnIconName;
  label: string;
  status: string;
  meaning: string;
  tone?: TrustSlipEvidencePatternTone;
};

export type TrustSlipEvidencePatternCategory = {
  key?: string | null;
  label?: string | null;
  status?: string | null;
  evidenceCount?: number | string | null;
  decisionUse?: string | null;
  latestAt?: string | null;
};

export type TrustSlipEvidencePatternStackView = {
  reading: string;
  items: TrustSlipEvidencePatternItem[];
  nextStep: string;
  boundary: string;
};

type TrustSlipEvidencePatternBuildInput = {
  holderName?: string | null;
  validNow?: boolean;
  communityActivityCount?: string | number | null;
  communityActivityCategories?: string[] | string | null;
  communityActivityLabel?: string | null;
  memberWitnessCount?: string | number | null;
  memberWitnessEvidence?: string | null;
  currentnessText?: string | null;
  consistencyStatus?: string | null;
  purposeEvidenceExists?: boolean;
  purposeSignalText?: string | null;
  enterpriseMeaning?: string | null;
  relevantSupportFinding?: string | null;
  followThroughAnswer?: string | null;
  hasSupportOutcomeEvidence?: boolean;
  hasFulfillmentOutcomeEvidence?: boolean;
  hasCompletedWorkEvidence?: boolean;
  decisionEvidenceCategories?: TrustSlipEvidencePatternCategory[] | null;
  nextStep?: string | null;
  boundary?: string | null;
};

function clean(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function positiveCount(value: unknown): boolean {
  const text = clean(value);
  if (!text) return false;
  const numberValue = Number(text);
  if (Number.isFinite(numberValue)) return numberValue > 0;
  return !["0", "none", "not shown", "no", "false"].includes(text.toLowerCase());
}

function countValue(value: unknown): number {
  const parsed = Number(clean(value, "0"));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function categoriesLabel(value: string[] | string | null | undefined): string {
  if (Array.isArray(value)) return value.map((item) => clean(item)).filter(Boolean).join(", ");
  return clean(value);
}

function plural(value: unknown, singular: string, pluralLabel = `${singular}s`): string {
  return `${clean(value, "0")} ${clean(value) === "1" ? singular : pluralLabel}`;
}

function visibleDecisionCategories(
  categories: TrustSlipEvidencePatternCategory[] | null | undefined
): TrustSlipEvidencePatternCategory[] {
  return (Array.isArray(categories) ? categories : []).filter((category) => {
    const status = clean(category.status).toLowerCase();
    const count = countValue(category.evidenceCount);
    return count > 0 || ["available", "current", "visible", "recorded"].some((token) => status.includes(token));
  });
}

function countDecisionCategory(categories: TrustSlipEvidencePatternCategory[], keys: string[]): number {
  const keySet = new Set(keys);
  return categories.reduce((total, category) => {
    if (!keySet.has(clean(category.key))) return total;
    return total + Math.max(1, countValue(category.evidenceCount));
  }, 0);
}

function labelDecisionCategories(categories: TrustSlipEvidencePatternCategory[], keys: string[]): string {
  const keySet = new Set(keys);
  return categories
    .filter((category) => keySet.has(clean(category.key)))
    .map((category) => clean(category.label, clean(category.key)))
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
}

function evidenceStatus(count: number, fallback: string): string {
  if (count <= 0) return fallback;
  return `${count} public-safe evidence ${count === 1 ? "record" : "records"}`;
}

export function buildTrustSlipEvidencePatternStack(
  input: TrustSlipEvidencePatternBuildInput
): TrustSlipEvidencePatternStackView {
  const holder = clean(input.holderName, "This member");
  const activityCount = clean(input.communityActivityCount, "0");
  const baseActivityCategories = categoriesLabel(input.communityActivityCategories);
  const decisionCategories = visibleDecisionCategories(input.decisionEvidenceCategories);
  const decisionCategoryTotal = decisionCategories.reduce(
    (total, category) => total + Math.max(1, countValue(category.evidenceCount)),
    0
  );
  const communityResponseCount = countDecisionCategory(decisionCategories, [
    "community_responsiveness",
    "leadership_governance",
    "relationship_path",
    "identity_membership",
  ]);
  const enterpriseCount = countDecisionCategory(decisionCategories, [
    "business_visibility",
    "demand_activity",
    "business_analysis",
    "service_trade",
  ]);
  const followThroughCount = countDecisionCategory(decisionCategories, [
    "focus_commitment",
    "finance_repayment",
    "guarantor_support",
    "bank_payment",
  ]);
  const communityResponseLabels = labelDecisionCategories(decisionCategories, [
    "community_responsiveness",
    "leadership_governance",
    "relationship_path",
    "identity_membership",
  ]);
  const enterpriseLabels = labelDecisionCategories(decisionCategories, [
    "business_visibility",
    "demand_activity",
    "business_analysis",
    "service_trade",
  ]);
  const followThroughLabels = labelDecisionCategories(decisionCategories, [
    "focus_commitment",
    "finance_repayment",
    "guarantor_support",
    "bank_payment",
  ]);
  const activityCategories = enterpriseLabels || communityResponseLabels || baseActivityCategories;
  const hasCommunityActivity = positiveCount(input.communityActivityCount) || decisionCategoryTotal > 0;
  const hasWitnessEvidence = positiveCount(input.memberWitnessCount) || /visible|current|witness|sponsor/i.test(clean(input.memberWitnessEvidence));
  const purposeEvidenceExists = Boolean(input.purposeEvidenceExists) || decisionCategoryTotal > 0;
  const hasOutcomeEvidence = Boolean(
    input.hasSupportOutcomeEvidence || input.hasFulfillmentOutcomeEvidence || input.hasCompletedWorkEvidence || followThroughCount > 0
  );
  const followThroughAnswer = clean(input.followThroughAnswer || input.relevantSupportFinding);
  const followThroughLooksThin =
    !followThroughAnswer ||
    /not enough|not yet|does not yet|limited|ask for|missing|needs confirmation|no .*visible/i.test(followThroughAnswer);
  const currentness = clean(input.currentnessText, "Evidence currentness still building");
  const consistency = clean(input.consistencyStatus, "Evidence posture still building");
  const enterpriseStatus = enterpriseCount > 0
    ? evidenceStatus(enterpriseCount, "Enterprise evidence visible")
    : clean(input.purposeSignalText, clean(input.communityActivityLabel, hasCommunityActivity ? "Public activity context" : "Still building"));
  const reading = input.validNow === false
    ? "This TrustSlip needs refresh before the reader treats the pattern as current evidence."
    : purposeEvidenceExists || hasCommunityActivity || hasWitnessEvidence
      ? `${holder} has visible GSN pattern evidence. Read the repeated activity as context, then match it to the decision risk.`
      : `${holder} has a TrustSlip record, but visible pattern evidence is still building.`;

  return {
    reading,
    items: [
      {
        key: "routine",
        icon: "calendar",
        label: "Routine",
        status: decisionCategoryTotal > 0 ? evidenceStatus(decisionCategoryTotal, "Evidence visible") : hasCommunityActivity ? plural(activityCount, "activity event") : "Still building",
        meaning: hasCommunityActivity
          ? `Repeated activity is visible${activityCategories ? ` across ${activityCategories}` : ""}.`
          : "This public paper does not yet show repeated community activity.",
        tone: hasCommunityActivity ? "strong" : "check",
      },
      {
        key: "discipline",
        icon: "shield",
        label: "Discipline",
        status: currentness,
        meaning: "Currentness and witness renewal tell the reader whether the record is fresh enough to use.",
        tone: /current|active|valid/i.test(currentness) ? "strong" : "building",
      },
      {
        key: "consistency",
        icon: "chart",
        label: "Consistency",
        status: consistency,
        meaning: "Evidence posture is a pattern signal across available records, not a character score.",
        tone: /strong|good|valid|active/i.test(consistency) ? "strong" : "building",
      },
      {
        key: "community-response",
        icon: "community",
        label: "Community response",
        status: communityResponseCount > 0 ? evidenceStatus(communityResponseCount, "Community evidence visible") : hasWitnessEvidence ? clean(input.memberWitnessEvidence, "Witness evidence visible") : "Witness evidence thin",
        meaning: communityResponseCount > 0
          ? `Public-safe community response evidence is visible${communityResponseLabels ? ` across ${communityResponseLabels}` : ""}.`
          : hasWitnessEvidence
            ? "A visible witness or sponsor path exists without exposing private witness names."
            : "Ask for member witnesses or live community confirmation if the decision depends on people knowing the holder.",
        tone: communityResponseCount > 0 || hasWitnessEvidence ? "strong" : "check",
      },
      {
        key: "enterprise-effort",
        icon: "marketplace",
        label: "Enterprise effort",
        status: enterpriseStatus,
        meaning: enterpriseCount > 0
          ? `Public-safe enterprise effort is visible${enterpriseLabels ? ` across ${enterpriseLabels}` : ""}. This is effort evidence, not proof of success.`
          : clean(
              input.enterpriseMeaning,
              "Shop, market, DemandBox, Spotlight, Market Wisdom, or purpose-specific public-safe evidence should be read as effort evidence where recorded."
            ),
        tone: purposeEvidenceExists || hasCommunityActivity ? "building" : "check",
      },
      {
        key: "follow-through",
        icon: "repaymentSchedule",
        label: "Follow-through",
        status: hasOutcomeEvidence ? evidenceStatus(followThroughCount, "Outcome evidence visible") : followThroughLooksThin ? "Needs confirmation" : "Some follow-through visible",
        meaning: followThroughCount > 0
          ? `Follow-through evidence is visible${followThroughLabels ? ` across ${followThroughLabels}` : ""}. Ask for private/live confirmation before high-risk reliance.`
          : followThroughAnswer || "Ask for repayment, fulfilled work, support, or commitment records before higher-risk decisions.",
        tone: hasOutcomeEvidence || !followThroughLooksThin ? "strong" : "check",
      },
    ],
    nextStep: clean(
      input.nextStep,
      "Use this as a public evidence picture. For money, housing, referral, work, or guarantor risk, ask for live community confirmation or the fuller Trust Passport."
    ),
    boundary: clean(
      input.boundary,
      "GSN records what happened inside GSN and gives a public-safe reading. The receiver still decides; this is not a guarantee, approval, credit decision, legal identity, or prediction of future behaviour."
    ),
  };
}
