import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";
import { publicApiUrl } from "../lib/publicLinks";
import { buildTrustPassportSnapshot } from "../lib/trustDocumentSnapshots";

type NoticeTone = "success" | "error";

type TrustReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type ExplainabilityEvent = {
  id?: number;
  user_id?: number;
  event_type?: string | null;
  delta?: string | null;
  created_at?: string | null;
  reason?: string | null;
  note?: string | null;
  meta?: Record<string, any> | null;
};

type TrustExplainability = {
  user_id?: number | null;
  current_score?: string | null;
  band?: string | null;
  latest_reason?: string | null;
  latest_note?: string | null;
  latest_source?: string | null;
  recent_events?: ExplainabilityEvent[];
};

type RecomputeRuleset = {
  borrower_repayment_delta?: string | null;
  guarantor_repayment_delta?: string | null;
  precision?: string | null;
  ordering?: string | null;
};

type TrustRecompute = {
  user_id?: number | null;
  score?: string | null;
  band?: string | null;
  event_count?: number | null;
  last_event_id?: number | null;
  breakdown?: {
    ruleset?: RecomputeRuleset | null;
    counts_by_event_type?: Record<string, number> | null;
    delta_by_event_type?: Record<string, any> | null;
    last_event_id_used?: number | null;
    event_count_used?: number | null;
    computed_band?: string | null;
    computed_score?: string | null;
    computed_score_int?: number | null;
  } | null;
};

type MerchantSummary = {
  gmfn_id?: string | null;
  code?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  cci_score?: string | null;
  cci_band?: string | null;
  sponsor_count?: number | null;
  display_name?: string | null;
  community?: string | null;
  band?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  phone_verified?: boolean | null;
};

type CapacityContext = {
  available_guarantee_capacity?: string | null;
  current_locked_guarantees?: string | null;
  overexposure_ratio?: string | null;
  risk_level?: string | null;
  reasons?: string[];
};

type TrustSlipSummary = {
  verified?: boolean | null;
  active?: boolean | null;
  user_id?: number | null;
  clan_id?: number | null;
  gmfn_id?: string | null;
  display_name?: string | null;
  community?: string | null;
  phone_verified?: boolean | null;
  level?: string | null;
  band?: string | null;
  level_label?: string | null;
  lifetime_trust?: string | null;
  standing_score?: string | null;
  trust_score?: string | null;
  trust_slip_limit?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  status?: string | null;
  code?: string | null;
  created_at?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  last_release_at?: string | null;
  last_full_repayment_at?: string | null;
  days_since_last_full_repayment?: number | null;
  cci_score?: string | null;
  cci_band?: string | null;
  graph_score?: string | null;
  active_clan_count?: number | null;
  sponsor_count?: number | null;
  unique_counterparties?: number | null;
  risk_flags?: string[];
  sponsors?: any[];
  internal_contacts?: any[];
  evidence_summary?: {
    capacity_context?: CapacityContext | null;
    readiness_context?: Record<string, any> | null;
  } | null;
  merchant_summary?: MerchantSummary | null;
  merchant_visibility_level?: string | null;
  visibility_options?: string[];
  is_current?: boolean | null;
  issued_reason?: string | null;
  not_a_bank_guarantee?: boolean | null;
  no_auto_debit?: boolean | null;
  disclaimer?: string | null;
  generated_at?: string | null;
  public_verify_url?: string | null;
  verification_code?: string | null;
  verification_token?: string | null;
  token?: string | null;
};

