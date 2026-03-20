import React, { useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { getAdminTrustGraph } from "../lib/api";

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 16,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
  };
}

function inputStyle(width = 180): React.CSSProperties {
  return {
    width,
    padding: "12px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background: "#FFFFFF",
    boxSizing: "border-box",
  };
}

function metricValueStyle(): React.CSSProperties {
  return {
    marginTop: 6,
    fontSize: 24,
    fontWeight: 1000,
    color: "#0B1F33",
  };
}

function prettyValue(v: any): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

export default function AdminTrustGraphPage() {
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setData(null);

    try {
      if (!userId || Number(userId) <= 0) {
        throw new Error("Enter a valid user ID.");
      }

      setLoading(true);

      const res = await getAdminTrustGraph(Number(userId), {
        include_clans: true,
        limit_events: 500,
      });

      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load trust graph."));
    } finally {
      setLoading(false);
    }
  }

  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const edges = Array.isArray(data?.edges) ? data.edges : [];

  const rootUser = data?.command_centre?.root_user || {};
  const summary = data?.summary || {};
  const cci = data?.cci || {};
  const commandStats = data?.command_centre?.stats || {};
  const commandSignals = data?.command_centre?.signals || {};
  const edgeTypeCounts = data?.command_centre?.edge_type_counts || summary?.edge_type_counts || {};

  const clanNodes = useMemo(
    () => nodes.filter((x: any) => safeStr(x?.node_type) === "clan"),
    [nodes]
  );

  const userNodes = useMemo(
    () => nodes.filter((x: any) => safeStr(x?.node_type) === "user"),
    [nodes]
  );

  const recentEdges = useMemo(
    () => edges.filter((x: any) => safeStr(x?.status) === "recent"),
    [edges]
  );

  const stressedEdges = useMemo(
    () => edges.filter((x: any) => safeStr(x?.status) === "stressed"),
    [edges]
  );

  const topEdges = useMemo(() => {
    return edges.slice().sort((a: any, b: any) => {
      const aw = Number(a?.weight ?? 0);
      const bw = Number(b?.weight ?? 0);
      return bw - aw;
    });
  }, [edges]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTopNav
        title="Trust Graph"
        subtitle="Use this page to inspect a user’s visible trust relationships, event history, and connected community context."
      />

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Load a user graph
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID"
            style={inputStyle(180)}
          />

          <button type="button" onClick={load} style={btn(true)}>
            {loading ? "Loading..." : "Load Graph"}
          </button>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}
      </div>

      {data ? (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                ROOT USER
              </div>
              <div style={metricValueStyle()}>
                {safeStr(rootUser?.gmfn_id, `User #${safeStr(data?.root_user_id)}`)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                {safeStr(rootUser?.email)}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                USER NODES
              </div>
              <div style={metricValueStyle()}>
                {n(commandStats?.user_node_total || userNodes.length)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                People visible in this graph
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                CLAN NODES
              </div>
              <div style={metricValueStyle()}>
                {n(commandStats?.clan_node_total || clanNodes.length)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Connected community context
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                TOTAL EDGES
              </div>
              <div style={metricValueStyle()}>
                {n(commandStats?.edge_total || edges.length)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Relationship and support links
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                SUPPORT GIVEN
              </div>
              <div style={metricValueStyle()}>
                {n(summary?.support_given_count)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Support actions initiated by this user
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                GUARANTEES GIVEN
              </div>
              <div style={metricValueStyle()}>
                {n(summary?.guarantees_given_count)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Guarantee edges created by this user
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                BORROWER SUPPORT
              </div>
              <div style={metricValueStyle()}>
                {n(summary?.borrower_support_count)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Support this user received as borrower
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                FUNDS MOBILISED
              </div>
              <div style={metricValueStyle()}>
                {n(summary?.funds_mobilised_count)}
              </div>
              <div style={{ marginTop: 6, color: "#64748B" }}>
                Distinct loans this user helped mobilise
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                NETWORK BREADTH
              </div>
              <div style={metricValueStyle()}>
                {safeStr(summary?.network_breadth)}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                NETWORK QUALITY
              </div>
              <div style={metricValueStyle()}>
                {safeStr(summary?.network_quality)}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                GUARANTEE INTEGRITY
              </div>
              <div style={metricValueStyle()}>
                {safeStr(summary?.guarantee_integrity)}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                CCI SCORE / BAND
              </div>
              <div style={metricValueStyle()}>
                {safeStr(cci?.cci_score)} / {safeStr(cci?.cci_band)}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                How to read this graph
              </div>
              <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
                This view now reflects the new trust-graph structure:
                user nodes, clan nodes, relationship edges, summary metrics,
                CCI interpretation, and command-centre signals.
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                <div style={softCard()}>
                  <b>Support given</b>
                  <div style={{ marginTop: 6, color: "#64748B", lineHeight: 1.7 }}>
                    Counts support-oriented outgoing edges from the selected user.
                  </div>
                </div>

                <div style={softCard()}>
                  <b>Guarantees given</b>
                  <div style={{ marginTop: 6, color: "#64748B", lineHeight: 1.7 }}>
                    Counts outgoing guarantee edges created by the selected user.
                  </div>
                </div>

                <div style={softCard()}>
                  <b>Borrower support</b>
                  <div style={{ marginTop: 6, color: "#64748B", lineHeight: 1.7 }}>
                    Counts support the selected user received as borrower.
                  </div>
                </div>

                <div style={softCard()}>
                  <b>Funds mobilised</b>
                  <div style={{ marginTop: 6, color: "#64748B", lineHeight: 1.7 }}>
                    Counts distinct loans helped by the selected user’s guarantees.
                  </div>
                </div>
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Command Centre Signals
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
                <div style={softCard()}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                    STRENGTHS
                  </div>
                  <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                    {Array.isArray(commandSignals?.strengths) && commandSignals.strengths.length > 0
                      ? commandSignals.strengths.join(", ")
                      : "—"}
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                    PRESSURES
                  </div>
                  <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                    {Array.isArray(commandSignals?.pressures) && commandSignals.pressures.length > 0
                      ? commandSignals.pressures.join(", ")
                      : "—"}
                  </div>
                </div>

                <div style={softCard()}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                    RISK FLAGS
                  </div>
                  <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                    {Array.isArray(summary?.risk_flags) && summary.risk_flags.length > 0
                      ? summary.risk_flags.join(", ")
                      : "—"}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Connected Community Context
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {clanNodes.length === 0 ? (
                  <div style={{ color: "#7A8D9F" }}>No connected clan context found.</div>
                ) : (
                  clanNodes.map((c: any, idx: number) => (
                    <div key={idx} style={softCard()}>
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                        {safeStr(c?.display_label, `Clan #${idx + 1}`)}
                      </div>
                      <div style={{ marginTop: 6, color: "#64748B" }}>
                        Node ID: {safeStr(c?.node_id)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
                Edge Type Counts
              </div>

              <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
                {Object.keys(edgeTypeCounts || {}).length === 0 ? (
                  <div style={{ color: "#7A8D9F" }}>No edge counts available.</div>
                ) : (
                  Object.entries(edgeTypeCounts).map(([k, v]) => (
                    <div key={k} style={softCard()}>
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{k}</div>
                      <div style={{ marginTop: 6, color: "#64748B" }}>{safeStr(v)} edge(s)</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={{ ...card(), marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Key Edges
            </div>

            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {topEdges.length === 0 ? (
                <div style={{ color: "#7A8D9F" }}>No edges available.</div>
              ) : (
                topEdges.slice(0, 20).map((edge: any, idx: number) => (
                  <div key={edge?.edge_id || idx} style={softCard()}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                        {safeStr(edge?.edge_label, safeStr(edge?.edge_type))}
                      </div>
                      <div style={{ color: "#64748B", fontSize: 13 }}>
                        status: {safeStr(edge?.status)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        color: "#64748B",
                        fontSize: 13,
                      }}
                    >
                      <span>source: {safeStr(edge?.source_node_id)}</span>
                      <span>target: {safeStr(edge?.target_node_id)}</span>
                      <span>loan: {safeStr(edge?.loan_id)}</span>
                      <span>clan: {safeStr(edge?.clan_id)}</span>
                      <span>weight: {safeStr(edge?.weight)}</span>
                      <span>count: {safeStr(edge?.event_count)}</span>
                    </div>

                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 900, color: "#0B1F33" }}>
                        Edge details
                      </summary>
                      <pre
                        style={{
                          marginTop: 8,
                          whiteSpace: "pre-wrap",
                          fontSize: 12,
                          color: "#334155",
                        }}
                      >
                        {prettyValue(edge)}
                      </pre>
                    </details>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr 1fr",
              gap: 18,
            }}
          >
            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                RECENT EDGES
              </div>
              <div style={metricValueStyle()}>{recentEdges.length}</div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                STRESSED EDGES
              </div>
              <div style={metricValueStyle()}>{stressedEdges.length}</div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                UNIQUE COUNTERPARTIES
              </div>
              <div style={metricValueStyle()}>{safeStr(summary?.unique_counterparties)}</div>
            </div>

            <div style={card()}>
              <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                GRAPH SCORE
              </div>
              <div style={metricValueStyle()}>{safeStr(summary?.graph_score)}</div>
            </div>
          </div>

          <details style={{ marginTop: 18 }}>
            <summary style={{ cursor: "pointer", fontWeight: 1000, color: "#0B1F33" }}>
              Raw Graph Data
            </summary>
            <pre
              style={{
                marginTop: 12,
                background: "#0B1F33",
                color: "#E5E7EB",
                padding: 16,
                borderRadius: 14,
                fontSize: 13,
                overflow: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {JSON.stringify(data, null, 2)}
            </pre>
          </details>
        </>
      ) : null}
    </div>
  );
}