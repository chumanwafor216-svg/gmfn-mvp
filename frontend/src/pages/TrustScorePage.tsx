import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DomainIntroToggle from "../components/DomainIntroToggle";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import { buildDashboardTrustJourneyCopy } from "../lib/dashboardUserGuidance";
import { navigateWithOrigin } from "../lib/nav";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  explainability: boolean;
  breakdown: boolean;
  evidence: boolean;
};

type TrustReadingState = {
  classText: string;
  scoreText: string;
  tone: "green" | "yellow" | "red" | "neutral";
  statusText: string;
  whyText: string;
};

type FocusCommitmentSummary = {
  onTrackCount: number;
  watchCount: number;
  behindCount: number;
  completedCount: number;
  nextReviewLabel: string;
  disciplineLine: string;
};

type TrustJourneyModel = {
  tone: "neutral" | "green" | "yellow" | "red";
  posture: "unverified" | "repair" | "drifting" | "building" | "steady";
  postureTitle: string;
  postureDetail: string;
  primaryRoute: {
    key: string;
    label: string;
    detail: string;
    to: string;
  };
  secondaryRoute: {
    key: string;
    label: string;
    detail: string;
    to: string;
  };
  helps: string[];
  weakens: string[];
  commitmentLine: string;
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

const TRUST_PASSPORT_UI_STORAGE_KEY = "gmfn.trustPassport.sections.v2";
const DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-commitments.v1";
const DASHBOARD_FOCUS_EVENTS_STORAGE_KEY =
  "gmfn.dashboard.focus-events.v1";

const TRUST_PASSPORT_HELP_BODY =
  "Trust Passport helps your good name travel with you. In real life, many people already get support through trust: a seller may release goods on credit because someone respected says, 'I know this person. They will pay.' GSN keeps that familiar community trust, but gives it a portable proof layer.";

const TRUST_PASSPORT_HELP_BULLETS = [
  "Ordinary vouching already works, but it has limits. It mostly works where you are known. It depends on people being physically available, and it can be affected by sentiment, favour, fear, family pressure, or personal relationships.",
  "Trust Passport is built to solve that gap. It keeps the record of what you have already done: money promises kept, loans repaid, support given, guarantor responsibility, missed promises, completed repayments, and verified community behaviour.",
  "TrustSlip is the shareable proof from that record. Before a seller releases goods on credit, before a loan is approved, before support is given, or before a guarantor accepts risk, your TrustSlip can be checked.",
  "This protects both sides. Your record can speak with you when the people who know you are not present. The seller, community, or guarantor does not have to rely only on words or guesswork.",
  "For the unbanked and underbanked, this means trust is not only about bank statements, salary slips, or how much money someone has. A person who borrows small and repays properly can build proof. A person who supports others responsibly can build proof.",
  "Finance records what happened with money. Trust Passport explains what that behaviour means. TrustSlip proves the current trust state quickly when someone needs to decide.",
];

const TRUST_PASSPORT_HELP_NOTE =
  "Innovation wedge: GSN turns informal community vouching into portable, verifiable trust evidence, especially for people who are normally invisible to formal credit systems.";

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

  if (typeof (api as any).safeCopy === "function") {
    (api as any).safeCopy(value);
    return;
  }

  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    void navigator.clipboard.writeText(value);
  }
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function normalizeDate(value: any): Date | null {
  const raw = safeStr(value);
  if (!raw) return null;
  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return null;
  return dt;
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
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(247,251,255,0.95) 62%, rgba(239,247,253,0.92) 100%)"
      : bg;

  return {
    borderRadius: 28,
    border: "1px solid rgba(37,78,119,0.13)",
    background: resolvedBg,
    padding: "clamp(16px, 4vw, 22px)",
    boxShadow:
      "0 20px 44px rgba(10,24,49,0.075), 0 3px 10px rgba(10,24,49,0.025), inset 0 1px 0 rgba(255,255,255,0.82)",
    overflow: "hidden",
    backdropFilter: "blur(7px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(37,78,119,0.12)",
    background: bg,
    padding: 16,
    boxShadow:
      "0 12px 28px rgba(10,24,49,0.055), inset 0 1px 0 rgba(255,255,255,0.76)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,254,0.94) 100%)"
      : bg;

  return {
    borderRadius: 18,
    border: "1px solid rgba(37,78,119,0.12)",
    background: resolvedBg,
    padding: 15,
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.045), inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  const resolvedBg =
    bg === "#FFFFFF"
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(247,251,254,0.95) 100%)"
      : bg;

  return {
    borderRadius: 18,
    border:
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(37,78,119,0.12)"
        : border,
    background: resolvedBg,
    padding: 14,
    boxShadow:
      "0 10px 22px rgba(10,24,49,0.04), inset 0 1px 0 rgba(255,255,255,0.76)",
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

function collapseToggle(): React.CSSProperties {
  return {
    ...tapSafeButtonBase(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    minWidth: 122,
    padding: "12px 18px",
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.14)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99) 0%, rgba(245,250,254,0.95) 64%, rgba(231,241,249,0.92) 100%)",
    color: "#24415C",
    fontWeight: 900,
    fontSize: 13.5,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.10), inset 0 1px 0 rgba(255,255,255,0.86), inset 0 -2px 0 rgba(16,37,59,0.05)",
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
    transform: "translateZ(0)",
    outlineOffset: 4,
  };
}

function stopTrustTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
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

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
  };
}

function documentFrameStyle(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow:
      "0 22px 58px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function documentWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 18,
    right: -18,
    transform: "rotate(-90deg)",
    transformOrigin: "top right",
    letterSpacing: 3.1,
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(215,227,241,0.2)",
    pointerEvents: "none",
    textTransform: "uppercase",
  };
}

function documentFooterGrid(isCompact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    marginTop: 18,
    paddingTop: 14,
    borderTop: "1px solid rgba(215,227,241,0.16)",
    display: "grid",
    gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: 12,
  };
}

function documentFooterLabel(): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: 0.28,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#AFC4D9",
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

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    explainability: false,
    breakdown: false,
    evidence: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    explainability: Boolean(raw?.explainability ?? base.explainability),
    breakdown: Boolean(raw?.breakdown ?? base.breakdown),
    evidence: Boolean(raw?.evidence ?? base.evidence),
  };
}

function absoluteUrl(pathOrUrl: string): string {
  const raw = safeStr(pathOrUrl);
  if (!raw) return "";
  if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
  if (typeof window !== "undefined" && raw.startsWith("/")) {
    return `${window.location.origin}${raw}`;
  }
  return raw;
}

