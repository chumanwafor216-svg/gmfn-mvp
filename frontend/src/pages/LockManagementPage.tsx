import React from "react";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink } from "../components/StableButton";
import { getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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

function labelWithIcon(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={icon} size={24} />
      <span>{label}</span>
    </span>
  );
}

function cardHeading(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 42,
          height: 42,
          borderRadius: 14,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#EAF3FF",
          color: "#0B63D1",
          border: "1px solid rgba(11,99,209,0.14)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={32} />
      </span>
      <span>{label}</span>
    </span>
  );
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function LockManagementPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = React.useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "lock-management.route.dashboard"),
      workbench: routeTarget("loanWorkbench", selectedClanId, "lock-management.route.workbench"),
      systemOperations: routeTarget(
        "systemOperations",
        selectedClanId,
        "lock-management.route.system-operations"
      ),
    }),
    [selectedClanId]
  );

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
        subtitle="Guarantee release is paused until GSN can verify the release safely."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.dashboard}
      />

      <section
        style={pageCard("linear-gradient(180deg, #FFFBEF 0%, #FFFFFF 100%)")}
      >
        <div style={sectionLabel()}>Current Status</div>

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
          Guarantee release is not available yet.
        </div>

        <div style={{ marginTop: 12, ...helperText(), maxWidth: 900 }}>
          GSN will not show a release button until the repayment, cancellation,
          or admin decision can be checked safely. That protects the member,
          guarantor, and community record from a release that cannot be defended.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
          }}
        >
          <span style={badge(true)}>{labelWithIcon("lock", "Release paused")}</span>
          <span style={badge(false)}>{labelWithIcon("shield", "Verified path needed")}</span>
          <span style={badge(false)}>{labelWithIcon("document", "Read-only guidance")}</span>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Why Release Is Paused</div>

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
              {cardHeading("wallet", "Real money is involved")}
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
              {cardHeading("shield", "The release must be verified")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              GSN must confirm the release rule before the page lets anyone
              change a guarantee record.
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
              {cardHeading("check", "No false controls")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              If a safe release path is not live, the page should say so clearly
              instead of offering a button that cannot finish the job.
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>What Must Be True First</div>

        <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
          <div style={softCard("#F8FBFF")}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 16,
              }}
            >
              {cardHeading("lock", "1. A verified release action")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              GSN must be able to release a guarantee only after repayment,
              cancellation, or an approved admin decision is confirmed.
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
              {cardHeading("document", "2. A clear audit trail")}
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
              {cardHeading("shield", "3. Guarded rollout")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              This action should open only when the full release path has been
              checked, tested, and approved for use.
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div style={sectionLabel()}>Use These Pages Now</div>

        <div style={{ marginTop: 14, ...helperText(), maxWidth: 860 }}>
          These pages show the live loan, exposure, and operations records that
          can still guide the next decision.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <StableCtaLink
            to={routes.workbench}
            kind="primary"
            stableHeight={52}
            debugId="lock-management.open-workbench"
          >
            {labelWithIcon("briefcase", "Open Loan Workbench")}
          </StableCtaLink>

          <StableCtaLink
            to={routes.systemOperations}
            kind="secondary"
            stableHeight={52}
            debugId="lock-management.open-system-operations"
          >
            {labelWithIcon("shield", "Open System Operations")}
          </StableCtaLink>

          <StableCtaLink
            to={routes.dashboard}
            kind="soft"
            stableHeight={52}
            debugId="lock-management.back-dashboard"
          >
            {labelWithIcon("home", "Back to Dashboard")}
          </StableCtaLink>
        </div>
      </section>
    </div>
  );
}
