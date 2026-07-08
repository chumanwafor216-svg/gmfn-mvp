import type {
  GuidanceAction,
  GuidanceNotice,
  GuidanceSnapshot,
} from "./guidance";

export type CompanionMode = "off" | "light" | "active";
export type AudibleNudgeLevel =
  | "off"
  | "urgent-only"
  | "important-only"
  | "all";

export type CompanionPriority = "none" | "normal" | "important" | "urgent";

export type CompanionSettings = {
  quietNotifications: boolean;
  soundEnabled: boolean;
  notificationsMode: "summary" | "detailed";

  companionMode: CompanionMode;
  audibleNudgeLevel: AudibleNudgeLevel;
  voicePromptsEnabled: boolean;
  systemPushEnabled: boolean;

  quietHoursStart: string;
  quietHoursEnd: string;
  maxDailyNudges: number;
  repeatReminderMinutes: number;
};

export type CompanionToastPayload = {
  id: string;
  title: string;
  detail: string;
  ctaLabel?: string;
  ctaTo?: string;
  priority: CompanionPriority;
  autoCloseMs: number;
  source: string;
};

export type CompanionDecision = {
  shouldNotify: boolean;
  priority: CompanionPriority;
  title: string;
  detail: string;
  speechText: string;
  ctaLabel: string;
  ctaTo: string;
  source: string;
  fingerprint: string;
  channels: Array<"toast" | "sound" | "speech" | "browser">;
  quietHours: boolean;
};

export type CompanionCycleResult = {
  decision: CompanionDecision | null;
  delivered: Array<"toast" | "sound" | "speech" | "browser">;
  blockedReason?: string;
};

export type UrgentCompanionNotificationInput = {
  id?: string | number | null;
  kind?: string | null;
  title?: string | null;
  detail?: string | null;
  message?: string | null;
  ctaLabel?: string | null;
  actionLabel?: string | null;
  ctaTo?: string | null;
  actionUrl?: string | null;
};

type Candidate = {
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  priority: CompanionPriority;
  source: string;
};

const COMPANION_TOAST_EVENT = "gmfn:companion-toast";
const COMPANION_LAST_SENT_KEY = "gmfn_companion_last_sent";
const COMPANION_DAILY_KEY = "gmfn_companion_daily";
const COMPANION_AUDIO_UNLOCKED_KEY = "gmfn_companion_audio_unlocked";
const COMPANION_INTERACTION_CAPTURE_KEY = "gmfn_companion_interaction_capture";

