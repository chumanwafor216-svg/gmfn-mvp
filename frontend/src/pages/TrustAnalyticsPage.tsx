import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

import { getSelectedClanId, getTrustEvents } from "../lib/api";

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

  if (e.meta && typeof e.meta === "string") {
    try {
      return JSON.parse(e.meta);
    } catch {
      return { raw: String(e.meta) };
    }
  }

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

function card(): React.CSSProperties {
  return {
    borderRadius: 20,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 16,
    background: "#FFFFFF",
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function inputStyle(width = 160): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid rgba(11,31,51,0.14)",
    width,
    boxSizing: "border-box",
    background: "#FFFFFF",
  };
}

function buttonStyle(primary = false): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.14)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
  };
}

export default function TrustAnalyticsPage() {
  const loc = useLocation();
  const nav = useNavigate();

  const qs = useMemo(() => new URLSearchParams(loc.search), [loc.search]);

  const selectedClanId = n(getSelectedClanId());
  const clanId = n(qs.get("clan_id")) || selectedClanId || 0;
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

    if (userId) {
      list = list.filter(
        (e) => n(e.actor_user_id) === userId || n(e.subject_user_id) === userId
      );
    }

    if (auditOn) {
      list = list.filter((e) => {
        const t = String(e.event_type ?? "").toUpperCase();
        return t.includes("AUDIT") || t.startsWith("ADMIN_") || t.startsWith("BULK_");
      });
    }

    list.sort((a, b) =>
      String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))
    );

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
      const res = await getTrustEvents({
        clan_id: clanId || undefined,
        user_id: userId ?? undefined,
        loan_id: loanId ?? undefined,
        limit: 200,
      });

      const list = safeEvents(res);
      setEvents(list);
      setMsg(`Loaded ${list.length} event(s).`);
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
      `audit_event=${auditCounts.latest.event_type ?? "—"}`,
      `created_at=${auditCounts.latest.created_at ?? "—"}`,
      `attempted=${meta.attempted ?? meta.total ?? "—"}`,
      `ok=${meta.ok ?? meta.success ?? "—"}`,
      `failed=${meta.failed ?? meta.errors ?? "—"}`,
      `loan_id=${auditCounts.latest.loan_id ?? "—"}`,
      `actor_user_id=${auditCounts.latest.actor_user_id ?? "—"}`,
      `subject_user_id=${auditCounts.latest.subject_user_id ?? "—"}`,
    ].join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Audit summary copied");
  }

  function setQuery(next: Record<string, string | null>) {
    const p = new URLSearchParams(loc.search);

    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, v);
    }

    nav(`/app/trust-analytics?${p.toString()}`);
  }

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search]);

  useEffect(() => {
    if (!auditOn) return;
    if (filtered.length === 0) return;

    const timer = window.setTimeout(() => {
      latestAuditRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [auditOn, filtered.length]);

  return (
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <div style={{ fontSize: 30, fontWeight: 1000, color: "#0B1F33" }}>
            Trust Event Analytics
          </div>
          <div style={{ color: "#6B7A88", marginTop: 8, lineHeight: 1.7 }}>
            Filter trust events by community, user, loan, and audit mode to explain why a decision happened.
          </div>
        </div>

        <Link to="/app/dashboard" style={{ color: "#0B63D1", fontWeight: 900, textDecoration: "none" }}>
          Back to Dashboard
        </Link>
      </div>

      {auditOn && auditCounts?.latest ? (
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 10,
            background: "#FFF7ED",
            border: "1px solid #FED7AA",
            padding: 12,
            borderRadius: 14,
            marginTop: 14,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 12,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <div style={{ color: "#9A3412", fontWeight: 900 }}>
              Audit mode · latest: {auditCounts.latest.event_type}
            </div>
            <button type="button" onClick={copyAuditSummary} style={buttonStyle(false)}>
              Copy audit summary
            </button>
          </div>

          <div style={{ fontSize: 12, marginTop: 8, color: "#7C2D12" }}>
            attempted: <b>{auditCounts.attempted ?? "—"}</b> · ok: <b>{auditCounts.ok ?? "—"}</b> · failed: <b>{auditCounts.failed ?? "—"}</b>
          </div>
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            background: "#ECFDF5",
            border: "1px solid #A7F3D0",
            color: "#065F46",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          {msg}
        </div>
      ) : null}

      {err ? (
        <div
          style={{
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            color: "#991B1B",
            padding: 12,
            borderRadius: 12,
            marginBottom: 10,
          }}
        >
          {err}
        </div>
      ) : null}

      <div style={{ ...card(), marginBottom: 12 }}>
        <div style={sectionLabel()}>FILTERS</div>

        <div
          style={{
            marginTop: 12,
            display: "flex",
            gap: 12,
            flexWrap: "wrap",
            alignItems: "end",
          }}
        >
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Clan ID</div>
            <input
              type="number"
              value={clanId || ""}
              onChange={(e) =>
                setQuery({
                  clan_id: e.target.value || null,
                })
              }
              style={inputStyle(140)}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>
              User ID (actor or subject)
            </div>
            <input
              type="number"
              value={userId ?? ""}
              onChange={(e) =>
                setQuery({
                  user_id: e.target.value || null,
                })
              }
              style={inputStyle(180)}
            />
          </div>

          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 12, color: "#6B7280" }}>Loan ID</div>
            <input
              type="number"
              value={loanId ?? ""}
              onChange={(e) =>
                setQuery({
                  loan_id: e.target.value || null,
                })
              }
              style={inputStyle(140)}
            />
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 700, color: "#0B1F33" }}>
            <input
              type="checkbox"
              checked={auditOn}
              onChange={(e) => setQuery({ audit: e.target.checked ? "1" : null })}
            />
            Audit filter
          </label>

          <button
            type="button"
            onClick={loadEvents}
            disabled={loading}
            style={buttonStyle(true)}
          >
            {loading ? "Loading..." : "Reload events"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ color: "#6B7280" }}>No events found for this filter.</div>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {filtered.slice(0, 100).map((e, idx) => {
            const meta = parseMeta(e);
            const isFirstAudit = auditOn && idx === 0;

            const loansLink = e.loan_id ? "/app/loans" : null;
            const actorLink = e.actor_user_id
              ? `/app/trust-analytics?clan_id=${clanId || ""}&user_id=${e.actor_user_id}`
              : null;
            const subjectLink = e.subject_user_id
              ? `/app/trust-analytics?clan_id=${clanId || ""}&user_id=${e.subject_user_id}`
              : null;

            return (
              <div
                key={`${e.id ?? idx}-${e.created_at ?? idx}`}
                ref={isFirstAudit ? latestAuditRef : undefined}
                style={card()}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <div style={{ fontWeight: 900, color: "#0B1F33" }}>
                    {e.event_type ?? "event"}
                  </div>
                  <div style={{ fontSize: 12, color: "#6B7280" }}>
                    {e.created_at ? new Date(e.created_at).toLocaleString() : "—"}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 8,
                    display: "flex",
                    gap: 10,
                    flexWrap: "wrap",
                    fontSize: 12,
                  }}
                >
                  {loansLink ? <Link to={loansLink}>Open finances</Link> : null}
                  {actorLink ? <Link to={actorLink}>Jump to actor {e.actor_user_id}</Link> : null}
                  {subjectLink ? (
                    <Link to={subjectLink}>Jump to subject {e.subject_user_id}</Link>
                  ) : null}
                </div>

                <details style={{ marginTop: 10 }} open={isFirstAudit}>
                  <summary style={{ cursor: "pointer", fontWeight: 800 }}>Meta</summary>
                  <pre
                    style={{
                      marginTop: 8,
                      whiteSpace: "pre-wrap",
                      background: "#F8FBFF",
                      border: "1px solid rgba(11,31,51,0.08)",
                      borderRadius: 12,
                      padding: 12,
                      color: "#334155",
                      fontSize: 12,
                    }}
                  >
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