import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getMyIdentityRecovery,
  getMyIdentityRisk,
  getMyTrustSlip,
  getSelectedClanId,
  getTrustWhyMe,
  listTrustEvents,
  safeCopy,
  setupIdentityRecovery,
  verifyIdentityRecovery,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

type TrustEventRow = {
  id?: number | string;
  title?: string | null;
  message?: string | null;
  detail?: string | null;
  description?: string | null;
  kind?: string | null;
  type?: string | null;
  event_type?: string | null;
  created_at?: string | null;
};

type TrustSlipRecord = {
  id?: number;
  code?: string | null;
  status?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | number | null;
  open_trust_band?: string | null;
  open_trust_class?: string | null;
  open_trust_score?: string | number | null;
  community_trust_band?: string | null;
  community_trust_class?: string | null;
  community_trust_score?: string | number | null;
  issued_at?: string | null;
  expires_at?: string | null;
  holder_name?: string | null;
  gmfn_id?: string | null;
};

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type NoticeTone = "success" | "error";

type CollapseState = {
  summary: boolean;
  reasons: boolean;
  timeline: boolean;
  next: boolean;
};

type IdentityExplainers = {
  helps: string[];
  weakens: string[];
  next: string[];
};

type IdentityRiskSummary = {
  device_count?: number;
  signal_count?: number;
  cluster_count?: number;
  continuity?: {
    status?: string;
    score?: number;
    reason?: string;
    action?: string;
  };
};

type IdentityRecoverySummary = {
  configured?: boolean;
  prompts?: string[];
  last_verified_at?: string | null;
  failed_attempts?: number;
  locked_until?: string | null;
  locked?: boolean;
};

