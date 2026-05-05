import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySurface,
  type GuarantorExposureSummary,
} from "../lib/communityMoney";
import {
  institutionalInnerCard,
  institutionalPageCard,
} from "../lib/institutionalSurface";
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

const FINANCE_UI_STORAGE_KEY = "gmfn.finance.sections.v3";

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

function fmtFinanceAmount(value: any, currency = "NGN"): string {
  const amount = parseMoneyNumber(value);
  const code = safeStr(currency || "NGN").toUpperCase();
  const pretty = amount.toLocaleString(undefined, {
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });

  if (code === "NGN") return `N${pretty}`;
  if (code === "GBP") return `GBP ${pretty}`;
  if (code === "USD") return `USD ${pretty}`;
  if (code === "EUR") return `EUR ${pretty}`;
  return `${pretty} ${code}`;
}

function poolEventDirection(row: PoolEvent): "in" | "out" | "neutral" {
  const haystack = `${safeStr(row.eventType)} ${safeStr(row.note)}`.toLowerCase();

  if (
    haystack.includes("withdraw") ||
    haystack.includes("outflow") ||
    haystack.includes("debit") ||
    haystack.includes("repay") ||
    haystack.includes("payment out")
  ) {
    return "out";
  }

  if (
    haystack.includes("deposit") ||
    haystack.includes("inflow") ||
    haystack.includes("credit") ||
    haystack.includes("contribution") ||
    haystack.includes("paid in") ||
    haystack.includes("payment in")
  ) {
    return "in";
  }

  return "neutral";
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
  return institutionalPageCard(bg);
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return institutionalInnerCard(bg);
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#42617D",
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
    background: primary
      ? "linear-gradient(180deg, #EAF3FF 0%, #D9EAFE 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F3F7FC 100%)",
    color: primary ? "#0B4EA2" : "#243B53",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(31,115,224,0.22)"
      : "1px solid rgba(9,27,46,0.10)",
  };
}

