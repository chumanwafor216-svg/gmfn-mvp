import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import * as api from "../lib/api";

type CollapseState = {
  overview: boolean;
  structure: boolean;
  signals: boolean;
  routes: boolean;
};

type GraphNode = {
  id: string;
  label: string;
  gmfnId?: string;
  cluster?: string;
  degree?: number;
  risk?: string;
  role?: string;
};

type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
  status?: string;
  risk?: string;
  weight?: number;
};

type GraphSignal = {
  id: string;
  title: string;
  detail: string;
  level: "normal" | "watch" | "flag";
  createdAt?: string;
};

type GraphSnapshot = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  clusters: string[];
  signals: GraphSignal[];
  sourceLabel: string;
};

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

const TRUST_GRAPH_UI_STORAGE_KEY = "gmfn.trustGraph.sections.v1";

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
    structure: false,
    signals: true,
    routes: false,
  };
}

function normalizeCollapseState(raw: any): CollapseState {
  const base = defaultCollapseState();

  return {
    overview: Boolean(raw?.overview ?? base.overview),
    structure: Boolean(raw?.structure ?? base.structure),
    signals: Boolean(raw?.signals ?? base.signals),
    routes: Boolean(raw?.routes ?? base.routes),
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

function normalizeGraphNode(raw: any, index: number): GraphNode {
  return {
    id: firstTruthy(raw?.id, raw?.node_id, raw?.gmfn_id, `node-${index}`),
    label: firstTruthy(
      raw?.label,
      raw?.name,
      raw?.display_name,
      raw?.title,
      raw?.gmfn_id,
      `Node ${index + 1}`
    ),
    gmfnId: firstTruthy(raw?.gmfn_id),
    cluster: firstTruthy(raw?.cluster, raw?.community, raw?.group, raw?.bucket),
    degree: positiveNumber(raw?.degree || raw?.weight || raw?.connections) || undefined,
    risk: firstTruthy(raw?.risk, raw?.risk_level, raw?.status),
    role: firstTruthy(raw?.role),
  };
}

function normalizeGraphEdge(raw: any, index: number): GraphEdge {
  return {
    id: firstTruthy(raw?.id, raw?.edge_id, `edge-${index}`),
    from: firstTruthy(raw?.from, raw?.source, raw?.source_id),
    to: firstTruthy(raw?.to, raw?.target, raw?.target_id),
    label: firstTruthy(raw?.label, raw?.relationship, raw?.kind),
    status: firstTruthy(raw?.status),
    risk: firstTruthy(raw?.risk, raw?.risk_level),
    weight: positiveNumber(raw?.weight || raw?.score || raw?.strength) || undefined,
  };
}

function normalizeGraphSignal(raw: any, index: number): GraphSignal {
  const text = [
    safeStr(raw?.level),
    safeStr(raw?.risk),
    safeStr(raw?.status),
    safeStr(raw?.title),
    safeStr(raw?.detail),
    safeStr(raw?.message),
  ]
    .join(" ")
    .toLowerCase();

  let level: GraphSignal["level"] = "normal";
  if (
    text.includes("flag") ||
    text.includes("risk") ||
    text.includes("high") ||
    text.includes("urgent")
  ) {
    level = "flag";
  } else if (
    text.includes("watch") ||
    text.includes("medium") ||
    text.includes("pending")
  ) {
    level = "watch";
  }

  return {
    id: firstTruthy(raw?.id, `signal-${index}`),
    title: firstTruthy(raw?.title, raw?.label, raw?.kind, "Graph signal"),
    detail: firstTruthy(
      raw?.detail,
      raw?.message,
      raw?.description,
      "A structural graph signal is visible."
    ),
    level,
    createdAt: firstTruthy(raw?.created_at),
  };
}

function normalizeGraphSnapshot(raw: any): GraphSnapshot | null {
  if (!raw) return null;

  const src = raw?.item || raw?.graph || raw?.snapshot || raw;

  const nodeRows = [
    src?.nodes,
    src?.vertices,
    src?.graph?.nodes,
    src?.data?.nodes,
  ].find(Array.isArray) || [];

  const edgeRows = [
    src?.edges,
    src?.links,
    src?.graph?.edges,
    src?.data?.edges,
  ].find(Array.isArray) || [];

  const signalRows = [
    src?.signals,
    src?.flags,
    src?.alerts,
    src?.issues,
    src?.data?.signals,
  ].find(Array.isArray) || [];

  const clusterRows = [
    src?.clusters,
    src?.communities,
    src?.groups,
    src?.buckets,
  ].find(Array.isArray) || [];

  const nodes = (nodeRows as any[]).map((row, index) =>
    normalizeGraphNode(row, index)
  );

  const edges = (edgeRows as any[])
    .map((row, index) => normalizeGraphEdge(row, index))
    .filter((row) => row.from && row.to);

  const signals = (signalRows as any[]).map((row, index) =>
    normalizeGraphSignal(row, index)
  );

  const clusters = (clusterRows as any[])
    .map((row: any, index: number) =>
      firstTruthy(
        row?.label,
        row?.name,
        row?.title,
        row?.id,
        `Cluster ${index + 1}`
      )
    )
    .filter(Boolean);

  return {
    nodes,
    edges,
    clusters,
    signals,
    sourceLabel: "Graph feed",
  };
}

function fallbackSignalsFromEvents(events: TrustEventRow[]): GraphSignal[] {
  return events.slice(0, 8).map((row, index) => {
    const text = [
      safeStr(row?.kind),
      safeStr(row?.type),
      safeStr(row?.event_type),
      safeStr(row?.title),
      safeStr(row?.message),
      safeStr(row?.detail),
      safeStr(row?.description),
    ]
      .join(" ")
      .toLowerCase();

    let level: GraphSignal["level"] = "normal";
    if (
      text.includes("risk") ||
      text.includes("flag") ||
      text.includes("default") ||
      text.includes("overdue")
    ) {
      level = "flag";
    } else if (
      text.includes("watch") ||
      text.includes("repair") ||
      text.includes("warning")
    ) {
      level = "watch";
    }

    return {
      id: firstTruthy(row?.id, `fallback-${index}`),
      title: firstTruthy(
        row?.title,
        row?.message,
        row?.detail,
        row?.kind,
        row?.event_type,
        "Relationship signal"
      ),
      detail: firstTruthy(
        row?.detail,
        row?.description,
        row?.message,
        "A relationship-related trust signal is visible."
      ),
      level,
      createdAt: firstTruthy(row?.created_at),
    };
  });
}

export default function AdminTrustGraphPage() {
  const selectedClanId = Number(api.getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [collapsed, setCollapsed] = useState<CollapseState>(() =>
    normalizeCollapseState(
      readLocalJSON(TRUST_GRAPH_UI_STORAGE_KEY, defaultCollapseState())
    )
  );

  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [graphSnapshot, setGraphSnapshot] = useState<GraphSnapshot | null>(null);
  const [fallbackEvents, setFallbackEvents] = useState<TrustEventRow[]>([]);

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
    writeLocalJSON(TRUST_GRAPH_UI_STORAGE_KEY, collapsed);
  }, [collapsed]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, graphRes, eventsRes] = await Promise.all([
          api.getMe().catch(() => null),
          api.getCurrentClan().catch(() => null),
          callFirstAvailable(
            [
              "getAdminTrustGraph",
              "getTrustGraphAdmin",
              "getTrustGraph",
              "getTrustGraphSnapshot",
              "getTrustGraphSummary",
            ],
            [
              [{ clan_id: selectedClanId || undefined }],
              [selectedClanId || undefined],
              [],
            ]
          ),
          api
            .listTrustEvents({
              clan_id: selectedClanId || undefined,
              limit: 60,
            })
            .catch(() => ({ items: [] })),
        ]);

        if (!alive) return;

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setGraphSnapshot(normalizeGraphSnapshot(graphRes));
        setFallbackEvents(rowsOf<TrustEventRow>(eventsRes));
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

  const graphSignals = useMemo(() => {
    if (graphSnapshot?.signals?.length) return graphSnapshot.signals;
    return fallbackSignalsFromEvents(fallbackEvents);
  }, [graphSnapshot, fallbackEvents]);

  const computedNodeDegrees = useMemo(() => {
    const map = new Map<string, number>();

    for (const node of graphSnapshot?.nodes || []) {
      map.set(node.id, node.degree || 0);
    }

    for (const edge of graphSnapshot?.edges || []) {
      if (!edge.from || !edge.to) continue;
      map.set(edge.from, (map.get(edge.from) || 0) + 1);
      map.set(edge.to, (map.get(edge.to) || 0) + 1);
    }

    return map;
  }, [graphSnapshot]);

  const topNodes = useMemo(() => {
    const rows = (graphSnapshot?.nodes || []).map((node) => ({
      ...node,
      degree: node.degree || computedNodeDegrees.get(node.id) || 0,
    }));

    rows.sort((a, b) => (b.degree || 0) - (a.degree || 0));
    return rows.slice(0, 6);
  }, [graphSnapshot, computedNodeDegrees]);

  const riskEdges = useMemo(() => {
    return (graphSnapshot?.edges || [])
      .filter((edge) => safeStr(edge.risk) || safeStr(edge.status))
      .slice(0, 6);
  }, [graphSnapshot]);

  const summary = useMemo(() => {
    const nodeCount = graphSnapshot?.nodes?.length || 0;
    const edgeCount = graphSnapshot?.edges?.length || 0;
    const clusterCount = graphSnapshot?.clusters?.length || 0;

    const flaggedSignals = graphSignals.filter((signal) => signal.level === "flag").length;
    const watchSignals = graphSignals.filter((signal) => signal.level === "watch").length;

    const centralityPressure =
      topNodes.length > 0 ? (topNodes[0].degree || 0) : 0;

    let structureTitle = "The visible trust structure looks fairly distributed.";
    let structureDetail =
      "No strong central concentration signal is dominating the visible graph reading right now.";

    if (centralityPressure >= 8 || flaggedSignals >= 4) {
      structureTitle = "The visible trust structure shows concentration pressure.";
      structureDetail =
        "A central node or a cluster of flagged relationship signals is standing out in the current graph reading.";
    } else if (centralityPressure >= 4 || watchSignals >= 3) {
      structureTitle = "The visible trust structure needs watchful reading.";
      structureDetail =
        "The current graph reading is not yet critical, but some clusters or central relationships deserve watchful attention.";
    }

    return {
      nodeCount,
      edgeCount,
      clusterCount,
      flaggedSignals,
      watchSignals,
      structureTitle,
      structureDetail,
    };
  }, [graphSnapshot, graphSignals, topNodes]);

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
          sectionLabel="Trust Graph"
          title="Trust Graph"
          subtitle="Loading the trust graph..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/command-center"
          backLabel="Command Center"
          nextLinks={[
            { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
            { label: "System Operations", to: "/app/command-center/system-operations" },
          ]}
          utilityLinks={[{ label: "Exposure", to: "/app/command-center/exposure" }]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading trust graph...
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
        sectionLabel="Trust Graph"
        title="Trust Graph"
        subtitle="Read connectedness, structural concentration, and relationship-based trust shape from the admin workspace."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/command-center"
        backLabel="Command Center"
        nextLinks={[
          { label: "Trust Analytics", to: "/app/command-center/trust-analytics" },
          { label: "System Operations", to: "/app/command-center/system-operations" },
        ]}
        utilityLinks={[{ label: "Exposure", to: "/app/command-center/exposure" }]}
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
            <div style={sectionLabel()}>Structural overview</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Trust structure reading for {operatorName}
            </div>

            <div style={{ marginTop: 12, ...helperText(), maxWidth: 860 }}>
              Read connectedness and relationship structure here when the work is about network shape, centrality, clusters, and structural risk signals.
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
                Source: {graphSnapshot?.sourceLabel || "Fallback trust-event read"}
              </span>
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Current graph reading</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {summary.structureTitle}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {summary.structureDetail}
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
            <div style={sectionLabel()}>Graph overview</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A quick reading of visible structure size and flagged signal count.
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
                : "repeat(5, minmax(0, 1fr))",
              gap: 12,
            }}
          >
            <div style={statTile()}>
              <div style={sectionLabel()}>Nodes</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.nodeCount}
              </div>
            </div>

            <div style={statTile()}>
              <div style={sectionLabel()}>Edges</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.edgeCount}
              </div>
            </div>

            <div style={statTile("#F8FBFF")}>
              <div style={sectionLabel()}>Clusters</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B63D1",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.clusterCount}
              </div>
            </div>

            <div style={statTile("#FFFBEF")}>
              <div style={sectionLabel()}>Watch signals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#92400E",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.watchSignals}
              </div>
            </div>

            <div style={statTile("#FFF5F5")}>
              <div style={sectionLabel()}>Flagged signals</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#991B1B",
                  fontSize: 24,
                  fontWeight: 900,
                }}
              >
                {summary.flaggedSignals}
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
            <div style={sectionLabel()}>Structure reading</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Which nodes look most central, and which relationships are worth watching.
            </div>
          </div>

          <button
            type="button"
            onClick={() => toggleSection("structure")}
            style={collapseToggle()}
          >
            {collapsed.structure ? "Open" : "Collapse"}
          </button>
        </div>

        {!collapsed.structure ? (
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
                Most central visible nodes
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {topNodes.length === 0 ? (
                  <div style={helperText()}>
                    No graph node data is currently shown.
                  </div>
                ) : (
                  topNodes.map((node) => (
                    <div key={node.id} style={innerCard("#FFFFFF")}>
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
                          {node.label}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={badge(true)}>
                            Degree: {positiveNumber(node.degree)}
                          </span>
                          {safeStr(node.cluster) ? (
                            <span style={badge(false)}>{safeStr(node.cluster)}</span>
                          ) : null}
                        </div>
                      </div>

                      {safeStr(node.gmfnId || node.role || node.risk) ? (
                        <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                          {[
                            safeStr(node.gmfnId) ? `GSN: ${safeStr(node.gmfnId)}` : "",
                            safeStr(node.role),
                            safeStr(node.risk),
                          ]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      ) : null}
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
                Relationships worth watching
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {riskEdges.length === 0 ? (
                  <div style={helperText()}>
                    No flagged relationship data is currently shown.
                  </div>
                ) : (
                  riskEdges.map((edge) => (
                    <div key={edge.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          color: "#0B1F33",
                          fontWeight: 900,
                          lineHeight: 1.35,
                        }}
                      >
                        {edge.from} → {edge.to}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {[
                          safeStr(edge.label),
                          safeStr(edge.status),
                          safeStr(edge.risk),
                          edge.weight ? `Weight: ${edge.weight}` : "",
                        ]
                          .filter(Boolean)
                          .join(" • ")}
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
            <div style={sectionLabel()}>Graph signals</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              The visible structural signals returned by the graph or the fallback trust-event feed.
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
            {graphSignals.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                No visible graph signal is available right now.
              </div>
            ) : (
              graphSignals.slice(0, 10).map((signal) => {
                const bg =
                  signal.level === "flag"
                    ? "#FFF5F5"
                    : signal.level === "watch"
                    ? "#FFFBEF"
                    : "#F8FBFF";
                const label =
                  signal.level === "flag"
                    ? "Flag"
                    : signal.level === "watch"
                    ? "Watch"
                    : "Normal";

                return (
                  <div key={signal.id} style={innerCard(bg)}>
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
                        {signal.title}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <span style={badge(true)}>{label}</span>
                        {signal.createdAt ? (
                          <span style={badge(false)}>
                            {safeDateTime(signal.createdAt)}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <div style={{ marginTop: 8, ...helperText() }}>{signal.detail}</div>
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
            <div style={sectionLabel()}>Next routes</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from structural reading into the next admin page you need.
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
                Open this when the next step is broader pattern reading rather than structure-only interpretation.
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
                Open this when the structural signal now needs live handling.
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
                Open this when relationship shape is contributing to concentration or pressure.
              </div>
            </OriginLink>

            <OriginLink to="/app/command-center" style={routeTile(false)}>
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                Command Center
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to Command Center when you need to choose another admin path.
              </div>
            </OriginLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}

