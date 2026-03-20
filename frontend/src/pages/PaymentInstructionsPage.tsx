import React, { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createLoanInstruction,
  createPoolInstruction,
  getLoan,
  getLoanSummary,
  getMe,
  getSettlementConfig,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

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
    fontSize: 14,
    textDecoration: "none",
    cursor: "pointer",
  };
}

function detectCurrency(me: any, fallback?: string | null): string {
  const preferred = safeStr(me?.preferred_currency).trim().toUpperCase();
  if (preferred) return preferred;

  const country = safeStr(me?.country).trim().toUpperCase();
  if (country === "GB" || country === "UK") return "GBP";
  if (country === "NG") return "NGN";
  if (country === "KE") return "KES";
  if (country === "GH") return "GHS";

  return safeStr(fallback || "NGN").trim().toUpperCase() || "NGN";
}

export default function PaymentInstructionsPage() {
  const { loanId } = useParams();
  const [params] = useSearchParams();
  const isLoan = Boolean(loanId);

  const [instruction, setInstruction] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [me, setMe] = useState<any>(null);

  const [amount, setAmount] = useState(params.get("amount") || "");
  const [currency, setCurrency] = useState(params.get("currency") || "NGN");

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    (async () => {
      const [cfg, meRes] = await Promise.all([
        getSettlementConfig().catch(() => null),
        getMe().catch(() => null),
      ]);

      setSettlement(cfg || null);
      setMe(meRes || null);

      if (!params.get("currency")) {
        setCurrency(detectCurrency(meRes, "NGN"));
      }
    })();
  }, []);

  useEffect(() => {
    if (!loanId) return;
    (async () => {
      const [loanRes, summaryRes] = await Promise.all([
        getLoan(Number(loanId)).catch(() => null),
        getLoanSummary(Number(loanId)).catch(() => null),
      ]);

      if (!amount) {
        const rem = summaryRes?.remaining_amount ?? loanRes?.remaining_amount ?? loanRes?.amount ?? "0";
        setAmount(safeStr(rem));
      }

      if (!params.get("currency")) {
        setCurrency(detectCurrency(me, summaryRes?.currency || loanRes?.currency || "NGN"));
      }

      setSummary(summaryRes || null);
    })();
  }, [loanId, me]);

  async function generate() {
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      const clanId = getSelectedClanId();
      if (!clanId) throw new Error("Select a community first.");
      if (!amount || Number(amount) <= 0) throw new Error("Enter a valid amount.");

      const out = isLoan
        ? await createLoanInstruction({
            clan_id: clanId,
            loan_id: Number(loanId),
            amount,
            currency,
          })
        : await createPoolInstruction({
            clan_id: clanId,
            amount,
            currency,
          });

      setInstruction(out || null);
      if (out?.settlement) setSettlement(out.settlement);
      setMsg("Instruction generated.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to generate instruction."));
    } finally {
      setBusy(false);
    }
  }

  const shownSettlement = instruction?.settlement || settlement || {};
  const ref = safeStr(instruction?.reference || "");
  const shownAmount = safeStr(instruction?.amount || amount || "0");
  const shownCurrency = safeStr(instruction?.currency || currency || "NGN");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        title={isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions"}
        subtitle={
          isLoan
            ? "Generate a unique repayment reference, then transfer using that exact reference."
            : "Generate a unique deposit reference, then transfer to the community settlement account using that exact reference."
        }
      />

      {err ? (
        <div style={{ ...card(), marginTop: 18, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontWeight: 900 }}>
          {err}
        </div>
      ) : null}

      {msg ? (
        <div style={{ ...card(), marginTop: 18, background: "#ECFDF5", border: "1px solid #A7F3D0", color: "#065F46", fontWeight: 900 }}>
          {msg}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>How this works</div>
        <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
          1. Enter the amount you want to {isLoan ? "repay" : "deposit"}.
          <br />
          2. Generate an instruction with a unique reference.
          <br />
          3. Transfer funds using the exact reference shown below.
          <br />
          4. The system will use that reference for deterministic reconciliation.
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link to="/payout-details" style={btn(false)}>
            Bank / Wallet Details
          </Link>
          <Link to="/loans" style={btn(false)}>
            Return to Finances
          </Link>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Instruction Request</div>

        <div style={{ marginTop: 8, color: "#6B7A88", fontSize: 14 }}>
          Amount: Enter the value you intend to {isLoan ? "repay" : "deposit"}.
        </div>
        <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 14 }}>
          Currency: Defaults to your preferred or detected currency, but you can change it if needed.
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          />
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          >
            <option value="GBP">GBP</option>
            <option value="NGN">NGN</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="KES">KES</option>
            <option value="GHS">GHS</option>
          </select>
        </div>

        {isLoan ? (
          <div style={{ marginTop: 12, color: "#6B7A88" }}>
            Loan ID: <b>{loanId}</b>
            {summary?.remaining_amount != null ? (
              <>
                {" "}
                · Remaining: <b>{fmtMoney(summary.remaining_amount)}</b> {safeStr(summary?.currency || currency)}
              </>
            ) : null}
          </div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={generate} disabled={busy} style={btn(true)}>
            {busy ? "Generating..." : "Generate Instruction"}
          </button>
        </div>
      </div>

      {instruction ? (
        <div style={{ ...card(), marginTop: 18 }}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>Transfer Details</div>

          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>BANK</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{safeStr(shownSettlement?.bank_name || "—")}</div>
            </div>
            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>ACCOUNT NAME</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{safeStr(shownSettlement?.account_name || "—")}</div>
            </div>
            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>ACCOUNT NUMBER</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{safeStr(shownSettlement?.account_number || "—")}</div>
            </div>
            <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
              <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>AMOUNT</div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>{shownAmount} {shownCurrency}</div>
            </div>
          </div>

          <div style={{ ...card(), marginTop: 16, boxShadow: "none", padding: 16 }}>
            <div style={{ fontSize: 12, color: "#64748b", fontWeight: 1000 }}>PAYMENT REFERENCE</div>
            <div style={{ marginTop: 8, fontSize: 20, fontWeight: 1000, color: "#0B1F33", wordBreak: "break-word" }}>
              {ref || "—"}
            </div>
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button onClick={() => { safeCopy(ref); setMsg("Reference copied."); }} style={btn(true)}>
              Copy Reference
            </button>
            <button
              onClick={() => {
                safeCopy(
                  [
                    isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions",
                    `Bank: ${safeStr(shownSettlement?.bank_name || "")}`,
                    `Account Name: ${safeStr(shownSettlement?.account_name || "")}`,
                    `Account Number: ${safeStr(shownSettlement?.account_number || "")}`,
                    `Amount: ${shownAmount} ${shownCurrency}`,
                    `Reference: ${ref}`,
                  ].join("\n")
                );
                setMsg("Full instruction copied.");
              }}
              style={btn(false)}
            >
              Copy Full Instruction
            </button>
          </div>

          <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
            {safeStr(shownSettlement?.support_note || "Use the exact payment reference when transferring funds.")}
          </div>
        </div>
      ) : null}
    </div>
  );
}