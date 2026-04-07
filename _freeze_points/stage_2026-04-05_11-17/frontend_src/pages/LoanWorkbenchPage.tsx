import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getSelectedClanId, listMyLoans } from "../lib/api";

type LoanItem = {
  id?: number;
  clan_id?: number;
  amount?: string | number | null;
  remaining_amount?: string | number | null;
  currency?: string | null;
  purpose?: string | null;
  status?: string | null;
  created_at?: string | null;
  due_at?: string | null;
  note?: string | null;
  title?: string | null;
  role?: string | null;
  borrower_name?: string | null;
};

type CommunityLite = {
  id?: number;
  clan_id?: number;
  name?: string | null;
  marketplace_name?: string | null;
};

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
  ctaTo: string;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstDefined(...values: any[]): any {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    return value;
  }
  return undefined;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseRows(raw: any): any[] {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  return [];
}

function getCommunityIdValue(clan: CommunityLite | null | undefined): number {
  return Number(clan?.id || clan?.clan_id || 0);
}

function getCommunityName(clan: CommunityLite | null | undefined): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function normalizeLoan(raw: any): LoanItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.loan || raw;
  const id = positiveNumber(firstDefined(src?.id, src?.loan_id));
  const clanId = positiveNumber(firstDefined(src?.clan_id, src?.community_id));

  return {
    id: id || undefined,
    clan_id: clanId || undefined,
    amount: firstDefined(
      src?.amount,
      src?.principal_amount,
      src?.loan_amount,
      src?.requested_amount
    ),
    remaining_amount: firstDefined(
      src?.remaining_amount,
      src?.outstanding_amount,
      src?.balance_remaining
    ),
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    purpose: firstTruthy(src?.purpose, src?.description, src?.loan_title) || null,
    status: firstTruthy(src?.status, src?.loan_status, "open") || null,
    created_at: firstTruthy(src?.created_at, src?.requested_at) || null,
    due_at: firstTruthy(src?.due_at, src?.maturity_at) || null,
    note: firstTruthy(src?.note, src?.description) || null,
    title: firstTruthy(src?.title, src?.purpose, src?.name, src?.loan_title) || null,
    role: firstTruthy(src?.role, src?.my_role, src?.participant_role) || null,
    borrower_name: firstTruthy(
      src?.borrower_name,
      src?.member_name,
      src?.requester_name
    ) || null,
  };
}

function pagePattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F8FBFE"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.40" stroke-width="2">
      <path d="M70 170 C180 90, 290 90, 400 170 S620 250, 730 170" />
      <path d="M900 170 C1010 90, 1120 90, 1230 170 S1450 250, 1560 170" />
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
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

function actionLink(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    whiteSpace: "nowrap",
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "nowrap",
  };
}

