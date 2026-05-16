import { useEffect, useMemo, useState } from "react";

import {
  getMe,
  getExposureAdmin,
  runOverdueDetector,
  getTrustEvents,
  getCciScore,
} from "../lib/api";

import { SecondaryButton, StableCtaLink } from "../components/StableButton";
import { formatMoney } from "../lib/money";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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

type TrustEventRow = {
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

function safeEvents(res: any): TrustEventRow[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as TrustEventRow[];
  if (Array.isArray(res.items)) return res.items as TrustEventRow[];
  return [];
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function isoNow(): string {
  return new Date().toISOString();
}

function parseMeta(e: TrustEventRow): any {
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

function toolButtonStyle(disabled = false): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #ddd",
    background: "white",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };
}

function routeLinkStyle(): React.CSSProperties {
  return {
    marginLeft: 6,
    display: "inline-flex",
    alignItems: "center",
    minHeight: 40,
  };
}

function inlineLinkStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 24,
    padding: 0,
    border: "none",
    borderRadius: 0,
    background: "transparent",
    boxShadow: "none",
    color: "#2563EB",
    fontSize: "inherit",
    fontWeight: 700,
    textDecoration: "underline",
    textUnderlineOffset: 2,
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function ExposurePage() {
  const [me, setMe] = useState<MeLite | null>(null);

  const [clanId, setClanId] = useState<number>(
    Number(localStorage.getItem("gmfn_selected_clan_id") || localStorage.getItem("selected_clan_id") || "1")
  );
  const [graceDays, setGraceDays] = useState<number>(3);

  const [rows, setRows] = useState<ExposureRow[]>([]);
  const [defaultedEvents, setDefaultedEvents] = useState<TrustEventRow[]>([]);

  const [cciByUserId, setCciByUserId] = useState<Record<number, number>>({});
  const [cciLoading, setCciLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [lastRunAt, setLastRunAt] = useState<string | null>(null);
  const [lastScanned, setLastScanned] = useState<number | null>(null);
  const [lastMatched, setLastMatched] = useState<number | null>(null);
  const [lastDefaulted, setLastDefaulted] = useState<number | null>(null);

  const isAdmin = (me?.role || "").toLowerCase() === "admin";
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", clanId, "exposure.route.dashboard"),
      trustAnalytics: routeTarget("trustAnalytics", clanId, "exposure.route.trust-analytics"),
    }),
    [clanId]
  );

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
    const separator = routes.trustAnalytics.includes("?") ? "&" : "?";
    return `${routes.trustAnalytics}${separator}user_id=${encodeURIComponent(String(userId))}`;
  }

  function loanTimelineLink(loanId?: number) {
    if (!loanId) return "#";
    return `/loans?loan=${loanId}`;
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

  async function loadDefaultedLoansUI() {
    try {
      const res = await getTrustEvents({ limit: 120 });
      const events = safeEvents(res)
        .filter((e) => String(e.event_type || "").toLowerCase() === "loan_defaulted")
        .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")))
        .slice(0, 10);

      setDefaultedEvents(events);
    } catch {
      setDefaultedEvents([]);
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
      setMsg("Consistency scores loaded.");
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setCciLoading(false);
    }
  }

  async function runOverdueNowUI() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      const res: any = await runOverdueDetector({
        dry_run: false,
        grace_days: graceDays,
        limit: 200,
      });

      setLastRunAt(isoNow());
      setLastScanned(n(res?.scanned));
      setLastMatched(n(res?.matched));
      setLastDefaulted(n(res?.defaulted));

      setMsg(
        `Overdue scan complete ✅ scanned=${n(res?.scanned)}, matched=${n(res?.matched)}, defaulted=${n(res?.defaulted)}`
      );

      await loadExposureUI();
      await loadDefaultedLoansUI();
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setLoading(false);
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
    loadDefaultedLoansUI();
  }, []);

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <h2 style={{ marginTop: 0 }}>Exposure (Admin)</h2>

      <div style={{ color: "#6b7280", marginBottom: 12 }}>
        Exposure = sum(locked − released) for approved guarantees in this clan. You can also run overdue detection from here.
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

      <div
        style={{
          border: "1px solid #eee",
          padding: 12,
          background: "#fafafa",
          marginBottom: 12,
          borderRadius: 10,
        }}
      >
        <div style={{ fontWeight: 700 }}>Overdue detector status</div>
        <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Last run: <b>{lastRunAt ? new Date(lastRunAt).toLocaleString() : "—"}</b> · scanned:{" "}
          <b>{lastScanned ?? "—"}</b> · matched: <b>{lastMatched ?? "—"}</b> · defaulted:{" "}
          <b>{lastDefaulted ?? "—"}</b>
        </div>
      </div>

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
                localStorage.setItem("gmfn_selected_clan_id", String(v));
                localStorage.setItem("selected_clan_id", String(v));
              }}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Grace days</div>
            <input
              type="number"
              value={graceDays}
              onChange={(e) => setGraceDays(Number(e.target.value))}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <SecondaryButton
            onClick={runOverdueNowUI}
            disabled={loading || !isAdmin}
            busy={loading}
            busyLabel="Working..."
            stableHeight={40}
            debugId="exposure.run-overdue"
            style={toolButtonStyle(loading || !isAdmin)}
          >
            Run overdue detector now
          </SecondaryButton>

          <SecondaryButton
            onClick={loadExposureUI}
            disabled={loading || !isAdmin}
            busy={loading}
            stableHeight={40}
            debugId="exposure.refresh"
            style={toolButtonStyle(loading || !isAdmin)}
          >
            Refresh exposure
          </SecondaryButton>

          <SecondaryButton
            onClick={loadCciScoresUI}
            disabled={cciLoading || rows.length === 0}
            busy={cciLoading}
            busyLabel="Loading consistency..."
            stableHeight={40}
            debugId="exposure.load-cci"
            style={toolButtonStyle(cciLoading || rows.length === 0)}
          >
            Load consistency scores
          </SecondaryButton>

          <StableCtaLink
            to={routes.trustAnalytics}
            stableHeight={40}
            debugId="exposure.open-trust-analytics"
            style={routeLinkStyle()}
          >
            Trust Analytics →
          </StableCtaLink>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: "#6b7280" }}>
          Totals: <b>Pool</b> {formatMoney(totals.pool, "NGN")} · <b>Exposure</b>{" "}
          {formatMoney(totals.exposure, "NGN")} · <b>Available</b>{" "}
          {formatMoney(totals.available, "NGN")}
        </div>
      </div>

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
                  Consistency
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

      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <h3 style={{ marginTop: 0 }}>Recently defaulted loans</h3>

        {defaultedEvents.length === 0 ? (
          <div style={{ color: "#6b7280" }}>No defaulted loans yet.</div>
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
                  Borrower
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Actor
                </th>
                <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>
                  Why
                </th>
              </tr>
            </thead>
            <tbody>
              {defaultedEvents.map((e, i) => {
                const meta = parseMeta(e) || {};
                const reason = meta.reason ?? "loan_defaulted";
                const daysPastDue = meta.days_past_due ?? "—";

                const actorId = e.actor_user_id;
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
                      {e.loan_id ? (
                        <StableCtaLink
                          to={loanTimelineLink(e.loan_id)}
                          stableHeight={24}
                          debugId={`exposure.loan.${e.loan_id}.timeline`}
                          style={inlineLinkStyle()}
                        >
                          #{e.loan_id}
                        </StableCtaLink>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {borrowerId ? (
                        <StableCtaLink
                          to={userTimelineLink(borrowerId)}
                          stableHeight={24}
                          debugId={`exposure.user.${borrowerId}.timeline`}
                          style={inlineLinkStyle()}
                        >
                          {displayUserLabel(borrowerId)}
                        </StableCtaLink>
                      ) : (
                        "—"
                      )}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3" }}>
                      {actorId ? displayUserLabel(actorId) : "system"}
                    </td>

                    <td style={{ padding: 8, borderBottom: "1px solid #f3f3f3", fontSize: 12, color: "#6b7280" }}>
                      reason={reason}, days_past_due={daysPastDue}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        <StableCtaLink
          to={routes.dashboard}
          stableHeight={40}
          debugId="exposure.back-dashboard"
          style={routeLinkStyle()}
        >
          ← Back to Dashboard
        </StableCtaLink>
      </div>
    </div>
  );
}
