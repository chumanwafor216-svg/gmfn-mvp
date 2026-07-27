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

export type DecisionPackSource = {
  label: string;
  route: string;
  evidence: string;
};

export type DecisionPackConfirmationMechanics = {
  responders: string;
  countsAs: string;
  escalation: string;
};

export type DecisionPackConfirmationInput = {
  confirmationReasonType?: string | null;
};

export type DecisionPackDefinition = {
  key: DecisionPackKey;
  label: string;
  shortLabel: string;
  recipientQuestion: string;
  focus: string;
  expectedEvidence: readonly string[];
  gsnSources: readonly DecisionPackSource[];
  missingLinks: readonly string[];
  refusesToClaim: readonly string[];
  confirmationReasonType: string;
  confirmationQuestion: string;
};

export const GSN_DECISION_PACKS: readonly DecisionPackDefinition[] = [
  {
    key: "community_standing",
    label: "Community Standing Decision Pack",
    shortLabel: "Standing",
    recipientQuestion: "How is this person known where people actually know them?",
    focus: "Community role, activity history, witness currentness, and unresolved public cautions.",
    expectedEvidence: [
      "Active community membership and role",
      "Member witness or sponsor confirmation",
      "Participation, contribution, responsibility, support, leadership, or recognition TrustEvents",
      "Community confirmation path for live questions",
    ],
    gsnSources: [
      { label: "Community Home", route: "/app/community", evidence: "member communities, role, owner context" },
      { label: "Marketplace", route: "/app/marketplace", evidence: "local member standing inside one community" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "live or relayed witness response" },
      { label: "TrustEvents", route: "/app/trust-events", evidence: "recorded community activity categories" },
    ],
    missingLinks: [
      "Structured reason-specific witness questions",
      "Clear issue-resolution summary tied to the member",
    ],
    refusesToClaim: ["Moral character", "Government identity", "Future behaviour"],
    confirmationReasonType: "community_standing_check",
    confirmationQuestion: "Can current community witnesses confirm how this person is known in this community?",
  },
  {
    key: "referral_decision",
    label: "Referral Decision Pack",
    shortLabel: "Referral",
    recipientQuestion: "Can this person be referred without damaging my credibility?",
    focus:
      "Who knows the person, how they are placed in community, and whether live confirmation is needed before referral.",
    expectedEvidence: [
      "Relationship route: inviter, sponsor, or known community path",
      "Current witness strength and renewal status",
      "Relevant activity categories behind the referral",
      "Any visible cautions before passing the name on",
    ],
    gsnSources: [
      { label: "Invite / Join records", route: "/app/community", evidence: "how the person came through a known relationship" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "recipient asks the community before relying" },
      { label: "TrustSlip", route: "/app/trust-slip", evidence: "scoped public referral paper" },
    ],
    missingLinks: [
      "Referral outcome record: did the referral succeed, fail, or create a complaint?",
      "Referrer confidence statement tied to a specific purpose",
    ],
    refusesToClaim: ["Automatic suitability", "Guarantee by the referrer", "Recipient duty removed"],
    confirmationReasonType: "referral_check",
    confirmationQuestion: "Can current community witnesses confirm enough relationship evidence for this referral?",
  },
  {
    key: "guarantor_decision",
    label: "Guarantor or Support Decision Pack",
    shortLabel: "Guarantor",
    recipientQuestion: "Is there enough evidence to stand for or support this person?",
    focus:
      "Responsibility signals, reliability evidence, support boundary, and community confirmation before accepting risk.",
    expectedEvidence: [
      "Repayment history and missed/complete repayment outcomes",
      "Existing support exposure and locked guarantee coverage",
      "People who stood for the person and what happened",
      "Contribution discipline and community responsibility records",
    ],
    gsnSources: [
      { label: "Loans & Support", route: "/app/loans", evidence: "request reason, amount, guarantors, support status" },
      { label: "Repayment", route: "/app/repayment", evidence: "repayment milestones and completion" },
      { label: "Guarantor Inbox", route: "/app/guarantor-inbox", evidence: "pending and accepted support obligations" },
      { label: "Finance", route: "/app/finance", evidence: "contribution, money-in/out, and readiness signals" },
    ],
    missingLinks: [
      "Mature guarantor risk summary in Trust Passport",
      "Detailed guarantee outcome history and weighting rules beyond aggregate pointers",
    ],
    refusesToClaim: ["Loan approval", "Bank guarantee", "Automatic repayment", "Money custody"],
    confirmationReasonType: "guarantor_support_check",
    confirmationQuestion: "Can current community witnesses confirm responsibility evidence before anyone stands for this person?",
  },
  {
    key: "employment_decision",
    label: "Employment Decision Pack",
    shortLabel: "Employment",
    recipientQuestion: "Is there enough evidence to continue an employment conversation?",
    focus: "Role, consistency, contribution, leadership or service signals, and the next verification step.",
    expectedEvidence: [
      "Declared work role or skill from onboarding, profile, shop, or community record",
      "Work, service, contribution, responsibility, learning, or recognition TrustEvents",
      "Employer/customer/community witness tied to the role being considered",
      "Demand or service response history where the role involved practical work",
    ],
    gsnSources: [
      { label: "Trust Passport", route: "/app/trust", evidence: "full signed-in work and evidence story" },
      { label: "Shop / Service profile", route: "/app/shop/me", evidence: "declared services, categories, media, public shop face" },
      { label: "Demand Box", route: "/app/demand-box", evidence: "requests answered, quotes, demand response trail" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "ask who has seen this work before" },
    ],
    missingLinks: [
      "Structured skill claim field connected to Trust Passport",
      "Completed work record with customer confirmation",
      "Role-specific witness question: has this person done this work before?",
    ],
    refusesToClaim: ["Professional licence", "Right to work", "Future performance", "Employer decision"],
    confirmationReasonType: "employment_role_check",
    confirmationQuestion: "Can current community witnesses confirm this person is known for the work or role being checked?",
  },
  {
    key: "housing_decision",
    label: "Housing Decision Pack",
    shortLabel: "Housing",
    recipientQuestion: "Is there enough community evidence to continue a housing decision?",
    focus:
      "Payment discipline, repayment evidence, issue-resolution behaviour, community witness, and live confirmation before tenancy risk.",
    expectedEvidence: [
      "Contribution, dues, ROSCA, rent-like, or recurring payment completion where recorded",
      "Repayment history and support follow-through",
      "Community witness that the person is responsible and reachable",
      "Dispute or issue-resolution evidence, including absence of unresolved visible cautions",
    ],
    gsnSources: [
      { label: "Finance", route: "/app/finance", evidence: "money summary, contribution discipline, records/events" },
      { label: "ROSCA / Money Pool", route: "/app/marketplace", evidence: "local contribution schedules and completion" },
      { label: "Loans / Repayment", route: "/app/loans", evidence: "borrower follow-through and repayment behaviour" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "landlord can ask a community witness before tenancy risk" },
    ],
    missingLinks: [
      "Housing-specific reference questions",
      "Previous landlord or accommodation witness route",
      "Issue-resolution summary visible without exposing private disputes",
    ],
    refusesToClaim: ["Credit approval", "Right to rent", "Legal tenancy check", "Guaranteed rent"],
    confirmationReasonType: "housing_reference_check",
    confirmationQuestion: "Can current community witnesses confirm responsible conduct, payment discipline, or issue resolution relevant to housing?",
  },
  {
    key: "trade_check",
    label: "Trade or Skilled Work Decision Pack",
    shortLabel: "Trade",
    recipientQuestion: "Who has seen this person trade, serve, or complete work?",
    focus: "Observed service activity, community evidence, visible disputes or cautions, and confirmation before work begins.",
    expectedEvidence: [
      "Declared trade/service category such as plumbing, repairs, cleaning, delivery, or sales",
      "Shop, advert, Demand Box, quote, or work-response trail",
      "Customer or community witness that the work happened",
      "Completion, complaint, or issue-resolution outcome where recorded",
    ],
    gsnSources: [
      { label: "Shop Gallery", route: "/app/shop/me", evidence: "public service profile, media, categories, shop identity" },
      { label: "Demand Box", route: "/app/demand-box", evidence: "requests, responses, quotes, service need trail" },
      { label: "Marketplace", route: "/app/marketplace", evidence: "community where the advert/work relationship began" },
      { label: "Merchant Verification", route: "/app/trust-slip", evidence: "community recognition and trade boundary" },
    ],
    missingLinks: [
      "Customer-confirmed completed-job record",
      "Work photos tied to a confirmed job, not only uploaded media",
      "Direct ask-community question: is this person known for this trade?",
    ],
    refusesToClaim: ["Trade licence", "Insurance", "Home safety guarantee", "Future work quality"],
    confirmationReasonType: "trade_skill_check",
    confirmationQuestion: "Can current community witnesses confirm this person is known for this trade or service?",
  },
  {
    key: "supplier_decision",
    label: "Supplier Decision Pack",
    shortLabel: "Supplier",
    recipientQuestion: "Is there enough evidence to continue a supplier or contractor decision?",
    focus:
      "Business reliability posture, fulfilment evidence where visible, community standing, and public verification status.",
    expectedEvidence: [
      "Shop and supplier profile identity",
      "Fulfilment, delivery, release, or protected trade records where available",
      "Customer/community recognition and merchant verification",
      "Visible dispute, delay, or correction outcome",
    ],
    gsnSources: [
      { label: "Marketplace", route: "/app/marketplace", evidence: "community trade context and shop exposure" },
      { label: "Merchant Release", route: "/merchant-release", evidence: "release evidence and delivery boundary" },
      { label: "Vault", route: "/app/vault", evidence: "controlled private catalogue or quote access" },
      { label: "TrustSlip Verify", route: "/trust-slips/verify", evidence: "public supplier check before relying" },
    ],
    missingLinks: [
      "Supplier fulfilment TrustEvent standard across product lifecycle",
      "Delivery/correction outcome joined to supplier Trust Passport",
    ],
    refusesToClaim: ["Delivery guarantee", "Payment release authority", "Escrow", "Automatic supplier approval"],
    confirmationReasonType: "supplier_reliability_check",
    confirmationQuestion: "Can current community witnesses confirm supplier reliability or completed trade outcomes?",
  },
  {
    key: "volunteer_decision",
    label: "Volunteer Decision Pack",
    shortLabel: "Volunteer",
    recipientQuestion: "Is there enough evidence to accept this person into a volunteer role?",
    focus: "Participation, consistency, service posture, witness currentness, and safeguarding caution before placement.",
    expectedEvidence: [
      "Participation and contribution records",
      "Responsibility or leadership carried before",
      "Community witness and sponsor currentness",
      "Safeguarding or placement-specific confirmation where the role is sensitive",
    ],
    gsnSources: [
      { label: "TrustEvents", route: "/app/trust-events", evidence: "participation, support, responsibility, leadership" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "ask current community responders before placement" },
      { label: "Community Domain outcomes", route: "/app/community-domain", evidence: "beneficiary/outcome evidence where domains record it" },
    ],
    missingLinks: [
      "Safeguarding-specific community confirmation questions",
      "Volunteer outcome records connected to TrustEvents",
    ],
    refusesToClaim: ["Background check", "Safeguarding clearance", "Legal eligibility", "Future conduct"],
    confirmationReasonType: "volunteer_role_check",
    confirmationQuestion: "Can current community witnesses confirm this person is known for responsible participation or service?",
  },
  {
    key: "business_partnership",
    label: "Business Partnership Decision Pack",
    shortLabel: "Partner",
    recipientQuestion: "Is there enough evidence to continue a business partnership discussion?",
    focus:
      "Community reliability, responsibility signals, public verification status, and caution before shared commercial risk.",
    expectedEvidence: [
      "Shop, marketplace, and merchant recognition",
      "Finance discipline and repayment/support follow-through",
      "Supplier/trade outcomes and dispute resolution",
      "Community witness from the domain where the person operates",
    ],
    gsnSources: [
      { label: "Shop / Marketplace", route: "/app/marketplace", evidence: "commerce identity and community exposure" },
      { label: "Finance", route: "/app/finance", evidence: "financial cooperation evidence, not bank approval" },
      { label: "Trust Passport", route: "/app/trust", evidence: "cross-community evidence posture" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "live confirmation before shared risk" },
    ],
    missingLinks: [
      "Partnership outcome/correction records",
      "Shared commercial risk checklist tied to evidence categories",
    ],
    refusesToClaim: ["Company due diligence", "Legal authority", "Investment advice", "Guaranteed profit"],
    confirmationReasonType: "partnership_check",
    confirmationQuestion: "Can current community witnesses confirm reliability before shared business risk is taken?",
  },
  {
    key: "community_membership",
    label: "Community Membership Decision Pack",
    shortLabel: "Membership",
    recipientQuestion: "Is there enough evidence to admit or connect this person to a community?",
    focus: "Identity context, community route, witness currentness, standing, and first live confirmation step.",
    expectedEvidence: [
      "Entry route: invite, join request, sponsor, or domain approval",
      "Identity evidence recorded vs verified",
      "Existing community roles and witness strength",
      "Participation or contribution readiness for the new community",
    ],
    gsnSources: [
      { label: "Join / Invite", route: "/join", evidence: "entry route and sponsor relationship" },
      { label: "Identity Integrity", route: "/app/identity", evidence: "recorded identity evidence and verification status" },
      { label: "Community Home", route: "/app/community", evidence: "existing communities and roles" },
      { label: "Community Confirmation", route: "/community-confirmations", evidence: "current responders can confirm known relationship" },
    ],
    missingLinks: [
      "Admission-purpose confirmation questions",
      "Clear join outcome linked back into Trust Passport evidence",
    ],
    refusesToClaim: ["Citizenship", "Legal immigration status", "Automatic admission", "Universal community endorsement"],
    confirmationReasonType: "membership_admission_check",
    confirmationQuestion: "Can current community witnesses confirm the relationship route before admission or connection?",
  },
];

