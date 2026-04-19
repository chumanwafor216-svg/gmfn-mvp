import type {
  DashboardGuidanceUserClass,
  DashboardNextRouteCopy,
} from "./dashboardUserGuidance";

export type DashboardAttentionStoredState = {
  signature: string;
  firstSeenAt: string;
  lastShownAt: string;
  showCount: number;
  lastDismissedAt: string;
  lastActedAt: string;
};

export type DashboardAttentionSourceKind =
  | "focus"
  | "approval"
  | "repair"
  | "setup"
  | "demand"
  | "notifications"
  | "seller"
  | "steady";

export type DashboardAttentionStage = "early" | "followup" | "persistent";

export type DashboardAttentionInput = {
  userClass: DashboardGuidanceUserClass;
  nextRouteKey: string;
  nextRouteLabel: string;
  nextRouteTo: string;
  nextRouteCopy: DashboardNextRouteCopy;
  totalNotifications: number;
  actNowCount: number;
  unreadCount: number;
  sourceTitles: string[];
  focusBehindCount: number;
  focusWatchCount: number;
  focusNextReviewLabel: string;
  focusRouteTo: string;
  notificationsTo: string;
  nowMs: number;
  storedState?: Partial<DashboardAttentionStoredState> | null;
};

export type DashboardAttentionSignal = {
  active: boolean;
  signature: string;
  stage: DashboardAttentionStage;
  intervalHours: number;
  shouldShow: boolean;
  sourceKind: DashboardAttentionSourceKind;
  title: string;
  intro: string;
  sourceLine: string;
  problemText: string;
  consequenceText: string;
  actionText: string;
  ctaLabel: string;
  ctaTo: string;
  secondaryCtaLabel?: string;
  secondaryCtaTo?: string;
  state: DashboardAttentionStoredState;
};

export function defaultDashboardAttentionStoredState(): DashboardAttentionStoredState {
  return {
    signature: "",
    firstSeenAt: "",
    lastShownAt: "",
    showCount: 0,
    lastDismissedAt: "",
    lastActedAt: "",
  };
}

export function normalizeDashboardAttentionStoredState(
  raw: unknown
): DashboardAttentionStoredState {
  const base = defaultDashboardAttentionStoredState();
  const src = (raw ?? {}) as Partial<DashboardAttentionStoredState>;

  return {
    signature: String(src.signature || ""),
    firstSeenAt: String(src.firstSeenAt || ""),
    lastShownAt: String(src.lastShownAt || ""),
    showCount: Number.isFinite(Number(src.showCount))
      ? Math.max(0, Number(src.showCount || 0))
      : 0,
    lastDismissedAt: String(src.lastDismissedAt || ""),
    lastActedAt: String(src.lastActedAt || ""),
  };
}

export function markDashboardAttentionShown(
  state: DashboardAttentionStoredState,
  nowIso: string
): DashboardAttentionStoredState {
  return {
    ...state,
    lastShownAt: nowIso,
    showCount: state.showCount + 1,
  };
}

export function markDashboardAttentionDismissed(
  state: DashboardAttentionStoredState,
  nowIso: string
): DashboardAttentionStoredState {
  return {
    ...state,
    lastDismissedAt: nowIso,
  };
}

export function markDashboardAttentionActed(
  state: DashboardAttentionStoredState,
  nowIso: string
): DashboardAttentionStoredState {
  return {
    ...state,
    lastActedAt: nowIso,
    lastDismissedAt: nowIso,
  };
}

