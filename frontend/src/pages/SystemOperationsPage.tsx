import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getMyNotifications,
  getSelectedClanId,
} from "../lib/api";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

type RawSystemRow = {
  id: string;
  kind: string;
  title: string;
  detail: string;
  unread: boolean;
  createdAt: string;
  ctaTo: string;
  ctaLabel: string;
};

type CollapseState = {
  overview: boolean;
  signals: boolean;
  queues: boolean;
  routes: boolean;
};

const SYSTEM_OPERATIONS_UI_STORAGE_KEY = "gmfn.systemOperations.sections.v1";

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

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
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
    signals: false,
    queues: true,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    signals: Boolean(raw?.signals ?? base.signals),
    queues: Boolean(raw?.queues ?? base.queues),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

function normalizeSystemRow(raw: any): RawSystemRow {
  const text = [
    safeStr(raw?.kind),
    safeStr(raw?.title),
    safeStr(raw?.message),
    safeStr(raw?.detail),
  ]
    .join(" ")
    .toLowerCase();

  let ctaTo = "/app/notifications";
  let ctaLabel = "Open Action Inbox";

  if (
    text.includes("trust") ||
    text.includes("integrity") ||
    text.includes("identity")
  ) {
    ctaTo = "/app/trust";
    ctaLabel = "Open Trust";
  } else if (
    text.includes("loan") ||
    text.includes("guarantor") ||
    text.includes("payment") ||
    text.includes("withdrawal")
  ) {
    ctaTo = "/app/loans";
    ctaLabel = "Open Loans";
  } else if (text.includes("demand")) {
    ctaTo = "/app/demand-box";
    ctaLabel = "Open Demand Box";
  } else if (
    text.includes("market") ||
    text.includes("shop") ||
    text.includes("spotlight")
  ) {
    ctaTo = "/app/marketplace";
    ctaLabel = "Open Marketplace";
  } else if (
    text.includes("join") ||
    text.includes("approval") ||
    text.includes("community")
  ) {
    ctaTo = "/app/community";
    ctaLabel = "Open Community";
  }

  return {
    id: firstTruthy(raw?.id, raw?.notification_id, raw?.title, raw?.message),
    kind: firstTruthy(raw?.kind, raw?.title, "update"),
    title: firstTruthy(raw?.title, raw?.kind, "Update"),
    detail: firstTruthy(
      raw?.message,
      raw?.detail,
      "Review this update and continue from the right page."
    ),
    unread: !raw?.is_read,
    createdAt: firstTruthy(raw?.created_at),
    ctaTo,
    ctaLabel,
  };
}

function signalTone(row: RawSystemRow): {
  bg: string;
  text: string;
  label: string;
} {
  const text = [safeStr(row.kind), safeStr(row.title), safeStr(row.detail)]
    .join(" ")
    .toLowerCase();

  if (
    text.includes("failed") ||
    text.includes("error") ||
    text.includes("urgent") ||
    text.includes("default") ||
    text.includes("overdue") ||
    text.includes("declined")
  ) {
    return {
      bg: "#FFF5F5",
      text: "#991B1B",
      label: "Immediate attention",
    };
  }

  if (
    text.includes("pending") ||
    text.includes("warning") ||
    text.includes("reminder") ||
    text.includes("late") ||
    text.includes("due")
  ) {
    return {
      bg: "#FFFBEF",
      text: "#92400E",
      label: "Needs follow-up",
    };
  }

  return {
    bg: "#F8FBFF",
    text: "#0B63D1",
    label: "Informational",
  };
}

