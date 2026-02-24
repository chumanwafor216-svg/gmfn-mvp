// frontend/src/pages/AdminIncompleteLoansPage.tsx
import React, { useEffect, useState } from "react";
import { getAccessToken } from "../lib/api";

type Row = {
  loan_id: number;
  borrower_user_id: number;
  amount: number;
  currency: string;
  status: string;
  decision_at: string | null;
  auto_cancel_remaining_seconds: number | null;
  guarantors_required: number;
  approved_guarantors: number;
  pending_guarantors: number;
  locked_coverage: number;
  required_gap: number;
};

async function apiGet(path: string) {
  const t = getAccessToken();
  if (!t) throw new Error("Not authenticated");
  const res = await fetch(`/api${path}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${t}` },
  });
  const txt = await res.text();
  if (!res.ok) throw new Error(txt || `HTTP ${res.status}`);
  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

function fmtCountdown(sec: number | null) {
  if (sec == null) return "—";
  const s = Math.max(0, sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

export default function AdminIncompleteLoansPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const data: any = await apiGet(`/admin/loans/incomplete?limit=50`);
      setRows((data?.items || []) as Row[]);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 18 }}>
      <h2>Admin — Incomplete Loans Queue</h2>

      <button
        onClick={load}
        disabled={loading}
        style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}
      >
        {loading ? "Loading…" : "Refresh"}
      </button>

      {err && (
        <div style={{ marginTop: 12, background: "#fee2e2", border: "1px solid #fecaca", padding: 10, borderRadius: 10, whiteSpace: "pre-wrap" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 12, border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden", background: "white" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Loan</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Borrower</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Amount</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Quorum</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Coverage</th>
              <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Auto-cancel</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.loan_id}>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>
                  #{r.loan_id} <div style={{ fontSize: 12, color: "#64748b" }}>{r.status}</div>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  user_id: {r.borrower_user_id}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  {r.amount} {r.currency}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  {r.approved_guarantors}/{r.guarantors_required} approved
                  <div style={{ fontSize: 12, color: "#64748b" }}>{r.pending_guarantors} pending</div>
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9" }}>
                  locked {r.locked_coverage} / gap {r.required_gap}
                </td>
                <td style={{ padding: 10, borderBottom: "1px solid #f1f5f9", fontWeight: 900 }}>
                  {fmtCountdown(r.auto_cancel_remaining_seconds)}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: 12, color: "#6b7280" }}>
                  No incomplete loans right now.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: "#64748b" }}>
        Screenshot tip: This page is visa-evidence friendly (incomplete queue + countdown).
      </div>
    </div>
  );
}
