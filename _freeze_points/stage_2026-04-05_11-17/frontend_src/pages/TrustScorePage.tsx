import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getMe,
  getMyTrustSlip,
  getSelectedClanId,
  getTrustScoreExplained,
  getTrustWhyMe,
  listTrustEvents,
  safeCopy,
} from "../lib/api";
import { buildGuidanceSnapshot, type GuidanceSnapshot } from "../lib/guidance";

type NoticeTone = "success" | "error";

type ReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type ExplainRow = {
  title: string;
  detail: string;
};

type TrustEventRow = {
  id: string;
  title: string;
  detail: string;
  eventType: string;
  createdAt: string;
  tone: "green" | "yellow" | "red" | "neutral";
};

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
    whiteSpace: "nowrap",
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
      whiteSpace: "nowrap",
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
      whiteSpace: "nowrap",
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
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
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

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

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

    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }

  return null;
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "";

  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return raw;

  return dt.toLocaleString();
}

function dedupeStrings(values: any[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text) continue;
    if (seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function toArrayRows(raw: any): any[] {
  if (Array.isArray(raw)) return raw;

  const buckets = [raw?.items, raw?.data?.items, raw?.results, raw?.rows, raw?.sections];
  for (const bucket of buckets) {
    if (Array.isArray(bucket)) return bucket;
  }

  return [];
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
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
  trustSlip: any,
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
    trustSlip?.open_trust_reason,
    trustSlip?.community_trust_reason,
    me?.trust_reason,
    trustSlip?.trust_reason
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
      "Open Trust reflects your standing in the currently selected community and will appear here when available.",
  };
}

function toneStyles(tone: "green" | "yellow" | "red" | "neutral") {
  if (tone === "green") {
    return {
      bg: "#F3FBF5",
      border: "1px solid rgba(34,197,94,0.16)",
      text: "#166534",
    };
  }

  if (tone === "yellow") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  if (tone === "red") {
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
}

function collectStringsFromValue(
  value: any,
  out: string[],
  seen: Set<string>,
  limit: number
) {
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
      collectStringsFromValue(item, out, seen, limit);
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
      collectStringsFromValue(candidate, out, seen, limit);
      if (out.length >= limit) return;
    }
  }
}

function extractTextsByKeyTokens(
  input: any,
  tokens: string[],
  limit = 4
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const seenNodes = new Set<any>();

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
        collectStringsFromValue(value, out, seen, limit);
      }

      if (typeof value === "object") {
        walk(value, depth + 1);
      }
    }
  }

  walk(input, 0);
  return out;
}

function buildWhyRows(raw: any, guidance: GuidanceSnapshot | null): {
  helps: string[];
  weakens: string[];
  next: string[];
} {
  const helps = dedupeStrings([
    ...(guidance?.trustChangeExplainer?.helps || []),
    ...extractTextsByKeyTokens(raw, [
      "help",
      "positive",
      "improv",
      "support",
      "good",
      "build",
      "strength",
    ]),
  ]).slice(0, 4);

  const weakens = dedupeStrings([
    ...(guidance?.trustChangeExplainer?.weakens || []),
    ...extractTextsByKeyTokens(raw, [
      "weak",
      "negative",
      "risk",
      "reduce",
      "warning",
      "damage",
      "caution",
    ]),
  ]).slice(0, 4);

  const next = dedupeStrings([
    ...(guidance?.trustChangeExplainer?.next || []),
    ...extractTextsByKeyTokens(raw, [
      "next",
      "action",
      "repair",
      "improve",
      "step",
      "do",
      "what",
    ]),
  ]).slice(0, 4);

  return {
    helps:
      helps.length > 0
        ? helps
        : ["Recent visible participation is helping your trust path."],
    weakens:
      weakens.length > 0
        ? weakens
        : ["No active weakening explanation is visible right now."],
    next:
      next.length > 0
        ? next
        : ["Keep the next clean action visible and avoid drift."],
  };
}

