// FILE: src/pages/GuarantorEarningsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMyGuarantorEarnings, getSelectedClanId } from "../lib/api";

type GuarantorEarningItem = {
  loan_guarantor_id?: number;
  loan_id?: number;
  clan_id?: number;
  share_amount?: string | number | null;
  weight_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

function toNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  return toNum(x).toFixed(2);
}

function safeDate(x: any): Date | null {
  const raw = String(x || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
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

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.10)",
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

function primaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "none",
    background: disabled ? "#CBD5E1" : "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
  };
}

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    minHeight: 42,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
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

function feedbackCard(success = false): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2E2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
  };
}

function getCommunityName(clan: CommunityLite | null): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
}

function normalizeEarning(raw: any): GuarantorEarningItem | null {
  if (!raw) return null;

  const src = raw?.item || raw?.earning || raw?.record || raw;

  return {
    loan_guarantor_id: Number(src?.loan_guarantor_id || src?.id || 0) || undefined,
    loan_id: Number(src?.loan_id || src?.support_loan_id || 0) || undefined,
    clan_id: Number(src?.clan_id || src?.community_id || 0) || undefined,
    share_amount:
      src?.share_amount ??
      src?.earned_amount ??
      src?.amount ??
      src?.guarantor_share ??
      null,
    weight_amount:
      src?.weight_amount ??
      src?.pledge_amount ??
      src?.locked_amount ??
      src?.weight ??
      null,
    currency: firstTruthy(src?.currency, src?.currency_code, "NGN") || null,
    status: firstTruthy(src?.status, src?.earning_status, "pending") || null,
    created_at: firstTruthy(src?.created_at, src?.earned_at, src?.recorded_at) || null,
    updated_at: firstTruthy(src?.updated_at, src?.settled_at) || null,
  };
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (s.includes("paid") || s.includes("earned") || s.includes("settled")) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
    };
  }

  if (s.includes("pending") || s.includes("waiting")) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
  };
}

function isSettledStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("paid") || s.includes("earned") || s.includes("settled");
}

function isPendingStatus(status: string): boolean {
  const s = safeStr(status).toLowerCase();
  return s.includes("pending") || s.includes("waiting");
}

function renderStepAction(step: NextStepState) {
  return (
    <Link to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </Link>
  );
}

