// frontend/src/pages/TrustPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";

import {
  getMe,
  getTrustScoreExplained,
  getTrustWhyMe,
  listTrustEvents,
  safeCopy,
  TrustEventsQuery,
} from "../lib/api";

type Me = {
  id: number;
  email?: string;
  role?: string;
};

type TrustScoreExplained = {
  // backend may return many fields; keep optional for stability
  score?: number | string;
  trust_score?: number | string;
  trust_band?: string | null;
  band?: string | null;
  explanation?: string | null;
  latest_reason?: string | null;

  // optional breakdown counters
  approved?: number;
  declined?: number;
  no_response?: number;

  // some versions return breakdown dict
  breakdown?: any;
  starter_proof_summary?: {
    phone_verified?: boolean;
    bank_recorded?: boolean;
    drivers_licence_recorded?: boolean;
    region_consistent?: boolean;
    region_mismatch_explained?: boolean;
  };
};

type TrustWhy = {
  user_id: number;
  pack_id?: string;
  checksum?: string;
  based_on_event_at?: string | null;
  computed?: any;
  events?: Array<any>;
};

type TrustEventOut = {
  id?: number;
  created_at?: string | null;
  event_type?: string;
  actor_user_id?: number | null;
  subject_user_id?: number | null;
  loan_id?: number | null;
  guarantor_id?: number | null;
  meta?: any;
};

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const dt = new Date(iso).getTime();
  if (!Number.isFinite(dt)) return "";
  const diff = Date.now() - dt;
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  return `${day}d ago`;
}

function safeJson(meta: any) {
  if (meta == null) return "";
  try {
    if (typeof meta === "string") {
      const s = meta.trim();
      if ((s.startsWith("{") && s.endsWith("}")) || (s.startsWith("[") && s.endsWith("]"))) {
        return JSON.stringify(JSON.parse(s));
      }
      return s;
    }
    if (typeof meta === "object") return JSON.stringify(meta);
    return String(meta);
  } catch {
    return String(meta);
  }
}

function eventTone(eventType: string) {
  const t = (eventType || "").toUpperCase();
  if (t.includes("REPAY")) return "green";
  if (t.includes("APPROV")) return "green";
  if (t.includes("DECLIN")) return "red";
  if (t.includes("REJECT")) return "red";
  if (t.includes("EXPIRE")) return "gray";
  if (t.includes("NO_RESPONSE")) return "gray";
  return "blue";
}

function pill(kind: "green" | "blue" | "gray" | "red") {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
    border: "1px solid #e5e7eb",
    background: "#fff",
    whiteSpace: "normal",
  };
  if (kind === "green") return { ...base, color: "#065f46", background: "#ecfdf5", borderColor: "#a7f3d0" };
  if (kind === "blue") return { ...base, color: "#1e40af", background: "#eff6ff", borderColor: "#bfdbfe" };
  if (kind === "red") return { ...base, color: "#991b1b", background: "#fef2f2", borderColor: "#fecaca" };
  return { ...base, color: "#374151", background: "#f9fafb", borderColor: "#e5e7eb" };
}

function downloadTextFile(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/csv;charset=utf-8" });
  const u = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = u;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(u);
}

function csvEscape(value: any) {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function proofTile(enabled: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: enabled ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
    background: enabled ? "#eff6ff" : "#f8fafc",
  };
}

