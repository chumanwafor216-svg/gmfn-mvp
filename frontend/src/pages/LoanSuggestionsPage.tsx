import React from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function tipCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#F8FAFC",
    padding: 18,
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

const score = 45;

const suggestions = [
  {
    title: "Keep your request modest",
    note: "Because your readiness is still weak, a smaller and more realistic request may be easier for members to support.",
    action: { to: "/loan-workbench", label: "Open Workbench" },
  },
  {
    title: "Strengthen your pool position first",
    note: "A visible contribution record can improve confidence before you ask for more support.",
    action: { to: "/payment/pool", label: "Deposit to Pool" },
  },
  {
    title: "Use the workbench before requesting directly",
    note: "The workbench helps you think through amount, support path, and guarantor logic more carefully.",
    action: { to: "/loan-workbench", label: "Open Workbench" },
  },
];

export default function LoanSuggestionsPage() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto" }}>
      <PageTopNav
        title="Guided Suggestions"
        subtitle="These suggestions respond to your current readiness state and help you decide the best next step."
      />

      <div style={{ ...card(), marginTop: 18, background: "#F8FBFF" }}>
        <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
          Based on your current readiness score of {score}
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          These suggestions are for members. They are meant to help you move more realistically, not to block you.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {suggestions.map((s, idx) => (
          <div key={idx} style={tipCard()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "start" }}>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {s.title}
                </div>
                <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                  {s.note}
                </div>
              </div>

              <div>
                <Link to={s.action.to} style={actionLink(idx === 0)}>
                  {s.action.label}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          General note
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          The best early progress often comes from building visible consistency before asking for a larger support decision.
        </div>
      </div>
    </div>
  );
}