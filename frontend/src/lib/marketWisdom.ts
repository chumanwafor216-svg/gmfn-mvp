export type MarketWisdomCategory =
  | "trade"
  | "visibility"
  | "finance"
  | "support"
  | "community"
  | "identity"
  | "work"
  | "operating";

export type MarketWisdomTone = "calm" | "focus" | "alert" | "spotlight";

export type MarketWisdomPair = {
  id: string;
  title: string;
  proverb: string;
  gmfn: string;
  category: MarketWisdomCategory;
  tone: MarketWisdomTone;
  capability?: number;
  priority?: number;
};

export type SmartMarketWisdomParams = {
  hour?: number;
  unread?: number;
  pendingRequests?: number;
  hasSpotlight?: boolean;
  hasGmfnId?: boolean;
  trustTone?: "green" | "yellow" | "red" | "neutral";
  previousId?: string | number | null;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function daySeed(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

function hashSeed(...parts: Array<string | number | boolean | undefined | null>): number {
  const text = parts.map((part) => String(part ?? "")).join("|");
  let hash = 0;

  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  }

  return hash;
}

const CAPABILITY_WISDOM: MarketWisdomPair[] = [
  {
    id: "mw-cap-01",
    capability: 1,
    title: "Release Before Payment",
    proverb: "Release Before Payment reduces risk before money moves.",
    gmfn:
      "GSN makes trust visible before payment so identity, trust, and community can improve access and reduce risk.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-02",
    capability: 2,
    title: "Trusted Buying and Selling",
    proverb: "Trusted Buying and Selling turns reputation into safer trade.",
    gmfn:
      "GSN helps buyers and sellers act with more confidence because identity, trust, and community are visible in one flow.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-03",
    capability: 3,
    title: "Cross-Community Trade",
    proverb: "Cross-Community Trade expands trust beyond one circle.",
    gmfn:
      "GSN carries visible trust across communities so economic access grows without losing accountability.",
    category: "trade",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-04",
    capability: 4,
    title: "Fraud Reduction Before Action",
    proverb: "Fraud Reduction Before Action protects people before loss happens.",
    gmfn:
      "GSN reduces risk before action by making trust visible early, not after damage is done.",
    category: "identity",
    tone: "alert",
    priority: 8,
  },
  {
    id: "mw-cap-05",
    capability: 5,
    title: "Spotlight Visibility",
    proverb: "Spotlight Visibility helps the right value get seen first.",
    gmfn:
      "GSN uses visible trust to improve presence and confidence around spotlighted goods, services, and people.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: "mw-cap-06",
    capability: 6,
    title: "Reputation-Based Visibility",
    proverb: "Reputation-Based Visibility gives stronger trust more reach.",
    gmfn:
      "GSN makes visibility depend on visible trust, not noise alone, so access improves while risk falls.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: "mw-cap-07",
    capability: 7,
    title: "Marketplace Presence Across Communities",
    proverb: "Marketplace Presence Across Communities lets trust travel with the merchant.",
    gmfn:
      "GSN gives a merchant usable presence beyond one market by carrying identity, trust, and community context together.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: "mw-cap-08",
    capability: 8,
    title: "People-Backed Loans",
    proverb: "People-Backed Loans make support more relational and accountable.",
    gmfn:
      "GSN turns visible trust into a support signal so lending can improve access while keeping risk clearer.",
    category: "finance",
    tone: "focus",
    priority: 7,
  },
  {
    id: "mw-cap-09",
    capability: 9,
    title: "Supporting Others",
    proverb: "Supporting Others makes trust productive, not passive.",
    gmfn:
      "GSN shows when support is visible, accountable, and community-backed so help becomes measurable.",
    category: "support",
    tone: "calm",
    priority: 6,
  },
  {
    id: "mw-cap-10",
    capability: 10,
    title: "Emergency Support",
    proverb: "Emergency Support works better when trust is already visible.",
    gmfn:
      "GSN shortens uncertainty in urgent moments by making identity, trust, and community context easier to read.",
    category: "support",
    tone: "alert",
    priority: 8,
  },
  {
    id: "mw-cap-11",
    capability: 11,
    title: "Diaspora Trust Bridge",
    proverb: "Diaspora Trust Bridge carries confidence across distance.",
    gmfn:
      "GSN helps people transact, support, and verify across borders by making trust portable instead of local only.",
    category: "community",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-12",
    capability: 12,
    title: "Trust Savings (ROSCA Support)",
    proverb: "Trust Savings gives familiar savings culture a visible trust layer.",
    gmfn:
      "GSN helps savings groups become more accountable by making contribution trust visible inside community structures.",
    category: "finance",
    tone: "calm",
    priority: 6,
  },
  {
    id: "mw-cap-13",
    capability: 13,
    title: "Contribution Tracking",
    proverb: "Contribution Tracking turns memory into visible economic record.",
    gmfn:
      "GSN helps contribution history become visible proof so access and accountability improve together.",
    category: "finance",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-14",
    capability: 14,
    title: "Continuity Across Distance",
    proverb: "Continuity Across Distance keeps trust from breaking when people move.",
    gmfn:
      "GSN preserves identity, trust, and participation across time and location so opportunity does not reset from zero.",
    category: "community",
    tone: "calm",
    priority: 6,
  },
  {
    id: "mw-cap-15",
    capability: 15,
    title: "Portable Trust Identity",
    proverb: "Portable Trust Identity lets trust move with the person.",
    gmfn:
      "GSN makes trust portable so verified standing can travel across communities, markets, and decisions.",
    category: "identity",
    tone: "focus",
    priority: 8,
  },
  {
    id: "mw-cap-16",
    capability: 16,
    title: "Reputation Mobility",
    proverb: "Reputation Mobility stops trust from staying trapped in one place.",
    gmfn:
      "GSN helps earned reputation stay usable across new spaces, which improves access without losing accountability.",
    category: "identity",
    tone: "focus",
    priority: 7,
  },
  {
    id: "mw-cap-17",
    capability: 17,
    title: "One Global Shop",
    proverb: "One Global Shop gives one identity a wider trusted market presence.",
    gmfn:
      "GSN helps one merchant identity stay visible across communities instead of rebuilding from zero in each market.",
    category: "visibility",
    tone: "spotlight",
    priority: 7,
  },
  {
    id: "mw-cap-18",
    capability: 18,
    title: "Service Economy Participation",
    proverb: "Service Economy Participation brings trust into work that often stays informal.",
    gmfn:
      "GSN helps service work become more visible and trusted so access improves for workers and buyers alike.",
    category: "work",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-19",
    capability: 19,
    title: "Trust-Based Hiring",
    proverb: "Trust-Based Hiring helps work decisions rely on visible credibility.",
    gmfn:
      "GSN makes trust readable before hiring, so decisions can go beyond guesswork and weak informal signals.",
    category: "work",
    tone: "focus",
    priority: 6,
  },
  {
    id: "mw-cap-20",
    capability: 20,
    title: "Demand Box",
    proverb: "Demand Box makes real needs visible before the market misses them.",
    gmfn:
      "GSN helps demand become readable and actionable so opportunity can meet need with less friction.",
    category: "trade",
    tone: "focus",
    priority: 7,
  },
  {
    id: "mw-cap-21",
    capability: 21,
    title: "Community Economic Power",
    proverb: "Community Economic Power grows when trust becomes visible and usable.",
    gmfn:
      "GSN turns trust into shared economic strength by linking identity, trust, and community into one working layer.",
    category: "community",
    tone: "calm",
    priority: 8,
  },
  {
    id: "mw-cap-22",
    capability: 22,
    title: "Commitment Builder",
    proverb:
      "The point is not to collect goals. The point is to build execution discipline that supports savings, repayment, retirement readiness, and dependable follow-through.",
    gmfn:
      "GSN helps members turn intentions into structured, achievable follow-through through reminders, progress guidance, and visible commitment support.",
    category: "operating",
    tone: "focus",
    priority: 8,
  },
];

const LEGACY_WISDOM: MarketWisdomPair[] = [
  {
    id: "mw-legacy-01",
    title: "Trust before transaction",
    proverb: "Before money moves, trust should be readable.",
    gmfn:
      "GSN turns trust from hidden social knowledge into visible economic signal.",
    category: "operating",
    tone: "focus",
    priority: 3,
  },
  {
    id: "mw-legacy-02",
    title: "Visibility reduces fear",
    proverb: "What people can verify, they can approach with more confidence.",
    gmfn:
      "Visible identity and trust reduce hesitation, conflict, and avoidable delay.",
    category: "visibility",
    tone: "spotlight",
    priority: 3,
  },
  {
    id: "mw-legacy-03",
    title: "Carry one clean proof",
    proverb: "Portable proof is stronger than repeated explanation.",
    gmfn:
      "GSN helps a person or merchant carry usable trust instead of starting from zero again.",
    category: "identity",
    tone: "focus",
    priority: 3,
  },
  {
    id: "mw-legacy-04",
    title: "One clear next step",
    proverb: "A clean next action is stronger than scattered effort.",
    gmfn:
      "GSN works best when people can see what matters now and what comes after it.",
    category: "operating",
    tone: "calm",
    priority: 3,
  },
  {
    id: "mw-legacy-05",
    title: "Community multiplies confidence",
    proverb: "Trust becomes stronger when community can see and support it.",
    gmfn:
      "Identity alone is not enough; trust grows when the surrounding community makes it visible.",
    category: "community",
    tone: "calm",
    priority: 3,
  },
  {
    id: "mw-legacy-06",
    title: "Consistency compounds",
    proverb: "Small visible reliability becomes larger access over time.",
    gmfn:
      "GSN rewards steady proof, not noise, by making visible conduct economically useful.",
    category: "operating",
    tone: "focus",
    priority: 3,
  },
  {
    id: "mw-legacy-07",
    title: "Support needs structure",
    proverb: "Goodwill works better when trust and responsibility are visible.",
    gmfn:
      "GSN helps support move from sentiment into accountable structure.",
    category: "support",
    tone: "calm",
    priority: 3,
  },
  {
    id: "mw-legacy-08",
    title: "Trust opens markets",
    proverb: "Where trust becomes visible, opportunity can travel further.",
    gmfn:
      "GSN helps trade move beyond familiar circles without losing confidence or accountability.",
    category: "trade",
    tone: "spotlight",
    priority: 3,
  },
  {
    id: "mw-legacy-09",
    title: "Commitment turns intention into dependable follow-through",
    proverb: "Commitment turns intention into dependable follow-through.",
    gmfn:
      "GSN should not only record what happened. It should help steady what happens next through visible commitment support.",
    category: "operating",
    tone: "focus",
    priority: 4,
  },
  {
    id: "mw-legacy-10",
    title: "Dependable follow-through is also a form of trust",
    proverb: "A plan becomes powerful only when the person can follow it repeatedly.",
    gmfn:
      "Savings, repayment, and retirement readiness grow stronger when commitment becomes visible and dependable action can be seen over time.",
    category: "finance",
    tone: "calm",
    priority: 4,
  },
  {
    id: "mw-legacy-11",
    title: "Commitment becomes economic power",
    proverb: "Commitment is where discipline becomes economic power.",
    gmfn:
      "A member who keeps a commitment becomes easier to support, trust, and finance because visible discipline strengthens future decisions.",
    category: "community",
    tone: "focus",
    priority: 4,
  },
];

function buildPreferredCategories(
  params: SmartMarketWisdomParams
): MarketWisdomCategory[] {
  const hour = Number(params.hour ?? 12);
  const unread = positiveNumber(params.unread);
  const pendingRequests = positiveNumber(params.pendingRequests);
  const trustTone = safeStr(params.trustTone).toLowerCase();
  const hasSpotlight = Boolean(params.hasSpotlight);
  const hasGmfnId = Boolean(params.hasGmfnId);

  if (!hasGmfnId) {
    return ["identity", "community", "trade", "operating"];
  }

  if (pendingRequests > 0) {
    return ["support", "finance", "community", "operating"];
  }

  if (unread > 3) {
    return ["support", "community", "operating", "identity"];
  }

  if (trustTone === "red" || trustTone === "yellow") {
    return ["identity", "finance", "community", "operating"];
  }

  if (hasSpotlight) {
    return ["visibility", "trade", "identity", "community"];
  }

  if (hour >= 5 && hour < 11) {
    return ["identity", "community", "work", "operating"];
  }

  if (hour >= 11 && hour < 16) {
    return ["trade", "visibility", "work", "operating"];
  }

  if (hour >= 16 && hour < 20) {
    return ["finance", "support", "trade", "community"];
  }

  return ["community", "identity", "finance", "operating"];
}

function scoreEntry(
  entry: MarketWisdomPair,
  params: SmartMarketWisdomParams,
  preferredCategories: MarketWisdomCategory[]
): number {
  let score = positiveNumber(entry.priority || 0);
  const unread = positiveNumber(params.unread);
  const pendingRequests = positiveNumber(params.pendingRequests);
  const trustTone = safeStr(params.trustTone).toLowerCase();

  if (entry.capability) score += 4;

  const preferredIndex = preferredCategories.indexOf(entry.category);
  if (preferredIndex >= 0) {
    score += Math.max(1, 5 - preferredIndex);
  }

  if (params.hasSpotlight && entry.tone === "spotlight") score += 3;
  if ((trustTone === "red" || trustTone === "yellow") && entry.tone === "alert") {
    score += 4;
  }

  if (pendingRequests > 0 && (entry.category === "support" || entry.category === "finance")) {
    score += 3;
  }

  if (unread > 0 && entry.category === "community") {
    score += 2;
  }

  if (!params.hasGmfnId && entry.category === "identity") {
    score += 4;
  }

  return score;
}

export function getSmartMarketWisdomPair(
  params: SmartMarketWisdomParams
): MarketWisdomPair {
  const pool = [...CAPABILITY_WISDOM, ...LEGACY_WISDOM];
  const preferredCategories = buildPreferredCategories(params);
  const previousId = safeStr(params.previousId);
  const today = daySeed();

  const ranked = pool
    .map((entry) => ({
      entry,
      score: scoreEntry(entry, params, preferredCategories),
      tie: hashSeed(
        today,
        entry.id,
        params.hour,
        params.unread,
        params.pendingRequests,
        params.hasSpotlight,
        params.hasGmfnId,
        params.trustTone
      ),
    }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.tie - b.tie;
    });

  const topPool = ranked.slice(0, Math.min(8, ranked.length)).map((row) => row.entry);
  const filtered = topPool.filter((entry) => entry.id !== previousId);

  if (filtered.length > 0) {
    const pickIndex =
      hashSeed(
        today,
        "market-wisdom-choice",
        params.hour,
        params.unread,
        params.pendingRequests,
        params.hasSpotlight,
        params.hasGmfnId,
        params.trustTone
      ) % filtered.length;

    return filtered[pickIndex];
  }

  return topPool[0] || CAPABILITY_WISDOM[0];
}

