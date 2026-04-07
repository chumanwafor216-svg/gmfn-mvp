import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getMyNotifications,
  getSelectedClanId,
  listMarketplaceRequests,
  listMyLoans,
} from "../lib/api";

type CollapseState = {
  overview: boolean;
  pressure: boolean;
  queues: boolean;
  routes: boolean;
};

type RawNotificationRow = {
  id: string;
  title: string;
  detail: string;
  kind: string;
  unread: boolean;
  createdAt: string;
};

type LoanRow = {
  id?: number;
  status?: string | null;
  title?: string | null;
  role?: string | null;
  borrowerName?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  createdAt?: string | null;
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

function daysSince(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 9999;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function normalizeLoanRow(raw: any): LoanRow | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;

  return {
    id: positiveNumber(src?.id || src?.loan_id) || undefined,
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
    amount: src?.amount ?? src?.principal_amount ?? src?.requested_amount,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN"),
    createdAt: firstTruthy(src?.created_at, src?.requested_at),
  };
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

function normalizeNotificationRow(raw: any): RawNotificationRow {
  return {
    id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
    kind: firstTruthy(raw?.kind, raw?.title, "update"),
    title: firstTruthy(raw?.title, raw?.kind, "Update"),
    detail: firstTruthy(
      raw?.message,
      raw?.detail,
      "Review this signal and continue from the right page."
    ),
    unread: !raw?.is_read,
    createdAt: firstTruthy(raw?.created_at),
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

function eventPressureLabel(row: RawNotificationRow): "high" | "medium" | "low" {
  const text = [safeStr(row.kind), safeStr(row.title), safeStr(row.detail)]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("failed") ||
    text.includes("error") ||
    text.includes("urgent") ||
    text.includes("default") ||
    text.includes("overdue") ||
    text.includes("declined") ||
    text.includes("immediate")
  ) {
    return "high";
  }

  if (
    text.includes("pending") ||
    text.includes("warning") ||
    text.includes("reminder") ||
    text.includes("late") ||
    text.includes("due") ||
    text.includes("follow up")
  ) {
    return "medium";
  }

  return "low";
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

export default function ExposureAdminPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

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
  const [notifications, setNotifications] = useState<RawNotificationRow[]>([]);
  const [loans, setLoans] = useState<LoanRow[]>([]);
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
        const [meRes, clanRes, notificationsRes, loansRes, demandsRes] =
          await Promise.all([
            getMe().catch(() => null),
            getCurrentClan().catch(() => null),
            getMyNotifications(60, false).catch(() => ({ items: [] })),
            listMyLoans().catch(() => []),
            listMarketplaceRequests({
              clan_id: selectedClanId || undefined,
              status: "open",
              limit: 60,
            }).catch(() => []),
          ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setNotifications(rowsOf<any>(notificationsRes).map((row) => normalizeNotificationRow(row)));
        setLoans(
          rowsOf<any>(loansRes)
            .map((row) => normalizeLoanRow(row))
            .filter(Boolean) as LoanRow[]
        );
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
      ) || (selectedClanId ? `Community ${selectedClanId}` : "No selected community")
    );
  }, [currentClan, selectedClanId]);

  const roleLabel = useMemo(() => {
    return (
      firstTruthy(me?.role, me?.account_role, me?.user_role) || "admin"
    );
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

  const staleDemands = useMemo(
    () => demands.filter((row) => daysSince(row.createdAt) >= 5),
    [demands]
  );

  const urgentSignals = useMemo(
    () => notifications.filter((row) => eventPressureLabel(row) === "high"),
    [notifications]
  );

  const followUpSignals = useMemo(
    () => notifications.filter((row) => eventPressureLabel(row) === "medium"),
    [notifications]
  );

  const pressureReading = useMemo(() => {
    const pressureScore =
      borrowerLoans.length * 2 +
      staleDemands.length * 2 +
      urgentSignals.length * 2 +
      guarantorLoans.length +
      followUpSignals.length;

    if (pressureScore >= 8) {
      return {
        level: "high" as const,
        title: "Visible exposure pressure is high.",
        detail:
          "Borrower-side support pressure, stale demand, and urgent operational signals are stacking together in the visible surface.",
      };
    }

    if (pressureScore >= 4) {
      return {
        level: "medium" as const,
        title: "Visible exposure pressure is moderate.",
        detail:
          "There is no major overload yet, but the visible pressure areas need follow-up before they grow heavier.",
      };
    }

    return {
      level: "low" as const,
      title: "Visible exposure pressure is currently light.",
      detail:
        "The visible support and demand pressure do not suggest a heavy concentration problem right now.",
    };
  }, [
    borrowerLoans.length,
    staleDemands.length,
    urgentSignals.length,
    guarantorLoans.length,
    followUpSignals.length,
  ]);

  const pressureStyle = pressureTone(pressureReading.level);

  const recentQueues = useMemo(() => {
    const loanQueue = activeLoans.slice(0, 4).map((row) => ({
      key: `loan-${row.id}`,
      title: firstTruthy(row.title, "Loan support item"),
      detail: [
        firstTruthy(row.role, "Support"),
        firstTruthy(row.status, "Open"),
        firstTruthy(
          row.borrowerName ? `Borrower: ${row.borrowerName}` : "",
          row.createdAt ? `Started: ${safeDateTime(row.createdAt)}` : ""
        ),
      ]
        .filter(Boolean)
        .join(" • "),
      route: "/app/loans",
      routeLabel: "Open Loans",
    }));

    const demandQueue = staleDemands.slice(0, 4).map((row) => ({
      key: `demand-${row.id}`,
      title: firstTruthy(row.title, "Demand"),
      detail: [
        row.requesterName ? `Requester: ${row.requesterName}` : "",
        row.createdAt ? `Opened: ${safeDateTime(row.createdAt)}` : "",
      ]
        .filter(Boolean)
        .join(" • "),
      route: "/app/demand-box",
      routeLabel: "Open Demand Box",
    }));

    const signalQueue = urgentSignals.slice(0, 4).map((row) => ({
      key: `signal-${row.id}`,
      title: row.title,
      detail: firstTruthy(row.detail, safeDateTime(row.createdAt)),
      route: "/app/notifications",
      routeLabel: "Open Action Inbox",
    }));

    return [...signalQueue, ...loanQueue, ...demandQueue].slice(0, 8);
  }, [activeLoans, staleDemands, urgentSignals]);

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
          subtitle="Preparing the exposure reading surface..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/command-center"
          backLabel="Command Center"
          nextLinks={[
            { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
            { label: "System Operations", to: "/app/command-center/system-operations" },
          ]}
          utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading exposure view...
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
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
        nextLinks={[
          { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
          { label: "System Operations", to: "/app/command-center/system-operations" },
        ]}
        utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
      />

      <section
        style={pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)")}
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
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Exposure reading for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Exposure is not only about money concentration. It also includes queue pressure, stale demand, borrower-side load, guarantor-side load, and urgent operational signals.
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
              <span style={badge(false)}>Exposure surface</span>
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
                : "repeat(6, minmax(0, 1fr))",
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
              <div style={sectionLabel()}>Borrower load</div>
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
              <div style={sectionLabel()}>Guarantor load</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {guarantorLoans.length}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Stale demand</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {staleDemands.length}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Urgent signals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {urgentSignals.length}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Follow-up signals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {followUpSignals.length}
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

          <button
            type="button"
            onClick={() => toggleSection("pressure")}
            style={collapseToggle()}
          >
            {collapsed.pressure ? "Open" : "Collapse"}
          </button>
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
                Support-side pressure
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Borrower-side active load and guarantor-side active load together indicate how much support pressure is currently visible in the surface.
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
                  Borrower load: {borrowerLoans.length}
                </span>
                <span style={badge(false)}>
                  Guarantor load: {guarantorLoans.length}
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
                Demand-side pressure
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Open demand becomes an exposure concern when it stays stale, drifts without closure, or begins stacking alongside other urgent signals.
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
              The queues most likely to need operator attention next.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("queues")}
            style={collapseToggle()}
          >
            {collapsed.queues ? "Open" : "Collapse"}
          </button>
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

                    <Link to={row.route} style={actionBtn("secondary")}>
                      {row.routeLabel}
                    </Link>
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
            <div style={sectionLabel()}>Working routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from exposure reading into the exact next surface you need.
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
                : "repeat(2, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <Link to="/app/command-center/system-operations" style={routeTile(true)}>
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
                Use this when the work is live operational handling and immediate intervention.
              </div>
            </Link>

            <Link to="/app/command-center/trust-analytics" style={routeTile(false)}>
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
                Use this when the work is pattern reading rather than exposure-heavy handling.
              </div>
            </Link>

            <Link to="/app/command-center/trust-graph" style={routeTile(false)}>
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
                Use this when the work is structural relationship analysis behind concentration or pressure.
              </div>
            </Link>

            <Link to="/app/notifications" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Action Inbox
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Use this when the work needs direct queue handling from the member-facing side.
              </div>
            </Link>
          </div>
        ) : null}
      </section>
    </div>
  );
}