function cleanText(value: string): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function sentence(value: string): string {
  const text = cleanText(value).replace(/^[,;:\-.\s]+/, "");
  if (!text) return "";
  const first = text[0].toUpperCase() + text.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

function parseTimeMs(value: string): number {
  const ms = new Date(String(value || "")).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function hoursBetween(nowMs: number, earlierIso: string): number {
  const earlierMs = parseTimeMs(earlierIso);
  if (!earlierMs) return 0;
  return Math.max(0, (nowMs - earlierMs) / 3600000);
}

function buildSourceLine(sourceTitles: string[]): string {
  const titles = sourceTitles.map((item) => cleanText(item)).filter(Boolean).slice(0, 3);
  if (titles.length === 0) return "";
  if (titles.length === 1) return `Coming from ${titles[0]}.`;
  if (titles.length === 2) return `Coming from ${titles[0]} and ${titles[1]}.`;
  return `Coming from ${titles[0]}, ${titles[1]}, and ${titles[2]}.`;
}

function pickByShowCount(options: string[], showCount: number): string {
  if (!options.length) return "";
  return options[Math.abs(showCount) % options.length];
}

function buildAttentionStage(ageHours: number): {
  stage: DashboardAttentionStage;
  intervalHours: number;
} {
  if (ageHours >= 96) {
    return { stage: "persistent", intervalHours: 1 };
  }

  if (ageHours >= 48) {
    return { stage: "followup", intervalHours: 2 };
  }

  return { stage: "early", intervalHours: 4 };
}

function pickSourceKind(input: DashboardAttentionInput): DashboardAttentionSourceKind {
  if (input.focusBehindCount > 0) return "focus";
  if (input.userClass === "approval" || input.nextRouteKey === "join-requests") {
    return "approval";
  }
  if (
    input.userClass === "repair" ||
    input.nextRouteKey === "trust" ||
    input.nextRouteKey === "cci"
  ) {
    return "repair";
  }
  if (input.userClass === "setup" || input.nextRouteKey === "trust-slip") {
    return "setup";
  }
  if (input.userClass === "demand" || input.nextRouteKey === "demand-box") {
    return "demand";
  }
  if (input.totalNotifications > 0 || input.unreadCount > 0) {
    return "notifications";
  }
  if (input.userClass === "seller" || input.nextRouteKey === "shop") {
    return "seller";
  }
  return "steady";
}

function buildAttentionSignature(
  input: DashboardAttentionInput,
  sourceKind: DashboardAttentionSourceKind
): string {
  const notificationPressure =
    input.actNowCount > 0
      ? "act-now"
      : input.unreadCount > 0
      ? "unread"
      : input.totalNotifications > 0
      ? "general"
      : "quiet";
  const focusPressure =
    input.focusBehindCount > 0
      ? "behind"
      : input.focusWatchCount > 0
      ? "watch"
      : "steady";

  return [
    sourceKind,
    cleanText(input.userClass),
    cleanText(input.nextRouteKey),
    notificationPressure,
    focusPressure,
  ].join("|");
}

function latestAttentionTouchMs(state: DashboardAttentionStoredState): number {
  return Math.max(
    parseTimeMs(state.lastShownAt),
    parseTimeMs(state.lastDismissedAt),
    parseTimeMs(state.lastActedAt)
  );
}

function buildAttentionCopy(
  input: DashboardAttentionInput,
  sourceKind: DashboardAttentionSourceKind,
  stage: DashboardAttentionStage,
  showCount: number
): {
  title: string;
  intro: string;
  ctaLabel: string;
  ctaTo: string;
  secondaryCtaLabel?: string;
  secondaryCtaTo?: string;
} {
  const nextRouteLabel = cleanText(input.nextRouteLabel) || "next step";
  const notificationsSecondary =
    input.nextRouteKey !== "notifications" && input.totalNotifications > 0
      ? {
          secondaryCtaLabel: "Open notifications",
          secondaryCtaTo: input.notificationsTo,
        }
      : {};

  if (sourceKind === "focus") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "A missed commitment needs attention.",
              "A slipped commitment now needs attention.",
            ]
          : stage === "followup"
          ? [
              "This missed commitment is now affecting trust.",
              "This slipped commitment is now weakening trust.",
            ]
          : [
              "This missed commitment is still hurting trust.",
              "The longer this commitment stays behind, the more trust it can cost.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "A deadline or review point has slipped. This is no longer only a reminder."
          : stage === "followup"
          ? "A missed promise is now becoming part of how people read your discipline."
          : "This is now a repeated trust warning. The missed commitment is still open.",
      ctaLabel: "Open commitments",
      ctaTo: input.focusRouteTo,
      secondaryCtaLabel: `Open ${nextRouteLabel}`,
      secondaryCtaTo: input.nextRouteTo,
    };
  }

  if (sourceKind === "approval") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "People are waiting for your answer.",
              "A request is still waiting on you.",
            ]
          : stage === "followup"
          ? [
              "Your delay is now affecting people waiting on you.",
              "The waiting request is now affecting trust.",
            ]
          : [
              "People are still stuck waiting on your answer.",
              "This unanswered request is now a stronger trust issue.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "This is no longer only a notification. Someone is still waiting for your decision."
          : stage === "followup"
          ? "Repeated delay can make people doubt whether you will respond fairly."
          : "The longer it stays unanswered, the more it can slow people down and hurt trust.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      ...notificationsSecondary,
    };
  }

  if (sourceKind === "repair") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "A trust issue needs your attention.",
              "Something is now affecting trust.",
            ]
          : stage === "followup"
          ? [
              "This trust issue is still open.",
              "The trust issue is still waiting for a fix.",
            ]
          : [
              "This trust issue is still hurting confidence.",
              "People may keep holding back until this trust issue is fixed.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "The app has linked a live issue to trust and is explaining it before it gets heavier."
          : stage === "followup"
          ? "This is no longer only a warning. The same trust issue is still unresolved."
          : "This is now a repeated trust warning because the same problem is still open.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      ...notificationsSecondary,
    };
  }

  if (sourceKind === "setup") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "Your setup still needs attention.",
              "Your verification is still not complete.",
            ]
          : stage === "followup"
          ? [
              "Your setup issue is still open.",
              "Your missing verification step is still open.",
            ]
          : [
              "This setup issue is still holding you back.",
              "The missing setup step is still blocking smoother use.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "This missing step can weaken how smoothly the rest of the app works."
          : stage === "followup"
          ? "The app is still waiting for the missing setup step to be completed."
          : "The longer it stays open, the more it can limit access and confidence.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      ...notificationsSecondary,
    };
  }

  if (sourceKind === "demand") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "A live need is still waiting.",
              "A request still needs your answer.",
            ]
          : stage === "followup"
          ? [
              "This waiting need is now more urgent.",
              "The unanswered need is still open.",
            ]
          : [
              "This unanswered need is still affecting trust.",
              "A waiting need is still open and may now cost confidence.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "A visible need is waiting, and delay can change how people read your follow-through."
          : stage === "followup"
          ? "The app is still seeing an open need without a clean answer."
          : "This is now a repeated reminder because the waiting need is still unresolved.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      ...notificationsSecondary,
    };
  }

  if (sourceKind === "notifications") {
    return {
      title: pickByShowCount(
        stage === "early"
          ? [
              "Your notifications now need action.",
              "These notifications are now pointing to one real issue.",
            ]
          : stage === "followup"
          ? [
              "These notifications are still waiting on you.",
              "The same notification issue is still open.",
            ]
          : [
              "These notifications are still affecting your next trust step.",
              "The longer these notifications wait, the more they can hurt trust.",
            ],
        showCount
      ),
      intro:
        stage === "early"
          ? "The app is now interpreting the notification build-up instead of leaving you to guess."
          : stage === "followup"
          ? "The notifications are still open, so the app is bringing the same issue back again."
          : "The app is now repeating the alert more often because the issue is still not cleared.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      secondaryCtaLabel: "Open notifications",
      secondaryCtaTo: input.notificationsTo,
    };
  }

  if (sourceKind === "seller") {
    return {
      title: "Your visible page needs attention.",
      intro: "People may be seeing your page now, so clarity and trust matter first.",
      ctaLabel: `Open ${nextRouteLabel}`,
      ctaTo: input.nextRouteTo,
      ...notificationsSecondary,
    };
  }

  return {
    title: "One issue is still waiting for you.",
    intro: "The app is keeping the next useful step in front of you.",
    ctaLabel: `Open ${nextRouteLabel}`,
    ctaTo: input.nextRouteTo,
    ...notificationsSecondary,
  };
}

