export type GmfnCapabilityCategory =
  | "trade"
  | "visibility"
  | "finance"
  | "support"
  | "community"
  | "identity"
  | "work"
  | "operating";

export type GmfnCapabilityTone = "calm" | "focus" | "alert" | "spotlight";

export type GmfnCapability = {
  id: number;
  title: string;
  proverb: string;
  gmfn: string;
  category: GmfnCapabilityCategory;
  tone: GmfnCapabilityTone;
  priority?: number;
  whatItIs?: string;
  howItWorks?: string;
  whyItMatters?: string;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hashSeed(...parts: Array<unknown>): number {
  const text = parts.map((part) => String(part ?? "")).join("|");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

export const GMFN_CAPABILITIES: readonly GmfnCapability[] = [
  {
    id: 1,
    title: "Release Before Payment",
    proverb: "Release Before Payment reduces blind risk before money moves.",
    gmfn:
      "GSN makes trust visible before payment so identity, trust, and community can improve access and reduce risk.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: 2,
    title: "Evidence-Backed Buying and Selling",
    proverb: "Evidence-Backed Buying and Selling turns reputation into clearer trade decisions.",
    gmfn:
      "GSN helps buyers and sellers act with more confidence because identity, trust evidence, and community context are visible in one flow.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: 3,
    title: "Cross-Community Trade",
    proverb: "Cross-Community Trade expands trust beyond one circle.",
    gmfn:
      "GSN carries visible trust across communities so economic access grows without losing accountability.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: 4,
    title: "Fraud Reduction Before Action",
    proverb: "Fraud Reduction Before Action protects people before loss happens.",
    gmfn:
      "GSN reduces risk before action by making trust visible early, not after damage is done.",
    category: "identity",
    tone: "alert",
    priority: 8,
  },
  {
    id: 5,
    title: "Spotlight Visibility",
    proverb: "Spotlight Visibility helps recorded value get seen first.",
    gmfn:
      "GSN uses visible trust to improve presence and confidence around spotlighted goods, services, and people.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: 6,
    title: "Reputation-Based Visibility",
    proverb: "Reputation-Based Visibility gives stronger trust more reach.",
    gmfn:
      "GSN makes visibility depend on visible trust, not noise alone, so access improves while risk falls.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: 7,
    title: "Marketplace Presence Across Communities",
    proverb: "Marketplace Presence Across Communities lets trust travel with the merchant.",
    gmfn:
      "GSN gives a merchant usable presence beyond one market by carrying identity, trust, and community context together.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: 8,
    title: "People-Backed Loans",
    proverb: "People-Backed Loans make support more relational and accountable.",
    gmfn:
      "GSN turns visible trust into a support signal so lending can improve access while keeping risk clearer.",
    category: "finance",
    tone: "focus",
    priority: 7,
  },
  {
    id: 9,
    title: "Supporting Others",
    proverb: "Supporting Others makes trust productive, not passive.",
    gmfn:
      "GSN shows when support is visible, accountable, and community-backed so help becomes measurable.",
    category: "support",
    tone: "calm",
    priority: 6,
  },
  {
    id: 10,
    title: "Emergency Support",
    proverb: "Emergency Support works better when trust is already visible.",
    gmfn:
      "GSN shortens uncertainty in urgent moments by making identity, trust, and community context easier to read.",
    category: "support",
    tone: "alert",
    priority: 8,
  },
  {
    id: 11,
    title: "Diaspora Trust Bridge",
    proverb: "Diaspora Trust Bridge carries confidence across distance.",
    gmfn:
      "GSN helps people transact, support, and verify across borders by making trust portable instead of local only.",
    category: "community",
    tone: "focus",
    priority: 6,
  },
  {
    id: 12,
    title: "Trust Savings (ROSCA Support)",
    proverb: "Trust Savings gives familiar savings culture a visible trust layer.",
    gmfn:
      "GSN helps savings groups become more accountable by making contribution trust visible inside community structures.",
    category: "finance",
    tone: "calm",
    priority: 6,
  },
  {
    id: 13,
    title: "Contribution Tracking",
    proverb: "Contribution Tracking turns memory into visible economic record.",
    gmfn:
      "GSN helps contribution history become visible evidence so access and accountability improve together.",
    category: "finance",
    tone: "focus",
    priority: 6,
  },
  {
    id: 14,
    title: "Continuity Across Distance",
    proverb: "Continuity Across Distance keeps trust from breaking when people move.",
    gmfn:
      "GSN preserves identity, trust, and participation across time and location so opportunity does not reset from zero.",
    category: "community",
    tone: "calm",
    priority: 6,
  },
  {
    id: 15,
    title: "Portable Trust Identity",
    proverb: "Portable Trust Identity lets trust move with the person.",
    gmfn:
      "GSN turns informal community vouching into portable, verifiable trust evidence, especially for people who are normally invisible to formal credit systems.",
    category: "identity",
    tone: "focus",
    priority: 8,
    whatItIs:
      "Portable Trust Identity helps a member carry their good name beyond the street, market, family, or community where people already know them.",
    howItWorks:
      "Trust Passport keeps the fuller record of money promises, repayment behaviour, support given, supporter responsibility, identity continuity, and recorded community-backed behaviour. TrustSlip gives a smaller evidence record that can be checked before a seller releases goods on credit, before a loan is approved, or before someone accepts risk.",
    whyItMatters:
      "GSN turns informal community vouching into portable, verifiable trust evidence, especially for people who are normally invisible to formal credit systems.",
  },
  {
    id: 16,
    title: "Reputation Mobility",
    proverb: "Reputation Mobility stops trust from staying trapped in one place.",
    gmfn:
      "GSN helps earned reputation stay usable across new spaces, which improves access without losing accountability.",
    category: "identity",
    tone: "focus",
    priority: 7,
  },
  {
    id: 17,
    title: "One Global Shop",
    proverb: "One Global Shop gives one identity a wider market presence.",
    gmfn:
      "GSN helps one merchant identity stay visible across communities instead of rebuilding from zero in each market.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: 18,
    title: "Service Economy Participation",
    proverb: "Service Economy Participation brings trust into work that often stays informal.",
    gmfn:
      "GSN helps service work become more visible and reviewable so access improves for workers and buyers alike.",
    category: "work",
    tone: "focus",
    priority: 6,
  },
  {
    id: 19,
    title: "Trust-Based Hiring",
    proverb: "Trust-Based Hiring helps work decisions rely on visible credibility.",
    gmfn:
      "GSN makes trust readable before hiring, so decisions can go beyond guesswork and weak informal signals.",
    category: "work",
    tone: "focus",
    priority: 6,
  },
  {
    id: 20,
    title: "Demand Box",
    proverb: "Demand Box makes real needs visible before the market misses them.",
    gmfn:
      "GSN helps demand become readable and actionable so opportunity can meet need with less friction.",
    category: "trade",
    tone: "focus",
    priority: 7,
  },
  {
    id: 21,
    title: "Community Economic Power",
    proverb: "Community Economic Power grows when trust becomes visible and usable.",
    gmfn:
      "GSN turns trust into shared economic strength by linking identity, trust, and community into one working layer.",
    category: "community",
    tone: "calm",
    priority: 8,
  },
  {
    id: 22,
    title: "Commitment Builder",
    proverb:
      "The point is not to collect goals. The point is to build execution discipline that supports savings, repayment, retirement readiness, and dependable follow-through.",
    gmfn:
      "GSN helps members turn intentions into structured, achievable follow-through through reminders, progress guidance, and visible commitment support.",
    category: "operating",
    tone: "focus",
    priority: 8,
    whatItIs:
      "Commitment Builder helps members turn savings goals, business targets, repayment plans, retirement readiness, and other intentions into structured, achievable follow-through.",
    howItWorks:
      "The app can help a member start a savings target, business target, repayment target, retirement-readiness target, or another structured commitment, then turn that intention into a clearer plan, reminders, step-by-step progress, and visible follow-through.",
    whyItMatters:
      "The point is not to collect goals. The point is to build execution discipline that can support savings behavior, retirement readiness, repayment follow-through, business targets, and more dependable action over time.",
  },
  {
    id: 23,
    title: "Institutional Community Domain",
    proverb:
      "Institutional Community Domain helps a real organization run with clearer structure, evidence, and boundaries.",
    gmfn:
      "GSN helps schools, unions, churches, cooperatives, markets, and associations organize members, branches, roles, evidence, governance, and public identity without confusing them with personal marketplaces.",
    category: "community",
    tone: "focus",
    priority: 8,
    whatItIs:
      "Institutional Community Domain is the larger organized-community layer for schools, unions, churches, cooperatives, markets, associations, and similar bodies.",
    howItWorks:
      "A domain can hold the institution's public identity, operating units, member placement, policies, evidence maps, service lanes, participation records, and controlled public claims in one structured space.",
    whyItMatters:
      "It separates institutional communities from personal marketplaces, so people can see whether they are dealing with a real organized body, a branch under that body, or an ordinary marketplace community.",
  },
] as const;

export const GMFN_CAPABILITY_COUNT = GMFN_CAPABILITIES.length;

export function getGmfnCapability(id: any): GmfnCapability | null {
  const capabilityId = positiveNumber(id);
  if (!capabilityId) return null;
  return GMFN_CAPABILITIES.find((item) => item.id === capabilityId) || null;
}

export function getFeaturedGmfnCapability(seed?: unknown): GmfnCapability | null {
  if (!GMFN_CAPABILITIES.length) return null;

  const seedKey =
    safeStr(seed) ||
    new Date().toISOString().slice(0, 10) ||
    String(GMFN_CAPABILITY_COUNT);
  const index = hashSeed(seedKey, GMFN_CAPABILITY_COUNT) % GMFN_CAPABILITIES.length;

  return GMFN_CAPABILITIES[index] || GMFN_CAPABILITIES[0] || null;
}

export function getGmfnCapabilityGuideLine(id: any, fallbackSeed?: unknown): string {
  const capability =
    getGmfnCapability(id) || getFeaturedGmfnCapability(fallbackSeed);

  if (!capability) {
    return `My GSN and I keeps the ${GMFN_CAPABILITY_COUNT} core capabilities as the guide behind this reading.`;
  }

  return (
    safeStr(capability.whyItMatters) ||
    safeStr(capability.whatItIs) ||
    safeStr(capability.proverb) ||
    safeStr(capability.gmfn) ||
    capability.title
  );
}