const DEFAULT_COMPANION_SETTINGS: CompanionSettings = {
  quietNotifications: false,
  soundEnabled: false,
  notificationsMode: "summary",

  companionMode: "light",
  audibleNudgeLevel: "off",
  voicePromptsEnabled: false,
  systemPushEnabled: false,

  quietHoursStart: "21:00",
  quietHoursEnd: "07:00",
  maxDailyNudges: 3,
  repeatReminderMinutes: 120,
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function coerceBool(value: any, fallback: boolean): boolean {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;

  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;

  return fallback;
}

function coerceNumber(value: any, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function coerceEnum<T extends string>(
  value: any,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = safeStr(value) as T;
  return allowed.includes(raw) ? raw : fallback;
}

function parseTimeToMinutes(value: string, fallback: number): number {
  const raw = safeStr(value);
  if (!raw.includes(":")) return fallback;

  const [h, m] = raw.split(":").map((part) => Number(part));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return fallback;

  const hour = Math.max(0, Math.min(23, Math.floor(h)));
  const minute = Math.max(0, Math.min(59, Math.floor(m)));

  return hour * 60 + minute;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function isDocumentVisible(): boolean {
  if (typeof document === "undefined") return true;
  return !document.hidden;
}

function hashText(value: string): string {
  let hash = 0;

  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }

  return String(hash);
}

function todayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function readJsonStorage<T>(key: string, fallback: T): T {
  try {
    if (!isBrowser()) return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJsonStorage<T>(key: string, value: T): void {
  try {
    if (!isBrowser()) return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // local storage is best-effort
  }
}

export function normalizeCompanionSettings(
  input?: Partial<CompanionSettings> | null
): CompanionSettings {
  const src = input || {};

  return {
    quietNotifications: coerceBool(
      (src as any).quietNotifications ?? (src as any).quiet_notifications,
      DEFAULT_COMPANION_SETTINGS.quietNotifications
    ),
    soundEnabled: coerceBool(
      (src as any).soundEnabled ?? (src as any).sound_enabled,
      DEFAULT_COMPANION_SETTINGS.soundEnabled
    ),
    notificationsMode: coerceEnum<"summary" | "detailed">(
      (src as any).notificationsMode ?? (src as any).notifications_mode,
      ["summary", "detailed"] as const,
      DEFAULT_COMPANION_SETTINGS.notificationsMode
    ),

    companionMode: coerceEnum<CompanionMode>(
      (src as any).companionMode ?? (src as any).companion_mode,
      ["off", "light", "active"] as const,
      DEFAULT_COMPANION_SETTINGS.companionMode
    ),
    audibleNudgeLevel: coerceEnum<AudibleNudgeLevel>(
      (src as any).audibleNudgeLevel ?? (src as any).audible_nudge_level,
      ["off", "urgent-only", "important-only", "all"] as const,
      DEFAULT_COMPANION_SETTINGS.audibleNudgeLevel
    ),
    voicePromptsEnabled: coerceBool(
      (src as any).voicePromptsEnabled ?? (src as any).voice_prompts_enabled,
      DEFAULT_COMPANION_SETTINGS.voicePromptsEnabled
    ),
    systemPushEnabled: coerceBool(
      (src as any).systemPushEnabled ?? (src as any).system_push_enabled,
      DEFAULT_COMPANION_SETTINGS.systemPushEnabled
    ),

    quietHoursStart: safeStr(
      (src as any).quietHoursStart ??
        (src as any).quiet_hours_start ??
        DEFAULT_COMPANION_SETTINGS.quietHoursStart
    ),
    quietHoursEnd: safeStr(
      (src as any).quietHoursEnd ??
        (src as any).quiet_hours_end ??
        DEFAULT_COMPANION_SETTINGS.quietHoursEnd
    ),
    maxDailyNudges: Math.max(
      1,
      Math.floor(
        coerceNumber(
          (src as any).maxDailyNudges ?? (src as any).max_daily_nudges,
          DEFAULT_COMPANION_SETTINGS.maxDailyNudges
        )
      )
    ),
    repeatReminderMinutes: Math.max(
      5,
      Math.floor(
        coerceNumber(
          (src as any).repeatReminderMinutes ??
            (src as any).repeat_reminder_minutes,
          DEFAULT_COMPANION_SETTINGS.repeatReminderMinutes
        )
      )
    ),
  };
}

export function installCompanionInteractionCapture(): void {
  if (!isBrowser()) return;

  if (window.sessionStorage.getItem(COMPANION_INTERACTION_CAPTURE_KEY) === "1") {
    return;
  }

  const unlock = () => {
    try {
      window.localStorage.setItem(COMPANION_AUDIO_UNLOCKED_KEY, "1");
      window.sessionStorage.setItem(COMPANION_INTERACTION_CAPTURE_KEY, "1");
    } catch {
      // local/session storage is best-effort
    }

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
}

export function markCompanionUserInteraction(): void {
  try {
    if (!isBrowser()) return;
    window.localStorage.setItem(COMPANION_AUDIO_UNLOCKED_KEY, "1");
  } catch {
    // local storage is best-effort
  }
}

function isAudioUnlocked(): boolean {
  try {
    if (!isBrowser()) return false;
    return window.localStorage.getItem(COMPANION_AUDIO_UNLOCKED_KEY) === "1";
  } catch {
    return false;
  }
}

function isWithinQuietHours(
  startTime: string,
  endTime: string,
  now = new Date()
): boolean {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const start = parseTimeToMinutes(startTime, 21 * 60);
  const end = parseTimeToMinutes(endTime, 7 * 60);

  if (start === end) return false;

  if (start < end) {
    return nowMinutes >= start && nowMinutes < end;
  }

  return nowMinutes >= start || nowMinutes < end;
}

function buildCandidateFromAction(
  action: GuidanceAction | null | undefined,
  fallbackSource: string
): Candidate | null {
  if (!action) return null;

  const severity = safeStr(action.severity).toLowerCase();
  const priority: CompanionPriority =
    severity === "urgent"
      ? "urgent"
      : severity === "important"
      ? "important"
      : "normal";

  return {
    title: safeStr(action.title || "Action needed"),
    detail: safeStr(
      action.detail || "A step is waiting for your attention."
    ),
    ctaLabel: safeStr(action.ctaLabel || "Open"),
    ctaTo: safeStr(action.ctaTo || "/app/dashboard"),
    priority,
    source: fallbackSource,
  };
}

function buildCandidateFromNotice(
  notice: GuidanceNotice | null | undefined,
  priority: CompanionPriority,
  fallbackSource: string
): Candidate | null {
  if (!notice) return null;

  return {
    title: safeStr(notice.title || "Update"),
    detail: safeStr(
      notice.detail || "A system update needs your attention."
    ),
    ctaLabel: safeStr(notice.ctaLabel || "Open"),
    ctaTo: safeStr(notice.ctaTo || "/app/notifications"),
    priority,
    source: fallbackSource,
  };
}

function selectPrimaryCandidate(snapshot: GuidanceSnapshot): Candidate | null {
  const actNow = snapshot.actionInboxSummary?.actNow || [];
  const dueSoon = snapshot.actionInboxSummary?.dueSoon || [];
  const watchAndWait = snapshot.actionInboxSummary?.watchAndWait || [];

  if (actNow.length > 0) {
    return buildCandidateFromNotice(actNow[0], "urgent", "action-inbox-act-now");
  }

  if (snapshot.recoveryPath) {
    return buildCandidateFromAction(snapshot.recoveryPath, "recovery-path");
  }

  if (dueSoon.length > 0) {
    return buildCandidateFromNotice(dueSoon[0], "important", "action-inbox-due-soon");
  }

  if (snapshot.nextBestStep) {
    return buildCandidateFromAction(snapshot.nextBestStep, "next-best-step");
  }

  if (watchAndWait.length > 0) {
    return buildCandidateFromNotice(
      watchAndWait[0],
      "normal",
      "action-inbox-watch-and-wait"
    );
  }

  return null;
}

function makeSpeechText(candidate: Candidate, settings: CompanionSettings): string {
  if (settings.notificationsMode === "detailed") {
    return [candidate.title, candidate.detail].filter(Boolean).join(". ");
  }

  return candidate.title;
}

function shouldUseToast(
  priority: CompanionPriority,
  settings: CompanionSettings
): boolean {
  if (priority === "none") return false;
  if (settings.companionMode === "off") return false;
  if (settings.companionMode === "light") {
    return priority === "important" || priority === "urgent";
  }
  return true;
}

function shouldUseSound(
  priority: CompanionPriority,
  settings: CompanionSettings,
  quietHours: boolean
): boolean {
  if (quietHours) return false;
  if (!settings.soundEnabled) return false;
  if (settings.companionMode !== "active") return false;

  if (settings.audibleNudgeLevel === "off") return false;
  if (settings.audibleNudgeLevel === "urgent-only") return priority === "urgent";
  if (settings.audibleNudgeLevel === "important-only") {
    return priority === "important" || priority === "urgent";
  }
  return priority !== "none";
}

function shouldUseSpeech(
  priority: CompanionPriority,
  settings: CompanionSettings,
  quietHours: boolean
): boolean {
  if (quietHours) return false;
  if (!settings.voicePromptsEnabled) return false;
  if (settings.companionMode !== "active") return false;

  return priority === "important" || priority === "urgent";
}

function shouldUseBrowserNotification(
  priority: CompanionPriority,
  settings: CompanionSettings
): boolean {
  if (!settings.systemPushEnabled) return false;
  if (settings.companionMode === "off") return false;
  if (isDocumentVisible()) return false;

  return priority === "important" || priority === "urgent";
}

export function buildCompanionDecision(
  snapshot: GuidanceSnapshot | null | undefined,
  rawSettings?: Partial<CompanionSettings> | null
): CompanionDecision | null {
  if (!snapshot) return null;

  const settings = normalizeCompanionSettings(rawSettings);

  if (settings.companionMode === "off") {
    return {
      shouldNotify: false,
      priority: "none",
      title: "",
      detail: "",
      speechText: "",
      ctaLabel: "",
      ctaTo: "",
      source: "companion-off",
      fingerprint: "companion-off",
      channels: [],
      quietHours: false,
    };
  }

  const candidate = selectPrimaryCandidate(snapshot);
  if (!candidate) return null;

  const quietHours = isWithinQuietHours(
    settings.quietHoursStart,
    settings.quietHoursEnd
  );

  const channels: Array<"toast" | "sound" | "speech" | "browser"> = [];

  if (shouldUseToast(candidate.priority, settings)) {
    channels.push("toast");
  }

  if (shouldUseSound(candidate.priority, settings, quietHours)) {
    channels.push("sound");
  }

  if (shouldUseSpeech(candidate.priority, settings, quietHours)) {
    channels.push("speech");
  }

  if (shouldUseBrowserNotification(candidate.priority, settings)) {
    channels.push("browser");
  }

  return {
    shouldNotify: channels.length > 0,
    priority: candidate.priority,
    title: candidate.title,
    detail: candidate.detail,
    speechText: makeSpeechText(candidate, settings),
    ctaLabel: candidate.ctaLabel,
    ctaTo: candidate.ctaTo,
    source: candidate.source,
    fingerprint: hashText(
      [
        candidate.source,
        candidate.priority,
        candidate.title,
        candidate.detail,
        candidate.ctaLabel,
        candidate.ctaTo,
      ].join("|")
    ),
    channels,
    quietHours,
  };
}

function readLastSentMap(): Record<string, number> {
  return readJsonStorage<Record<string, number>>(COMPANION_LAST_SENT_KEY, {});
}

function writeLastSentMap(value: Record<string, number>): void {
  writeJsonStorage(COMPANION_LAST_SENT_KEY, value);
}

function readDailyCounter(): { day: string; count: number } {
  return readJsonStorage<{ day: string; count: number }>(COMPANION_DAILY_KEY, {
    day: todayKey(),
    count: 0,
  });
}

function writeDailyCounter(value: { day: string; count: number }): void {
  writeJsonStorage(COMPANION_DAILY_KEY, value);
}

function minRepeatMinutesForPriority(
  priority: CompanionPriority,
  settings: CompanionSettings
): number {
  if (priority === "urgent") {
    return Math.max(10, Math.floor(settings.repeatReminderMinutes / 4));
  }

  if (priority === "important") {
    return Math.max(20, Math.floor(settings.repeatReminderMinutes / 2));
  }

  return settings.repeatReminderMinutes;
}

export function canDeliverCompanionDecision(
  decision: CompanionDecision | null,
  rawSettings?: Partial<CompanionSettings> | null
): { ok: boolean; reason?: string } {
  if (!decision) return { ok: false, reason: "no-decision" };
  if (!decision.shouldNotify) return { ok: false, reason: "no-channels" };

  const settings = normalizeCompanionSettings(rawSettings);
  const now = Date.now();

  const daily = readDailyCounter();
  const today = todayKey();

  if (daily.day !== today) {
    writeDailyCounter({ day: today, count: 0 });
  } else if (
    daily.count >= settings.maxDailyNudges &&
    decision.priority !== "urgent"
  ) {
    return { ok: false, reason: "daily-limit-reached" };
  }

  const lastSentMap = readLastSentMap();
  const last = Number(lastSentMap[decision.fingerprint] || 0);
  const repeatMinutes = minRepeatMinutesForPriority(decision.priority, settings);
  const repeatMs = repeatMinutes * 60 * 1000;

  if (last > 0 && now - last < repeatMs) {
    return { ok: false, reason: "repeat-window-active" };
  }

  if (decision.quietHours && decision.priority === "normal") {
    return { ok: false, reason: "quiet-hours" };
  }

  return { ok: true };
}

function registerCompanionDelivery(decision: CompanionDecision): void {
  const now = Date.now();

  const lastSentMap = readLastSentMap();
  lastSentMap[decision.fingerprint] = now;
  writeLastSentMap(lastSentMap);

  const today = todayKey();
  const daily = readDailyCounter();

  if (daily.day !== today) {
    writeDailyCounter({ day: today, count: 1 });
    return;
  }

  writeDailyCounter({
    day: today,
    count: Number(daily.count || 0) + 1,
  });
}

function buildToastPayload(
  decision: CompanionDecision
): CompanionToastPayload {
  return {
    id: decision.fingerprint,
    title: decision.title,
    detail: decision.detail,
    ctaLabel: decision.ctaLabel,
    ctaTo: decision.ctaTo,
    priority: decision.priority,
    autoCloseMs:
      decision.priority === "urgent"
        ? 6500
        : decision.priority === "important"
        ? 5200
        : 4200,
    source: decision.source,
  };
}

export function emitCompanionToast(payload: CompanionToastPayload): boolean {
  if (!isBrowser()) return false;

  window.dispatchEvent(
    new CustomEvent<CompanionToastPayload>(COMPANION_TOAST_EVENT, {
      detail: payload,
    })
  );

  return true;
}

export function subscribeCompanionToasts(
  listener: (payload: CompanionToastPayload) => void
): () => void {
  if (!isBrowser()) return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent<CompanionToastPayload>).detail;
    if (!detail) return;
    listener(detail);
  };

  window.addEventListener(COMPANION_TOAST_EVENT, handler as EventListener);

  return () => {
    window.removeEventListener(COMPANION_TOAST_EVENT, handler as EventListener);
  };
}

async function playCompanionChime(priority: CompanionPriority): Promise<boolean> {
  if (!isBrowser()) return false;
  let vibrated = false;
  if (priority === "urgent" && "vibrate" in window.navigator) {
    try {
      vibrated = window.navigator.vibrate([180, 70, 180]);
    } catch {
      vibrated = false;
    }
  }
  if (!isAudioUnlocked()) return vibrated;

  try {
    const AudioContextCtor =
      (window as any).AudioContext || (window as any).webkitAudioContext;

    if (!AudioContextCtor) return false;

    const context = new AudioContextCtor();
    if (context.state === "suspended") {
      await context.resume().catch(() => null);
    }

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = priority === "urgent" ? "triangle" : "sine";
    oscillator.frequency.value = priority === "urgent" ? 880 : 660;

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.04,
      context.currentTime + 0.02
    );
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + (priority === "urgent" ? 0.26 : 0.18)
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start();
    oscillator.stop(context.currentTime + (priority === "urgent" ? 0.28 : 0.2));

    window.setTimeout(() => {
      void context.close().catch(() => null);
    }, 400);

    return true;
  } catch {
    return vibrated;
  }
}

function speakCompanionText(text: string): boolean {
  if (!isBrowser()) return false;
  if (!("speechSynthesis" in window)) return false;

  const spoken = safeStr(text);
  if (!spoken) return false;

  try {
    const utterance = new SpeechSynthesisUtterance(spoken);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
    return true;
  } catch {
    return false;
  }
}

export async function requestCompanionNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!isBrowser()) return "unsupported";
  if (!("Notification" in window)) return "unsupported";

  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";

  try {
    return await Notification.requestPermission();
  } catch {
    return "denied";
  }
}

