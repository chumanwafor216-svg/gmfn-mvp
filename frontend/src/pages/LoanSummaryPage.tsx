import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import GsnSnapshotPaperCard from "../components/GsnSnapshotPaperCard";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  paymentRecordStatusLabel,
  supportRecordStatusLabel,
} from "../lib/paymentStatusLanguage";
import { brandClampLines } from "../styles/gmfnBrand";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  buildGsnSupportEvidencePackage,
  buildGsnSupportEvidenceShareText,
} from "../lib/gsnSnapshotPaper";
import {
  decideLoanGuarantor,
  getAccessToken,
  getCurrentClan,
  getLoanGuarantorSuggestions,
  getLoanGuarantors,
  getLoanSummary,
  listExpectedPayments,
  listMyPaymentInstructionExpectedPayments,
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
  paid_amount?: string | number | null;
  remaining_amount?: string | number | null;
  due_at?: string | null;
  created_at?: string | null;
  bank_event_id?: number | string | null;
  payment_stage?: string | null;
  payment_status_label?: string | null;
  bank_authentication_guidance?: string | null;
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
  cci_score?: number | string;
  recommended_pledge?: number | string;
  suggested_pledge?: number | string;
  reason?: string | null;
};

type RevenuePreview = {
  service_fee?: string | number | null;
  guarantor_pool?: string | number | null;
  platform_revenue?: string | number | null;
  net_disbursed_amount?: string | number | null;
};

type FeedbackTone = "success" | "error";

const FETCH_JSON_TIMEOUT_MS = 30000;

type CollapseState = {
  overview: boolean;
  guarantors: boolean;
  repayment: boolean;
  evidence: boolean;
  routes: boolean;
};

const LOAN_SUMMARY_UI_STORAGE_KEY = "gmfn.loanSummary.sections.v2";

function safeItems<T>(res: any): T[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as T[];
  if (Array.isArray(res.items)) return res.items as T[];
  if (Array.isArray(res.suggestions)) return res.suggestions as T[];
  if (Array.isArray(res.data?.items)) return res.data.items as T[];
  if (Array.isArray(res.data?.suggestions)) return res.data.suggestions as T[];
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
  if (!raw) return "-";
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

function safeMeta(value: unknown): Record<string, any> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  return typeof value === "object" && !Array.isArray(value) ? (value as Record<string, any>) : {};
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

function routeTileStyle(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    height: 104,
    minHeight: 104,
    maxHeight: 104,
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
    textAlign: "left",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflow: "hidden",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 34px rgba(29,95,212,0.10)"
      : "0 14px 30px rgba(15,23,42,0.05)",
  };
}

function routeTileTitleStyle(): React.CSSProperties {
  return {
    ...brandClampLines(2),
    color: "#07172C",
    fontWeight: 950,
    fontSize: 17,
    lineHeight: 1.25,
  };
}

function routeTileDetailStyle(): React.CSSProperties {
  return {
    ...brandClampLines(2),
    marginTop: 10,
    ...helperText(),
    fontSize: 13,
    lineHeight: 1.35,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4A627A",
    fontWeight: 1000,
    letterSpacing: 0,
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
    lineHeight: 1.45,
  };
}

function actionText(name: GsnIconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 28,
          height: 28,
          borderRadius: 11,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0B4EA2",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.86) 100%)",
          border: "1px solid rgba(12,41,71,0.08)",
          boxShadow:
            "0 9px 18px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.86)",
        }}
      >
        <GsnLegacyIcon name={name} size={26} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function routeHeading(name: GsnIconName, label: string) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        ...brandClampLines(2),
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 32,
          height: 32,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0A3765",
          background: "linear-gradient(180deg, #F8FBFF 0%, #DCEBFA 100%)",
          border: "1px solid rgba(11,31,51,0.12)",
        }}
      >
        <GsnLegacyIcon name={name} size={28} />
      </span>
      <span style={routeTileTitleStyle()}>{label}</span>
    </span>
  );
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
  const controller = new AbortController();
  const timer = globalThis.setTimeout(
    () => controller.abort(),
    FETCH_JSON_TIMEOUT_MS
  );

  let res: Response;
  try {
    res = await fetch(apiUrl(path), {
      method: "GET",
      headers: authHeaders(clanId),
      credentials: "include",
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
  }

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
  return firstTruthy(
    clan?.community_code,
    clan?.community?.community_code,
    clan?.profile?.community_code,
    clan?.marketplace?.community_code
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
    overview: true,
    guarantors: true,
    repayment: true,
    evidence: true,
    routes: true,
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
        {supportRecordStatusLabel(status)}
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
        {supportRecordStatusLabel(status)}
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
        {supportRecordStatusLabel(status)}
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
        {supportRecordStatusLabel(status)}
      </span>
    );
  }

  return (
    <span style={{ ...base, background: "#f9fafb", color: "#374151" }}>
      {supportRecordStatusLabel(status)}
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
        Support recorded
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
        Declined
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
        Expired
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
      Waiting
    </span>
  );
}