export const DEFAULT_DECISION_PACK = GSN_DECISION_PACKS[0];

function cleanDecisionPackText(value: unknown): string {
  return String(value ?? "").trim();
}

function decisionPackComparable(value: unknown): string {
  return cleanDecisionPackText(value).toLowerCase().replace(/\s+/g, " ");
}

function compactList(values: readonly string[], limit: number): string {
  const items = values.map((value) => cleanDecisionPackText(value)).filter(Boolean);
  if (!items.length) return "Not mapped yet";
  const visible = items.slice(0, limit);
  const suffix = items.length > visible.length ? ` +${items.length - visible.length} more` : "";
  return `${visible.join("; ")}${suffix}`;
}

export function compactDecisionPackEvidence(pack: DecisionPackDefinition, limit = 3): string {
  return compactList(pack.expectedEvidence, limit);
}

export function compactDecisionPackSources(pack: DecisionPackDefinition, limit = 3): string {
  const sources = pack.gsnSources.map((source) => `${source.label}: ${source.evidence}`);
  return compactList(sources, limit);
}

export function compactDecisionPackMissingLinks(pack: DecisionPackDefinition, limit = 2): string {
  return compactList(pack.missingLinks, limit);
}

export function compactDecisionPackBoundaries(pack: DecisionPackDefinition, limit = 3): string {
  return compactList(pack.refusesToClaim, limit);
}

