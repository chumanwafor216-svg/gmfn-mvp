import React, { useCallback, useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import {
  CardActionRow,
  PrimaryButton,
  SecondaryButton,
  StableCtaLink,
  SubtleButton,
} from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { getSelectedClanId, safeCopy as copyWithFallback } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

type TimelineItem = {
  event_type: string;
  label?: string;
  delta?: string;
  reason?: string | null;
  note?: string | null;
  reference_label?: string | null;
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

function supportDisplayText(value: unknown, fallback = "-"): string {
  const text = String(value ?? "").trim();
  if (!text) return fallback;
  return text
    .replace(/Guarantors/g, "Supporters")
    .replace(/guarantors/g, "supporters")
    .replace(/Guarantor/g, "Supporter")
    .replace(/guarantor/g, "supporter");
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
  copyWithFallback(text);
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

function actionLabel(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={icon} size={17} />
      <span>{label}</span>
    </span>
  );
}

function sectionHeading(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={icon} size={16} />
      <span>{label}</span>
    </span>
  );
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function TrustTimelinePage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust-timeline.route.trust-slip"),
    }),
    [selectedClanId]
  );
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
      downloadBlob(blob, `gsn_trust_timeline${suffix}.pdf`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  async function downloadEvidenceZip() {
    setErr(null);
    try {
      const blob = await authedBlob("/trust/me/evidence-pack.zip");
      const pid = packId || "pack";
      downloadBlob(blob, `gsn_evidence_pack_${pid}.zip`);
    } catch (e: any) {
      setErr(String(e?.message || e));
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1120, display: "grid", gap: 18 }}>
      <PageTopNav
        sectionLabel="Trust Timeline"
        title="Trust Timeline"
        subtitle="See the trust events behind your standing and save the evidence bundle when you need supporting evidence."
      />

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div style={sectionLabel()}>{sectionHeading("chart", "Trust Movement")}</div>
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
          See why your trust changed, when it changed, and which evidence can
          support it.
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
          Use this page before you answer a question, support a claim, or save
          evidence for a review.
        </div>

        <CardActionRow style={{ marginTop: 16 }}>
          <StableCtaLink
            to={routes.trustSlip}
            stableHeight={52}
            debugId="trust-timeline.trust-slip"
          >
            {actionLabel("document", "Open TrustSlip")}
          </StableCtaLink>
          <PrimaryButton
            onClick={loadAll}
            stableHeight={52}
            debugId="trust-timeline.refresh"
          >
            {actionLabel("refresh", "Refresh")}
          </PrimaryButton>
          <SubtleButton
            onClick={downloadTimelinePdf}
            stableHeight={52}
            debugId="trust-timeline.download-pdf"
          >
            {actionLabel("document", "Download timeline")}
          </SubtleButton>
        </CardActionRow>
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
            <div style={sectionLabel()}>{sectionHeading("shield", "Trust Reading")}</div>
            <div style={{ fontSize: 12, ...helperText() }}>
              {totals.total} events - {totals.pos} positive - {totals.neg} negative
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
              Latest trust change
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              <div>
                <b>Type:</b>{" "}
                {supportDisplayText(lastChange?.event_type || lastChange?.source)}
              </div>
              <div>
                <b>When:</b> {fmtWhen(lastChange?.created_at)}
              </div>
              <div>
                <b>Reason:</b> {supportDisplayText(lastChange?.reason)}
              </div>
              <div>
                <b>Note:</b> {supportDisplayText(lastChange?.note)}
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
            <div style={sectionLabel()}>{sectionHeading("vault", "Evidence Bundle")}</div>
            <div style={{ fontSize: 12, ...helperText() }}>Reference for review</div>
          </div>

          <div style={{ marginTop: 10 }}>
            <div style={helperText()}>
              This reference helps you point to the exact evidence bundle during
              a merchant, support, or admin review.
            </div>

            <div style={{ marginTop: 10, fontSize: 14 }}>
              <b>Evidence reference:</b>{" "}
              <span
                style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}
              >
                {packId || "-"}
              </span>
            </div>

            <CardActionRow style={{ marginTop: 12 }}>
              <SecondaryButton
                disabled={!packId}
                onClick={() => packId && safeCopy(packId)}
                stableHeight={52}
                debugId="trust-timeline.copy-pack-id"
              >
                {actionLabel("copy", "Copy reference")}
              </SecondaryButton>

              <SubtleButton
                onClick={downloadEvidenceZip}
                stableHeight={52}
                debugId="trust-timeline.download-evidence-zip"
              >
                {actionLabel("vault", "Download evidence")}
              </SubtleButton>
            </CardActionRow>

            <div style={{ marginTop: 10, fontSize: 12, ...helperText() }}>
              Use this reference when someone needs to check the same evidence later.
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
          <div style={sectionLabel()}>{sectionHeading("calendar", "Events")}</div>
          <div style={{ fontSize: 12, ...helperText() }}>
            Trust events in order.
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
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Signal</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Label</th>
                    <th style={{ textAlign: "right", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Delta</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Reference</th>
                    <th style={{ textAlign: "left", padding: 10, borderBottom: "1px solid #E2E8F0" }}>Reason / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((e, idx) => {
                    const d = deltaTone(e.delta);
                    const refs: string[] = [];
                    if (e.reference_label) refs.push(supportDisplayText(e.reference_label));

                    return (
                      <tr key={`${e.created_at || "t"}-${idx}`}>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                          {fmtWhen(e.created_at)}
                        </td>
                        <td style={{ padding: 10, borderBottom: "1px solid #F1F5F9", whiteSpace: "nowrap" }}>
                          <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", fontSize: 12 }}>
                            {supportDisplayText(e.event_type)}
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
                          {supportDisplayText(e.reason) +
                            (e.note ? ` | ${supportDisplayText(e.note)}` : "")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, ...helperText() }}>
            This timeline is a community trust record. It is not a bank
            guarantee and it does not move money from any supporter.
          </div>
        </div>
      </section>
    </div>
  );
}
