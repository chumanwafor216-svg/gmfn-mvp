import React, { useEffect, useMemo, useState } from "react";
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
    opacity: disabled ? 0.72 : 1,
  };
}

function inputStyle(): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #CBD5E1",
    background: "#FFFFFF",
    width: "100%",
    boxSizing: "border-box",
    outline: "none",
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

function detectCurrency(me: any, fallback?: string | null): string {
  const preferred = safeStr(me?.preferred_currency).toUpperCase();
  if (preferred) return preferred;

  const country = safeStr(me?.country).toUpperCase();
  if (country === "GB" || country === "UK") return "GBP";
  if (country === "NG") return "NGN";
  if (country === "KE") return "KES";
  if (country === "GH") return "GHS";

  return safeStr(fallback || "NGN").toUpperCase() || "NGN";
}

export default function PaymentInstructionsPage() {
  const { loanId } = useParams();
  const [params] = useSearchParams();
  const isLoan = Boolean(loanId);

  const [instruction, setInstruction] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loan, setLoan] = useState<any>(null);
  const [me, setMe] = useState<any>(null);

  const [amount, setAmount] = useState(params.get("amount") || "");
  const [currency, setCurrency] = useState(params.get("currency") || "NGN");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const selectedClanId = Number(getSelectedClanId() || 0);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const [cfg, meRes, loanRes, summaryRes] = await Promise.all([
          getSettlementConfig().catch(() => null),
          getMe().catch(() => null),
          loanId ? getLoan(Number(loanId)).catch(() => null) : Promise.resolve(null),
          loanId
            ? getLoanSummary(Number(loanId)).catch(() => null)
            : Promise.resolve(null),
        ]);

        setSettlement(cfg || null);
        setMe(meRes || null);
        setLoan(loanRes || null);
        setSummary(summaryRes || null);

        if (!params.get("currency")) {
          setCurrency(
            detectCurrency(
              meRes,
              summaryRes?.currency || loanRes?.currency || cfg?.currency || "NGN"
            )
          );
        }

        if (loanId && !params.get("amount")) {
          const rem =
            summaryRes?.remaining_amount ??
            loanRes?.remaining_amount ??
            loanRes?.amount ??
            "0";
          setAmount(safeStr(rem));
        }
      } catch (e: any) {
        setErr(String(e?.message || e || "Unable to load payment instructions."));
      } finally {
        setLoading(false);
      }
    })();
  }, [loanId]);

  async function generate() {
    setBusy(true);
    setErr("");
    setMsg("");

    try {
      if (!selectedClanId) {
        throw new Error("Select a community first.");
      }

      if (!amount || Number(amount) <= 0) {
        throw new Error("Enter a valid amount.");
      }

      const out = isLoan
        ? await createLoanInstruction({
            clan_id: selectedClanId,
            loan_id: Number(loanId),
            amount,
            currency,
          })
        : await createPoolInstruction({
            clan_id: selectedClanId,
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

  const bankName = safeStr(
    shownSettlement?.bank_name ||
      shownSettlement?.bank ||
      shownSettlement?.institution_name ||
      "—"
  );

  const accountName = safeStr(
    shownSettlement?.account_name ||
      shownSettlement?.beneficiary_name ||
      "—"
  );

  const accountNumber = safeStr(
    shownSettlement?.account_number ||
      shownSettlement?.wallet_number ||
      shownSettlement?.wallet_address ||
      "—"
  );

  const supportNote = safeStr(
    shownSettlement?.support_note ||
      "Use the exact payment reference when transferring funds."
  );

  const fullInstructionText = useMemo(() => {
    return [
      isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions",
      `Bank / Institution: ${bankName}`,
      `Account Name: ${accountName}`,
      `Account Number / Wallet: ${accountNumber}`,
      `Amount: ${shownAmount} ${shownCurrency}`,
      `Reference: ${ref || "—"}`,
      `Note: ${supportNote}`,
    ].join("\n");
  }, [
    isLoan,
    bankName,
    accountName,
    accountNumber,
    shownAmount,
    shownCurrency,
    ref,
    supportNote,
  ]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title={isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions"}
        subtitle={
          isLoan
            ? "Generate a repayment reference, then transfer using that exact reference."
            : "Generate a deposit reference, then transfer using that exact reference."
        }
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

      {msg ? (
        <div
          style={{
            ...pageCard("#ECFDF5"),
            marginTop: 18,
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>How this works</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 28,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Generate the instruction first, then transfer exactly as shown
        </div>

        <div style={{ marginTop: 10, color: "#6B7A88", lineHeight: 1.8 }}>
          1. Enter the amount you want to {isLoan ? "repay" : "deposit"}.
          <br />
          2. Generate an instruction with a unique reference.
          <br />
          3. Transfer funds using the exact reference shown below.
          <br />
          4. The system uses that reference for deterministic reconciliation.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loans" style={actionLink(false)}>
            Return to Loans & Support
          </Link>
          <Link to="/app/withdrawal-instructions" style={actionLink(false)}>
            Withdrawal Guidance
          </Link>
          <Link to="/app/community" style={actionLink(true)}>
            Community Home
          </Link>
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 10 }}>
          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Selected community</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 18,
              }}
            >
              {selectedClanId ? `Community ${selectedClanId}` : "No community selected"}
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Instruction type</div>
            <div
              style={{
                marginTop: 8,
                color: "#0B1F33",
                fontWeight: 1000,
                fontSize: 18,
              }}
            >
              {isLoan ? "Loan repayment" : "Pool deposit"}
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Instruction Request</div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          Enter the amount first. Currency defaults to your preferred or detected
          value, but you can change it if needed.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
          }}
        >
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Amount"
            style={inputStyle()}
          />

          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            style={inputStyle()}
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
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div style={innerCard("#F8FBFF")}>
              <div style={sectionLabel()}>Loan context</div>
              <div style={{ marginTop: 8, color: "#0B1F33", fontWeight: 1000 }}>
                Loan ID: {loanId || "—"}
              </div>
              <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
                Amount:{" "}
                <strong style={{ color: "#0B1F33" }}>
                  {fmtMoney(loan?.amount || "0")} {safeStr(loan?.currency || currency)}
                </strong>
                <br />
                Remaining:{" "}
                <strong style={{ color: "#0B1F33" }}>
                  {fmtMoney(summary?.remaining_amount ?? loan?.remaining_amount ?? "0")}{" "}
                  {safeStr(summary?.currency || loan?.currency || currency)}
                </strong>
              </div>
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <button
            onClick={generate}
            disabled={busy}
            style={actionLink(true, busy)}
          >
            {busy ? "Generating..." : "Generate Instruction"}
          </button>
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Settlement destination</div>

        {loading ? (
          <div style={{ marginTop: 12, color: "#6B7A88" }}>
            Loading settlement details...
          </div>
        ) : (
          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Bank / Institution</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 18,
                }}
              >
                {bankName}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Account Name</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 18,
                }}
              >
                {accountName}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Account Number / Wallet</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 18,
                  wordBreak: "break-word",
                }}
              >
                {accountNumber}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Current Currency</div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  fontSize: 18,
                }}
              >
                {shownCurrency}
              </div>
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 16,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          {supportNote}
        </div>
      </div>

      {instruction ? (
        <div style={{ ...pageCard(), marginTop: 18 }}>
          <div style={sectionLabel()}>Generated instruction</div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 16,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Amount</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 24,
                  fontWeight: 1000,
                  color: "#0B1F33",
                }}
              >
                {shownAmount} {shownCurrency}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Reference</div>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 20,
                  fontWeight: 1000,
                  color: "#0B1F33",
                  wordBreak: "break-word",
                }}
              >
                {ref || "—"}
              </div>
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div style={innerCard("#F8FBFF")}>
              <div style={sectionLabel()}>Instruction summary</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {fullInstructionText}
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={sectionLabel()}>Generated at</div>
              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                {safeDateTime(
                  instruction?.created_at ||
                    instruction?.generated_at ||
                    instruction?.issued_at
                )}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <button
              onClick={() => {
                safeCopy(ref);
                setMsg("Reference copied.");
              }}
              style={actionLink(true)}
            >
              Copy Reference
            </button>

            <button
              onClick={() => {
                safeCopy(fullInstructionText);
                setMsg("Full instruction copied.");
              }}
              style={actionLink(false)}
            >
              Copy Full Instruction
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}