export type MarketWisdomPair = {
  id: string;
  source: "African Proverb" | "Indian Proverb" | "South American Proverb";
  proverb: string;
  gmfn: string;
};

export type MarketWisdomTone = "green" | "yellow" | "red" | "neutral";

export type MarketWisdomContext = {
  hour?: number;
  unread?: number;
  pendingRequests?: number;
  hasSpotlight?: boolean;
  hasGmfnId?: boolean;
  trustTone?: MarketWisdomTone;
  previousId?: string;
};

export const MARKET_WISDOM_PAIRS: MarketWisdomPair[] = [
  {
    id: "afr-001",
    source: "African Proverb",
    proverb: "In African markets, your name travels faster than your product. Protect it.",
    gmfn: "GMFN turns your reputation into usable financial power.",
  },
  {
    id: "afr-002",
    source: "African Proverb",
    proverb: "A trusted trader sells even when prices rise. Trust absorbs volatility.",
    gmfn: "TrustSlip allows you to buy based on who you are, not only what you hold.",
  },
  {
    id: "afr-003",
    source: "African Proverb",
    proverb: "Credit in the market is not about money — it is about character.",
    gmfn: "Your integrity becomes your credit line inside GMFN.",
  },
  {
    id: "afr-004",
    source: "African Proverb",
    proverb: "One bad deal can erase ten good years. Be careful.",
    gmfn: "In GMFN, trust is no longer hidden — it is visible and measurable.",
  },
  {
    id: "afr-005",
    source: "African Proverb",
    proverb: "The strongest traders are not the richest — they are the most trusted.",
    gmfn: "Your community stands behind your transactions through shared trust.",
  },
  {
    id: "afr-006",
    source: "African Proverb",
    proverb: "Community guarantees are stronger than paper contracts in many markets.",
    gmfn: "Trust is no longer local — GMFN makes it portable across markets.",
  },
  {
    id: "afr-007",
    source: "African Proverb",
    proverb: "If people greet you warmly, your business is safe.",
    gmfn: "With GMFN, your network becomes your financial strength.",
  },
  {
    id: "afr-008",
    source: "African Proverb",
    proverb: "Trade is built on relationships before transactions.",
    gmfn: "TrustSlip transforms social credibility into economic access.",
  },
  {
    id: "afr-009",
    source: "African Proverb",
    proverb: "When elders trust you, the market opens for you.",
    gmfn: "Your history of repayment becomes your strongest asset.",
  },
  {
    id: "afr-010",
    source: "African Proverb",
    proverb: "Reputation is your real capital — cash only supports it.",
    gmfn: "GMFN replaces blind trust with visible, explainable trust.",
  },
  {
    id: "afr-011",
    source: "African Proverb",
    proverb: "Never rush profit at the cost of long-term trust.",
    gmfn: "Distance is no longer a barrier — your trust travels with you.",
  },
  {
    id: "afr-012",
    source: "African Proverb",
    proverb: "A consistent trader beats a clever trader.",
    gmfn: "GMFN allows communities to support each other without confusion or conflict.",
  },
  {
    id: "afr-013",
    source: "African Proverb",
    proverb: "People buy from who they know, not the cheapest.",
    gmfn: "Your behavior builds your financial identity over time.",
  },
  {
    id: "afr-014",
    source: "African Proverb",
    proverb: "Pay back early — it multiplies your trust faster than profit.",
    gmfn: "TrustSlip allows merchants to release goods with confidence.",
  },
  {
    id: "afr-015",
    source: "African Proverb",
    proverb: "When people defend your name in your absence, you are truly established.",
    gmfn: "In GMFN, every action contributes to your trust record.",
  },
  {
    id: "afr-016",
    source: "African Proverb",
    proverb: "A bad debt spreads faster than good news.",
    gmfn: "Trust becomes structured, shared, and accountable.",
  },
  {
    id: "afr-017",
    source: "African Proverb",
    proverb: "Traders who cooperate grow faster than those who compete blindly.",
    gmfn: "GMFN helps communities formalize what they already do informally.",
  },
  {
    id: "afr-018",
    source: "African Proverb",
    proverb: "Your word is stronger than your receipt.",
    gmfn: "You no longer need collateral when your trust is strong.",
  },
  {
    id: "afr-019",
    source: "African Proverb",
    proverb: "Trust reduces friction — business becomes easier.",
    gmfn: "Trust-based networks move faster than rigid bank systems.",
  },
  {
    id: "afr-020",
    source: "African Proverb",
    proverb: "The market remembers everything.",
    gmfn: "Your community validates your financial credibility.",
  },
  {
    id: "afr-021",
    source: "African Proverb",
    proverb: "If you can’t repay, communicate early — silence destroys trust.",
    gmfn: "GMFN makes informal finance systems clearer and more reliable.",
  },
  {
    id: "afr-022",
    source: "African Proverb",
    proverb: "Shared success strengthens community trade systems.",
    gmfn: "Your reputation becomes verifiable beyond your immediate circle.",
  },
  {
    id: "afr-023",
    source: "African Proverb",
    proverb: "Avoid deals that force you to break your word.",
    gmfn: "TrustSlip allows you to transact even where banking fails.",
  },
  {
    id: "afr-024",
    source: "African Proverb",
    proverb: "People invest in people, not just goods.",
    gmfn: "Your trust history reduces risk for everyone involved.",
  },
  {
    id: "afr-025",
    source: "African Proverb",
    proverb: "Your behavior during hardship defines your future.",
    gmfn: "GMFN aligns incentives between individuals and their communities.",
  },
  {
    id: "afr-026",
    source: "African Proverb",
    proverb: "Trust grows slowly but collapses instantly.",
    gmfn: "Trust becomes an asset you can carry anywhere.",
  },
  {
    id: "afr-027",
    source: "African Proverb",
    proverb: "A reliable supplier is more valuable than a cheap one.",
    gmfn: "Communities can now lend and support with clarity and structure.",
  },
  {
    id: "afr-028",
    source: "African Proverb",
    proverb: "Strong networks are built on loyalty.",
    gmfn: "Your identity is backed by real actions, not empty claims.",
  },
  {
    id: "afr-029",
    source: "African Proverb",
    proverb: "Be known for consistency.",
    gmfn: "GMFN enables trust-backed trade across borders.",
  },
  {
    id: "afr-030",
    source: "African Proverb",
    proverb: "When trust is strong, business expands naturally.",
    gmfn: "When trust is visible, business becomes faster and safer.",
  },
  {
    id: "ind-001",
    source: "Indian Proverb",
    proverb: "Business flows through relationships, not just pricing.",
    gmfn: "GMFN makes trusted relationships economically usable.",
  },
  {
    id: "ind-002",
    source: "Indian Proverb",
    proverb: "Trust is built through repetition, not promises.",
    gmfn: "TrustSlip rewards consistent behavior, not loud claims.",
  },
  {
    id: "ind-003",
    source: "Indian Proverb",
    proverb: "A reliable trader earns long-term credit access.",
    gmfn: "Your repayment conduct becomes visible strength inside GMFN.",
  },
  {
    id: "ind-004",
    source: "Indian Proverb",
    proverb: "Family reputation often backs business decisions.",
    gmfn: "GMFN turns social credibility into structured financial credibility.",
  },
  {
    id: "ind-005",
    source: "Indian Proverb",
    proverb: "Negotiation is expected, integrity is respected.",
    gmfn: "Trust becomes explainable, auditable, and shared.",
  },
  {
    id: "ind-006",
    source: "Indian Proverb",
    proverb: "Timing matters — deliver when promised.",
    gmfn: "Your reliability improves your standing in the network.",
  },
  {
    id: "ind-007",
    source: "Indian Proverb",
    proverb: "Loyalty reduces risk more than contracts.",
    gmfn: "GMFN allows trust to travel beyond one location.",
  },
  {
    id: "ind-008",
    source: "Indian Proverb",
    proverb: "Trust enables faster transactions than systems.",
    gmfn: "TrustSlip helps merchants act with more confidence.",
  },
  {
    id: "ind-009",
    source: "Indian Proverb",
    proverb: "Reputation spreads across regions quickly.",
    gmfn: "A strong trust record can support access across communities.",
  },
  {
    id: "ind-010",
    source: "Indian Proverb",
    proverb: "Long-term relationships beat short-term profit.",
    gmfn: "GMFN supports long-term integrity over one-off advantage.",
  },
  {
    id: "ind-011",
    source: "Indian Proverb",
    proverb: "Honesty in small deals earns trust in big deals.",
    gmfn: "Small acts inside GMFN build your larger trust identity.",
  },
  {
    id: "ind-012",
    source: "Indian Proverb",
    proverb: "Markets reward consistency more than aggression.",
    gmfn: "GMFN favors repeat good conduct over noise.",
  },
  {
    id: "ind-013",
    source: "Indian Proverb",
    proverb: "Manage expectations, not just goods.",
    gmfn: "Clear trust signals reduce misunderstanding and conflict.",
  },
  {
    id: "ind-014",
    source: "Indian Proverb",
    proverb: "Reliability attracts better partners.",
    gmfn: "Better trust standing attracts stronger community backing.",
  },
  {
    id: "ind-015",
    source: "Indian Proverb",
    proverb: "Mutual respect sustains trade.",
    gmfn: "GMFN works best when support and accountability move together.",
  },
  {
    id: "ind-016",
    source: "Indian Proverb",
    proverb: "Trust reduces enforcement.",
    gmfn: "Visible trust lowers the need for heavy control.",
  },
  {
    id: "ind-017",
    source: "Indian Proverb",
    proverb: "Business networks extend beyond geography.",
    gmfn: "GMFN keeps communities connected across borders.",
  },
  {
    id: "ind-018",
    source: "Indian Proverb",
    proverb: "Community validation matters.",
    gmfn: "Your community can now make your credibility visible.",
  },
  {
    id: "ind-019",
    source: "Indian Proverb",
    proverb: "A respected name opens doors faster than capital.",
    gmfn: "GMFN allows identity to open access before collateral does.",
  },
  {
    id: "ind-020",
    source: "Indian Proverb",
    proverb: "Repeat customers are your backbone.",
    gmfn: "Repeat trust interactions strengthen your economic profile.",
  },
  {
    id: "ind-021",
    source: "Indian Proverb",
    proverb: "Avoid disputes — resolution preserves reputation.",
    gmfn: "GMFN protects long-term trust by making conduct count.",
  },
  {
    id: "ind-022",
    source: "Indian Proverb",
    proverb: "The market favors predictable behavior.",
    gmfn: "Predictable repayment and support raise trust confidence.",
  },
  {
    id: "ind-023",
    source: "Indian Proverb",
    proverb: "Creditworthiness is social before financial.",
    gmfn: "GMFN captures the social side of creditworthiness.",
  },
  {
    id: "ind-024",
    source: "Indian Proverb",
    proverb: "Strong networks protect during downturns.",
    gmfn: "Your network becomes part of your resilience in GMFN.",
  },
  {
    id: "ind-025",
    source: "Indian Proverb",
    proverb: "Trust compounds like capital.",
    gmfn: "Each good action in GMFN adds to future opportunity.",
  },
  {
    id: "ind-026",
    source: "Indian Proverb",
    proverb: "A disciplined trader grows across generations.",
    gmfn: "Discipline in trust behavior creates lasting economic value.",
  },
  {
    id: "ind-027",
    source: "Indian Proverb",
    proverb: "Reliable supply builds stronger networks than flashy promotion.",
    gmfn: "GMFN rewards dependable behavior over surface appearance.",
  },
  {
    id: "ind-028",
    source: "Indian Proverb",
    proverb: "A respected partner lowers the cost of doing business.",
    gmfn: "Visible trust reduces friction across the network.",
  },
  {
    id: "ind-029",
    source: "Indian Proverb",
    proverb: "A stable name can survive a difficult season.",
    gmfn: "GMFN helps preserve value in your name through structured trust.",
  },
  {
    id: "ind-030",
    source: "Indian Proverb",
    proverb: "A trader known for balance lasts longer than one known for speed.",
    gmfn: "GMFN is designed for sustainable trust, not reckless movement.",
  },
  {
    id: "sam-001",
    source: "South American Proverb",
    proverb: "Relationships drive business more than systems.",
    gmfn: "GMFN gives those relationships a financial framework.",
  },
  {
    id: "sam-002",
    source: "South American Proverb",
    proverb: "Trust creates access where formal finance fails.",
    gmfn: "TrustSlip opens a cleaner path where banks may not.",
  },
  {
    id: "sam-003",
    source: "South American Proverb",
    proverb: "Community reputation shapes opportunity.",
    gmfn: "Your community standing can now become visible economic strength.",
  },
  {
    id: "sam-004",
    source: "South American Proverb",
    proverb: "Personal connections influence trade success.",
    gmfn: "GMFN structures real-life connections into usable trust.",
  },
  {
    id: "sam-005",
    source: "South American Proverb",
    proverb: "Consistency builds credibility over time.",
    gmfn: "GMFN tracks trust as something earned, not claimed.",
  },
  {
    id: "sam-006",
    source: "South American Proverb",
    proverb: "Reliable partners reduce risk.",
    gmfn: "Trust visibility helps communities choose better partners.",
  },
  {
    id: "sam-007",
    source: "South American Proverb",
    proverb: "Trust allows business even in instability.",
    gmfn: "GMFN helps trust-based trade continue through uncertainty.",
  },
  {
    id: "sam-008",
    source: "South American Proverb",
    proverb: "Informal networks are powerful economies.",
    gmfn: "GMFN gives informal support systems a formal backbone.",
  },
  {
    id: "sam-009",
    source: "South American Proverb",
    proverb: "A respected trader attracts better deals.",
    gmfn: "Stronger trust standing can improve access and terms.",
  },
  {
    id: "sam-010",
    source: "South American Proverb",
    proverb: "Loyalty strengthens survival.",
    gmfn: "GMFN helps loyalty become visible and accountable.",
  },
  {
    id: "sam-011",
    source: "South American Proverb",
    proverb: "Deliver as promised — always.",
    gmfn: "Reliability is one of the strongest signals inside GMFN.",
  },
  {
    id: "sam-012",
    source: "South American Proverb",
    proverb: "Word-of-mouth drives business.",
    gmfn: "GMFN turns spoken reputation into structured reputation.",
  },
  {
    id: "sam-013",
    source: "South American Proverb",
    proverb: "A dependable trader becomes indispensable.",
    gmfn: "Dependability raises your value across the network.",
  },
  {
    id: "sam-014",
    source: "South American Proverb",
    proverb: "Markets reward behavior, not strategy.",
    gmfn: "GMFN measures actions, not just intentions.",
  },
  {
    id: "sam-015",
    source: "South American Proverb",
    proverb: "Relationships sustain business through crisis.",
    gmfn: "GMFN keeps support structured when pressure rises.",
  },
  {
    id: "sam-016",
    source: "South American Proverb",
    proverb: "Trust enables expansion.",
    gmfn: "Visible trust makes expansion safer and faster.",
  },
  {
    id: "sam-017",
    source: "South American Proverb",
    proverb: "Integrity attracts long-term partners.",
    gmfn: "GMFN strengthens the economic value of integrity.",
  },
  {
    id: "sam-018",
    source: "South American Proverb",
    proverb: "Reliability builds financial flexibility.",
    gmfn: "Trust-based flexibility is one of GMFN’s core strengths.",
  },
  {
    id: "sam-019",
    source: "South American Proverb",
    proverb: "Trade grows faster in trusted networks.",
    gmfn: "GMFN is built to strengthen trusted networks at scale.",
  },
  {
    id: "sam-020",
    source: "South American Proverb",
    proverb: "Good conduct multiplies opportunities.",
    gmfn: "Each trust-positive action can open future access.",
  },
  {
    id: "sam-021",
    source: "South American Proverb",
    proverb: "Trust reduces operational cost.",
    gmfn: "Clear trust signals save time, effort, and conflict.",
  },
  {
    id: "sam-022",
    source: "South American Proverb",
    proverb: "Reputation is a shared asset.",
    gmfn: "GMFN treats trust as both personal and communal value.",
  },
  {
    id: "sam-023",
    source: "South American Proverb",
    proverb: "Partnerships require aligned values.",
    gmfn: "GMFN helps communities align support with conduct.",
  },
  {
    id: "sam-024",
    source: "South American Proverb",
    proverb: "Consistency beats quick profit.",
    gmfn: "Long-term trust is worth more than short-term gain.",
  },
  {
    id: "sam-025",
    source: "South American Proverb",
    proverb: "Strong networks create safety.",
    gmfn: "GMFN helps communities create cleaner economic safety nets.",
  },
  {
    id: "sam-026",
    source: "South American Proverb",
    proverb: "Trust turns identity into economic power.",
    gmfn: "That is one of GMFN’s core promises.",
  },
  {
    id: "sam-027",
    source: "South American Proverb",
    proverb: "A reliable circle can carry a member through hardship.",
    gmfn: "GMFN helps communities support one another without chaos.",
  },
  {
    id: "sam-028",
    source: "South American Proverb",
    proverb: "A good name can cross borders before you do.",
    gmfn: "GMFN makes trust more portable across places and markets.",
  },
  {
    id: "sam-029",
    source: "South American Proverb",
    proverb: "Trade survives where confidence survives.",
    gmfn: "GMFN strengthens confidence through visible trust logic.",
  },
  {
    id: "sam-030",
    source: "South American Proverb",
    proverb: "Communities grow stronger when support is orderly.",
    gmfn: "GMFN brings order, visibility, and confidence to shared support.",
  },
];

