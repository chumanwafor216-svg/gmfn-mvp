import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink, SubtleButton } from "../components/StableButton";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";

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

type GuarantorInboxRow = {
  id: string;
  loanId?: number;
  borrowerName?: string | null;
  pledgeAmount?: string | null;
  status?: string | null;
  createdAt?: string | null;
};

type CollapseState = {
  overview: boolean;
  reading: boolean;
  blockers: boolean;
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

const LOAN_READINESS_UI_STORAGE_KEY = "gmfn.loanReadiness.sections.v3";
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
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function getPoolAmountText(payload: any): string {
  const candidates = [
    payload?.available_balance,
    payload?.balance,
    payload?.pool_balance,
    payload?.summary?.available_balance,
    payload?.summary?.balance,
    payload?.totals?.available_balance,
    payload?.totals?.balance,
    payload?.wallet_balance,
  ];

  for (const candidate of candidates) {
    const text = safeStr(candidate);
    if (text) return text;
  }

  return "—";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function numberFromLooseText(value: any): number {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
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
    blockers: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    reading: Boolean(raw?.reading ?? base.reading),
    blockers: Boolean(raw?.blockers ?? base.blockers),
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

function normalizeGuarantorInboxRow(raw: any, index: number): GuarantorInboxRow {
  return {
    id: firstTruthy(raw?.id, raw?.loan_id, `guarantor-${index}`),
    loanId: positiveNumber(raw?.loan_id) || undefined,
    borrowerName: firstTruthy(
      raw?.borrower_name,
      raw?.member_name,
      raw?.requester_name
    ),
    pledgeAmount: firstTruthy(
      raw?.pledge_amount,
      raw?.suggested_amount,
      raw?.amount
    ),
    status: firstTruthy(raw?.status, "pending"),
    createdAt: firstTruthy(raw?.created_at, raw?.requested_at),
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

function getLoanAmountText(row: LoanRow | null): string {
  const amount = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!amount && !currency) return "Amount pending";
  if (amount && currency) return `${amount} ${currency}`;
  return amount || currency || "Amount pending";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalPageCard(bg);
  return {
    ...base,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(8,17,31,0.98) 0%, rgba(11,31,51,0.97) 56%, rgba(23,54,84,0.95) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.20)",
    boxShadow: "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const base = institutionalSoftCard(bg);
  return {
    ...base,
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, rgba(13,28,45,0.96) 0%, rgba(18,40,64,0.94) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.20)",
    boxShadow: "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalInnerCard(bg);
  return {
    ...base,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)"
        : bg,
    border: "1px solid rgba(123,161,204,0.14)",
    boxShadow: "0 14px 28px rgba(2,6,23,0.16), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalStatTile(bg);
  return {
    ...base,
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
    minHeight: 104,
    minWidth: 0,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(88,116,148,0.18)",
    background: primary
      ? "linear-gradient(180deg, #184A96 0%, #133A74 100%)"
      : "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
    padding: 16,
    textDecoration: "none",
    textAlign: "left",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    contain: "layout paint",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 34px rgba(19,79,191,0.24), inset 0 1px 0 rgba(255,255,255,0.10)"
      : "0 14px 30px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.06)",
  };
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

function readWithdrawalTask(clanId: number, gmfnId: string): PersistedWithdrawalTask | null {
  if (!clanId || !gmfnId) return null;

  for (const prefix of WITHDRAWAL_TASK_STORAGE_KEY_PREFIXES) {
    const key = `${prefix}.${gmfnId || "me"}.${clanId || 0}`;
    const value = readLocalJSON<PersistedWithdrawalTask | null>(key, null);
    if (value) return value;
  }

  return null;
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

export default function LoanReadinessPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId =
    routeClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "loan-readiness.nav.dashboard"),
      community: routeTarget(
        "communityHome",
        selectedClanId,
        "loan-readiness.route.community"
      ),
      moneyOut: routeTarget("moneyOut", selectedClanId, "loan-readiness.nav.money-out"),
      startSupport: routeTarget(
        "marketplace",
        selectedClanId,
        "loan-readiness.route.recommended",
        "marketplace-loans-support"
      ),
      suggestions: routeTarget(
        "loanSuggestions",
        selectedClanId,
        "loan-readiness.route.suggestions"
      ),
      workbench: routeTarget(
        "loanWorkbench",
        selectedClanId,
        "loan-readiness.route.workbench"
      ),
      commitments: routeTarget(
        "dashboard",
        selectedClanId,
        "loan-readiness.route.commitments",
        "focus-commitments"
      ),
      guarantorInbox: routeTarget(
        "guarantorInbox",
        selectedClanId,
        "loan-readiness.route.guarantor-inbox"
      ),
      loans: routeTarget("loans", selectedClanId, "loan-readiness.route.loans"),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "loan-readiness.route.notifications"
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
      readLocalJSON(LOAN_READINESS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [guarantorInbox, setGuarantorInbox] = useState<GuarantorInboxRow[]>([]);

  useEffect(() => {
    if (routeClanId > 0) {
      (api as any).setSelectedClanId?.(routeClanId);
    }
  }, [routeClanId]);

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
    writeLocalJSON(LOAN_READINESS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

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

        const poolPromise =
          typeof (api as any).getPoolMe === "function"
            ? (api as any).getPoolMe("NGN", 20).catch(() => null)
            : Promise.resolve(null);

        const loansPromise =
          typeof (api as any).listMyLoans === "function"
            ? (api as any).listMyLoans().catch(() => [])
            : Promise.resolve([]);

        const guarantorPromise =
          typeof (api as any).getLoanGuarantorInbox === "function"
            ? (api as any)
                .getLoanGuarantorInbox({
                  clan_id: selectedClanId || undefined,
                  status: "pending",
                  limit: 25,
                })
                .catch(() => ({ items: [] }))
            : Promise.resolve({ items: [] });

        const [meRes, clanRes, poolRes, loansRes, guarantorRes] =
          await Promise.all([
            mePromise,
            clanPromise,
            poolPromise,
            loansPromise,
            guarantorPromise,
          ]);

        if (!alive) return;

        const normalizedLoans = rowsOf<any>(loansRes)
          .map((row) => normalizeLoanRow(row))
          .filter(Boolean) as LoanRow[];

        const filteredLoans = normalizedLoans.filter((row) => {
          const rowClanId = Number(row?.clanId || 0);
          return rowClanId <= 0 || rowClanId === selectedClanId;
        });

        const normalizedGuarantorRows = rowsOf<any>(guarantorRes).map((row, index) =>
          normalizeGuarantorInboxRow(row, index)
        );

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setPoolInfo(poolRes);
        setLoans(filteredLoans);
        setGuarantorInbox(normalizedGuarantorRows);
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
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
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

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);
  const poolNumber = numberFromLooseText(poolAmount);

  const activeLoans = useMemo(() => loans.filter(isActiveLoan), [loans]);
  const borrowerLoans = useMemo(
    () => activeLoans.filter(isBorrowerLoan),
    [activeLoans]
  );
  const guarantorLoans = useMemo(
    () => activeLoans.filter(isGuarantorLoan),
    [activeLoans]
  );

  const activeBorrowerLoan = useMemo(() => {
    const rows = [...borrowerLoans];
    rows.sort((a, b) => {
      const aTime = new Date(a.createdAt || 0).getTime();
      const bTime = new Date(b.createdAt || 0).getTime();
      return bTime - aTime;
    });
    return rows[0] || null;
  }, [borrowerLoans]);

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

  const readiness = useMemo(() => {
    const pendingGuarantor = guarantorInbox.length;
    const borrowerCount = borrowerLoans.length;
    const guarantorCount = guarantorLoans.length;

    if (!selectedClanId || !safeStr(me?.gmfn_id)) {
      return {
        level: "blocked" as const,
        title: "Community or member identity is not ready.",
        detail:
          "The support route should not continue without your current community and visible member identity.",
      };
    }

    if (cameFromWithdrawalSupport && borrowerCount === 0) {
      return {
        level: "watch" as const,
        title: "Money Out has handed off into support continuation.",
        detail:
          "The withdrawal route has already determined that support is needed. The next clean move is to start or continue the borrower-side support draft now.",
      };
    }

    if (borrowerCount > 0 && pendingGuarantor > 0) {
      return {
        level: "blocked" as const,
        title:
          "Readiness is blocked by active borrower load and waiting guarantor decisions.",
        detail:
          "Your borrower-side support activity is already active, and guarantor decisions are still waiting. Clear one pressure area before starting another.",
      };
    }

    if (borrowerCount > 0) {
      return {
        level: "watch" as const,
        title:
          "Readiness is reduced because your borrower-side support activity is still active.",
        detail:
          "Finish or stabilize the current borrower-side path before starting another support movement.",
      };
    }

    if (pendingGuarantor > 0) {
      return {
        level: "watch" as const,
        title:
          "Readiness is reduced because guarantor requests are waiting on you.",
        detail:
          "Someone is waiting directly on your support decision. Respond there first before carrying new support pressure.",
      };
    }

    if (guarantorCount > 0) {
      return {
        level: "watch" as const,
        title:
          "Readiness is moderate because you still carry guarantor-side responsibility.",
        detail:
          "You may still be operationally capable, but existing guarantor-side exposure should be watched before expanding further.",
      };
    }

    return {
      level: "ready" as const,
      title: "Readiness looks clean enough to continue the next support step.",
      detail:
        "No active borrower-side path or waiting guarantor request is visibly blocking the next support movement right now.",
    };
  }, [
    selectedClanId,
    me,
    cameFromWithdrawalSupport,
    borrowerLoans.length,
    guarantorInbox.length,
    guarantorLoans.length,
  ]);

  const blockers = useMemo(() => {
    const rows: string[] = [];

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      rows.push(
        "Money Out has already identified a support-backed withdrawal need, but no borrower-side support draft is visible yet."
      );
    }

    if (borrowerLoans.length > 0) {
      rows.push(
        `You still have ${borrowerLoans.length} active borrower-side support item${
          borrowerLoans.length === 1 ? "" : "s"
        }.`
      );
    }

    if (guarantorInbox.length > 0) {
      rows.push(
        `${guarantorInbox.length} guarantor request${
          guarantorInbox.length === 1 ? " is" : "s are"
        } waiting on your decision.`
      );
    }

    if (guarantorLoans.length > 0) {
      rows.push(
        `You still carry ${guarantorLoans.length} guarantor-side active support item${
          guarantorLoans.length === 1 ? "" : "s"
        }.`
      );
    }

    if (poolNumber <= 0) {
      rows.push("Visible pool balance is light or not readable right now.");
    }

    return rows;
  }, [
    cameFromWithdrawalSupport,
    activeBorrowerLoan,
    borrowerLoans.length,
    guarantorInbox.length,
    guarantorLoans.length,
    poolNumber,
  ]);

  const readinessHelps = useMemo(() => {
    const rows: string[] = [];

    if (!cameFromWithdrawalSupport) {
      rows.push("This can read readiness before the next support move becomes heavier.");
    }

    if (borrowerLoans.length === 0) {
      rows.push("No active borrower-side support flow is visibly blocking you right now.");
    }

    if (guarantorInbox.length === 0) {
      rows.push("No pending guarantor request is visibly waiting on you.");
    }

    if (guarantorLoans.length === 0) {
      rows.push("No active guarantor-side support burden is currently shown.");
    }

    if (poolNumber > 0) {
      rows.push(`Visible pool position is ${poolAmount} ${poolCurrency}.`);
    }

    if (rows.length === 0) {
      rows.push("Use the current support summary to decide the next clean move.");
    }

    return rows;
  }, [
    cameFromWithdrawalSupport,
    borrowerLoans.length,
    guarantorInbox.length,
    guarantorLoans.length,
    poolNumber,
    poolAmount,
    poolCurrency,
  ]);

  const recommendedNext = useMemo(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community first.",
        detail:
          "Support readiness is clearer once your current community is in place.",
        ctaTo: routes.community,
        ctaLabel: "Open Community Home",
      };
    }

    if (cameFromWithdrawalSupport && !activeBorrowerLoan) {
      return {
        title: "Start or continue the borrower-side support draft.",
        detail:
          "Money Out has already handed off into support continuation. Open the support start page and carry the withdrawal need forward.",
        ctaTo: routes.startSupport,
        ctaLabel: "Open Support Start Page",
      };
    }

    if (guarantorInbox.length > 0) {
      return {
        title: "Respond to waiting guarantor requests first.",
        detail:
          "Someone is waiting directly on your support decision. Clear that queue before creating new support pressure.",
        ctaTo: routes.guarantorInbox,
        ctaLabel: "Open Incoming Guarantor Requests",
      };
    }

    if (activeBorrowerLoan) {
      return {
        title: "Continue into fit suggestions for the current borrower-side support item.",
        detail:
          "The borrower-side support item is already visible, so the next clean step is usually fit reading.",
        ctaTo: routes.suggestions,
        ctaLabel: "Open Loan Suggestions",
      };
    }

    if (guarantorLoans.length > 0) {
      return {
        title: "Review your guarantor-side commitments before expanding further.",
        detail:
          "Existing guarantor-side responsibility should remain visible before another support load is added.",
        ctaTo: routes.loans,
        ctaLabel: "Open Loans & Support",
      };
    }

    return {
      title: "You can begin the next support movement when ready.",
      detail:
        "No visible pressure is blocking the next step right now.",
      ctaTo: routes.startSupport,
      ctaLabel: "Open Support Start Page",
    };
  }, [
    selectedClanId,
    routes,
    cameFromWithdrawalSupport,
    activeBorrowerLoan,
    guarantorInbox.length,
    guarantorLoans.length,
  ]);

  const readinessTone =
    readiness.level === "blocked"
      ? {
          bg: "#FFF5F5",
          border: "1px solid rgba(239,68,68,0.16)",
          text: "#991B1B",
        }
      : readiness.level === "watch"
      ? {
          bg: "#FFFBEF",
          border: "1px solid rgba(245,158,11,0.16)",
          text: "#92400E",
        }
      : {
          bg: "#F3FBF5",
        border: "1px solid rgba(34,197,94,0.16)",
        text: "#166534",
      };

  const readinessSupportActive =
    cameFromWithdrawalSupport || Boolean(activeBorrowerLoan) || guarantorInbox.length > 0;

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
          sectionLabel="Loan Readiness"
          title="Support Readiness"
          subtitle="Loading the support-readiness page..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.moneyOut}
          backLabel="Money Out"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "rgba(230,238,248,0.76)", lineHeight: 1.8 }}>
            Loading readiness view...
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
        sectionLabel="Loan Readiness"
        title="Support Readiness"
        subtitle="Use this stage to see whether the next support move is clean enough to continue, especially after Money Out has already determined that support is needed."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.moneyOut}
        backLabel="Money Out"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page is one step inside Loans & Support. It tests whether the current community support item is calm enough to move forward right now."
        why="Finance records the wider money story. Readiness decides whether this one support path should continue, pause, or clear another pressure first."
        next="Read the main readiness message first, then use the summary and blockers below to decide whether to continue into suggestions or workbench."
        tone="blue"
      />

      <section
        style={pageCard("linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)")}
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
                background: "linear-gradient(180deg, rgba(16,36,58,0.88) 0%, rgba(38,82,124,0.96) 100%)",
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
            <div style={sectionLabel()}>Fixed readiness context</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Support readiness for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Use this stage to see whether the next support move is clean enough
              to continue now, or whether an earlier pressure should be settled first.
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
              <span style={badge(false)}>GMFN ID: {gmfnId}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>Readiness stage</span>
              {cameFromWithdrawalSupport ? (
                <span style={badge(false)}>Money Out support handoff</span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              ...softCard(readinessTone.bg),
              border: readinessTone.border,
            }}
          >
            <div style={sectionLabel()}>Current reading</div>

            <ExplainToggle
              label="What this reading means"
              what="This is the main readiness reading for the current moment. It names the support condition that matters most right now."
              why="It reduces the page to one clear decision before you read the supporting detail."
              next="Read the title first, then use the summary and readiness reading sections below to understand what is helping or blocking progress."
              tone="light"
              style={{ marginTop: 12 }}
            />

            <div
              style={{
                marginTop: 10,
                color: readinessTone.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {readiness.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#F8FBFF" }}>
              {readiness.detail}
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
            <div style={sectionLabel()}>Readiness summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of the visible readiness pressures.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={124}
            stableHeight={48}
            debugId="loan-readiness.toggle-overview"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(121,149,190,0.20)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
            }}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this summary shows"
          what="This section gathers the visible readiness pressures into one compact view: borrower load, guarantor load, waiting decisions, pool position, and handoff context."
          why="It gives you one place to judge whether the support flow feels calm enough to continue."
          next="Scan the strongest pressure first, then open the readiness reading below if you need the deeper explanation."
          tone="light"
          style={{ marginTop: 12 }}
        />

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
              <div style={sectionLabel()}>Borrower load</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {borrowerLoans.length}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Guarantor load</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#1D4ED8",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {guarantorLoans.length}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Waiting decisions</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {guarantorInbox.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Active loans</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {activeLoans.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Pool position</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {poolAmount} {poolCurrency}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Current borrower draft</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {activeBorrowerLoan ? safeStr(activeBorrowerLoan.title || "Visible") : "Not visible"}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Money Out request</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {cameFromWithdrawalSupport
                  ? withdrawalAmount
                    ? `${withdrawalAmount} ${poolCurrency}`
                    : "Visible"
                  : "No handoff"}
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
                {cameFromWithdrawalSupport ? safeStr(supportGap || "Awaiting issue") : "Not available yet"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Current draft amount</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {getLoanAmountText(activeBorrowerLoan)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Draft created</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#F8FBFF",
                  fontSize: 14,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {safeDateTime(activeBorrowerLoan?.createdAt) || "Not available yet"}
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
            <div style={sectionLabel()}>Readiness reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What currently helps readiness, and what reduces it.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("reading")}
            minWidth={124}
            stableHeight={48}
            debugId="loan-readiness.toggle-reading"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(121,149,190,0.20)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
            }}
          >
            {collapsed.reading ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="How to use this reading"
          what="This section separates what is helping readiness from what is reducing it."
          why="It turns the readiness result into something actionable instead of leaving you with a single pass-or-fail feeling."
          next="Use the blockers list to decide what to clear first, then move on only when the page reads as ready enough to continue."
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
                What helps readiness
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {readinessHelps.map((item, index) => (
                  <div key={`help-${index}`} style={helperText()}>
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                What reduces readiness
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {blockers.length === 0 ? (
                  <div style={helperText()}>
                    No strong visible blocker is active right now.
                  </div>
                ) : (
                  blockers.map((item, index) => (
                    <div key={`block-${index}`} style={helperText()}>
                      {item}
                    </div>
                  ))
                )}
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
                    Requested withdrawal amount: {withdrawalAmount || "Awaiting issue"} {poolCurrency}
                  </div>
                  <div style={helperText()}>
                    Support gap: {safeStr(supportGap || "Awaiting issue")}
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
            <div style={sectionLabel()}>Main blockers</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The concrete items that should usually be cleared first.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("blockers")}
            minWidth={124}
            stableHeight={48}
            debugId="loan-readiness.toggle-blockers"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(121,149,190,0.20)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
            }}
          >
            {collapsed.blockers ? "Open" : "Collapse"}
          </SubtleButton>
        </div>

        {!collapsed.blockers ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Waiting guarantor decisions
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {guarantorInbox.length === 0 ? (
                  <div style={helperText()}>
                    No guarantor decision is visibly waiting on you right now.
                  </div>
                ) : (
                  guarantorInbox.map((row, index) => (
                    <div key={`${row.id}-${index}`} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#F8FBFF",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.loanId
                          ? `Guarantor request on loan #${row.loanId}`
                          : "Guarantor request"}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {[
                          row.borrowerName ? `Borrower: ${row.borrowerName}` : "",
                          row.pledgeAmount ? `Pledge: ${row.pledgeAmount}` : "",
                          row.createdAt ? `Created: ${safeDateTime(row.createdAt)}` : "",
                        ]
                          .filter(Boolean)
                          .join(" • ") || "A borrower is waiting on your decision."}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Active borrower-side items
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {borrowerLoans.length === 0 ? (
                  <div style={helperText()}>
                    No borrower-side active item is reducing readiness right now.
                  </div>
                ) : (
                  borrowerLoans.slice(0, 6).map((row, index) => (
                    <div key={`${row.id || index}`} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#F8FBFF",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {safeStr(row.title || "Support item")}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {[
                          `Status: ${safeStr(row.status || "Open")}`,
                          getLoanAmountText(row),
                          row.createdAt ? `Started: ${safeDateTime(row.createdAt)}` : "",
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </div>
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
            <div style={sectionLabel()}>
              {readinessSupportActive ? "Next support routes" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {readinessSupportActive
                ? "Stay inside Loans & Support and move only to the next step that matches this support item."
                : "Move from readiness reading into the next page you need."}
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={124}
            stableHeight={48}
            debugId="loan-readiness.toggle-routes"
            style={{
              borderRadius: 12,
              border: "1px solid rgba(121,149,190,0.20)",
              background:
                "linear-gradient(180deg, rgba(15,33,54,0.94) 0%, rgba(21,45,71,0.92) 100%)",
              color: "#E6EEF8",
              fontWeight: 800,
            }}
          >
            {collapsed.routes ? "Open" : "Collapse"}
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
              to={recommendedNext.ctaTo}
              debugId="loan-readiness.route.recommended"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(true)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                {recommendedNext.ctaLabel}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {recommendedNext.title}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                {recommendedNext.detail}
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.suggestions}
              debugId="loan-readiness.route.suggestions"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Suggestions
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the next question is candidate fit after readiness is clear.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.workbench}
              debugId="loan-readiness.route.workbench"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Loan Workbench
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this for deeper support handling once readiness is clear.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.commitments}
              debugId="loan-readiness.route.focus-commitments"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Open Focus Commitments
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open the Dashboard focus section when readiness depends on steadier
                repayment follow-through, savings discipline, or a clearer action plan.
              </div>
            </StableCtaLink>

            {(!readinessSupportActive || !activeBorrowerLoan) ? (
              <StableCtaLink
                to={routes.startSupport}
                debugId="loan-readiness.route.support-start"
                stableHeight={104}
                fullWidth
                style={routeTileStyle(false)}
              >
                <div
                  style={{
                    color: "#F8FBFF",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Support Start Page
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Return here when the draft itself must be started or resumed.
                </div>
              </StableCtaLink>
            ) : null}

            <StableCtaLink
              to={routes.guarantorInbox}
              debugId="loan-readiness.route.guarantor-inbox"
              stableHeight={104}
              fullWidth
              style={routeTileStyle(false)}
            >
              <div
                style={{
                  color: "#F8FBFF",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Incoming Guarantor Requests
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open the queue if someone is waiting directly on your decision.
              </div>
            </StableCtaLink>

            {!readinessSupportActive ? (
              <>
                <StableCtaLink
                  to={routes.moneyOut}
                  debugId="loan-readiness.route.money-out"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Money Out
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                    Return to the originating withdrawal path only when you need to verify the handoff source.
                  </div>
                </StableCtaLink>

                <StableCtaLink
                  to={routes.notifications}
                  debugId="loan-readiness.route.notifications"
                  stableHeight={104}
                  fullWidth
                  style={routeTileStyle(false)}
                >
                  <div
                    style={{
                      color: "#F8FBFF",
                      fontWeight: 900,
                      fontSize: 17,
                      lineHeight: 1.3,
                    }}
                  >
                    Action Inbox
                  </div>
                  <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
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





