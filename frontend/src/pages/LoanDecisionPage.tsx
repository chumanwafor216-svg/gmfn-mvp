import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { StableCtaLink } from "../components/StableButton";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { getSelectedClanId, listMyLoans } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type LoanRow = {
  id?: number;
  amount?: string | number | null;
  created_at?: string | null;
  currency?: string | null;
  guarantor_name?: string | null;
  purpose?: string | null;
  borrower_name?: string | null;
  status?: string | null;
  title?: string | null;
};

function safeStr(x: unknown): string {
  return String(x ?? "").trim();
}

function fmtMoney(x: unknown): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return safeStr(x) || "0.00";
  return n.toFixed(2);
}

function safeDateTime(value: unknown): string {
  const raw = safeStr(value);
  if (!raw) return "Not yet recorded";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  return date.toLocaleString();
}

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

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    background:
      bg === "#F8FBFF"
        ? "linear-gradient(180deg, #FCFEFF 0%, #EDF5FF 100%)"
        : bg,
    border: "1px solid rgba(123,153,197,0.18)",
    boxShadow: "0 18px 40px rgba(15,23,42,0.06)",
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

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    minWidth: 148,
    padding: "12px 16px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(124,154,196,0.18)",
    background: primary
      ? "linear-gradient(180deg, #1C5FD2 0%, #1749B6 100%)"
      : "linear-gradient(180deg, #FFFFFF 0%, #F1F7FF 100%)",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
    overflowWrap: "normal",
    overflow: "hidden",
    textOverflow: "ellipsis",
    boxShadow: primary
      ? "0 14px 30px rgba(29,95,212,0.25)"
      : "0 12px 24px rgba(15,23,42,0.06)",
  };
}

function loanDecisionActionText(name: GsnIconName, label: React.ReactNode, size = 22) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        whiteSpace: "nowrap",
      }}
    >
      <GsnLegacyIcon name={name} size={size} />
      <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis" }}>
        {label}
      </span>
    </span>
  );
}

function loanDecisionFactHeading(name: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        color: "#39526C",
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.35,
        textTransform: "uppercase",
      }}
    >
      <GsnLegacyIcon name={name} size={22} />
      <span>{label}</span>
    </span>
  );
}

function statusStyle(status: string): React.CSSProperties {
  const s = safeStr(status).toLowerCase();

  if (s.includes("approved") || s.includes("repaid") || s.includes("active")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#ECFDF5",
      border: "1px solid #A7F3D0",
      color: "#065F46",
      fontWeight: 1000,
      fontSize: 12,
    };
  }

  if (s.includes("pending") || s.includes("review")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FFFBEB",
      border: "1px solid #FDE68A",
      color: "#92400E",
      fontWeight: 1000,
      fontSize: 12,
    };
  }

  if (s.includes("declined") || s.includes("cancel") || s.includes("default")) {
    return {
      padding: "6px 10px",
      borderRadius: 999,
      background: "#FEF2F2",
      border: "1px solid #FECACA",
      color: "#991B1B",
      fontWeight: 1000,
      fontSize: 12,
    };
  }

  return {
    padding: "6px 10px",
    borderRadius: 999,
    background: "#F8FAFC",
    border: "1px solid #E2E8F0",
    color: "#475569",
    fontWeight: 1000,
    fontSize: 12,
  };
}

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string,
  extra: { loanId?: number | string } = {}
): string {
  return resolveCtaTarget(intent, { communityId, debugId, ...extra }).to as string;
}

