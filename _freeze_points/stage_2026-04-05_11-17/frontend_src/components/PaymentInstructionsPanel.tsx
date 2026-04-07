// frontend/src/components/PaymentInstructionsPanel.tsx
import React, { useMemo, useState } from "react";
import { copy as C } from "../lib/copy";

type Props = {
  loanId: number;
  borrowerUserId: number;
  currency?: string;
  amount?: string;
};

function makeReference(loanId: number, borrowerUserId: number) {
  return `GMFN-LOAN-${loanId}-U-${borrowerUserId}`;
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    return true;
  }
}

export default function PaymentInstructionsPanel({ loanId, borrowerUserId, currency, amount }: Props) {
  const reference = useMemo(() => makeReference(loanId, borrowerUserId), [loanId, borrowerUserId]);
  const [msg, setMsg] = useState<string | null>(null);

  // ✅ Replace these with your real bank details (pilot-safe)
  const bank = {
    bankName: "Your Bank Name",
    accountName: "GMFN Pilot Account",
    accountNumber: "00000000",
    sortCode: "00-00-00",
    note: "If you’re in Nigeria, replace sort code with NUBAN details.",
  };

  return (
    <div style={{ border: "1px solid #e5e7eb", borderRadius: 14, padding: 14, background: "#fff7ed" }}>
      <div style={{ fontWeight: 900, fontSize: 16 }}>{C.payment.headline}</div>
      <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>{C.payment.sub}</div>

      {msg && (
        <div style={{ marginTop: 10, background: "#ecfdf5", border: "1px solid #a7f3d0", padding: 10, borderRadius: 10 }}>
          {msg}
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
        <div><b>Bank:</b> {bank.bankName}</div>
        <div><b>Account name:</b> {bank.accountName}</div>
        <div><b>Account number:</b> {bank.accountNumber}</div>
        <div><b>Sort code:</b> {bank.sortCode}</div>
        <div style={{ color: "#6b7280", fontSize: 12 }}>{bank.note}</div>
      </div>

      <div style={{ marginTop: 12, padding: 12, borderRadius: 12, border: "1px solid #fde68a", background: "#fffbeb" }}>
        <div style={{ fontWeight: 800 }}>Reference (very important)</div>
        <div style={{ marginTop: 6, fontFamily: "monospace" }}>{reference}</div>
        <button
          style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, border: "1px solid #ddd", background: "white" }}
          onClick={async () => {
            await copyToClipboard(reference);
            setMsg("Reference copied ✅");
            window.setTimeout(() => setMsg(null), 1500);
          }}
        >
          Copy reference
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
        {C.payment.disclaimer}
        {currency && amount ? (
          <div style={{ marginTop: 6 }}>
            <b>Suggested repayment:</b> {amount} {currency}
          </div>
        ) : null}
      </div>
    </div>
  );
}