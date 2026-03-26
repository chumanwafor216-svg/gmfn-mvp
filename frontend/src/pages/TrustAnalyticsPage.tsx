import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

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

function parseMeta(event: TrustEvent): any {
  if (event.meta && typeof event.meta === "object") return event.meta;

  if (event.meta && typeof event.meta === "string") {
    try {
      return JSON.parse(event.meta);
    } catch {
      return { raw: String(event.meta) };
    }
  }

  if (!event.meta_json) return null;
  if (typeof event.meta_json === "object") return event.meta_json;

  try {
    return JSON.parse(String(event.meta_json));
  } catch {
    return { raw: String(event.meta_json) };
  }
}

function n(x: any): number {
  const v = Number(x);
  return Number.isFinite(v) ? v : 0;
}

function safeStr(x: any, fallback = ""): string {
  const s = String(x ?? "").trim();
  return s || fallback;
}

function safeDate(x: any): Date | null {
  const raw = String(x || "").trim();
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

function safeDateTime(x: any): string {
  const d = safeDate(x);
  if (!d) return safeStr(x, "—");
  return d.toLocaleString();
}

function prettyValue(v: any): string {
  if (v == null) return "—";
  if (typeof v === "string") return v;
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 18,
    background: bg,
    boxShadow: "0 12px 30px rgba(15,23,42,0.05)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    padding: 14,
    background: bg,
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
    outline: "none",
  };
}

