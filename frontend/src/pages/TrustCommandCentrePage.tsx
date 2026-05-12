import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableCtaLink } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import {
  adminRecentTrustEvents,
  getAdminIdentityRisk,
  getAdminIncompleteLoans,
  getCurrentClan,
  getExposureAdmin,
  getMe,
  getPilotReadiness,
  getProtocolStatus,
  getSelectedClanId,
  getSystemHealth,
  listExpectedPayments,
  listRecentBankEvents,
  listUnmatchedBankEvents,
} from "../lib/api";
import { getClanLiquiditySummary } from "../lib/communityMoney";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type CollapseState = {
  executive: boolean;
  overview: boolean;
  routes: boolean;
  workflows: boolean;
  pilot: boolean;
  notes: boolean;
};

type ExecutiveReading = {
  systemHealth: any | null;
  protocolStatus: any | null;
  pilotReadiness: any | null;
  liquidity: any | null;
  exposure: any | null;
  trustEvents: any[];
  identityRisk: any[];
  incompleteLoans: any[];
  bankRecent: any[];
  bankUnmatched: any[];
  expectedPayments: any[];
  exposureError: string;
  incompleteError: string;
  bankError: string;
};

const COMMAND_CENTER_UI_STORAGE_KEY = "gmfn.commandCenter.sections.v1";
const COMMAND_CENTER_PILOT_WORKSHEET_STORAGE_KEY =
  "gmfn.commandCenter.pilotWorksheet.v1";

type PilotWorksheet = {
  pilotName: string;
  launchWindow: string;
  countries: string;
  targetRoles: string;
  devices: string;
  keyEvents: string;
  successSignals: string;
  openAssumptions: string;
  notes: string;
  deploymentReady: boolean;
  analyticsReady: boolean;
  supportChannelReady: boolean;
  dailyReviewReady: boolean;
};

const PILOT_ASSUMPTION_CARDS = [
  {
    title: "Entry conversion",
    detail:
      "Track who reaches cover, welcome, join, activation, and login, then measure how many complete the correct route without support.",
  },
  {
    title: "Community understanding",
    detail:
      "Check whether users understand community context, trust, marketplace, support, and money routes without guessing or leaving the flow.",
  },
  {
    title: "Operational friction",
    detail:
      "Watch for slow loads, API failures, access confusion, wrong-community mistakes, and mobile layout friction across regions and devices.",
  },
  {
    title: "Trust and finance behavior",
    detail:
      "Verify whether users and admins understand trust readings, verification, support suggestions, exposure, and money decisions well enough to act correctly.",
  },
];

const PILOT_DATA_CARDS = [
  {
    title: "Coverage to capture",
    detail:
      "Country, timezone, device type, browser, screen size, role, and current community should all be visible when interpreting validation results.",
  },
  {
    title: "Events to capture",
    detail:
      "Route visited, action taken, success or failure, time to next step, and the exact error state should be logged for every key verification journey.",
  },
  {
    title: "Rollout structure",
    detail:
      "Use a small multi-country verification group first with ordinary users, clan admins, and platform admins before opening the wider test group.",
  },
];

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

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "Not stated";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}
function formatNumber(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return safeStr(x) || "0";
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 2,
  }).format(n);
}

type TrustEventCategory = "built" | "protected" | "weakened" | "repair";

function classifyTrustEvent(row: any): TrustEventCategory {
  const text = [
    safeStr(row?.event_type),
    safeStr(row?.kind),
    safeStr(row?.type),
    safeStr(row?.title),
    safeStr(row?.message),
    safeStr(row?.detail),
    safeStr(row?.description),
  ]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("paid") ||
    text.includes("repaid") ||
    text.includes("verified") ||
    text.includes("completed") ||
    text.includes("approved") ||
    text.includes("contributed") ||
    text.includes("delivered") ||
    text.includes("fulfilled") ||
    text.includes("successful")
  ) {
    return "built";
  }

  if (
    text.includes("late") ||
    text.includes("overdue") ||
    text.includes("default") ||
    text.includes("missed") ||
    text.includes("declined") ||
    text.includes("cancelled") ||
    text.includes("unpaid") ||
    text.includes("negative")
  ) {
    return "weakened";
  }

  if (
    text.includes("risk") ||
    text.includes("warning") ||
    text.includes("repair") ||
    text.includes("flag") ||
    text.includes("dispute") ||
    text.includes("attention")
  ) {
    return "repair";
  }

  return "protected";
}

function classifyIdentitySignal(row: any): {
  level: "green" | "yellow" | "red";
  score: number;
} {
  const severity = toNum(row?.severity || 0);
  let score = severity * 10;

  const type = safeStr(row?.signal_type).toLowerCase();
  if (type.includes("cluster")) score += 30;
  if (type.includes("device")) score += 15;

  if (score >= 60) return { level: "red", score };
  if (score >= 25) return { level: "yellow", score };
  return { level: "green", score };
}

function adminShell(): React.CSSProperties {
  return {
    minHeight: "100vh",
    padding: "24px 14px 46px",
    borderRadius: 30,
    background:
      "radial-gradient(circle at 12% 0%, rgba(246,215,125,0.16), transparent 30%), radial-gradient(circle at 86% 5%, rgba(76,143,218,0.22), transparent 34%), radial-gradient(circle at 72% 86%, rgba(255,255,255,0.10), transparent 32%), linear-gradient(180deg, #07172B 0%, #10243A 42%, #173654 72%, #26527C 100%)",
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.16), 0 24px 64px rgba(5,16,38,0.18)",
    boxSizing: "border-box",
  };
}

