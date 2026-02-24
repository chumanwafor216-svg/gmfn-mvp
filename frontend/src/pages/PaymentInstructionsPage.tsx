// src/pages/PaymentInstructionsPage.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { getPaymentInstructions, PaymentInstructionPayload } from "../lib/paymentChannel";

function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  // fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
  return Promise.resolve();
}

export default function PaymentInstructionsPage() {
  const nav = useNavigate();
  const { loanId } = useParams<{ loanId: string }>();

  const [data, setData] = useState<PaymentInstructionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const id = Number(loanId);
        if (!loanId || Number.isNaN(id) || id <= 0) throw new Error("Invalid loan id.");

        const resp = await getPaymentInstructions(id);
        if (!alive) return;
        setData(resp);
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || String(e));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loanId]);

  async function doCopy(label: string, value: string) {
    await copyToClipboard(value);
    setCopied(label);
    setTimeout(() => setCopied(null), 1200);
  }

  return (
    <div style={{ padding: 16, maxWidth: 860, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Payment Instructions</h2>
        <button
          onClick={() => nav(-1)}
          style={{
            borderRadius: 10,
            padding: "10px 12px",
            border: "1px solid rgba(0,0,0,0.15)",
            background: "white",
          }}
        >
          Back
        </button>
      </div>

      <p style={{ marginTop: 8, opacity: 0.85 }}>
        This is a manual transfer (MVP). **No auto debit.** Your Trust grows only after a full repayment is confirmed.
      </p>

      {loading && <div style={{ padding: 12 }}>Loading…</div>}

      {err && (
        <div style={{ padding: 12, borderRadius: 12, background: "rgba(255,0,0,0.06)", border: "1px solid rgba(255,0,0,0.15)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>We couldn’t load instructions</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{err}</div>
        </div>
      )}

      {!loading && data && (
        <div style={{ marginTop: 14, borderRadius: 16, padding: 16, border: "1px solid rgba(0,0,0,0.12)", background: "white" }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>Loan #{data.loan_id}</div>

          <div style={{ marginTop: 10, borderRadius: 14, padding: 12, background: "rgba(255, 215, 0, 0.10)" }}>
            <div style={{ fontSize: 13, opacity: 0.85 }}>Your payment reference</div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 4 }}>{data.reference}</div>

            <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
              <button
                onClick={() => doCopy("Reference", data.reference)}
                style={{ borderRadius: 12, padding: "10px 14px", border: "1px solid rgba(0,0,0,0.15)", background: "white", fontWeight: 800 }}
              >
                Copy reference
              </button>

              {copied && (
                <div style={{ alignSelf: "center", fontWeight: 800, opacity: 0.85 }}>
                  Copied: {copied} ✅
                </div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, borderRadius: 14, padding: 12, background: "rgba(0, 0, 255, 0.03)" }}>
            <div style={{ fontWeight: 900, marginBottom: 8 }}>Bank details</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10 }}>
              <div>Account name</div>
              <div style={{ fontWeight: 800 }}>{data.bank_details.account_name}</div>

              <div>Account number</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 800 }}>{data.bank_details.account_number}</span>
                <button
                  onClick={() => doCopy("Account number", data.bank_details.account_number)}
                  style={{ borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(0,0,0,0.15)", background: "white", fontWeight: 800 }}
                >
                  Copy
                </button>
              </div>

              <div>Sort code</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ fontWeight: 800 }}>{data.bank_details.sort_code}</span>
                <button
                  onClick={() => doCopy("Sort code", data.bank_details.sort_code)}
                  style={{ borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(0,0,0,0.15)", background: "white", fontWeight: 800 }}
                >
                  Copy
                </button>
              </div>

              <div>Bank</div>
              <div style={{ fontWeight: 800 }}>{data.bank_details.bank_name}</div>

              <div>Currency</div>
              <div style={{ fontWeight: 800 }}>{data.bank_details.currency}</div>
            </div>
          </div>

          <div style={{ marginTop: 12, whiteSpace: "pre-wrap", lineHeight: 1.4 }}>
            {data.instructions}
          </div>

          <div style={{ marginTop: 12, fontSize: 12, opacity: 0.85 }}>
            {data.disclaimer}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
            Created: {data.created_at}
          </div>
        </div>
      )}
    </div>
  );
}