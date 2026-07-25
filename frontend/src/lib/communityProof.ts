import type { Gsn3DIconKey } from "./gsnIconAssets";

export type CommunityProofTone = "good" | "warn" | "info" | "neutral";

export type CommunityProofItem = {
  key: string;
  label: string;
  value: string;
  detail: string;
  tone: CommunityProofTone;
  icon: Gsn3DIconKey;
};

export type CommunityProofInput = {
  communityName?: unknown;
  holderRole?: unknown;
  identityLabel?: unknown;
  memberWitnessCount?: unknown;
  membershipStrengthLabel?: unknown;
  membershipCurrentnessLabel?: unknown;
  membershipCurrentnessScope?: unknown;
  nextWitnessRenewalStatusLabel?: unknown;
  communityActivityCount?: unknown;
  communityActivityLabel?: unknown;
  communityActivityCategories?: unknown;
  trustSlipStatusLabel?: unknown;
};

export function communityProofText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const text = communityProofText(value);
    if (text) return text;
  }
  return "";
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function hasPositiveCount(value: unknown): boolean {
  return numberValue(value) > 0;
}

function listLabel(value: unknown): string {
  if (!Array.isArray(value)) return "";
  return value.map((item) => communityProofText(item)).filter(Boolean).slice(0, 3).join(", ");
}

export function communityProofTone(value: unknown): CommunityProofTone {
  const text = communityProofText(value).toLowerCase();
  if (
    text.includes("strong") ||
    text.includes("current") ||
    text.includes("active") ||
    text.includes("valid") ||
    text.includes("verified") ||
    text.includes("confirmed")
  ) {
    return "good";
  }

  if (
    text.includes("expired") ||
    text.includes("stale") ||
    text.includes("caution") ||
    text.includes("weak") ||
    text.includes("needs") ||
    text.includes("not started") ||
    text.includes("not shown") ||
    text.includes("missing")
  ) {
    return "warn";
  }

  if (text.includes("pending") || text.includes("building") || text.includes("limited")) {
    return "info";
  }

  return text ? "neutral" : "warn";
}

export function buildCommunityProofItems(input: CommunityProofInput): CommunityProofItem[] {
  const communityName = firstText(input.communityName, "Community not shown");
  const holderRole = firstText(input.holderRole, "Member");
  const identityLabel = firstText(input.identityLabel, "Identity evidence building");
  const witnessCount = numberValue(input.memberWitnessCount);
  const membershipStrength = firstText(
    input.membershipStrengthLabel,
    witnessCount > 0 ? "Witness evidence present" : "No current witness shown"
  );
  const currentnessLabel = firstText(
    input.membershipCurrentnessLabel,
    input.nextWitnessRenewalStatusLabel,
    "Needs current witness"
  );
  const currentnessScope = firstText(
    input.membershipCurrentnessScope,
    "Use this as community-scoped evidence. Ask for fresh confirmation when the decision carries higher risk."
  );
  const activityCount = numberValue(input.communityActivityCount);
  const activityLabel = firstText(
    input.communityActivityLabel,
    activityCount > 0 ? `${activityCount} community activity event${activityCount === 1 ? "" : "s"}` : ""
  );
  const activityCategories = listLabel(input.communityActivityCategories);
  const trustSlipStatus = firstText(input.trustSlipStatusLabel, "TrustSlip status not shown");

  return [
    {
      key: "known-by-community",
      label: "Known by community",
      value: `${holderRole} inside ${communityName}`,
      detail: "This ties the person to the community context shown on this record.",
      tone: communityName === "Community not shown" ? "warn" : "good",
      icon: "community-building",
    },
    {
      key: "identity-context",
      label: "Identity context",
      value: identityLabel,
      detail: "Identity supports the record but does not replace community evidence.",
      tone: communityProofTone(identityLabel),
      icon: "identity-card",
    },
    {
      key: "member-witness",
      label: "Member witness",
      value: membershipStrength,
      detail:
        witnessCount > 0
          ? `${witnessCount} member witness${witnessCount === 1 ? "" : "es"} shown for this community scope.`
          : "No active member witness count is shown yet.",
      tone: hasPositiveCount(input.memberWitnessCount) ? communityProofTone(membershipStrength) : "warn",
      icon: "certificate-seal",
    },
    {
      key: "evidence-currentness",
      label: "Evidence currentness",
      value: currentnessLabel,
      detail: currentnessScope,
      tone: communityProofTone(currentnessLabel),
      icon: "records-folder",
    },
    {
      key: "community-activity",
      label: "Community activity",
      value: activityLabel || "Activity not shown",
      detail: activityCategories
        ? `Visible categories: ${activityCategories}.`
        : "Activity categories are not visible on this record.",
      tone: activityCount > 0 ? "good" : "info",
      icon: "public-globe",
    },
    {
      key: "decision-boundary",
      label: "Decision boundary",
      value: "Evidence for judgement",
      detail: `${trustSlipStatus}. This is not government ID, payment approval, credit approval, or a guarantee of future behaviour.`,
      tone: "info",
      icon: "trust-shield",
    },
  ];
}
