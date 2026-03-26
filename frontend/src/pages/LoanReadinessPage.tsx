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

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
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

const strongerSignals = [
  "Your trust position is visible and understandable.",
  "Your TrustSlip is ready to show when needed.",
  "Your pool participation or money movement is clear.",
  "Your support request is specific, realistic, and time-bound.",
  "Your workbench details are prepared before asking others to help.",
];

const weakerSignals = [
  "Your trust position is unclear or weak.",
  "Your request is vague, rushed, or inconsistent.",
  "Your money path is not clear enough for others to understand.",
  "You are asking before preparing the practical details.",
  "Your visible actions do not yet support the size of the request.",
];

export default function LoanReadinessPage() {
  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Loan Readiness"
        subtitle="Use this page to judge whether your visible signals make a support request more realistic."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Readiness guidance</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 30,
            fontWeight: 1000,
            color: "#0B1F33",
            lineHeight: 1.15,
          }}
        >
          Use readiness before you ask people for support
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#475569",
            lineHeight: 1.8,
            maxWidth: 860,
          }}
        >
          Loan readiness is a member-facing guidance surface. It helps you judge
          whether your current visible trust, money flow, and preparation are
          strong enough to make a support request feel realistic.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loan-suggestions" style={actionLink(true)}>
            Open Guided Suggestions
          </Link>
          <Link to="/app/loan-workbench" style={actionLink(false)}>
            Open Workbench
          </Link>
          <Link to="/app/trust" style={actionLink(false)}>
            Open Trust
          </Link>
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
          Live readiness score
        </div>

        <div
          style={{
            marginTop: 8,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          A live readiness score is future-only until it is fully wired to
          recorded trust and money events. For now, use the readiness guide
          below instead of relying on a fake number.
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
        <div style={pageCard()}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What improves readiness
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {strongerSignals.map((item, index) => (
              <div key={index} style={innerCard("#F8FBFF")}>
                <div
                  style={{
                    color: "#475569",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
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
            What weakens readiness
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {weakerSignals.map((item, index) => (
              <div key={index} style={innerCard("#FFFFFF")}>
                <div
                  style={{
                    color: "#475569",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {item}
                </div>
              </div>
            ))}
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
        <div style={softCard("#FFFFFF")}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            What this page is for
          </div>

          <div
            style={{
              marginTop: 12,
              color: "#475569",
              lineHeight: 1.9,
            }}
          >
            Readiness does not approve or reject a support request by itself.
            It helps you think realistically before proceeding and reduces weak
            or badly timed requests.
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
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
              marginTop: 12,
              color: "#475569",
              lineHeight: 1.9,
            }}
          >
            Start with trust clarity, then money path clarity, then request
            clarity. After that, move into suggestions and workbench before
            asking for help directly.
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
          Suggested next step
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#475569",
            lineHeight: 1.8,
          }}
        >
          Improve your visible preparation, then use the guided support tools
          before making the request itself.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loan-suggestions" style={actionLink(true)}>
            Open Guided Suggestions
          </Link>
          <Link to="/app/payment/pool" style={actionLink(false)}>
            Money In
          </Link>
          <Link to="/app/loan-workbench" style={actionLink(false)}>
            Open Workbench
          </Link>
          <Link to="/app/community" style={actionLink(false)}>
            Community Home
          </Link>
        </div>
      </div>
    </div>
  );
}