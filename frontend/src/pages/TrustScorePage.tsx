import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

type NoticeTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  explainability: boolean;
  breakdown: boolean;
  evidence: boolean;
  routes: boolean;
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
      textAlign: "center",
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
      textAlign: "center",
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
    textAlign: "center",
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
    textAlign: "center",
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
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    explainability: Boolean(raw?.explainability ?? base.explainability),
    breakdown: Boolean(raw?.breakdown ?? base.breakdown),
    evidence: Boolean(raw?.evidence ?? base.evidence),
    routes: Boolean(raw?.routes ?? base.routes),
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

export default function TrustScorePage() {
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

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
          subtitle="Trust Passport shows the current trust reading, why it changed, what evidence supports it, and what this unlocks next."
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
      </div>

      <ExplainToggle
        label="What this screen does"
        what="Trust Passport is the fuller trust reading for your account. It explains the current score, band, recent trust events, and the evidence behind them."
        why="It helps you understand not just the current trust position, but why it changed and what that position means for the next move."
        next="Start with the current trust posture, then open the evidence and institutional context sections if you need the deeper explanation."
        tone="blue"
      />

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
              <span style={badge(true)}>Issued trust passport</span>
              <span style={badge(false)}>Explanatory trust record</span>
            </div>

            <div style={sectionLabel()}>Trust passport overview</div>

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
              This shows the current trust reading, what changed it, the recent events behind it, and the evidence context around exposure and capacity.
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
              <span style={badge(false)}>Current step: Review full trust reading</span>
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
                onClick={() => void handleRefreshTrust()}
                disabled={refreshing}
                style={actionBtn("primary", refreshing)}
              >
                {refreshing ? "Refreshing..." : "Refresh Trust Reading"}
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    gmfnId,
                    "GMFN ID copied.",
                    "GMFN ID is not available yet."
                  )
                }
                style={actionBtn("secondary", !gmfnId || gmfnId === "Awaiting issue")}
                disabled={!gmfnId || gmfnId === "Awaiting issue"}
              >
                Copy GMFN ID
              </button>

              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined" && typeof window.print === "function") {
                    window.print();
                  }
                }}
                style={actionBtn("soft")}
              >
                Print Trust Passport
              </button>

              {verifyUrl ? (
                <a
                  href={verifyUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={actionBtn("secondary")}
                >
                  Open TrustSlip Verify
                </a>
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

            <ExplainToggle
              label="What this posture means"
              what="This is the main trust reading for the current moment: your band, score, and the immediate trust meaning."
              why="It turns the passport into one clear trust posture before you read the deeper document details."
              next="Read the posture first, then check the document reference, issue window, and evidence sections if you need more support for the reading."
              tone="light"
              style={{ marginTop: 12 }}
            />

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
            <div style={sectionLabel()}>Trust summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The main trust numbers and structural indicators stay together here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("overview")}
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.overview ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <ExplainToggle
              label="What this does"
              what="This summary gathers the core trust metrics that describe your current trust state in one place."
              why="It helps you read the main trust picture before moving into the event explanation or evidence sections."
              next="Start with the band, score, CCI, graph score, trust limit, and event count here, then open the deeper sections if you need to understand why the reading looks this way."
              tone="light"
            />

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
            <div style={sectionLabel()}>Why did my trust change?</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This section explains the most recent trust movement and the events behind it.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("explainability")}
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
            <div style={sectionLabel()}>Recomputed breakdown</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This section shows the current score breakdown used for the latest trust reading.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("breakdown")}
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
            onClick={() => toggleSection("evidence")}
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from this trust reading into the next page you need.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("routes")}
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.routes ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <OriginLink to="/app/trust-slip" style={actionBtn("primary")}>
              Open TrustSlip
            </OriginLink>

            {verifyUrl ? (
              <a
                href={verifyUrl}
                target="_blank"
                rel="noreferrer"
                style={actionBtn("secondary")}
              >
                Open TrustSlip Verify
              </a>
            ) : (
              <button type="button" style={actionBtn("secondary", true)} disabled>
                Open TrustSlip Verify
              </button>
            )}

            <OriginLink to={nextStep.ctaTo} style={actionBtn("secondary")}>
              {nextStep.ctaLabel}
            </OriginLink>

            <OriginLink to="/app/notifications" style={actionBtn("secondary")}>
              Action Inbox
            </OriginLink>

            <OriginLink to="/app/marketplace" style={actionBtn("secondary")}>
              Marketplace
            </OriginLink>

            <OriginLink to="/app/my-gmfn-and-i" style={actionBtn("secondary")}>
              My GSN and I
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}



