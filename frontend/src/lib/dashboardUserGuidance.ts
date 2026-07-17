export type DashboardGuidanceTone = "green" | "yellow" | "red" | "neutral";

export type DashboardGuidanceReadingState = {
  classText: string;
  postureSource: string;
  tone: DashboardGuidanceTone;
  statusText: string;
  whyText: string;
};

export type DashboardGuidanceUserClass =
  | "repair"
  | "approval"
  | "setup"
  | "seller"
  | "demand"
  | "steady";

export type DashboardGuidanceRouteRef = {
  key: string;
  label: string;
};

export type DashboardNextRouteCopy = {
  badge: string;
  title: string;
  detail: string;
  issueText: string;
  consequenceText: string;
  actionText: string;
  supportHint: string;
};

export type DashboardTrustExplainer = {
  helps?: string[];
  weakens?: string[];
  next?: string[];
};

export type DashboardTrustNoticeCopy = {
  title: string;
  detail: string;
  ctaLabel: string;
  ctaRouteKey: "trust" | "cci" | "trust-slip";
  bucket: "actNow" | "dueSoon";
};

export type DashboardTrustJourneyCopy = {
  helpingText: string;
  careText: string;
  connectionItems: Array<{
    key: "trust" | "cci" | "trust-slip" | "focus" | "trust-passport";
    title: string;
    detail: string;
  }>;
  connectionSummary: string;
};

export type DashboardTrustAttentionCore = {
  helpingText: string;
  careText: string;
  problemText: string;
  consequenceText: string;
  actionText: string;
  connectionText: string;
};

