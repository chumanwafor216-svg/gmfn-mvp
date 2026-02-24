// frontend/src/pages/ExposureAdminPage.tsx
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

export default function ExposureAdminPage() {
  const [me, setMe] = useState<MeLite | null>(null);

  const [clanId, setClanId] = useState<number>(
    Number(localStorage.getItem("selected_clan_id") || "1")
  );
  const [expiryHours, setExpiryHours] = useState<number>(48);

  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [expiredEvents, setExpiredEvents] = useState<TrustEvent[]>([]);

  const [cciByUserId, setCciByUserId] = useState<Record<number, number>>({});
  const [cciLoading, setCciLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [expiryLastRunAt, setExpiryLastRunAt] = useState<string | null>(null);
  const [expiryScanned, setExpiryScanned] = useState<number | null>(null);
  const [expiryExpired, setExpiryExpired] = useState<number | null>(null);

  const isAdmin = (me?.role || "").toLowerCase() === "admin";

  async function loadMeUI() {
    try {
      const m: any = await getMe();
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
      localStorage.setItem("selected_clan_id", String(clanId));
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
      const res: any = await getTrustEvents();
      const events = safeEvents(res)
        .filter((e) => e.event_type === "GUARANTOR_EXPIRED")
        .sort((a, b) =>
          String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
        )
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
      const hours =
        Number.isFinite(expiryHours) && expiryHours > 0
          ? expiryHours
          : 48;

      const res: any = await runGuarantorExpiryNow(clanId, hours);

      setExpiryLastRunAt(isoNow());
      setExpiryScanned(n(res?.scanned) || n(res?.processed));
      setExpiryExpired(n(res?.expired));

      setMsg(
        `Expiry run ✅ expired=${n(res?.expired)}, scanned=${n(
          res?.scanned
        )}`
      );

      await loadExposureUI();
      await loadExpiredGuarantorsUI();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  const totals = useMemo(() => {
    const pool = rows.reduce(
      (acc, r) => acc + n(r.personal_pool_balance),
      0
    );
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

      <div style={{ marginBottom: 12 }}>
        Totals:{" "}
        <b>Pool</b> {formatMoney(totals.pool, "NGN")} ·{" "}
        <b>Exposure</b> {formatMoney(totals.exposure, "NGN")} ·{" "}
        <b>Available</b> {formatMoney(totals.available, "NGN")}
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
          type="number"
          value={clanId}
          onChange={(e) => {
            const v = Number(e.target.value);
            setClanId(v);
            localStorage.setItem("selected_clan_id", String(v));
          }}
          style={{ width: 120, marginRight: 8 }}
        />
        <button onClick={loadExposureUI}>Refresh</button>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Pool</th>
            <th>Exposure</th>
            <th>Available</th>
            <th>CCI</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const uid = Number(r.user_id);
            const cci = cciByUserId[uid];
            return (
              <tr key={i}>
                <td>{r.email ?? `user:${uid}`}</td>
                <td>{r.role ?? "—"}</td>
                <td>{formatMoney(n(r.personal_pool_balance), "NGN")}</td>
                <td>{formatMoney(n(r.exposure), "NGN")}</td>
                <td>{formatMoney(n(r.available), "NGN")}</td>
                <td>{Number.isFinite(cci) ? cci : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div style={{ marginTop: 20 }}>
        <h3>Recently Expired</h3>
        {expiredEvents.map((e, i) => {
          const meta = parseMeta(e) || {};
          return (
            <div key={i} style={{ marginBottom: 6 }}>
              {e.loan_id && (
                <Link to={`/trust-analytics?loan_id=${e.loan_id}`}>
                  Loan #{e.loan_id}
                </Link>
              )}{" "}
              – {meta.reason ?? "—"} – {timeAgo(e.created_at)}
            </div>
          );
        })}
      </div>
    </div>
  );
}