export default function LoanDecisionPage() {
  const [loans, setLoans] = useState<LoanRow[]>([]);
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "loan-decision.route.dashboard"),
      loans: routeTarget("loans", selectedClanId, "loan-decision.route.loans"),
      workbench: routeTarget("loanWorkbench", selectedClanId, "loan-decision.route.workbench"),
      finance: routeTarget("finance", selectedClanId, "loan-decision.route.finance"),
    }),
    [selectedClanId]
  );

  useEffect(() => {
    (async () => {
      const res = await listMyLoans().catch(() => []);
      const items = Array.isArray(res) ? res : res?.items || [];
      setLoans(items || []);
    })();
  }, []);

  const decisionSummary = useMemo(() => {
    let openCount = 0;
    let approvedCount = 0;
    let reviewCount = 0;

    loans.forEach((loan) => {
      const status = safeStr(loan?.status).toLowerCase();
      if (status.includes("approved") || status.includes("active")) {
        approvedCount += 1;
      } else if (status.includes("pending") || status.includes("review")) {
        reviewCount += 1;
      } else {
        openCount += 1;
      }
    });

    return {
      total: loans.length,
      approved: approvedCount,
      review: reviewCount,
      other: openCount,
    };
  }, [loans]);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", paddingBottom: 40 }}>
      <PageTopNav
        sectionLabel="Support Decisions"
        title="Support Decisions"
        subtitle="Read each support item in a calmer decision view before moving back into workbench action."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.loans}
        backLabel="Loan Support"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page gives you a calmer reading view for live support decisions before you act."
        why="Loan Support is still the main working door, and Finance still keeps the wider money file across communities. This screen helps you read one support position without mixing it with every other money record."
        next="Read the current support item first, then move into Support Summary or the Workbench only when you are ready to act."
        tone="blue"
      />

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Decision Snapshot</div>
        <div style={{ marginTop: 8, fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
          Read support outcomes without confusion
        </div>
        <div style={{ ...helperText(), marginTop: 8, maxWidth: 760 }}>
          Keep this page for calm reading. When a support item needs action, jump
          from here into the workbench or the support summary instead of trying to
          decode everything from Finance.
        </div>

        <div
          style={{
            display: "grid",
            gap: 12,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: 16,
          }}
        >
          <div style={statTile()}>
            {loanDecisionFactHeading("document", "Visible Items")}
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000, color: "#0B1F33" }}>
              {decisionSummary.total}
            </div>
          </div>
          <div style={statTile("#F0FDF4")}>
            {loanDecisionFactHeading("check", "Approved Or Active")}
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000, color: "#065F46" }}>
              {decisionSummary.approved}
            </div>
          </div>
          <div style={statTile("#FFFBEB")}>
            {loanDecisionFactHeading("alert", "Waiting Review")}
            <div style={{ marginTop: 8, fontSize: 28, fontWeight: 1000, color: "#92400E" }}>
              {decisionSummary.review}
            </div>
          </div>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Current Support Items</div>
        <div style={{ ...helperText(), marginTop: 8 }}>
          Each card keeps the live support item, its amount, the last visible
          status, and the next useful door.
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 14 }}>
          {loans.length === 0 ? (
            <div style={{ ...softCard(), display: "flex", gap: 12, alignItems: "center" }}>
              <GsnLegacyIcon name="document" size={46} />
              <div>
                <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
                  No visible support decisions yet
                </div>
                <div style={{ ...helperText(), marginTop: 8 }}>
                  When a support item enters review, approval, repayment, or closure,
                  it will appear here in a calmer reading format.
                </div>
              </div>
            </div>
          ) : (
            loans.map((loan, index) => {
              const loanId = Number(loan?.id || 0);
              const loanTitle =
                safeStr(loan?.title) ||
                safeStr(loan?.purpose) ||
                `Support item #${loanId || index + 1}`;
              const amountText = `${fmtMoney(loan?.amount ?? 0)} ${safeStr(loan?.currency || "NGN")}`;
              const loanStatus = safeStr(loan?.status) || "Status not recorded yet";

              return (
                <div key={loanId || index} style={softCard()}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 20 }}>
                        {loanTitle}
                      </div>
                      <div style={{ marginTop: 6, ...helperText() }}>
                        Recorded {safeDateTime(loan?.created_at)}
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={statusStyle(loanStatus)}>
                        {loanStatus}
                      </span>
                      <span style={statusStyle("neutral")}>{amountText}</span>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 14,
                      display: "grid",
                      gap: 12,
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <div style={innerCard()}>
                      {loanDecisionFactHeading("user", "Requester")}
                      <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33" }}>
                        {safeStr(loan?.borrower_name) || "Not visible yet"}
                      </div>
                    </div>
                    <div style={innerCard()}>
                      {loanDecisionFactHeading("shield", "Supporter")}
                      <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33" }}>
                        {safeStr(loan?.guarantor_name) || "Not linked yet"}
                      </div>
                    </div>
                    <div style={innerCard("#F8FBFF")}>
                      {loanDecisionFactHeading("document", "Purpose")}
                      <div style={{ marginTop: 8, color: "#0B1F33", lineHeight: 1.65 }}>
                        {safeStr(loan?.purpose) || "Purpose is still being prepared."}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <StableCtaLink
                      debugId={`loan-decision.${loanId || index}.summary`}
                      to={
                        loanId > 0
                          ? routeTarget(
                              "loanSummary",
                              selectedClanId,
                              `loan-decision.${loanId || index}.summary`,
                              { loanId }
                            )
                          : routes.loans
                      }
                      stableHeight={48}
                      style={actionLink(true)}
                    >
                      {loanDecisionActionText("document", "Summary", 20)}
                    </StableCtaLink>
                    <StableCtaLink
                      to={routes.workbench}
                      stableHeight={48}
                      debugId={`loan-decision.${loanId || index}.workbench`}
                      style={actionLink(false)}
                    >
                      {loanDecisionActionText("briefcase", "Workbench", 20)}
                    </StableCtaLink>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Next Doors</div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StableCtaLink
            to={routes.workbench}
            stableHeight={48}
            debugId="loan-decision.route.workbench"
            style={actionLink(true)}
          >
            {loanDecisionActionText("briefcase", "Workbench", 20)}
          </StableCtaLink>
          <StableCtaLink
            to={routes.loans}
            stableHeight={48}
            debugId="loan-decision.route.loans"
            style={actionLink(false)}
          >
            {loanDecisionActionText("community", "Loan Support", 20)}
          </StableCtaLink>
          <StableCtaLink
            to={routes.finance}
            stableHeight={48}
            debugId="loan-decision.route.finance"
            style={actionLink(false)}
          >
            {loanDecisionActionText("wallet", "Finance", 20)}
          </StableCtaLink>
        </div>
      </section>

    </div>
  );
}
