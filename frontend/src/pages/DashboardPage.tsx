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
  safeCopy,
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

  // Trust summary (light)
  const [trust, setTrust] = useState<any>(null);
  const [trustWhy, setTrustWhy] = useState<any>(null);

  // Pool
  const [pool, setPool] = useState<any>(null);
  const [poolErr, setPoolErr] = useState<string | null>(null);
  const [poolBusy, setPoolBusy] = useState(false);

  const [depositAmt, setDepositAmt] = useState("50");
  const [withdrawAmt, setWithdrawAmt] = useState("10");
  const [poolNote, setPoolNote] = useState("Pilot transfer (external)");

  // Admin pending
  const [pending, setPending] = useState<any>(null);
  const [pendingBusyId, setPendingBusyId] = useState<number | null>(null);
    // ===== GMFN BLOCK START: POOL_UX_V2_STATE =====
  type ConfirmKind = "admin_confirm_pool" | "withdraw_request";

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>("admin_confirm_pool");
  const [confirmTargetId, setConfirmTargetId] = useState<number | null>(null);

  // Idempotency guard (UI-level): prevent rapid duplicates
  const [lastActionSig, setLastActionSig] = useState<string>("");

  // Small toast + flashes
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [flashPending, setFlashPending] = useState(false);

  function toast(s: string) {
    setToastMsg(s);
    window.setTimeout(() => setToastMsg(null), 1400);
  }

  function guardOnce(sig: string, ms: number = 1200): boolean {
    // returns true if allowed, false if blocked
    const now = Date.now();
    const cur = `${sig}:${Math.floor(now / ms)}`;
    if (cur === lastActionSig) return false;
    setLastActionSig(cur);
    return true;
  }
  // ===== GMFN BLOCK END: POOL_UX_V2_STATE =====

  async function loadAll() {
    setPoolErr(null);
    try {
      const m = await getMe();
      setMe(m);

      try {
        const t = await getTrustScoreExplained();
        setTrust(t);
      } catch {
        setTrust(null);
      }

      try {
        const w = await getTrustWhyMe();
        setTrustWhy(w);
      } catch {
        setTrustWhy(null);
      }

      try {
        const p = await getPoolMe("NGN", 20);
        setPool(p);
        setLastUpdatedAt(Date.now());
      } catch (e: any) {
        setPool(null);
        setPoolErr(String(e?.message || e));
      }

      if ((safeStr(m?.role || "").toLowerCase() === "admin") || (safeStr(m?.role || "").toLowerCase() === "superadmin")) {
        try {
          const q = await adminPoolPending(30);
          setPending(q);
        } catch {
          setPending(null);
        }
      } else {
        setPending(null);
      }
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    }
  }
    // UX: last updated + confirmation feedback
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [flashAvailable, setFlashAvailable] = useState(false);
  const [confirmingId, setConfirmingId] = useState<number | null>(null);
  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function doDepositRequest() {
    setPoolErr(null);
    setPoolBusy(true);
    try {
      await requestPoolDeposit({
        amount: depositAmt.trim(),
        currency: "NGN",
        note: poolNote.trim() || null,
      });
      await loadAll();
      setDepositAmt("50");
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    } finally {
      setPoolBusy(false);
    }
  }

    async function doWithdrawRequest() {
    setPoolErr(null);

    // Open confirm modal first (A)
    setConfirmKind("withdraw_request");
    setConfirmTargetId(null);
    setConfirmOpen(true);
  }

      async function runWithdrawRequest() {
    setPoolErr(null);
    setPoolBusy(true);

    const amt = withdrawAmt.trim();
    if (!amt) {
      setPoolErr("Enter a withdrawal amount.");
      setPoolBusy(false);
      return;
    }

    // UI idempotency guard
    if (!guardOnce(`withdraw_request:${amt}`)) {
      setPoolBusy(false);
      return;
    }

    try {
      await requestPoolWithdrawal({
        amount: amt,
        currency: "NGN",
        note: poolNote.trim() || null,
      });

      toast("Withdrawal requested (pending admin) ✓");

      setFlashPending(true);
      window.setTimeout(() => setFlashPending(false), 650);

      await loadAll();
      setWithdrawAmt("10"); // your reset
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    } finally {
      setPoolBusy(false);
    }
  }

    // ===== GMFN BLOCK START: POOL_ADMIN_CONFIRM_V2 =====
  function openAdminConfirm(id: number) {
    setPoolErr(null);
    setConfirmKind("admin_confirm_pool");
    setConfirmTargetId(Number(id));
    setConfirmOpen(true);
  }

  async function runAdminConfirm(id: number) {
    const eid = Number(id);
    if (!eid) return;

    // UI idempotency guard
    if (!guardOnce(`admin_confirm:${eid}`)) return;

    setPendingBusyId(eid);
    try {
      await adminConfirmPoolEvent(eid, "Verified externally (pilot)");
      toast("Confirmed ✓");

      setFlashAvailable(true);
      setFlashPending(true);
      window.setTimeout(() => setFlashAvailable(false), 650);
      window.setTimeout(() => setFlashPending(false), 650);

      await loadAll();
    } catch (e: any) {
      setPoolErr(String(e?.message || e));
    } finally {
      setPendingBusyId(null);
    }
  }
  // ===== GMFN BLOCK END: POOL_ADMIN_CONFIRM_V2 =====

  const reference = safeStr(pool?.reference || "GMFN-CLAN-?-U?");

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>Dashboard</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
            Operational overview (pilot). Deterministic trust + non-custodial pool ledger.
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

      {poolErr && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(153,27,27,0.25)", background: "rgba(254,242,242,0.9)", color: "#991b1b" }}>
          {poolErr}
        </div>
      )}
            {/* ===== GMFN BLOCK START: POOL_CONFIRM_MODAL_V2 ===== */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            right: 18,
            top: 18,
            zIndex: 50,
            padding: "10px 12px",
            borderRadius: 14,
            border: "1px solid rgba(11,31,51,0.12)",
            background: "rgba(255,255,255,0.96)",
            boxShadow: "0 18px 60px rgba(2,6,23,0.12)",
            fontWeight: 1000,
            color: "#0B1F33",
          }}
        >
          {toastMsg}
        </div>
      )}

      {confirmOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(2,6,23,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
          onClick={() => setConfirmOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 20,
              background: "#fff",
              border: "1px solid rgba(11,31,51,0.12)",
              boxShadow: "0 18px 60px rgba(2,6,23,0.20)",
              padding: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 1000, color: "#0B1F33", fontSize: 16 }}>
              Confirm action
            </div>

            {confirmKind === "admin_confirm_pool" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88", lineHeight: 1.5 }}>
                You are about to <b>confirm an external transfer</b> into the pool ledger.
                This will move one event from <b>pending</b> to <b>confirmed</b>.
                <div style={{ marginTop: 8 }}>
                  This is pilot-safe (non-custodial). Confirmation becomes part of the audit trail.
                </div>
              </div>
            )}

            {confirmKind === "withdraw_request" && (
              <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88", lineHeight: 1.5 }}>
                You are about to request a <b>withdrawal</b>.
                In pilot mode, this does <b>not</b> move money automatically.
                It creates a <b>pending</b> withdrawal that an admin confirms after external processing.
                <div style={{ marginTop: 8 }}>
                  Trust impact is recorded in the audit trail when confirmations occur.
                  <a href="/trust" style={{ marginLeft: 8, fontWeight: 1000, color: "#0B1F33", textDecoration: "none" }}>
                    Why did my trust change? →
                  </a>
                </div>
              </div>
            )}

            <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.12)",
                  background: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
                onClick={() => setConfirmOpen(false)}
              >
                Cancel
              </button>

              <button
                style={{
                  padding: "10px 12px",
                  borderRadius: 14,
                  border: "1px solid rgba(11,31,51,0.75)",
                  background: "#0B1F33",
                  color: "#fff",
                  fontWeight: 1000,
                  cursor: "pointer",
                }}
                onClick={async () => {
                  setConfirmOpen(false);
                  if (confirmKind === "admin_confirm_pool" && confirmTargetId != null) {
                    await runAdminConfirm(confirmTargetId);
                  }
                  if (confirmKind === "withdraw_request") {
                    await runWithdrawRequest();
                  }
                }}
              >
                Confirm →
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ===== GMFN BLOCK END: POOL_CONFIRM_MODAL_V2 ===== */}
      {/* TRUST SNAPSHOT */}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Trust Snapshot</div>
            <span style={pill("blue")}>Rule-based</span>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
            <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>{trustScore}</div>
            <div style={{ ...pill("gray") }}>Band {trustBand}</div>
          </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
            Trust increases only when repayment is fully confirmed.
          </div>

          {lastWhy && (
            <div style={{ marginTop: 10, fontSize: 12, color: "#334155" }}>
              Last change: <b>{safeStr(lastWhy?.event_type || "—")}</b>{" "}
              {safeStr(lastWhy?.reason || "") ? <span>· reason: <b>{safeStr(lastWhy.reason)}</b></span> : null}
            </div>
          )}

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/trust" style={{ ...pill("gold"), textDecoration: "none" }}>
              Open Trust page →
            </Link>
            <Link to="/trust-slip" style={{ ...pill("gold"), textDecoration: "none" }}>
              Open TrustSlip →
            </Link>
          </div>
        </div>

        {/* POOL LEDGER */}
        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Clan Pool (Non-custodial)</div>
            <span style={pill("gold")}>Pilot ledger</span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Available</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>{fmtMoney(pool?.available_balance)}</div>
            </div>
              <div style={{ marginTop: 4, fontSize: 12, color: "#64748b" }}>
                 Reserved: {fmtMoney(pool?.reserved_pool ?? "0")}
            </div>

              <div style={{ marginTop: 2, fontSize: 12, fontWeight: 900 }}>
                 Effective (usable): {fmtMoney(pool?.effective_available ?? "0")}
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Pending deposits</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>{fmtMoney(pool?.pending_deposits)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Pending withdrawals</div>
              <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>{fmtMoney(pool?.pending_withdrawals)}</div>
            </div>
            </div>

          <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88" }}>
            Transfer reference: <b style={{ color: "#0B1F33" }}>{reference}</b>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>I deposited</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={depositAmt}
                  onChange={(e) => setDepositAmt(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                />
                <button
                  onClick={doDepositRequest}
                  disabled={poolBusy}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(198,161,74,0.60)",
                    background: "rgba(198,161,74,0.12)",
                    fontWeight: 1000,
                    cursor: poolBusy ? "not-allowed" : "pointer",
                  }}
                >
                  Record
                </button>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Withdraw</div>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                <input
                  value={withdrawAmt}
                  onChange={(e) => setWithdrawAmt(e.target.value)}
                  style={{ flex: 1, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
                />
                <button
                  onClick={doWithdrawRequest}
                  disabled={poolBusy}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 14,
                    border: "1px solid rgba(11,31,51,0.14)",
                    background: "#fff",
                    fontWeight: 1000,
                    cursor: poolBusy ? "not-allowed" : "pointer",
                  }}
                >
                  Request
                </button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Note (optional)</div>
            <input
              value={poolNote}
              onChange={(e) => setPoolNote(e.target.value)}
              style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 14, border: "1px solid rgba(11,31,51,0.18)" }}
            />
          </div>

          <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
            Pool is non-custodial in pilot. Admin confirms external transfers. All actions are auditable.
          </div>

          {/* Recent events */}
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 1000 }}>Recent pool events</div>
            <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
              {Array.isArray(pool?.recent_events) && pool.recent_events.length > 0 ? (
                pool.recent_events.slice(-6).reverse().map((e: any) => (
                  <div key={String(e?.id)} style={{ fontSize: 12, color: "#334155" }}>
                    <b>{safeStr(e?.event_type)}</b> · {fmtMoney(e?.amount)} {safeStr(e?.currency || "NGN")}{" "}
                    {safeStr(e?.confirmed_at) ? <span style={{ color: "#065f46", fontWeight: 900 }}>· confirmed</span> : <span style={{ color: "#92400e", fontWeight: 900 }}>· pending</span>}
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: "#6B7A88" }}>No pool activity yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ADMIN: pending pool confirmations */}
      {role === "admin" && (
        <div style={{ marginTop: 12, ...card() }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Admin Pool Queue</div>
              <div style={{ fontSize: 12, color: "#6B7A88" }}>Confirm external deposits/withdrawals (pilot).</div>
            </div>
            <span style={pill(pending?.items?.length ? "gold" : "gray")}>{Number(pending?.items?.length || 0)} pending</span>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {Array.isArray(pending?.items) && pending.items.length > 0 ? (
              pending.items.slice(0, 10).map((e: any) => (
                <div key={String(e?.id)} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", borderTop: "1px solid rgba(11,31,51,0.08)", paddingTop: 8 }}>
                  <div style={{ fontSize: 12, color: "#334155" }}>
                    <b>#{e.id}</b> · {safeStr(e.event_type)} · user {safeStr(e.user_id)} · {fmtMoney(e.amount)} {safeStr(e.currency)}
                  </div>
                  <button
                    onClick={() => openAdminConfirm(Number(e.id))}
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
              <div style={{ fontSize: 12, color: "#6B7A88" }}>No pending pool items.</div>
            )}
          </div>

          <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/admin/trust-events" style={{ ...pill("blue"), textDecoration: "none" }}>
              Open Audit Log →
            </Link>
            <Link to="/exposure" style={{ ...pill("blue"), textDecoration: "none" }}>
              Open Safety & Risk →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}