function daysUntil(value: any): number | null {
  const dt = normalizeDate(value);
  if (!dt) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dt);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86400000);
}

function formatDateLabel(value: any): string {
  const dt = normalizeDate(value);
  if (!dt) return "soon";
  return dt.toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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
      "Open Trust reflects your standing in the community you are using now and will appear here when available.",
  };
}

function getStoredFocusCommitmentStatus(item: any) {
  if (item?.completedAt) return "completed";

  const target = Number(item?.targetValue || 0);
  const current = Number(item?.currentValue || 0);
  const dueIn = daysUntil(item?.dueDate);
  const reviewIn = daysUntil(item?.nextCheckInDate);

  if (target > 0 && current >= target) return "completed";
  if (dueIn !== null && dueIn < 0) return "behind";
  if (reviewIn !== null && reviewIn < 0) return "behind";
  if ((dueIn !== null && dueIn <= 7) || (reviewIn !== null && reviewIn <= 3)) {
    return "watch";
  }

  return "onTrack";
}

function summarizeStoredFocusCommitments(): FocusCommitmentSummary {
  const commitments = readLocalJSON<any[]>(
    DASHBOARD_FOCUS_COMMITMENTS_STORAGE_KEY,
    []
  ).filter((item) => item && typeof item === "object");

  const events = readLocalJSON<any[]>(DASHBOARD_FOCUS_EVENTS_STORAGE_KEY, []).filter(
    (item) => item && typeof item === "object"
  );

  const active = commitments
    .filter((item) => !item.archived && !item.completedAt)
    .sort((a, b) => {
      const aDays = daysUntil(a?.nextCheckInDate) ?? daysUntil(a?.dueDate) ?? 999999;
      const bDays = daysUntil(b?.nextCheckInDate) ?? daysUntil(b?.dueDate) ?? 999999;
      return aDays - bDays;
    })
    .slice(0, 2);

  let onTrackCount = 0;
  let watchCount = 0;
  let behindCount = 0;
  let completedCount = 0;

  for (const item of commitments.filter((row) => !row.archived)) {
    const status = getStoredFocusCommitmentStatus(item);
    if (status === "completed") completedCount += 1;
    if (status === "onTrack") onTrackCount += 1;
    if (status === "watch") watchCount += 1;
    if (status === "behind") behindCount += 1;
  }

  const recentEvents = [...events]
    .sort((a, b) => safeStr(b?.createdAt).localeCompare(safeStr(a?.createdAt)))
    .slice(0, 8);

  const checkins = recentEvents.filter((row) => row?.kind === "checkin").length;
  const milestones = recentEvents.filter((row) => row?.kind === "milestone").length;
  const completions = recentEvents.filter((row) => row?.kind === "complete").length;
  const replans = recentEvents.filter((row) => row?.kind === "replan").length;
  const misses = recentEvents.filter(
    (row) => row?.kind === "missed-reported"
  ).length;

  const nextReview = active[0];
  const nextReviewLabel = nextReview
    ? `${safeStr(nextReview?.title || "Next target")} review ${
        daysUntil(nextReview?.nextCheckInDate) === 0
          ? "today"
          : daysUntil(nextReview?.nextCheckInDate) === 1
          ? "tomorrow"
          : `on ${formatDateLabel(nextReview?.nextCheckInDate)}`
      }`
    : "";

  const disciplineLine =
    completions > 0
      ? `${completions} recent completion${
          completions === 1 ? "" : "s"
        } visible`
      : misses > 0 && checkins === 0 && milestones === 0
      ? "Discipline is under pressure and needs visible follow-through"
      : checkins > 0 || milestones > 0
      ? `${checkins + milestones} recent execution update${
          checkins + milestones === 1 ? "" : "s"
        } kept${
          replans > 0
            ? `, ${replans} honest replan${replans === 1 ? "" : "s"}`
            : ""
        }`
      : "No recent execution signal is visible yet";

  return {
    onTrackCount,
    watchCount,
    behindCount,
    completedCount,
    nextReviewLabel,
    disciplineLine,
  };
}

function countGuidanceNoticesMatching(
  guidance: GuidanceSnapshot | null,
  tokens: string[]
): number {
  if (!guidance?.actionInboxSummary) return 0;

  const all = [
    ...(guidance.actionInboxSummary.actNow || []),
    ...(guidance.actionInboxSummary.dueSoon || []),
    ...(guidance.actionInboxSummary.watchAndWait || []),
    ...(guidance.actionInboxSummary.generalUpdates || []),
  ];

  return all.filter((item) => {
    const joined = `${safeStr(item?.title)} ${safeStr(item?.detail)} ${safeStr(
      item?.ctaTo
    )}`.toLowerCase();
    return tokens.some((token) => joined.includes(token));
  }).length;
}

