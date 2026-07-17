import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import EvidenceMeter, {
  evidenceMeterStyle,
  stopInertMeterTap,
} from "../components/EvidenceMeter";
import PageTopNav from "../components/PageTopNav";
import GSNBrandMark from "../components/GSNBrandMark";
import {
  DangerButton,
  PrimaryButton,
  SecondaryButton,
  SubtleButton,
} from "../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../components/GsnLegacyIcon";
import {
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import {
  TrustDocumentBoundaryPanel,
  TrustDocumentConfidenceRibbon,
  TrustDocumentFingerprint,
  TrustDocumentSecurityPanel,
  type TrustDocumentPanelItem,
  type TrustDocumentRibbonItem,
} from "../components/TrustDocumentLanguage";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
} from "../lib/institutionalSurface";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { resolveSharedProfileImage } from "../lib/profileImage";
import { publicCommunityMemberCredentialPath } from "../lib/publicLinks";
import {
  buildTrustPassportShareText,
  buildTrustPassportSnapshot,
} from "../lib/trustDocumentSnapshots";
import {
  getContextualEvidencePosture,
  TRUST_BAND_SHORT_LABELS,
} from "../lib/trustBandLanguage";
import { buildTrustPassportViewModel } from "../lib/trustPassportViewModel";
import {
  buildIdentityEvidenceCompletion,
  identityEvidenceStagePhrase,
  identityEvidenceStageShort,
  identityEvidenceStageWord,
} from "../lib/identityEvidenceCompletion";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";

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
  postureSource: string;
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
  phone_recorded?: boolean | null;
  phone_verified?: boolean | null;
  photo_recorded?: boolean | null;
  bank_details_recorded?: boolean | null;
  bank_verified?: boolean | null;
  bank_evidence_status?: string | null;
  bank_verification_label?: string | null;
  passport_recorded?: boolean | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  official_id_recorded?: boolean | null;
  official_id_verified?: boolean | null;
  official_id_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
  identity_evidence_summary?: Record<string, any> | null;
  community_role_counts?: Record<string, number> | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
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
  phone_recorded?: boolean | null;
  phone_verified?: boolean | null;
  photo_recorded?: boolean | null;
  bank_details_recorded?: boolean | null;
  bank_verified?: boolean | null;
  bank_evidence_status?: string | null;
  bank_verification_label?: string | null;
  passport_recorded?: boolean | null;
  passport_verified?: boolean | null;
  passport_verification_label?: string | null;
  official_id_recorded?: boolean | null;
  official_id_verified?: boolean | null;
  official_id_label?: string | null;
  community_identity_confirmed?: boolean | null;
  community_identity_label?: string | null;
  identity_verified?: boolean | null;
  identity_status_label?: string | null;
  identity_context?: Record<string, any> | null;
  community_context?: Record<string, any> | null;
  community_footprint?: Array<Record<string, any>> | null;
  community_role_counts?: Record<string, number> | null;
  identity_evidence_summary?: Record<string, any> | null;
  community_global_id?: string | null;
  community_code?: string | null;
  holder_role?: string | null;
  community_member_count?: string | number | null;
  active_member_count?: string | number | null;
  total_member_count?: string | number | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status_label?: string | null;
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
  reason?: string | null;
  detail?: string | null;
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
  role?: string | null;
};

type TrustScoreLoadResult = {
  me: any | null;
  clan: any | null;
  clans: ClanListItem[];
  guidance: GuidanceSnapshot | null;
  explainability: TrustExplainability | null;
  recompute: TrustRecompute | null;
  trustSlipSummary: TrustSlipSummary | null;
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

function firstStringList(...values: any[]): string[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const items = value.map((item) => safeStr(item)).filter(Boolean);
    if (items.length) return items;
  }
  return [];
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

function trustPassportReferenceFingerprint(...values: unknown[]): string {
  const input = values.map((value) => safeStr(value)).join("|") || "gsn-trust-passport";
  let hashA = 0x811c9dc5;
  let hashB = 0x45d9f3b;
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    hashA ^= code;
    hashA = Math.imul(hashA, 0x01000193);
    hashB ^= code + index;
    hashB = Math.imul(hashB, 0x27d4eb2d);
  }
  const left = (hashA >>> 0).toString(16).padStart(8, "0");
  const right = (hashB >>> 0).toString(16).padStart(8, "0");
  return `GSN-TP-${left}-${right}`.toUpperCase();
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

const FETCH_FIRST_JSON_TIMEOUT_MS = 30000;

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

function cacheBust(path: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}_ts=${Date.now()}`;
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

          const controller = new AbortController();
          const timer = globalThis.setTimeout(
            () => controller.abort(),
            FETCH_FIRST_JSON_TIMEOUT_MS
          );

          let res: Response;
          try {
            res = await fetch(url, {
              method,
              headers,
              credentials: "include",
              cache: "no-store",
              body: method === "POST" ? "{}" : undefined,
              signal: controller.signal,
            });
          } finally {
            globalThis.clearTimeout(timer);
          }

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
    phone_recorded: src?.phone_recorded ?? src?.merchant_summary?.phone_recorded ?? null,
    phone_verified: src?.phone_verified ?? src?.merchant_summary?.phone_verified ?? null,
    bank_details_recorded:
      src?.bank_details_recorded ?? src?.merchant_summary?.bank_details_recorded ?? null,
    bank_verified: src?.bank_verified ?? src?.merchant_summary?.bank_verified ?? null,
    bank_evidence_status: firstTruthy(
      src?.bank_evidence_status,
      src?.merchant_summary?.bank_evidence_status
    ),
    bank_verification_label: firstTruthy(
      src?.bank_verification_label,
      src?.merchant_summary?.bank_verification_label
    ),
    passport_recorded:
      src?.passport_recorded ?? src?.merchant_summary?.passport_recorded ?? null,
    passport_verified: src?.passport_verified ?? src?.merchant_summary?.passport_verified ?? null,
    passport_verification_label: firstTruthy(src?.passport_verification_label),
    official_id_recorded:
      src?.official_id_recorded ?? src?.merchant_summary?.official_id_recorded ?? null,
    official_id_verified:
      src?.official_id_verified ?? src?.merchant_summary?.official_id_verified ?? null,
    official_id_label: firstTruthy(src?.official_id_label, src?.merchant_summary?.official_id_label),
    identity_verified: src?.identity_verified ?? null,
    identity_status_label: firstTruthy(src?.identity_status_label),
    identity_context: src?.identity_context || null,
    community_context: src?.community_context || null,
    community_footprint: Array.isArray(src?.community_footprint)
      ? src.community_footprint
      : Array.isArray(src?.merchant_summary?.community_footprint)
        ? src.merchant_summary.community_footprint
        : [],
    community_role_counts:
      src?.community_role_counts || src?.merchant_summary?.community_role_counts || null,
    identity_evidence_summary:
      src?.identity_evidence_summary ||
      src?.identity_context?.identity_evidence_summary ||
      src?.merchant_summary?.identity_evidence_summary ||
      null,
    community_global_id: firstTruthy(src?.community_global_id),
    community_code: firstTruthy(src?.community_code),
    holder_role: firstTruthy(src?.holder_role),
    community_member_count: src?.community_member_count ?? null,
    active_member_count: src?.active_member_count ?? null,
    total_member_count: src?.total_member_count ?? null,
    community_activity_count:
      src?.community_activity_count ??
      src?.merchant_summary?.community_activity_count ??
      src?.community_context?.community_activity_count ??
      null,
    community_activity_latest_at: firstTruthy(
      src?.community_activity_latest_at,
      src?.merchant_summary?.community_activity_latest_at,
      src?.community_context?.community_activity_latest_at
    ),
    community_activity_categories: firstStringList(
      src?.community_activity_categories,
      src?.merchant_summary?.community_activity_categories,
      src?.community_context?.community_activity_categories
    ),
    community_activity_label: firstTruthy(
      src?.community_activity_label,
      src?.merchant_summary?.community_activity_label,
      src?.community_context?.community_activity_label
    ),
    membership_currentness_label: firstTruthy(
      src?.membership_currentness_label,
      src?.merchant_summary?.membership_currentness_label,
      src?.community_context?.membership_currentness_label
    ),
    membership_currentness_scope: firstTruthy(
      src?.membership_currentness_scope,
      src?.merchant_summary?.membership_currentness_scope,
      src?.community_context?.membership_currentness_scope
    ),
    next_witness_renewal_at: firstTruthy(
      src?.next_witness_renewal_at,
      src?.merchant_summary?.next_witness_renewal_at,
      src?.community_context?.next_witness_renewal_at
    ),
    next_witness_renewal_status_label: firstTruthy(
      src?.next_witness_renewal_status_label,
      src?.merchant_summary?.next_witness_renewal_status_label,
      src?.community_context?.next_witness_renewal_status_label
    ),
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
    reason: firstTruthy(src?.reason),
    detail: firstTruthy(src?.detail),
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
  return evidenceMeterStyle(status);
}

function titleCaseWords(value: string): string {
  return safeStr(value)
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => `${part.slice(0, 1).toUpperCase()}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function roleLabel(value: string): string {
  const role = safeStr(value).toLowerCase();
  if (role === "user" || role === "member") return "Member";
  if (role === "admin" || role === "owner") return "Admin";
  return titleCaseWords(role || "member");
}

function overviewIconBox(isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 36 : 46,
    height: isCompact ? 36 : 46,
    borderRadius: isCompact ? 12 : 15,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FF 100%)",
    color: "#0B63D1",
    border: "1px solid rgba(11,99,209,0.14)",
    boxShadow:
      "0 10px 22px rgba(3,30,66,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
    flex: "0 0 auto",
  };
}

