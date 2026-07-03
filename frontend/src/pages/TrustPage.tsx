// frontend/src/pages/TrustPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import PageTopNav from "../components/PageTopNav";
import { CardActionRow, PrimaryButton, SecondaryButton } from "../components/StableButton";

import {
  getMe,
  getSelectedClanId,
  getTrustScoreExplained,
  getTrustWhyMe,
  safeCopy,
} from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";

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
  starter_evidence_summary?: {
    phone_verified?: boolean;
    bank_recorded?: boolean;
    drivers_licence_recorded?: boolean;
    region_consistent?: boolean;
    region_mismatch_explained?: boolean;
  };
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
  latest_event_at?: string | null;
  computed?: any;
  events?: Array<any>;
};

type TrustEventOut = {
  created_at?: string | null;
  event_type?: string;
  delta?: string | null;
  reason?: string | null;
  note?: string | null;
  reference_label?: string | null;
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

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function supportDisplayText(value: unknown, fallback = "-"): string {
  const text = safeStr(value);
  if (!text) return fallback;
  return text
    .replace(/Guarantors/g, "Supporters")
    .replace(/guarantors/g, "supporters")
    .replace(/Guarantor/g, "Supporter")
    .replace(/guarantor/g, "supporter");
}

function humanizeEventType(eventType?: string | null): string {
  const raw = safeStr(eventType);
  if (!raw) return "Event";

  const known: Record<string, string> = {
    "identity.phone_verified": "Verified phone recorded",
    "identity.bank_destination_recorded": "Bank destination recorded",
    "identity.drivers_licence_recorded": "Driver's licence recorded",
    "identity.region_consistent": "Region consistency confirmed",
    "identity.region_mismatch_explained": "Cross-region explanation recorded",
    "identity.bank_verification_checked": "Bank verification checked",
    "identity.drivers_licence_verification_checked":
      "Driver's licence verification checked",
  };

  if (known[raw]) return known[raw];

  return raw
    .replace(/[._]+/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase())
    .replace(/Guarantors/g, "Supporters")
    .replace(/Guarantor/g, "Supporter");
}

function buildTrustEvidenceShareText(why: TrustWhy | null): string {
  const lines = [
    "GSN Trust Explanation Evidence",
    `Evidence reference: ${supportDisplayText(why?.pack_id, "-")}`,
    `Checksum: ${supportDisplayText(why?.checksum, "-")}`,
    `Based on: ${supportDisplayText(why?.latest_event_at, "-")}`,
    "Privacy: private operational details, internal member ids, event notes, and free-text reasons are not included in this share copy.",
    "Boundary: this is supporting evidence, not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
  ];

  const events = Array.isArray(why?.events) ? why.events.slice(0, 5) : [];
  if (events.length) {
    lines.push("Recent trust records shown as labels only:");
    events.forEach((event: any) => {
      const label = supportDisplayText(
        event.reference_label || humanizeEventType(event.event_type),
        "Trust record"
      );
      const when = supportDisplayText(event.created_at, "");
      lines.push(`- ${label}${when ? ` | Date: ${when}` : ""}`);
    });
  }

  return lines.join("\n");
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

function evidenceTile(enabled: boolean): React.CSSProperties {
  return {
    padding: 12,
    borderRadius: 12,
    border: enabled ? "1px solid #bfdbfe" : "1px solid #e5e7eb",
    background: enabled ? "#eff6ff" : "#f8fafc",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    marginTop: 16,
    padding: 18,
    borderRadius: 24,
    border: "1px solid rgba(108,138,184,0.18)",
    background:
      bg === "#FFFFFF"
        ? "linear-gradient(180deg, #FFFFFF 0%, #F3F8FF 100%)"
        : bg,
    boxShadow:
      "0 24px 52px rgba(15,23,42,0.08), 0 3px 10px rgba(15,23,42,0.03)",
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

function fieldInput(): React.CSSProperties {
  return {
    minHeight: 46,
    borderRadius: 14,
    border: "1px solid rgba(126,154,195,0.22)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F7FAFF 100%)",
    padding: "10px 12px",
    fontSize: 14,
    color: "#0B1F33",
    boxShadow: "inset 0 1px 2px rgba(15,23,42,0.03)",
  };
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

function trustIconTile(name: GsnIconName, size = 42, dark = false): React.ReactElement {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: 16,
        border: dark
          ? "1px solid rgba(255,255,255,0.2)"
          : "1px solid rgba(11,99,209,0.14)",
        background: dark
          ? "linear-gradient(180deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.08) 100%)"
          : "linear-gradient(180deg, rgba(239,247,255,0.98) 0%, rgba(222,237,250,0.96) 100%)",
        display: "inline-grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow: dark
          ? "0 14px 28px rgba(0,0,0,0.18)"
          : "0 12px 24px rgba(15,23,42,0.08)",
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(24, Math.round(size * 0.78))} decorative />
    </span>
  );
}

function trustIconLabel(name: GsnIconName, label: React.ReactNode, size = 24): React.ReactElement {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      <GsnLegacyIcon name={name} size={size} decorative />
      <span style={{ minWidth: 0 }}>{label}</span>
    </span>
  );
}

function trustEventIconName(eventType?: string | null): GsnIconName {
  const value = (eventType || "").toLowerCase();
  if (value.includes("phone")) return "phone";
  if (value.includes("bank")) return "wallet";
  if (value.includes("licence") || value.includes("license")) return "id";
  if (value.includes("region")) return "globe";
  if (value.includes("repay") || value.includes("approv")) return "check";
  if (value.includes("declin") || value.includes("reject") || value.includes("expire")) return "alert";
  return "document";
}

export default function TrustPage() {
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "trust.route.dashboard"),
      community: routeTarget("communityHome", selectedClanId, "trust.route.community"),
      trustSlip: routeTarget("trustSlip", selectedClanId, "trust.route.trust-slip"),
      openTrust: routeTarget("openTrust", selectedClanId, "trust.route.open-trust"),
    }),
    [selectedClanId]
  );
  const [me, setMe] = useState<Me | null>(null);
  const [score, setScore] = useState<TrustScoreExplained | null>(null);
  const [why, setWhy] = useState<TrustWhy | null>(null);

  const [events, setEvents] = useState<TrustEventOut[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Filters (UI)
  const [limit, setLimit] = useState<number>(50);
  const [eventType, setEventType] = useState<string>("");

  const [showExplain, setShowExplain] = useState(true);

  async function loadAll() {
    setErr(null);
    setLoading(true);

    try {
      const safeLimit = clamp(Number(limit) || 50, 1, 200);

      const [meRes, scoreRes, whyRes] = await Promise.all([
        getMe(),
        getTrustScoreExplained(),
        getTrustWhyMe({
          limit: safeLimit,
          event_type: eventType.trim() || undefined,
          include_policy_timeline: true,
        }),
      ]);

      setMe(meRes);
      setScore(scoreRes);
      setWhy(whyRes as any);
      const items = ((whyRes as any)?.events ?? []) as any[];
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
    const et = eventType.trim().toUpperCase();

    if (et) xs = xs.filter((e) => ((e.event_type || "").toUpperCase().includes(et)));

    return xs;
  }, [events, eventType]);

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
    const filename = `gsn_trust_records_${stamp}.csv`;

    const header = ["created_at", "event_type", "delta", "reason", "note", "reference_label"];

    const rows = filtered.map((ev) => [
      ev.created_at ?? "",
      ev.event_type ?? "",
      ev.delta ?? "",
      ev.reason ?? "",
      ev.note ?? "",
      ev.reference_label ?? "",
    ]);

    const lines: string[] = [];
    lines.push(header.map(csvEscape).join(","));
    for (const r of rows) lines.push(r.map(csvEscape).join(","));

    downloadTextFile(filename, lines.join("\n"));
  }

  const scoreValue =
    (score?.trust_score ?? score?.score ?? "") !== "" ? String(score?.trust_score ?? score?.score) : "-";
  const band = score?.trust_band ?? score?.band ?? (score?.breakdown?.trust_band ?? null);
  const starterSummary =
    score?.starter_evidence_summary ??
    score?.breakdown?.starter_evidence_summary ??
    score?.starter_proof_summary ??
    score?.breakdown?.starter_proof_summary ??
    {};
  const starterEvidenceItems = [
    {
      key: "phone",
      icon: "phone" as GsnIconName,
      label: "Verified phone",
      enabled: Boolean(starterSummary?.phone_verified),
      detail: "A verified phone number gives the system a real identity contact path.",
    },
    {
      key: "bank",
      icon: "wallet" as GsnIconName,
      label: "Recorded bank destination",
      enabled: Boolean(starterSummary?.bank_recorded),
      detail: "A recorded bank destination strengthens the seriousness of your economic identity.",
    },
    {
      key: "licence",
      icon: "id" as GsnIconName,
      label: "Driver's licence evidence",
      enabled: Boolean(starterSummary?.drivers_licence_recorded),
      detail: "Optional licence evidence adds another visible identity layer when it is supplied.",
    },
    {
      key: "region",
      icon: "globe" as GsnIconName,
      label: "Region consistency",
      enabled: Boolean(starterSummary?.region_consistent),
      detail: "Matching phone and bank region signals strengthen starter trust because the identity evidence aligns.",
    },
  ];
  const hasStarterEvidence = starterEvidenceItems.some((item) => item.enabled);
  const latestReason = supportDisplayText(
    score?.latest_reason ??
    score?.breakdown?.latest_reason ??
    "Your trust position reflects the evidence and trust events already recorded on your account."
  );
  const trustExplanation = supportDisplayText(
    score?.explanation ??
    score?.breakdown?.explanation ??
    "The score is explainable. Verified onboarding evidence can establish a starter base before later transactions deepen or weaken it."
  );

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: "0 0 28px" }}>
      <PageTopNav
        sectionLabel="Trust Passport"
        title="Trust"
        subtitle="Read the live trust score, starter trust base, reasoning, and record trail together."
        homeTo={routes.dashboard}
        homeLabel="Dashboard"
        backTo={routes.community}
        backLabel="Community Home"
        nextLinks={[
          { label: "TrustSlip", to: routes.trustSlip },
          { label: "Local community trust", to: routes.openTrust },
        ]}
      />

      <div style={pageCard("linear-gradient(180deg, #0D2237 0%, #163A5C 100%)")}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "58px minmax(0, 1fr)",
            gap: 12,
            alignItems: "start",
          }}
        >
          {trustIconTile("shield", 56, true)}
          <div style={{ minWidth: 0 }}>
            <div style={{ ...sectionLabel(), color: "#CFE0F5" }}>
              {trustIconLabel("document", "Trust passport", 22)}
            </div>
            <div
              style={{
                marginTop: 8,
                fontSize: 34,
                fontWeight: 1000,
                lineHeight: 1.02,
                color: "#F8FBFF",
                letterSpacing: 0,
              }}
            >
              Trust remains one explainable record.
            </div>
            <div
              style={{
                marginTop: 12,
                color: "#D6E2F1",
                fontSize: 15,
                lineHeight: 1.8,
                maxWidth: 760,
              }}
            >
              This page keeps the trust score, the reason behind the score, and
              the event trail in one place so people do not mistake one number
              for the full trust story.
            </div>
          </div>
        </div>
        <CardActionRow style={{ marginTop: 16 }}>
          <PrimaryButton
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            busy={loading}
            busyLabel="Loading..."
            debugId="trust.refresh"
          >
            {trustIconLabel("refresh", "Refresh Trust", 24)}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={exportCsv}
            disabled={loading}
            debugId="trust.export-csv"
          >
            {trustIconLabel("document", "Export trust record", 24)}
          </SecondaryButton>
        </CardActionRow>
      </div>

      <div style={{ marginTop: 16 }}>
        <ExplainToggle
          label="What this screen does"
          what="Trust shows your current trust score, trust band, supporting explanation, and the event trail behind it."
          why="It helps you understand why your current trust position looks the way it does before you share it, challenge it, or rely on it."
          next="Refresh when you need the latest reading, then review the score, explanation, and event history together instead of treating the score as a standalone number."
          tone="light"
        />
      </div>

      {err && (
        <div
          style={{
            ...pageCard("linear-gradient(180deg, #FFF6F6 0%, #FFE8E8 100%)"),
            color: "#991B1B",
            border: "1px solid rgba(239,68,68,0.18)",
          }}
        >
          {err}
        </div>
      )}

      <div style={pageCard()}>
        <div style={sectionLabel()}>{trustIconLabel("id", "Account", 22)}</div>
        <div style={{ marginTop: 8 }}>
          <div><b>ID:</b> {me?.id ?? "-"}</div>
          <div><b>Email:</b> {me?.email ?? "-"}</div>
          <div><b>Role:</b> {me?.role ?? "-"}</div>
        </div>
      </div>

      <div style={pageCard()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div>
              <div style={sectionLabel()}>{trustIconLabel("shield", "Trust score", 22)}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                {scoreValue} {band ? <span style={{ ...pill("blue") }}>{String(band)}</span> : null}
              </div>
            </div>

          <SecondaryButton
            type="button"
            onClick={() => setShowExplain((v) => !v)}
            debugId="trust.toggle-explainability"
          >
            {trustIconLabel(showExplain ? "eye" : "shield", showExplain ? "Hide reasoning" : "Show reasoning", 24)}
          </SecondaryButton>
        </div>

        {showExplain && (
          <div style={{ ...innerCard("linear-gradient(180deg, #F8FBFF 0%, #EEF5FF 100%)"), marginTop: 14 }}>
            {hasStarterEvidence ? (
              <div
                style={{
                  marginBottom: 12,
                  ...innerCard(),
                }}
              >
                <div style={{ fontWeight: 800, marginBottom: 8 }}>
                  Starter trust now has a visible base
                </div>
                <div style={helperText()}>
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
                  {starterEvidenceItems.map((item) => (
                    <div key={item.key} style={evidenceTile(item.enabled)}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        {trustIconTile(item.icon, 36)}
                        <div style={{ minWidth: 0 }}>
                          <span style={pill(item.enabled ? "blue" : "gray")}>
                            {item.enabled ? "Recorded" : "Not yet"}
                          </span>
                          <div style={{ marginTop: 6, fontWeight: 800 }}>
                            {item.label}
                          </div>
                        </div>
                      </div>
                      <div style={{ ...helperText(), marginTop: 8, fontSize: 13.5 }}>
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ ...helperText(), marginTop: 10 }}>
                  {trustExplanation}
                </div>
              </div>
            ) : null}

            <div style={{ fontWeight: 800, marginBottom: 8 }}>
              {trustIconLabel("chart", "Why did my trust change?", 26)}
            </div>
            <div style={{ ...helperText(), fontSize: 13.5 }}>
              This uses the trust records saved on your account. To keep the page light, only the latest few are shown here.
            </div>

            {why?.events?.length ? (
              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                {why.events.slice(0, 8).map((e: any) => (
                  <div key={String(e.id ?? Math.random())} style={innerCard()}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                        {trustIconTile(trustEventIconName(e.event_type), 34)}
                        <span style={{ minWidth: 0 }}>{humanizeEventType(e.event_type)}</span>
                      </div>
                      <div style={{ fontSize: 12, color: "#526579" }}>{timeAgo(e.created_at)} - {e.created_at || ""}</div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      {e.delta ? <span style={pill("green")}>Delta {String(e.delta)}</span> : <span style={pill("gray")}>Delta 0</span>}
                      {e.reference_label ? <span style={pill("blue")}>{supportDisplayText(e.reference_label)}</span> : null}
                      {e.reason ? <span style={pill("gray")}>Reason: {supportDisplayText(e.reason)}</span> : null}
                    </div>
                    {e.note ? <div style={{ ...helperText(), marginTop: 6, fontSize: 13.5 }}>{supportDisplayText(e.note)}</div> : null}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ ...helperText(), marginTop: 10, fontSize: 13.5 }}>No trust records yet.</div>
            )}

            {why?.pack_id || why?.checksum ? (
              <div style={{ ...helperText(), marginTop: 10, fontSize: 12.5 }}>
                <div><b>Evidence reference:</b> {why.pack_id || "-"}</div>
                <div style={{ wordBreak: "break-all" }}><b>Checksum:</b> {why.checksum || "-"}</div>
                <div><b>Based on:</b> {why.latest_event_at || "-"}</div>
                <SecondaryButton
                  type="button"
                  style={{ marginTop: 10 }}
                  onClick={() => safeCopy(buildTrustEvidenceShareText(why))}
                  debugId="trust.copy-explainability-share-summary"
                >
                  {trustIconLabel("copy", "Copy share summary", 24)}
                </SecondaryButton>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div style={pageCard()}>
        <div style={sectionLabel()}>{trustIconLabel("search", "Find records", 22)}</div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "160px 1fr", gap: 10 }}>
          <div style={{ color: "#526579" }}>Limit</div>
          <input style={fieldInput()} value={String(limit)} onChange={(e) => setLimit(Number(e.target.value || 50))} />

          <div style={{ color: "#526579" }}>Event type</div>
          <input style={fieldInput()} value={eventType} onChange={(e) => setEventType(e.target.value)} placeholder="repayment / support / ..." />
        </div>

        <CardActionRow style={{ marginTop: 12 }}>
          <PrimaryButton
            type="button"
            onClick={() => void loadAll()}
            disabled={loading}
            busy={loading}
            busyLabel="Applying..."
            debugId="trust.apply-filters"
          >
            {trustIconLabel("check", "Apply view", 24)}
          </PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={() => { setEventType(""); }}
            disabled={loading}
            debugId="trust.clear-filters"
          >
            {trustIconLabel("refresh", "Clear view", 24)}
          </SecondaryButton>
        </CardActionRow>
      </div>

      <div style={pageCard()}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <div style={sectionLabel()}>{trustIconLabel("document", "Trust record trail", 22)}</div>
            <div style={{ ...helperText(), fontSize: 13.5 }}>{filtered.length} shown</div>
          </div>
          {latest?.event_type ? (
            <span style={pill(eventTone(latest.event_type) as any)}>
              Latest: {humanizeEventType(latest.event_type)} - {timeAgo(latest.created_at)}
            </span>
          ) : null}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {filtered.slice(0, 200).map((ev, index) => (
            <div key={`${ev.created_at ?? "undated"}-${ev.event_type ?? "event"}-${index}`} style={innerCard()}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div style={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                  {trustIconTile(trustEventIconName(ev.event_type), 34)}
                  <span style={{ minWidth: 0 }}>{humanizeEventType(ev.event_type)}</span>
                </div>
                <div style={{ fontSize: 12, color: "#526579" }}>{ev.created_at || ""} {timeAgo(ev.created_at)}</div>
              </div>
              <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                {ev.delta ? <span style={pill("green")}>Delta {String(ev.delta)}</span> : <span style={pill("gray")}>Delta 0</span>}
                {ev.reference_label ? <span style={pill("blue")}>{supportDisplayText(ev.reference_label)}</span> : null}
                {ev.reason ? <span style={pill("gray")}>Reason: {supportDisplayText(ev.reason)}</span> : null}
              </div>
              {ev.note ? (
                <div style={{ marginTop: 8, fontSize: 12.5, color: "#526579", wordBreak: "break-word", lineHeight: 1.6 }}>
                  {supportDisplayText(ev.note)}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 16, ...helperText(), fontSize: 12.5 }}>
        This view keeps records light so it can load on slower phones.
      </div>
    </div>
  );
}
