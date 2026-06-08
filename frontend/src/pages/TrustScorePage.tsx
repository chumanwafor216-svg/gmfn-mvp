import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  SubtleButton,
} from "../components/StableButton";
import {
  TrustPaperIcon,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
  type TrustPaperIconName,
} from "../components/TrustPaperMarks";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { resolveSharedProfileImage } from "../lib/profileImage";
import { buildTrustPassportSnapshot } from "../lib/trustDocumentSnapshots";
import { TRUST_BAND_SHORT_LABELS } from "../lib/trustBandLanguage";
import { buildTrustPassportViewModel } from "../lib/trustPassportViewModel";

type NoticeTone = "success" | "error";

type TrustPassportLaneKey =
  | "standing"
  | "evidence"
  | "community"
  | "finance"
  | "documents"
  | "repair";

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
  bank_verified?: boolean | null;
  bank_verification_label?: string | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
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
  profile_image_url?: string | null;
  community?: string | null;
  phone_verified?: boolean | null;
  bank_verified?: boolean | null;
  bank_verification_label?: string | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
  identity_verified?: boolean | null;
  identity_status_label?: string | null;
  identity_context?: Record<string, any> | null;
  community_context?: Record<string, any> | null;
  community_global_id?: string | null;
  community_code?: string | null;
  holder_role?: string | null;
  community_member_count?: string | number | null;
  active_member_count?: string | number | null;
  total_member_count?: string | number | null;
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

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
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
    profile_image_url: firstTruthy(src?.profile_image_url),
    community: firstTruthy(src?.community),
    phone_verified: src?.phone_verified ?? null,
    bank_verified: src?.bank_verified ?? null,
    identity_verified: src?.identity_verified ?? null,
    identity_status_label: firstTruthy(src?.identity_status_label),
    identity_context: src?.identity_context || null,
    community_context: src?.community_context || null,
    community_global_id: firstTruthy(src?.community_global_id),
    community_code: firstTruthy(src?.community_code),
    holder_role: firstTruthy(src?.holder_role),
    community_member_count: src?.community_member_count ?? null,
    active_member_count: src?.active_member_count ?? null,
    total_member_count: src?.total_member_count ?? null,
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

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function statusPillStyle(status: string): React.CSSProperties {
  const text = safeStr(status).toLowerCase();
  const positive =
    text.includes("strong") ||
    text.includes("stable") ||
    text.includes("verified") ||
    text.includes("ready") ||
    text === "yes";
  const pressure =
    text.includes("caution") ||
    text.includes("pressure") ||
    text.includes("weak") ||
    text.includes("high");
  const mixed = text.includes("mixed") || text.includes("pending");

  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    minHeight: 26,
    borderRadius: 8,
    padding: "4px 10px",
    fontSize: 12,
    fontWeight: 1000,
    color: positive
      ? "#166534"
      : pressure
        ? "#991B1B"
        : mixed
          ? "#92400E"
          : "#334155",
    background: positive
      ? "#EAF7EE"
      : pressure
        ? "#FFF1F2"
        : mixed
          ? "#FFF7E6"
          : "#F1F5F9",
    border: `1px solid ${
      positive
        ? "rgba(46,155,98,0.16)"
        : pressure
          ? "rgba(200,58,58,0.16)"
          : mixed
            ? "rgba(245,158,11,0.16)"
            : "rgba(100,116,139,0.14)"
    }`,
    textAlign: "center",
  };
}

function titleCaseWords(value: string): string {
  return safeStr(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function overviewIconBox(isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 36 : 46,
    height: isCompact ? 36 : 46,
    borderRadius: isCompact ? 12 : 15,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #0B3E78 0%, #061827 100%)",
    color: "#FFFFFF",
    border: "1px solid rgba(255,255,255,0.18)",
    boxShadow:
      "0 10px 22px rgba(3,30,66,0.18), inset 0 1px 0 rgba(255,255,255,0.18)",
    flex: "0 0 auto",
  };
}

function overviewStatusBox(ok: boolean, muted = false): React.CSSProperties {
  const warning = !ok && !muted;
  return {
    minHeight: 36,
    borderRadius: 999,
    display: "inline-grid",
    gridTemplateColumns: "24px minmax(0, 1fr)",
    alignItems: "center",
    gap: 7,
    padding: "6px 10px",
    color: muted ? "#0B2D4A" : ok ? "#16733C" : "#4B2C0B",
    background: muted ? "#F8FAFC" : ok ? "#F7FCF8" : "#FFFBF2",
    border: `1px solid ${
      muted
        ? "rgba(37,78,119,0.14)"
        : ok
          ? "rgba(46,155,98,0.20)"
          : "rgba(214,170,69,0.24)"
    }`,
    boxShadow: warning ? "inset 0 0 0 1px rgba(214,170,69,0.06)" : "none",
    fontSize: 12,
    fontWeight: 1000,
    lineHeight: 1.08,
    textAlign: "left",
    overflow: "hidden",
    whiteSpace: "nowrap",
    maxWidth: "100%",
  };
}

function overviewBadge(ok: boolean, muted = false): React.CSSProperties {
  return {
    width: 24,
    height: 24,
    borderRadius: 9,
    display: "grid",
    placeItems: "center",
    color: "#FFFFFF",
    background: muted
      ? "linear-gradient(180deg, #38516D 0%, #102A44 100%)"
      : ok
        ? "linear-gradient(180deg, #168457 0%, #064E3B 100%)"
        : "linear-gradient(180deg, #D6AA45 0%, #9A5F04 100%)",
    border: `1px solid ${
      muted
        ? "rgba(37,78,119,0.18)"
        : ok
          ? "rgba(46,155,98,0.28)"
          : "rgba(214,170,69,0.38)"
    }`,
    boxShadow:
      "0 8px 16px rgba(7,23,44,0.10), inset 0 1px 0 rgba(255,255,255,0.18)",
    flex: "0 0 auto",
  };
}

function OpenRecordGlyph({ size = 22 }: { size?: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.4,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ display: "block", flex: "0 0 auto" }}
    >
      <path {...common} d="M8 6H5.8A2.8 2.8 0 0 0 3 8.8v9.4A2.8 2.8 0 0 0 5.8 21h9.4A2.8 2.8 0 0 0 18 18.2V16" />
      <path {...common} d="M13 3h8v8" />
      <path {...common} d="M11 13 21 3" />
    </svg>
  );
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

function trustSlipVerifyFrontendPath(code: string, fallback = ""): string {
  const cleanCode = safeStr(code);
  if (cleanCode) {
    return `/trust-slips/verify/${encodeURIComponent(cleanCode)}/page`;
  }

  const rawFallback = safeStr(fallback);
  if (!rawFallback) return "";

  try {
    const url = new URL(rawFallback, "https://gsn.local");
    if (url.pathname.startsWith("/trust-slips/verify")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Use the raw fallback below.
  }

  return rawFallback.startsWith("/trust-slips/verify") ? rawFallback : "";
}

function frontendAbsoluteUrl(pathOrUrl: string): string {
  const raw = safeStr(pathOrUrl);
  if (!raw) return "";

  try {
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "";
    const url = new URL(raw, base || "https://gsn.local");
    const path = `${url.pathname}${url.search}${url.hash}`;
    return base ? `${base}${path}` : path;
  } catch {
    return raw;
  }
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
    statusText: "No cross-community consistency reading yet",
    whyText: "Complete identity and community activity first. The wider consistency reading will appear here when it is available.",
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
      statusText: "Select a community to view local community trust",
      whyText:
        "Local community trust belongs to the community you are using now, not the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Pending",
    scoreText: "-",
    tone: "neutral",
    statusText: "No local community trust reading yet",
    whyText:
      "Local community trust reflects your standing in the community you are using now. Use the community first, then this reading will appear here.",
  };
}