function OfficialGsnWatermark({
  isCompact,
  opacity = 0.05,
  style,
}: {
  isCompact: boolean;
  opacity?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        right: isCompact ? -54 : -28,
        top: isCompact ? -42 : -56,
        opacity,
        pointerEvents: "none",
        transform: "rotate(-7deg)",
        zIndex: 0,
        ...style,
      }}
    >
      <GSNBrandMark width={isCompact ? 148 : 210} height={isCompact ? 186 : 264} />
    </div>
  );
}

function trustIconBadge(
  name: GsnIconName,
  size = 30,
  tone: "navy" | "blue" | "green" | "amber" | "red" = "navy"
): React.ReactElement {
  const palette = {
    navy: {
      color: "#0B4EA2",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(12,41,71,0.08)",
    },
    blue: {
      color: "#0B63D1",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(11,99,209,0.14)",
    },
    green: {
      color: "#168254",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(22,130,84,0.14)",
    },
    amber: {
      color: "#92400E",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(146,64,14,0.16)",
    },
    red: {
      color: "#991B1B",
      background:
        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.88) 100%)",
      border: "1px solid rgba(153,27,27,0.16)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 34 ? 13 : 11,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 9px 18px rgba(2,6,23,0.10), inset 0 1px 0 rgba(255,255,255,0.86)",
        ...palette,
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={Math.max(26, Math.round(size * 0.96))}
        decorative
      />
    </span>
  );
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

function trustScoreFixedActionStyle(height = 52): React.CSSProperties {
  return {
    height,
    minHeight: height,
    maxHeight: height,
    minWidth: 0,
    width: "100%",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    lineHeight: 1.05,
    flexShrink: 0,
    transition: "none",
  };
}

function evidenceDialStyle(degrees: number, isCompact = false): React.CSSProperties {
  const clamped = Math.max(0, Math.min(360, Number(degrees) || 0));
  const size = isCompact ? 42 : 52;
  return {
    width: size,
    height: size,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: `conic-gradient(#F2C766 0deg ${clamped}deg, rgba(216,227,238,0.78) ${clamped}deg 360deg)`,
    border: "1px solid rgba(216,170,69,0.34)",
    boxShadow: "0 14px 28px rgba(3,30,66,0.10), inset 0 1px 0 rgba(255,255,255,0.75)",
    position: "relative",
    flex: "0 0 auto",
  };
}

