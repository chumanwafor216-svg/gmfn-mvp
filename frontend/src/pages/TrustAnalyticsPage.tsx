import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getMe,
  getSelectedClanId,
  listTrustEvents,
} from "../lib/api";

type TrustEventRow = {
  id?: number | string;
  title?: string | null;
  message?: string | null;
  detail?: string | null;
  description?: string | null;
  kind?: string | null;
  type?: string | null;
  event_type?: string | null;
  created_at?: string | null;
};

type EventCategory = "built" | "protected" | "weakened" | "repair";

type CollapseState = {
  overview: boolean;
  mix: boolean;
  timeline: boolean;
  notes: boolean;
};

const TRUST_ANALYTICS_UI_STORAGE_KEY = "gmfn.trustAnalytics.sections.v1";

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

function daysSince(value: any): number {
  const raw = safeStr(value);
  if (!raw) return 9999;
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return 9999;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

function classifyTrustEvent(row: TrustEventRow): EventCategory {
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
    text.includes("responded") ||
    text.includes("active") ||
    text.includes("consistent") ||
    text.includes("participation") ||
    text.includes("updated") ||
    text.includes("maintained")
  ) {
    return "protected";
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

function eventTone(category: EventCategory) {
  if (category === "built") {
    return {
      dot: "#16A34A",
      bg: "#F3FBF5",
      label: "Built",
    };
  }

  if (category === "weakened") {
    return {
      dot: "#DC2626",
      bg: "#FFF5F5",
      label: "Weakened",
    };
  }

  if (category === "repair") {
    return {
      dot: "#D97706",
      bg: "#FFFBEF",
      label: "Repair",
    };
  }

  return {
    dot: "#0B63D1",
    bg: "#F8FBFF",
    label: "Protected",
  };
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
    whiteSpace: "normal",
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 2,
    isolation: "isolate",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    transform: "translateZ(0)",
    outlineOffset: 4,
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
      whiteSpace: "normal",
      textAlign: "center",
      opacity: disabled ? 0.86 : 1,
      ...stableTapStyle(),
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
      whiteSpace: "normal",
      textAlign: "center",
      opacity: disabled ? 0.86 : 1,
      ...stableTapStyle(),
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
    whiteSpace: "normal",
    textAlign: "center",
    opacity: disabled ? 0.86 : 1,
    ...stableTapStyle(),
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
    whiteSpace: "normal",
    textAlign: "center",
    ...stableTapStyle(),
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
    mix: false,
    timeline: true,
    notes: true,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    mix: Boolean(raw?.mix ?? base.mix),
    timeline: Boolean(raw?.timeline ?? base.timeline),
    notes: Boolean(raw?.notes ?? base.notes),
  };
}

export default function TrustAnalyticsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_ANALYTICS_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [events, setEvents] = useState<TrustEventRow[]>([]);

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
    writeLocalJSON(TRUST_ANALYTICS_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, eventsRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listTrustEvents({
            clan_id: selectedClanId || undefined,
            limit: 120,
          }).catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setEvents(rowsOf<TrustEventRow>(eventsRes));
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

  const normalizedRows = useMemo(() => {
    return events
      .map((row, index) => {
        const category = classifyTrustEvent(row);

        return {
          id: firstTruthy(row.id, `event-${index}`),
          label: firstTruthy(
            row.title,
            row.message,
            row.detail,
            row.description,
            row.kind,
            row.type,
            row.event_type,
            "Trust event"
          ),
          kind: firstTruthy(row.kind, row.type, row.event_type),
          category,
          createdAt: safeStr(row.created_at),
          ageDays: daysSince(row.created_at),
        };
      })
      .sort((a, b) => {
        const aTime = new Date(a.createdAt || 0).getTime();
        const bTime = new Date(b.createdAt || 0).getTime();
        return bTime - aTime;
      });
  }, [events]);

  const summary = useMemo(() => {
    let built = 0;
    let protectedCount = 0;
    let weakened = 0;
    let repair = 0;
    let last7Days = 0;
    let last30Days = 0;

    for (const row of normalizedRows) {
      if (row.category === "built") built += 1;
      if (row.category === "protected") protectedCount += 1;
      if (row.category === "weakened") weakened += 1;
      if (row.category === "repair") repair += 1;

      if (row.ageDays <= 7) last7Days += 1;
      if (row.ageDays <= 30) last30Days += 1;
    }

    let trendTitle = "The trust pattern looks steady.";
    let trendDetail =
      "Recent signals do not suggest that weakening pressure is dominating the visible pattern right now.";

    if (weakened + repair > built + protectedCount) {
      trendTitle = "The trust pattern shows weakening pressure.";
      trendDetail =
        "Recent weakening and repair signals are heavier than the building and protecting signals in the visible event mix.";
    } else if (built + protectedCount > 0) {
      trendTitle = "The trust pattern is building more than weakening.";
      trendDetail =
        "Recent built and protected signals are outweighing the weakening side of the visible event mix.";
    }

    return {
      total: normalizedRows.length,
      built,
      protectedCount,
      weakened,
      repair,
      last7Days,
      last30Days,
      trendTitle,
      trendDetail,
    };
  }, [normalizedRows]);

  const recentRows = useMemo(() => normalizedRows.slice(0, 10), [normalizedRows]);

  const builtRows = useMemo(
    () => normalizedRows.filter((row) => row.category === "built").slice(0, 4),
    [normalizedRows]
  );
  const weakenedRows = useMemo(
    () =>
      normalizedRows
        .filter((row) => row.category === "weakened" || row.category === "repair")
        .slice(0, 4),
    [normalizedRows]
  );

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
          sectionLabel="Trust Analytics"
          title="Trust Analytics"
          subtitle="Loading the trust analytics page..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/command-center"
          backLabel="Command Center"
          nextLinks={[
            { label: "System Operations", to: "/app/command-center/system-operations" },
            { label: "Exposure", to: "/app/command-center/exposure" },
          ]}
          utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading trust analytics...
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
        sectionLabel="Trust Analytics"
        title="Trust Analytics"
        subtitle="Read the visible trust pattern, signal mix, and recent trend before stepping into deeper admin intervention."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
        nextLinks={[
          { label: "System Operations", to: "/app/command-center/system-operations" },
          { label: "Exposure", to: "/app/command-center/exposure" },
        ]}
        utilityLinks={[{ label: "Trust Graph", to: "/app/command-center/trust-graph" }]}
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen reads the visible trust pattern, signal mix, and recent trust trend before you move into deeper intervention pages."
        why="It helps you understand whether trust looks stable, improving, or weakening before you make a heavier admin move."
        next="Start with the current reading, then move through the signal overview, signal mix, and recent timeline to understand the pattern."
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
            <div style={sectionLabel()}>Analytics overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Trust pattern view for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Read pattern trends and signal mix here before moving into deeper intervention pages.
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
              <span style={badge(false)}>
                Recent trust events: {summary.total}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current reading</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {summary.trendTitle}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {summary.trendDetail}
            </div>
          </div>
        </div>

        <ExplainToggle
          label="What this does"
          what="This current reading compresses the trust pattern into one practical interpretation so you can quickly see whether the visible trust picture looks stronger, weaker, or mixed."
          why="It helps you avoid jumping into intervention pages before you understand the overall direction of the trust signals."
          next="Read this summary first, then use the sections below to confirm why the pattern looks the way it does."
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
            <div style={sectionLabel()}>Signal overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A clean first reading of the visible trust mix.
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
              <div style={sectionLabel()}>Total</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.total}
              </div>
            </div>

            <div style={statTile("#F3FBF5")}>
              <div style={sectionLabel()}>Built</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#166534",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.built}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Protected</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.protectedCount}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Weakened</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.weakened}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Repair</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.repair}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Last 7 days</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.last7Days}
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
            <div style={sectionLabel()}>Signal mix</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The strongest building side and weakening side signals.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("mix")}
            style={collapseToggle()}
          >
            {collapsed.mix ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.mix ? (
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
                Stronger positive side
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {builtRows.length === 0 ? (
                  <div style={helperText()}>
                    No strong built-side event is currently shown.
                  </div>
                ) : (
                  builtRows.map((row) => (
                    <div key={row.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.label}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {safeDateTime(row.createdAt)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={innerCard("#FFFBEF")}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 15,
                }}
              >
                Stronger negative or repair side
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {weakenedRows.length === 0 ? (
                  <div style={helperText()}>
                    No weakened or repair-side event is currently shown.
                  </div>
                ) : (
                  weakenedRows.map((row) => (
                    <div key={row.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {row.label}
                      </div>
                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {safeDateTime(row.createdAt)}
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
            <div style={sectionLabel()}>Recent trust timeline</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The latest visible trust movement, in clean order.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("timeline")}
            style={collapseToggle()}
          >
            {collapsed.timeline ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.timeline ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {recentRows.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No recent trust event is currently shown.
              </div>
            ) : (
              recentRows.map((row) => {
                const tone = eventTone(row.category);

                return (
                  <div
                    key={row.id}
                    style={{
                      ...innerCard(tone.bg),
                      display: "grid",
                      gridTemplateColumns: "18px minmax(0, 1fr)",
                      gap: 12,
                      alignItems: "start",
                    }}
                  >
                    <div
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 999,
                        background: tone.dot,
                        marginTop: 6,
                      }}
                    />

                    <div>
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
                          {row.label}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(true)}>{tone.label}</span>
                          {row.createdAt ? (
                            <span style={badge(false)}>
                              {safeDateTime(row.createdAt)}
                            </span>
                          ) : null}
                        </div>
                      </div>
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
            <div style={sectionLabel()}>Reading notes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              What this page is for, and what it is not for.
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
                Read patterns here
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Read pattern mix and trust trends before moving into deeper intervention pages.
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
                Use other admin pages for action
              </div>
              <div style={{ marginTop: 8, ...helperText() }}>
                Move into System Operations, Exposure, or Trust Graph when the work is live handling, risk review, or structural relationship analysis.
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
          <OriginLink to="/app/command-center/system-operations" style={actionBtn("primary")}>
            System Operations
          </OriginLink>
          <OriginLink to="/app/command-center/exposure" style={actionBtn("secondary")}>
            Exposure
          </OriginLink>
          <OriginLink to="/app/command-center/trust-graph" style={actionBtn("secondary")}>
            Trust Graph
          </OriginLink>
          <OriginLink to="/app/command-center" style={actionBtn("soft")}>
            Command Center
          </OriginLink>
        </div>
      </section>
    </div>
  );
}