export function compactDecisionPackConfirmation(pack: DecisionPackDefinition): string {
  return cleanDecisionPackText(pack.confirmationQuestion) || "Ask current community witnesses the purpose-specific question before relying.";
}

export function decisionPackConfirmationMechanics(
  pack: DecisionPackDefinition | DecisionPackPublicContext | DecisionPackConfirmationInput | null | undefined
): DecisionPackConfirmationMechanics {
  const reason = cleanDecisionPackText(pack?.confirmationReasonType).toLowerCase();
  if (reason === "employment_role_check") {
    return {
      responders: "Community responders, customers, sponsors, or leaders who have seen the role or work context.",
      countsAs: "Witness evidence that the person is known for the role; not right-to-work, licence, or future performance proof.",
      escalation: "If answers are thin or disputed, ask for completed-work, employer, or customer evidence before relying.",
    };
  }
  if (reason === "housing_reference_check") {
    return {
      responders: "Current community responders who can speak to participation, promise-keeping, issue handling, and community conduct.",
      countsAs: "Society-equivalent conduct evidence for inference; not tenancy approval, affordability, right-to-rent, or landlord proof.",
      escalation: "If more is needed, the holder may separately share an external landlord or agent contact with consent.",
    };
  }
  if (reason === "trade_skill_check") {
    return {
      responders: "Community responders, customers, marketplace contacts, or leaders who have seen the trade or service.",
      countsAs: "Witness evidence that the person is known for the trade; not licence, insurance, or home-safety guarantee.",
      escalation: "If answers are thin, ask for customer-confirmed completed work or issue-resolution evidence.",
    };
  }
  if (reason === "guarantor_support_check") {
    return {
      responders: "Community responders, sponsors, guarantors, or leaders who know responsibility and support behaviour.",
      countsAs: "Responsibility and follow-through witness evidence; not loan approval, bank guarantee, or automatic repayment proof.",
      escalation: "If support risk remains unclear, reduce exposure or ask for repayment and guarantee-outcome evidence.",
    };
  }
  if (reason === "supplier_reliability_check" || reason === "partnership_check") {
    return {
      responders: "Community/domain responders, customers, suppliers, or leaders connected to the operating context.",
      countsAs: "Reliability and fulfilment witness evidence; not due diligence, escrow, delivery guarantee, or profit assurance.",
      escalation: "If there is concern, ask for protected-trade outcomes, correction history, and review evidence.",
    };
  }
  if (reason === "volunteer_role_check" || reason === "membership_admission_check") {
    return {
      responders: "Sponsors, current witnesses, community admins, or delegated leaders who know the relationship route.",
      countsAs: "Participation, responsibility, and relationship evidence; not safeguarding clearance, legal eligibility, or automatic admission.",
      escalation: "If the role is sensitive or the relationship is unclear, use deeper review before admitting or placing the person.",
    };
  }
  if (reason === "referral_check") {
    return {
      responders: "Sponsors, inviters, current witnesses, or community leaders who know the relationship route.",
      countsAs: "Relationship evidence for referral judgement; not a guarantee or removal of recipient responsibility.",
      escalation: "If the relationship is weak, ask for a stronger witness or choose not to refer yet.",
    };
  }
  return {
    responders: "Community admins, sponsors, nominated contacts, or current member witnesses allowed by the community policy.",
    countsAs: "Aggregate community witness evidence about what the community genuinely knows.",
    escalation: "Caution, dispute, or unable-to-confirm answers go to review or further evidence, not automatic judgement.",
  };
}

export function findDecisionPack(value: unknown): DecisionPackDefinition | null {
  const text = cleanDecisionPackText(value);
  if (!text) return null;
  const comparable = decisionPackComparable(text);
  return (
    GSN_DECISION_PACKS.find(
      (pack) =>
        decisionPackComparable(pack.key) === comparable ||
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
  expectedEvidence: readonly string[];
  gsnSources: readonly DecisionPackSource[];
  missingLinks: readonly string[];
  refusesToClaim: readonly string[];
  confirmationReasonType: string;
  confirmationQuestion: string;
  confirmationMechanics: DecisionPackConfirmationMechanics;
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
    expectedEvidence: pack?.expectedEvidence || [],
    gsnSources: pack?.gsnSources || [],
    missingLinks: pack?.missingLinks || [],
    refusesToClaim: pack?.refusesToClaim || [],
    confirmationReasonType: pack?.confirmationReasonType || "community_standing_check",
    confirmationQuestion:
      pack?.confirmationQuestion ||
      "Ask current community witnesses the purpose-specific question before relying.",
    confirmationMechanics: decisionPackConfirmationMechanics(pack || null),
  };
}
