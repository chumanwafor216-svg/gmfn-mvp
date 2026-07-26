export type DecisionPackKey =
  | "community_standing"
  | "referral_decision"
  | "guarantor_decision"
  | "employment_decision"
  | "housing_decision"
  | "trade_check"
  | "supplier_decision"
  | "volunteer_decision"
  | "business_partnership"
  | "community_membership";

export type DecisionPackDefinition = {
  key: DecisionPackKey;
  label: string;
  shortLabel: string;
  recipientQuestion: string;
  focus: string;
};

export const GSN_DECISION_PACKS: readonly DecisionPackDefinition[] = [
  {
    key: "community_standing",
    label: "Community Standing Decision Pack",
    shortLabel: "Standing",
    recipientQuestion: "How is this person known where people actually know them?",
    focus: "Community role, activity history, witness currentness, and unresolved public cautions.",
  },
  {
    key: "referral_decision",
    label: "Referral Decision Pack",
    shortLabel: "Referral",
    recipientQuestion: "Can this person be referred without damaging my credibility?",
    focus:
      "Who knows the person, how they are placed in community, and whether live confirmation is needed before referral.",
  },
  {
    key: "guarantor_decision",
    label: "Guarantor or Support Decision Pack",
    shortLabel: "Guarantor",
    recipientQuestion: "Is there enough evidence to stand for or support this person?",
    focus:
      "Responsibility signals, reliability evidence, support boundary, and community confirmation before accepting risk.",
  },
  {
    key: "employment_decision",
    label: "Employment Decision Pack",
    shortLabel: "Employment",
    recipientQuestion: "Is there enough evidence to continue an employment conversation?",
    focus: "Role, consistency, contribution, leadership or service signals, and the next verification step.",
  },
  {
    key: "housing_decision",
    label: "Housing Decision Pack",
    shortLabel: "Housing",
    recipientQuestion: "Is there enough community evidence to continue a housing decision?",
    focus:
      "Community standing, reliability posture, witness currentness, and the need for live confirmation before tenancy risk.",
  },
  {
    key: "trade_check",
    label: "Trade or Skilled Work Decision Pack",
    shortLabel: "Trade",
    recipientQuestion: "Who has seen this person trade, serve, or complete work?",
    focus: "Observed service activity, community evidence, visible disputes or cautions, and confirmation before work begins.",
  },
  {
    key: "supplier_decision",
    label: "Supplier Decision Pack",
    shortLabel: "Supplier",
    recipientQuestion: "Is there enough evidence to continue a supplier or contractor decision?",
    focus:
      "Business reliability posture, fulfilment evidence where visible, community standing, and public verification status.",
  },
  {
    key: "volunteer_decision",
    label: "Volunteer Decision Pack",
    shortLabel: "Volunteer",
    recipientQuestion: "Is there enough evidence to accept this person into a volunteer role?",
    focus: "Participation, consistency, service posture, witness currentness, and safeguarding caution before placement.",
  },
  {
    key: "business_partnership",
    label: "Business Partnership Decision Pack",
    shortLabel: "Partner",
    recipientQuestion: "Is there enough evidence to continue a business partnership discussion?",
    focus:
      "Community reliability, responsibility signals, public verification status, and caution before shared commercial risk.",
  },
  {
    key: "community_membership",
    label: "Community Membership Decision Pack",
    shortLabel: "Membership",
    recipientQuestion: "Is there enough evidence to admit or connect this person to a community?",
    focus: "Identity context, community route, witness currentness, standing, and first live confirmation step.",
  },
];

export const DEFAULT_DECISION_PACK = GSN_DECISION_PACKS[0];

function cleanDecisionPackText(value: unknown): string {
  return String(value ?? "").trim();
}

function decisionPackComparable(value: unknown): string {
  return cleanDecisionPackText(value).toLowerCase().replace(/\s+/g, " ");
}

export function findDecisionPack(value: unknown): DecisionPackDefinition | null {
  const text = cleanDecisionPackText(value);
  if (!text) return null;
  const comparable = decisionPackComparable(text);
  return (
    GSN_DECISION_PACKS.find(
      (pack) =>
        pack.key === text ||
        decisionPackComparable(pack.label) === comparable ||
        decisionPackComparable(pack.shortLabel) === comparable
    ) || null
  );
}

export type DecisionPackPublicContext = {
  key: string;
  label: string;
  recipientQuestion: string;
  focus: string;
  scope: string;
};

export function normalizeDecisionPackPublicContext(input: {
  key?: unknown;
  label?: unknown;
  recipientQuestion?: unknown;
  focus?: unknown;
  scope?: unknown;
}): DecisionPackPublicContext {
  const pack = findDecisionPack(input.key) || findDecisionPack(input.label);
  const fallbackLabel = cleanDecisionPackText(input.label) || "General Decision Pack";
  return {
    key: pack?.key || cleanDecisionPackText(input.key),
    label: pack?.label || fallbackLabel,
    recipientQuestion:
      pack?.recipientQuestion ||
      cleanDecisionPackText(input.recipientQuestion) ||
      "Can I make a better decision with this evidence?",
    focus:
      pack?.focus ||
      cleanDecisionPackText(input.focus) ||
      "Current public identity, community standing, evidence currentness, and the next verification step.",
    scope: cleanDecisionPackText(input.scope) || "public_decision_pack",
  };
}
