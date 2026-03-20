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

function statusItem(ok: boolean, title: string, note: string): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: ok ? "#F0FDF4" : "#FFF7ED",
    padding: 16,
  };
}

function actionLink(primary = false): React.CSSProperties {
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

export default function BorrowerPreflightPage() {
  const checks = [
    {
      ok: true,
      title: "Community visible",
      note: "Your community membership is visible and can support trust review.",
    },
    {
      ok: true,
      title: "Trust position visible",
      note: "Your standing is visible enough for early preflight review.",
    },
    {
      ok: false,
      title: "Pool participation could improve",
      note: "More visible contribution activity may improve confidence before you proceed.",
    },
    {
      ok: false,
      title: "Recent readiness may be weak",
      note: "You may want to review your loan readiness score before requesting support.",
    },
  ];

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        title="Support Readiness"
        subtitle="Use this page to quickly check whether you are in a good position to move toward a support request."
      />

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Why this matters
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          This page does not approve or reject your request. It helps you avoid wasting time
          and understand whether your visible signals are strong enough before moving forward.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Preflight Checklist
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {checks.map((item, idx) => (
            <div key={idx} style={statusItem(item.ok, item.title, item.note)}>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                {item.ok ? "✓ " : "⚠ "} {item.title}
              </div>
              <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.7 }}>
                {item.note}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/loans" style={actionLink(false)}>
            Open Finances
          </Link>
          <Link to="/loan-readiness" style={actionLink(true)}>
            Check Loan Readiness
          </Link>
        </div>
      </div>
    </div>
  );
}