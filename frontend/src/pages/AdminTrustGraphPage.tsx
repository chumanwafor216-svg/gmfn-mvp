import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getAdminTrustGraph, getSelectedClanId } from "../lib/api";

function safeStr(x: any, fallback = "—"): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
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
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedClanId = n(getSelectedClanId());
  const queryClanId = n(searchParams.get("clan_id"));
  const effectiveClanId = queryClanId || selectedClanId || 0;
  const userId = n(searchParams.get("user_id"));

  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    setErr("");
    setData(null);

    try {
      if (!userId || userId <= 0) {
        return;
      }

      setLoading(true);

      const res = await getAdminTrustGraph(userId, {
        include_clans: true,
        limit_events: 500,
      });

      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load trust graph."));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateQuery(next: { clan_id?: number | null; user_id?: number | null }) {
    const p = new URLSearchParams(searchParams.toString());

    if (next.clan_id == null || next.clan_id <= 0) p.delete("clan_id");
    else p.set("clan_id", String(next.clan_id));

    if (next.user_id == null || next.user_id <= 0) p.delete("user_id");
    else p.set("user_id", String(next.user_id));

    setSearchParams(p);
  }

  const queryString = useMemo(() => {
    const p = new URLSearchParams();
    if (effectiveClanId > 0) p.set("clan_id", String(effectiveClanId));
    if (userId > 0) p.set("user_id", String(userId));
    return p.toString();
  }, [effectiveClanId, userId]);

  const nodes = Array.isArray(data?.nodes) ? data.nodes : [];
  const rawEdges = Array.isArray(data?.edges) ? data.edges : [];

  const rootUser = data?.command_centre?.root_user || data?.root_user || {};
  const summary = data?.summary || {};
  const cci = data?.cci || {};
  const commandStats = data?.command_centre?.stats || {};
  const commandSignals = data?.command_centre?.signals || {};

  const filteredEdges = useMemo(() => {
    let rows = rawEdges.slice();

    const hasClanContext = rows.some((edge: any) => n(edge?.clan_id) > 0);
    if (effectiveClanId > 0 && hasClanContext) {
      rows = rows.filter((edge: any) => n(edge?.clan_id) === effectiveClanId);
    }

    return rows;
  }, [rawEdges, effectiveClanId]);

  const clanNodes = useMemo(
    () => nodes.filter((x: any) => safeStr(x?.node_type) === "clan"),
    [nodes]
  );

  const userNodes = useMemo(
    () => nodes.filter((x: any) => safeStr(x?.node_type) === "user"),
    [nodes]
  );

  const recentEdges = useMemo(
    () => filteredEdges.filter((x: any) => safeStr(x?.status) === "recent"),
    [filteredEdges]
  );

  const stressedEdges = useMemo(
    () => filteredEdges.filter((x: any) => safeStr(x?.status) === "stressed"),
    [filteredEdges]
  );

  const edgeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const edge of filteredEdges) {
      const key = safeStr(edge?.edge_type || edge?.edge_label || "edge");
      counts[key] = (counts[key] || 0) + 1;
    }

    return counts;
  }, [filteredEdges]);

  const topEdges = useMemo(() => {
    return filteredEdges.slice().sort((a: any, b: any) => {
      const aw = Number(a?.weight ?? 0);
      const bw = Number(b?.weight ?? 0);
      return bw - aw;
    });
  }, [filteredEdges]);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Trust Graph"
        subtitle="Inspect a user’s visible trust relationships, connected community context, and edge structure."
      />

      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={sectionLabel()}>Command Center</div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            justifyContent: "space-between",
            gap: 14,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
              Trust Graph
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Admin-only graph view for user nodes, clan nodes, relationship edges,
              summary metrics, and command-center signals.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link
              to={`/app/command-center${queryString ? `?${queryString}` : ""}`}
              style={btn(false)}
            >
              Command Center
            </Link>
            <Link
              to={`/app/command-center/trust-analytics${queryString ? `?${queryString}` : ""}`}
              style={btn(false)}
            >
              Trust Analytics
            </Link>
            <Link
              to={`/app/command-center/trust-graph${queryString ? `?${queryString}` : ""}`}
              style={btn(true)}
            >
              Trust Graph
            </Link>
          </div>
        </div>
      </div>

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
            value={userId || ""}
            onChange={(e) =>
              updateQuery({
                clan_id: effectiveClanId || null,
                user_id: n(e.target.value) || null,
              })
            }
            placeholder="User ID"
            style={inputStyle(180)}
          />

          <input
            value={effectiveClanId || ""}
            onChange={(e) =>
              updateQuery({
                clan_id: n(e.target.value) || null,
                user_id: userId || null,
              })
            }
            placeholder="Clan ID"
            style={inputStyle(160)}
          />

          <button type="button" onClick={() => void load()} style={btn(true, loading)}>
            {loading ? "Loading..." : "Load Graph"}
          </button>

          <button
            type="button"
            onClick={() => setSearchParams(new URLSearchParams())}
            style={btn(false)}
          >
            Clear Filters
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

        <div style={{ marginTop: 14, color: "#6B7A88", lineHeight: 1.8 }}>
          User ID is required. Clan ID is optional and narrows edge display when
          clan-specific edge context exists.
        </div>
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
                FILTERED EDGES
              </div>
              <div style={metricValueStyle()}>
                {filteredEdges.length}
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
                Distinct loans helped by this user
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
                This view reflects the new trust-graph structure: user nodes, clan
                nodes, relationship edges, summary metrics, CCI interpretation,
                and command-center signals.
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
                Command Center Signals
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
                  clanNodes.map((clanNode: any, idx: number) => (
                    <div key={idx} style={softCard()}>
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                        {safeStr(clanNode?.display_label, `Clan #${idx + 1}`)}
                      </div>
                      <div style={{ marginTop: 6, color: "#64748B" }}>
                        Node ID: {safeStr(clanNode?.node_id)}
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
                  Object.entries(edgeTypeCounts).map(([key, value]) => (
                    <div key={key} style={softCard()}>
                      <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{key}</div>
                      <div style={{ marginTop: 6, color: "#64748B" }}>
                        {safeStr(value)} edge(s)
                      </div>
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
                      <summary
                        style={{
                          cursor: "pointer",
                          fontWeight: 900,
                          color: "#0B1F33",
                        }}
                      >
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
              <div style={metricValueStyle()}>
                {safeStr(summary?.unique_counterparties)}
              </div>
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