function extractExplainRows(raw: any): ExplainRow[] {
  const rows: ExplainRow[] = [];

  const directSections = [
    ...toArrayRows(raw?.sections),
    ...toArrayRows(raw?.items),
    ...toArrayRows(raw?.data?.sections),
    ...toArrayRows(raw?.data?.items),
  ];

  for (const row of directSections) {
    const title = firstTruthy(row?.title, row?.label, row?.heading);
    const detail = firstTruthy(
      row?.detail,
      row?.text,
      row?.message,
      row?.description
    );

    if (title && detail) {
      rows.push({ title, detail });
    }
  }

  if (rows.length > 0) return rows.slice(0, 6);

  const whatTrustSees = extractTextsByKeyTokens(raw, [
    "signal",
    "factor",
    "input",
    "measure",
    "score",
  ]).slice(0, 2);

  const whatImproves = extractTextsByKeyTokens(raw, [
    "help",
    "positive",
    "strength",
    "build",
    "improve",
  ]).slice(0, 2);

  const whatWeakens = extractTextsByKeyTokens(raw, [
    "weak",
    "risk",
    "warning",
    "negative",
    "caution",
  ]).slice(0, 2);

  if (whatTrustSees.length > 0) {
    rows.push({
      title: "What trust sees",
      detail: whatTrustSees.join(" "),
    });
  }

  if (whatImproves.length > 0) {
    rows.push({
      title: "What improves trust",
      detail: whatImproves.join(" "),
    });
  }

  if (whatWeakens.length > 0) {
    rows.push({
      title: "What weakens trust",
      detail: whatWeakens.join(" "),
    });
  }

  if (rows.length > 0) return rows.slice(0, 6);

  return [
    {
      title: "Visible conduct matters",
      detail:
        "Trust becomes stronger through reliable response, steady participation, clean repayment behavior, and fewer repair signals.",
    },
    {
      title: "Trust is not the same as TrustSlip",
      detail:
        "This page explains your trust position. TrustSlip is the portable verification surface that can be shared or scanned.",
    },
    {
      title: "Open Trust and CCI are different",
      detail:
        "Open Trust is your current-community standing. CCI is the broader cross-community integrity reading across the places where you are visible.",
    },
  ];
}

function eventTone(rawType: string, rawText: string): "green" | "yellow" | "red" | "neutral" {
  const text = `${rawType} ${rawText}`.toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("completed") ||
    text.includes("approved") ||
    text.includes("contributed") ||
    text.includes("delivered") ||
    text.includes("fulfilled")
  ) {
    return "green";
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("cancelled") ||
    text.includes("negative")
  ) {
    return "red";
  }

  if (
    text.includes("risk") ||
    text.includes("warning") ||
    text.includes("repair") ||
    text.includes("flag") ||
    text.includes("attention")
  ) {
    return "yellow";
  }

  return "neutral";
}

function normalizeTrustEvents(raw: any): TrustEventRow[] {
  const rows = toArrayRows(raw);

  return rows.slice(0, 12).map((item: any, index: number) => {
    const eventType = firstTruthy(item?.event_type, item?.kind, item?.type, "trust_event");
    const title = firstTruthy(
      item?.title,
      item?.message,
      item?.detail,
      item?.description,
      eventType
    );
    const detail = firstTruthy(
      item?.detail,
      item?.description,
      item?.message,
      item?.note,
      "A trust event was recorded."
    );

    return {
      id: firstTruthy(item?.id, item?.event_id, `${eventType}-${index}`),
      title,
      detail,
      eventType,
      createdAt: firstTruthy(item?.created_at, item?.occurred_at),
      tone: eventTone(eventType, `${title} ${detail}`),
    };
  });
}

