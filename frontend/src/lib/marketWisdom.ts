import {
  GMFN_CAPABILITIES,
  type GmfnCapabilityCategory,
  type GmfnCapabilityTone,
} from "./gmfnCapabilities";

export type MarketWisdomCategory = GmfnCapabilityCategory;

export type MarketWisdomTone = GmfnCapabilityTone;

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

const CAPABILITY_WISDOM: MarketWisdomPair[] = GMFN_CAPABILITIES.map((item) => ({
  id: `mw-cap-${String(item.id).padStart(2, "0")}`,
  capability: item.id,
  title: item.title,
  proverb: item.proverb,
  gmfn: item.gmfn,
  category: item.category,
  tone: item.tone,
  priority: item.priority,
}));

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