function adminInner(maxWidth = 1180): React.CSSProperties {
  return {
    maxWidth,
    margin: "0 auto",
    paddingBottom: 4,
    display: "grid",
    gap: 18,
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.16) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.14) 0%, rgba(38,96,171,0) 30%), linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(239,247,255,0.985) 54%, rgba(221,232,245,0.975) 100%)"
        : bg,
    boxShadow:
      "0 28px 58px rgba(7,20,36,0.12), 0 6px 14px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 16% 12%, rgba(201,154,39,0.13) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 16%, rgba(38,96,171,0.10) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(243,248,254,0.984) 58%, rgba(228,237,246,0.975) 100%)"
        : bg === "#F8FBFF"
          ? "radial-gradient(circle at 16% 12%, rgba(201,154,39,0.14) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 16%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 29%), linear-gradient(180deg, rgba(250,252,255,0.996) 0%, rgba(236,244,252,0.984) 60%, rgba(220,231,242,0.972) 100%)"
          : bg,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "radial-gradient(circle at 18% 12%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.09) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.999) 0%, rgba(246,249,253,0.986) 62%, rgba(232,239,246,0.972) 100%)"
        : bg === "#F8FBFF" || bg === "#FCFEFF"
          ? "radial-gradient(circle at 18% 12%, rgba(201,154,39,0.11) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.10) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(249,252,255,0.997) 0%, rgba(240,247,253,0.984) 60%, rgba(226,236,246,0.972) 100%)"
          : bg,
  };
}

