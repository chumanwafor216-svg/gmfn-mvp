import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getPoolMe, listMyLoans, repayLoan } from "../lib/api";

type PoolLite = {
  available?: string | number | null;
  available_balance?: string | number | null;
  pending_deposits?: string | number | null;
  pending_withdrawals?: string | number | null;
  effective_available?: string | number | null;
  currency?: string | null;
};

type LoanItem = {
  id?: number;
  amount?: string | number | null;
  remaining_amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  created_at?: string | null;
  due_at?: string | null;
  note?: string | null;
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function asNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
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

function actionLink(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    minWidth: 140,
    background: "#FFFFFF",
    outline: "none",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#4F6B8A",
    fontWeight: 1000,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  };
}

function safeDateTime(x: any): string {
  const raw = String(x || "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

function statusTone(status: string) {
  const s = status.toLowerCase();

  if (s === "repaid") {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
      label: "Repaid",
    };
  }

  if (s === "cancelled" || s === "defaulted") {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
      label: s === "cancelled" ? "Cancelled" : "Defaulted",
    };
  }

  return {
    bg: "#EFF6FF",
    border: "1px solid #BFDBFE",
    text: "#1D4ED8",
    label: s ? s.charAt(0).toUpperCase() + s.slice(1) : "Open",
  };
}

