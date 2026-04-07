import React, { useState } from "react";
import { getRevenueAllocation } from "../lib/api";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

export default function RevenueAllocationPage() {
  const [loanId, setLoanId] = useState("");
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    setData(null);
    try {
      if (!loanId || Number(loanId) <= 0) throw new Error("Enter a valid loan ID.");
      const res = await getRevenueAllocation(Number(loanId));
      setData(res || null);
    } catch (e: any) {
      setErr(String(e?.message || e || "Unable to load revenue allocation."));
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>
          Revenue Allocation
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88" }}>
          Inspect how service fees are distributed for a specific loan.
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <input
            value={loanId}
            onChange={(e) => setLoanId(e.target.value)}
            placeholder="Loan ID"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1", minWidth: 180 }}
          />
          <button
            onClick={load}
            style={{
              padding: "11px 14px",
              borderRadius: 14,
              border: "none",
              background: "#0B63D1",
              color: "#FFFFFF",
              fontWeight: 1000,
              cursor: "pointer",
            }}
          >
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

        <pre style={{ marginTop: 16, whiteSpace: "pre-wrap", fontSize: 13 }}>
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </div>
  );
}