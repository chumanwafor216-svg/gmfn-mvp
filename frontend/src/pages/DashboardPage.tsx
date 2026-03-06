// src/pages/DashboardPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMe,
  getPoolMe,
  requestPoolDeposit,
  requestPoolWithdrawal,
  adminPoolPending,
  adminConfirmPoolEvent,
  getTrustScoreExplained,
  getTrustWhyMe,
} from "../lib/api";

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 60px rgba(2,6,23,0.06)",
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
  return { ...base, color: "#334155", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function safeStr(x: any): string {
  return (x ?? "").toString();
}

function fmtMoney(x: any): string {
  const s = safeStr(x).trim();
  return s ? s : "0.00";
}

export default function DashboardPage() {
  const [me, setMe] = useState<any>(null);
  const role = useMemo(() => safeStr(me?.role || "user").toLowerCase(), [me]);

  const [trust, setTrust] = useState<any>(null);
  const [trustWhy, setTrustWhy] = useState<any>(null);

  const [pool, setPool] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [depositAmt, setDepositAmt] = useState("50.00");
  const [withdrawAmt, setWithdrawAmt] = useState("10.00");
  const [note, setNote] = useState("Pilot transfer (external)");

  const [pending, setPending] = useState<any>(null);
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
  const [showAdminQueue, setShowAdminQueue] = useState(false);

  const trustScore = useMemo(() => {
    const s = trust?.score ?? trust?.computed?.score ?? trust?.standing_score ?? trust?.standingScore;
    if (s == null) return "—";
    return safeStr(s);
  }, [trust]);

  const trustBand = useMemo(() => safeStr(trust?.band ?? trust?.computed?.band ?? "—"), [trust]);

  const lastWhy = useMemo(() => {
    const ev = trustWhy?.events;
    if (!Array.isArray(ev) || ev.length === 0) return null;
    return ev[0];
  }, [trustWhy]);

  async function loadAll() {
    setErr(null);
    try {
      const m = await getMe();
      setMe(m);

      try {
        setTrust(await getTrustScoreExplained());
      } catch {
        setTrust(null);
      }

      try {
        setTrustWhy(await getTrustWhyMe());
      } catch {
        setTrustWhy(null);
      }

      try {
        setPool(await getPoolMe("NGN", 12));
      } catch (e: any) {
        setPool(null);
        setErr(String(e?.message || e));
      }

      if (safeStr(m?.role || "").toLowerCase() === "admin") {
        try {
          setPending(await adminPoolPending(30));
        } catch {
          setPending(null);
        }
      } else {
        setPending(null);
      }
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doDeposit() {
    setErr(null);
    setBusy(true);
    try {
      await requestPoolDeposit({
        amount: depositAmt.trim(),
        currency: "NGN",
        note: note.trim() || null,
      });
      await loadAll();
      setDepositAmt("50.00");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function doWithdraw() {
    setErr(null);
    setBusy(true);
    try {
      await requestPoolWithdrawal({
        amount: withdrawAmt.trim(),
        currency: "NGN",
        note: note.trim() || null,
      });
      await loadAll();
      setWithdrawAmt("10.00");
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  async function adminConfirm(id: number) {
    setErr(null);
    setPendingBusyId(id);
    try {
      await adminConfirmPoolEvent(id, "Verified externally (pilot)");
      await loadAll();
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setPendingBusyId(null);
    }
  }

  const poolAvailable = fmtMoney(pool?.available_balance);
  const poolPendingDeposits = fmtMoney(pool?.pending_deposits);
  const poolPendingWithdrawals = fmtMoney(pool?.pending_withdrawals);

  const recentEvents: any[] = Array.isArray(pool?.recent_events) ? pool.recent_events : [];
  const pendingCount = Number(pending?.items?.length || 0);

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>Home</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
            Simple view. Clear steps. Pilot mode.
          </div>
        </div>

        <button
          onClick={loadAll}
          style={{
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(11,31,51,0.12)",
            background: "#fff",
            fontWeight: 1000,
            cursor: "pointer",
          }}
        >
          Refresh
        </button>
      </div>

      {err && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(153,27,27,0.25)", background: "rgba(254,242,242,0.9)", color: "#991b1b", fontWeight: 900 }}>
          {err}
        </div>
      )}

      {/* KPI Row */}
      <div
        style={{
          marginTop: 12,
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Trust</div>
            <span style={pill("blue")}>Band {trustBand}</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>{trustScore}</div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
            Trust grows when repayment is complete.
          </div>
          {lastWhy && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#334155" }}>
              Last change: <b>{safeStr(lastWhy?.event_type || "—")}</b>
            </div>
          )}
        </div>

        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Pool Available</div>
            <span style={pill("gold")}>Clan</span>
          </div>
          <div style={{ marginTop: 10, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {poolAvailable} NGN
          </div>
          <div style={{ marginTop: 8, fontSize: 12, color: "#6B7A88" }}>
            Pending deposits: <b>{poolPendingDeposits}</b> · Pending withdrawals: <b>{poolPendingWithdrawals}</b>
          </div>
        </div>

        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Next step</div>
            <span style={pill("gray")}>Quick actions</span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <Link to="/loans" style={{ textDecoration: "none" }}>
              <div style={{ ...pill("gold"), justifyContent: "center", width: "100%" }}>Request / View Loans →</div>
            </Link>
            <Link to="/guarantor" style={{ textDecoration: "none" }}>
              <div style={{ ...pill("blue"), justifyContent: "center", width: "100%" }}>Guarantor Requests →</div>
            </Link>
            <Link to="/trust-slip" style={{ textDecoration: "none" }}>
              <div style={{ ...pill("gray"), justifyContent: "center", width: "100%" }}>Share TrustSlip →</div>
            </Link>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
            If you are not sure, start from <b>Loans</b>.
          </div>
        </div>
      </div>

      {/* Two-column content (stacks on small screens automatically due to grid) */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Pool actions */}
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Pool actions</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
                Pilot: record deposits and request withdrawals. Admin confirms external transfers.
              </div>
            </div>
            <span style={pill("gold")}>Pilot</span>
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Deposit amount (NGN)</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={depositAmt}
                  onChange={(e) => setDepositAmt(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                />
                <button
                  onClick={doDeposit}
                  disabled={busy}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(198,161,74,0.60)",
                    background: "rgba(198,161,74,0.12)",
                    fontWeight: 1000,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Record
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Withdraw amount (NGN)</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={withdrawAmt}
                  onChange={(e) => setWithdrawAmt(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                />
                <button
                  onClick={doWithdraw}
                  disabled={busy}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.14)",
                    background: "#fff",
                    fontWeight: 1000,
                    cursor: busy ? "not-allowed" : "pointer",
                  }}
                >
                  Request
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Note (optional)</div>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
              />
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Recent activity</div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
                Latest pool events (pilot).
              </div>
            </div>
            <span style={pill(recentEvents.length ? "blue" : "gray")}>{recentEvents.length ? "Updated" : "Empty"}</span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {recentEvents.length > 0 ? (
              recentEvents.slice(-8).reverse().map((e: any) => (
                <div
                  key={String(e?.id)}
                  style={{
                    padding: 10,
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.08)",
                    background: "#fff",
                    fontSize: 12,
                    color: "#334155",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <b>{safeStr(e?.event_type)}</b>{" "}
                    <span style={{ color: "#6B7A88" }}>
                      · {fmtMoney(e?.amount)} {safeStr(e?.currency || "NGN")}
                    </span>
                  </div>
                  <div style={{ fontWeight: 1000, color: safeStr(e?.confirmed_at) ? "#065f46" : "#92400e" }}>
                    {safeStr(e?.confirmed_at) ? "confirmed" : "pending"}
                  </div>
                </div>
              ))
            ) : (
              <div style={{ fontSize: 12, color: "#6B7A88" }}>No activity yet.</div>
            )}
          </div>
        </div>
      </div>

      {/* Admin queue (collapsed by default) */}
      {role === "admin" && (
        <div style={{ marginTop: 12, ...card() }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Admin confirmations</div>
              <div style={{ fontSize: 12, color: "#6B7A88" }}>Confirm external deposits/withdrawals (pilot).</div>
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <span style={pill(pendingCount ? "gold" : "gray")}>{pendingCount} pending</span>
              <button
                onClick={() => setShowAdminQueue((v) => !v)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.12)",
                  background: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
              >
                {showAdminQueue ? "Hide" : "Open"}
              </button>
            </div>
          </div>

          {showAdminQueue && (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {Array.isArray(pending?.items) && pending.items.length > 0 ? (
                pending.items.slice(0, 12).map((e: any) => (
                  <div
                    key={String(e?.id)}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      flexWrap: "wrap",
                      alignItems: "center",
                      borderTop: "1px solid rgba(11,31,51,0.08)",
                      paddingTop: 10,
                    }}
                  >
                    <div style={{ fontSize: 12, color: "#334155" }}>
                      <b>#{e.id}</b> · {safeStr(e.event_type)} · user {safeStr(e.user_id)} · {fmtMoney(e.amount)}{" "}
                      {safeStr(e.currency)}
                    </div>
                    <button
                      onClick={() => adminConfirm(Number(e.id))}
                      disabled={pendingBusyId === Number(e.id)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(11,31,51,0.12)",
                        background: "#fff",
                        fontWeight: 1000,
                        cursor: pendingBusyId === Number(e.id) ? "not-allowed" : "pointer",
                      }}
                    >
                      {pendingBusyId === Number(e.id) ? "Confirming..." : "Confirm"}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#6B7A88" }}>No pending items.</div>
              )}

              <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
                <Link to="/admin/trust-events" style={{ ...pill("blue"), textDecoration: "none" }}>
                  Audit events →
                </Link>
                <Link to="/exposure" style={{ ...pill("blue"), textDecoration: "none" }}>
                  Exposure & risk →
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile stacking */}
      <style>{`
        @media (max-width: 980px) {
          .gmfn-grid-3 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}