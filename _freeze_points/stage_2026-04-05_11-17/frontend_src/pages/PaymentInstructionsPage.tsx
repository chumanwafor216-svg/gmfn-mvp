import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  createLoanInstruction,
  createPoolInstruction,
  getCurrentClan,
  getLoan,
  getLoanSummary,
  getMe,
  getSettlementConfig,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

type NextStepState = {
  title: string;
  detail: string;
  today: string;
  tomorrow: string;
  ctaLabel: string;
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

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
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
    boxShadow: "0 10px 24px rgba(15,23,42,0.035)",
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
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
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
    textDecoration: "none",
    fontWeight: 1000,
    fontSize: 14,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
    whiteSpace: "nowrap",
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

function feedbackCard(success: boolean): React.CSSProperties {
  return {
    ...pageCard(success ? "#ECFDF5" : "#FEF2F2"),
    border: success ? "1px solid #A7F3D0" : "1px solid #FECACA",
    color: success ? "#065F46" : "#991B1B",
    fontWeight: 900,
    padding: 14,
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

function getSettlementField(settlement: any, keys: string[], fallback = "—"): string {
  for (const key of keys) {
    const value = safeStr(settlement?.[key]);
    if (value) return value;
  }
  return fallback;
}

export default function PaymentInstructionsPage() {
  const { loanId } = useParams();
  const [params] = useSearchParams();
  const isLoan = Boolean(loanId);

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [instruction, setInstruction] = useState<any>(null);
  const [settlement, setSettlement] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [loan, setLoan] = useState<any>(null);
  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);

  const [amount, setAmount] = useState(params.get("amount") || "");
  const [currency, setCurrency] = useState(params.get("currency") || "NGN");

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const selectedClanId = Number(getSelectedClanId() || 0);

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
    if (!err && !msg) return;

    const timer = window.setTimeout(() => {
      setErr("");
      setMsg("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [err, msg]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");

      try {
        const [cfg, meRes, currentClanRes, loanRes, summaryRes] = await Promise.all([
          getSettlementConfig().catch(() => null),
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          loanId ? getLoan(Number(loanId)).catch(() => null) : Promise.resolve(null),
          loanId
            ? getLoanSummary(Number(loanId)).catch(() => null)
            : Promise.resolve(null),
        ]);

        setSettlement(cfg || null);
        setMe(meRes || null);
        setCurrentClan(currentClanRes || null);
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
  }, [loanId, params]);

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

      const loanStatus = safeStr(summary?.status || loan?.status || "").toLowerCase();

      if (
        isLoan &&
        ["cancelled", "rejected", "declined", "repaid", "defaulted", "completed"].includes(
          loanStatus
        )
      ) {
        throw new Error(
          `This loan is in status '${loanStatus}' and should not generate a new repayment instruction.`
        );
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
  const ref = safeStr(instruction?.reference || instruction?.payment_reference || "");
  const shownAmount = safeStr(instruction?.amount || amount || "0");
  const shownCurrency = safeStr(instruction?.currency || currency || "NGN");

  const bankName = getSettlementField(
    shownSettlement,
    ["bank_name", "bank", "institution_name", "provider_name"]
  );
  const accountName = getSettlementField(
    shownSettlement,
    ["account_name", "beneficiary_name", "receiver_name"]
  );
  const accountNumber = getSettlementField(
    shownSettlement,
    ["account_number", "wallet_number", "wallet_address", "beneficiary_account"]
  );
  const sortCode = getSettlementField(shownSettlement, ["sort_code", "routing_number"], "");
  const iban = getSettlementField(shownSettlement, ["iban"], "");
  const swift = getSettlementField(shownSettlement, ["swift", "swift_code"], "");
  const supportNote = getSettlementField(
    shownSettlement,
    ["support_note", "payment_note", "note"],
    "Use the exact payment reference when transferring funds."
  );

  const selectedCommunityLabel = firstTruthy(
    currentClan?.marketplace_name,
    currentClan?.name,
    selectedClanId ? `Community ${selectedClanId}` : "No community selected"
  );

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community context first",
        detail:
          "Payment instructions belong inside the selected community money path. Confirm the community first before generating a reference.",
        today: "Open Community Home and confirm the community you want to work in.",
        tomorrow:
          "A selected community keeps reconciliation cleaner and easier to trace.",
        ctaLabel: "Open Community Home",
      };
    }

    if (!instruction) {
      return {
        title: isLoan
          ? "Generate the repayment instruction first"
          : "Generate the deposit instruction first",
        detail:
          "Do not transfer money before the system gives you the exact reference and destination details.",
        today:
          "Enter the amount, confirm the currency, and generate the instruction before paying.",
        tomorrow:
          "The exact reference helps deterministic reconciliation and reduces confusion later.",
        ctaLabel: "Generate instruction below",
      };
    }

    return {
      title: "Copy the reference and transfer exactly as shown",
      detail:
        "The instruction has been generated. The next valid step is to transfer using the exact reference and destination details shown on this page.",
      today:
        "Copy the full instruction or reference, then transfer exactly as shown.",
      tomorrow:
        "Using the exact reference protects reconciliation and keeps the money path disciplined.",
      ctaLabel: "Copy reference below",
    };
  }, [selectedClanId, instruction, isLoan]);

  const fullInstructionText = useMemo(() => {
    return [
      isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions",
      `Bank / Institution: ${bankName}`,
      `Account Name: ${accountName}`,
      `Account Number / Wallet: ${accountNumber}`,
      sortCode ? `Sort Code / Routing: ${sortCode}` : "",
      iban ? `IBAN: ${iban}` : "",
      swift ? `SWIFT: ${swift}` : "",
      `Amount: ${shownAmount} ${shownCurrency}`,
      `Reference: ${ref || "—"}`,
      `Note: ${supportNote}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [
    isLoan,
    bankName,
    accountName,
    accountNumber,
    sortCode,
    iban,
    swift,
    shownAmount,
    shownCurrency,
    ref,
    supportNote,
  ]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel={isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions"}
        title={isLoan ? "Loan Repayment Instructions" : "Pool Deposit Instructions"}
        subtitle={
          isLoan
            ? "Generate a repayment reference first, then transfer using that exact reference."
            : "Generate a deposit reference first, then transfer using that exact reference."
        }
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Money Out", to: "/app/withdrawal-instructions" },
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Loan Readiness", to: "/app/loan-readiness" },
          { label: "Guided Suggestions", to: "/app/loan-suggestions" },
        ]}
      />

      {err ? (
        <div style={{ ...feedbackCard(false), marginTop: 18 }}>
          {err}
        </div>
      ) : null}

      {msg ? (
        <div style={{ ...feedbackCard(true), marginTop: 18 }}>
          {msg}
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
            <div style={sectionLabel()}>How this works</div>

            <div
              style={{
                marginTop: 10,
                fontSize: 28,
                fontWeight: 1000,
                color: "#0B1F33",
                lineHeight: 1.18,
              }}
            >
              {nextStep.title}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#6B7A88",
                lineHeight: 1.8,
                maxWidth: 860,
              }}
            >
              {nextStep.detail}
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
              <span style={badge(false)}>
                Type: {isLoan ? "Loan repayment" : "Pool deposit"}
              </span>
              {isLoan && loanId ? (
                <span style={badge(false)}>Loan ID: {loanId}</span>
              ) : null}
            </div>

            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <Link to="/app/loans" style={secondaryBtn(false)}>
                Return to Loans & Support
              </Link>
              <Link to="/app/withdrawal-instructions" style={secondaryBtn(false)}>
                Withdrawal Guidance
              </Link>
              <Link to="/app/community" style={primaryBtn(false)}>
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

      <section style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Instruction request</div>

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
            gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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

              <div
                style={{
                  marginTop: 8,
                  color: "#0B1F33",
                  fontWeight: 1000,
                  fontSize: 18,
                }}
              >
                Loan ID: {loanId || "—"}
              </div>

              <div
                style={{
                  marginTop: 8,
                  color: "#6B7A88",
                  lineHeight: 1.8,
                }}
              >
                Status:{" "}
                <strong style={{ color: "#0B1F33" }}>
                  {safeStr(summary?.status || loan?.status || "—")}
                </strong>
                <br />
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
            style={primaryBtn(busy)}
          >
            {busy ? "Generating..." : "Generate Instruction"}
          </button>
        </div>
      </section>

      <section style={{ ...pageCard(), marginTop: 18 }}>
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
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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

            {sortCode ? (
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Sort Code / Routing</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {sortCode}
                </div>
              </div>
            ) : null}

            {iban ? (
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>IBAN</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                    wordBreak: "break-word",
                  }}
                >
                  {iban}
                </div>
              </div>
            ) : null}

            {swift ? (
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>SWIFT</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {swift}
                </div>
              </div>
            ) : null}
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
      </section>

      {instruction ? (
        <section style={{ ...pageCard(), marginTop: 18 }}>
          <div style={sectionLabel()}>Generated instruction</div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
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
              style={primaryBtn(!ref)}
              disabled={!ref}
            >
              Copy Reference
            </button>

            <button
              onClick={() => {
                safeCopy(fullInstructionText);
                setMsg("Full instruction copied.");
              }}
              style={secondaryBtn(false)}
            >
              Copy Full Instruction
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}