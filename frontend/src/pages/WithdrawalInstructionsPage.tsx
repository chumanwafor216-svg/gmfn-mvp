import React, { useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getLoanWithdrawalInstruction } from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function btn(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    cursor: "pointer",
    fontSize: 14,
    textDecoration: "none",
  };
}

export default function WithdrawalInstructionsPage() {
  const [loanId, setLoanId] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setData(null);
    try {
      if (!loanId || Number(loanId) <= 0) throw new Error("Enter a valid loan ID.");
      const res = await getLoanWithdrawalInstruction(Number(loanId));
      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load withdrawal instructions."));
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        title="Withdrawal Instructions"
        subtitle="Use this page to review how approved funds should move from the community settlement account into your own payout account."
      />

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          How withdrawal works
        </div>
        <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
          1. Your approved support becomes visible in your personal pool ledger.
          <br />
          2. Withdrawal sends that value from the community settlement account into your own payout account.
          <br />
          3. GMFN does not send money directly to merchants during this pilot.
          <br />
          4. After the payout reaches your own account, you can complete your own transfer externally.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/payout-details" style={btn(true)}>
            Manage My Bank / Wallet Details
          </Link>
          <Link to="/loans" style={btn(false)}>
            Return to Finances
          </Link>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18, background: "#FFFDF5", border: "1px solid rgba(214,175,71,0.25)" }}>
        <div style={{ fontWeight: 1000, color: "#92400E" }}>
          Important
        </div>
        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          Before withdrawing, make sure your payout account is correct.
          Wrong or missing payout details can delay movement of approved funds.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Load a Withdrawal Instruction
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88" }}>
          Enter the approved loan ID to review the withdrawal details linked to that support request.
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            placeholder="Loan ID"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1", minWidth: 180 }}
          />
          <button onClick={load} style={btn(true)}>
            Load
          </button>
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
      </div>

      {data ? (
        <div style={{ ...card(), marginTop: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Withdrawal Details
          </div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>LOAN ID</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{data?.loan_id ?? "—"}</div>
            </div>

            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>AVAILABLE TO WITHDRAW</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>
                {data?.amount ?? "—"} {data?.currency ?? ""}
              </div>
            </div>

            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>DESTINATION ACCOUNT NAME</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{data?.account_name ?? "—"}</div>
            </div>

            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>DESTINATION ACCOUNT NUMBER</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{data?.account_number ?? "—"}</div>
            </div>

            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>BANK / WALLET PROVIDER</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{data?.bank_name ?? "—"}</div>
            </div>

            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>STATUS</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{data?.status ?? "—"}</div>
            </div>
          </div>

          <div style={{ ...card(), marginTop: 16, background: "#F8FAFC", boxShadow: "none" }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>
              Why this route exists
            </div>
            <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
              GMFN is not acting as a cash custodian. It helps coordinate trust, instructions, and reconciliation.
              The actual payout should land in your own registered bank or wallet account.
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}