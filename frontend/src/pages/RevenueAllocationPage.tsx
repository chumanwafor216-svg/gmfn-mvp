import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  getCurrentClan,
  getMe,
  getRevenueAllocation,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type NoticeTone = "success" | "error";

type CollapseState = {
  context: boolean;
  summary: boolean;
  details: boolean;
  routes: boolean;
};

type RevenueAllocationView = {
  loanId?: number;
  clanId?: number;
  currency: string;
  amount: string;
  serviceFee: string;
  platformRevenue: string;
  guarantorPool: string;
  netDisbursedAmount: string;
  personalPoolAtRequest: string;
  poolUsed: string;
  guaranteeGap: string;
  paidTotal: string;
  remainingAmount: string;
  status: string;
  createdAt: string;
  settledAt: string;
  raw: any;
};

const REVENUE_ALLOCATION_UI_STORAGE_KEY = "gmfn.revenueAllocation.sections.v1";
const REVENUE_ALLOCATION_LOAN_STORAGE_KEY = "gmfn.revenueAllocation.lastLoanId";

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function positiveNumber(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function routeCommunityId(search: string): number {
  const query = new URLSearchParams(search || "");
  return positiveNumber(
    query.get("clan_id") ||
      query.get("community") ||
      query.get("community_id")
  );
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { loanId?: number } = {}
): string {
  return String(
    resolveCtaTarget(intent, {
      communityId,
      loanId: extra.loanId,
      debugId,
    }).to
  );
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function readLocalString(key: string): string {
  try {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem(key) || "";
  } catch {
    return "";
  }
}

function writeLocalString(key: string, value: string) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
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
    context: false,
    summary: false,
    details: false,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    context: Boolean(raw?.context ?? base.context),
    summary: Boolean(raw?.summary ?? base.summary),
    details: Boolean(raw?.details ?? base.details),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}
function moneyText(value: any): string {
  const raw = safeStr(value).replace(/,/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return safeStr(value || "0.00") || "0.00";
  return n.toFixed(2);
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    border: "1px solid rgba(108,138,184,0.22)",
    boxShadow:
      "0 28px 58px rgba(15,23,42,0.10), 0 6px 14px rgba(15,23,42,0.04)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #FCFEFF 0%, #EDF5FF 100%)"
        : bg,
    border: "1px solid rgba(123,153,197,0.21)",
    boxShadow:
      "0 20px 42px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    border: "1px solid rgba(125,154,196,0.20)",
    boxShadow:
      "0 18px 36px rgba(15,23,42,0.065), inset 0 1px 0 rgba(255,255,255,0.80)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)"
        : bg,
    border: "1px solid rgba(122,152,195,0.20)",
    boxShadow:
      "0 16px 32px rgba(15,23,42,0.06), inset 0 1px 0 rgba(255,255,255,0.80)",
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 104,
    minWidth: 0,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.22)"
      : "1px solid rgba(20,52,83,0.18)",
    background: primary
      ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.12) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.16) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(248,252,255,0.998) 0%, rgba(226,237,250,0.986) 100%)"
      : "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(234,243,251,0.986) 100%)",
    padding: 16,
    textDecoration: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    overflowAnchor: "none",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 18px 38px rgba(29,95,212,0.12)"
      : "0 16px 32px rgba(15,23,42,0.065)",
  };
}

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 16px",
    minHeight: 48,
    minWidth: 132,
    borderRadius: 14,
    border: "none",
    background: disabled
      ? "linear-gradient(180deg, #D5DEE8 0%, #C7D2DE 100%)"
      : "linear-gradient(180deg, #255FCE 0%, #1B4FBF 100%)",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    textAlign: "center",
    transition: "none",
    boxShadow: disabled
      ? "none"
      : "0 16px 32px rgba(29,95,212,0.28), inset 0 1px 0 rgba(255,255,255,0.22)",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 16px",
    minHeight: 48,
    minWidth: 132,
    borderRadius: 14,
    border: "1px solid rgba(20,52,83,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #E8F1FB 100%)",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
    textAlign: "center",
    transition: "none",
    boxShadow: disabled
      ? "none"
      : "0 14px 28px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.84)",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    minWidth: 128,
    padding: "11px 15px",
    borderRadius: 12,
    border: "1px solid rgba(20,52,83,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #E8F1FB 100%)",
    color: "#213D59",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
    textAlign: "center",
    transition: "none",
    boxShadow:
      "0 12px 24px rgba(15,23,42,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
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
          color: "#EAF3FF",
          background:
            "linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
          border: "1px solid rgba(196,216,238,0.22)",
          boxShadow:
            "0 9px 18px rgba(2,6,23,0.22), inset 0 1px 0 rgba(255,255,255,0.12)",
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
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 9,
        minWidth: 0,
        color: "#0B1F33",
        fontWeight: 900,
        fontSize: 17,
        lineHeight: 1.25,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 12,
          display: "grid",
          placeItems: "center",
          flex: "0 0 auto",
          color: "#0A3765",
          background: "linear-gradient(180deg, #F8FBFF 0%, #DCEBFA 100%)",
          border: "1px solid rgba(11,31,51,0.12)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.78)",
        }}
      >
        <GsnLegacyIcon name={name} size={30} />
      </span>
      <span>{label}</span>
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F9FCFF 100%)",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
    boxShadow:
      "0 12px 24px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4A627A",
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
      ? "linear-gradient(180deg, rgba(29,95,212,0.14) 0%, rgba(29,95,212,0.09) 100%)"
      : "linear-gradient(180deg, rgba(247,250,254,0.98) 0%, rgba(228,238,248,0.80) 100%)",
    border: primary
      ? "1px solid rgba(29,95,212,0.16)"
      : "1px solid rgba(20,52,83,0.16)",
    color: primary ? "#164AAE" : "#496178",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.60)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#405A72",
    fontSize: 14.5,
    lineHeight: 1.45,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
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