const IDENTITY_PAGE_UI_STORAGE_KEY = "gmfn.identityPage.sections.v1";
const DASHBOARD_AVATAR_STORAGE_KEY = "gmfn.member.avatar";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 16,
    border,
    background: bg,
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function readStoredImage(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function defaultCollapseState(): CollapseState {
  return {
    summary: false,
    reasons: false,
    timeline: true,
    next: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    summary: Boolean(raw?.summary ?? base.summary),
    reasons: Boolean(raw?.reasons ?? base.reasons),
    timeline: Boolean(raw?.timeline ?? base.timeline),
    next: Boolean(raw?.next ?? base.next),
  };
}

function normalizeTrustSlipRecord(raw: any): TrustSlipRecord | null {
  if (!raw) return null;

  const src = raw?.item || raw?.trust_slip || raw;

  return {
    id: positiveNumber(firstTruthy(src?.id, src?.trust_slip_id)) || undefined,
    code: firstTruthy(src?.code, src?.trust_slip_code),
    status: firstTruthy(src?.status, src?.state, src?.verification_status),
    trust_band: firstTruthy(src?.trust_band, src?.trust_class),
    trust_class: firstTruthy(src?.trust_class, src?.trust_band),
    trust_score: firstNumberLike(src?.trust_score),
    open_trust_band: firstTruthy(
      src?.open_trust_band,
      src?.community_trust_band,
      src?.open_trust_class
    ),
    open_trust_class: firstTruthy(
      src?.open_trust_class,
      src?.community_trust_class,
      src?.open_trust_band
    ),
    open_trust_score: firstNumberLike(
      src?.open_trust_score,
      src?.community_trust_score
    ),
    community_trust_band: firstTruthy(
      src?.community_trust_band,
      src?.open_trust_band
    ),
    community_trust_class: firstTruthy(
      src?.community_trust_class,
      src?.open_trust_class
    ),
    community_trust_score: firstNumberLike(
      src?.community_trust_score,
      src?.open_trust_score
    ),
    issued_at: firstTruthy(src?.issued_at, src?.created_at),
    expires_at: firstTruthy(src?.expires_at, src?.expiry_at),
    holder_name: firstTruthy(src?.holder_name, src?.display_name, src?.name),
    gmfn_id: firstTruthy(src?.gmfn_id),
  };
}

function initialsFromName(name: string): string {
  const parts = safeStr(name).split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "M";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return `${parts[0].slice(0, 1)}${parts[1].slice(0, 1)}`.toUpperCase();
}

function getCciState(me: any): ReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    "";

  const rawWhy =
    me?.cci_reason ??
    me?.cross_client_integrity_reason ??
    me?.cross_clan_integrity_reason ??
    me?.cross_community_integrity_reason ??
    "";

  const scoreNum =
    rawScore === null || rawScore === undefined || String(rawScore).trim() === ""
      ? null
      : Number(rawScore);

  const classText = String(rawClass || "").trim().toUpperCase();

  if (classText) {
    if (classText === "A" || classText === "A+") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is steady right now."),
      };
    }

    if (classText === "B") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent positive actions across communities."
        ),
      };
    }

    if (classText === "C") {
      return {
        classText,
        scoreText:
          scoreNum === null || Number.isNaN(scoreNum)
            ? "—"
            : String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "A few better actions can improve your standing."
        ),
      };
    }

    return {
      classText,
      scoreText:
        scoreNum === null || Number.isNaN(scoreNum)
          ? "—"
          : String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs action and repair."),
    };
  }

  if (scoreNum !== null && !Number.isNaN(scoreNum)) {
    if (scoreNum >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Stable and growing",
        whyText: String(
          rawWhy || "Keep consistent actions to strengthen your standing."
        ),
      };
    }

    if (scoreNum >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "CCI is being prepared",
    whyText: "A fuller cross-community reading will appear when available.",
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: TrustSlipRecord | null,
  hasSelectedCommunity: boolean
): ReadingState {
  const rawClass = firstTruthy(
    me?.open_trust_class,
    me?.open_trust_band,
    me?.current_community_trust_class,
    me?.current_community_trust_band,
    me?.community_trust_class,
    me?.community_trust_band,
    me?.selected_clan_trust_class,
    me?.selected_clan_trust_band,
    trustSlip?.open_trust_class,
    trustSlip?.open_trust_band,
    trustSlip?.community_trust_class,
    trustSlip?.community_trust_band,
    me?.trust_class,
    me?.trust_band,
    trustSlip?.trust_class,
    trustSlip?.trust_band
  ).toUpperCase();

  const rawScore = firstNumberLike(
    me?.open_trust_score,
    me?.current_community_trust_score,
    me?.community_trust_score,
    me?.selected_clan_trust_score,
    trustSlip?.open_trust_score,
    trustSlip?.community_trust_score,
    me?.trust_score,
    trustSlip?.trust_score
  );

  const rawWhy = firstTruthy(
    me?.open_trust_reason,
    me?.current_community_trust_reason,
    me?.community_trust_reason,
    me?.selected_clan_trust_reason,
    me?.trust_reason
  );

  if (rawClass) {
    if (rawClass === "A" || rawClass === "A+") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your present community reading is strong.",
      };
    }

    if (rawClass === "B") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawClass === "C") {
      return {
        classText: rawClass,
        scoreText:
          rawScore === null || Number.isNaN(rawScore)
            ? "—"
            : String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: rawClass,
      scoreText:
        rawScore === null || Number.isNaN(rawScore)
          ? "—"
          : String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (rawScore !== null && !Number.isNaN(rawScore)) {
    if (rawScore >= 75) {
      return {
        classText: "A",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        scoreText: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        scoreText: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      scoreText: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Pending",
      scoreText: "—",
      tone: "neutral",
      statusText: "Select a community to view Open Trust",
      whyText:
        "Open Trust belongs to your immediate community reading, not to your cross-community integrity reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "—",
    tone: "neutral",
    statusText: "Open Trust is being prepared",
    whyText:
      "Open Trust reflects your standing in your current community and will appear here when available.",
  };
}

function extractTextsByKeyTokens(
  input: any,
  tokens: string[],
  limit = 4
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const seenNodes = new Set<any>();

  function collectStringsFromValue(value: any) {
    if (out.length >= limit || value == null) return;

    if (typeof value === "string") {
      const text = safeStr(value);
      if (!text || seen.has(text)) return;
      seen.add(text);
      out.push(text);
      return;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        collectStringsFromValue(item);
        if (out.length >= limit) return;
      }
      return;
    }

    if (typeof value === "object") {
      const candidates = [
        value?.text,
        value?.detail,
        value?.message,
        value?.title,
        value?.reason,
        value?.note,
        value?.description,
        value?.label,
      ];

      for (const candidate of candidates) {
        collectStringsFromValue(candidate);
        if (out.length >= limit) return;
      }
    }
  }

  function walk(node: any, depth: number) {
    if (node == null || depth > 6 || out.length >= limit) return;
    if (typeof node !== "object") return;
    if (seenNodes.has(node)) return;
    seenNodes.add(node);

    if (Array.isArray(node)) {
      for (const item of node) {
        walk(item, depth + 1);
        if (out.length >= limit) return;
      }
      return;
    }

    for (const [key, value] of Object.entries(node)) {
      const rawKey = safeStr(key).toLowerCase();

      if (tokens.some((token) => rawKey.includes(token))) {
        collectStringsFromValue(value);
      }

      if (typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  }

  walk(input, 0);
  return out;
}

function eventTone(kind: string) {
  const text = safeStr(kind).toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("approved") ||
    text.includes("completed") ||
    text.includes("fulfilled")
  ) {
    return {
      dot: "#16A34A",
      bg: "#F3FBF5",
      label: "Built",
    };
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("risk") ||
    text.includes("warning")
  ) {
    return {
      dot: "#DC2626",
      bg: "#FFF5F5",
      label: "Weakened",
    };
  }

  if (
    text.includes("repair") ||
    text.includes("attention") ||
    text.includes("flag") ||
    text.includes("dispute")
  ) {
    return {
      dot: "#D97706",
      bg: "#FFFBEF",
      label: "Repair",
    };
  }

  return {
    dot: "#0B63D1",
    bg: "#F8FBFF",
    label: "Protected",
  };
}

export default function IdentityIntegrityPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(IDENTITY_PAGE_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<TrustSlipRecord | null>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [trustWhyRaw, setTrustWhyRaw] = useState<any>(null);
  const [events, setEvents] = useState<TrustEventRow[]>([]);
  const [identityRisk, setIdentityRisk] = useState<IdentityRiskSummary | null>(
    null
  );
  const [identityRecovery, setIdentityRecovery] =
    useState<IdentityRecoverySummary | null>(null);
  const [recoveryPrompts, setRecoveryPrompts] = useState([
    { prompt: "", answer: "" },
    { prompt: "", answer: "" },
    { prompt: "", answer: "" },
  ]);
  const [recoveryAnswers, setRecoveryAnswers] = useState(["", "", ""]);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [avatarSrc, setAvatarSrc] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(IDENTITY_PAGE_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    setAvatarSrc(readStoredImage(DASHBOARD_AVATAR_STORAGE_KEY));
  }, []);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, trustSlipRes, guidanceRes, whyRes, eventsRes, identityRiskRes, identityRecoveryRes] =
          await Promise.all([
            getMe().catch(() => null),
            getCurrentClan().catch(() => null),
            getMyTrustSlip().catch(() => null),
            buildGuidanceSnapshot().catch(() => null),
            getTrustWhyMe().catch(() => null),
            listTrustEvents({
              clan_id: selectedClanId || undefined,
              limit: 60,
            }).catch(() => ({ items: [] })),
            getMyIdentityRisk().catch(() => null),
            getMyIdentityRecovery().catch(() => null),
          ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setTrustSlip(normalizeTrustSlipRecord(trustSlipRes));
        setGuidance(guidanceRes || null);
        setTrustWhyRaw(whyRes || null);
        setEvents(rowsOf<TrustEventRow>(eventsRes));
        setIdentityRisk(identityRiskRes || null);
        setIdentityRecovery(identityRecoveryRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        trustSlip?.holder_name,
        me?.email
      ) || "Member"
    );
  }, [me, trustSlip]);

  const profileInitials = useMemo(() => {
    return initialsFromName(displayName);
  }, [displayName]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [currentClan, selectedClanId]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, trustSlip?.gmfn_id, "Pending");
  }, [me, trustSlip]);

  const trustSlipCode = safeStr(trustSlip?.code || "");

  const cci = useMemo(() => getCciState(me), [me]);
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );

  const cciTone = useMemo(() => {
    if (cci.tone === "green") {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }
    if (cci.tone === "yellow") {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }
    if (cci.tone === "red") {
      return {
        bg: "#FFF5F5",
        border: "1px solid rgba(239,68,68,0.16)",
        text: "#991B1B",
      };
    }
    return {
      bg: "#F8FAFC",
      border: "1px solid rgba(148,163,184,0.16)",
      text: "#334155",
    };
  }, [cci.tone]);

  const openTrustTone = useMemo(() => {
    if (openTrust.tone === "green") {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }
    if (openTrust.tone === "yellow") {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }
    if (openTrust.tone === "red") {
      return {
        bg: "#FFF5F5",
        border: "1px solid rgba(239,68,68,0.16)",
        text: "#991B1B",
      };
    }
    return {
      bg: "#F8FAFC",
      border: "1px solid rgba(148,163,184,0.16)",
      text: "#334155",
    };
  }, [openTrust.tone]);

  const continuity = useMemo(() => {
    const summary = identityRisk?.continuity || {};
    const status = safeStr(summary?.status).toLowerCase() || "trusted";
    const tone = continuityTone(status);

    return {
      status,
      label: tone.label,
      scoreText:
        summary?.score === null || summary?.score === undefined
          ? "—"
          : String(summary.score),
      reason:
        safeStr(summary?.reason) ||
        "Identity continuity has not raised a visible concern yet.",
      action:
        safeStr(summary?.action) ||
        "Normal account use can continue.",
      tone,
      deviceCount: Number(identityRisk?.device_count || 0),
      signalCount: Number(identityRisk?.signal_count || 0),
      clusterCount: Number(identityRisk?.cluster_count || 0),
    };
  }, [identityRisk]);

  const recovery = useMemo(() => {
    const prompts = Array.isArray(identityRecovery?.prompts)
      ? identityRecovery?.prompts.filter(Boolean)
      : [];
    const lockedUntil = safeStr(identityRecovery?.locked_until);
    const lastVerifiedAt = safeStr(identityRecovery?.last_verified_at);

    return {
      configured: Boolean(identityRecovery?.configured),
      prompts,
      failedAttempts: Number(identityRecovery?.failed_attempts || 0),
      locked: Boolean(identityRecovery?.locked),
      lockedUntil,
      lastVerifiedAt,
      shouldVerify:
        Boolean(identityRecovery?.configured) &&
        (continuity.status === "reverify_required" ||
          continuity.status === "protected_lock"),
    };
  }, [continuity.status, identityRecovery]);

  async function handleRecoverySetup(e: React.FormEvent) {
    e.preventDefault();
    if (recoveryBusy) return;

    setRecoveryBusy(true);
    setRecoveryError("");
    setRecoverySuccess("");

    try {
      const payload = {
        questions: recoveryPrompts.map((item) => ({
          prompt: safeStr(item.prompt),
          answer: safeStr(item.answer),
        })),
      };

      const out = await setupIdentityRecovery(payload);
      setIdentityRecovery(out || null);
      setRecoveryPrompts([
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
        { prompt: "", answer: "" },
      ]);
      setRecoverySuccess(
        "Private recovery challenge saved. The app can now use it if identity continuity becomes doubtful."
      );
    } catch (err: any) {
      setRecoveryError(err?.message || "Recovery challenge could not be saved.");
    } finally {
      setRecoveryBusy(false);
    }
  }

  async function handleRecoveryVerify(e: React.FormEvent) {
    e.preventDefault();
    if (recoveryBusy) return;

    setRecoveryBusy(true);
    setRecoveryError("");
    setRecoverySuccess("");

    try {
      const out = await verifyIdentityRecovery({
        answers: recoveryAnswers.map((item) => safeStr(item)),
      });
      setIdentityRisk(out?.summary || null);
      setIdentityRecovery(out?.recovery || null);
      if (out?.verified) {
        setRecoveryAnswers(["", "", ""]);
        setRecoverySuccess(
          "Recovery challenge passed. Identity continuity has been updated for this account."
        );
        return;
      }

      setRecoveryError(
        "Recovery answers did not match. The app recorded the failed attempt and kept the account in its protected state."
      );
    } catch (err: any) {
      const detail =
        typeof err?.message === "string"
          ? err.message
          : "Recovery answers did not match.";
      setRecoveryError(detail);
    } finally {
      setRecoveryBusy(false);
    }
  }

  const explainers = useMemo<IdentityExplainers>(() => {
    const helps =
      guidance?.trustChangeExplainer?.helps?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "help",
        "positive",
        "improv",
        "support",
        "good",
        "build",
        "strength",
      ]);

    const weakens =
      guidance?.trustChangeExplainer?.weakens?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "weak",
        "negative",
        "risk",
        "reduce",
        "warning",
        "damage",
        "caution",
        "integrity",
      ]);

    const next =
      guidance?.trustChangeExplainer?.next?.slice(0, 4) ||
      extractTextsByKeyTokens(trustWhyRaw, [
        "next",
        "action",
        "repair",
        "improve",
        "step",
        "do",
        "what",
      ]);

    return {
      helps: helps || [],
      weakens: weakens || [],
      next: next || [],
    };
  }, [guidance, trustWhyRaw]);

  const timelineRows = useMemo(() => {
    return events
      .map((row, index) => ({
        id: firstTruthy(row.id, `event-${index}`),
        label: firstTruthy(
          row.title,
          row.message,
          row.detail,
          row.description,
          row.kind,
          row.type,
          row.event_type,
          "Trust event"
        ),
        kind: firstTruthy(row.kind, row.type, row.event_type),
        createdAt: safeStr(row.created_at),
      }))
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [events]);

  const nextMoveTitle = safeStr(
    guidance?.recoveryPath?.title ||
      guidance?.weeklyFocus?.title ||
      "Keep your path steady"
  );

  const nextMoveDetail = safeStr(
    guidance?.recoveryPath?.detail ||
      guidance?.weeklyFocus?.detail ||
      "No urgent identity repair is blocking you right now. Keep your visible conduct steady and your next step clean."
  );

  const nextMoveTo = safeStr(
    guidance?.recoveryPath?.ctaTo ||
      guidance?.weeklyFocus?.ctaTo ||
      "/app/trust"
  );

  const nextMoveLabel = safeStr(
    guidance?.recoveryPath?.ctaLabel ||
      guidance?.weeklyFocus?.ctaLabel ||
      "Open next step"
  );

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copyGmfnId() {
    if (!gmfnId || gmfnId === "Pending") {
      showNotice("error", "GMFN ID is not ready yet.");
      return;
    }

    safeCopy(gmfnId);
    showNotice("success", "GMFN ID copied.");
  }

  function copyTrustSlipCode() {
    if (!trustSlipCode) {
      showNotice("error", "TrustSlip code is not ready yet.");
      return;
    }

    safeCopy(trustSlipCode);
    showNotice("success", "TrustSlip code copied.");
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel="Identity & Integrity"
          title="Identity & Integrity"
          subtitle="Loading your identity and integrity page..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Trust Passport", to: "/app/trust" },
            { label: "TrustSlip", to: "/app/trust-slip" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading identity and integrity...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Identity & Integrity"
        title="Identity & Integrity"
        subtitle="Your stable GSN identity, your integrity reading across communities, what strengthened it, what weakened it, and the next clean repair or continuity step."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Trust Passport", to: "/app/trust" },
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
        utilityLinks={[
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "My GSN and I", to: "/app/my-gmfn-and-i" },
        ]}
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen brings together your stable identity, cross-community integrity reading, trust changes, and the next clean continuity or repair step."
        why="It helps you understand identity and trust as one continuing record instead of scattered signals across several pages."
        next="Start with the identity summary, then read the identity readings and the timeline before you act on the next clean step."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "220px minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: isCompact ? 240 : 270,
                borderRadius: 28,
                overflow: "hidden",
                border: "1px solid rgba(212,175,55,0.22)",
                background: "linear-gradient(180deg, rgba(8,17,31,0.9) 0%, rgba(16,42,67,0.98) 100%)",
                boxShadow: "0 20px 44px rgba(2,12,27,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {avatarSrc ? (
                <img
                  src={avatarSrc}
                  alt="Identity"
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "center 15%",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 44,
                  }}
                >
                  {profileInitials}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Identity summary</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {displayName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Identity should remain stable while trust reacts to conduct. This keeps the identity layer and the integrity layer together so the user does not need to search for both separately.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityLabel}</span>
              <span style={badge(false)}>
                TrustSlip: {trustSlipCode || "Awaiting issue"}
              </span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={copyGmfnId}
                disabled={!gmfnId || gmfnId === "Pending"}
                style={actionBtn("primary", !gmfnId || gmfnId === "Pending")}
              >
                Copy GMFN ID
              </button>

              <button
                type="button"
                onClick={copyTrustSlipCode}
                disabled={!trustSlipCode}
                style={actionBtn("secondary", !trustSlipCode)}
              >
                Copy TrustSlip Code
              </button>

              <OriginLink to="/app/trust" style={actionBtn("secondary")}>
                Open Trust Passport
              </OriginLink>
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Identity readings</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Your identity and integrity readings stay together here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("summary")}
            style={collapseToggle()}
          >
            {collapsed.summary ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.summary ? (
          <>
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div style={statTile(openTrustTone.bg, openTrustTone.border)}>
                <div style={sectionLabel()}>Open Trust</div>
                <div
                  style={{
                    marginTop: 8,
                    color: openTrustTone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {openTrust.classText}
                </div>
                <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                  Score: {openTrust.scoreText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {openTrust.statusText}
                </div>
              </div>

              <div style={statTile(cciTone.bg, cciTone.border)}>
                <div style={sectionLabel()}>CCI</div>
                <div
                  style={{
                    marginTop: 8,
                    color: cciTone.text,
                    fontWeight: 900,
                    fontSize: 26,
                  }}
                >
                  {cci.classText}
                </div>
                <div style={{ marginTop: 8, color: "#64748B", fontSize: 13 }}>
                  Score: {cci.scoreText}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {cci.statusText}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>TrustSlip</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {trustSlipCode || "Pending"}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {trustSlipCode
                    ? "Portable verification record ready."
                    : "Portable verification record still preparing."}
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Open Trust meaning</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  {openTrust.whyText}
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>CCI meaning</div>
                <div style={{ marginTop: 8, ...helperText() }}>{cci.whyText}</div>
              </div>
            </div>
          </>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Identity continuity</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This protects the owner by watching for major changes in device-use patterns.
            </div>
          </div>

          <span
            style={{
              ...badge(true),
              background: continuity.tone.bg,
              color: continuity.tone.text,
            }}
          >
            {continuity.label}
          </span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={statTile(continuity.tone.bg, continuity.tone.border)}>
            <div style={sectionLabel()}>Continuity score</div>
            <div
              style={{
                marginTop: 8,
                color: continuity.tone.text,
                fontWeight: 900,
                fontSize: 26,
              }}
            >
              {continuity.scoreText}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Devices seen</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
              {continuity.deviceCount}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Risk signals</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
              {continuity.signalCount}
            </div>
          </div>

          <div style={statTile()}>
            <div style={sectionLabel()}>Linked clusters</div>
            <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900, fontSize: 26 }}>
              {continuity.clusterCount}
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Why the app is reading it this way</div>
            <div style={{ marginTop: 8, ...helperText() }}>{continuity.reason}</div>
          </div>

          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>What the app will do next</div>
            <div style={{ marginTop: 8, ...helperText() }}>{continuity.action}</div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Private recovery challenge</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This is the owner-protection layer for extreme continuity events. The
              app stores only protected answer hashes, not the raw answers.
            </div>
          </div>

          <span style={badge(Boolean(recovery.configured))}>
            {recovery.configured ? "Configured" : "Not configured"}
          </span>
        </div>

        {recoveryError ? (
          <div style={{ ...noticeCard("error"), marginTop: 14 }}>{recoveryError}</div>
        ) : null}

        {recoverySuccess ? (
          <div style={{ ...noticeCard("success"), marginTop: 14 }}>
            {recoverySuccess}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Recovery state</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {recovery.configured
                ? "Private recovery prompts are ready for serious continuity shifts."
                : "Set three private prompts now so the app can protect you if your device pattern changes too far."}
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={helperText()}>
                Failed attempts: <b>{recovery.failedAttempts}</b>
              </div>
              <div style={helperText()}>
                Last verified:{" "}
                <b>{recovery.lastVerifiedAt ? safeDateTime(recovery.lastVerifiedAt) : "Not yet"}</b>
              </div>
              <div style={helperText()}>
                Locked until:{" "}
                <b>{recovery.lockedUntil ? safeDateTime(recovery.lockedUntil) : "Not locked"}</b>
              </div>
            </div>
          </div>

          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>When it will be used</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              OTP is only one layer. If a stolen phone or unstable device pattern puts
              the owner at risk, this private challenge can help prove it is still the
              same person using the account.
            </div>
          </div>
        </div>

        {!recovery.configured ? (
          <form onSubmit={handleRecoverySetup} style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {recoveryPrompts.map((item, index) => (
              <div key={`recovery-setup-${index}`} style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Prompt {index + 1}</div>
                <input
                  value={item.prompt}
                  onChange={(e) =>
                    setRecoveryPrompts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, prompt: e.target.value } : row
                      )
                    )
                  }
                  placeholder="Write a private prompt only you can answer"
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.12)",
                    boxSizing: "border-box",
                  }}
                />
                <input
                  value={item.answer}
                  onChange={(e) =>
                    setRecoveryPrompts((current) =>
                      current.map((row, rowIndex) =>
                        rowIndex === index ? { ...row, answer: e.target.value } : row
                      )
                    )
                  }
                  placeholder="Write the answer exactly the way you want to remember it"
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.12)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={actionBtn("primary", recoveryBusy)} disabled={recoveryBusy}>
                {recoveryBusy ? "Saving..." : "Save private recovery challenge"}
              </button>
            </div>
          </form>
        ) : null}

        {recovery.shouldVerify ? (
          <form onSubmit={handleRecoveryVerify} style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={softCard("#FFF7ED")}>
              <div style={sectionLabel()}>Recovery check needed now</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Identity continuity is currently asking for a stronger owner check. Answer the
                private prompts exactly as you configured them.
              </div>
            </div>

            {recovery.prompts.map((prompt, index) => (
              <div key={`recovery-verify-${index}`} style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>{prompt}</div>
                <input
                  value={recoveryAnswers[index] || ""}
                  onChange={(e) =>
                    setRecoveryAnswers((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? e.target.value : item
                      )
                    )
                  }
                  placeholder="Enter your private answer"
                  style={{
                    width: "100%",
                    marginTop: 10,
                    padding: "12px 14px",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.12)",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            ))}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button type="submit" style={actionBtn("primary", recoveryBusy)} disabled={recoveryBusy || recovery.locked}>
                {recoveryBusy ? "Checking..." : "Verify private recovery challenge"}
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Why identity and trust changed</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What helped, what weakened, and what repairs or improves next.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("reasons")}
            style={collapseToggle()}
          >
            {collapsed.reasons ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.reasons ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What helped
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.helps.slice(0, 4).map((item, index) => (
                  <div key={`help-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.helps.length === 0 ? (
                  <div style={helperText()}>
                    No positive movement explanation is currently shown.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What weakened identity or trust
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.weakens.slice(0, 4).map((item, index) => (
                  <div key={`weak-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.weakens.length === 0 ? (
                  <div style={helperText()}>
                    No weakening signal is currently shown.
                  </div>
                ) : null}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                What improves next
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {explainers.next.slice(0, 4).map((item, index) => (
                  <div key={`next-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}

                {explainers.next.length === 0 ? (
                  <div style={helperText()}>
                    No next-step improvement line is currently shown.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Identity and trust timeline</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The visible movement behind your current identity and trust position.
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(false)}>
              {timelineRows.length} recent event{timelineRows.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={() => toggleSection("timeline")}
              style={collapseToggle()}
            >
              {collapsed.timeline ? "Open" : "Collapse"}
            </button>
          </div>
        </div>

        {!collapsed.timeline ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {timelineRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No recent identity or trust event is currently shown.
              </div>
            ) : (
              timelineRows.map((row) => {
                const tone = eventTone(row.kind);

                return (
                  <div
                    key={row.id}
                    style={{
                      ...innerCard(tone.bg),
                      display: "grid",
                      gridTemplateColumns: "18px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: tone.dot,
                        marginTop: 6,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {row.label}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(true)}>{tone.label}</span>
                          {row.createdAt ? (
                            <span style={badge(false)}>
                              {safeDateTime(row.createdAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={sectionLabel()}>Next clean step</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Identity should lead somewhere useful, not remain an isolated reading.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("next")}
            style={collapseToggle()}
          >
            {collapsed.next ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.next ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 22 : 28,
                  lineHeight: 1.15,
                }}
              >
                {nextMoveTitle}
              </div>

              <div style={{ marginTop: 12, ...helperText() }}>
                {nextMoveDetail}
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <OriginLink to={nextMoveTo} style={actionBtn("primary")}>
                  {nextMoveLabel}
                </OriginLink>

                <OriginLink to="/app/trust-slip" style={actionBtn("secondary")}>
                  TrustSlip
                </OriginLink>

                <OriginLink to="/app/notifications" style={actionBtn("secondary")}>
                  Action Inbox
                </OriginLink>
              </div>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={sectionLabel()}>Why this page matters</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={helperText()}>
                  Identity is the stable layer. It should not split from one community to another.
                </div>
                <div style={helperText()}>
                  CCI helps you see how consistently your identity is holding across visible communities.
                </div>
                <div style={helperText()}>
                  Open Trust shows your immediate community standing.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function continuityTone(
  status: string
): { bg: string; border: string; text: string; label: string } {
  const value = safeStr(status).toLowerCase();
  if (value === "protected_lock") {
    return {
      bg: "#FEF2F2",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
      label: "Protected lock",
    };
  }
  if (value === "reverify_required") {
    return {
      bg: "#FFF7ED",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#9A3412",
      label: "Reverification required",
    };
  }
  if (value === "watch") {
    return {
      bg: "#F8FBFF",
      border: "1px solid rgba(11,99,209,0.12)",
      text: "#0B63D1",
      label: "Watch",
    };
  }
  return {
    bg: "#F0FDF4",
    border: "1px solid rgba(34,197,94,0.16)",
    text: "#166534",
    label: "Trusted",
  };
}








