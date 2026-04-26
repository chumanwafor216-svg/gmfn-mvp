import React, { useEffect, useMemo, useRef, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import NextActionGuide, {
  type NextActionGuideItem,
} from "../components/NextActionGuide";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { useLocation, useNavigate } from "react-router-dom";
import * as api from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";

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
  focus: boolean;
  borrower: boolean;
  guarantor: boolean;
  routes: boolean;
};

const LOANS_UI_STORAGE_KEY = "gmfn.loans.sections.v1";

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

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function getLoanAmountText(row: LoanRow): string {
  const amount = safeStr(row?.amount);
  const currency = safeStr(row?.currency);

  if (!amount && !currency) return "Amount pending";
  if (amount && currency) return `${amount} ${currency}`;
  return amount || currency || "Amount pending";
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

  return "Not available yet";
}

function getPoolCurrency(payload: any): string {
  return firstTruthy(
    payload?.currency,
    payload?.summary?.currency,
    payload?.totals?.currency,
    "NGN"
  );
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalPageCard(bg);
  return {
    ...base,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FBFF 100%)"
        : bg,
    border: "1px solid rgba(88,116,148,0.18)",
    boxShadow: "0 20px 46px rgba(15,23,42,0.08)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const base = institutionalSoftCard(bg);
  return {
    ...base,
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #F8FBFF 0%, #EDF6FF 100%)"
        : bg,
    border: "1px solid rgba(88,116,148,0.18)",
    boxShadow: "0 16px 36px rgba(15,23,42,0.08)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalInnerCard(bg);
  return {
    ...base,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 100%)"
        : bg,
    border: "1px solid rgba(88,116,148,0.17)",
    boxShadow: "0 14px 28px rgba(15,23,42,0.07)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalStatTile(bg);
  return {
    ...base,
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F4F9FF 100%)"
        : bg,
    border: "1px solid rgba(88,116,148,0.17)",
    boxShadow: "0 12px 24px rgba(15,23,42,0.07)",
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
    transform: "translateZ(0)",
    outlineOffset: 4,
    lineHeight: 1.2,
  };
}

