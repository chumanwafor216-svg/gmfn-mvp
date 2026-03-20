import React, { useEffect, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { getMe } from "../lib/api";

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

function detectCurrency(me: any): string {
  const preferred = String(me?.preferred_currency || "").trim().toUpperCase();
  if (preferred) return preferred;

  const country = String(me?.country || "").trim().toUpperCase();
  if (country === "GB" || country === "UK") return "GBP";
  if (country === "NG") return "NGN";
  if (country === "KE") return "KES";
  if (country === "GH") return "GHS";
  return "NGN";
}

export default function PayoutDetailsPage() {
  const [me, setMe] = useState<any>(null);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState({
    account_name: "",
    account_number: "",
    bank_name: "",
    country: "",
    currency: "NGN",
  });

  useEffect(() => {
    (async () => {
      const meRes = await getMe().catch(() => null);
      setMe(meRes || null);
      setForm((prev) => ({
        ...prev,
        account_name: meRes?.account_name || "",
        account_number: meRes?.account_number || "",
        bank_name: meRes?.bank_name || "",
        country: meRes?.country || "",
        currency: detectCurrency(meRes),
      }));
    })();
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function saveLocal() {
    localStorage.setItem("gmfn_payout_account", JSON.stringify(form));
    setMsg("Payout details saved locally for this pilot build.");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        title="Bank / Wallet Details"
        subtitle="This is where approved withdrawals should go after they leave the community settlement account."
      />

      {msg ? (
        <div
          style={{
            ...card(),
            marginTop: 18,
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            fontWeight: 900,
          }}
        >
          {msg}
        </div>
      ) : null}

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Why this matters
        </div>
        <div style={{ marginTop: 10, color: "#475569", lineHeight: 1.8 }}>
          GMFN does not hold funds as a custodian. When a withdrawal is processed,
          money should move from the community settlement account into your own registered payout account.
          This page tells the system where your approved funds should go.
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Payout Account Details
        </div>

        <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <input
            value={form.account_name}
            onChange={(e) => update("account_name", e.target.value)}
            placeholder="Account name"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          />

          <input
            value={form.account_number}
            onChange={(e) => update("account_number", e.target.value)}
            placeholder="Account number / wallet number"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          />

          <input
            value={form.bank_name}
            onChange={(e) => update("bank_name", e.target.value)}
            placeholder="Bank / wallet provider"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          />

          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            placeholder="Country"
            style={{ padding: 12, borderRadius: 12, border: "1px solid #CBD5E1" }}
          />

          <select
            value={form.currency}
            onChange={(e) => update("currency", e.target.value)}
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

        <div style={{ marginTop: 16, color: "#64748b", lineHeight: 1.8 }}>
          In this pilot build, these details are saved locally on your device for workflow continuity.
          In the full onboarding flow, these fields should be stored and verified as part of registration.
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={saveLocal} style={btn(true)}>
            Save Payout Details
          </button>
        </div>
      </div>
    </div>
  );
}