function buildAttentionDetailLines(
  input: DashboardAttentionInput,
  sourceKind: DashboardAttentionSourceKind
): {
  problemText: string;
  consequenceText: string;
  actionText: string;
} {
  if (sourceKind === "focus") {
    return {
      problemText:
        input.focusBehindCount === 1
          ? "You have 1 focus commitment behind schedule."
          : `You have ${input.focusBehindCount} focus commitments behind schedule.`,
      consequenceText:
        "If you leave it like this, people may start to doubt your follow-through and trust can weaken.",
      actionText:
        "Open commitments now, then check in, replan honestly, or complete the overdue target.",
    };
  }

  if (sourceKind === "approval") {
    return {
      problemText: sentence(input.nextRouteCopy.issueText),
      consequenceText:
        "If you leave the waiting request unanswered, people stay stuck and trust can fall.",
      actionText:
        "Open the request now and give a clear answer instead of leaving people waiting.",
    };
  }

  if (sourceKind === "notifications") {
    return {
      problemText: sentence(input.nextRouteCopy.issueText),
      consequenceText:
        "If these notifications keep building up, small matters can turn into trust problems.",
      actionText: sentence(input.nextRouteCopy.actionText),
    };
  }

  return {
    problemText: sentence(input.nextRouteCopy.issueText),
    consequenceText: sentence(input.nextRouteCopy.consequenceText),
    actionText: sentence(input.nextRouteCopy.actionText),
  };
}

