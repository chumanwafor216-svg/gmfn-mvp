import React, { useCallback, useEffect, useMemo, useState } from "react";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";

type TimelineItem = {
  event_type: string;
  label?: string;
  delta?: string;
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

async function authedJson<T>(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: any
): Promise<T> {
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
  if (!iso) return "-";
  try {
    const d = new Date(iso);
    return d.toLocaleString();
  } catch {
    return iso;
  }
}

function deltaTone(deltaStr?: string): {
  text: string;
  tone: "pos" | "neg" | "zero";
} {
  const s = (deltaStr ?? "").trim();
  if (!s) return { text: "0.00", tone: "zero" };
  const n = Number(s);
  if (!Number.isFinite(n)) return { text: s, tone: "zero" };
  if (n > 0) return { text: `+${s}`, tone: "pos" };
  if (n < 0) return { text: s, tone: "neg" };
  return { text: s, tone: "zero" };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(108,138,184,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    padding: 20,
    boxShadow:
      "0 24px 52px rgba(15,23,42,0.08), 0 3px 10px rgba(15,23,42,0.03)",
    overflow: "hidden",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(125,154,196,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)"
        : bg,
    padding: 16,
    boxShadow: "0 16px 34px rgba(15,23,42,0.05)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#39526C",
    fontWeight: 1000,
    letterSpacing: 0.45,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14.5,
    lineHeight: 1.75,
  };
}

function stableTapStyle(): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 20,
    pointerEvents: "auto",
    boxSizing: "border-box",
    appearance: "none",
    WebkitAppearance: "none",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    transform: "translateZ(0)",
    lineHeight: 1.2,
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  const base: React.CSSProperties = {
    ...stableTapStyle(),
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
    padding: "12px 18px",
    borderRadius: 16,
    fontWeight: 900,
    fontSize: 15,
    textDecoration: "none",
    whiteSpace: "normal",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: "0 12px 28px rgba(15,23,42,0.10)",
  };

  if (kind === "primary") {
    return {
      ...base,
      border: "1px solid rgba(9,83,176,0.24)",
      background: "linear-gradient(180deg, #1D75E8 0%, #0B63D1 100%)",
      color: "#FFFFFF",
    };
  }

  if (kind === "soft") {
    return {
      ...base,
      border: "1px solid rgba(124,153,196,0.22)",
      background: "linear-gradient(180deg, #F6FAFF 0%, #EAF2FF 100%)",
      color: "#17324D",
    };
  }

  return {
    ...base,
    border: "1px solid rgba(124,153,196,0.22)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF4FF 100%)",
    color: "#0B1F33",
  };
}

function deltaBadge(tone: "pos" | "neg" | "zero"): React.CSSProperties {
  const base: React.CSSProperties = {
    padding: "4px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 800,
    border: "1px solid #E2E8F0",
    display: "inline-block",
  };
  if (tone === "pos") return { ...base, background: "#ECFDF5", borderColor: "#A7F3D0", color: "#166534" };
  if (tone === "neg") return { ...base, background: "#FEF2F2", borderColor: "#FECACA", color: "#991B1B" };
  return { ...base, background: "#F8FAFC", borderColor: "#E2E8F0", color: "#475569" };
}

