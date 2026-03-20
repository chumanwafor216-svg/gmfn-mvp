import React, { useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import {
  getPilotReadiness,
  getProtocolStatus,
  getSystemHealth,
} from "../lib/api";

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function statusBox(ok?: boolean): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: ok === true ? "#F0FDF4" : ok === false ? "#FEF2F2" : "#F8FAFC",
    padding: 18,
  };
}

export default function SystemOperationsPage() {
  const [health, setHealth] = useState<any>(null);
  const [protocol, setProtocol] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [err, setErr] = useState("");
  const [lastLoaded, setLastLoaded] = useState<string>("");

  async function load() {
    setErr("");
    try {
      const [h, p, r] = await Promise.all([
        getSystemHealth().catch(() => null),
        getProtocolStatus().catch(() => null),
        getPilotReadiness().catch(() => null),
      ]);
      setHealth(h);
      setProtocol(p);
      setReadiness(r);
      setLastLoaded(new Date().toLocaleString());
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load system operations."));
    }
  }

  useEffect(() => {
    load();
    const t = window.setInterval(load, 20000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav
        title="System Operations"
        subtitle="Use this page to monitor system condition, protocol progress, and pilot readiness from a central operations view."
      />

      {err ? (
        <div
          style={{
            ...card("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ ...card("#F8FBFF"), marginTop: 18 }}>
        <div style={{ color: "#64748B", fontSize: 13 }}>
          Last refresh: <b>{lastLoaded || "—"}</b>
        </div>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 18,
        }}
      >
        <div style={statusBox(health?.ok === true)}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>SYSTEM HEALTH</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
            {health?.ok ? "Healthy" : "Attention needed"}
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            Shows whether the technical platform is responding normally.
          </div>
        </div>

        <div style={statusBox()}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>PROTOCOL STAGE</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
            {protocol?.stage || "—"}
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            Shows which maturity stage the protocol currently reports.
          </div>
        </div>

        <div style={statusBox((Number(readiness?.blocked_count || 0) || 0) === 0)}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>PILOT STATUS</div>
          <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
            {readiness?.overall_status || "—"}
          </div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            Shows whether the current pilot state is broadly ready or needs intervention.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>System Health</div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, color: "#334155" }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Protocol Status</div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, color: "#334155" }}>
            {JSON.stringify(protocol, null, 2)}
          </pre>
        </div>

        <div style={{ ...card(), gridColumn: "1 / -1" }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Pilot Readiness</div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13, color: "#334155" }}>
            {JSON.stringify(readiness, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}