function showBrowserNotification(
  decision: CompanionDecision,
  settings: CompanionSettings
): boolean {
  if (!isBrowser()) return false;
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;

  try {
    const body =
      settings.notificationsMode === "detailed"
        ? decision.detail
        : decision.speechText || decision.title;

    const notification = new Notification(decision.title, {
      body,
      tag: decision.fingerprint,
      silent: settings.quietNotifications || !settings.soundEnabled,
    });

    notification.onclick = () => {
      try {
        window.focus();
      } catch {
        // focusing an existing tab is best-effort
      }
    };

    return true;
  } catch {
    return false;
  }
}

export async function deliverCompanionDecision(
  decision: CompanionDecision | null,
  rawSettings?: Partial<CompanionSettings> | null
): Promise<Array<"toast" | "sound" | "speech" | "browser">> {
  const settings = normalizeCompanionSettings(rawSettings);
  const delivered: Array<"toast" | "sound" | "speech" | "browser"> = [];

  if (!decision || !decision.shouldNotify) return delivered;

  if (decision.channels.includes("toast")) {
    if (emitCompanionToast(buildToastPayload(decision))) {
      delivered.push("toast");
    }
  }

  if (decision.channels.includes("sound")) {
    if (await playCompanionChime(decision.priority)) {
      delivered.push("sound");
    }
  }

  if (decision.channels.includes("speech")) {
    if (speakCompanionText(decision.speechText || decision.title)) {
      delivered.push("speech");
    }
  }

  if (decision.channels.includes("browser")) {
    if (showBrowserNotification(decision, settings)) {
      delivered.push("browser");
    }
  }

  return delivered;
}