type ClanListItem = {
  id?: number;
  name?: string | null;
  description?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
  community_code?: string | null;
};

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

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const num = Number(value);
    if (!Number.isNaN(num)) return num;
  }
  return null;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function safeCopyText(text: string) {
  const value = safeStr(text);
  if (!value) return;

  api.safeCopy(value);
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
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

function browserOrigin(): string {
  try {
    if (typeof window === "undefined") return "";
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

function dedupeStrings(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const text = safeStr(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }

  return out;
}

function buildApiRoots(): string[] {
  const base = apiBase();
  const origin = browserOrigin();
  const out: string[] = [];

  if (base) out.push(base);

  if (origin) out.push(origin);
  return dedupeStrings(out.map((item) => item.replace(/\/+$/, "")));
}

function joinUrl(root: string, path: string): string {
  const cleanRoot = safeStr(root).replace(/\/+$/, "");
  const cleanPath = safeStr(path).startsWith("/")
    ? safeStr(path)
    : `/${safeStr(path)}`;

  if (cleanPath.startsWith("http://") || cleanPath.startsWith("https://")) {
    return cleanPath;
  }

  return `${cleanRoot}${cleanPath}`;
}

async function fetchFirstJson(
  paths: string[],
  methods: Array<"GET" | "POST"> = ["GET"],
  extraHeaders: Record<string, string> = {}
): Promise<any | null> {
  const roots = buildApiRoots();
  const token =
    typeof (api as any).getAccessToken === "function"
      ? (api as any).getAccessToken()
      : "";

  for (const method of methods) {
    for (const path of paths) {
      for (const root of roots) {
        const url = joinUrl(root, path);

        try {
          const headers: Record<string, string> = {
            accept: "application/json",
            ...extraHeaders,
          };

          if (method === "POST") {
            headers["Content-Type"] = "application/json";
          }

          if (token) {
            headers["Authorization"] = `Bearer ${token}`;
          }

          const res = await fetch(url, {
            method,
            headers,
            credentials: "include",
            cache: "no-store",
            body: method === "POST" ? "{}" : undefined,
          });

          if (!res.ok) continue;

          const contentType = String(res.headers.get("content-type") || "").toLowerCase();
          if (!contentType.includes("application/json")) continue;

          return await res.json();
        } catch {
          // continue
        }
      }
    }
  }

  return null;
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function normalizeExplainability(raw: any): TrustExplainability | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;
  return {
    user_id: src?.user_id ?? null,
    current_score: firstTruthy(src?.current_score, src?.score),
    band: firstTruthy(src?.band),
    latest_reason: firstTruthy(src?.latest_reason, src?.reason),
    latest_note: firstTruthy(src?.latest_note, src?.note),
    latest_source: firstTruthy(src?.latest_source, src?.source),
    recent_events: Array.isArray(src?.recent_events)
      ? src.recent_events.map((row: any) => ({
          id: positiveNumber(row?.id) || undefined,
          user_id: positiveNumber(row?.user_id) || undefined,
          event_type: firstTruthy(row?.event_type, row?.type),
          delta: firstTruthy(row?.delta),
          created_at: firstTruthy(row?.created_at),
          reason: firstTruthy(row?.reason),
          note: firstTruthy(row?.note),
          meta: row?.meta || null,
        }))
      : [],
  };
}

function normalizeRecompute(raw: any): TrustRecompute | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;
  return {
    user_id: src?.user_id ?? null,
    score: firstTruthy(src?.score),
    band: firstTruthy(src?.band),
    event_count: src?.event_count ?? null,
    last_event_id: src?.last_event_id ?? null,
    breakdown: src?.breakdown
      ? {
          ruleset: src.breakdown?.ruleset
            ? {
                borrower_repayment_delta: firstTruthy(
                  src.breakdown.ruleset?.borrower_repayment_delta
                ),
                guarantor_repayment_delta: firstTruthy(
                  src.breakdown.ruleset?.guarantor_repayment_delta
                ),
                precision: firstTruthy(src.breakdown.ruleset?.precision),
                ordering: firstTruthy(src.breakdown.ruleset?.ordering),
              }
            : null,
          counts_by_event_type: src.breakdown?.counts_by_event_type || {},
          delta_by_event_type: src.breakdown?.delta_by_event_type || {},
          last_event_id_used: src.breakdown?.last_event_id_used ?? null,
          event_count_used: src.breakdown?.event_count_used ?? null,
          computed_band: firstTruthy(src.breakdown?.computed_band),
          computed_score: firstTruthy(src.breakdown?.computed_score),
          computed_score_int: src.breakdown?.computed_score_int ?? null,
        }
      : null,
  };
}

function normalizeTrustSlipSummary(raw: any): TrustSlipSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;
  if (!src || typeof src !== "object") return null;

  return {
    verified: src?.verified ?? null,
    active: src?.active ?? null,
    user_id: src?.user_id ?? null,
    clan_id: src?.clan_id ?? null,
    gmfn_id: firstTruthy(src?.gmfn_id),
    display_name: firstTruthy(src?.display_name),
    community: firstTruthy(src?.community),
    phone_verified: src?.phone_verified ?? null,
    level: firstTruthy(src?.level),
    band: firstTruthy(src?.band),
    level_label: firstTruthy(src?.level_label),
    lifetime_trust: firstTruthy(src?.lifetime_trust),
    standing_score: firstTruthy(src?.standing_score),
    trust_score: firstTruthy(src?.trust_score),
    trust_slip_limit: firstTruthy(src?.trust_slip_limit),
    trust_limit: firstTruthy(src?.trust_limit),
    currency: firstTruthy(src?.currency),
    status: firstTruthy(src?.status),
    code: firstTruthy(src?.code),
    created_at: firstTruthy(src?.created_at),
    issued_at: firstTruthy(src?.issued_at),
    expires_at: firstTruthy(src?.expires_at),
    expiry_policy: firstTruthy(src?.expiry_policy),
    last_release_at: firstTruthy(src?.last_release_at),
    last_full_repayment_at: firstTruthy(src?.last_full_repayment_at),
    days_since_last_full_repayment: src?.days_since_last_full_repayment ?? null,
    cci_score: firstTruthy(src?.cci_score),
    cci_band: firstTruthy(src?.cci_band),
    graph_score: firstTruthy(src?.graph_score),
    active_clan_count: src?.active_clan_count ?? null,
    sponsor_count: src?.sponsor_count ?? null,
    unique_counterparties: src?.unique_counterparties ?? null,
    risk_flags: Array.isArray(src?.risk_flags)
      ? src.risk_flags.map((item: any) => safeStr(item)).filter(Boolean)
      : [],
    sponsors: Array.isArray(src?.sponsors) ? src.sponsors : [],
    internal_contacts: Array.isArray(src?.internal_contacts)
      ? src.internal_contacts
      : [],
    evidence_summary: src?.evidence_summary || null,
    merchant_summary: src?.merchant_summary || null,
    merchant_visibility_level: firstTruthy(src?.merchant_visibility_level),
    visibility_options: Array.isArray(src?.visibility_options)
      ? src.visibility_options
      : [],
    is_current: src?.is_current ?? null,
    issued_reason: firstTruthy(src?.issued_reason),
    not_a_bank_guarantee: src?.not_a_bank_guarantee ?? null,
    no_auto_debit: src?.no_auto_debit ?? null,
    disclaimer: firstTruthy(src?.disclaimer),
    generated_at: firstTruthy(src?.generated_at),
    public_verify_url: firstTruthy(src?.public_verify_url),
    verification_code: firstTruthy(src?.verification_code),
    verification_token: firstTruthy(src?.verification_token),
    token: firstTruthy(src?.token),
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 28,
    padding: "clamp(16px, 4vw, 22px)",
    backdropFilter: "blur(7px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 20,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    ...institutionalStatTile(
      bg,
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(37,78,119,0.12)"
        : border,
    ),
    borderRadius: 18,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
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
      ...tapSafeButtonBase(),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 50,
      minWidth: 126,
      padding: "12px 17px",
      borderRadius: 16,
      border: disabled ? "1px solid rgba(148,163,184,0.22)" : "1px solid rgba(11,49,92,0.22)",
      background: disabled
        ? "linear-gradient(180deg, #CBD5E1 0%, #B8C4D2 100%)"
        : "linear-gradient(180deg, #0B63D1 0%, #1A5FA4 58%, #0D3C6C 100%)",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 14px 26px rgba(10,24,49,0.18), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -3px 0 rgba(4,22,42,0.18)",
    };
  }

  if (kind === "soft") {
    return {
      ...tapSafeButtonBase(),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 48,
      minWidth: 118,
      padding: "11px 15px",
      borderRadius: 15,
      border: "1px solid rgba(37,78,119,0.14)",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(240,247,253,0.95) 60%, rgba(225,237,247,0.92) 100%)",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 11px 22px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.82), inset 0 -2px 0 rgba(16,37,59,0.04)",
    };
  }

  return {
    ...tapSafeButtonBase(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    minWidth: 126,
    padding: "12px 17px",
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(246,251,255,0.96) 58%, rgba(233,243,251,0.94) 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled
      ? "none"
      : "0 12px 24px rgba(10,24,49,0.095), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(16,37,59,0.05)",
  };
}

