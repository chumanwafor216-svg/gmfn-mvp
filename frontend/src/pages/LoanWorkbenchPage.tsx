import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, listMyLoans } from "../lib/api";

type LoanItem = {
  id?: number;
  amount?: string | number | null;
  remaining_amount?: string | number | null;
  currency?: string | null;
  purpose?: string | null;
  status?: string | null;
  created_at?: string | null;
  due_at?: string | null;
  note?: string | null;
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

function stageForLoan(loan: LoanItem): {
  label: string;
  note: string;
  bg: string;
  border: string;
  text: string;
} {
  const status = safeStr(loan?.status).toLowerCase();

  if (status.includes("repaid")) {
    return {
      label: "Completed",
      note: "This support item appears fully completed.",
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (status.includes("approved") || status.includes("active")) {
    return {
      label: "Active support",
      note: "Support appears active and in progress.",
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  if (status.includes("pending") || status.includes("review")) {
    return {
      label: "Awaiting decision",
      note: "This item still appears to be in review or waiting.",
      bg: "#FFF7ED",
      border: "1px solid #FED7AA",
      text: "#C2410C",
    };
  }

  if (status.includes("declined") || status.includes("cancel")) {
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

export default function LoanWorkbenchPage() {
  const [me, setMe] = useState<any>(null);
  const [clan, setClan] = useState<any>(null);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const pattern = useMemo(() => pagePattern(), []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [meRes, clanRes, loansRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          listMyLoans().catch(() => []),
        ]);
        const items = Array.isArray(loansRes) ? loansRes : loansRes?.items || [];
        setMe(meRes || null);
        setClan(clanRes || null);
        setLoans(items || []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const activeCount = loans.filter((loan) => {
    const status = safeStr(loan?.status).toLowerCase();
    return !["repaid", "cancelled", "declined", "defaulted"].some((v) =>
      status.includes(v)
    );
  }).length;

  return (
    <div style={{ maxWidth: 1320, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Support Workbench"
        subtitle="Prepare, review, and continue your support work items without crowding the main loans surface."
      />

      <div
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
          <div style={sectionLabel()}>Loan workbench</div>

          <div
            style={{
              marginTop: 10,
              fontSize: 34,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            Continue where you left off
          </div>

          <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
            Use this page to keep your support preparation and active items in one
            place. This is a member-facing preparation surface, not an admin decision
            console.
          </div>

          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Member</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                {safeStr(me?.gmfn_id || "GMFN ID pending")}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Community</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                {safeStr(clan?.name || "No active community")}
              </div>
            </div>

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
              <div style={sectionLabel()}>Active</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 28,
                }}
              >
                {loading ? "…" : activeCount}
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
            active. Use readiness, suggestions, and this workbench for now.
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
      </div>

      <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={pageCard()}>
            <div style={{ color: "#6B7A88", lineHeight: 1.8 }}>
              Loading work items...
            </div>
          </div>
        ) : loans.length === 0 ? (
          <div style={pageCard()}>
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 20,
              }}
            >
              No work items visible yet
            </div>

            <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
              When your support flow begins, the items you need to continue will
              appear here.
            </div>
          </div>
        ) : (
          loans.map((loan, i) => {
            const stage = stageForLoan(loan);

            return (
              <div key={loan?.id || i} style={pageCard()}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
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
                      Support item #{safeStr(loan?.id || "—")}
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
                      {safeStr(loan?.purpose || "No purpose stated")}
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
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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
          })
        )}
      </div>
    </div>
  );
}