function tapSafeButtonBase(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    boxSizing: "border-box",
    pointerEvents: "auto",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    appearance: "none",
    WebkitAppearance: "none",
    isolation: "isolate",
    outlineOffset: 4,
    lineHeight: 1.2,
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
      background: disabled
        ? "linear-gradient(180deg, #D5DEE8 0%, #C6D1DE 100%)"
        : "linear-gradient(180deg, #2A6AF3 0%, #154EBB 100%)",
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
        : "0 14px 28px rgba(21,78,187,0.24), inset 0 1px 0 rgba(255,255,255,0.22)",
    };
  }

  if (kind === "soft") {
    return {
      ...tapSafeButtonBase(),
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 46,
      padding: "10px 14px",
      borderRadius: 12,
      border: "1px solid rgba(121,149,190,0.20)",
      background:
        "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
      color: disabled ? "#94A3B8" : "#E6EEF8",
      fontWeight: 800,
      fontSize: 13,
      textAlign: "center",
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      opacity: disabled ? 0.86 : 1,
      boxShadow: disabled
        ? "none"
        : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
    };
  }

  return {
    ...tapSafeButtonBase(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "11px 15px",
    borderRadius: 14,
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: disabled ? "#94A3B8" : "#E6EEF8",
    fontWeight: 800,
    fontSize: 14,
    textAlign: "center",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    opacity: disabled ? 0.86 : 1,
    boxShadow: disabled
      ? "none"
      : "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
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
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 900,
    fontSize: 13.5,
    cursor: "pointer",
    textAlign: "center",
    whiteSpace: "normal",
    boxShadow:
      "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function stopFinanceTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function helperText(): React.CSSProperties {
  return {
    color: "#425E78",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function tableWrap(): React.CSSProperties {
  return {
    width: "100%",
    overflowX: "auto",
    borderRadius: 16,
    border: "1px solid rgba(123,161,204,0.14)",
    background: "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)",
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
    borderBottom: "1px solid rgba(123,161,204,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: "#C8D8EA",
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
    borderBottom: "1px solid rgba(123,161,204,0.10)",
    color: strong ? "#F8FBFF" : "#D8E5F3",
    fontSize: 13.5,
    fontWeight: strong ? 900 : 700,
    lineHeight: 1.45,
    verticalAlign: "top",
  };
}

function emptyRecord(text: string) {
  return (
    <div style={{ ...helperText(), color: "#5D7389" }}>
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
    overview: true,
    borrower: true,
    events: true,
    reconciliation: true,
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

export default function FinancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const financeRevealRef = useRef<number | null>(null);

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
    return () => {
      if (
        typeof window !== "undefined" &&
        financeRevealRef.current !== null
      ) {
        window.cancelAnimationFrame(financeRevealRef.current);
        financeRevealRef.current = null;
      }
    };
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
            ? (api as any).listMyLoans({ clan_id: selectedClanId }).catch(() => [])
            : Promise.resolve([]);

        const poolPromise =
          typeof (api as any).getPoolMe === "function"
            ? (api as any).getPoolMe("NGN", 20, { clan_id: selectedClanId }).catch(() => null)
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
            fetchJson(
              `/payment-instructions/my/expected?clan_id=${encodeURIComponent(
                String(selectedClanId)
              )}&limit=100`,
              selectedClanId
            ).catch(() => ({ items: [] })),
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

  const visibleMonthEvents = useMemo(() => {
    const now = new Date();
    return poolEvents.filter((row) => {
      const raw = firstTruthy(row.createdAt, row.confirmedAt);
      if (!raw) return false;
      const date = new Date(raw);
      if (!Number.isFinite(date.getTime())) return false;
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth()
      );
    });
  }, [poolEvents]);

  const visibleMonthInflow = useMemo(
    () =>
      visibleMonthEvents
        .filter((row) => poolEventDirection(row) === "in")
        .reduce((sum, row) => sum + parseMoneyNumber(row.amount), 0),
    [visibleMonthEvents]
  );

  const visibleMonthOutflow = useMemo(
    () =>
      visibleMonthEvents
        .filter((row) => poolEventDirection(row) === "out")
        .reduce((sum, row) => sum + parseMoneyNumber(row.amount), 0),
    [visibleMonthEvents]
  );

  const visibleMonthInflowCount = useMemo(
    () => visibleMonthEvents.filter((row) => poolEventDirection(row) === "in").length,
    [visibleMonthEvents]
  );

  const visibleMonthOutflowCount = useMemo(
    () => visibleMonthEvents.filter((row) => poolEventDirection(row) === "out").length,
    [visibleMonthEvents]
  );

  const visibleMonthNet = visibleMonthInflow - visibleMonthOutflow;
  const visibleMonthNetLabel =
    visibleMonthNet >= 0
      ? `+${fmtFinanceAmount(visibleMonthNet, crossCurrency)}`
      : `-${fmtFinanceAmount(Math.abs(visibleMonthNet), crossCurrency)}`;

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

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCollapseTap(key: keyof CollapseState) {
    toggleSection(key);
  }

  function openFinanceRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function revealFinanceSection(targetId: string, attempt = 0) {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    if (financeRevealRef.current !== null) {
      window.cancelAnimationFrame(financeRevealRef.current);
      financeRevealRef.current = null;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      if (attempt >= 6) return;
      financeRevealRef.current = window.requestAnimationFrame(() => {
        revealFinanceSection(targetId, attempt + 1);
      });
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
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
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#425E78", fontWeight: 800, lineHeight: 1.8 }}>
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
      />

      <section
        id="finance-file"
        style={{
          borderRadius: 28,
          padding: isCompact ? 18 : 24,
          border: "1px solid rgba(214,170,69,0.32)",
          background:
            "radial-gradient(circle at 88% 18%, rgba(214,170,69,0.20), transparent 24%), linear-gradient(145deg, #07172C 0%, #092642 62%, #03101F 100%)",
          boxShadow: "0 24px 52px rgba(7,23,44,0.18)",
          color: "#F8FBFF",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0,1fr) 120px",
            gap: 18,
            alignItems: "start",
          }}
        >
          <div>
            <div style={{ ...sectionLabel(), color: "#F2CF77" }}>
              Finance overview
            </div>
            <h1
              style={{
                margin: "12px 0 0",
                fontSize: isCompact ? 31 : 44,
                lineHeight: 1.04,
                fontWeight: 950,
                letterSpacing: -0.5,
                maxWidth: 620,
              }}
            >
              Your community finances. Clear. Secure. Together.
            </h1>
            <p
              style={{
                margin: "14px 0 0",
                color: "#D8E7F5",
                fontSize: isCompact ? 15 : 17,
                lineHeight: 1.65,
                maxWidth: 560,
              }}
            >
              Track visible money records across your communities, keep payment
              evidence clear, and manage community finance safely.
            </p>
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
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                {communityLabel}
              </span>
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                GSN ID: {gmfnId}
              </span>
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                Community ID: {publicCommunityCode}
              </span>
              {poolReference ? (
                <span
                  style={{
                    ...badge(false),
                    color: "#F8FBFF",
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.14)",
                  }}
                >
                  Pool ref: {poolReference}
                </span>
              ) : null}
              <span
                style={{
                  ...badge(false),
                  color: "#F8FBFF",
                  background: "rgba(255,255,255,0.12)",
                  border: "1px solid rgba(255,255,255,0.14)",
                }}
              >
                Role: {memberRole}
              </span>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              justifySelf: isCompact ? "start" : "end",
              width: isCompact ? 84 : 108,
              height: isCompact ? 84 : 108,
              borderRadius: 28,
              border: "2px solid rgba(214,170,69,0.62)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#F2CF77",
              fontSize: isCompact ? 34 : 44,
              fontWeight: 950,
              boxShadow: "inset 0 0 28px rgba(214,170,69,0.10)",
            }}
          >
            GSN
          </div>
        </div>

        <div
          style={{
            marginTop: 22,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              mark: "CO",
              label: "Communities",
              value: String(crossCommunitiesCount),
              note: "Active",
            },
            {
              mark: "TB",
              label: "Total visible balance",
              value: fmtFinanceAmount(crossMembershipPool, crossCurrency),
              note: `Held: ${fmtFinanceAmount(crossReservedPool, crossCurrency)}`,
            },
            {
              mark: "MI",
              label: "This month inflow",
              value: fmtFinanceAmount(visibleMonthInflow, crossCurrency),
              note: "Visible this month",
            },
            {
              mark: "TR",
              label: "Trust score",
              value: safeStr(trustScore || "0"),
              note: safeStr(trustBand || "Not ready"),
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                minHeight: 124,
                borderRadius: 18,
                padding: isCompact ? 12 : 16,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                display: "grid",
                alignContent: "space-between",
                gap: 8,
              }}
            >
              <div
                style={{
                  color: "#D6AA45",
                  fontSize: 11,
                  fontWeight: 950,
                  letterSpacing: 0.7,
                  textTransform: "uppercase",
                }}
              >
                {item.mark} {item.label}
              </div>
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: isCompact ? 21 : 24,
                  fontWeight: 950,
                  lineHeight: 1.1,
                  overflowWrap: "anywhere",
                }}
              >
                {item.value}
              </div>
              <div style={{ color: "#D8E7F5", fontSize: 13, fontWeight: 800 }}>
                {item.note}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What do you want to do?</div>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: 12,
          }}
        >
          {[
            {
              id: "money-in",
              mark: "IN",
              label: "Record Transaction",
              detail: "Create a real pay-in instruction.",
              action: () => openFinanceRoute("/app/payment/pool"),
              color: "#135FD1",
            },
            {
              id: "reports",
              mark: "RP",
              label: "View Reports",
              detail: "Open balances, exposure, and reconciliation.",
              action: () => {
                setCollapsed((prev) => ({ ...prev, overview: false }));
                revealFinanceSection("finance-summary");
              },
              color: "#21A365",
            },
            {
              id: "bank-accounts",
              mark: "BA",
              label: "Bank Accounts",
              detail: "Open payment rails and payout routes.",
              action: () => openFinanceRoute("/app/payment-rails"),
              color: "#D6AA45",
            },
            {
              id: "export-data",
              mark: "EX",
              label: "Export Data",
              detail: "Open the visible ledger first.",
              action: () => {
                setCollapsed((prev) => ({ ...prev, events: false }));
                revealFinanceSection("finance-events");
              },
              color: "#5B3BC4",
            },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onPointerDown={stopFinanceTap}
              onMouseDown={stopFinanceTap}
              onTouchStart={stopFinanceTap}
              onClick={item.action}
              style={{
                ...tapSafeButtonBase(),
                minHeight: isCompact ? 132 : 152,
                borderRadius: 20,
                border: "1px solid rgba(12,41,71,0.10)",
                background: "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)",
                boxShadow: "0 12px 28px rgba(7,23,44,0.08)",
                color: "#07172C",
                display: "grid",
                gap: 10,
                justifyItems: "center",
                alignContent: "center",
                padding: isCompact ? 12 : 16,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 18,
                  background: item.color,
                  color: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 950,
                  boxShadow: "0 10px 22px rgba(7,23,44,0.12)",
                }}
              >
                {item.mark}
              </span>
              <span style={{ fontSize: 15, fontWeight: 950, lineHeight: 1.18 }}>
                {item.label}
              </span>
              <span
                style={{
                  color: "#52697F",
                  fontSize: 12,
                  fontWeight: 750,
                  lineHeight: 1.35,
                }}
              >
                {item.detail}
              </span>
            </button>
          ))}
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
          <div style={sectionLabel()}>Cash flow summary</div>
          <span style={badge(false)}>This month, visible record</span>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 0,
            border: "1px solid rgba(12,41,71,0.08)",
            borderRadius: 20,
            overflow: "hidden",
            background: "#FFFFFF",
          }}
        >
          {[
            {
              label: "Total inflow",
              value: fmtFinanceAmount(visibleMonthInflow, crossCurrency),
              note: `${visibleMonthInflowCount} visible event${
                visibleMonthInflowCount === 1 ? "" : "s"
              }`,
              color: "#168254",
            },
            {
              label: "Total outflow",
              value: fmtFinanceAmount(visibleMonthOutflow, crossCurrency),
              note: `${visibleMonthOutflowCount} visible event${
                visibleMonthOutflowCount === 1 ? "" : "s"
              }`,
              color: "#C83A3A",
            },
            {
              label: "Net visible flow",
              value: visibleMonthNetLabel,
              note: "From visible pool activity",
              color: visibleMonthNet >= 0 ? "#168254" : "#C83A3A",
            },
          ].map((item, index) => (
            <div
              key={item.label}
              style={{
                padding: isCompact ? 16 : 18,
                borderRight:
                  !isCompact && index < 2
                    ? "1px solid rgba(12,41,71,0.08)"
                    : "none",
                borderBottom:
                  isCompact && index < 2
                    ? "1px solid rgba(12,41,71,0.08)"
                    : "none",
              }}
            >
              <div style={{ color: item.color, fontSize: 14, fontWeight: 950 }}>
                {item.label}
              </div>
              <div
                style={{
                  marginTop: 6,
                  color: "#07172C",
                  fontSize: 24,
                  fontWeight: 950,
                  lineHeight: 1.1,
                }}
              >
                {item.value}
              </div>
              <div style={{ marginTop: 5, color: "#52697F", fontSize: 13, fontWeight: 800 }}>
                {item.note}
              </div>
            </div>
          ))}
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
          <div style={sectionLabel()}>Recent transactions</div>
          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={() => {
              setCollapsed((prev) => ({ ...prev, events: false }));
              revealFinanceSection("finance-events");
            }}
            style={{
              ...tapSafeButtonBase(),
              border: "none",
              background: "transparent",
              color: "#135FD1",
              fontSize: 14,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            View all
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid" }}>
          {poolEvents.length === 0 ? (
            emptyRecord("No recent finance event is visible yet.")
          ) : (
            poolEvents.slice(0, 3).map((row, index) => {
              const direction = poolEventDirection(row);
              const isOut = direction === "out";
              const amountColor = direction === "neutral" ? "#07172C" : isOut ? "#C83A3A" : "#168254";
              const amountPrefix = direction === "neutral" ? "" : isOut ? "-" : "+";

              return (
                <div
                  key={`${row.id || index}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "44px minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "center",
                    padding: "13px 0",
                    borderBottom:
                      index < Math.min(poolEvents.length, 3) - 1
                        ? "1px solid rgba(12,41,71,0.08)"
                        : "none",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 999,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#FFFFFF",
                      background: isOut ? "#C83A3A" : "#21A365",
                      fontSize: 18,
                      fontWeight: 950,
                    }}
                  >
                    {isOut ? "-" : "+"}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        color: "#07172C",
                        fontSize: 16,
                        fontWeight: 950,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {safeStr(row.eventType || "Finance event")}
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        color: "#52697F",
                        fontSize: 13,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {safeStr(row.note || row.reference || communityLabel)}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ color: amountColor, fontSize: 15, fontWeight: 950 }}>
                      {amountPrefix}
                      {fmtFinanceAmount(row.amount || "0", row.currency || poolCurrency)}
                    </div>
                    <div style={{ marginTop: 3, color: "#6F7F92", fontSize: 12, fontWeight: 750 }}>
                      {row.createdAt ? safeDateTime(row.createdAt) : "Visible record"}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section
        style={{
          ...pageCard("linear-gradient(145deg, #07172C 0%, #092642 70%, #03101F 100%)"),
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "76px minmax(0,1fr) auto",
          gap: 16,
          alignItems: "center",
          color: "#F8FBFF",
          border: "1px solid rgba(214,170,69,0.30)",
        }}
      >
        <div
          aria-hidden="true"
          style={{
            width: 64,
            height: 64,
            borderRadius: 20,
            border: "2px solid rgba(214,170,69,0.62)",
            color: "#F2CF77",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 950,
            fontSize: 22,
          }}
        >
          GSN
        </div>
        <div>
          <div style={{ ...sectionLabel(), color: "#F2CF77" }}>Finance health</div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 950 }}>
            {financeFileReading.title}
          </div>
          <div style={{ marginTop: 6, color: "#D8E7F5", fontSize: 14, lineHeight: 1.6 }}>
            {financeFileReading.detail}
          </div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 8,
            }}
          >
            <div
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                background: "rgba(33,163,101,0.12)",
                border: "1px solid rgba(33,163,101,0.22)",
                color: "#E9F8EF",
                fontSize: 12,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              Positive: {financeHelps[0]}
            </div>
            <div
              style={{
                borderRadius: 14,
                padding: "10px 12px",
                background: "rgba(242,207,119,0.12)",
                border: "1px solid rgba(242,207,119,0.26)",
                color: "#FFF4CC",
                fontSize: 12,
                fontWeight: 850,
                lineHeight: 1.45,
              }}
            >
              Watch: {financeWatchItems[0]}
            </div>
          </div>
        </div>
        <button
          type="button"
          onPointerDown={stopFinanceTap}
          onMouseDown={stopFinanceTap}
          onTouchStart={stopFinanceTap}
          onClick={() => {
            setCollapsed((prev) => ({
              ...prev,
              overview: false,
              reconciliation: false,
              borrower: false,
            }));
            revealFinanceSection("finance-summary");
          }}
          style={{
            ...actionBtn("primary"),
            background:
              "linear-gradient(180deg, #FFE28A 0%, #D6AA45 70%, #B78321 100%)",
            color: "#07172C",
            minWidth: isCompact ? "100%" : 210,
          }}
        >
          View Finance Health
        </button>
      </section>

      <section
        id="finance-summary"
        style={collapsed.overview ? { display: "none" } : pageCard("#FFFFFF")}
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
            <div style={sectionLabel()}>Balances and exposure</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Main figures from the selected community unit inside the wider finance file.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={() => handleCollapseTap("overview")}
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

      <section
        id="finance-reconciliation"
        style={collapsed.reconciliation ? { display: "none" } : pageCard("#FFFFFF")}
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
            onClick={() => handleCollapseTap("reconciliation")}
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

      <section style={collapsed.borrower ? { display: "none" } : pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Support exposure in this community</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Finance shows the money effect here. Loans & Support handles the live workflow and decisions.
            </div>
          </div>

          <button
            type="button"
            onPointerDown={stopFinanceTap}
            onMouseDown={stopFinanceTap}
            onTouchStart={stopFinanceTap}
            onClick={() => handleCollapseTap("borrower")}
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
                Open Loans & Support
              </OriginLink>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="finance-events"
        style={collapsed.events ? { display: "none" } : pageCard("#FFFFFF")}
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
            onClick={() => handleCollapseTap("events")}
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



