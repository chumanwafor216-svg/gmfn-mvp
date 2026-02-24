// frontend/src/pages/TrustAnalyticsPage.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { getTrustEvents } from "../lib/api";

type TrustEvent = {
  id?: number;
  event_type?: string;
  created_at?: string;
  clan_id?: number;
  loan_id?: number;
  actor_user_id?: number;
  subject_user_id?: number;
  meta_json?: any;
  meta?: any;
};

function safeEvents(res: any): TrustEvent[] {
  if (!res) return [];
  if (Array.isArray(res)) return res as TrustEvent[];
  if (Array.isArray(res.items)) return res.items as TrustEvent[];
  return [];
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

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

export default function TrustAnalyticsPage() {
  const loc = useLocation();
  const nav = useNavigate();

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);
  const clanId = n(qs.get("clan_id"));
  const userId = qs.get("user_id") ? n(qs.get("user_id")) : null;
  const loanId = qs.get("loan_id") ? n(qs.get("loan_id")) : null;
  const auditOn = qs.get("audit") === "1";

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const [events, setEvents] = useState<TrustEvent[]>([]);

  const latestAuditRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    let list = events.slice();

    if (clanId) list = list.filter((e) => n(e.clan_id) === clanId);
    if (loanId) list = list.filter((e) => n(e.loan_id) === loanId);
    if (userId) list = list.filter((e) => n(e.actor_user_id) === userId || n(e.subject_user_id) === userId);

    if (auditOn) {
      // audit events convention: starts with ADMIN_ or BULK_ or contains AUDIT
      list = list.filter((e) => {
        const t = String(e.event_type ?? "").toUpperCase();
        return t.includes("AUDIT") || t.startsWith("ADMIN_") || t.startsWith("BULK_");
      });
    }

    // newest first
    list.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    return list;
  }, [events, clanId, loanId, userId, auditOn]);

  const auditCounts = useMemo(() => {
    if (!auditOn) return null;
    const latest = filtered[0];
    const meta = latest ? parseMeta(latest) : null;
    const attempted = meta?.attempted ?? meta?.total ?? null;
    const ok = meta?.ok ?? meta?.success ?? null;
    const failed = meta?.failed ?? meta?.errors ?? null;
    return { attempted, ok, failed, latest };
  }, [filtered, auditOn]);

  async function loadEvents() {
    setLoading(true);
    setErr(null);
    setMsg(null);

    try {
      // Try /trust/timeline first (if exists)
      let res: any;
      try {
        res = await getTrustEvents({
          clan_id: clanId || undefined,
  
          loan_id: loanId ?? undefined,
          limit: 200,
        });
      } catch {
        res = await getTrustEvents();
      }

      const list = safeEvents(res);
      setEvents(list);
      setMsg(`Loaded ${list.length} event(s) ✅`);
    } catch (e: any) {
      setErr(e?.message || String(e));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  function copyAuditSummary() {
    if (!auditCounts?.latest) return;
    const meta = parseMeta(auditCounts.latest) || {};
    const text = [
      `audit_event=${auditCounts.latest.event_type}`,
      `created_at=${auditCounts.latest.created_at}`,
      `attempted=${meta.attempted ?? meta.total ?? "—"}`,
      `ok=${meta.ok ?? meta.success ?? "—"}`,
      `failed=${meta.failed ?? meta.errors ?? "—"}`,
      `loan_id=${auditCounts.latest.loan_id ?? "—"}`,
      `actor_user_id=${auditCounts.latest.actor_user_id ?? "—"}`,
    ].join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Audit summary copied ✅");
  }

  function setQuery(next: Record<string, string | null>) {
    const p = new URLSearchParams(loc.search);
    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, v);
    }
    nav(`/trust-analytics?${p.toString()}`);
  }

  useEffect(() => {
    loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search]);

  // auto-jump to latest audit event and expand meta visually
  useEffect(() => {
    if (!auditOn) return;
    if (filtered.length === 0) return;
    setTimeout(() => {
      latestAuditRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 250);
  }, [auditOn, filtered.length]);

  return (
    <div style={{ padding: 20, maxWidth: 1100 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>Trust Analytics</h2>
        <Link to="/">← Back to Dashboard</Link>
      </div>

      <div style={{ color: "#6b7280", marginTop: 8, marginBottom: 12 }}>
        Filter by clan, user, loan, and audit view. Useful for explaining “why” a decision happened.
      </div>

      {auditOn && auditCounts?.latest && (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#fff7ed",
            border: "1px solid #fed7aa",
            padding: 10,
            borderRadius: 10,
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <b>Audit mode</b> · latest: <b>{auditCounts.latest.event_type}</b>
            </div>
            <button onClick={copyAuditSummary}>Copy audit summary</button>
          </div>

          <div style={{ fontSize: 12, marginTop: 6, color: "#6b7280" }}>
            attempted: <b>{auditCounts.attempted ?? "—"}</b> · ok: <b>{auditCounts.ok ?? "—"}</b> · failed:{" "}
            <b>{auditCounts.failed ?? "—"}</b>
          </div>
        </div>
      )}

      {msg && <div style={{ background: "#d1fae5", padding: 10, borderRadius: 8, marginBottom: 10 }}>{msg}</div>}
      {err && <div style={{ background: "#fee2e2", padding: 10, borderRadius: 8, marginBottom: 10 }}>{err}</div>}

      <div style={{ border: "1px solid #eee", padding: 12, borderRadius: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "end" }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Clan ID</div>
            <input
              type="number"
              value={clanId || ""}
              onChange={(e) => setQuery({ clan_id: e.target.value || null })}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>User ID (actor or subject)</div>
            <input
              type="number"
              value={userId ?? ""}
              onChange={(e) => setQuery({ user_id: e.target.value || null })}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 180 }}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6b7280" }}>Loan ID</div>
            <input
              type="number"
              value={loanId ?? ""}
              onChange={(e) => setQuery({ loan_id: e.target.value || null })}
              style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", width: 140 }}
            />
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={auditOn}
              onChange={(e) => setQuery({ audit: e.target.checked ? "1" : null })}
            />
            Audit filter
          </label>

          <button onClick={loadEvents} disabled={loading}>
            {loading ? "Loading..." : "Reload events"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "#6b7280" }}>No events found for this filter.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.slice(0, 100).map((e, idx) => {
            const meta = parseMeta(e);
            const isFirstAudit = auditOn && idx === 0;

            const loanLink = e.loan_id ? `/loans/${e.loan_id}/summary` : null;
            const actorLink = e.actor_user_id ? `/trust-analytics?clan_id=${clanId || ""}&user_id=${e.actor_user_id}` : null;
            const subjectLink = e.subject_user_id
              ? `/trust-analytics?clan_id=${clanId || ""}&user_id=${e.subject_user_id}`
              : null;

            return (
              <div
                key={`${e.id ?? idx}-${e.created_at ?? idx}`}
                ref={isFirstAudit ? latestAuditRef : undefined}
                style={{ border: "1px solid #eee", borderRadius: 12, padding: 12 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ fontWeight: 700 }}>{e.event_type ?? "event"}</div>
                  <div style={{ fontSize: 12, color: "#6b7280" }}>
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </div>
                </div>

                <div style={{ marginTop: 8, display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                  {loanLink && (
                    <Link to={loanLink}>Jump to loan #{e.loan_id}</Link>
                  )}
                  {actorLink && (
                    <Link to={actorLink}>Jump to actor {e.actor_user_id}</Link>
                  )}
                  {subjectLink && (
                    <Link to={subjectLink}>Jump to subject {e.subject_user_id}</Link>
                  )}
                </div>

                <details style={{ marginTop: 10 }} open={isFirstAudit}>
                  <summary style={{ cursor: "pointer" }}>Meta</summary>
                  <pre style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>
                    {meta ? JSON.stringify(meta, null, 2) : "—"}
                  </pre>
                </details>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 