function cleanText(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function normalizeMatchText(value: string): string {
  return ` ${cleanText(value).toLowerCase()} `;
}

function containsAnyToken(text: string, tokens: string[]): boolean {
  return tokens.some((token) => text.includes(token.toLowerCase()));
}

function withCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

function toSentence(value: string): string {
  const trimmed = cleanText(value).replace(/^[,;:\-.\s]+/, "");
  if (!trimmed) return "";

  const sentence = trimmed[0].toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(sentence) ? sentence : `${sentence}.`;
}

function toPlainLanguage(value: string): string {
  let text = cleanText(value);
  if (!text) return "";

  const replacements: Array<[RegExp, string]> = [
    [/current community reading/gi, "what people in your community are seeing"],
    [/community reading/gi, "what people in your community are seeing"],
    [/trust reading/gi, "trust"],
    [/trust position/gi, "trust"],
    [/cross-community integrity/gi, "how people outside your community see you"],
    [/integrity reading/gi, "how people outside your community see you"],
    [/integrity pressure/gi, "a problem with how people outside your community see you"],
    [/verification record/gi, "verification"],
    [/standing/gi, "how people see you"],
    [/pressure/gi, "a problem"],
    [/repair step/gi, "fix"],
    [/repair/gi, "fix"],
    [/follow-through/gi, "keeping your word"],
    [/recent visible participation/gi, "recent activity people can see"],
    [/visible participation/gi, "activity people can see"],
    [/visible gap/gi, "clear gap"],
    [/visible record/gi, "record people can see"],
    [/visible target/gi, "target people can see"],
    [/visible follow-through/gi, "follow-through people can see"],
    [/visible/gi, "easy to see"],
    [/response discipline/gi, "how you answer people"],
    [/drifts into pressure/gi, "gets worse"],
    [/drift into pressure/gi, "get worse"],
    [/drift/gi, "slip"],
    [/exposure/gi, "more public activity"],
    [/borrow(?:ing)?/gi, "asking for support"],
    [/caution signal/gi, "warning sign"],
    [/signal/gi, "issue"],
    [/discipline/gi, "habit"],
    [/promptly/gi, "quickly"],
    [/consistent/gi, "steady"],
    [/consistency/gi, "steady action"],
    [/integrity/gi, "identity"],
    [/cross-community/gi, "outside your community"],
    [/passport/gi, "record"],
    [/queue/gi, "list"],
    [/act-now/gi, "important"],
    [/follow up/gi, "come back"],
    [/follow-up/gi, "coming back"],
  ];

  for (const [pattern, replacement] of replacements) {
    text = text.replace(pattern, replacement);
  }

  return cleanText(
    text
      .replace(/\b(there is|there are)\s+a problem\b/gi, "there is a problem")
      .replace(/\ba problem that needs attention\b/gi, "a problem")
      .replace(/\bneeds action and fix\b/gi, "needs to be fixed")
      .replace(/\bneeds urgent improvement\b/gi, "needs to be fixed now")
      .replace(/\bshows a problem that needs attention\b/gi, "shows a problem")
      .replace(/\bsuggests some areas need attention\b/gi, "shows something still needs to be fixed")
      .replace(/\bis being prepared\b/gi, "is not ready yet")
  );
}

function firstUseful(items: Array<string | undefined | null>): string {
  for (const item of items) {
    const text = cleanText(String(item || ""));
    if (text) return text;
  }
  return "";
}

function firstUsefulPlain(items: Array<string | undefined | null>): string {
  for (const item of items) {
    const text = toPlainLanguage(String(item || ""));
    if (text) return text;
  }
  return "";
}

function firstSpecificPlain(items: Array<string | undefined | null>): string {
  const genericTokens = [
    "needs attention",
    "at risk",
    "stable and growing",
    "strong in your current community",
    "healthy across visible communities",
    "what people in your community are seeing",
    "how people outside your community see you",
    "is not ready yet",
    "a problem",
  ];

  for (const item of items) {
    const text = toPlainLanguage(String(item || ""));
    if (!text) continue;

    const normalized = normalizeMatchText(text);
    if (text.length < 18) continue;
    if (genericTokens.some((token) => normalized.includes(token))) continue;
    return text;
  }

  return "";
}

function buildRepairSpecificGuidance(params: {
  pendingRequestsCount: number;
  urgentDemandCount: number;
  actNowCount: number;
  openTrust: DashboardGuidanceReadingState;
  cci: DashboardGuidanceReadingState;
  trustSlipCode: string;
  primaryLabel: string;
  trustExplainer?: DashboardTrustExplainer | null;
}): {
  issueText: string;
  actionText: string;
  detailText: string;
} {
  const routeLabel = cleanText(params.primaryLabel) || "Trust";
  const bothUnderPressure =
    params.openTrust.tone === "red" && params.cci.tone === "red";
  const weakens = (params.trustExplainer?.weakens || []).map((item) =>
    toPlainLanguage(item || "")
  );
  const nextSteps = (params.trustExplainer?.next || []).map((item) =>
    toPlainLanguage(item || "")
  );
  const issueCandidates = [
    params.openTrust.tone === "red" ? params.openTrust.whyText : "",
    params.cci.tone === "red" ? params.cci.whyText : "",
    ...weakens,
  ]
    .map((item) => toPlainLanguage(item || ""))
    .filter(Boolean);
  const specificIssue = firstSpecificPlain(issueCandidates);
  const specificAction = firstSpecificPlain(nextSteps);
  const combined = normalizeMatchText(
    [...issueCandidates, ...nextSteps].join(" ")
  );

  if (
    containsAnyToken(combined, [
      "verification",
      "verify",
      "trust slip",
      "trustslip",
      "identity check",
      "identity",
      "document",
      "record",
      "id card",
      "passport",
    ])
  ) {
    return {
      detailText: "Finish the missing identity and verification step first.",
      issueText: !cleanText(params.trustSlipCode)
        ? "Your verification is still missing or not complete."
        : "Your identity or verification step is still not complete.",
      actionText:
        specificAction ||
        `Open ${routeLabel} now and finish the missing identity or verification step.`,
    };
  }

  if (
    params.pendingRequestsCount > 0 &&
    containsAnyToken(combined, ["request", "approve", "approval", "join"])
  ) {
    return {
      detailText: "People are waiting for your answer first.",
      issueText: `${withCount(params.pendingRequestsCount, "request")} ${
        params.pendingRequestsCount === 1 ? "is" : "are"
      } still waiting for your answer.`,
      actionText:
        specificAction ||
        `Open ${routeLabel} now, then answer ${params.pendingRequestsCount === 1 ? "that request" : "those requests"} so nobody stays waiting.`,
    };
  }

  if (
    containsAnyToken(combined, [
      "notification",
      "message",
      "reply",
      "respond",
      "response",
      "unread",
      "inbox",
      "list",
    ])
  ) {
    return {
      detailText: "Your delayed reply is part of the problem.",
      issueText: "You still have messages or notifications waiting for your reply.",
      actionText:
        specificAction ||
        `Open ${routeLabel} now, then reply to the message or notification still waiting.`,
    };
  }

  if (
    params.urgentDemandCount > 0 ||
    containsAnyToken(combined, [
      "demand",
      "support",
      "loan",
      "asking for support",
      "repayment",
      "need",
      "help",
    ])
  ) {
    const urgentText =
      params.urgentDemandCount > 0
        ? `${withCount(params.urgentDemandCount, "urgent request")} ${
            params.urgentDemandCount === 1 ? "still needs" : "still need"
          } your answer.`
        : "A request for help is still waiting for your answer.";

    return {
      detailText: "A waiting need is part of what is hurting confidence.",
      issueText: urgentText,
      actionText:
        specificAction ||
        `Open ${routeLabel} now, then answer the request for help that is still waiting.`,
    };
  }

  if (
    containsAnyToken(combined, [
      "keeping your word",
      "promise",
      "delay",
      "late",
      "slip",
      "unfinished",
      "missed",
      "follow",
    ])
  ) {
    return {
      detailText: "An unfinished step is now hurting trust.",
      issueText:
        specificIssue ||
        "You started something important, but the follow-up is still missing.",
      actionText:
        specificAction ||
        `Open ${routeLabel} now and finish the step you left undone.`,
    };
  }

  if (specificIssue) {
    return {
      detailText: bothUnderPressure
        ? "Both trust and identity are being affected right now."
        : params.openTrust.tone === "red"
        ? "This is affecting how people in your community see you."
        : "This is affecting how people outside your community see you.",
      issueText: toSentence(specificIssue),
      actionText:
        specificAction ||
        `Open ${routeLabel} now and clear the first problem still marked for action.`,
    };
  }

  return {
    detailText: bothUnderPressure
      ? "Something important is hurting both trust and identity right now."
      : params.openTrust.tone === "red"
      ? "Something in your community view needs to be fixed first."
      : "Something in your wider identity view needs to be fixed first.",
    issueText: bothUnderPressure
      ? "Something you left unattended is now hurting both trust and identity."
      : params.openTrust.tone === "red"
      ? "Something is making people in your community less sure about you right now."
      : "Something is making people outside your community more careful with you right now.",
    actionText:
      specificAction ||
      `Open ${routeLabel} now and fix the first problem still marked for action.`,
  };
}

export function getDashboardRouteSurfaceLabel(
  route: DashboardGuidanceRouteRef
): string {
  if (route.key === "trust") return "Trust";
  if (route.key === "cci") return "Identity";
  if (route.key === "trust-slip") return "Verification";
  if (route.key === "notifications") return "Notifications";
  if (route.key === "join-requests") return "Requests";
  if (route.key === "demand-box") return "Demand";
  if (route.key === "guide") return "Guide";
  if (route.key === "shop") return "Shop";
  return cleanText(route.label).replace(/^Open\s+/i, "") || "Open";
}

export function buildDashboardNextRouteCopy(params: {
  userClass: DashboardGuidanceUserClass;
  pendingRequestsCount: number;
  urgentDemandCount: number;
  actNowCount: number;
  openTrust: DashboardGuidanceReadingState;
  cci: DashboardGuidanceReadingState;
  trustSlipCode: string;
  primaryLabel: string;
  trustExplainer?: DashboardTrustExplainer | null;
}): DashboardNextRouteCopy {
  if (params.userClass === "repair") {
    const bothUnderPressure =
      params.openTrust.tone === "red" && params.cci.tone === "red";
    const repairGuidance = buildRepairSpecificGuidance(params);

    return {
      badge: "Needs fixing",
      title: "Fix this first",
      detail: repairGuidance.detailText,
      issueText: toSentence(repairGuidance.issueText),
      consequenceText: bothUnderPressure
        ? "If you leave this, people may hold back, delay, or refuse to help you."
        : params.openTrust.tone === "red"
        ? "If you leave this, people in your community may stop trusting your actions."
        : "If you leave this, people outside your community may become careful with you.",
      actionText: toSentence(repairGuidance.actionText),
      supportHint: "More help shows the extra pages around this trust step.",
    };
  }

  if (params.userClass === "approval") {
    return {
      badge: "Requests waiting",
      title: "Answer these first",
      detail: `${params.pendingRequestsCount} join request${
        params.pendingRequestsCount === 1 ? "" : "s"
      } ${params.pendingRequestsCount === 1 ? "is" : "are"} waiting. Clearing this helps people move without delay.`,
      issueText: `${params.pendingRequestsCount} join request${
        params.pendingRequestsCount === 1 ? "" : "s"
      } ${params.pendingRequestsCount === 1 ? "is" : "are"} waiting for your decision.`,
      consequenceText:
        "If you leave them waiting, people stay stuck and your community slows down.",
      actionText: `Open ${params.primaryLabel} now and approve, reject, or review each request.`,
      supportHint: "More help shows the pages around this approval step.",
    };
  }

  if (params.userClass === "setup") {
    return {
      badge: "Not complete",
      title: "Finish this first",
      detail:
        "Complete your verification and basics first so the rest of the app works more smoothly.",
      issueText: params.trustSlipCode
        ? "Your setup is still not complete yet."
        : "Your verification is not ready yet.",
      consequenceText:
        "If you leave it like this, some parts of the app may stay limited or weaker.",
      actionText:
        toSentence(
          firstUsefulPlain(params.trustExplainer?.next || []) ||
            `Open ${params.primaryLabel} now and finish the missing details or checks first.`
        ),
      supportHint: "More help shows the pages that can guide this setup step.",
    };
  }

  if (params.userClass === "demand") {
    return {
      badge: "Act now",
      title: "Check this now",
      detail:
        params.urgentDemandCount > 0
          ? `${params.urgentDemandCount} urgent demand signal${
              params.urgentDemandCount === 1 ? "" : "s"
            } need attention now.`
          : `${params.actNowCount} action signal${
              params.actNowCount === 1 ? "" : "s"
            } ${params.actNowCount === 1 ? "is" : "are"} waiting now.`,
      issueText:
        params.urgentDemandCount > 0
          ? `There ${params.urgentDemandCount === 1 ? "is" : "are"} ${params.urgentDemandCount} urgent demand signal${
              params.urgentDemandCount === 1 ? "" : "s"
            } waiting for attention.`
          : `There ${params.actNowCount === 1 ? "is" : "are"} ${params.actNowCount} active signal${
              params.actNowCount === 1 ? "" : "s"
            } waiting for review.`,
      consequenceText:
        "If you leave it too long, the need may pass, grow, or hurt trust.",
      actionText:
        params.urgentDemandCount > 0
          ? `Open ${params.primaryLabel} now and answer the urgent request first.`
          : `Open ${params.primaryLabel} now and answer the item that is still waiting.`,
      supportHint: "More help shows the pages around this demand step.",
    };
  }

  if (params.userClass === "seller") {
    return {
      badge: "Start from shop",
      title: "Start from your shop",
      detail:
        "If people are seeing your goods or services, begin from your shop so your pages stay aligned.",
      issueText:
        "People may be seeing your goods or services, so your main seller page should be clear and ready first.",
      consequenceText:
        "If your page is not clear, people may move on or doubt what they see.",
      actionText: `Open ${params.primaryLabel} now and make sure people can clearly see what you sell and why they should trust it.`,
      supportHint: "More help shows the pages around this selling step.",
    };
  }

  return {
    badge: "Next step",
    title: "Check your queue first",
    detail:
      "Nothing urgent is blocking you now. Start with the organised queue and move from there.",
    issueText:
      "Nothing urgent is blocking you right now, but you still have items waiting for attention.",
    consequenceText:
      "If you ignore your notifications, small matters can build up.",
    actionText: `Open ${params.primaryLabel} now and clear the next small item waiting for you.`,
    supportHint: "More help shows the extra pages around this next step.",
  };
}

export function buildDashboardTrustNoticeCopy(params: {
  openTrust: DashboardGuidanceReadingState;
  cci: DashboardGuidanceReadingState;
  trustSlipCode: string;
  trustExplainer?: DashboardTrustExplainer | null;
}): DashboardTrustNoticeCopy | null {
  if (params.openTrust.tone === "red" || params.cci.tone === "red") {
    const trustPrimary = params.openTrust.tone === "red";
    const repairGuidance = buildRepairSpecificGuidance({
      pendingRequestsCount: 0,
      urgentDemandCount: 0,
      actNowCount: 0,
      openTrust: params.openTrust,
      cci: params.cci,
      trustSlipCode: params.trustSlipCode,
      primaryLabel: trustPrimary ? "Trust" : "Identity",
      trustExplainer: params.trustExplainer,
    });

    return {
      title: trustPrimary ? "Trust needs attention now" : "Identity check needs attention now",
      detail: toSentence(repairGuidance.issueText),
      ctaLabel: trustPrimary ? "Open trust status" : "Open identity check",
      ctaRouteKey: trustPrimary ? "trust" : "cci",
      bucket: "actNow",
    };
  }

  if (!cleanText(params.trustSlipCode)) {
    return {
      title: "Verification is not ready yet",
      detail:
        "Your verification record is still missing or incomplete. Some parts of the app may stay limited until it is ready.",
      ctaLabel: "Open Verification",
      ctaRouteKey: "trust-slip",
      bucket: "dueSoon",
    };
  }

  if (params.openTrust.tone === "yellow" || params.cci.tone === "yellow") {
    const trustPrimary = params.openTrust.tone === "yellow";
    const source = trustPrimary ? params.openTrust : params.cci;
    const weakenText = firstUseful(params.trustExplainer?.weakens || []);

    return {
      title: trustPrimary ? "Trust should be checked soon" : "Identity check should be reviewed soon",
      detail: firstUseful([
        toPlainLanguage(source.whyText),
        weakenText,
        trustPrimary
          ? "Your trust position is still okay, but some areas need attention before they get worse."
          : "Your wider identity position is still okay, but some areas need attention before they get worse.",
      ]),
      ctaLabel: trustPrimary ? "Open trust status" : "Open identity check",
      ctaRouteKey: trustPrimary ? "trust" : "cci",
      bucket: "dueSoon",
    };
  }

  return null;
}

export function buildDashboardTrustAttentionCore(params: {
  openTrust: DashboardGuidanceReadingState;
  cci: DashboardGuidanceReadingState;
  trustSlipCode: string;
  trustExplainer?: DashboardTrustExplainer | null;
  pendingRequestsCount: number;
  unreadCount: number;
  actNowCount: number;
  urgentDemandCount: number;
  focusBehindCount: number;
  focusWatchCount: number;
  focusOnTrackCount: number;
  focusCompletedCount: number;
  primaryLabel?: string;
}): DashboardTrustAttentionCore {
  const routeLabel = cleanText(params.primaryLabel || "Trust") || "Trust";
  const nextPlain = firstSpecificPlain(params.trustExplainer?.next || []);
  const specificHelp = firstSpecificPlain(params.trustExplainer?.helps || []);
  const specificCare = firstSpecificPlain([
    params.openTrust.whyText,
    params.cci.whyText,
    ...(params.trustExplainer?.weakens || []),
  ]);
  const bothUnderPressure =
    params.openTrust.tone === "red" && params.cci.tone === "red";
  const baseConnectionText =
    "Focus shows visible follow-through. Local trust shows how your community reads it. Cross-community consistency shows how people outside your community may read the same behaviour. TrustSlip is the record they may later check when they want supporting evidence.";

  let helpingText = "";

  if (params.focusCompletedCount > 0) {
    helpingText = `${withCount(
      params.focusCompletedCount,
      "finished target"
    )} in Focus Commitments ${
      params.focusCompletedCount === 1 ? "is" : "are"
    } helping trust because people can see that you finish what you start. This also supports cross-community consistency because people outside your community can see steady follow-through.`;
  } else if (params.focusOnTrackCount > 0) {
    helpingText = `${withCount(params.focusOnTrackCount, "target")} ${
      params.focusOnTrackCount === 1 ? "is" : "are"
    } on track in Focus Commitments. That helps trust because people can see you are keeping your word, and it also helps your wider consistency stay steady.`;
  } else if (specificHelp) {
    helpingText = `${toSentence(
      specificHelp
    )} This is helping trust in your community and also helping your wider consistency look steadier outside your community.`;
  } else if (
    params.pendingRequestsCount === 0 &&
    params.unreadCount === 0 &&
    params.actNowCount === 0 &&
    cleanText(params.trustSlipCode)
  ) {
    helpingText =
      "You do not have waiting requests or unread alerts building up right now. That helps trust because people are not being left hanging, and it keeps your wider identity steadier too.";
  } else {
    helpingText =
      "Any clear follow-through you keep visible here helps trust grow. When people can see your actions matching your word, both local trust and wider consistency become stronger.";
  }

  if (!cleanText(params.trustSlipCode)) {
    return {
      helpingText,
      careText:
        "Your TrustSlip is still pending. Until it is ready, people cannot see your verification clearly, and that can hold back both trust and wider identity confidence.",
      problemText: "Your TrustSlip is still pending or not complete.",
      consequenceText:
        "When your trust record is not ready, people cannot see your verification clearly. That can hold back trust in your community and also weaken your wider consistency outside your community.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and finish the missing verification step.`,
      connectionText: `${baseConnectionText} Right now the missing part is TrustSlip, so even if some other areas look better, people still cannot easily confirm your trust story.`,
    };
  }

  if (params.focusBehindCount > 0) {
    return {
      helpingText,
      careText: `${withCount(params.focusBehindCount, "commitment")} ${
        params.focusBehindCount === 1 ? "is" : "are"
      } behind in Focus Commitments. When a visible target is missed, trust becomes weaker, wider consistency can also drop, and your TrustSlip story looks less steady.`,
      problemText: `${withCount(params.focusBehindCount, "commitment")} ${
        params.focusBehindCount === 1 ? "is" : "are"
      } behind in Focus Commitments.`,
      consequenceText:
        "When a visible target is missed, trust can weaken in your community. It can also reduce your wider consistency and make your TrustSlip story look less steady.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and update, replan, or complete the missed commitment.`,
      connectionText: `${baseConnectionText} Right now Focus is showing a missed target. That weakens local trust first, can pull down wider consistency next, and makes your TrustSlip story look less steady when people check it.`,
    };
  }

  if (params.pendingRequestsCount > 0) {
    return {
      helpingText,
      careText: `${withCount(params.pendingRequestsCount, "join request")} ${
        params.pendingRequestsCount === 1 ? "is" : "are"
      } still waiting for your answer. Leaving people waiting weakens trust in your community and can also affect how other communities see your follow-through.`,
      problemText: `${withCount(params.pendingRequestsCount, "join request")} ${
        params.pendingRequestsCount === 1 ? "is" : "are"
      } still waiting for your answer.`,
      consequenceText:
        "Leaving people waiting weakens trust in your community and can also affect how other communities see your follow-through.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and answer the waiting request so nobody stays hanging.`,
      connectionText: `${baseConnectionText} Right now the waiting request is the visible problem. It weakens local trust first, can later affect wider consistency, and leaves your TrustSlip story looking less steady because your follow-through is not clear.`,
    };
  }

  if (params.actNowCount > 0 || params.unreadCount > 0) {
    const waitingCount = Math.max(params.actNowCount, params.unreadCount);
    return {
      helpingText,
      careText: `${withCount(waitingCount, "notification")} ${
        waitingCount === 1 ? "is" : "are"
      } still waiting for your response. When people do not get a reply, trust weakens, wider consistency can also suffer, and your response habit starts to look poor.`,
      problemText: `${withCount(waitingCount, "notification")} ${
        waitingCount === 1 ? "is" : "are"
      } still waiting for your response.`,
      consequenceText:
        "When people do not get a reply, trust can weaken in your community. If it keeps happening, your wider consistency and response habit can also suffer.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and reply to the person or item still waiting.`,
      connectionText: `${baseConnectionText} Right now the waiting reply is the visible problem. It weakens local trust in your community, can later affect wider consistency outside your community, and makes your TrustSlip story look weaker because your response habit is not clear.`,
    };
  }

  if (params.urgentDemandCount > 0) {
    return {
      helpingText,
      careText: `${withCount(params.urgentDemandCount, "urgent request")} ${
        params.urgentDemandCount === 1 ? "still needs" : "still need"
      } your answer. A waiting need can quickly become a trust issue if people feel ignored.`,
      problemText: `${withCount(params.urgentDemandCount, "urgent request")} ${
        params.urgentDemandCount === 1 ? "still needs" : "still need"
      } your answer.`,
      consequenceText:
        "A waiting need can quickly become a trust issue. If you leave it there, people may feel abandoned or stop believing you will respond.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and answer the waiting need.`,
      connectionText: `${baseConnectionText} Right now the waiting need is the visible problem. If you ignore it, local trust can weaken first, wider consistency can also become more careful, and your TrustSlip story will not look strong.`,
    };
  }

  if (params.focusWatchCount > 0) {
    return {
      helpingText,
      careText: `${withCount(params.focusWatchCount, "commitment")} ${
        params.focusWatchCount === 1 ? "is" : "are"
      } now on watch in Focus Commitments. If you do not correct it early, it can weaken trust and later pull down your wider consistency too.`,
      problemText: `${withCount(params.focusWatchCount, "commitment")} ${
        params.focusWatchCount === 1 ? "is" : "are"
      } now on watch in Focus Commitments.`,
      consequenceText:
        "If you do not correct it early, it can weaken trust and later pull down your wider consistency too.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and correct the commitment before it slips behind.`,
      connectionText: `${baseConnectionText} Right now Focus is already showing a warning. If you do not correct it early, local trust can weaken and wider consistency can later fall too, even before TrustSlip is checked.`,
    };
  }

  if (specificCare) {
    return {
      helpingText,
      careText: `${toSentence(
        specificCare
      )} If this stays like that, it can weaken trust in your community and also affect your wider consistency outside your community.`,
      problemText: toSentence(specificCare),
      consequenceText: bothUnderPressure
        ? "If this stays open, both local trust and wider consistency can fall together."
        : params.openTrust.tone === "red" || params.openTrust.tone === "yellow"
        ? "If this stays open, people in your community may become less sure about you."
        : "If this stays open, people outside your community may become more careful with you.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and fix the first problem still marked for action.`,
      connectionText:
        params.openTrust.tone === "red" || params.openTrust.tone === "yellow"
          ? `${baseConnectionText} Right now local trust is the clearest warning, and if you leave it there, wider consistency can also start to suffer later.`
          : `${baseConnectionText} Right now wider consistency is the clearest warning, but the same behavior can also weaken local trust in your community if it continues.`,
    };
  }

  if (params.openTrust.tone === "red" || params.cci.tone === "red") {
    return {
      helpingText,
      careText:
        "A serious trust or identity problem is already showing. If you leave it there, people may hold back, delay, or stop moving with you.",
      problemText: bothUnderPressure
        ? "A serious problem is already affecting both local trust and wider consistency."
        : params.openTrust.tone === "red"
        ? "A serious problem is already affecting trust in your community."
        : "A serious problem is already affecting how people outside your community see you.",
      consequenceText:
        "If you leave it there, people may hold back, delay, or stop moving with you.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and fix the problem already marked for action.`,
      connectionText: bothUnderPressure
        ? `${baseConnectionText} Right now both local trust and wider consistency are already under pressure, which means the same visible behavior is hurting both close community confidence and wider identity confidence together.`
        : params.openTrust.tone === "red"
        ? `${baseConnectionText} Right now local trust is already under serious pressure. If you leave it there, wider consistency and your TrustSlip story can also become weaker.`
        : `${baseConnectionText} Right now wider consistency is already under serious pressure. If you leave it there, trust in your community can also weaken further.`,
    };
  }

  if (params.openTrust.tone === "yellow" || params.cci.tone === "yellow") {
    return {
      helpingText,
      careText:
        "A warning sign is showing in your trust or identity reading. If you leave it too long, the problem can grow and start affecting both local trust and wider consistency more clearly.",
      problemText:
        "A warning sign is showing in your trust or identity reading.",
      consequenceText:
        "If you leave it too long, the problem can grow and start affecting both local trust and wider consistency more clearly.",
      actionText:
        nextPlain ||
        `Open ${routeLabel} now and correct the warning sign early.`,
      connectionText:
        params.openTrust.tone === "yellow"
          ? `${baseConnectionText} Right now local trust is giving the earlier warning. If you fix it early, you protect both community trust and wider consistency.`
          : `${baseConnectionText} Right now wider consistency is giving the earlier warning. If you fix it early, you protect both wider identity confidence and trust in your community.`,
    };
  }

  return {
    helpingText,
    careText:
      "No major trust problem is showing right now. Keep answering people, meeting your targets, and keeping your record clear so this stays healthy.",
    problemText: "No major trust problem is showing right now.",
    consequenceText:
      "Keeping your replies, commitments, and record steady helps trust stay healthy.",
    actionText: `Open ${routeLabel} if you want to review your trust position.`,
    connectionText:
      `${baseConnectionText} Right now they are not showing a major break, so the main job is to keep your follow-through steady and your record clear.`,
  };
}

export function buildDashboardTrustJourneyCopy(params: {
  openTrust: DashboardGuidanceReadingState;
  cci: DashboardGuidanceReadingState;
  trustSlipCode: string;
  trustExplainer?: DashboardTrustExplainer | null;
  pendingRequestsCount: number;
  unreadCount: number;
  actNowCount: number;
  urgentDemandCount: number;
  focusBehindCount: number;
  focusWatchCount: number;
  focusOnTrackCount: number;
  focusCompletedCount: number;
}): DashboardTrustJourneyCopy {
  const core = buildDashboardTrustAttentionCore({
    ...params,
    primaryLabel: "Trust",
  });

  const trustDetail =
    params.openTrust.tone === "red"
      ? "Trust is already showing a serious problem in your community. That means people close to you may already be losing confidence."
      : params.openTrust.tone === "yellow"
      ? "Trust is giving an early warning in your community. Fix it early before people lose more confidence."
      : "Trust shows how people in your community are reading your actions right now.";

  const cciDetail =
    params.cci.tone === "red"
      ? "Cross-community consistency is already showing a serious problem outside your community. That means people beyond your circle may already be more careful with you."
      : params.cci.tone === "yellow"
      ? "Cross-community consistency is giving an early warning outside your community. If you leave it too long, the wider reading can get worse."
      : "Cross-community consistency shows how people outside your community may read the same behaviour.";

  const trustSlipDetail = cleanText(params.trustSlipCode)
    ? "TrustSlip is the record people can check when they want evidence that your trust story is backed by a visible record."
    : "TrustSlip is still not ready. That means your trust record is not yet easy to share when people ask for evidence.";

  let focusDetail =
    "Focus shows whether the targets you set are being met, watched, or missed in a visible way.";
  if (params.focusBehindCount > 0) {
    focusDetail = `${withCount(params.focusBehindCount, "commitment")} ${
      params.focusBehindCount === 1 ? "is" : "are"
    } behind in Focus. That missed target is now part of what is affecting trust.`;
  } else if (params.focusWatchCount > 0) {
    focusDetail = `${withCount(params.focusWatchCount, "commitment")} ${
      params.focusWatchCount === 1 ? "is" : "are"
    } on watch in Focus. If you do not correct it early, it can later weaken trust.`;
  } else if (params.focusOnTrackCount > 0 || params.focusCompletedCount > 0) {
    const visibleCount = params.focusCompletedCount > 0
      ? withCount(params.focusCompletedCount, "completed target")
      : withCount(params.focusOnTrackCount, "target on track", "targets on track");
    focusDetail = `${visibleCount} ${
      params.focusCompletedCount > 0
        ? "is"
        : params.focusOnTrackCount === 1
        ? "is"
        : "are"
    } helping to show steady follow-through in Focus.`;
  }

  const passportDetail =
    "Trust Passport helps you read the full trust path in simple steps, while TrustSlip is the record people may later check for supporting evidence.";

  let connectionSummary =
    "These five work together: Focus shows visible follow-through, local trust shows how your community reads it, cross-community consistency shows how people outside your community may read it, TrustSlip carries the record, and Trust Passport helps you understand the whole path.";

  if (params.focusBehindCount > 0) {
    connectionSummary =
      "Right now the missed Focus commitment is the visible problem. That can weaken trust in your community, pull down wider consistency outside your community, and make your TrustSlip story look less steady.";
  } else if (params.pendingRequestsCount > 0) {
    connectionSummary =
      "Right now the waiting request is the visible problem. When people are left waiting, trust weakens first, wider consistency can also suffer later, and your TrustSlip story does not look as strong.";
  } else if (params.actNowCount > 0 || params.unreadCount > 0) {
    connectionSummary =
      "Right now the waiting notification or reply is the visible problem. If you do not answer, trust can weaken, wider consistency can also drop, and your record stops looking steady.";
  } else if (!cleanText(params.trustSlipCode)) {
    connectionSummary =
      "Right now the missing TrustSlip is the visible gap. Without that record, people cannot easily confirm your trust story even if some other parts look healthy.";
  } else if (params.urgentDemandCount > 0) {
    connectionSummary =
      "Right now the waiting need is the visible problem. If you leave it there, people may feel ignored, trust can weaken, and wider consistency can also become more careful.";
  }

  return {
    helpingText: core.helpingText,
    careText: core.careText,
    connectionItems: [
      { key: "trust", title: "Trust", detail: trustDetail },
      { key: "cci", title: "Wider consistency", detail: cciDetail },
      { key: "trust-slip", title: "TrustSlip", detail: trustSlipDetail },
      { key: "focus", title: "Focus", detail: focusDetail },
      {
        key: "trust-passport",
        title: "Trust Passport",
        detail: passportDetail,
      },
    ],
    connectionSummary: core.connectionText || connectionSummary,
  };
}