export function buildUrgentCompanionNotificationDecision(
  notification: UrgentCompanionNotificationInput,
  rawSettings?: Partial<CompanionSettings> | null,
  options?: {
    priority?: "important" | "urgent";
    source?: string;
    fallbackTitle?: string;
    fallbackDetail?: string;
    fallbackCtaLabel?: string;
    fallbackCtaTo?: string;
    speechText?: string;
  }
): CompanionDecision {
  const settings = normalizeCompanionSettings(rawSettings);
  const quietHours = isWithinQuietHours(
    settings.quietHoursStart,
    settings.quietHoursEnd
  );
  const priority = options?.priority || "urgent";
  const title = safeStr(
    notification.title ||
      options?.fallbackTitle ||
      "Community confirmation needs you"
  );
  const detail = safeStr(
    notification.detail ||
      notification.message ||
      options?.fallbackDetail ||
      "A GSN community member needs a quick confirmation response."
  );
  const ctaLabel = safeStr(
    notification.ctaLabel ||
      notification.actionLabel ||
      options?.fallbackCtaLabel ||
      "Respond now"
  );
  const ctaTo = safeStr(
    notification.ctaTo ||
      notification.actionUrl ||
      options?.fallbackCtaTo ||
      "/app/community-confirmations"
  );
  const source = safeStr(options?.source || "urgent-community-confirmation");
  const notificationId = safeStr(notification.id || "");
  const channels: CompanionDecision["channels"] = [];

  if (shouldUseToast(priority, settings)) {
    channels.push("toast");
  }

  if (shouldUseSound(priority, settings, quietHours)) {
    channels.push("sound");
  }

  if (shouldUseSpeech(priority, settings, quietHours)) {
    channels.push("speech");
  }

  if (shouldUseBrowserNotification(priority, settings)) {
    channels.push("browser");
  }

  const speechText = safeStr(
    options?.speechText ||
      (source === "urgent-community-confirmation"
        ? "Urgent GSN community confirmation needs your response."
        : `${priority === "urgent" ? "Urgent GSN notification" : "GSN notification"}: ${title}.`)
  );

  return {
    shouldNotify: channels.length > 0,
    priority,
    title,
    detail,
    speechText,
    ctaLabel,
    ctaTo,
    source,
    fingerprint: hashText(
      [
        source,
        notificationId,
        safeStr(notification.kind),
        title,
        detail,
        ctaTo,
      ].join("|")
    ),
    channels,
    quietHours,
  };
}

