import React, { useEffect, useState } from "react";
import {
  getPilotReadiness,
  getProtocolStatus,
  getSettlementConfig,
  getSystemHealth,
} from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

export default function PilotShowcasePage() {
  const [health, setHealth] = useState<any>(null);
  const [status, setStatus] = useState<any>(null);
  const [readiness, setReadiness] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const [h, s, r, c] = await Promise.all([
          getSystemHealth().catch(() => null),
          getProtocolStatus().catch(() => null),
          getPilotReadiness().catch(() => null),
          getSettlementConfig().catch(() => null),
        ]);
        setHealth(h);
        setStatus(s);
        setReadiness(r);
        setSettlement(c);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load pilot showcase."));
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Pilot Showcase
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Operational readiness snapshot for GMFN pilot deployment.
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
            System Health
          </div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Pilot Readiness
          </div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
            {JSON.stringify(readiness, null, 2)}
          </pre>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Protocol Status
          </div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
            {JSON.stringify(status, null, 2)}
          </pre>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Settlement Config
          </div>
          <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
            {JSON.stringify(settlement, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}