export function getNextMarketWisdomPair(index: number): MarketWisdomPair {
  if (!MARKET_WISDOM_PAIRS.length) {
    return {
      id: "fallback",
      source: "African Proverb",
      proverb: "Trust grows where people keep their word.",
      gmfn: "GMFN helps communities turn trust into visible economic strength.",
    };
  }

  const safeIndex = Math.abs(index) % MARKET_WISDOM_PAIRS.length;
  return MARKET_WISDOM_PAIRS[safeIndex];
}

function includesAny(text: string, words: string[]): boolean {
  return words.some((word) => text.includes(word));
}

function scoreMarketWisdomPair(
  item: MarketWisdomPair,
  ctx: MarketWisdomContext
): number {
  const text = `${item.proverb} ${item.gmfn}`.toLowerCase();
  let score = 1;

  const hour = Number(ctx.hour ?? 12);
  const unread = Number(ctx.unread ?? 0);
  const pendingRequests = Number(ctx.pendingRequests ?? 0);
  const hasSpotlight = Boolean(ctx.hasSpotlight);
  const hasGmfnId = Boolean(ctx.hasGmfnId);
  const trustTone = ctx.trustTone ?? "neutral";

  if (ctx.previousId && item.id === ctx.previousId) {
    score -= 100;
  }

  if (hour >= 6 && hour < 12) {
    if (
      includesAny(text, [
        "consistency",
        "discipline",
        "deliver",
        "timing",
        "word",
        "predictable",
      ])
    ) {
      score += 4;
    }
  }

  if (hour >= 12 && hour < 18) {
    if (
      includesAny(text, [
        "market",
        "trade",
        "business",
        "merchant",
        "buy",
        "seller",
        "supplier",
        "deal",
      ])
    ) {
      score += 4;
    }
  }

  if (hour >= 18 || hour < 6) {
    if (
      includesAny(text, [
        "community",
        "support",
        "network",
        "loyalty",
        "relationship",
        "together",
      ])
    ) {
      score += 4;
    }
  }

  if (pendingRequests > 0) {
    if (
      includesAny(text, [
        "community",
        "support",
        "people",
        "trust",
        "network",
        "reputation",
      ])
    ) {
      score += 5;
    }
  }

  if (unread >= 3) {
    if (
      includesAny(text, [
        "communicate",
        "clear",
        "word",
        "attention",
        "reputation",
      ])
    ) {
      score += 3;
    }
  }

  if (hasSpotlight) {
    if (
      includesAny(text, [
        "market",
        "merchant",
        "trade",
        "seller",
        "business",
        "buy",
        "shop",
      ])
    ) {
      score += 4;
    }
  }

  if (!hasGmfnId) {
    if (
      includesAny(text, [
        "identity",
        "community",
        "trust",
        "name",
        "reputation",
      ])
    ) {
      score += 4;
    }
  }

  if (trustTone === "red") {
    if (
      includesAny(text, [
        "repay",
        "trust",
        "word",
        "reputation",
        "behavior",
        "integrity",
      ])
    ) {
      score += 6;
    }
  }

  if (trustTone === "yellow") {
    if (
      includesAny(text, [
        "consistency",
        "discipline",
        "support",
        "trust",
        "reliability",
      ])
    ) {
      score += 5;
    }
  }

  if (trustTone === "green") {
    if (
      includesAny(text, [
        "growth",
        "expansion",
        "opportunity",
        "network",
        "trade",
        "capital",
      ])
    ) {
      score += 4;
    }
  }

  score += Math.random() * 0.75;

  return score;
}

export function getSmartMarketWisdomPair(
  ctx: MarketWisdomContext = {}
): MarketWisdomPair {
  if (!MARKET_WISDOM_PAIRS.length) {
    return {
      id: "fallback-smart",
      source: "African Proverb",
      proverb: "Trust grows where people keep their word.",
      gmfn: "GMFN helps communities turn trust into visible economic strength.",
    };
  }

  const scored = MARKET_WISDOM_PAIRS
    .map((item) => ({
      item,
      score: scoreMarketWisdomPair(item, ctx),
    }))
    .sort((a, b) => b.score - a.score);

  const pool = scored
    .slice(0, Math.min(12, scored.length))
    .map((entry) => entry.item)
    .filter((item) => item.id !== ctx.previousId);

  if (pool.length > 0) {
    return pool[Math.floor(Math.random() * pool.length)];
  }

  return scored[0]?.item || MARKET_WISDOM_PAIRS[0];
}