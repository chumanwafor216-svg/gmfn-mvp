import React, { useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { getExposureAdmin } from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function infoCard(title: string, body: string): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 16,
  };
}

export default function ExposureAdminPage() {
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await getExposureAdmin();
        setData(res || null);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load exposure admin view."));
      }
    })();
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <PageTopNav
        title="Safety & Risk"
        subtitle="Use this page to understand exposure concentration, pilot risk conditions, and governance-sensitive patterns."
      />

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

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={infoCard("Exposure Concentration", "Use this section to notice when a small number of users carry too much support or guarantee exposure. Concentrated exposure can create fragility.")}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Exposure Concentration</div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            Use this to notice when one borrower, one guarantor, or one small group is carrying too much support.
          </div>
        </div>

        <div style={infoCard("Pilot Risk Review", "Use this section to monitor unusual pilot-stage patterns, especially where behaviour is changing faster than expected.")}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Pilot Risk Review</div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            This helps staff notice sudden spikes, strange activity, or repeated weak requests during the pilot phase.
          </div>
        </div>

        <div style={infoCard("Deterministic Governance", "Use this section to verify that support decisions are still following protocol logic, not accidental or arbitrary overrides.")}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Deterministic Governance</div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            This helps staff understand whether the system is behaving in a predictable, rule-based way.
          </div>
        </div>

        <div style={infoCard("Exposure Rules", "Use this section to understand why the system limits support, who may need review, and which patterns should trigger intervention.")}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Exposure Rules</div>
          <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
            This shows how protocol rules help contain risk before it becomes dangerous.
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Live Exposure Data</div>
        <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}