function guardButtonPress(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function buttonGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onTouchStart" | "onMouseDown"
> {
  return {
    onPointerDown: guardButtonPress,
    onTouchStart: guardButtonPress,
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
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(88,116,148,0.18)",
    background: primary
      ? "linear-gradient(180deg, #F5FAFF 0%, #E4F0FF 100%)"
      : "linear-gradient(180deg, #FFFDF9 0%, #F1F7FF 100%)",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary
      ? "0 16px 34px rgba(29,95,212,0.12)"
      : "0 14px 30px rgba(15,23,42,0.07)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#38516B",
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
    background: primary
      ? "linear-gradient(180deg, rgba(29,95,212,0.16) 0%, rgba(29,95,212,0.10) 100%)"
      : "linear-gradient(180deg, rgba(92,114,138,0.16) 0%, rgba(92,114,138,0.10) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.14)"
      : "1px solid rgba(88,116,148,0.14)",
    color: primary ? "#0F56BF" : "#44596F",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 114,
    padding: "9px 13px",
    borderRadius: 12,
    border: "1px solid rgba(88,116,148,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: "#173A60",
    fontWeight: 800,
    fontSize: 13,
    textAlign: "center",
    cursor: "pointer",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    boxShadow: "0 10px 22px rgba(15,23,42,0.08)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F647A",
    fontSize: 14.5,
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
    focus: false,
    borrower: false,
    guarantor: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    focus: Boolean(raw?.focus ?? base.focus),
    borrower: Boolean(raw?.borrower ?? base.borrower),
    guarantor: Boolean(raw?.guarantor ?? base.guarantor),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

export default function LoansPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedClanId = Number((api as any).getSelectedClanId?.() || 0);
  const loansRevealRef = useRef<number | null>(null);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(LOANS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [guarantorInbox, setGuarantorInbox] = useState<GuarantorInboxRow[]>([]);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);

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
      if (typeof window !== "undefined" && loansRevealRef.current !== null) {
        window.cancelAnimationFrame(loansRevealRef.current);
        loansRevealRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    writeLocalJSON(LOANS_UI_STORAGE_KEY, collapsed);
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

        const [meRes, clanRes, poolRes, loansRes, guarantorRes, guidanceRes] =
          await Promise.all([
            mePromise,
            clanPromise,
            poolPromise,
            loansPromise,
            guarantorPromise,
            buildGuidanceSnapshot().catch(() => null),
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
        setGuidance(guidanceRes || null);
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

  const poolAmount = getPoolAmountText(poolInfo);
  const poolCurrency = getPoolCurrency(poolInfo);

  const activeLoans = useMemo(() => loans.filter(isActiveLoan), [loans]);
  const borrowerLoans = useMemo(
    () => activeLoans.filter(isBorrowerLoan),
    [activeLoans]
  );
  const guarantorLoans = useMemo(
    () => activeLoans.filter(isGuarantorLoan),
    [activeLoans]
  );

  const supportFocus = useMemo(() => {
    if (guarantorInbox.length > 0) {
      const first = guarantorInbox[0];
      return {
        title: first.loanId
          ? `A guarantor request is waiting on loan #${first.loanId}`
          : "A guarantor request is waiting",
        detail: first.pledgeAmount
          ? `A borrower is waiting for your decision on a pledge of ${first.pledgeAmount}.`
          : "A borrower is waiting for your decision.",
      };
    }

    if (borrowerLoans.length > 0) {
      const first = borrowerLoans[0];
      return {
        title: "Your borrower-side support activity is still active",
        detail: safeStr(first.title)
          ? `${safeStr(first.title)} is still active with status '${safeStr(
              first.status || "open"
            )}'.`
          : `Your borrower-side support activity is still active with status '${safeStr(
              first.status || "open"
            )}'.`,
      };
    }

    if (guarantorLoans.length > 0) {
      const first = guarantorLoans[0];
        return {
          title: "You have guarantor-side support responsibility",
          detail: safeStr(first.title)
            ? `${safeStr(first.title)} is still active and should be watched closely.`
            : "A guarantor-side support item is still active and should be watched closely.",
        };
      }

    if (
      safeStr(guidance?.nextBestStep?.kind).toLowerCase().includes("loan") ||
      safeStr(guidance?.nextBestStep?.kind).toLowerCase().includes("guarantor")
    ) {
      return {
        title: safeStr(guidance?.nextBestStep?.title),
        detail: safeStr(guidance?.nextBestStep?.detail),
      };
    }

    return {
      title: "Your support activity is currently calm",
      detail:
        "No urgent borrower-side or guarantor-side support pressure is currently shown.",
    };
  }, [guarantorInbox, borrowerLoans, guarantorLoans, guidance]);

  const supportFlowActive =
    guarantorInbox.length > 0 || borrowerLoans.length > 0 || guarantorLoans.length > 0;

  const loansNextActionItems = useMemo<NextActionGuideItem[]>(
    () => [
      {
        id: "support-summary",
        label: "Check support summary",
        detail: `See ${activeLoans.length} active support item${activeLoans.length === 1 ? "" : "s"} and ${guarantorInbox.length} waiting guarantor request${guarantorInbox.length === 1 ? "" : "s"}.`,
        technical: "Loans & Support summary",
        keywords: ["summary", "support", "loan", "borrow", "lend"],
        tone: "primary",
      },
      {
        id: "start-support",
        label: "Start support request",
        detail:
          "Begin or continue the borrower-side request from the selected Marketplace.",
        technical: "Marketplace support path",
        to: "/app/marketplace#marketplace-loans-support",
        keywords: ["borrow", "loan", "request", "support", "start"],
        tone: supportFlowActive ? "secondary" : "primary",
      },
      {
        id: "current-focus",
        label: "Show what needs attention",
        detail: supportFocus.title,
        technical: "Current support focus",
        keywords: ["attention", "waiting", "focus", "urgent", "next"],
        tone: supportFlowActive ? "primary" : "secondary",
      },
      {
        id: "borrower-flow",
        label: "My borrowing side",
        detail: `Open borrower-side support items. Current count: ${borrowerLoans.length}.`,
        technical: "Borrower-side support flow",
        keywords: ["borrower", "borrow", "my loan", "my support"],
        tone: borrowerLoans.length > 0 ? "primary" : "secondary",
      },
      {
        id: "guarantor-queue",
        label: "Guarantee for someone",
        detail: `Open guarantor requests and guarantor-side items. Waiting requests: ${guarantorInbox.length}.`,
        technical: "Guarantor-side queue",
        keywords: ["guarantor", "guarantee", "pledge", "someone waiting"],
        tone: guarantorInbox.length > 0 ? "primary" : "secondary",
      },
      {
        id: "guarantor-inbox",
        label: "Open guarantor inbox",
        detail: "Use this when someone is waiting for your guarantor decision.",
        technical: "Incoming guarantor requests",
        to: "/app/guarantor-inbox",
        keywords: ["inbox", "guarantor inbox", "decision", "approve"],
        tone: guarantorInbox.length > 0 ? "primary" : "secondary",
      },
      {
        id: "readiness",
        label: "Check readiness",
        detail:
          "Check whether the support flow looks ready enough for the next step.",
        technical: "Loan readiness",
        to: "/app/loan-readiness",
        keywords: ["readiness", "ready", "check", "qualify"],
      },
      {
        id: "suggestions",
        label: "Get suggestions",
        detail:
          "Open suggested next steps around the active support or loan flow.",
        technical: "Loan suggestions",
        to: "/app/loan-suggestions",
        keywords: ["suggest", "suggestion", "advice", "next step"],
      },
      {
        id: "workbench",
        label: "Open workbench",
        detail: "Use the deeper workbench for support handling and review.",
        technical: "Loan workbench",
        to: "/app/loan-workbench",
        keywords: ["workbench", "review", "deeper", "handle"],
      },
      {
        id: "money-in",
        label: "Add money",
        detail: "Open payment into the pool when the next step is money in.",
        technical: "Payment pool",
        to: "/app/payment/pool",
        keywords: ["deposit", "pay in", "money in", "add money"],
      },
      {
        id: "money-out",
        label: "Take money out",
        detail: "Open withdrawal instructions when the next step is money out.",
        technical: "Withdrawal instructions",
        to: "/app/withdrawal-instructions",
        keywords: ["withdraw", "cash out", "take money", "money out"],
      },
      {
        id: "earnings",
        label: "Guarantor earnings",
        detail: "Read the reward side of guarantor participation.",
        technical: "Guarantor earnings",
        to: "/app/guarantor-earnings",
        keywords: ["earnings", "reward", "guarantor reward"],
      },
      {
        id: "finance",
        label: "See this in Finance",
        detail: "Open the wider finance record across communities.",
        technical: "Finance record",
        to: "/app/finance",
        keywords: ["finance", "money record", "balance"],
      },
      {
        id: "spotlight",
        label: "Open spotlight guide",
        detail:
          "Go to the guided spotlight family for free spotlight, subscription spotlight, Vault, or shop setup.",
        technical: "Guided spotlight",
        to: "/app/community?guide=spotlight",
        keywords: [
          "spotlight",
          "free spotlight",
          "subscription spotlight",
          "vault",
          "shop setup",
        ],
      },
      {
        id: "marketplace",
        label: "Return to Marketplace",
        detail: "Go back to the selected community Marketplace.",
        technical: "Marketplace",
        to: "/app/marketplace",
        keywords: ["marketplace", "community", "shop"],
      },
      {
        id: "notifications",
        label: "See what is waiting",
        detail: "Open notifications when someone is waiting directly on you.",
        technical: "Notifications",
        to: "/app/notifications",
        keywords: ["notifications", "waiting", "messages", "action inbox"],
      },
    ],
    [
      activeLoans.length,
      borrowerLoans.length,
      guarantorInbox.length,
      supportFlowActive,
      supportFocus.title,
    ]
  );

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function openLoansRoute(to: string) {
    navigateWithOrigin(navigate, to, location);
  }

  function revealLoansSection(targetId: string, attempt = 0) {
    if (typeof document === "undefined" || typeof window === "undefined") return;

    if (loansRevealRef.current !== null) {
      window.cancelAnimationFrame(loansRevealRef.current);
      loansRevealRef.current = null;
    }

    const target = document.getElementById(targetId);
    if (!target) {
      if (attempt >= 6) return;
      loansRevealRef.current = window.requestAnimationFrame(() => {
        revealLoansSection(targetId, attempt + 1);
      });
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function openLoansSection(key: keyof CollapseState, targetId: string) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: false,
    }));
    revealLoansSection(targetId);
  }

  function handleLoansNextAction(item: NextActionGuideItem) {
    switch (item.id) {
      case "support-summary":
        openLoansSection("overview", "loans-support-summary");
        break;
      case "current-focus":
        openLoansSection("focus", "loans-current-focus");
        break;
      case "borrower-flow":
        openLoansSection("borrower", "loans-borrower-flow");
        break;
      case "guarantor-queue":
        openLoansSection("guarantor", "loans-guarantor-queue");
        break;
      default:
        if (item.to) openLoansRoute(item.to);
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
          sectionLabel="Loans & Support"
          title="Loans & Support"
          subtitle="Loading the support page..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Marketplace", to: "/app/marketplace" },
            { label: "Notifications", to: "/app/notifications" },
          ]}
          utilityLinks={[
            { label: "Demand Box", to: "/app/demand-box" },
            { label: "Trust", to: "/app/trust" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading loans and support...
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
        sectionLabel="Loans & Support"
        title="Loans & Support"
        subtitle="The live one-community workspace for borrower-side steps, guarantor requests, repayment movement, and the support routes around them."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={
          supportFlowActive
            ? [{ label: "Loan Readiness", to: "/app/loan-readiness" }]
            : [
                { label: "Marketplace", to: "/app/marketplace" },
                { label: "Notifications", to: "/app/notifications" },
              ]
        }
        utilityLinks={
          supportFlowActive
            ? [
                { label: "Guarantor Inbox", to: "/app/guarantor-inbox" },
                {
                  label: "Commitment Builder",
                  to: "/app/dashboard#focus-commitments",
                },
              ]
            : [
                { label: "Demand Box", to: "/app/demand-box" },
                { label: "Trust", to: "/app/trust" },
                {
                  label: "Commitment Builder",
                  to: "/app/dashboard#focus-commitments",
                },
              ]
        }
      />

      <ExplainToggle
        label="What this screen does"
        what="This page runs the live Loans & Support workflow for this community: borrower-side steps, guarantor requests, repayment movement, and the next support route."
        why="Finance keeps the wider money history across communities. Loans keeps the active support work for this one community so the story stays clear."
        next="Start with the support summary here, then move into readiness, suggestions, workbench, or repayment depending on the pressure you need to handle now."
        tone="blue"
      />

      <NextActionGuide
        storageKey="gmfn.loans.nextActionGuide.v1"
        compact={isCompact}
        items={loansNextActionItems}
        onSelect={handleLoansNextAction}
        intro="Say what you want in normal words, like borrow, guarantee, pay in, withdraw, readiness, suggestion, or waiting request. GSN will point you to the closest support path."
      />

      <section
        id="loans-support-overview"
        style={pageCard("linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Support overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Loans and support for {memberName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              This keeps the support flow calmer. Use it for borrower-side progress, guarantor-side responsibility, payment, withdrawal, or support readiness.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Community: {communityLabel}</span>
              <span style={badge(false)}>
                Active support items: {activeLoans.length}
              </span>
              <span style={badge(false)}>
                Pending guarantor requests: {guarantorInbox.length}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Pool position</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 24,
                lineHeight: 1.2,
              }}
            >
              {poolAmount} {poolCurrency}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              This shows the pool amount currently visible to you in this community.
            </div>
          </div>
        </div>
      </section>

      <section id="loans-support-summary" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Support summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of borrower-side and guarantor-side load.
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => toggleSection("overview")}
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </button>
        </div>

        <ExplainToggle
          label="What this summary shows"
          what="This section gives a quick reading of borrower-side load, guarantor-side load, and the wider support pressure around you."
          why="It helps you decide whether to continue deeper into support, check a waiting guarantor request, or move into a money route."
          next="Read the counts first, then open the borrower or guarantor sections below if one side needs attention."
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
              <div style={sectionLabel()}>Active loans</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {activeLoans.length}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Borrower side</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {borrowerLoans.length}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Guarantor side</div>
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
              <div style={sectionLabel()}>Pending requests</div>
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
              <div style={sectionLabel()}>Pool</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 18,
                  fontWeight: 900,
                  lineHeight: 1.25,
                }}
              >
                {poolAmount} {poolCurrency}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="loans-current-focus" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Current support focus</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the most important support action near the top.
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
            onClick={() => toggleSection("focus")}
            style={collapseToggle()}
          >
            {collapsed.focus ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.focus ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: isCompact ? 22 : 28,
                  lineHeight: 1.15,
                }}
              >
                {supportFocus.title}
              </div>

              <div style={{ marginTop: 12, ...helperText() }}>
                {supportFocus.detail}
              </div>

              <div
                style={{
                  marginTop: 16,
                  ...helperText(),
                }}
              >
                Use Next routes below when you are ready to move from this support picture into the next support page.
              </div>
            </div>

            <div style={softCard("#F8FBFF")}>
              <div style={sectionLabel()}>How to read this page</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={helperText()}>
                  Borrower-side load means your own support request flow is active.
                </div>
                <div style={helperText()}>
                  Guarantor-side load means you are attached to someone else's support flow.
                </div>
                <div style={helperText()}>
                  Pending guarantor requests mean someone is waiting for your decision now.
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="loans-borrower-flow" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Borrower-side support flow</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              These are your active borrower-side support items.
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
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
                No borrower-side support flow is active right now.
              </div>
            ) : (
              borrowerLoans.map((row, index) => (
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
                        {safeStr(row.title || "Support item")}
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
                          Status: {safeStr(row.status || "Open")}
                        </span>
                        <span style={badge(false)}>
                          Role: {safeStr(row.role || "Borrower")}
                        </span>
                      </div>
                    </div>

                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {[
                        row.borrowerName ? `Borrower: ${row.borrowerName}` : "",
                        row.createdAt ? `Started: ${safeDateTime(row.createdAt)}` : "",
                      ]
                        .filter(Boolean)
                        .join(" | ") || "This borrower-side support item is still active."}
                    </div>

                    <div style={{ ...helperText(), fontSize: 13 }}>
                      Use Next routes below when you need to continue this borrower-side support item.
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </section>

      <section id="loans-guarantor-queue" style={pageCard("#FFFFFF")}>
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
            <div style={sectionLabel()}>Guarantor-side queue</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              These are the places where other people are waiting on you.
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
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
            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Pending guarantor requests
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {guarantorInbox.length === 0 ? (
                  <div style={helperText()}>
                    No pending guarantor request is currently shown.
                  </div>
                ) : (
                  guarantorInbox.map((row, index) => (
                    <div key={`${row.id}-${index}`} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
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
                          .join(" | ") || "A borrower is waiting for your decision."}
                      </div>
                    </div>
                  ))
                )}
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
                Active guarantor-side support items
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {guarantorLoans.length === 0 ? (
                  <div style={helperText()}>
                    No active guarantor-side support item is currently shown.
                  </div>
                ) : (
                  guarantorLoans.slice(0, 6).map((row, index) => (
                    <div key={`${row.id || index}`} style={innerCard("#FFFFFF")}>
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
                          `Status: ${safeStr(row.status || "Open")}`,
                          row.borrowerName ? `Borrower: ${row.borrowerName}` : "",
                          row.createdAt ? `Started: ${safeDateTime(row.createdAt)}` : "",
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section id="loans-next-routes" style={pageCard("#FFFFFF")}>
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
              {supportFlowActive ? "Next support routes" : "Next routes"}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              {supportFlowActive
                ? "Stay inside Loans & Support and move only to the next support step."
                : "Move from this overview into the next page you need."}
            </div>
          </div>

          <button
            type="button"
            {...buttonGuardProps()}
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
            <OriginLink to="/app/marketplace#marketplace-loans-support" style={routeTile(true)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Start Support Request
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Begin or continue the borrower-side support flow.
              </div>
            </OriginLink>

            {!supportFlowActive ? (
              <>
                <OriginLink to="/app/payment/pool" style={routeTile(false)}>
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
                    Open this when the next step is payment into the pool.
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
                    Open this when the next step is withdrawal handling.
                  </div>
                </OriginLink>
              </>
            ) : null}

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
                Read whether the current support flow looks ready.
              </div>
            </OriginLink>

            <OriginLink to="/app/dashboard#focus-commitments" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Commitment Builder
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when savings discipline, repayment follow-through, or a
                business target needs a steadier visible plan.
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
                Open this when you need the next suggestions around the support flow.
              </div>
            </OriginLink>

            <OriginLink to="/app/loan-workbench" style={routeTile(false)}>
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
                Open this for deeper support handling and workbench-style activity.
              </div>
            </OriginLink>

            <OriginLink to="/app/guarantor-earnings" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Guarantor Earnings
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Read the guarantor-side reward side separately.
              </div>
            </OriginLink>

            <OriginLink to="/app/guarantor-inbox" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 17,
                  lineHeight: 1.3,
                }}
              >
                Incoming Guarantor Requests
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open the dedicated guarantor decision queue.
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
                Open this when someone is waiting directly on your response.
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
                Return to your community page.
              </div>
            </OriginLink>
          </div>
        ) : null}
      </section>

    </div>
  );
}
