export type RealLifeTrustScenario =
  | "join-request"
  | "pending-approval"
  | "no-community-home"
  | "identity-evidence"
  | "borrowing-readiness"
  | "marketplace-access"
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
