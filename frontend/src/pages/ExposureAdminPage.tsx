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
  getAdminIncompleteLoans,
  getCurrentClan,
  getExposureAdmin,
  getMe,
  getSelectedClanId,
  listAdminPoolPending,
  listMarketplaceRequests,
  listUnmatchedBankEvents,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type CollapseState = {
  overview: boolean;
  pressure: boolean;
  queues: boolean;
  routes: boolean;
};

type ExposureRow = {
  user_id?: number;
  email?: string | null;
  role?: string | null;
  pool?: string | number | null;
  exposure?: string | number | null;
  available?: string | number | null;
};

type DemandRow = {
  id?: number;
  title?: string | null;
  description?: string | null;
  status?: string | null;
  urgency?: string | null;
  requesterName?: string | null;
  createdAt?: string | null;
};

const EXPOSURE_ADMIN_UI_STORAGE_KEY = "gmfn.exposureAdmin.sections.v1";

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

function toNum(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n : 0;
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

function daysSince(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 9999;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function normalizeDemandRow(raw: any): DemandRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.request || raw;

  return {
    id: positiveNumber(src?.id || src?.request_id) || undefined,
    title: firstTruthy(src?.title, src?.name, src?.summary, "Demand"),
    description: firstTruthy(
      src?.description,
      src?.detail,
      src?.message,
      src?.summary
    ),
    status: firstTruthy(src?.status, "open"),
    urgency: firstTruthy(src?.urgency, src?.priority),
    requesterName: firstTruthy(
      src?.requester_name,
      src?.requester_nickname,
      src?.member_name,
      src?.display_name,
      src?.email
    ),
    createdAt: firstTruthy(src?.created_at),
  };
}

function pressureTone(value: "low" | "medium" | "high") {
  if (value === "high") {
    return {
      bg: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.16)",
      text: "#991B1B",
    };
  }

  if (value === "medium") {
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    border: "1px solid rgba(20,52,83,0.24)",
    boxShadow:
      "0 30px 62px rgba(7,20,36,0.12), 0 8px 18px rgba(7,20,36,0.045), inset 0 1px 0 rgba(255,255,255,0.88), inset 0 -14px 28px rgba(18,52,86,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    border: "1px solid rgba(20,52,83,0.20)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    border: "1px solid rgba(20,52,83,0.18)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    border: "1px solid rgba(20,52,83,0.16)",
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
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(122,152,195,0.20)",
    background: primary ? "linear-gradient(180deg, #F8FCFF 0%, #E5F0FF 100%)" : "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 18px 38px rgba(29,95,212,0.12)" : "0 16px 32px rgba(15,23,42,0.065)",
  };
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
    background: primary ? "rgba(29,95,212,0.12)" : "rgba(160,178,201,0.18)",
    color: primary ? "#0B63D1" : "#31506D",
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
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "normal",
    textAlign: "center",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4E6680",
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
    pressure: false,
    queues: true,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    pressure: Boolean(raw?.pressure ?? base.pressure),
    queues: Boolean(raw?.queues ?? base.queues),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function ExposureAdminPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "exposure-admin.nav.dashboard"),
      commandCenter: routeTarget(
        "adminCommand",
        selectedClanId,
        "exposure-admin.nav.command-center"
      ),
      systemOperations: routeTarget(
        "systemOperations",
        selectedClanId,
        "exposure-admin.route.system-operations"
      ),
      trustAnalytics: routeTarget(
        "trustAnalytics",
        selectedClanId,
        "exposure-admin.route.trust-analytics"
      ),
      trustGraph: routeTarget(
        "trustGraph",
        selectedClanId,
        "exposure-admin.route.trust-graph"
      ),
      bankConsole: routeTarget(
        "bankConsole",
        selectedClanId,
        "exposure-admin.route.bank-console"
      ),
      incompleteLoans: routeTarget(
        "incompleteLoans",
        selectedClanId,
        "exposure-admin.route.incomplete-loans"
      ),
      demandBox: routeTarget("demandBox", selectedClanId, "exposure-admin.route.demand-box"),
    }),
    [selectedClanId]
  );

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(EXPOSURE_ADMIN_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [exposureRows, setExposureRows] = useState<ExposureRow[]>([]);
  const [exposureTotals, setExposureTotals] = useState<any>(null);
  const [exposureError, setExposureError] = useState<string>("");
  const [incompleteLoans, setIncompleteLoans] = useState<any[]>([]);
  const [pendingPool, setPendingPool] = useState<any[]>([]);
  const [bankUnmatched, setBankUnmatched] = useState<any[]>([]);
  const [demands, setDemands] = useState<DemandRow[]>([]);

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
    writeLocalJSON(EXPOSURE_ADMIN_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, exposureRes, incompleteLoansRes, pendingPoolRes, bankUnmatchedRes, demandsRes] =
          await Promise.all([
            getMe().catch(() => null),
            getCurrentClan().catch(() => null),
            selectedClanId > 0
              ? getExposureAdmin(selectedClanId).catch((error: any) => ({
                  __error: safeStr(
                    error?.message || error || "Exposure summary unavailable."
                  ),
                }))
              : Promise.resolve(null),
            selectedClanId > 0
              ? getAdminIncompleteLoans(selectedClanId, 100).catch(() => ({ items: [] }))
              : Promise.resolve({ items: [] }),
            selectedClanId > 0
              ? listAdminPoolPending(selectedClanId, 50).catch(() => ({ items: [] }))
              : Promise.resolve({ items: [] }),
            selectedClanId > 0
              ? listUnmatchedBankEvents(selectedClanId).catch(() => ({ items: [] }))
              : Promise.resolve({ items: [] }),
            listMarketplaceRequests({
              clan_id: selectedClanId || undefined,
              status: "open",
              limit: 60,
            }).catch(() => []),
          ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setExposureRows(
          exposureRes && typeof exposureRes === "object" && !exposureRes.__error
            ? (rowsOf<any>(exposureRes) as ExposureRow[])
            : []
        );
        setExposureTotals(
          exposureRes && typeof exposureRes === "object" && !exposureRes.__error
            ? exposureRes?.totals || null
            : null
        );
        setExposureError(
          exposureRes && typeof exposureRes === "object" && exposureRes.__error
            ? safeStr(exposureRes.__error)
            : ""
        );
        setIncompleteLoans(rowsOf<any>(incompleteLoansRes));
        setPendingPool(rowsOf<any>(pendingPoolRes));
        setBankUnmatched(rowsOf<any>(bankUnmatchedRes));
        setDemands(
          rowsOf<any>(demandsRes)
            .map((row) => normalizeDemandRow(row))
            .filter(Boolean) as DemandRow[]
        );
      } finally {
        if (alive) setLoading(false);
      }
    })();

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
    return (
      firstTruthy(me?.role, me?.account_role, me?.user_role) || "admin"
    );
  }, [me]);

  const exposedMembers = useMemo(
    () => exposureRows.filter((row) => toNum(row?.exposure) > 0),
    [exposureRows]
  );
  const exposedMembersAtRisk = useMemo(
    () =>
      exposedMembers.filter((row) => {
        const pool = toNum(row?.pool);
        const exposure = toNum(row?.exposure);
        if (exposure <= 0) return false;
        if (pool <= 0) return true;
        return exposure / pool >= 0.75 || toNum(row?.available) <= 0;
      }),
    [exposedMembers]
  );
  const staleDemands = useMemo(
    () => demands.filter((row) => daysSince(row.createdAt) >= 5),
    [demands]
  );
  const urgentIncompleteCount = useMemo(
    () =>
      incompleteLoans.filter((row) => {
        const remaining = toNum(row?.auto_cancel_remaining_seconds);
        return remaining > 0 && remaining <= 60;
      }).length,
    [incompleteLoans]
  );

  const pressureReading = useMemo(() => {
    if (!selectedClanId) {
      return {
        level: "medium" as const,
        title: "Choose the community first.",
        detail:
          "Exposure is community-specific. Select the current community so the admin concentration and queue signals can load in the right place.",
      };
    }

    if (exposureError) {
      return {
        level: "medium" as const,
        title: "Exposure summary is not available here yet.",
        detail:
          "The current community did not return the clan-admin exposure summary. Confirm the selected community and clan-admin access before treating this page as the full concentration view.",
      };
    }

    const pressureScore =
      exposedMembersAtRisk.length * 3 +
      bankUnmatched.length * 2 +
      urgentIncompleteCount * 2 +
      pendingPool.length +
      staleDemands.length * 2 +
      incompleteLoans.length;

    if (pressureScore >= 8) {
      return {
        level: "high" as const,
        title: "Exposure pressure is high.",
        detail:
          "Locked guarantee concentration, stale demand, and unresolved admin queues are stacking together in the current community.",
      };
    }

    if (pressureScore >= 4) {
      return {
        level: "medium" as const,
        title: "Exposure pressure is moderate.",
        detail:
          "There is no major overload yet, but the concentration and admin queue signals still need follow-up before they grow heavier.",
      };
    }

    return {
      level: "low" as const,
      title: "Exposure pressure is currently light.",
      detail:
        "The exposure summary and current admin queues do not suggest a heavy concentration problem right now.",
    };
  }, [
    bankUnmatched.length,
    exposureError,
    exposedMembersAtRisk.length,
    incompleteLoans.length,
    pendingPool.length,
    selectedClanId,
    staleDemands.length,
    urgentIncompleteCount,
  ]);

  const pressureStyle = pressureTone(pressureReading.level);

  const recentQueues = useMemo(() => {
    const exposureQueue = exposedMembersAtRisk.slice(0, 4).map((row) => ({
      key: `member-${firstTruthy(row.user_id, row.email, Math.random())}`,
      title: firstTruthy(
        row.email,
        row.user_id ? `User ${row.user_id}` : "",
        "Exposed member"
      ),
      detail: [
        row.role ? `Role: ${row.role}` : "",
        `Exposure: ${toNum(row.exposure)}`,
        `Available: ${toNum(row.available)}`,
      ]
        .filter(Boolean)
        .join(" | "),
      route: routes.trustGraph,
      routeLabel: "Open Trust Graph",
    }));

    const incompleteQueue = incompleteLoans.slice(0, 4).map((row) => ({
      key: `incomplete-${firstTruthy(row.id, row.loan_id, Math.random())}`,
      title: `Incomplete loan ${firstTruthy(row.loan_id, row.id, "")}`.trim(),
      detail: [
        `Approved ${toNum(row.approved_count)} / ${toNum(row.required_count)}`,
        row.required_gap != null ? `Gap ${toNum(row.required_gap)}` : "",
        toNum(row.auto_cancel_remaining_seconds) > 0
          ? `${toNum(row.auto_cancel_remaining_seconds)}s remaining`
          : "",
      ]
        .filter(Boolean)
        .join(" | "),
      route: routes.incompleteLoans,
      routeLabel: "Open Incomplete Loans",
    }));

    const bankQueue = bankUnmatched.slice(0, 4).map((row) => ({
      key: `bank-${firstTruthy(row.id, row.reference, Math.random())}`,
      title: "Unmatched bank event",
      detail: [
        firstTruthy(row.reference, row.reference_raw, "No reference"),
        row.amount && row.currency ? `${row.amount} ${row.currency}` : "",
        firstTruthy(row.status, row.status_reason),
      ]
        .filter(Boolean)
        .join(" | "),
      route: routes.bankConsole,
      routeLabel: "Open Bank Console",
    }));

    const demandQueue = staleDemands.slice(0, 4).map((row) => ({
      key: `demand-${firstTruthy(row.id, row.title, Math.random())}`,
      title: firstTruthy(row.title, "Demand"),
      detail: [
        row.requesterName ? `Requester: ${row.requesterName}` : "",
        row.createdAt ? `Opened: ${safeDateTime(row.createdAt)}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      route: routes.demandBox,
      routeLabel: "Open Demand Box",
    }));

    const poolQueue = pendingPool.slice(0, 4).map((row) => ({
      key: `pool-${firstTruthy(row.id, row.reference, Math.random())}`,
      title: "Pending pool confirmation",
      detail: [
        firstTruthy(row.event_type, "Pool event"),
        row.amount && row.currency ? `${row.amount} ${row.currency}` : "",
        firstTruthy(row.reference, row.note),
      ]
        .filter(Boolean)
        .join(" | "),
      route: routes.bankConsole,
      routeLabel: "Open Bank Console",
    }));

    return [...bankQueue, ...incompleteQueue, ...exposureQueue, ...poolQueue, ...demandQueue].slice(0, 8);
  }, [bankUnmatched, exposedMembersAtRisk, incompleteLoans, pendingPool, routes, staleDemands]);

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
          sectionLabel="Exposure"
          title="Exposure"
          subtitle="Loading the exposure reading..."
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.commandCenter}
          backLabel="Command Center"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading exposure reading...
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
        sectionLabel="Exposure"
        title="Exposure"
        subtitle="Read concentration, queue pressure, and visible operational load before choosing a deeper intervention path."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen reads concentration, queue pressure, stale demand, and urgent operational signals together."
        why="It helps you understand exposure as a wider operational pressure picture, not only a money concentration number."
        next="Start with the current pressure reading, then move through the exposure summary and visible queues to see where the pressure is coming from."
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
            <div style={sectionLabel()}>Exposure overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Exposure reading for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Exposure is not only about locked money concentration. It also includes stale demand, incomplete admin queues, pending pool work, and unmatched bank pressure.
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
              <span style={badge(false)}>Community: {communityLabel}</span>
              <span style={badge(false)}>Exposure page</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(pressureStyle.bg),
              border: pressureStyle.border,
            }}
          >
            <div style={sectionLabel()}>Current pressure</div>

            <div
              style={{
                marginTop: 10,
                color: pressureStyle.text,
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {pressureReading.title}
            </div>

            <div style={{ marginTop: 10, ...helperText(), color: "#0B1F33" }}>
              {pressureReading.detail}
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This current pressure block turns the exposure signals into one practical reading so you can see whether the system looks calm, stretched, or at risk."
          why="It gives you a clearer priority signal before you dig into summaries, queues, or intervention routes."
          next="Read this first, then use the sections below to confirm which queues or loads are creating the pressure."
          tone="light"
          style={{ marginTop: 14 }}
        />
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
            <div style={sectionLabel()}>Exposure summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of visible concentration and pressure points.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("overview")}
            stableHeight={38}
            debugId="exposure-admin.toggle.overview"
            style={collapseToggle()}
          >
            {collapsed.overview ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.overview ? (
          <div
            style={{
              marginTop: 14,
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr 1fr"
                : "repeat(6, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Exposed members</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {exposedMembers.length}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>At-risk members</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {exposedMembersAtRisk.length}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Total exposure</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {toNum(exposureTotals?.exposure)}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Incomplete loans</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {incompleteLoans.length}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Unmatched bank</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {bankUnmatched.length}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Pending pool</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {pendingPool.length}
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
            <div style={sectionLabel()}>Pressure reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read the different pressure layers separately.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("pressure")}
            stableHeight={38}
            debugId="exposure-admin.toggle.pressure"
            style={collapseToggle()}
          >
            {collapsed.pressure ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.pressure ? (
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
                Concentration pressure
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                This reading shows how much of the current community pool is already locked into exposure and how many members are close to the edge.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Exposed members: {exposedMembers.length}
                </span>
                <span style={badge(false)}>
                  At-risk members: {exposedMembersAtRisk.length}
                </span>
                <span style={badge(false)}>
                  Available buffer: {toNum(exposureTotals?.available)}
                </span>
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
                Queue pressure
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Exposure pressure also rises when stale demand, unmatched bank events, pending pool items, or incomplete loans begin stacking together.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Open demand: {demands.length}</span>
                <span style={badge(false)}>
                  Stale demand: {staleDemands.length}
                </span>
                <span style={badge(false)}>
                  Unmatched bank: {bankUnmatched.length}
                </span>
                <span style={badge(false)}>
                  Pending pool: {pendingPool.length}
                </span>
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
            <div style={sectionLabel()}>Visible queues</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The queues most likely to need attention next.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("queues")}
            stableHeight={38}
            debugId="exposure-admin.toggle.queues"
            style={collapseToggle()}
          >
            {collapsed.queues ? "Open" : "Collapse"}
          </SecondaryButton>
        </div>

        {!collapsed.queues ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentQueues.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible queue pressure is active right now.
              </div>
            ) : (
              recentQueues.map((row) => (
                <div key={row.key} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      alignItems: "center",
                      flexWrap: "wrap",
                    }}
                  >
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        lineHeight: 1.35,
                      }}
                    >
                      {row.title}
                    </div>

                    <StableCtaLink
                      to={row.route}
                      kind="secondary"
                      debugId={`exposure-admin.queue.${row.key}.route`}
                    >
                      {row.routeLabel}
                    </StableCtaLink>
                  </div>

                  <div style={{ marginTop: 8, ...helperText() }}>{row.detail}</div>
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
              Move from exposure reading into the next page you need.
            </div>
          </div>

          <SecondaryButton
            onClick={() => toggleSection("routes")}
            stableHeight={38}
            debugId="exposure-admin.toggle.routes"
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
            <StableCtaLink
              to={routes.systemOperations}
              kind="primary"
              debugId="exposure-admin.route.system-operations"
              style={routeTile(true)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                System Operations
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work needs live handling and immediate intervention.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.trustAnalytics}
              debugId="exposure-admin.route.trust-analytics"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Trust Analytics
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is pattern reading rather than exposure-heavy handling.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.trustGraph}
              debugId="exposure-admin.route.trust-graph"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Trust Graph
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is structural relationship analysis behind concentration or pressure.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.bankConsole}
              debugId="exposure-admin.route.bank-console"
              style={routeTile(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Bank Console
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is about unmatched bank events, pending pool confirmation, or expected money-path cleanup.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
