import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { brandClampLines } from "../styles/gmfnBrand";

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

type LoanDraftSummary = {
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
  purpose?: string | null;
  note?: string | null;
};

type SuggestedSupporter = {
  key: string;
  userId?: number;
  gmfnId?: string;
  name: string;
  reason?: string | null;
  recommendedPledge?: string | null;
  trustScore?: string | null;
  trustBand?: string | null;
};

type CollapseState = {
  overview: boolean;
  reading: boolean;
  supporters: boolean;
  routes: boolean;
};

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
  handoffMode?: string;
  supportGap?: string;
  updatedAt?: string | null;
};

const LOAN_SUGGESTIONS_UI_STORAGE_KEY = "gmfn.loanSuggestions.sections.v2";
const WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES = [
  "gmfn.withdrawal.task.v5",
  "gmfn.withdrawal.task.v4",
];

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
  if (!raw) return "—";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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
    supporters: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    reading: Boolean(raw?.reading ?? base.reading),
    supporters: Boolean(raw?.supporters ?? base.supporters),
    routes: Boolean(raw?.routes ?? base.routes),
  };
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

function normalizeLoanSummary(raw: any): LoanDraftSummary | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

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
    purpose: firstTruthy(src?.purpose, src?.title),
    note: firstTruthy(src?.note, src?.description),
  };
}

function normalizeSuggestedSupporter(raw: any): SuggestedSupporter | null {
  if (!raw) return null;

  const src = raw?.item || raw?.member || raw?.user || raw?.candidate || raw;

  const userId = positiveNumber(
    firstDefined(src?.user_id, src?.member_user_id, src?.id, src?.member_id)
  );
  const gmfnId = firstTruthy(
    src?.gmfn_id,
    src?.member_gmfn_id,
    src?.owner_gmfn_id
  );
  const name = firstTruthy(
    src?.display_name,
    src?.name,
    src?.nickname,
    [safeStr(src?.first_name), safeStr(src?.surname)].filter(Boolean).join(" "),
    gmfnId,
    userId ? `Member ${userId}` : ""
  );
  const reason = firstTruthy(src?.reason, src?.note, src?.detail, src?.why);
  const recommendedPledge = firstTruthy(
    src?.recommended_pledge_amount,
    src?.pledge_amount,
    src?.suggested_amount,
    src?.amount
  );

  if (!userId && !gmfnId && !name) return null;

  const key = userId > 0 ? `u-${userId}` : `g-${safeStr(gmfnId).toUpperCase()}`;

  return {
    key,
    userId: userId || undefined,
    gmfnId: gmfnId || undefined,
    name,
    reason: reason || undefined,
    recommendedPledge: recommendedPledge || undefined,
    trustScore: firstTruthy(src?.trust_score, src?.cci),
    trustBand: firstTruthy(src?.trust_band),
  };
}

function extractSuggestedSupporters(raw: any): SuggestedSupporter[] {
  const buckets = [
    raw?.items,
    raw?.suggestions,
    raw?.guarantors,
    raw?.candidates,
    raw?.recommended,
    raw?.data?.items,
    raw?.data?.suggestions,
  ];

  for (const bucket of buckets) {
    if (!Array.isArray(bucket)) continue;

    const rows = bucket
      .map((row: any) => normalizeSuggestedSupporter(row))
      .filter(Boolean) as SuggestedSupporter[];

    if (rows.length > 0) return rows;
  }

  return [];
}

function extractSuggestionMessage(raw: any): string {
  return firstTruthy(
    raw?.decision_message,
    raw?.message,
    raw?.summary?.message,
    raw?.summary?.note,
    raw?.borrower_message,
    raw?.liquidity_message,
    raw?.note,
    raw?.detail
  );
}

function isActiveLoan(row: LoanRow): boolean {
  const status = safeStr(row?.status).toLowerCase();
  return !FINAL_LOAN_STATUSES.has(status);
}

function isBorrowerLoan(row: LoanRow): boolean {
  const role = safeStr(row?.role).toLowerCase();
  return role === "borrower" || role.includes("borrow");
}

