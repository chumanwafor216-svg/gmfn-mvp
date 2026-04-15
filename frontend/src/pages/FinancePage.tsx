import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";
import {
  getCommunityMoneySurface,
  type CommunityMoneySurface,
  type GuarantorExposureSummary,
} from "../lib/communityMoney";

type CollapseState = {
  overview: boolean;
  reading: boolean;
  borrower: boolean;
  guarantor: boolean;
  events: boolean;
  reconciliation: boolean;
  routes: boolean;
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
  remainingAmount?: string | number | null;
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

function apiBaseOrigin(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";
  const base = String(raw || "").trim().replace(/\/+$/, "");

  if (base.startsWith("http://") || base.startsWith("https://")) {
    try {
      const url = new URL(base);
      return `${url.protocol}//${url.host}`;
    } catch {
      return "";
    }
  }

  if (typeof window !== "undefined") {
    return String(window.location.origin || "").trim().replace(/\/+$/, "");
  }

  return "";
}

function resolveMediaUrl(src: any): string {
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

  const origin = apiBaseOrigin();
  if (!origin) return raw;

  if (raw.startsWith("/")) return `${origin}${raw}`;
  return `${origin}/${raw.replace(/^\/+/, "")}`;
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
    remainingAmount: firstDefined(src?.remaining_amount),
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

function isGuarantorLoan(row: LoanRow): boolean {
  const role = safeStr(row?.role).toLowerCase();
  return role === "guarantor" || role.includes("guarant");
}

function getLoanAmountText(row: LoanRow | LoanSummary | null): string {
  const amount = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!amount && !currency) return "Amount pending";
  if (amount && currency) return `${amount} ${currency}`;
  return amount || currency || "Amount pending";
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

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 10px 24px rgba(11,99,209,0.05)" : "none",
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
    reading: false,
    borrower: false,
    guarantor: false,
    events: false,
    reconciliation: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    reading: Boolean(raw?.reading ?? base.reading),
    borrower: Boolean(raw?.borrower ?? base.borrower),
    guarantor: Boolean(raw?.guarantor ?? base.guarantor),
    events: Boolean(raw?.events ?? base.events),
    reconciliation: Boolean(raw?.reconciliation ?? base.reconciliation),
    routes: Boolean(raw?.routes ?? base.routes),
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

function communityImageSrc(currentClan: any): string {
  return resolveMediaUrl(
    firstTruthy(
      currentClan?.community_image_url,
      currentClan?.profile_image_url,
      currentClan?.marketplace_image_url,
      currentClan?.cover_image_url,
      currentClan?.banner_url,
      currentClan?.image_url,
      currentClan?.logo_url,
      currentClan?.community?.community_image_url,
      currentClan?.community?.image_url,
      currentClan?.profile?.profile_image_url
    )
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

        const [meRes, clanRes, loansRes, poolRes] = await Promise.all([
          mePromise,
          clanPromise,
          loansPromise,
          poolPromise,
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
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No selected community")
    );
  }, [currentClan, selectedClanId]);

  const publicCommunityCode = useMemo(() => {
    return communityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return communityRole(currentClan);
  }, [currentClan]);

  const pictureSrc = useMemo(() => {
    return communityImageSrc(currentClan);
  }, [currentClan]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
  }, [me]);

  const activeLoans = useMemo(() => loans.filter(isActiveLoan), [loans]);
  const borrowerLoans = useMemo(
    () => activeLoans.filter(isBorrowerLoan),
    [activeLoans]
  );
  const guarantorLoans = useMemo(
    () => activeLoans.filter(isGuarantorLoan),
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

  const reading = useMemo(() => {
    const activeGuarantees = Number(guarantorExposure?.activeGuarantees || 0);
    const locked = parseMoneyNumber(guarantorExposure?.totalLocked);

    if (borrowerLoans.length > 0 && activeGuarantees > 0) {
      return {
        tone: "pressure" as const,
        title: "You are carrying both borrower-side and guarantor-side finance pressure.",
        detail:
          "Your own support path is active and you also have live guarantor exposure.",
      };
    }

    if (borrowerLoans.length > 0) {
      return {
        tone: "watch" as const,
        title: "You currently have borrower-side finance exposure.",
        detail:
          "This shows what you have taken into support and what is still remaining.",
      };
    }

    if (activeGuarantees > 0 || locked > 0) {
      return {
        tone: "watch" as const,
        title: "You currently have guarantor-side finance exposure.",
        detail:
          "This shows what is locked or active because of support you gave to others.",
      };
    }

    return {
      tone: "calm" as const,
      title: "Your finance surface is currently calm.",
      detail:
        "No active borrower-side pressure or live guarantor-side locked exposure is currently shown.",
    };
  }, [borrowerLoans.length, guarantorExposure]);

  const readingTone = toneStyles(reading.tone);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
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
          subtitle="Loading the finance surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/marketplace"
          backLabel="Marketplace"
          nextLinks={[
            { label: "Money In", to: "/app/payment/pool" },
            { label: "Money Out", to: "/app/withdrawal-instructions" },
          ]}
          utilityLinks={[
            { label: "Loans", to: "/app/loans" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading finance surface...
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
        subtitle="Finance brings together your pool position, locked guarantor exposure, borrower-side obligations, and recent money events in one place."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/marketplace"
        backLabel="Marketplace"
        nextLinks={[
          { label: "Money In", to: "/app/payment/pool" },
          { label: "Money Out", to: "/app/withdrawal-instructions" },
        ]}
        utilityLinks={[
          { label: "Loans", to: "/app/loans" },
          { label: "Notifications", to: "/app/notifications" },
        ]}
      />

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "180px minmax(0, 1fr) 320px",
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
                border: "1px solid rgba(148,163,184,0.16)",
                overflow: "hidden",
                background: "linear-gradient(180deg, #102A43 0%, #12304D 100%)",
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
                    color: "#E2E8F0",
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
            <div style={sectionLabel()}>Fixed finance context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Finance for {memberName}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 860,
              }}
            >
              This is the finance surface. It should tell you what is in your pool,
              what is effectively available, what is locked because of guarantor
              support, what you currently owe through borrower-side support, and the
              recent finance events that affect your position.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityCode}</span>
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Current page: Finance</span>
              <span style={badge(false)}>Current step: Full financial truth</span>
              <span style={badge(false)}>Pool ref: {poolReference || "Awaiting reference"}</span>
              <span style={badge(false)}>
                Borrower items: {borrowerLoans.length}
              </span>
              <span style={badge(false)}>
                Active guarantees: {guarantorExposure?.activeGuarantees || 0}
              </span>
              <span style={badge(false)}>
                Expected payments: {activeExpectedPayments.length}
              </span>
            </div>
          </div>

          <div
            style={{
              ...softCard(readingTone.bg),
              border: readingTone.border,
            }}
          >
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: readingTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {reading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {reading.detail}
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
            <div style={sectionLabel()}>Finance summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the main money readings together.
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
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(4, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Pool balance</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {poolAmount} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Effective available</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {effectiveAvailable} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Reserved / locked</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {reservedPool} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Withdrawals awaiting completion</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {pendingWithdrawals} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Deposits awaiting completion</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {pendingDeposits} {poolCurrency}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Borrower-side total</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {fmtMoney(borrowerRequestedTotal)} {poolCurrency}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Remaining to repay</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {fmtMoney(borrowerRemainingTotal)} {poolCurrency}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Locked by guarantees</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(guarantorExposure?.totalLocked || "0")} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Released guarantees</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(guarantorExposure?.totalReleased || "0")} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Active guarantees</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {safeStr(guarantorExposure?.activeGuarantees ?? 0)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Historical guarantees</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {safeStr(guarantorExposure?.historicalGuarantees ?? 0)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Recent finance events</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {poolEvents.length}
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
            <div style={sectionLabel()}>Expected payments and reconciliation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This shows which payments are waiting, which are confirmed, and what to do next.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("reconciliation")}
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
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No payment is waiting here right now.
              </div>
            ) : (
              activeExpectedPayments.slice(0, 8).map((item, index) => (
                <div key={`${item.id || index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.1fr) minmax(0, 0.9fr)",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {safeStr(item.expected_type || "Expected payment")}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <span style={badge(true)}>
                          {safeStr(item.amount || "0.00")} {safeStr(item.currency || poolCurrency)}
                        </span>
                        <span style={badge(false)}>
                          State: {expectedPaymentState(item)}
                        </span>
                        <span style={badge(false)}>
                          Status: {safeStr(item.status || "expected")}
                        </span>
                      </div>
                    </div>

                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {[
                        item.reference_display
                          ? `Reference: ${safeStr(item.reference_display)}`
                          : "",
                        item.confirmed_at
                          ? `Confirmed at: ${safeDateTime(item.confirmed_at)}`
                          : item.due_at
                            ? `Due at: ${safeDateTime(item.due_at)}`
                            : "",
                        item.status_reason ? `Reason: ${safeStr(item.status_reason)}` : "",
                        item.matched_bank_event_id
                          ? `Bank confirmation visible: ${safeStr(item.matched_bank_event_id)}`
                          : "",
                        `Next action: ${expectedPaymentNextAction(item)}`,
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  </div>
                </div>
              ))
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
            <div style={sectionLabel()}>Finance reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Borrower-side, guarantor-side, and community liquidity context.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("reading")}
            style={collapseToggle()}
          >
            {collapsed.reading ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.reading ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
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
                Your pool position
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Pool balance: {poolAmount} {poolCurrency}
                </div>
                <div style={helperText()}>
                  Effective available: {effectiveAvailable} {poolCurrency}
                </div>
                <div style={helperText()}>
                  Reserved / locked: {reservedPool} {poolCurrency}
                </div>
                <div style={helperText()}>
                  Deposits awaiting completion: {pendingDeposits} {poolCurrency}
                </div>
                <div style={helperText()}>
                  Withdrawals awaiting completion: {pendingWithdrawals} {poolCurrency}
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
                Support you gave
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Locked by guarantees: {safeStr(guarantorExposure?.totalLocked || "0")}{" "}
                  {poolCurrency}
                </div>
                <div style={helperText()}>
                  Released guarantees: {safeStr(guarantorExposure?.totalReleased || "0")}{" "}
                  {poolCurrency}
                </div>
                <div style={helperText()}>
                  Active guarantees: {safeStr(guarantorExposure?.activeGuarantees ?? 0)}
                </div>
                <div style={helperText()}>
                  Historical guarantees: {safeStr(
                    guarantorExposure?.historicalGuarantees ?? 0
                  )}
                </div>
                <div style={helperText()}>
                  {safeStr(
                    guarantorExposure?.note ||
                      "Guarantor exposure is shown here for visibility."
                  )}
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
                Community liquidity context
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Clan: {safeStr(clanLiquidity?.clanName || communityLabel)}
                </div>
                <div style={helperText()}>
                  Active loans: {safeStr(clanLiquidity?.activeLoansCount ?? 0)}
                </div>
                <div style={helperText()}>
                  Pledged total: {safeStr(clanLiquidity?.pledgedTotal || "0")}
                </div>
                <div style={helperText()}>
                  Locked total: {safeStr(clanLiquidity?.lockedTotal || "0")}
                </div>
                <div style={helperText()}>
                  Released total: {safeStr(clanLiquidity?.releasedTotal || "0")}
                </div>
                <div style={helperText()}>
                  {safeStr(
                    clanLiquidity?.note ||
                      "Community liquidity is shown here for context."
                  )}
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
            <div style={sectionLabel()}>Borrower-side finance</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What you have taken into support and what is remaining.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("borrower")}
            style={collapseToggle()}
          >
            {collapsed.borrower ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.borrower ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {borrowerLoans.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No active borrower-side finance item is currently shown.
              </div>
            ) : (
              borrowerLoans.map((row, index) => {
                const summary = loanSummaries[positiveNumber(row.id)] || null;

                return (
                  <div key={`${row.id || index}`} style={innerCard("#FCFEFF")}>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact
                          ? "1fr"
                          : "minmax(0, 1.12fr) minmax(0, 0.88fr) auto",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontSize: 17,
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {safeStr(row.title || "Borrower-side support item")}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "flex",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={badge(true)}>{getLoanAmountText(row)}</span>
                          <span style={badge(false)}>
                            Status: {safeStr(summary?.status || row.status || "Open")}
                          </span>
                        </div>
                      </div>

                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {[
                          summary?.remainingAmount
                            ? `Remaining: ${safeStr(summary.remainingAmount)} ${safeStr(
                                summary.currency || row.currency || poolCurrency
                              )}`
                            : "",
                          summary?.approvedGuarantors !== undefined
                            ? `Approved guarantors: ${safeStr(
                                summary.approvedGuarantors
                              )}/${safeStr(summary.guarantorsRequired ?? 0)}`
                            : "",
                          summary?.dueAt
                            ? `Due: ${safeDateTime(summary.dueAt)}`
                            : row.createdAt
                            ? `Started: ${safeDateTime(row.createdAt)}`
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" - ") || "Borrower-side finance item"}
                      </div>

                      <div
                        style={{
                          display: "flex",
                          justifyContent: isCompact ? "flex-start" : "flex-end",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <OriginLink to="/app/loans" style={actionBtn("secondary")}>
                          Open Loans
                        </OriginLink>
                      </div>
                    </div>
                  </div>
                );
              })
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
            <div style={sectionLabel()}>Guarantor-side finance</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What you have backed for others and what is still active.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("guarantor")}
            style={collapseToggle()}
          >
            {collapsed.guarantor ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.guarantor ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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
                Exposure summary
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                <div style={helperText()}>
                  Total locked: {safeStr(guarantorExposure?.totalLocked || "0")}{" "}
                  {poolCurrency}
                </div>
                <div style={helperText()}>
                  Total released: {safeStr(guarantorExposure?.totalReleased || "0")}{" "}
                  {poolCurrency}
                </div>
                <div style={helperText()}>
                  Active guarantees: {safeStr(guarantorExposure?.activeGuarantees ?? 0)}
                </div>
                <div style={helperText()}>
                  Historical guarantees:{" "}
                  {safeStr(guarantorExposure?.historicalGuarantees ?? 0)}
                </div>
                <div style={helperText()}>
                  {safeStr(
                    guarantorExposure?.note ||
                      "Guarantor exposure is shown here for visibility."
                  )}
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
                Active guarantor-side items
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {guarantorLoans.length === 0 ? (
                  <div style={helperText()}>
                    No active guarantor-side finance item is currently shown.
                  </div>
                ) : (
                  guarantorLoans.map((row, index) => {
                    const summary = loanSummaries[positiveNumber(row.id)] || null;

                    return (
                      <div key={`${row.id || index}`} style={innerCard("#FCFEFF")}>
                        <div
                          style={{
                            color: "#0B1F33",
                            fontWeight: 900,
                            lineHeight: 1.35,
                          }}
                        >
                          {safeStr(row.title || "Guarantor-side support item")}
                        </div>

                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          {[
                            `Status: ${safeStr(summary?.status || row.status || "Open")}`,
                            row.borrowerName ? `Borrower: ${row.borrowerName}` : "",
                            summary?.remainingAmount
                              ? `Remaining: ${safeStr(summary.remainingAmount)} ${safeStr(
                                  summary.currency || row.currency || poolCurrency
                                )}`
                              : "",
                            row.createdAt ? `Started: ${safeDateTime(row.createdAt)}` : "",
                          ]
                            .filter(Boolean)
                            .join(" - ")}
                        </div>
                      </div>
                    );
                  })
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
            <div style={sectionLabel()}>Recent finance events</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Recent pool-side events that affect your finance position.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("events")}
            style={collapseToggle()}
          >
            {collapsed.events ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.events ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {poolEvents.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No recent finance event is currently shown.
              </div>
            ) : (
              poolEvents.map((row, index) => (
                <div key={`${row.id || index}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.02fr) minmax(0, 0.98fr)",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {safeStr(row.eventType || "Pool event")}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {safeStr(row.amount) ? (
                          <span style={badge(true)}>
                            {safeStr(row.amount)} {safeStr(row.currency || poolCurrency)}
                          </span>
                        ) : null}

                        {safeStr(row.reference) ? (
                          <span style={badge(false)}>
                            {safeStr(row.reference)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {[
                        row.note ? safeStr(row.note) : "",
                        row.createdAt ? `Created: ${safeDateTime(row.createdAt)}` : "",
                        row.confirmedAt
                          ? `Confirmed: ${safeDateTime(row.confirmedAt)}`
                          : "",
                      ]
                        .filter(Boolean)
                        .join(" - ")}
                    </div>
                  </div>
                </div>
              ))
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from finance into the next exact money page you need.
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
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <OriginLink to="/app/payment/pool" style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Money In
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when you want to pay into the pool.
              </div>
            </OriginLink>

            <OriginLink to="/app/withdrawal-instructions" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Money Out
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when you want to withdraw from the pool.
              </div>
            </OriginLink>

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
                Use this for broader support operations.
              </div>
            </OriginLink>

            <OriginLink to="/app/marketplace" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Marketplace
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the selected-community working surface.
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
                Read whether your current support position is clean enough.
              </div>
            </OriginLink>

            <OriginLink to="/app/notifications" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Action Inbox
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when someone is waiting directly on your response.
              </div>
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
