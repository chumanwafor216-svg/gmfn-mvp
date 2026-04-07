import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";

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
  clan_code?: string | null;
};

const TRUST_SLIP_UI_STORAGE_KEY = "gmfn.trustSlip.sections.v3";
const GSN_EXEC_SUMMARY_URL = "/gsn-executive-summary.pdf";

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

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "http://127.0.0.1:8012";
    }
  }

  return "http://127.0.0.1:8012";
}

function absoluteUrl(pathOrUrl: string): string {
  const raw = safeStr(pathOrUrl);
  if (!raw) return "";

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (typeof window !== "undefined" && raw.startsWith("/")) {
    return `${window.location.origin}${raw}`;
  }

  return raw;
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
    whiteSpace: "nowrap",
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

function defaultCollapseState(): CollapseState {
  return {
    summary: false,
    merchantVerify: false,
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

export default function TrustSlipPage() {
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

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
          callFirstAvailable(
            [
              "getMyTrustSlipSummary",
              "getTrustSlipSummary",
              "getTrustSlipMeSummary",
              "getMyTrustSlip",
            ],
            [[], [{ clan_id: selectedClanId || undefined }]]
          ),
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
    return firstTruthy(summary?.gmfn_id, me?.gmfn_id, "Pending");
  }, [summary, me]);

  const communityName = useMemo(() => {
    return (
      firstTruthy(
        summary?.community,
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No selected community")
    );
  }, [summary, currentClan, selectedClanId]);
  const communityRef = useMemo(() => {
    return (
      firstTruthy(
        summary?.community_id,
        summary?.community_global_id,
        summary?.clan_code,
        currentClan?.community_code,
        currentClan?.community_id,
        currentClan?.marketplace_id,
        currentClan?.clan_code,
        summary?.clan_id,
        currentClan?.clan_id,
        selectedClanId
      ) || "Pending"
    );
  }, [summary, currentClan, selectedClanId]);
  const trustSlipCode = safeStr(
    summary?.verification_code ||
      summary?.code ||
      summary?.verification_token ||
      summary?.token
  );

  const verifyUrl = useMemo(() => {
    return absoluteUrl(
      firstTruthy(
        summary?.public_verify_url,
        summary?.merchant_view?.code
          ? `/trust-slips/verify/${encodeURIComponent(
              safeStr(summary.merchant_view.code)
            )}/page`
          : "",
        trustSlipCode
          ? `/trust-slips/verify/${encodeURIComponent(trustSlipCode)}/page`
          : ""
      )
    );
  }, [summary, trustSlipCode]);

  const qrUrl = useMemo(() => {
    if (!trustSlipCode) return "";
    return `${apiOrigin()}/trust-slips/verify/${encodeURIComponent(
      trustSlipCode
    )}/qr.png`;
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

  const cciScore = firstTruthy(
    summary?.merchant_view?.cci_score,
    summary?.merchant_summary?.cci_score,
    summary?.cci_score,
    "—"
  );

  const cciBand = firstTruthy(
    summary?.merchant_view?.cci_band,
    summary?.merchant_summary?.cci_band,
    summary?.cci_band,
    "—"
  );

  const disclaimer = firstTruthy(
    summary?.merchant_view?.disclaimer,
    summary?.disclaimer,
    "TrustSlip is a portable summary derived from GMFN trust history."
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

    if (typeof (api as any).safeCopy === "function") {
      (api as any).safeCopy(value);
    } else if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(value);
    }

    showNotice("success", successText);
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
          subtitle="Preparing the portable trust verification surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Trust Passport", to: "/app/trust" },
            { label: "Notifications", to: "/app/notifications" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[{ label: "My GMFN and I", to: "/app/my-gmfn-and-i" }]}
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
      <PageTopNav
        sectionLabel="TrustSlip"
        title="TrustSlip"
        subtitle="TrustSlip is the portable proof surface. Merchant Verify is now driven by the real TrustSlip summary payload."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Trust Passport", to: "/app/trust" },
          { label: "Notifications", to: "/app/notifications" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[{ label: "My GMFN and I", to: "/app/my-gmfn-and-i" }]}
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
              : "minmax(0, 1.05fr) minmax(320px, 0.95fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Portable trust verification</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.12,
              }}
            >
              {trustSlipCode ? "Your TrustSlip summary is loaded" : "TrustSlip is still preparing"}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 840 }}>
              This page now reads the real TrustSlip summary payload. It carries the merchant-facing trust state, verify link, code, CCI, trust limit, and institutional notes.
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
                onClick={() =>
                  handleCopy(
                    trustSlipCode,
                    "TrustSlip code copied.",
                    "TrustSlip code is not ready yet."
                  )
                }
                style={actionBtn("primary", !trustSlipCode)}
                disabled={!trustSlipCode}
              >
                Copy TrustSlip Code
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopy(
                    verifyUrl,
                    "Verify link copied.",
                    "Verify link is not ready yet."
                  )
                }
                style={actionBtn("secondary", !verifyUrl)}
                disabled={!verifyUrl}
              >
                Copy Verify Link
              </button>

              <button
                type="button"
                onClick={() =>
                  handleCopy(gmfnId, "GMFN ID copied.", "GMFN ID is not ready yet.")
                }
                style={actionBtn("secondary", !gmfnId || gmfnId === "Pending")}
                disabled={!gmfnId || gmfnId === "Pending"}
              >
                Copy GMFN ID
              </button>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current portable reading</div>

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
              Status: {safeStr(summary?.status || "Pending")} • Visibility: {merchantVisibility}
            </div>
          </div>
        </div>
      </section>

      <section id="merchant-verify-portal" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Merchant Verify Portal</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This block now reads the actual verification fields from TrustSlip summary.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("merchantVerify")}
            style={collapseToggle()}
          >
            {collapsed.merchantVerify ? "Open" : "Collapse"}
          </button>
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
                  QR appears here when TrustSlip is ready
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
              </div>
            </div>

            <div>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Open or share the verify page
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Verified: {String(Boolean(summary?.verified))} • Active: {String(Boolean(summary?.active))} • Phone verified: {String(Boolean(summary?.phone_verified))}
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
                  Code: {trustSlipCode || "Pending"}
                </span>
                <span style={badge(false)}>
                  Visibility: {merchantVisibility}
                </span>
                <span style={badge(false)}>
                  Status: {safeStr(summary?.status || "Pending")}
                </span>
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                {verifyUrl ? (
                  <a
                    href={verifyUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={actionBtn("primary")}
                  >
                    Open Merchant Verify
                  </a>
                ) : (
                  <button type="button" style={actionBtn("primary", true)} disabled>
                    Open Merchant Verify
                  </button>
                )}

                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      verifyUrl,
                      "Verify link copied.",
                      "Verify link is not ready yet."
                    )
                  }
                  disabled={!verifyUrl}
                  style={actionBtn("secondary", !verifyUrl)}
                >
                  Copy Verify Link
                </button>
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
            <div style={sectionLabel()}>Merchant-facing view</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The merchant-facing summary and merchant view stay together here.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("merchantView")}
            style={collapseToggle()}
          >
            {collapsed.merchantView ? "Open" : "Collapse"}
          </button>
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
                  GMFN ID: {safeStr(summary?.merchant_summary?.gmfn_id || gmfnId)}
                </div>
                <div style={helperText()}>
                  Code: {safeStr(summary?.merchant_summary?.code || trustSlipCode || "Pending")}
                </div>
                <div style={helperText()}>
                  Community: {safeStr(summary?.merchant_summary?.community || communityName)}
                </div>
                <div style={helperText()}>
                  Band: {safeStr(summary?.merchant_summary?.band || merchantBand)}
                </div>
                <div style={helperText()}>
                  Trust limit: {safeStr(summary?.merchant_summary?.trust_limit || merchantTrustLimit)} {safeStr(summary?.merchant_summary?.currency || merchantCurrency)}
                </div>
                <div style={helperText()}>
                  CCI: {safeStr(summary?.merchant_summary?.cci_score || cciScore)} / {safeStr(summary?.merchant_summary?.cci_band || cciBand)}
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

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Verified: {String(Boolean(summary?.merchant_view?.verified ?? summary?.verified))}
                </div>
                <div style={helperText()}>
                  Active: {String(Boolean(summary?.merchant_view?.active ?? summary?.active))}
                </div>
                <div style={helperText()}>
                  Status: {safeStr(summary?.merchant_view?.status || summary?.status || "Pending")}
                </div>
                <div style={helperText()}>
                  Visibility level: {safeStr(summary?.merchant_view?.visibility_level || merchantVisibility)}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(summary?.merchant_view?.expires_at || summary?.expires_at) || "Not stated"}
                </div>
                <div style={helperText()}>
                  Phone verified: {String(Boolean(summary?.merchant_view?.phone_verified ?? summary?.phone_verified))}
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
              This is where capacity and exposure indicators from the payload appear.
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
                Network signal
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Graph score: {safeStr(summary?.graph_score || "—")}
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
                  Issued: {safeDateTime(summary?.issued_at) || "—"}
                </div>
                <div style={helperText()}>
                  Expires: {safeDateTime(summary?.expires_at) || "—"}
                </div>
                <div style={helperText()}>
                  Last release: {safeDateTime(summary?.last_release_at) || "—"}
                </div>
                <div style={helperText()}>
                  Last full repayment: {safeDateTime(summary?.last_full_repayment_at) || "—"}
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

          <button
            type="button"
            onClick={() => toggleSection("notes")}
            style={collapseToggle()}
          >
            {collapsed.notes ? "Open" : "Collapse"}
          </button>
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
                <Link to="/app/trust" style={actionBtn("secondary")}>
                  Open Trust Passport
                </Link>
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
                Keep the GSN executive summary visible from the trust side. Put the file in <strong style={{ color: "#0B1F33" }}>/public/gsn-executive-summary.pdf</strong> and the button opens it. 
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <a
                  href={GSN_EXEC_SUMMARY_URL}
                  target="_blank"
                  rel="noreferrer"
                  style={actionBtn("secondary")}
                >
                  Open PDF
                </a>

                <Link to="/app/my-gmfn-and-i" style={actionBtn("soft")}>
                  Open Guide
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}