function evidenceDialInnerStyle(isCompact = false): React.CSSProperties {
  return {
    width: isCompact ? 30 : 38,
    height: isCompact ? 30 : 38,
    borderRadius: 999,
    display: "grid",
    placeItems: "center",
    background: "#FFFFFF",
    color: "#07172C",
    fontSize: isCompact ? 11 : 13,
    fontWeight: 1000,
    lineHeight: 1,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.92)",
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
    return `/t/${encodeURIComponent(cleanCode)}`;
  }

  const rawFallback = safeStr(fallback);
  if (!rawFallback) return "";

  try {
    const url = new URL(rawFallback, "https://gsn.local");
    const oldVerifyMatch = url.pathname.match(/^\/trust-slips\/verify\/([^/]+)/);
    if (oldVerifyMatch?.[1]) {
      return `/t/${encodeURIComponent(decodeURIComponent(oldVerifyMatch[1]))}${url.search}${url.hash}`;
    }
    if (url.pathname.startsWith("/t/")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
    if (url.pathname.startsWith("/trust-slips/verify")) {
      return `${url.pathname}${url.search}${url.hash}`;
    }
  } catch {
    // Use the raw fallback below.
  }

  const oldRawMatch = rawFallback.match(/^\/trust-slips\/verify\/([^/?#]+)/);
  if (oldRawMatch?.[1]) {
    return `/t/${encodeURIComponent(decodeURIComponent(oldRawMatch[1]))}`;
  }

  return rawFallback.startsWith("/t/") ? rawFallback : "";
}

function trustSlipVerifyAppPath(code: string, fallback: string): string {
  const cleanFallback = safeStr(fallback) || "/app/trust-slip/verify";
  const cleanCode = safeStr(code);
  if (!cleanCode) return cleanFallback;

  const separator = cleanFallback.includes("?") ? "&" : "?";
  return `${cleanFallback}${separator}code=${encodeURIComponent(cleanCode)}`;
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
        postureSource:
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
        postureSource:
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
        postureSource:
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
      postureSource:
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
        postureSource: String(Math.round(scoreNum)),
        tone: "green",
        statusText: "Healthy across visible communities",
        whyText: String(rawWhy || "Your trust position is looking strong."),
      };
    }

    if (scoreNum >= 55) {
      return {
        classText: "B",
        postureSource: String(Math.round(scoreNum)),
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
        postureSource: String(Math.round(scoreNum)),
        tone: "yellow",
        statusText: "Needs attention",
        whyText: String(
          rawWhy || "Some recent actions may have reduced your trust strength."
        ),
      };
    }

    return {
      classText: "D",
      postureSource: String(Math.round(scoreNum)),
      tone: "red",
      statusText: "At risk",
      whyText: String(rawWhy || "Your trust position needs urgent improvement."),
    };
  }

  return {
    classText: "Not shown yet",
    postureSource: "-",
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
        postureSource:
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
        postureSource:
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
        postureSource:
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
      postureSource:
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
        postureSource: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Strong in your current community",
        whyText: rawWhy || "Your current community reading is strong.",
      };
    }

    if (rawScore >= 55) {
      return {
        classText: "B",
        postureSource: String(Math.round(rawScore)),
        tone: "green",
        statusText: "Stable in your current community",
        whyText:
          rawWhy || "Your current community reading looks steady right now.",
      };
    }

    if (rawScore >= 35) {
      return {
        classText: "C",
        postureSource: String(Math.round(rawScore)),
        tone: "yellow",
        statusText: "Needs attention in your current community",
        whyText:
          rawWhy ||
          "Your current community reading suggests some areas need attention.",
      };
    }

    return {
      classText: "D",
      postureSource: String(Math.round(rawScore)),
      tone: "red",
      statusText: "At risk in your current community",
      whyText:
        rawWhy ||
        "Your current community reading shows pressure that needs attention.",
    };
  }

  if (!hasSelectedCommunity) {
    return {
      classText: "Not shown yet",
      postureSource: "-",
      tone: "neutral",
      statusText: "Select a community to view local community trust",
      whyText:
        "Local community trust belongs to the community you are using now, not the wider cross-community consistency reading.",
    };
  }

  return {
    classText: "Not shown yet",
    postureSource: "-",
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
  const trustScoreContextKey = String(selectedClanId || 0);
  const trustScoreContextRef = useRef(trustScoreContextKey);
  const trustScoreLoadSeqRef = useRef(0);
  trustScoreContextRef.current = trustScoreContextKey;
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-score.route.dashboard"),
      notifications: routeTarget("notifications", selectedClanId, "trust-score.route.notifications"),
      identity: routeTarget("cci", selectedClanId, "trust-score.route.identity"),
      openTrust: routeTarget("openTrust", selectedClanId, "trust-score.route.open-trust"),
      cciReading: routeTarget("cciReading", selectedClanId, "trust-score.route.cci-reading"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust-score.route.trust-slip"),
      trustSlipVerify: routeTarget(
        "merchantVerify",
        selectedClanId,
        "trust-score.route.trust-slip-verify"
      ),
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
  const [identityEvidenceOpen, setIdentityEvidenceOpen] = useState(false);
  const [verdictNoteOpen, setVerdictNoteOpen] = useState(false);

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

  const clearTrustScoreState = useCallback(() => {
    setMe(null);
    setCurrentClan(null);
    setClansList([]);
    setGuidance(null);
    setExplainability(null);
    setRecompute(null);
    setTrustSlipSummary(null);
  }, []);

  const applyTrustScoreLoadResult = useCallback((data: TrustScoreLoadResult) => {
    setMe(data.me);
    setCurrentClan(data.clan);
    setClansList(data.clans);
    setGuidance(data.guidance);
    setExplainability(data.explainability);
    setRecompute(data.recompute);
    setTrustSlipSummary(data.trustSlipSummary);
  }, []);

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

  const fetchTrustScoreLoadResult = useCallback(async (): Promise<TrustScoreLoadResult> => {
    const clanHeaders: Record<string, string> = {};
    if (selectedClanId) {
      clanHeaders["X-Clan-Id"] = String(selectedClanId);
    }

    const fetchTrustSlipSummaryNetworkFirst = () =>
      fetchFirstJson(
        [
          cacheBust("/trust-slips/me/summary"),
          cacheBust("/trust-slips/me"),
          cacheBust("/trust-slips/me-summary"),
          cacheBust("/trust-slips/summary/me"),
        ],
        ["GET"],
        clanHeaders
      );

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
        const direct = await fetchTrustSlipSummaryNetworkFirst();
        if (direct) return direct;

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

        return fetchTrustSlipSummaryNetworkFirst();
      })(),
    ]);

    return {
      me: meRes || null,
      clan: clanRes || null,
      clans: rowsOf<ClanListItem>(clansRes),
      guidance: guidanceRes || null,
      explainability: normalizeExplainability(explainRes),
      recompute: normalizeRecompute(recomputeRes),
      trustSlipSummary: normalizeTrustSlipSummary(trustSlipRes),
    };
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;
    const loadSeq = trustScoreLoadSeqRef.current + 1;
    trustScoreLoadSeqRef.current = loadSeq;
    const contextKey = trustScoreContextKey;

    (async () => {
      setLoading(true);
      setRefreshing(false);
      clearTrustScoreState();

      try {
        const data = await fetchTrustScoreLoadResult();
        if (
          !alive ||
          loadSeq !== trustScoreLoadSeqRef.current ||
          contextKey !== trustScoreContextRef.current
        ) {
          return;
        }
        applyTrustScoreLoadResult(data);
      } finally {
        if (
          alive &&
          loadSeq === trustScoreLoadSeqRef.current &&
          contextKey === trustScoreContextRef.current
        ) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [
    applyTrustScoreLoadResult,
    clearTrustScoreState,
    fetchTrustScoreLoadResult,
    trustScoreContextKey,
  ]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    let refreshTimer: number | null = null;
    const scheduleFreshIdentityRead = () => {
      if (document.visibilityState === "hidden") return;
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      const loadSeq = trustScoreLoadSeqRef.current + 1;
      trustScoreLoadSeqRef.current = loadSeq;
      const contextKey = trustScoreContextRef.current;
      refreshTimer = window.setTimeout(() => {
        void (async () => {
          try {
            const data = await fetchTrustScoreLoadResult();
            if (
              loadSeq !== trustScoreLoadSeqRef.current ||
              contextKey !== trustScoreContextRef.current
            ) {
              return;
            }
            applyTrustScoreLoadResult(data);
          } catch {
            // Keep the last usable reading visible if a background refresh fails.
          } finally {
            if (
              loadSeq === trustScoreLoadSeqRef.current &&
              contextKey === trustScoreContextRef.current
            ) {
              setLoading(false);
              setRefreshing(false);
            }
          }
        })();
      }, 80);
    };

    window.addEventListener("pageshow", scheduleFreshIdentityRead);
    window.addEventListener("focus", scheduleFreshIdentityRead);
    document.addEventListener("visibilitychange", scheduleFreshIdentityRead);

    return () => {
      if (refreshTimer !== null) window.clearTimeout(refreshTimer);
      window.removeEventListener("pageshow", scheduleFreshIdentityRead);
      window.removeEventListener("focus", scheduleFreshIdentityRead);
      document.removeEventListener("visibilitychange", scheduleFreshIdentityRead);
    };
  }, [applyTrustScoreLoadResult, fetchTrustScoreLoadResult]);

  async function handleRefreshTrust() {
    const loadSeq = trustScoreLoadSeqRef.current + 1;
    trustScoreLoadSeqRef.current = loadSeq;
    const contextKey = trustScoreContextRef.current;

    setRefreshing(true);

    try {
      const data = await fetchTrustScoreLoadResult();
      if (
        loadSeq !== trustScoreLoadSeqRef.current ||
        contextKey !== trustScoreContextRef.current
      ) {
        return;
      }
      applyTrustScoreLoadResult(data);
      setNotice({
        tone: "success",
        text: "Trust reading refreshed.",
      });
    } catch {
      if (
        loadSeq === trustScoreLoadSeqRef.current &&
        contextKey === trustScoreContextRef.current
      ) {
        setNotice({
          tone: "error",
          text: "Trust reading could not be refreshed right now.",
        });
      }
    } finally {
      if (loadSeq === trustScoreLoadSeqRef.current) {
        setRefreshing(false);
      }
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

  const gmfnIdValue = useMemo(() => {
    return firstTruthy(trustSlipSummary?.gmfn_id, me?.gmfn_id);
  }, [trustSlipSummary, me]);
  const gmfnId = gmfnIdValue || "Not issued yet";

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
  const communityCodeValue = useMemo(() => {
    return firstTruthy(
      trustSlipSummary?.community_code,
      trustSlipSummary?.community_global_id,
      communityContext?.community_code,
      communityContext?.community_global_id,
      matchedClan?.community_code,
      currentClan?.community_code
    );
  }, [trustSlipSummary, communityContext, matchedClan, currentClan]);
  const communityCode = communityCodeValue || "No community ID yet";
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
  const memberCredentialPath = publicCommunityMemberCredentialPath({
    communityKey: communityVerifyKey,
    memberKey: gmfnIdValue,
  });
  const memberCredentialUrl = useMemo(
    () => frontendAbsoluteUrl(memberCredentialPath),
    [memberCredentialPath]
  );
  const memberWitnessPolicyPath = selectedClanId
    ? `${APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY}?community_id=${encodeURIComponent(
        String(selectedClanId)
      )}#member-witness`
    : "";
  const communityFootprint = useMemo(() => {
    const byKey = new Map<string, {
      id: string;
      name: string;
      code: string;
      role: string;
    }>();

    function addCommunity(raw: any) {
      const id = safeStr(raw?.clan_id || raw?.id || raw?.community_id);
      const code = firstTruthy(
        raw?.community_code,
        raw?.community_global_id,
        raw?.code,
        id ? `GSN-COM-${String(id).padStart(4, "0")}` : ""
      );
      const name = firstTruthy(
        raw?.community_name,
        raw?.marketplace_name,
        raw?.name,
        raw?.display_name,
        id ? `Community ${id}` : ""
      );
      if (!name && !code) return;
      const key = code || id || name;
      byKey.set(key, {
        id,
        name: name || "Community",
        code: code || "No community ID yet",
        role: firstTruthy(raw?.role, raw?.holder_role, "member"),
      });
    }

    (trustSlipSummary?.community_footprint || []).forEach(addCommunity);
    clansList.forEach(addCommunity);

    if (byKey.size <= 0 && (communityName || communityCodeValue || selectedClanId)) {
      addCommunity({
        clan_id: selectedClanId,
        community_name: communityName,
        community_code: communityCodeValue,
        role: firstTruthy(
          trustSlipSummary?.holder_role,
          communityContext?.holder_role,
          "member"
        ),
      });
    }

    return Array.from(byKey.values());
  }, [
    clansList,
    communityCodeValue,
    communityName,
    communityContext?.holder_role,
    selectedClanId,
    trustSlipSummary?.holder_role,
    trustSlipSummary?.community_footprint,
  ]);
  const communityRoleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    const rawCounts =
      trustSlipSummary?.community_role_counts ||
      trustSlipSummary?.merchant_summary?.community_role_counts ||
      null;

    if (rawCounts && typeof rawCounts === "object") {
      Object.entries(rawCounts).forEach(([key, value]) => {
        const label = roleLabel(key);
        counts.set(label, (counts.get(label) || 0) + Number(value || 0));
      });
    }

    if (counts.size <= 0) {
      communityFootprint.forEach((item) => {
        const label = roleLabel(item.role);
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    }

    return Array.from(counts.entries())
      .filter(([, count]) => count > 0)
      .map(([label, count]) => `${label} ${count}`)
      .join(" / ");
  }, [
    communityFootprint,
    trustSlipSummary?.community_role_counts,
    trustSlipSummary?.merchant_summary?.community_role_counts,
  ]);
  const communityActivityCount = firstTruthy(
    trustSlipSummary?.community_activity_count,
    trustSlipSummary?.merchant_summary?.community_activity_count,
    communityContext?.community_activity_count,
    "0"
  );
  const communityActivityLatestAt = firstTruthy(
    trustSlipSummary?.community_activity_latest_at,
    trustSlipSummary?.merchant_summary?.community_activity_latest_at,
    communityContext?.community_activity_latest_at
  );
  const communityActivityCategories = firstStringList(
    trustSlipSummary?.community_activity_categories,
    trustSlipSummary?.merchant_summary?.community_activity_categories,
    communityContext?.community_activity_categories
  );
  const communityActivityLabel = firstTruthy(
    trustSlipSummary?.community_activity_label,
    trustSlipSummary?.merchant_summary?.community_activity_label,
    communityContext?.community_activity_label,
    Number(communityActivityCount || 0) > 0
      ? "Community activity recorded"
      : "No community activity recorded yet"
  );
  const communityActivityCardValue = `${communityActivityLabel} (${communityActivityCount} event${
    communityActivityCount === "1" ? "" : "s"
  })`;
  const communityActivityCardDetail = [
    communityActivityCategories.length
      ? `Broad categories: ${communityActivityCategories.join(", ")}.`
      : "Broad categories are not shown yet.",
    communityActivityLatestAt
      ? `Latest activity: ${safeDateTime(communityActivityLatestAt) || communityActivityLatestAt}.`
      : "Latest activity date is not shown yet.",
  ].join(" ");
  const membershipCurrentnessLabel = firstTruthy(
    trustSlipSummary?.membership_currentness_label,
    trustSlipSummary?.merchant_summary?.membership_currentness_label,
    communityContext?.membership_currentness_label,
    "Witness renewal not started"
  );
  const membershipCurrentnessScope = firstTruthy(
    trustSlipSummary?.membership_currentness_scope,
    trustSlipSummary?.merchant_summary?.membership_currentness_scope,
    communityContext?.membership_currentness_scope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const nextWitnessRenewalAt = firstTruthy(
    trustSlipSummary?.next_witness_renewal_at,
    trustSlipSummary?.merchant_summary?.next_witness_renewal_at,
    communityContext?.next_witness_renewal_at
  );
  const nextWitnessRenewalStatusLabel = firstTruthy(
    trustSlipSummary?.next_witness_renewal_status_label,
    trustSlipSummary?.merchant_summary?.next_witness_renewal_status_label,
    communityContext?.next_witness_renewal_status_label,
    "Not Started"
  );
  const membershipCurrentnessReady =
    membershipCurrentnessLabel.toLowerCase().includes("current");

  const currentBand = useMemo(() => {
    return firstTruthy(
      recompute?.breakdown?.computed_band,
      recompute?.band,
      explainability?.band,
      trustSlipSummary?.band,
      trustSlipSummary?.level,
      "Evidence building"
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
      bg: "#FFF7E6",
      border: "1px solid rgba(245,158,11,0.20)",
      text: "#92400E",
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

  const trustSlipCode = useMemo(
    () =>
      firstTruthy(
        trustSlipSummary?.code,
        trustSlipSummary?.verification_code,
        trustSlipSummary?.token
      ),
    [trustSlipSummary]
  );
  const verifyPath = useMemo(() => {
    return trustSlipVerifyFrontendPath(trustSlipCode, trustSlipSummary?.public_verify_url || "");
  }, [trustSlipSummary, trustSlipCode]);
  const verifyAppPath = useMemo(
    () => trustSlipVerifyAppPath(trustSlipCode, routes.trustSlipVerify),
    [routes.trustSlipVerify, trustSlipCode]
  );
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
  const trustSlipIssueReason = safeStr(trustSlipSummary?.reason).toLowerCase();
  const trustSlipBlockedByPhone =
    !trustSlipCode &&
    (trustSlipIssueReason === "phone_unverified" ||
      /verify your phone/i.test(safeStr(trustSlipSummary?.detail)));
  const trustSlipBlockDetail = firstTruthy(
    trustSlipSummary?.detail,
    "Verify your phone number to activate TrustSlip portability."
  );
  const trustSlipStatus = firstTruthy(
    trustSlipBlockedByPhone ? "Phone check needed" : trustSlipSummary?.status,
    trustSlipSummary?.active || trustSlipSummary?.verified || trustSlipCode
      ? "Ready"
      : "Not issued yet"
  );
  const expiresText = safeDateTime(trustSlipSummary?.expires_at) || "Not stated";
  const eventCount = safeStr(recompute?.event_count ?? "0");
  const visibleActiveClanCount =
    Number(trustSlipSummary?.active_clan_count || 0) ||
    Number(communityContext?.active_community_count || 0) ||
    communityFootprint.length ||
    clansList.length ||
    (selectedClanId ? 1 : 0);
  const activeClanCount = safeStr(visibleActiveClanCount || "0");
  const counterpartiesCount = safeStr(
    trustSlipSummary?.unique_counterparties ?? "0"
  );
  const riskLevel = firstTruthy(capacityContext?.risk_level, "Unknown");
  const phoneRecorded = Boolean(
    trustSlipSummary?.phone_recorded ||
      identityContext?.phone_recorded ||
      trustSlipSummary?.phone_verified ||
      identityContext?.phone_verified ||
      me?.phone_e164 ||
      me?.phone
  );
  const phoneVerified = Boolean(
    trustSlipSummary?.phone_verified ||
      identityContext?.phone_verified ||
      me?.phone_verified ||
      me?.phone_verified_at ||
      me?.phone_e164_verified ||
      me?.verified_phone_at
  );
  const bankRecorded = Boolean(
    trustSlipSummary?.bank_details_recorded ||
      identityContext?.bank_details_recorded ||
      trustSlipSummary?.bank_verified ||
      identityContext?.bank_verified ||
      me?.bank_verified ||
      me?.bank_verified_at ||
      me?.bank_details_recorded ||
      me?.payout_destination_id ||
      me?.withdrawal_destination_id
  );
  const bankVerified = Boolean(
    trustSlipSummary?.bank_verified ||
      identityContext?.bank_verified ||
      me?.bank_verified ||
      me?.bank_verified_at
  );
  const officialIdRecorded = Boolean(
    trustSlipSummary?.official_id_recorded ||
      identityContext?.official_id_recorded ||
      trustSlipSummary?.passport_recorded ||
      identityContext?.passport_recorded ||
      me?.official_id_recorded ||
      me?.identity_document_recorded ||
      me?.passport_verified ||
      me?.passport_verified_at
  );
  const officialIdVerified = Boolean(
    trustSlipSummary?.official_id_verified ||
      identityContext?.official_id_verified ||
      trustSlipSummary?.passport_verified ||
      identityContext?.passport_verified ||
      me?.passport_verified ||
      me?.passport_verified_at ||
      me?.official_id_verified_at
  );
  const photoEvidenceRecorded = Boolean(
    trustSlipSummary?.photo_recorded ||
      identityContext?.photo_recorded ||
      identityContext?.photo_evidence_recorded ||
      trustSlipSummary?.merchant_summary?.photo_recorded ||
      me?.photo_recorded
  );
  const identityEvidence = useMemo(() => {
    const backendSummary =
      trustSlipSummary?.identity_evidence_summary ||
      identityContext?.identity_evidence_summary ||
      trustSlipSummary?.merchant_summary?.identity_evidence_summary ||
      null;
    const local = buildIdentityEvidenceCompletion({
      detailsDone: Boolean(memberName || gmfnId),
      phoneDone: phoneRecorded,
      photoRecorded: photoEvidenceRecorded,
      bankRecorded,
      officialIdRecorded,
      countReadyAsProgress: false,
    });
    if (!backendSummary || typeof backendSummary !== "object") return local;
    return {
      ...local,
      score: Number(backendSummary.score ?? local.score),
      degrees: Number(backendSummary.degrees ?? local.degrees),
      label: safeStr(backendSummary.label || local.label),
      status: safeStr(backendSummary.status || local.status) as typeof local.status,
      next: safeStr(backendSummary.institutional_note || local.next),
    };
  }, [
    bankRecorded,
    gmfnId,
    identityContext?.identity_evidence_summary,
    memberName,
    officialIdRecorded,
    photoEvidenceRecorded,
    phoneRecorded,
    trustSlipSummary?.identity_evidence_summary,
    trustSlipSummary?.merchant_summary?.identity_evidence_summary,
  ]);
  const readingBreakdownSource: Array<[string, string]> = [
    ["Requester repayment delta", safeStr(ruleset?.borrower_repayment_delta || "-")],
    ["Support repayment delta", safeStr(ruleset?.guarantor_repayment_delta || "-")],
    ["Precision", safeStr(ruleset?.precision || "-")],
    ["Ordering", safeStr(ruleset?.ordering || "-")],
    [
      "Computed posture",
      getContextualEvidencePosture(null, recompute?.breakdown?.computed_band || recompute?.band).shortLabel,
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
    phoneRecorded,
    phoneVerified,
    bankRecorded,
    bankVerified,
    bankVerificationLabel: firstTruthy(
      trustSlipSummary?.bank_verification_label,
      trustSlipSummary?.merchant_summary?.bank_verification_label,
      identityContext?.bank_verification_label
    ),
    passportRecorded: officialIdRecorded,
    officialIdRecorded,
    passportVerified: officialIdVerified,
    passportVerificationLabel: firstTruthy(
      trustSlipSummary?.passport_verification_label,
      trustSlipSummary?.merchant_summary?.passport_verification_label,
      identityContext?.passport_verification_label,
      trustSlipSummary?.official_id_label,
      identityContext?.official_id_label
    ),
    communityIdentityConfirmed:
      Boolean(
        trustSlipSummary?.community_identity_confirmed ||
          identityContext?.community_identity_confirmed ||
          communityContext?.current_user_is_active_member ||
          (selectedClanId && (currentClan || matchedClan || clansList.length > 0))
      ),
    communityIdentityLabel: firstTruthy(
      trustSlipSummary?.community_identity_label,
      trustSlipSummary?.merchant_summary?.community_identity_label,
      identityContext?.community_identity_label
    ),
    communityActivityCount,
    communityActivityLatestAt,
    communityActivityCategories,
    communityActivityLabel,
    membershipCurrentnessLabel,
    membershipCurrentnessScope,
    nextWitnessRenewalAt: safeDateTime(nextWitnessRenewalAt) || nextWitnessRenewalAt,
    nextWitnessRenewalStatusLabel,
    identityVerified:
      trustSlipSummary?.identity_verified ?? identityContext?.identity_verified,
    identityStatusLabel: firstTruthy(
      trustSlipSummary?.identity_status_label,
      identityContext?.identity_status_label
    ),
    identityEvidenceScore: identityEvidence.score,
    identityEvidenceLabel: identityEvidence.label,
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
  const trustPassportHolderRole = roleLabel(passportVm.identity.holderRole);
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
    : `Current evidence posture means ${passportVm.verdict.bandLanguage.title.toLowerCase()}. ${passportVm.verdict.bandLanguage.implication}`;
  function openTrustRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function identityTaskTarget(task: "phone" | "official_id"): string {
    const separator = routes.identity.includes("?") ? "&" : "?";
    return `${routes.identity}${separator}task=${encodeURIComponent(task)}&mode=complete`;
  }

  function scrollToPressureNotes() {
    setNotice({
      tone: "success",
      text: "Opened the pressure notes. This is where the page explains what helps trust and what needs care.",
    });
    window.setTimeout(() => {
      if (pressureSectionRef.current) {
        revealElementWithoutJump(pressureSectionRef.current, {
          surface: "trust-passport",
          targetId: "pressure-notes",
          reason: "pressure-notes",
        });
      }
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

  const trustPassportSnapshotReady = useMemo(() => {
    const id = safeStr(gmfnId).toLowerCase();
    return Boolean(
      trustSlipCode &&
        gmfnId &&
        id !== "awaiting issue" &&
        id !== "-" &&
        id !== "pending"
    );
  }, [gmfnId, trustSlipCode]);

  const trustPassportPaper = useMemo(
    () =>
      buildTrustPassportSnapshot({
        memberName,
        gmfnId,
        communityName,
        communityCode,
        holderRole: trustPassportHolderRole,
        currentBand,
        currentPosture: passportVm.verdict.score,
        openTrustClass: openTrust.classText,
        cciClass: cci.classText,
        communityActivitySummary: communityActivityCardValue,
        communityActivityCategories: communityActivityCategories.join(", "),
        communityActivityLatest:
          safeDateTime(communityActivityLatestAt) || communityActivityLatestAt,
        membershipCurrentnessLabel,
        membershipCurrentnessScope,
        nextWitnessRenewalAt: safeDateTime(nextWitnessRenewalAt) || nextWitnessRenewalAt,
        nextWitnessRenewalStatusLabel,
        trustSlipCode,
        nextStepLabel: nextStep.ctaLabel,
        verifyUrl,
        memberCredentialUrl,
      }),
    [
      cci.classText,
      communityCode,
      communityName,
      currentBand,
      passportVm.verdict.score,
      trustPassportHolderRole,
      communityActivityCardValue,
      communityActivityCategories,
      communityActivityLatestAt,
      membershipCurrentnessLabel,
      membershipCurrentnessScope,
      nextWitnessRenewalAt,
      nextWitnessRenewalStatusLabel,
      gmfnId,
      memberCredentialUrl,
      memberName,
      nextStep.ctaLabel,
      openTrust.classText,
      trustSlipCode,
      verifyUrl,
    ]
  );

  const trustPassportShareText = useMemo(
    () =>
      buildTrustPassportShareText({
        memberName,
        gmfnId,
        communityName,
        communityCode,
        holderRole: trustPassportHolderRole,
        currentBand,
        currentPosture: passportVm.verdict.score,
        openTrustClass: openTrust.classText,
        cciClass: cci.classText,
        communityActivitySummary: communityActivityCardValue,
        communityActivityCategories: communityActivityCategories.join(", "),
        communityActivityLatest:
          safeDateTime(communityActivityLatestAt) || communityActivityLatestAt,
        membershipCurrentnessLabel,
        membershipCurrentnessScope,
        nextWitnessRenewalAt: safeDateTime(nextWitnessRenewalAt) || nextWitnessRenewalAt,
        nextWitnessRenewalStatusLabel,
        trustSlipCode,
        nextStepLabel: nextStep.ctaLabel,
        verifyUrl,
        memberCredentialUrl,
      }),
    [
      cci.classText,
      communityCode,
      communityName,
      currentBand,
      passportVm.verdict.score,
      trustPassportHolderRole,
      communityActivityCardValue,
      communityActivityCategories,
      communityActivityLatestAt,
      membershipCurrentnessLabel,
      membershipCurrentnessScope,
      nextWitnessRenewalAt,
      nextWitnessRenewalStatusLabel,
      gmfnId,
      memberCredentialUrl,
      memberName,
      nextStep.ctaLabel,
      openTrust.classText,
      trustSlipCode,
      verifyUrl,
    ]
  );

  function copyTrustSnapshot() {
    if (!trustPassportSnapshotReady) {
      setNotice({
        tone: "error",
        text: "Trust Passport snapshot is not ready yet. Issue the GSN ID and TrustSlip first.",
      });
      return;
    }
    handleCopy(
      trustPassportShareText,
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
      icon: "phone" as GsnIconName,
      label: passportVm.identity.phoneVerified
        ? "Phone verified"
        : passportVm.identity.phoneRecorded
          ? "Phone recorded"
          : "Phone not recorded",
      ok: passportVm.identity.phoneVerified,
      muted: passportVm.identity.phoneRecorded && !passportVm.identity.phoneVerified,
    },
    {
      icon: "community" as GsnIconName,
      label:
        passportVm.identity.communityIdentityConfirmed
          ? "Community recorded"
          : "Community record pending",
      ok: passportVm.identity.communityIdentityConfirmed,
    },
    {
      icon: "shield" as GsnIconName,
      label:
        passportVm.identity.identityContinuity === "clean"
          ? "Continuity clean"
          : identityEvidence.score >= 35
            ? "Evidence building"
            : "Continuity review",
      ok: passportVm.identity.identityContinuity === "clean",
      muted: passportVm.identity.identityContinuity !== "clean" && identityEvidence.score >= 35,
    },
    {
      icon: "wallet" as GsnIconName,
      label:
        passportVm.identity.bankVerified === true
          ? firstTruthy(passportVm.identity.bankVerificationLabel, "Bank verified")
          : passportVm.identity.bankRecorded
            ? "Bank recorded"
            : "Bank not recorded",
      ok: passportVm.identity.bankVerified === true,
      muted: passportVm.identity.bankRecorded && passportVm.identity.bankVerified !== true,
    },
    {
      icon: "document" as GsnIconName,
      label: passportVm.identity.passportVerified
        ? firstTruthy(passportVm.identity.passportVerificationLabel, "ID verified")
        : passportVm.identity.officialIdRecorded
          ? "ID recorded for review"
          : "ID not recorded",
      ok: passportVm.identity.passportVerified,
      muted: passportVm.identity.officialIdRecorded && !passportVm.identity.passportVerified,
    },
  ];

  const gradeLegend = TRUST_BAND_SHORT_LABELS.map(({ band, label }) => [
    band,
    label,
  ]);
  const activeBand = safeStr(currentBand).toUpperCase().slice(0, 1);
  const activePostureLabel =
    firstTruthy(
      passportVm.verdict.label,
      gradeLegend.find(([band]) => band === activeBand)?.[1],
      currentBand
    ) || "Evidence posture";
  const trustPassportRecordFingerprint = trustPassportReferenceFingerprint(
    passportVm.identity.gmfnId,
    passportVm.identity.communityId,
    passportVm.identity.displayName,
    passportVm.verdict.band,
    passportVm.verdict.score,
    passportVm.verdict.evidenceLabel,
    passportVm.technicalDetail.eventCount,
    passportVm.outputs.trustSlipCode
  );
  const trustPassportConfidenceRibbonItems: TrustDocumentRibbonItem[] = [
    {
      label: "Passport status",
      value: "Private member record",
      tone: "info",
      detail: "Signed-in view only.",
    },
    {
      label: "Identity standing",
      value:
        passportVm.identity.identityVerified === true
          ? "Verified evidence"
          : passportVm.identity.identityVerified === false
            ? "Evidence limited"
            : "Evidence building",
      tone:
        passportVm.identity.identityVerified === true
          ? "good"
          : passportVm.identity.identityVerified === false
            ? "warn"
            : "info",
    },
    {
      label: "Evidence chain",
      value: passportVm.verdict.evidenceLabel,
      tone:
        passportVm.verdict.evidenceStatus === "strong"
          ? "good"
          : passportVm.verdict.evidenceStatus === "mixed"
            ? "info"
            : "warn",
    },
    {
      label: "Community history",
      value: `Active in ${passportVm.technicalDetail.activeClans}`,
      tone: positiveNumber(passportVm.technicalDetail.activeClans) > 0 ? "good" : "warn",
    },
    {
      label: "Verification path",
      value: passportVm.outputs.trustSlipCode ? "TrustSlip available" : "TrustSlip pending",
      tone: passportVm.outputs.trustSlipCode ? "good" : "warn",
    },
  ];
  const trustPassportSecurityItems: TrustDocumentPanelItem[] = [
    {
      title: "Private passport surface",
      detail:
        "This Trust Passport is shown inside the signed-in app and is not the public TrustSlip.",
      tone: "info",
    },
    {
      title: "Record-state reading",
      detail:
        "The evidence posture is a reading of available evidence, not a character judgement or permanent label.",
      tone: "good",
    },
    {
      title: "Evidence chain",
      detail: `Visible reading uses ${passportVm.technicalDetail.eventCount} trust events where available.`,
      tone: passportVm.verdict.evidenceStatus === "limited" ? "warn" : "good",
    },
    {
      title: "Record reference",
      detail:
        "This reference is made from the visible Trust Passport fields. Use it to match this paper with its GSN record; it is not legal proof or payment approval.",
      tone: "info",
    },
    {
      title: "Public boundary",
      detail:
        "Public readers should receive a scoped TrustSlip or community record, not this full private passport.",
      tone: "warn",
    },
  ];
  const trustPassportConfirmsList = [
    "Signed-in member view of current visible Trust Passport fields",
    "GSN ID and community context when recorded",
    "Phone, bank, ID, and community evidence status as recorded or verified",
    "Current evidence posture and evidence depth from available records",
    "TrustSlip status and verification path when available",
  ];
  const trustPassportDoesNotConfirmList = [
    "Government registration or legal identity beyond recorded evidence",
    "Bank approval, credit approval, payment movement, or escrow",
    "Future behaviour, future repayment, delivery, or marketplace outcome",
    "Private admin notes, private community files, or hidden disputes",
    "That a public TrustSlip exposes the full private Trust Passport",
  ];

  const identityRows: Array<[GsnIconName, string, string]> = [
    ["id", "GSN ID", passportVm.identity.gmfnId],
    ["community", "Community", passportVm.identity.communityName],
    ["hash", "Community ID", passportVm.identity.communityId],
    ["shield", "Roles", communityRoleCounts || roleLabel(passportVm.identity.holderRole)],
  ];

  const identityCompletionRows: Array<{
    icon: GsnIconName;
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
      label: "Phone",
      state: passportVm.identity.phoneVerified
        ? "Verified"
        : passportVm.identity.phoneRecorded
          ? "Recorded"
          : "Open check",
      detail: passportVm.identity.phoneVerified
        ? "Verified phone evidence is already attached to this Trust Passport."
        : passportVm.identity.phoneRecorded
          ? "A phone number is recorded against this identity. Confirm the code when OTP delivery is available."
          : "Open the focused phone task to record and confirm a phone number for this identity.",
      actionLabel: passportVm.identity.phoneVerified
        ? "View evidence"
        : passportVm.identity.phoneRecorded
          ? "Confirm phone"
          : "Open phone task",
      target: passportVm.identity.phoneVerified ? routes.trustSlip : identityTaskTarget("phone"),
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
      state: passportVm.identity.bankVerified
        ? "Verified"
        : passportVm.identity.bankRecorded
          ? "Recorded"
          : "Add details",
      detail: passportVm.identity.bankVerified
        ? "Bank or wallet evidence is verified."
        : passportVm.identity.bankRecorded
          ? "Bank or wallet details are recorded against this name, but provider verification is still pending."
          : "Open payout details to add the bank or wallet record GSN can attach to this identity.",
      actionLabel: passportVm.identity.bankVerified
        ? "Open details"
        : passportVm.identity.bankRecorded
          ? "Review bank/wallet"
          : "Add bank/wallet",
      target: routes.payoutDetails,
      debugId: "trust-score.completion.bank",
      ok: passportVm.identity.bankVerified === true,
    },
    {
      icon: "document",
      label: "Passport / ID",
      state: passportVm.identity.passportVerified
        ? "Verified"
        : passportVm.identity.officialIdRecorded
          ? "Recorded"
          : "Open task",
      detail: passportVm.identity.passportVerified
        ? "Official ID evidence is verified in the trust evidence layer."
        : passportVm.identity.officialIdRecorded
          ? "Official ID evidence is recorded for review. Provider verification is still pending."
          : "Open the focused ID task to record passport, national ID, or licence evidence.",
      actionLabel: passportVm.identity.passportVerified
        ? "View evidence"
        : passportVm.identity.officialIdRecorded
          ? "Review ID evidence"
          : "Open ID task",
      target: passportVm.identity.passportVerified
        ? routes.trustSlip
        : identityTaskTarget("official_id"),
      debugId: "trust-score.completion.passport",
      ok: Boolean(passportVm.identity.passportVerified),
    },
  ];

  const communityConfirmationCards: Array<[
    string,
    string,
    string,
    GsnIconName,
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
      "Community record",
      passportVm.identity.communityIdentityLabel,
      "Whether this identity has active community evidence recorded.",
      "check",
      passportVm.identity.communityIdentityConfirmed ? "Ready" : "Limited",
    ],
    [
      "Activity evidence",
      communityActivityCardValue,
      communityActivityCardDetail,
      "chart",
      Number(passportVm.identity.communityActivityCount || 0) > 0 ? "Ready" : "Limited",
    ],
    [
      "Witness currentness",
      passportVm.identity.membershipCurrentnessLabel,
      passportVm.identity.membershipCurrentnessScope,
      "check",
      membershipCurrentnessReady ? "Ready" : "Limited",
    ],
    [
      "Next witness renewal",
      passportVm.identity.nextWitnessRenewalAt || "Not shown",
      passportVm.identity.nextWitnessRenewalAt
        ? `Earliest active witness renewal status: ${passportVm.identity.nextWitnessRenewalStatusLabel}.`
        : "No active witness renewal date is shown yet.",
      "calendar",
      passportVm.identity.nextWitnessRenewalStatusLabel.toLowerCase() === "active"
        ? "Ready"
        : "Limited",
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
    [
      "Member credential",
      memberCredentialPath ? "Ready to open" : "Needs Community ID and GSN ID",
      memberCredentialPath
        ? "This opens the public credential record connecting this GSN ID to this Community ID."
        : "The member credential needs a usable Community ID and member GSN ID before it can open.",
      "id",
      memberCredentialPath ? "Ready" : "Limited",
    ],
  ];

  const trustQuestionIcons: Record<string, GsnIconName> = {
    "Identity evidence": "shield",
    "Support trust": "community",
    "Contribution / discipline": "chart",
    "Contribution discipline": "chart",
    "Finance discipline": "financeInstitution",
    "Trade / merchant trust": "shop",
    "Trade trust": "shop",
    "Follow-through": "check",
    "Community stability": "home",
    "Checkable history": "document",
  };

  const trustSurfaceCards = [
    {
      icon: "home" as GsnIconName,
      title: "Local community trust",
      detail: "How this member is currently reading inside the active community.",
      action: "View local reading",
      to: routes.openTrust,
      value: openTrust.classText,
      tone: "#EEF6FF",
      debugId: "trust-score.surface.local-community-trust",
    },
    {
      icon: "globe" as GsnIconName,
      title: "Cross-community consistency",
      detail:
        "How steady this member's trust signals appear across communities.",
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
    ["Trust-limit signal", `${trustLimit} ${trustCurrency}`],
    ["Event count", eventCount],
    ["Counterparties", counterpartiesCount],
    [
      "Available support capacity",
      safeStr(capacityContext?.available_guarantee_capacity || "0.00"),
    ],
    [
      "Current support commitments",
      safeStr(capacityContext?.current_locked_guarantees || "0.00"),
    ],
    ["Support pressure reading", safeStr(capacityContext?.overexposure_ratio || "0.00")],
    ["Risk level", riskLevel],
    ["Not a bank guarantee", "Yes"],
    ["No auto-debit", "Yes"],
  ];

  const financeDisciplineCards: Array<[string, string, string, GsnIconName]> = [
    [
      "Trust limit",
      `${trustLimit} ${trustCurrency}`,
      "The current amount signal GSN can show from this trust record; it is not an approval limit.",
      "financeInstitution",
    ],
    [
      "Available capacity",
      `${safeStr(capacityContext?.available_guarantee_capacity || "0.00")} ${trustCurrency}`,
      "What still appears available before the record looks stretched.",
      "check",
    ],
    [
      "Locked support",
      `${safeStr(capacityContext?.current_locked_guarantees || "0.00")} ${trustCurrency}`,
      "Support already standing behind active commitments.",
      "shield",
    ],
    [
      "Support pressure",
      safeStr(capacityContext?.overexposure_ratio || "0.00"),
      "How stretched the support position looks right now.",
      "financeInstitution",
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
    icon: GsnIconName;
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
      icon: "evidence",
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
      icon: "financeInstitution",
      label: "Finance Discipline",
      detail: "Limit signal, capacity, locked support, and risk context.",
    },
    {
      key: "documents",
      icon: "evidence",
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
                  letterSpacing: 0,
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
              {trustIconBadge(activeLane.icon, 26, "blue")}
              One lane open
            </span>
          </div>

          {communityFootprint.length > 0 ? (
            <div
              data-trust-passport-community-footprint="true"
              style={{
                marginTop: isCompact ? 10 : 14,
                borderRadius: isCompact ? 14 : 18,
                border: "1px solid rgba(216,227,238,0.78)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(248,251,255,0.92) 100%)",
                padding: isCompact ? 8 : 12,
                display: "grid",
                gap: 8,
                position: "relative",
                zIndex: 1,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    color: "#07172C",
                    fontWeight: 1000,
                    fontSize: isCompact ? 12 : 14,
                    textTransform: "uppercase",
                  }}
                >
                  Community footprint
                </span>
                <span style={overviewStatusBox(true, true)}>
                  <span style={overviewBadge(true, true)}>
                    <GsnLegacyIcon name="community" size={22} decorative />
                  </span>
                  {communityFootprint.length} active
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 7,
                }}
              >
                {communityFootprint.slice(0, isCompact ? 3 : 4).map((item) => (
                  <div
                    key={`${item.code}-${item.name}`}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(0, 1fr) auto",
                      gap: 8,
                      alignItems: "center",
                      minHeight: isCompact ? 42 : 48,
                      borderRadius: 12,
                      border: "1px solid rgba(216,227,238,0.68)",
                      background: "#FFFFFF",
                      padding: isCompact ? "7px 8px" : "8px 10px",
                      overflow: "hidden",
                    }}
                  >
                    <span style={{ minWidth: 0 }}>
                      <span
                        style={{
                          display: "block",
                          color: "#07172C",
                          fontWeight: 1000,
                          fontSize: isCompact ? 12 : 13.5,
                          lineHeight: 1.12,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.name}
                      </span>
                      <span
                        style={{
                          display: "block",
                          marginTop: 2,
                          color: "#617085",
                          fontWeight: 900,
                          fontSize: isCompact ? 10.5 : 11.5,
                          lineHeight: 1.1,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.code}
                      </span>
                    </span>
                    <span
                      style={{
                        borderRadius: 999,
                        background: "#EEF6FF",
                        border: "1px solid rgba(11,99,209,0.14)",
                        color: "#073E83",
                        fontWeight: 1000,
                        fontSize: isCompact ? 10.5 : 11.5,
                        padding: "4px 7px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {roleLabel(item.role)}
                    </span>
                  </div>
                ))}
              </div>
              {communityFootprint.length > (isCompact ? 3 : 4) ? (
                <div style={{ ...helperText(), fontSize: 11.5, margin: 0 }}>
                  +{communityFootprint.length - (isCompact ? 3 : 4)} more communities
                </div>
              ) : null}
            </div>
          ) : null}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "repeat(2, minmax(0, 1fr))"
                : "repeat(3, minmax(0, 1fr))",
              gap: isCompact ? 8 : 10,
              marginTop: isCompact ? 10 : 12,
            }}
          >
            {trustPassportLanes.map((lane) => {
              const isActive = lane.key === activeTrustPassportLane;
              return (
                <SecondaryButton
                  key={lane.key}
                  onClick={() => setActiveTrustPassportLane(lane.key)}
                  fullWidth
                  stableHeight={isCompact ? 58 : 66}
                  debugId={`trust-score.lane.${lane.key}`}
                  style={{
                    justifyContent: "flex-start",
                    gap: isCompact ? 6 : 8,
                    borderRadius: isCompact ? 11 : 12,
                    border: isActive
                      ? "1px solid rgba(11,99,209,0.36)"
                      : "1px solid rgba(216,227,238,0.9)",
                    background: isActive ? "#EEF6FF" : "#FFFFFF",
                    boxShadow: isActive
                      ? "0 8px 20px rgba(11,99,209,0.12)"
                      : "none",
                    color: "#07172C",
                    fontSize: isCompact ? 11.5 : 14,
                    fontWeight: 1000,
                    lineHeight: isCompact ? 1.05 : 1.15,
                    paddingInline: isCompact ? 8 : 12,
                  }}
                >
                  <GsnLegacyIcon name={lane.icon} size={isCompact ? 24 : 32} decorative />
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
          <OfficialGsnWatermark
            isCompact={isCompact}
            opacity={0.045}
            style={{ right: isCompact ? -64 : -34, top: isCompact ? -34 : -60 }}
          />
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
              <h1
                style={{
                  margin: 0,
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
                  <GsnLegacyIcon name={icon} size={isCompact ? 31 : 40} decorative />
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
              <span key={item.label} style={overviewStatusBox(item.ok, item.muted)}>
                <span style={overviewBadge(item.ok, item.muted)}>
                  <GsnLegacyIcon name={item.icon} size={22} decorative />
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
                <GsnLegacyIcon name="community" size={22} decorative />
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
              stableHeight={52}
              fullWidth
              aria-expanded={showIdentityCompletionPaths}
              style={{
                ...trustScoreFixedActionStyle(52),
                borderRadius: isCompact ? 12 : 14,
                fontSize: isCompact ? 13 : 16,
                fontWeight: 1000,
                paddingInline: isCompact ? 10 : 14,
              }}
              debugId="trust-score.complete-identification"
            >
              <GsnLegacyIcon name="id" size={isCompact ? 28 : 32} decorative />
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
                ...trustScoreFixedActionStyle(isCompact ? 50 : 58),
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

          <div
            data-gsn-trust-document-certificate="trust-passport"
            style={{
              display: "grid",
              gap: isCompact ? 10 : 12,
              marginTop: isCompact ? 10 : 12,
              position: "relative",
              zIndex: 1,
            }}
          >
            <TrustDocumentConfidenceRibbon items={trustPassportConfidenceRibbonItems} />
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: isCompact ? 10 : 12,
              }}
            >
              <TrustDocumentSecurityPanel
                title="Trust Passport security"
                items={trustPassportSecurityItems}
              />
              <div style={{ display: "grid", gap: isCompact ? 10 : 12 }}>
                <TrustDocumentBoundaryPanel
                  title="This passport confirms"
                  tone="good"
                  items={trustPassportConfirmsList}
                />
                <TrustDocumentBoundaryPanel
                  title="This passport does not confirm"
                  tone="warn"
                  items={trustPassportDoesNotConfirmList}
                />
              </div>
            </div>
            <TrustDocumentFingerprint
              label="Trust Passport record reference"
              value={trustPassportRecordFingerprint}
              detail="Record reference for this visible private Trust Passport. It helps match this page with its GSN record; it is not legal proof or payment approval."
            />
          </div>

          <div
            data-trust-passport-identity-evidence-meter="true"
            style={{
              marginTop: isCompact ? 8 : 10,
              borderRadius: isCompact ? 14 : 16,
              border: "1px solid rgba(216,227,238,0.66)",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,251,255,0.86) 100%)",
              padding: isCompact ? 7 : 9,
              display: "grid",
              gap: identityEvidenceOpen ? (isCompact ? 7 : 9) : 0,
              position: "relative",
              zIndex: 1,
            }}
          >
            <SubtleButton
              onClick={() => setIdentityEvidenceOpen((open) => !open)}
              stableHeight={isCompact ? 42 : 44}
              aria-expanded={identityEvidenceOpen}
              fullWidth
              style={{
                justifyContent: "space-between",
                borderRadius: 999,
                paddingInline: isCompact ? 9 : 12,
                fontSize: isCompact ? 11 : 12.5,
                fontWeight: 1000,
                whiteSpace: "nowrap",
                marginTop: 0,
                background: "#FFFFFF",
              }}
              debugId="trust-score.identity-evidence-meter.toggle"
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: isCompact ? 6 : 8,
                  minWidth: 0,
                }}
              >
                <span
                  style={overviewBadge(
                    identityEvidence.score >= 60,
                    identityEvidence.score < 60
                  )}
                >
                  <GsnLegacyIcon
                    name={identityEvidenceOpen ? "chevronUp" : "shield"}
                    size={22}
                    decorative
                  />
                </span>
                <span
                  style={{
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isCompact ? "Evidence" : "Identity evidence"}
                </span>
              </span>
              <span
                onClick={stopInertMeterTap}
                style={{
                  ...statusPillStyle(identityEvidence.label),
                  padding: isCompact ? "5px 8px" : "5px 10px",
                  fontSize: isCompact ? 11 : 12,
                }}
              >
                {isCompact
                  ? identityEvidenceStageWord(identityEvidence)
                  : identityEvidenceStagePhrase(identityEvidence)}
              </span>
            </SubtleButton>

            {identityEvidenceOpen ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "42px minmax(0, 1fr)"
                    : "52px minmax(0, 1fr)",
                  gap: isCompact ? 7 : 9,
                  alignItems: "center",
                  paddingTop: isCompact ? 6 : 8,
                  borderTop: "1px solid rgba(216,227,238,0.52)",
                }}
              >
                <div style={evidenceDialStyle(identityEvidence.degrees, isCompact)}>
                  <div style={evidenceDialInnerStyle(isCompact)}>
                    {identityEvidenceStageShort(identityEvidence)}
                  </div>
                </div>
                <div style={{ display: "grid", gap: isCompact ? 5 : 6, minWidth: 0 }}>
                  <div
                    style={{
                      color: "#617085",
                      fontSize: isCompact ? 10.5 : 12,
                      lineHeight: 1.2,
                      fontWeight: 850,
                    }}
                  >
                    {isCompact
                      ? "Recorded helps. Verified builds confidence."
                      : "Recorded evidence raises readiness. Verified evidence raises confidence."}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: isCompact ? 4 : 5,
                      minWidth: 0,
                    }}
                  >
                    {identityEvidence.items.slice(0, 5).map((item) => (
                      <span
                        key={item.key}
                        style={{
                          borderRadius: 999,
                          border: item.done
                            ? "1px solid rgba(46,155,98,0.16)"
                            : "1px solid rgba(214,170,69,0.18)",
                          background: item.done ? "#F0FBF4" : "#FFFBF2",
                          color: item.done ? "#166534" : "#92400E",
                          padding: isCompact ? "3px 6px" : "4px 7px",
                          fontSize: isCompact ? 9.5 : 10.5,
                          fontWeight: 1000,
                          lineHeight: 1,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.done ? "Recorded: " : "Add: "}
                        {item.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
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
                Choose the missing evidence. Only ready completion pages open; pending pages are
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
                    stableHeight={56}
                    fullWidth
                    debugId={item.debugId}
                    style={{
                      ...trustScoreFixedActionStyle(56),
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
                      <GsnLegacyIcon name={item.icon} size={22} decorative />
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
                  gap: isCompact ? 10 : 14,
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact
                      ? "58px minmax(0, 1fr)"
                      : "78px minmax(0, 1fr)",
                    gap: isCompact ? 10 : 14,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      minHeight: isCompact ? 58 : 78,
                      borderRadius: isCompact ? 16 : 20,
                      display: "grid",
                      placeItems: "center",
                      background:
                        "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(255,247,230,0.98) 100%)",
                      border: "1px solid rgba(245,158,11,0.34)",
                      color: readingTone.text,
                      fontSize: isCompact ? 34 : 46,
                      lineHeight: 1,
                      fontWeight: 1000,
                      boxShadow:
                        "0 14px 28px rgba(146,64,14,0.12), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -7px 16px rgba(245,158,11,0.12)",
                    }}
                  >
                    {activePostureLabel}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                      color: readingTone.text,
                      fontSize: isCompact ? 21 : 24,
                      lineHeight: 1.1,
                      fontWeight: 1000,
                    }}
                  >
                    {passportVm.verdict.label}
                    </div>
                    <div style={{ marginTop: 7 }}>
                      <span
                        title={passportVm.verdict.evidenceMeaning}
                        onClick={stopInertMeterTap}
                        style={{
                          ...statusPillStyle(passportVm.verdict.evidenceStatus),
                          minHeight: 24,
                          padding: "3px 8px",
                          fontSize: 11.5,
                        }}
                      >
                        Depth: {passportVm.verdict.evidenceLabel}
                      </span>
                    </div>
                  </div>
                </div>
                <p
                  style={{
                    ...helperText(),
                    margin: 0,
                    fontSize: isCompact ? 14 : 14.5,
                    lineHeight: isCompact ? 1.5 : 1.65,
                  }}
                >
                  {plainTrustVerdict}
                </p>
                <SecondaryButton
                  debugId="trust-score.verdict-note.toggle"
                  stableHeight={isCompact ? 42 : 44}
                  onClick={() => setVerdictNoteOpen((open) => !open)}
                  style={{
                    justifyContent: "space-between",
                    borderRadius: 13,
                    background: verdictNoteOpen ? "#F8FBFF" : "#FFFFFF",
                    border: "1px solid rgba(11,99,209,0.14)",
                    color: "#24415C",
                    boxShadow: "none",
                    fontSize: 12.5,
                    fontWeight: 1000,
                  }}
                >
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                    <GsnLegacyIcon name="document" size={24} decorative />
                    Record state note
                  </span>
                  <span aria-hidden="true" style={{ color: "#617085", fontSize: 18 }}>
                    {verdictNoteOpen ? "-" : "+"}
                  </span>
                </SecondaryButton>
                {verdictNoteOpen ? (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "30px minmax(0, 1fr)",
                      gap: 8,
                      alignItems: "center",
                      padding: "8px 10px",
                      borderRadius: 12,
                      background: "#F8FBFF",
                      border: "1px solid rgba(11,99,209,0.12)",
                      color: "#24415C",
                      fontSize: 12.5,
                      fontWeight: 850,
                      lineHeight: 1.35,
                    }}
                  >
                    <GsnLegacyIcon name="document" size={28} decorative />
                    <span>
                      Record state, not character judgement. Add current evidence to strengthen this reading.
                    </span>
                  </div>
                ) : null}
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "stretch",
                  gap: isCompact ? 5 : 7,
                  padding: isCompact ? 5 : 7,
                  border: "1px solid rgba(216,227,238,0.9)",
                  borderRadius: 18,
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(244,248,255,0.96) 100%)",
                  boxShadow:
                    "inset 0 1px 0 rgba(255,255,255,0.95), 0 12px 24px rgba(6,24,39,0.06)",
                }}
                aria-label="Evidence posture rail"
                onClick={stopInertMeterTap}
              >
                {gradeLegend.map(([band, label]) => {
                  const isActive = activeBand === band;
                  return (
                    <div
                      key={band}
                      style={{
                        flex: "1 1 0",
                        minHeight: isCompact ? 46 : 58,
                        padding: isCompact ? "7px 4px" : "9px 6px",
                        textAlign: "center",
                        borderRadius: 13,
                        background: isActive
                          ? "linear-gradient(180deg, #FFF9EA 0%, #FFE7A8 100%)"
                          : band === "A" || band === "B"
                            ? "linear-gradient(180deg, #F7FCF8 0%, #EAF7EE 100%)"
                            : "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)",
                        border: isActive
                          ? "1px solid rgba(214,170,69,0.72)"
                          : "1px solid rgba(216,227,238,0.95)",
                        boxShadow: isActive
                          ? "0 12px 22px rgba(146,64,14,0.16), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -8px 18px rgba(214,170,69,0.20)"
                          : "inset 0 1px 0 rgba(255,255,255,0.92), inset 0 -6px 14px rgba(6,24,39,0.04)",
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      <div
                        style={{
                          color: isActive ? "#92400E" : "#07172C",
                          fontWeight: 1000,
                          fontSize: isCompact ? 11.5 : 13,
                          lineHeight: 1.15,
                          overflowWrap: "break-word",
                        }}
                      >
                        {label}
                      </div>
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
                      <GsnLegacyIcon
                        name={trustQuestionIcons[item.title] || "shield"}
                        size={30}
                        decorative
                      />
                      {item.title}
                    </span>
                    <EvidenceMeter status={item.status}>{item.status}</EvidenceMeter>
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
            <OfficialGsnWatermark
              isCompact={isCompact}
              opacity={0.04}
              style={{ right: isCompact ? -74 : -42, top: -52 }}
            />
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
                letterSpacing: 0,
              }}
            >
              <GsnLegacyIcon name="chart" size={32} decorative />
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
              use the evidence rows only when you need supporting evidence.
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
            <OfficialGsnWatermark
              isCompact={isCompact}
              opacity={0.04}
              style={{ right: isCompact ? -78 : -46, top: -54 }}
            />
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
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              <GsnLegacyIcon name="alert" size={32} decorative />
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
                  Do not guess the repair path from one reading alone. Open the
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
              <GsnLegacyIcon name="alert" size={isCompact ? 28 : 32} decorative />
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
                  <GsnLegacyIcon name="shield" size={32} decorative />
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
                  <GsnLegacyIcon name="alert" size={32} decorative />
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
              <OfficialGsnWatermark
                isCompact={isCompact}
                opacity={0.04}
                style={{ right: isCompact ? -76 : -42, top: -50 }}
              />
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
                  letterSpacing: 0,
                  textTransform: "uppercase",
                }}
              >
                <GsnLegacyIcon name="community" size={32} decorative />
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
                        {trustIconBadge(icon, 28, status === "Ready" ? "green" : "red")}
                        {label}
                      </span>
                      <EvidenceMeter status={status}>{status}</EvidenceMeter>
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                  marginTop: 12,
                  position: "relative",
                  zIndex: 1,
                }}
              >
                <SecondaryButton
                  onClick={() => {
                    if (communityVerifyPath) {
                      openTrustRoute(communityVerifyPath);
                      return;
                    }
                    setNotice({
                      tone: "error",
                      text: "The public community record needs a usable Community ID before it can open.",
                    });
                  }}
                  stableHeight={isCompact ? 50 : 46}
                  fullWidth
                  debugId="trust-score.community-lane.open-public-community-record"
                  style={{ borderRadius: 12, fontWeight: 1000 }}
                >
                  Open community record
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    if (memberCredentialPath) {
                      openTrustRoute(memberCredentialPath);
                      return;
                    }
                    setNotice({
                      tone: "error",
                      text: "The member credential needs both a usable Community ID and member GSN ID before it can open.",
                    });
                  }}
                  stableHeight={isCompact ? 50 : 46}
                  fullWidth
                  debugId="trust-score.community-lane.open-member-credential"
                  style={{ borderRadius: 12, fontWeight: 1000 }}
                >
                  Open member credential
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => {
                    if (memberWitnessPolicyPath) {
                      openTrustRoute(memberWitnessPolicyPath);
                      return;
                    }
                    setNotice({
                      tone: "error",
                      text: "Choose or join a community before asking members to stand for you.",
                    });
                  }}
                  stableHeight={isCompact ? 50 : 46}
                  fullWidth
                  debugId="trust-score.community-lane.ask-for-witness"
                  style={{ borderRadius: 12, fontWeight: 1000 }}
                >
                  Ask for witness
                </SecondaryButton>
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
                    {trustIconBadge(item.icon, 34, "blue")}
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
                    <EvidenceMeter status={item.value}>{item.value}</EvidenceMeter>
                    <SecondaryButton
                      onClick={() => openTrustRoute(item.to)}
                      stableHeight={isCompact ? 52 : 40}
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
                  {trustIconBadge("refresh", isCompact ? 26 : 28, "navy")}
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
                  {trustIconBadge("copy", isCompact ? 26 : 28, "navy")}
                  Copy text
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
                  {trustIconBadge("document", isCompact ? 26 : 28, "navy")}
                  Open TrustSlip
                </SecondaryButton>
                <SecondaryButton
                  onClick={() => openTrustRoute(verifyAppPath)}
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
                  {trustIconBadge("search", isCompact ? 26 : 28, "navy")}
                  Open TrustSlip verify
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
                  stableHeight={isCompact ? 52 : 40}
                  debugId="trust-score.review-care"
                  style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
                >
                  Review pressure notes
                </DangerButton>
                <SubtleButton
                  onClick={() => {
                    if (!trustPassportSnapshotReady) {
                      setNotice({
                        tone: "error",
                        text: trustSlipBlockedByPhone
                          ? trustSlipBlockDetail
                          : "Trust Passport PDF is not ready yet. Issue the GSN ID and TrustSlip first.",
                      });
                      return;
                    }

                    if (
                      typeof window !== "undefined" &&
                      typeof window.print === "function"
                    ) {
                      window.print();
                    }
                  }}
                  fullWidth
                  stableHeight={isCompact ? 52 : 40}
                  debugId="trust-score.export"
                  style={{ borderRadius: 10, fontSize: 13, fontWeight: 950 }}
                >
                  Export / print
                </SubtleButton>
              </div>
              <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <EvidenceMeter status={trustSlipStatus}>
                  TrustSlip: {trustSlipStatus || "Not issued yet"}
                </EvidenceMeter>
                <EvidenceMeter status={trustSlipCode ? "Ready" : "Limited"}>
                  Code: {trustSlipCode || "Not stated"}
                </EvidenceMeter>
                <EvidenceMeter status="Limited">Expires: {expiresText}</EvidenceMeter>
              </div>
              {trustPassportSnapshotReady ? (
                <>
                  <GsnSnapshotPaperCard
                    paperText={trustPassportPaper}
                    compact={isCompact}
                    icon="shield"
                    maxBodyLines={isCompact ? 6 : undefined}
                    style={{ marginTop: 14 }}
                  />
                  <p
                    style={{
                      ...helperText(),
                      margin: "8px 0 0",
                      fontSize: isCompact ? 12 : 13,
                    }}
                  >
                    Copy gives a short text summary. Use screenshot or print to share
                    the official GSN paper background.
                  </p>
                </>
              ) : (
                <div
                  style={{
                    ...innerCard("#FFFDF7"),
                    marginTop: 14,
                    border: "1px solid rgba(245,158,11,0.20)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "42px minmax(0, 1fr)",
                      gap: 10,
                      alignItems: "center",
                    }}
                  >
                    {trustIconBadge("document", 34, "amber")}
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          color: "#92400E",
                          fontSize: 13,
                          fontWeight: 1000,
                          textTransform: "uppercase",
                          letterSpacing: 0,
                        }}
                      >
                        Snapshot not ready
                      </div>
                      <div
                        style={{
                          color: "#07172C",
                          fontSize: isCompact ? 17 : 19,
                          fontWeight: 1000,
                          lineHeight: 1.18,
                          marginTop: 3,
                        }}
                      >
                        {trustSlipBlockedByPhone
                          ? "Verify the phone number before sharing."
                          : "Finish the GSN ID and TrustSlip before sharing."}
                      </div>
                    </div>
                  </div>
                  <p style={{ ...helperText(), margin: 0 }}>
                    {trustSlipBlockedByPhone
                      ? trustSlipBlockDetail
                      : "A public-looking paper should not show a missing GSN ID or a blank TrustSlip code."}
                  </p>
                  <SecondaryButton
                    onClick={() => openTrustRoute(routes.trustSlip)}
                    fullWidth
                    stableHeight={isCompact ? 50 : 52}
                    debugId="trust-score.snapshot-open-trust-slip"
                    style={{ borderRadius: 12, fontWeight: 950 }}
                  >
                    {trustIconBadge("document", 28, "navy")}
                    Open TrustSlip
                  </SecondaryButton>
                </div>
              )}
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
            <OfficialGsnWatermark
              isCompact={isCompact}
              opacity={0.04}
              style={{ right: isCompact ? -76 : -42, top: -52 }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 9,
                color: "#0B63D1",
                fontSize: 14,
                fontWeight: 1000,
                letterSpacing: 0,
                textTransform: "uppercase",
              }}
            >
              <GsnLegacyIcon name="financeInstitution" size={32} decorative />
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
                    {trustIconBadge(icon, 28, label === "Risk level" ? "red" : "blue")}
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
                display: "grid",
                gridTemplateColumns: isCompact ? "48px minmax(0, 1fr)" : "56px minmax(0, 1fr)",
                gap: isCompact ? 10 : 14,
                alignItems: "start",
              }}
            >
              {trustIconBadge("financeInstitution", isCompact ? 46 : 54, "blue")}
              <div style={{ minWidth: 0 }}>
                <div style={{ color: "#07172C", fontWeight: 1000 }}>
                  Plain rule
                </div>
                <p style={{ ...helperText(), margin: "8px 0 0" }}>
                  GSN is showing whether the record looks disciplined enough for
                  trust decisions. It is not promising repayment, collecting
                  money, or replacing the Finance page.
                </p>
              </div>
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