function buttonStyle(primary = false, disabled = false): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 10,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.14)",
    background: disabled ? "#CBD5E1" : primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 900,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.72 : 1,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#64748B",
    fontWeight: 1000,
    letterSpacing: 0.2,
    textTransform: "uppercase",
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

  function buildRoute(next: {
    clan_id?: number | null;
    user_id?: number | null;
    loan_id?: number | null;
    audit?: boolean | null;
  }) {
    const p = new URLSearchParams();

    if ((next.clan_id ?? 0) > 0) p.set("clan_id", String(next.clan_id));
    if ((next.user_id ?? 0) > 0) p.set("user_id", String(next.user_id));
    if ((next.loan_id ?? 0) > 0) p.set("loan_id", String(next.loan_id));
    if (next.audit) p.set("audit", "1");

    const query = p.toString();
    return `/app/command-center/trust-analytics${query ? `?${query}` : ""}`;
  }

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

  function setQuery(next: Record<string, string | null>) {
    const p = new URLSearchParams(loc.search);

    for (const [k, v] of Object.entries(next)) {
      if (v == null || v === "") p.delete(k);
      else p.set(k, v);
    }

    const query = p.toString();
    nav(`/app/command-center/trust-analytics${query ? `?${query}` : ""}`);
  }

  async function copyAuditSummary() {
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

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        setMsg("Audit summary copied.");
        return;
      }
    } catch {
      // fall through
    }

    window.prompt("Copy audit summary:", text);
  }

  useEffect(() => {
    void loadEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc.search]);

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
        const t = safeStr(e.event_type).toUpperCase();
        return t.includes("AUDIT") || t.startsWith("ADMIN_") || t.startsWith("BULK_");
      });
    }

    list.sort((a, b) => {
      const da = safeDate(a.created_at)?.getTime() || 0;
      const db = safeDate(b.created_at)?.getTime() || 0;
      return db - da;
    });

    return list;
  }, [events, clanId, loanId, userId, auditOn]);

  const eventTypeSummary = useMemo(() => {
    const map = new Map<string, number>();

    for (const event of filtered) {
      const key = safeStr(event.event_type, "unknown_event");
      map.set(key, (map.get(key) || 0) + 1);
    }

    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [filtered]);

  const analyticsSummary = useMemo(() => {
    const withLoan = filtered.filter((e) => n(e.loan_id) > 0).length;
    const withMeta = filtered.filter((e) => !!parseMeta(e)).length;
    const auditEvents = filtered.filter((e) => {
      const t = safeStr(e.event_type).toUpperCase();
      return t.includes("AUDIT") || t.startsWith("ADMIN_") || t.startsWith("BULK_");
    }).length;

    return {
      total: filtered.length,
      withLoan,
      withMeta,
      auditEvents,
    };
  }, [filtered]);

  const auditCounts = useMemo(() => {
    if (!auditOn) return null;

    const latest = filtered[0];
    const meta = latest ? parseMeta(latest) : null;
    const attempted = meta?.attempted ?? meta?.total ?? null;
    const ok = meta?.ok ?? meta?.success ?? null;
    const failed = meta?.failed ?? meta?.errors ?? null;

    return { attempted, ok, failed, latest };
  }, [filtered, auditOn]);

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
    <div style={{ padding: 20, maxWidth: 1100, margin: "0 auto", paddingBottom: 30 }}>
      <div
        style={{
          ...pageCard("linear-gradient(180deg, #F8FBFF 0%, #FFFFFF 100%)"),
          marginTop: 18,
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
          <div>
            <div style={sectionLabel()}>Command Center</div>
            <div style={{ fontSize: 30, fontWeight: 1000, color: "#0B1F33", marginTop: 8 }}>
              Trust Event Analytics
            </div>
            <div style={{ color: "#6B7A88", marginTop: 8, lineHeight: 1.7 }}>
              Filter trust events by community, user, loan, and audit mode to explain
              why a decision happened.
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link to="/app/command-center" style={{ ...buttonStyle(false), textDecoration: "none" }}>
              Command Center
            </Link>
            <Link
              to={buildRoute({
                clan_id: clanId || null,
                user_id: userId,
                loan_id: loanId,
                audit: false,
              })}
              style={{ ...buttonStyle(true), textDecoration: "none" }}
            >
              Trust Analytics
            </Link>
            <Link to="/app/command-center/trust-graph" style={{ ...buttonStyle(false), textDecoration: "none" }}>
              Trust Graph
            </Link>
          </div>
        </div>
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
              Audit mode · latest: {safeStr(auditCounts.latest.event_type, "—")}
            </div>
            <button type="button" onClick={copyAuditSummary} style={buttonStyle(false)}>
              Copy audit summary
            </button>
          </div>

          <div style={{ fontSize: 12, marginTop: 8, color: "#7C2D12" }}>
            attempted: <b>{auditCounts.attempted ?? "—"}</b> · ok:{" "}
            <b>{auditCounts.ok ?? "—"}</b> · failed: <b>{auditCounts.failed ?? "—"}</b>
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

      <div style={{ ...pageCard(), marginBottom: 12 }}>
        <div style={sectionLabel()}>Filters</div>

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

          <label
            style={{
              display: "flex",
              gap: 8,
              alignItems: "center",
              fontWeight: 700,
              color: "#0B1F33",
            }}
          >
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
            style={buttonStyle(true, loading)}
          >
            {loading ? "Loading..." : "Reload events"}
          </button>

          <button
            type="button"
            onClick={() =>
              nav(
                `/app/command-center/trust-analytics${
                  selectedClanId > 0 ? `?clan_id=${selectedClanId}` : ""
                }`
              )
            }
            style={buttonStyle(false)}
          >
            Reset
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={softCard()}>
          <div style={sectionLabel()}>Filtered total</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {analyticsSummary.total}
          </div>
        </div>

        <div style={softCard()}>
          <div style={sectionLabel()}>With loan</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {analyticsSummary.withLoan}
          </div>
        </div>

        <div style={softCard()}>
          <div style={sectionLabel()}>With meta</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {analyticsSummary.withMeta}
          </div>
        </div>

        <div style={softCard()}>
          <div style={sectionLabel()}>Audit-like</div>
          <div style={{ marginTop: 8, fontSize: 26, fontWeight: 1000, color: "#0B1F33" }}>
            {analyticsSummary.auditEvents}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "0.9fr 1.1fr",
          gap: 12,
          alignItems: "start",
        }}
      >
        <div style={pageCard()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Top Event Types
          </div>

          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            {eventTypeSummary.length === 0 ? (
              <div style={{ color: "#6B7A88" }}>No event summary available.</div>
            ) : (
              eventTypeSummary.map(([label, count]) => (
                <div key={label} style={softCard()}>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{label}</div>
                  <div style={{ marginTop: 6, color: "#64748B" }}>{count} event(s)</div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={pageCard()}>
          <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
            Recent Trust Events
          </div>

          {filtered.length === 0 ? (
            <div style={{ marginTop: 14, color: "#6B7280" }}>
              No events found for this filter.
            </div>
          ) : (
            <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
              {filtered.slice(0, 100).map((event, idx) => {
                const meta = parseMeta(event);
                const isFirstAudit = auditOn && idx === 0;

                const actorLink = event.actor_user_id
                  ? buildRoute({
                      clan_id: clanId || null,
                      user_id: n(event.actor_user_id),
                      loan_id: null,
                      audit: auditOn,
                    })
                  : null;

                const subjectLink = event.subject_user_id
                  ? buildRoute({
                      clan_id: clanId || null,
                      user_id: n(event.subject_user_id),
                      loan_id: null,
                      audit: auditOn,
                    })
                  : null;

                const loanLink = event.loan_id
                  ? buildRoute({
                      clan_id: clanId || null,
                      user_id: userId,
                      loan_id: n(event.loan_id),
                      audit: auditOn,
                    })
                  : null;

                return (
                  <div
                    key={`${event.id ?? idx}-${event.created_at ?? idx}`}
                    ref={isFirstAudit ? latestAuditRef : undefined}
                    style={softCard("#FFFFFF")}
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
                        {safeStr(event.event_type, "event")}
                      </div>
                      <div style={{ fontSize: 12, color: "#6B7280" }}>
                        {safeDateTime(event.created_at)}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 10,
                        flexWrap: "wrap",
                        color: "#64748B",
                        fontSize: 13,
                      }}
                    >
                      <span>Clan: {safeStr(event.clan_id, "—")}</span>
                      <span>Loan: {safeStr(event.loan_id, "—")}</span>
                      <span>Actor: {safeStr(event.actor_user_id, "—")}</span>
                      <span>Subject: {safeStr(event.subject_user_id, "—")}</span>
                    </div>

                    <div
                      style={{
                        marginTop: 8,
                        display: "flex",
                        gap: 8,
                        flexWrap: "wrap",
                        fontSize: 12,
                      }}
                    >
                      {loanLink ? (
                        <Link to={loanLink} style={{ color: "#0B63D1", fontWeight: 900 }}>
                          Filter by loan {event.loan_id}
                        </Link>
                      ) : null}
                      {actorLink ? (
                        <Link to={actorLink} style={{ color: "#0B63D1", fontWeight: 900 }}>
                          Jump to actor {event.actor_user_id}
                        </Link>
                      ) : null}
                      {subjectLink ? (
                        <Link to={subjectLink} style={{ color: "#0B63D1", fontWeight: 900 }}>
                          Jump to subject {event.subject_user_id}
                        </Link>
                      ) : null}
                    </div>

                    <details style={{ marginTop: 10 }} open={isFirstAudit}>
                      <summary style={{ cursor: "pointer", fontWeight: 800 }}>
                        Meta
                      </summary>
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
      </div>
    </div>
  );
}