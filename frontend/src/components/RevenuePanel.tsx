import React, { useMemo } from "react";

/**
 * RevenuePanel (Pilot)
 * - Authority UI: neutral base, transparent fee breakdown
 * - Freeze-safe: frontend-only calculation (no backend dependency)
 * - Purpose: show Gross -> Service Fee -> Net to borrower (no hidden charges)
 */

type Props = {
  amount: string | number;
  currency: string;
  mode?: "pilot" | "prod" | string;
};

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function parseAmount(x: string | number): number {
  if (typeof x === "number") return Number.isFinite(x) ? x : 0;
  const t = safeStr(x).replace(/,/g, "").trim();
  const n = Number(t);
  return Number.isFinite(n) ? n : 0;
}

function money(n: number): string {
  if (!Number.isFinite(n)) return "0.00";
  return n.toFixed(2);
}

function card(): React.CSSProperties {
  return {
    border: "1px solid #e5e7eb",
    borderRadius: 16,
    padding: 14,
    background: "rgba(255,255,255,0.92)",
    boxShadow: "0 6px 18px rgba(0,0,0,0.06)",
  };
}

function pill(kind: "green" | "red" | "gray" | "blue" | "gold"): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 1000,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "nowrap",
  };
  if (kind === "green") return { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" };
  if (kind === "red") return { ...base, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" };
  if (kind === "blue") return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  if (kind === "gold") return { ...base, color: "#92400e", background: "#fffbeb", borderColor: "#fde68a" };
  return { ...base, color: "#374151", background: "#f9fafb", borderColor: "#e5e7eb" };
}

// Freeze-safe constants (frontend only). Adjust later to match published policy.
const PILOT_SERVICE_FEE_RATE = 0.03; // 3%
const PROD_SERVICE_FEE_RATE = 0.05; // 5% draft policy rate

export default function RevenuePanel({ amount, currency, mode = "pilot" }: Props) {
  const amt = useMemo(() => parseAmount(amount), [amount]);
  const cur = safeStr(currency || "NGN").trim() || "NGN";

  const feeRate = mode === "prod" ? PROD_SERVICE_FEE_RATE : PILOT_SERVICE_FEE_RATE;
  const fee = Math.max(0, amt * feeRate);
  const net = Math.max(0, amt - fee);

  return (
    <div style={card()}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 1000 }}>Revenue (transparent)</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
            Clear breakdown: gross request, service fee, and net to borrower.
          </div>
        </div>

        <span style={pill(mode === "prod" ? "gold" : "blue")}>{mode === "prod" ? "Production model" : "Pilot model"}</span>
      </div>

      <div style={{ marginTop: 12, display: "grid", gap: 10, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
        <div style={{ ...card(), boxShadow: "none" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Gross request</div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000 }}>
            {money(amt)} <span style={{ fontSize: 12, color: "#64748b" }}>{cur}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Borrower requested amount.</div>
        </div>

        <div style={{ ...card(), boxShadow: "none" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Service fee</div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000 }}>
            {money(fee)} <span style={{ fontSize: 12, color: "#64748b" }}>{cur}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>
            Rate: <b>{Math.round(feeRate * 100)}%</b> (transparent)
          </div>
        </div>

        <div style={{ ...card(), boxShadow: "none" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>Net to borrower</div>
          <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000 }}>
            {money(net)} <span style={{ fontSize: 12, color: "#64748b" }}>{cur}</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#64748b" }}>Amount after fee.</div>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#64748b" }}>
        {mode === "pilot"
          ? "Pilot note: rate is a calibration estimate while we validate behavior and the evidence trail."
          : "Production note: rate must match published policy."}
      </div>
    </div>
  );
}
