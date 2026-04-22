import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DomainIntroToggle from "../components/DomainIntroToggle";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySurface,
  type GuarantorExposureSummary,
} from "../lib/communityMoney";
import { navigateWithOrigin } from "../lib/nav";

type CollapseState = {
  overview: boolean;
  borrower: boolean;
  events: boolean;
  reconciliation: boolean;
};

type LoanRow = {
  id?: number;
  clanId?: number;
  status?: string | null;
  title?: string | null;
  role?: string | null;
  borrowerName?: string | null;
  guarantorName?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  createdAt?: string | null;
};

type LoanSummary = {
  id?: number;
  status?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  paidTotal?: string | number | null;
  remainingAmount?: string | number | null;
  serviceFee?: string | number | null;
  netDisbursed?: string | number | null;
  guarantorPool?: string | number | null;
  platformRevenue?: string | number | null;
  guarantorsRequired?: number | null;
  approvedGuarantors?: number | null;
  guarantorsTotal?: number | null;
  dueAt?: string | null;
  decisionAt?: string | null;
};

type PoolEvent = {
  id?: number;
  eventType?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference?: string | null;
  note?: string | null;
  createdAt?: string | null;
  confirmedAt?: string | null;
};

type ClanLiquidity = {
  clanId?: number | null;
  clanName?: string | null;
  activeLoansCount?: number | null;
  pledgedTotal?: string | null;
  lockedTotal?: string | null;
  releasedTotal?: string | null;
  note?: string | null;
};

type ExpectedPaymentRecord = {
  id?: number | null;
  expected_type?: string | null;
  amount?: string | null;
  currency?: string | null;
  reference_display?: string | null;
  status?: string | null;
  status_reason?: string | null;
  due_at?: string | null;
  matched_bank_event_id?: number | null;
  confirmed_at?: string | null;
};

type CrossCommunityPoolItem = {
  clan_id?: number | null;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  currency?: string | null;
  available_balance?: string | null;
  pending_deposits?: string | null;
  pending_withdrawals?: string | null;
  reserved_pool?: string | null;
  effective_available?: string | null;
  membership_pool_balance?: string | null;
  reference?: string | null;
};

type CrossCommunityPoolSummary = {
  user_id?: number | null;
  gmfn_id?: string | null;
  currency?: string | null;
  communities_count?: number | null;
  totals?: {
    available_balance?: string | null;
    pending_deposits?: string | null;
    pending_withdrawals?: string | null;
    reserved_pool?: string | null;
    effective_available?: string | null;
    membership_pool_balance?: string | null;
    guarantee_locked_as_guarantor?: string | null;
  } | null;
  items?: CrossCommunityPoolItem[];
};

const FINANCE_UI_STORAGE_KEY = "gmfn.finance.sections.v1";