function stageForLoan(loan: LoanItem): {
  label: string;
  note: string;
  bg: string;
  border: string;
  text: string;
} {
  const status = safeStr(loan?.status).toLowerCase();

  if (status.includes("repaid") || status.includes("completed")) {
    return {
      label: "Completed",
      note: "This support item appears fully completed.",
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (status.includes("approved") || status.includes("active") || status.includes("open")) {
    return {
      label: "Active support",
      note: "Support appears active and in progress.",
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (
    status.includes("pending") ||
    status.includes("review") ||
    status.includes("requested") ||
    status.includes("await")
  ) {
    return {
      label: "Awaiting decision",
      note: "This item still appears to be in review or waiting.",
      bg: "#FFF7ED",
      border: "1px solid #FED7AA",
      text: "#C2410C",
    };
  }

  if (
    status.includes("declined") ||
    status.includes("cancel") ||
    status.includes("default")
  ) {
    return {
      label: "Closed",
      note: "This item appears closed or no longer continuing.",
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
    };
  }

  return {
    label: "In progress",
    note: "This item still looks operational.",
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
  };
}

function isClosedLoan(loan: LoanItem): boolean {
  const status = safeStr(loan?.status).toLowerCase();
  return (
    status.includes("repaid") ||
    status.includes("completed") ||
    status.includes("cancel") ||
    status.includes("declined") ||
    status.includes("default")
  );
}

function isAwaitingLoan(loan: LoanItem): boolean {
  const status = safeStr(loan?.status).toLowerCase();
  return (
    status.includes("pending") ||
    status.includes("review") ||
    status.includes("requested") ||
    status.includes("await")
  );
}

function isActiveLoan(loan: LoanItem): boolean {
  return !isClosedLoan(loan) && !isAwaitingLoan(loan);
}

function renderStepAction(step: NextStepState) {
  return (
    <Link to={step.ctaTo} style={actionLink(true)}>
      {step.ctaLabel}
    </Link>
  );
}

export default function LoanWorkbenchPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [me, setMe] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [meRes, clanRes, loansRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listMyLoans().catch(() => []),
        ]);

        const items = parseRows(loansRes)
          .map((row: any) => normalizeLoan(row))
          .filter(Boolean) as LoanItem[];

        const effectiveCommunityId = Number(
          selectedClanId || getCommunityIdValue(clanRes) || 0
        );

        const loansWithCommunity = items.filter(
          (loan) => positiveNumber(loan?.clan_id) > 0
        );

        const filteredLoans =
          effectiveCommunityId > 0 && loansWithCommunity.length > 0
            ? items.filter((loan) => {
                const loanClanId = positiveNumber(loan?.clan_id);
                return loanClanId <= 0 || loanClanId === effectiveCommunityId;
              })
            : items;

        setMe(meRes || null);
        setCommunity(clanRes || null);
        setLoans(filteredLoans);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedClanId]);

  const effectiveCommunityId = useMemo(() => {
    return Number(selectedClanId || getCommunityIdValue(community) || 0);
  }, [selectedClanId, community]);

  const effectiveCommunityName = useMemo(() => {
    return (
      getCommunityName(community) ||
      (effectiveCommunityId ? `Community ${effectiveCommunityId}` : "")
    );
  }, [community, effectiveCommunityId]);

  const awaitingLoans = useMemo(() => loans.filter((loan) => isAwaitingLoan(loan)), [loans]);
  const activeLoans = useMemo(() => loans.filter((loan) => isActiveLoan(loan)), [loans]);
  const closedLoans = useMemo(() => loans.filter((loan) => isClosedLoan(loan)), [loans]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!effectiveCommunityId) {
      return {
        title: "Choose the community context first",
        detail:
          "Workbench should stay inside the same community-specific support path as the rest of the loan flow.",
        today: "Open Community Home and confirm the community you want to work in.",
        tomorrow:
          "A selected community keeps the workbench aligned with the real support path.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (awaitingLoans.length > 0) {
      return {
        title:
          awaitingLoans.length === 1
            ? "One work item is still waiting"
            : `${awaitingLoans.length} work items are still waiting`,
        detail:
          "You already have support items in a waiting state. Review them before starting anything new.",
        today: "Review the waiting items and check whether the next move belongs in Loans or Notifications.",
        tomorrow:
          "Staying current with waiting items prevents drift and confusion.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: "/app/loans",
      };
    }

    if (activeLoans.length > 0) {
      return {
        title: "Continue the active support path",
        detail:
          "You already have live support items. Use this workbench to stay oriented, then continue in the main money path.",
        today: "Review the active items and keep the next step intentional.",
        tomorrow:
          "A steady continuation path is stronger than jumping into a new request too early.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: "/app/loans",
      };
    }

    if (closedLoans.length > 0) {
      return {
        title: "Your visible work items are currently resolved",
        detail:
          "You can now return to Readiness or Suggestions before beginning a new support flow.",
        today: "Review readiness and suggestions before opening a new request path.",
        tomorrow:
          "Starting with preparation keeps the next support request cleaner.",
        ctaLabel: "Open Guided Suggestions",
        ctaTo: "/app/loan-suggestions",
      };
    }

    return {
      title: "No visible work item is active yet",
      detail:
        "Start from readiness and suggestions first, then come back when the support path is better prepared.",
      today: "Open Readiness or Suggestions before moving into the live request path.",
      tomorrow:
        "Preparation first keeps the workbench useful instead of empty and reactive.",
      ctaLabel: "Open Readiness",
      ctaTo: "/app/loan-readiness",
    };
  }, [effectiveCommunityId, awaitingLoans.length, activeLoans.length, closedLoans.length]);

  function renderLoanCard(loan: LoanItem, index: number) {
    const stage = stageForLoan(loan);

    return (
      <div key={loan?.id || index} style={pageCard()}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "1fr auto",
            gap: 14,
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 18,
              }}
            >
              {firstTruthy(
                loan?.title,
                loan?.purpose,
                loan?.borrower_name ? `${loan.borrower_name}` : "",
                `Support item #${safeStr(loan?.id || "—")}`
              )}
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "#0B1F33" }}>
                {fmtMoney(loan?.amount ?? "0")} {safeStr(loan?.currency || "NGN")}
              </strong>
              {" · "}
              {safeStr(loan?.purpose || loan?.note || "No purpose stated")}
            </div>
          </div>

          <div
            style={{
              padding: "8px 12px",
              borderRadius: 999,
              border: stage.border,
              background: stage.bg,
              fontWeight: 1000,
              color: stage.text,
              whiteSpace: "nowrap",
            }}
          >
            {stage.label}
          </div>
        </div>

        <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
          {stage.note}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Remaining</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 20,
              }}
            >
              {fmtMoney(loan?.remaining_amount ?? "0")}{" "}
              {safeStr(loan?.currency || "NGN")}
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Created</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 18,
              }}
            >
              {safeDateTime(loan?.created_at)}
            </div>
          </div>

          <div style={innerCard("#F8FBFF")}>
            <div style={sectionLabel()}>Due</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 18,
              }}
            >
              {safeDateTime(loan?.due_at)}
            </div>
          </div>
        </div>

        {safeStr(loan?.note || "") ? (
          <div
            style={{
              marginTop: 12,
              color: "#6B7A88",
              lineHeight: 1.8,
            }}
          >
            Note: {safeStr(loan?.note || "")}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Support Workbench"
        title="Support Workbench"
        subtitle="Prepare, review, and continue your support work items without crowding the main loans surface."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loan-suggestions"
        backLabel="Guided Suggestions"
        nextLinks={[
          { label: "Loans & Support", to: "/app/loans" },
          { label: "Readiness", to: "/app/loan-readiness" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Trust", to: "/app/trust" },
        ]}
      />

      <section
        style={{
          backgroundImage: `url("${pattern}")`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          borderRadius: 28,
          border: "1px solid rgba(11,31,51,0.06)",
          overflow: "hidden",
          backgroundColor: "#F8FBFE",
          marginTop: 18,
        }}
      >
        <div style={{ padding: 24 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
              gap: 18,
              alignItems: "start",
            }}
          >
            <div>
              <div style={sectionLabel()}>Loan workbench</div>

              <div
                style={{
                  marginTop: 10,
                  fontSize: 34,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  lineHeight: 1.12,
                }}
              >
                Continue where you left off
              </div>

              <div
                style={{
                  marginTop: 10,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                }}
              >
                Use this page to keep your support preparation and active items in one
                place. This is a member-facing preparation surface, not an admin
                decision console.
              </div>

              <div
                style={{
                  marginTop: 14,
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <span style={badge(true)}>
                  Member: {safeStr(me?.gmfn_id || "GMFN ID pending")}
                </span>
                {effectiveCommunityId ? (
                  <span style={badge(false)}>
                    Context: {effectiveCommunityName || `Community ${effectiveCommunityId}`}
                  </span>
                ) : (
                  <span style={badge(false)}>No active community selected</span>
                )}
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "grid",
                  gridTemplateColumns: isCompact
                    ? "1fr"
                    : "repeat(auto-fit, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Visible work items</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 28,
                    }}
                  >
                    {loading ? "…" : loans.length}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Awaiting</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 28,
                    }}
                  >
                    {loading ? "…" : awaitingLoans.length}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Active</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 28,
                    }}
                  >
                    {loading ? "…" : activeLoans.length}
                  </div>
                </div>

                <div style={innerCard("#FFFFFF")}>
                  <div style={sectionLabel()}>Closed</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 1000,
                      fontSize: 28,
                    }}
                  >
                    {loading ? "…" : closedLoans.length}
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Today</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.65,
                  }}
                >
                  {nextStep.today}
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Tomorrow</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 15,
                    fontWeight: 900,
                    lineHeight: 1.65,
                  }}
                >
                  {nextStep.tomorrow}
                </div>
              </div>

              <div style={softCard("#FFFFFF")}>
                <div style={sectionLabel()}>Next useful move</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontSize: 18,
                    fontWeight: 1000,
                    lineHeight: 1.35,
                  }}
                >
                  {nextStep.title}
                </div>

                <div
                  style={{
                    marginTop: 8,
                    color: "#6B7A88",
                    lineHeight: 1.8,
                    fontSize: 14,
                  }}
                >
                  {nextStep.detail}
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  {renderStepAction(nextStep)}
                  <Link to="/app/loans" style={actionLink(false)}>
                    Return to Loans & Support
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 18,
              padding: 14,
              borderRadius: 16,
              background: "#FFFDF5",
              border: "1px solid rgba(214,175,71,0.25)",
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            A dedicated member decision engine page is future-only until it is fully
            active. Use Readiness, Suggestions, and this Workbench for now.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <Link to="/app/loan-readiness" style={actionLink(false)}>
              Readiness
            </Link>
            <Link to="/app/loan-suggestions" style={actionLink(false)}>
              Suggestions
            </Link>
            <Link to="/app/loans" style={actionLink(true)}>
              Return to Loans & Support
            </Link>
            <Link to="/app/community" style={actionLink(false)}>
              Community Home
            </Link>
          </div>
        </div>
      </section>

      <div style={{ marginTop: 18, display: "grid", gap: 18 }}>
        <section style={pageCard()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={sectionLabel()}>Awaiting decision</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                }}
              >
                These items still appear to be waiting for review, response, or
                decision.
              </div>
            </div>

            <span style={badge(false)}>
              {loading ? "…" : awaitingLoans.length}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {loading ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                Loading work items...
              </div>
            ) : awaitingLoans.length === 0 ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                No waiting work item is visible right now.
              </div>
            ) : (
              awaitingLoans.map((loan, i) => renderLoanCard(loan, i))
            )}
          </div>
        </section>

        <section style={pageCard()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={sectionLabel()}>Active support</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                }}
              >
                These items still appear operational inside the current support path.
              </div>
            </div>

            <span style={badge(false)}>
              {loading ? "…" : activeLoans.length}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {loading ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                Loading active items...
              </div>
            ) : activeLoans.length === 0 ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                No active support item is visible right now.
              </div>
            ) : (
              activeLoans.map((loan, i) => renderLoanCard(loan, i))
            )}
          </div>
        </section>

        <section style={pageCard()}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div style={sectionLabel()}>Closed / completed</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                }}
              >
                These items appear closed, cancelled, defaulted, or completed.
              </div>
            </div>

            <span style={badge(false)}>
              {loading ? "…" : closedLoans.length}
            </span>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {loading ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                Loading closed items...
              </div>
            ) : closedLoans.length === 0 ? (
              <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
                No closed work item is visible right now.
              </div>
            ) : (
              closedLoans.map((loan, i) => renderLoanCard(loan, i))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}