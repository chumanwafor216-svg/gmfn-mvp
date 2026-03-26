import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getMyGuarantorEarnings } from "../lib/api";

type GuarantorEarningItem = {
  loan_guarantor_id?: number;
  loan_id?: number;
  share_amount?: string | number | null;
  weight_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
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

export default function GuarantorEarningsPage() {
  const [data, setData] = useState<any>(null);
  const [items, setItems] = useState<GuarantorEarningItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const res = await getMyGuarantorEarnings(100);
        const rows: GuarantorEarningItem[] = Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res)
          ? res
          : [];

        const sorted = [...rows].sort((a, b) => {
          const da = safeDate(a?.created_at || a?.updated_at || "")?.getTime() || 0;
          const db = safeDate(b?.created_at || b?.updated_at || "")?.getTime() || 0;
          return db - da;
        });

        setData(res || null);
        setItems(sorted);
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load guarantor earnings."));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const currency = safeStr(
    items?.[0]?.currency || data?.currency || "NGN"
  );

  const totals = useMemo(() => {
    const total = items.reduce(
      (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
      0
    );

    const now = new Date();

    const thisMonth = items
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    const thisYear = items
      .filter((row: GuarantorEarningItem) => {
        const d = safeDate(row?.created_at || row?.updated_at || "");
        return !!d && d.getFullYear() === now.getFullYear();
      })
      .reduce(
        (sum: number, row: GuarantorEarningItem) => sum + toNum(row?.share_amount),
        0
      );

    return { total, thisMonth, thisYear };
  }, [items]);

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Guarantor Earnings"
        subtitle="See what you have earned by supporting successful community loans."
      />

      {err ? (
        <div
          style={{
            ...pageCard("#FEF2F2"),
            marginTop: 18,
            border: "1px solid #FECACA",
            color: "#991B1B",
            fontWeight: 900,
          }}
        >
          {err}
        </div>
      ) : null}

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
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
          Supporting responsible borrowers should not be invisible
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
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loans" style={actionLink(true)}>
            Return to Loans & Support
          </Link>
          <Link to="/app/community" style={actionLink(false)}>
            Community Home
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ ...pageCard(), marginTop: 18, color: "#64748B" }}>
          Loading guarantor earnings...
        </div>
      ) : (
        <>
          <div
            style={{
              marginTop: 18,
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
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
          </div>

          <div style={{ ...pageCard("#F8FBFF"), marginTop: 18 }}>
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
          </div>

          <div
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
              standing behind responsible people also creates value and visible
              reputation for you.
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
              Recent Earnings
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {items.length === 0 ? (
                <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>
                  No guarantor earnings found yet.
                </div>
              ) : null}

              {items.map((earning: GuarantorEarningItem, idx: number) => {
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
          </div>
        </>
      )}
    </div>
  );
}