export async function runUrgentCompanionNotificationCycle(params: {
  notification: UrgentCompanionNotificationInput;
  settings?: Partial<CompanionSettings> | null;
  force?: boolean;
  priority?: "important" | "urgent";
  source?: string;
  fallbackTitle?: string;
  fallbackDetail?: string;
  fallbackCtaLabel?: string;
  fallbackCtaTo?: string;
  speechText?: string;
}): Promise<CompanionCycleResult> {
  installCompanionInteractionCapture();

  const settings = normalizeCompanionSettings(params.settings);
  const decision = buildUrgentCompanionNotificationDecision(
    params.notification,
    settings,
    {
      priority: params.priority,
      source: params.source,
      fallbackTitle: params.fallbackTitle,
      fallbackDetail: params.fallbackDetail,
      fallbackCtaLabel: params.fallbackCtaLabel,
      fallbackCtaTo: params.fallbackCtaTo,
      speechText: params.speechText,
    }
  );

  if (!params.force) {
    const allowed = canDeliverCompanionDecision(decision, settings);
    if (!allowed.ok) {
      return {
        decision,
        delivered: [],
        blockedReason: allowed.reason,
      };
    }
  }

  const delivered = await deliverCompanionDecision(decision, settings);

  if (delivered.length > 0) {
    registerCompanionDelivery(decision);
  }

  return {
    decision,
    delivered,
    blockedReason: delivered.length === 0 ? "nothing-delivered" : undefined,
  };
}

export async function runCompanionCycle(params: {
  snapshot: GuidanceSnapshot | null | undefined;
  settings?: Partial<CompanionSettings> | null;
  force?: boolean;
}): Promise<CompanionCycleResult> {
  installCompanionInteractionCapture();

  const settings = normalizeCompanionSettings(params.settings);
  const decision = buildCompanionDecision(params.snapshot, settings);

  if (!decision) {
    return {
      decision: null,
      delivered: [],
      blockedReason: "no-decision",
    };
  }

  if (!params.force) {
    const allowed = canDeliverCompanionDecision(decision, settings);
    if (!allowed.ok) {
      return {
        decision,
        delivered: [],
        blockedReason: allowed.reason,
      };
    }
  }

  const delivered = await deliverCompanionDecision(decision, settings);

  if (delivered.length > 0) {
    registerCompanionDelivery(decision);
  }

  return {
    decision,
    delivered,
    blockedReason: delivered.length === 0 ? "nothing-delivered" : undefined,
  };
}
