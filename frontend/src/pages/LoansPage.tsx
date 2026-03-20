import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getPoolMe, listMyLoans, repayLoan } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "");
}

function fmtMoney(x: any): string {
  const n = Number(x);
  if (!Number.isFinite(n)) return String(x ?? "").trim() || "0.00";
  return n.toFixed(2);
}

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
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
    cursor: "pointer",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: 10,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    minWidth: 120,
  };
}

export default function LoansPage() {
  const [pool, setPool] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [repayAmounts, setRepayAmounts] = useState<Record<number, string>>({});
  const [busyId, setBusyId] = useState<number | null>(null);

  async function load() {
    setErr("");
    try {
      const [poolRes, loansRes] = await Promise.all([
        getPoolMe().catch(() => null),
        listMyLoans().catch(() => []),
      ]);
      setPool(poolRes || null);
      setLoans(Array.isArray(loansRes) ? loansRes : loansRes?.items || []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load finances."));
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function submitRepayment(loan: any) {
    const loanId = Number(loan?.id || 0);
    const currency = safeStr(loan?.currency || "NGN");
    const amount = (repayAmounts[loanId] || "").trim();
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
      setErr(`Repayment cannot exceed remaining balance (${fmtMoney(remaining)} ${currency}).`);
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

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Finances
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Deposit to pool, review loans, submit repayments, and generate payment instructions.
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

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 1000, color: "#0B1F33" }}>
          Pool Position
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>Available</div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {fmtMoney(pool?.available ?? pool?.available_balance ?? "0")}
            </div>
          </div>

          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Pending Deposits
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {fmtMoney(pool?.pending_deposits ?? "0")}
            </div>
          </div>

          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Pending Withdrawals
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {fmtMoney(pool?.pending_withdrawals ?? "0")}
            </div>
          </div>

          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Effective Available
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {fmtMoney(pool?.effective_available ?? "0")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Link to="/app/payment/pool?currency=NGN" style={actionLink(true)}>
            Deposit to Pool
          </Link>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 20, fontWeight: 1000, color: "#0B1F33" }}>
          My Loans
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
          {loans.length === 0 ? <div style={{ color: "#7A8D9F" }}>No loans found.</div> : null}

          {loans.map((loan, i) => {
            const loanId = Number(loan?.id || i);
            const amount = fmtMoney(loan?.amount || "0");
            const remaining = fmtMoney(loan?.remaining_amount || "0");
            const currency = safeStr(loan?.currency || "NGN");
            const status = safeStr(loan?.status || "—").toLowerCase();
            const locked = ["repaid", "cancelled", "defaulted"].includes(status);

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
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Loan #{loanId}</div>
                    <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                      {amount} {currency} · status {status}
                    </div>
                    <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13 }}>
                      remaining {remaining} {currency}
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <input
                      value={repayAmounts[loanId] || ""}
                      onChange={(e) =>
                        setRepayAmounts((prev) => ({ ...prev, [loanId]: e.target.value }))
                      }
                      placeholder="Repay amount"
                      disabled={locked}
                      style={{ ...inputStyle(), opacity: locked ? 0.6 : 1 }}
                    />

                    <button
                      type="button"
                      onClick={() => submitRepayment(loan)}
                      disabled={busyId === loanId || locked}
                      style={{
                        ...actionLink(false),
                        opacity: busyId === loanId || locked ? 0.6 : 1,
                      }}
                    >
                      {busyId === loanId ? "Submitting..." : "Submit Repayment"}
                    </button>

                    <Link to={`/app/payment/loans/${loanId}`} style={actionLink(true)}>
                      Payment Instructions
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}