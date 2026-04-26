import React from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      textAlign: "center",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "normal",
      textAlign: "center",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    opacity: disabled ? 0.86 : 1,
  };
}

export default function LockManagementPage() {
  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="Lock Management"
        title="Guarantee Lock Management"
        subtitle="This is intentionally read-only in the MVP because the backend does not expose a guarantee lock-release endpoint yet."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
      />

      <section
        style={pageCard("linear-gradient(180deg, #FFFBEF 0%, #FFFFFF 100%)")}
      >
        <div style={sectionLabel()}>MVP status</div>

        <div
          style={{
            marginTop: 10,
            color: "#0B1F33",
            fontWeight: 900,
            fontSize: 30,
            lineHeight: 1.12,
            maxWidth: 860,
          }}
        >
          Lock release is not enabled in this build.
        </div>

        <div style={{ marginTop: 12, ...helperText(), maxWidth: 900 }}>
          Do not pretend this action exists when the backend cannot perform it.
          A fake page wastes testing time and creates false confidence.
          Until the backend exposes a real audited release-lock endpoint, this page
          remains informational only.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>Disabled in MVP</span>
          <span style={badge(false)}>Backend endpoint missing</span>
          <span style={badge(false)}>Read-only admin note</span>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Why this is blocked</div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Real money logic
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Releasing guarantee locks is not a cosmetic action. It affects
              exposure, auditability, and user trust.
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              Backend authority required
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This action must be enforced server-side with proper validation,
              not simulated from the frontend.
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              MVP discipline
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              If the endpoint is absent, the UI should say so clearly and stop
              there. That is cleaner than a dead button with fake inputs.
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What is needed later</div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={softCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              1. Backend release endpoint
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              A real server endpoint must exist to release guarantee locks only
              when repayment or cancellation rules are satisfied.
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              2. Audit trail
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Every release action should record who triggered it, why it was
              allowed, and which loan or guarantee relationships were affected.
            </div>
          </div>

          <div style={softCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              3. Feature branch only
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This should be implemented after MVP freeze on a dedicated branch,
              not mixed into stable pass-testing.
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Use these pages instead</div>

        <div style={{ marginTop: 14, ...helperText(), maxWidth: 860 }}>
          For this pass, keep people on the real pages that already exist and
          already work.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <OriginLink to="/app/loan-workbench" style={actionBtn("primary")}>
            Open Loan Workbench
          </OriginLink>

          <OriginLink
            to="/app/command-center/system-operations"
            style={actionBtn("secondary")}
          >
            Open System Operations
          </OriginLink>

          <OriginLink to="/app/dashboard" style={actionBtn("soft")}>
            Back to Dashboard
          </OriginLink>
        </div>
      </section>
    </div>
  );
}