const FINAL_LOAN_STATUSES = new Set([
  "approved",
  "repaid",
  "closed",
  "completed",
  "cancelled",
  "defaulted",
]);

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

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseMoneyNumber(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(value: any): string {
  return parseMoneyNumber(value).toFixed(2);
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function normalizeCrossCommunityPoolSummary(
  raw: any
): CrossCommunityPoolSummary | null {
  if (!raw) return null;
  const src = raw?.item || raw?.data || raw;
  const items = rowsOf<CrossCommunityPoolItem>(src?.items).map((item) => ({
    clan_id: Number.isFinite(Number(item?.clan_id))
      ? Number(item.clan_id)
      : null,
    community_code: firstTruthy(item?.community_code),
    clan_name: firstTruthy(item?.clan_name),
    marketplace_name: firstTruthy(item?.marketplace_name),
    currency: firstTruthy(item?.currency),
    available_balance: firstTruthy(item?.available_balance),
    pending_deposits: firstTruthy(item?.pending_deposits),
    pending_withdrawals: firstTruthy(item?.pending_withdrawals),
    reserved_pool: firstTruthy(item?.reserved_pool),
    effective_available: firstTruthy(item?.effective_available),
    membership_pool_balance: firstTruthy(item?.membership_pool_balance),
    reference: firstTruthy(item?.reference),
  }));

  return {
    user_id: Number.isFinite(Number(src?.user_id)) ? Number(src.user_id) : null,
    gmfn_id: firstTruthy(src?.gmfn_id),
    currency: firstTruthy(src?.currency, "NGN"),
    communities_count: Number.isFinite(Number(src?.communities_count))
      ? Number(src.communities_count)
      : items.length,
    totals: src?.totals || null,
    items,
  };
}

function countTrustEvents(rawCounts: any, names: string[]): number {
  if (!rawCounts || typeof rawCounts !== "object") return 0;
  return names.reduce((sum, name) => {
    const direct = Number(rawCounts[name] || 0);
    if (Number.isFinite(direct)) return sum + direct;
    return sum;
  }, 0);
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function expectedPaymentState(item: ExpectedPaymentRecord): string {
  if (safeStr(item.confirmed_at)) return "Confirmed";
  if (item.matched_bank_event_id) return "Matched";
  if (safeStr(item.reference_display)) return "Awaiting reconciliation";
  return "Awaiting issue";
}

function expectedPaymentNextAction(item: ExpectedPaymentRecord): string {
  const state = expectedPaymentState(item);
  if (state === "Confirmed") {
    return "Use the unlocked route or feature that depends on this payment.";
  }
  if (state === "Matched") {
    return "Reconciliation is in progress. Wait for confirmation to complete.";
  }
  if (state === "Awaiting reconciliation") {
    return "Pay with the exact reference, then wait for the bank match to appear.";
  }
  return "Generate or refresh the payment instruction so the reference can be issued.";
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  return String(raw || "").trim().replace(/\/+$/, "");
}

function buildHeaders(clanId?: number): Record<string, string> {
  const token =
    typeof (api as any).getAccessToken === "function"
      ? safeStr((api as any).getAccessToken())
      : "";

  const headers: Record<string, string> = {
    accept: "application/json",
  };

  if (clanId && Number.isFinite(Number(clanId)) && Number(clanId) > 0) {
    headers["X-Clan-Id"] = String(clanId);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function fetchJson(path: string, clanId?: number): Promise<any | null> {
  const res = await fetch(`${apiBase()}${path}`, {
    method: "GET",
    headers: buildHeaders(clanId),
    credentials: "include",
  });

  const text = await res.text();
  let payload: any = null;

  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  if (!res.ok) {
    throw new Error(
      safeStr(payload?.detail) ||
        safeStr(payload?.message) ||
        `Request failed (${res.status})`
    );
  }

  return payload;
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

function normalizeLoanRow(raw: any): LoanRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(src?.id || src?.loan_id) || undefined,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    status: firstTruthy(src?.status, src?.loan_status, src?.state, "open"),
    title: firstTruthy(
      src?.title,
      src?.purpose,
      src?.name,
      src?.loan_title,
      src?.description,
      "Loan support item"
    ),
    role: firstTruthy(
      src?.role,
      src?.my_role,
      src?.participant_role,
      src?.is_guarantor ? "Guarantor" : "",
      src?.is_borrower ? "Borrower" : ""
    ),
    borrowerName: firstTruthy(
      src?.borrower_name,
      src?.member_name,
      src?.requester_name
    ),
    guarantorName: firstTruthy(
      src?.guarantor_name,
      src?.supporter_name,
      src?.guarantee_name
    ),
    amount:
      src?.amount ??
      src?.principal_amount ??
      src?.loan_amount ??
      src?.outstanding_amount ??
      src?.requested_amount,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    createdAt: firstTruthy(src?.created_at, src?.requested_at),
  };
}

function normalizeLoanSummary(raw: any): LoanSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw?.data || raw;

  return {
    id: positiveNumber(firstDefined(src?.id, src?.loan_id)) || undefined,
    status: firstTruthy(src?.status),
    amount: firstDefined(src?.amount),
    currency: firstTruthy(src?.currency, "NGN"),
    paidTotal: firstDefined(src?.paid_total, src?.paidTotal),
    remainingAmount: firstDefined(src?.remaining_amount),
    serviceFee: firstDefined(src?.service_fee, src?.serviceFee),
    netDisbursed: firstDefined(src?.net_disbursed, src?.netDisbursed),
    guarantorPool: firstDefined(src?.guarantor_pool, src?.guarantorPool),
    platformRevenue: firstDefined(src?.platform_revenue, src?.platformRevenue),
    guarantorsRequired: positiveNumber(src?.guarantors_required) || undefined,
    approvedGuarantors: positiveNumber(src?.approved_guarantors) || undefined,
    guarantorsTotal: positiveNumber(src?.guarantors_total) || undefined,
    dueAt: firstTruthy(src?.due_at),
    decisionAt: firstTruthy(src?.decision_at),
  };
}

function normalizePoolEvent(raw: any): PoolEvent | null {
  if (!raw) return null;

  const src = raw?.item || raw;

  return {
    id: positiveNumber(src?.id) || undefined,
    eventType: firstTruthy(src?.event_type),
    amount: firstTruthy(src?.amount),
    currency: firstTruthy(src?.currency),
    reference: firstTruthy(src?.reference),
    note: firstTruthy(src?.note),
    createdAt: firstTruthy(src?.created_at),
    confirmedAt: firstTruthy(src?.confirmed_at),
  };
}

function normalizeClanLiquidity(raw: any): ClanLiquidity | null {
  if (!raw) return null;

  const src = raw?.item || raw?.data || raw;

  return {
    clanId: positiveNumber(src?.clan_id) || null,
    clanName: firstTruthy(src?.clan_name),
    activeLoansCount: Number.isFinite(Number(src?.active_loans_count))
      ? Number(src.active_loans_count)
      : null,
    pledgedTotal: firstTruthy(src?.pledged_total),
    lockedTotal: firstTruthy(src?.locked_total),
    releasedTotal: firstTruthy(src?.released_total),
    note: firstTruthy(src?.note),
  };
}

function isActiveLoan(row: LoanRow): boolean {
  const status = safeStr(row?.status).toLowerCase();
  return !FINAL_LOAN_STATUSES.has(status);
}

function isBorrowerLoan(row: LoanRow): boolean {
  const role = safeStr(row?.role).toLowerCase();
  return role === "borrower" || role.includes("borrow");
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
    background: primary ? "rgba(29,78,216,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#1D4ED8" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function tapSafeButtonBase(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    appearance: "none",
    WebkitAppearance: "none",
    isolation: "isolate",
    transform: "translateZ(0)",
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
      minHeight: 46,
      padding: "11px 15px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#1D4ED8",
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
      ...tapSafeButtonBase(),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 44,
      padding: "10px 13px",
      borderRadius: 12,
      border: "1px solid rgba(29,78,216,0.10)",
      background: "#F5FAFF",
      color: disabled ? "#94A3B8" : "#1E4063",
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
    ...tapSafeButtonBase(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    padding: "11px 15px",
    borderRadius: 14,
    border: "1px solid rgba(29,78,216,0.12)",
    background: "#FDFEFF",
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
    ...tapSafeButtonBase(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 106,
    padding: "10px 16px",
    borderRadius: 14,
    border: "1px solid rgba(29,78,216,0.12)",
    background: "#FDFEFF",
    color: "#1E4063",
    fontWeight: 900,
    fontSize: 13.5,
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "normal",
    boxShadow:
      "0 9px 18px rgba(10,24,49,0.075), inset 0 1px 0 rgba(255,255,255,0.78)",
  };
}

function stopFinanceTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function tableWrap(): React.CSSProperties {
  return {
    width: "100%",
    overflowX: "auto",
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
  };
}

function financeTable(): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 720,
    borderCollapse: "collapse",
  };
}

function tableHeadCell(): React.CSSProperties {
  return {
    padding: "11px 12px",
    borderBottom: "1px solid rgba(11,31,51,0.08)",
    background: "#F5F9FE",
    color: "#36506A",
    fontSize: 11,
    fontWeight: 950,
    letterSpacing: 0.28,
    textAlign: "left",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
}

function tableCell(strong = false): React.CSSProperties {
  return {
    padding: "12px",
    borderBottom: "1px solid rgba(11,31,51,0.06)",
    color: strong ? "#0B1F33" : "#51657A",
    fontSize: 13.5,
    fontWeight: strong ? 900 : 700,
    lineHeight: 1.45,
    verticalAlign: "top",
  };
}

function emptyRecord(text: string) {
  return (
    <div style={{ ...helperText(), color: "#64748B" }}>
      {text}
    </div>
  );
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
    borrower: false,
    events: false,
    reconciliation: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    borrower: Boolean(raw?.borrower ?? base.borrower),
    events: Boolean(raw?.events ?? base.events),
    reconciliation: Boolean(raw?.reconciliation ?? base.reconciliation),
  };
}

function communityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Awaiting issue"
  );
}

function communityRole(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.role,
      currentClan?.member_role,
      currentClan?.membership_role,
      currentClan?.participant_role
    ) || ""
  );
}

function toneStyles(kind: "calm" | "watch" | "pressure") {
  if (kind === "pressure") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (kind === "watch") {
    return {
      bg: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.16)",
      text: "#92400E",
    };
  }

  return {
    bg: "#F3FBF5",
    border: "1px solid rgba(34,197,94,0.16)",
    text: "#166534",
  };
}

