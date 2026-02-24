import { useState } from "react";

export default function LockManagementPage() {
  const [loanId, setLoanId] = useState<number>(1);
  const [clanId, setClanId] = useState<number>(1);

  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const featureEnabled = false; // ✅ backend endpoint not available yet

  async function onRelease() {
    setErr(null);
    setOk(null);

    if (!Number.isFinite(loanId) || loanId <= 0) {
      setErr("Enter a valid loan_id");
      return;
    }
    if (!Number.isFinite(clanId) || clanId <= 0) {
      setErr("Enter a valid clan_id");
      return;
    }

    // Backend does not expose any lock/release endpoint yet (confirmed via OpenAPI).
    setErr(
      "This feature is not enabled yet. The backend does not currently provide an endpoint to release guarantee locks. " +
        "We will implement it after MVP freeze on a feature branch."
    );
  }

  return (
    <div style={{ padding: 16, maxWidth: 800 }}>
      <h2 style={{ marginTop: 0 }}>Lock Management (Admin)</h2>
      <p style={{ color: "#6b7280" }}>
        Release locked guarantee funds for a loan after repayment/cancellation.
      </p>

      <div
        style={{
          border: "1px solid #eee",
          borderRadius: 12,
          padding: 12,
          background: "#fafafa",
          marginBottom: 12,
        }}
      >
        <b>Coming soon</b>
        <div style={{ marginTop: 6, color: "#6b7280", fontSize: 13 }}>
          Lock release requires a backend endpoint (e.g. <code>POST /loans/&lt;id&gt;/guarantors/release-locks</code>).
          It is not available in this MVP build.
        </div>
      </div>

      {err && <div style={{ color: "crimson", marginBottom: 10, whiteSpace: "pre-wrap" }}>{err}</div>}
      {ok && <div style={{ color: "green", marginBottom: 10, whiteSpace: "pre-wrap" }}>{ok}</div>}

      <div style={{ display: "grid", gap: 10, maxWidth: 360 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span>Loan ID</span>
          <input
            type="number"
            value={loanId}
            onChange={(e) => setLoanId(Number(e.target.value))}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Clan ID</span>
          <input
            type="number"
            value={clanId}
            onChange={(e) => setClanId(Number(e.target.value))}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
          />
        </label>

        <button
          onClick={onRelease}
          disabled={!featureEnabled}
          style={{
            padding: 10,
            borderRadius: 10,
            border: "1px solid #ddd",
            background: "white",
            cursor: featureEnabled ? "pointer" : "not-allowed",
            opacity: featureEnabled ? 1 : 0.6,
          }}
          title={!featureEnabled ? "Disabled until backend endpoint exists" : "Release locks for loan"}
        >
          Release locks for loan
        </button>
      </div>
    </div>
  );
}
