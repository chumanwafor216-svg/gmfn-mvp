import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
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
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { navigateWithOrigin } from "../lib/nav";
import { brandClampLines, brandSingleLine } from "../styles/gmfnBrand";

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

type FinanceGlyphName =
  | "bank"
  | "card"
  | "chart"
  | "check"
  | "community"
  | "down"
  | "history"
  | "ledger"
  | "out"
  | "receipt"
  | "shield"
  | "signal"
  | "wallet";

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
  if (item.matched_bank_event_id) return "Bank match started";
  if (safeStr(item.reference_display)) return "Awaiting bank check";
  return "Needs payment instruction";
}

function expectedPaymentNextAction(item: ExpectedPaymentRecord): string {
  const state = expectedPaymentState(item);
  if (state === "Confirmed") {
    return "You can use the service this payment unlocked.";
  }
  if (state === "Bank match started") {
    return "The bank match has started. Wait for final confirmation.";
  }
  if (state === "Awaiting bank check") {
    return "Pay with the exact reference so the system can confirm it.";
  }
  return "Generate a fresh payment instruction if you still need to pay.";
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

function FinanceGlyph({
  name,
  size = 22,
  color = "currentColor",
}: {
  name: FinanceGlyphName;
  size?: number;
  color?: string;
}) {
  const common = {
    fill: "none",
    stroke: color,
    strokeWidth: 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      width={size}
      height={size}
      focusable="false"
      style={{ display: "block", flexShrink: 0 }}
    >
      {name === "bank" ? (
        <>
          <path {...common} d="M4 10h16" />
          <path {...common} d="M5 10 12 5l7 5" />
          <path {...common} d="M6 10v8" />
          <path {...common} d="M10 10v8" />
          <path {...common} d="M14 10v8" />
          <path {...common} d="M18 10v8" />
          <path {...common} d="M4 19h16" />
        </>
      ) : null}
      {name === "card" ? (
        <>
          <rect {...common} x="3.5" y="6" width="17" height="12" rx="2.5" />
          <path {...common} d="M4 10h16" />
          <path {...common} d="M7 15h4" />
        </>
      ) : null}
      {name === "chart" ? (
        <>
          <path {...common} d="M4 18V7" />
          <path {...common} d="M4 18h16" />
          <path {...common} d="m7 15 3-3 3 2 4-6" />
        </>
      ) : null}
      {name === "check" ? (
        <>
          <circle {...common} cx="12" cy="12" r="8" />
          <path {...common} d="m8.5 12.2 2.2 2.2 4.8-5" />
        </>
      ) : null}
      {name === "community" ? (
        <>
          <path {...common} d="M4 19V9l8-5 8 5v10" />
          <path {...common} d="M9 19v-6h6v6" />
          <path {...common} d="M4 19h16" />
        </>
      ) : null}
      {name === "down" ? (
        <>
          <path {...common} d="M12 4v13" />
          <path {...common} d="m7 12 5 5 5-5" />
          <path {...common} d="M5 20h14" />
        </>
      ) : null}
      {name === "history" ? (
        <>
          <path {...common} d="M4 12a8 8 0 1 0 2.35-5.65" />
          <path {...common} d="M4 5v5h5" />
          <path {...common} d="M12 8v5l3 2" />
        </>
      ) : null}
      {name === "ledger" ? (
        <>
          <rect {...common} x="5" y="4" width="14" height="16" rx="2" />
          <path {...common} d="M8 8h8" />
          <path {...common} d="M8 12h8" />
          <path {...common} d="M8 16h5" />
        </>
      ) : null}
      {name === "out" ? (
        <>
          <path {...common} d="M12 20V7" />
          <path {...common} d="m7 12 5-5 5 5" />
          <path {...common} d="M5 20h14" />
        </>
      ) : null}
      {name === "receipt" ? (
        <>
          <path {...common} d="M6 4h12v16l-2-1.2-2 1.2-2-1.2-2 1.2-2-1.2L6 20V4Z" />
          <path {...common} d="M9 8h6" />
          <path {...common} d="M9 12h6" />
          <path {...common} d="M9 16h3" />
        </>
      ) : null}
      {name === "shield" ? (
        <>
          <path {...common} d="M12 4 19 7v5c0 4.2-2.8 6.7-7 8-4.2-1.3-7-3.8-7-8V7l7-3Z" />
          <path {...common} d="m9 12 2 2 4-4" />
        </>
      ) : null}
      {name === "signal" ? (
        <>
          <path {...common} d="M4 18h16" />
          <path {...common} d="M7 15v3" />
          <path {...common} d="M12 10v8" />
          <path {...common} d="M17 6v12" />
        </>
      ) : null}
      {name === "wallet" ? (
        <>
          <rect {...common} x="3.5" y="6" width="17" height="12" rx="3" />
          <path {...common} d="M16 12h4" />
          <path {...common} d="M7 9h6" />
        </>
      ) : null}
    </svg>
  );
}

function FinanceSectionLabel({
  icon,
  children,
  color,
}: {
  icon: FinanceGlyphName;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        ...sectionLabel(),
        color: color || "#42617D",
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <FinanceGlyph name={icon} size={17} />
      <span>{children}</span>
    </div>
  );
}

function financeToolButtonStyle(isCompact: boolean): React.CSSProperties {
  const compactHeight = 124;
  const desktopHeight = 132;

  return {
    height: isCompact ? compactHeight : desktopHeight,
    minHeight: isCompact ? compactHeight : desktopHeight,
    maxHeight: isCompact ? compactHeight : desktopHeight,
    borderRadius: 22,
    border: "1px solid rgba(19, 95, 209, 0.14)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 56%, #EEF6FF 100%)",
    boxShadow:
      "0 14px 30px rgba(7,23,44,0.09), inset 0 1px 0 rgba(255,255,255,0.85)",
    color: "#07172C",
    display: "grid",
    gap: isCompact ? 7 : 10,
    justifyItems: "center",
    alignContent: "center",
    padding: isCompact ? "13px 10px" : 16,
    textAlign: "center",
    minWidth: 0,
    overflow: "hidden",
  };
}

function financeMiniToolButtonStyle(isCompact: boolean): React.CSSProperties {
  const compactHeight = 88;
  const desktopHeight = 76;

  return {
    height: isCompact ? compactHeight : desktopHeight,
    minHeight: isCompact ? compactHeight : desktopHeight,
    maxHeight: isCompact ? compactHeight : desktopHeight,
    padding: isCompact ? "12px 10px" : "12px",
    borderRadius: 20,
    border: "1px solid rgba(216, 227, 238, 0.95)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 58%, #F0F6FD 100%)",
    boxShadow: "0 10px 22px rgba(7, 23, 44, 0.07)",
    color: "#07172C",
    textAlign: "left",
    display: "block",
    minWidth: 0,
    overflow: "hidden",
  };
}

function financeDarkButtonStyle(): React.CSSProperties {
  return {
    border: "1px solid rgba(121,149,190,0.20)",
    background:
      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    color: "#E6EEF8",
    fontWeight: 800,
    boxShadow:
      "0 12px 24px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function financeCollapseButtonStyle(): React.CSSProperties {
  return {
    borderRadius: 999,
    border: "1px solid rgba(31,115,224,0.20)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F5F9FE 50%, #EAF3FF 100%)",
    color: "#0B4EA2",
    fontWeight: 900,
    boxShadow:
      "0 10px 22px rgba(7,23,44,0.08), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
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

function FinanceMobileRecord({
  title,
  tone = "neutral",
  rows,
}: {
  title: string;
  tone?: "neutral" | "watch" | "good";
  rows: Array<[string, React.ReactNode]>;
}) {
  const accent =
    tone === "watch" ? "#B78321" : tone === "good" ? "#168254" : "#0B4EA2";

  return (
    <div
      style={{
        ...innerCard("#F8FBFF"),
        borderColor: "rgba(31,115,224,0.12)",
        display: "grid",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div
        style={{
          color: "#07172C",
          fontSize: 15,
          fontWeight: 950,
          lineHeight: 1.22,
          overflowWrap: "break-word",
        }}
      >
        {title}
      </div>
      <div
        aria-hidden="true"
        style={{
          width: 44,
          height: 3,
          borderRadius: 999,
          background: accent,
        }}
      />
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map(([label, value]) => (
          <div
            key={label}
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(92px, 0.42fr) minmax(0, 1fr)",
              gap: 10,
              alignItems: "start",
              minWidth: 0,
            }}
          >
            <div
              style={{
                color: "#5D7389",
                fontSize: 11,
                fontWeight: 900,
                letterSpacing: 0.2,
                lineHeight: 1.25,
                textTransform: "uppercase",
              }}
            >
              {label}
            </div>
            <div
              style={{
                color: "#243B53",
                fontSize: 13.5,
                fontWeight: 800,
                lineHeight: 1.35,
                minWidth: 0,
                overflowWrap: "break-word",
                wordBreak: "normal",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>
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
    ) || "Waiting for setup"
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

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function FinancePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeSelectedClanId = useMemo(() => {
    const query = new URLSearchParams(location.search);
    return positiveNumber(
      query.get("clan_id") ||
        query.get("community") ||
        query.get("community_id")
    );
  }, [location.search]);
  const selectedClanId =
    routeSelectedClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "finance.route.dashboard"),
      marketplace: routeTarget("marketplace", selectedClanId, "finance.route.marketplace"),
      moneyIn: routeTarget("moneyIn", selectedClanId, "finance.route.money-in-target"),
      moneyOut: routeTarget("moneyOut", selectedClanId, "finance.route.money-out-target"),
      paymentRails: routeTarget("paymentRails", selectedClanId, "finance.route.payment-rails-target"),
      payoutDetails: routeTarget("payoutDetails", selectedClanId, "finance.route.payout-details-target"),
      loanReadiness: routeTarget("loanReadiness", selectedClanId, "finance.route.loan-readiness-target"),
      trust: routeTarget("trust", selectedClanId, "finance.route.trust-target"),
      loans: routeTarget("loans", selectedClanId, "finance.route.loans-target"),
    }),
    [selectedClanId]
  );
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
    if (routeSelectedClanId <= 0) return;
    (api as any).setSelectedClanId?.(routeSelectedClanId);
  }, [routeSelectedClanId]);

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
    return firstTruthy(me?.gmfn_id, "Waiting for setup");
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
        else if (state === "Bank match started") acc.matched += 1;
        else if (state === "Awaiting bank check") acc.awaitingReconciliation += 1;
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
        `You have finance records in ${crossCommunitiesCount} communit${
          crossCommunitiesCount === 1 ? "y" : "ies"
        } under this GSN ID.`
      );
    }

    if (parseMoneyNumber(crossEffectiveAvailable) > 0) {
      rows.push(
        `Money available across your communities: ${fmtMoney(
          crossEffectiveAvailable
        )} ${crossCurrency}.`
      );
    }

    if (repaymentProofCount > 0) {
      rows.push(
        `${repaymentProofCount} repayment record${
          repaymentProofCount === 1 ? "" : "s"
        } supporting your trust history.`
      );
    }

    if (supportProofCount > 0) {
      rows.push(
        `${supportProofCount} successful support record${
          supportProofCount === 1 ? "" : "s"
        } in your name.`
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
        "Your positive finance signals will grow as payments and support records are completed."
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
        `You still have ${fmtMoney(
          borrowerRemainingTotal
        )} ${crossCurrency} showing on borrower records.`
      );
    }

    if (parseMoneyNumber(crossLockedGuarantees) > 0) {
      rows.push(
        `You have ${fmtMoney(
          crossLockedGuarantees
        )} ${crossCurrency} still held for guarantee support.`
      );
    }

    if (pendingReconciliationCount > 0) {
      rows.push(
        `${pendingReconciliationCount} payment${
          pendingReconciliationCount === 1 ? "" : "s"
        } waiting for bank confirmation.`
      );
    }

    if (parseMoneyNumber(crossPendingWithdrawals) > 0) {
      rows.push(
        `Money out still waiting: ${fmtMoney(
          crossPendingWithdrawals
        )} ${crossCurrency}.`
      );
    }

    if (parseMoneyNumber(crossPendingDeposits) > 0) {
      rows.push(
        `Money in still waiting: ${fmtMoney(
          crossPendingDeposits
        )} ${crossCurrency}.`
      );
    }

    if (financePressureEventCount > 0) {
      rows.push(
        `${financePressureEventCount} finance pressure event${
          financePressureEventCount === 1 ? "" : "s"
        } needing attention.`
      );
    }

    if (rows.length === 0) {
      rows.push(
        "Nothing urgent is standing out from your finance records right now."
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
          "A repayment or guarantee support item needs your attention.",
      };
    }

    if (hasWatchPressure) {
      return {
        tone: "watch" as const,
        title: "Active follow-up needed.",
        detail:
          "Some payments or support records are still waiting for completion.",
      };
    }

    return {
      tone: "calm" as const,
      title: "No urgent finance pressure shown.",
      detail:
        "Your current finance view is not showing overdue repayment pressure, heavy locked support, or waiting payment items.",
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

  const financePositionRows: Array<[string, string, string]> = [
    ["Community balance", `${poolAmount} ${poolCurrency}`, "Money currently showing for this community."],
    ["Available now", `${effectiveAvailable} ${poolCurrency}`, "Money available after anything set aside."],
    ["Set aside", `${reservedPool} ${poolCurrency}`, "Money held for a reason, such as support or commitment."],
    ["Money in waiting", `${pendingDeposits} ${poolCurrency}`, "Incoming money not completed yet."],
    ["Money out waiting", `${pendingWithdrawals} ${poolCurrency}`, "Outgoing money not completed yet."],
    ["Borrowed support total", `${fmtMoney(borrowerRequestedTotal)} ${poolCurrency}`, "Support you requested that is still active."],
    ["Still to repay", `${fmtMoney(borrowerRemainingTotal)} ${poolCurrency}`, "Repayment amount still showing."],
    ["Guarantees held", `${safeStr(guarantorExposure?.totalLocked || "0")} ${poolCurrency}`, "Support still held for people you backed."],
    ["Guarantees released", `${safeStr(guarantorExposure?.totalReleased || "0")} ${poolCurrency}`, "Support already released from past backing."],
    ["Active guarantees", safeStr(guarantorExposure?.activeGuarantees ?? 0), "People you are still backing now."],
    ["Past guarantees", safeStr(guarantorExposure?.historicalGuarantees ?? 0), "People you backed before."],
    ["Money history rows", String(poolEvents.length), "Recent money movements we can show you."],
  ];

  const supportBackedRows: Array<[string, string]> = [
    ["Total locked", `${safeStr(guarantorExposure?.totalLocked || "0")} ${poolCurrency}`],
    ["Total released", `${safeStr(guarantorExposure?.totalReleased || "0")} ${poolCurrency}`],
    ["Active guarantees", safeStr(guarantorExposure?.activeGuarantees ?? 0)],
    ["Historical guarantees", safeStr(guarantorExposure?.historicalGuarantees ?? 0)],
    [
      "Note",
      safeStr(
        guarantorExposure?.note ||
          "This is for your information. It is not an automatic debit."
      ),
    ],
  ];

  const communityMoneyContextRows: Array<[string, string]> = [
    ["Community", safeStr(clanLiquidity?.clanName || communityLabel)],
    ["Active loans", safeStr(clanLiquidity?.activeLoansCount ?? 0)],
    ["Pledged total", safeStr(clanLiquidity?.pledgedTotal || "0")],
    ["Locked total", safeStr(clanLiquidity?.lockedTotal || "0")],
    ["Released total", safeStr(clanLiquidity?.releasedTotal || "0")],
    [
      "Note",
      safeStr(
        clanLiquidity?.note ||
          "This shows the money context for this community."
      ),
    ],
  ];

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function handleCollapseTap(key: keyof CollapseState) {
    toggleSection(key);
  }

  function openFinanceDetailLane(key: keyof CollapseState, targetId: string) {
    setCollapsed({
      ...defaultCollapseState(),
      [key]: false,
    });
    revealFinanceSection(targetId);
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

    target.scrollIntoView({ behavior: "auto", block: "start" });
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
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.marketplace}
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
        subtitle="Finance turns money behaviour into a clear record across communities."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.marketplace}
        backLabel="Marketplace"
      />

      <section
        id="finance-file"
        style={{
          borderRadius: 28,
          padding: isCompact ? 18 : 24,
          border: "1px solid rgba(214,170,69,0.32)",
          background:
            "linear-gradient(145deg, #07172C 0%, #092642 62%, #03101F 100%)",
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
              See money coming in, money going out, payment checks, and support
              records in one calm place.
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
                Community code: {publicCommunityCode}
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
                  Money code: {poolReference}
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
                Your role: {memberRole}
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
              icon: "community" as FinanceGlyphName,
              label: "Communities",
              value: String(crossCommunitiesCount),
              note: "Active",
            },
            {
              icon: "wallet" as FinanceGlyphName,
              label: "Visible balance",
              value: fmtFinanceAmount(crossMembershipPool, crossCurrency),
              note: `Set aside: ${fmtFinanceAmount(crossReservedPool, crossCurrency)}`,
            },
            {
              icon: "down" as FinanceGlyphName,
              label: "Money in this month",
              value: fmtFinanceAmount(visibleMonthInflow, crossCurrency),
              note: "Paid in this month",
            },
            {
              icon: "shield" as FinanceGlyphName,
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
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  fontSize: 11,
                  fontWeight: 950,
                  textTransform: "uppercase",
                }}
              >
                <FinanceGlyph name={item.icon} size={17} />
                <span>{item.label}</span>
              </div>
              <div
                style={{
                  color: "#FFFFFF",
                  fontSize: isCompact ? 21 : 24,
                  fontWeight: 950,
                  lineHeight: 1.1,
                  overflowWrap: "break-word",
                  wordBreak: "normal",
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
        <div style={sectionLabel()}>Choose what you need now</div>
        <div style={{ marginTop: 8, ...helperText() }}>
          Open one finance lane at a time. Marketplace money stays local there;
          this page brings your money story together across communities.
        </div>
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
              icon: "card" as FinanceGlyphName,
              label: "Money In",
              detail: "Open guided pay-in.",
              action: () => openFinanceRoute(routes.moneyIn),
              color: "#135FD1",
            },
            {
              id: "reports",
              icon: "chart" as FinanceGlyphName,
              label: "Money Summary",
              detail: "See your full money position.",
              action: () => {
                openFinanceDetailLane("overview", "finance-summary");
              },
              color: "#21A365",
            },
            {
              id: "bank-accounts",
              icon: "bank" as FinanceGlyphName,
              label: "Banking Rails",
              detail: "Check rails before acting.",
              action: () => openFinanceRoute(routes.paymentRails),
              color: "#D6AA45",
            },
            {
              id: "export-data",
              icon: "ledger" as FinanceGlyphName,
              label: "Records / Events",
              detail: "Read money records.",
              action: () => {
                openFinanceDetailLane("events", "finance-events");
              },
              color: "#5B3BC4",
            },
          ].map((item) => (
            <SecondaryButton
              key={item.id}
              onClick={item.action}
              fullWidth
              stableHeight={isCompact ? 124 : 132}
              debugId={`finance.tool.${item.id}`}
              style={financeToolButtonStyle(isCompact)}
            >
              <span
                aria-hidden="true"
                style={{
                  width: isCompact ? 42 : 54,
                  height: isCompact ? 42 : 54,
                  borderRadius: 999,
                  background: item.color,
                  color: "#FFFFFF",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 950,
                  boxShadow: "0 10px 22px rgba(7,23,44,0.12)",
                }}
              >
                <FinanceGlyph name={item.icon} size={isCompact ? 21 : 26} color="#FFFFFF" />
              </span>
              <span
                style={{
                  ...brandClampLines(2),
                  fontSize: isCompact ? 14 : 15,
                  fontWeight: 950,
                  lineHeight: 1.12,
                }}
              >
                {item.label}
              </span>
              <span
                style={{
                  ...brandClampLines(2),
                  color: "#52697F",
                  fontSize: isCompact ? 11 : 12,
                  fontWeight: 750,
                  lineHeight: 1.18,
                }}
              >
                {item.detail}
              </span>
            </SecondaryButton>
          ))}
        </div>
        <div
          style={{
            marginTop: 16,
            padding: isCompact ? 12 : 14,
            borderRadius: 22,
            border: "1px solid rgba(19, 95, 209, 0.14)",
            background: "linear-gradient(180deg, #F8FBFF 0%, #EEF6FF 100%)",
            boxShadow: "0 12px 28px rgba(7, 23, 44, 0.06)",
          }}
        >
          <FinanceSectionLabel icon="signal" color="#0B4EA2">
            Other finance lanes
          </FinanceSectionLabel>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {[
              {
                icon: "out" as FinanceGlyphName,
                label: "Money Out",
                detail: "Open guided payout",
                action: () => openFinanceRoute(routes.moneyOut),
              },
              {
                icon: "receipt" as FinanceGlyphName,
                label: "Payout Details",
                detail: "Confirm payout information",
                action: () => openFinanceRoute(routes.payoutDetails),
              },
              {
                icon: "check" as FinanceGlyphName,
                label: "Signals / Readiness",
                detail: "Read support readiness",
                action: () => openFinanceRoute(routes.loanReadiness),
              },
              {
                icon: "shield" as FinanceGlyphName,
                label: "Trust Passport",
                detail: "See your trust record",
                action: () => openFinanceRoute(routes.trust),
              },
            ].map((tool) => (
              <SecondaryButton
                key={tool.label}
                onClick={tool.action}
                fullWidth
                stableHeight={isCompact ? 88 : 76}
                debugId={`finance.mini-tool.${tool.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                style={financeMiniToolButtonStyle(isCompact)}
              >
                <span
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontWeight: 950,
                    fontSize: isCompact ? 13 : 14,
                    lineHeight: 1.15,
                  }}
                >
                  <FinanceGlyph name={tool.icon} size={isCompact ? 18 : 20} color="#0B4EA2" />
                  <span style={brandSingleLine()}>{tool.label}</span>
                </span>
                <span
                  style={{
                    ...brandClampLines(2),
                    marginTop: 5,
                    color: "#52677D",
                    fontWeight: 800,
                    fontSize: isCompact ? 11 : 12,
                    lineHeight: 1.2,
                  }}
                >
                  {tool.detail}
                </span>
              </SecondaryButton>
            ))}
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
          <FinanceSectionLabel icon="down">Visible Cash Flow</FinanceSectionLabel>
          <span style={badge(false)}>This month</span>
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
              note: `${visibleMonthInflowCount} recorded move${
                visibleMonthInflowCount === 1 ? "" : "s"
              }`,
              color: "#168254",
            },
            {
              label: "Total outflow",
              value: fmtFinanceAmount(visibleMonthOutflow, crossCurrency),
              note: `${visibleMonthOutflowCount} recorded move${
                visibleMonthOutflowCount === 1 ? "" : "s"
              }`,
              color: "#C83A3A",
            },
            {
              label: "Net movement",
              value: visibleMonthNetLabel,
              note: "From money activity we can show now",
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
          <FinanceSectionLabel icon="history">Recent Finance Events</FinanceSectionLabel>
          <SubtleButton
            onClick={() => {
              openFinanceDetailLane("events", "finance-events");
            }}
            debugId="finance.events.view-all"
            style={{
              border: "none",
              background: "transparent",
              color: "#135FD1",
              fontSize: 14,
              fontWeight: 950,
              boxShadow: "none",
              padding: "8px 0",
              minWidth: 72,
            }}
          >
            View all
          </SubtleButton>
        </div>

        <div style={{ marginTop: 12, display: "grid" }}>
          {poolEvents.length === 0 ? (
            emptyRecord("No recent money movement is showing yet.")
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
                    <FinanceGlyph
                      name={direction === "neutral" ? "history" : isOut ? "out" : "down"}
                      size={18}
                      color="#FFFFFF"
                    />
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
                      {row.createdAt ? safeDateTime(row.createdAt) : "Recorded"}
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
          <FinanceSectionLabel icon="shield" color="#F2CF77">
            Finance Signals
          </FinanceSectionLabel>
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
              Working well: {financeHelps[0]}
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
              Check this: {financeWatchItems[0]}
            </div>
          </div>
        </div>
        <PrimaryButton
          onClick={() => {
            setCollapsed((prev) => ({
              ...prev,
              overview: false,
              reconciliation: false,
              borrower: false,
            }));
            revealFinanceSection("finance-summary");
          }}
          debugId="finance.view-signals"
          minWidth={isCompact ? "100%" : 210}
          style={{
            background:
              "linear-gradient(180deg, #FFE28A 0%, #D6AA45 70%, #B78321 100%)",
            color: "#07172C",
          }}
        >
          View Finance Signals
        </PrimaryButton>
      </section>

      <section
        id="finance-summary"
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
            <FinanceSectionLabel icon="chart">Money Summary</FinanceSectionLabel>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read your money position first. These figures show the selected
              community view inside your wider Finance story.
            </div>
          </div>

          <SubtleButton
            onClick={() => handleCollapseTap("overview")}
            minWidth={124}
            stableHeight={50}
            debugId="finance.toggle-overview"
            style={financeCollapseButtonStyle()}
          >
            {collapsed.overview ? "Show details" : "Hide details"}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          isCompact ? (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {financePositionRows.map(([label, value, meaning]) => (
                <FinanceMobileRecord
                  key={label}
                  title={label}
                  rows={[
                    ["Amount / count", value],
                    ["Meaning", meaning],
                  ]}
                />
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 14, ...tableWrap() }}>
              <table style={financeTable()}>
                <thead>
                  <tr>
                    <th style={tableHeadCell()}>Item</th>
                    <th style={tableHeadCell()}>Amount / count</th>
                    <th style={tableHeadCell()}>What it means</th>
                  </tr>
                </thead>
                <tbody>
                  {financePositionRows.map(([label, value, meaning]) => (
                    <tr key={label}>
                      <td style={tableCell(true)}>{label}</td>
                      <td style={tableCell(true)}>{value}</td>
                      <td style={tableCell()}>{meaning}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : null}
      </section>

      <section
        id="finance-reconciliation"
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
            <div style={sectionLabel()}>Payments waiting for confirmation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              See which payments are waiting, which are confirmed, and what to do next.
            </div>
          </div>

          <SubtleButton
            onClick={() => handleCollapseTap("reconciliation")}
            minWidth={124}
            stableHeight={50}
            debugId="finance.toggle-reconciliation"
            style={financeCollapseButtonStyle()}
          >
            {collapsed.reconciliation ? "Show payments" : "Hide payments"}
          </SubtleButton>
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
              <span style={badge(true)}>Payments waiting: {activeExpectedPayments.length}</span>
              <span style={badge(false)}>Waiting for confirmation: {pendingReconciliationCount}</span>
              <span style={badge(false)}>Confirmed: {expectedPaymentStateCounts.confirmed}</span>
              <span style={badge(false)}>Bank match started: {expectedPaymentStateCounts.matched}</span>
              <span style={badge(false)}>
                Needs new instruction: {expectedPaymentStateCounts.awaitingIssue}
              </span>
            </div>

            {activeExpectedPayments.length === 0 ? (
              emptyRecord("No payment is waiting for confirmation right now.")
            ) : isCompact ? (
              <div style={{ display: "grid", gap: 10 }}>
                {activeExpectedPayments.slice(0, 10).map((item, index) => (
                  <FinanceMobileRecord
                    key={`${item.id || index}`}
                    title={safeStr(item.expected_type || "Expected payment")}
                    tone={expectedPaymentState(item) === "Confirmed" ? "good" : "watch"}
                    rows={[
                      ["Reference", safeStr(item.reference_display || "-")],
                      [
                        "Amount",
                        `${safeStr(item.amount || "0.00")} ${safeStr(item.currency || poolCurrency)}`,
                      ],
                      ["Payment check", expectedPaymentState(item)],
                      [
                        "Status",
                        `${safeStr(item.status || "expected")}${
                          item.status_reason ? ` - ${safeStr(item.status_reason)}` : ""
                        }`,
                      ],
                      [
                        "Date",
                        item.confirmed_at
                          ? `Confirmed: ${safeDateTime(item.confirmed_at)}`
                          : item.due_at
                            ? `Due: ${safeDateTime(item.due_at)}`
                            : item.matched_bank_event_id
                              ? "Bank match started"
                              : "-",
                      ],
                      ["Next action", expectedPaymentNextAction(item)],
                    ]}
                  />
                ))}
              </div>
            ) : (
              <div style={tableWrap()}>
                <table style={financeTable()}>
                  <thead>
                    <tr>
                      <th style={tableHeadCell()}>Type</th>
                      <th style={tableHeadCell()}>Reference</th>
                      <th style={tableHeadCell()}>Amount</th>
                      <th style={tableHeadCell()}>Payment check</th>
                      <th style={tableHeadCell()}>Status</th>
                      <th style={tableHeadCell()}>Date</th>
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
                                ? "Bank match started"
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
            <div style={sectionLabel()}>Loans and support effect</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Finance shows the money effect. Loans & Support is where requests and decisions happen.
            </div>
          </div>

          <SubtleButton
            onClick={() => handleCollapseTap("borrower")}
            minWidth={124}
            stableHeight={50}
            debugId="finance.toggle-borrower"
            style={financeCollapseButtonStyle()}
          >
            {collapsed.borrower ? "Show support" : "Hide support"}
          </SubtleButton>
        </div>

        {!collapsed.borrower ? (
          <div style={{ marginTop: 14, display: "grid", gap: 16 }}>
            <div>
              <div style={sectionLabel()}>Support you requested</div>
              {borrowerLoans.length === 0 ? (
                <div style={{ marginTop: 10 }}>
                  {emptyRecord("No active support request is affecting your finance right now.")}
                </div>
              ) : isCompact ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {borrowerLoans.map((row, index) => {
                    const summary = loanSummaries[positiveNumber(row.id)] || null;
                    const rowCurrency = safeStr(summary?.currency || row.currency || poolCurrency);
                    const remainingAmount = parseMoneyNumber(summary?.remainingAmount);

                    return (
                      <FinanceMobileRecord
                        key={`${row.id || index}`}
                        title={safeStr(row.title || `Loan ${row.id || index + 1}`)}
                        tone={remainingAmount > 0 ? "watch" : "neutral"}
                        rows={[
                          ["Status", safeStr(summary?.status || row.status || "Open")],
                          [
                            "Amount",
                            `${safeStr(summary?.amount ?? row.amount ?? "0.00")} ${rowCurrency}`,
                          ],
                          ["Paid", `${safeStr(summary?.paidTotal ?? "0.00")} ${rowCurrency}`],
                          [
                            "Remaining",
                            `${safeStr(summary?.remainingAmount ?? "0.00")} ${rowCurrency}`,
                          ],
                          ["Service fee", safeStr(summary?.serviceFee ?? "-")],
                          ["Money received", safeStr(summary?.netDisbursed ?? "-")],
                          ["Backed amount", safeStr(summary?.guarantorPool ?? "-")],
                          [
                            "Due / started",
                            summary?.dueAt
                              ? safeDateTime(summary.dueAt)
                              : row.createdAt
                                ? safeDateTime(row.createdAt)
                                : "-",
                          ],
                        ]}
                      />
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={financeTable()}>
                    <thead>
                      <tr>
                        <th style={tableHeadCell()}>Support item</th>
                        <th style={tableHeadCell()}>Status</th>
                        <th style={tableHeadCell()}>Amount</th>
                        <th style={tableHeadCell()}>Paid</th>
                        <th style={tableHeadCell()}>Remaining</th>
                        <th style={tableHeadCell()}>Service fee</th>
                        <th style={tableHeadCell()}>Money received</th>
                        <th style={tableHeadCell()}>Backed amount</th>
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
              {isCompact ? (
                <FinanceMobileRecord
                  title="Support you backed"
                  tone={parseMoneyNumber(guarantorExposure?.totalLocked) > 0 ? "watch" : "neutral"}
                  rows={supportBackedRows}
                />
              ) : (
                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Support you backed</div>
                  <div style={{ marginTop: 10, ...tableWrap() }}>
                    <table style={{ ...financeTable(), minWidth: 520 }}>
                      <tbody>
                        {supportBackedRows.map(([label, value]) => (
                          <tr key={label}>
                            <td style={tableCell(true)}>{label}</td>
                            <td style={tableCell()}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {isCompact ? (
                <FinanceMobileRecord
                  title="Community money context"
                  rows={communityMoneyContextRows}
                />
              ) : (
                <div style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>Community money context</div>
                  <div style={{ marginTop: 10, ...tableWrap() }}>
                    <table style={{ ...financeTable(), minWidth: 520 }}>
                      <tbody>
                        {communityMoneyContextRows.map(([label, value]) => (
                          <tr key={label}>
                            <td style={tableCell(true)}>{label}</td>
                            <td style={tableCell()}>{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div>
              <div style={sectionLabel()}>Earnings from backing others</div>
              {guarantorEarningsItems.length === 0 ? (
                <div style={{ marginTop: 10 }}>
                  {emptyRecord("No earnings from backing others are showing yet.")}
                </div>
              ) : isCompact ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {guarantorEarningsItems.slice(0, 10).map((item, index) => (
                    <FinanceMobileRecord
                      key={`${item?.loan_guarantor_id || index}`}
                      title={`Loan ${safeStr(item?.loan_id || "-")}`}
                      tone={parseMoneyNumber(item?.share_amount) > 0 ? "good" : "neutral"}
                      rows={[
                        ["Support row", safeStr(item?.loan_guarantor_id || "-")],
                        ["Support weight", safeStr(item?.weight_amount || "0.00")],
                        ["Potential share", safeStr(item?.share_amount || "0.00")],
                        ["Status", safeStr(item?.earning_status || item?.status || "-")],
                        ["Currency", safeStr(item?.currency || poolCurrency)],
                      ]}
                    />
                  ))}
                </div>
              ) : (
                <div style={{ marginTop: 10, ...tableWrap() }}>
                  <table style={financeTable()}>
                    <thead>
                      <tr>
                        <th style={tableHeadCell()}>Loan ID</th>
                        <th style={tableHeadCell()}>Support row</th>
                        <th style={tableHeadCell()}>Support weight</th>
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
              <StableCtaLink
                to={routes.loans}
                debugId="finance.open-loans"
                style={financeDarkButtonStyle()}
              >
                Open Loans & Support
              </StableCtaLink>
            </div>
          </div>
        ) : null}
      </section>

      <section
        id="finance-events"
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
            <div style={sectionLabel()}>Recent money history</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              These are the latest money movements we can show you.
            </div>
          </div>

          <SubtleButton
            onClick={() => handleCollapseTap("events")}
            minWidth={124}
            stableHeight={50}
            debugId="finance.toggle-events"
            style={financeCollapseButtonStyle()}
          >
            {collapsed.events ? "Show history" : "Hide history"}
          </SubtleButton>
        </div>

        {!collapsed.events ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {poolEvents.length === 0 ? (
              emptyRecord("No recent money movement is showing yet.")
            ) : isCompact ? (
              <div style={{ display: "grid", gap: 10 }}>
                {poolEvents.slice(0, 12).map((row, index) => (
                  <FinanceMobileRecord
                    key={`${row.id || index}`}
                    title={safeStr(row.eventType || "Money event")}
                    tone={poolEventDirection(row) === "in" ? "good" : "neutral"}
                    rows={[
                      [
                        "Amount",
                        `${safeStr(row.amount || "-")} ${safeStr(row.currency || poolCurrency)}`,
                      ],
                      ["Reference", safeStr(row.reference || "-")],
                      ["Note", safeStr(row.note || "-")],
                      ["Created", row.createdAt ? safeDateTime(row.createdAt) : "-"],
                      ["Confirmed", row.confirmedAt ? safeDateTime(row.confirmedAt) : "-"],
                    ]}
                  />
                ))}
              </div>
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
                          {safeStr(row.eventType || "Money event")}
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