function normalizeRevenueAllocation(raw: any, fallbackLoanId?: number): RevenueAllocationView | null {
  if (!raw) return null;

  const src = raw?.item || raw?.allocation || raw?.data || raw;

  return {
    loanId: positiveNumber(src?.loan_id || src?.id) || fallbackLoanId,
    clanId: positiveNumber(src?.clan_id || src?.community_id) || undefined,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    amount: moneyText(
      src?.amount ??
        src?.loan_amount ??
        src?.requested_amount ??
        src?.principal_amount ??
        "0.00"
    ),
    serviceFee: moneyText(src?.service_fee ?? src?.fee ?? "0.00"),
    platformRevenue: moneyText(
      src?.platform_revenue ?? src?.platform_fee ?? "0.00"
    ),
    guarantorPool: moneyText(
      src?.guarantor_pool ?? src?.guarantor_share_pool ?? "0.00"
    ),
    netDisbursedAmount: moneyText(src?.net_disbursed_amount ?? "0.00"),
    personalPoolAtRequest: moneyText(src?.personal_pool_at_request ?? "0.00"),
    poolUsed: moneyText(src?.pool_used ?? "0.00"),
    guaranteeGap: moneyText(src?.guarantee_gap ?? "0.00"),
    paidTotal: moneyText(src?.paid_total ?? "0.00"),
    remainingAmount: moneyText(
      src?.remaining_amount ?? src?.outstanding_amount ?? "0.00"
    ),
    status: firstTruthy(src?.status, src?.allocation_status, "pending"),
    createdAt: firstTruthy(src?.created_at, src?.recorded_at),
    settledAt: firstTruthy(src?.settled_at, src?.updated_at),
    raw: src,
  };
}

function detailPairs(allocation: RevenueAllocationView | null): Array<[string, string]> {
  if (!allocation) return [];

  return [
    ["Loan ID", safeStr(allocation.loanId || "-")],
    ["Community ID", safeStr(allocation.clanId || "-")],
    ["Status", safeStr(allocation.status || "pending")],
    ["Amount", `${allocation.amount} ${allocation.currency}`],
    ["Service fee", `${allocation.serviceFee} ${allocation.currency}`],
    ["Platform revenue", `${allocation.platformRevenue} ${allocation.currency}`],
    ["Guarantor pool", `${allocation.guarantorPool} ${allocation.currency}`],
    ["Net disbursed", `${allocation.netDisbursedAmount} ${allocation.currency}`],
    ["Personal pool at request", `${allocation.personalPoolAtRequest} ${allocation.currency}`],
    ["Pool used", `${allocation.poolUsed} ${allocation.currency}`],
    ["Guarantee gap", `${allocation.guaranteeGap} ${allocation.currency}`],
    ["Paid total", `${allocation.paidTotal} ${allocation.currency}`],
    ["Remaining amount", `${allocation.remainingAmount} ${allocation.currency}`],
    ["Created", safeDateTime(allocation.createdAt)],
    ["Settled", safeDateTime(allocation.settledAt)],
  ];
}

