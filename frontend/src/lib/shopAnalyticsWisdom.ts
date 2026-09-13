import {
  buildAttentionSpineSummary,
  type AttentionSpineSignal,
  type AttentionSpineSummary,
  type AttentionSpineUrgency,
} from "./attentionSpine";

export type ShopAnalyticsWisdomTone = "quiet" | "attention" | "warning" | "growth";

export type ShopAnalyticsConfidence = "low" | "medium" | "high";

export type ShopAnalyticsDiagnosisCode =
  | "SHOP_SETUP_GAP"
  | "FOLLOWERS_WAITING"
  | "GATHERING_DATA"
  | "LOW_EXPOSURE"
  | "LOW_VISIT_RATE"
  | "LOW_PRODUCT_CURIOSITY"
  | "LOW_CONTACT_INTENT"
  | "CONTACTS_NOT_PROTECTED"
  | "TRADE_RECORD_PRESSURE"
  | "OUTCOME_EVIDENCE_BUILDING"
  | "STRONG_MOMENTUM";

export type ShopAnalyticsMetrics = {
  possibleReach?: number | null;
  spotlightSeen?: number | null;
  visitors?: number | null;
  productOpens?: number | null;
  contactTaps?: number | null;
  followers?: number | null;
  activeSpotlights?: number | null;
  activeSpotlightAgeHours?: number | null;
  publicItems?: number | null;
  publicSlots?: number | null;
  vaultItems?: number | null;
  vaultSlots?: number | null;
  tradeRecords?: number | null;
  releasedTradeRecords?: number | null;
  paymentClaimedTradeRecords?: number | null;
  receiptConfirmedTradeRecords?: number | null;
  disputeTradeRecords?: number | null;
  unresolvedTradeRecords?: number | null;
};

export type ShopSellerHelper = {
  whatIsHappening: string;
  whyItMatters: string;
  tryFirst: string;
  reassurance: string;
};
export type ShopAnalyticsWisdom = {
  tone: ShopAnalyticsWisdomTone;
  diagnosisCode: ShopAnalyticsDiagnosisCode;
  confidence: ShopAnalyticsConfidence;
  state: string;
  headline: string;
  detail: string;
  observation: string;
  interpretation: string;
  evidence: string[];
  possibleExplanations: string[];
  actions: string[];
  primaryActionLabel: string;
  secondaryActionLabel: string;
  recheckPoint: string;
  why: string;
};

export type OpportunityEngineGuidanceRow = {
  horizon: string;
  insight: string;
  evidence: string;
  nextStep: string;
};

export type ShopOpportunityEngineGuidanceInput = {
  wisdom: ShopAnalyticsWisdom;
  primaryActionLabel?: string | null;
  demandSignalCount?: number | null;
  demandContextLabel?: string | null;
  tradeRecords?: number | null;
  liveSignalCount?: number | null;
  signalGroupCount?: number | null;
  hasAttentionSignal?: boolean;
};

export type ShopOpportunityEngineSignalTile = {
  label: string;
  value: string;
  detail: string;
  live: boolean;
  icon: string;
};

export type ShopOpportunityEngineSignalInput = {
  publicItems?: number | null;
  publicSlots?: number | null;
  spotlightSeen?: number | null;
  activeSpotlights?: number | null;
  demandSignalCount?: number | null;
  tradeRecords?: number | null;
  communityName?: string | null;
  hasCommunityContext?: boolean;
};

export type OpportunityEngineFieldMapItem = {
  area: string;
  status: "Live" | "Next";
  summary: string;
  reads: string;
  opens: string;
  icon: string;
};

export type ShopOpportunityEngineFieldMapInput = {
  hasShopSignals?: boolean;
  hasDemandSignals?: boolean;
  hasTradeEvidence?: boolean;
  hasCommunityContext?: boolean;
  hasAttentionSignal?: boolean;
};

export type OpportunityEngineWisdomSnapshot = {
  title: string;
  headline: string;
  insight: string;
  evidence: string;
  useIn: string;
  cadence: string;
  boundary: string;
};

export type ShopOpportunityEngineWisdomSnapshotInput = {
  wisdom: ShopAnalyticsWisdom;
  guidanceRows: OpportunityEngineGuidanceRow[];
  fieldMap: OpportunityEngineFieldMapItem[];
  liveSignalCount?: number | null;
  signalGroupCount?: number | null;
  demandSignalCount?: number | null;
  tradeRecords?: number | null;
};


export type OpportunityEngineUnitEconomicsReadiness = {
  title: string;
  status: "Not ready" | "Partial" | "Ready to estimate";
  summary: string;
  cacSide: string;
  ltvSide: string;
  currentEvidence: string[];
  missingEvidence: string[];
  nextStep: string;
  boundary: string;
};

export type ShopOpportunityEngineUnitEconomicsInput = {
  visitors?: number | null;
  productOpens?: number | null;
  contactTaps?: number | null;
  followers?: number | null;
  tradeRecords?: number | null;
  releasedTradeRecords?: number | null;
  paymentClaimedTradeRecords?: number | null;
  receiptConfirmedTradeRecords?: number | null;
  demandSignalCount?: number | null;
};


export type OpportunityEngineLensCode =
  | "economic_demand"
  | "social_movement"
  | "trust_safety"
  | "operations"
  | "governance_context";

export type OpportunityEngineLensRow = {
  lens: OpportunityEngineLensCode;
  label: string;
  status: "Live" | "Watch" | "Next";
  reading: string;
  evidence: string;
  nextStep: string;
  boundary: string;
  icon: string;
};

export type ShopOpportunityEngineLensInput = {
  wisdom: ShopAnalyticsWisdom;
  demandSignalCount?: number | null;
  tradeRecords?: number | null;
  liveSignalCount?: number | null;
  signalGroupCount?: number | null;
  hasCommunityContext?: boolean;
  hasAttentionSignal?: boolean;
};