export default function FinancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(FINANCE_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [moneySurface, setMoneySurface] = useState<CommunityMoneySurface | null>(
    null
  );
  const [poolState, setPoolState] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loanSummaries, setLoanSummaries] = useState<Record<number, LoanSummary>>(
    {}
  );
  const [poolEvents, setPoolEvents] = useState<PoolEvent[]>([]);
  const [clanLiquidity, setClanLiquidity] = useState<ClanLiquidity | null>(null);
  const [expectedPayments, setExpectedPayments] = useState<ExpectedPaymentRecord[]>(
    []
  );
  const [crossCommunityPool, setCrossCommunityPool] =
    useState<CrossCommunityPoolSummary | null>(null);
  const [trustWhy, setTrustWhy] = useState<any>(null);
  const [guarantorEarnings, setGuarantorEarnings] = useState<any>(null);

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
    writeLocalJSON(FINANCE_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    async function loadLoanSummary(
      loanId: number,
      clanId: number
    ): Promise<LoanSummary | null> {
      const viaFn = await callFirstAvailable(
        ["getLoanSummary", "getLoan", "getLoanById"],
        [[loanId], [{ loan_id: loanId }], []]
      );

      if (viaFn) return normalizeLoanSummary(viaFn);

      const direct = await fetchJson(`/loans/${loanId}/summary`, clanId).catch(
        () => null
      );

      return normalizeLoanSummary(direct);
    }

    (async () => {
      setLoading(true);

      try {
        const mePromise =
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null);

        const clanPromise =
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null);

        const loansPromise =
          typeof (api as any).listMyLoans === "function"
            ? (api as any).listMyLoans().catch(() => [])
            : Promise.resolve([]);

        const poolPromise =
          typeof (api as any).getPoolMe === "function"
            ? (api as any).getPoolMe("NGN", 20).catch(() => null)
            : Promise.resolve(null);

        const crossPoolPromise =
          typeof (api as any).getPoolMeSummary === "function"
            ? (api as any).getPoolMeSummary("NGN").catch(() => null)
            : Promise.resolve(null);

        const trustWhyPromise =
          typeof (api as any).getTrustWhyMe === "function"
            ? (api as any).getTrustWhyMe().catch(() => null)
            : Promise.resolve(null);

        const guarantorEarningsPromise =
          typeof (api as any).getMyGuarantorEarnings === "function"
            ? (api as any).getMyGuarantorEarnings(100).catch(() => null)
            : Promise.resolve(null);

        const [
          meRes,
          clanRes,
          loansRes,
          poolRes,
          crossPoolRes,
          trustWhyRes,
          guarantorEarningsRes,
        ] = await Promise.all([
          mePromise,
          clanPromise,
          loansPromise,
          poolPromise,
          crossPoolPromise,
          trustWhyPromise,
          guarantorEarningsPromise,
        ]);

        if (!alive) return;

        const normalizedLoans = rowsOf<any>(loansRes)
          .map((row) => normalizeLoanRow(row))
          .filter(Boolean) as LoanRow[];

        const filteredLoans = normalizedLoans.filter((row) => {
          const rowClanId = Number(row?.clanId || 0);
          return rowClanId <= 0 || rowClanId === selectedClanId;
        });

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setLoans(filteredLoans);
        setPoolState(poolRes || null);
        setCrossCommunityPool(normalizeCrossCommunityPoolSummary(crossPoolRes));
        setTrustWhy(trustWhyRes || null);
        setGuarantorEarnings(guarantorEarningsRes || null);

        const gmfnId = firstTruthy(meRes?.gmfn_id);

        if (selectedClanId && gmfnId) {
          const [surface, liquidityRes, expectedRes] = await Promise.all([
            getCommunityMoneySurface(selectedClanId, gmfnId, "NGN").catch(
              () => null
            ),
            fetchJson("/analytics/clan-liquidity", selectedClanId).catch(
              () => null
            ),
            typeof (api as any).listExpectedPayments === "function"
              ? (api as any)
                  .listExpectedPayments({ clan_id: selectedClanId, limit: 100 })
                  .catch(() => ({ items: [] }))
              : Promise.resolve({ items: [] }),
          ]);

          if (!alive) return;

          setMoneySurface(surface);
          setClanLiquidity(normalizeClanLiquidity(liquidityRes));
          setExpectedPayments(rowsOf<ExpectedPaymentRecord>(expectedRes));
        } else {
          setMoneySurface(null);
          setClanLiquidity(null);
          setExpectedPayments([]);
        }

        const summaryPairs = await Promise.all(
          filteredLoans.slice(0, 12).map(async (row) => {
            const loanId = positiveNumber(row.id);
            if (!loanId || !selectedClanId) return null;
            const summary = await loadLoanSummary(loanId, selectedClanId).catch(
              () => null
            );
            return summary ? ([loanId, summary] as const) : null;
          })
        );

        if (!alive) return;

        const nextSummaryMap: Record<number, LoanSummary> = {};
        for (const pair of summaryPairs) {
          if (!pair) continue;
          nextSummaryMap[pair[0]] = pair[1];
        }
        setLoanSummaries(nextSummaryMap);

        const poolEventRows = rowsOf<any>(poolRes?.recent_events || poolRes)
          .map((row) => normalizePoolEvent(row))
          .filter(Boolean) as PoolEvent[];

        setPoolEvents(poolEventRows);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

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

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [currentClan, selectedClanId]);

  const publicCommunityCode = useMemo(() => {
    return communityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return communityRole(currentClan);
  }, [currentClan]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
  }, [me]);

  const activeLoans = useMemo(() => loans.filter(isActiveLoan), [loans]);
  const borrowerLoans = useMemo(
    () => activeLoans.filter(isBorrowerLoan),
    [activeLoans]
  );
  const guarantorExposure: GuarantorExposureSummary | null =
    moneySurface?.guarantorExposure || null;

  const poolAmount = safeStr(
    moneySurface?.poolAmount ||
      poolState?.available_balance ||
      poolState?.availableBalance ||
      "0.00"
  );
  const effectiveAvailable = safeStr(
    moneySurface?.effectiveAvailable ||
      poolState?.effective_available ||
      poolState?.available_balance ||
      "0.00"
  );
  const reservedPool = safeStr(
    moneySurface?.reservedPool || poolState?.reserved_pool || "0.00"
  );
  const pendingDeposits = safeStr(
    moneySurface?.pendingDeposits || poolState?.pending_deposits || "0.00"
  );
  const pendingWithdrawals = safeStr(
    moneySurface?.pendingWithdrawals || poolState?.pending_withdrawals || "0.00"
  );
  const poolCurrency = safeStr(
    moneySurface?.poolCurrency || poolState?.currency || "NGN"
  );
  const poolReference = safeStr(
    moneySurface?.poolReference || poolState?.reference || ""
  );

  const crossCommunityItems = useMemo(() => {
    return Array.isArray(crossCommunityPool?.items)
      ? crossCommunityPool.items
      : [];
  }, [crossCommunityPool]);

  const crossTotals = (crossCommunityPool?.totals || {}) as NonNullable<
    CrossCommunityPoolSummary["totals"]
  >;
  const crossCurrency = safeStr(crossCommunityPool?.currency || poolCurrency || "NGN");
  const crossCommunitiesCount =
    positiveNumber(crossCommunityPool?.communities_count) ||
    crossCommunityItems.length ||
    (selectedClanId ? 1 : 0);
  const crossAvailableBalance = safeStr(
    crossTotals?.available_balance || poolAmount || "0.00"
  );
  const crossEffectiveAvailable = safeStr(
    crossTotals?.effective_available || effectiveAvailable || "0.00"
  );
  const crossPendingDeposits = safeStr(
    crossTotals?.pending_deposits || pendingDeposits || "0.00"
  );
  const crossPendingWithdrawals = safeStr(
    crossTotals?.pending_withdrawals || pendingWithdrawals || "0.00"
  );
  const crossReservedPool = safeStr(
    crossTotals?.reserved_pool || reservedPool || "0.00"
  );
  const crossMembershipPool = safeStr(
    crossTotals?.membership_pool_balance || crossAvailableBalance || "0.00"
  );
  const crossLockedGuarantees = safeStr(
    crossTotals?.guarantee_locked_as_guarantor ||
      guarantorExposure?.totalLocked ||
      "0.00"
  );

  const trustComputed = trustWhy?.computed || {};
  const trustCounts = trustComputed?.counts || {};
  const trustScore = firstTruthy(
    trustComputed?.standing_score,
    trustComputed?.trust_score,
    trustComputed?.score,
    me?.trust_score,
    "0"
  );
  const trustBand = firstTruthy(
    trustComputed?.trust_band,
    trustComputed?.band,
    me?.trust_band,
    "Not ready"
  );
  const trustPackId = firstTruthy(trustWhy?.pack_id);
  const repaymentProofCount = countTrustEvents(trustCounts, [
    "loan_fully_repaid",
    "loan_repaid",
    "repaid",
    "repayment_full",
    "full_repayment",
    "loan_repayment_completed",
  ]);
  const supportProofCount = countTrustEvents(trustCounts, [
    "guarantor_success",
    "guarantor_repayment_success",
    "guarantor_supported_repaid",
    "guarantor_credit",
  ]);
  const financePressureEventCount = countTrustEvents(trustCounts, [
    "missed_payment",
    "repayment_missed",
    "late_payment",
    "overdue",
    "default",
    "loan_defaulted",
    "write_off",
  ]);
  const guarantorEarningsTotal = safeStr(guarantorEarnings?.total_earned || "0.00");
  const guarantorEarningsItems = rowsOf<any>(guarantorEarnings);

  const activeExpectedPayments = useMemo(() => {
    return expectedPayments.filter((item) => {
      const status = safeStr(item?.status).toLowerCase();
      return !["applied", "cancelled", "expired"].includes(status);
    });
  }, [expectedPayments]);

  const pendingReconciliationCount = useMemo(() => {
    return activeExpectedPayments.filter((item) => {
      const status = safeStr(item?.status).toLowerCase();
      return status === "expected" || status === "matched";
    }).length;
  }, [activeExpectedPayments]);

  const expectedPaymentStateCounts = useMemo(() => {
    return activeExpectedPayments.reduce(
      (acc, item) => {
        const state = expectedPaymentState(item);
        if (state === "Confirmed") acc.confirmed += 1;
        else if (state === "Matched") acc.matched += 1;
        else if (state === "Awaiting reconciliation") acc.awaitingReconciliation += 1;
        else acc.awaitingIssue += 1;
        return acc;
      },
      {
        confirmed: 0,
        matched: 0,
        awaitingReconciliation: 0,
        awaitingIssue: 0,
      }
    );
  }, [activeExpectedPayments]);

  const borrowerRemainingTotal = useMemo(() => {
    return borrowerLoans.reduce((sum, row) => {
      const summary = loanSummaries[positiveNumber(row.id)];
      return sum + parseMoneyNumber(summary?.remainingAmount);
    }, 0);
  }, [borrowerLoans, loanSummaries]);

  const borrowerRequestedTotal = useMemo(() => {
    return borrowerLoans.reduce((sum, row) => {
      return sum + parseMoneyNumber(row.amount);
    }, 0);
  }, [borrowerLoans]);

  const financeHelps = useMemo(() => {
    const rows: string[] = [];

    if (crossCommunitiesCount > 0) {
      rows.push(
        `${crossCommunitiesCount} community finance unit${
          crossCommunitiesCount === 1 ? "" : "s"
        } visible under this GSN ID.`
      );
    }

    if (parseMoneyNumber(crossEffectiveAvailable) > 0) {
      rows.push(
        `Effective available across communities: ${fmtMoney(
          crossEffectiveAvailable
        )} ${crossCurrency}.`
      );
    }

    if (repaymentProofCount > 0) {
      rows.push(
        `${repaymentProofCount} repayment proof event${
          repaymentProofCount === 1 ? "" : "s"
        } in the trust evidence record.`
      );
    }

    if (supportProofCount > 0) {
      rows.push(
        `${supportProofCount} guarantor support success event${
          supportProofCount === 1 ? "" : "s"
        } recorded.`
      );
    }

    if (parseMoneyNumber(guarantorEarningsTotal) > 0) {
      rows.push(
        `Earned guarantor value: ${fmtMoney(
          guarantorEarningsTotal
        )} ${crossCurrency}.`
      );
    }

    if (rows.length === 0) {
      rows.push(
        "Confirmed movement is still limited; positive finance signals will appear as records build."
      );
    }

    return rows.slice(0, 5);
  }, [
    crossCommunitiesCount,
    crossCurrency,
    crossEffectiveAvailable,
    guarantorEarningsTotal,
    repaymentProofCount,
    supportProofCount,
  ]);

  const financeWatchItems = useMemo(() => {
    const rows: string[] = [];

    if (borrowerRemainingTotal > 0) {
      rows.push(
        `Borrower-side remaining amount: ${fmtMoney(
          borrowerRemainingTotal
        )} ${crossCurrency}.`
      );
    }

    if (parseMoneyNumber(crossLockedGuarantees) > 0) {
      rows.push(
        `Guarantee support locked across the file: ${fmtMoney(
          crossLockedGuarantees
        )} ${crossCurrency}.`
      );
    }

    if (pendingReconciliationCount > 0) {
      rows.push(
        `${pendingReconciliationCount} expected payment${
          pendingReconciliationCount === 1 ? "" : "s"
        } awaiting matching or confirmation.`
      );
    }

    if (parseMoneyNumber(crossPendingWithdrawals) > 0) {
      rows.push(
        `Withdrawals awaiting completion: ${fmtMoney(
          crossPendingWithdrawals
        )} ${crossCurrency}.`
      );
    }

    if (parseMoneyNumber(crossPendingDeposits) > 0) {
      rows.push(
        `Deposits awaiting completion: ${fmtMoney(
          crossPendingDeposits
        )} ${crossCurrency}.`
      );
    }

    if (financePressureEventCount > 0) {
      rows.push(
        `${financePressureEventCount} finance pressure event${
          financePressureEventCount === 1 ? "" : "s"
        } in the trust evidence record.`
      );
    }

    if (rows.length === 0) {
      rows.push(
        "No active cross-community pressure signal is standing out from visible records."
      );
    }

    return rows.slice(0, 5);
  }, [
    borrowerRemainingTotal,
    crossCurrency,
    crossLockedGuarantees,
    crossPendingDeposits,
    crossPendingWithdrawals,
    financePressureEventCount,
    pendingReconciliationCount,
  ]);

  const financeFileReading = useMemo(() => {
    const hasHardPressure =
      borrowerRemainingTotal > 0 ||
      parseMoneyNumber(crossLockedGuarantees) > parseMoneyNumber(crossEffectiveAvailable);

    const hasWatchPressure =
      hasHardPressure ||
      pendingReconciliationCount > 0 ||
      parseMoneyNumber(crossPendingDeposits) > 0 ||
      parseMoneyNumber(crossPendingWithdrawals) > 0 ||
      financePressureEventCount > 0;

    if (hasHardPressure) {
      return {
        tone: "pressure" as const,
        title: "Attention required.",
        detail:
          "Borrower-side repayment, locked support, or both are creating visible pressure in this finance file.",
      };
    }

    if (hasWatchPressure) {
      return {
        tone: "watch" as const,
        title: "Active follow-up needed.",
        detail:
          "The record is not blocked, but pending payments, withdrawals, deposits, or trust-linked finance events need attention.",
      };
    }

    return {
      tone: "calm" as const,
      title: "No active finance pressure shown.",
      detail:
        "The current combined view is not showing active borrower pressure, heavy locked support, or waiting payment items.",
    };
  }, [
    borrowerRemainingTotal,
    crossEffectiveAvailable,
    crossLockedGuarantees,
    crossPendingDeposits,
    crossPendingWithdrawals,
    financePressureEventCount,
    pendingReconciliationCount,
  ]);

  const financeFileTone = toneStyles(financeFileReading.tone);

  const financeNextActionItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "finance-summary",
        label: "Check my money record",
        detail: "Open the main Finance summary on this page.",
        technical: "Finance summary",
        keywords: ["summary", "balance", "record", "available", "locked", "pool"],
        tone: "primary",
      },
      {
        id: "money-in",
        label: "Add money",
        detail: "Open pool pay-in instructions.",
        technical: "Money In",
        to: "/app/payment/pool",
        keywords: ["deposit", "pay in", "add money", "money in", "pool"],
      },
      {
        id: "money-out",
        label: "Take money out",
        detail: "Open withdrawal guidance and payout checks.",
        technical: "Money Out",
        to: "/app/withdrawal-instructions",
        keywords: ["withdraw", "withdrawal", "cash out", "payout", "take money"],
      },
      {
        id: "support",
        label: "Borrow / lend / support",
        detail: "Open the wider support and loan workspace.",
        technical: "Loans / Support",
        to: "/app/loans",
        keywords: ["loan", "borrow", "lend", "support", "guarantor", "repay"],
      },
      {
        id: "payment-rails",
        label: "Choose payment route",
        detail: "Review inbound and outbound money route options.",
        technical: "Payment rails",
        to: "/app/payment-rails",
        keywords: ["rail", "payment route", "bank", "transfer", "route"],
      },
      {
        id: "payout-details",
        label: "Set payout details",
        detail: "Check where withdrawals should be sent.",
        technical: "Payout details",
        to: "/app/payout-details",
        keywords: ["account", "bank account", "payout details", "destination"],
      },
      {
        id: "reconciliation",
        label: "Check expected payments",
        detail: `${pendingReconciliationCount} payment item${
          pendingReconciliationCount === 1 ? "" : "s"
        } may need matching or confirmation.`,
        technical: "Payment reconciliation",
        keywords: ["expected", "match", "matched", "reference", "reconciliation"],
        tone: pendingReconciliationCount > 0 ? "primary" : "soft",
      },
      {
        id: "readiness",
        label: "Check loan readiness",
        detail: "Review support position and readiness signals.",
        technical: "Loan readiness",
        to: "/app/loan-readiness",
        keywords: ["ready", "readiness", "eligible", "clean", "trust"],
      },
      {
        id: "trust-passport",
        label: "Open Trust Passport",
        detail: "See the trust evidence behind repayment and support behaviour.",
        technical: "Trust Passport",
        to: "/app/trust",
        keywords: ["trust", "passport", "evidence", "score", "record"],
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
        id: "notifications",
        label: "See what is waiting",
        detail: "Open the action queue when someone needs a response.",
        technical: "Notifications",
        to: "/app/notifications",
        keywords: ["notice", "notification", "inbox", "waiting", "queue"],
        tone: "soft",
      },
      {
        id: "focus",
        label: "Add a money promise",
        detail: "Open focus commitments for a savings, repayment, or support promise.",
        technical: "Focus commitments",
        to: "/app/dashboard#focus-commitments",
        keywords: ["promise", "commitment", "focus", "plan", "repayment plan"],
        tone: "soft",
      },
    ],
    [pendingReconciliationCount]
  );

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

  function openFinanceRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function handleFinanceNextAction(item: NextActionGuideItem) {
    switch (item.id) {
      case "finance-summary":
        setCollapsed((prev) => ({ ...prev, overview: false }));
        window.setTimeout(() => {
          document
            .getElementById("finance-summary")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
        break;
      case "reconciliation":
        setCollapsed((prev) => ({ ...prev, reconciliation: false }));
        window.setTimeout(() => {
          document
            .getElementById("finance-reconciliation")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 60);
        break;
      default:
        if (item.to) openFinanceRoute(item.to);
        break;
    }
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
          sectionLabel="Finance"
          title="Finance"
          subtitle="Loading finance record..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Money In", to: "/app/payment/pool" },
            { label: "Money Out", to: "/app/withdrawal-instructions" },
          ]}
          utilityLinks={[
            { label: "Payment Rails", to: "/app/payment-rails" },
            { label: "Payout Details", to: "/app/payout-details" },
            { label: "Commitment Builder", to: "/app/dashboard#focus-commitments" },
            { label: "Loans", to: "/app/loans" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading finance record...
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
        sectionLabel="Finance"
        title="Finance"
        subtitle="Finance turns money behaviour into a proof trail across communities."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Money In", to: "/app/payment/pool" },
          { label: "Money Out", to: "/app/withdrawal-instructions" },
        ]}
        utilityLinks={[
          { label: "Payment Rails", to: "/app/payment-rails" },
          { label: "Payout Details", to: "/app/payout-details" },
          { label: "Commitment Builder", to: "/app/dashboard#focus-commitments" },
          { label: "Loans", to: "/app/loans" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
      />

      <DomainIntroToggle
        title="How Finance Helps You"
        body="Finance is not here to judge trust by how much money someone already has. It helps a member build visible reliability from how they behave around money: borrowing honestly, repaying properly, supporting others responsibly, and avoiding pressure across too many communities."
        bullets={[
          "A member without formal bank history can still build proof through small completed repayments, confirmed payments, and responsible support.",
          "If the member belongs to five communities, Finance keeps one GSN finance file with each community shown as its own simple finance unit.",
          "Each community unit can show what came in, what was borrowed, what was repaid, what is still due, and whether the status is Helping, Watch, or Pressure.",
          "Good behaviour in one community can strengthen the wider trust story, while missed payments, defaults, or heavy locked support become early warning signals.",
          "Finance shows what happened with money. Trust Passport explains what that behaviour means. Trust Events record the proof that changes the trust story.",
        ]}
        note="Golden rule: trust is earned when finance promises are completed, not when money merely moves."
        tone="blue"
      />

      <NextActionGuide
        storageKey="gmfn.finance.nextActionGuide.v1"
        compact={isCompact}
        items={financeNextActionItems}
        onSelect={handleFinanceNextAction}
        intro="Type a finance task such as deposit, withdraw, loan, payout, support, expected payment, or bank route. GSN points to the closest money path."
      />

      <section
        id="finance-file"
        style={pageCard(
          "linear-gradient(145deg, #F8FBFF 0%, #FFFFFF 34%, #EEF6FF 72%, #FFF7EF 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) minmax(320px, 0.9fr)",
            gap: 16,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              borderRadius: 24,
              padding: isCompact ? 18 : 22,
              border: "1px solid rgba(15,23,42,0.12)",
              background:
                "radial-gradient(circle at 14% 18%, rgba(219,39,119,0.20), transparent 28%), radial-gradient(circle at 90% 8%, rgba(245,158,11,0.24), transparent 26%), linear-gradient(145deg, #0B1F33 0%, #133A5A 54%, #1F5C86 100%)",
              boxShadow: "0 24px 48px rgba(11,31,51,0.16)",
              color: "#F8FBFF",
            }}
          >
            <div
              style={{
                color: "#FDE68A",
                fontSize: 12,
                fontWeight: 950,
                letterSpacing: 2.4,
                textTransform: "uppercase",
              }}
            >
              GSN finance file
            </div>

            <div
              style={{
                marginTop: 10,
                fontSize: isCompact ? 30 : 38,
                fontWeight: 950,
                lineHeight: 1.05,
              }}
            >
              Cross-community finance file
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#D8E7F5",
                fontSize: 15,
                lineHeight: 1.75,
                maxWidth: 760,
              }}
            >
              Combined finance view for {memberName}. The same GSN ID is read
              across communities, with each local finance unit kept separate so
              GSN can see whether money behaviour is helping, needs watching,
              or creating pressure.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  ...badge(true),
                  color: "#FFFFFF",
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                Communities: {crossCommunitiesCount}
              </span>
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                GSN ID: {gmfnId}
              </span>
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                Trust band: {trustBand}
              </span>
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.10)",
                }}
              >
                Trust score: {trustScore}
              </span>
            </div>
          </div>

          <div
            style={{
              ...softCard(financeFileTone.bg),
              border: financeFileTone.border,
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <div style={sectionLabel()}>Record status</div>
            <div
              style={{
                color: financeFileTone.text,
                fontSize: 23,
                fontWeight: 950,
                lineHeight: 1.18,
              }}
            >
              {financeFileReading.title}
            </div>
            <div style={{ ...helperText(), color: "#0B1F33" }}>
              {financeFileReading.detail}
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 2,
              }}
            >
              <OriginLink to="/app/trust" style={actionBtn("secondary")}>
                Open Trust Passport
              </OriginLink>
              <OriginLink to="/app/loan-readiness" style={actionBtn("soft")}>
                Check readiness
              </OriginLink>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "0.95fr 1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("rgba(255,255,255,0.82)")}>
            <div style={sectionLabel()}>Cross-community totals</div>
            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={helperText()}>
                Effective available:{" "}
                <strong>
                  {fmtMoney(crossEffectiveAvailable)} {crossCurrency}
                </strong>
              </div>
              <div style={helperText()}>
                Membership pool total:{" "}
                <strong>
                  {fmtMoney(crossMembershipPool)} {crossCurrency}
                </strong>
              </div>
              <div style={helperText()}>
                Reserved / locked:{" "}
                <strong>
                  {fmtMoney(crossReservedPool)} {crossCurrency}
                </strong>
              </div>
              <div style={helperText()}>
                Guarantee locked as supporter:{" "}
                <strong>
                  {fmtMoney(crossLockedGuarantees)} {crossCurrency}
                </strong>
              </div>
              <div style={helperText()}>
                Earned guarantor value:{" "}
                <strong>
                  {fmtMoney(guarantorEarningsTotal)} {crossCurrency}
                </strong>
              </div>
            </div>
          </div>

          <div style={innerCard("#F7FBF8")}>
            <div style={sectionLabel()}>Positive signals</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {financeHelps.map((item, index) => (
                <div key={`finance-help-${index}`} style={helperText()}>
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div style={innerCard("#FFFDF7")}>
            <div style={sectionLabel()}>Attention signals</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {financeWatchItems.map((item, index) => (
                <div key={`finance-watch-${index}`} style={helperText()}>
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        {crossCommunityItems.length > 0 ? (
          <div style={{ marginTop: 16 }}>
            <div style={sectionLabel()}>Community finance units</div>
            <div style={{ marginTop: 10, ...tableWrap() }}>
              <table style={financeTable()}>
                <thead>
                  <tr>
                    <th style={tableHeadCell()}>Community</th>
                    <th style={tableHeadCell()}>Community ID</th>
                    <th style={tableHeadCell()}>Pool ref</th>
                    <th style={tableHeadCell()}>Effective</th>
                    <th style={tableHeadCell()}>Reserved</th>
                    <th style={tableHeadCell()}>Pending in</th>
                    <th style={tableHeadCell()}>Pending out</th>
                  </tr>
                </thead>
                <tbody>
                  {crossCommunityItems.slice(0, 8).map((item, index) => {
                    const label =
                      firstTruthy(item.marketplace_name, item.clan_name) ||
                      `Community ${item.clan_id || index + 1}`;
                    const itemCurrency = safeStr(item.currency || crossCurrency);

                    return (
                      <tr key={`${item.clan_id || index}`}>
                        <td style={tableCell(true)}>{label}</td>
                        <td style={tableCell()}>{safeStr(item.community_code || "-")}</td>
                        <td style={tableCell()}>{safeStr(item.reference || "-")}</td>
                        <td style={tableCell(true)}>
                          {fmtMoney(item.effective_available)} {itemCurrency}
                        </td>
                        <td style={tableCell()}>
                          {fmtMoney(item.reserved_pool)} {itemCurrency}
                        </td>
                        <td style={tableCell()}>
                          {fmtMoney(item.pending_deposits)} {itemCurrency}
                        </td>
                        <td style={tableCell()}>
                          {fmtMoney(item.pending_withdrawals)} {itemCurrency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {trustPackId || guarantorEarningsItems.length > 0 ? (
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {trustPackId ? (
              <span style={badge(false)}>Trust pack: {trustPackId}</span>
            ) : null}
            {guarantorEarningsItems.length > 0 ? (
              <span style={badge(false)}>
                Earnings rows: {guarantorEarningsItems.length}
              </span>
            ) : null}
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
            <div style={sectionLabel()}>Selected community finance unit</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Current community pool file and local operating context.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={badge(true)}>Community ID: {publicCommunityCode}</span>
            <span style={badge(false)}>GSN ID: {gmfnId}</span>
            {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
          </div>
        </div>

        <div style={{ marginTop: 14, ...tableWrap() }}>
          <table style={financeTable()}>
            <thead>
              <tr>
                <th style={tableHeadCell()}>Community</th>
                <th style={tableHeadCell()}>Pool ref</th>
                <th style={tableHeadCell()}>Available</th>
                <th style={tableHeadCell()}>Effective</th>
                <th style={tableHeadCell()}>Reserved</th>
                <th style={tableHeadCell()}>Pending in</th>
                <th style={tableHeadCell()}>Pending out</th>
                <th style={tableHeadCell()}>Expected payments</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={tableCell(true)}>{communityLabel}</td>
                <td style={tableCell()}>{poolReference || "Awaiting reference"}</td>
                <td style={tableCell(true)}>
                  {poolAmount} {poolCurrency}
                </td>
                <td style={tableCell(true)}>
                  {effectiveAvailable} {poolCurrency}
                </td>
                <td style={tableCell()}>
                  {reservedPool} {poolCurrency}
                </td>
                <td style={tableCell()}>
                  {pendingDeposits} {poolCurrency}
                </td>
                <td style={tableCell()}>
                  {pendingWithdrawals} {poolCurrency}
                </td>
                <td style={tableCell()}>{activeExpectedPayments.length}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="finance-summary" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Balances and exposure</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Main figures from the selected community pool file and active exposure records.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={(event) => handleCollapseTap("overview", event)}
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.overview ? (
          <div style={{ marginTop: 14, ...tableWrap() }}>
            <table style={financeTable()}>
              <thead>
                <tr>
                  <th style={tableHeadCell()}>Record</th>
                  <th style={tableHeadCell()}>Amount / count</th>
                  <th style={tableHeadCell()}>Meaning</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Pool balance", `${poolAmount} ${poolCurrency}`, "Selected-community pool balance."],
                  ["Effective available", `${effectiveAvailable} ${poolCurrency}`, "Amount currently available after reservations."],
                  ["Reserved / locked", `${reservedPool} ${poolCurrency}`, "Pool amount reserved or locked locally."],
                  ["Pending deposits", `${pendingDeposits} ${poolCurrency}`, "Inbound money awaiting completion."],
                  ["Pending withdrawals", `${pendingWithdrawals} ${poolCurrency}`, "Outbound money awaiting completion."],
                  ["Borrower-side total", `${fmtMoney(borrowerRequestedTotal)} ${poolCurrency}`, "Active borrower-side amount shown."],
                  ["Remaining to repay", `${fmtMoney(borrowerRemainingTotal)} ${poolCurrency}`, "Active borrower repayment pressure."],
                  ["Guarantees locked", `${safeStr(guarantorExposure?.totalLocked || "0")} ${poolCurrency}`, "Support amount still locked for others."],
                  ["Guarantees released", `${safeStr(guarantorExposure?.totalReleased || "0")} ${poolCurrency}`, "Support amount already released."],
                  ["Active guarantees", safeStr(guarantorExposure?.activeGuarantees ?? 0), "Open support commitments."],
                  ["Historical guarantees", safeStr(guarantorExposure?.historicalGuarantees ?? 0), "Past support commitments."],
                  ["Recent finance events", String(poolEvents.length), "Pool-side events in the visible record."],
                ].map(([label, value, meaning]) => (
                  <tr key={label}>
                    <td style={tableCell(true)}>{label}</td>
                    <td style={tableCell(true)}>{value}</td>
                    <td style={tableCell()}>{meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <section id="finance-reconciliation" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Expected payments and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This shows which payments are waiting, which are confirmed, and what to do next.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={(event) => handleCollapseTap("reconciliation", event)}
            style={collapseToggle()}
          >
            {collapsed.reconciliation ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.reconciliation ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div
              style={{
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Active expected payments: {activeExpectedPayments.length}</span>
              <span style={badge(false)}>Waiting for confirmation: {pendingReconciliationCount}</span>
              <span style={badge(false)}>Confirmed: {expectedPaymentStateCounts.confirmed}</span>
              <span style={badge(false)}>Matched: {expectedPaymentStateCounts.matched}</span>
              <span style={badge(false)}>
                Awaiting issue: {expectedPaymentStateCounts.awaitingIssue}
              </span>
            </div>

            {activeExpectedPayments.length === 0 ? (
              emptyRecord("No expected payment is waiting in the visible record.")
            ) : (
              <div style={tableWrap()}>
                <table style={financeTable()}>
                  <thead>
                    <tr>
                      <th style={tableHeadCell()}>Type</th>
                      <th style={tableHeadCell()}>Reference</th>
                      <th style={tableHeadCell()}>Amount</th>
                      <th style={tableHeadCell()}>State</th>
                      <th style={tableHeadCell()}>Status</th>
                      <th style={tableHeadCell()}>Date / match</th>
                      <th style={tableHeadCell()}>Next action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeExpectedPayments.slice(0, 10).map((item, index) => (
                      <tr key={`${item.id || index}`}>
                        <td style={tableCell(true)}>
                          {safeStr(item.expected_type || "Expected payment")}
                        </td>
                        <td style={tableCell()}>
                          {safeStr(item.reference_display || "-")}
                        </td>
                        <td style={tableCell(true)}>
                          {safeStr(item.amount || "0.00")}{" "}
                          {safeStr(item.currency || poolCurrency)}
                        </td>
                        <td style={tableCell()}>{expectedPaymentState(item)}</td>
                        <td style={tableCell()}>
                          {safeStr(item.status || "expected")}
                          {item.status_reason ? ` - ${safeStr(item.status_reason)}` : ""}
                        </td>
                        <td style={tableCell()}>
                          {item.confirmed_at
                            ? `Confirmed: ${safeDateTime(item.confirmed_at)}`
                            : item.due_at
                              ? `Due: ${safeDateTime(item.due_at)}`
                              : item.matched_bank_event_id
                                ? `Bank event: ${safeStr(item.matched_bank_event_id)}`
                                : "-"}
                        </td>
                        <td style={tableCell()}>{expectedPaymentNextAction(item)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
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
            <div style={sectionLabel()}>Borrowing and support exposure</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Loan summaries, support exposure, guarantor earnings, and community liquidity context.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={(event) => handleCollapseTap("borrower", event)}
            style={collapseToggle()}
          >
            {collapsed.borrower ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.borrower ? (
          <div style={{ marginTop: 14, display: "grid", gap: 16 }}>
            <div>
              <div style={sectionLabel()}>Borrower loan summaries</div>
              {borrowerLoans.length === 0 ? (
                <div style={{ marginTop: 10 }}>
                  {emptyRecord("No active borrower-side finance item is visible.")}
                </div>
              ) : (
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={financeTable()}>
                    <thead>
                      <tr>
                        <th style={tableHeadCell()}>Loan</th>
                        <th style={tableHeadCell()}>Status</th>
                        <th style={tableHeadCell()}>Amount</th>
                        <th style={tableHeadCell()}>Paid</th>
                        <th style={tableHeadCell()}>Remaining</th>
                        <th style={tableHeadCell()}>Service fee</th>
                        <th style={tableHeadCell()}>Net disbursed</th>
                        <th style={tableHeadCell()}>Guarantor pool</th>
                        <th style={tableHeadCell()}>Due / started</th>
                      </tr>
                    </thead>
                    <tbody>
                      {borrowerLoans.map((row, index) => {
                        const summary = loanSummaries[positiveNumber(row.id)] || null;
                        const rowCurrency = safeStr(summary?.currency || row.currency || poolCurrency);

                        return (
                          <tr key={`${row.id || index}`}>
                            <td style={tableCell(true)}>
                              {safeStr(row.title || `Loan ${row.id || index + 1}`)}
                            </td>
                            <td style={tableCell()}>
                              {safeStr(summary?.status || row.status || "Open")}
                            </td>
                            <td style={tableCell(true)}>
                              {safeStr(summary?.amount ?? row.amount ?? "0.00")} {rowCurrency}
                            </td>
                            <td style={tableCell()}>
                              {safeStr(summary?.paidTotal ?? "0.00")} {rowCurrency}
                            </td>
                            <td style={tableCell(true)}>
                              {safeStr(summary?.remainingAmount ?? "0.00")} {rowCurrency}
                            </td>
                            <td style={tableCell()}>
                              {safeStr(summary?.serviceFee ?? "-")}
                            </td>
                            <td style={tableCell()}>
                              {safeStr(summary?.netDisbursed ?? "-")}
                            </td>
                            <td style={tableCell()}>
                              {safeStr(summary?.guarantorPool ?? "-")}
                            </td>
                            <td style={tableCell()}>
                              {summary?.dueAt
                                ? safeDateTime(summary.dueAt)
                                : row.createdAt
                                  ? safeDateTime(row.createdAt)
                                  : "-"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Guarantor exposure</div>
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={{ ...financeTable(), minWidth: 520 }}>
                    <tbody>
                      {[
                        ["Total locked", `${safeStr(guarantorExposure?.totalLocked || "0")} ${poolCurrency}`],
                        ["Total released", `${safeStr(guarantorExposure?.totalReleased || "0")} ${poolCurrency}`],
                        ["Active guarantees", safeStr(guarantorExposure?.activeGuarantees ?? 0)],
                        ["Historical guarantees", safeStr(guarantorExposure?.historicalGuarantees ?? 0)],
                        [
                          "Note",
                          safeStr(
                            guarantorExposure?.note ||
                              "Guarantor exposure is visible for monitoring only."
                          ),
                        ],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={tableCell(true)}>{label}</td>
                          <td style={tableCell()}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={innerCard("#FCFEFF")}>
                <div style={sectionLabel()}>Community liquidity context</div>
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={{ ...financeTable(), minWidth: 520 }}>
                    <tbody>
                      {[
                        ["Community", safeStr(clanLiquidity?.clanName || communityLabel)],
                        ["Active loans", safeStr(clanLiquidity?.activeLoansCount ?? 0)],
                        ["Pledged total", safeStr(clanLiquidity?.pledgedTotal || "0")],
                        ["Locked total", safeStr(clanLiquidity?.lockedTotal || "0")],
                        ["Released total", safeStr(clanLiquidity?.releasedTotal || "0")],
                        [
                          "Note",
                          safeStr(
                            clanLiquidity?.note ||
                              "Community liquidity context is visible for this selected community."
                          ),
                        ],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td style={tableCell(true)}>{label}</td>
                          <td style={tableCell()}>{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div>
              <div style={sectionLabel()}>Guarantor earnings</div>
              {guarantorEarningsItems.length === 0 ? (
                <div style={{ marginTop: 10 }}>
                  {emptyRecord("No guarantor earnings row is visible.")}
                </div>
              ) : (
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={financeTable()}>
                    <thead>
                      <tr>
                        <th style={tableHeadCell()}>Loan ID</th>
                        <th style={tableHeadCell()}>Guarantor row</th>
                        <th style={tableHeadCell()}>Weight amount</th>
                        <th style={tableHeadCell()}>Potential share</th>
                        <th style={tableHeadCell()}>Status</th>
                        <th style={tableHeadCell()}>Currency</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guarantorEarningsItems.slice(0, 10).map((item, index) => (
                        <tr key={`${item?.loan_guarantor_id || index}`}>
                          <td style={tableCell(true)}>{safeStr(item?.loan_id || "-")}</td>
                          <td style={tableCell()}>{safeStr(item?.loan_guarantor_id || "-")}</td>
                          <td style={tableCell()}>{safeStr(item?.weight_amount || "0.00")}</td>
                          <td style={tableCell(true)}>{safeStr(item?.share_amount || "0.00")}</td>
                          <td style={tableCell()}>{safeStr(item?.earning_status || item?.status || "-")}</td>
                          <td style={tableCell()}>{safeStr(item?.currency || poolCurrency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <OriginLink to="/app/loans" style={actionBtn("secondary")}>
                Open Loans and Support
              </OriginLink>
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
            <div style={sectionLabel()}>Recent finance events</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Pool-side event ledger from the visible finance record.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={(event) => handleCollapseTap("events", event)}
            style={collapseToggle()}
          >
            {collapsed.events ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.events ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {poolEvents.length === 0 ? (
              emptyRecord("No recent finance event is visible.")
            ) : (
              <div style={tableWrap()}>
                <table style={financeTable()}>
                  <thead>
                    <tr>
                      <th style={tableHeadCell()}>Event</th>
                      <th style={tableHeadCell()}>Amount</th>
                      <th style={tableHeadCell()}>Reference</th>
                      <th style={tableHeadCell()}>Note</th>
                      <th style={tableHeadCell()}>Created</th>
                      <th style={tableHeadCell()}>Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {poolEvents.slice(0, 12).map((row, index) => (
                      <tr key={`${row.id || index}`}>
                        <td style={tableCell(true)}>
                          {safeStr(row.eventType || "Pool event")}
                        </td>
                        <td style={tableCell(true)}>
                          {safeStr(row.amount || "-")} {safeStr(row.currency || poolCurrency)}
                        </td>
                        <td style={tableCell()}>{safeStr(row.reference || "-")}</td>
                        <td style={tableCell()}>{safeStr(row.note || "-")}</td>
                        <td style={tableCell()}>
                          {row.createdAt ? safeDateTime(row.createdAt) : "-"}
                        </td>
                        <td style={tableCell()}>
                          {row.confirmedAt ? safeDateTime(row.confirmedAt) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : null}
      </section>

    </div>
  );
}



