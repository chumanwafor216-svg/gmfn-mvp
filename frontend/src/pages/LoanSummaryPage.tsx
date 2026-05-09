import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  decideLoanGuarantor,
  getAccessToken,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanGuarantors,
  getLoanSummary,
  listExpectedPayments,
  getMe,
  getRevenueAllocation,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type MeLite = {
  id?: number | string;
  gmfn_id?: string | null;
  email?: string;
  role?: string;
  display_name?: string | null;
  nickname?: string | null;
  name?: string | null;
  first_name?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
  display_name?: string | null;
  title?: string | null;
  community_code?: string | null;
  role?: string | null;
  member_role?: string | null;
  membership_role?: string | null;
  participant_role?: string | null;
  community_image_url?: string | null;
  profile_image_url?: string | null;
  marketplace_image_url?: string | null;
  cover_image_url?: string | null;
  banner_url?: string | null;
  image_url?: string | null;
  logo_url?: string | null;
  community?: any;
  profile?: any;
  marketplace?: any;
};

type LoanSummary = {
  id: number;
  clan_id?: number;
  status: string;
  amount: number;
  currency?: string;
  guarantors_required?: number;
  created_at?: string | null;
  due_at?: string | null;
  purpose?: string | null;
  note?: string | null;
  remaining_amount?: number | string | null;
  paid_total?: number | string | null;
};

type LoanGuarantor = {
  id?: number;
  guarantor_user_id: number;
  guarantor_email?: string;
  guarantor_name?: string | null;
  status: string;
  pledge_amount?: number | string | null;
  is_locked?: boolean;
  locked_amount?: number | string | null;
  released_amount?: number | string | null;
  responded_at?: string | null;
};

type TrustEvent = {
  id?: number;
  event_type?: string;
  created_at?: string;
  meta_json?: any;
  meta?: any;
};

type Repayment = {
  id?: number;
  amount: number | string;
  created_at?: string;
};

type ExpectedPayment = {
  id?: number | string | null;
  expected_type?: string | null;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  reference_display?: string | null;
  reference_normalized?: string | null;
  confirmed_at?: string | null;
  due_at?: string | null;
  status_reason?: string | null;
  matched_bank_event_id?: number | string | null;
  meta?: any;
  meta_json?: any;
  loan_id?: number | string | null;
};

type Suggestion = {
  user_id: number;
  email?: string;
  gmfn_id?: string | null;
  display_name?: string | null;
  cci?: number | string;
  recommended_pledge?: number | string;
  reason?: string | null;
};

type RevenuePreview = {
  service_fee?: string | number | null;
  guarantor_pool?: string | number | null;
  platform_revenue?: string | number | null;
  net_disbursed_amount?: string | number | null;
};

type FeedbackTone = "success" | "error";

type CollapseState = {
  overview: boolean;
  guarantors: boolean;
  repayment: boolean;
  evidence: boolean;
  routes: boolean;
};

const LOAN_SUMMARY_UI_STORAGE_KEY = "gmfn.loanSummary.sections.v1";

function safeItems<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.items)) return res.items as T[];
  if (Array.isArray(res.data?.items)) return res.data.items as T[];
  return [];
}

const n = (x: any) => {
  const raw = String(x ?? "").trim().replace(/,/g, "");
  const num = Number(raw);
  return Number.isFinite(num) ? num : 0;
};

const lc = (x: any) => String(x ?? "").toLowerCase().trim();
const safeStr = (x: any) => String(x ?? "").trim();

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function fmtMoney(value: any, currency: string): string {
  return `${n(value).toFixed(2)} ${currency}`;
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    padding: 22,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    border: "1px solid rgba(108,138,184,0.18)",
    boxShadow: "0 24px 52px rgba(15,23,42,0.08)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #FCFEFF 0%, #EDF5FF 100%)"
        : bg,
    border: "1px solid rgba(123,153,197,0.18)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    border: "1px solid rgba(125,154,196,0.18)",
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)"
        : bg,
    border: "1px solid rgba(122,152,195,0.18)",
    boxShadow: "0 14px 30px rgba(15,23,42,0.05)",
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    isolation: "isolate",
    pointerEvents: "auto",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "none",
    outlineOffset: 4,
    lineHeight: 1.2,
  };
}

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onMouseDown: guardButtonPress,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    minWidth: 0,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.22)"
      : "1px solid rgba(122,152,195,0.18)",
    background: primary
      ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.12) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.16) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(248,252,255,0.998) 0%, rgba(226,237,250,0.986) 100%)"
      : "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(234,243,251,0.986) 100%)",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary
      ? "0 16px 34px rgba(29,95,212,0.10)"
      : "0 14px 30px rgba(15,23,42,0.05)",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    minWidth: 132,
    padding: "12px 16px",
    borderRadius: 15,
    border: "none",
    background: disabled
      ? "#CBD5E1"
      : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
    color: "#FFFFFF",
    fontWeight: 1000,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled ? "none" : "0 14px 30px rgba(29,95,212,0.26)",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 54,
    minWidth: 132,
    padding: "12px 16px",
    borderRadius: 15,
    border: "1px solid rgba(20,52,83,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #E8F1FB 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    opacity: disabled ? 0.86 : 1,
    boxShadow: "0 12px 24px rgba(15,23,42,0.06)",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 120,
    padding: "9px 13px",
    borderRadius: 12,
    border: "1px solid rgba(20,52,83,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #E8F1FB 100%)",
    color: "#213D59",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    boxShadow: "0 10px 22px rgba(15,23,42,0.06)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4A627A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(247,250,254,0.98) 0%, rgba(228,238,248,0.80) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(20,52,83,0.16)",
    color: primary ? "#164AAE" : "#496178",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#405A72",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function feedbackCard(tone: FeedbackTone): React.CSSProperties {
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