function getLoanAmountText(row: LoanRow | LoanDraftSummary | null): string {
  const value = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!value && !currency) return "Amount pending";
  if (value && currency) return `${value} ${currency}`;
  return value || currency || "Amount pending";
}

function readWithdrawalTask(clanId: number, gmfnId: string): PersistedWithdrawalTask | null {
  if (!clanId || !gmfnId) return null;

  for (const prefix of WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES) {
    const key = `${prefix}.${gmfnId || "me"}.${clanId || 0}`;
    const value = readLocalJSON<PersistedWithdrawalTask | null>(key, null);
    if (value) return value;
  }

  return null;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.20)",
    boxShadow: "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.16)",
    boxShadow: "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
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
      ? "linear-gradient(180deg, #184A96 0%, #133A74 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
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
      ? "0 16px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function routeTileTitleStyle(): React.CSSProperties {
  return {
    ...brandClampLines(2),
    color: "#F8FBFF",
    fontWeight: 900,
    fontSize: 17,
    lineHeight: 1.3,
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

function loanSuggestionsActionText(
  name: GsnIconName,
  label: React.ReactNode,
  size = 22
) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        whiteSpace: "nowrap",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function loanSuggestionsRouteHeading(name: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
      }}
    >
      <GsnLegacyIcon name={name} size={24} />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function loanSuggestionsIconTile(name: GsnIconName, size = 64) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 18,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,255,255,0.10)",
        border: "1px solid rgba(212,175,55,0.18)",
        overflow: "hidden",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(30, Math.round(size * 0.78))} />
    </span>
  );
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#9CB4CF",
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
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary ? "rgba(32,76,133,0.36)" : "rgba(255,255,255,0.08)",
    border: primary
      ? "1px solid rgba(123,161,204,0.24)"
      : "1px solid rgba(123,161,204,0.14)",
    color: primary ? "#CFE3FF" : "#E6EEF8",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#C8D8EA",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function communityName(currentClan: any, clanId: number): string {
  return (
    firstTruthy(
      currentClan?.marketplace_name,
      currentClan?.name,
      currentClan?.display_name,
      currentClan?.title
    ) || (clanId ? `Community ${clanId}` : "No current community")
  );
}

function communityPublicId(currentClan: any): string {
  return (
    firstTruthy(
      currentClan?.community_code,
      currentClan?.community?.community_code,
      currentClan?.profile?.community_code,
      currentClan?.marketplace?.community_code
    ) || "Pending"
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

function communityImageSrc(currentClan: any): string {
  const raw = firstTruthy(
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
  );

  return resolveMediaUrl(raw);
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  hash?: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId, hash }).to);
}