export default function TrustTimelinePage() {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [scoreExplained, setScoreExplained] = useState<ScoreExplained | null>(
    null
  );
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [packMeta, setPackMeta] = useState<PackMetaResp | null>(null);

  const packId = packMeta?.pack_id || null;

  const loadAll = useCallback(async () => {
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

    try {
      const pm = await authedJson<PackMetaResp>(
        "/trust/me/evidence-pack/meta",
        "GET"
      );
      if (pm?.pack_id) setPackMeta(pm);
      else setPackMeta(null);
    } catch {
      setPackMeta(null);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

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

  return (
    <div style={{ padding: 16, maxWidth: 1120, display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Trust Timeline"
        title="Trust Timeline"
        subtitle="Read the explainable event trail behind your trust movement and export the evidence bundle when needed."
      />

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div style={sectionLabel()}>Explainable trust movement</div>
        <div
          style={{
            marginTop: 10,
            color: "#FFFFFF",
            fontSize: 34,
            fontWeight: 1000,
            lineHeight: 1.04,
            maxWidth: 760,
          }}
        >
          See why your trust changed, when it changed, and which evidence pack
          can defend it.
        </div>
        <div
          style={{
            marginTop: 12,
            color: "#D7E3F1",
            fontSize: 15,
            lineHeight: 1.8,
            maxWidth: 820,
          }}
        >
          This page turns the trust trail into a readable timeline before you
          answer a challenge, support a claim, or export proof.
        </div>

        <div style={{ marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <OriginLink to="/app/trust-slip" style={{ textDecoration: "none" }}>
            <button style={actionBtn("secondary")}>Back to TrustSlip</button>
          </OriginLink>
          <button onClick={loadAll} style={actionBtn("primary")}>
            Refresh
          </button>
          <button onClick={downloadTimelinePdf} style={actionBtn("soft")}>
            Download Timeline PDF
          </button>
        </div>
      </section>

      {err ? (
        <div
          style={{
            ...innerCard("#FEF2F2"),
            border: "1px solid rgba(248,113,113,0.24)",
            color: "#991B1B",
          }}
        >
          <b>Issue:</b> {err}
        </div>
      ) : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
        }}
      >
        <section style={pageCard("#FFFFFF")}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionLabel()}>Score (explainable)</div>
            <div style={{ fontSize: 12, ...helperText() }}>
              {totals.total} events • {totals.pos} positive • {totals.neg} negative
            </div>
          </div>

          <div style={{ fontSize: 46, fontWeight: 900, marginTop: 6 }}>
            {scoreExplained?.score ?? "-"}
          </div>

          <div
            style={{
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 800 }}>
              Why did my trust change? (latest)
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              <div>
                <b>Type:</b> {lastChange?.event_type || lastChange?.source || "-"}
              </div>
              <div>
                <b>When:</b> {fmtWhen(lastChange?.created_at)}
              </div>
              <div>
                <b>Reason:</b> {lastChange?.reason || "-"}
              </div>
              <div>
                <b>Note:</b> {lastChange?.note || "-"}
              </div>
            </div>
          </div>
        </section>

        <section style={pageCard("#FFFFFF")}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "baseline",
              flexWrap: "wrap",
            }}
          >
            <div style={sectionLabel()}>Evidence Pack</div>
            <div style={{ fontSize: 12, ...helperText() }}>Reference bundle</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={helperText()}>
              Pack ID helps you reference a specific evidence bundle during
              merchant and admin calls.
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              <b>Pack ID:</b>{" "}
              <span
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {packId || "-"}
              </span>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <button
                disabled={!packId}
                onClick={() => packId && safeCopy(packId)}
                style={actionBtn("secondary", !packId)}
              >
                Copy Pack ID
              </button>

              <button onClick={downloadEvidenceZip} style={actionBtn("soft")}>
                Download Evidence Pack (ZIP)
              </button>
            </div>

            <div style={{ marginTop: 10, fontSize: 12, ...helperText() }}>
              Use the Pack ID when you need to reference this evidence bundle.
            </div>
          </div>
        </section>
      </div>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <div style={sectionLabel()}>Events</div>
          <div style={{ fontSize: 12, ...helperText() }}>
            Chronological trust event log.
          </div>
        </div>

        <div style={{ marginTop: 10 }}>
          {loading ? (
            <div style={helperText()}>Loading...</div>
          ) : items.length === 0 ? (
            <div style={helperText()}>No trust events are shown yet.</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  minWidth: 860,
                  ...innerCard("#FFFFFF"),
                }}
              >
                <thead>
                  <tr>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>When</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Type</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Label</th>
                    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Delta</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Refs</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Reason / Note</th>
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
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                          {fmtWhen(e.created_at)}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                            {e.event_type || "-"}
                          </span>
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9" }}>{e.label || "-"}</td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", textAlign: "right" }}>
                          <span style={deltaBadge(d.tone)}>{d.text}</span>
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap", ...helperText(), fontSize: 12 }}>
                          {refs.length ? refs.join(", ") : "-"}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", ...helperText(), fontSize: 12 }}>
                          {(e.reason || "-") + (e.note ? ` | ${e.note}` : "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, ...helperText() }}>
            Disclaimer: This timeline is a community trust record. It is not a
            bank guarantee and does not auto-debit any guarantor.
          </div>
        </div>
      </section>
    </div>
  );
}
