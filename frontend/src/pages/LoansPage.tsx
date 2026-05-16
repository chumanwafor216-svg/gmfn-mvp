import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink, SubtleButton } from "../components/StableButton";
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
    minHeight: compact ? 66 : 88,
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
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    contain: "layout paint",
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
      ? "linear-gradient(180deg, #1F73E0 0%, #0B4EB3 100%)"
      : "linear-gradient(180deg, #EEF6FF 0%, #E5EEF8 100%)",
    color: primary ? "#FFFFFF" : "#0B4EB3",
    fontSize: compact ? 19 : 24,
    boxShadow: primary
      ? "0 10px 20px rgba(19,95,209,0.22)"
      : "inset 0 1px 0 rgba(255,255,255,0.95)",
  };
}

function routeTitleStyle(compact = false): React.CSSProperties {
  return {
    color: "#07172C",
    fontWeight: 950,
    fontSize: compact ? 14.25 : 15.5,
    lineHeight: compact ? 1.12 : 1.18,
    overflowWrap: "break-word",
  };
}

function routeHelperStyle(compact = false): React.CSSProperties {
  return {
    marginTop: compact ? 0 : 6,
    ...helperText(),
    display: compact ? "none" : "block",
    fontSize: 13,
    lineHeight: 1.35,
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
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const [guarantorInbox, setGuarantorInbox] = useState<GuarantorInboxRow[]>([]);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);

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

    (async () => {
      setLoading(true);

      try {
        const scopedClanOptions =
          selectedClanId > 0 ? { clan_id: selectedClanId } : undefined;

        const clanPromise =
          typeof (api as any).getCurrentClan === "function"
            ? (api as any).getCurrentClan().catch(() => null)
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

        const [clanRes, poolRes, loansRes, guarantorRes, guidanceRes] =
          await Promise.all([
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
      title: "Your support activity is calm right now.",
      detail:
        "No urgent borrower-side or guarantor-side support pressure is currently shown.",
    };
  }, [guarantorInbox, borrowerLoans, guarantorLoans, guidance]);

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
                fontSize: isCompact ? 34 : 46,
                lineHeight: 1.1,
              }}
            >
              Loans & Support
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
              Your community workspace for borrower steps, guarantor responses, repayment movement, and support routes.
            </div>

            <div
              style={{
                marginTop: 18,
                display: "grid",
                gap: 8,
                maxWidth: 580,
              }}
            >
              <span style={badge(false)}>👥 Community: {communityLabel}</span>
              <span style={badge(false)}>✅ Active support items: {activeLoans.length}</span>
              <span style={badge(false)}>
                🕒 Pending guarantor requests: {guarantorInbox.length}
              </span>
            </div>
          </div>

          <div
            style={{
              ...softCard("#FFFFFF"),
              minHeight: 230,
              display: "grid",
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
                  "linear-gradient(180deg, rgba(242,207,119,0.95) 0%, rgba(184,137,37,0.95) 100%)",
                color: "#07172C",
                fontSize: 34,
                boxShadow: "0 16px 32px rgba(2,6,23,0.28)",
              }}
            >
              🪙
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
            <span style={routeIconCircle(false)}>📊</span>
            <div>
              <div style={sectionLabel()}>Support summary</div>
              <div style={{ marginTop: 4, ...helperText() }}>
                Overview of your support and queues.
              </div>
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            minWidth={126}
            stableHeight={48}
            debugId="loans.toggle-overview"
            style={{ borderRadius: 999 }}
          >
            {collapsed.overview ? "View details" : "View details ›"}
          </SubtleButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "repeat(3, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>💳 Active loans</div>
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
              <div style={sectionLabel()}>👤 Borrower side</div>
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
              <div style={sectionLabel()}>🛡️ Guarantor side</div>
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
              <div style={sectionLabel()}>⏳ Pending requests</div>
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
              <div style={sectionLabel()}>🪙 Pool</div>
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
            <span style={{ ...routeIconCircle(false), width: 86, height: 86, fontSize: 46 }}>🎯</span>
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

          <div>
            <div style={sectionLabel()}>How to read this page</div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div style={helperText()}>
                • Borrower-side load = your own support request flow.
              </div>
              <div style={helperText()}>
                • Guarantor-side load = you are attached to someone else's support flow.
              </div>
              <div style={helperText()}>
                • Pending requests = someone is waiting for your decision.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="loans-next-routes" style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={routeIconCircle(false)}>🧭</span>
          <div>
            <div style={sectionLabel()}>Live support modules</div>
            <div style={{ marginTop: 4, ...helperText() }}>
              Choose the next route based on your task.
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
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
            <span style={routeIconCircle(true, isCompact)}>▶️</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Start Support Request</div>
              <div style={routeHelperStyle(isCompact)}>
                Begin or continue the borrower-side flow.
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
            <span style={routeIconCircle(false, isCompact)}>⬇️</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Money In</div>
              <div style={routeHelperStyle(isCompact)}>
                Use when the next step is payment into the pool.
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
            <span style={routeIconCircle(false, isCompact)}>⬆️</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Money Out</div>
              <div style={routeHelperStyle(isCompact)}>
                Use when the next step is withdrawal handling.
              </div>
            </div>
          </StableCtaLink>

          <StableCtaLink
            to={routes.readiness}
            debugId="loans.route.readiness"
            stableHeight={isCompact ? 66 : 88}
            fullWidth
            style={routeTileStyle(false, isCompact)}
          >
            <span style={routeIconCircle(false, isCompact)}>🛡️</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Loan Readiness</div>
              <div style={routeHelperStyle(isCompact)}>
                Check whether the support flow looks ready.
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
            <span style={routeIconCircle(false, isCompact)}>💡</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Loan Suggestions</div>
              <div style={routeHelperStyle(isCompact)}>
                Open when you need suggestions.
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
            <span style={routeIconCircle(false, isCompact)}>👥</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Incoming Guarantor Requests</div>
              <div style={routeHelperStyle(isCompact)}>
                Open the guarantor decision queue.
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
            <span style={routeIconCircle(false, isCompact)}>🔔</span>
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
            <span style={routeIconCircle(false, isCompact)}>🏆</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Guarantor Earnings</div>
              <div style={routeHelperStyle(isCompact)}>
                Read the guarantor reward side separately.
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
            <span style={routeIconCircle(false, isCompact)}>🏪</span>
            <div>
              <div style={routeTitleStyle(isCompact)}>Marketplace</div>
              <div style={routeHelperStyle(isCompact)}>
                Return to your community page.
              </div>
            </div>
          </StableCtaLink>
        </div>
      </section>

      <section id="loans-queues-flows" style={pageCard("#FFFFFF")}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={routeIconCircle(false)}>👥</span>
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
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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
            <span style={{ ...routeIconCircle(false), width: 64, height: 64, fontSize: 34 }}>
              👤
            </span>
            <div>
              <div style={{ ...routeTitleStyle(), color: "#0B4EB3" }}>
                Borrower-side support flow
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {borrowerLoans.length > 0
                  ? `${borrowerLoans.length} borrower-side support flow is active.`
                  : "No borrower-side support flow is active right now."}
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
            <span style={{ ...routeIconCircle(false), width: 64, height: 64, fontSize: 34 }}>
              🧑‍🤝‍🧑
            </span>
            <div>
              <div style={{ ...routeTitleStyle(), color: "#5B21B6" }}>
                Guarantor-side queue
              </div>
              <div style={{ marginTop: 6, ...helperText(), fontSize: 13 }}>
                {guarantorInbox.length > 0
                  ? `${guarantorInbox.length} pending guarantor request is currently shown.`
                  : "No pending guarantor request is currently shown."}
              </div>
              <div style={{ marginTop: 3, ...helperText(), fontSize: 13 }}>
                {guarantorLoans.length > 0
                  ? `${guarantorLoans.length} active guarantor-side support item is shown.`
                  : "No active guarantor-side support item is currently shown."}
              </div>
            </div>
          </div>
        </div>
      </section>

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
        <span style={routeIconCircle(false)}>ℹ️</span>
        <div>
          <div style={{ color: "#07172C", fontWeight: 950, lineHeight: 1.35 }}>
            Loans & Support stays community-specific. Finance shows the money picture;
            Loans & Support handles live workflow and decisions.
          </div>
        </div>
      </section>

    </div>
  );
}