export default function LoanSuggestionsPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId =
    routeClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "loan-suggestions.nav.dashboard"),
      community: routeTarget(
        "communityHome",
        selectedClanId,
        "loan-suggestions.route.community"
      ),
      readiness: routeTarget(
        "loanReadiness",
        selectedClanId,
        "loan-suggestions.route.readiness"
      ),
      startSupport: routeTarget(
        "marketplace",
        selectedClanId,
        "loan-suggestions.route.start-support",
        "marketplace-loans-support"
      ),
      workbench: routeTarget(
        "loanWorkbench",
        selectedClanId,
        "loan-suggestions.route.workbench"
      ),
      loans: routeTarget("loans", selectedClanId, "loan-suggestions.route.loans"),
      guarantorInbox: routeTarget(
        "guarantorInbox",
        selectedClanId,
        "loan-suggestions.route.guarantor-inbox"
      ),
      moneyOut: routeTarget("moneyOut", selectedClanId, "loan-suggestions.route.money-out"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "loan-suggestions.route.notifications"
      ),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOAN_SUGGESTIONS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [loanSummary, setLoanSummary] = useState<LoanDraftSummary | null>(null);
  const [suggestionRaw, setSuggestionRaw] = useState<any>(null);
  const [suggestedSupporters, setSuggestedSupporters] = useState<SuggestedSupporter[]>(
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
    writeLocalJSON(LOAN_SUGGESTIONS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, loansRes] = await Promise.all([
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null),
          typeof (api as any).listMyLoans === "function"
            ? (api as any).listMyLoans().catch(() => [])
            : Promise.resolve([]),
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

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Pending");
  }, [me]);

  const communityLabel = useMemo(() => {
    return communityName(currentClan, selectedClanId);
  }, [currentClan, selectedClanId]);

  const publicCommunityId = useMemo(() => {
    return communityPublicId(currentClan);
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return communityRole(currentClan);
  }, [currentClan]);

  const pictureSrc = useMemo(() => {
    return communityImageSrc(currentClan);
  }, [currentClan]);

  const activeBorrowerLoan = useMemo(() => {
    const rows = loans.filter((row) => isActiveLoan(row) && isBorrowerLoan(row));

    rows.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });

    return rows[0] || null;
  }, [loans]);

  const withdrawalTask = useMemo(
    () => readWithdrawalTask(selectedClanId, safeStr(me?.gmfn_id)),
    [selectedClanId, me]
  );

  const cameFromWithdrawalSupport = useMemo(() => {
    return (
      safeStr(withdrawalTask?.handoffMode) === "withdrawal-support" ||
      Boolean(safeStr(withdrawalTask?.supportGap))
    );
  }, [withdrawalTask]);

  const withdrawalAmount = safeStr(withdrawalTask?.amountInput);
  const supportGap = safeStr(withdrawalTask?.supportGap);
  const withdrawalNote = safeStr(withdrawalTask?.noteInput);

  const loadSuggestionsForLoan = useCallback(async (loanId: number) => {
    if (!loanId || !selectedClanId) {
      setLoanSummary(null);
      setSuggestionRaw(null);
      setSuggestedSupporters([]);
      return;
    }

    const [summaryRes, suggestionsRes] = await Promise.all([
      typeof (api as any).getLoanSummary === "function"
        ? (api as any).getLoanSummary(loanId).catch(() => null)
        : Promise.resolve(null),
      typeof (api as any).getLoanGuarantorSuggestions === "function"
        ? (api as any)
            .getLoanGuarantorSuggestions(loanId, {
              clan_id: selectedClanId,
              limit: 12,
            })
            .catch(() => null)
        : Promise.resolve(null),
    ]);

    setLoanSummary(normalizeLoanSummary(summaryRes));
    setSuggestionRaw(suggestionsRes);
    setSuggestedSupporters(extractSuggestedSupporters(suggestionsRes));
  }, [selectedClanId]);

  useEffect(() => {
    let alive = true;

    (async () => {
      const loanId = positiveNumber(activeBorrowerLoan?.id);

      if (!loanId || !selectedClanId) {
        if (!alive) return;
        setLoanSummary(null);
        setSuggestionRaw(null);
        setSuggestedSupporters([]);
        return;
      }

      await loadSuggestionsForLoan(loanId);

      if (!alive) return;
    })();

    return () => {
      alive = false;
    };
  }, [activeBorrowerLoan?.id, loadSuggestionsForLoan, selectedClanId]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const loanId = positiveNumber(activeBorrowerLoan?.id);
      if (!loanId) return;
      await loadSuggestionsForLoan(loanId);
    } finally {
      setRefreshing(false);
    }
  }

  const suggestionMessage = useMemo(() => {
    return extractSuggestionMessage(suggestionRaw);
  }, [suggestionRaw]);

  const requiredGuarantors = positiveNumber(loanSummary?.guarantorsRequired);
  const approvedGuarantors = positiveNumber(loanSummary?.approvedGuarantors);
  const sentGuarantors = positiveNumber(loanSummary?.guarantorsTotal);

  const fitReading = useMemo(() => {
    if (!selectedClanId || !safeStr(me?.gmfn_id)) {
      return {
        title: "Community or member identity is not ready.",
        detail:
          "The fit-reading stage works best when your current community and visible member identity are ready.",
        tone: "error" as const,
      };
    }

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      return {
        title: "Money Out has already handed off into support continuation.",
        detail:
          "Start or resume the borrower-side support draft first, then return here for guarantor fit reading.",
        tone: "watch" as const,
      };
    }

    if (!activeBorrowerLoan) {
      return {
        title: "Start a support draft first.",
        detail:
          "Loan suggestions only become meaningful after a borrower-side support item exists.",
        tone: "neutral" as const,
      };
    }

    if (requiredGuarantors > 0 && suggestedSupporters.length === 0) {
      return {
        title: "No fit guarantor suggestion is shown yet.",
        detail:
          suggestionMessage ||
          "The current amount or structure may still need a better fit before suggestions become clearer.",
        tone: "watch" as const,
      };
    }

    if (suggestedSupporters.length > 0) {
      return {
        title: "Fit suggestions are available.",
        detail:
          suggestionMessage ||
          "Review the strongest candidates, then continue into the deeper support workbench.",
        tone: "ready" as const,
      };
    }

    return {
      title: "This support item may not currently need guarantors.",
      detail:
        suggestionMessage ||
        "The current support structure does not show a strong guarantor requirement right now.",
      tone: "neutral" as const,
    };
  }, [
    selectedClanId,
    me,
    cameFromWithdrawalSupport,
    activeBorrowerLoan,
    requiredGuarantors,
    suggestedSupporters.length,
    suggestionMessage,
  ]);

  const fitTone =
    fitReading.tone === "ready"
      ? {
          bg: "#F3FBF5",
          border: "1px solid rgba(34,197,94,0.16)",
          text: "#166534",
        }
      : fitReading.tone === "watch"
      ? {
          bg: "#FFFBEF",
          border: "1px solid rgba(245,158,11,0.16)",
          text: "#92400E",
        }
      : fitReading.tone === "error"
      ? {
          bg: "#FEF2F2",
          border: "1px solid rgba(239,68,68,0.16)",
          text: "#991B1B",
        }
      : {
          bg: "#F8FBFF",
          border: "1px solid rgba(11,99,209,0.12)",
          text: "#0B63D1",
        };

  const nextRoute = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first.",
        detail:
          "Fit reading is clearer once your current community is in place.",
        ctaTo: routes.community,
        ctaLabel: "Open Community Home",
      };
    }

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      return {
        title: "Start the borrower-side support draft from the Money Out handoff.",
        detail:
          "Money Out has already shown that support is needed. Resume the support draft, then return here for fit reading.",
        ctaTo: routes.startSupport,
        ctaLabel: "Open Support Start Page",
      };
    }

    if (!activeBorrowerLoan) {
      return {
        title: "Start the support request first.",
        detail:
          "This becomes useful only after the borrower-side support item exists.",
        ctaTo: routes.startSupport,
        ctaLabel: "Open Support Start Page",
      };
    }

    if (suggestedSupporters.length > 0) {
      return {
        title: "Continue into the deeper support workbench.",
        detail:
          "The fit picture is visible enough. The next move is the deeper workbench.",
        ctaTo: routes.workbench,
        ctaLabel: "Open Loan Workbench",
      };
    }

    return {
      title: "Return to the active support draft and review it.",
      detail:
        "If the fit picture is still weak, review the active support item before moving again.",
      ctaTo: routes.workbench,
      ctaLabel: "Open Loan Workbench",
    };
  }, [
    selectedClanId,
    routes,
    cameFromWithdrawalSupport,
    activeBorrowerLoan,
    suggestedSupporters.length,
  ]);

  const suggestionsSupportActive =
    cameFromWithdrawalSupport || Boolean(activeBorrowerLoan);

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
          sectionLabel="Loan Suggestions"
          title="Loan Suggestions"
          subtitle="Loading the fit-suggestion stage..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.readiness}
          backLabel="Loan Readiness"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "rgba(230,238,248,0.76)", lineHeight: 1.8 }}>
            Loading loan suggestions...
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
        sectionLabel="Loan Suggestions"
        title="Loan Suggestions"
        subtitle="Use this stage to read guarantor fit before you continue deeper into the support flow."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.readiness}
        backLabel="Loan Readiness"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page reads the current support item and shows which people or signals look strongest for the next move."
        why="Finance keeps the money record. Suggestions keeps the fit reading, so you can judge this support path before deeper action."
        next="Fit suggestions are decision support only; they do not approve a guarantor, approve a loan, or authorize release of goods, credit, or money."
        tone="blue"
      />

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
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
                border: "1px solid rgba(212,175,55,0.22)",
                overflow: "hidden",
                background: "linear-gradient(180deg, rgba(8,17,31,0.88) 0%, rgba(16,42,67,0.96) 100%)",
                boxShadow: "0 20px 44px rgba(2,12,27,0.32)",
                display: isCompact ? "none" : "flex",
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
                  <div style={{ marginBottom: 8 }}>
                    {loanSuggestionsIconTile("community", 58)}
                  </div>
                  {communityLabel}
                </div>
              )}
            </div>
          </div>

          <div>
            <div style={sectionLabel()}>Fixed suggestion context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Loan fit suggestions for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Compare fit here, then continue into the deeper workbench
              when the next move is clear.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community ID: {publicCommunityId}</span>
              <span style={badge(false)}>GSN ID: {gmfnId}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Fit suggestions</span>
              {cameFromWithdrawalSupport ? (
                <span style={badge(false)}>Money Out support handoff</span>
              ) : null}
            </div>

            <StableCtaLink
              to={nextRoute.ctaTo}
              debugId="loan-suggestions.front-next"
              stableHeight={isCompact ? 58 : 72}
              fullWidth
              minWidth={isCompact ? undefined : 260}
              style={{
                ...routeTileStyle(true),
                marginTop: 14,
                height: isCompact ? 58 : 72,
                minHeight: isCompact ? 58 : 72,
                maxHeight: isCompact ? 58 : 72,
                justifyContent: "center",
                padding: isCompact ? "10px 12px" : "12px 14px",
              }}
            >
              <div
                style={{
                  ...routeTileTitleStyle(),
                  fontSize: isCompact ? 15 : 16,
                  lineHeight: 1.2,
                }}
              >
                {loanSuggestionsRouteHeading("navigation", nextRoute.ctaLabel)}
              </div>
              {!isCompact ? (
                <div style={{ ...routeTileDetailStyle(), marginTop: 6 }}>
                  {nextRoute.title}
                </div>
              ) : null}
            </StableCtaLink>
          </div>

          <div
            style={{
              ...softCard(fitTone.bg),
              border: fitTone.border,
            }}
          >
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: fitTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {fitReading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF" }}>
              {fitReading.detail}
            </div>

            {activeBorrowerLoan?.id ? (
              <div style={{ marginTop: 12 }}>
                <SecondaryButton
                  onClick={() => handleRefresh()}
                  disabled={refreshing}
                  busy={refreshing}
                  busyLabel="Refreshing..."
                  minWidth={isCompact ? undefined : 168}
                  stableHeight={48}
                  debugId="loan-suggestions.refresh-fit"
                  style={{
                    border: "1px solid rgba(121,149,190,0.20)",
                    background:
                      "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
                    color: refreshing ? "#94A3B8" : "#E6EEF8",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  }}
                >
                  {loanSuggestionsActionText(
                    "refresh",
                    refreshing ? "Refreshing" : "Refresh fit",
                    20
                  )}
                </SecondaryButton>
              </div>
            ) : null}
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
            <div style={sectionLabel()}>Suggestion summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of the current borrower-side support item.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={128}
            stableHeight={48}
            debugId="loan-suggestions.toggle-overview"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(124,154,196,0.18)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {loanSuggestionsActionText(
              collapsed.overview ? "chevronDown" : "chevronUp",
              collapsed.overview ? "Open" : "Collapse",
              20
            )}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(5, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Current draft</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {activeBorrowerLoan ? safeStr(activeBorrowerLoan.title || "Visible") : "None"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {getLoanAmountText(loanSummary || activeBorrowerLoan)}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Required guarantors</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {requiredGuarantors}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Fit suggestions</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {suggestedSupporters.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Approved / sent</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {approvedGuarantors} / {sentGuarantors}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Status</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {safeStr(loanSummary?.status || activeBorrowerLoan?.status || "Awaiting issue")}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Decision at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanSummary?.decisionAt)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Due at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(loanSummary?.dueAt)}
              </div>
            </div>

            {cameFromWithdrawalSupport ? (
              <>
                <div style={statTile("#FFFBEF")}>
                  <div style={sectionLabel()}>Money Out amount</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#92400E",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {withdrawalAmount ? withdrawalAmount : "Not available yet"}
                  </div>
                </div>

                <div style={statTile("#FFFBEF")}>
                  <div style={sectionLabel()}>Support gap</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#92400E",
                      fontSize: 16,
                      fontWeight: 900,
                      lineHeight: 1.25,
                    }}
                  >
                    {safeStr(supportGap || "Not available yet")}
                  </div>
                </div>
              </>
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
            <div style={sectionLabel()}>Suggestion reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read the fit message before deciding the next move.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("reading")}
            minWidth={128}
            stableHeight={48}
            debugId="loan-suggestions.toggle-reading"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(124,154,196,0.18)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {loanSuggestionsActionText(
              collapsed.reading ? "chevronDown" : "chevronUp",
              collapsed.reading ? "Open" : "Collapse",
              20
            )}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this reading does"
          what="This section explains the current fit message and shows whether this is the right moment to move into the deeper workbench."
          why="It helps you interpret the suggestion instead of treating it like a vague status line."
          next="Read the fit message first, then check the supporters list below if you are ready to move toward guarantor selection."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.reading ? (
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
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                What the fit check is saying
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                {safeStr(
                  suggestionMessage ||
                    (activeBorrowerLoan
                      ? "The system has not returned a fuller fit note yet."
                      : "Start or resume the support draft first to see fit suggestions.")
                )}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                What this stage is for
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                Stay with fit reading here until you are ready to continue into the
                deeper workbench.
              </div>
            </div>

            {cameFromWithdrawalSupport ? (
              <div style={innerCard("#FFFBEF")}>
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  Money Out handoff context
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  <div style={helperText()}>
                    Requested withdrawal amount: {withdrawalAmount || "Pending"}
                  </div>
                  <div style={helperText()}>
                    Support gap: {safeStr(supportGap || "Pending")}
                  </div>
                  {withdrawalNote ? (
                    <div style={helperText()}>
                      Note: {withdrawalNote}
                    </div>
                  ) : null}
                </div>
              </div>
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
            <div style={sectionLabel()}>Suggested supporters</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The strongest visible guarantor-fit suggestions for the current support item.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("supporters")}
            minWidth={128}
            stableHeight={48}
            debugId="loan-suggestions.toggle-supporters"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(124,154,196,0.18)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {loanSuggestionsActionText(
              collapsed.supporters ? "chevronDown" : "chevronUp",
              collapsed.supporters ? "Open" : "Collapse",
              20
            )}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="Why these supporters appear"
          what="This section lists the strongest visible supporter matches for the current support item."
          why="It helps you start from the best current fit instead of guessing who to approach first."
          next="Review the reason and suggested pledge for each supporter, then continue into the workbench when you are ready to act."
          tone="light"
          style={{ marginTop: 12 }}
        />

        {!collapsed.supporters ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {suggestedSupporters.length === 0 ? (
              <div style={{ color: "rgba(230,238,248,0.76)", lineHeight: 1.8 }}>
                No fit suggestion is available for this support item right now.
              </div>
            ) : (
              suggestedSupporters.map((item) => (
                <div key={item.key} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact
                        ? "1fr"
                        : "minmax(0, 1.05fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#F8FBFF",
                          fontWeight: 900,
                          fontSize: 16,
                          lineHeight: 1.35,
                        }}
                      >
                        <GsnLegacyIcon name="user" size={24} />
                        {item.name}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        {safeStr(item.reason) ? (
                          <span style={badge(false)}>{safeStr(item.reason)}</span>
                        ) : null}

                        {safeStr(item.recommendedPledge) ? (
                          <span style={badge(true)}>
                            Suggested pledge: {safeStr(item.recommendedPledge)}
                          </span>
                        ) : null}

                        {safeStr(item.trustScore) ? (
                          <span style={badge(false)}>
                            Trust: {safeStr(item.trustScore)}
                            {safeStr(item.trustBand) ? ` / ${safeStr(item.trustBand)}` : ""}
                          </span>
                        ) : null}
                      </div>

                      {safeStr(item.gmfnId) ? (
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          GSN ID: {safeStr(item.gmfnId)}
                        </div>
                      ) : null}
                    </div>

                    <div
                      style={{
                        marginTop: 10,
                        ...helperText(),
                        fontSize: 13,
                      }}
                    >
                      If this fit looks strong enough, use Next routes below to continue into Loan Workbench.
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
            <div style={sectionLabel()}>
              {suggestionsSupportActive ? "Next support routes" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {suggestionsSupportActive
                ? "Stay inside Loans & Support and move only to the next step that matches this support item."
                : "Move into the next page you need."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={128}
            stableHeight={48}
            debugId="loan-suggestions.toggle-routes"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(124,154,196,0.18)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {loanSuggestionsActionText(
              collapsed.routes ? "chevronDown" : "chevronUp",
              collapsed.routes ? "Open" : "Collapse",
              20
            )}
          </SubtleButton>
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
            <StableCtaLink
              to={nextRoute.ctaTo}
              debugId="loan-suggestions.route.next"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(true)}
            >
              <div style={routeTileTitleStyle()}>
                {loanSuggestionsRouteHeading("navigation", nextRoute.ctaLabel)}
              </div>
              <div style={routeTileDetailStyle()}>
                {nextRoute.title}
              </div>
              <div style={routeTileDetailStyle()}>
                {nextRoute.detail}
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.readiness}
              debugId="loan-suggestions.route.readiness"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div style={routeTileTitleStyle()}>
                {loanSuggestionsRouteHeading("check", "Loan Readiness")}
              </div>
              <div style={routeTileDetailStyle()}>
                Open this when the question is whether the next support move is clean enough to continue.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.workbench}
              debugId="loan-suggestions.route.workbench"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div style={routeTileTitleStyle()}>
                {loanSuggestionsRouteHeading("briefcase", "Loan Workbench")}
              </div>
              <div style={routeTileDetailStyle()}>
                Open this for deeper support handling after the fit picture is clear enough.
              </div>
            </StableCtaLink>

            {!suggestionsSupportActive ? (
              <StableCtaLink
                to={routes.loans}
                debugId="loan-suggestions.route.loans"
                stableHeight={104}
                fullWidth
                style={routeTileStyle(false)}
              >
                <div style={routeTileTitleStyle()}>
                  {loanSuggestionsRouteHeading("community", "Loans & Support")}
                </div>
                <div style={routeTileDetailStyle()}>
                  Return to the broader support overview only after the current fit-reading stage is complete.
                </div>
              </StableCtaLink>
            ) : null}

            <StableCtaLink
              to={routes.guarantorInbox}
              debugId="loan-suggestions.route.guarantor-inbox"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div style={routeTileTitleStyle()}>
                {loanSuggestionsRouteHeading("alert", "Incoming Guarantor Requests")}
              </div>
              <div style={routeTileDetailStyle()}>
                Open the dedicated guarantor decision queue when responses are waiting on you.
              </div>
            </StableCtaLink>

            {!suggestionsSupportActive ? (
              <>
                <StableCtaLink
                  to={routes.moneyOut}
                  debugId="loan-suggestions.route.money-out"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div style={routeTileTitleStyle()}>
                    {loanSuggestionsRouteHeading("wallet", "Money Out")}
                  </div>
                  <div style={routeTileDetailStyle()}>
                    Return to the originating withdrawal path only when you need to verify the handoff source.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.notifications}
                  debugId="loan-suggestions.route.notifications"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div style={routeTileTitleStyle()}>
                    {loanSuggestionsRouteHeading("alert", "Action Inbox")}
                  </div>
                  <div style={routeTileDetailStyle()}>
                    Open this when the broader waiting picture matters around support response.
                  </div>
                </StableCtaLink>
              </>
            ) : null}
          </div>
        ) : null}
      </section>

    </div>
  );
}




