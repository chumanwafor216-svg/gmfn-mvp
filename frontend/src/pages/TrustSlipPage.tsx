import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import NextActionGuide from "../components/NextActionGuide";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import TrustDocumentActionGuide from "../components/TrustDocumentActionGuide";
import TrustDocumentFamilyMap from "../components/TrustDocumentFamilyMap";
import TrustDocumentUseCases from "../components/TrustDocumentUseCases";
import * as api from "../lib/api";
import { navigateWithOrigin } from "../lib/nav";
import { publicApiUrl } from "../lib/publicLinks";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildTrustSlipActionGuide } from "../lib/trustDocumentActionGuide";
import { buildTrustDocumentFamilyItems } from "../lib/trustDocumentFamilyMap";
import { buildTrustDocumentUseCaseItems } from "../lib/trustDocumentUseCases";
import { buildTrustSlipGuideItems } from "../lib/trustDocumentGuide";
import { buildTrustSlipSnapshot } from "../lib/trustDocumentSnapshots";

type NoticeTone = "success" | "error";

type CollapseState = {
  summary: boolean;
  merchantVerify: boolean;
  merchantView: boolean;
  evidence: boolean;
  notes: boolean;
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

type MerchantView = {
  visibility_level?: string | null;
  verified?: boolean | null;
  active?: boolean | null;
  status?: string | null;
  code?: string | null;
  gmfn_id?: string | null;
  display_name?: string | null;
  community?: string | null;
  band?: string | null;
  trust_limit?: string | null;
  currency?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  phone_verified?: boolean | null;
  merchant_summary?: MerchantSummary | null;
  not_a_bank_guarantee?: boolean | null;
  no_auto_debit?: boolean | null;
  disclaimer?: string | null;
  cci_score?: string | null;
  cci_band?: string | null;
  sponsor_count?: number | null;
  sponsors?: any[];
};

type CapacityContext = {
  available_guarantee_capacity?: string | null;
  current_locked_guarantees?: string | null;
  overexposure_ratio?: string | null;
  risk_level?: string | null;
  reasons?: string[];
};

type EvidenceSummary = {
  capacity_context?: CapacityContext | null;
  readiness_context?: Record<string, any> | null;
};

type TrustSlipSummary = {
  verified?: boolean | null;
  active?: boolean | null;
  user_id?: number | null;
  clan_id?: number | null;
  gmfn_id?: string | null;
  display_name?: string | null;
  community?: string | null;
  owner?: {
    user_id?: number | null;
    gmfn_id?: string | null;
    email?: string | null;
    phone_e164?: string | null;
    phone_verified?: boolean | null;
  } | null;
  phone_e164?: string | null;
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
  evidence_summary?: EvidenceSummary | null;
  merchant_summary?: MerchantSummary | null;
  merchant_visibility_level?: string | null;
  visibility_options?: string[];
  is_current?: boolean | null;
  issued_reason?: string | null;
  supersedes_trust_slip_id?: number | null;
  superseded_by_trust_slip_id?: number | null;
  not_a_bank_guarantee?: boolean | null;
  no_auto_debit?: boolean | null;
  disclaimer?: string | null;
  generated_at?: string | null;
  merchant_view?: MerchantView | null;
  verification_token?: string | null;
  verification_code?: string | null;
  token?: string | null;
  public_verify_url?: string | null;
  community_id?: string | null;
  community_global_id?: string | null;
  community_code?: string | null;
  clan_code?: string | null;
};

const TRUST_SLIP_UI_STORAGE_KEY = "gmfn.trustSlip.sections.v3";
const GMFN_EXEC_SUMMARY_URL = "/gmfn-executive-summary.pdf";

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

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function joinUrl(root: string, path: string): string {
  const cleanRoot = safeStr(root).replace(/\/+$/, "");
  const cleanPath = safeStr(path).startsWith("/")
    ? safeStr(path)
    : `/${safeStr(path)}`;

  return `${cleanRoot}${cleanPath}`;
}

function toApiAbsoluteUrl(pathOrUrl: string): string {
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

async function fetchFirstJson(
  paths: string[],
  extraHeaders: Record<string, string> = {}
): Promise<any | null> {
  const bases = [apiBase()];

  if (typeof window !== "undefined") {
    bases.push(`${window.location.origin}/api`);
  }

  const uniqueBases = Array.from(
    new Set(bases.map((item) => safeStr(item)).filter(Boolean))
  );

  const token =
    typeof (api as any).getAccessToken === "function"
      ? (api as any).getAccessToken()
      : "";

  for (const base of uniqueBases) {
    for (const path of paths) {
      try {
        const headers: Record<string, string> = {
          accept: "application/json",
          ...extraHeaders,
        };

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(joinUrl(base, path), {
          method: "GET",
          headers,
          credentials: "include",
          cache: "no-store",
        });

        if (!res.ok) continue;

        const contentType = String(
          res.headers.get("content-type") || ""
        ).toLowerCase();

        if (!contentType.includes("application/json")) continue;

        return await res.json();
      } catch {
        // continue
      }
    }
  }

  return null;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(108,138,184,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 24px 52px rgba(15,23,42,0.08), 0 3px 10px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(123,153,197,0.18)",
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #FCFEFF 0%, #EDF5FF 100%)"
        : bg,
    padding: 16,
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(125,154,196,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 16,
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    borderRadius: 18,
    border:
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(125,154,196,0.18)"
        : border,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 14,
    boxShadow: "0 14px 28px rgba(15,23,42,0.045)",
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
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(130,146,172,0.16) 0%, rgba(130,146,172,0.10) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(130,146,172,0.14)",
    color: primary ? "#164AAE" : "#445C75",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "9px 13px",
    borderRadius: 13,
    border: "1px solid rgba(121,149,190,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F2F7FF 100%)",
    color: "#24415C",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
    fontWeight: 900,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F657B",
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
      "0 22px 58px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.08)",
  };
}

function documentWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 18,
    right: -14,
    transform: "rotate(-90deg)",
    transformOrigin: "top right",
    letterSpacing: 3.4,
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
    summary: false,
    merchantVerify: true,
    merchantView: false,
    evidence: true,
    notes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    summary: Boolean(raw?.summary ?? base.summary),
    merchantVerify: Boolean(raw?.merchantVerify ?? base.merchantVerify),
    merchantView: Boolean(raw?.merchantView ?? base.merchantView),
    evidence: Boolean(raw?.evidence ?? base.evidence),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

function normalizeTrustSlipSummary(raw: any): TrustSlipSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.summary || raw?.trust_slip || raw?.data || raw;
  if (!src || typeof src !== "object") return null;

  return {
    verified: src?.verified,
    active: src?.active,
    user_id: src?.user_id,
    clan_id: src?.clan_id,
    gmfn_id: firstTruthy(src?.gmfn_id),
    display_name: firstTruthy(src?.display_name),
    community: firstTruthy(src?.community),
    owner: src?.owner || null,
    phone_e164: firstTruthy(src?.phone_e164),
    phone_verified: src?.phone_verified,
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
    days_since_last_full_repayment:
      src?.days_since_last_full_repayment ?? null,
    cci_score: firstTruthy(src?.cci_score),
    cci_band: firstTruthy(src?.cci_band),
    graph_score: firstTruthy(src?.graph_score),
    active_clan_count: src?.active_clan_count ?? null,
    sponsor_count: src?.sponsor_count ?? null,
    unique_counterparties: src?.unique_counterparties ?? null,
    risk_flags: Array.isArray(src?.risk_flags) ? src.risk_flags : [],
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
    supersedes_trust_slip_id: src?.supersedes_trust_slip_id ?? null,
    superseded_by_trust_slip_id: src?.superseded_by_trust_slip_id ?? null,
    not_a_bank_guarantee: src?.not_a_bank_guarantee ?? null,
    no_auto_debit: src?.no_auto_debit ?? null,
    disclaimer: firstTruthy(src?.disclaimer),
    generated_at: firstTruthy(src?.generated_at),
    merchant_view: src?.merchant_view || null,
    verification_token: firstTruthy(src?.verification_token),
    verification_code: firstTruthy(src?.verification_code),
    token: firstTruthy(src?.token),
    public_verify_url: firstTruthy(src?.public_verify_url),
    community_id: firstTruthy(src?.community_id),
    community_global_id: firstTruthy(src?.community_global_id),
    community_code: firstTruthy(src?.community_code),
    clan_code: firstTruthy(src?.clan_code),
  };
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

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function TrustSlipPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-slip.route.dashboard"),
      verify: routeTarget("merchantVerify", selectedClanId, "trust-slip.route.verify"),
      trust: routeTarget("trust", selectedClanId, "trust-slip.route.trust"),
      guide: routeTarget("profile", selectedClanId, "trust-slip.route.guide"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_SLIP_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [summary, setSummary] = useState<TrustSlipSummary | null>(null);
  const guideItems = useMemo(() => buildTrustSlipGuideItems(), []);
  const actionGuide = useMemo(() => buildTrustSlipActionGuide(), []);
  const trustDocumentFamilyItems = useMemo(() => buildTrustDocumentFamilyItems(true), []);
  const trustDocumentUseCases = useMemo(
    () => buildTrustDocumentUseCaseItems(trustDocumentFamilyItems, "trust-slip"),
    [trustDocumentFamilyItems]
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
    writeLocalJSON(TRUST_SLIP_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

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
        const [meRes, clanRes, summaryRes] = await Promise.all([
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null),
          (async () => {
            const viaFn = await callFirstAvailable(
              [
                "getMyTrustSlipSummary",
                "getTrustSlipSummary",
                "getTrustSlipMeSummary",
                "getMyTrustSlip",
              ],
              [
                [],
                [{ clan_id: selectedClanId || undefined }],
                [
                  {
                    clan_id: selectedClanId || undefined,
                    header_clan_id: selectedClanId || undefined,
                  },
                ],
              ]
            );

            if (viaFn) return viaFn;

            const clanHeaders: Record<string, string> = {};
            if (selectedClanId) {
              clanHeaders["X-Clan-Id"] = String(selectedClanId);
            }

            return fetchFirstJson(
              [
                "/trust-slips/me/summary",
                "/trust-slips/me-summary",
                "/trust-slips/summary/me",
              ],
              clanHeaders
            );
          })(),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSummary(normalizeTrustSlipSummary(summaryRes));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const holderName = useMemo(() => {
    return (
      firstTruthy(
        summary?.merchant_view?.display_name,
        summary?.merchant_summary?.display_name,
        summary?.display_name,
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [summary, me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(
      summary?.merchant_view?.gmfn_id,
      summary?.merchant_summary?.gmfn_id,
      summary?.gmfn_id,
      me?.gmfn_id,
      "Pending"
    );
  }, [summary, me]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        summary?.merchant_view?.community,
        summary?.merchant_summary?.community,
        summary?.community,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [summary, currentClan, selectedClanId]);

  const communityRef = useMemo(() => {
    return (
      firstTruthy(
        summary?.community_global_id,
        summary?.community_code,
        summary?.clan_code,
        summary?.community_id,
        currentClan?.community_global_id,
        currentClan?.community_code,
        currentClan?.clan_code
      ) || "Pending"
    );
  }, [summary, currentClan]);

  const trustSlipCode = useMemo(() => {
    return firstTruthy(
      summary?.merchant_view?.code,
      summary?.verification_code,
      summary?.code,
      summary?.verification_token,
      summary?.token
    );
  }, [summary]);

  const verifyUrl = useMemo(() => {
    return firstTruthy(
      toApiAbsoluteUrl(summary?.public_verify_url || ""),
      trustSlipCode
        ? publicApiUrl(
            `/trust-slips/verify/${encodeURIComponent(trustSlipCode)}/page`
          )
        : ""
    );
  }, [summary, trustSlipCode]);

  const qrUrl = useMemo(() => {
    if (!trustSlipCode) return "";
    return publicApiUrl(
      `/trust-slips/verify/${encodeURIComponent(trustSlipCode)}/qr.png`
    );
  }, [trustSlipCode]);

  const merchantBand = firstTruthy(
    summary?.merchant_view?.band,
    summary?.merchant_summary?.band,
    summary?.band,
    summary?.level,
    "Pending"
  );

  const merchantTrustLimit = firstTruthy(
    summary?.merchant_view?.trust_limit,
    summary?.merchant_summary?.trust_limit,
    summary?.trust_limit,
    summary?.trust_slip_limit,
    "0.00"
  );

  const merchantCurrency = firstTruthy(
    summary?.merchant_view?.currency,
    summary?.merchant_summary?.currency,
    summary?.currency,
    "NGN"
  );

  const merchantVisibility = firstTruthy(
    summary?.merchant_view?.visibility_level,
    summary?.merchant_visibility_level,
    "standard"
  );

  const merchantVerifyActive = Boolean((summary as any)?.merchant_verify_active);
  const merchantVerifyRequired = Boolean(
    (summary as any)?.merchant_verify_subscription_required
  );
  const merchantVerifyDetail = firstTruthy(
    (summary as any)?.merchant_verify_detail,
    merchantVerifyActive
      ? "External merchant verification is active."
      : "External merchant verification requires an active Merchant Verify subscription."
  );
  const merchantViewVerified =
    summary?.merchant_view?.verified ?? summary?.verified ?? false;
  const merchantViewActive =
    summary?.merchant_view?.active ?? summary?.active ?? false;
  const merchantViewPhoneVerified =
    summary?.merchant_view?.phone_verified ?? summary?.phone_verified ?? false;

  const cciScore = firstTruthy(
    summary?.merchant_view?.cci_score,
    summary?.merchant_summary?.cci_score,
    summary?.cci_score,
    "Not stated"
  );

  const cciBand = firstTruthy(
    summary?.merchant_view?.cci_band,
    summary?.merchant_summary?.cci_band,
    summary?.cci_band,
    "Not stated"
  );

  const disclaimer = firstTruthy(
    summary?.merchant_view?.disclaimer,
    summary?.disclaimer,
    "TrustSlip is a portable summary derived from GSN trust history."
  );

  const capacityContext = summary?.evidence_summary?.capacity_context || null;

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCopy(text: string, successText: string, emptyText: string) {
    const value = safeStr(text);
    if (!value) {
      showNotice("error", emptyText);
      return;
    }

    api.safeCopy(value);
    showNotice("success", successText);
  }

  function handleGuideSelect(item: { to?: string }) {
    if (!item.to) return;
    navigateWithOrigin(navigate, item.to, location);
  }

  function copyTrustSlipSnapshot() {
    handleCopy(
      buildTrustSlipSnapshot({
        holderName,
        gmfnId,
        communityName,
        communityRef,
        trustSlipCode,
        merchantBand,
        merchantTrustLimit,
        merchantCurrency,
        cciBand,
        expiresAt: safeDateTime(summary?.expires_at) || "Not stated",
        verifyUrl,
      }),
      "TrustSlip snapshot copied.",
      "TrustSlip snapshot is not ready yet."
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
          sectionLabel="TrustSlip"
          title="TrustSlip"
          subtitle="Loading the TrustSlip summary..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading TrustSlip...
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
          sectionLabel="TrustSlip"
          title="TrustSlip"
          subtitle="Use TrustSlip to review the public trust summary. Open TrustSlip Verify when you need to confirm the current public reading."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />
      </div>

      <ExplainToggle
        label="What this screen does"
        what="TrustSlip is the portable public trust summary for your current trust state."
        why="It keeps the public-facing trust summary, code, expiry window, and verification route together in one shareable place."
        next="Start with the main TrustSlip summary, then use TrustSlip Verify when you need to confirm the current public reading."
        tone="blue"
      />

      <NextActionGuide
        storageKey="gmfn.trustSlip.nextActionGuide.v1"
        compact={isCompact}
        items={guideItems}
        intro="Say what you need next in simple words, like verify this code, explain the trust story, or open the identity side behind the same document."
        onSelect={handleGuideSelect}
      />

      <TrustDocumentActionGuide content={actionGuide} compact={isCompact} />

      <TrustDocumentFamilyMap
        compact={isCompact}
        items={trustDocumentFamilyItems}
        title="How TrustSlip fits into the wider trust-document family"
        intro="TrustSlip is the portable proof layer. Use this map when you need to separate the fuller Trust Passport story from the shorter outward-facing document and the public verification check that proves it is still current."
      />

      <TrustDocumentUseCases
        compact={isCompact}
        items={trustDocumentUseCases}
        title="Which trust question should stay in TrustSlip?"
        intro="Stay here when the task is carrying concise outward-facing proof. Move outward to public verification for current validity, or back inward to Trust Passport and Identity & Integrity when the fuller story matters."
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
          GSN TrustSlip
        </div>
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <span style={badge(true)}>Issued trust instrument</span>
              <span style={badge(false)}>Portable verification summary</span>
            </div>

            <div style={sectionLabel()}>Portable trust verification</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {trustSlipCode
                ? "Your TrustSlip summary is loaded"
                : "TrustSlip is still preparing"}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 840,
              }}
            >
              This shows your current portable trust state, verify link,
              code, CCI, trust limit, and institutional notes.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Holder: {holderName}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityName}</span>
              <span style={badge(false)}>Community ID: {communityRef}</span>
              <span style={badge(false)}>Current page: TrustSlip</span>
              <span style={badge(false)}>Current step: Review portable trust summary</span>
            </div>

            <CardActionRow style={{ marginTop: 16 }}>
              <PrimaryButton
                onClick={() =>
                  handleCopy(
                    trustSlipCode,
                    "TrustSlip code copied.",
                    "TrustSlip code is not ready yet."
                  )
                }
                disabled={!trustSlipCode}
                debugId="trust-slip.copy-code"
              >
                Copy TrustSlip Code
              </PrimaryButton>

              <SecondaryButton
                onClick={() =>
                  handleCopy(
                    verifyUrl,
                    "Verify link copied.",
                    "Verify link is not ready yet."
                  )
                }
                disabled={!verifyUrl}
                debugId="trust-slip.copy-verify-link"
              >
                Copy Verify Link
              </SecondaryButton>

              <SecondaryButton
                onClick={() =>
                  handleCopy(
                    gmfnId,
                    "GMFN ID copied.",
                    "GMFN ID is not ready yet."
                  )
                }
                disabled={!gmfnId || gmfnId === "Awaiting issue"}
                debugId="trust-slip.copy-gmfn-id"
              >
                Copy GMFN ID
              </SecondaryButton>

              <SubtleButton
                onClick={() => {
                  if (typeof window !== "undefined" && typeof window.print === "function") {
                    window.print();
                  }
                }}
                debugId="trust-slip.print"
              >
                Print TrustSlip
              </SubtleButton>

              <SubtleButton
                onClick={copyTrustSlipSnapshot}
                debugId="trust-slip.copy-snapshot"
              >
                Copy TrustSlip snapshot
              </SubtleButton>
            </CardActionRow>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.94)"),
              border: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={sectionLabel()}>Current portable reading</div>

            <ExplainToggle
              label="What this does"
              what="This portable reading summarizes the trust state that other people can verify from your current TrustSlip."
              why="It keeps the main public trust signals, document codes, and issue window visible in one place before you share or verify anything."
              next="Read the band, trust limit, CCI, and issue window here first, then use the TrustSlip code or verify route when needed."
              tone="light"
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Band</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {merchantBand}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Trust limit</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {merchantTrustLimit} {merchantCurrency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>CCI</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {cciScore} / {cciBand}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 12, ...helperText() }}>
              Status: {safeStr(summary?.status || "Awaiting issue")} - Visibility:{" "}
              {merchantVisibility}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 10,
              }}
            >
              <div style={documentMetaCard("rgba(255,255,255,0.98)")}>
                <div style={sectionLabel()}>Document reference</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  TrustSlip code: {trustSlipCode || "Awaiting issue"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Verification code: {safeStr(summary?.verification_code || "Not stated")}
                </div>
              </div>

              <div style={documentMetaCard("rgba(248,251,255,0.98)")}>
                <div style={sectionLabel()}>Issue window</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
                </div>
                <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
                  Expiry policy: {safeStr(summary?.expiry_policy || "Not stated")}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={documentFooterGrid(isCompact)}>
          <div>
            <div style={documentFooterLabel()}>Issue and expiry</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Verification control</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              TrustSlip code: {trustSlipCode || "Awaiting issue"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#D7E3F1" }}>
              Verify path: {verifyUrl || "Not available yet"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Institutional notice</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#D7E3F1" }}>
              {disclaimer}
            </div>
          </div>
        </div>
      </section>

      <section
        id="merchant-verify-portal"
        className="print-trust-support"
        style={pageCard("#FFFFFF")}
      >
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
            <div style={sectionLabel()}>Merchant verification</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep this separate from TrustSlip Verify. It controls whether outside merchants can use the public verification page.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("merchantVerify")}
            style={collapseToggle()}
            debugId="trust-slip.toggle-merchant-verify"
          >
            {collapsed.merchantVerify ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.merchantVerify ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "170px minmax(0, 1fr)",
              gap: 16,
              alignItems: "center",
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              {trustSlipCode ? (
                <img
                  src={qrUrl}
                  alt="TrustSlip QR"
                  style={{
                    width: 144,
                    height: 144,
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#FFFFFF",
                    padding: 6,
                    objectFit: "contain",
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 144,
                    height: 144,
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.10)",
                    background: "#F8FBFF",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#64748B",
                    fontSize: 13,
                    textAlign: "center",
                    padding: 12,
                  }}
                >
                  QR code appears here when TrustSlip is ready
                </div>
              )}

              <div
                style={{
                  fontSize: 12,
                  color: "#64748B",
                  fontWeight: 700,
                  textAlign: "center",
                }}
              >
                Scan to verify
                <div style={{ marginTop: 6, color: "#94A3B8", fontWeight: 800 }}>
                  Formal verification instrument
                </div>
              </div>
            </div>

            <div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(merchantVerifyActive)}>
                  {merchantVerifyActive ? "Merchant Verify active" : "Merchant Verify inactive"}
                </span>
                <span style={badge(false)}>
                  {merchantVerifyRequired ? "Subscription required" : "Subscription satisfied"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Open or share the verify page
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {merchantVerifyDetail}
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Unlock result:{" "}
                {merchantVerifyActive
                  ? "Outside merchants can use this verification page now."
                  : merchantVerifyRequired
                    ? "Outside merchants cannot use this verification page until Merchant Verify is active."
                    : "This verification page is not active for outside merchants yet."}
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Verified: {String(merchantViewVerified)} - Active:{" "}
                {String(merchantViewActive)} - Phone verified:{" "}
                {String(merchantViewPhoneVerified)}
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Code: {trustSlipCode || "Awaiting issue"}
                </span>
                <span style={badge(false)}>
                  Visibility: {merchantVisibility}
                </span>
                <span style={badge(false)}>
                  Status: {safeStr(summary?.status || "Awaiting issue")}
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Verify link: {verifyUrl || "Not available yet"}
                </div>
                <div style={helperText()}>
                  Expires: {safeStr(summary?.expires_at) ? safeDateTime(summary?.expires_at) : "No expiry stated"}
                </div>
              </div>

              <CardActionRow style={{ marginTop: 14 }}>
                <StableCtaLink
                  to={routes.verify}
                  kind="primary"
                  debugId="trust-slip.open-verify"
                >
                  Open TrustSlip Verify
                </StableCtaLink>

                <SecondaryButton
                  onClick={() =>
                    handleCopy(
                      verifyUrl,
                      "Verify link copied.",
                      "Verify link is not ready yet."
                    )
                  }
                  disabled={!verifyUrl}
                  debugId="trust-slip.copy-verify-link-merchant"
                >
                  Copy Verify Link
                </SecondaryButton>

                {verifyUrl ? (
                  <StableCtaLink
                    to={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    kind="soft"
                    debugId="trust-slip.open-merchant-verify"
                  >
                    Open Merchant Verify
                  </StableCtaLink>
                ) : null}
              </CardActionRow>
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
            <div style={sectionLabel()}>Merchant-facing view</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Everything a merchant needs to read stays together here.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("merchantView")}
            style={collapseToggle()}
            debugId="trust-slip.toggle-merchant-view"
          >
            {collapsed.merchantView ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.merchantView ? (
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
                Merchant summary
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  GSN ID: {safeStr(summary?.merchant_summary?.gmfn_id || gmfnId)}
                </div>
                <div style={helperText()}>
                  Code: {safeStr(summary?.merchant_summary?.code || trustSlipCode || "Awaiting issue")}
                </div>
                <div style={helperText()}>
                  Community: {safeStr(summary?.merchant_summary?.community || communityName)}
                </div>
                <div style={helperText()}>
                  Band: {safeStr(summary?.merchant_summary?.band || merchantBand)}
                </div>
                <div style={helperText()}>
                  Trust limit: {safeStr(summary?.merchant_summary?.trust_limit || merchantTrustLimit)}{" "}
                  {safeStr(summary?.merchant_summary?.currency || merchantCurrency)}
                </div>
                <div style={helperText()}>
                  CCI: {safeStr(summary?.merchant_summary?.cci_score || cciScore)} /{" "}
                  {safeStr(summary?.merchant_summary?.cci_band || cciBand)}
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
                Merchant view
              </div>

              <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span style={badge(merchantViewActive)}>
                  {merchantViewActive
                    ? "Usable now"
                    : "Not active yet"}
                </span>
                <span style={badge(false)}>
                  {merchantViewVerified
                    ? "Verified"
                    : "Not yet verified"}
                </span>
                <span style={badge(false)}>
                  Visibility: {safeStr(summary?.merchant_view?.visibility_level || merchantVisibility)}
                </span>
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Verified: {String(merchantViewVerified)}
                </div>
                <div style={helperText()}>
                  Active: {String(merchantViewActive)}
                </div>
                <div style={helperText()}>
                  Status: {safeStr(summary?.merchant_view?.status || summary?.status || "Awaiting issue")}
                </div>
                <div style={helperText()}>
                  Visibility level: {safeStr(summary?.merchant_view?.visibility_level || merchantVisibility)}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(summary?.merchant_view?.expires_at || summary?.expires_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Phone verified: {String(merchantViewPhoneVerified)}
                </div>
                <div style={helperText()}>
                  Decision reading:{" "}
                  {merchantViewActive
                    ? "A merchant can rely on this verification view now."
                    : "A merchant cannot rely on this verification view yet."}
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
            <div style={sectionLabel()}>Evidence and exposure context</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Capacity and exposure indicators appear here.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("evidence")}
            style={collapseToggle()}
            debugId="trust-slip.toggle-evidence"
          >
            {collapsed.evidence ? "Open" : "Collapse"}
          </SubtleButton>
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
                Network signal
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Graph score: {safeStr(summary?.graph_score || "Not stated")}
                </div>
                <div style={helperText()}>
                  Active clan count: {safeStr(summary?.active_clan_count ?? "0")}
                </div>
                <div style={helperText()}>
                  Sponsor count: {safeStr(summary?.sponsor_count ?? "0")}
                </div>
                <div style={helperText()}>
                  Unique counterparties: {safeStr(summary?.unique_counterparties ?? "0")}
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
                Recent trust context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Issued: {safeDateTime(summary?.issued_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(summary?.expires_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Last release: {safeDateTime(summary?.last_release_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Last full repayment: {safeDateTime(summary?.last_full_repayment_at) || "Not stated"}
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
            <div style={sectionLabel()}>Institutional notes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the disclaimers and related trust pages clearly visible.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("notes")}
            style={collapseToggle()}
            debugId="trust-slip.toggle-notes"
          >
            {collapsed.notes ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.notes ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
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
                Institutional note
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                {disclaimer}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Not a bank guarantee: {String(Boolean(summary?.not_a_bank_guarantee))}
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                No auto-debit: {String(Boolean(summary?.no_auto_debit))}
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
                Trust Passport
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Trust Passport explains the full trust story. TrustSlip proves the portable state.
              </div>

              <div style={{ marginTop: 12 }}>
                <StableCtaLink to={routes.trust} debugId="trust-slip.open-trust">
                  Open Trust Passport
                </StableCtaLink>
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
                Executive summary PDF
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Keep the executive summary visible here so reviewers can open the current institutional summary when needed.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <StableCtaLink
                  to={GMFN_EXEC_SUMMARY_URL}
                  target="_blank"
                  rel="noreferrer"
                  debugId="trust-slip.open-executive-summary"
                >
                  Open Executive Summary
                </StableCtaLink>

                <StableCtaLink
                  to={routes.guide}
                  kind="soft"
                  debugId="trust-slip.open-guide"
                >
                  Open Guide
                </StableCtaLink>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}