export default function TrustScorePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [trustSlip, setTrustSlip] = useState<any>(null);
  const [trustWhyRaw, setTrustWhyRaw] = useState<any>(null);
  const [trustExplainRaw, setTrustExplainRaw] = useState<any>(null);
  const [trustEventsRaw, setTrustEventsRaw] = useState<any>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

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
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, trustSlipRes, whyRes, explainRes, eventsRes, guidanceRes] =
          await Promise.all([
            getMe().catch(() => null),
            getMyTrustSlip().catch(() => null),
            getTrustWhyMe().catch(() => null),
            getTrustScoreExplained().catch(() => null),
            listTrustEvents({
              clan_id: selectedClanId || undefined,
              limit: 40,
            }).catch(() => ({ items: [] })),
            buildGuidanceSnapshot().catch(() => null),
          ]);

        if (!alive) return;

        setMe(meRes);
        setTrustSlip(trustSlipRes);
        setTrustWhyRaw(whyRes);
        setTrustExplainRaw(explainRes);
        setTrustEventsRaw(eventsRes);
        setGuidance(guidanceRes);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const currentClanName = firstTruthy(
    guidance?.currentClan?.name,
    guidance?.currentClan?.clan_name,
    guidance?.currentClan?.marketplace_name,
    selectedClanId ? `Community ${selectedClanId}` : "",
    "No community selected"
  );

  const cci = useMemo(() => getCciState(me), [me]);
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlip, Boolean(selectedClanId)),
    [me, trustSlip, selectedClanId]
  );

  const cciTone = useMemo(() => toneStyles(cci.tone), [cci.tone]);
  const openTrustTone = useMemo(() => toneStyles(openTrust.tone), [openTrust.tone]);

  const whyRows = useMemo(
    () => buildWhyRows(trustWhyRaw, guidance),
    [trustWhyRaw, guidance]
  );

  const explainRows = useMemo(
    () => extractExplainRows(trustExplainRaw),
    [trustExplainRaw]
  );

  const trustJourney = guidance?.trustJourneySummary || null;
  const recoveryPath = guidance?.recoveryPath || null;
  const trustEvents = useMemo(
    () => normalizeTrustEvents(trustEventsRaw),
    [trustEventsRaw]
  );

  const trustSlipCode = firstTruthy(trustSlip?.code);
  const trustSlipStatus = firstTruthy(trustSlip?.status, "Pending");
  const trustSlipCurrency = firstTruthy(trustSlip?.currency, "NGN");
  const trustSlipLimit = firstTruthy(
    trustSlip?.trust_limit,
    trustSlip?.limit,
    trustSlip?.amount,
    "—"
  );
  const trustSlipExpiresAt = safeDateTime(trustSlip?.expires_at);
  const gmfnId = firstTruthy(me?.gmfn_id, "Pending");

  const trustQrSrc = trustSlipCode
    ? `${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
        trustSlipCode
      )}/qr.png`
    : "";

  function copyGmfnId() {
    if (!gmfnId || gmfnId === "Pending") {
      setNotice({
        tone: "error",
        text: "GMFN ID is not ready yet.",
      });
      return;
    }

    safeCopy(gmfnId);
    setNotice({
      tone: "success",
      text: "GMFN ID copied.",
    });
  }

  function copyTrustSlipCode() {
    if (!trustSlipCode) {
      setNotice({
        tone: "error",
        text: "TrustSlip code is not available yet.",
      });
      return;
    }

    safeCopy(trustSlipCode);
    setNotice({
      tone: "success",
      text: "TrustSlip code copied.",
    });
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
          sectionLabel="Trust"
          title="Trust"
          subtitle="Preparing your trust surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Notifications", to: "/app/notifications" },
            { label: "Community Home", to: "/app/community" },
          ]}
          utilityLinks={[
            { label: "TrustSlip", to: "/app/trust-slip" },
            { label: "My GMFN and I", to: "/app/my-gmfn-and-i" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading your trust position...
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
        sectionLabel="Trust"
        title="Trust"
        subtitle="This page explains your trust position in plain language. It is the explanatory trust surface, not the same thing as TrustSlip."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Notifications", to: "/app/notifications" },
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "TrustSlip", to: "/app/trust-slip" },
          { label: "Settings", to: "/app/my-gmfn-and-i?tab=settings" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Trust overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: isCompact ? 28 : 34,
                fontWeight: 900,
                lineHeight: 1.08,
                maxWidth: 760,
              }}
            >
              Read your trust position without confusion
            </div>

            <div
              style={{
                marginTop: 12,
                color: "#5F7287",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              Open Trust is your immediate community standing. CCI is your
              broader cross-community integrity reading. TrustSlip is the
              portable surface that helps others verify what can be shared.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {currentClanName}</span>
              <span style={badge(false)}>TrustSlip: {trustSlipStatus}</span>
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
                style={actionBtn("secondary")}
              >
                Copy GMFN ID
              </button>

              <Link to="/app/trust-slip" style={actionBtn("primary")}>
                Open TrustSlip
              </Link>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Operational focus</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontSize: 20,
                fontWeight: 900,
                lineHeight: 1.35,
              }}
            >
              {safeStr(
                recoveryPath?.title ||
                  guidance?.nextBestStep?.title ||
                  "Keep your trust path steady."
              )}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 14,
                lineHeight: 1.8,
              }}
            >
              {safeStr(
                recoveryPath?.detail ||
                  guidance?.nextBestStep?.detail ||
                  "The cleanest trust movement is still one clear action at a time."
              )}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {recoveryPath?.ctaTo ? (
                <Link to={recoveryPath.ctaTo} style={actionBtn("primary")}>
                  {safeStr(recoveryPath.ctaLabel || "Open")}
                </Link>
              ) : guidance?.nextBestStep?.ctaTo ? (
                <Link to={guidance.nextBestStep.ctaTo} style={actionBtn("primary")}>
                  {safeStr(guidance.nextBestStep.ctaLabel || "Open")}
                </Link>
              ) : null}

              <Link to="/app/notifications" style={actionBtn("secondary")}>
                Open Action Inbox
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div
          style={{
            ...pageCard(openTrustTone.bg),
            border: openTrustTone.border,
          }}
        >
          <div style={sectionLabel()}>Open Trust</div>

          <div
            style={{
              marginTop: 12,
              color: openTrustTone.text,
              fontSize: isCompact ? 26 : 32,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            {openTrust.classText}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Score</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {openTrust.scoreText}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  color: openTrustTone.text,
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {openTrust.statusText}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, ...helperText() }}>{openTrust.whyText}</div>

          <div style={{ marginTop: 14 }}>
            <span style={badge(false)}>
              Current community: {currentClanName}
            </span>
          </div>
        </div>

        <div
          style={{
            ...pageCard(cciTone.bg),
            border: cciTone.border,
          }}
        >
          <div style={sectionLabel()}>CCI / Cross-Community Integrity</div>

          <div
            style={{
              marginTop: 12,
              color: cciTone.text,
              fontSize: isCompact ? 26 : 32,
              fontWeight: 900,
              lineHeight: 1.08,
            }}
          >
            {cci.classText}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Score</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {cci.scoreText}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  color: cciTone.text,
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {cci.statusText}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 14, ...helperText() }}>{cci.whyText}</div>

          <div style={{ marginTop: 14 }}>
            <span style={badge(false)}>
              Cross-community reading
            </span>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What helped</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {whyRows.helps.map((item, index) => (
              <div key={`help-${index}`} style={innerCard("#FCFEFF")}>
                <div style={helperText()}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What weakened trust</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {whyRows.weakens.map((item, index) => (
              <div key={`weak-${index}`} style={innerCard("#FCFEFF")}>
                <div style={helperText()}>{item}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>What improves it next</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {whyRows.next.map((item, index) => (
              <div key={`next-${index}`} style={innerCard("#FCFEFF")}>
                <div style={helperText()}>{item}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {trustJourney ? (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Trust journey</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: isCompact ? 24 : 30,
              fontWeight: 900,
              lineHeight: 1.12,
              maxWidth: 820,
            }}
          >
            {trustJourney.heading}
          </div>

          <div style={{ marginTop: 12, ...helperText(), maxWidth: 900 }}>
            {trustJourney.detail}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Built</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#166534",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {trustJourney.builtCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Protected</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {trustJourney.protectedCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Weakened</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {trustJourney.weakenedCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Repair</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontWeight: 900,
                  fontSize: 24,
                }}
              >
                {trustJourney.repairCount}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
            {(trustJourney.items || []).length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No trust journey item is visible right now.
              </div>
            ) : (
              trustJourney.items.slice(0, 8).map((item, index) => (
                <div key={`${item.category}-${index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 800,
                        lineHeight: 1.45,
                      }}
                    >
                      {safeStr(item.label || "Trust movement")}
                    </div>

                    <span
                      style={
                        item.category === "built"
                          ? { ...badge(true), background: "rgba(34,197,94,0.10)", color: "#166534" }
                          : item.category === "protected"
                          ? { ...badge(false), background: "rgba(11,99,209,0.08)", color: "#0B63D1" }
                          : item.category === "weakened"
                          ? { ...badge(false), background: "rgba(245,158,11,0.12)", color: "#92400E" }
                          : { ...badge(false), background: "rgba(239,68,68,0.08)", color: "#991B1B" }
                      }
                    >
                      {safeStr(item.category)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      ) : null}

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact
            ? "1fr"
            : "minmax(0, 1fr) minmax(320px, 0.9fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>How trust is being explained</div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {explainRows.map((row, index) => (
              <div key={`${row.title}-${index}`} style={innerCard("#FCFEFF")}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 16,
                    fontWeight: 900,
                    lineHeight: 1.35,
                  }}
                >
                  {row.title}
                </div>

                <div style={{ marginTop: 8, ...helperText() }}>{row.detail}</div>
              </div>
            ))}
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>TrustSlip</div>

          <div
            style={{
              marginTop: 10,
              color: "#0B1F33",
              fontSize: 24,
              fontWeight: 900,
              lineHeight: 1.2,
            }}
          >
            {trustSlipCode ? trustSlipCode : "TrustSlip pending"}
          </div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span style={badge(true)}>Status: {trustSlipStatus}</span>
            <span style={badge(false)}>
              Limit: {trustSlipLimit} {trustSlipCurrency}
            </span>
          </div>

          {trustSlipExpiresAt ? (
            <div style={{ marginTop: 10, ...helperText() }}>
              Expires: {trustSlipExpiresAt}
            </div>
          ) : null}

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 136px",
              gap: 14,
              alignItems: "center",
            }}
          >
            <div>
              <div style={helperText()}>
                TrustSlip is the portable verification surface. This Trust page
                explains your trust position; TrustSlip is the shareable
                instrument that others can verify.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <Link to="/app/trust-slip" style={actionBtn("primary")}>
                  Open TrustSlip
                </Link>

                <button
                  type="button"
                  onClick={copyTrustSlipCode}
                  disabled={!trustSlipCode}
                  style={actionBtn("secondary", !trustSlipCode)}
                >
                  Copy TrustSlip Code
                </button>
              </div>
            </div>

            {trustQrSrc ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <img
                  src={trustQrSrc}
                  alt="TrustSlip QR"
                  style={{
                    width: 124,
                    height: 124,
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#FFFFFF",
                    padding: 6,
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "#64748B",
                    fontWeight: 700,
                    textAlign: "center",
                  }}
                >
                  Scan to verify
                </div>
              </div>
            ) : (
              <div
                style={{
                  color: "#64748B",
                  fontSize: 13,
                  lineHeight: 1.6,
                  textAlign: isCompact ? "left" : "center",
                }}
              >
                QR appears here when TrustSlip is available.
              </div>
            )}
          </div>
        </section>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Recent trust events</div>

        <div
          style={{
            marginTop: 10,
            ...helperText(),
          }}
        >
          These are the recent visible trust signals in your current context.
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          {trustEvents.length === 0 ? (
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              No recent trust event is visible right now.
            </div>
          ) : (
            trustEvents.map((item) => {
              const tone = toneStyles(item.tone);

              return (
                <div
                  key={item.id}
                  style={{
                    ...innerCard(tone.bg),
                    border: tone.border,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.1fr) minmax(260px, 0.9fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 16,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {item.title}
                      </div>

                      <div style={{ marginTop: 8, ...helperText() }}>
                        {item.detail}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: isCompact ? "flex-start" : "flex-end",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          ...badge(item.tone === "green"),
                          background:
                            item.tone === "green"
                              ? "rgba(34,197,94,0.10)"
                              : item.tone === "yellow"
                              ? "rgba(245,158,11,0.12)"
                              : item.tone === "red"
                              ? "rgba(239,68,68,0.08)"
                              : "rgba(100,116,139,0.10)",
                          color:
                            item.tone === "green"
                              ? "#166534"
                              : item.tone === "yellow"
                              ? "#92400E"
                              : item.tone === "red"
                              ? "#991B1B"
                              : "#51657A",
                        }}
                      >
                        {item.eventType}
                      </span>

                      {item.createdAt ? (
                        <span style={badge(false)}>
                          {safeDateTime(item.createdAt)}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}