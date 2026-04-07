import React, { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import {
  getCurrentClan,
  getLoanWithdrawalInstruction,
  getSelectedClanId,
  safeCopy,
} from "../lib/api";

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

function getSettlementField(
  payload: any,
  keys: string[],
  fallback = "—"
): string {
  for (const key of keys) {
    const value = safeStr(payload?.[key]);
    if (value) return value;
  }
  return fallback;
}

function getCommunityName(clan: CommunityLite | null | undefined): string {
  return safeStr(clan?.marketplace_name || clan?.name || "");
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

function renderStepAction(step: NextStepState) {
  if (step.ctaTo.startsWith("#")) {
    return (
      <a href={step.ctaTo} style={primaryBtn(false)}>
        {step.ctaLabel}
      </a>
    );
  }

  return (
    <Link to={step.ctaTo} style={primaryBtn(false)}>
      {step.ctaLabel}
    </Link>
  );
}

export default function WithdrawalInstructionsPage() {
  const [params] = useSearchParams();
  const initialLoanId = safeStr(params.get("loan_id") || params.get("loanId") || "");

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loanId, setLoanId] = useState(initialLoanId);
  const [data, setData] = useState<any>(null);
  const [community, setCommunity] = useState<CommunityLite | null>(null);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

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
    (async () => {
      const clanRes = await getCurrentClan().catch(() => null);
      setCommunity(clanRes);
    })();
  }, []);

  useEffect(() => {
    if (!err && !msg) return;

    const timer = window.setTimeout(() => {
      setErr("");
      setMsg("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [err, msg]);

  async function loadByLoanId(targetLoanId: string, silent = false) {
    setErr("");
    if (!silent) setMsg("");
    setLoading(true);

    try {
      if (!targetLoanId || Number(targetLoanId) <= 0) {
        throw new Error("Enter a valid loan ID.");
      }

      const res = await getLoanWithdrawalInstruction(Number(targetLoanId));
      setData(res || null);

      if (!silent) {
        setMsg("Withdrawal instruction loaded.");
      }
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load withdrawal instructions."));
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!initialLoanId || Number(initialLoanId) <= 0) return;
    void loadByLoanId(initialLoanId, true);
  }, [initialLoanId]);

  const availableAmount = useMemo(() => {
    const amountText = fmtMoney(data?.amount ?? "0");
    const currencyText = safeStr(data?.currency || "");
    return `${amountText} ${currencyText}`.trim();
  }, [data]);

  const status = safeStr(data?.status || "unknown");
  const tone = statusTone(status);

  const destinationAccountName = getSettlementField(data, [
    "account_name",
    "beneficiary_name",
    "receiver_name",
    "wallet_name",
  ]);

  const destinationAccountNumber = getSettlementField(data, [
    "account_number",
    "wallet_number",
    "wallet_address",
    "destination_account",
  ]);

  const bankName = getSettlementField(data, [
    "bank_name",
    "bank",
    "institution_name",
    "provider_name",
  ]);

  const sortCode = getSettlementField(data, ["sort_code", "routing_number"], "");
  const iban = getSettlementField(data, ["iban"], "");
  const swift = getSettlementField(data, ["swift", "swift_code"], "");
  const payoutNote = getSettlementField(
    data,
    ["support_note", "payment_note", "note"],
    "Before moving funds, confirm that your payout destination details are correct."
  );

  const selectedCommunityLabel = useMemo(() => {
    return (
      getCommunityName(community) ||
      (selectedClanId ? `Community ${selectedClanId}` : "No community selected")
    );
  }, [community, selectedClanId]);

  const fullWithdrawalText = useMemo(() => {
    return [
      "Withdrawal Instructions",
      `Loan ID: ${safeStr(data?.loan_id || loanId || "—")}`,
      `Status: ${safeStr(data?.status || "—")}`,
      `Available to Withdraw: ${availableAmount || "—"}`,
      `Destination Account Name: ${destinationAccountName}`,
      `Destination Account Number / Wallet: ${destinationAccountNumber}`,
      `Bank / Wallet Provider: ${bankName}`,
      sortCode ? `Sort Code / Routing: ${sortCode}` : "",
      iban ? `IBAN: ${iban}` : "",
      swift ? `SWIFT: ${swift}` : "",
      `Note: ${payoutNote}`,
    ]
      .filter(Boolean)
      .join("\n");
  }, [
    data,
    loanId,
    availableAmount,
    destinationAccountName,
    destinationAccountNumber,
    bankName,
    sortCode,
    iban,
    swift,
    payoutNote,
  ]);

  const nextStep = useMemo<NextStepState>(() => {
    if (!selectedClanId) {
      return {
        title: "Choose the community context first",
        detail:
          "Withdrawal remains part of the same community-specific support path. Confirm the community context first whenever possible.",
        today: "Open Community Home and confirm the community you are working in.",
        tomorrow:
          "A clear community context keeps money movement easier to understand.",
        ctaLabel: "Open Community Home",
        ctaTo: "/app/community",
      };
    }

    if (!data) {
      return {
        title: "Load the withdrawal route first",
        detail:
          "Enter the approved loan ID and review the payout destination before moving funds externally.",
        today: "Load the withdrawal instruction before attempting payout.",
        tomorrow:
          "A visible withdrawal route reduces payout mistakes and reconciliation confusion.",
        ctaLabel: "Load instruction below",
        ctaTo: "#withdrawal-instruction-request",
      };
    }

    const statusLower = safeStr(data?.status || "").toLowerCase();

    if (
      statusLower.includes("approved") ||
      statusLower.includes("ready") ||
      statusLower.includes("available")
    ) {
      return {
        title: "Review the payout destination and move carefully",
        detail:
          "Approved value should move to your own payout destination, not directly to a merchant.",
        today: "Copy the withdrawal details and complete the external payout carefully.",
        tomorrow:
          "A deliberate payout step protects trust and keeps settlement traceable.",
        ctaLabel: "Open withdrawal details",
        ctaTo: "#generated-withdrawal-details",
      };
    }

    if (statusLower.includes("pending")) {
      return {
        title: "Monitor the withdrawal route",
        detail:
          "This withdrawal path still appears pending. Review the destination details and wait for the route to become ready.",
        today: "Review the status and confirm the payout destination is correct.",
        tomorrow:
          "A pending route often means the money path is not yet ready for final movement.",
        ctaLabel: "Open withdrawal status",
        ctaTo: "#generated-withdrawal-status",
      };
    }

    return {
      title: "Resolve the blocked or unclear payout path",
      detail:
        "The withdrawal route appears blocked or unclear. Review the details and return to the support path before trying again.",
      today: "Review the payout details and the loan path before attempting another move.",
      tomorrow:
        "Correcting the route first is safer than pushing money into an unclear destination.",
      ctaLabel: "Return to Loans & Support",
      ctaTo: "/app/loans",
    };
  }, [selectedClanId, data]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <PageTopNav
        sectionLabel="Withdrawal Instructions"
        title="Withdrawal Instructions"
        subtitle="Review how approved funds move from the community settlement path into your own payout destination."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/loans"
        backLabel="Loans & Support"
        nextLinks={[
          { label: "Money In", to: "/app/payment/pool" },
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
            <div style={sectionLabel()}>How withdrawal works</div>

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

            <div style={{ marginTop: 12, color: "#475569", lineHeight: 1.8 }}>
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
              <span style={badge(false)}>Payout goes to your own destination</span>
              <span style={badge(false)}>Not a direct merchant payment</span>
            </div>

            <div
              style={{
                marginTop: 14,
                color: "#475569",
                lineHeight: 1.8,
              }}
            >
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
                marginTop: 16,
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              {renderStepAction(nextStep)}
              <Link to="/app/loans" style={primaryBtn(false)}>
                Return to Loans & Support
              </Link>
              <Link to="/app/payment/pool" style={secondaryBtn(false)}>
                Money In
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

      <section
        style={{
          ...pageCard("#FFFDF5"),
          marginTop: 18,
          border: "1px solid rgba(214,175,71,0.25)",
        }}
      >
        <div style={{ fontWeight: 1000, color: "#92400E" }}>Important</div>

        <div style={{ marginTop: 8, color: "#475569", lineHeight: 1.8 }}>
          Before withdrawing, make sure your payout destination details are correct
          in the settlement process you are using. Wrong or missing payout details
          can delay movement of approved funds.
        </div>
      </section>

      <section id="withdrawal-instruction-request" style={{ ...pageCard(), marginTop: 18 }}>
        <div style={sectionLabel()}>Load a withdrawal instruction</div>

        <div
          style={{
            marginTop: 10,
            color: "#6B7A88",
            lineHeight: 1.8,
          }}
        >
          Enter the approved loan ID to review the withdrawal details linked to that
          support request.
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
              ...inputStyle(),
              minWidth: 180,
              maxWidth: 260,
            }}
          />

          <button
            onClick={() => void loadByLoanId(loanId)}
            disabled={loading}
            style={primaryBtn(loading)}
          >
            {loading ? "Loading..." : "Load"}
          </button>
        </div>
      </section>

      {data ? (
        <>
          <section
            id="generated-withdrawal-status"
            style={{
              ...pageCard(tone.bg),
              marginTop: 18,
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
              This status shows whether the withdrawal route for this loan is ready,
              pending, blocked, or already settled.
            </div>
          </section>

          <section id="generated-withdrawal-details" style={{ ...pageCard(), marginTop: 18 }}>
            <div
              style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}
            >
              Withdrawal Details
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 16,
              }}
            >
              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Loan ID</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 20,
                  }}
                >
                  {safeStr(data?.loan_id ?? loanId ?? "—")}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Available to Withdraw</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 20,
                  }}
                >
                  {availableAmount || "—"}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Destination Account Name</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {destinationAccountName}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Destination Account Number</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                    wordBreak: "break-word",
                  }}
                >
                  {destinationAccountNumber}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Bank / Wallet Provider</div>
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
                <div style={sectionLabel()}>Status</div>
                <div
                  style={{
                    marginTop: 8,
                    fontWeight: 1000,
                    color: "#0B1F33",
                    fontSize: 18,
                  }}
                >
                  {safeStr(data?.status ?? "—")}
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

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gap: 12,
              }}
            >
              <div style={innerCard("#F8FBFF")}>
                <div style={sectionLabel()}>Payout note</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.8,
                  }}
                >
                  {payoutNote}
                </div>
              </div>

              <div style={innerCard("#FFFFFF")}>
                <div style={sectionLabel()}>Copy-ready withdrawal summary</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#475569",
                    lineHeight: 1.8,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {fullWithdrawalText}
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
                  safeCopy(destinationAccountNumber);
                  setMsg("Destination account copied.");
                }}
                style={primaryBtn(false)}
              >
                Copy Destination
              </button>

              <button
                onClick={() => {
                  safeCopy(fullWithdrawalText);
                  setMsg("Full withdrawal details copied.");
                }}
                style={secondaryBtn(false)}
              >
                Copy Full Details
              </button>
            </div>
          </section>

          <section style={{ ...pageCard(), marginTop: 18 }}>
            <div
              style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}
            >
              Why this route exists
            </div>

            <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
              GMFN is not acting as a cash custodian. It helps coordinate trust,
              instructions, and reconciliation. The actual payout should land in
              your own registered destination account or wallet.
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}