export default function TrustPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [score, setScore] = useState<TrustScoreExplained | null>(null);
  const [why, setWhy] = useState<TrustWhy | null>(null);

  const [events, setEvents] = useState<TrustEventOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters (UI)
  const [limit, setLimit] = useState<number>(50);
  const [loanId, setLoanId] = useState<string>("");
  const [actorId, setActorId] = useState<string>("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [eventType, setEventType] = useState<string>("");

  const [showExplain, setShowExplain] = useState(true);

  async function loadAll() {
    setErr(null);
    setLoading(true);

    try {
      const safeLimit = clamp(Number(limit) || 50, 1, 200);
      const q: TrustEventsQuery = { limit: safeLimit };

      const loan_id = loanId.trim() ? Number(loanId.trim()) : undefined;
      const actor_user_id = actorId.trim() ? Number(actorId.trim()) : undefined;
      const subject_user_id = subjectId.trim() ? Number(subjectId.trim()) : undefined;

      if (Number.isFinite(loan_id as any)) q.loan_id = loan_id;
      if (Number.isFinite(actor_user_id as any)) q.actor_user_id = actor_user_id;
      if (Number.isFinite(subject_user_id as any)) q.subject_user_id = subject_user_id;
      if (eventType.trim()) q.event_type = eventType.trim();

      const [meRes, scoreRes, whyRes, eventsRes] = await Promise.all([
        getMe(),
        getTrustScoreExplained(),
        getTrustWhyMe(),
        listTrustEvents(q),
      ]);

      setMe(meRes);
      setScore(scoreRes);
      setWhy(whyRes as any);

      // backend may return {items,total} or array
      const items = (eventsRes?.items ?? eventsRes) as any[];
      setEvents(Array.isArray(items) ? items : []);
    } catch (e: any) {
      setErr(String(e?.message || e || "Failed to load trust analytics"));
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    // Local filtering safety (if backend ignores some filters)
    let xs = [...events];
    const loan_id = loanId.trim() ? Number(loanId.trim()) : null;
    const actor_user_id = actorId.trim() ? Number(actorId.trim()) : null;
    const subject_user_id = subjectId.trim() ? Number(subjectId.trim()) : null;
    const et = eventType.trim().toUpperCase();

    if (loan_id && Number.isFinite(loan_id)) xs = xs.filter((e) => (e.loan_id ?? null) === loan_id);
    if (actor_user_id && Number.isFinite(actor_user_id)) xs = xs.filter((e) => e.actor_user_id === actor_user_id);
    if (subject_user_id && Number.isFinite(subject_user_id)) xs = xs.filter((e) => (e.subject_user_id ?? null) === subject_user_id);
    if (et) xs = xs.filter((e) => ((e.event_type || "").toUpperCase().includes(et)));

    return xs;
  }, [events, loanId, actorId, subjectId, eventType]);

  const latest = useMemo(() => {
    const xs = filtered.filter((e) => !!e.created_at);
    xs.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
    return xs[0] || null;
  }, [filtered]);

  function exportCsv() {
    const now = new Date();
    const stamp = now.toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const filename = `gmfn_trust_events_${stamp}.csv`;

    const header = ["id", "created_at", "event_type", "actor_user_id", "subject_user_id", "loan_id", "guarantor_id", "meta"];

    const rows = filtered.map((ev) => [
      ev.id ?? "",
      ev.created_at ?? "",
      ev.event_type ?? "",
      ev.actor_user_id ?? "",
      ev.subject_user_id ?? "",
      ev.loan_id ?? "",
      ev.guarantor_id ?? "",
      safeJson(ev.meta),
    ]);

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(","));
    for (const r of rows) lines.push(r.map(csvEscape).join(","));

    downloadTextFile(filename, lines.join("\n"));
  }

  const scoreValue =
    (score?.trust_score ?? score?.score ?? "") !== "" ? String(score?.trust_score ?? score?.score) : "—";
  const band = score?.trust_band ?? score?.band ?? (score?.breakdown?.trust_band ?? null);
  const starterSummary =
    score?.starter_proof_summary ?? score?.breakdown?.starter_proof_summary ?? {};
  const starterProofs = [
    {
      key: "phone",
      label: "Verified phone",
      enabled: Boolean(starterSummary?.phone_verified),
      detail: "A verified phone number gives the system a real identity contact path.",
    },
    {
      key: "bank",
      label: "Recorded bank destination",
      enabled: Boolean(starterSummary?.bank_recorded),
      detail: "A recorded bank destination strengthens the seriousness of your economic identity.",
    },
    {
      key: "licence",
      label: "Driver's licence proof",
      enabled: Boolean(starterSummary?.drivers_licence_recorded),
      detail: "Optional licence proof adds another visible identity layer when it is supplied.",
    },
    {
      key: "region",
      label: "Region consistency",
      enabled: Boolean(starterSummary?.region_consistent),
      detail: "Matching phone and bank region signals strengthen starter trust because the identity evidence aligns.",
    },
  ];
  const hasStarterProof = starterProofs.some((item) => item.enabled);
  const latestReason =
    score?.latest_reason ??
    score?.breakdown?.latest_reason ??
    "Your trust position reflects the proofs and trust events already recorded on your account.";
  const trustExplanation =
    score?.explanation ??
    score?.breakdown?.explanation ??
    "The score is explainable. Verified onboarding proofs can establish a starter base before later transactions deepen or weaken it.";

  return (
    <div style={{ maxWidth: 980, margin: "0 auto", padding: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Trust</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={loadAll} disabled={loading}>
            {loading ? "Loading…" : "Refresh"}
          </button>
          <button onClick={exportCsv} disabled={loading}>
            Export CSV
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ExplainToggle
          label="What this screen does"
          what="Trust shows your current trust score, trust band, supporting explanation, and the event trail behind it."
          why="It helps you understand why your current trust position looks the way it does before you share it, challenge it, or rely on it."
          next="Refresh when you need the latest reading, then review the score, explanation, and event history together instead of treating the score as a standalone number."
          tone="light"
        />
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#ffecec", color: "#900" }}>
          {err}
        </div>
      )}

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Account</div>
        <div style={{ marginTop: 8 }}>
          <div><b>ID:</b> {me?.id ?? "—"}</div>
          <div><b>Email:</b> {me?.email ?? "—"}</div>
          <div><b>Role:</b> {me?.role ?? "—"}</div>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 13, color: "#666" }}>Trust score</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                {scoreValue} {band ? <span style={{ ...pill("blue") }}>{String(band)}</span> : null}
              </div>
            </div>

          <button onClick={() => setShowExplain((v) => !v)}>
            {showExplain ? "Hide explainability" : "Show explainability"}
          </button>
        </div>

        {showExplain && (
          <div style={{ marginTop: 12, padding: 12, borderRadius: 10, background: "#f7f7f7" }}>
            {hasStarterProof ? (
              <div
                style={{
                  marginBottom: 12,
                  padding: 12,
                  borderRadius: 12,
                  background: "#fff",
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  Starter trust now has a visible base
                </div>
                <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                  {latestReason}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: 10,
                  }}
                >
                  {starterProofs.map((item) => (
                    <div key={item.key} style={proofTile(item.enabled)}>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                        <span style={pill(item.enabled ? "blue" : "gray")}>
                          {item.enabled ? "Recorded" : "Not yet"}
                        </span>
                        <span style={{ fontWeight: 800 }}>{item.label}</span>
                      </div>
                      <div style={{ marginTop: 8, fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, fontSize: 13, color: "#475569", lineHeight: 1.7 }}>
                  {trustExplanation}
                </div>
              </div>
            ) : null}

            <div style={{ fontWeight: 800, marginBottom: 8 }}>Why did my trust change?</div>
            <div style={{ fontSize: 13, color: "#666" }}>
              This uses the deterministic TrustEvent ledger. For low-bandwidth users, we only show the latest few.
            </div>

            {why?.events?.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {why.events.slice(0, 8).map((e: any) => (
                  <div key={String(e.id ?? Math.random())} style={{ padding: 10, borderRadius: 10, background: "#fff", border: "1px solid #eee" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800 }}>{e.event_type || "event"}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{timeAgo(e.created_at)} • {e.created_at || ""}</div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {e.delta ? <span style={pill("green")}>Δ {String(e.delta)}</span> : <span style={pill("gray")}>Δ 0</span>}
                      {e.loan_id ? <span style={pill("blue")}>Loan {String(e.loan_id)}</span> : null}
                      {e.reason ? <span style={pill("gray")}>Reason: {String(e.reason)}</span> : null}
                    </div>
                    {e.note ? <div style={{ marginTop: 6, fontSize: 13 }}>{String(e.note)}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ marginTop: 10, fontSize: 13, color: "#666" }}>No trust events yet.</div>
            )}

            {why?.pack_id || why?.checksum ? (
              <div style={{ marginTop: 10, fontSize: 12, color: "#666" }}>
                <div><b>Pack ID:</b> {why.pack_id || "—"}</div>
                <div style={{ wordBreak: "break-all" }}><b>Checksum:</b> {why.checksum || "—"}</div>
                <div><b>Based on:</b> {why.based_on_event_at || "—"}</div>
                <button style={{ marginTop: 8 }} onClick={() => safeCopy(JSON.stringify(why, null, 2))}>
                  Copy explainability JSON
                </button>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ fontSize: 13, color: "#666" }}>Filters</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
          <div style={{ color: "#666" }}>Limit</div>
          <input value={String(limit)} onChange={(e) => setLimit(Number(e.target.value || 50))} />

          <div style={{ color: "#666" }}>Loan ID</div>
          <input value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="e.g. 12" />

          <div style={{ color: "#666" }}>Actor user ID</div>
          <input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="e.g. 1" />

          <div style={{ color: "#666" }}>Subject user ID</div>
          <input value={subjectId} onChange={(e) => setSubjectId(e.target.value)} placeholder="e.g. 1" />

          <div style={{ color: "#666" }}>Event type</div>
          <input value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="repayment / guarantor / ..." />
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={loadAll} disabled={loading}>Apply filters</button>
          <button onClick={() => { setLoanId(""); setActorId(""); setSubjectId(""); setEventType(""); }} disabled={loading}>
            Clear filters
          </button>
        </div>
      </div>

      <div style={{ marginTop: 14, padding: 14, border: "1px solid #ddd", borderRadius: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: "#666" }}>Trust events</div>
            <div style={{ fontSize: 13, color: "#666" }}>{filtered.length} shown</div>
          </div>
          {latest?.event_type ? (
            <span style={pill(eventTone(latest.event_type) as any)}>
              Latest: {latest.event_type} • {timeAgo(latest.created_at)}
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {filtered.slice(0, 200).map((ev) => (
            <div key={String(ev.id ?? Math.random())} style={{ padding: 12, border: "1px solid #eee", borderRadius: 12, background: "#fff" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800 }}>{ev.event_type || "event"}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{ev.created_at || ""} {timeAgo(ev.created_at)}</div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ev.loan_id != null ? <span style={pill("blue")}>Loan {String(ev.loan_id)}</span> : null}
                {ev.actor_user_id != null ? <span style={pill("gray")}>Actor {String(ev.actor_user_id)}</span> : null}
                {ev.subject_user_id != null ? <span style={pill("gray")}>Subject {String(ev.subject_user_id)}</span> : null}
              </div>
              {ev.meta != null ? (
                <div style={{ marginTop: 8, fontSize: 12, color: "#555", wordBreak: "break-word" }}>
                  {safeJson(ev.meta)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, fontSize: 12, color: "#666" }}>
        Note: Optimized for low-end devices: small payloads, minimal rendering, deterministic sources.
      </div>
    </div>
  );
}
