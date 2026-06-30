import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import GsnSupportContact from "../components/GsnSupportContact";
import PageTopNav from "../components/PageTopNav";
import {
  StableCtaLink,
  StableDisclosureSummary,
  SubtleButton,
} from "../components/StableButton";
import {
  GsnLegacyIcon,
  type GsnIconName,
} from "../components/GsnLegacyIcon";
import * as api from "../lib/api";
import { communityIdFromSearch } from "../lib/communityRouteContext";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
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
import { brandClampLines, brandSingleLine } from "../styles/gmfnBrand";

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

type PersistedWithdrawalTask = {
  amountInput: string;
  noteInput: string;
  latestWithdrawalResult: any | null;
  handoffMode?: string;
  supportGap?: string;
  updatedAt?: string | null;
};

type CollapseState = {
  overview: boolean;
  focus: boolean;
  borrower: boolean;
  guarantor: boolean;
  routes: boolean;
};

const LOANS_UI_STORAGE_KEY = "gmfn.loans.sections.v2";
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
      src?.is_guarantor ? "Supporter" : "",
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
  const isCustomSurface = safeStr(bg).includes("gradient(");
  return {
    ...base,
    background: isCustomSurface ? bg : base.background,
    border: isCustomSurface
      ? "1px solid rgba(242,207,119,0.26)"
      : "1px solid rgba(216,227,238,0.92)",
    boxShadow: isCustomSurface
      ? "0 22px 48px rgba(2,6,23,0.22), 0 6px 14px rgba(15,23,42,0.05)"
      : "0 18px 40px rgba(7,20,36,0.09), inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  const base = institutionalSoftCard(bg);
  return {
    ...base,
    border: "1px solid rgba(216,227,238,0.92)",
    boxShadow:
      "0 14px 30px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalInnerCard(bg);
  return {
    ...base,
    border: "1px solid rgba(216,227,238,0.88)",
    boxShadow:
      "0 12px 26px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  const base = institutionalStatTile(bg);
  return {
    ...base,
    border: "1px solid rgba(216,227,238,0.88)",
    boxShadow:
      "0 12px 26px rgba(7,20,36,0.07), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function routeTileStyle(primary = false, compact = false): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: compact ? "36px minmax(0, 1fr)" : "44px minmax(0, 1fr)",
    alignItems: "center",
    gap: compact ? 8 : 10,
    height: compact ? 66 : 88,
    minHeight: compact ? 66 : 88,
    maxHeight: compact ? 66 : 88,
    minWidth: 0,
    borderRadius: compact ? 16 : 20,
    border: primary
      ? "1px solid rgba(31,115,224,0.28)"
      : "1px solid rgba(216,227,238,0.94)",
    background: primary
      ? "linear-gradient(180deg, #eff6ff 0%, #dcecff 100%)"
      : "linear-gradient(180deg, #ffffff 0%, #f7fbff 100%)",
    padding: compact ? "9px 10px" : 12,
    textDecoration: "none",
    textAlign: "left",
    justifyContent: "stretch",
    width: "100%",
    maxWidth: "100%",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    overflowWrap: "normal",
    wordBreak: "normal",
    overflow: "hidden",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 34px rgba(19,95,209,0.14), inset 0 1px 0 rgba(255,255,255,0.90)"
      : "0 12px 28px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.90)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#456078",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function responsiveGridColumns(minWidth: number): string {
  return `repeat(auto-fit, minmax(min(100%, ${minWidth}px), 1fr))`;
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 32,
    borderRadius: 999,
    padding: "7px 12px",
    background: primary ? "rgba(234,243,255,0.96)" : "rgba(244,248,255,0.94)",
    border: primary
      ? "1px solid rgba(31,115,224,0.24)"
      : "1px solid rgba(184,201,220,0.92)",
    color: primary ? "#0B4EB3" : "#0E3A63",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#46566D",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function routeIconCircle(primary = false, compact = false): React.CSSProperties {
  return {
    width: compact ? 38 : 48,
    height: compact ? 38 : 48,
    borderRadius: compact ? 13 : 16,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: primary
      ? "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.88) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,246,255,0.90) 100%)",
    color: "#0B4EB3",
    fontSize: compact ? 19 : 24,
    border: "1px solid rgba(12,41,71,0.08)",
    boxShadow:
      "0 10px 20px rgba(7,23,44,0.08), inset 0 1px 0 rgba(255,255,255,0.92)",
  };
}

function routeIcon(
  name: GsnIconName,
  primary = false,
  compact = false
): React.ReactElement {
  return (
    <span style={routeIconCircle(primary, compact)} aria-hidden="true">
      <GsnLegacyIcon
        name={name}
        size={compact ? 34 : 42}
      />
    </span>
  );
}

function iconLabel(name: GsnIconName, label: string): React.ReactElement {
  return (
    <div
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 7,
      }}
    >
      <GsnLegacyIcon name={name} size={22} />
      <span>{label}</span>
    </div>
  );
}

function routeTitleStyle(compact = false): React.CSSProperties {
  return {
    ...brandSingleLine(),
    color: "#07172C",
    fontWeight: 950,
    fontSize: compact ? 14.25 : 15.5,
    lineHeight: compact ? 1.12 : 1.18,
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function routeHelperStyle(compact = false): React.CSSProperties {
  return {
    marginTop: compact ? 0 : 6,
    ...helperText(),
    ...(compact ? {} : brandClampLines(2)),
    display: compact ? "none" : "-webkit-box",
    fontSize: 13,
    lineHeight: 1.35,
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
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
    overview: true,
    focus: false,
    borrower: false,
    guarantor: false,
    routes: true,
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  hash?: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId, hash }).to);
}

export default function LoansPage() {
  const location = useLocation();
  const routeClanId = useMemo(
    () => communityIdFromSearch(location.search),
    [location.search]
  );
  const selectedClanId =
    routeClanId || Number((api as any).getSelectedClanId?.() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "loans.nav.dashboard"),
      startSupport: routeTarget(
        "marketplace",
        selectedClanId,
        "loans.route.start-support",
        "marketplace-loans-support"
      ),
      moneyIn: routeTarget("moneyIn", selectedClanId, "loans.route.money-in"),
      moneyOut: routeTarget("moneyOut", selectedClanId, "loans.route.money-out"),
      readiness: routeTarget(
        "loanReadiness",
        selectedClanId,
        "loans.route.readiness"
      ),
      suggestions: routeTarget(
        "loanSuggestions",
        selectedClanId,
        "loans.route.suggestions"
      ),
      guarantorInbox: routeTarget(
        "guarantorInbox",
        selectedClanId,
        "loans.route.guarantor-inbox"
      ),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "loans.route.notifications"
      ),
      guarantorEarnings: routeTarget(
        "guarantorEarnings",
        selectedClanId,
        "loans.route.guarantor-earnings"
      ),
      marketplace: routeTarget("marketplace", selectedClanId, "loans.route.marketplace"),
    }),
    [selectedClanId]
  );

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
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [guarantorInbox, setGuarantorInbox] = useState<GuarantorInboxRow[]>([]);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const loansLoadSeqRef = useRef(0);
  const loansLoadContextRef = useRef("");

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
    writeLocalJSON(LOANS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;
    const contextKey = `community:${selectedClanId || "none"}`;
    const loadSeq = loansLoadSeqRef.current + 1;
    loansLoadSeqRef.current = loadSeq;
    loansLoadContextRef.current = contextKey;

    function isCurrentLoansLoad() {
      return (
        alive &&
        loansLoadSeqRef.current === loadSeq &&
        loansLoadContextRef.current === contextKey
      );
    }

    (async () => {
      setLoading(true);
      setCurrentClan(null);
      setPoolInfo(null);
      setLoans([]);
      setGuarantorInbox([]);
      setGuidance(null);

      try {
        const scopedClanOptions =
          selectedClanId > 0 ? { clan_id: selectedClanId } : undefined;

        const clanPromise =
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
            : Promise.resolve(null);

        const mePromise =
          typeof (api as any).getMe === "function"
            ? (api as any).getMe().catch(() => null)
            : Promise.resolve(null);

        const poolPromise =
          typeof (api as any).getPoolMe === "function"
            ? (api as any)
                .getPoolMe("NGN", 20, scopedClanOptions)
                .catch(() => null)
            : Promise.resolve(null);

        const loansPromise =
          typeof (api as any).listMyLoans === "function"
            ? (api as any).listMyLoans(scopedClanOptions).catch(() => [])
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

        if (!isCurrentLoansLoad()) return;

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

        setCurrentClan(clanRes || null);
        setMe(meRes || null);
        setPoolInfo(poolRes);
        setLoans(filteredLoans);
        setGuarantorInbox(normalizedGuarantorRows);
        setGuidance(guidanceRes || null);
      } finally {
        if (isCurrentLoansLoad()) setLoading(false);
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
  const withdrawalTask = useMemo(
    () => readWithdrawalTask(selectedClanId, safeStr(me?.gmfn_id)),
    [selectedClanId, me]
  );
  const hasWithdrawalSupportHandoff = Boolean(
    withdrawalTask &&
      (safeStr(withdrawalTask.handoffMode) === "withdrawal-support" ||
        safeStr(withdrawalTask.supportGap))
  );
  const withdrawalAmountText = firstTruthy(withdrawalTask?.amountInput, "requested amount");
  const withdrawalSupportGapText = firstTruthy(withdrawalTask?.supportGap, "");

  const supportFocus = useMemo(() => {
    if (hasWithdrawalSupportHandoff) {
      return {
        title: "This withdrawal needs support",
        detail: withdrawalSupportGapText
          ? `Requested: ${withdrawalAmountText}. Support needed: ${withdrawalSupportGapText}.`
          : `Requested: ${withdrawalAmountText}. Continue from Marketplace Support Requests.`,
      };
    }

    if (guarantorInbox.length > 0) {
      const first = guarantorInbox[0];
      return {
        title: first.loanId
          ? `A support request is waiting on item #${first.loanId}`
          : "A support request is waiting",
        detail: first.pledgeAmount
          ? `Someone is waiting for your support decision on ${first.pledgeAmount}.`
          : "Someone is waiting for your support decision.",
      };
    }

    if (borrowerLoans.length > 0) {
      const first = borrowerLoans[0];
      return {
        title: "Your support request is still active",
        detail: safeStr(first.title)
          ? `${safeStr(first.title)} is still active with status '${safeStr(
              first.status || "open"
            )}'.`
          : `Your support request is still active with status '${safeStr(
              first.status || "open"
            )}'.`,
      };
    }

    if (guarantorLoans.length > 0) {
      const first = guarantorLoans[0];
        return {
          title: "You have supporter-side responsibility",
          detail: safeStr(first.title)
            ? `${safeStr(first.title)} is still active and should be watched closely.`
            : "A supporter-side item is still active and should be watched closely.",
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
      title: "Your support activity is calm right now.",
      detail:
        "No urgent request-side or supporter-side pressure is currently shown.",
    };
  }, [
    hasWithdrawalSupportHandoff,
    withdrawalAmountText,
    withdrawalSupportGapText,
    guarantorInbox,
    borrowerLoans,
    guarantorLoans,
    guidance,
  ]);

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
          sectionLabel="Focused Task"
          title="Loans & Support"
          subtitle="Loading the support page..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ ...helperText(), lineHeight: 1.8 }}>
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
        sectionLabel="Focused Task"
        title="Loans & Support"
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.dashboard}
      />

      <section
        id="loans-support-overview"
        style={pageCard(
          "radial-gradient(circle at top right, rgba(242,207,119,0.20), transparent 34%), linear-gradient(135deg, #061827 0%, #0A2A48 62%, #0B4EB3 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.08fr) 280px",
            gap: 18,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 30 : 46,
                lineHeight: 1.1,
              }}
            >
              {hasWithdrawalSupportHandoff ? "Withdrawal support" : "Loans & Support"}
            </div>

            <div
              style={{
                width: 54,
                height: 4,
                borderRadius: 999,
                marginTop: 12,
                background:
                  "linear-gradient(90deg, #F2CF77 0%, rgba(242,207,119,0.18) 100%)",
              }}
            />

            <div style={{ marginTop: 14, ...helperText(), color: "#D7E3F1", maxWidth: 640 }}>
              {hasWithdrawalSupportHandoff
                ? "Money Out sent this here because the amount needs community support."
                : "Ask for support, respond to requests, and keep repayment visible inside this community."}
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 8,
                maxWidth: 580,
              }}
            >
              <span style={badge(false)}>Community: {communityLabel}</span>
              {hasWithdrawalSupportHandoff ? (
                <span style={badge(false)}>Money Out support needed</span>
              ) : null}
              <span style={badge(false)}>Active support items: {activeLoans.length}</span>
              <span style={badge(false)}>
                Waiting support requests: {guarantorInbox.length}
              </span>
            </div>

            <StableCtaLink
              to={routes.startSupport}
              debugId="loans.hero.start-support"
              stableHeight={isCompact ? 58 : 68}
              fullWidth={isCompact}
              minWidth={isCompact ? undefined : 260}
              style={{
                ...routeTileStyle(true, isCompact),
                marginTop: isCompact ? 12 : 18,
                maxWidth: isCompact ? "100%" : 360,
                height: isCompact ? 58 : 68,
                minHeight: isCompact ? 58 : 68,
                maxHeight: isCompact ? 58 : 68,
                border: "1px solid rgba(255,255,255,0.48)",
              }}
            >
              {routeIcon("spark", true, isCompact)}
              <div>
                <div style={routeTitleStyle(isCompact)}>
                  {hasWithdrawalSupportHandoff ? "Continue support request" : "Start Support Request"}
                </div>
                <div style={routeHelperStyle(isCompact)}>
                  {hasWithdrawalSupportHandoff
                    ? "Open the Marketplace support lane with the saved amount."
                    : "Begin or continue your support request."}
                </div>
              </div>
            </StableCtaLink>
          </div>
          <div
            style={{
              ...softCard("#FFFFFF"),
              minHeight: isCompact ? 0 : 230,
              display: isCompact ? "none" : "grid",
              alignContent: "center",
              justifyItems: "center",
              textAlign: "center",
              background:
                "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)",
              border: "1px solid rgba(255,255,255,0.24)",
              boxShadow:
                "0 18px 40px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
            }}
          >
            <div
              style={{
                width: 76,
                height: 76,
                borderRadius: 999,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.88) 100%)",
                color: "#07172C",
                fontSize: 34,
                border: "1px solid rgba(255,255,255,0.28)",
                boxShadow:
                  "0 16px 32px rgba(2,6,23,0.18), inset 0 1px 0 rgba(255,255,255,0.86)",
              }}
            >
              <GsnLegacyIcon name="financeInstitution" size={64} />
            </div>
            <div style={{ marginTop: 14, ...sectionLabel(), color: "#D7E3F1" }}>
              Pool position
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#F2CF77",
                fontWeight: 900,
                fontSize: 34,
                lineHeight: 1.2,
              }}
            >
              {poolAmount}
            </div>

            <div style={{ color: "#D7E3F1", fontWeight: 900 }}>{poolCurrency}</div>

            <div style={{ marginTop: 10, ...helperText(), color: "#D7E3F1", maxWidth: 220 }}>
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {routeIcon("chart")}
            <div>
              <div style={sectionLabel()}>Support summary</div>
              <div style={{ marginTop: 4, ...helperText() }}>
                Overview of your support and queues.
              </div>
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={132}
            stableHeight={48}
            debugId="loans.toggle-overview"
            style={{
              borderRadius: 999,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {collapsed.overview ? "View details" : "Hide details"}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: responsiveGridColumns(isCompact ? 150 : 190),
              gap: 12,
            }}
          >
            <div style={statTile("#F8FBFF")}>
              {iconLabel("repaymentSchedule", "Active support")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B4EB3",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {activeLoans.length}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              {iconLabel("user", "My requests")}
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {borrowerLoans.length}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              {iconLabel("shield", "Supporter side")}
              <div
                style={{
                  marginTop: 8,
                  color: "#0B4EB3",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {guarantorLoans.length}
              </div>
            </div>

            <div style={{ ...statTile("#FFF5F5"), gridColumn: "span 1" }}>
              {iconLabel("alert", "Pending requests")}
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 26,
                  fontWeight: 900,
                }}
              >
                {guarantorInbox.length}
              </div>
            </div>

            <div style={{ ...statTile("#F0FBF6"), gridColumn: isCompact ? "1 / -1" : "span 2" }}>
              {iconLabel("financeInstitution", "Pool")}
              <div
                style={{
                  marginTop: 8,
                  color: "#168254",
                  fontSize: 22,
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
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 1px minmax(0, 1fr)",
            gap: 18,
            alignItems: "stretch",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "96px minmax(0, 1fr)", gap: 16 }}>
            <span style={{ ...routeIconCircle(false), width: 86, height: 86 }}>
              <GsnLegacyIcon name="spark" size={52} />
            </span>
            <div>
              <div style={sectionLabel()}>Current support focus</div>
              <div
                style={{
                  marginTop: 12,
                  color: "#07172C",
                  fontSize: 22,
                  fontWeight: 950,
                  lineHeight: 1.25,
                }}
              >
                {supportFocus.title}
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>{supportFocus.detail}</div>
            </div>
          </div>

          {!isCompact ? <div style={{ background: "#D8E3EE" }} /> : null}

          {!isCompact ? (
          <div>
            <div style={sectionLabel()}>How to read this page</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={helperText()}>
                My requests = support you asked this marketplace for.
              </div>
              <div style={helperText()}>
                Supporter side = you are attached to someone else's support flow.
              </div>
              <div style={helperText()}>
                Waiting requests = someone is waiting for your support decision.
              </div>
            </div>
          </div>
          ) : null}
        </div>
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {routeIcon("globe")}
            <div>
              <div style={sectionLabel()}>More support tools</div>
              <div style={{ marginTop: 4, ...helperText() }}>
                Open only when the support request needs a deeper step.
              </div>
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            minWidth={132}
            stableHeight={48}
            debugId="loans.toggle-routes"
            style={{
              borderRadius: 999,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            {collapsed.routes ? "Open tools" : "Hide tools"}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
        <>
        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: responsiveGridColumns(260),
            gap: 12,
          }}
        >
          <StableCtaLink
            to={routes.startSupport}
            debugId="loans.route.start-support"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(true, isCompact)}
          >
            {routeIcon("spark", true, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>
                {hasWithdrawalSupportHandoff ? "Continue Support Request" : "Start Support Request"}
              </div>
              <div style={routeHelperStyle(isCompact)}>
                {hasWithdrawalSupportHandoff
                  ? "Open the inside Marketplace support lane."
                  : "Work inside the selected marketplace."}
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.moneyIn}
            debugId="loans.route.money-in"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("wallet", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Money In</div>
              <div style={routeHelperStyle(isCompact)}>
                Add money to this marketplace pool.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.moneyOut}
            debugId="loans.route.money-out"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("bank", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Money Out</div>
              <div style={routeHelperStyle(isCompact)}>
                Withdraw money you can already take out.
              </div>
            </div>
          </StableCtaLink>
        </div>

        <details style={{ marginTop: 12 }}>
          <StableDisclosureSummary
            debugId="loans.deeper-support-tools.summary"
            stableHeight={isCompact ? 52 : 56}
            style={{
              borderRadius: 999,
              width: "100%",
              justifyContent: "space-between",
              padding: isCompact ? "0 12px" : "0 16px",
              fontSize: isCompact ? 14 : 15,
              fontWeight: 950,
              color: "#0B2C4D",
              background: "linear-gradient(180deg, #F8FBFF 0%, #EAF5FF 100%)",
              border: "1px solid rgba(11,99,209,0.12)",
            }}
          >
            Deeper support tools
            <span aria-hidden="true">+</span>
          </StableDisclosureSummary>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: responsiveGridColumns(260),
              gap: 12,
            }}
          >

            <StableCtaLink
            to={routes.readiness}
            debugId="loans.route.readiness"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("shield", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Check readiness</div>
              <div style={routeHelperStyle(isCompact)}>
                Check whether the support request can continue.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.suggestions}
            debugId="loans.route.suggestions"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("spark", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Find supporters</div>
              <div style={routeHelperStyle(isCompact)}>
                Open when you need people who may back the request.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.guarantorInbox}
            debugId="loans.route.guarantor-inbox"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("community", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Incoming requests</div>
              <div style={routeHelperStyle(isCompact)}>
                Open decisions waiting on you.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.notifications}
            debugId="loans.route.notifications"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("alert", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Action Inbox</div>
              <div style={routeHelperStyle(isCompact)}>
                Open when someone is waiting on your response.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.guarantorEarnings}
            debugId="loans.route.guarantor-earnings"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("chart", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Supporter value</div>
              <div style={routeHelperStyle(isCompact)}>
                Read the value recorded from helping others.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.marketplace}
            debugId="loans.route.marketplace"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            {routeIcon("shop", false, isCompact)}
            <div>
              <div style={routeTitleStyle(isCompact)}>Marketplace</div>
              <div style={routeHelperStyle(isCompact)}>
                Return to your community page.
              </div>
            </div>
            </StableCtaLink>
          </div>
        </details>
        </>
        ) : null}
      </section>

      {!isCompact ? (
      <section id="loans-queues-flows" style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {routeIcon("community")}
          <div>
            <div style={sectionLabel()}>Queues & flows</div>
            <div style={{ marginTop: 4, ...helperText() }}>
              Live status of your support flows.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: responsiveGridColumns(280),
            gap: 14,
          }}
        >
          <div
            style={{
              ...innerCard("#F4F8FF"),
              display: "grid",
              gridTemplateColumns: "76px minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <span style={{ ...routeIconCircle(false), width: 64, height: 64 }}>
              <GsnLegacyIcon name="user" size={42} />
            </span>
            <div>
              <div style={{ ...routeTitleStyle(), color: "#0B4EB3" }}>
                My support request
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {borrowerLoans.length > 0
                  ? `${borrowerLoans.length} support request is active.`
                  : "No support request is active right now."}
              </div>
            </div>
          </div>

          <div
            style={{
              ...innerCard("#FAF7FF"),
              display: "grid",
              gridTemplateColumns: "76px minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <span style={{ ...routeIconCircle(false), width: 64, height: 64 }}>
              <GsnLegacyIcon name="community" size={42} />
            </span>
            <div>
              <div style={{ ...routeTitleStyle(), color: "#5B21B6" }}>
                Supporter queue
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {guarantorInbox.length > 0
                  ? `${guarantorInbox.length} support request is waiting on you.`
                  : "No support request is waiting on you."}
              </div>
              <div style={{ marginTop: 3, ...helperText(), fontSize: 13 }}>
                {guarantorLoans.length > 0
                  ? `${guarantorLoans.length} supporter-side item is active.`
                  : "No supporter-side item is currently shown."}
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {!isCompact ? (
      <section
        style={{
          ...pageCard("#FFFBEF"),
          border: "1px solid rgba(214,170,69,0.42)",
          display: "grid",
          gridTemplateColumns: isCompact ? "1fr" : "60px minmax(0, 1fr)",
          gap: 14,
          alignItems: "center",
        }}
      >
        {routeIcon("evidence")}
        <div>
          <div style={{ color: "#07172C", fontWeight: 950, lineHeight: 1.35 }}>
            Support stays community-specific. Finance shows the money picture;
            this page handles live support steps and decisions.
          </div>
        </div>
      </section>
      ) : null}

      <GsnSupportContact
        context="Loans and Support"
        subject="GSN support request help"
        style={{ marginTop: 16 }}
      />

    </div>
  );
}