export default function GuarantorEarningsPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [data, setData] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [items, setItems] = useState<GuarantorEarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

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
      setErr("");

      try {
        const [res, clanRes] = await Promise.all([
          getMyGuarantorEarnings(100),
          getCurrentClan().catch(() => null),
        ]);

        const rows = (Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [])
          .map((row: any) => normalizeEarning(row))
          .filter(Boolean) as GuarantorEarningItem[];

        const sorted = [...rows].sort((a, b) => {
          const da = safeDate(a?.created_at || a?.updated_at || "")?.getTime() || 0;
          const db = safeDate(b?.created_at || b?.updated_at || "")?.getTime() || 0;
          return db - da;
        });

        setData(res || null);
        setCommunity(clanRes || null);
        setItems(sorted);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load guarantor earnings."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const hasExplicitCommunityTags = useMemo(() => {
    return items.some((row) => Number(row?.clan_id || 0) > 0);
  }, [items]);

  const visibleItems = useMemo(() => {
    if (!selectedClanId) return [];

    if (!hasExplicitCommunityTags) {
      return items;
    }

    return items.filter((row) => Number(row?.clan_id || 0) === selectedClanId);
  }, [items, selectedClanId, hasExplicitCommunityTags]);

  const currency = safeStr(
    visibleItems?.[0]?.currency || items?.[0]?.currency || data?.currency || "NGN"
  );

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const totals = useMemo(() => {
    const total = visibleItems.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
      0
    );

    const now = new Date();

    const thisMonth = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    const thisYear = visibleItems
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    const settledCount = visibleItems.filter((row) =>
      isSettledStatus(safeStr(row?.status))
    ).length;
    const pendingCount = visibleItems.filter((row) =>
      isPendingStatus(safeStr(row?.status))
    ).length;

    return { total, thisMonth, thisYear, settledCount, pendingCount };
  }, [visibleItems]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community context first",
        detail:
          "Guarantor earnings should stay anchored to the selected community support path before you read them as current context.",
        today: "Open Community Home and confirm the community you are working in.",
        tomorrow:
          "A selected community keeps support history and earnings easier to interpret.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (totals.pendingCount > 0) {
      return {
        title:
          totals.pendingCount === 1
            ? "One guarantor earning is still pending"
            : `${totals.pendingCount} guarantor earnings are still pending`,
        detail:
          "Your next move is to monitor the pending support path, not to ignore it. Earnings become meaningful when the support cycle closes properly.",
        today: "Review the main support path and keep the active loan items moving.",
        tomorrow:
          "Settled support creates clearer earnings and stronger visible contribution.",
        ctaLabel: "Return to Loans & Support",
        ctaTo: "/app/loans",
      };
    }

    if (totals.total > 0) {
      return {
        title: "Your guarantor contribution is now visible value",
        detail:
          "Supporting responsible borrowers should not remain invisible. This page keeps that contribution readable and measurable.",
        today: "Review your recent earnings and keep your support behaviour steady.",
        tomorrow:
          "Consistent guarantor support can strengthen both value and visible reputation over time.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    return {
      title: "No guarantor earnings are visible yet",
      detail:
        "That does not mean the path is useless. It means the earnings side of the support cycle has not materialized yet in your visible records.",
      today: "Continue using the guided support path rather than forcing the earnings question too early.",
      tomorrow:
        "Visible earnings usually come after responsible support behaviour has had time to settle.",
      ctaLabel: "Return to Loans & Support",
      ctaTo: "/app/loans",
    };
  }, [selectedClanId, totals.pendingCount, totals.total]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Guarantor Earnings"
        title="Guarantor Earnings"
        subtitle="See what you have earned by supporting successful community loans."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
          { label: "Withdrawal Instructions", to: "/app/withdrawal-instructions" },
        ]}
        utilityLinks={[
          { label: "Trust", to: "/app/trust" },
          { label: "Guided Suggestions", to: "/app/loan-suggestions" },
        ]}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>
          {err}
        </div>
      ) : null}

      <section
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact
              ? "1fr"
              : "minmax(0, 1.08fr) minmax(320px, 0.92fr)",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Member earnings view</div>

            <div
              style={{
                marginTop: 10,
                fontWeight: 1000,
                color: "#0B1F33",
                fontSize: 30,
                lineHeight: 1.15,
              }}
            >
              {nextStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
              }}
            >
              This page is the member-facing earnings record for guarantor participation.
              It shows the value you earned by standing behind successful community support.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>Context: {selectedCommunityLabel}</span>
              <span style={badge(false)}>Currency: {currency}</span>
              <span style={badge(false)}>Settled: {totals.settledCount}</span>
              <span style={badge(false)}>Pending: {totals.pendingCount}</span>
              <span style={badge(false)}>
                Feed: {hasExplicitCommunityTags ? "community-tagged" : "provisional"}
              </span>
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderStepAction(nextStep)}
              <Link to="/app/community" style={secondaryBtn(false)}>
                Community Home
              </Link>
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
          </div>
        </div>
      </section>

      {selectedClanId && !hasExplicitCommunityTags && visibleItems.length > 0 ? (
        <section
          style={{
            ...pageCard("#FFFDF5"),
            marginTop: 18,
            border: "1px solid rgba(214,175,71,0.25)",
          }}
        >
          <div style={{ fontWeight: 1000, color: "#92400E" }}>Current feed note</div>

          <div
            style={{
              marginTop: 8,
              color: "#475569",
              lineHeight: 1.8,
            }}
          >
            This earnings feed is not returning community tags yet. The page is
            staying in your selected community context, but the API response should
            be tightened later so every earning is explicitly community-scoped.
          </div>
        </section>
      ) : null}

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#64748B" }}>
          Loading guarantor earnings...
        </div>
      ) : (
        <>
          <section
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            <div style={pageCard()}>
              <div style={sectionLabel()}>Total earned</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {fmtMoney(totals.total)} {currency}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>This month</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {fmtMoney(totals.thisMonth)} {currency}
              </div>
            </div>

            <div style={pageCard()}>
              <div style={sectionLabel()}>This year</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  fontSize: 28,
                  color: "#0B1F33",
                }}
              >
                {fmtMoney(totals.thisYear)} {currency}
              </div>
            </div>
          </section>

          <section style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 1000,
                color: "#0B1F33",
              }}
            >
              Why this matters
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              Supporting responsible borrowers can create real value over time.
              The system should help you see that responsible guarantor support
              is not invisible.
            </div>
          </section>

          <section
            style={{
              ...pageCard("#FFFDF5"),
              marginTop: 18,
              border: "1px solid rgba(214,175,71,0.25)",
            }}
          >
            <div style={{ fontWeight: 1000, color: "#92400E" }}>
              Encouragement
            </div>

            <div
              style={{
                marginTop: 8,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              As your guarantor earnings grow, GMFN should remind you that
              standing behind responsible people can also create visible value
              and visible reputation for you.
            </div>
          </section>

          <section style={{ ...pageCard(), marginTop: 18 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                Recent Earnings
              </div>

              <span style={badge(false)}>{visibleItems.length} visible records</span>
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {visibleItems.length === 0 ? (
                <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>
                  {selectedClanId
                    ? "No guarantor earnings found yet in this working context."
                    : "Select a community first to keep earnings inside the correct support context."}
                </div>
              ) : null}

              {visibleItems.map((earning: GuarantorEarningItem, idx: number) => {
                const status = safeStr(earning?.status || "—");
                const tone = statusTone(status);

                return (
                  <div
                    key={earning?.loan_guarantor_id || idx}
                    style={innerCard("#FFFFFF")}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 12,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ minWidth: 240 }}>
                        <div
                          style={{
                            fontWeight: 1000,
                            color: "#0B1F33",
                            fontSize: 17,
                          }}
                        >
                          Loan #{safeStr(earning?.loan_id || "—")}
                        </div>

                        <div
                          style={{
                            marginTop: 8,
                            display: "grid",
                            gap: 6,
                            color: "#64748B",
                            lineHeight: 1.7,
                            fontSize: 14,
                          }}
                        >
                          <div>
                            Contribution weight:{" "}
                            <strong style={{ color: "#0B1F33" }}>
                              {safeStr(earning?.weight_amount || "0")}{" "}
                              {safeStr(earning?.currency || currency)}
                            </strong>
                          </div>
                          <div>
                            Recorded: {safeDateTime(earning?.created_at || earning?.updated_at)}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: "right", minWidth: 140 }}>
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "6px 10px",
                            borderRadius: 999,
                            background: tone.bg,
                            border: tone.border,
                            color: tone.text,
                            fontSize: 12,
                            fontWeight: 1000,
                          }}
                        >
                          {status}
                        </div>

                        <div
                          style={{
                            marginTop: 10,
                            fontSize: 12,
                            color: "#64748B",
                            fontWeight: 1000,
                          }}
                        >
                          EARNED
                        </div>

                        <div
                          style={{
                            marginTop: 6,
                            fontWeight: 1000,
                            fontSize: 18,
                            color: "#065F46",
                          }}
                        >
                          {safeStr(earning?.share_amount || "0")}{" "}
                          {safeStr(earning?.currency || currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}