export default function RevenueAllocationPage() {
  const location = useLocation();
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(REVENUE_ALLOCATION_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loanId, setLoanId] = useState(() => {
    const remembered = readLocalString(REVENUE_ALLOCATION_LOAN_STORAGE_KEY);
    return remembered || "";
  });

  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: NoticeTone; text: string } | null>(
    null
  );

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [allocation, setAllocation] = useState<RevenueAllocationView | null>(null);

  useEffect(() => {
    writeLocalJSON(REVENUE_ALLOCATION_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    writeLocalString(REVENUE_ALLOCATION_LOAN_STORAGE_KEY, loanId);
  }, [loanId]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    (async () => {
      const [meRes, clanRes] = await Promise.all([
        getMe().catch(() => null),
        getCurrentClan().catch(() => null),
      ]);

      setMe(meRes || null);
      setCurrentClan(clanRes || null);
    })();
  }, []);

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
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No current community")
    );
  }, [currentClan, selectedClanId]);

  const communityPublicId = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.community_code,
        currentClan?.community?.community_code,
        currentClan?.profile?.community_code,
        currentClan?.marketplace?.community_code
      ) || "Pending"
    );
  }, [currentClan]);

  const memberRole = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.role,
        currentClan?.member_role,
        currentClan?.membership_role,
        currentClan?.participant_role
      ) || ""
    );
  }, [currentClan]);

  const currentLoanId = positiveNumber(loanId);
  const activeCommunityId = positiveNumber(
    allocation?.clanId || routeCommunityId(location.search) || selectedClanId
  );
  const routes = useMemo(
    () => ({
      dashboard: routeTarget(
        "dashboard",
        activeCommunityId,
        "revenue-allocation.nav.dashboard"
      ),
      workbench: routeTarget(
        "loanWorkbench",
        activeCommunityId,
        "revenue-allocation.route.workbench"
      ),
      loanSummary: currentLoanId
        ? routeTarget(
            "loanSummary",
            activeCommunityId,
            "revenue-allocation.route.loan-summary",
            { loanId: currentLoanId }
          )
        : routeTarget("loans", activeCommunityId, "revenue-allocation.route.loan-summary"),
      finance: routeTarget(
        "finance",
        activeCommunityId,
        "revenue-allocation.route.finance"
      ),
      loans: routeTarget("loans", activeCommunityId, "revenue-allocation.route.loans"),
      marketplace: routeTarget(
        "marketplace",
        activeCommunityId,
        "revenue-allocation.route.marketplace"
      ),
      moneyOut: routeTarget(
        "moneyOut",
        activeCommunityId,
        "revenue-allocation.route.money-out"
      ),
    }),
    [activeCommunityId, currentLoanId]
  );
  const details = useMemo(() => detailPairs(allocation), [allocation]);

  async function load() {
    setNotice(null);
    setBusy(true);

    try {
      if (!currentLoanId) {
        throw new Error("Enter a valid loan ID.");
      }

      const res = await getRevenueAllocation(currentLoanId);
      const normalized = normalizeRevenueAllocation(res, currentLoanId);

      if (!normalized) {
        throw new Error("Revenue allocation was returned empty.");
      }

      setAllocation(normalized);
      setNotice({
        tone: "success",
        text: "Revenue allocation loaded.",
      });
    } catch (e: any) {
      setAllocation(null);
      setNotice({
        tone: "error",
        text: safeStr(e?.message) || "Unable to load revenue allocation.",
      });
    } finally {
      setBusy(false);
    }
  }

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function copySummary() {
    if (!allocation) {
      setNotice({
        tone: "error",
        text: "Load a revenue allocation first.",
      });
      return;
    }

    const text = [
      `Community: ${communityLabel}`,
      `Community ID: ${communityPublicId}`,
      `Member: ${memberName}`,
      `GSN ID: ${gmfnId}`,
      memberRole ? `Role: ${memberRole}` : "",
      ...detailPairs(allocation).map(([label, value]) => `${label}: ${value}`),
    ]
      .filter(Boolean)
      .join("\n");

    safeCopy(text);
    setNotice({
      tone: "success",
      text: "Revenue allocation summary copied.",
    });
  }

  return (
    <div
      style={{
        maxWidth: 1100,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Revenue Allocation"
        title="Revenue Allocation"
        subtitle="See how one support item splits money."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.workbench}
        backLabel="Loan Workbench"
      />

      <ExplainToggle
        label="What this screen does"
        what="This shows the fee, pool, revenue, and net amount for one support item."
        why="It keeps the money split clear before deeper review."
        next="Load the item, then open details only if you need them."
        tone="light"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Fixed allocation context</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 30,
                fontWeight: 1000,
                color: "#F8FBFF",
                lineHeight: 1.15,
              }}
            >
              Revenue allocation for support item review
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#D7E3F1",
                lineHeight: 1.45,
              }}
            >
              See the split without digging through source finance records.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
                gap: 10,
              }}
            >
              <PrimaryButton
                type="button"
                onClick={() => void load()}
                disabled={busy}
                busy={busy}
                busyLabel="Loading"
                fullWidth
                stableHeight={52}
                debugId="revenue-allocation.front-load"
                style={primaryBtn(busy)}
              >
                {actionText("refresh", busy ? "Loading" : "Load")}
              </PrimaryButton>

              <SecondaryButton
                type="button"
                onClick={copySummary}
                disabled={!allocation}
                fullWidth
                stableHeight={52}
                debugId="revenue-allocation.front-copy-summary"
                style={secondaryBtn(!allocation)}
              >
                {actionText("copy", "Copy summary")}
              </SecondaryButton>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
                gap: 10,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  {communityLabel}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {communityPublicId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GSN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                    wordBreak: "break-word",
                  }}
                >
                  {gmfnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Current step</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                    lineHeight: 1.3,
                  }}
                >
                  Revenue allocation
                </div>
              </div>
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Member: {memberName}</span>
              {memberRole ? <span style={badge(false)}>Role: {memberRole}</span> : null}
              <span style={badge(false)}>
                Current loan ID: {currentLoanId || "Pending"}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current action</div>

            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <div>
                <div
                  style={{
                    marginBottom: 8,
                    color: "#475569",
                    fontWeight: 900,
                    fontSize: 14,
                  }}
                >
                  Loan ID
                </div>
                <input
                  value={loanId}
                  onChange={(e) => setLoanId(e.target.value)}
                  placeholder="Enter loan ID"
                  style={inputStyle()}
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(148px, 1fr))",
                  gap: 10,
                }}
              >
                <PrimaryButton
                  type="button"
                  onClick={() => void load()}
                  disabled={busy}
                  busy={busy}
                  busyLabel="Loading"
                  fullWidth
                  stableHeight={52}
                  debugId="revenue-allocation.load"
                  style={primaryBtn(busy)}
                >
                  {actionText("refresh", busy ? "Loading" : "Load")}
                </PrimaryButton>

                <SecondaryButton
                  type="button"
                  onClick={copySummary}
                  disabled={!allocation}
                  fullWidth
                  stableHeight={52}
                  debugId="revenue-allocation.copy-summary"
                  style={secondaryBtn(!allocation)}
                >
                  {actionText("copy", "Copy summary")}
                </SecondaryButton>
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
            <div style={sectionLabel()}>Allocation summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The main financial breakdown of the selected support item.
            </div>
          </div>

          <SubtleButton
            type="button"
            onClick={() => toggleSection("summary")}
            stableHeight={52}
            debugId="revenue-allocation.toggle-summary"
            style={collapseToggle()}
          >
            {actionText(collapsed.summary ? "document" : "lock", collapsed.summary ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        <ExplainToggle
          label="What this does"
          what="This is the main money breakdown for the selected item."
          why="It shows the broad split before the field-by-field view."
          next="Use this first, then open details only when needed."
          tone="light"
          style={{ marginTop: 14 }}
        />

        {!collapsed.summary ? (
          allocation ? (
            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(142px, 1fr))",
                gap: 14,
              }}
            >
              <div style={statTile()}>
                <div style={sectionLabel()}>Amount</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 22,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.amount} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Service fee</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 22,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.serviceFee} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Platform revenue</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 22,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.platformRevenue} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Guarantor pool</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 22,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.guarantorPool} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Net disbursed</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 18,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.netDisbursedAmount} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Pool used</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 18,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.poolUsed} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Guarantee gap</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 18,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.guaranteeGap} {allocation.currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Remaining amount</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    fontSize: 18,
                    color: "#0B1F33",
                  }}
                >
                  {allocation.remainingAmount} {allocation.currency}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.45 }}>
              Load a revenue allocation to see the summary.
            </div>
          )
        ) : null}
      </section>

      <section style={{ ...pageCard("#F8FBFF") }}>
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
            <div style={sectionLabel()}>Meaning</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the allocation logic readable.
            </div>
          </div>

          <SubtleButton
            type="button"
            onClick={() => toggleSection("details")}
            stableHeight={52}
            debugId="revenue-allocation.toggle-details"
            style={collapseToggle()}
          >
            {actionText(collapsed.details ? "document" : "lock", collapsed.details ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        {!collapsed.details ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Why this matters
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                See what was kept as fee, what supports guarantors, and what
                reaches the member.
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Next use
              </div>

              <div style={{ marginTop: 10, ...helperText() }}>
                After the split is clear, return to the workbench, summary, or
                finance page you need.
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
            <div style={sectionLabel()}>Detailed fields</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A field-by-field reading of the returned allocation.
            </div>
          </div>

          <SubtleButton
            type="button"
            onClick={() => toggleSection("context")}
            stableHeight={52}
            debugId="revenue-allocation.toggle-context"
            style={collapseToggle()}
          >
            {actionText(collapsed.context ? "document" : "lock", collapsed.context ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        {!collapsed.context ? (
          allocation ? (
            <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
              {details.map(([label, value]) => (
                <div key={label} style={innerCard("#FCFEFF")}>
                  <div style={sectionLabel()}>{label}</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 15,
                      lineHeight: 1.35,
                    }}
                  >
                    {value}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ marginTop: 14, color: "#64748B", lineHeight: 1.45 }}>
              Load a revenue allocation to inspect the returned fields.
            </div>
          )
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
            <div style={sectionLabel()}>Next support routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from allocation reading into the next support or finance page you need.
            </div>
          </div>

          <SubtleButton
            type="button"
            onClick={() => toggleSection("routes")}
            stableHeight={52}
            debugId="revenue-allocation.toggle-routes"
            style={collapseToggle()}
          >
            {actionText(collapsed.routes ? "document" : "lock", collapsed.routes ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        {!collapsed.routes ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
              gap: 12,
            }}
          >
            <StableCtaLink
              to={routes.loanSummary}
              stableHeight={104}
              debugId="revenue-allocation.route.loan-summary"
              style={routeTile(true)}
            >
              {routeHeading("document", "Loan Summary")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the support item summary.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.workbench}
              stableHeight={104}
              debugId="revenue-allocation.route.workbench"
              style={routeTile(false)}
            >
              {routeHeading("briefcase", "Loan Workbench")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Continue the deeper support review.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.finance}
              stableHeight={104}
              debugId="revenue-allocation.route.finance"
              style={routeTile(false)}
            >
              {routeHeading("wallet", "Finance")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the community money view.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.loans}
              stableHeight={104}
              debugId="revenue-allocation.route.loans"
              style={routeTile(false)}
            >
              {routeHeading("community", "Loans & Support")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to the broader support overview.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.marketplace}
              stableHeight={104}
              debugId="revenue-allocation.route.marketplace"
              style={routeTile(false)}
            >
              {routeHeading("shop", "Marketplace")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return after the allocation review.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.moneyOut}
              stableHeight={104}
              debugId="revenue-allocation.route.money-out"
              style={routeTile(false)}
            >
              {routeHeading("bank", "Money Out")}
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Go back to guided withdrawals.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>

    </div>
  );
}



