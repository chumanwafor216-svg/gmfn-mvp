// FILE: src/pages/BorrowerPreflightPage.tsx
import React, { useMemo } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { StableCtaLink } from "../components/StableButton";
import { getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    border: "1px solid rgba(108,138,184,0.18)",
    boxShadow: "0 24px 52px rgba(15,23,42,0.08)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    border: "1px solid rgba(125,154,196,0.18)",
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F5F9FF 100%)"
        : bg,
    border: "1px solid rgba(122,152,195,0.18)",
    boxShadow: "0 14px 30px rgba(15,23,42,0.05)",
  };
}

function actionLink(primary = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(124,154,196,0.18)",
    background: primary
      ? "linear-gradient(180deg, #1C5FD2 0%, #1749B6 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F1F7FF 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    boxShadow: primary
      ? "0 14px 30px rgba(29,95,212,0.25)"
      : "0 12px 24px rgba(15,23,42,0.06)",
  };
}

function statusItem(ok: boolean): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(124,154,196,0.16)",
    background: ok
      ? "linear-gradient(180deg, #F0FDF4 0%, #ECFDF5 100%)"
      : "linear-gradient(180deg, #FFF7ED 0%, #FFFBEB 100%)",
    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
    padding: 16,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#39526C",
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#4F657B",
    fontSize: 14.5,
    lineHeight: 1.75,
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

function iconTile(
  icon: GsnIconName,
  tone: "ready" | "warning" | "neutral" = "neutral"
): React.ReactNode {
  const palette =
    tone === "ready"
      ? { bg: "#DCFCE7", color: "#166534", border: "rgba(22,101,52,0.14)" }
      : tone === "warning"
        ? { bg: "#FEF3C7", color: "#92400E", border: "rgba(146,64,14,0.14)" }
        : { bg: "#EAF3FF", color: "#0B63D1", border: "rgba(11,99,209,0.14)" };

  return (
    <span
      style={{
        width: 44,
        height: 44,
        borderRadius: 15,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        flex: "0 0 auto",
      }}
    >
      <GsnLegacyIcon name={icon} size={32} />
    </span>
  );
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  hash?: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId, hash }).to);
}

export default function BorrowerPreflightPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "borrower-preflight.nav.dashboard"),
      loans: routeTarget("loans", selectedClanId, "borrower-preflight.open-loans"),
      readiness: routeTarget(
        "loanReadiness",
        selectedClanId,
        "borrower-preflight.open-readiness"
      ),
      commitments: routeTarget(
        "dashboard",
        selectedClanId,
        "borrower-preflight.open-commitments",
        "focus-commitments"
      ),
    }),
    [selectedClanId]
  );
  const checks = [
    {
      ok: true,
      icon: "community" as const,
      title: "Community visibility is ready",
      note: "Your community membership is visible enough to support a first trust review.",
    },
    {
      ok: true,
      icon: "shield" as const,
      title: "Trust position is showing",
      note: "Your visible standing is already strong enough to support an early conversation.",
    },
    {
      ok: false,
      icon: "wallet" as const,
      title: "Pool participation could be stronger",
      note: "A little more visible contribution activity can make support confidence clearer.",
    },
    {
      ok: false,
      icon: "chart" as const,
      title: "Readiness still needs strengthening",
      note: "Check Support Readiness before making a request if you want a cleaner path.",
    },
  ];

  const readyCount = checks.filter((item) => item.ok).length;
  const improveCount = checks.length - readyCount;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 40 }}>
      <PageTopNav
        sectionLabel="Support Readiness"
        title="Support Readiness"
        subtitle="Quickly check whether your visible signals are strong enough before you move toward a support request."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loan Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page helps you check your visible support signals before you ask for help."
        why="It does not approve or reject you. It helps you avoid walking into a weak request too early. Finance later records what really happened with money, but this screen helps you judge your position before the request begins."
        next="Read the ready signals first, strengthen the weak ones, then move into Support Readiness or Loan Support."
        tone="blue"
      />

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Support Check</div>
        <div style={{ marginTop: 8, fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
          Check your position before you ask
        </div>
        <div style={{ ...helperText(), marginTop: 8, maxWidth: 760 }}>
          This does not approve or reject you. It helps you see whether your
          visible signals are strong enough before you make a support request.
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: 16,
          }}
        >
          <div style={statTile("#F0FDF4")}>
            <div style={sectionLabel()}>{labelWithIcon("check", "Ready Signals")}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000, color: "#065F46" }}>
              {readyCount}
            </div>
          </div>
          <div style={statTile("#FFFBEB")}>
            <div style={sectionLabel()}>{labelWithIcon("alert", "Strengthen First")}</div>
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000, color: "#92400E" }}>
              {improveCount}
            </div>
          </div>
          <div style={statTile()}>
            <div style={sectionLabel()}>{labelWithIcon("navigation", "Best Next Step")}</div>
            <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
              Support Readiness
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>What To Check</div>
        <div style={{ ...helperText(), marginTop: 8 }}>
          Read the green items as strengths already visible. Read the amber items
          as the first places to strengthen before you ask for support.
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {checks.map((item, idx) => (
            <div key={idx} style={statusItem(item.ok)}>
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {iconTile(item.icon, item.ok ? "ready" : "warning")}
                <div>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                    {item.ok ? "Ready now" : "Strengthen first"}: {item.title}
                  </div>
                  <div style={{ marginTop: 8, ...helperText() }}>{item.note}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Next Steps</div>
        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            marginTop: 14,
          }}
        >
          <div style={innerCard()}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
              {labelWithIcon("wallet", "Open Loan Support")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Return to the main support doors after this quick support check.
            </div>
          </div>
          <div style={innerCard("#F8FBFF")}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
              {labelWithIcon("chart", "Check Support Readiness")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Read deeper signals, blockers, and what can improve confidence.
            </div>
          </div>
          <div style={innerCard()}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
              {labelWithIcon("pen", "Open Commitment Builder")}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Strengthen the visible discipline that later helps support trust.
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StableCtaLink
            to={routes.loans}
            minWidth={158}
            stableHeight={52}
            debugId="borrower-preflight.open-loans"
            style={actionLink(false)}
          >
            {labelWithIcon("wallet", "Open Loan Support")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.readiness}
            minWidth={158}
            stableHeight={52}
            debugId="borrower-preflight.open-readiness"
            style={actionLink(true)}
          >
            {labelWithIcon("chart", "Check Support Readiness")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.commitments}
            minWidth={158}
            stableHeight={52}
            debugId="borrower-preflight.open-commitments"
            style={actionLink(false)}
          >
            {labelWithIcon("pen", "Open Commitment Builder")}
          </StableCtaLink>
        </div>
      </section>

    </div>
  );
}