function statTile(): React.CSSProperties {
  return {
    ...institutionalStatTile("#FFFFFF"),
    border: "1px solid rgba(20,52,83,0.17)",
    background:
      "radial-gradient(circle at 16% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 84% 14%, rgba(38,96,171,0.10) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(240,246,252,0.984) 100%)",
    boxShadow:
      "0 14px 30px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 110,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(176,133,38,0.34)"
      : "1px solid rgba(20,52,83,0.18)",
    background: primary
      ? "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.18) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.11) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,251,238,0.995) 0%, rgba(243,245,249,0.984) 58%, rgba(229,238,247,0.976) 100%)"
      : "radial-gradient(circle at 14% 10%, rgba(201,154,39,0.10) 0%, rgba(201,154,39,0) 28%), radial-gradient(circle at 86% 14%, rgba(38,96,171,0.12) 0%, rgba(38,96,171,0) 28%), linear-gradient(180deg, rgba(255,255,255,0.998) 0%, rgba(241,247,253,0.985) 60%, rgba(227,236,245,0.973) 100%)",
    padding: 16,
    textDecoration: "none",
    boxSizing: "border-box",
    overflowAnchor: "none",
    contain: "layout paint",
    transition: "none",
    flexShrink: 0,
    boxShadow: primary
      ? "0 16px 34px rgba(134,98,20,0.12), inset 0 1px 0 rgba(255,255,255,0.9)"
      : "0 12px 26px rgba(7,20,36,0.06), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4E6680",
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
    border: primary
      ? "1px solid rgba(176,133,38,0.28)"
      : "1px solid rgba(20,52,83,0.18)",
    background: primary
      ? "linear-gradient(180deg, rgba(255,250,236,0.98), rgba(241,220,166,0.46))"
      : "linear-gradient(180deg, rgba(249,252,255,0.98), rgba(228,238,248,0.78))",
    color: primary ? "#8A6616" : "#4B6278",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function collapseToggle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 104,
    padding: "10px 14px",
    borderRadius: 999,
    border: "1px solid rgba(193,207,222,0.66)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995), rgba(233,242,251,0.95))",
    color: "#213D59",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    boxShadow:
      "0 10px 20px rgba(5,16,38,0.055), inset 0 1px 0 rgba(255,255,255,0.86)",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#435C73",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function inputField(multiline = false): React.CSSProperties {
  return {
    width: "100%",
    minHeight: multiline ? 110 : 44,
    borderRadius: 14,
    border: "1px solid rgba(193,207,222,0.66)",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.99), rgba(247,251,255,0.96))",
    padding: multiline ? "12px 14px" : "10px 14px",
    color: "#0B1F33",
    fontSize: 14,
    lineHeight: 1.6,
    resize: multiline ? "vertical" : "none",
    outline: "none",
    fontFamily: "inherit",
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

function readinessStatusLabel(value: any): string {
  const status = safeStr(value || "unknown").toLowerCase();
  if (status === "pilot_near_ready") return "near ready";
  if (status.startsWith("pilot_")) return status.slice("pilot_".length).replace(/_/g, " ");
  return status.replace(/_/g, " ");
}

function defaultPilotWorksheet(): PilotWorksheet {
  return {
    pilotName: "",
    launchWindow: "",
    countries: "",
    targetRoles: "",
    devices: "",
    keyEvents: "",
    successSignals: "",
    openAssumptions: "",
    notes: "",
    deploymentReady: false,
    analyticsReady: false,
    supportChannelReady: false,
    dailyReviewReady: false,
  };
}

function normalizePilotWorksheet(raw: any): PilotWorksheet {
  const base = defaultPilotWorksheet();

  return {
    pilotName: safeStr(raw?.pilotName ?? base.pilotName),
    launchWindow: safeStr(raw?.launchWindow ?? base.launchWindow),
    countries: safeStr(raw?.countries ?? base.countries),
    targetRoles: safeStr(raw?.targetRoles ?? base.targetRoles),
    devices: safeStr(raw?.devices ?? base.devices),
    keyEvents: safeStr(raw?.keyEvents ?? base.keyEvents),
    successSignals: safeStr(raw?.successSignals ?? base.successSignals),
    openAssumptions: safeStr(raw?.openAssumptions ?? base.openAssumptions),
    notes: safeStr(raw?.notes ?? base.notes),
    deploymentReady: Boolean(raw?.deploymentReady ?? base.deploymentReady),
    analyticsReady: Boolean(raw?.analyticsReady ?? base.analyticsReady),
    supportChannelReady: Boolean(
      raw?.supportChannelReady ?? base.supportChannelReady
    ),
    dailyReviewReady: Boolean(raw?.dailyReviewReady ?? base.dailyReviewReady),
  };
}

function defaultCollapseState(): CollapseState {
  return {
    executive: false,
    overview: false,
    routes: false,
    workflows: true,
    pilot: false,
    notes: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    executive: Boolean(raw?.executive ?? base.executive),
    overview: Boolean(raw?.overview ?? base.overview),
    routes: Boolean(raw?.routes ?? base.routes),
    workflows: Boolean(raw?.workflows ?? base.workflows),
    pilot: Boolean(raw?.pilot ?? base.pilot),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

export default function TrustCommandCentrePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust-command.route.dashboard"),
      trustAnalytics: routeTarget("trustAnalytics", selectedClanId, "trust-command.route.trust-analytics"),
      trustEvents: routeTarget("trustEvents", selectedClanId, "trust-command.route.trust-events"),
      systemOperations: routeTarget("systemOperations", selectedClanId, "trust-command.route.system-operations"),
      trustGraph: routeTarget("trustGraph", selectedClanId, "trust-command.route.trust-graph"),
      identityRisk: routeTarget("identityRisk", selectedClanId, "trust-command.route.identity-risk"),
      incompleteLoans: routeTarget("incompleteLoans", selectedClanId, "trust-command.route.incomplete-loans"),
      exposure: routeTarget("exposureAdmin", selectedClanId, "trust-command.route.exposure"),
      bankConsole: routeTarget("bankConsole", selectedClanId, "trust-command.route.bank-console"),
      revenueAllocation: routeTarget("revenueAllocation", selectedClanId, "trust-command.route.revenue-allocation"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMAND_CENTER_UI_STORAGE_KEY, defaultCollapseState())
    )
  );
  const [pilotWorksheet, setPilotWorksheet] = useState<PilotWorksheet>(() =>
    normalizePilotWorksheet(
      readLocalJSON(
        COMMAND_CENTER_PILOT_WORKSHEET_STORAGE_KEY,
        defaultPilotWorksheet()
      )
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [executiveLoading, setExecutiveLoading] = useState(true);
  const [executiveReading, setExecutiveReading] = useState<ExecutiveReading>({
    systemHealth: null,
    protocolStatus: null,
    pilotReadiness: null,
    liquidity: null,
    exposure: null,
    trustEvents: [],
    identityRisk: [],
    incompleteLoans: [],
    bankRecent: [],
    bankUnmatched: [],
    expectedPayments: [],
    exposureError: "",
    incompleteError: "",
    bankError: "",
  });

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
    writeLocalJSON(COMMAND_CENTER_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    writeLocalJSON(COMMAND_CENTER_PILOT_WORKSHEET_STORAGE_KEY, pilotWorksheet);
  }, [pilotWorksheet]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;

    async function run() {
      setExecutiveLoading(true);

      const systemHealthPromise = getSystemHealth().catch(() => null);
      const protocolStatusPromise = getProtocolStatus().catch(() => null);
      const pilotReadinessPromise = getPilotReadiness().catch(() => null);
      const trustEventsPromise = adminRecentTrustEvents(100).catch(() => ({
        items: [],
      }));
      const identityRiskPromise = getAdminIdentityRisk(100).catch(() => ({
        items: [],
      }));
      const liquidityPromise =
        selectedClanId > 0
          ? getClanLiquiditySummary(selectedClanId).catch(() => null)
          : Promise.resolve(null);
      const exposurePromise =
        selectedClanId > 0
          ? getExposureAdmin(selectedClanId).catch((error: any) => ({
              __error: safeStr(error?.message || error || "Exposure summary unavailable."),
            }))
          : Promise.resolve(null);
      const incompleteLoansPromise =
        selectedClanId > 0
          ? getAdminIncompleteLoans(selectedClanId, 100).catch((error: any) => ({
              __error: safeStr(
                error?.message || error || "Incomplete loan summary unavailable."
              ),
            }))
          : Promise.resolve(null);
      const bankSummaryPromise =
        selectedClanId > 0
          ? Promise.all([
              listRecentBankEvents(selectedClanId),
              listUnmatchedBankEvents(selectedClanId),
              listExpectedPayments({ clan_id: selectedClanId, limit: 100 }),
            ]).catch((error: any) => ({
              __error: safeStr(
                error?.message || error || "Bank summary unavailable."
              ),
            }))
          : Promise.resolve(null);

      const [
        systemHealthRes,
        protocolStatusRes,
        pilotReadinessRes,
        trustEventsRes,
        identityRiskRes,
        liquidityRes,
        exposureRes,
        incompleteLoansRes,
        bankSummaryRes,
      ] = await Promise.all([
        systemHealthPromise,
        protocolStatusPromise,
        pilotReadinessPromise,
        trustEventsPromise,
        identityRiskPromise,
        liquidityPromise,
        exposurePromise,
        incompleteLoansPromise,
        bankSummaryPromise,
      ]);

      if (!alive) return;

      const exposureError =
        exposureRes && typeof exposureRes === "object" && safeStr(exposureRes.__error)
          ? safeStr(exposureRes.__error)
          : "";
      const incompleteError =
        incompleteLoansRes &&
        typeof incompleteLoansRes === "object" &&
        safeStr(incompleteLoansRes.__error)
          ? safeStr(incompleteLoansRes.__error)
          : "";
      const bankError =
        bankSummaryRes &&
        typeof bankSummaryRes === "object" &&
        !Array.isArray(bankSummaryRes) &&
        safeStr(bankSummaryRes.__error)
          ? safeStr(bankSummaryRes.__error)
          : "";
      const [bankRecentRes, bankUnmatchedRes, expectedPaymentsRes] =
        Array.isArray(bankSummaryRes) ? bankSummaryRes : [null, null, null];

      setExecutiveReading({
        systemHealth: systemHealthRes,
        protocolStatus: protocolStatusRes,
        pilotReadiness: pilotReadinessRes,
        liquidity: liquidityRes,
        exposure:
          exposureRes && typeof exposureRes === "object" && exposureRes.__error
            ? null
            : exposureRes,
        trustEvents: rowsOf(trustEventsRes),
        identityRisk: rowsOf(identityRiskRes),
        incompleteLoans:
          incompleteLoansRes &&
          typeof incompleteLoansRes === "object" &&
          incompleteLoansRes.__error
            ? []
            : rowsOf(incompleteLoansRes),
        bankRecent: rowsOf(bankRecentRes),
        bankUnmatched: rowsOf(bankUnmatchedRes),
        expectedPayments: rowsOf(expectedPaymentsRes),
        exposureError,
        incompleteError,
        bankError,
      });
      setExecutiveLoading(false);
    }

    void run();

    return () => {
      alive = false;
    };
  }, [selectedClanId]);

  const operatorName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Operator"
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

  const roleLabel = useMemo(() => {
    const platformRole = firstTruthy(
      me?.role,
      me?.account_role,
      me?.user_role,
      me?.permissions?.includes?.("admin") ? "admin" : ""
    );
    const clanRole = firstTruthy(
      currentClan?.role,
      currentClan?.member_role,
      currentClan?.membership_role,
      currentClan?.participant_role
    );

    if (safeStr(platformRole).toLowerCase() === "admin") {
      return "platform admin";
    }

    if (safeStr(clanRole).toLowerCase() === "admin") {
      return "clan admin";
    }

    return firstTruthy(platformRole, clanRole, "admin-led");
  }, [currentClan, me]);

  const isPlatformAdmin = roleLabel === "platform admin";
  const isClanAdmin = roleLabel === "clan admin";

  const systemOk = Boolean(executiveReading.systemHealth?.ok);
  const protocolStage = firstTruthy(executiveReading.protocolStatus?.stage, "unknown");
  const protocolNextPriorities = Array.isArray(executiveReading.protocolStatus?.next_priority)
    ? executiveReading.protocolStatus.next_priority
    : [];
  const pilotOverall = firstTruthy(executiveReading.pilotReadiness?.overall_status, "unknown");
  const exposureTotals = executiveReading.exposure?.totals || null;
  const liquidity = executiveReading.liquidity || null;
  const trustEventRows = executiveReading.trustEvents;
  const identityRiskRows = executiveReading.identityRisk;
  const incompleteLoanRows = executiveReading.incompleteLoans;
  const bankRecentRows = executiveReading.bankRecent;
  const bankUnmatchedRows = executiveReading.bankUnmatched;
  const expectedPaymentRows = executiveReading.expectedPayments;

  const trustEventMix = useMemo(() => {
    const summary = {
      built: 0,
      protected: 0,
      weakened: 0,
      repair: 0,
    };

    trustEventRows.forEach((row) => {
      summary[classifyTrustEvent(row)] += 1;
    });

    return summary;
  }, [trustEventRows]);

  const latestTrustEvent = trustEventRows[0] || null;

  const identityRiskGroups = useMemo(() => {
    const grouped = new Map<
      number,
      { userId: number; count: number; highest: "green" | "yellow" | "red"; score: number }
    >();

    identityRiskRows.forEach((row) => {
      const userId = toNum(row?.user_id || 0);
      if (!userId) return;
      const signal = classifyIdentitySignal(row);
      const current = grouped.get(userId);

      if (!current || signal.score > current.score) {
        grouped.set(userId, {
          userId,
          count: (current?.count || 0) + 1,
          highest: signal.level,
          score: signal.score,
        });
        return;
      }

      grouped.set(userId, {
        ...current,
        count: current.count + 1,
      });
    });

    return Array.from(grouped.values());
  }, [identityRiskRows]);

  const identityInterventionCount = identityRiskGroups.filter(
    (row) => row.highest === "red"
  ).length;
  const urgentIncompleteCount = incompleteLoanRows.filter((loan) => {
    const remaining = toNum(loan?.auto_cancel_remaining_seconds);
    return remaining > 0 && remaining <= 60;
  }).length;
  const routeWarnings = [
    !isPlatformAdmin
      ? "Some command routes on this page are platform-admin only. Use Exposure, Bank Console, and Revenue Allocation for community-admin work."
      : "",
    executiveReading.exposureError,
    executiveReading.bankError,
    executiveReading.incompleteError,
  ].filter(Boolean);

  const routeCards = useMemo(() => {
    const cards: Array<{
      label: string;
      to: string;
      detail: string;
      primary?: boolean;
    }> = [];

    if (isPlatformAdmin) {
      cards.push(
        {
          label: "Trust Analytics",
          to: routes.trustAnalytics,
          detail: "Read trend, movement, and higher-level trust patterns.",
          primary: true,
        },
        {
          label: "Trust Events",
          to: routes.trustEvents,
          detail:
            "Review recent trust-event records for evidence, oversight, and explainability.",
        },
        {
          label: "System Operations",
          to: routes.systemOperations,
          detail: "Review live system activity and operational health.",
        },
        {
          label: "Trust Graph",
          to: routes.trustGraph,
          detail: "Read network structure and relationship-based trust shape.",
        },
        {
          label: "Identity Risk",
          to: routes.identityRisk,
          detail:
            "Review device overlap, account clusters, and identity pressure signals.",
        },
        {
          label: "Incomplete Loans",
          to: routes.incompleteLoans,
          detail:
            "Inspect the unresolved loan queue and active items still in motion.",
        }
      );
    }

    cards.push(
      {
        label: "Exposure",
        to: routes.exposure,
        detail: "Review concentration, balance, and exposure pressure.",
        primary: !isPlatformAdmin,
      },
      {
        label: "Bank Console",
        to: routes.bankConsole,
        detail:
          "Ingest bank events, run reconciliation, and review matched or unmatched movement.",
      },
      {
        label: "Revenue Allocation",
        to: routes.revenueAllocation,
        detail:
          "Review service fee, platform revenue, guarantor pool, and net disbursed reading.",
      }
    );

    return cards;
  }, [
    isPlatformAdmin,
    routes.bankConsole,
    routes.exposure,
    routes.identityRisk,
    routes.incompleteLoans,
    routes.revenueAllocation,
    routes.systemOperations,
    routes.trustAnalytics,
    routes.trustEvents,
    routes.trustGraph,
  ]);

  const whereNextActions = useMemo(() => {
    if (isPlatformAdmin) {
      return [
        { label: "Trust Analytics", to: routes.trustAnalytics, kind: "primary" as const },
        { label: "Trust Events", to: routes.trustEvents, kind: "secondary" as const },
        { label: "Identity Risk", to: routes.identityRisk, kind: "secondary" as const },
        { label: "Incomplete Loans", to: routes.incompleteLoans, kind: "secondary" as const },
        { label: "Bank Console", to: routes.bankConsole, kind: "secondary" as const },
        { label: "Revenue Allocation", to: routes.revenueAllocation, kind: "secondary" as const },
        { label: "System Operations", to: routes.systemOperations, kind: "secondary" as const },
        { label: "Exposure", to: routes.exposure, kind: "secondary" as const },
        { label: "Trust Graph", to: routes.trustGraph, kind: "secondary" as const },
      ];
    }

    return [
      { label: "Exposure", to: routes.exposure, kind: "primary" as const },
      { label: "Bank Console", to: routes.bankConsole, kind: "secondary" as const },
      { label: "Revenue Allocation", to: routes.revenueAllocation, kind: "secondary" as const },
    ];
  }, [
    isPlatformAdmin,
    routes.bankConsole,
    routes.exposure,
    routes.identityRisk,
    routes.incompleteLoans,
    routes.revenueAllocation,
    routes.systemOperations,
    routes.trustAnalytics,
    routes.trustEvents,
    routes.trustGraph,
  ]);

  const pilotChecks = useMemo(
    () => rowsOf<any>(executiveReading.pilotReadiness?.checks),
    [executiveReading.pilotReadiness]
  );

  const pilotPriorityChecks = useMemo(() => {
    const flagged = pilotChecks.filter((row) => {
      const status = safeStr(row?.status).toLowerCase();
      return status === "partial" || status === "blocked";
    });

    return flagged.length > 0 ? flagged : pilotChecks;
  }, [pilotChecks]);

  const workflowCards = useMemo(() => {
    const cards: Array<{ title: string; detail: string; accent?: boolean }> = [];

    if (isPlatformAdmin) {
      cards.push(
        {
          title: "If you need pattern reading",
          detail:
            "Start in Trust Analytics. Use it when the task is to understand trend, movement, or distribution rather than immediate live intervention.",
          accent: true,
        },
        {
          title: "If you need recent event evidence",
          detail:
            "Start in Trust Events. Use it when the task is to inspect recent trust-event records, evidence trails, or explainability inputs before moving into deeper analysis.",
        },
        {
          title: "If you need live handling",
          detail:
            "Start in System Operations. Use it when the task is about live conditions, active processes, or admin monitoring.",
        },
        {
          title: "If you need structure or relationship reading",
          detail:
            "Start in Trust Graph. Use it when the task is about connectedness, relationship patterns, or network trust structure.",
        },
        {
          title: "If you need identity misuse monitoring",
          detail:
            "Start in Identity Risk. Use it when the task is about suspicious overlap, clustered activity, or device-linked pressure.",
        },
        {
          title: "If you need unresolved loan oversight",
          detail:
            "Start in Incomplete Loans. Use it when the task is to review loans that have not yet reached a visible conclusion.",
        }
      );
    }

    cards.push(
      {
        title: "If you need concentration or risk reading",
        detail:
          "Start in Exposure. Use it when the task is about imbalance, concentration, or system pressure.",
        accent: !isPlatformAdmin,
      },
      {
        title: "If you need reconciliation operations",
        detail:
          "Start in Bank Console. Use it when the task is about bank events, matching, unmatched items, or reconciliation execution.",
      },
      {
        title: "If you need fee and distribution reading",
        detail:
          "Start in Revenue Allocation. Use it when the task is about fee treatment, pool use, guarantee gap, or net distribution reading.",
      }
    );

    return cards;
  }, [isPlatformAdmin]);

  const executiveNextAction = useMemo(() => {
    if (!systemOk) {
      return {
        title: "Check system health first",
        detail: "The backend health check is not clean yet. Confirm database and service health before reading deeper admin views.",
        to: routes.systemOperations,
        cta: "Open System Operations",
      };
    }

    if (pilotOverall && pilotOverall !== "pilot_near_ready") {
      return {
        title: "Review readiness gaps",
        detail: "Readiness is not yet in the near-ready state. Check the readiness breakdown before relying on downstream admin pages.",
        to: routes.systemOperations,
        cta: "Review readiness",
      };
    }

    if (selectedClanId > 0 && executiveReading.exposureError) {
      return {
        title: "Confirm clan-admin exposure access",
        detail: "Exposure summary could not be loaded for the current community. Verify the active community context and admin access before relying on exposure pressure.",
        to: routes.exposure,
        cta: "Open Exposure",
      };
    }

    if (identityInterventionCount > 0) {
      return {
        title:
          identityInterventionCount === 1
            ? "One identity-risk case needs intervention"
            : `${identityInterventionCount} identity-risk cases need intervention`,
        detail:
          "Severe identity overlap is visible right now. Review the grouped high-risk users before moving into softer trend reading.",
        to: routes.identityRisk,
        cta: "Open Identity Risk",
      };
    }

    if (bankUnmatchedRows.length > 0) {
      return {
        title:
          bankUnmatchedRows.length === 1
            ? "One bank event is still unmatched"
            : `${bankUnmatchedRows.length} bank events are still unmatched`,
        detail:
          "The money path needs reconciliation attention before you trust downstream finance or support readings.",
        to: routes.bankConsole,
        cta: "Open Bank Console",
      };
    }

    if (urgentIncompleteCount > 0) {
      return {
        title:
          urgentIncompleteCount === 1
            ? "One incomplete loan is nearing auto-cancel"
            : `${urgentIncompleteCount} incomplete loans are nearing auto-cancel`,
        detail:
          "The unresolved loan queue now has items running short on time. Review approval progress and coverage before they fall out of the active path.",
        to: routes.incompleteLoans,
        cta: "Open Incomplete Loans",
      };
    }

    if (trustEventMix.weakened + trustEventMix.repair > 0) {
      return {
        title: "Review recent trust-event pressure",
        detail:
          "Recent trust events already show weakened or repair-needed signals. Read the event trail before assuming the current environment is calm.",
        to: routes.trustEvents,
        cta: "Open Trust Events",
      };
    }

    if (!isPlatformAdmin) {
      return {
        title: "Use the community-admin route that matches the current risk",
        detail:
          "Start from the executive reading below, then move into Exposure, Bank Console, or Revenue Allocation when the summary shows the area that needs attention.",
        to: routes.exposure,
        cta: "Open Exposure",
      };
    }

    return {
      title: "Use the route that matches the current risk",
      detail:
        "Start from the executive reading below, then move into Trust Analytics, System Operations, Exposure, or Trust Events only when the summary shows the area that needs attention.",
      to: routes.trustAnalytics,
      cta: "Open Trust Analytics",
    };
  }, [
    bankUnmatchedRows.length,
    executiveReading.exposureError,
    identityInterventionCount,
    isPlatformAdmin,
    pilotOverall,
    routes.bankConsole,
    routes.exposure,
    routes.identityRisk,
    routes.incompleteLoans,
    routes.systemOperations,
    routes.trustAnalytics,
    routes.trustEvents,
    selectedClanId,
    systemOk,
    trustEventMix.repair,
    trustEventMix.weakened,
    urgentIncompleteCount,
  ]);

  function toggleSection(key: keyof CollapseState) {
    setCollapsed((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function updatePilotField<K extends keyof PilotWorksheet>(
    key: K,
    value: PilotWorksheet[K]
  ) {
    setPilotWorksheet((prev) => ({
      ...prev,
      [key]: value,
    }));
  }

  const pilotReadinessChecks = useMemo(() => {
    const checks = [
      {
        key: "deploymentReady",
        label: "Public deployment ready",
        detail:
          "Frontend, backend, and database are reachable for participants outside your local network.",
      },
      {
        key: "analyticsReady",
        label: "Analytics and error logging ready",
        detail:
          "Key verification routes and failures can be measured instead of relying only on chat feedback.",
      },
      {
        key: "supportChannelReady",
        label: "Support channel ready",
        detail:
          "Participants know where to report friction, screenshots, and failed assumptions.",
      },
      {
        key: "dailyReviewReady",
        label: "Daily readiness review ready",
        detail:
          "The team is prepared to review readiness data frequently instead of waiting until the end.",
      },
    ] as const;

    return checks;
  }, []);

  if (loading) {
    return (
      <div style={adminShell()}>
        <div style={adminInner(1180)}>
          <PageTopNav
            sectionLabel="Command Center"
            title="Trust Command Centre"
            subtitle="Loading the command center..."
            homeTo={routes.dashboard}
            homeLabel="Dashboard"
            backTo={routes.dashboard}
          />

          <section style={pageCard("#FFFFFF")}>
            <div style={{ color: "#64748B", lineHeight: 1.8 }}>
              Loading command center...
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div style={adminShell()}>
      <div style={adminInner(1180)}>
        <PageTopNav
          sectionLabel="Command Center"
          title="Trust Command Centre"
          subtitle="Review trust and community operations here, then move into the admin page required for the current task."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.dashboard}
        />

      <ExplainToggle
        label="What this screen does"
        what="This screen is the calmer entry point into the trust admin tools, keeping the major operational routes visible together before you move into one specific admin task."
        why="It prevents trust work from feeling like one raw admin wall and helps you pick the right page for the current job."
        next="Read the overview first, then use the command summary and command routes to move into the one admin page that fits the task in front of you."
        tone="light"
      />

      <section
        style={pageCard("linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)")}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Operator overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Welcome, {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), color: "#D7E3F1", maxWidth: 860 }}>
              Start here for a calmer view than a raw admin console, then move into the page required for the current job and your current admin scope.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Role: {roleLabel}</span>
              <span style={badge(false)}>Community context: {communityLabel}</span>
              <span style={badge(false)}>
                {isPlatformAdmin ? "Platform admin page" : isClanAdmin ? "Clan-admin page" : "Admin-led page"}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>How to use this page</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={helperText()}>
                Start here before moving into the admin page you need.
              </div>
              <div style={helperText()}>
                Pick the specific admin page that matches the current task instead of scanning everything at once.
              </div>
              <div style={helperText()}>
                Keep member work in the member pages. Keep system work here.
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
            <div style={sectionLabel()}>Executive reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Existing backend truth is surfaced here first before you open the deeper admin route.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("executive")}
            stableHeight={44}
            debugId="trust-command.toggle.executive"
            style={collapseToggle()}
          >
            {collapsed.executive ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="What this executive reading does"
          what="This section gathers system health, protocol stage, operational readiness, liquidity, and exposure pressure into one calmer admin reading."
          why="It exposes backend truth that already exists so you do not have to open several admin routes just to work out the current operating state."
          next="Read the cards first, then follow the next-action lane into the one admin route that matches the strongest current issue."
          tone="light"
          style={{ marginTop: 14 }}
        />

        {!collapsed.executive ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div style={softCard("#F8FBFF")}>
              <div style={sectionLabel()}>Current next action</div>
              <div
                style={{
                  marginTop: 10,
                  color: "#0B1F33",
                  fontSize: 20,
                  fontWeight: 900,
                  lineHeight: 1.28,
                }}
              >
                {executiveNextAction.title}
              </div>
              <div style={{ marginTop: 10, ...helperText() }}>{executiveNextAction.detail}</div>

              <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StableCtaLink
                  to={executiveNextAction.to}
                  kind="primary"
                  debugId="trust-command.executive.next-action"
                >
                  {executiveNextAction.cta}
                </StableCtaLink>
                {isPlatformAdmin ? (
                  <StableCtaLink
                    to={routes.systemOperations}
                    kind="secondary"
                    debugId="trust-command.executive.system-operations"
                  >
                    System Operations
                  </StableCtaLink>
                ) : (
                  <StableCtaLink
                    to={routes.bankConsole}
                    kind="secondary"
                    debugId="trust-command.executive.bank-console"
                  >
                    Bank Console
                  </StableCtaLink>
                )}
                <StableCtaLink
                  to={routes.exposure}
                  kind="soft"
                  debugId="trust-command.executive.exposure"
                >
                  Exposure
                </StableCtaLink>
              </div>
            </div>

            {routeWarnings.length > 0 ? (
              <div style={{ ...innerCard("#FFF7ED"), border: "1px solid rgba(234,88,12,0.18)" }}>
                <div style={sectionLabel()}>Admin access note</div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {routeWarnings.map((warning, index) => (
                    <div
                      key={`${warning}-${index}`}
                      style={{
                        color: "#9A3412",
                        fontWeight: 800,
                        lineHeight: 1.6,
                      }}
                    >
                      {warning}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {executiveLoading ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                Loading executive reading...
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr 1fr" : "repeat(5, minmax(0, 1fr))",
                  gap: 12,
                }}
              >
                <div style={statTile()}>
                  <div style={sectionLabel()}>System health</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.25,
                    }}
                  >
                    {systemOk ? "Healthy" : "Needs review"}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Database: {firstTruthy(executiveReading.systemHealth?.database, "unknown")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Protocol stage</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.25,
                    }}
                  >
                    {protocolStage.replace(/_/g, " ")}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Next priority: {firstTruthy(protocolNextPriorities[0], "Not specified")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Operational readiness</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.25,
                    }}
                  >
                    {readinessStatusLabel(pilotOverall)}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Ready: {Number(executiveReading.pilotReadiness?.ready_count || 0)} • Partial: {Number(executiveReading.pilotReadiness?.partial_count || 0)}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Clan liquidity</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.25,
                    }}
                  >
                    {formatNumber(liquidity?.lockedTotal || 0)} locked
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    Active loans: {Number(liquidity?.activeLoansCount || 0)} • Pledged: {safeStr(liquidity?.pledgedTotal || "0")}
                  </div>
                </div>

                <div style={statTile()}>
                  <div style={sectionLabel()}>Exposure pressure</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.25,
                    }}
                  >
                    {exposureTotals ? `${formatNumber(exposureTotals.exposure)} exposed` : "Unavailable"}
                  </div>
                  <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                    {exposureTotals
                      ? `Available: ${formatNumber(exposureTotals.available)} • Pool: ${formatNumber(exposureTotals.pool)}`
                      : selectedClanId > 0
                      ? "Exposure totals could not be confirmed."
                      : "Select a current community first."}
                  </div>
                </div>
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
            <div style={sectionLabel()}>Readiness validation</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep worldwide verification assumptions and the data you need visible from the admin landing page.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("pilot")}
            stableHeight={44}
            debugId="trust-command.toggle.pilot"
            style={collapseToggle()}
          >
            {collapsed.pilot ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="What this validation section does"
          what="This section turns readiness checks into an admin operating view by combining backend readiness with the assumptions and data that matter during a worldwide verification window."
          why="It keeps validation from becoming only anecdotal feedback and helps admins review whether the product is being checked with enough structure to learn from it."
          next="Read the current readiness first, then use the assumption cards and data checklist to guide what should be measured during verification."
          tone="light"
          style={{ marginTop: 14 }}
        />

        {!collapsed.pilot ? (
          <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.2fr) minmax(0, 0.8fr)",
                gap: 12,
              }}
            >
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Validation worksheet</div>
                <div style={{ marginTop: 10, ...helperText() }}>
                  Fill this in as your working validation brief. It stays saved in this browser so you can keep updating it as verification evolves.
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={sectionLabel()}>Validation name</div>
                    <input
                      value={pilotWorksheet.pilotName}
                      onChange={(e) => updatePilotField("pilotName", e.target.value)}
                      placeholder="Example: April global verification"
                      style={{ marginTop: 8, ...inputField(false) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Launch window</div>
                    <input
                      value={pilotWorksheet.launchWindow}
                      onChange={(e) => updatePilotField("launchWindow", e.target.value)}
                      placeholder="Example: 22 Apr - 06 May"
                      style={{ marginTop: 8, ...inputField(false) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Countries or regions</div>
                    <textarea
                      value={pilotWorksheet.countries}
                      onChange={(e) => updatePilotField("countries", e.target.value)}
                      placeholder="Example: Nigeria, UK, Kenya, India, Canada"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Target roles</div>
                    <textarea
                      value={pilotWorksheet.targetRoles}
                      onChange={(e) => updatePilotField("targetRoles", e.target.value)}
                      placeholder="Example: ordinary member, clan admin, platform admin"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Devices and browsers</div>
                    <textarea
                      value={pilotWorksheet.devices}
                      onChange={(e) => updatePilotField("devices", e.target.value)}
                      placeholder="Example: Android Chrome, iPhone Safari, desktop Chrome, desktop Edge"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Key events to capture</div>
                    <textarea
                      value={pilotWorksheet.keyEvents}
                      onChange={(e) => updatePilotField("keyEvents", e.target.value)}
                      placeholder="Example: cover_open, join_started, community_selected, support_request_sent"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Success signals</div>
                    <textarea
                      value={pilotWorksheet.successSignals}
                      onChange={(e) => updatePilotField("successSignals", e.target.value)}
                      placeholder="What will tell you the verification assumptions are holding up?"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>

                  <div>
                    <div style={sectionLabel()}>Open assumptions</div>
                    <textarea
                      value={pilotWorksheet.openAssumptions}
                      onChange={(e) => updatePilotField("openAssumptions", e.target.value)}
                      placeholder="Which assumptions are you testing across regions, roles, and devices?"
                      style={{ marginTop: 8, ...inputField(true) }}
                    />
                  </div>
                </div>

                <div style={{ marginTop: 12 }}>
                  <div style={sectionLabel()}>Validation notes</div>
                  <textarea
                    value={pilotWorksheet.notes}
                    onChange={(e) => updatePilotField("notes", e.target.value)}
                    placeholder="Use this for recruiting notes, rollout decisions, and daily verification observations."
                    style={{ marginTop: 8, ...inputField(true), minHeight: 150 }}
                  />
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Quick readiness checks</div>
                <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                  {pilotReadinessChecks.map((check) => {
                    const checked = Boolean(pilotWorksheet[check.key]);
                    return (
                      <label
                        key={check.key}
                        style={{
                          display: "grid",
                          gap: 6,
                          borderRadius: 14,
                          border: "1px solid rgba(11,31,51,0.08)",
                          background: "#FFFFFF",
                          padding: 12,
                          cursor: "pointer",
                        }}
                      >
                        <span
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            color: "#0B1F33",
                            fontWeight: 900,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              updatePilotField(check.key, e.target.checked)
                            }
                          />
                          {check.label}
                        </span>
                        <span style={helperText()}>{check.detail}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 12,
              }}
            >
              <div style={softCard("#F8FBFF")}>
                <div style={sectionLabel()}>Current readiness</div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 20,
                    lineHeight: 1.28,
                  }}
                >
                  {readinessStatusLabel(pilotOverall)}
                </div>
                <div style={{ marginTop: 10, ...helperText() }}>
                  Ready {Number(executiveReading.pilotReadiness?.ready_count || 0)} • Partial{" "}
                  {Number(executiveReading.pilotReadiness?.partial_count || 0)} • Blocked{" "}
                  {Number(executiveReading.pilotReadiness?.blocked_count || 0)}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Validation question</div>
                <div
                  style={{
                    marginTop: 10,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.28,
                  }}
                >
                  Are people in different places understanding the right route and finishing the right action without help?
                </div>
                <div style={{ marginTop: 10, ...helperText() }}>
                  Treat this as assumption validation, not only bug hunting. The strongest signal is whether users and admins understand what to do next from each route.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {PILOT_ASSUMPTION_CARDS.map((card) => (
                <div key={card.title} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 15,
                    }}
                  >
                    {card.title}
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>{card.detail}</div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
                gap: 12,
              }}
            >
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Validation data checklist</div>
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  {PILOT_DATA_CARDS.map((card) => (
                    <div key={card.title}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          fontSize: 15,
                        }}
                      >
                        {card.title}
                      </div>
                      <div style={{ marginTop: 6, ...helperText() }}>{card.detail}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Readiness checks from backend</div>
                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {pilotPriorityChecks.slice(0, 6).map((check) => {
                    const status = safeStr(check?.status).toLowerCase();
                    return (
                      <div
                        key={firstTruthy(check?.key, check?.label, Math.random())}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 10,
                          alignItems: "center",
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ color: "#0B1F33", fontWeight: 800 }}>
                          {firstTruthy(check?.label, check?.key, "Readiness check")}
                        </div>
                        <span
                          style={badge(status === "ready")}
                        >
                          {status || "unknown"}
                        </span>
                      </div>
                    );
                  })}
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
            <div style={sectionLabel()}>Command summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Live route signals stay visible together here before you drill into one operational page.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("overview")}
            stableHeight={44}
            debugId="trust-command.toggle.overview"
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        <ExplainToggle
          label="What this does"
          what="This command summary shows live readings for the main admin routes so you can see which lane already has visible pressure before opening it."
          why="It keeps the command centre from being just a route list and turns it into an executive overview of the live admin workload."
          next="Read the strongest signals first, then move into the matching admin route only when its summary shows the current issue."
          tone="light"
          style={{ marginTop: 14 }}
        />

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
              <div style={sectionLabel()}>Trust Analytics</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {trustEventMix.weakened + trustEventMix.repair > 0
                  ? `${trustEventMix.weakened + trustEventMix.repair} pressure signals visible`
                  : "Reading and trend view"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Built {trustEventMix.built} • Protected {trustEventMix.protected}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Trust Events</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {trustEventRows.length > 0
                  ? `${trustEventRows.length} recent events`
                  : "Recent event oversight"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Latest:{" "}
                {latestTrustEvent
                  ? `${firstTruthy(
                      latestTrustEvent?.event_type,
                      latestTrustEvent?.kind,
                      latestTrustEvent?.type,
                      "trust.event"
                    )} • ${safeDateTime(latestTrustEvent?.created_at)}`
                  : "No recent event loaded"}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>System Operations</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {systemOk ? "Healthy operations view" : "Operational review needed"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Protocol: {protocolStage.replace(/_/g, " ")} • Readiness:{" "}
                {readinessStatusLabel(pilotOverall)}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Exposure</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {selectedClanId > 0 && exposureTotals
                  ? `${formatNumber(exposureTotals.exposure)} exposed`
                  : "Risk and concentration view"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                {selectedClanId > 0 && exposureTotals
                  ? `Pool ${formatNumber(exposureTotals.pool)} • Available ${formatNumber(
                      exposureTotals.available
                    )}`
                  : "Choose a community to load clan-specific exposure totals."}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Trust Graph</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                Relationship structure view
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Identity Risk</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {identityRiskGroups.length > 0
                  ? `${identityRiskGroups.length} users flagged`
                  : "Device and cluster review"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                Intervention: {identityInterventionCount} • Signals:{" "}
                {identityRiskRows.length}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Incomplete Loans</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {selectedClanId > 0
                  ? `${incompleteLoanRows.length} unresolved items`
                  : "Active unresolved queue"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                {selectedClanId > 0
                  ? `Ending soon: ${urgentIncompleteCount} • Community: ${communityLabel}`
                  : "Choose a community to load the admin incomplete-loan queue."}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Bank Console</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                {selectedClanId > 0
                  ? `${bankUnmatchedRows.length} unmatched items`
                  : "Reconciliation operations"}
              </div>
              <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                {selectedClanId > 0
                  ? `Recent ${bankRecentRows.length} • Expected ${expectedPaymentRows.length}`
                  : "Choose a community to load bank and reconciliation pressure."}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Revenue Allocation</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.25,
                }}
              >
                Fee and distribution view
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
            <div style={sectionLabel()}>Command routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Enter the admin page you need instead of carrying too much at once.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("routes")}
            stableHeight={44}
            debugId="trust-command.toggle.routes"
            style={collapseToggle()}
          >
            {collapsed.routes ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.routes ? (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            {routeCards.map((card) => (
              <StableCtaLink
                key={card.to}
                to={card.to}
                kind={card.primary ? "primary" : "secondary"}
                debugId={`trust-command.route.${card.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                style={routeTile(Boolean(card.primary))}
              >
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.3,
                  }}
                >
                  {card.label}
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  {card.detail}
                </div>
              </StableCtaLink>
            ))}
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
            <div style={sectionLabel()}>Operator workflows</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Pick the right command path for the job you are actually doing.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("workflows")}
            stableHeight={44}
            debugId="trust-command.toggle.workflows"
            style={collapseToggle()}
          >
            {collapsed.workflows ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.workflows ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
              gap: 12,
            }}
          >
            {workflowCards.map((card, index) => (
              <div
                key={`${card.title}-${index}`}
                style={innerCard(card.accent ? "#F8FBFF" : "#FFFFFF")}
              >
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 15,
                  }}
                >
                  {card.title}
                </div>
                <div style={{ marginTop: 8, ...helperText() }}>{card.detail}</div>
              </div>
            ))}
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
            <div style={sectionLabel()}>Separation of layers</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the admin workspace distinct from the ordinary member side.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("notes")}
            stableHeight={44}
            debugId="trust-command.toggle.notes"
            style={collapseToggle()}
          >
            {collapsed.notes ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.notes ? (
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
                Member pages stay user-facing
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Dashboard, Marketplace, Trust Passport, TrustSlip, Community Home, and Notifications should remain readable and calmer for ordinary users.
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
                Command pages stay admin-led
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                The admin workspace can hold more system detail, but it should still be organized enough that an admin can move without confusion.
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Where next</div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          {whereNextActions.map((item) => (
            <StableCtaLink
              key={item.to}
              to={item.to}
              kind={item.kind}
              debugId={`trust-command.next.${item.label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
            >
              {item.label}
            </StableCtaLink>
          ))}
        </div>
        </section>
      </div>
    </div>
  );
}