export default function SystemOperationsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(SYSTEM_OPERATIONS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [guidance, setGuidance] = useState<GuidanceSnapshot | null>(null);
  const [rawSignals, setRawSignals] = useState<RawSystemRow[]>([]);

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
    writeLocalJSON(SYSTEM_OPERATIONS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, guidanceRes, rawRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          buildGuidanceSnapshot().catch(() => null),
          getMyNotifications(40, false).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        const rows = rowsOf<any>(rawRes).map((row) => normalizeSystemRow(row));

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setGuidance(guidanceRes || null);
        setRawSignals(rows);
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

  const summary = useMemo(() => {
    const actNow = guidance?.actionInboxSummary?.actNow?.length || 0;
    const dueSoon = guidance?.actionInboxSummary?.dueSoon?.length || 0;
    const watchAndWait = guidance?.actionInboxSummary?.watchAndWait?.length || 0;
    const unread = guidance?.actionInboxSummary?.unreadCount || 0;

    const immediateSignals = rawSignals.filter((row) => {
      const tone = signalTone(row);
      return tone.label === "Immediate attention";
    }).length;

    const followUpSignals = rawSignals.filter((row) => {
      const tone = signalTone(row);
      return tone.label === "Needs follow-up";
    }).length;

    return {
      actNow,
      dueSoon,
      watchAndWait,
      unread,
      immediateSignals,
      followUpSignals,
    };
  }, [guidance, rawSignals]);

  const operationalFocus = useMemo(() => {
    if (guidance?.actionInboxSummary?.actNow?.length) {
      return guidance.actionInboxSummary.actNow[0];
    }

    if (guidance?.actionInboxSummary?.dueSoon?.length) {
      return guidance.actionInboxSummary.dueSoon[0];
    }

    if (rawSignals.length > 0) {
      return rawSignals[0];
    }

    return null;
  }, [guidance, rawSignals]);

  const recentSignals = useMemo(() => {
    return [...rawSignals]
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 10);
  }, [rawSignals]);

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
          sectionLabel="System Operations"
          title="System Operations"
          subtitle="Loading system operations..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/command-center"
          backLabel="Command Center"
          nextLinks={[
            { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
            { label: "Exposure", to: "/app/command-center/exposure" },
          ]}
          utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading system operations...
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
        sectionLabel="System Operations"
        title="System Operations"
        subtitle="Review live operational reading, handle alerts, and move into the right admin or member page."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
        nextLinks={[
          { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
          { label: "Exposure", to: "/app/command-center/exposure" },
        ]}
        utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
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
              Live operational reading for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Review live operational awareness here when you need to see what is happening now, what needs follow-up, and where to move next.
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
              <span style={badge(false)}>Operational page</span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>What matters now</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {operationalFocus
                ? "There is a visible operational focus."
                : "No immediate operational focus is visible."}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {operationalFocus
                ? safeStr((operationalFocus as any).detail || "Review the top signal and move into the right page.")
                : "No immediate or due-soon signal is currently dominating the visible operational feed."}
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
            <div style={sectionLabel()}>Operational overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of live operational pressure.
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
              <div style={sectionLabel()}>Unread</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.unread}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Act now</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.actNow}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Due soon</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.dueSoon}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Watch</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.watchAndWait}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Immediate signals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.immediateSignals}
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
                {summary.followUpSignals}
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
            <div style={sectionLabel()}>Live operational signals</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The latest visible operational feed, ordered for reading.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("signals")}
            style={collapseToggle()}
          >
            {collapsed.signals ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.signals ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentSignals.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No live operational signal is currently shown.
              </div>
            ) : (
              recentSignals.map((row) => {
                const tone = signalTone(row);

                return (
                  <div key={`${row.id}-${row.createdAt}`} style={innerCard(tone.bg)}>
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

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(true)}>{tone.label}</span>
                        {row.unread ? <span style={badge(false)}>Unread</span> : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>{row.detail}</div>

                    <div
                      style={{
                        marginTop: 10,
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          color: "#64748B",
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {safeDateTime(row.createdAt)}
                      </div>

                      <OriginLink to={row.ctaTo} style={actionBtn("secondary")}>
                        {row.ctaLabel}
                      </OriginLink>
                    </div>
                  </div>
                );
              })
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
            <div style={sectionLabel()}>Operational queues</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read queue pressure before choosing intervention.
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
                Immediate queue
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                This queue is for signals that should not wait long: act-now items, failures, urgent follow-ups, and visible disruptions.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Act now: {summary.actNow}</span>
                <span style={badge(false)}>
                  Immediate signals: {summary.immediateSignals}
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
                Follow-up queue
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                This queue is for items that are not yet urgent but should be handled before drift, delay, or explanation cost gets heavier.
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>Due soon: {summary.dueSoon}</span>
                <span style={badge(false)}>
                  Follow-up signals: {summary.followUpSignals}
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from live reading into the admin page you need next.
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
            <OriginLink to="/app/notifications" style={routeTile(true)}>
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
                Open this when the work is immediate response or queue handling on the member side.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/trust-analytics" style={routeTile(false)}>
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
                Open this when the work is trend reading rather than live handling.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/exposure" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Exposure
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open this when the work is about concentration, pressure, or imbalance.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/trust-graph" style={routeTile(false)}>
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
                Open this when the work is about structure, connectedness, or relationship trust shape.
              </div>
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}


