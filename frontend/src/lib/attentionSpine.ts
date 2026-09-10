export type AttentionSpineUrgency = "red" | "yellow" | "green";

export type AttentionSpineSource =
  | "action_inbox"
  | "bulletin"
  | "commitment"
  | "market_wisdom"
  | "meeting";

export type AttentionSpineScope = "admin" | "community" | "personal";

export type AttentionSpineKind = "action" | "condition" | "opportunity";

export type AttentionSpineSignal = {
  id: string;
  source: AttentionSpineSource;
  scope: AttentionSpineScope;
  kind: AttentionSpineKind;
  urgency: AttentionSpineUrgency;
  summary: string;
  detail: string;
  actionLabel: string;
  actionTo: string;
  groupLabel?: string;
  weight?: number;
  countInPulse?: boolean;
  sortBoost?: number;
  meta?: Record<string, unknown>;
};

export type AttentionSpineSummary = {
  signals: AttentionSpineSignal[];
  counts: Record<AttentionSpineUrgency, number>;
  headline: string;
  detail: string;
  workCount: number;
  nextSignal: AttentionSpineSignal | null;
};

const URGENCY_RANK: Record<AttentionSpineUrgency, number> = {
  red: 0,
  yellow: 1,
  green: 2,
};

function cleanText(value: unknown): string {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function signalWeight(signal: AttentionSpineSignal): number {
  const weight = Number(signal.weight || 1);
  return Number.isFinite(weight) && weight > 0 ? Math.floor(weight) : 1;
}

function urgencyNoun(urgency: AttentionSpineUrgency): string {
  if (urgency === "red") return "urgent";
  if (urgency === "yellow") return "due soon";
  return "stable";
}

function localDayStartMs(value: Date): number {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function attentionUrgencyFromDate(
  date: Date | null | undefined,
  nowMs = Date.now()
): { urgency: AttentionSpineUrgency; label: string } {
  if (!date || !Number.isFinite(date.getTime())) {
    return { urgency: "green", label: "No set date" };
  }

  const diffDays = Math.ceil(
    (localDayStartMs(date) - localDayStartMs(new Date(nowMs))) /
      (24 * 60 * 60 * 1000)
  );

  if (diffDays <= 1) return { urgency: "red", label: "Due now" };
  if (diffDays <= 3) return { urgency: "yellow", label: "Due within 72 hours" };
  return { urgency: "green", label: "Still ahead" };
}

export function buildAttentionSpineSummary(
  rawSignals: AttentionSpineSignal[],
  options: {
    headlineOverride?: string;
    detailOverride?: string;
    quietHeadline?: string;
    quietDetail?: string;
  } = {}
): AttentionSpineSummary {
  const signals = rawSignals
    .map((signal) => ({
      ...signal,
      summary: cleanText(signal.summary),
      detail: cleanText(signal.detail),
      actionLabel: cleanText(signal.actionLabel || "Open"),
      actionTo: cleanText(signal.actionTo),
      groupLabel: cleanText(signal.groupLabel),
    }))
    .filter((signal) => signal.id && signal.summary);

  const counts: Record<AttentionSpineUrgency, number> = {
    red: 0,
    yellow: 0,
    green: 0,
  };

  for (const signal of signals) {
    if (signal.countInPulse === false) continue;
    counts[signal.urgency] += signalWeight(signal);
  }

  const sortedSignals = [...signals].sort((a, b) => {
    const urgencyDelta = URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency];
    if (urgencyDelta !== 0) return urgencyDelta;
    const actionDelta = Number(b.kind === "action") - Number(a.kind === "action");
    if (actionDelta !== 0) return actionDelta;
    return (b.sortBoost || 0) - (a.sortBoost || 0);
  });

  const nextSignal =
    sortedSignals.find((signal) => signal.actionTo && signal.urgency !== "green") ||
    sortedSignals.find((signal) => signal.actionTo) ||
    null;

  const workSignals = signals.filter((signal) => signal.kind === "action");
  const workCount = workSignals.reduce((sum, signal) => sum + signalWeight(signal), 0);
  const groupedWork = new Map<string, number>();

  for (const signal of workSignals) {
    const label = signal.groupLabel || signal.summary;
    groupedWork.set(label, (groupedWork.get(label) || 0) + signalWeight(signal));
  }

  const detailParts = [...groupedWork.entries()]
    .slice(0, 3)
    .map(([label, count]) => `${count} ${label}`);

  const headline = options.headlineOverride || (
    counts.red > 0
      ? `${counts.red} ${urgencyNoun("red")}`
      : counts.yellow > 0
      ? `${counts.yellow} ${urgencyNoun("yellow")}`
      : counts.green > 0
      ? options.quietHeadline || "Pulse steady"
      : options.quietHeadline || "No live signal"
  );

  const detail = options.detailOverride || (
    detailParts.length > 0
      ? detailParts.join(" - ")
      : nextSignal?.detail ||
        (counts.red + counts.yellow > 0
          ? "Open the highlighted item first."
          : options.quietDetail || "No urgent follow-up.")
  );

  return {
    signals: sortedSignals,
    counts,
    headline,
    detail,
    workCount,
    nextSignal,
  };
}