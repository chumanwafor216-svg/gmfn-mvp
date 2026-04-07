import React from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function tipCard(bg = "#F8FAFC"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
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

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

const suggestions = [
  {
    title: "Prepare the request in the workbench first",
    note:
      "Before asking people directly, shape the amount, timing, purpose, and repayment path more clearly in the workbench.",
    action: { to: "/app/loan-workbench", label: "Open Workbench" },
  },
  {
    title: "Strengthen your visible trust position",
    note:
      "If your trust reading is unclear or weak, improve the visible signals first so people can feel more confident about helping.",
    action: { to: "/app/trust", label: "Open Trust" },
  },
  {
    title: "Show clearer money participation",
    note:
      "Visible contribution or money movement can make support feel more realistic than asking from a completely cold position.",
    action: { to: "/app/payment/pool", label: "Money In" },
  },
  {
    title: "Review readiness before making the ask",
    note:
      "Use readiness as a reality check so that the request is timed better and does not feel rushed or unsupported.",
    action: { to: "/app/loan-readiness", label: "Open Readiness" },
  },
];

export default function LoanSuggestionsPage() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Guided Suggestions"
        subtitle="Use these member-facing suggestions to choose the best next step before making a support request."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Suggestion guide</div>

        <div
          style={{
            marginTop: 10,
            fontWeight: 1000,
            color: "#0B1F33",
            fontSize: 28,
            lineHeight: 1.2,
          }}
        >
          Move in a realistic order, not in a rushed order
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          These suggestions are for members. They help you choose the strongest
          next move without pretending that support is automatic.
        </div>
      </div>

      <div
        style={{
          ...pageCard("#FFFDF5"),
          marginTop: 18,
          border: "1px solid rgba(214,175,71,0.25)",
        }}
      >
        <div style={{ fontWeight: 1000, color: "#92400E" }}>
          Live suggestion scoring
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          A fully adaptive suggestion engine driven by recorded trust and money
          events is future-only until it is fully wired. For now, use the
          practical guidance below.
        </div>
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 14 }}>
        {suggestions.map((suggestion, idx) => (
          <div key={idx} style={tipCard()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                flexWrap: "wrap",
                alignItems: "start",
              }}
            >
              <div style={{ flex: 1, minWidth: 240 }}>
                <div
                  style={{
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {suggestion.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.8,
                  }}
                >
                  {suggestion.note}
                </div>
              </div>

              <div>
                <Link to={suggestion.action.to} style={actionLink(idx === 0)}>
                  {suggestion.action.label}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <div style={pageCard()}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            Best preparation order
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            Trust clarity first.
            <br />
            Money path clarity second.
            <br />
            Workbench preparation third.
            <br />
            Actual support request after that.
          </div>
        </div>

        <div style={pageCard()}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            General note
          </div>

          <div
            style={{
              marginTop: 10,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            The best early progress usually comes from building visible
            consistency before asking for a larger support decision.
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div
          style={{
            fontSize: 18,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Next useful move
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          Start in the workbench, then return to readiness and loans when the
          request is better prepared.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loan-workbench" style={actionLink(true)}>
            Open Workbench
          </Link>
          <Link to="/app/loan-readiness" style={actionLink(false)}>
            Open Readiness
          </Link>
          <Link to="/app/loans" style={actionLink(false)}>
            Return to Loans & Support
          </Link>
        </div>
      </div>
    </div>
  );
}