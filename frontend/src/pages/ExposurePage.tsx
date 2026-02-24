// frontend/src/pages/ExposurePage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import {
  getMe,
  getExposureAdmin,
  runGuarantorExpiryNow,
  getTrustEvents,
  getCciScore,
} from "../lib/api";

import { formatMoney } from "../lib/money";

type MeLite = {
  id?: number | string;
  email?: string;
  role?: string;
};

type ExposureRow = {
  user_id: number;
  email?: string;
  role?: string;
  personal_pool_balance?: number;
  exposure?: number;
  available?: number;
};

type TrustEvent = {
  id?: number;
  event_type?: string;
  created_at?: string;
  loan_id?: number;
  actor_user_id?: number;
  subject_user_id?: number;
  meta_json?: any;
  meta?: any;
};

function safeRows(res: any): ExposureRow[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as ExposureRow[];
  if (Array.isArray(res.items)) return res.items as ExposureRow[];
  return [];
}

function safeEvents(res: any): TrustEvent[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as TrustEvent[];
  if (Array.isArray(res.items)) return res.items as TrustEvent[];
  return [];
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function isoNow(): string {
  return new Date().toISOString();
}

function parseMeta(e: TrustEvent): any {
  if (e.meta && typeof e.meta === "object") return e.meta;
  if (!e.meta_json) return null;
  if (typeof e.meta_json === "object") return e.meta_json;
  try {
    return JSON.parse(String(e.meta_json));
  } catch {
    return { raw: String(e.meta_json) };
  }
}

function timeAgo(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  return `${days} day(s) ago`;
}

export default function ExposurePage() {
  const [me, setMe] = useState<MeLite | null>(null);

  const [clanId, setClanId] = useState<number>(Number(localStorage.getItem("selected_clan_id") || "1"));
  const [expiryHours, setExpiryHours] = useState<number>(48);

  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [expiredEvents, setExpiredEvents] = useState<TrustEvent[]>([]);

  // CCI per user_id
  const [cciByUserId, setCciByUserId] = useState<Record<number, number>>({});
  const [cciLoading, setCciLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [expiryLastRunAt, setExpiryLastRunAt] = useState<string | null>(null);
  const [expiryScanned, setExpiryScanned] = useState<number | null>(null);
  const [expiryExpired, setExpiryExpired] = useState<number | null>(null);

  const isAdmin = (me?.role || "").toLowerCase() === "admin";

  // user lookup map: id -> email
  const userEmailById = useMemo(() => {
    const m = new Map<number, string>();
    for (const r of rows) {
      if (r.user_id && r.email) m.set(Number(r.user_id), r.email);
    }
    return m;
  }, [rows]);

  function displayUserLabel(userId?: number) {
    if (!userId) return "—";
    const email = userEmailById.get(Number(userId));
    return email ? `${email} (id:${userId})` : `id:${userId}`;
  }

  function userTimelineLink(userId?: number) {
    if (!userId) return "#";
    return `/trust-analytics?clan_id=${clanId}&user_id=${userId}`;
  }

  function loanTimelineLink(loanId?: number) {
    if (!loanId) return "#";
    return `/trust-analytics?clan_id=${clanId}&loan_id=${loanId}`;
  }

  async function loadMeUI() {
    try {
      const m = await getMe();
      setMe({ id: m.id, email: m.email, role: m.role });
    } catch {
      setMe(null);
    }
  }

  async function loadExposureUI() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await getExposureAdmin();
      const r = safeRows(res);
      setRows(r);
      setMsg(`Loaded ${r.length} row(s) ✅`);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadExpiredGuarantorsUI() {
    try {
      const res = await getTrustEvents();
      const events = safeEvents(res)
        .filter((e) => e.event_type === "GUARANTOR_EXPIRED")
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, 10);

      setExpiredEvents(events);
    } catch {
      setExpiredEvents([]);
    }
  }

  async function loadCciScoresUI() {
    if (rows.length === 0) return;
    setCciLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const next: Record<number, number> = {};
      for (const r of rows) {
        const userId = Number(r.user_id);
        if (!Number.isFinite(userId) || userId <= 0) continue;

        // backend returns {score, events_counted, ...}
        const res: any = await getCciScore(clanId, userId);
        next[userId] = n(res?.score);
      }

      setCciByUserId(next);
      setMsg("CCI scores loaded ✅");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setCciLoading(false);
    }
  }

  async function runExpiryNowUI() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const hours = Number.isFinite(expiryHours) && expiryHours > 0 ? expiryHours : 48;

      const res: any = await runGuarantorExpiryNow(clanId, hours);

      setExpiryLastRunAt(isoNow());
      setExpiryScanned(n(res?.scanned) || n(res?.processed));
      setExpiryExpired(n(res?.expired));

      setMsg(`Expiry run ✅ expired=${n(res?.expired)}, scanned=${n(res?.scanned)}`);

      await loadExposureUI();
      await loadExpiredGuarantorsUI();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  // totals
  const totals = useMemo(() => {
    const pool = rows.reduce((acc, r) => acc + n(r.personal_pool_balance), 0);
    const exposure = rows.reduce((acc, r) => acc + n(r.exposure), 0);
    const available = rows.reduce((acc, r) => acc + n(r.available), 0);
    return { pool, exposure, available };
  }, [rows]);

  useEffect(() => {
    loadMeUI();
    loadExposureUI();
    loadExpiredGuarantorsUI();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <h2 style={{ marginTop: 0 }}>Exposure (Admin)</h2>

      <div style={{ color: "#6b7280", marginBottom: 12 }}>
        Exposure = sum(locked − released) for approved guarantees in this clan. You can also run
        guarantor expiry from here.
      </div>

      {msg && (
        <div style={{ background: "#d1fae5", padding: 10, marginBottom: 10, borderRadius: 8 }}>
          {msg}
        </div>
      )}
      {err && (
        <div style={{ background: "#fee2e2", padding: 10, marginBottom: 10, borderRadius: 8 }}>
          {err}
        </div>
      )}

      {/* Auto-expiry status */}
      <div
        style={{
          border: "1px solid #eee",
          padding: 12,
          background: "#fafafa",
          marginBottom: 12,
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 700 }}>Auto-expiry status</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Last run:{" "}
          <b>{expiryLastRunAt ? new Date(expiryLastRunAt).toLocaleString() : "—"}</b> · scanned:{" "}
          <b>{expiryScanned ?? "—"}</b> · expired: <b>{expiryExpired ?? "—"}</b>
        </div>
      </div>

      {/* Admin tools */}
      <div style={{ border: "1px solid #eee", padding: 12, marginBottom: 12, borderRadius: 10 }}>
        <h3 style={{ marginTop: 0 }}>Admin tools</h3>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Clan ID</div>
            <input
              type="number"
              value={clanId}
              onChange={(e) => {
              const v = Number(e.target.value);
              setClanId(v);
              localStorage.setItem("selected_clan_id", String(v));
            }}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Expiry hours</div>
            <input
              type="number"
              value={expiryHours}
              onChange={(e) => setExpiryHours(Number(e.target.value))}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <button
            onClick={runExpiryNowUI}
            disabled={loading || !isAdmin}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: loading || !isAdmin ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Working..." : "Run guarantor expiry now"}
          </button>

          <button
            onClick={loadExposureUI}
            disabled={loading || !isAdmin}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: loading || !isAdmin ? "not-allowed" : "pointer",
            }}
          >
            Refresh exposure
          </button>

          <button
            onClick={loadCciScoresUI}
            disabled={cciLoading || rows.length === 0}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid #ddd",
              background: "white",
              cursor: cciLoading || rows.length === 0 ? "not-allowed" : "pointer",
              opacity: cciLoading || rows.length === 0 ? 0.6 : 1,
            }}
          >
            {cciLoading ? "Loading CCI..." : "Load CCI scores"}
          </button>

          <Link to="/trust-analytics" style={{ marginLeft: 6 }}>
            Trust Analytics →
          </Link>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          Totals:{" "}
          <b>Pool</b> {formatMoney(totals.pool, "NGN")} · <b>Exposure</b>{" "}
          {formatMoney(totals.exposure, "NGN")} · <b>Available</b>{" "}
          {formatMoney(totals.available, "NGN")}
        </div>
      </div>

      {/* Exposure table */}
      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Exposure by user</h3>

        {rows.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No rows yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  User
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Role
                </th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                  Pool
                </th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                  Exposure
                </th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                  Available
                </th>
                <th style={{ textAlign: "right", padding: 8, borderBottom: "1px solid #eee" }}>
                  CCI
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const uid = Number(r.user_id);
                const cci = cciByUserId[uid];
                return (
                  <tr key={idx}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      <div style={{ fontWeight: 600 }}>{r.email ?? `user:${uid}`}</div>
                      <div style={{ fontSize: 12, color: "#6b7280" }}>id: {uid}</div>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {r.role ?? "—"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {formatMoney(n(r.personal_pool_balance), "NGN")}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {formatMoney(n(r.exposure), "NGN")}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {formatMoney(n(r.available), "NGN")}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", textAlign: "right" }}>
                      {Number.isFinite(cci) ? <b>{cci}</b> : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Recently expired */}
      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Recently expired guarantors</h3>

        {expiredEvents.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No expired guarantors yet.</div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  When
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Age
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Loan
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Guarantor
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Borrower
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {expiredEvents.map((e, i) => {
                const meta = parseMeta(e) || {};
                const reason = meta.reason ?? (meta.system ? "system_timeout" : "manual");
                const expiryH = meta.expiry_hours ?? "—";

                const guarantorId = e.actor_user_id;
                const borrowerId = e.subject_user_id;

                return (
                  <tr key={i}>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {timeAgo(e.created_at)}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {e.loan_id ? <Link to={loanTimelineLink(e.loan_id)}>#{e.loan_id}</Link> : "—"}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {guarantorId ? (
                        <Link to={userTimelineLink(guarantorId)}>
                          {displayUserLabel(guarantorId)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {borrowerId ? (
                        <Link to={userTimelineLink(borrowerId)}>
                          {displayUserLabel(borrowerId)}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", fontSize: 12, color: "#6b7280" }}>
                      reason={reason}, expiry_hours={expiryH}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <Link to="/">← Back to Dashboard</Link>
      </div>
    </div>
  );
} 
