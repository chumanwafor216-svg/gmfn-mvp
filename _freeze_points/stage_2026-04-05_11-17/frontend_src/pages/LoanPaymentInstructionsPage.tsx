import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createLoanInstruction,
  getLoanSummary,
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

function button(primary = false): React.CSSProperties {
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
    cursor: "pointer",
    textDecoration: "none",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "13px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.12)",
    outline: "none",
    fontSize: 14,
    color: "#0B1F33",
    background: "#FFFFFF",
    boxSizing: "border-box",
  };
}

export default function LoanPaymentInstructionsPage() {
  const { loanId } = useParams();
  const numericLoanId = Number(loanId || 0);

  const [summary, setSummary] = useState<any>(null);
  const [instruction, setInstruction] = useState<any>(null);
  const [amount, setAmount] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const clanId = getSelectedClanId();

  useEffect(() => {
    async function load() {
      setErr("");

      try {
        if (!numericLoanId) {
          throw new Error("Missing or invalid loan ID.");
        }

        const res = await getLoanSummary(numericLoanId).catch(() => null);
        setSummary(res || null);

        const initialAmount = safeStr(
          res?.remaining_amount ??
            res?.loan?.remaining_amount ??
            res?.outstanding_amount ??
            ""
        ).trim();

        if (initialAmount) {
          setAmount(initialAmount);
        }
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load loan payment details."));
      }
    }

    void load();
  }, [numericLoanId]);

  const currency = useMemo(
    () =>
      safeStr(
        summary?.currency ||
          summary?.loan?.currency ||
          summary?.repayment_currency ||
          "NGN"
      ),
    [summary]
  );

  const remaining = useMemo(
    () =>
      fmtMoney(
        summary?.remaining_amount ??
          summary?.loan?.remaining_amount ??
          summary?.outstanding_amount ??
          0
      ),
    [summary]
  );

  async function generateInstructions() {
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      if (!numericLoanId) {
        throw new Error("Missing loan ID.");
      }

      if (!clanId) {
        throw new Error("No selected community found. Open a community first.");
      }

      const cleanAmount = String(amount || "").trim();
      if (!cleanAmount || Number(cleanAmount) <= 0) {
        throw new Error("Enter a valid repayment amount.");
      }

      const out = await createLoanInstruction({
        clan_id: clanId,
        loan_id: numericLoanId,
        amount: cleanAmount,
        currency,
      });

      setInstruction(out || null);
      setMsg("Loan payment instructions generated.");
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to generate loan payment instructions."));
    } finally {
      setBusy(false);
    }
  }

  const instructionText = safeStr(
    instruction?.instruction_text ||
      instruction?.detail ||
      instruction?.message ||
      ""
  );

  const reference = safeStr(
    instruction?.reference ||
      instruction?.payment_reference ||
      instruction?.reference_code ||
      instruction?.expected_reference ||
      ""
  );

  const accountName = safeStr(
    instruction?.account_name || instruction?.bank_account_name || ""
  );

  const accountNumber = safeStr(
    instruction?.account_number || instruction?.bank_account_number || ""
  );

  const bankName = safeStr(
    instruction?.bank_name || instruction?.provider || instruction?.rail_name || ""
  );

  const sortCode = safeStr(instruction?.sort_code || instruction?.bank_code || "");

  const amountShown = safeStr(
    instruction?.amount || amount || remaining || "0.00"
  );

  const copyBlock = [
    bankName ? `Bank: ${bankName}` : "",
    accountName ? `Account Name: ${accountName}` : "",
    accountNumber ? `Account Number: ${accountNumber}` : "",
    sortCode ? `Sort/Bank Code: ${sortCode}` : "",
    `Amount: ${amountShown} ${currency}`,
    reference ? `Reference: ${reference}` : "",
    instructionText ? `Instructions: ${instructionText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <div style={{ maxWidth: 980, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Loan Payment Instructions
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Generate repayment instructions for this loan and share the correct payment details.
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
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Loan Snapshot
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 14,
          }}
        >
          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Loan ID
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {numericLoanId || "—"}
            </div>
          </div>

          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Remaining
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {remaining} {currency}
            </div>
          </div>

          <div style={{ ...card(), boxShadow: "none", padding: 16 }}>
            <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
              Selected Community
            </div>
            <div style={{ marginTop: 6, fontWeight: 1000 }}>
              {clanId || "Not selected"}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 18, display: "grid", gap: 12, maxWidth: 420 }}>
          <div>
            <div
              style={{
                marginBottom: 8,
                color: "#475569",
                fontWeight: 900,
                fontSize: 14,
              }}
            >
              Repayment amount
            </div>
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter repayment amount"
              style={inputStyle()}
            />
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={generateInstructions}
              disabled={busy}
              style={button(true)}
            >
              {busy ? "Generating..." : "Generate Instructions"}
            </button>

            <Link to="/app/loans" style={button(false)}>
              Return to Finances
            </Link>
          </div>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Payment Details
        </div>

        {!instruction ? (
          <div style={{ marginTop: 12, color: "#6B7A88", lineHeight: 1.8 }}>
            Generate instructions to view the repayment reference and payment details for this loan.
          </div>
        ) : (
          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div
              style={{
                borderRadius: 16,
                border: "1px solid rgba(11,31,51,0.08)",
                background: "#F8FAFC",
                padding: 16,
              }}
            >
              <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                Amount
              </div>
              <div style={{ marginTop: 6, fontWeight: 1000 }}>
                {amountShown} {currency}
              </div>
            </div>

            {reference ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#F8FAFC",
                  padding: 16,
                }}
              >
                <div style={{ color: "#64748B", fontSize: 12, fontWeight: 1000 }}>
                  Payment Reference
                </div>
                <div style={{ marginTop: 6, fontWeight: 1000 }}>{reference}</div>
              </div>
            ) : null}

            {(bankName || accountName || accountNumber || sortCode) ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#F8FAFC",
                  padding: 16,
                  lineHeight: 1.9,
                  color: "#475569",
                }}
              >
                {bankName ? <div><b>Bank:</b> {bankName}</div> : null}
                {accountName ? <div><b>Account Name:</b> {accountName}</div> : null}
                {accountNumber ? <div><b>Account Number:</b> {accountNumber}</div> : null}
                {sortCode ? <div><b>Sort/Bank Code:</b> {sortCode}</div> : null}
              </div>
            ) : null}

            {instructionText ? (
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(11,31,51,0.08)",
                  background: "#F8FAFC",
                  padding: 16,
                  lineHeight: 1.9,
                  color: "#475569",
                }}
              >
                {instructionText}
              </div>
            ) : null}

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => {
                  safeCopy(copyBlock);
                  setMsg("Payment details copied.");
                }}
                style={button(true)}
              >
                Copy Payment Details
              </button>

              <Link to="/app/loans" style={button(false)}>
                Back to Finances
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}