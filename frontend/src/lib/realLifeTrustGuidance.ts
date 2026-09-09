export type RealLifeTrustScenario =
  | "join-request"
  | "pending-approval"
  | "no-community-home"
  | "identity-evidence"
  | "borrowing-readiness"
  | "finance-readiness"
  | "shop-control-readiness"
  | "trust-passport-repair"
  | "marketplace-access"
  | "marketplace-money-readiness"
  | "marketplace-support-readiness"
  | "marketplace-trade-boundary"
  | "marketplace-public-link-readiness"
  | "support-request";

export type RealLifeTrustGuidance = {
  eyebrow: string;
  title: string;
  meaning: string;
  why: string;
  firstStep: string;
  ifSkipped: string;
  boundary: string;
};

type GuidanceVariables = {
  communityName?: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim();
}

function communityLabel(value: unknown): string {
  return clean(value) || "this community";
}

export function getRealLifeTrustGuidance(
  scenario: RealLifeTrustScenario,
  variables: GuidanceVariables = {}
): RealLifeTrustGuidance {
  const communityName = communityLabel(variables.communityName);

  if (scenario === "join-request") {
    return {
      eyebrow: "Real-life meaning",
      title: "Membership is reviewed by people who know the community.",
      meaning:
        "You are asking to be recognized inside a real community, not just opening another app account.",
      why:
        "This protects members, especially people who do not have strong bank records, by letting community knowledge count carefully.",
      firstStep:
        "Use one GSN ID if you already have one, add clear details, then send the request for review.",
      ifSkipped:
        "Unclear or duplicate details can slow approval because the community may not know who is asking to enter.",
      boundary:
        "GSN records evidence and membership status. The community still decides admission.",
    };
  }

  if (scenario === "pending-approval") {
    return {
      eyebrow: "Real-life meaning",
      title: "Your request is waiting for community approval.",
      meaning: `You cannot use ${communityName} as a trusted member space until the review is complete.`,
      why:
        "The waiting step protects the community from unknown entry and protects you from being pushed into the wrong group.",
      firstStep:
        "Check approval status here. If it stays quiet, contact the person who invited you or the community helper.",
      ifSkipped:
        "If the request ID or invite message is lost, GSN may not be able to reopen the exact review from this phone.",
      boundary:
        "Pending review is not rejection and not membership. It is the community decision queue.",
    };
  }

  if (scenario === "no-community-home") {
    return {
      eyebrow: "Real-life meaning",
      title: "Your trust record needs a community home first.",
      meaning:
        "GSN becomes useful when your identity, activity, shop, support, and evidence sit inside a real community context.",
      why:
        "For unbanked and underbanked members, community evidence can explain reliability that a bank file may not show.",
      firstStep:
        "Create a marketplace community, join an existing one, or set up an institution before using deeper tools.",
      ifSkipped:
        "Without a community context, marketplace, finance, and trust actions have weaker meaning and fewer safe permissions.",
      boundary:
        "A community home is evidence context. It is not a loan approval, bank account, or government identity.",
    };
  }

  if (scenario === "identity-evidence") {
    return {
      eyebrow: "Real-life meaning",
      title: "Evidence makes the person easier to recognize.",
      meaning:
        "A phone, photo, official ID, or payout detail helps the community connect one person to one GSN identity.",
      why:
        "Clear identity evidence reduces duplicate records and protects members from mistaken approvals or impersonation.",
      firstStep:
        "Add the strongest evidence you can safely provide now, then continue with the community task.",
      ifSkipped:
        "Weak identity evidence can slow approval, support requests, shop trust, and recovery after a lost phone.",
      boundary:
        "Recorded evidence is not the same as provider verification unless GSN clearly says it has been verified.",
    };
  }

  if (scenario === "borrowing-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Support should start with a clear repayment story.",
      meaning:
        "A support request affects the borrower, supporters, and the community record around them.",
      why:
        "People-backed finance depends on visible responsibility, not hidden promises or pressure.",
      firstStep:
        "Complete identity, purpose, supporter, and repayment details before asking others to stand with you.",
      ifSkipped:
        "A weak request can be declined or delayed because people cannot judge the real risk safely.",
      boundary:
        "GSN is not a lender or bank. It records the support evidence and decision trail.",
    };
  }

  if (scenario === "finance-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Finance here is evidence and coordination, not banking.",
      meaning:
        "Money in, money out, support, repayment, and rail status help people understand what happened and what is still waiting.",
      why:
        "For underbanked members, clean community finance records can explain responsibility that a formal bank file may not show.",
      firstStep:
        "Open one finance lane, check the current status, then complete the missing payment, payout, support, or evidence step.",
      ifSkipped:
        "Unclear finance records can delay support, repayment decisions, shop confidence, and later TrustSlip checks.",
      boundary:
        "GSN is not a bank or lender. It records finance evidence and the decision trail around community money activity.",
    };
  }

  if (scenario === "shop-control-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Protected shop actions depend on identity confidence.",
      meaning:
        "Your public shop, Vault links, Spotlight, and merchant checks all point back to one GSN identity.",
      why:
        "Identity continuity protects buyers, community admins, and the shop owner from mistaken public exposure or impersonation.",
      firstStep:
        "Resolve the identity review first, then return to Shop Control to publish, verify, or share protected shop tools.",
      ifSkipped:
        "Public shop links or paid visibility can attach to a weak identity record and reduce confidence instead of building it.",
      boundary:
        "Shop evidence supports marketplace judgement. It is not delivery, escrow, payment, or legal identity verification.",
    };
  }

  if (scenario === "trust-passport-repair") {
    return {
      eyebrow: "Real-life meaning",
      title: "Repair means strengthening evidence, not editing trust by hand.",
      meaning:
        "A weak Trust Passport usually means identity, membership, support, repayment, or community evidence needs a clearer record.",
      why:
        "This helps people who are known in real life but poorly represented in formal systems build portable evidence safely.",
      firstStep:
        "Read the pressure signal, open the next safe evidence step, and add or confirm only what really happened.",
      ifSkipped:
        "A weak or confusing passport can make outside readers ask for fresh confirmation before work, goods, support, or referral.",
      boundary:
        "Trust Passport is generated from evidence. GSN must not manually rewrite trust or hide past events to make a record look stronger.",
    };
  }

  if (scenario === "marketplace-access") {
    return {
      eyebrow: "Real-life meaning",
      title: "Marketplace access depends on community context.",
      meaning:
        "Listings, shops, demand, and Spotlight work better when people can see where the activity belongs.",
      why:
        "A visible community context helps buyers, sellers, and helpers decide whether an offer is familiar and safe enough.",
      firstStep:
        "Choose the right community, then open the marketplace lane that matches the work you want to do.",
      ifSkipped:
        "Without the right community context, a listing can look unsupported or may not be visible to the right people.",
      boundary:
        "Marketplace evidence supports judgement. It is not a guarantee that every claim is true.",
    };
  }

  if (scenario === "marketplace-money-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Money rails must be clear before people act.",
      meaning:
        "A receiving rail or payout path tells members where money activity belongs and how it can be checked later.",
      why:
        "Clear rails protect members from sending money to the wrong place and help underbanked users keep a visible record.",
      firstStep:
        "Set or check the Money In rail, then confirm the payout or withdrawal path before moving money outside GSN.",
      ifSkipped:
        "Money activity can become hard to verify, and support or repayment evidence may not match the real transaction.",
      boundary:
        "GSN records payment instructions and evidence. It does not hold funds, guarantee transfer, or replace the community's money decision.",
    };
  }

  if (scenario === "marketplace-support-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Support requests need enough evidence before pressure is shared.",
      meaning:
        "A support request asks real people to stand with a borrower, so the amount, reason, repayment plan, and supporters must be visible.",
      why:
        "People-backed support works only when risk is explained clearly and no one is pressured through hidden promises.",
      firstStep:
        "Complete the support draft, check the suggested supporters, then send requests only when the record is ready.",
      ifSkipped:
        "Supporters may decline or delay because they cannot see what they are being asked to back.",
      boundary:
        "GSN records the support evidence and responses. It is not the lender and does not force anyone to guarantee repayment.",
    };
  }

  if (scenario === "marketplace-trade-boundary") {
    return {
      eyebrow: "Real-life meaning",
      title: "Trade evidence should be recorded before goods or money move.",
      meaning:
        "The trade record keeps the item, other side, terms, and outcome in one place so the decision can be checked later.",
      why:
        "This protects buyers and sellers when trust depends on community memory rather than formal paperwork.",
      firstStep:
        "Create the trade record, add the agreed terms, then record delivery, receipt, dispute, or completion as it happens.",
      ifSkipped:
        "If something goes wrong, the community may only have scattered messages instead of a clear evidence trail.",
      boundary:
        "Trade evidence is not escrow, delivery guarantee, payment release authority, or proof that every claim is true.",
    };
  }

  if (scenario === "marketplace-public-link-readiness") {
    return {
      eyebrow: "Real-life meaning",
      title: "Public links should expose only ready, scoped evidence.",
      meaning:
        "Community records, invite links, shop links, and reposts travel outside the app, so they must point to the right public context.",
      why:
        "A scoped link helps outsiders check the current record without seeing private member, payment, or admin information.",
      firstStep:
        "Prepare the link or payment code inside this marketplace, then share only the ready package shown here.",
      ifSkipped:
        "Old, missing, or unsupported links can send people to the wrong place or make the shop/community look less trustworthy.",
      boundary:
        "Public links support verification and access. They do not prove delivery, payment, ownership, or future behaviour by themselves.",
    };
  }

  return {
    eyebrow: "Real-life meaning",
    title: "Ask for help before the block becomes confusion.",
    meaning:
      "A support case tells GSN or the governed admin what stopped you and keeps the conversation in one place.",
    why:
      "Clear support history protects users who may not have another formal record of the problem.",
    firstStep:
      "Choose the closest issue type, write the problem in simple words, and add a screenshot if it helps.",
    ifSkipped:
      "If the problem is only explained outside GSN, the reviewer may not see the full evidence trail.",
    boundary:
      "Support evidence helps review the app problem. It is not identity, payment, or Trust Passport evidence by itself.",
  };
}
