// src/pages/TrustScorePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTrustScoreExplained, getTrustEvents, getPoolMe, requestPoolDeposit, requestPoolWithdrawal } from "../lib/api";

type TrustExplained = {
  score: any;
  band: string;
  guidance?: string;
  breakdown?: any;
};

type TrustEvent = {
  id: number;
  event_type: string;
  created_at: string;
  meta?: any;
};

function bandColor(band: string) {
  const b = (band || "").toUpperCase();
  if (b === "A") return { bg: "#dcfce7", fg: "#166534" };
  if (b === "B") return { bg: "#e0f2fe", fg: "#075985" };
  if (b === "C") return { bg: "#fef9c3", fg: "#92400e" };
  return { bg: "#fee2e2", fg: "#991b1b" };
}

function trustMessage(scoreNum: number) {
  if (scoreNum >= 80) return "Excellent trust. You repay consistently and support others.";
  if (scoreNum >= 60) return "Good standing. Keep repaying on time.";
  if (scoreNum >= 40) return "Building trust. Complete repayments to grow.";
  return "Start small. Finish repayments to build trust.";
}

function asNum(x: any): number {
  const n = Number(x);
  return Number.isFinite(n) ? n : 0;
}

function fmtMoney(x: any): string {
  const s = (x ?? "").toString().trim();
  return s ? s : "0.00";
}

export default function TrustScorePage() {
  const [trust, setTrust] = useState<TrustExplained | null>(null);
  const [events, setEvents] = useState<TrustEvent[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Pool mini panel
  const [pool, setPool] = useState<any>(null);
  const [poolErr, setPoolErr] = useState<string | null>(null);
  const [depositAmt, setDepositAmt] = useState("20");
  const [withdrawAmt, setWithdrawAmt] = useState("10");
  const [busy, setBusy] = useState(false);

  async function load() {
    setErr(null);
    setPoolErr(null);
    try {
      const t: any = await getTrustScoreExplained();
      setTrust(t);

      const ev: any = await getTrustEvents();
      const list = Array.isArray(ev) ? ev : ev?.items || [];
      setEvents(list.slice(0, 10));

      try {
        const p = await getPoolMe("NGN", 10);
        setPool(p);
      } catch (e: any) {
        setPool(null);
        setPoolErr(String(e?.message || e));
      }
    } catch (e: any) {
      setErr(e?.message || String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  const scoreRaw = trust?.score ?? 0;
  const score = asNum(scoreRaw);
  const band = trust?.band ?? "C";
  const colors = bandColor(band);

  const repaymentOnlyNotice = useMemo(() => {
    return (
      <div
        style={{
          background: "#f0f9ff",
          border: "1px solid #bae6fd",
          padding: 12,
          borderRadius: 12,
          marginTop: 14,
          fontSize: 14,
        }}
      >
        <b>Important:</b> Your trust increases only when a loan is fully repaid.
        <br />
        Requesting guarantors does not raise trust. Completing repayment does.
      </div>
    );
  }, []);

  async function doDeposit() {
    setPoolErr(null);
    setBusy(true);
    try {
      await requestPoolDeposit({ amount: depositAmt.trim(), currency: "NGN", note: "Pilot deposit" });
      await load();
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function doWithdraw() {
    setPoolErr(null);
    setBusy(true);
    try {
      await requestPoolWithdrawal({ amount: withdrawAmt.trim(), currency: "NGN", note: "Pilot withdrawal" });
      await load();
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2 style={{ marginTop: 0 }}>Your Trust Score</h2>

      {err && (
        <div style={{ background: "#fee2e2", padding: 12, borderRadius: 10, border: "1px solid #fecaca", marginBottom: 12 }}>
          {err}
        </div>
      )}

      {poolErr && (
        <div style={{ background: "#fffbeb", padding: 12, borderRadius: 10, border: "1px solid #fde68a", marginBottom: 12 }}>
          {poolErr}
        </div>
      )}

      {/* Pool mini panel */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 14, background: "#fff", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000 }}>Clan Pool (pilot ledger)</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{pool?.reference ? `Ref: ${pool.reference}` : "Ref: —"}</div>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Available</div>
            <div style={{ fontWeight: 1000 }}>{fmtMoney(pool?.available_balance)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Pending deposits</div>
            <div style={{ fontWeight: 1000 }}>{fmtMoney(pool?.pending_deposits)}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Pending withdrawals</div>
            <div style={{ fontWeight: 1000 }}>{fmtMoney(pool?.pending_withdrawals)}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>I deposited</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input value={depositAmt} onChange={(e) => setDepositAmt(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }} />
              <button onClick={doDeposit} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                Record
              </button>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Withdraw</div>
            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <input value={withdrawAmt} onChange={(e) => setWithdrawAmt(e.target.value)} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb" }} />
              <button onClick={doWithdraw} disabled={busy} style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer", fontWeight: 900 }}>
                Request
              </button>
            </div>
          </div>

          <Link to="/dashboard" style={{ textDecoration: "none", padding: "10px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 900, color: "#111827", height: 40, display: "inline-flex", alignItems: "center" }}>
            Open Dashboard →
          </Link>
        </div>

        <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
          Non-custodial pilot: deposits/withdrawals are requests until admin confirms external transfer.
        </div>
      </div>

      {/* Main Trust Card */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 16, padding: 20, background: "#ffffff", boxShadow: "0 4px 14px rgba(0,0,0,0.05)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{score}</div>

          <div style={{ padding: "6px 14px", borderRadius: 999, background: colors.bg, color: colors.fg, fontWeight: 900, fontSize: 16 }}>
            Band {band}
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 15 }}>{trustMessage(score)}</div>

        {repaymentOnlyNotice}

        <div style={{ marginTop: 16 }}>
          <button onClick={() => setShowBreakdown(!showBreakdown)} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #ddd", background: "white", cursor: "pointer" }}>
            {showBreakdown ? "Hide breakdown" : "Show breakdown"}
          </button>
        </div>

        {showBreakdown && (
          <pre style={{ marginTop: 12, background: "#f9fafb", padding: 12, borderRadius: 12, fontSize: 12, overflowX: "auto" }}>
            {JSON.stringify(trust?.breakdown || trust || {}, null, 2)}
          </pre>
        )}

        <div style={{ marginTop: 18 }}>
          <Link to="/trust-slip" style={{ textDecoration: "none", padding: "10px 14px", background: "#2563eb", color: "white", borderRadius: 10, fontWeight: 600 }}>
            View My TrustSlip →
          </Link>
        </div>
      </div>

      {/* Recent Trust Activity */}
      <div style={{ marginTop: 24, border: "1px solid #e5e7eb", borderRadius: 16, padding: 16, background: "#ffffff" }}>
        <h3 style={{ marginTop: 0 }}>Recent Trust Activity</h3>

        {events.length === 0 && <div style={{ color: "#6b7280" }}>No recent trust updates yet.</div>}

        {events.map((e) => (
          <div key={e.id} style={{ padding: "8px 0", borderBottom: "1px solid #f3f4f6", fontSize: 14 }}>
            {new Date(e.created_at).toLocaleString()} — {e.event_type}
          </div>
        ))}
      </div>
    </div>
  );
}