function tapSafeButtonBase(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 8,
    boxSizing: "border-box",
    pointerEvents: "auto",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    appearance: "none",
    WebkitAppearance: "none",
    isolation: "isolate",
    transform: "none",
    outlineOffset: 4,
  };
}

function stopTrustTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
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

function absoluteUrl(pathOrUrl: string): string {
  const raw = safeStr(pathOrUrl);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return publicApiUrl(raw);
  }
  if (raw.startsWith("/")) {
    return publicApiUrl(raw);
  }
  return raw;
}

function getCciState(me: any, trustSlip: any): TrustReadingState {
  const rawScore =
    me?.cci_score ??
    me?.cross_client_integrity_score ??
    me?.cross_clan_integrity_score ??
    me?.cross_community_integrity_score ??
    trustSlip?.cci_score ??
    null;

  const rawClass =
    me?.cci_class ??
    me?.cross_client_integrity_class ??
    me?.cross_clan_integrity_class ??
    me?.cross_community_integrity_class ??
    trustSlip?.cci_band ??
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
            ? "-"
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
            ? "-"
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
            ? "-"
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
          ? "-"
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
    scoreText: "-",
    tone: "neutral",
    statusText: "No CCI reading yet",
    whyText: "Complete identity and community activity first. The fuller cross-community reading will appear here when it is available.",
  };
}