export function buildDashboardAttentionSignal(
  input: DashboardAttentionInput
): DashboardAttentionSignal {
  const storedState = normalizeDashboardAttentionStoredState(input.storedState);
  const sourceKind = pickSourceKind(input);
  const active =
    input.focusBehindCount > 0 ||
    input.totalNotifications > 0 ||
    input.actNowCount > 0 ||
    input.unreadCount > 0;

  if (!active) {
    return {
      active: false,
      signature: "",
      stage: "early",
      intervalHours: 4,
      shouldShow: false,
      sourceKind,
      title: "",
      intro: "",
      sourceLine: "",
      problemText: "",
      consequenceText: "",
      actionText: "",
      ctaLabel: "",
      ctaTo: "",
      state: defaultDashboardAttentionStoredState(),
    };
  }

  const signature = buildAttentionSignature(input, sourceKind);

  const nextState =
    storedState.signature === signature
      ? storedState
      : {
          ...defaultDashboardAttentionStoredState(),
          signature,
          firstSeenAt: new Date(input.nowMs).toISOString(),
        };

  const ageHours = hoursBetween(input.nowMs, nextState.firstSeenAt);
  const { stage, intervalHours } = buildAttentionStage(ageHours);
  const lastTouchMs = latestAttentionTouchMs(nextState);
  const hoursSinceLastTouch = lastTouchMs
    ? Math.max(0, (input.nowMs - lastTouchMs) / 3600000)
    : 0;
  const hasShownBefore = Boolean(parseTimeMs(nextState.lastShownAt));
  const shouldShow =
    !hasShownBefore ||
    (stage === "persistent" && hoursSinceLastTouch >= intervalHours);
  const copy = buildAttentionCopy(input, sourceKind, stage, nextState.showCount);
  const detailLines = buildAttentionDetailLines(input, sourceKind);
  const sourceLine =
    sourceKind === "focus"
      ? input.focusNextReviewLabel
        ? `${sentence(input.focusNextReviewLabel)}`
        : "Coming from Focus Commitments."
      : buildSourceLine(input.sourceTitles);

  return {
    active: true,
    signature,
    stage,
    intervalHours,
    shouldShow,
    sourceKind,
    title: sentence(copy.title),
    intro: sentence(copy.intro),
    sourceLine,
    problemText: sentence(detailLines.problemText),
    consequenceText: sentence(detailLines.consequenceText),
    actionText: sentence(detailLines.actionText),
    ctaLabel: copy.ctaLabel,
    ctaTo: copy.ctaTo,
    secondaryCtaLabel: copy.secondaryCtaLabel,
    secondaryCtaTo: copy.secondaryCtaTo,
    state: nextState,
  };
}