function authHeaders(clanId?: number) {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const token = getAccessToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  if (Number(clanId || 0) > 0) {
    headers["X-Clan-Id"] = String(clanId);
  }

  return headers;
}

async function fetchJson(path: string, clanId?: number): Promise<any> {
  const res = await fetch(apiUrl(path), {
    method: "GET",
    headers: authHeaders(clanId),
    credentials: "include",
  });

  if (!res.ok) {
    const message = await res.text().catch(() => "");
    throw new Error(message || `HTTP ${res.status}`);
  }

  const text = await res.text().catch(() => "");
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseMetaObj(meta: any): Record<string, any> | null {
  if (meta == null) return null;

  try {
    if (typeof meta === "string") {
      const s = meta.trim();
      if (
        (s.startsWith("{") && s.endsWith("}")) ||
        (s.startsWith("[") && s.endsWith("]"))
      ) {
        const parsed = JSON.parse(s);
        return parsed && typeof parsed === "object" && !Array.isArray(parsed)
          ? parsed
          : null;
      }
      return null;
    }

    if (typeof meta === "object" && !Array.isArray(meta)) {
      return meta as Record<string, any>;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeCommunityName(clan: CommunityLite | null, selectedClanId: number): string {
  return (
    firstTruthy(
      clan?.marketplace_name,
      clan?.name,
      clan?.display_name,
      clan?.title
    ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
  );
}

function normalizeCommunityId(clan: CommunityLite | null): string {
  return (
    firstTruthy(
      clan?.community_code,
      clan?.community?.community_code,
      clan?.profile?.community_code,
      clan?.marketplace?.community_code
    ) || "Pending"
  );
}

function normalizeCommunityRole(clan: CommunityLite | null): string {
  return (
    firstTruthy(
      clan?.role,
      clan?.member_role,
      clan?.membership_role,
      clan?.participant_role
    ) || ""
  );
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const raw = safeStr(path);
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

function apiOrigin(): string {
  const base = apiBase();

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const u = new URL(base);
      return `${u.protocol}//${u.host}`;
    } catch {
      return "";
    }
  }

  if (typeof window !== "undefined") {
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  }

  return "";
}

function resolveMediaUrl(src: string): string {
  const raw = safeStr(src);
  if (!raw) return "";

  if (
    raw.startsWith("http://") ||
    raw.startsWith("https://") ||
    raw.startsWith("data:") ||
    raw.startsWith("blob:")
  ) {
    return raw;
  }

  const origin = apiOrigin();
  if (!origin) return raw;

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
}

function communityImageSrc(clan: CommunityLite | null): string {
  const raw = firstTruthy(
    clan?.community_image_url,
    clan?.profile_image_url,
    clan?.marketplace_image_url,
    clan?.cover_image_url,
    clan?.banner_url,
    clan?.image_url,
    clan?.logo_url,
    clan?.community?.community_image_url,
    clan?.community?.image_url,
    clan?.profile?.profile_image_url
  );

  return resolveMediaUrl(raw);
}

function defaultCollapseState(): CollapseState {
  return {
    overview: false,
    guarantors: false,
    repayment: false,
    evidence: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    guarantors: Boolean(raw?.guarantors ?? base.guarantors),
    repayment: Boolean(raw?.repayment ?? base.repayment),
    evidence: Boolean(raw?.evidence ?? base.evidence),
    routes: Boolean(raw?.routes ?? base.routes),
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

function statusBadge(status: string) {
  const s = lc(status);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
  };

  if (s === "approved" || s === "disbursed") {
    return (
      <span
        style={{
          ...base,
          background: "#ecfdf5",
          color: "#065f46",
          borderColor: "#a7f3d0",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "pending") {
    return (
      <span
        style={{
          ...base,
          background: "#eff6ff",
          color: "#1e40af",
          borderColor: "#bfdbfe",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "repaid") {
    return (
      <span
        style={{
          ...base,
          background: "#f0fdf4",
          color: "#166534",
          borderColor: "#bbf7d0",
        }}
      >
        {s.toUpperCase()}
      </span>
    );
  }

  if (s === "rejected" || s === "declined" || s === "cancelled") {
    return (
      <span
        style={{
          ...base,
          background: "#fef2f2",
          color: "#991b1b",
          borderColor: "#fecaca",
        }}
      >
        {(status || "REJECTED").toUpperCase()}
      </span>
    );
  }

  return (
    <span style={{ ...base, background: "#f9fafb", color: "#374151" }}>
      {(status || "UNKNOWN").toUpperCase()}
    </span>
  );
}

function guarantorBadge(status: string) {
  const s = lc(status);
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "2px 8px",
    borderRadius: 999,
    border: "1px solid #e5e7eb",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    textAlign: "center",
  };

  if (s === "approved") {
    return (
      <span
        style={{
          ...base,
          background: "#ecfdf5",
          color: "#065f46",
          borderColor: "#a7f3d0",
        }}
      >
        APPROVED
      </span>
    );
  }

  if (s === "declined") {
    return (
      <span
        style={{
          ...base,
          background: "#fef2f2",
          color: "#991b1b",
          borderColor: "#fecaca",
        }}
      >
        DECLINED
      </span>
    );
  }

  if (s === "expired") {
    return (
      <span
        style={{
          ...base,
          background: "#f9fafb",
          color: "#374151",
          borderColor: "#e5e7eb",
        }}
      >
        EXPIRED
      </span>
    );
  }

  return (
    <span
      style={{
        ...base,
        background: "#eff6ff",
        color: "#1e40af",
        borderColor: "#bfdbfe",
      }}
    >
      PENDING
    </span>
  );
}

function nextStepText(status: string) {
  const s = lc(status);

  if (s === "pending") {
    return "Next: review guarantor movement, keep the pending decisions moving, and stay inside the support flow until the approval picture is clear.";
  }

  if (s === "approved") {
    return "Next: the loan is approved. Repayment and finance evidence become the main actions.";
  }

  if (s === "disbursed") {
    return "Next: repayments should continue according to the active support flow.";
  }

  if (s === "repaid") {
    return "Completed: this loan has been fully repaid.";
  }

  if (s === "rejected" || s === "declined" || s === "cancelled") {
    return "Stopped: this loan was rejected or cancelled. Return to preparation before starting a new request.";
  }

  return "Next: review guarantors, evidence, and repayment state for this loan.";
}

export default function LoanSummaryPage() {
  const { loanId } = useParams();
  const numericLoanId = Number(loanId || 0);
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOAN_SUMMARY_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [me, setMe] = useState<MeLite | null>(null);
  const [currentClan, setCurrentClan] = useState<CommunityLite | null>(null);
  const [summary, setSummary] = useState<LoanSummary | null>(null);
  const [guarantors, setGuarantors] = useState<LoanGuarantor[]>([]);
  const [repayments, setRepayments] = useState<Repayment[]>([]);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPayment[]>([]);
  const [events, setEvents] = useState<TrustEvent[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [revenuePreview, setRevenuePreview] = useState<RevenuePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyDecisionKey, setBusyDecisionKey] = useState("");
  const [feedback, setFeedback] = useState<{
    tone: FeedbackTone;
    text: string;
  } | null>(null);

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
    writeLocalJSON(LOAN_SUMMARY_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  const currency = summary?.currency ?? "NGN";
  const isAdmin =
    lc(firstTruthy(me?.role, (me as any)?.account_role, (me as any)?.user_role)) ===
    "admin";
  const canOpenCommandRevenue =
    isAdmin || lc(normalizeCommunityRole(currentClan)) === "admin";
  const revenueRoute = canOpenCommandRevenue
    ? "/app/command-center/revenue-allocation"
    : "/app/finance";

  const requiredCount = n(summary?.guarantors_required);
  const approvedCount = guarantors.filter((g) => lc(g.status) === "approved").length;
  const pendingGuarantors = guarantors.filter(
    (g) => lc(g.status) === "pending" && g.id != null
  );

  const loanStatus = lc(summary?.status);
  const canActOnGuarantors = loanStatus === "pending";
  const canRepay = loanStatus === "approved" || loanStatus === "disbursed";
  const supportItemActive =
    loanStatus === "pending" ||
    loanStatus === "approved" ||
    loanStatus === "disbursed";

  const latestEvent = useMemo(() => {
    const xs = [...events].filter((e) => !!e.created_at);
    xs.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return xs[0] || null;
  }, [events]);

  const latestMeta = useMemo(
    () => parseMetaObj(latestEvent?.meta_json ?? latestEvent?.meta),
    [latestEvent]
  );

  const latestReason = safeStr(latestMeta?.reason || "");
  const latestNote = safeStr(latestMeta?.note || latestMeta?.message || "");

  const latestRepaymentExpectedPayment = useMemo(() => {
    const rows = [...expectedPayments];
    rows.sort((a, b) => {
      const ta = new Date(
        firstTruthy(a?.confirmed_at, a?.due_at, a?.meta?.created_at, a?.meta_json?.created_at)
      ).getTime();
      const tb = new Date(
        firstTruthy(b?.confirmed_at, b?.due_at, b?.meta?.created_at, b?.meta_json?.created_at)
      ).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return rows[0] || null;
  }, [expectedPayments]);

  const memberName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const gmfnId = useMemo(() => firstTruthy(me?.gmfn_id, "Pending"), [me]);

  const communityLabel = useMemo(
    () => normalizeCommunityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );

  const communityPublicId = useMemo(
    () => normalizeCommunityId(currentClan),
    [currentClan]
  );

  const memberRole = useMemo(
    () => normalizeCommunityRole(currentClan),
    [currentClan]
  );

  const pictureSrc = useMemo(() => communityImageSrc(currentClan), [currentClan]);

  const refreshAll = useCallback(async () => {
    setLoading(true);

    try {
      const meRes = await getMe().catch(() => null);
      const clanRes = await getCurrentClan().catch(() => null);

      if (meRes) {
        setMe({
          id: meRes.id,
          gmfn_id: meRes.gmfn_id,
          email: meRes.email,
          role: meRes.role,
          display_name: meRes.display_name,
          nickname: meRes.nickname,
          name: meRes.name,
          first_name: meRes.first_name,
        });
      } else {
        setMe(null);
      }

      setCurrentClan(clanRes || null);

      const summaryRes = (await getLoanSummary(numericLoanId)) as LoanSummary;
      setSummary(summaryRes);

      const loanClanId = Number(summaryRes?.clan_id || selectedClanId || 0);

      const [guarantorRes, suggestionsRes, revenueRes] = await Promise.all([
        getLoanGuarantors(numericLoanId, {
          clan_id: loanClanId || undefined,
        }).catch(() => ({ items: [] })),
        getLoanGuarantorSuggestions(numericLoanId, {
          clan_id: loanClanId || undefined,
          limit: 10,
        }).catch(() => ({ items: [] })),
        getRevenueAllocation(numericLoanId).catch(() => null),
      ]);

      setGuarantors(safeItems<LoanGuarantor>(guarantorRes));
      setSuggestions(safeItems<Suggestion>(suggestionsRes));
      setRevenuePreview(
        revenueRes ? (revenueRes?.item || revenueRes?.data || revenueRes) : null
      );

      try {
        const repaymentsRes = await fetchJson(
          `/api/loans/${Number(summaryRes.id)}/repayments`,
          loanClanId || undefined
        );
        setRepayments(safeItems<Repayment>(repaymentsRes));
      } catch {
        setRepayments([]);
      }

      try {
        const expectedRes = await listExpectedPayments({
          clan_id: loanClanId || undefined,
          expected_type: "repayment",
          limit: 100,
        }).catch(() => null);

        const expectedItems = Array.isArray(expectedRes)
          ? expectedRes
          : Array.isArray((expectedRes as any)?.items)
          ? (expectedRes as any).items
          : Array.isArray((expectedRes as any)?.data?.items)
          ? (expectedRes as any).data.items
          : [];

        setExpectedPayments(
          expectedItems.filter((item: any) => {
            const itemLoanId = Number(
              item?.loan_id || item?.meta?.loan_id || item?.meta_json?.loan_id || 0
            );
            return itemLoanId === Number(summaryRes.id);
          }) as ExpectedPayment[]
        );
      } catch {
        setExpectedPayments([]);
      }

      try {
        const eventsRes = await fetchJson(
          `/api/admin/trust-events/recent?limit=20&loan_id=${Number(summaryRes.id)}&clan_id=${loanClanId}`,
          loanClanId || undefined
        );
        setEvents(safeItems<TrustEvent>(eventsRes));
      } catch {
        setEvents([]);
      }
    } catch (e: any) {
      setFeedback({
        tone: "error",
        text: e?.message || "Failed to load loan summary.",
      });
    } finally {
      setLoading(false);
    }
  }, [numericLoanId, selectedClanId]);

  useEffect(() => {
    if (!numericLoanId) return;
    void refreshAll();
  }, [numericLoanId, refreshAll]);

  async function handleGuarantorDecision(
    guarantor: LoanGuarantor,
    status: "approved" | "declined"
  ) {
    if (!summary?.id || !guarantor?.id) return;
    if (!canActOnGuarantors) {
      setFeedback({
        tone: "error",
        text: "Guarantor decisions are only available while the loan is pending.",
      });
      return;
    }

    const key = `${summary.id}-${guarantor.id}-${status}`;
    setBusyDecisionKey(key);

    try {
      await decideLoanGuarantor(summary.id, Number(guarantor.id), {
        status,
        clan_id: summary?.clan_id,
      });

      setFeedback({
        tone: "success",
        text:
          status === "approved"
            ? "Guarantor approved successfully."
            : "Guarantor declined successfully.",
      });

      await refreshAll();
    } catch (e: any) {
      setFeedback({
        tone: "error",
        text: e?.message || "Guarantor decision failed.",
      });
    } finally {
      setBusyDecisionKey("");
    }
  }

  function copyLoanAuditLink() {
    if (!summary?.id) return;

    const p = new URLSearchParams({
      clan_id: String(summary.clan_id || selectedClanId || 1),
      loan_id: String(summary.id),
      audit: "1",
    });

    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    safeCopy(`${origin}/app/trust-analytics?${p.toString()}`);

    setFeedback({
      tone: "success",
      text: "Loan audit link copied.",
    });
  }

  function copyLoanSummary() {
    if (!summary) return;

    const lines = [
      `Community: ${communityLabel}`,
      `Community ID: ${communityPublicId}`,
      `GMFN ID: ${gmfnId}`,
      `Member: ${memberName}`,
      memberRole ? `Role: ${memberRole}` : "",
      `Loan ID: ${summary.id}`,
      `Status: ${safeStr(summary.status)}`,
      `Amount: ${fmtMoney(n(summary.amount), currency)}`,
      `Required guarantors: ${requiredCount}`,
      `Approved guarantors: ${approvedCount}`,
      `Pending guarantors: ${pendingGuarantors.length}`,
      summary?.remaining_amount != null
        ? `Remaining amount: ${fmtMoney(summary.remaining_amount, currency)}`
        : "",
      summary?.paid_total != null
        ? `Paid total: ${fmtMoney(summary.paid_total, currency)}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(lines);
    setFeedback({
      tone: "success",
      text: "Loan summary copied.",
    });
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  const summaryNextStep = useMemo(() => {
    if (!summary) return "";
    return nextStepText(summary.status);
  }, [summary]);

  if (!numericLoanId) {
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
        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#991B1B", fontWeight: 800 }}>
            Invalid loan ID.
          </div>
        </section>
      </div>
    );
  }

  if (loading && !summary) {
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
          sectionLabel="Loan Summary"
          title="Loan Summary"
          subtitle="Loading the loan detail page..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loan summary...
          </div>
        </section>
      </div>
    );
  }

  if (!summary) {
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
          sectionLabel="Loan Summary"
          title="Loan Summary"
          subtitle="Review one support item here."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/loans"
          backLabel="Loans & Support"
        />

        {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loan summary could not be loaded.
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
        paddingBottom: isCompact ? 40 : 60,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Loan Summary"
        title={`Loan #${summary.id}`}
        subtitle="Review the support item, guarantor progress, repayment state, evidence trail, and finance distribution in one calmer page."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page is one step inside Loans & Support. It gathers the full reading for one support item: its amount, progress, guarantor state, repayment state, evidence, and finance detail."
        why="Finance keeps the wider cross-community money file. Loan Summary keeps the full reading for this one item so the support story stays clear."
        next="Start with the summary facts, then move into guarantor decisions or repayment areas depending on what the loan needs now."
        tone="blue"
      />

      {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "180px minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div
              style={{
                width: "100%",
                height: 148,
                borderRadius: 20,
                border: "1px solid rgba(212,175,55,0.22)",
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(8,17,31,0.88) 0%, rgba(16,42,67,0.96) 100%)",
                boxShadow: "0 20px 44px rgba(2,12,27,0.32)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pictureSrc ? (
                <img
                  src={pictureSrc}
                  alt={communityLabel}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    display: "block",
                  }}
                />
              ) : (
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 20,
                    textAlign: "center",
                    padding: 12,
                    lineHeight: 1.3,
                  }}
                >
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed support context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontSize: 30,
                fontWeight: 1000,
                lineHeight: 1.12,
              }}
            >
              {fmtMoney(n(summary.amount), currency)}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {statusBadge(summary.status)}
              <span style={badge(true)}>Community ID: {communityPublicId}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current step: Loan summary</span>
            </div>

            <div
              style={{
                marginTop: 14,
                ...helperText(),
                maxWidth: 860,
              }}
            >
              <strong style={{ color: "#0B1F33" }}>What happens next:</strong>{" "}
              {summaryNextStep}
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
                  onClick={copyLoanSummary}
                  style={secondaryBtn(false)}
                >
                  Copy loan summary
                </button>
                <button
                  type="button"
                  onClick={copyLoanAuditLink}
                  style={secondaryBtn(false)}
                >
                  Copy audit link
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 12 }}>
            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Today</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                {canActOnGuarantors
                  ? "Review guarantor progress and keep the pending decisions moving."
                  : canRepay
                  ? "Review repayment state and continue with the money path."
                  : "Review the evidence and status before taking another step."}
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Tomorrow</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.65,
                }}
              >
                A clearer summary and evidence trail keeps the support flow easier
                to understand and easier to defend.
              </div>
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
            <div style={sectionLabel()}>Summary facts</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Core facts for the current support item.
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

        <ExplainToggle
          label="What these facts show"
          what="This section gives the core numbers and counts for the current support item."
          why="It helps you understand the loan at a glance before you move into evidence, guarantor decisions, or repayment detail."
          next="Read the amount, remaining position, and guarantor counts first, then open the deeper sections only where action is still needed."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.overview ? (
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
              <div style={sectionLabel()}>Amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 1000,
                }}
              >
                {fmtMoney(n(summary.amount), currency)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Required guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 1000,
                }}
              >
                {requiredCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Approved guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 1000,
                }}
              >
                {approvedCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Pending guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 22,
                  fontWeight: 1000,
                }}
              >
                {pendingGuarantors.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Remaining amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {fmtMoney(summary.remaining_amount, currency)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Paid total</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                }}
              >
                {fmtMoney(summary.paid_total, currency)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Created</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(summary.created_at)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Due</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(summary.due_at)}
              </div>
            </div>

            {revenuePreview ? (
              <>
                <div style={statTile("#F8FBFF")}>
                  <div style={sectionLabel()}>Service fee</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B63D1",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {fmtMoney(revenuePreview.service_fee, currency)}
                  </div>
                </div>

                <div style={statTile("#F8FBFF")}>
                  <div style={sectionLabel()}>Guarantor pool</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B63D1",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {fmtMoney(revenuePreview.guarantor_pool, currency)}
                  </div>
                </div>

                <div style={statTile("#F8FBFF")}>
                  <div style={sectionLabel()}>Platform revenue</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B63D1",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {fmtMoney(revenuePreview.platform_revenue, currency)}
                  </div>
                </div>

                <div style={statTile("#F8FBFF")}>
                  <div style={sectionLabel()}>Net disbursed</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B63D1",
                      fontSize: 16,
                      fontWeight: 900,
                    }}
                  >
                    {fmtMoney(revenuePreview.net_disbursed_amount, currency)}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
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
              <div style={sectionLabel()}>Guarantor decisions</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Review the guarantor rows one by one. Bulk action remains deliberately disabled here.
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSection("guarantors")}
              style={collapseToggle()}
            >
              {collapsed.guarantors ? "Open" : "Collapse"}
            </button>
          </div>

          <ExplainToggle
            label="How to use these decisions"
            what="This section is where you review guarantor rows one by one and decide whether a pending guarantor should move forward."
            why="It keeps each guarantor decision explicit instead of hiding it inside bulk actions or loose queue behavior."
            next="Check the status of each guarantor row, then approve or decline only the ones that are genuinely ready for a decision."
            tone="light"
            style={{ marginTop: 12 }}
          />

          {!collapsed.guarantors ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {guarantors.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  No guarantor has been attached yet.
                </div>
              ) : (
                guarantors.map((g, idx) => {
                  const gStatus = lc(g.status);
                  const canDecide =
                    canActOnGuarantors && g.id != null && gStatus === "pending";
                  const approveKey = `${summary.id}-${g.id}-approved`;
                  const declineKey = `${summary.id}-${g.id}-declined`;
                  const busyApprove = busyDecisionKey === approveKey;
                  const busyDecline = busyDecisionKey === declineKey;

                  return (
                    <div key={idx} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "1fr"
                            : "minmax(0, 1fr) auto",
                          gap: 12,
                          alignItems: "center",
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
                            {firstTruthy(
                              g.guarantor_name,
                              g.guarantor_email,
                              `user:${g.guarantor_user_id}`
                            )}
                          </div>

                          <div
                            style={{
                              marginTop: 8,
                              display: "flex",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            {guarantorBadge(g.status)}
                            <span style={badge(true)}>
                              Pledge: {fmtMoney(g.pledge_amount, currency)}
                            </span>
                            {g.is_locked ? (
                              <span style={badge(false)}>
                                Locked: {fmtMoney(g.locked_amount, currency)}
                              </span>
                            ) : null}
                            {safeStr(g.released_amount) ? (
                              <span style={badge(false)}>
                                Released: {fmtMoney(g.released_amount, currency)}
                              </span>
                            ) : null}
                          </div>

                          {safeStr(g.responded_at) ? (
                            <div
                              style={{
                                marginTop: 8,
                                ...helperText(),
                                fontSize: 13,
                              }}
                            >
                              Responded: {safeDateTime(g.responded_at)}
                            </div>
                          ) : null}
                        </div>

                        <div
                          style={{
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                            justifyContent: isCompact ? "flex-start" : "flex-end",
                          }}
                        >
                          <button
                            type="button"
                            {...buttonGuardProps()}
                            onClick={() => handleGuarantorDecision(g, "approved")}
                            disabled={!canDecide || busyApprove || busyDecline}
                            style={primaryBtn(!canDecide || busyApprove || busyDecline)}
                          >
                            {busyApprove ? "Approving..." : "Approve"}
                          </button>

                          <button
                            type="button"
                            {...buttonGuardProps()}
                            onClick={() => handleGuarantorDecision(g, "declined")}
                            disabled={!canDecide || busyApprove || busyDecline}
                            style={secondaryBtn(!canDecide || busyApprove || busyDecline)}
                          >
                            {busyDecline ? "Declining..." : "Decline"}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Bulk admin action</div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
              }}
            >
              {isAdmin
                ? "Bulk approve and bulk decline remain disabled here. Keep review deliberate and line-by-line."
                : "Bulk guarantor actions are not enabled here. Keep the path deliberate and line-by-line."}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                {...buttonGuardProps()}
                disabled
                style={secondaryBtn(true)}
              >
                Bulk approve disabled
              </button>
              <button
                type="button"
                {...buttonGuardProps()}
                disabled
                style={secondaryBtn(true)}
              >
                Bulk decline disabled
              </button>
            </div>
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Fit suggestions</div>

            <div
              style={{
                marginTop: 10,
                ...helperText(),
              }}
            >
              Suggested guarantor candidates for this loan, when available.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {suggestions.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                  No fit suggestion is currently shown.
                </div>
              ) : (
                suggestions.map((s, index) => (
                  <div key={index} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontSize: 15,
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {firstTruthy(
                        s.display_name,
                        s.email,
                        s.gmfn_id,
                        `user:${s.user_id}`
                      )}
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                      }}
                    >
                      {Number.isFinite(Number(s.cci)) ? (
                        <span style={badge(false)}>CCI: {String(s.cci)}</span>
                      ) : null}

                      {Number.isFinite(Number(s.recommended_pledge)) ? (
                        <span style={badge(true)}>
                          Suggested pledge: {fmtMoney(s.recommended_pledge, currency)}
                        </span>
                      ) : null}
                    </div>

                    {safeStr(s.reason) ? (
                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                          fontSize: 13,
                        }}
                      >
                        Reason: {safeStr(s.reason)}
                      </div>
                    ) : null}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(320px, 0.92fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        <div style={pageCard("#FFFFFF")}>
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
              <div style={sectionLabel()}>Repayment evidence</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Existing repayment records are shown here. This is where the money stage continues after approval or disbursement.
              </div>
            </div>

            <button
              type="button"
              onClick={() => toggleSection("repayment")}
              style={collapseToggle()}
            >
              {collapsed.repayment ? "Open" : "Collapse"}
            </button>
          </div>

          {!collapsed.repayment ? (
            <>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {latestRepaymentExpectedPayment ? (
                  <div
                    style={innerCard(
                      latestRepaymentExpectedPayment.matched_bank_event_id
                        ? "#F3FBF5"
                        : "#F8FBFF"
                    )}
                  >
                    <div style={sectionLabel()}>Repayment expectation</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Status: {safeStr(latestRepaymentExpectedPayment.status || "expected")}
                      </div>
                      <div style={helperText()}>
                        Reference: {firstTruthy(
                          latestRepaymentExpectedPayment.reference_display,
                          latestRepaymentExpectedPayment.reference_normalized,
                          "Awaiting reference"
                        )}
                      </div>
                      <div style={helperText()}>
                        Amount: {safeStr(latestRepaymentExpectedPayment.amount || "0.00")}{" "}
                        {safeStr(latestRepaymentExpectedPayment.currency || currency)}
                      </div>
                      <div style={helperText()}>
                        {latestRepaymentExpectedPayment.matched_bank_event_id
                          ? `Matched bank event visible: ${safeStr(latestRepaymentExpectedPayment.matched_bank_event_id)}`
                          : latestRepaymentExpectedPayment.confirmed_at
                          ? `Confirmed at: ${safeDateTime(latestRepaymentExpectedPayment.confirmed_at)}`
                          : latestRepaymentExpectedPayment.due_at
                          ? `Due at: ${safeDateTime(latestRepaymentExpectedPayment.due_at)}`
                          : "Awaiting reconciliation visibility in Finance"}
                      </div>
                      {safeStr(latestRepaymentExpectedPayment.status_reason) ? (
                        <div style={helperText()}>
                          Reason: {safeStr(latestRepaymentExpectedPayment.status_reason)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {repayments.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                    No repayment record is shown yet.
                  </div>
                ) : (
                  repayments.map((repayment, index) => (
                    <div key={repayment.id || index} style={innerCard("#FCFEFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 12,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 15,
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          Repayment #{safeStr(repayment.id || index + 1)}
                        </div>

                        <span style={badge(true)}>
                          {fmtMoney(repayment.amount, currency)}
                        </span>
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          ...helperText(),
                          fontSize: 13,
                        }}
                      >
                        Posted: {safeDateTime(repayment.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div
                style={{
                  marginTop: 14,
                  ...helperText(),
                }}
              >
                {canRepay
                  ? "When you are ready to move from repayment evidence into the money route, use Next routes below."
                  : "Repayment opens after approval or disbursement. Use Next routes below when the support item is ready to move forward."}
              </div>
            </>
          ) : null}
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div style={pageCard("#FFFFFF")}>
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
                <div style={sectionLabel()}>Latest trust note</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  The most recent visible trust evidence tied to this support item.
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
              latestEvent ? (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontSize: 15,
                      fontWeight: 900,
                      lineHeight: 1.5,
                    }}
                  >
                    {latestNote || "No explicit note was recorded in the latest event."}
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      color: "#64748B",
                      fontSize: 13,
                      lineHeight: 1.75,
                    }}
                  >
                    Event type:{" "}
                    <strong style={{ color: "#0B1F33" }}>
                      {safeStr(latestEvent.event_type || "—")}
                    </strong>
                    <br />
                    Created:{" "}
                    <strong style={{ color: "#0B1F33" }}>
                      {safeDateTime(latestEvent.created_at)}
                    </strong>
                    <br />
                    Reason code:{" "}
                    <strong style={{ color: "#0B1F33" }}>
                      {latestReason || "(auto)"}
                    </strong>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    marginTop: 10,
                    color: "#64748B",
                    fontSize: 14,
                    lineHeight: 1.8,
                  }}
                >
                  No trust event evidence is visible here right now.
                </div>
              )
            ) : null}
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Revenue allocation preview</div>

            {revenuePreview ? (
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div style={innerCard("#FCFEFF")}>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                    Service fee
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {fmtMoney(revenuePreview.service_fee, currency)}
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                    Guarantor pool
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {fmtMoney(revenuePreview.guarantor_pool, currency)}
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                    Platform revenue
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {fmtMoney(revenuePreview.platform_revenue, currency)}
                  </div>
                </div>

                <div style={innerCard("#FCFEFF")}>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 900 }}>
                    Net disbursed
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontSize: 18,
                      fontWeight: 1000,
                    }}
                  >
                    {fmtMoney(revenuePreview.net_disbursed_amount, currency)}
                  </div>
                </div>
              </div>
            ) : (
              <div
                style={{
                  marginTop: 10,
                  color: "#64748B",
                  fontSize: 14,
                  lineHeight: 1.8,
                }}
              >
                Revenue allocation preview is not visible yet for this support item.
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <OriginLink to={revenueRoute} style={secondaryBtn(false)}>
                {canOpenCommandRevenue ? "Open Revenue Allocation" : "Open Finance File"}
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
            <div style={sectionLabel()}>
              {supportItemActive ? "Next support routes" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {supportItemActive
                ? "Stay inside Loans & Support and move only to the next page that matches this current support item."
                : "Move from loan summary into the next page you need."}
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
            <OriginLink to="/app/loan-workbench" style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Workbench
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Continue deeper support handling here.
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-suggestions" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Suggestions
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the next question is guarantor fit.
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-readiness" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Readiness
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the question is whether the path is clean enough to continue.
              </div>
            </OriginLink>

            <OriginLink to={revenueRoute} style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {canOpenCommandRevenue ? "Revenue Allocation" : "Finance File"}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {canOpenCommandRevenue
                  ? "Read fee and distribution logic here."
                  : "Open the money record visible to you for this community."}
              </div>
            </OriginLink>

            <OriginLink
              to={canRepay ? `/app/payment/loans/${summary.id}` : "/app/finance"}
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {canRepay ? "Loan Payment Instructions" : "Finance"}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {canRepay
                  ? "Open this when the support item has moved into repayment."
                  : "Open this when the next question is the broader money truth."}
              </div>
            </OriginLink>

            {!supportItemActive ? (
              <OriginLink to="/app/loans" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Loans & Support
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Return to the broader support overview.
                </div>
              </OriginLink>
            ) : null}
          </div>
        ) : null}
      </section>

    </div>
  );
}