function buildTrustJourneyModel(params: {
  openTrust: TrustReadingState;
  cci: TrustReadingState;
  trustSlipCode: string;
  trustExplainer: any;
  focusSummary: FocusCommitmentSummary;
}): TrustJourneyModel {
  const helps = [...(params.trustExplainer?.helps || [])]
    .slice(0, 2)
    .map((item: string) => safeStr(item))
    .filter(Boolean);

  const weakens = [...(params.trustExplainer?.weakens || [])]
    .slice(0, 2)
    .map((item: string) => safeStr(item))
    .filter(Boolean);

  if (!safeStr(params.trustSlipCode)) {
    return {
      tone: "neutral",
      posture: "unverified",
      postureTitle: "Finish your trust record first",
      postureDetail:
        "Your verification is still not complete. Finish it before you expect stronger trust.",
      primaryRoute: {
        key: "trust-slip",
        label: "Open TrustSlip",
        detail: "Finish the missing verification step.",
        to: "/app/trust-slip",
      },
      secondaryRoute: {
        key: "trust",
        label: "Open Trust Passport",
        detail: "See the trust path in a simpler view.",
        to: "/app/trust",
      },
      helps,
      weakens,
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (params.openTrust.tone === "red" || params.cci.tone === "red") {
    return {
      tone: "red",
      posture: "repair",
      postureTitle: "Fix this trust issue now",
      postureDetail:
        "Something is hurting trust right now. Fix it before you grow, ask for support, or open up to more people.",
      primaryRoute:
        params.openTrust.tone === "red"
          ? {
              key: "trust",
              label: "Open Trust",
              detail: "See what is hurting trust in your community.",
              to: "/app/trust",
            }
          : {
              key: "cci",
              label: "Open CCI",
              detail: "See what is hurting trust outside your community.",
              to: "/app/identity",
            },
      secondaryRoute: {
        key: "notifications",
        label: "Open Notifications",
        detail: "Check the next item waiting for your action.",
        to: "/app/notifications",
      },
      helps,
      weakens: [
        ...weakens,
        params.focusSummary.behindCount > 0
          ? `${params.focusSummary.behindCount} focus commitment${
              params.focusSummary.behindCount === 1 ? "" : "s"
            } behind`
          : "",
      ].filter(Boolean),
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (
    params.openTrust.tone === "yellow" ||
    params.cci.tone === "yellow" ||
    params.focusSummary.behindCount > 0
  ) {
    return {
      tone: "yellow",
      posture: "drifting",
      postureTitle: "Trust is starting to slip",
      postureDetail:
        "A warning sign is visible now. Correct it early before it becomes a larger trust problem.",
      primaryRoute:
        params.focusSummary.behindCount > 0
          ? {
              key: "focus",
              label: "Open Focus Commitments",
              detail: "Correct the commitment that has slipped behind.",
              to: "/app/dashboard#focus-commitments",
            }
          : params.openTrust.tone === "yellow"
          ? {
              key: "trust",
              label: "Open Trust",
              detail: "Review the community trust warning and correct it early.",
              to: "/app/trust",
            }
          : {
              key: "cci",
              label: "Open CCI",
              detail: "Review the cross-community warning and correct it early.",
              to: "/app/identity",
            },
      secondaryRoute: {
        key: "notifications",
        label: "Open Notifications",
        detail: "Check the next item that still needs your answer.",
        to: "/app/notifications",
      },
      helps,
      weakens: [
        ...weakens,
        params.focusSummary.behindCount > 0
          ? `${params.focusSummary.behindCount} focus commitment${
              params.focusSummary.behindCount === 1 ? "" : "s"
            } behind`
          : "",
      ].filter(Boolean),
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  if (
    params.focusSummary.onTrackCount > 0 ||
    params.focusSummary.completedCount > 0
  ) {
    return {
      tone: "green",
      posture: "building",
      postureTitle: "Trust is working well",
      postureDetail:
        "Your visible follow-through is helping trust stay steadier right now.",
      primaryRoute: {
        key: "trust",
        label: "Open Trust Passport",
        detail: "Review the full trust path and keep it steady.",
        to: "/app/trust",
      },
      secondaryRoute: {
        key: "focus",
        label: "Open Focus Commitments",
        detail: "Keep the next target visible and on track.",
        to: "/app/dashboard#focus-commitments",
      },
      helps: [
        ...helps,
        params.focusSummary.onTrackCount > 0
          ? `${params.focusSummary.onTrackCount} focus commitment${
              params.focusSummary.onTrackCount === 1 ? "" : "s"
            } on track`
          : "",
        params.focusSummary.completedCount > 0
          ? `${params.focusSummary.completedCount} commitment${
              params.focusSummary.completedCount === 1 ? "" : "s"
            } already completed`
          : "",
      ].filter(Boolean),
      weakens,
      commitmentLine: params.focusSummary.disciplineLine,
    };
  }

  return {
    tone: "green",
    posture: "steady",
    postureTitle: "Trust is steady",
    postureDetail:
      "No major trust problem is showing right now. Keep your actions visible and consistent.",
    primaryRoute: {
      key: "trust",
      label: "Open Trust Passport",
      detail: "Review the full trust path when you need it.",
      to: "/app/trust",
    },
    secondaryRoute: {
      key: "notifications",
      label: "Open Notifications",
      detail: "Answer new items early so trust stays clean.",
      to: "/app/notifications",
    },
    helps,
    weakens,
    commitmentLine: params.focusSummary.disciplineLine,
  };
}

export default function TrustScorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_PASSPORT_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [trustJourneyExpanded, setTrustJourneyExpanded] = useState(false);
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
    writeLocalJSON(TRUST_PASSPORT_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    if (loading || location.hash !== "#trust-journey") return;

    setTrustJourneyExpanded(true);

    const timer = window.setTimeout(() => {
      const target = document.getElementById("trust-journey");
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [loading, location.hash]);

  async function loadAll() {
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
  }

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
  }, [selectedClanId]);

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
      "—"
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
  const graphScore = firstTruthy(trustSlipSummary?.graph_score, "—");
  const cciScore = firstTruthy(trustSlipSummary?.cci_score, "—");
  const cciBand = firstTruthy(trustSlipSummary?.cci_band, "—");
  const levelLabel = firstTruthy(trustSlipSummary?.level_label, "—");
  const standingScore = firstTruthy(trustSlipSummary?.standing_score, "—");
  const lifetimeTrust = firstTruthy(trustSlipSummary?.lifetime_trust, "—");
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
  const focusSummary = useMemo(() => summarizeStoredFocusCommitments(), []);
  const trustExplainer = guidance?.trustChangeExplainer || null;
  const trustSlipCode = useMemo(
    () =>
      firstTruthy(
        trustSlipSummary?.code,
        trustSlipSummary?.verification_code,
        trustSlipSummary?.token
      ),
    [trustSlipSummary]
  );
  const pendingJoinRequestCount = useMemo(
    () =>
      countGuidanceNoticesMatching(guidance, [
        "join request",
        "join approval",
        "invite link",
        "pending approval",
        "membership request",
      ]),
    [guidance]
  );
  const urgentDemandCount = useMemo(
    () =>
      countGuidanceNoticesMatching(guidance, [
        "demand box",
        "open demand",
        "market demand",
        "buyer need",
        "request for goods",
        "request for item",
      ]),
    [guidance]
  );
  const trustJourneyModel = useMemo(
    () =>
      buildTrustJourneyModel({
        openTrust,
        cci,
        trustSlipCode,
        trustExplainer,
        focusSummary,
      }),
    [openTrust, cci, trustSlipCode, trustExplainer, focusSummary]
  );
  const trustJourneyTone = useMemo(
    () => toneStyles(trustJourneyModel.tone),
    [trustJourneyModel.tone]
  );
  const trustJourneyCopy = useMemo(
    () =>
      buildDashboardTrustJourneyCopy({
        openTrust,
        cci,
        trustSlipCode,
        trustExplainer,
        pendingRequestsCount: pendingJoinRequestCount,
        unreadCount: guidance?.actionInboxSummary?.unreadCount || 0,
        actNowCount: guidance?.actionInboxSummary?.actNow?.length || 0,
        urgentDemandCount,
        focusBehindCount: focusSummary.behindCount,
        focusWatchCount: focusSummary.watchCount,
        focusOnTrackCount: focusSummary.onTrackCount,
        focusCompletedCount: focusSummary.completedCount,
      }),
    [
      openTrust,
      cci,
      trustSlipCode,
      trustExplainer,
      pendingJoinRequestCount,
      guidance,
      urgentDemandCount,
      focusSummary,
    ]
  );
  const trustJourneyCountLine = [
    guidance?.trustJourneySummary?.builtCount
      ? `Built ${guidance.trustJourneySummary.builtCount}`
      : "",
    guidance?.trustJourneySummary?.protectedCount
      ? `Protected ${guidance.trustJourneySummary.protectedCount}`
      : "",
    guidance?.trustJourneySummary?.weakenedCount
      ? `Weakened ${guidance.trustJourneySummary.weakenedCount}`
      : "",
    guidance?.trustJourneySummary?.repairCount
      ? `Repair ${guidance.trustJourneySummary.repairCount}`
      : "",
  ]
    .filter(Boolean)
    .join(" | ");
  const trustJourneyFocusLabel =
    focusSummary.behindCount > 0
      ? `${focusSummary.behindCount} behind`
      : focusSummary.watchCount > 0
      ? `${focusSummary.watchCount} watch`
      : focusSummary.onTrackCount > 0
      ? `${focusSummary.onTrackCount} on track`
      : focusSummary.completedCount > 0
      ? `${focusSummary.completedCount} done`
      : "No target";
  const trustJourneyPrimaryLabel =
    safeStr(trustJourneyModel.primaryRoute.to) === "/app/trust"
      ? "Review Trust Passport"
      : trustJourneyModel.primaryRoute.label;
  const trustJourneyPrimaryDetail =
    safeStr(trustJourneyModel.primaryRoute.to) === "/app/trust"
      ? "Use this Trust Passport reading to see what is helping, what needs care, and what to repair next."
      : trustJourneyModel.primaryRoute.detail;

  const trustNextActionItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "trust-summary",
        label: "Check my trust story",
        detail: "Open the main Trust Passport summary on this page.",
        technical: "Trust Passport summary",
        keywords: ["summary", "score", "band", "passport", "trust story"],
        tone: "primary",
      },
      {
        id: "trust-journey",
        label: "What should I repair?",
        detail: trustJourneyPrimaryDetail,
        technical: "Trust journey",
        keywords: ["repair", "next step", "journey", "protect", "improve"],
        tone: trustJourneyModel.tone === "red" ? "primary" : "secondary",
      },
      {
        id: "why-change",
        label: "Why did trust change?",
        detail: "Open the recent events and explanation behind the reading.",
        technical: "Trust explainability",
        keywords: ["why", "changed", "event", "reason", "explain"],
      },
      {
        id: "evidence",
        label: "Check evidence",
        detail: "Open capacity, risk, sponsor, and TrustSlip evidence context.",
        technical: "Evidence context",
        keywords: ["evidence", "risk", "sponsor", "capacity", "proof"],
      },
      {
        id: "trust-slip",
        label: "Show TrustSlip",
        detail: "Open the smaller proof surface for one decision.",
        technical: "TrustSlip",
        to: "/app/trust-slip",
        keywords: ["trustslip", "trust slip", "proof", "certificate", "merchant"],
      },
      {
        id: "verify-trust-slip",
        label: "Verify TrustSlip",
        detail: verifyUrl
          ? "Open the public verification view for the current TrustSlip."
          : "Verification link is not ready yet.",
        technical: "TrustSlip Verify",
        keywords: ["verify", "verification", "public", "check proof"],
        disabled: !verifyUrl,
        disabledReason:
          "TrustSlip verification is not ready yet. Refresh Trust Passport or open TrustSlip first.",
      },
      {
        id: "cci",
        label: "Check identity reading",
        detail: "Open the cross-community integrity reading.",
        technical: "CCI / Identity",
        to: "/app/identity",
        keywords: ["cci", "identity", "integrity", "cross community", "profile"],
      },
      {
        id: "refresh",
        label: refreshing ? "Refreshing..." : "Refresh trust",
        detail: "Pull the latest trust reading again.",
        technical: "Refresh",
        keywords: ["refresh", "reload", "update", "latest"],
        tone: "soft",
        disabled: refreshing,
        disabledReason: "Refresh is already running.",
      },
      {
        id: "notifications",
        label: "See what is waiting",
        detail: "Open actions that may affect trust or membership.",
        technical: "Notifications",
        to: "/app/notifications",
        keywords: ["notice", "notification", "inbox", "queue", "waiting"],
        tone: "soft",
      },
      {
        id: "marketplace",
        label: "Return to Marketplace",
        detail: "Go back to the selected community workspace.",
        technical: "Marketplace",
        to: "/app/marketplace",
        keywords: ["market", "community", "workspace"],
        tone: "soft",
      },
      {
        id: "focus",
        label: "Add a trust promise",
        detail: "Open focus commitments for repair, repayment, or follow-through.",
        technical: "Focus commitments",
        to: "/app/dashboard#focus-commitments",
        keywords: ["promise", "commitment", "focus", "repair plan", "target"],
        tone: "soft",
      },
      {
        id: "guide",
        label: "Open my GSN guide",
        detail: "Open the wider guide for understanding your GSN position.",
        technical: "My GSN and I",
        to: "/app/my-gmfn-and-i",
        keywords: ["guide", "help", "understand", "my gsn"],
        tone: "soft",
      },
    ],
    [refreshing, trustJourneyModel.tone, trustJourneyPrimaryDetail, verifyUrl]
  );

  function openTrustJourneyRoute(route: { to: string }) {
    if (safeStr(route.to) === "/app/trust") {
      setCollapsed((prev) => ({ ...prev, overview: false }));
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    navigate(route.to);
  }

  function openTrustRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function openTrustSection(key: keyof CollapseState, targetId: string) {
    setCollapsed((prev) => ({ ...prev, [key]: false }));
    window.setTimeout(() => {
      document
        .getElementById(targetId)
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  }

  function handleTrustNextAction(item: NextActionGuideItem) {
    switch (item.id) {
      case "trust-summary":
        openTrustSection("overview", "trust-passport-summary");
        break;
      case "trust-journey":
        setTrustJourneyExpanded(true);
        window.setTimeout(() => {
          document
            .getElementById("trust-journey")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
        break;
      case "why-change":
        openTrustSection("explainability", "trust-passport-explainability");
        break;
      case "evidence":
        openTrustSection("evidence", "trust-passport-evidence");
        break;
      case "refresh":
        void handleRefreshTrust();
        break;
      case "verify-trust-slip":
        if (verifyUrl && typeof window !== "undefined") {
          window.open(verifyUrl, "_blank", "noopener,noreferrer");
        }
        break;
      default:
        if (item.to) openTrustRoute(item.to);
        break;
    }
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCollapseTap(
    key: keyof CollapseState,
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.preventDefault();
    event.stopPropagation();
    toggleSection(key);
  }

  function handleTrustJourneyTap(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setTrustJourneyExpanded((prev) => !prev);
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
          nextLinks={[
            { label: "TrustSlip", to: "/app/trust-slip" },
            { label: "Notifications", to: "/app/notifications" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[{ label: "My GSN and I", to: "/app/my-gmfn-and-i" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Trust Passport...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      className="trust-passport-root"
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <style>{`
        @page { margin: 14mm; }
        .trust-passport-root button,
        .trust-passport-root a {
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;
        }
        .trust-passport-root button {
          font-family: inherit;
        }
        .trust-passport-root button:focus-visible,
        .trust-passport-root a:focus-visible {
          outline: 3px solid rgba(11,99,209,0.32);
          outline-offset: 4px;
        }
        @media print {
          body { background: #ffffff !important; }
          a[href]:after { content: "" !important; }
          button { display: none !important; }
          .print-trust-nav { display: none !important; }
          .print-trust-document,
          .print-trust-support {
            box-shadow: none !important;
            border: 1px solid rgba(148,163,184,0.34) !important;
            background: #ffffff !important;
            break-inside: avoid;
            page-break-inside: avoid;
          }
          .print-trust-document {
            color: #0b1f33 !important;
          }
          .print-trust-document * {
            color: inherit;
          }
          .print-trust-document .print-watermark {
            color: rgba(11,31,51,0.08) !important;
          }
        }
      `}</style>
      <div className="print-trust-nav">
        <PageTopNav
          sectionLabel="Trust Passport"
          title="Trust Passport"
          subtitle="Trust Passport turns trust behaviour into a personal proof story while keeping the selected community reading separate."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "TrustSlip", to: "/app/trust-slip" },
            { label: "Notifications", to: "/app/notifications" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[{ label: "My GSN and I", to: "/app/my-gmfn-and-i" }]}
        />

        <DomainIntroToggle
          title="How Trust Passport Helps You"
          body={TRUST_PASSPORT_HELP_BODY}
          bullets={TRUST_PASSPORT_HELP_BULLETS}
          note={TRUST_PASSPORT_HELP_NOTE}
          tone="blue"
        />
      </div>

      <NextActionGuide
        storageKey="gmfn.trustPassport.nextActionGuide.v1"
        compact={isCompact}
        items={trustNextActionItems}
        onSelect={handleTrustNextAction}
        intro="Say what you want in normal words, like trust score, why changed, repair, proof, verify, CCI, or marketplace. GSN will point you to the closest trust path."
      />

      <section style={pageCard("linear-gradient(135deg, #F8FBFF 0%, #FFFFFF 54%, #FFF8E7 100%)")}>
        <div style={sectionLabel()}>Trust record model</div>
        <div
          style={{
            marginTop: 8,
            color: "#0B1F33",
            fontSize: isCompact ? 23 : 28,
            fontWeight: 900,
            lineHeight: 1.12,
          }}
        >
          One person, one Trust Passport
        </div>
        <div style={{ marginTop: 10, ...helperText(), maxWidth: 900 }}>
          This page should help a member see the trust story they can carry,
          not feel judged by one number. The personal Passport gathers what is
          known across communities, while the selected community still keeps its
          own smaller reading.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Personal trust record</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.25,
              }}
            >
              {memberName}'s carried trust story
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This is the record that follows the member across communities. It
              gathers completed promises, support behaviour, CCI, TrustSlip
              status, and evidence into one explainable story.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>GSN ID: {gmfnId}</span>
              <span style={badge(false)}>Band: {currentBand}</span>
              <span style={badge(false)}>Score: {currentScore}</span>
              <span style={badge(false)}>
                TrustSlip: {trustSlipCode ? "Ready" : "Pending"}
              </span>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Selected community reading</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.25,
              }}
            >
              {communityName}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This smaller reading belongs to the current community. It helps
              show whether this group currently sees the member as strong,
              steady, watch, or pressure.
            </div>
            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Community ID: {communityCode}</span>
              <span style={badge(false)}>Open Trust: {openTrust.classText}</span>
              <span style={badge(false)}>CCI: {cci.classText}</span>
              <span style={badge(false)}>
                Active communities: {safeStr(trustSlipSummary?.active_clan_count ?? "0")}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>What strengthens trust</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Completed repayments, responsible guarantees, clean identity
              continuity, helpful participation, and promises that are closed
              properly.
            </div>
          </div>

          <div style={innerCard("#FFFBEF")}>
            <div style={sectionLabel()}>What creates pressure</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Missed promises, defaults, overexposure, unresolved actions, or
              identity shifts that need a simple review before sensitive work
              continues.
            </div>
          </div>

          <div style={innerCard("#F3FBF5")}>
            <div style={sectionLabel()}>What can travel</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              TrustSlip, evidence packs, trust timeline, and verified
              explanations can help a member prove reliability without exposing
              their full private Passport.
            </div>
          </div>
        </div>
      </section>

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        className="print-trust-document"
        style={{
          ...pageCard(
            "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
          ),
          ...documentFrameStyle(),
        }}
      >
        <div className="print-watermark" aria-hidden style={documentWatermarkStyle()}>
          GSN Trust Passport
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Personal GSN trust record</span>
              <span style={badge(false)}>Community reading kept separate</span>
            </div>

            <div style={sectionLabel()}>Personal trust document</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              Full trust reading for {memberName}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 860,
              }}
            >
              This is the fuller personal trust record for {memberName}. It
              explains what is helping, what needs care, what evidence supports
              the reading, and what can be safely shown outside as a TrustSlip.
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
              <span style={badge(false)}>Community: {communityName}</span>
              <span style={badge(false)}>Community ID: {communityCode}</span>
              <span style={badge(false)}>Current page: Trust Passport</span>
              <span style={badge(false)}>Current step: Personal record</span>
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
                onPointerDown={stopTrustTap}
                onMouseDown={stopTrustTap}
                onTouchStart={stopTrustTap}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void handleRefreshTrust();
                }}
                disabled={refreshing}
                style={actionBtn("primary", refreshing)}
              >
                {refreshing ? "Refreshing..." : "Refresh Trust Reading"}
              </button>

              <button
                type="button"
                onPointerDown={stopTrustTap}
                onMouseDown={stopTrustTap}
                onTouchStart={stopTrustTap}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  handleCopy(
                    gmfnId,
                    "GMFN ID copied.",
                    "GMFN ID is not available yet."
                  );
                }}
                style={actionBtn("secondary", !gmfnId || gmfnId === "Awaiting issue")}
                disabled={!gmfnId || gmfnId === "Awaiting issue"}
              >
                Copy GMFN ID
              </button>

              <button
                type="button"
                onPointerDown={stopTrustTap}
                onMouseDown={stopTrustTap}
                onTouchStart={stopTrustTap}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (typeof window !== "undefined" && typeof window.print === "function") {
                    window.print();
                  }
                }}
                style={actionBtn("soft")}
              >
                Print Trust Passport
              </button>

              {verifyUrl ? (
                <button
                  type="button"
                  onPointerDown={stopTrustTap}
                  onMouseDown={stopTrustTap}
                  onTouchStart={stopTrustTap}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    if (typeof window !== "undefined") {
                      window.open(verifyUrl, "_blank", "noopener,noreferrer");
                    }
                  }}
                  style={actionBtn("secondary")}
                >
                  Open TrustSlip Verify
                </button>
              ) : null}
            </div>
          </div>

          <div
            style={{
              ...softCard(readingTone.bg),
              border: readingTone.border,
            }}
          >
            <div style={sectionLabel()}>Current trust posture</div>

            <div
              style={{
                marginTop: 10,
                color: readingTone.text,
                fontWeight: 900,
                fontSize: 22,
                lineHeight: 1.25,
              }}
            >
              {currentBand}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 18,
                lineHeight: 1.25,
              }}
            >
              Score: {currentScore}
            </div>

            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {nextStep.title}
            </div>

            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {nextStep.detail}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 10,
              }}
            >
              <div style={documentMetaCard("#FFFFFF")}>
                <div style={sectionLabel()}>Document reference</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  GSN ID: {gmfnId || "Awaiting issue"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Verification code: {safeStr(trustSlipSummary?.verification_code || "Not stated")}
                </div>
              </div>

              <div style={documentMetaCard("#F8FBFF")}>
                <div style={sectionLabel()}>Issue window</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  Issued: {safeDateTime(trustSlipSummary?.issued_at) || "Not stated"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Expires: {safeDateTime(trustSlipSummary?.expires_at) || "Not stated"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={documentFooterGrid(isCompact)}>
          <div>
            <div style={documentFooterLabel()}>Issue and expiry</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              Issued: {safeDateTime(trustSlipSummary?.issued_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Expires: {safeDateTime(trustSlipSummary?.expires_at) || "Not stated"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Reference control</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              GSN ID: {gmfnId || "Awaiting issue"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Verification code: {safeStr(trustSlipSummary?.verification_code || "Not stated")}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Institutional note</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              {safeStr(
                trustSlipSummary?.disclaimer ||
                  "Trust Passport explains the current trust reading and the evidence context behind it."
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="trust-journey"
        style={{
          ...pageCard("#FFFFFF"),
          display: "grid",
          gap: 14,
        }}
      >
        <div
          style={{
            position: "relative",
            ...innerCard(
              trustJourneyModel.tone === "red"
                ? "linear-gradient(180deg, #FFF5F5 0%, #FFFFFF 100%)"
                : trustJourneyModel.tone === "yellow"
                ? "linear-gradient(180deg, #FFFBEF 0%, #FFFFFF 100%)"
                : "linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"
            ),
            border: trustJourneyTone.border,
            boxShadow:
              trustJourneyModel.tone === "red"
                ? "0 16px 34px rgba(239,68,68,0.07)"
                : trustJourneyModel.tone === "yellow"
                ? "0 16px 34px rgba(245,158,11,0.07)"
                : "0 16px 34px rgba(11,99,209,0.06)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 4,
              background:
                trustJourneyModel.tone === "red"
                  ? "linear-gradient(90deg, #991B1B 0%, #DC2626 55%, #FCA5A5 100%)"
                  : trustJourneyModel.tone === "yellow"
                  ? "linear-gradient(90deg, #92400E 0%, #F59E0B 55%, #FCD34D 100%)"
                  : "linear-gradient(90deg, #166534 0%, #0B63D1 55%, #93C5FD 100%)",
            }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div style={{ flex: "1 1 420px", minWidth: 0 }}>
              <div style={sectionLabel()}>Trust Journey</div>
              <div
                style={{
                  marginTop: 6,
                  color: trustJourneyTone.text,
                  fontSize: isCompact ? 18 : 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {trustJourneyModel.postureTitle}
              </div>
              <div
                style={{
                  marginTop: 6,
                  ...helperText(),
                  maxWidth: 760,
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {trustJourneyModel.postureDetail}
              </div>
            </div>

            <button
              type="button"
              onPointerDown={stopTrustTap}
              onMouseDown={stopTrustTap}
              onTouchStart={stopTrustTap}
              onClick={handleTrustJourneyTap}
              style={collapseToggle()}
            >
              {trustJourneyExpanded ? "Collapse" : "Open"}
            </button>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {[
              {
                label: "Trust",
                value: openTrust.classText,
                color: toneStyles(openTrust.tone).text,
                background: toneStyles(openTrust.tone).bg,
                border: toneStyles(openTrust.tone).border,
              },
              {
                label: "CCI",
                value: cci.classText,
                color: toneStyles(cci.tone).text,
                background: toneStyles(cci.tone).bg,
                border: toneStyles(cci.tone).border,
              },
              {
                label: "Slip",
                value: trustSlipCode ? "Ready" : "Pending",
                color: "#0B1F33",
                background: "#F8FBFF",
                border: "1px solid rgba(11,99,209,0.10)",
              },
              {
                label: "Focus",
                value: trustJourneyFocusLabel,
                color:
                  focusSummary.behindCount > 0
                    ? "#991B1B"
                    : focusSummary.watchCount > 0
                    ? "#92400E"
                    : "#166534",
                background:
                  focusSummary.behindCount > 0
                    ? "#FFF5F5"
                    : focusSummary.watchCount > 0
                    ? "#FFFBEF"
                    : "#F3FBF5",
                border:
                  focusSummary.behindCount > 0
                    ? "1px solid rgba(239,68,68,0.16)"
                    : focusSummary.watchCount > 0
                    ? "1px solid rgba(245,158,11,0.16)"
                    : "1px solid rgba(34,197,94,0.16)",
              },
            ].map((item) => (
              <div
                key={`trust-journey-pill-${item.label}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minHeight: 34,
                  padding: "7px 11px",
                  borderRadius: 999,
                  border: item.border,
                  background: item.background,
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.72), 0 8px 18px rgba(10,24,49,0.04)",
                }}
              >
                <span
                  style={{
                    color: "#5D7389",
                    fontSize: 11,
                    fontWeight: 900,
                    letterSpacing: 0.28,
                    textTransform: "uppercase",
                  }}
                >
                  {item.label}
                </span>
                <span
                  style={{
                    color: item.color,
                    fontSize: 13,
                    fontWeight: 900,
                    lineHeight: 1.2,
                  }}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 10,
              ...helperText(),
              fontSize: 12.8,
              lineHeight: 1.6,
              color: "#0B1F33",
            }}
          >
            <strong>How they connect:</strong> {trustJourneyCopy.connectionSummary}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.05fr)",
              gap: 10,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Helping</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1.55,
                }}
              >
                {trustJourneyCopy.helpingText}
              </div>
            </div>

            <div
              style={innerCard(
                trustJourneyModel.weakens.length > 0 ? "#FFFBEF" : "#FFFFFF"
              )}
            >
              <div style={sectionLabel()}>Needs care</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1.55,
                }}
              >
                {trustJourneyCopy.careText}
              </div>
            </div>

            <div
              style={{
                ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                border: "1px solid rgba(11,99,209,0.10)",
              }}
            >
              <div style={sectionLabel()}>Do this now</div>

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 17,
                  fontWeight: 900,
                  lineHeight: 1.28,
                }}
              >
                {trustJourneyPrimaryLabel}
              </div>

              <div
                style={{
                  marginTop: 6,
                  ...helperText(),
                  fontSize: 13,
                  lineHeight: 1.55,
                }}
              >
                {trustJourneyPrimaryDetail}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onPointerDown={stopTrustTap}
                  onMouseDown={stopTrustTap}
                  onTouchStart={stopTrustTap}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    openTrustJourneyRoute(trustJourneyModel.primaryRoute);
                  }}
                  style={actionBtn("primary")}
                >
                  {safeStr(trustJourneyModel.primaryRoute.to) === "/app/trust"
                    ? "Review"
                    : "Open"}
                </button>

                {trustJourneyExpanded ? (
                  <button
                    type="button"
                    onPointerDown={stopTrustTap}
                    onMouseDown={stopTrustTap}
                    onTouchStart={stopTrustTap}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openTrustJourneyRoute(trustJourneyModel.secondaryRoute);
                    }}
                    style={actionBtn("secondary")}
                  >
                    {trustJourneyModel.secondaryRoute.label}
                  </button>
                ) : null}
              </div>
            </div>
          </div>

          {trustJourneyExpanded ? (
            <div
              style={{
                marginTop: 14,
                display: "grid",
                gap: 10,
              }}
            >
              <div
                style={{
                  ...innerCard("linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"),
                  border: "1px solid rgba(11,99,209,0.10)",
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={sectionLabel()}>How these connect</div>

                <div
                  style={{
                    color: "#0B1F33",
                    fontSize: 13.5,
                    fontWeight: 800,
                    lineHeight: 1.6,
                  }}
                >
                  {trustJourneyCopy.connectionSummary}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {trustJourneyCopy.connectionItems.map((item) => (
                    <div
                      key={`trust-connect-${item.key}`}
                      style={innerCard("#FFFFFF")}
                    >
                      <div style={sectionLabel()}>{item.title}</div>
                      <div
                        style={{
                          marginTop: 8,
                          color: "#0B1F33",
                          fontSize: 13.5,
                          fontWeight: 800,
                          lineHeight: 1.6,
                        }}
                      >
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>What is helping</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {trustJourneyModel.helps.length > 0 ? (
                      trustJourneyModel.helps.map((item, index) => (
                        <div key={`trust-help-${index}`} style={helperText()}>
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={helperText()}>
                        No strong trust support is showing yet.
                      </div>
                    )}
                  </div>
                </div>

                <div
                  style={innerCard(
                    trustJourneyModel.weakens.length > 0 ? "#FFFBEF" : "#FFFFFF"
                  )}
                >
                  <div style={sectionLabel()}>What needs care</div>
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {trustJourneyModel.weakens.length > 0 ? (
                      trustJourneyModel.weakens.map((item, index) => (
                        <div key={`trust-weak-${index}`} style={helperText()}>
                          {item}
                        </div>
                      ))
                    ) : (
                      <div style={helperText()}>
                        No major trust problem is showing right now.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                style={{
                  ...innerCard("#FFFFFF"),
                  border: trustJourneyTone.border,
                  display: "grid",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "1fr"
                      : "minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={helperText()}>
                    {trustJourneyModel.commitmentLine}
                    {focusSummary.nextReviewLabel
                      ? ` ${focusSummary.nextReviewLabel}.`
                      : ""}
                    {trustJourneyCountLine ? ` ${trustJourneyCountLine}.` : ""}
                  </div>

                  <button
                    type="button"
                    onPointerDown={stopTrustTap}
                    onMouseDown={stopTrustTap}
                    onTouchStart={stopTrustTap}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      openTrustJourneyRoute(trustJourneyModel.secondaryRoute);
                    }}
                    style={actionBtn("secondary")}
                  >
                    {trustJourneyModel.secondaryRoute.label}
                  </button>
                </div>
              </div>
            </div>
          ) : trustJourneyCountLine || focusSummary.nextReviewLabel ? (
            <div
              style={{
                marginTop: 10,
                ...helperText(),
                fontSize: 12.5,
                lineHeight: 1.5,
              }}
            >
              {[focusSummary.nextReviewLabel || "", trustJourneyCountLine]
                .filter(Boolean)
                .join(" | ")}
            </div>
          ) : null}
        </div>
      </section>

      <section id="trust-passport-summary" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Trust summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The main trust numbers and structural indicators stay together here.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopTrustTap}
            onMouseDown={stopTrustTap}
            onTouchStart={stopTrustTap}
            onClick={(event) => handleCollapseTap("overview", event)}
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.overview ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr 1fr"
                  : "repeat(6, minmax(0, 1fr))",
                gap: 12,
              }}
            >
            <div style={statTile()}>
              <div style={sectionLabel()}>Current band</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {currentBand}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Current score</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {currentScore}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>CCI</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {cciScore} / {cciBand}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Graph score</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {graphScore}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Trust limit</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {trustLimit} {trustCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Event count</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {safeStr(recompute?.event_count ?? "0")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Level label</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {levelLabel}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Standing score</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {standingScore}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Lifetime trust</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {lifetimeTrust}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Counterparties</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {safeStr(trustSlipSummary?.unique_counterparties ?? "0")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Sponsors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {safeStr(trustSlipSummary?.sponsor_count ?? "0")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Active clans</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 900,
                }}
              >
                {safeStr(trustSlipSummary?.active_clan_count ?? "0")}
              </div>
            </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="trust-passport-explainability" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Why did my trust change?</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This section explains the most recent trust movement and the events behind it.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopTrustTap}
            onMouseDown={stopTrustTap}
            onTouchStart={stopTrustTap}
            onClick={(event) => handleCollapseTap("explainability", event)}
            style={collapseToggle()}
          >
            {collapsed.explainability ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.explainability ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Latest explanation
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Latest reason: {safeStr(explainability?.latest_reason || "No reason is shown yet.")}
                </div>
                <div style={helperText()}>
                  Latest note: {safeStr(explainability?.latest_note || "No note is shown yet.")}
                </div>
                <div style={helperText()}>
                  Latest source: {safeStr(explainability?.latest_source || "No source is shown yet.")}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Recent trust events
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {recentEvents.length === 0 ? (
                  <div style={helperText()}>
                    No recent trust event is currently shown.
                  </div>
                ) : (
                  recentEvents.slice(0, 6).map((item, index) => (
                    <div key={`${item.id || index}`} style={innerCard("#F8FBFF")}>
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
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {safeStr(item.event_type || "Trust event")}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {safeStr(item.delta) ? (
                            <span style={badge(true)}>Delta: {safeStr(item.delta)}</span>
                          ) : null}
                          {safeStr(item.created_at) ? (
                            <span style={badge(false)}>
                              {safeDateTime(item.created_at)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {safeStr(item.reason || item.note) ? (
                        <div style={{ marginTop: 8, ...helperText() }}>
                          {safeStr(item.reason || item.note)}
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="trust-passport-evidence" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Recomputed breakdown</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This section shows the current score breakdown used for the latest trust reading.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopTrustTap}
            onMouseDown={stopTrustTap}
            onTouchStart={stopTrustTap}
            onClick={(event) => handleCollapseTap("breakdown", event)}
            style={collapseToggle()}
          >
            {collapsed.breakdown ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.breakdown ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Ruleset
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Borrower repayment delta: {safeStr(ruleset?.borrower_repayment_delta || "—")}
                </div>
                <div style={helperText()}>
                  Guarantor repayment delta: {safeStr(ruleset?.guarantor_repayment_delta || "—")}
                </div>
                <div style={helperText()}>
                  Precision: {safeStr(ruleset?.precision || "—")}
                </div>
                <div style={helperText()}>
                  Ordering: {safeStr(ruleset?.ordering || "—")}
                </div>
                <div style={helperText()}>
                  Computed band: {safeStr(recompute?.breakdown?.computed_band || recompute?.band || "—")}
                </div>
                <div style={helperText()}>
                  Computed score: {safeStr(recompute?.breakdown?.computed_score || recompute?.score || "—")}
                </div>
                <div style={helperText()}>
                  Computed score int: {safeStr(recompute?.breakdown?.computed_score_int ?? "—")}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Counts by event type
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {eventCounts.length === 0 ? (
                  <div style={helperText()}>
                    No event-type count is currently shown.
                  </div>
                ) : (
                  eventCounts.map(([key, value]) => (
                    <div
                      key={key}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        borderBottom: "1px solid rgba(11,31,51,0.06)",
                        paddingBottom: 8,
                      }}
                    >
                      <div style={{ ...helperText(), color: "#0B1F33" }}>{key}</div>
                      <span style={badge(true)}>{String(value)}</span>
                    </div>
                  ))
                )}
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
            <div style={sectionLabel()}>Evidence and institutional context</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Exposure, capacity, risk flags, sponsorship, and TrustSlip context stay together here.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopTrustTap}
            onMouseDown={stopTrustTap}
            onTouchStart={stopTrustTap}
            onClick={(event) => handleCollapseTap("evidence", event)}
            style={collapseToggle()}
          >
            {collapsed.evidence ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.evidence ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Capacity context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Available guarantee capacity: {safeStr(capacityContext?.available_guarantee_capacity || "0.00")}
                </div>
                <div style={helperText()}>
                  Current locked guarantees: {safeStr(capacityContext?.current_locked_guarantees || "0.00")}
                </div>
                <div style={helperText()}>
                  Overexposure ratio: {safeStr(capacityContext?.overexposure_ratio || "0.00")}
                </div>
                <div style={helperText()}>
                  Risk level: {safeStr(capacityContext?.risk_level || "unknown")}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Risk and network context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Sponsor count: {safeStr(trustSlipSummary?.sponsor_count ?? "0")}
                </div>
                <div style={helperText()}>
                  Active clan count: {safeStr(trustSlipSummary?.active_clan_count ?? "0")}
                </div>
                <div style={helperText()}>
                  Unique counterparties: {safeStr(trustSlipSummary?.unique_counterparties ?? "0")}
                </div>
                <div style={helperText()}>
                  Phone verified: {String(Boolean(trustSlipSummary?.phone_verified))}
                </div>
                <div style={helperText()}>
                  Risk flags: {riskFlags.length > 0 ? riskFlags.join(", ") : "None visible"}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Institutional note
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  TrustSlip status: {safeStr(trustSlipSummary?.status || "—")}
                </div>
                <div style={helperText()}>
                  Issued: {safeDateTime(trustSlipSummary?.issued_at) || "—"}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(trustSlipSummary?.expires_at) || "—"}
                </div>
                <div style={helperText()}>
                  Disclaimer: {safeStr(
                    trustSlipSummary?.disclaimer ||
                      "TrustSlip is a portable summary derived from GSN trust history."
                  )}
                </div>
                <div style={helperText()}>
                  Not a bank guarantee: {String(Boolean(trustSlipSummary?.not_a_bank_guarantee))}
                </div>
                <div style={helperText()}>
                  No auto-debit: {String(Boolean(trustSlipSummary?.no_auto_debit))}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

    </div>
  );
}