export default function TrustScorePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const pressureSectionRef = useRef<HTMLElement | null>(null);
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-score.route.dashboard"),
      notifications: routeTarget("notifications", selectedClanId, "trust-score.route.notifications"),
      identity: routeTarget("cci", selectedClanId, "trust-score.route.identity"),
      openTrust: routeTarget("openTrust", selectedClanId, "trust-score.route.open-trust"),
      cciReading: routeTarget("cciReading", selectedClanId, "trust-score.route.cci-reading"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust-score.route.trust-slip"),
      payoutDetails: routeTarget(
        "payoutDetails",
        selectedClanId,
        "trust-score.route.payout-details"
      ),
      communityConfirmations: routeTarget(
        "communityConfirmationInbox",
        selectedClanId,
        "trust-score.route.community-confirmations"
      ),
    }),
    [selectedClanId]
  );
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
  const [activeTrustPassportLane, setActiveTrustPassportLane] =
    useState<TrustPassportLaneKey>("standing");
  const [showIdentityCompletionPaths, setShowIdentityCompletionPaths] =
    useState(false);

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

  const identityContext = useMemo(
    () => trustSlipSummary?.identity_context || {},
    [trustSlipSummary]
  );
  const communityContext = useMemo(
    () => trustSlipSummary?.community_context || {},
    [trustSlipSummary]
  );
  const profileImageUrl = useMemo(() => {
    return resolveSharedProfileImage(
      me,
      trustSlipSummary?.profile_image_url,
      identityContext?.profile_image_url,
      me?.profile_image_url,
      me?.avatar_url,
      me?.photo_url
    );
  }, [trustSlipSummary, identityContext, me]);

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
      firstTruthy(
        trustSlipSummary?.community_code,
        trustSlipSummary?.community_global_id,
        communityContext?.community_code,
        communityContext?.community_global_id,
        matchedClan?.community_code,
        currentClan?.community_code
      ) ||
      "Awaiting issue"
     );
  }, [trustSlipSummary, communityContext, matchedClan, currentClan]);
  const communityVerifyKey = useMemo(() => {
    return firstTruthy(
      trustSlipSummary?.community_code,
      trustSlipSummary?.community_global_id,
      communityContext?.community_code,
      communityContext?.community_global_id,
      matchedClan?.community_code,
      currentClan?.community_code,
      selectedClanId
    );
  }, [trustSlipSummary, communityContext, matchedClan, currentClan, selectedClanId]);
  const communityVerifyPath = communityVerifyKey
    ? `/verify/community/${encodeURIComponent(communityVerifyKey)}`
    : "";

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

  const nextStep = useMemo(() => {
    return {
      title: safeStr(
        guidance?.nextBestStep?.title || "Keep your next trust step clean."
      ),
      detail: safeStr(
        guidance?.nextBestStep?.detail ||
          "Use the recent trust explanation and event mix to understand what to repair or protect next."
      ),
      ctaTo: safeStr(guidance?.nextBestStep?.ctaTo || routes.notifications),
      ctaLabel: safeStr(guidance?.nextBestStep?.ctaLabel || "Open Action Inbox"),
    };
  }, [guidance, routes.notifications]);

  const verifyPath = useMemo(() => {
    const code = firstTruthy(
      trustSlipSummary?.verification_code,
      trustSlipSummary?.code,
      trustSlipSummary?.token
    );
    return trustSlipVerifyFrontendPath(code, trustSlipSummary?.public_verify_url || "");
  }, [trustSlipSummary]);
  const verifyUrl = useMemo(() => frontendAbsoluteUrl(verifyPath), [verifyPath]);

  const capacityContext = trustSlipSummary?.evidence_summary?.capacity_context || null;
  const ruleset = recompute?.breakdown?.ruleset || null;

  const trustLimit = firstTruthy(
    trustSlipSummary?.trust_limit,
    trustSlipSummary?.trust_slip_limit,
    "0.00"
  );
  const trustCurrency = firstTruthy(trustSlipSummary?.currency, "NGN");
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
  const trustSlipStatus = firstTruthy(
    trustSlipSummary?.status,
    trustSlipSummary?.active || trustSlipSummary?.verified || trustSlipCode
      ? "Ready"
      : "Pending"
  );
  const expiresText = safeDateTime(trustSlipSummary?.expires_at) || "Not stated";
  const eventCount = safeStr(recompute?.event_count ?? "0");
  const activeClanCount = safeStr(trustSlipSummary?.active_clan_count ?? "0");
  const counterpartiesCount = safeStr(
    trustSlipSummary?.unique_counterparties ?? "0"
  );
  const riskLevel = firstTruthy(capacityContext?.risk_level, "Unknown");
  const readingBreakdownSource: Array<[string, string]> = [
    ["Borrower repayment delta", safeStr(ruleset?.borrower_repayment_delta || "-")],
    ["Guarantor repayment delta", safeStr(ruleset?.guarantor_repayment_delta || "-")],
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
  ];
  const readingBreakdownRows = readingBreakdownSource.filter(([, value]) => {
    const text = safeStr(value);
    return text && text !== "-";
  });
  const passportVm = buildTrustPassportViewModel({
    displayName: memberName,
    profileImageUrl,
    gmfnId,
    communityName,
    communityId: communityCode,
    holderRole: firstTruthy(
      trustSlipSummary?.holder_role,
      communityContext?.holder_role,
      "member"
    ),
    activeMemberCount: firstTruthy(
      trustSlipSummary?.active_member_count,
      trustSlipSummary?.community_member_count,
      communityContext?.active_member_count
    ),
    phoneVerified: trustSlipSummary?.phone_verified ?? identityContext?.phone_verified,
    bankVerified: trustSlipSummary?.bank_verified ?? identityContext?.bank_verified,
    bankVerificationLabel: firstTruthy(
      trustSlipSummary?.bank_verification_label,
      trustSlipSummary?.merchant_summary?.bank_verification_label,
      identityContext?.bank_verification_label
    ),
    passportVerified:
      trustSlipSummary?.passport_verified ?? identityContext?.passport_verified,
    passportVerificationLabel: firstTruthy(
      trustSlipSummary?.passport_verification_label,
      trustSlipSummary?.merchant_summary?.passport_verification_label,
      identityContext?.passport_verification_label
    ),
    communityIdentityConfirmed:
      trustSlipSummary?.community_identity_confirmed ??
      identityContext?.community_identity_confirmed,
    communityIdentityLabel: firstTruthy(
      trustSlipSummary?.community_identity_label,
      trustSlipSummary?.merchant_summary?.community_identity_label,
      identityContext?.community_identity_label
    ),
    identityVerified:
      trustSlipSummary?.identity_verified ?? identityContext?.identity_verified,
    identityStatusLabel: firstTruthy(
      trustSlipSummary?.identity_status_label,
      identityContext?.identity_status_label
    ),
    hasSelectedCommunity,
    band: currentBand,
    score: currentScore,
    localTrustReason: openTrust.whyText,
    crossCommunityReason: cci.whyText,
    latestReason: explainability?.latest_reason,
    latestNote: explainability?.latest_note,
    eventCount,
    recentEventCount: recentEvents.length,
    trustLimit,
    trustCurrency,
    activeClans: activeClanCount,
    counterparties: counterpartiesCount,
    sponsorCount: trustSlipSummary?.sponsor_count,
    riskLevel,
    riskFlags,
    trustSlipStatus,
    trustSlipCode,
    verifyUrl,
    lastFullRepaymentAt: trustSlipSummary?.last_full_repayment_at,
    lastReleaseAt: trustSlipSummary?.last_release_at,
    rawBreakdownRows: readingBreakdownRows,
    isExpiredOrInactive:
      ["expired", "revoked", "frozen"].includes(
        safeStr(trustSlipSummary?.status).toLowerCase()
      ) || trustSlipSummary?.active === false,
  });
  const hasProfileImage = Boolean(passportVm.identity.profileImageUrl);
  const passportInitials =
    passportVm.identity.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "GSN";
  const plainTrustVerdict = passportVm.verdict.lowData
    ? passportVm.verdict.interpretation
    : `${passportVm.verdict.band} means ${passportVm.verdict.bandLanguage.title.toLowerCase()}. ${passportVm.verdict.bandLanguage.implication}`;
  function openTrustRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function scrollToPressureNotes() {
    setNotice({
      tone: "success",
      text: "Opened the pressure notes. This is where the page explains what helps trust and what needs care.",
    });
    window.setTimeout(() => {
      pressureSectionRef.current?.scrollIntoView({
        block: "start",
      });
    }, 60);
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
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading Trust Passport...
          </div>
        </section>
      </div>
    );
  }

  const verificationBadges = [
    {
      icon: "phone" as TrustPaperIconName,
      label: passportVm.identity.phoneVerified
        ? "Phone verified"
        : "Phone not verified",
      ok: passportVm.identity.phoneVerified,
    },
    {
      icon: "community" as TrustPaperIconName,
      label:
        passportVm.identity.communityIdentityConfirmed
          ? "Community confirmed"
          : "Community not confirmed",
      ok: passportVm.identity.communityIdentityConfirmed,
    },
    {
      icon: "shield" as TrustPaperIconName,
      label:
        passportVm.identity.identityContinuity === "clean"
          ? "Continuity confirmed"
          : "Continuity review",
      ok: passportVm.identity.identityContinuity === "clean",
    },
    {
      icon: "wallet" as TrustPaperIconName,
      label:
        passportVm.identity.bankVerified === true
          ? firstTruthy(passportVm.identity.bankVerificationLabel, "Bank connected")
          : "Bank not connected",
      ok: passportVm.identity.bankVerified === true,
    },
    {
      icon: "document" as TrustPaperIconName,
      label: passportVm.identity.passportVerified
        ? firstTruthy(passportVm.identity.passportVerificationLabel, "Passport verified")
        : "Passport not connected",
      ok: passportVm.identity.passportVerified,
    },
  ];

  const gradeLegend = TRUST_BAND_SHORT_LABELS.map(({ band, label }) => [
    band,
    label,
  ]);
  const activeBand = safeStr(currentBand).toUpperCase().slice(0, 1);

  const identityRows: Array<[TrustPaperIconName, string, string]> = [
    ["id", "GSN ID", passportVm.identity.gmfnId],
    ["community", "Community", passportVm.identity.communityName],
    ["hash", "Community ID", passportVm.identity.communityId],
    ["shield", "Role", passportVm.identity.holderRole],
  ];

  const identityCompletionRows: Array<{
    icon: TrustPaperIconName;
    label: string;
    state: string;
    detail: string;
    actionLabel: string;
    target?: string;
    debugId: string;
    ok: boolean;
  }> = [
    {
      icon: "phone",
      label: "Phone check",
      state: passportVm.identity.phoneVerified ? "Verified" : "Route pending",
      detail: passportVm.identity.phoneVerified
        ? "Verified phone evidence is already attached to this Trust Passport."
        : "The repo has entry-time phone proof, but no authenticated phone-check page is wired yet.",
      actionLabel: passportVm.identity.phoneVerified ? "View proof" : "Route pending",
      target: passportVm.identity.phoneVerified ? routes.trustSlip : undefined,
      debugId: "trust-score.completion.phone",
      ok: Boolean(passportVm.identity.phoneVerified),
    },
    {
      icon: "community",
      label: "Community check",
      state: passportVm.identity.communityIdentityConfirmed
        ? "Confirmed"
        : communityVerifyPath
          ? "Open check"
          : "Open inbox",
      detail: communityVerifyPath
        ? "Open the public community record tied to this Trust Passport."
        : "Use the confirmation inbox when there is no public community key on this record.",
      actionLabel: communityVerifyPath ? "Open record" : "Open inbox",
      target: communityVerifyPath || routes.communityConfirmations,
      debugId: "trust-score.completion.community",
      ok: Boolean(passportVm.identity.communityIdentityConfirmed),
    },
    {
      icon: "wallet",
      label: "Bank / wallet",
      state: passportVm.identity.bankVerified ? "Connected" : "Add details",
      detail: passportVm.identity.bankVerified
        ? "Bank or wallet evidence is already recorded."
        : "Open payout details to add the bank or wallet record GSN can attach to this identity.",
      actionLabel: passportVm.identity.bankVerified ? "Open details" : "Add bank/wallet",
      target: routes.payoutDetails,
      debugId: "trust-score.completion.bank",
      ok: passportVm.identity.bankVerified === true,
    },
    {
      icon: "document",
      label: "Passport / ID",
      state: passportVm.identity.passportVerified ? "Recorded" : "Route pending",
      detail: passportVm.identity.passportVerified
        ? "Official ID evidence is already visible in the trust proof layer."
        : "Official ID evidence exists in entry flow, but a signed-in capture page is not wired yet.",
      actionLabel: passportVm.identity.passportVerified ? "View proof" : "Route pending",
      target: passportVm.identity.passportVerified ? routes.trustSlip : undefined,
      debugId: "trust-score.completion.passport",
      ok: Boolean(passportVm.identity.passportVerified),
    },
  ];

  const communityConfirmationCards: Array<[
    string,
    string,
    string,
    TrustPaperIconName,
    "Ready" | "Limited"
  ]> = [
    [
      "Community",
      passportVm.identity.communityName,
      "The active community tied to this trust reading.",
      "community",
      passportVm.identity.communityName === "Not stated" ? "Limited" : "Ready",
    ],
    [
      "Community ID",
      passportVm.identity.communityId,
      "The stable code that lets the public record point to the right community.",
      "hash",
      passportVm.identity.communityId === "Not stated" ? "Limited" : "Ready",
    ],
    [
      "Community confirmation",
      passportVm.identity.communityIdentityLabel,
      "Whether this identity has been confirmed by the community layer.",
      "check",
      passportVm.identity.communityIdentityConfirmed ? "Ready" : "Limited",
    ],
    [
      "Public record",
      communityVerifyPath ? "Ready to open" : "Needs community code",
      communityVerifyPath
        ? "The public community record can open from this Trust Passport."
        : "The public record cannot open until a community code is visible.",
      "document",
      communityVerifyPath ? "Ready" : "Limited",
    ],
  ];

  const trustQuestionIcons: Record<string, TrustPaperIconName> = {
    "Identity verified": "shield",
    "Support trust": "community",
    "Contribution discipline": "chart",
    "Finance discipline": "wallet",
    "Trade trust": "shop",
    "Follow-through": "check",
    "Community stability": "home",
    "Verified history": "document",
  };

  const trustSurfaceCards = [
    {
      icon: "home" as TrustPaperIconName,
      title: "Local community trust",
      detail: "How this member is currently reading inside the active community.",
      action: "View local reading",
      to: routes.openTrust,
      value: openTrust.classText,
      tone: "#EEF6FF",
      debugId: "trust-score.surface.local-community-trust",
    },
    {
      icon: "globe" as TrustPaperIconName,
      title: "Cross-community consistency",
      detail:
        "How consistent this member's trust signals appear across communities. CCI is the internal label.",
      action: "View consistency reading",
      to: routes.cciReading,
      value: cci.classText,
      tone: "#F3EFFF",
      debugId: "trust-score.surface.cross-community-consistency",
    },
  ];

  const latestExplanation =
    firstTruthy(
      explainability?.latest_note,
      explainability?.latest_reason,
      openTrust.whyText,
      cci.whyText
    ) ||
    "No recent trust movement is shown yet. When new events occur, the reason will appear here in plain language.";

  const institutionalRows = [
    ["Trust limit", `${trustLimit} ${trustCurrency}`],
    ["Event count", eventCount],
    ["Counterparties", counterpartiesCount],
    [
      "Available guarantee capacity",
      safeStr(capacityContext?.available_guarantee_capacity || "0.00"),
    ],
    [
      "Current locked guarantees",
      safeStr(capacityContext?.current_locked_guarantees || "0.00"),
    ],
    ["Overexposure ratio", safeStr(capacityContext?.overexposure_ratio || "0.00")],
    ["Risk level", riskLevel],
    ["Not a bank guarantee", "Yes"],
    ["No auto-debit", "Yes"],
  ];

  const financeDisciplineCards: Array<[string, string, string, TrustPaperIconName]> = [
    [
      "Trust limit",
      `${trustLimit} ${trustCurrency}`,
      "The current ceiling GSN can show from this trust record.",
      "wallet",
    ],
    [
      "Available capacity",
      `${safeStr(capacityContext?.available_guarantee_capacity || "0.00")} ${trustCurrency}`,
      "What still appears available before the record looks stretched.",
      "check",
    ],
    [
      "Locked guarantees",
      `${safeStr(capacityContext?.current_locked_guarantees || "0.00")} ${trustCurrency}`,
      "Support already standing behind active commitments.",
      "shield",
    ],
    [
      "Overexposure",
      safeStr(capacityContext?.overexposure_ratio || "0.00"),
      "How stretched the guarantee position looks right now.",
      "chart",
    ],
    [
      "Risk level",
      riskLevel,
      "A plain warning level from the current capacity context.",
      "alert",
    ],
  ];

  const trustPassportLanes: Array<{
    key: TrustPassportLaneKey;
    icon: TrustPaperIconName;
    label: string;
    detail: string;
  }> = [
    {
      key: "standing",
      icon: "shield",
      label: "Current Trust Standing",
      detail: "Identity, verdict, and what this reading says.",
    },
    {
      key: "evidence",
      icon: "chart",
      label: "Evidence Story",
      detail: "What helped, what pressured, and why trust moved.",
    },
    {
      key: "community",
      icon: "community",
      label: "Community Confirmation",
      detail: "Local and cross-community trust surfaces.",
    },
    {
      key: "finance",
      icon: "wallet",
      label: "Finance Discipline",
      detail: "Limit, capacity, locked guarantees, and risk context.",
    },
    {
      key: "documents",
      icon: "document",
      label: "Documents / TrustSlip",
      detail: "Open, verify, copy, refresh, or export the reading.",
    },
    {
      key: "repair",
      icon: "alert",
      label: "Repair or Next Step",
      detail: "Review pressure notes before opening the next action.",
    },
  ];

  const activeLane =
    trustPassportLanes.find((lane) => lane.key === activeTrustPassportLane) ||
    trustPassportLanes[0];

  const noticeNode = notice ? (
    <div style={noticeCard(notice.tone)}>{notice.text}</div>
  ) : null;

  return (
    <main
      className="trust-passport-root gsn-page theme-trust"
      style={{
        minHeight: "100vh",
        margin: "-18px",
        padding: isCompact ? "22px 14px 34px" : "24px 24px 46px",
        background: "linear-gradient(180deg, #DDEDF8 0%, #F3F7FB 42%, #F8FAFC 100%)",
      }}
    >
      <div
        style={{
          width: "min(100%, 940px)",
          margin: "0 auto",
          display: "grid",
          gap: isCompact ? 12 : 16,
        }}
      >
        {noticeNode}

        <section
          style={{
            ...pageCard("#FFFFFF"),
            border: "1px solid rgba(37,78,119,0.14)",
            boxShadow: "0 14px 36px rgba(7,23,44,0.08)",
            padding: isCompact ? 12 : 16,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: isCompact ? "flex-start" : "center",
              flexDirection: isCompact ? "column" : "row",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  color: "#617085",
                  fontSize: 12,
                  letterSpacing: 1.8,
                  textTransform: "uppercase",
                  fontWeight: 1000,
                }}
              >
                Active trust lane
              </div>
              <div
                style={{
                  color: "#07172C",
                  fontSize: isCompact ? 21 : 25,
                  lineHeight: 1.08,
                  fontWeight: 1000,
                  marginTop: 4,
                }}
              >
                {activeLane.label}
              </div>
              <p style={{ ...helperText(), margin: "6px 0 0" }}>
                {activeLane.detail}
              </p>
            </div>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#0B63D1",
                background: "#EEF6FF",
                border: "1px solid rgba(11,99,209,0.16)",
                borderRadius: 999,
                padding: "8px 12px",
                fontSize: 13,
                fontWeight: 1000,
                whiteSpace: "nowrap",
              }}
            >
              <TrustPaperIcon name={activeLane.icon} size={18} />
              One lane open
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 10,
              marginTop: 12,
            }}
          >
            {trustPassportLanes.map((lane) => {
              const isActive = lane.key === activeTrustPassportLane;
              return (
                <SecondaryButton
                  key={lane.key}
                  onClick={() => setActiveTrustPassportLane(lane.key)}
                  fullWidth
                  stableHeight={isCompact ? 62 : 66}
                  debugId={`trust-score.lane.${lane.key}`}
                  style={{
                    justifyContent: "flex-start",
                    borderRadius: 12,
                    border: isActive
                      ? "1px solid rgba(11,99,209,0.36)"
                      : "1px solid rgba(216,227,238,0.9)",
                    background: isActive ? "#EEF6FF" : "#FFFFFF",
                    boxShadow: isActive
                      ? "0 8px 20px rgba(11,99,209,0.12)"
                      : "none",
                    color: "#07172C",
                    fontSize: isCompact ? 13 : 14,
                    fontWeight: 1000,
                    paddingInline: 12,
                  }}
                >
                  <TrustPaperIcon
                    name={lane.icon}
                    size={isCompact ? 18 : 20}
                    color={isActive ? "#0B63D1" : "#526579"}
                  />
                  {lane.label}
                </SecondaryButton>
              );
            })}
          </div>
        </section>

        <section
          style={{
            ...pageCard("#FFFFFF"),
            border: "1px solid rgba(7,23,44,0.10)",
            borderRadius: isCompact ? 20 : 28,
            boxShadow: "0 14px 32px rgba(7,23,44,0.12)",
            padding: isCompact ? 12 : 24,
            minHeight: isCompact ? "min(720px, calc(100svh - 132px))" : undefined,
            position: "relative",
            overflow: "hidden",
            display: "grid",
            alignContent: "start",
            scrollMarginTop: isCompact ? 112 : 24,
          }}
        >
          <section
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "88px minmax(0, 1fr)" : "132px minmax(0, 1fr)",
              gap: isCompact ? 12 : 18,
              alignItems: "center",
              position: "relative",
              zIndex: 1,
            }}
          >
            <div
              style={{
                width: isCompact ? 88 : 132,
                height: isCompact ? 88 : 132,
                borderRadius: isCompact ? 16 : 22,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(180deg, #EEF6FF 0%, #FFFFFF 100%)",
                border: "2px solid rgba(214,170,69,0.28)",
                color: "#0B63D1",
                fontWeight: 1000,
                fontSize: isCompact ? 22 : 30,
                overflow: "hidden",
                boxShadow: "inset 0 0 0 4px rgba(255,255,255,0.72), 0 10px 20px rgba(7,23,44,0.09)",
                position: "relative",
              }}
            >
              {hasProfileImage ? (
                <img
                  src={passportVm.identity.profileImageUrl}
                  alt={`${passportVm.identity.displayName} profile`}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                    borderRadius: isCompact ? 14 : 20,
                  }}
                />
              ) : (
                passportInitials
              )}
            </div>

            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    minHeight: isCompact ? 24 : 30,
                    borderRadius: 999,
                    padding: isCompact ? "4px 8px" : "5px 10px",
                    background: "linear-gradient(180deg, #F8E7B8 0%, #E8C875 100%)",
                    border: "1px solid rgba(160,117,33,0.24)",
                    color: "#4A3410",
                    fontWeight: 1000,
                    fontSize: isCompact ? 10.5 : 13,
                    boxShadow: "0 10px 20px rgba(160,117,33,0.10)",
                  }}
                >
                  <TrustPaperIcon name="shield" size={isCompact ? 14 : 16} />
                  Snapshot 1
                </div>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    minHeight: isCompact ? 24 : 30,
                    borderRadius: 999,
                    padding: isCompact ? "4px 8px" : "5px 10px",
                    background: "linear-gradient(180deg, #EEF6FF 0%, #DCEBFF 100%)",
                    border: "1px solid rgba(11,99,209,0.18)",
                    color: "#073E83",
                    fontWeight: 1000,
                    fontSize: isCompact ? 10.5 : 13,
                    boxShadow: "0 8px 16px rgba(11,99,209,0.08)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <TrustPaperIcon name="check" size={isCompact ? 14 : 16} strokeWidth={2.8} />
                  Photo clear
                </span>
              </div>
              <h1
                style={{
                  margin: isCompact ? "5px 0 0" : "10px 0 0",
                  color: "#07172C",
                  fontSize: isCompact ? 27 : 36,
                  lineHeight: 1.03,
                  fontWeight: 1000,
                  letterSpacing: 0,
                }}
              >
                Identity Overview
              </h1>
              <p
                style={{
                  ...helperText(),
                  margin: isCompact ? "4px 0 0" : "8px 0 0",
                  maxWidth: 460,
                  color: "#617085",
                  fontSize: isCompact ? 12 : 15,
                  lineHeight: 1.25,
                }}
              >
                Community-backed identity snapshot
              </p>
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(2, minmax(0, 1fr))",
              gap: isCompact ? 8 : 10,
              marginTop: isCompact ? 14 : 18,
              position: "relative",
              zIndex: 1,
            }}
          >
            {identityRows.map(([icon, label, value]) => (
              <div
                key={label}
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "36px minmax(0, 1fr)"
                    : "46px minmax(0, 1fr)",
                  gap: isCompact ? 7 : 10,
                  alignItems: "center",
                  minHeight: isCompact ? 56 : 68,
                  padding: isCompact ? "7px 8px" : "10px 12px",
                  borderRadius: isCompact ? 14 : 16,
                  border: "1px solid rgba(216,227,238,0.72)",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,255,0.94) 100%)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
                  overflow: "hidden",
                }}
              >
                <span style={overviewIconBox(isCompact)}>
                  <TrustPaperIcon
                    name={icon}
                    size={isCompact ? 21 : 26}
                    color="#FFFFFF"
                    strokeWidth={2.85}
                  />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span
                    style={{
                      display: "block",
                      color: "#617085",
                      fontSize: isCompact ? 10.5 : 12,
                      fontWeight: 1000,
                      lineHeight: 1.1,
                    }}
                  >
                    {label}
                  </span>
                  <span
                    style={{
                      display: "block",
                      marginTop: 3,
                      color: "#334155",
                      fontSize: isCompact ? 12.5 : 15,
                      lineHeight: 1.14,
                      fontWeight: 1000,
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                      hyphens: "none",
                    }}
                  >
                    {label === "Role" ? titleCaseWords(value) : value}
                  </span>
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: isCompact ? 6 : 8,
              marginTop: isCompact ? 12 : 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            {verificationBadges.map((item) => (
              <span key={item.label} style={overviewStatusBox(item.ok)}>
                <span style={overviewBadge(item.ok)}>
                  <TrustPaperIcon name={item.icon} size={15} strokeWidth={2.65} />
                </span>
                <span
                  style={{
                    minWidth: 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {item.label}
                </span>
              </span>
            ))}
            <span style={overviewStatusBox(false, true)}>
              <span style={overviewBadge(false, true)}>
                <TrustPaperIcon name="community" size={15} strokeWidth={2.65} />
              </span>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Active in {passportVm.technicalDetail.activeClans}
              </span>
            </span>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
              gap: isCompact ? 8 : 10,
              marginTop: isCompact ? 12 : 16,
              position: "relative",
              zIndex: 1,
            }}
          >
            <PrimaryButton
              onClick={() => setShowIdentityCompletionPaths((open) => !open)}
              stableHeight={isCompact ? 50 : 58}
              fullWidth
              aria-expanded={showIdentityCompletionPaths}
              style={{
                borderRadius: isCompact ? 12 : 14,
                fontSize: isCompact ? 13 : 16,
                fontWeight: 1000,
                paddingInline: isCompact ? 10 : 14,
              }}
              debugId="trust-score.complete-identification"
            >
              <TrustPaperIcon name="id" size={isCompact ? 18 : 21} strokeWidth={2.4} />
              Complete ID checks
            </PrimaryButton>
            <SecondaryButton
              onClick={() => {
                if (communityVerifyPath) {
                  openTrustRoute(communityVerifyPath);
                  return;
                }
                setNotice({
                  tone: "error",
                  text: "The public community record is not ready because this Trust Passport has no community code yet.",
                });
              }}
              stableHeight={isCompact ? 50 : 58}
              fullWidth
              style={{
                borderRadius: isCompact ? 12 : 14,
                background: "linear-gradient(180deg, #052B58 0%, #031E42 100%)",
                border: "1px solid rgba(3,30,66,0.18)",
                color: "#FFFFFF",
                boxShadow: "0 10px 22px rgba(3,30,66,0.17)",
                fontSize: isCompact ? 13 : 16,
                fontWeight: 1000,
                paddingInline: isCompact ? 10 : 14,
              }}
              debugId="trust-score.open-public-community-record"
            >
              <OpenRecordGlyph size={isCompact ? 18 : 21} />
              Open public community record
            </SecondaryButton>
          </div>

          {showIdentityCompletionPaths ? (
            <div
              style={{
                marginTop: isCompact ? 10 : 12,
                padding: isCompact ? 10 : 12,
                borderRadius: isCompact ? 14 : 16,
                border: "1px solid rgba(11,99,209,0.18)",
                background:
                  "linear-gradient(180deg, rgba(248,251,255,0.98) 0%, rgba(238,246,255,0.94) 100%)",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.84)",
                display: "grid",
                gap: isCompact ? 8 : 10,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  color: "#334155",
                  fontSize: isCompact ? 11.5 : 13,
                  lineHeight: 1.35,
                  fontWeight: 850,
                }}
              >
                Choose the missing proof. Only real completion routes open; pending routes are
                marked plainly so this button does not send people to another explanation page.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: isCompact ? 7 : 9,
                }}
              >
                {identityCompletionRows.map((item) => (
                  <SecondaryButton
                    key={item.debugId}
                    onClick={() => {
                      if (item.target) {
                        openTrustRoute(item.target);
                        return;
                      }

                      setNotice({
                        tone: "error",
                        text: `${item.label} needs a dedicated signed-in completion page before GSN can finish it from Trust Passport.`,
                      });
                    }}
                    stableHeight={isCompact ? 56 : 62}
                    fullWidth
                    debugId={item.debugId}
                    style={{
                      justifyContent: "flex-start",
                      gap: isCompact ? 8 : 10,
                      borderRadius: isCompact ? 12 : 14,
                      border: item.ok
                        ? "1px solid rgba(46,155,98,0.20)"
                        : "1px solid rgba(214,170,69,0.22)",
                      background: item.ok
                        ? "linear-gradient(180deg, #F7FCF8 0%, #EEF8F0 100%)"
                        : "linear-gradient(180deg, #FFFFFF 0%, #FFF9EA 100%)",
                      color: "#07172C",
                      boxShadow: "none",
                      paddingInline: isCompact ? 8 : 10,
                    }}
                  >
                    <span style={overviewBadge(item.ok)}>
                      <TrustPaperIcon name={item.icon} size={15} strokeWidth={2.65} />
                    </span>
                    <span
                      style={{
                        minWidth: 0,
                        display: "grid",
                        gap: 2,
                        textAlign: "left",
                        lineHeight: 1.08,
                      }}
                    >
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          minWidth: 0,
                        }}
                      >
                        <span
                          style={{
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            fontWeight: 1000,
                          }}
                        >
                          {item.label}
                        </span>
                        <span
                          style={{
                            flex: "0 0 auto",
                            color: item.ok ? "#16733C" : "#92400E",
                            fontSize: 10,
                            fontWeight: 1000,
                            textTransform: "uppercase",
                          }}
                        >
                          {item.state}
                        </span>
                      </span>
                      <span
                        style={{
                          color: "#617085",
                          fontSize: isCompact ? 10.5 : 11.5,
                          fontWeight: 850,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.actionLabel} - {item.detail}
                      </span>
                    </span>
                  </SecondaryButton>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        <section
          style={{
            ...pageCard("#FFFFFF"),
            border: "1px solid rgba(37,78,119,0.14)",
            boxShadow: "0 16px 42px rgba(7,23,44,0.08)",
            padding: isCompact ? 12 : 22,
            position: "relative",
            overflow: "hidden",
          }}
        >

          <section
            style={{
              display:
                activeTrustPassportLane === "standing" ? "grid" : "none",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 14,
              marginTop: 14,
            }}
          >
            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
                display: "grid",
                gap: 14,
              }}
            >
              <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
                2. Current trust verdict
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "82px minmax(0, 1fr)" : "112px minmax(0, 1fr)",
                  gap: isCompact ? 12 : 16,
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    minHeight: isCompact ? 82 : 112,
                    borderRadius: 18,
                    display: "grid",
                    placeItems: "center",
                    background: readingTone.bg,
                    border: readingTone.border,
                    color: readingTone.text,
                    fontSize: isCompact ? 54 : 76,
                    lineHeight: 1,
                    fontWeight: 1000,
                  }}
                >
                  {activeBand || currentBand}
                </div>
                <div>
                  <div
                    style={{
                      color: readingTone.text,
                      fontSize: 23,
                      lineHeight: 1.1,
                      fontWeight: 1000,
                    }}
                  >
                    {passportVm.verdict.label}
                  </div>
                  <p style={{ ...helperText(), margin: "8px 0 0" }}>
                    {plainTrustVerdict}
                  </p>
                  <div style={{ marginTop: 10 }}>
                    <span
                      title={passportVm.verdict.evidenceMeaning}
                      style={statusPillStyle(passportVm.verdict.evidenceStatus)}
                    >
                      Evidence depth: {passportVm.verdict.evidenceLabel}
                    </span>
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
                  border: "1px solid rgba(216,227,238,0.9)",
                  borderRadius: 14,
                  overflow: "hidden",
                }}
              >
                {gradeLegend.map(([grade, label]) => {
                  const isActive = activeBand === grade;
                  return (
                    <div
                      key={grade}
                      style={{
                        padding: isCompact ? "8px 4px" : "10px 6px",
                        textAlign: "center",
                        background: isActive ? "#FFF1F2" : grade === "A" || grade === "B" ? "#F0FBF4" : "#FFFDF5",
                        borderLeft: "1px solid rgba(216,227,238,0.9)",
                        boxShadow: isActive ? "inset 0 0 0 2px rgba(200,58,58,0.45)" : "none",
                      }}
                    >
                      <div
                        style={{
                          color: isActive ? "#991B1B" : "#07172C",
                          fontWeight: 1000,
                          fontSize: isCompact ? 16 : 18,
                        }}
                      >
                        {grade}
                      </div>
                      {!isCompact ? (
                        <div style={{ color: "#526579", fontSize: 11, fontWeight: 850 }}>
                          {label}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
              }}
            >
              <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
                3. What this reading says
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                {passportVm.trustQuestions.map((item) => (
                  <div
                    key={item.title}
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: isCompact ? 6 : 10,
                      alignItems: isCompact ? "start" : "center",
                      padding: "8px 0",
                      borderBottom: "1px solid rgba(216,227,238,0.72)",
                    }}
                  >
                    <span
                      style={{
                        color: "#334155",
                        fontWeight: 900,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <TrustPaperIcon
                        name={trustQuestionIcons[item.title] || "shield"}
                        size={19}
                        color="#0B63D1"
                      />
                      {item.title}
                    </span>
                    <span style={statusPillStyle(item.status)}>{item.status}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              ...innerCard("#F8FBFF"),
              border: "1px solid rgba(11,99,209,0.14)",
              display:
                activeTrustPassportLane === "evidence" ? "block" : "none",
              marginTop: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <TrustPaperWatermark
              name="chart"
              color="#0B63D1"
              size={isCompact ? 168 : 220}
              opacity={0.045}
              style={{ right: isCompact ? -70 : -46, top: -44, bottom: "auto" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#0B63D1",
                fontWeight: 1000,
                fontSize: 14,
                textTransform: "uppercase",
                letterSpacing: 1.6,
              }}
            >
              <TrustPaperIcon name="chart" size={20} />
              Evidence Story
            </div>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 22 : 28,
                lineHeight: 1.08,
                fontWeight: 1000,
                marginTop: 8,
              }}
            >
              What changed, and why it matters
            </div>
            <p
              style={{
                ...helperText(),
                maxWidth: 720,
                margin: "8px 0 0",
              }}
            >
              This lane explains the visible signals behind the trust reading
              before showing the deeper record. Start with the plain story, then
              use the evidence rows only when you need proof.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div style={{ ...innerCard("#FFFFFF"), border: "1px solid rgba(216,227,238,0.9)" }}>
                <div style={{ color: "#0B63D1", fontWeight: 1000 }}>
                  What GSN sees now
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  {latestExplanation}
                </p>
              </div>
              <div style={{ ...innerCard("#F0FBF4"), border: "1px solid rgba(46,155,98,0.16)" }}>
                <div style={{ color: "#166534", fontWeight: 1000 }}>
                  Strongest support
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  {passportVm.reasons.helpsTrust[0] ||
                    "No supporting trust signal is visible yet."}
                </p>
              </div>
              <div style={{ ...innerCard("#FFF8F0"), border: "1px solid rgba(200,58,58,0.14)" }}>
                <div style={{ color: "#991B1B", fontWeight: 1000 }}>
                  Needs care
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  {passportVm.reasons.createsPressure[0] ||
                    "No pressure signal is visible yet."}
                </p>
              </div>
            </div>
          </section>

          <section
            style={{
              ...innerCard("#FFF8F0"),
              border: "1px solid rgba(200,58,58,0.16)",
              display:
                activeTrustPassportLane === "repair" ? "block" : "none",
              marginTop: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <TrustPaperWatermark
              name="alert"
              color="#991B1B"
              size={isCompact ? 170 : 226}
              opacity={0.045}
              style={{ right: isCompact ? -76 : -44, top: -52, bottom: "auto" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#991B1B",
                fontSize: 14,
                fontWeight: 1000,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              <TrustPaperIcon name="alert" size={20} />
              Repair or Next Step
            </div>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 22 : 28,
                lineHeight: 1.08,
                fontWeight: 1000,
                marginTop: 8,
              }}
            >
              {nextStep.title}
            </div>
            <p
              style={{
                ...helperText(),
                maxWidth: 720,
                margin: "8px 0 0",
              }}
            >
              {nextStep.detail}
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 12,
                marginTop: 14,
              }}
            >
              <div style={{ ...innerCard("#FFFFFF"), border: "1px solid rgba(216,227,238,0.9)" }}>
                <div style={{ color: "#991B1B", fontWeight: 1000 }}>
                  First thing to check
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  {passportVm.reasons.createsPressure[0] ||
                    "No urgent pressure signal is visible yet. Keep the current record clean and watch the next trust event."}
                </p>
              </div>
              <div style={{ ...innerCard("#FFFFFF"), border: "1px solid rgba(216,227,238,0.9)" }}>
                <div style={{ color: "#166534", fontWeight: 1000 }}>
                  What not to do
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  Do not guess the repair path from the score alone. Open the
                  next action only after reading the pressure notes below.
                </p>
              </div>
            </div>

            <PrimaryButton
              onClick={() => {
                setNotice({
                  tone: "success",
                  text: "Opening the next safe trust step now.",
                });
                openTrustRoute(nextStep.ctaTo);
              }}
              fullWidth
              stableHeight={isCompact ? 54 : 62}
              debugId="trust-score.repair-next-step"
              style={{
                marginTop: 14,
                borderRadius: 12,
                fontSize: isCompact ? 14 : 16,
                fontWeight: 1000,
              }}
            >
              <TrustPaperIcon name="alert" size={isCompact ? 18 : 20} />
              {nextStep.ctaLabel}
            </PrimaryButton>
          </section>

          <section
            ref={pressureSectionRef}
            style={{
              ...innerCard("#FFFFFF"),
              border: "1px solid rgba(216,227,238,0.9)",
              display:
                activeTrustPassportLane === "evidence" ||
                activeTrustPassportLane === "repair"
                  ? "block"
                  : "none",
              marginTop: 14,
              scrollMarginTop: isCompact ? 96 : 24,
            }}
          >
            <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
              4. Why this reading looks like this
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 14,
                marginTop: 12,
              }}
            >
              <div style={{ ...innerCard("#F0FBF4"), position: "relative", overflow: "hidden" }}>
                <TrustPaperWatermark name="shield" color="#166534" size={130} opacity={0.065} />
                <div style={{ color: "#166534", fontWeight: 1000, fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrustPaperIcon name="shield" size={21} />
                  What helps trust
                </div>
                <ul style={{ ...helperText(), margin: "10px 0 0", paddingLeft: 18 }}>
                  {passportVm.reasons.helpsTrust.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div style={{ ...innerCard("#FFF1F2"), position: "relative", overflow: "hidden" }}>
                <TrustPaperWatermark name="alert" color="#991B1B" size={130} opacity={0.06} />
                <div style={{ color: "#991B1B", fontWeight: 1000, fontSize: 17, display: "flex", alignItems: "center", gap: 8 }}>
                  <TrustPaperIcon name="alert" size={21} />
                  What creates pressure
                </div>
                <ul style={{ ...helperText(), margin: "10px 0 0", paddingLeft: 18 }}>
                  {passportVm.reasons.createsPressure.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          <section
            style={{
              display:
                activeTrustPassportLane === "community" ? "block" : "none",
              marginTop: 14,
            }}
          >
            <div
              style={{
                ...innerCard("#F8FBFF"),
                border: "1px solid rgba(11,99,209,0.14)",
                position: "relative",
                overflow: "hidden",
                marginBottom: 14,
              }}
            >
              <TrustPaperWatermark
                name="community"
                color="#0B63D1"
                size={isCompact ? 160 : 216}
                opacity={0.045}
                style={{ right: isCompact ? -74 : -38, top: -48, bottom: "auto" }}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 9,
                  color: "#0B63D1",
                  fontSize: 14,
                  fontWeight: 1000,
                  letterSpacing: 1.6,
                  textTransform: "uppercase",
                }}
              >
                <TrustPaperIcon name="community" size={20} />
                Community Confirmation
              </div>
              <div
                style={{
                  color: "#07172C",
                  fontSize: isCompact ? 22 : 28,
                  lineHeight: 1.08,
                  fontWeight: 1000,
                  marginTop: 8,
                }}
              >
                Can this trust story be tied to a real community?
              </div>
              <p
                style={{
                  ...helperText(),
                  maxWidth: 720,
                  margin: "8px 0 0",
                }}
              >
                This lane checks the community identity behind the member's
                trust story before showing local and cross-community readings.
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 14,
                }}
              >
                {communityConfirmationCards.map(([label, value, detail, icon, status]) => (
                  <div
                    key={label}
                    style={{
                      ...innerCard("#FFFFFF"),
                      border:
                        status === "Ready"
                          ? "1px solid rgba(46,155,98,0.16)"
                          : "1px solid rgba(200,58,58,0.14)",
                      minHeight: isCompact ? 0 : 144,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 8,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: status === "Ready" ? "#166534" : "#991B1B",
                          fontWeight: 1000,
                        }}
                      >
                        <TrustPaperIcon name={icon} size={18} />
                        {label}
                      </span>
                      <span style={statusPillStyle(status)}>{status}</span>
                    </div>
                    <div
                      style={{
                        color: "#07172C",
                        fontSize: isCompact ? 18 : 20,
                        lineHeight: 1.1,
                        fontWeight: 1000,
                        marginTop: 8,
                        overflowWrap: "break-word",
                      }}
                    >
                      {value}
                    </div>
                    <p style={{ ...helperText(), margin: "8px 0 0", lineHeight: 1.45 }}>
                      {detail}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
              5. Trust surfaces
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
                marginTop: 10,
              }}
            >
              {trustSurfaceCards.map((item) => (
                <div key={item.title} style={{ ...innerCard(item.tone), display: "grid", gap: 8 }}>
                  <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 17, display: "flex", alignItems: "center", gap: 9 }}>
                    <TrustPaperIcon name={item.icon} size={25} color="#0B63D1" />
                    {item.title}
                  </div>
                  <p style={{ ...helperText(), margin: 0 }}>{item.detail}</p>
                  <div
                    style={{
                      display: isCompact ? "grid" : "flex",
                      gridTemplateColumns: isCompact ? "1fr" : undefined,
                      alignItems: isCompact ? "stretch" : "center",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={statusPillStyle(item.value)}>{item.value}</span>
                    <SecondaryButton
                      onClick={() => openTrustRoute(item.to)}
                      stableHeight={isCompact ? 36 : 38}
                      fullWidth={isCompact}
                      debugId={item.debugId}
                      style={{
                        borderRadius: 10,
                        fontSize: isCompact ? 12 : 13,
                        fontWeight: 950,
                        paddingInline: 12,
                      }}
                    >
                      {item.action}
                    </SecondaryButton>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              display:
                activeTrustPassportLane === "evidence" ||
                activeTrustPassportLane === "documents" ||
                activeTrustPassportLane === "repair"
                  ? "grid"
                  : "none",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
              gap: 14,
              marginTop: 14,
            }}
          >
            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
                display:
                  activeTrustPassportLane === "evidence" ||
                  activeTrustPassportLane === "repair"
                    ? "block"
                    : "none",
              }}
            >
              <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
                6. Why did my trust change?
              </div>
              <div style={{ color: "#0B63D1", fontWeight: 1000, marginTop: 10 }}>
                Latest explanation
              </div>
              <p style={{ ...helperText(), margin: "6px 0 0" }}>{latestExplanation}</p>
              <div style={{ color: "#5542A8", fontWeight: 1000, marginTop: 14 }}>
                Recent trust events
              </div>
                {recentEvents.length > 0 ? (
                <div style={{ marginTop: 8, display: "grid", gap: 8 }}>
                  {recentEvents.slice(0, isCompact ? 2 : 3).map((event, index) => (
                    <div key={event.id || index} style={innerCard("#F8FBFF")}>
                      <b>{firstTruthy(event.event_type, "Trust event")}</b>
                      <div style={helperText()}>
                        {firstTruthy(event.reason, event.note, safeDateTime(event.created_at), "No detail shown")}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ ...innerCard("#F8FBFF"), marginTop: 8, color: "#526579" }}>
                  No recent trust events are visible.
                </div>
              )}
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
                display:
                  activeTrustPassportLane === "documents" ? "block" : "none",
              }}
            >
              <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
                7. Shareable trust tools
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <PrimaryButton
                  onClick={() => {
                    void handleRefreshTrust();
                  }}
                  busy={refreshing}
                  busyLabel="Refreshing..."
                  fullWidth
                  stableHeight={isCompact ? 48 : 58}
                  debugId="trust-score.refresh"
                  style={{
                    borderRadius: 11,
                    fontSize: isCompact ? 12 : 14,
                    fontWeight: 950,
                    paddingInline: 10,
                  }}
                >
                  <TrustPaperIcon name="refresh" size={isCompact ? 17 : 19} />
                  Refresh trust reading
                </PrimaryButton>
                <SecondaryButton
                  onClick={copyTrustSnapshot}
                  fullWidth
                  stableHeight={isCompact ? 48 : 58}
                  debugId="trust-score.copy-snapshot"
                  style={{
                    borderRadius: 11,
                    fontSize: isCompact ? 12 : 14,
                    fontWeight: 950,
                    paddingInline: 10,
                  }}
                >
                  <TrustPaperIcon name="copy" size={isCompact ? 17 : 19} />
                  Copy snapshot
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => openTrustRoute(routes.trustSlip)}
                  fullWidth
                  stableHeight={isCompact ? 48 : 58}
                  debugId="trust-score.open-trust-slip"
                  style={{
                    borderRadius: 11,
                    fontSize: isCompact ? 12 : 14,
                    fontWeight: 950,
                    paddingInline: 10,
                  }}
                >
                  <TrustPaperIcon name="document" size={isCompact ? 17 : 19} />
                  Open TrustSlip
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    if (verifyPath) {
                      openTrustRoute(verifyPath);
                      return;
                    }
                    setNotice({
                      tone: "error",
                      text: "TrustSlip verify is not ready because no current public code is visible. Open TrustSlip first and refresh or generate the current TrustSlip.",
                    });
                    openTrustRoute(routes.trustSlip);
                  }}
                  fullWidth
                  stableHeight={isCompact ? 48 : 58}
                  debugId="trust-score.verify"
                  style={{
                    borderRadius: 11,
                    fontSize: isCompact ? 12 : 14,
                    fontWeight: 950,
                    paddingInline: 10,
                  }}
                >
                  <TrustPaperIcon name="search" size={isCompact ? 17 : 19} />
                  {verifyPath ? "Open TrustSlip verify" : "Prepare TrustSlip verify"}
                </SecondaryButton>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                <DangerButton
                  onClick={scrollToPressureNotes}
                  fullWidth
                  stableHeight={40}
                  debugId="trust-score.review-care"
                  style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
                >
                  Review pressure notes
                </DangerButton>
                <SubtleButton
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      typeof window.print === "function"
                    ) {
                      window.print();
                    }
                  }}
                  fullWidth
                  stableHeight={40}
                  debugId="trust-score.export"
                  style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
                >
                  Export / print
                </SubtleButton>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={statusPillStyle(trustSlipStatus)}>
                  TrustSlip: {trustSlipStatus || "Pending"}
                </span>
                <span style={statusPillStyle(trustSlipCode ? "Ready" : "Limited")}>
                  Code: {trustSlipCode || "Not stated"}
                </span>
                <span style={statusPillStyle("Limited")}>Expires: {expiresText}</span>
              </div>
            </div>
          </section>

          <section
            style={{
              ...innerCard("#F8FBFF"),
              border: "1px solid rgba(11,99,209,0.14)",
              display:
                activeTrustPassportLane === "finance" ? "block" : "none",
              marginTop: 14,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <TrustPaperWatermark
              name="wallet"
              color="#0B63D1"
              size={isCompact ? 168 : 224}
              opacity={0.045}
              style={{ right: isCompact ? -74 : -42, top: -52, bottom: "auto" }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#0B63D1",
                fontSize: 14,
                fontWeight: 1000,
                letterSpacing: 1.6,
                textTransform: "uppercase",
              }}
            >
              <TrustPaperIcon name="wallet" size={20} />
              Finance Discipline
            </div>
            <div
              style={{
                color: "#07172C",
                fontSize: isCompact ? 22 : 28,
                lineHeight: 1.08,
                fontWeight: 1000,
                marginTop: 8,
              }}
            >
              What money discipline says about trust
            </div>
            <p
              style={{
                ...helperText(),
                maxWidth: 720,
                margin: "8px 0 0",
              }}
            >
              This lane explains the trust-facing money signals. It does not
              move money, create a bank guarantee, or start auto-debit. Finance
              remains the place for the fuller money story.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(5, minmax(0, 1fr))",
                gap: 10,
                marginTop: 14,
              }}
            >
              {financeDisciplineCards.map(([label, value, detail, icon]) => (
                <div
                  key={label}
                  style={{
                    ...innerCard("#FFFFFF"),
                    border:
                      label === "Risk level"
                        ? "1px solid rgba(200,58,58,0.16)"
                        : "1px solid rgba(216,227,238,0.9)",
                    minHeight: isCompact ? 0 : 154,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      color: label === "Risk level" ? "#991B1B" : "#0B63D1",
                      fontWeight: 1000,
                    }}
                  >
                    <TrustPaperIcon name={icon} size={18} />
                    {label}
                  </div>
                  <div
                    style={{
                      color: label === "Risk level" ? "#991B1B" : "#07172C",
                      fontSize: isCompact ? 20 : 22,
                      lineHeight: 1.1,
                      fontWeight: 1000,
                      marginTop: 8,
                      overflowWrap: "break-word",
                    }}
                  >
                    {value}
                  </div>
                  <p style={{ ...helperText(), margin: "8px 0 0", lineHeight: 1.45 }}>
                    {detail}
                  </p>
                </div>
              ))}
            </div>

            <div
              style={{
                ...innerCard("#FFFFFF"),
                border: "1px solid rgba(216,227,238,0.9)",
                marginTop: 12,
              }}
            >
              <div style={{ color: "#07172C", fontWeight: 1000 }}>
                Plain rule
              </div>
              <p style={{ ...helperText(), margin: "8px 0 0" }}>
                GSN is showing whether the record looks disciplined enough for
                trust decisions. It is not promising repayment, collecting
                money, or replacing the Finance page.
              </p>
            </div>
          </section>

          <section
            style={{
              ...innerCard("#FFFFFF"),
              border: "1px solid rgba(216,227,238,0.9)",
              display:
                activeTrustPassportLane === "evidence" ||
                activeTrustPassportLane === "finance"
                  ? "block"
                  : "none",
              marginTop: 14,
            }}
          >
            <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 20 }}>
              8. Evidence & institutional context
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
                gap: 0,
                marginTop: 10,
                border: "1px solid rgba(216,227,238,0.9)",
                borderRadius: 14,
                overflow: "hidden",
              }}
            >
              {institutionalRows.map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: isCompact ? 4 : 10,
                    padding: "10px 12px",
                    borderBottom: "1px solid rgba(216,227,238,0.72)",
                    borderRight: isCompact ? "none" : "1px solid rgba(216,227,238,0.72)",
                    alignItems: isCompact ? "start" : "center",
                  }}
                >
                  <span style={{ color: "#526579", fontWeight: 850 }}>{label}</span>
                  <b
                    style={{
                      color: label === "Risk level" ? "#991B1B" : "#07172C",
                      textAlign: isCompact ? "left" : "right",
                      overflowWrap: "break-word",
                      wordBreak: "normal",
                    }}
                  >
                    {value}
                  </b>
                </div>
              ))}
            </div>
            <p style={{ ...helperText(), margin: "10px 0 0" }}>
              Human-first trust reading: identity first, explanation second,
              evidence third, technical detail last.
            </p>
            <TrustPaperSecurityFooter text="Human-first trust reading: identity first, explanation second, evidence third, technical detail last." />
          </section>
        </section>
      </div>
    </main>
  );
}
