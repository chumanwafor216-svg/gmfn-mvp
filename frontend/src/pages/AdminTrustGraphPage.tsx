import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink, SubtleButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import * as api from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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

function adminTrustGraphRouteTileStyle(primary = false): React.CSSProperties {
  return {
    flexDirection: "column",
    justifyContent: "space-between",
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(29,95,212,0.24)"
      : "1px solid rgba(122,152,195,0.20)",
    background: primary ? "linear-gradient(180deg, #F8FCFF 0%, #E5F0FF 100%)" : "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    padding: 16,
    textAlign: "left",
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

function labelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <GsnLegacyIcon name={icon} size={18} />
      <span>{label}</span>
    </span>
  );
}

function graphIconBadge(
  icon: GsnIconName,
  children: React.ReactNode,
  primary = false
) {
  return (
    <span style={badge(primary)}>
      <GsnLegacyIcon
        name={icon}
        size={15}
      />
      <span>{children}</span>
    </span>
  );
}

function sectionLabelWithIcon(
  icon: GsnIconName,
  label: React.ReactNode,
  dark = false
) {
  return (
    <span
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        color: dark ? "#D8E7F6" : "#4E6680",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: dark ? "#F2C766" : "#FFFFFF",
          background: dark
            ? "linear-gradient(180deg, rgba(242,199,102,0.22) 0%, rgba(242,199,102,0.10) 100%)"
            : "linear-gradient(180deg, #08233A 0%, #061827 100%)",
          border: dark
            ? "1px solid rgba(242,199,102,0.34)"
            : "1px solid rgba(8,35,58,0.16)",
          boxShadow: "0 10px 20px rgba(7,20,36,0.10)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={16} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function graphSignalIcon(level: GraphSignal["level"]): GsnIconName {
  if (level === "flag") return "alert";
  if (level === "watch") return "eye";
  return "check";
}

function routeIcon(label: string): GsnIconName {
  const key = label.toLowerCase();
  if (key.includes("analytics")) return "chart";
  if (key.includes("operations")) return "shield";
  if (key.includes("exposure")) return "alert";
  if (key.includes("command")) return "navigation";
  return "community";
}

function adminTrustGraphCollapseStyle(): React.CSSProperties {
  return {
    borderRadius: 12,
    border: "1px solid rgba(122,152,195,0.20)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF5FF 100%)",
    color: "#24415C",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
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

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function AdminTrustGraphPage() {
  const selectedClanId = Number(api.getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "admin-trust-graph.nav.dashboard"),
      commandCenter: routeTarget(
        "adminCommand",
        selectedClanId,
        "admin-trust-graph.route.command-center"
      ),
      analytics: routeTarget(
        "trustAnalytics",
        selectedClanId,
        "admin-trust-graph.route.analytics"
      ),
      systemOperations: routeTarget(
        "systemOperations",
        selectedClanId,
        "admin-trust-graph.route.system-operations"
      ),
      exposure: routeTarget("exposureAdmin", selectedClanId, "admin-trust-graph.route.exposure"),
    }),
    [selectedClanId]
  );

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
          homeTo={routes.dashboard}
          homeLabel="Dashboard"
          backTo={routes.commandCenter}
          backLabel="Command Center"
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
        subtitle="Read connectedness, concentration, and relationship trust shape."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.commandCenter}
        backLabel="Command Center"
      />

      <ExplainToggle
        label="What this screen does"
        what="This screen reads connectedness, clusters, centrality, and flagged relationship signals."
        why="It helps you see when a trust issue is structural, not only an event or exposure issue."
        next="Start with the current graph reading, then check overview, structure, and signals."
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
            <div>{sectionLabelWithIcon("community", "Structural overview", true)}</div>

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
              Read network shape, centrality, clusters, and structural risk signals.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              {graphIconBadge("user", <>Role: {roleLabel}</>, true)}
              {graphIconBadge("community", <>Community: {communityLabel}</>)}
              {graphIconBadge(
                "document",
                <>Source: {graphSnapshot?.sourceLabel || "Fallback trust-event read"}</>
              )}
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div>{sectionLabelWithIcon("shield", "Current graph reading")}</div>

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

        <ExplainToggle
          label="What this does"
          what="This turns the network snapshot into one structural reading."
          why="It gives you the direction before you dig into nodes, edges, and clusters."
          next="Use the overview and structure sections to confirm the reason."
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
            <div>{sectionLabelWithIcon("chart", "Graph overview")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Visible structure size and flagged signal count.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("overview")}
            stableHeight={52}
            debugId="admin-trust-graph.toggle-overview"
            style={adminTrustGraphCollapseStyle()}
          >
            {labelWithIcon(collapsed.overview ? "chevronDown" : "chevronUp", collapsed.overview ? "Open" : "Hide")}
          </SubtleButton>
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
              <div>{sectionLabelWithIcon("user", "Nodes")}</div>
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
              <div>{sectionLabelWithIcon("navigation", "Edges")}</div>
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
              <div>{sectionLabelWithIcon("community", "Clusters")}</div>
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
              <div>{sectionLabelWithIcon("eye", "Watch signals")}</div>
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
              <div>{sectionLabelWithIcon("alert", "Flagged signals")}</div>
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
            <div>{sectionLabelWithIcon("community", "Structure reading")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Which nodes look most central, and which relationships are worth watching.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("structure")}
            stableHeight={52}
            debugId="admin-trust-graph.toggle-structure"
            style={adminTrustGraphCollapseStyle()}
          >
            {labelWithIcon(collapsed.structure ? "chevronDown" : "chevronUp", collapsed.structure ? "Open" : "Hide")}
          </SubtleButton>
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
                {labelWithIcon("user", "Most central visible nodes")}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {topNodes.length === 0 ? (
                  <div style={helperText()}>
                    {labelWithIcon("check", "No graph node data is currently shown.")}
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
                          {labelWithIcon("user", node.label)}
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {graphIconBadge("chart", <>Degree: {positiveNumber(node.degree)}</>, true)}
                          {safeStr(node.cluster) ? (
                            graphIconBadge("community", safeStr(node.cluster))
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
                            .join(" | ")}
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
                {labelWithIcon("eye", "Relationships worth watching")}
              </div>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {riskEdges.length === 0 ? (
                  <div style={helperText()}>
                    {labelWithIcon("check", "No flagged relationship data is currently shown.")}
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
                        {labelWithIcon("navigation", `${edge.from} -> ${edge.to}`)}
                      </div>

                      <div style={{ marginTop: 8, ...helperText(), fontSize: 13 }}>
                        {[
                          safeStr(edge.label),
                          safeStr(edge.status),
                          safeStr(edge.risk),
                          edge.weight ? `Weight: ${edge.weight}` : "",
                        ]
                          .filter(Boolean)
                          .join(" | ")}
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
            <div>{sectionLabelWithIcon("alert", "Graph signals")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Structural signals from the graph or fallback trust-event feed.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("signals")}
            stableHeight={52}
            debugId="admin-trust-graph.toggle-signals"
            style={adminTrustGraphCollapseStyle()}
          >
            {labelWithIcon(collapsed.signals ? "chevronDown" : "chevronUp", collapsed.signals ? "Open" : "Hide")}
          </SubtleButton>
        </div>

        {!collapsed.signals ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {graphSignals.length === 0 ? (
              <div style={{ color: "#64748B", lineHeight: 1.8 }}>
                {labelWithIcon("check", "No visible graph signal is available right now.")}
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
                        {labelWithIcon(graphSignalIcon(signal.level), signal.title)}
                      </div>

                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {graphIconBadge(graphSignalIcon(signal.level), label, true)}
                        {signal.createdAt ? (
                          graphIconBadge("calendar", safeDateTime(signal.createdAt))
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
            <div>{sectionLabelWithIcon("navigation", "Next routes")}</div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Move from structural reading into the next admin page you need.
            </div>
          </div>

          <SubtleButton
            onClick={() => toggleSection("routes")}
            stableHeight={52}
            debugId="admin-trust-graph.toggle-routes"
            style={adminTrustGraphCollapseStyle()}
          >
            {labelWithIcon(collapsed.routes ? "chevronDown" : "chevronUp", collapsed.routes ? "Open" : "Hide")}
          </SubtleButton>
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
              to={routes.analytics}
              debugId="admin-trust-graph.route.analytics"
              stableHeight={104}
              fullWidth
              style={adminTrustGraphRouteTileStyle(true)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {labelWithIcon(routeIcon("Trust Analytics"), "Trust Analytics")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open when the next step is broader pattern reading.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.systemOperations}
              debugId="admin-trust-graph.route.system-operations"
              stableHeight={104}
              fullWidth
              style={adminTrustGraphRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {labelWithIcon(routeIcon("System Operations"), "System Operations")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open when the structural signal needs live handling.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.exposure}
              debugId="admin-trust-graph.route.exposure"
              stableHeight={104}
              fullWidth
              style={adminTrustGraphRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {labelWithIcon(routeIcon("Exposure"), "Exposure")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Open when relationship shape is contributing to concentration or pressure.
              </div>
            </StableCtaLink>

            <StableCtaLink
              to={routes.commandCenter}
              debugId="admin-trust-graph.route.command-center"
              stableHeight={104}
              fullWidth
              style={adminTrustGraphRouteTileStyle(false)}
            >
              <div
                style={{
                  color: "#0B1F33",
                  fontWeight: 900,
                  fontSize: 18,
                  lineHeight: 1.3,
                }}
              >
                {labelWithIcon(routeIcon("Command Center"), "Command Center")}
              </div>
              <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                Return to Command Center when you need to choose another admin path.
              </div>
            </StableCtaLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}