function positiveNumber(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function optionalPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function plural(value: number, singular: string, pluralLabel = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : pluralLabel}`;
}

export function analyticsRate(numerator: unknown, denominator: unknown): number {
  const top = positiveNumber(numerator);
  const bottom = positiveNumber(denominator);
  if (!bottom) return 0;
  return Math.round((top / bottom) * 100);
}

export function formatAnalyticsRate(numerator: unknown, denominator: unknown): string {
  return `${analyticsRate(numerator, denominator)}%`;
}

export function buildShopAnalyticsWisdom(metrics: ShopAnalyticsMetrics): ShopAnalyticsWisdom {
  const possibleReach = positiveNumber(metrics.possibleReach);
  const spotlightSeen = positiveNumber(metrics.spotlightSeen);
  const visitors = positiveNumber(metrics.visitors);
  const productOpens = positiveNumber(metrics.productOpens);
  const contactTaps = positiveNumber(metrics.contactTaps);
  const followers = positiveNumber(metrics.followers);
  const activeSpotlights = positiveNumber(metrics.activeSpotlights);
  const activeSpotlightAgeHours = optionalPositiveNumber(metrics.activeSpotlightAgeHours);
  const publicItems = positiveNumber(metrics.publicItems);
  const publicSlots = positiveNumber(metrics.publicSlots);
  const tradeRecords = positiveNumber(metrics.tradeRecords);
  const releasedTradeRecords = positiveNumber(metrics.releasedTradeRecords);
  const paymentClaimedTradeRecords = positiveNumber(metrics.paymentClaimedTradeRecords);
  const receiptConfirmedTradeRecords = positiveNumber(metrics.receiptConfirmedTradeRecords);
  const disputeTradeRecords = positiveNumber(metrics.disputeTradeRecords);
  const unresolvedTradeRecords = positiveNumber(metrics.unresolvedTradeRecords);
  const exposureRate = analyticsRate(spotlightSeen, possibleReach);
  const visitRate = analyticsRate(visitors, spotlightSeen);
  const productOpenRate = analyticsRate(productOpens, visitors);
  const contactRate = analyticsRate(contactTaps, productOpens || visitors);
  const spotlightIsFresh = activeSpotlightAgeHours !== null && activeSpotlightAgeHours < 6;
  const enoughSpotlightViews = spotlightSeen >= 5;
  const enoughVisitors = visitors >= 3;
  const enoughProductOpens = productOpens >= 3;

  if (publicSlots > 0 && publicItems === 0) {
    return {
      tone: "warning",
      diagnosisCode: "SHOP_SETUP_GAP",
      confidence: "medium",
      state: "Shop setup gap",
      headline: "publish at least one public item first.",
      detail: "People cannot open or contact from empty shop blocks.",
      observation: `Public shop has 0 of ${publicSlots} visible item slots filled.`,
      interpretation: "The shop needs a visible offer before traffic can be judged.",
      evidence: [
        `Public items: 0 / ${publicSlots}`,
        `Visitors recorded: ${visitors}`,
        `Product opens recorded: ${productOpens}`,
      ],
      possibleExplanations: [
        "The shop has not been prepared for public browsing yet.",
        "Spotlight or sharing may send people to an empty shop face.",
      ],
      actions: [
        "Add one clear product picture.",
        "Write a short buyer instruction.",
        "Use Spotlight only after the shop face is readable.",
      ],
      primaryActionLabel: "Add product",
      secondaryActionLabel: "Review later",
      recheckPoint: "After one public item is published.",
      why: "Setup readiness is checked before traffic diagnosis so the system does not blame the audience for an empty shop.",
    };
  }

  if (tradeRecords > 0 && (disputeTradeRecords > 0 || unresolvedTradeRecords > 0)) {
    return {
      tone: "warning",
      diagnosisCode: "TRADE_RECORD_PRESSURE",
      confidence: "high",
      state: "Trade evidence needs attention",
      headline: "follow through the protected trade records first.",
      detail: "Some buyer/seller records need resolution before adding more traffic pressure.",
      observation: `${plural(tradeRecords, "protected trade record")} are linked here; ${plural(unresolvedTradeRecords, "record")} unresolved and ${plural(disputeTradeRecords, "dispute signal")} showing.`,
      interpretation: "The priority is not more promotion yet; it is closing, clarifying, or resolving the existing trade evidence.",
      evidence: [
        `Protected records: ${tradeRecords}`,
        `Released records: ${releasedTradeRecords}`,
        `Payment claimed or recorded: ${paymentClaimedTradeRecords}`,
        `Receipt confirmed: ${receiptConfirmedTradeRecords}`,
      ],
      possibleExplanations: [
        "A buyer or seller step may still be waiting.",
        "Payment, release, receipt, or dispute status may need a clear update.",
      ],
      actions: [
        "Open the protected trade record and update the next evidence step.",
        "Resolve dispute or unclear status before reposting heavily.",
        "Keep buyer communication calm and documented.",
      ],
      primaryActionLabel: "Review trade evidence",
      secondaryActionLabel: "Recheck traffic later",
      recheckPoint: "After the unresolved protected records are updated.",
      why: "Outcome pressure is checked before new promotion because more traffic can make a weak fulfilment loop worse.",
    };
  }

  if (contactTaps > 0 && tradeRecords === 0) {
    return {
      tone: "attention",
      diagnosisCode: "CONTACTS_NOT_PROTECTED",
      confidence: contactTaps >= 3 ? "medium" : "low",
      state: "Intent needs protection",
      headline: "attention is reaching contact, but no protected trade record exists yet.",
      detail: "When a serious buyer conversation starts, move the exchange into protected trade evidence.",
      observation: `${plural(contactTaps, "contact tap")} came from ${plural(productOpens || visitors, "shop action")}, with 0 linked protected trade records in this window.`,
      interpretation: "The shop may be getting buyer intent, but GSN cannot read a real outcome until a protected trade record is created or updated.",
      evidence: [
        `Contact taps: ${contactTaps}`,
        `Product opens: ${productOpens}`,
        "Protected trade records: 0",
      ],
      possibleExplanations: [
        "Contacts may still be at early conversation stage.",
        "A serious exchange may be happening outside GSN without protected evidence.",
      ],
      actions: [
        "Use Protected Trade for serious buyer conversations.",
        "Ask buyers to keep payment and receipt evidence inside the protected flow.",
        "Check whether contact instructions tell buyers what to do next.",
      ],
      primaryActionLabel: "Protect serious trade",
      secondaryActionLabel: "Improve contact",
      recheckPoint: "After the next serious contact or protected trade record.",
      why: "Contact taps are intent signals only; Protected Trade is the existing evidence engine for what happens after contact.",
    };
  }

  if (tradeRecords > 0 && releasedTradeRecords > 0) {
    return {
      tone: "growth",
      diagnosisCode: "OUTCOME_EVIDENCE_BUILDING",
      confidence: "medium",
      state: "Outcome evidence building",
      headline: "attention is beginning to leave protected trade evidence.",
      detail: "This is stronger than views alone, but it still remains evidence, not automatic payment or delivery proof.",
      observation: `${plural(releasedTradeRecords, "protected record")} reached release from ${plural(tradeRecords, "protected trade record")} linked to this shop or seller.`,
      interpretation: "The shop now has a small outcome trail to learn from; repeat the offer/channel that produced serious records while watching fulfilment quality.",
      evidence: [
        `Protected records: ${tradeRecords}`,
        `Released records: ${releasedTradeRecords}`,
        `Receipt confirmed: ${receiptConfirmedTradeRecords}`,
        `Visitors: ${visitors}`,
      ],
      possibleExplanations: [
        "The offer and audience may be finding a workable fit.",
        "The protected flow may be helping the seller keep clearer evidence.",
      ],
      actions: [
        "Repeat the product/channel that produced the protected record.",
        "Ask buyers to confirm receipt where appropriate.",
        "Keep fulfilment notes clear before scaling promotion.",
      ],
      primaryActionLabel: "Repeat what worked",
      secondaryActionLabel: "Review evidence",
      recheckPoint: "After the next protected record or receipt confirmation.",
      why: "Released protected records are outcome evidence, but they still do not prove bank payment, delivery quality, or buyer satisfaction by themselves.",
    };
  }
  if (!activeSpotlights && !possibleReach && !spotlightSeen && !visitors) {
    if (followers > 0) {
      return {
        tone: "attention",
        diagnosisCode: "FOLLOWERS_WAITING",
        confidence: "low",
        state: "Followers waiting",
        headline: "your repeat audience needs a fresh shop signal.",
        detail: "Followers can receive shop updates, but no recent visitor signal has landed yet.",
        observation: `${plural(followers, "follower")} can be notified, but no recent shop attention is recorded.`,
        interpretation: "There is an audience to wake up, but not yet enough activity to judge demand.",
        evidence: [
          `Followers: ${followers}`,
          "Active spotlights: 0",
          "Shop visitors in this window: 0",
        ],
        possibleExplanations: [
          "The shop has not posted a fresh visible update yet.",
          "Followers may not have had a recent reason to return.",
        ],
        actions: [
          "Post one clear product update for followers.",
          "Use Spotlight for the strongest visible item.",
          "Check visitors after followers have had time to react.",
        ],
        primaryActionLabel: "Post update",
        secondaryActionLabel: "Review later",
        recheckPoint: "After a product update or Spotlight has been visible for 24 hours.",
        why: "Followers are treated as repeat audience, not as buyers or sales proof.",
      };
    }

    return {
      tone: "quiet",
      diagnosisCode: "GATHERING_DATA",
      confidence: "low",
      state: "No traffic yet",
      headline: "start with visibility before judging conversion.",
      detail: "The shop has no recent attention signal to learn from yet.",
      observation: "No spotlight reach, impressions, visits, product opens, or contact taps are recorded in this window.",
      interpretation: "The first job is to create a measurable audience signal.",
      evidence: [
        "Spotlight seen: 0",
        "Shop visitors: 0",
        "Contact taps: 0",
      ],
      possibleExplanations: [
        "No current Spotlight or share has sent people to the shop.",
        "The shop may be new or not yet distributed.",
      ],
      actions: [
        "Post one free Spotlight into the community.",
        "Share the public shop link with a clear reason to visit.",
        "Check again after people have had time to see it.",
      ],
      primaryActionLabel: "Create spotlight",
      secondaryActionLabel: "Share shop",
      recheckPoint: "After 24 hours or the first 5 unique viewers.",
      why: "Market Intelligence starts with distribution because zero traffic cannot prove whether products are wanted.",
    };
  }

  if (possibleReach > 0 && (spotlightSeen === 0 || spotlightSeen < 5 || spotlightIsFresh)) {
    return {
      tone: "attention",
      diagnosisCode: "GATHERING_DATA",
      confidence: "low",
      state: "Early signal",
      headline: "distribution is still low; conversion cannot yet be judged.",
      detail: `Only ${spotlightSeen} of ${possibleReach} potential viewers have seen the spotlight so far.`,
      observation: `${plural(spotlightSeen, "person", "people")} saw the spotlight from ${plural(possibleReach, "eligible account")}; ${plural(visitors, "visitor")} reached the shop.`,
      interpretation: "The earliest credible bottleneck is exposure. Product appeal and contact intent need more evidence.",
      evidence: [
        `Exposure rate: ${exposureRate}%`,
        `Seen-to-visit rate: ${formatAnalyticsRate(visitors, spotlightSeen)}`,
        activeSpotlightAgeHours !== null
          ? `Spotlight age: about ${plural(Math.round(activeSpotlightAgeHours), "hour")}`
          : "Spotlight age: not available yet",
      ],
      possibleExplanations: [
        "The spotlight may be too recent.",
        "Many eligible members may not yet have been active.",
        "The audience may need one controlled share or repost before judging product appeal.",
      ],
      actions: [
        "Let the spotlight complete its first observation window.",
        "Share the shop once through a trackable or approved link.",
        "Review product appearance after more real visitors arrive.",
      ],
      primaryActionLabel: "Share shop",
      secondaryActionLabel: "Review later",
      recheckPoint: "After 24 hours or 5 unique spotlight viewers.",
      why: "Small samples are not enough to say products are weak; this rule protects the seller from a false diagnosis.",
    };
  }

  if (possibleReach > 0 && exposureRate < 25) {
    return {
      tone: "attention",
      diagnosisCode: "LOW_EXPOSURE",
      confidence: spotlightSeen >= 5 ? "medium" : "low",
      state: "Low visibility",
      headline: "the shop needs more qualified exposure first.",
      detail: `${exposureRate}% of the potential audience has seen the spotlight in this window.`,
      observation: `${spotlightSeen} of ${possibleReach} eligible accounts have a confirmed spotlight view.`,
      interpretation: "The main issue appears to be distribution or timing before product conversion can be judged.",
      evidence: [
        `Exposure rate: ${exposureRate}%`,
        `Shop visitors: ${visitors}`,
        `Followers: ${followers}`,
      ],
      possibleExplanations: [
        "The spotlight may need another approved placement or better timing.",
        "The eligible audience may not have been active in the selected period.",
      ],
      actions: [
        "Repost at a stronger time if allowed.",
        "Share to approved contacts or channels.",
        "Check visibility before changing the whole offer.",
      ],
      primaryActionLabel: "Repost",
      secondaryActionLabel: "Share shop",
      recheckPoint: "After the next approved repost or after 24 to 48 hours.",
      why: "Distribution is diagnosed before creative or product issues when too few people have seen the offer.",
    };
  }

  if (enoughSpotlightViews && (visitors === 0 || visitRate < 15)) {
    return {
      tone: "warning",
      diagnosisCode: "LOW_VISIT_RATE",
      confidence: "medium",
      state: "Seen, not visiting",
      headline: "people see the spotlight but few enter the shop.",
      detail: "The spotlight may need a clearer reason to open the shop.",
      observation: `${spotlightSeen} spotlight views produced ${visitors} shop visitors.`,
      interpretation: "The image, first line, price cue, or call-to-action may not be clear enough for this audience.",
      evidence: [
        `Seen-to-visit rate: ${visitRate}%`,
        `Spotlight seen: ${spotlightSeen}`,
        `Shop visitors: ${visitors}`,
      ],
      possibleExplanations: [
        "The spotlight image may not show the offer directly.",
        "The first line may not explain the benefit quickly.",
        "The audience may not match this offer.",
      ],
      actions: [
        "Use one clearer product image.",
        "Put the benefit in the first line.",
        "Add a direct invitation to open the shop.",
      ],
      primaryActionLabel: "Improve spotlight",
      secondaryActionLabel: "Preview as buyer",
      recheckPoint: "After the next 5 to 10 unique spotlight viewers.",
      why: "This rule only runs after enough people have actually seen the spotlight.",
    };
  }

  if (visitors > 0 && productOpens === 0) {
    const lowSample = !enoughVisitors;
    return {
      tone: lowSample ? "attention" : "warning",
      diagnosisCode: lowSample ? "GATHERING_DATA" : "LOW_PRODUCT_CURIOSITY",
      confidence: lowSample ? "low" : "medium",
      state: lowSample ? "Too early to judge browsing" : "Visiting, not opening",
      headline: lowSample
        ? "one or two visitors cannot prove product appeal."
        : "visitors are not opening product details yet.",
      detail: lowSample
        ? "Keep measuring before changing the whole shop presentation."
        : "The first shop view or product cards may need clearer information.",
      observation: `${plural(visitors, "visitor")} reached the shop and ${productOpens} product opens were recorded.`,
      interpretation: lowSample
        ? "The sample is too small for a strong product diagnosis."
        : "The shop landing view may not be inviting enough for product exploration.",
      evidence: [
        `Visitors: ${visitors}`,
        `Product open rate: ${productOpenRate}%`,
        `Contact taps: ${contactTaps}`,
      ],
      possibleExplanations: lowSample
        ? [
            "The visitor may not have had enough time or need.",
            "More visits are needed before judging thumbnails or prices.",
          ]
        : [
            "The strongest products may not be first.",
            "Titles, thumbnails, price, location, or availability may not be clear.",
          ],
      actions: lowSample
        ? [
            "Wait for more visitors before changing everything.",
            "Check that the first product cards are readable.",
            "Share once more if visibility is still low.",
          ]
        : [
            "Move the strongest product into the first visible block.",
            "Improve thumbnails, titles, and price cues.",
            "Show availability, location, or delivery information.",
          ],
      primaryActionLabel: lowSample ? "Review later" : "Edit products",
      secondaryActionLabel: "Preview as buyer",
      recheckPoint: lowSample ? "After 3 to 5 unique visitors." : "After the next 5 shop visitors.",
      why: "Product-curiosity advice requires enough visitors; otherwise the system stays cautious.",
    };
  }

  if (productOpens > 0 && contactTaps === 0) {
    return {
      tone: "attention",
      diagnosisCode: "LOW_CONTACT_INTENT",
      confidence: enoughProductOpens ? "medium" : "low",
      state: "Opening, not contacting",
      headline: "interest exists, but contact intent is still weak.",
      detail: "The offer may need clearer price, availability, delivery, or contact instructions.",
      observation: `${productOpens} product opens produced ${contactTaps} contact taps.`,
      interpretation: "People are inspecting products, but the next step may not feel clear or easy enough.",
      evidence: [
        `Product opens: ${productOpens}`,
        `Contact-intent rate: ${contactRate}%`,
        `Visitors: ${visitors}`,
      ],
      possibleExplanations: [
        "Price or availability may be unclear.",
        "Delivery, collection, or location may need clearer wording.",
        "The contact action may need stronger placement or instruction.",
      ],
      actions: [
        "Clarify price, availability, and delivery.",
        "Make the preferred contact method obvious.",
        "Add a short instruction for what the buyer should send.",
      ],
      primaryActionLabel: "Improve contact",
      secondaryActionLabel: "Edit product",
      recheckPoint: "After the next 3 to 5 product opens.",
      why: "Contact taps are only intent signals; no sale is inferred from them.",
    };
  }

  return {
    tone: "growth",
    diagnosisCode: "STRONG_MOMENTUM",
    confidence: contactTaps >= 3 ? "medium" : "low",
    state: "Buyer intent is starting",
    headline: "attention is turning into action.",
    detail: "Contact taps are still only intent signals, but they show the shop is becoming workable.",
    observation: `${contactTaps} contact-intent ${contactTaps === 1 ? "tap has" : "taps have"} been recorded from ${visitors} visitors.`,
    interpretation: "A useful pattern may be starting, but real outcomes still need separate confirmation.",
    evidence: [
      `Visitors: ${visitors}`,
      `Product opens: ${productOpens}`,
      `Contact taps: ${contactTaps}`,
    ],
    possibleExplanations: [
      "The product, audience, or channel may be a good fit.",
      "The contact route may be clear enough for interested people to act.",
    ],
    actions: [
      "Reply quickly to every serious contact.",
      "Keep your strongest product visible.",
      "Record real sales outside analytics when they happen.",
    ],
    primaryActionLabel: "Repeat what worked",
    secondaryActionLabel: "Record outcome later",
    recheckPoint: "After the next contact or seller-confirmed outcome.",
    why: "The system can read attention turning into intent, but it cannot call intent a sale.",
  };
}

export function buildShopSellerHelper(wisdom: ShopAnalyticsWisdom): ShopSellerHelper {
  switch (wisdom.diagnosisCode) {
    case "SHOP_SETUP_GAP":
      return {
        whatIsHappening: "Your shop needs one clear public item before people can decide.",
        whyItMatters: "A visitor cannot buy, ask, or trust the offer if the first item is empty or unclear.",
        tryFirst: "Add one real product with picture, price, and how the buyer should contact or collect.",
        reassurance: "Start with the item you already understand best; the shop can grow one item at a time.",
      };
    case "FOLLOWERS_WAITING":
      return {
        whatIsHappening: "You already have people who chose to follow the shop.",
        whyItMatters: "Followers are the easiest people to wake up because they asked to hear from you first.",
        tryFirst: "Post one simple update about your strongest item and let followers see it before changing everything.",
        reassurance: "A small shop does not need many products first; it needs one clear reason for people to return.",
      };
    case "LOW_EXPOSURE":
      return {
        whatIsHappening: "Too few people are seeing the shop yet.",
        whyItMatters: "You cannot judge your product until enough people in the community have actually seen it.",
        tryFirst: "Share the shop once, or repost the strongest item at a better time if your community allows it.",
        reassurance: "Low traffic is not failure; it often means the shop has not reached enough eyes yet.",
      };
    case "LOW_VISIT_RATE":
      return {
        whatIsHappening: "People see the spotlight, but not enough are entering the shop.",
        whyItMatters: "The first picture or first line may not be giving them a strong reason to open.",
        tryFirst: "Use a clearer product photo, mention the real benefit, and invite people to open the shop.",
        reassurance: "Do not change the whole business yet; improve the first message first.",
      };
    case "LOW_PRODUCT_CURIOSITY":
      return {
        whatIsHappening: "People visit the shop, but they are not opening product details.",
        whyItMatters: "The first visible products must quickly answer: what is it, price, and how can I get it?",
        tryFirst: "Move the strongest item first, improve the thumbnail, and add price or availability cues.",
        reassurance: "This is a shop presentation problem before it is a product failure.",
      };
    case "LOW_CONTACT_INTENT":
      return {
        whatIsHappening: "People inspect products, but they are not contacting yet.",
        whyItMatters: "A buyer may stop if price, delivery, collection, or contact instructions are unclear.",
        tryFirst: "Add the price, say whether pickup or delivery is possible, and tell buyers what to send first.",
        reassurance: "Interest already exists; the next step just needs to feel easier.",
      };
    case "CONTACTS_NOT_PROTECTED":
      return {
        whatIsHappening: "People are reaching contact, but serious trade is not protected yet.",
        whyItMatters: "GSN can only help you learn from real outcomes when serious buyer steps are recorded safely.",
        tryFirst: "Use Protected Trade for the next serious buyer conversation before pushing more promotion.",
        reassurance: "This protects both sides without pretending every contact is already a sale.",
      };
    case "TRADE_RECORD_PRESSURE":
      return {
        whatIsHappening: "Some trade records need follow-up before more promotion.",
        whyItMatters: "More traffic can create more pressure if payment, receipt, release, or dispute steps are unclear.",
        tryFirst: "Open the protected trade records and update the next evidence step first.",
        reassurance: "Cleaning the current records is part of growing a trusted small shop.",
      };
    case "OUTCOME_EVIDENCE_BUILDING":
      return {
        whatIsHappening: "Your shop is starting to leave useful trade evidence.",
        whyItMatters: "This is stronger than views alone, but it still needs careful follow-through.",
        tryFirst: "Repeat the product or channel that produced the protected record, then ask for receipt confirmation where needed.",
        reassurance: "Growth can stay small and steady; repeat what is proving itself.",
      };
    case "STRONG_MOMENTUM":
      return {
        whatIsHappening: "Attention is turning into buyer action.",
        whyItMatters: "Now the seller wins by replying quickly and keeping the strongest offer visible.",
        tryFirst: "Respond to every serious contact, keep your best item first, and record real outcomes when they happen.",
        reassurance: "This is the moment to repeat what worked, not to complicate the shop.",
      };
    case "GATHERING_DATA":
    default:
      return {
        whatIsHappening: "There is not enough activity yet to judge the shop fairly.",
        whyItMatters: "One or two views cannot prove whether people want the product or not.",
        tryFirst: "Share once, let the spotlight breathe, or ask the community what they need before changing everything.",
        reassurance: "Small data should make you patient, not discouraged.",
      };
  }
}
export function buildShopOpportunityEngineFieldMap({
  hasShopSignals,
  hasDemandSignals,
  hasTradeEvidence,
  hasCommunityContext,
  hasAttentionSignal,
}: ShopOpportunityEngineFieldMapInput): OpportunityEngineFieldMapItem[] {
  return [
    {
      area: "Marketplace and Shop Diary",
      status: hasShopSignals || hasAttentionSignal ? "Live" : "Next",
      summary: "Shows what is being offered, opened, shared, and contacted.",
      reads: "Public shelf, Shop Diary media, Spotlight response, share response, and contact taps.",
      opens: "Guides which offers to clarify, repeat, protect, or stop pushing.",
      icon: "marketplace",
    },
    {
      area: "DemandBox",
      status: hasDemandSignals ? "Live" : "Next",
      summary: "Shows stated needs without pretending one request is the whole market.",
      reads: "Open community requests, categories, wording overlap, sensitive-demand filtering, and request status.",
      opens: "Guides whether to respond, ask the community, or validate before stocking more.",
      icon: "briefcase",
    },
    {
      area: "TrustPassport and TrustSlip",
      status: hasTradeEvidence ? "Live" : "Next",
      summary: "Turns serious activity into trust evidence when records exist.",
      reads: "Protected trade records now; TrustPassport, TrustSlip, and Trust Graph are the next deeper inputs.",
      opens: "Guides what must be verified before stronger claims, credit, partnership, or handover decisions.",
      icon: "shield",
    },
    {
      area: "Community Home and Domain",
      status: hasCommunityContext ? "Live" : "Next",
      summary: "Keeps opportunity tied to the real community, not a loose public feed.",
      reads: "Selected community, governed feature state, Community Bulletin, member routes, and domain policies as they connect.",
      opens: "Guides community-level decisions such as what to announce, enable, pause, or hand over.",
      icon: "community",
    },
    {
      area: "People interaction",
      status: "Next",
      summary: "Will connect structured member-to-member signals without becoming an open chat feed.",
      reads: "Tagged DemandBox actions, protected replies, confirmations, follow-through, and role-bound interactions.",
      opens: "Guides who needs a private prompt, record update, confirmation, or governed next action.",
      icon: "user",
    },
    {
      area: "Finance, support, and outside context",
      status: "Next",
      summary: "Will compare internal GSN signals with governed wider context before long-range guidance.",
      reads: "Finance readiness, support patterns, location/community context, and approved external economic or social signals.",
      opens: "Guides paid Advanced Analytics, opportunity warnings, and longer-term planning without making guarantees.",
      icon: "financeInstitution",
    },
  ];
}

export function buildShopOpportunityEngineSignalTiles({
  publicItems,
  publicSlots,
  spotlightSeen,
  activeSpotlights,
  demandSignalCount,
  tradeRecords,
  communityName,
  hasCommunityContext,
}: ShopOpportunityEngineSignalInput): ShopOpportunityEngineSignalTile[] {
  const visiblePublicItems = positiveNumber(publicItems);
  const totalPublicSlots = positiveNumber(publicSlots);
  const spotlightViews = positiveNumber(spotlightSeen);
  const liveSpotlights = positiveNumber(activeSpotlights);
  const openDemandSignals = positiveNumber(demandSignalCount);
  const protectedTradeRecords = positiveNumber(tradeRecords);
  const communityLabel = String(communityName || "Selected community").trim() || "Selected community";

  return [
    {
      label: "Shop and Marketplace",
      value: totalPublicSlots ? `${visiblePublicItems}/${totalPublicSlots} public` : `${visiblePublicItems} public`,
      detail: "Reads visible offers, shop blocks, and public shelf readiness.",
      live: visiblePublicItems > 0,
      icon: "marketplace",
    },
    {
      label: "Spotlight attention",
      value: spotlightViews ? `${spotlightViews} seen` : liveSpotlights ? "Live, gathering" : "Not live",
      detail: "Reads broadcast reach and attention before calling anything a market pattern.",
      live: spotlightViews > 0 || liveSpotlights > 0,
      icon: "megaphone",
    },
    {
      label: "DemandBox",
      value: openDemandSignals ? `${openDemandSignals} open` : "No open signal",
      detail: "Reads request context as evidence of stated need, not proof of buyers or sales.",
      live: openDemandSignals > 0,
      icon: "briefcase",
    },
    {
      label: "Trade evidence",
      value: protectedTradeRecords ? `${protectedTradeRecords} records` : "No records yet",
      detail: "Reads protected outcomes without claiming payment, delivery, or satisfaction proof.",
      live: protectedTradeRecords > 0,
      icon: "document",
    },
    {
      label: "Community context",
      value: communityLabel,
      detail: "Keeps the reading tied to the selected community, not the whole public internet.",
      live: Boolean(hasCommunityContext),
      icon: "community",
    },
    {
      label: "Trust layer",
      value: "Next wiring",
      detail: "Trust Graph, TrustPassport, TrustSlip, member interactions, and outside context are planned inputs for the full engine.",
      live: false,
      icon: "shield",
    },
  ];
}

export function buildShopOpportunityEngineGuidanceRows({
  wisdom,
  primaryActionLabel,
  demandSignalCount,
  demandContextLabel,
  tradeRecords,
  liveSignalCount,
  signalGroupCount,
  hasAttentionSignal,
}: ShopOpportunityEngineGuidanceInput): OpportunityEngineGuidanceRow[] {
  const openDemandSignals = positiveNumber(demandSignalCount);
  const protectedTradeRecords = positiveNumber(tradeRecords);
  const liveSignals = positiveNumber(liveSignalCount);
  const signalGroups = positiveNumber(signalGroupCount);
  const hasDemandSignal = openDemandSignals > 0;
  const hasTradeEvidence = protectedTradeRecords > 0;
  const shortTermInsight = hasDemandSignal
    ? "Repeated requests may show where the community is asking before the shop owner stocks or promotes more."
    : "Without open DemandBox signals, short-term opportunity should come from measured attention, not assumption.";
  const evidenceInsight = hasTradeEvidence
    ? "Protected records may show which offers are becoming real work, but they still need separate fulfilment review."
    : "The engine cannot learn lasting value until protected trade or TrustSlip evidence starts to appear.";
  const longTermInsight = signalGroups > 0 && liveSignals >= 3
    ? "As more GSN signals connect, patterns may become useful for one-year and five-year community planning."
    : "The current field is still thin; long-range guidance must wait for wider TrustPassport, TrustSlip, and interaction history.";

  return [
    {
      horizon: "Now",
      insight: `Current reading: ${wisdom.headline}`,
      evidence: wisdom.observation,
      nextStep: primaryActionLabel || wisdom.primaryActionLabel,
    },
    {
      horizon: "90 days",
      insight: shortTermInsight,
      evidence: hasDemandSignal ? demandContextLabel || `${openDemandSignals} open DemandBox signal${openDemandSignals === 1 ? "" : "s"}` : wisdom.interpretation,
      nextStep: hasDemandSignal ? "Compare DemandBox requests with public offers." : "Keep testing Spotlight and shop share response.",
    },
    {
      horizon: "1 year",
      insight: evidenceInsight,
      evidence: hasTradeEvidence ? `${protectedTradeRecords} protected record${protectedTradeRecords === 1 ? "" : "s"} in this window.` : "No protected trade record is visible in this analytics window.",
      nextStep: hasTradeEvidence ? "Review which records produced repeatable trust." : "Protect serious buyer/seller outcomes when they happen.",
    },
    {
      horizon: "2-5 years",
      insight: longTermInsight,
      evidence: hasAttentionSignal && signalGroups > 0 ? `${liveSignals} of ${signalGroups} signal groups are live today.` : "Attention and trust evidence are still gathering.",
      nextStep: "Use this as guidance, not certainty, until the full GSN field is connected.",
    },
  ];
}

export function buildShopOpportunityEngineWisdomSnapshot({
  wisdom,
  guidanceRows,
  fieldMap,
  liveSignalCount,
  signalGroupCount,
  demandSignalCount,
  tradeRecords,
}: ShopOpportunityEngineWisdomSnapshotInput): OpportunityEngineWisdomSnapshot {
  const liveSignals = positiveNumber(liveSignalCount);
  const signalGroups = positiveNumber(signalGroupCount) || fieldMap.length;
  const openDemandSignals = positiveNumber(demandSignalCount);
  const protectedTradeRecords = positiveNumber(tradeRecords);
  const ninetyDayRow = guidanceRows.find((row) => row.horizon === "90 days") || guidanceRows[1] || guidanceRows[0];
  const liveAreas = fieldMap.filter((item) => item.status === "Live").map((item) => item.area);
  const liveAreaLabel = liveAreas.length ? liveAreas.join(", ") : "no broad live field yet";
  const strongestEvidence = protectedTradeRecords
    ? `${protectedTradeRecords} protected trade record${protectedTradeRecords === 1 ? "" : "s"}`
    : openDemandSignals
      ? `${openDemandSignals} open DemandBox signal${openDemandSignals === 1 ? "" : "s"}`
      : `${liveSignals} of ${signalGroups} signal group${signalGroups === 1 ? "" : "s"} live`;

  return {
    title: "Market Wisdom snapshot feed",
    headline: `Opportunity Engine snapshot: ${wisdom.headline}`,
    insight: ninetyDayRow?.insight || wisdom.interpretation,
    evidence: `${strongestEvidence}; live areas: ${liveAreaLabel}.`,
    useIn: "Feeds a short Market Wisdom or Business Wisdom line after review; full evidence stays in Advanced Analytics.",
    cadence: liveSignals >= 3 || openDemandSignals || protectedTradeRecords
      ? "Review weekly while the pilot is gathering."
      : "Review after the next Spotlight run, DemandBox request, or protected trade record.",
    boundary: "Snapshot only. It is not an automatic decision, sales proof, public trend claim, or command to change products.",
  };
}

export function buildShopOpportunityEngineUnitEconomicsReadiness({
  visitors,
  productOpens,
  contactTaps,
  followers,
  tradeRecords,
  releasedTradeRecords,
  paymentClaimedTradeRecords,
  receiptConfirmedTradeRecords,
  demandSignalCount,
}: ShopOpportunityEngineUnitEconomicsInput): OpportunityEngineUnitEconomicsReadiness {
  const shopVisitors = positiveNumber(visitors);
  const productInterest = positiveNumber(productOpens);
  const contactIntent = positiveNumber(contactTaps);
  const repeatAudience = positiveNumber(followers);
  const protectedRecords = positiveNumber(tradeRecords);
  const releasedRecords = positiveNumber(releasedTradeRecords);
  const paymentSignals = positiveNumber(paymentClaimedTradeRecords);
  const receiptSignals = positiveNumber(receiptConfirmedTradeRecords);
  const demandSignals = positiveNumber(demandSignalCount);
  const outcomeSignals = releasedRecords + paymentSignals + receiptSignals;
  const hasAcquisitionTrail = shopVisitors > 0 || productInterest > 0 || contactIntent > 0 || repeatAudience > 0;
  const hasOutcomeTrail = protectedRecords > 0 || outcomeSignals > 0;
  const status: OpportunityEngineUnitEconomicsReadiness["status"] = hasAcquisitionTrail && hasOutcomeTrail
    ? "Ready to estimate"
    : hasAcquisitionTrail || hasOutcomeTrail || demandSignals > 0
      ? "Partial"
      : "Not ready";

  return {
    title: "CAC/LTV readiness",
    status,
    summary: status === "Ready to estimate"
      ? "GSN has early acquisition and outcome evidence, but still needs cost and repeat-value records before a real CAC/LTV ratio."
      : status === "Partial"
        ? "GSN has part of the signal trail, but not enough to compare customer acquisition cost against lifetime value."
        : "GSN cannot estimate CAC/LTV until traffic, cost, outcome, and repeat-customer evidence exist.",
    cacSide: hasAcquisitionTrail
      ? `${shopVisitors} visitors, ${productInterest} product opens, ${contactIntent} contact taps, and ${repeatAudience} followers can describe attention and intent.`
      : "No acquisition trail yet. CAC needs tracked outreach cost, channel, visits, contact intent, and owner effort.",
    ltvSide: hasOutcomeTrail
      ? `${protectedRecords} protected records, ${releasedRecords} releases, ${paymentSignals} payment signals, and ${receiptSignals} receipt confirmations can begin the value trail.`
      : "No value trail yet. LTV needs completed outcomes, repeat purchases, retention, margin, support cost, and trust evidence.",
    currentEvidence: [
      `Acquisition signals: ${shopVisitors + productInterest + contactIntent + repeatAudience}`,
      `Outcome signals: ${protectedRecords + outcomeSignals}`,
      `DemandBox signals: ${demandSignals}`,
    ],
    missingEvidence: [
      "Paid or effort cost by channel before a true CAC calculation.",
      "Completed sale value, margin, repeat purchase, and retention before a true LTV calculation.",
      "Enough records over time to avoid treating one contact or one sale as a business model.",
    ],
    nextStep: hasAcquisitionTrail
      ? "Start recording the cost or effort behind each promoted channel, then connect serious outcomes to Protected Trade or TrustSlip evidence."
      : "Create one measurable visibility path first, then record whether it produces contact and protected outcomes.",
    boundary: "Readiness only. This is not CAC, not LTV, not ROI, not profit, and not investor-grade unit economics yet.",
  };
}


export function buildShopOpportunityEngineLensRows({
  wisdom,
  demandSignalCount,
  tradeRecords,
  liveSignalCount,
  signalGroupCount,
  hasCommunityContext,
  hasAttentionSignal,
}: ShopOpportunityEngineLensInput): OpportunityEngineLensRow[] {
  const openDemandSignals = positiveNumber(demandSignalCount);
  const protectedTradeRecords = positiveNumber(tradeRecords);
  const liveSignals = positiveNumber(liveSignalCount);
  const signalGroups = positiveNumber(signalGroupCount);
  const hasDemand = openDemandSignals > 0;
  const hasTrade = protectedTradeRecords > 0;
  const hasWideSignal = liveSignals >= 3;

  return [
    {
      lens: "economic_demand",
      label: "Economic demand",
      status: hasDemand ? "Live" : hasAttentionSignal ? "Watch" : "Next",
      reading: hasDemand
        ? "Visible requests may show what people are asking for before supply catches up."
        : "No direct DemandBox pressure is visible yet, so economic reading must stay cautious.",
      evidence: hasDemand ? `${openDemandSignals} open DemandBox signal${openDemandSignals === 1 ? "" : "s"}.` : wisdom.observation,
      nextStep: hasDemand ? "Compare requests with public shop offers before changing stock." : "Use Spotlight and public offers to gather demand evidence first.",
      boundary: "Demand is a signal, not guaranteed buyers, sales, or lifetime value.",
      icon: "marketplace",
    },
    {
      lens: "social_movement",
      label: "Social movement",
      status: hasCommunityContext ? "Live" : "Next",
      reading: hasCommunityContext
        ? "The reading is tied to one selected community instead of the whole internet."
        : "Community context is missing, so social movement cannot be read properly yet.",
      evidence: hasCommunityContext ? `${liveSignals} of ${signalGroups || 1} local signal group${(signalGroups || 1) === 1 ? "" : "s"} live.` : "No selected community context is available.",
      nextStep: "Keep readings community-scoped before comparing behaviour across wider GSN areas.",
      boundary: "This is not a public popularity claim or demographic conclusion.",
      icon: "community",
    },
    {
      lens: "trust_safety",
      label: "Trust and safety",
      status: hasTrade ? "Live" : "Watch",
      reading: hasTrade
        ? "Protected records can begin to show whether attention is becoming real accountable activity."
        : "Trust evidence is still thin until TrustSlip and protected trade outcomes accumulate.",
      evidence: hasTrade ? `${protectedTradeRecords} protected trade record${protectedTradeRecords === 1 ? "" : "s"}.` : "No protected trade record is visible in this analytics window.",
      nextStep: hasTrade ? "Review outcomes before increasing promotion." : "Protect serious buyer/seller outcomes when they happen.",
      boundary: "Trust reading is evidence guidance, not approval, guarantee, or risk removal.",
      icon: "shield",
    },
    {
      lens: "operations",
      label: "Operations",
      status: hasAttentionSignal ? "Live" : "Watch",
      reading: hasAttentionSignal
        ? "Attention data can guide the next small operating adjustment."
        : "Operations should not be changed heavily before the next measured attention signal.",
      evidence: hasWideSignal ? `${liveSignals} of ${signalGroups} Opportunity Engine signals are live.` : wisdom.interpretation,
      nextStep: wisdom.primaryActionLabel,
      boundary: "Operational advice remains a test suggestion, not certainty.",
      icon: "spark",
    },
    {
      lens: "governance_context",
      label: "Governance and outside context",
      status: "Next",
      reading: "Policy, events, health, school, church, association, and local outside-context signals are not connected to this pilot slice yet.",
      evidence: "Current slice only reads governed in-GSN activity already visible to this analytics panel.",
      nextStep: "Add approved external-context inputs only after privacy, source, and governance rules are defined.",
      boundary: "No political, health, legal, or external-market conclusion is being made here.",
      icon: "document",
    },
  ];
}


function urgencyForShopMarketIntelligence(
  wisdom: ShopAnalyticsWisdom
): AttentionSpineUrgency {
  if (wisdom.diagnosisCode === "SHOP_SETUP_GAP") return "red";
  if (wisdom.diagnosisCode === "GATHERING_DATA" || wisdom.diagnosisCode === "STRONG_MOMENTUM") {
    return "green";
  }
  return "yellow";
}

export function buildShopMarketIntelligenceSignal(
  wisdom: ShopAnalyticsWisdom,
  actionTo: string
): AttentionSpineSignal {
  const urgency = urgencyForShopMarketIntelligence(wisdom);
  return {
    id: `shop-market-intelligence-${wisdom.diagnosisCode.toLowerCase()}`,
    source: "market_wisdom",
    scope: "personal",
    kind: urgency === "green" ? "condition" : "action",
    urgency,
    summary: wisdom.headline,
    detail: `${wisdom.observation} ${wisdom.interpretation}`,
    actionLabel: wisdom.primaryActionLabel,
    actionTo,
    groupLabel: "Shop Market Intelligence",
    countInPulse: urgency !== "green",
    sortBoost: wisdom.confidence === "high" ? 3 : wisdom.confidence === "medium" ? 2 : 1,
    meta: {
      diagnosisCode: wisdom.diagnosisCode,
      confidence: wisdom.confidence,
      recheckPoint: wisdom.recheckPoint,
      engine: "attention_spine_configured_market_intelligence",
    },
  };
}

export function buildShopMarketIntelligenceSummary(
  wisdom: ShopAnalyticsWisdom,
  actionTo: string
): AttentionSpineSummary {
  return buildAttentionSpineSummary([buildShopMarketIntelligenceSignal(wisdom, actionTo)], {
    quietHeadline: wisdom.state,
    quietDetail: wisdom.detail,
  });
}
