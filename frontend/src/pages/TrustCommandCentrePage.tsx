import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  adminRecentTrustEvents,
  applyAdminTrustRecompute,
  getAdminTrustEvidenceSnapshot,
  getAdminTrustRecompute,
  getAdminTrustWhy,
  getAdminTrustGraph,
  getBehaviourMetrics,
  getExposureAdmin,
  getSelectedClanId,
} from "../lib/api";

type TrustEventRow = {
  id?: number;
  event_type?: string;
  created_at?: string;
  clan_id?: number;
  loan_id?: number;
  actor_user_id?: number;
  subject_user_id?: number;
  meta?: any;
  meta_json?: any;
};

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function parseMeta(row: TrustEventRow): any {
  if (row?.meta && typeof row.meta === "object") return row.meta;
  if (row?.meta_json && typeof row.meta_json === "object") return row.meta_json;
  if (row?.meta_json) {
    try {
      return JSON.parse(String(row.meta_json));
    } catch {
      return { raw: String(row.meta_json) };
    }
  }
  return null;
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

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
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

function inputStyle(width = 160): React.CSSProperties {
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
    fontSize: 22,
    fontWeight: 1000,
    color: "#0B1F33",
  };
}

export default function TrustCommandCentrePage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const selectedClanId = n(getSelectedClanId());
  const queryClanId = n(searchParams.get("clan_id"));
  const effectiveClanId = queryClanId || selectedClanId || 0;
  const userId = n(searchParams.get("user_id"));

  const [loading, setLoading] = useState(false);
  const [recomputeBusy, setRecomputeBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const [events, setEvents] = useState<TrustEventRow[]>([]);
  const [behaviour, setBehaviour] = useState<any>(null);
  const [exposure, setExposure] = useState<any>(null);
  const [trustWhy, setTrustWhy] = useState<any>(null);
  const [evidenceSnapshot, setEvidenceSnapshot] = useState<any>(null);
  const [recomputePreview, setRecomputePreview] = useState<any>(null);
  const [graph, setGraph] = useState<any>(null);

  async function load() {
    setLoading(true);
    setErr("");
    setMsg("");

    try {
      const [
        eventsRes,
        exposureRes,
        behaviourRes,
        trustWhyRes,
        evidenceRes,
        recomputeRes,
        graphRes,
      ] = await Promise.all([
        adminRecentTrustEvents(100).catch(() => ({ items: [] })),
        getExposureAdmin().catch(() => null),
        userId > 0 ? getBehaviourMetrics(userId).catch(() => null) : Promise.resolve(null),
        userId > 0 ? getAdminTrustWhy(userId).catch(() => null) : Promise.resolve(null),
        userId > 0 ? getAdminTrustEvidenceSnapshot(userId).catch(() => null) : Promise.resolve(null),
        userId > 0 ? getAdminTrustRecompute(userId).catch(() => null) : Promise.resolve(null),
        userId > 0
          ? getAdminTrustGraph(userId, { include_clans: true, limit_events: 500 }).catch(() => null)
          : Promise.resolve(null),
      ]);

      const items = Array.isArray(eventsRes)
        ? eventsRes
        : Array.isArray(eventsRes?.items)
          ? eventsRes.items
          : [];

      setEvents(items);
      setExposure(exposureRes || null);
      setBehaviour(behaviourRes || null);
      setTrustWhy(trustWhyRes || null);
      setEvidenceSnapshot(evidenceRes || null);
      setRecomputePreview(recomputeRes || null);
      setGraph(graphRes || null);
      setMsg("Trust command centre loaded.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load trust command centre."));
      setEvents([]);
      setExposure(null);
      setBehaviour(null);
      setTrustWhy(null);
      setEvidenceSnapshot(null);
      setRecomputePreview(null);
      setGraph(null);
    } finally {
      setLoading(false);
    }
  }

  async function applyRecomputeNow() {
    if (userId <= 0) {
      setErr("Enter a valid user ID first.");
      return;
    }

    setRecomputeBusy(true);
    setErr("");
    setMsg("");

    try {
      const out = await applyAdminTrustRecompute(userId);
      setMsg(
        safeStr(
          out?.detail ||
            out?.message ||
            "Trust recompute applied successfully."
        )
      );
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to apply trust recompute."));
    } finally {
      setRecomputeBusy(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveClanId, userId]);

  const filteredEvents = useMemo(() => {
    let rows = events.slice();

    if (effectiveClanId > 0) {
      rows = rows.filter((r) => n(r.clan_id) === effectiveClanId);
    }

    if (userId > 0) {
      rows = rows.filter(
        (r) => n(r.actor_user_id) === userId || n(r.subject_user_id) === userId
      );
    }

    rows.sort((a, b) => safeStr(b.created_at).localeCompare(safeStr(a.created_at)));
    return rows;
  }, [events, effectiveClanId, userId]);

  const eventTypeSummary = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of filteredEvents) {
      const key = safeStr(row.event_type, "unknown_event");
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [filteredEvents]);

  const graphSummary = graph?.summary || {};
  const graphCci = graph?.cci || {};
  const graphStats = graph?.command_centre?.stats || {};
  const graphSignals = graph?.command_centre?.signals || {};
  const graphEdgeCounts = graph?.command_centre?.edge_type_counts || graphSummary?.edge_type_counts || {};

  const graphEdges = Array.isArray(graph?.edges) ? graph.edges : [];
  const graphNodes = Array.isArray(graph?.nodes) ? graph.nodes : [];

  const topGraphEdges = useMemo(() => {
    return graphEdges.slice().sort((a: any, b: any) => Number(b?.weight ?? 0) - Number(a?.weight ?? 0));
  }, [graphEdges]);

  function updateQuery(next: { clan_id?: number | null; user_id?: number | null }) {
    const p = new URLSearchParams(searchParams.toString());

    if (next.clan_id == null || next.clan_id <= 0) p.delete("clan_id");
    else p.set("clan_id", String(next.clan_id));

    if (next.user_id == null || next.user_id <= 0) p.delete("user_id");
    else p.set("user_id", String(next.user_id));

    setSearchParams(p);
  }

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto" }}>
      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
          TRUST OPERATIONS CENTRE
        </div>

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
              Trust Operations Centre
            </div>
            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              Central trust operations view for behaviour metrics, explainability,
              evidence, exposure, graph signals, support counts, and recent trust-event activity.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/app/trust-analytics" style={btn(false)}>
              Open Trust Analytics
            </Link>
            <Link to="/app/admin/trust-graph" style={btn(false)}>
              Open Trust Graph
            </Link>
            <Link to="/app/dashboard" style={btn(true)}>
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      {err ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Selection Context
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000, marginBottom: 6 }}>
              Clan ID
            </div>
            <input
              type="number"
              value={effectiveClanId || ""}
              onChange={(e) =>
                updateQuery({
                  clan_id: n(e.target.value) || null,
                  user_id: userId || null,
                })
              }
              style={inputStyle(140)}
              placeholder="Clan ID"
            />
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000, marginBottom: 6 }}>
              User ID
            </div>
            <input
              type="number"
              value={userId || ""}
              onChange={(e) =>
                updateQuery({
                  clan_id: effectiveClanId || null,
                  user_id: n(e.target.value) || null,
                })
              }
              style={inputStyle(160)}
              placeholder="User ID"
            />
          </div>

          <button type="button" onClick={() => void load()} style={btn(true)}>
            {loading ? "Loading..." : "Reload"}
          </button>

          <button
            type="button"
            onClick={() => void applyRecomputeNow()}
            disabled={recomputeBusy || userId <= 0}
            style={{
              ...btn(false),
              opacity: recomputeBusy || userId <= 0 ? 0.6 : 1,
            }}
          >
            {recomputeBusy ? "Applying..." : "Apply Recompute"}
          </button>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            to={`/app/trust-analytics${effectiveClanId > 0 || userId > 0 ? `?${new URLSearchParams({
              ...(effectiveClanId > 0 ? { clan_id: String(effectiveClanId) } : {}),
              ...(userId > 0 ? { user_id: String(userId) } : {}),
            }).toString()}` : ""}`}
            style={btn(false)}
          >
            Selected User Analytics
          </Link>

          <Link to="/app/trust" style={btn(false)}>
            Community Standing
          </Link>

          <Link to="/app/trust-slip" style={btn(false)}>
            TrustSlip
          </Link>
        </div>

        <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
          Recompute changes trust state. Use it carefully for admin correction and protocol review.
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
            SELECTED CLAN
          </div>
          <div style={metricValueStyle()}>
            {effectiveClanId > 0 ? effectiveClanId : "—"}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            SELECTED USER
          </div>
          <div style={metricValueStyle()}>
            {userId > 0 ? userId : "—"}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            FILTERED TRUST EVENTS
          </div>
          <div style={metricValueStyle()}>
            {filteredEvents.length}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            GRAPH EDGES
          </div>
          <div style={metricValueStyle()}>
            {n(graphStats?.edge_total || graphEdges.length)}
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
            {n(graphSummary?.support_given_count)}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            GUARANTEES GIVEN
          </div>
          <div style={metricValueStyle()}>
            {n(graphSummary?.guarantees_given_count)}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            BORROWER SUPPORT
          </div>
          <div style={metricValueStyle()}>
            {n(graphSummary?.borrower_support_count)}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            FUNDS MOBILISED
          </div>
          <div style={metricValueStyle()}>
            {n(graphSummary?.funds_mobilised_count)}
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
            {safeStr(graphSummary?.network_breadth, "—")}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            NETWORK QUALITY
          </div>
          <div style={metricValueStyle()}>
            {safeStr(graphSummary?.network_quality, "—")}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            GUARANTEE INTEGRITY
          </div>
          <div style={metricValueStyle()}>
            {safeStr(graphSummary?.guarantee_integrity, "—")}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
            CCI SCORE / BAND
          </div>
          <div style={metricValueStyle()}>
            {safeStr(graphCci?.cci_score, "—")} / {safeStr(graphCci?.cci_band, "—")}
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
            Behaviour Metrics
          </div>

          {userId <= 0 ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Enter a user ID to load behaviour metrics.
            </div>
          ) : !behaviour ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Behaviour metrics not available.
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {Object.entries(behaviour).slice(0, 10).map(([k, v]) => (
                <div key={k} style={softCard()}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                    {k}
                  </div>
                  <pre
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 900,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                    }}
                  >
                    {prettyValue(v)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Exposure Snapshot
          </div>

          {!exposure ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Exposure data not available.
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              {Object.entries(exposure).slice(0, 10).map(([k, v]) => (
                <div key={k} style={softCard()}>
                  <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                    {k}
                  </div>
                  <pre
                    style={{
                      marginTop: 6,
                      color: "#0B1F33",
                      fontWeight: 900,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                    }}
                  >
                    {prettyValue(v)}
                  </pre>
                </div>
              ))}
            </div>
          )}
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
            Trust Why
          </div>

          {userId <= 0 ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Enter a user ID to load trust explainability.
            </div>
          ) : !trustWhy ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Trust why data not available.
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <pre
                style={{
                  ...softCard(),
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  color: "#334155",
                }}
              >
                {prettyValue(trustWhy)}
              </pre>
            </div>
          )}
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Evidence Snapshot
          </div>

          {userId <= 0 ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Enter a user ID to load evidence snapshot.
            </div>
          ) : !evidenceSnapshot ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Evidence snapshot not available.
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <pre
                style={{
                  ...softCard(),
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  color: "#334155",
                }}
              >
                {prettyValue(evidenceSnapshot)}
              </pre>
            </div>
          )}
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
            Graph Signals
          </div>

          {userId <= 0 ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Enter a user ID to inspect graph signals.
            </div>
          ) : !graph ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Graph signals not available.
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  STRENGTHS
                </div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {Array.isArray(graphSignals?.strengths) && graphSignals.strengths.length > 0
                    ? graphSignals.strengths.join(", ")
                    : "—"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  PRESSURES
                </div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {Array.isArray(graphSignals?.pressures) && graphSignals.pressures.length > 0
                    ? graphSignals.pressures.join(", ")
                    : "—"}
                </div>
              </div>

              <div style={softCard()}>
                <div style={{ fontSize: 12, color: "#64748B", fontWeight: 1000 }}>
                  RISK FLAGS
                </div>
                <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 900 }}>
                  {Array.isArray(graphSummary?.risk_flags) && graphSummary.risk_flags.length > 0
                    ? graphSummary.risk_flags.join(", ")
                    : "—"}
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Recompute Preview
          </div>

          {userId <= 0 ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Enter a user ID to inspect recompute preview.
            </div>
          ) : !recomputePreview ? (
            <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
              Recompute preview not available.
            </div>
          ) : (
            <div style={{ marginTop: 14 }}>
              <pre
                style={{
                  ...softCard(),
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  fontSize: 12,
                  color: "#334155",
                }}
              >
                {prettyValue(recomputePreview)}
              </pre>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 18,
        }}
      >
        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Top Event Types
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {eventTypeSummary.length === 0 ? (
              <div style={{ color: "#6B7A88" }}>No event summary available.</div>
            ) : (
              eventTypeSummary.map(([label, count]) => (
                <div key={label} style={softCard()}>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#64748B" }}>{count} event(s)</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Recent Trust Events
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {filteredEvents.length === 0 ? (
              <div style={{ color: "#6B7A88" }}>No trust events found for this filter.</div>
            ) : null}

            {filteredEvents.slice(0, 20).map((row, idx) => {
              const meta = parseMeta(row);

              return (
                <div key={row.id || idx} style={softCard()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                      {safeStr(row.event_type, "event")}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      {safeStr(row.created_at, "—")}
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
                    <span>Clan: {safeStr(row.clan_id, "—")}</span>
                    <span>Loan: {safeStr(row.loan_id, "—")}</span>
                    <span>Actor: {safeStr(row.actor_user_id, "—")}</span>
                    <span>Subject: {safeStr(row.subject_user_id, "—")}</span>
                  </div>

                  {meta ? (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: "pointer", fontWeight: 900, color: "#0B1F33" }}>
                        Meta
                      </summary>
                      <pre
                        style={{
                          marginTop: 8,
                          whiteSpace: "pre-wrap",
                          fontSize: 12,
                          color: "#334155",
                        }}
                      >
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    </details>
                  ) : null}
                </div>
              );
            })}
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
            Graph Edge Counts
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {Object.keys(graphEdgeCounts || {}).length === 0 ? (
              <div style={{ color: "#6B7A88" }}>No graph edge counts available.</div>
            ) : (
              Object.entries(graphEdgeCounts).map(([label, count]) => (
                <div key={label} style={softCard()}>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#64748B" }}>{safeStr(count)} edge(s)</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Key Graph Edges
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            {topGraphEdges.length === 0 ? (
              <div style={{ color: "#6B7A88" }}>No graph edges available.</div>
            ) : (
              topGraphEdges.slice(0, 12).map((edge: any, idx: number) => (
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
                      {safeStr(edge?.edge_label, safeStr(edge?.edge_type, "edge"))}
                    </div>
                    <div style={{ color: "#64748B", fontSize: 13 }}>
                      status: {safeStr(edge?.status, "—")}
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
                    <span>source: {safeStr(edge?.source_node_id, "—")}</span>
                    <span>target: {safeStr(edge?.target_node_id, "—")}</span>
                    <span>loan: {safeStr(edge?.loan_id, "—")}</span>
                    <span>weight: {safeStr(edge?.weight, "—")}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <details style={{ marginTop: 18 }}>
        <summary style={{ cursor: "pointer", fontWeight: 1000, color: "#0B1F33" }}>
          Raw Graph Payload
        </summary>
        <pre
          style={{
            ...softCard(),
            marginTop: 12,
            whiteSpace: "pre-wrap",
            fontSize: 12,
            color: "#334155",
          }}
        >
          {prettyValue({
            graph_root_user_id: graph?.root_user_id,
            graph_nodes_total: graphNodes.length,
            graph_edges_total: graphEdges.length,
            summary: graphSummary,
            cci: graphCci,
            command_centre: graph?.command_centre || {},
          })}
        </pre>
      </details>
    </div>
  );
}