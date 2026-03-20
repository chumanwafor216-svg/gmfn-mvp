import React from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function card(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
  };
}

function bandInfo(score: number) {
  if (score >= 80) return { band: "A", label: "Ready for support request", bg: "#ECFDF5", tone: "#166534" };
  if (score >= 65) return { band: "B", label: "Likely acceptable", bg: "#EFF6FF", tone: "#1D4ED8" };
  if (score >= 50) return { band: "C", label: "Borderline – improve signals", bg: "#FFF7ED", tone: "#C2410C" };
  if (score >= 35) return { band: "D", label: "Weak – proceed carefully", bg: "#FEF2F2", tone: "#B91C1C" };
  return { band: "E", label: "Not recommended", bg: "#F8FAFC", tone: "#475569" };
}

export default function LoanReadinessPage() {
  const score = 45;
  const band = bandInfo(score);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <PageTopNav
        title="Loan Readiness"
        subtitle="Use this score to understand whether your current visible signals make support more realistic."
      />

      <div style={{ ...card(band.bg), marginTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>READINESS SCORE</div>
            <div style={{ marginTop: 8, fontSize: 48, fontWeight: 1000, color: "#0B1F33" }}>
              {score}
            </div>
            <div style={{ marginTop: 8, fontWeight: 1000, color: band.tone }}>
              Band {band.band} — {band.label}
            </div>
          </div>

          <div
            style={{
              minWidth: 220,
              borderRadius: 18,
              background: "#FFFFFF",
              border: "1px solid rgba(11,31,51,0.08)",
              padding: 16,
            }}
          >
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>RECOMMENDED THRESHOLD</div>
            <div style={{ marginTop: 8, fontWeight: 1000, fontSize: 26, color: "#0B1F33" }}>
              60+
            </div>
            <div style={{ marginTop: 6, color: "#64748b", lineHeight: 1.6 }}>
              Below this, members may still support you, but hesitation is more likely.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, color: "#475569", lineHeight: 1.8 }}>
          Your current score suggests that support is still possible, but stronger visible signals would improve confidence.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Score guide
          </div>
          <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.9 }}>
            <b>80–100:</b> Strong readiness. Good position to proceed.
            <br />
            <b>65–79:</b> Reasonable readiness. Likely acceptable.
            <br />
            <b>50–64:</b> Borderline. Improve some visible signals first.
            <br />
            <b>35–49:</b> Weak. Proceed carefully and expect hesitation.
            <br />
            <b>0–34:</b> Too weak for a confident request.
          </div>
        </div>

        <div style={card()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Why this matters
          </div>
          <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
            Readiness does not approve or reject a support request by itself.
            It helps you think more realistically before proceeding and avoids unnecessary weak requests.
          </div>
        </div>
      </div>

      <div style={card()}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Suggested next step
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          Improve your visible participation, then use guided suggestions before asking people directly.
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/loan-suggestions" style={actionLink(true)}>
            Open Guided Suggestions
          </Link>
          <Link to="/payment/pool" style={actionLink(false)}>
            Deposit to Pool
          </Link>
          <Link to="/loan-workbench" style={actionLink(false)}>
            Open Workbench
          </Link>
        </div>
      </div>
    </div>
  );
}