function nextStepText(status: string) {
  const s = lc(status);

  if (s === "pending") {
    return "Review the people asked to support this request.";
  }

  if (s === "incomplete") {
    return "More support is needed. Continue the request.";
  }

  if (s === "approved") {
    return "Support is recorded. Check the money and repayment details.";
  }

  if (s === "disbursed" || s === "active") {
    return "Continue repayment.";
  }

  if (s === "repaid") {
    return "This support has been fully repaid.";
  }

  if (s === "rejected" || s === "declined" || s === "cancelled") {
    return "This request has stopped. Review the record before starting another.";
  }

  return "Review the record to see what needs attention.";
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { loanId?: number | string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
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
  const [phoneLane, setPhoneLane] = useState<
    "supporters" | "record" | "tools" | null
  >(null);
  const [phoneMoreOpen, setPhoneMoreOpen] = useState(false);
  const activeCommunityId = Number(summary?.clan_id || selectedClanId || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", activeCommunityId, "loan-summary.route.dashboard"),
      loans: routeTarget("loans", activeCommunityId, "loan-summary.route.loans-target"),
      workbench: routeTarget("loanWorkbench", activeCommunityId, "loan-summary.route.workbench-target"),
      suggestions: routeTarget("loanSuggestions", activeCommunityId, "loan-summary.route.suggestions-target"),
      readiness: routeTarget("loanReadiness", activeCommunityId, "loan-summary.route.readiness-target"),
      finance: routeTarget("finance", activeCommunityId, "loan-summary.route.finance-target"),
      revenueAllocation: routeTarget(
        "revenueAllocation",
        activeCommunityId,
        "loan-summary.route.revenue-allocation-target"
      ),
    }),
    [activeCommunityId]
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
    writeLocalJSON(LOAN_SUMMARY_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (!feedback) return;

    const timer = window.setTimeout(() => {
      setFeedback(null);
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [feedback]);

  useEffect(() => {
    setSummary(null);
    setGuarantors([]);
    setRepayments([]);
    setExpectedPayments([]);
    setEvents([]);
    setSuggestions([]);
    setRevenuePreview(null);
    setBusyDecisionKey("");
    setFeedback(null);
    setPhoneLane(null);
    setPhoneMoreOpen(false);
  }, [numericLoanId]);

  const currency = summary?.currency ?? "NGN";
  const supportPurpose = firstTruthy(summary?.purpose, summary?.note);
  const isAdmin =
    lc(firstTruthy(me?.role, (me as any)?.account_role, (me as any)?.user_role)) ===
    "admin";
  const canOpenCommandRevenue =
    isAdmin || lc(normalizeCommunityRole(currentClan)) === "admin";
  const revenueRoute = canOpenCommandRevenue ? routes.revenueAllocation : routes.finance;

  const requiredCount = n(summary?.guarantors_required);
  const approvedCount = guarantors.filter((g) => lc(g.status) === "approved").length;
  const pendingGuarantors = guarantors.filter(
    (g) => lc(g.status) === "pending" && g.id != null
  );

  const loanStatus = lc(summary?.status);
  const canActOnGuarantors =
    loanStatus === "pending" || loanStatus === "incomplete";
  const canRepay =
    loanStatus === "approved" || loanStatus === "disbursed" || loanStatus === "active";
  const supportItemActive =
    loanStatus === "pending" ||
    loanStatus === "incomplete" ||
    loanStatus === "approved" ||
    loanStatus === "disbursed" ||
    loanStatus === "active";
  const supportProcessMessage =
    loanStatus === "incomplete"
      ? "Support is not complete yet. Add another supporter, wait for pending replies, or cancel this request if it should not continue."
      : loanStatus === "pending"
      ? "Support is open. Keep each supporter decision explicit until GSN can show what is ready or what is still missing."
      : canRepay
      ? "Support has moved to the money stage. Continue with repayment."
      : "No support action is currently open. Review the record before choosing the next page.";

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
        firstTruthy(a?.created_at, a?.due_at, a?.meta?.created_at, a?.meta_json?.created_at)
      ).getTime();
      const tb = new Date(
        firstTruthy(b?.created_at, b?.due_at, b?.meta?.created_at, b?.meta_json?.created_at)
      ).getTime();
      return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    return rows[0] || null;
  }, [expectedPayments]);
  const latestRepaymentMeta = useMemo(
    () =>
      safeMeta(
        latestRepaymentExpectedPayment?.meta ??
          latestRepaymentExpectedPayment?.meta_json
      ),
    [latestRepaymentExpectedPayment]
  );
  const latestRepaymentPlan = useMemo(() => {
    const items = latestRepaymentMeta?.planned_installments;
    return Array.isArray(items) ? items : [];
  }, [latestRepaymentMeta]);
  const nextRepaymentPlanItem =
    latestRepaymentPlan.find((item) => n(item?.amount) > 0) || null;
  const latestRepaymentStatusLabel = latestRepaymentExpectedPayment
    ? firstTruthy(
        latestRepaymentExpectedPayment.payment_status_label,
        paymentRecordStatusLabel(
          latestRepaymentExpectedPayment.status ||
            latestRepaymentExpectedPayment.payment_stage ||
            "expected"
        )
      )
    : "";
  const latestRepaymentCurrency = firstTruthy(
    latestRepaymentExpectedPayment?.currency,
    currency
  );
  const latestRepaymentProgress =
    latestRepaymentExpectedPayment &&
    (latestRepaymentExpectedPayment.paid_amount != null ||
      latestRepaymentExpectedPayment.remaining_amount != null)
      ? `${fmtMoney(
          latestRepaymentExpectedPayment.paid_amount ?? 0,
          latestRepaymentCurrency
        )} received; ${fmtMoney(
          latestRepaymentExpectedPayment.remaining_amount ?? 0,
          latestRepaymentCurrency
        )} left`
      : "";
  const latestRepaymentIsComplete =
    lc(latestRepaymentExpectedPayment?.payment_stage) === "completed" ||
    ["confirmed", "applied"].includes(
      lc(latestRepaymentExpectedPayment?.status)
    );
  const latestRepaymentGuidance = latestRepaymentExpectedPayment
    ? firstTruthy(
        latestRepaymentExpectedPayment.bank_authentication_guidance,
        latestRepaymentIsComplete
          ? "GSN has matched the bank or payment-provider confirmation."
          : "Complete the payment with your bank or provider. GSN will update this record after reconciliation."
      )
    : "";

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

  const gmfnIdValue = useMemo(() => firstTruthy(me?.gmfn_id), [me]);
  const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet"), [gmfnIdValue]);

  const communityLabel = useMemo(
    () => normalizeCommunityName(currentClan, selectedClanId),
    [currentClan, selectedClanId]
  );

  const communityPublicIdValue = useMemo(
    () => normalizeCommunityId(currentClan),
    [currentClan]
  );
  const communityPublicId = useMemo(
    () => firstTruthy(communityPublicIdValue, "No community ID yet"),
    [communityPublicIdValue]
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
        const accountIsAdmin =
          lc(
            firstTruthy(
              meRes?.role,
              meRes?.account_role,
              meRes?.user_role
            )
          ) === "admin";
        const communityIsAdmin =
          lc(normalizeCommunityRole(clanRes || null)) === "admin";
        const expectedRes = await (accountIsAdmin || communityIsAdmin
          ? listExpectedPayments({
              clan_id: loanClanId || undefined,
              expected_type: "repayment",
              limit: 100,
            })
          : listMyPaymentInstructionExpectedPayments({
              clan_id: loanClanId,
              expected_type: "repayment",
              limit: 100,
            })
        ).catch(() => null);

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
        text: e?.message || "Failed to load support summary.",
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
        text:
          "Supporter decisions are only available while support is pending or incomplete.",
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
            ? "Support decision recorded. This is not whole-request approval or release authority."
            : "Support declined successfully.",
      });

      await refreshAll();
    } catch (e: any) {
      setFeedback({
        tone: "error",
        text: e?.message || "Support decision failed.",
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
    const auditLink = `${origin}/app/trust-analytics?${p.toString()}`;
    safeCopy(
      buildGsnSupportEvidenceShareText({
        title: "GSN Support Audit Link",
        reference: `support-${summary.id}`,
        memberName,
        gsnId: gmfnIdValue,
        memberRole,
        communityName: communityLabel,
        communityId: communityPublicIdValue,
        routeName: "Support Summary",
        loanId: summary.id,
        amount: fmtMoney(n(summary.amount), currency),
        status: supportRecordStatusLabel(summary.status),
        actionLink: auditLink,
        detailLines: [
          `Supporters needed: ${requiredCount}`,
          `Recorded support: ${approvedCount}`,
        ],
      })
    );

    setFeedback({
      tone: "success",
      text: "Support audit package copied.",
    });
  }

  function copyLoanSummary() {
    if (!summary || !loanSummaryPaper) return;

    safeCopy(
      buildGsnSupportEvidenceShareText({
        title: "GSN Support Summary Snapshot",
        reference: `support-${summary.id}`,
        memberName,
        gsnId: gmfnIdValue,
        memberRole,
        communityName: communityLabel,
        communityId: communityPublicIdValue,
        routeName: "Support Summary",
        loanId: summary.id,
        amount: fmtMoney(n(summary.amount), currency),
        status: supportRecordStatusLabel(summary.status),
        detailLines: [
          supportPurpose ? `Purpose: ${supportPurpose}` : "",
          summaryNextStep ? `Next step: ${summaryNextStep}` : "",
        ],
      })
    );
    setFeedback({
      tone: "success",
      text: "Support summary snapshot copied.",
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
  const loanSummaryPaper = useMemo(() => {
    if (!summary) return "";

    return buildGsnSupportEvidencePackage({
      title: "GSN Support Summary Snapshot",
      purpose: supportPurpose
        ? `Review support request: ${supportPurpose}`
        : "Review current support status, supporter position, and repayment evidence.",
      reference: `support-${summary.id}`,
      memberName,
      gsnId: gmfnIdValue,
      memberRole,
      communityName: communityLabel,
      communityId: communityPublicIdValue,
      routeName: "Support Summary",
      loanId: summary.id,
      amount: fmtMoney(n(summary.amount), currency),
      status: supportRecordStatusLabel(summary.status),
      detailLines: [
        supportPurpose ? `Purpose: ${supportPurpose}` : "",
        `Supporters needed: ${requiredCount}`,
        `Recorded support: ${approvedCount}`,
        `Pending supporters: ${pendingGuarantors.length}`,
        summary.remaining_amount != null
          ? `Remaining amount: ${fmtMoney(summary.remaining_amount, currency)}`
          : "",
        summary.paid_total != null
          ? `Paid total: ${fmtMoney(summary.paid_total, currency)}`
          : "",
        summaryNextStep ? `Next step: ${summaryNextStep}` : "",
      ],
    });
  }, [
    approvedCount,
    communityLabel,
    communityPublicIdValue,
    currency,
    gmfnIdValue,
    memberName,
    memberRole,
    pendingGuarantors.length,
    requiredCount,
    summary,
    summaryNextStep,
    supportPurpose,
  ]);

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
            Invalid support ID.
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
          sectionLabel="Support Summary"
          title="Support Summary"
          subtitle="Loading the support detail page..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.loans}
          backLabel="Loan Support"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.45 }}>
            Loading support summary...
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
          sectionLabel="Support Summary"
          title="Support Summary"
          subtitle="Review one support item here."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.loans}
          backLabel="Loan Support"
        />

        {feedback ? <div style={feedbackCard(feedback.tone)}>{feedback.text}</div> : null}

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.45 }}>
            Support summary could not be loaded.
          </div>
        </section>
      </div>
    );
  }
  if (isCompact) {
    const repaymentRoute = routeTarget(
      "repayment",
      activeCommunityId,
      "loan-summary.phone.repayment-target",
      { loanId: summary.id }
    );
    const phonePrimaryIsSupporterReview =
      canActOnGuarantors && pendingGuarantors.length > 0;
    const phonePrimaryIsWorkbench =
      canActOnGuarantors && pendingGuarantors.length === 0;

    return (
      <div
        data-gsn-loan-summary-phone="simple"
        style={{
          maxWidth: 560,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 12,
        }}
      >
        {feedback ? (
          <div style={feedbackCard(feedback.tone)}>{feedback.text}</div>
        ) : null}

        {phoneLane ? (
          <SubtleButton
            type="button"
            onClick={() => {
              setPhoneLane(null);
              setPhoneMoreOpen(true);
            }}
            fullWidth
            stableHeight={52}
            debugId="loan-summary.phone.back"
          >
            {actionText("document", "Back to summary")}
          </SubtleButton>
        ) : null}

        {!phoneLane ? (
          <>
            <section
              data-gsn-loan-summary-phone-front="simple"
              style={{
                borderRadius: 24,
                padding: 16,
                color: "#F8FBFF",
                background:
                  "linear-gradient(180deg, #08111F 0%, #0B1F33 58%, #102A43 100%)",
                border: "1px solid rgba(212,175,55,0.24)",
                boxShadow: "0 18px 42px rgba(2,12,27,0.24)",
              }}
            >
              <div
                style={{
                  color: "#F2C766",
                  fontSize: 12,
                  fontWeight: 900,
                  lineHeight: 1.3,
                }}
              >
                {communityLabel} / Support record #{summary.id}
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 25,
                  fontWeight: 1000,
                  lineHeight: 1.12,
                }}
              >
                {fmtMoney(n(summary.amount), currency)}
              </div>
              <div
                style={{
                  marginTop: 7,
                  color: "#D7E3F1",
                  fontSize: 14,
                  fontWeight: 800,
                  lineHeight: 1.4,
                }}
              >
                {summaryNextStep}
              </div>

              <div
                data-gsn-loan-summary-phone-facts="compact-four"
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  ["State", supportRecordStatusLabel(summary.status)],
                  ["Remaining", fmtMoney(summary.remaining_amount, currency)],
                  ["Support recorded", String(approvedCount)],
                  ["Waiting", String(pendingGuarantors.length)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    style={{
                      minWidth: 0,
                      borderRadius: 15,
                      padding: "9px 10px",
                      background: "rgba(255,255,255,0.09)",
                      border: "1px solid rgba(255,255,255,0.12)",
                    }}
                  >
                    <div
                      style={{
                        color: "#AFC1D4",
                        fontSize: 11,
                        fontWeight: 800,
                        lineHeight: 1.2,
                      }}
                    >
                      {label}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: "#FFFFFF",
                        fontSize: 14,
                        fontWeight: 900,
                        lineHeight: 1.3,
                        overflowWrap: "anywhere",
                      }}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  marginTop: 11,
                  color: "#C8D7E6",
                  fontSize: 12,
                  lineHeight: 1.4,
                }}
              >
                GSN records support evidence. It does not approve the whole
                request, move money, or promise repayment.
              </div>
            </section>

            {phonePrimaryIsSupporterReview ? (
              <PrimaryButton
                type="button"
                onClick={() => setPhoneLane("supporters")}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.primary.review-supporters"
              >
                {actionText("check", "Review supporters")}
              </PrimaryButton>
            ) : phonePrimaryIsWorkbench ? (
              <StableCtaLink
                to={routes.workbench}
                kind="primary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.primary.continue-support"
              >
                {actionText("briefcase", "Continue support")}
              </StableCtaLink>
            ) : canRepay ? (
              <StableCtaLink
                to={repaymentRoute}
                kind="primary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.primary.continue-repayment"
              >
                {actionText("repaymentSchedule", "Continue repayment")}
              </StableCtaLink>
            ) : (
              <PrimaryButton
                type="button"
                onClick={() => setPhoneLane("record")}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.primary.view-record"
              >
                {actionText("document", "View record")}
              </PrimaryButton>
            )}

            <SubtleButton
              type="button"
              onClick={() => setPhoneMoreOpen((open) => !open)}
              fullWidth
              stableHeight={52}
              debugId="loan-summary.phone.more"
              aria-expanded={phoneMoreOpen}
            >
              {actionText(
                phoneMoreOpen ? "lock" : "document",
                phoneMoreOpen ? "Hide other tasks" : "More details"
              )}
            </SubtleButton>

            {phoneMoreOpen ? (
              <section
                data-gsn-loan-summary-phone-chooser="open"
                style={{
                  ...pageCard("#FFFFFF"),
                  padding: 12,
                  display: "grid",
                  gap: 8,
                }}
              >
                <SecondaryButton
                  type="button"
                  onClick={() => setPhoneLane("record")}
                  fullWidth
                  stableHeight={52}
                  debugId="loan-summary.phone.open-record"
                >
                  {actionText("document", "Support record")}
                </SecondaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => setPhoneLane("tools")}
                  fullWidth
                  stableHeight={52}
                  debugId="loan-summary.phone.open-tools"
                >
                  {actionText("briefcase", "More support tasks")}
                </SecondaryButton>
                {!phonePrimaryIsSupporterReview && guarantors.length > 0 ? (
                  <SecondaryButton
                    type="button"
                    onClick={() => setPhoneLane("supporters")}
                    fullWidth
                    stableHeight={52}
                    debugId="loan-summary.phone.open-supporters"
                  >
                    {actionText("check", "Supporters")}
                  </SecondaryButton>
                ) : null}
              </section>
            ) : null}
          </>
        ) : null}

        {phoneLane === "supporters" ? (
          <section
            data-gsn-loan-summary-phone-lane="supporters"
            style={{ ...pageCard("#FFFFFF"), padding: 14 }}
          >
            <div style={sectionLabel()}>Supporter decisions</div>
            <div
              style={{
                marginTop: 6,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 950,
                lineHeight: 1.3,
              }}
            >
              Review one person at a time
            </div>
            <div style={{ marginTop: 7, ...helperText() }}>
              Recording support here does not approve the whole request or
              release money.
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {guarantors.length === 0 ? (
                <>
                  <div style={{ ...innerCard("#F8FBFF"), color: "#64748B" }}>
                    No supporter has been attached yet.
                  </div>
                  <StableCtaLink
                    to={routes.workbench}
                    kind="primary"
                    fullWidth
                    stableHeight={52}
                    debugId="loan-summary.phone.supporters.workbench"
                  >
                    {actionText("briefcase", "Continue support")}
                  </StableCtaLink>
                </>
              ) : (
                guarantors.map((guarantor, index) => {
                  const guarantorStatus = lc(guarantor.status);
                  const canDecide =
                    canActOnGuarantors &&
                    guarantor.id != null &&
                    guarantorStatus === "pending";
                  const approveKey = `${summary.id}-${guarantor.id}-approved`;
                  const declineKey = `${summary.id}-${guarantor.id}-declined`;
                  const busyApprove = busyDecisionKey === approveKey;
                  const busyDecline = busyDecisionKey === declineKey;

                  return (
                    <div
                      key={guarantor.id || index}
                      style={innerCard("#FCFEFF")}
                    >
                      <div
                        style={{
                          color: "#0B1F33",
                          fontSize: 15,
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {firstTruthy(
                          guarantor.guarantor_name,
                          guarantor.guarantor_email,
                          `Supporter ${index + 1}`
                        )}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 7,
                          flexWrap: "wrap",
                        }}
                      >
                        {guarantorBadge(guarantor.status)}
                        <span style={badge(true)}>
                          {fmtMoney(guarantor.pledge_amount, currency)}
                        </span>
                      </div>

                      {canDecide ? (
                        <div
                          style={{
                            marginTop: 10,
                            display: "grid",
                            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                            gap: 8,
                          }}
                        >
                          <PrimaryButton
                            type="button"
                            onClick={() =>
                              handleGuarantorDecision(guarantor, "approved")
                            }
                            disabled={busyDecline}
                            busy={busyApprove}
                            busyLabel="Recording"
                            fullWidth
                            stableHeight={52}
                            debugId={`loan-summary.phone.guarantor.${
                              guarantor.id || index
                            }.approve`}
                          >
                            {actionText("check", "Record support")}
                          </PrimaryButton>
                          <SecondaryButton
                            type="button"
                            onClick={() =>
                              handleGuarantorDecision(guarantor, "declined")
                            }
                            disabled={busyApprove}
                            busy={busyDecline}
                            busyLabel="Declining"
                            fullWidth
                            stableHeight={52}
                            debugId={`loan-summary.phone.guarantor.${
                              guarantor.id || index
                            }.decline`}
                          >
                            {actionText("alert", "Decline")}
                          </SecondaryButton>
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        ) : null}

        {phoneLane === "record" ? (
          <section
            data-gsn-loan-summary-phone-lane="record"
            style={{ ...pageCard("#FFFFFF"), padding: 14 }}
          >
            <div style={sectionLabel()}>Support record</div>
            <div
              style={{
                marginTop: 6,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              What is recorded
            </div>

            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              {[
                ["Purpose", supportPurpose || "Not stated"],
                ["Amount", fmtMoney(summary.amount, currency)],
                ["Paid", fmtMoney(summary.paid_total, currency)],
                ["Due", safeDateTime(summary.due_at)],
              ].map(([label, value]) => (
                <div key={label} style={{ ...statTile("#F8FBFF"), padding: 10 }}>
                  <div style={sectionLabel()}>{label}</div>
                  <div
                    style={{
                      marginTop: 5,
                      color: "#0B1F33",
                      fontSize: 14,
                      fontWeight: 900,
                      lineHeight: 1.3,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>

            <GsnSnapshotPaperCard
              paperText={loanSummaryPaper}
              compact
              icon="document"
              maxBodyLines={8}
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 8,
              }}
            >
              <SecondaryButton
                type="button"
                onClick={copyLoanSummary}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.copy-summary"
              >
                {actionText("copy", "Copy summary")}
              </SecondaryButton>
              <SecondaryButton
                type="button"
                onClick={copyLoanAuditLink}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.copy-audit"
              >
                {actionText("copy", "Copy record link")}
              </SecondaryButton>
            </div>

            <div style={{ marginTop: 12, ...innerCard("#F8FBFF") }}>
              <div style={sectionLabel()}>Payment record</div>
              <div style={{ marginTop: 7, ...helperText(), color: "#0B1F33" }}>
                {latestRepaymentExpectedPayment
                  ? `${latestRepaymentStatusLabel}: ${firstTruthy(
                      latestRepaymentExpectedPayment.reference_display,
                      latestRepaymentExpectedPayment.reference_normalized,
                      "Reference pending"
                    )}`
                  : repayments.length > 0
                  ? `${repayments.length} repayment record${
                      repayments.length === 1 ? "" : "s"
                    } visible.`
                  : "No repayment record is shown yet."}
              </div>
            </div>

            <div style={{ marginTop: 10, ...innerCard("#F8FBFF") }}>
              <div style={sectionLabel()}>Latest evidence note</div>
              <div style={{ marginTop: 7, ...helperText(), color: "#0B1F33" }}>
                {latestEvent
                  ? latestNote ||
                    "A support event is recorded without a public note."
                  : "No support event note is visible here right now."}
              </div>
            </div>
          </section>
        ) : null}

        {phoneLane === "tools" ? (
          <section
            data-gsn-loan-summary-phone-lane="tools"
            style={{ ...pageCard("#FFFFFF"), padding: 14 }}
          >
            <div style={sectionLabel()}>More support tasks</div>
            <div
              style={{
                marginTop: 6,
                color: "#0B1F33",
                fontSize: 18,
                fontWeight: 950,
              }}
            >
              Choose one next page
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <StableCtaLink
                to={routes.workbench}
                kind="primary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.route.workbench"
              >
                {actionText("briefcase", "Continue support")}
              </StableCtaLink>
              <StableCtaLink
                to={routes.suggestions}
                kind="secondary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.route.suggestions"
              >
                {actionText("search", "Find supporters")}
              </StableCtaLink>
              <StableCtaLink
                to={routes.readiness}
                kind="secondary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.route.readiness"
              >
                {actionText("check", "Check readiness")}
              </StableCtaLink>
              <StableCtaLink
                to={revenueRoute}
                kind="secondary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.route.finance"
              >
                {actionText(
                  "financeInstitution",
                  canOpenCommandRevenue ? "Money breakdown" : "Money record"
                )}
              </StableCtaLink>
              {canRepay ? (
                <StableCtaLink
                  to={repaymentRoute}
                  kind="secondary"
                  fullWidth
                  stableHeight={52}
                  debugId="loan-summary.phone.route.repayment"
                >
                  {actionText("repaymentSchedule", "Make repayment")}
                </StableCtaLink>
              ) : null}
              <StableCtaLink
                to={routes.loans}
                kind="secondary"
                fullWidth
                stableHeight={52}
                debugId="loan-summary.phone.route.loans"
              >
                {actionText("community", "All support requests")}
              </StableCtaLink>
            </div>
          </section>
        ) : null}
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
        sectionLabel="Support Summary"
        title={`Support #${summary.id}`}
        subtitle="Review one support item and choose the next action."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loan Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This shows the amount, supporters, repayment state, evidence, and finance split for one support item."
        why="It keeps the support story clear before you move money or make decisions."
        next="Check the facts, then open only the section that needs action."
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
          <div style={{ display: isCompact ? "none" : "block" }}>
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
              <span style={badge(false)}>GSN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              {supportPurpose ? (
                <span style={badge(false)}>Purpose: {supportPurpose}</span>
              ) : null}
              <span style={badge(false)}>Current step: Support summary</span>
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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
                gap: 10,
              }}
            >
              <SecondaryButton
                onClick={copyLoanSummary}
                minWidth={isCompact ? undefined : 164}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.copy-summary"
              >
                {actionText("copy", "Copy summary")}
              </SecondaryButton>
              <SecondaryButton
                onClick={copyLoanAuditLink}
                minWidth={isCompact ? undefined : 148}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.copy-audit-link"
              >
                {actionText("copy", "Copy audit")}
              </SecondaryButton>
            </div>

            <GsnSnapshotPaperCard
              paperText={loanSummaryPaper}
              compact={isCompact}
              icon="document"
              maxBodyLines={isCompact ? 6 : undefined}
              style={{ marginTop: 14 }}
            />
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
                  ? supportProcessMessage
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
                A clear summary keeps the support flow easier to defend.
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

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={124}
            stableHeight={52}
            debugId="loan-summary.toggle-overview"
            style={{
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              transition: "none",
            }}
          >
            {actionText(collapsed.overview ? "document" : "lock", collapsed.overview ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What these facts show"
          what="This shows the amount, balance, and supporter counts."
          why="It gives the support position before deeper action."
          next="Check these facts, then open only the section you need."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Purpose</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 17,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {supportPurpose || "Not stated"}
              </div>
            </div>

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
              <div style={sectionLabel()}>Supporters needed</div>
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
              <div style={sectionLabel()}>Recorded support</div>
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
              <div style={sectionLabel()}>Pending supporters</div>
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
                  <div style={sectionLabel()}>Supporter pool</div>
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
                  <div style={sectionLabel()}>Net disbursed preview</div>
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

                <div style={{ ...statTile("#FFFBEF"), gridColumn: "1 / -1" }}>
                  <div style={sectionLabel()}>Allocation boundary</div>
                  <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                    Allocation preview only; it is not payment instruction,
                    settlement confirmation, or evidence that money has moved.
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
              <div style={sectionLabel()}>Supporter decisions</div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Review each supporter separately. Bulk action stays off here.
              </div>
            </div>

            <SubtleButton
              onClick={() => toggleSection("guarantors")}
              minWidth={124}
              stableHeight={52}
              debugId="loan-summary.toggle-guarantors"
              style={{
                whiteSpace: "nowrap",
                flex: "0 0 auto",
                transition: "none",
              }}
            >
              {actionText(collapsed.guarantors ? "document" : "lock", collapsed.guarantors ? "Open" : "Hide")}
            </SubtleButton>
          </div>

          <ExplainToggle
            label="How to use these decisions"
            what="Review pending supporters one by one."
            why="Each decision stays visible and deliberate."
            next="Record support or decline only the rows that are ready; this records a support decision, not whole-request approval or release authority."
            tone="light"
            style={{ marginTop: 12 }}
          />

          <div
            style={{
              ...innerCard(loanStatus === "incomplete" ? "#FFF7ED" : "#F8FBFF"),
              marginTop: 12,
              border:
                loanStatus === "incomplete"
                  ? "1px solid rgba(194,65,12,0.22)"
                  : "1px solid rgba(11,99,209,0.14)",
            }}
          >
            <div style={sectionLabel()}>
              {loanStatus === "incomplete" ? "Support still needs action" : "Current support process"}
            </div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {supportProcessMessage}
            </div>
          </div>

          {!collapsed.guarantors ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {guarantors.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.45 }}>
                  No supporter has been attached yet.
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
                              Support: {fmtMoney(g.pledge_amount, currency)}
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
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(112px, 1fr))",
                            gap: 8,
                            justifyContent: isCompact ? "flex-start" : "flex-end",
                          }}
                        >
                          <PrimaryButton
                            onClick={() => handleGuarantorDecision(g, "approved")}
                            disabled={!canDecide || busyDecline}
                            busy={busyApprove}
                            busyLabel="Recording"
                            minWidth={isCompact ? undefined : 112}
                            fullWidth
                            stableHeight={52}
                            debugId={`loan-summary.guarantor.${g.id || idx}.approve`}
                          >
                            {actionText("check", busyApprove ? "Recording" : "Record support")}
                          </PrimaryButton>

                          <SecondaryButton
                            onClick={() => handleGuarantorDecision(g, "declined")}
                            disabled={!canDecide || busyApprove}
                            busy={busyDecline}
                            busyLabel="Declining"
                            minWidth={isCompact ? undefined : 112}
                            fullWidth
                            stableHeight={52}
                            debugId={`loan-summary.guarantor.${g.id || idx}.decline`}
                          >
                            {actionText("alert", busyDecline ? "Declining" : "Decline")}
                          </SecondaryButton>
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
                : "Bulk supporter actions are not enabled here. Keep the path deliberate and line-by-line."}
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: 10,
              }}
            >
              <SecondaryButton
                disabled
                minWidth={isCompact ? undefined : 190}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.bulk-approve-disabled"
              >
                {actionText("lock", "Bulk approve off")}
              </SecondaryButton>
              <SecondaryButton
                disabled
                minWidth={isCompact ? undefined : 190}
                fullWidth
                stableHeight={52}
                debugId="loan-summary.bulk-decline-disabled"
              >
                {actionText("lock", "Bulk decline off")}
              </SecondaryButton>
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
Planning evidence for possible supporter outreach. These rows do not approve support, prove financial reliability, or endorse anyone.
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {suggestions.length === 0 ? (
                <div style={{ color: "#64748B", lineHeight: 1.45 }}>
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
                      {Number.isFinite(Number(s.cci_score ?? s.cci)) ? (
                        <span style={badge(false)}>
                          General evidence: {String(s.cci_score ?? s.cci)}
                        </span>
                      ) : null}

                      {Number.isFinite(Number(s.recommended_pledge)) ? (
                        <span style={badge(true)}>
                          Suggested support: {fmtMoney(s.recommended_pledge, currency)}
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
                Repayment records and the next money step appear here.
              </div>
            </div>

            <SubtleButton
              onClick={() => toggleSection("repayment")}
              minWidth={124}
              stableHeight={52}
              debugId="loan-summary.toggle-repayment"
              style={{
                whiteSpace: "nowrap",
                flex: "0 0 auto",
                transition: "none",
              }}
            >
              {actionText(collapsed.repayment ? "document" : "lock", collapsed.repayment ? "Open" : "Hide")}
            </SubtleButton>
          </div>

          {!collapsed.repayment ? (
            <>
              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {latestRepaymentExpectedPayment ? (
                  <div
                    style={innerCard(
                      latestRepaymentIsComplete
                        ? "#F3FBF5"
                        : "#F8FBFF"
                    )}
                  >
                    <div style={sectionLabel()}>Repayment expectation</div>
                    <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                      <div style={helperText()}>
                        Status: {latestRepaymentStatusLabel}
                      </div>
                      <div style={helperText()}>
                        Reference: {firstTruthy(
                          latestRepaymentExpectedPayment.reference_display,
                          latestRepaymentExpectedPayment.reference_normalized,
                          "Awaiting reference"
                        )}
                      </div>
                      <div style={helperText()}>
                        Expected: {fmtMoney(
                          latestRepaymentExpectedPayment.amount || 0,
                          latestRepaymentCurrency
                        )}
                      </div>
                      {latestRepaymentProgress ? (
                        <div style={helperText()}>Progress: {latestRepaymentProgress}</div>
                      ) : null}
                      {latestRepaymentPlan.length > 0 ? (
                        <div style={helperText()}>
                          Plan: {latestRepaymentPlan.length} step
                          {latestRepaymentPlan.length === 1 ? "" : "s"}
                          {nextRepaymentPlanItem
                            ? `, next ${fmtMoney(
                                nextRepaymentPlanItem.amount,
                                safeStr(latestRepaymentExpectedPayment.currency || currency)
                              )} due ${safeDateTime(nextRepaymentPlanItem.due_at)}`
                            : ""}
                        </div>
                      ) : null}
                      <div style={helperText()}>
                        {latestRepaymentGuidance}
                      </div>
                      {latestRepaymentExpectedPayment.due_at ? (
                        <div style={helperText()}>
                          Due: {safeDateTime(latestRepaymentExpectedPayment.due_at)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {repayments.length === 0 ? (
                  <div style={{ color: "#64748B", lineHeight: 1.45 }}>
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
                  ? "Use Next pages when you are ready for the payment step."
                  : "Repayment opens after approval or disbursement."}
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

              <SubtleButton
                onClick={() => toggleSection("evidence")}
                minWidth={124}
                stableHeight={52}
                debugId="loan-summary.toggle-evidence"
                style={{
                  whiteSpace: "nowrap",
                  flex: "0 0 auto",
                  transition: "none",
                }}
              >
                {actionText(collapsed.evidence ? "document" : "lock", collapsed.evidence ? "Open" : "Hide")}
              </SubtleButton>
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
                      lineHeight: 1.45,
                    }}
                  >
                    Event type:{" "}
                    <strong style={{ color: "#0B1F33" }}>
                      {safeStr(latestEvent.event_type || "-")}
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
                    lineHeight: 1.45,
                  }}
                >
                  No trust event evidence is visible here right now.
                </div>
              )
            ) : null}
          </div>

          <div style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Revenue allocation preview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Allocation preview only; it is not payment instruction,
              settlement confirmation, or evidence that money has moved.
            </div>

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
                    Supporter pool
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
                    Net disbursed preview
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
                  lineHeight: 1.45,
                }}
              >
                Revenue preview is not visible yet.
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <StableCtaLink
                to={revenueRoute}
                minWidth={isCompact ? undefined : 210}
                fullWidth={isCompact}
                stableHeight={52}
                debugId="loan-summary.open-revenue-preview"
              >
                {actionText("wallet", canOpenCommandRevenue ? "Revenue" : "Finance")}
              </StableCtaLink>
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
              {supportItemActive ? "Next support steps" : "Next pages"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {supportItemActive
                ? "Open the next page for this support item."
                : "Move from support summary into the next page you need."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={124}
            stableHeight={52}
            debugId="loan-summary.toggle-routes"
            style={{
              whiteSpace: "nowrap",
              flex: "0 0 auto",
              transition: "none",
            }}
          >
            {actionText(collapsed.routes ? "document" : "lock", collapsed.routes ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: 12,
            }}
          >
            <StableCtaLink
              to={routes.workbench}
              debugId="loan-summary.route.workbench"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(true)}
            >
              {routeHeading("briefcase", "Support Workbench")}
              <div style={routeTileDetailStyle()}>
                Continue support handling here.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.suggestions}
              debugId="loan-summary.route.suggestions"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              {routeHeading("search", "Find Supporters")}
              <div style={routeTileDetailStyle()}>
                Check supporter fit.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.readiness}
              debugId="loan-summary.route.readiness"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              {routeHeading("check", "Support Readiness")}
              <div style={routeTileDetailStyle()}>
                Check whether the path is clean.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={revenueRoute}
              debugId="loan-summary.route.revenue"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              {routeHeading("wallet", canOpenCommandRevenue ? "Revenue Allocation" : "Finance File")}
              <div style={routeTileDetailStyle()}>
                {canOpenCommandRevenue
                  ? "Read fee and distribution logic."
                  : "Open the visible money record."}
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={
                canRepay
                  ? routeTarget("repayment", activeCommunityId, "loan-summary.route.repayment-target", {
                      loanId: summary.id,
                    })
                  : routes.finance
              }
              debugId="loan-summary.route.payment-or-finance"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              {routeHeading("bank", canRepay ? "Repayment Instructions" : "Finance")}
              <div style={routeTileDetailStyle()}>
                {canRepay
                  ? "Continue repayment."
                  : "Open the broader money view."}
              </div>
            </StableCtaLink>

            {!supportItemActive ? (
              <StableCtaLink
                to={routes.loans}
                debugId="loan-summary.route.loans"
                stableHeight={104}
                fullWidth
                style={routeTileStyle(false)}
              >
                {routeHeading("community", "Loan Support")}
                <div style={routeTileDetailStyle()}>
                  Return to the broader support overview.
                </div>
              </StableCtaLink>
            ) : null}
          </div>
        ) : null}
      </section>

    </div>
  );
}


