import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { getLoanWithdrawalInstruction } from "../lib/api";

function safeStr(x: any): string {
  return String(x ?? "").trim();
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

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function btn(primary = false, disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "11px 14px",
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    fontSize: 14,
    textDecoration: "none",
    opacity: disabled ? 0.72 : 1,
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

  if (s.includes("approved") || s.includes("ready") || s.includes("available")) {
    return {
      bg: "#ECFDF5",
      border: "1px solid #A7F3D0",
      text: "#065F46",
      label: status || "Ready",
    };
  }

  if (s.includes("pending")) {
    return {
      bg: "#EFF6FF",
      border: "1px solid #BFDBFE",
      text: "#1D4ED8",
      label: status || "Pending",
    };
  }

  if (s.includes("cancelled") || s.includes("failed") || s.includes("blocked")) {
    return {
      bg: "#FEF2F2",
      border: "1px solid #FECACA",
      text: "#991B1B",
      label: status || "Blocked",
    };
  }

  return {
    bg: "#F8FAFC",
    border: "1px solid #E2E8F0",
    text: "#475569",
    label: status || "Unknown",
  };
}

export default function WithdrawalInstructionsPage() {
  const [loanId, setLoanId] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    setErr("");
    setData(null);
    setLoading(true);

    try {
      if (!loanId || Number(loanId) <= 0) {
        throw new Error("Enter a valid loan ID.");
      }

      const res = await getLoanWithdrawalInstruction(Number(loanId));
      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load withdrawal instructions."));
    } finally {
      setLoading(false);
    }
  }

  const availableAmount = useMemo(() => {
    return `${fmtMoney(data?.amount ?? "0")} ${safeStr(data?.currency || "")}`.trim();
  }, [data]);

  const status = safeStr(data?.status || "unknown");
  const tone = statusTone(status);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        title="Withdrawal Instructions"
        subtitle="Review how approved funds move from the community settlement path into your own payout destination."
      />

      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
        }}
      >
        <div style={sectionLabel()}>How withdrawal works</div>

        <div
          style={{
            marginTop: 10,
            fontSize: 28,
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          Approved value moves to your own payout destination
        </div>

        <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
          1. Your approved support becomes visible in your personal pool and loan flow.
          <br />
          2. Withdrawal moves that value from the community settlement route into your own payout destination.
          <br />
          3. GMFN does not send money directly to merchants during this stage.
          <br />
          4. After payout reaches your own destination, you can complete your own external payment if needed.
        </div>

        <div
          style={{
            marginTop: 14,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <Link to="/app/loans" style={btn(true)}>
            Return to Loans & Support
          </Link>
          <Link to="/app/payment/pool" style={btn(false)}>
            Money In
          </Link>
          <Link to="/app/community" style={btn(false)}>
            Community Home
          </Link>
        </div>
      </div>

      <div
        style={{
          ...pageCard("#FFFDF5"),
          marginTop: 18,
          border: "1px solid rgba(214,175,71,0.25)",
        }}
      >
        <div style={{ fontWeight: 1000, color: "#92400E" }}>Important</div>

        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          Before withdrawing, make sure your payout destination details are correct in the settlement process you are using.
          Wrong or missing payout details can delay movement of approved funds.
        </div>
      </div>

      <div style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Load a withdrawal instruction</div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          Enter the approved loan ID to review the withdrawal details linked to that support request.
        </div>

        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <input
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            placeholder="Loan ID"
            style={{
              padding: 12,
              borderRadius: 12,
              border: "1px solid #CBD5E1",
              minWidth: 180,
              outline: "none",
            }}
          />

          <button onClick={load} disabled={loading} style={btn(true, loading)}>
            {loading ? "Loading..." : "Load"}
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
        <>
          <div
            style={{
              ...pageCard(),
              marginTop: 18,
              background: tone.bg,
              border: tone.border,
            }}
          >
            <div style={sectionLabel()}>Withdrawal status</div>

            <div
              style={{
                marginTop: 8,
                fontSize: 28,
                fontWeight: 1000,
                color: tone.text,
              }}
            >
              {tone.label}
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
              This status shows whether the withdrawal route for this loan is ready, pending, blocked, or already settled.
            </div>
          </div>

          <div style={{ ...pageCard(), marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Withdrawal Details
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Loan ID</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 20 }}>
                  {safeStr(data?.loan_id ?? "—")}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Available to Withdraw</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 20 }}>
                  {availableAmount || "—"}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Destination Account Name</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {safeStr(data?.account_name ?? "—")}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Destination Account Number</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {safeStr(data?.account_number ?? "—")}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Bank / Wallet Provider</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {safeStr(data?.bank_name ?? "—")}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Status</div>
                <div style={{ marginTop: 8, fontWeight: 1000, color: "#0B1F33", fontSize: 18 }}>
                  {safeStr(data?.status ?? "—")}
                </div>
              </div>
            </div>
          </div>

          <div style={{ ...pageCard(), marginTop: 18 }}>
            <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
              Why this route exists
            </div>

            <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
              GMFN is not acting as a cash custodian. It helps coordinate trust, instructions, and reconciliation.
              The actual payout should land in your own registered destination account or wallet.
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}