import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getSelectedClanId } from "../lib/api";

type CollapseState = {
  overview: boolean;
  routes: boolean;
  workflows: boolean;
  notes: boolean;
};

const COMMAND_CENTER_UI_STORAGE_KEY = "gmfn.commandCenter.sections.v1";

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

function statTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 14,
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
    routes: false,
    workflows: true,
    notes: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    routes: Boolean(raw?.routes ?? base.routes),
    workflows: Boolean(raw?.workflows ?? base.workflows),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

export default function TrustCommandCentrePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(COMMAND_CENTER_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);

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
      firstTruthy(
        me?.role,
        me?.account_role,
        me?.user_role,
        me?.permissions?.includes?.("admin") ? "admin" : ""
      ) || "admin"
    );
  }, [me]);

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
          sectionLabel="Command Center"
          title="Trust Command Centre"
          subtitle="Loading the command center..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
            { label: "Trust Events", to: "/app/command-center/trust-events" },
            { label: "System Operations", to: "/app/command-center/system-operations" },
          ]}
          utilityLinks={[
            { label: "Exposure", to: "/app/command-center/exposure" },
            { label: "Identity Risk", to: "/app/command-center/identity-risk" },
            { label: "Trust Graph", to: "/app/command-center/trust-graph" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading command center...
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
        sectionLabel="Command Center"
        title="Trust Command Centre"
        subtitle="Review platform trust operations here and move into the admin page required for the current task."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
          { label: "Trust Events", to: "/app/command-center/trust-events" },
          { label: "System Operations", to: "/app/command-center/system-operations" },
        ]}
        utilityLinks={[
          { label: "Exposure", to: "/app/command-center/exposure" },
          { label: "Identity Risk", to: "/app/command-center/identity-risk" },
          { label: "Trust Graph", to: "/app/command-center/trust-graph" },
        ]}
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
              Start here for a calmer view than a raw admin console, then move into the page required for the current job.
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
              <span style={badge(false)}>Admin page</span>
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
            <div style={sectionLabel()}>Command summary</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The main admin areas stay visible together here.
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
                Reading and trend view
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
                Recent event oversight
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
                Operational monitoring
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
                Risk and concentration view
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
                Device and cluster review
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
                Active unresolved queue
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
                Reconciliation operations
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
            <OriginLink to="/app/command-center/trust-analytics" style={routeTile(true)}>
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
                Read trend, movement, and higher-level trust patterns.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/trust-events" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Trust Events
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Review recent trust-event records for evidence, oversight, and explainability.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/system-operations" style={routeTile(false)}>
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
                Review live system activity and operational health.
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
                Review concentration, balance, and exposure pressure.
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
                Read network structure and relationship-based trust shape.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/identity-risk" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Identity Risk
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Review device overlap, account clusters, and identity pressure signals.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/incomplete-loans" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Incomplete Loans
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Inspect the unresolved loan queue and active items still in motion.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/bank-console" style={routeTile(false)}>
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
                Ingest bank events, run reconciliation, and review matched or unmatched movement.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center/revenue-allocation" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Revenue Allocation
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Review service fee, platform revenue, guarantor pool, and net disbursed reading.
              </div>
            </OriginLink>
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

          <button
            type="button"
            onClick={() => toggleSection("workflows")}
            style={collapseToggle()}
          >
            {collapsed.workflows ? "Open" : "Collapse"}
          </button>
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
            <div style={innerCard("#F8FBFF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                If you need pattern reading
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Trust Analytics. Use it when the task is to understand trend, movement, or distribution rather than immediate live intervention.
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
                If you need recent event evidence
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Trust Events. Use it when the task is to inspect recent trust-event records,
                evidence trails, or explainability inputs before moving into deeper analysis.
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
                If you need live handling
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in System Operations. Use it when the task is about live conditions, active processes, or admin monitoring.
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
                If you need concentration or risk reading
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Exposure. Use it when the task is about imbalance, concentration, or system pressure.
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
                If you need structure or relationship reading
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Trust Graph. Use it when the task is about connectedness, relationship patterns, or network trust structure.
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
                If you need identity misuse monitoring
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Identity Risk. Use it when the task is about suspicious overlap, clustered activity, or device-linked pressure.
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
                If you need unresolved loan oversight
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Incomplete Loans. Use it when the task is to review loans that have not yet reached a visible conclusion.
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
                If you need reconciliation operations
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Bank Console. Use it when the task is about bank events, matching, unmatched items, or reconciliation execution.
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
                If you need fee and distribution reading
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Start in Revenue Allocation. Use it when the task is about fee treatment, pool use, guarantee gap, or net distribution reading.
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
            <div style={sectionLabel()}>Separation of layers</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Keep the admin workspace distinct from the ordinary member side.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("notes")}
            style={collapseToggle()}
          >
            {collapsed.notes ? "Open" : "Collapse"}
          </button>
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
          <OriginLink to="/app/command-center/trust-analytics" style={actionBtn("primary")}>
            Trust Analytics
          </OriginLink>
          <OriginLink to="/app/command-center/trust-events" style={actionBtn("secondary")}>
            Trust Events
          </OriginLink>
          <OriginLink to="/app/command-center/identity-risk" style={actionBtn("secondary")}>
            Identity Risk
          </OriginLink>
          <OriginLink to="/app/command-center/incomplete-loans" style={actionBtn("secondary")}>
            Incomplete Loans
          </OriginLink>
          <OriginLink to="/app/command-center/bank-console" style={actionBtn("secondary")}>
            Bank Console
          </OriginLink>
          <OriginLink to="/app/command-center/revenue-allocation" style={actionBtn("secondary")}>
            Revenue Allocation
          </OriginLink>
          <OriginLink to="/app/command-center/system-operations" style={actionBtn("secondary")}>
            System Operations
          </OriginLink>
          <OriginLink to="/app/command-center/exposure" style={actionBtn("secondary")}>
            Exposure
          </OriginLink>
          <OriginLink to="/app/command-center/trust-graph" style={actionBtn("secondary")}>
            Trust Graph
          </OriginLink>
        </div>
      </section>
    </div>
  );
}

