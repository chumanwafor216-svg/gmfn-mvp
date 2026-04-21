import React, { useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";

/**
 * TrustTimelinePage — MVP pilot
 * - "Why did my trust change?" (explainability)
 * - Event timeline (deterministic, TrustEvent-derived)
 * - Download Timeline PDF (visa/pilot evidence)
 *
 * IMPORTANT:
 * - We do NOT depend on src/lib/api.ts exports here to avoid drift breaking the UI.
 * - Uses SAME-ORIGIN fetch so Vite proxy (/api -> backend) works.
 */

type TimelineItem = {
  event_type: string;
  label?: string;
  delta?: string; // Decimal-as-string
  reason?: string | null;
  note?: string | null;
  payment_reference?: string | null;

  loan_id?: number | null;
  clan_id?: number | null;
  guarantor_id?: number | null;
  actor_user_id?: number | null;
  subject_user_id?: number | null;

  created_at?: string | null;
};

type TimelineResponse = {
  items?: TimelineItem[];
};

type ScoreExplained = {
  score?: string | number;
  last_change?: {
    event_type?: string;
    source?: string;
    created_at?: string;
    reason?: string | null;
    note?: string | null;
  } | null;
};

type PackMetaResp = {
  pack_id: string;
  generated_at_utc?: string;
  protocol_version?: string;
  footer?: string;
};

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

function apiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function apiUrl(path: string): string {
  const raw = String(path || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;

  let cleanPath = raw.startsWith("/") ? raw : `/${raw}`;
  if (cleanPath.startsWith("/api/")) cleanPath = cleanPath.slice(4);

  return `${apiBase()}${cleanPath}`;
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function authedJson<T>(path: string, method: "GET" | "POST" = "GET", body?: any): Promise<T> {
  const tok = getToken();
  if (!tok) throw new Error("You are logged out. Please log in again.");

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tok}`,
    Accept: "application/json",
  };

  const init: RequestInit = { method, headers };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  const res = await fetch(apiUrl(path), init);
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

async function authedBlob(path: string): Promise<Blob> {
  const tok = getToken();
  if (!tok) throw new Error("You are logged out. Please log in again.");

  const res = await fetch(apiUrl(path), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${tok}`,
      Accept: "*/*",
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await res.blob();
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function safeCopy(text: string) {
  if (!text) return;
  navigator.clipboard?.writeText(text).catch(() => {});
}

function fmtWhen(iso?: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    // Keep it readable but still precise
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function deltaTone(deltaStr?: string): { text: string; tone: "pos" | "neg" | "zero" } {
  const s = (deltaStr ?? "").trim();
  if (!s) return { text: "0.00", tone: "zero" };
  const n = Number(s);
  if (!Number.isFinite(n)) return { text: s, tone: "zero" };
  if (n > 0) return { text: `+${s}`, tone: "pos" };
  if (n < 0) return { text: s, tone: "neg" };
  return { text: s, tone: "zero" };
}

export default function TrustTimelinePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [scoreExplained, setScoreExplained] = useState<ScoreExplained | null>(null);
  const [items, setItems] = useState<TimelineItem[]>([]);

  // Evidence pack meta (optional)
  const [packMeta, setPackMeta] = useState<PackMetaResp | null>(null);

  const packId = packMeta?.pack_id || null;

  async function loadAll() {
    setLoading(true);
    setErr(null);

    try {
      const [explained, timeline] = await Promise.all([
        authedJson<ScoreExplained>("/trust/score/explained", "GET"),
        authedJson<TimelineResponse>("/trust/me/timeline?limit=200", "GET"),
      ]);

      setScoreExplained(explained || null);
      setItems(Array.isArray(timeline?.items) ? timeline.items : []);
    } catch (e: any) {
      setErr(String(e?.message || e));
      setScoreExplained(null);
      setItems([]);
    } finally {
      setLoading(false);
    }

    // pack meta is optional; do not fail page if missing
    try {
      const pm = await authedJson<PackMetaResp>("/trust/me/evidence-pack/meta", "GET");
      if (pm?.pack_id) setPackMeta(pm);
      else setPackMeta(null);
    } catch {
      setPackMeta(null);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lastChange = scoreExplained?.last_change || null;

  const totals = useMemo(() => {
    let pos = 0;
    let neg = 0;
    for (const it of items) {
      const n = Number((it.delta ?? "0").trim());
      if (!Number.isFinite(n)) continue;
      if (n > 0) pos += 1;
      if (n < 0) neg += 1;
    }
    return { pos, neg, total: items.length };
  }, [items]);

  async function downloadTimelinePdf() {
    setErr(null);
    try {
      const blob = await authedBlob("/trust/me/timeline.pdf?limit=200");
      const suffix = packId ? `_${packId}` : "";
      downloadBlob(blob, `gmfn_trust_timeline${suffix}.pdf`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function downloadEvidenceZip() {
    setErr(null);
    try {
      const blob = await authedBlob("/trust/me/evidence-pack.zip");
      const pid = packId || "pack";
      downloadBlob(blob, `gmfn_evidence_pack_${pid}.zip`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  const card: React.CSSProperties = {
    border: "1px solid #eee",
    borderRadius: 14,
    padding: 14,
    background: "white",
    boxShadow: "0 10px 25px rgba(0,0,0,0.04)",
  };

  const muted: React.CSSProperties = { color: "#6b7280" };

  const badge = (tone: "pos" | "neg" | "zero") => {
    const base: React.CSSProperties = {
      padding: "4px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 700,
      border: "1px solid #eee",
      display: "inline-block",
    };
    if (tone === "pos") return { ...base, background: "#ecfdf5", borderColor: "#a7f3d0" };
    if (tone === "neg") return { ...base, background: "#fef2f2", borderColor: "#fecaca" };
    return { ...base, background: "#f8fafc", borderColor: "#e5e7eb" };
  };

  return (
    <div style={{ padding: 16, maxWidth: 1120 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0 }}>Trust Timeline</h2>
          <div style={{ ...muted, marginTop: 4 }}>
            Explainability page — <b>“Why did my trust change?”</b>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <OriginLink to="/app/trust-slip" style={{ textDecoration: "none" }}>
            <button style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}>
              Back to TrustSlip
            </button>
          </OriginLink>

          <button
            onClick={loadAll}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}
          >
            Refresh
          </button>

          <button
            onClick={downloadTimelinePdf}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}
          >
            Download Timeline PDF
          </button>
        </div>
      </div>

      {err && (
        <div style={{ marginTop: 12, padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 12 }}>
          <b>Issue:</b> {err}
        </div>
      )}

      <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontSize: 12, ...muted }}>Score (explainable)</div>
            <div style={{ fontSize: 12, ...muted }}>
              {totals.total} events • {totals.pos} positive • {totals.neg} negative
            </div>
          </div>

          <div style={{ fontSize: 46, fontWeight: 900, marginTop: 6 }}>
            {scoreExplained?.score ?? "—"}
          </div>

          <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Why did my trust change? (latest)</div>
            <div style={{ marginTop: 8, ...muted, lineHeight: 1.5 }}>
              <div>
                <b>Type:</b> {lastChange?.event_type || lastChange?.source || "—"}
              </div>
              <div>
                <b>When:</b> {fmtWhen(lastChange?.created_at)}
              </div>
              <div>
                <b>Reason:</b> {lastChange?.reason || "—"}
              </div>
              <div>
                <b>Note:</b> {lastChange?.note || "—"}
              </div>
            </div>
          </div>
        </div>

        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div style={{ fontSize: 14, fontWeight: 800 }}>Evidence Pack</div>
            <div style={{ fontSize: 12, ...muted }}>Reference bundle</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={{ ...muted, fontSize: 13 }}>
              Pack ID helps you reference a specific evidence bundle during merchant/admin calls.
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              <b>Pack ID:</b>{" "}
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                {packId || "—"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                disabled={!packId}
                onClick={() => packId && safeCopy(packId)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 12,
                  border: "1px solid #ddd",
                  background: packId ? "white" : "#f3f4f6",
                  color: packId ? "black" : "#9ca3af",
                }}
              >
                Copy Pack ID
              </button>

              <button
                onClick={downloadEvidenceZip}
                style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #ddd", background: "white" }}
              >
                Download Evidence Pack (ZIP)
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, ...muted }}>
              Use the Pack ID when you need to reference this evidence bundle.
            </div>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, ...card }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
          <div style={{ fontSize: 14, fontWeight: 800 }}>Events</div>
          <div style={{ fontSize: 12, ...muted }}>
            Chronological trust event log.
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {loading ? (
            <div style={muted}>Loading…</div>
          ) : items.length === 0 ? (
            <div style={muted}>No trust events are shown yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>When</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Type</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Label</th>
                    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #eee" }}>Delta</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Refs</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #eee" }}>Reason / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e, idx) => {
                    const d = deltaTone(e.delta);
                    const refs: string[] = [];
                    if (e.loan_id) refs.push(`loan:${e.loan_id}`);
                    if (e.payment_reference) refs.push(`ref:${e.payment_reference}`);
                    if (e.guarantor_id) refs.push(`guarantor:${e.guarantor_id}`);

                    return (
                      <tr key={`${e.created_at || "t"}-${idx}`}>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>
                          {fmtWhen(e.created_at)}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                            {e.event_type || "—"}
                          </span>
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6" }}>{e.label || "—"}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", textAlign: "right" }}>
                          <span style={badge(d.tone)}>{d.text}</span>
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap", ...muted }}>
                          {refs.length ? refs.join(", ") : "—"}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #f3f4f6", ...muted }}>
                          {(e.reason || "—") + (e.note ? ` | ${e.note}` : "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, ...muted }}>
            Disclaimer: This timeline is a community trust record. It is not a bank guarantee and does not auto-debit any guarantor.
          </div>
        </div>
      </div>
    </div>
  );
}