export default function LoansPage() {
  const [pool, setPool] = useState<PoolLite | null>(null);
  const [loans, setLoans] = useState<LoanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [repayAmounts, setRepayAmounts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setErr("");
    setLoading(true);

    try {
      const [poolRes, loansRes] = await Promise.all([
        getPoolMe().catch(() => null),
        listMyLoans().catch(() => []),
      ]);

      setPool(poolRes || null);
      setLoans(Array.isArray(loansRes) ? loansRes : loansRes?.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load loans and support."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitRepayment(loan: LoanItem) {
    const loanId = Number(loan?.id || 0);
    const currency = safeStr(loan?.currency || pool?.currency || "NGN");
    const amount = safeStr(repayAmounts[loanId] || "");
    const remaining = Number(loan?.remaining_amount || 0);
    const status = safeStr(loan?.status || "").toLowerCase();

    if (!loanId) {
      setErr("Invalid loan record.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setErr("Enter a valid repayment amount.");
      return;
    }

    if (["repaid", "cancelled", "defaulted"].includes(status)) {
      setErr(`Loan #${loanId} does not accept repayments in status '${status}'.`);
      return;
    }

    if (Number(amount) > remaining && remaining > 0) {
      setErr(
        `Repayment cannot exceed remaining balance (${fmtMoney(remaining)} ${currency}).`
      );
      return;
    }

    setBusyId(loanId);
    setErr("");
    setMsg("");

    try {
      await repayLoan(loanId, {
        amount,
        currency,
        note: "Manual repayment submission",
      });

      setMsg(`Repayment submitted for loan #${loanId}.`);
      setRepayAmounts((prev) => ({ ...prev, [loanId]: "" }));
      await load();
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to submit repayment."));
    } finally {
      setBusyId(null);
    }
  }

  const poolCurrency = safeStr(pool?.currency || "NGN");

  const summary = useMemo(() => {
    const totalBorrowed = loans.reduce((sum, loan) => sum + asNum(loan.amount), 0);
    const outstanding = loans.reduce(
      (sum, loan) => sum + asNum(loan.remaining_amount),
      0
    );
    const activeCount = loans.filter((loan) => {
      const status = safeStr(loan.status || "").toLowerCase();
      return !["repaid", "cancelled", "defaulted"].includes(status);
    }).length;

    return {
      totalBorrowed,
      outstanding,
      activeCount,
      totalLoans: loans.length,
    };
  }, [loans]);

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto", paddingBottom: 30 }}>
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>Loans and support</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 34,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Member-facing money and support hub
        </div>

        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Review pool position, see your loans, submit repayments, and move into
          the related money and support surfaces.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/payment/pool" style={actionLink(true)}>
            Money In
          </Link>
          <Link to="/app/withdrawal-instructions" style={actionLink(false)}>
            Money Out
          </Link>
          <Link to="/app/loan-readiness" style={actionLink(false)}>
            Readiness
          </Link>
          <Link to="/app/loan-workbench" style={actionLink(false)}>
            Workbench
          </Link>
          <Link to="/app/loan-suggestions" style={actionLink(false)}>
            Suggestions
          </Link>
          <Link to="/app/guarantor-earnings" style={actionLink(false)}>
            Guarantor Earnings
          </Link>
        </div>

        {err ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#FEF2F2",
              border: "1px solid #FECACA",
              color: "#991B1B",
              fontWeight: 900,
            }}
          >
            {err}
          </div>
        ) : null}

        {msg ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontWeight: 900,
            }}
          >
            {msg}
          </div>
        ) : null}
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 14,
        }}
      >
        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Total loans</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.totalLoans}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Active loans</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {summary.activeCount}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Total borrowed</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {fmtMoney(summary.totalBorrowed)}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            {poolCurrency}
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Outstanding</div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 1000,
              color: "#0B1F33",
            }}
          >
            {fmtMoney(summary.outstanding)}
          </div>
          <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
            {poolCurrency}
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 1000, color: "#0B1F33" }}>
          Pool Position
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          This is the pool view that supports your money and support workflow.
        </div>

        {loading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>Loading pool position...</div>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 14,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                Available
              </div>
              <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
                {fmtMoney(pool?.available ?? pool?.available_balance ?? "0")}
              </div>
              <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
                {poolCurrency}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                Pending Deposits
              </div>
              <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
                {fmtMoney(pool?.pending_deposits ?? "0")}
              </div>
              <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
                {poolCurrency}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                Pending Withdrawals
              </div>
              <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
                {fmtMoney(pool?.pending_withdrawals ?? "0")}
              </div>
              <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
                {poolCurrency}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                Effective Available
              </div>
              <div style={{ marginTop: 6, fontWeight: 1000, fontSize: 24, color: "#0B1F33" }}>
                {fmtMoney(pool?.effective_available ?? "0")}
              </div>
              <div style={{ marginTop: 6, color: "#64748B", fontSize: 14 }}>
                {poolCurrency}
              </div>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/app/payment/pool?currency=NGN" style={actionLink(true)}>
            Deposit to Pool
          </Link>
          <Link to="/app/withdrawal-instructions" style={actionLink(false)}>
            Withdrawal Guidance
          </Link>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 1000, color: "#0B1F33" }}>
          My Loans
        </div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          Review your loans and submit repayments where needed.
        </div>

        {loading ? (
          <div style={{ marginTop: 16, color: "#64748B" }}>Loading loans...</div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {loans.length === 0 ? (
              <div style={{ color: "#7A8D9F", lineHeight: 1.8 }}>No loans found.</div>
            ) : null}

            {loans.map((loan, i) => {
              const loanId = Number(loan?.id || i);
              const amount = fmtMoney(loan?.amount || "0");
              const remaining = fmtMoney(loan?.remaining_amount || "0");
              const currency = safeStr(loan?.currency || poolCurrency);
              const status = safeStr(loan?.status || "open").toLowerCase();
              const locked = ["repaid", "cancelled", "defaulted"].includes(status);
              const tone = statusTone(status);

              return (
                <div
                  key={loanId}
                  style={{
                    borderRadius: 16,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#FFFFFF",
                    padding: 16,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 260 }}>
                      <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                        Loan #{loanId}
                      </div>

                      <div
                        style={{
                          marginTop: 8,
                          display: "inline-flex",
                          alignItems: "center",
                          padding: "6px 10px",
                          borderRadius: 999,
                          background: tone.bg,
                          border: tone.border,
                          color: tone.text,
                          fontSize: 12,
                          fontWeight: 1000,
                        }}
                      >
                        {tone.label}
                      </div>

                      <div
                        style={{
                          marginTop: 12,
                          display: "grid",
                          gap: 6,
                          color: "#6B7A88",
                          fontSize: 14,
                          lineHeight: 1.7,
                        }}
                      >
                        <div>
                          Amount: <strong style={{ color: "#0B1F33" }}>{amount} {currency}</strong>
                        </div>
                        <div>
                          Remaining:{" "}
                          <strong style={{ color: "#0B1F33" }}>{remaining} {currency}</strong>
                        </div>
                        <div>Created: {safeDateTime(loan?.created_at)}</div>
                        <div>Due: {safeDateTime(loan?.due_at)}</div>
                        {safeStr(loan?.note || "") ? (
                          <div>Note: {safeStr(loan?.note || "")}</div>
                        ) : null}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        alignItems: "center",
                        justifyContent: "flex-end",
                      }}
                    >
                      <input
                        value={repayAmounts[loanId] || ""}
                        onChange={(e) =>
                          setRepayAmounts((prev) => ({
                            ...prev,
                            [loanId]: e.target.value,
                          }))
                        }
                        placeholder="Repay amount"
                        disabled={locked}
                        style={{ ...inputStyle(), opacity: locked ? 0.6 : 1 }}
                      />

                      <button
                        type="button"
                        onClick={() => submitRepayment(loan)}
                        disabled={busyId === loanId || locked}
                        style={actionLink(false, busyId === loanId || locked)}
                      >
                        {busyId === loanId ? "Submitting..." : "Submit Repayment"}
                      </button>

                      <Link to="/app/payment/pool" style={actionLink(true)}>
                        Money In
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}