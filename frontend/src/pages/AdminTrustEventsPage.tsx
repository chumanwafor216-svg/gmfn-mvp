import React, { useEffect, useMemo, useState } from "react";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { SecondaryButton, StableCtaLink, SubtleButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { adminRecentTrustEvents, getSelectedClanId, safeCopy } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { buildGsnSnapshotPaper } from "../lib/gsnSnapshotPaper";

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

function toNum(x: any): number | null {
  const n = Number(x);
  return Number.isFinite(n) ? n : null;
}

function topPattern(): string {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="1600" height="320" viewBox="0 0 1600 320">
    <rect width="1600" height="320" fill="#F7FAFD"/>
    <g fill="none" stroke="#C7D9EE" stroke-opacity="0.42" stroke-width="2">
      <path d="M80 160 C180 90, 280 90, 380 160 S580 230, 690 150" />
      <path d="M920 160 C1020 90, 1120 90, 1220 160 S1420 230, 1520 150" />
    </g>
  </svg>`.trim();
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...card(),
    background: bg,
    border: "1px solid rgba(108,138,184,0.16)",
    boxShadow: "0 14px 34px rgba(15,23,42,0.04)",
  };
}

function statTile(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(108,138,184,0.16)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)",
    padding: 16,
    boxShadow: "0 14px 28px rgba(15,23,42,0.04)",
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

function adminTrustEventActionStyle(kind: "primary" | "secondary" | "soft" = "secondary"): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 14,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
  };

  if (kind === "primary") {
    return {
      ...base,
      border: "1px solid rgba(9,83,176,0.24)",
      background: "linear-gradient(180deg, #1D75E8 0%, #0B63D1 100%)",
      color: "#FFFFFF",
      boxShadow: "0 14px 28px rgba(15,23,42,0.12)",
    };
  }

  if (kind === "soft") {
    return {
      ...base,
      border: "1px solid rgba(124,153,196,0.18)",
      background: "linear-gradient(180deg, #F8FBFF 0%, #EAF2FF 100%)",
      color: "#24415C",
      boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
    };
  }

  return {
    ...base,
    border: "1px solid rgba(124,153,196,0.18)",
    background: "linear-gradient(180deg, #FFFFFF 0%, #EEF4FF 100%)",
    color: "#0B1F33",
    boxShadow: "0 12px 24px rgba(15,23,42,0.08)",
  };
}

function adminTrustEventCollapseStyle(): React.CSSProperties {
  return {
    ...adminTrustEventActionStyle("soft"),
  };
}

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    padding: "6px 10px",
    borderRadius: 999,
    background: primary
      ? "rgba(11,99,209,0.08)"
      : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#475569",
    fontSize: 12,
    fontWeight: 1000,
    whiteSpace: "normal",
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
  };
}

function labelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <GsnLegacyIcon name={icon} size={18} />
      <span style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
        {label}
      </span>
    </span>
  );
}

function eventIconBadge(
  icon: GsnIconName,
  children: React.ReactNode,
  primary = false
) {
  return (
    <span style={badge(primary)}>
      <GsnLegacyIcon
        name={icon}
        size={15}
      />
      <span style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
        {children}
      </span>
    </span>
  );
}

function sectionLabelWithIcon(icon: GsnIconName, label: React.ReactNode) {
  return (
    <span
      style={{
        ...sectionLabel(),
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
        maxWidth: "100%",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 11,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#FFFFFF",
          background: "linear-gradient(180deg, #08233A 0%, #061827 100%)",
          border: "1px solid rgba(8,35,58,0.16)",
          boxShadow: "0 10px 20px rgba(7,20,36,0.10)",
          flex: "0 0 auto",
        }}
      >
        <GsnLegacyIcon name={icon} size={16} />
      </span>
      <span style={{ minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
        {label}
      </span>
    </span>
  );
}

function deltaIcon(tone: "pos" | "neg" | "zero" | "none"): GsnIconName {
  if (tone === "pos") return "check";
  if (tone === "neg") return "alert";
  if (tone === "zero") return "shield";
  return "document";
}

function fmtWhen(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "-";
  const parsed = new Date(raw);
  if (!Number.isFinite(parsed.getTime())) return raw;
  return parsed.toLocaleString();
}

function deltaMeta(value: any): { label: string; tone: "pos" | "neg" | "zero" | "none" } {
  const raw = safeStr(value);
  if (!raw) return { label: "No delta stated", tone: "none" };
  const num = Number(raw);
  if (!Number.isFinite(num)) return { label: raw, tone: "none" };
  if (num > 0) return { label: `+${num}`, tone: "pos" };
  if (num < 0) return { label: String(num), tone: "neg" };
  return { label: "0", tone: "zero" };
}

function eventToneStyle(tone: "pos" | "neg" | "zero" | "none"): React.CSSProperties {
  if (tone === "pos") return { background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534" };
  if (tone === "neg") return { background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B" };
  if (tone === "zero") return { background: "#FFFBEF", border: "1px solid #FDE68A", color: "#92400E" };
  return { background: "#F8FAFC", border: "1px solid rgba(148,163,184,0.16)", color: "#334155" };
}

function buildEventSnapshot(row: any): string {
  return buildGsnSnapshotPaper({
    title: "GSN Trust Event Audit Snapshot",
    purpose:
      "Protected audit snapshot for a trust-event record before deeper admin review.",
    reference: `trust-event-${safeStr(row?.id || row?.event_id || row?.created_at || "pending")}`,
    context: [
      { label: "Event", value: supportDisplayText(row?.event_type || "trust.event") },
      { label: "When", value: fmtWhen(row?.created_at) },
      { label: "Delta", value: deltaMeta(row?.delta).label },
      { label: "Actor reference", value: safeStr(row?.actor_user_id || "-") },
      { label: "Subject reference", value: safeStr(row?.subject_user_id || "-") },
    ],
    bodyLines: [
      `Reason: ${supportDisplayText(row?.reason || "Not stated")}`,
      `Note: ${supportDisplayText(row?.note || "Not stated")}`,
      "Reader boundary: this is protected trust-event audit evidence. Use complete records only inside authorized admin review.",
    ],
    privacyNote:
      "Privacy: copied event snapshots exclude protected event details, private contacts, phone numbers, bank details, and complete private records.",
    limitationNote:
      "Limitation: protected audit snapshot only. Not public verification, credit approval, payment confirmation, payout approval, or release authority.",
  });
}

function routeTarget(intent: CtaIntent, communityId: number, debugId: string): string {
  return resolveCtaTarget(intent, { communityId, debugId }).to as string;
}

export default function AdminTrustEventsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const pattern = useMemo(() => topPattern(), []);
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      dashboard: routeTarget("dashboard", selectedClanId, "admin-trust-events.route.dashboard"),
      commandCenter: routeTarget("adminCommand", selectedClanId, "admin-trust-events.route.command-center"),
      analytics: routeTarget("trustAnalytics", selectedClanId, "admin-trust-events.route.analytics"),
      graph: routeTarget("trustGraph", selectedClanId, "admin-trust-events.route.graph"),
      identityRisk: routeTarget("identityRisk", selectedClanId, "admin-trust-events.route.identity-risk"),
    }),
    [selectedClanId]
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setErr(null);
        const res = await adminRecentTrustEvents(100);
        const items = Array.isArray(res) ? res : res?.items || [];
        if (!alive) return;
        setRows(items || []);
      } catch (e: any) {
        if (!alive) return;
        setErr(String(e?.message || e || "Unable to load recent trust events."));
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const summary = useMemo(() => {
    const recentCutoff = Date.now() - 24 * 60 * 60 * 1000;
    let recent = 0;
    let positive = 0;
    let negative = 0;
    let noted = 0;

    rows.forEach((row) => {
      const createdAt = new Date(safeStr(row?.created_at)).getTime();
      if (Number.isFinite(createdAt) && createdAt >= recentCutoff) recent += 1;
      const num = toNum(row?.delta);
      if (num !== null && num > 0) positive += 1;
      if (num !== null && num < 0) negative += 1;
      if (safeStr(row?.reason || row?.note)) noted += 1;
    });

    return { total: rows.length, recent, positive, negative, noted };
  }, [rows]);

  function toggleRow(rowKey: string) {
    setExpanded((current) => ({ ...current, [rowKey]: !current[rowKey] }));
  }

  async function copyEvent(row: any) {
    const snapshot = buildEventSnapshot(row);
    try {
      safeCopy(snapshot);
      setNotice("Event snapshot copied.");
    } catch {
      setNotice("Clipboard is not available here.");
    }
  }

  return (
    <div style={{ maxWidth: 1260, margin: "0 auto" }}>
      <PageTopNav sectionLabel="Trust Events" title="Trust Events" subtitle="Review recent trust evidence before opening deeper admin pages." homeTo={routes.dashboard} homeLabel="Dashboard" backTo={routes.commandCenter} backLabel="Command Center" />

      <ExplainToggle
        label="What this screen does"
        what="This screen shows recent trust-event records for evidence review."
        why="It helps you inspect the event trail before deeper analysis or intervention."
        next="Start with the overview, then open source details only when exact evidence is needed."
        tone="light"
        style={{ marginTop: 18 }}
      />

      <div style={{ backgroundImage: `url("${pattern}")`, backgroundRepeat: "no-repeat", backgroundSize: "cover", backgroundPosition: "center top", borderRadius: 28, border: "1px solid rgba(11,31,51,0.06)", overflow: "hidden", backgroundColor: "#F8FBFE", minWidth: 0 }}>
        <div style={{ padding: 24 }}>
          <div style={{ fontSize: 34, fontWeight: 1000, color: "#0B1F33" }}>Trust event log</div>
          <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
            Read the event trail first. Move deeper only when the current record shows pressure.
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {eventIconBadge("document", <>Tracked events: {summary.total}</>, true)}
            {eventIconBadge("calendar", <>Last 24 hours: {summary.recent}</>)}
            {eventIconBadge("check", <>Positive deltas: {summary.positive}</>)}
            {eventIconBadge("alert", <>Negative deltas: {summary.negative}</>)}
            {eventIconBadge("pen", <>Events with notes: {summary.noted}</>)}
          </div>

          {notice ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#ECFDF3", border: "1px solid #A7F3D0", color: "#166534", fontWeight: 900 }}>{notice}</div> : null}
          {err ? <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 14, background: "#FEF2F2", border: "1px solid #FECACA", color: "#991B1B", fontWeight: 900 }}>{err}</div> : null}

          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={statTile()}>
              <div>{sectionLabelWithIcon("search", "What to read first")}</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Start with the newest negative or heavily noted event.
              </div>
            </div>
            <div style={statTile()}>
              <div>{sectionLabelWithIcon("navigation", "When to leave this page")}</div>
              <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                Use Graph for structure, Analytics for pattern, and Identity Risk for person-level integrity.
              </div>
            </div>
          </div>

          <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
            <StableCtaLink
              to={routes.analytics}
              debugId="admin-trust-events.route.analytics"
              stableHeight={52}
              style={adminTrustEventActionStyle("primary")}
            >
              {labelWithIcon("chart", "Open Trust Analytics")}
            </StableCtaLink>
            <StableCtaLink
              to={routes.graph}
              debugId="admin-trust-events.route.graph"
              stableHeight={52}
              style={adminTrustEventActionStyle("secondary")}
            >
              {labelWithIcon("community", "Open Trust Graph")}
            </StableCtaLink>
            <StableCtaLink
              to={routes.identityRisk}
              debugId="admin-trust-events.route.identity-risk"
              stableHeight={52}
              style={adminTrustEventActionStyle("secondary")}
            >
              {labelWithIcon("id", "Open Identity Risk")}
            </StableCtaLink>
            <StableCtaLink
              to={routes.commandCenter}
              debugId="admin-trust-events.route.command-center"
              stableHeight={52}
              style={adminTrustEventActionStyle("soft")}
            >
              {labelWithIcon("navigation", "Back to Command Center")}
            </StableCtaLink>
          </div>

          <div style={{ marginTop: 18, display: "grid", gap: 12 }}>
            {rows.length === 0 && !err ? <div style={{ ...softCard(), color: "#7A8D9F" }}>{labelWithIcon("check", "No recent trust events are currently shown.")}</div> : null}
            {rows.map((row, index) => {
              const rowKey = safeStr(row?.id || row?.event_id || index);
              const delta = deltaMeta(row?.delta);
              const detailOpen = Boolean(expanded[rowKey]);
              return (
                <div key={rowKey} style={{ ...card(), minWidth: 0, overflow: "hidden" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", minWidth: 0 }}>
                    <div style={{ minWidth: 0, maxWidth: "100%" }}>
                      <div style={{ color: "#0B1F33", fontWeight: 1000, fontSize: 18, minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        {labelWithIcon("document", supportDisplayText(row?.event_type || "trust.event"))}
                      </div>
                      <div style={{ marginTop: 4, color: "#6B7A88", fontSize: 13, minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                        {labelWithIcon("calendar", fmtWhen(row?.created_at))}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "flex-start", minWidth: 0, maxWidth: "100%" }}>
                      <span style={{ ...badge(false), ...eventToneStyle(delta.tone) }}>
                        <GsnLegacyIcon
                          name={deltaIcon(delta.tone)}
                          size={15}
                        />
                        <span>{delta.label}</span>
                      </span>
                      {eventIconBadge("hash", <>Event #{safeStr(row?.id || "-")}</>)}
                    </div>
                  </div>

                  <div style={{ marginTop: 14, display: "flex", gap: 8, flexWrap: "wrap", minWidth: 0 }}>
                    {eventIconBadge("user", <>Actor: {safeStr(row?.actor_user_id || "-")}</>)}
                    {eventIconBadge("user", <>Subject: {safeStr(row?.subject_user_id || "-")}</>)}
                    {safeStr(row?.loan_id) ? eventIconBadge("wallet", <>Loan #{safeStr(row?.loan_id)}</>) : null}
                    {safeStr(row?.payment_reference) ? eventIconBadge("card", <>Ref: {safeStr(row?.payment_reference)}</>) : null}
                  </div>

                  <div style={{ marginTop: 14, ...helperText(), color: "#0B1F33", minWidth: 0, overflowWrap: "anywhere", wordBreak: "break-word" }}>
                    {supportDisplayText(row?.reason || row?.note || "No short explanation was attached to this event yet.")}
                  </div>

                  <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 10 }}>
                    <SecondaryButton
                      onClick={() => {
                        void copyEvent(row);
                      }}
                      stableHeight={52}
                      debugId={`admin-trust-events.row.${rowKey}.copy`}
                      style={adminTrustEventActionStyle("secondary")}
                    >
                      {labelWithIcon("copy", "Copy event snapshot")}
                    </SecondaryButton>
                    <SubtleButton
                      onClick={() => toggleRow(rowKey)}
                      stableHeight={52}
                      debugId={`admin-trust-events.row.${rowKey}.toggle`}
                      style={adminTrustEventCollapseStyle()}
                    >
                      {labelWithIcon(detailOpen ? "chevronUp" : "chevronDown", detailOpen ? "Hide source details" : "Open source details")}
                    </SubtleButton>
                  </div>

                  {detailOpen ? (
                    <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
                      <div>{sectionLabelWithIcon("document", "Source event details")}</div>
                      <pre style={{ margin: "12px 0 0", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, color: "#334155", lineHeight: 1.7 }}>
                        {supportDisplayText(JSON.stringify(row, null, 2), "")}
                      </pre>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
