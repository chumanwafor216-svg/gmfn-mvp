// frontend/src/pages/ExposureAdminPage.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  getMe,
  getExposureAdmin,
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
  clans_count?: number;
};

type TrustEvent = {
  id?: number;
  event_type?: string;
  created_at?: string;
  loan_id?: number;
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

function safeStr(x: any): string {
  return (x ?? "").toString();
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

function card(): React.CSSProperties {
  return {
    border: "1px solid rgba(11,31,51,0.10)",
    borderRadius: 18,
    padding: 14,
    background: "rgba(255,255,255,0.94)",
    boxShadow: "0 18px 60px rgba(2,6,23,0.06)",
  };
}

function btn(primary?: boolean, disabled?: boolean): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 14,
    border: primary ? "1px solid rgba(11,31,51,0.75)" : "1px solid rgba(11,31,51,0.12)",
    background: primary ? "#0B1F33" : "#fff",
    color: primary ? "#fff" : "#0B1F33",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.7 : 1,
  };
}

function pill(kind: "green" | "red" | "gray" | "gold" | "blue"): React.CSSProperties {
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

export default function ExposureAdminPage() {
  const nav = useNavigate();

  const [me, setMe] = useState<MeLite | null>(null);

  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [expiredEvents, setExpiredEvents] = useState<TrustEvent[]>([]);

  const [cciByUserId, setCciByUserId] = useState<Record<number, number>>({});
  const [cciLoading, setCciLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const clanId = useMemo(() => {
    // IMPORTANT: in this build, selected clan is stored by API client as gmfn_selected_clan_id.
    // But older screens used selected_clan_id. We support both.
    const a = localStorage.getItem("gmfn_selected_clan_id");
    const b = localStorage.getItem("selected_clan_id");
    const raw = (a || b || "").trim();
    const v = Number(raw || "0");
    return Number.isFinite(v) && v > 0 ? v : 0;
  }, []);

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
      const res = await getExposureAdmin();
      const r = safeRows(res);
      setRows(r);
      setMsg(`Loaded ${r.length} member(s).`);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  async function loadExpiredGuarantorsUI() {
    try {
      const res: any = await getTrustEvents(120);
      const events = safeEvents(res)
        .filter((e) => safeStr(e.event_type).toUpperCase() === "GUARANTOR_EXPIRED")
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

        const res: any = await getCciScore(clanId, userId);
        next[userId] = n(res?.score);
      }

      setCciByUserId(next);
      setMsg("CCI loaded.");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setCciLoading(false);
    }
  }

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

  if (!isAdmin) {
    return (
      <div style={{ padding: 18, maxWidth: 1100 }}>
        <div style={card()}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Admin only</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "#6B7A88" }}>
            This screen is for admin risk checks.
          </div>
          <div style={{ marginTop: 10 }}>
            <Link to="/dashboard" style={{ textDecoration: "none", ...btn(false, false) as any }}>
              Back to Home →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 18, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 1000, color: "#0B1F33" }}>Exposure & Risk</div>
          <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
            Who is exposed right now (locked guarantees). Use this to prevent silent risk.
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button style={btn(false, loading)} onClick={loadExposureUI} disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </button>
          <button style={btn(false, cciLoading || rows.length === 0)} onClick={loadCciScoresUI} disabled={cciLoading || rows.length === 0}>
            {cciLoading ? "Loading CCI..." : "Load CCI"}
          </button>
          <button style={btn(false, false)} onClick={() => nav("/clans")}>
            Change clan →
          </button>
        </div>
      </div>

      {msg && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(6,95,70,0.18)", background: "rgba(236,253,245,0.95)", color: "#065f46", fontWeight: 900 }}>
          {msg}
        </div>
      )}

      {err && (
        <div style={{ ...card(), marginTop: 12, borderColor: "rgba(153,27,27,0.25)", background: "rgba(254,242,242,0.9)", color: "#991b1b", fontWeight: 900 }}>
          {err}
        </div>
      )}

      {/* Totals */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Totals (clan #{clanId || "—"})</div>
          <span style={pill("gray")}>Pilot</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Pool</div>
            <div style={{ fontWeight: 1000 }}>{formatMoney(totals.pool, "NGN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Exposure</div>
            <div style={{ fontWeight: 1000 }}>{formatMoney(totals.exposure, "NGN")}</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: "#6B7A88", fontWeight: 900 }}>Available</div>
            <div style={{ fontWeight: 1000 }}>{formatMoney(totals.available, "NGN")}</div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6B7A88", lineHeight: 1.4 }}>
          Exposure = locked amount not yet released. If exposure is high, do not approve more guarantees.
        </div>
      </div>

      {/* Member risk list (mobile friendly) */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Members</div>
          <span style={pill(rows.length ? "blue" : "gray")}>{rows.length} member(s)</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {rows.map((r) => {
            const uid = Number(r.user_id);
            const cci = cciByUserId[uid];
            const exp = n(r.exposure);
            const kind = exp > 0 ? "gold" : "gray";

            return (
              <div key={uid} style={{ border: "1px solid rgba(11,31,51,0.10)", borderRadius: 16, padding: 12, background: "#fff" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{r.email ?? `User #${uid}`}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: "#6B7A88" }}>
                      Role: <b style={{ color: "#0B1F33" }}>{safeStr(r.role || "user")}</b>
                      {Number.isFinite(n(r.clans_count)) ? <span> · clans: <b>{n(r.clans_count)}</b></span> : null}
                    </div>
                  </div>
                  <span style={pill(kind as any)}>exposure: {formatMoney(exp, "NGN")}</span>
                </div>

                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, fontSize: 12 }}>
                  <div>
                    <div style={{ color: "#6B7A88", fontWeight: 900 }}>Pool</div>
                    <div style={{ fontWeight: 1000 }}>{formatMoney(n(r.personal_pool_balance), "NGN")}</div>
                  </div>
                  <div>
                    <div style={{ color: "#6B7A88", fontWeight: 900 }}>Available</div>
                    <div style={{ fontWeight: 1000 }}>{formatMoney(n(r.available), "NGN")}</div>
                  </div>
                  <div>
                    <div style={{ color: "#6B7A88", fontWeight: 900 }}>CCI</div>
                    <div style={{ fontWeight: 1000 }}>{Number.isFinite(cci) ? cci : "—"}</div>
                  </div>
                </div>
              </div>
            );
          })}

          {rows.length === 0 && <div style={{ fontSize: 12, color: "#6B7A88" }}>No members loaded.</div>}
        </div>
      </div>

      {/* Recently expired (pilot) */}
      <div style={{ ...card(), marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ fontWeight: 1000, color: "#0B1F33" }}>Recently expired</div>
          <button style={btn(false, false)} onClick={loadExpiredGuarantorsUI}>
            Refresh
          </button>
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {expiredEvents.length === 0 && <div style={{ fontSize: 12, color: "#6B7A88" }}>No expired items.</div>}

          {expiredEvents.map((e, i) => {
            const meta = parseMeta(e) || {};
            return (
              <div key={i} style={{ fontSize: 12, color: "#334155", borderTop: "1px solid rgba(11,31,51,0.08)", paddingTop: 8 }}>
                <b>{safeStr(e.event_type)}</b>
                {e.loan_id ? (
                  <span>
                    {" "}
                    · loan #{e.loan_id} · <Link to={`/loans?loan=${encodeURIComponent(String(e.loan_id))}`}>open</Link>
                  </span>
                ) : null}
                <div style={{ marginTop: 4, color: "#6B7A88" }}>
                  {safeStr(meta.reason || "—")} · {timeAgo(e.created_at)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 12, color: "#6B7A88" }}>
        Admin note: keep exposure low. Do not approve guarantees blindly.
      </div>
    </div>
  );
}