function getOpenTrustState(
  me: any,
  trustSlip: any,
  hasSelectedCommunity: boolean
): TrustReadingState {
  const rawClass = firstNonEmpty(
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

  const rawWhy = firstNonEmpty(
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
            ? "-"
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
            ? "-"
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
            ? "-"
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
          ? "-"
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
      scoreText: "-",
      tone: "neutral",
      statusText: "Select a community to view Open Trust",
      whyText:
        "Open Trust belongs to your immediate community reading, not to your cross-community integrity reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "-",
    tone: "neutral",
    statusText: "No Open Trust reading yet",
    whyText:
      "Open Trust reflects your standing in the community you are using now. Select or use a community first, then this reading will appear here.",
  };
}

export default function TrustScorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const trustRevealRef = useRef<number | null>(null);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [clansList, setClansList] = useState<ClanListItem[]>([]);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [explainability, setExplainability] = useState<TrustExplainability | null>(
    null
  );
  const [recompute, setRecompute] = useState<TrustRecompute | null>(null);
  const [trustSlipSummary, setTrustSlipSummary] = useState<TrustSlipSummary | null>(
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
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadAll = useCallback(async () => {
    const clanHeaders: Record<string, string> = {};
    if (selectedClanId) {
      clanHeaders["X-Clan-Id"] = String(selectedClanId);
    }

    const [meRes, clanRes, clansRes, guidanceRes] = await Promise.all([
      typeof (api as any).getMe === "function"
        ? (api as any).getMe().catch(() => null)
        : Promise.resolve(null),
      typeof (api as any).getCurrentClan === "function"
        ? (api as any).getCurrentClan().catch(() => null)
        : Promise.resolve(null),
      (async () => {
        const viaFn = await callFirstAvailable(
          ["listMyClans", "getMyClans"],
          [[]]
        );
        if (viaFn) return viaFn;
        return fetchFirstJson(["/clans/me"], ["GET"], clanHeaders);
      })(),
      buildGuidanceSnapshot().catch(() => null),
    ]);

    const [explainRes, recomputeRes, trustSlipRes] = await Promise.all([
      (async () => {
        const viaFn = await callFirstAvailable(
          [
            "getMyTrustExplainability",
            "getTrustExplainability",
            "getTrustWhyMe",
          ],
          [[{ clan_id: selectedClanId || undefined }], []]
        );

        if (viaFn) return viaFn;

        return fetchFirstJson(
          [
            "/admin/trust-explainability/me",
            "/admin/trust-explainability/my",
            "/admin/trust-explainability/get-my-trust-explainability",
            "/admin/trust_explainability/get_my_trust_explainability",
            "/trust-explainability/me",
            "/trust_explainability/me",
          ],
          ["GET"],
          clanHeaders
        );
      })(),
      (async () => {
        const viaFn = await callFirstAvailable(
          [
            "recomputeMyTrust",
            "recomputeTrustMe",
            "recomputeMe",
            "getRecomputeMe",
          ],
          [[{ clan_id: selectedClanId || undefined }], [], [selectedClanId || undefined]]
        );

        if (viaFn) return viaFn;

        return fetchFirstJson(
          [
            "/admin/trust-explainability/recompute-me",
            "/admin/trust-explainability/recompute_me",
            "/admin/trust_explainability/recompute_me",
            "/trust-explainability/recompute-me",
            "/trust_explainability/recompute_me",
          ],
          ["POST", "GET"],
          clanHeaders
        );
      })(),
      (async () => {
        const viaFn = await callFirstAvailable(
          [
            "getMyTrustSlipSummary",
            "getTrustSlipSummary",
            "getTrustSlipMeSummary",
            "getMyTrustSlip",
          ],
          [[], [{ clan_id: selectedClanId || undefined }]]
        );

        if (viaFn) return viaFn;

        return fetchFirstJson(
          [
            "/trust-slips/me/summary",
            "/trust-slips/me-summary",
            "/trust-slips/summary/me",
          ],
          ["GET"],
          clanHeaders
        );
      })(),
    ]);

    setMe(meRes || null);
    setCurrentClan(clanRes || null);
    setClansList(rowsOf<ClanListItem>(clansRes));
    setGuidance(guidanceRes || null);
    setExplainability(normalizeExplainability(explainRes));
    setRecompute(normalizeRecompute(recomputeRes));
    setTrustSlipSummary(normalizeTrustSlipSummary(trustSlipRes));
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        await loadAll();
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadAll]);

  async function handleRefreshTrust() {
    setRefreshing(true);

    try {
      await loadAll();
      setNotice({
        tone: "success",
        text: "Trust reading refreshed.",
      });
    } catch {
      setNotice({
        tone: "error",
        text: "Trust reading could not be refreshed right now.",
      });
    } finally {
      setRefreshing(false);
    }
  }

  const matchedClan = useMemo(() => {
    const currentId = positiveNumber(currentClan?.id || currentClan?.clan_id || selectedClanId);
    return clansList.find((row) => positiveNumber(row?.id) === currentId) || null;
  }, [clansList, currentClan, selectedClanId]);

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        trustSlipSummary?.display_name,
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [trustSlipSummary, me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(trustSlipSummary?.gmfn_id, me?.gmfn_id, "Awaiting issue");
  }, [trustSlipSummary, me]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        trustSlipSummary?.community,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title,
        matchedClan?.marketplace_name,
        matchedClan?.name
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [trustSlipSummary, currentClan, matchedClan, selectedClanId]);
  const communityCode = useMemo(() => {
    return (
      firstTruthy(matchedClan?.community_code, currentClan?.community_code) ||
      "Awaiting issue"
     );
  }, [matchedClan, currentClan]);

  const currentBand = useMemo(() => {
    return firstTruthy(
      recompute?.breakdown?.computed_band,
      recompute?.band,
      explainability?.band,
      trustSlipSummary?.band,
      trustSlipSummary?.level,
      "Awaiting issue"
    );
  }, [recompute, explainability, trustSlipSummary]);

  const currentScore = useMemo(() => {
    return firstTruthy(
      recompute?.breakdown?.computed_score,
      recompute?.score,
      explainability?.current_score,
      trustSlipSummary?.trust_score,
      "-"
    );
  }, [recompute, explainability, trustSlipSummary]);

  const readingTone = useMemo(() => {
    const raw = safeStr(currentBand).toLowerCase();

    if (
      raw.includes("gold") ||
      raw === "a" ||
      raw === "a+" ||
      raw === "b" ||
      raw.includes("healthy")
    ) {
      return {
        bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };
    }

    if (
      raw.includes("silver") ||
      raw.includes("bronze") ||
      raw === "c"
    ) {
      return {
        bg: "#FFFBEF",
        border: "1px solid rgba(245,158,11,0.16)",
        text: "#92400E",
      };
    }

    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }, [currentBand]);

  const recentEvents = useMemo(() => {
    return Array.isArray(explainability?.recent_events)
      ? explainability.recent_events.slice(0, 10)
      : [];
  }, [explainability]);

  const eventCounts = useMemo(() => {
    const rows = Object.entries(recompute?.breakdown?.counts_by_event_type || {});
    rows.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    return rows.slice(0, 12);
  }, [recompute]);

  const nextStep = useMemo(() => {
    return {
      title: safeStr(
        guidance?.nextBestStep?.title || "Keep your next trust step clean."
      ),
      detail: safeStr(
        guidance?.nextBestStep?.detail ||
          "Use the recent trust explanation and event mix to understand what to repair or protect next."
      ),
      ctaTo: safeStr(guidance?.nextBestStep?.ctaTo || "/app/notifications"),
      ctaLabel: safeStr(guidance?.nextBestStep?.ctaLabel || "Open Action Inbox"),
    };
  }, [guidance]);

  const verifyUrl = useMemo(() => {
    return absoluteUrl(
      firstTruthy(
        trustSlipSummary?.public_verify_url,
        trustSlipSummary?.verification_code
          ? `/trust-slips/verify/${encodeURIComponent(
              safeStr(trustSlipSummary.verification_code)
            )}/page`
          : "",
        trustSlipSummary?.code
          ? `/trust-slips/verify/${encodeURIComponent(
              safeStr(trustSlipSummary.code)
            )}/page`
          : ""
      )
    );
  }, [trustSlipSummary]);

  const capacityContext = trustSlipSummary?.evidence_summary?.capacity_context || null;
  const ruleset = recompute?.breakdown?.ruleset || null;

  const trustLimit = firstTruthy(
    trustSlipSummary?.trust_limit,
    trustSlipSummary?.trust_slip_limit,
    "0.00"
  );
  const trustCurrency = firstTruthy(trustSlipSummary?.currency, "NGN");
  const graphScore = firstTruthy(trustSlipSummary?.graph_score, "-");
  const cciScore = firstTruthy(trustSlipSummary?.cci_score, "-");
  const cciBand = firstTruthy(trustSlipSummary?.cci_band, "-");
  const levelLabel = firstTruthy(trustSlipSummary?.level_label, "-");
  const standingScore = firstTruthy(trustSlipSummary?.standing_score, "-");
  const lifetimeTrust = firstTruthy(trustSlipSummary?.lifetime_trust, "-");
  const riskFlags = Array.isArray(trustSlipSummary?.risk_flags)
    ? trustSlipSummary!.risk_flags!
    : [];
  const hasSelectedCommunity = useMemo(
    () => positiveNumber(currentClan?.id || currentClan?.clan_id || selectedClanId) > 0,
    [currentClan, selectedClanId]
  );
  const openTrust = useMemo(
    () => getOpenTrustState(me, trustSlipSummary, hasSelectedCommunity),
    [me, trustSlipSummary, hasSelectedCommunity]
  );
  const cci = useMemo(() => getCciState(me, trustSlipSummary), [me, trustSlipSummary]);
  const trustSlipCode = useMemo(
    () =>
      firstTruthy(
        trustSlipSummary?.code,
        trustSlipSummary?.verification_code,
        trustSlipSummary?.token
      ),
    [trustSlipSummary]
  );
  function openTrustRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function revealTrustSection(targetId: string, attempt = 0) {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    if (trustRevealRef.current !== null) {
      window.cancelAnimationFrame(trustRevealRef.current);
      trustRevealRef.current = null;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      if (attempt >= 6) return;
      trustRevealRef.current = window.requestAnimationFrame(() => {
        revealTrustSection(targetId, attempt + 1);
      });
      return;
    }

    target.scrollIntoView({ behavior: "auto", block: "start" });
  }

  function openTrustSection(targetId: string) {
    revealTrustSection(targetId);
  }

  function handleCopy(text: string, successText: string, emptyText: string) {
    const value = safeStr(text);
    if (!value) {
      setNotice({ tone: "error", text: emptyText });
      return;
    }

    safeCopyText(value);
    setNotice({ tone: "success", text: successText });
  }

  function copyTrustSnapshot() {
    handleCopy(
      buildTrustPassportSnapshot({
        memberName,
        gmfnId,
        communityName,
        communityCode,
        currentBand,
        currentScore,
        openTrustClass: openTrust.classText,
        cciClass: cci.classText,
        trustSlipCode,
        nextStepLabel: nextStep.ctaLabel,
        verifyUrl,
      }),
      "Trust snapshot copied.",
      "Trust snapshot is not available yet."
    );
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
          sectionLabel="Trust Passport"
          title="Trust Passport"
          subtitle="Loading the trust passport..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Trust Passport...
          </div>
        </section>
      </div>
    );
  }

  const trustSlipStatus = firstTruthy(
    trustSlipSummary?.status,
    trustSlipSummary?.active || trustSlipSummary?.verified || trustSlipCode
      ? "Ready"
      : "Pending"
  );
  const issuedText = safeDateTime(trustSlipSummary?.issued_at) || "Not stated";
  const expiresText = safeDateTime(trustSlipSummary?.expires_at) || "Not stated";
  const eventCount = safeStr(recompute?.event_count ?? "0");
  const activeClanCount = safeStr(trustSlipSummary?.active_clan_count ?? "0");
  const counterpartiesCount = safeStr(
    trustSlipSummary?.unique_counterparties ?? "0"
  );
  const riskLevel = firstTruthy(capacityContext?.risk_level, "Unknown");
  const surfaceCards = [
    {
      title: "Identity & Integrity",
      detail: "Use this for steady identity proof.",
      cta: "Open Identity & Integrity",
      tone: "#EAF3FF",
      icon: "🪪",
      to: "/app/identity",
    },
    {
      title: "CCI",
      detail: "Use this for the cross-community integrity read.",
      cta: "Open CCI",
      tone: "#E9F8EF",
      icon: "🌐",
      to: "/app/cci-reading",
    },
    {
      title: "TrustSlip",
      detail: "Use this to carry a short portable proof.",
      cta: "Open TrustSlip",
      tone: "#FFF6DB",
      icon: "📄",
      to: "/app/trust-slip",
    },
    {
      title: "TrustSlip Verify",
      detail: "Use this to check whether a public code is valid now.",
      cta: "Open Verify",
      tone: "#F4EEFF",
      icon: "🛡️",
      to: "/app/trust-slip/verify",
    },
  ];

  const MetricTile = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value: React.ReactNode;
    icon: string;
  }) => (
    <div style={statTile()}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div style={sectionLabel()}>{label}</div>
        <div style={{ fontSize: 24, lineHeight: 1 }}>{icon}</div>
      </div>
      <div
        style={{
          marginTop: 8,
          color: "#07172C",
          fontSize: isCompact ? 20 : 22,
          fontWeight: 1000,
          lineHeight: 1.12,
        }}
      >
        {value}
      </div>
    </div>
  );

  const SurfaceCard = ({
    item,
  }: {
    item: (typeof surfaceCards)[number];
  }) => (
    <div
      style={{
        ...innerCard(`linear-gradient(180deg, ${item.tone} 0%, #FFFFFF 100%)`),
        display: "grid",
        gap: 10,
        minHeight: 178,
      }}
    >
      <div style={{ fontSize: 30, lineHeight: 1 }}>{item.icon}</div>
      <div
        style={{
          color: "#07172C",
          fontWeight: 1000,
          fontSize: 16,
          lineHeight: 1.2,
        }}
      >
        {item.title}
      </div>
      <div style={{ ...helperText(), fontSize: 13.5, lineHeight: 1.45 }}>
        {item.detail}
      </div>
      <button
        type="button"
        onPointerDown={stopTrustTap}
        onMouseDown={stopTrustTap}
        onClick={() => openTrustRoute(item.to)}
        style={{
          ...actionBtn(item.title === "TrustSlip" ? "soft" : "primary"),
          minHeight: 44,
          width: "100%",
          alignSelf: "end",
        }}
      >
        {item.cta}
      </button>
    </div>
  );

  const noticeNode = notice ? (
    <div style={noticeCard(notice.tone)}>{notice.text}</div>
  ) : null;

  return (
    <main
      className="trust-passport-root gsn-page theme-trust"
      style={{
        minHeight: "100vh",
        margin: "-18px",
        padding: "18px 18px 42px",
        display: "grid",
        gap: 14,
      }}
    >
      <div
        style={{
          width: "min(100%, 980px)",
          margin: "0 auto",
          display: "grid",
          gap: 14,
        }}
      >
        <PageTopNav
          sectionLabel="Main Movement"
          title="Trust Passport"
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
        />

        {noticeNode}

        <section
          style={{
            ...pageCard(
              "radial-gradient(circle at 82% 26%, rgba(242,207,119,0.22), transparent 28%), linear-gradient(135deg, #03101F 0%, #08213A 64%, #061827 100%)"
            ),
            color: "#FFFFFF",
            border: "1px solid rgba(242,207,119,0.34)",
            boxShadow: "0 22px 48px rgba(3,16,31,0.22)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 190px",
              gap: 18,
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ ...sectionLabel(), color: "#F2CF77" }}>
                Trust Passport
              </div>
              <h1
                style={{
                  margin: "8px 0 0",
                  fontSize: isCompact ? 30 : 42,
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  fontWeight: 1000,
                }}
              >
                Full trust reading
              </h1>
              <p
                style={{
                  margin: "10px 0 0",
                  color: "rgba(255,255,255,0.84)",
                  fontSize: 16,
                  lineHeight: 1.45,
                  maxWidth: 560,
                }}
              >
                See what is helping your trust, what needs care, and what to do next.
              </p>

              <div
                style={{
                  marginTop: 16,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ ...badge(false), color: "#FFFFFF" }}>
                  🪪 GMFN ID: {gmfnId}
                </span>
                <span style={{ ...badge(false), color: "#FFFFFF" }}>
                  👥 Community: {communityName}
                </span>
                <span style={{ ...badge(false), color: "#FFFFFF" }}>
                  # Community ID: {communityCode}
                </span>
              </div>

              <div
                style={{
                  marginTop: 16,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <button
                  type="button"
                  onPointerDown={stopTrustTap}
                  onMouseDown={stopTrustTap}
                  onClick={() => {
                    void handleRefreshTrust();
                  }}
                  disabled={refreshing}
                  style={{ ...actionBtn("primary", refreshing), width: "100%" }}
                >
                  🔄 {refreshing ? "Refreshing..." : "Refresh Trust Reading"}
                </button>
                <button
                  type="button"
                  onPointerDown={stopTrustTap}
                  onMouseDown={stopTrustTap}
                  onClick={copyTrustSnapshot}
                  style={{ ...actionBtn("secondary"), width: "100%" }}
                >
                  📋 Copy Snapshot
                </button>
                <button
                  type="button"
                  onPointerDown={stopTrustTap}
                  onMouseDown={stopTrustTap}
                  onClick={() => {
                    if (verifyUrl && typeof window !== "undefined") {
                      window.open(verifyUrl, "_blank", "noopener,noreferrer");
                      return;
                    }
                    openTrustRoute("/app/trust-slip/verify");
                  }}
                  style={{ ...actionBtn("secondary"), width: "100%" }}
                >
                  🔎 Open TrustSlip Verify
                </button>
              </div>
            </div>

            <div
              aria-hidden
              style={{
                justifySelf: isCompact ? "center" : "end",
                width: 160,
                height: 160,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background:
                  "radial-gradient(circle, rgba(242,207,119,0.20), rgba(255,255,255,0.05) 62%, rgba(255,255,255,0.02))",
                border: "1px solid rgba(242,207,119,0.18)",
                boxShadow: "inset 0 0 32px rgba(242,207,119,0.10)",
                fontSize: 76,
              }}
            >
              🛡️
            </div>
          </div>
        </section>

        <section
          style={{
            ...pageCard(
              "linear-gradient(135deg, #FFF8F8 0%, #FFFFFF 56%, #FFF9E8 100%)"
            ),
            border: "1px solid rgba(200,58,58,0.18)",
            boxShadow: "0 14px 34px rgba(200,58,58,0.07)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 0.9fr) minmax(320px, 1.1fr)",
              gap: 14,
              alignItems: "stretch",
            }}
          >
            <div>
              <div
                style={{
                  color: "#07172C",
                  fontWeight: 1000,
                  fontSize: 19,
                }}
              >
                Current Trust Posture
              </div>
              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "120px 1fr",
                  gap: 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: readingTone.text,
                    fontSize: 66,
                    lineHeight: 0.9,
                    fontWeight: 1000,
                  }}
                >
                  {currentBand}
                </div>
                <div
                  style={{
                    borderLeft: "1px solid rgba(7,23,44,0.12)",
                    paddingLeft: 18,
                  }}
                >
                  <div style={sectionLabel()}>Score</div>
                  <div
                    style={{
                      color: "#07172C",
                      fontSize: 32,
                      fontWeight: 1000,
                      lineHeight: 1,
                      marginTop: 6,
                    }}
                  >
                    {currentScore}
                  </div>
                </div>
              </div>
              <p style={{ ...helperText(), marginTop: 14, maxWidth: 360 }}>
                {nextStep.detail ||
                  "Respond early to keep your trust record understandable."}
              </p>
              <button
                type="button"
                onPointerDown={stopTrustTap}
                onMouseDown={stopTrustTap}
                onClick={() =>
                  openTrustSection("trust-passport-explainability")
                }
                style={{
                  ...actionBtn("primary"),
                  marginTop: 12,
                  background:
                    "linear-gradient(180deg, #E33636 0%, #B81414 100%)",
                  border: "1px solid rgba(153,27,27,0.22)",
                }}
              >
                Review what needs care →
              </button>
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                display: "grid",
                gap: 0,
                padding: 0,
                overflow: "hidden",
              }}
            >
              {[
                ["🛡️", "TrustSlip", trustSlipStatus],
                ["🌐", "CCI", cciBand],
                ["🔗", "Verification code", trustSlipCode || "Not stated"],
                ["📅", "Issued", issuedText],
                ["📅", "Expires", expiresText],
              ].map(([icon, label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "32px minmax(0, 1fr) minmax(0, 1fr)",
                    gap: 10,
                    alignItems: "center",
                    padding: "12px 14px",
                    borderBottom: "1px solid rgba(216,227,238,0.72)",
                  }}
                >
                  <span>{icon}</span>
                  <span style={{ color: "#46566D", fontWeight: 850 }}>{label}</span>
                  <span
                    style={{
                      color:
                        label === "TrustSlip" && value === "Ready"
                          ? "#168254"
                          : label === "CCI" && safeStr(value).toUpperCase() !== "A"
                          ? "#92400E"
                          : "#07172C",
                      fontWeight: 900,
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="trust-passport-summary" style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#07172C",
              fontWeight: 1000,
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            Trust Summary
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <MetricTile label="Current Band" value={currentBand} icon="🛡️" />
            <MetricTile label="Current Score" value={currentScore} icon="📈" />
            <MetricTile
              label="Trust Limit"
              value={`${trustLimit} ${trustCurrency}`}
              icon="💳"
            />
            <MetricTile label="Event Count" value={eventCount} icon="🗓️" />
            <MetricTile label="Active Clans" value={activeClanCount} icon="👥" />
            <MetricTile
              label="Counterparties"
              value={counterpartiesCount}
              icon="🤝"
            />
          </div>
        </section>

        <section id="trust-passport-explainability" style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#07172C",
              fontWeight: 1000,
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            Why did my trust change?
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F4F8FF")}>
              <div style={{ fontSize: 24 }}>💬</div>
              <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B4EB3" }}>
                Latest explanation
              </div>
              <p style={{ ...helperText(), margin: "8px 0 0", lineHeight: 1.5 }}>
                {safeStr(
                  explainability?.latest_reason ||
                    explainability?.latest_note ||
                    "No recent trust movement is shown yet."
                )}
              </p>
            </div>
            <div style={innerCard("#F8F6FF")}>
              <div style={{ fontSize: 24 }}>🕘</div>
              <div style={{ marginTop: 8, fontWeight: 1000, color: "#5542A8" }}>
                Recent trust events
              </div>
              <p style={{ ...helperText(), margin: "8px 0 0", lineHeight: 1.5 }}>
                {recentEvents.length
                  ? `${recentEvents.length} recent trust event${
                      recentEvents.length === 1 ? "" : "s"
                    } visible.`
                  : "No recent trust events are visible."}
              </p>
            </div>
            <div style={innerCard("#F3FBF5")}>
              <div style={{ fontSize: 24 }}>✅</div>
              <div style={{ marginTop: 8, fontWeight: 1000, color: "#166534" }}>
                What helps trust
              </div>
              <ul style={{ ...helperText(), margin: "8px 0 0", paddingLeft: 18 }}>
                <li>Completed repayments</li>
                <li>Responsible guarantees</li>
                <li>Clean identity continuity</li>
                <li>Promises closed properly</li>
              </ul>
            </div>
            <div style={innerCard("#FFF2F2")}>
              <div style={{ fontSize: 24 }}>⚠️</div>
              <div style={{ marginTop: 8, fontWeight: 1000, color: "#991B1B" }}>
                What creates pressure
              </div>
              <ul style={{ ...helperText(), margin: "8px 0 0", paddingLeft: 18 }}>
                <li>Missed promises</li>
                <li>Pending responses</li>
                <li>Overexposure</li>
                <li>Unresolved actions</li>
              </ul>
            </div>
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#07172C",
              fontWeight: 1000,
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            Choose the right trust surface
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {surfaceCards.map((item) => (
              <SurfaceCard key={item.title} item={item} />
            ))}
          </div>
        </section>

        <section id="trust-passport-evidence" style={pageCard("#FFFFFF")}>
          <div
            style={{
              color: "#07172C",
              fontWeight: 1000,
              fontSize: 18,
              marginBottom: 12,
            }}
          >
            Evidence & Institutional Context
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFBF0")}>
              <div style={{ fontWeight: 1000, color: "#07172C" }}>
                🏛️ Capacity context
              </div>
              {[
                [
                  "Available guarantee capacity",
                  safeStr(capacityContext?.available_guarantee_capacity || "0.00"),
                ],
                [
                  "Current locked guarantees",
                  safeStr(capacityContext?.current_locked_guarantees || "0.00"),
                ],
                [
                  "Overexposure ratio",
                  safeStr(capacityContext?.overexposure_ratio || "0.00"),
                ],
                ["Risk level", riskLevel],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    marginTop: 10,
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    color: "#46566D",
                    borderBottom: "1px dotted rgba(7,23,44,0.18)",
                    paddingBottom: 5,
                  }}
                >
                  <span>{label}</span>
                  <b style={{ color: label === "Risk level" ? "#991B1B" : "#07172C" }}>
                    {value}
                  </b>
                </div>
              ))}
            </div>
            <div style={innerCard("#FFFFFF")}>
              <div style={{ fontWeight: 1000, color: "#07172C" }}>
                🏅 Institutional note
              </div>
              <p style={{ ...helperText(), marginTop: 10 }}>
                {safeStr(
                  trustSlipSummary?.disclaimer ||
                    "Community-backed integrity limit. Not a bank guarantee. No auto-debit. TrustSlip is a portable summary derived from GSN trust history."
                )}
              </p>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(true)}>
                  TrustSlip: {trustSlipStatus || "Pending"}
                </span>
                <span style={badge(false)}>CCI: {cciScore} / {cciBand}</span>
                <span style={badge(false)}>
                  Graph score: {graphScore}
                </span>
              </div>
            </div>
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div style={{ fontWeight: 1000, color: "#07172C" }}>
                🧾 Full reading lines
              </div>
              {[
                ["Open Trust", openTrust.classText],
                ["Open Trust reason", openTrust.whyText],
                ["CCI reason", cci.whyText],
                ["Level label", levelLabel],
                ["Standing score", standingScore],
                ["Lifetime trust", lifetimeTrust],
                ["Sponsors", safeStr(trustSlipSummary?.sponsor_count ?? "0")],
                ["Phone verified", trustSlipSummary?.phone_verified ? "Yes" : "No"],
                [
                  "Not a bank guarantee",
                  trustSlipSummary?.not_a_bank_guarantee ? "Yes" : "No",
                ],
                ["No auto-debit", trustSlipSummary?.no_auto_debit ? "Yes" : "No"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "minmax(110px, 0.8fr) minmax(0, 1.2fr)",
                    gap: 10,
                    alignItems: "start",
                    color: "#46566D",
                    borderBottom: "1px dotted rgba(7,23,44,0.16)",
                    paddingBottom: 5,
                  }}
                >
                  <span>{label}</span>
                  <b
                    style={{
                      color: "#07172C",
                      textAlign: "right",
                      wordBreak: "break-word",
                    }}
                  >
                    {safeStr(value || "-")}
                  </b>
                </div>
              ))}
            </div>
            <div style={innerCard("#FFFDF5")}>
              <div style={{ fontWeight: 1000, color: "#07172C" }}>
                📊 Reading breakdown
              </div>
              <p style={{ ...helperText(), marginTop: 10 }}>
                These are the remaining evidence lines behind the trust reading.
              </p>
              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(false)}>
                  Ruleset: {safeStr(ruleset?.precision || ruleset?.ordering || "Not stated")}
                </span>
                <span style={badge(false)}>
                  Risk flags: {riskFlags.length > 0 ? riskFlags.join(", ") : "None visible"}
                </span>
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {[
                  [
                    "Borrower repayment delta",
                    safeStr(ruleset?.borrower_repayment_delta || "-"),
                  ],
                  [
                    "Guarantor repayment delta",
                    safeStr(ruleset?.guarantor_repayment_delta || "-"),
                  ],
                  ["Precision", safeStr(ruleset?.precision || "-")],
                  ["Ordering", safeStr(ruleset?.ordering || "-")],
                  [
                    "Computed band",
                    safeStr(recompute?.breakdown?.computed_band || recompute?.band || "-"),
                  ],
                  [
                    "Computed score",
                    safeStr(recompute?.breakdown?.computed_score || recompute?.score || "-"),
                  ],
                  [
                    "Computed score int",
                    safeStr(recompute?.breakdown?.computed_score_int ?? "-"),
                  ],
                  [
                    "Last event used",
                    safeStr(
                      recompute?.breakdown?.last_event_id_used ??
                        recompute?.last_event_id ??
                        "-"
                    ),
                  ],
                  [
                    "Event count used",
                    safeStr(
                      recompute?.breakdown?.event_count_used ??
                        recompute?.event_count ??
                        "-"
                    ),
                  ],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      color: "#46566D",
                      borderBottom: "1px dotted rgba(7,23,44,0.16)",
                      paddingBottom: 5,
                    }}
                  >
                    <span>{label}</span>
                    <b style={{ color: "#07172C", textAlign: "right" }}>{value}</b>
                  </div>
                ))}
                {eventCounts.length > 0 ? (
                  eventCounts.map(([eventName, count]) => (
                    <div
                      key={eventName}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        color: "#46566D",
                        borderBottom: "1px dotted rgba(7,23,44,0.16)",
                        paddingBottom: 5,
                      }}
                    >
                      <span>{safeStr(eventName)}</span>
                      <b style={{ color: "#07172C" }}>{safeStr(count)}</b>
                    </div>
                  ))
                ) : (
                  <div style={helperText()}>
                    No event-type breakdown is currently shown.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );

}

