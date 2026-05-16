import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton, StableDisclosureSummary } from "../components/StableButton";
import {
  TrustPaperIcon,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import { getPublicCommunityVerification, safeCopy } from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

type CommunityVerifyRecord = {
  community_name?: string | null;
  community_id?: number | string | null;
  community_code?: string | null;
  status?: string | null;
  description?: string | null;
  active_member_count?: number | string | null;
  relay_available?: boolean | null;
  instant_pulse_available?: boolean | null;
  public_policy?: string | null;
  hidden_by_design?: string[] | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function asNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function labelize(value: any): string {
  const text = safeStr(value).replace(/[_-]+/g, " ");
  if (!text) return "Not shown";
  return text.replace(/\b\w/g, (char) => char.toUpperCase());
}

function normalizeRecord(raw: any): CommunityVerifyRecord {
  const src = raw?.community || raw?.data || raw || {};
  return {
    community_name: firstTruthy(src.community_name, src.name),
    community_id: src.community_id ?? src.id ?? null,
    community_code: firstTruthy(src.community_code),
    status: firstTruthy(src.status),
    description: firstTruthy(src.description),
    active_member_count: src.active_member_count ?? null,
    relay_available: Boolean(src.relay_available),
    instant_pulse_available: Boolean(src.instant_pulse_available),
    public_policy: firstTruthy(src.public_policy),
    hidden_by_design: Array.isArray(src.hidden_by_design) ? src.hidden_by_design : [],
  };
}

function pageShell(): React.CSSProperties {
  return {
    maxWidth: 1080,
    margin: "0 auto",
    padding: "20px 16px 42px",
    display: "grid",
    gap: 16,
  };
}

function paperCard(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 28,
    background: "#FFFFFF",
    border: "1px solid rgba(8,35,58,0.14)",
    boxShadow: "0 24px 70px rgba(6,24,39,0.14)",
  };
}

function sectionCard(background = "#FFFFFF"): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    borderRadius: 22,
    background,
    border: "1px solid rgba(8,35,58,0.12)",
    padding: 16,
    boxShadow: "0 10px 28px rgba(6,24,39,0.06)",
  };
}

function sectionTitle(): React.CSSProperties {
  return {
    margin: 0,
    color: "#07172C",
    fontSize: 20,
    fontWeight: 1000,
    lineHeight: 1.16,
  };
}

function helperText(): React.CSSProperties {
  return {
    margin: 0,
    color: "#526579",
    fontSize: 14,
    fontWeight: 780,
    lineHeight: 1.5,
  };
}

function badgeStyle(tone: "good" | "warn" | "info" = "info"): React.CSSProperties {
  const map = {
    good: ["#EAF7EE", "#166534", "rgba(46,155,98,0.22)"],
    warn: ["#FFF7E6", "#92400E", "rgba(245,158,11,0.24)"],
    info: ["#EAF3FF", "#073E83", "rgba(11,99,209,0.18)"],
  } as const;
  const [bg, color, border] = map[tone];
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 7,
    width: "fit-content",
    borderRadius: 999,
    padding: "7px 11px",
    background: bg,
    color,
    border: `1px solid ${border}`,
    fontSize: 13,
    fontWeight: 1000,
  };
}

export default function CommunityVerifyPage() {
  const { communityKey } = useParams<{ communityKey: string }>();
  const [record, setRecord] = useState<CommunityVerifyRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const keyText = safeStr(communityKey);
  const publicLink = useMemo(
    () => publicFrontendUrl(`/verify/community/${encodeURIComponent(keyText)}`),
    [keyText]
  );

  const loadRecord = useCallback(async () => {
    if (!keyText) {
      setError("Community code is missing.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const result = await getPublicCommunityVerification(keyText);
      setRecord(normalizeRecord(result));
    } catch (err: any) {
      setRecord(null);
      setError(err?.message || "Community verification could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [keyText]);

  useEffect(() => {
    void loadRecord();
  }, [loadRecord]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function copyLink() {
    const copied = await safeCopy(publicLink);
    setNotice({
      tone: copied ? "success" : "error",
      text: copied ? "Community verification link copied." : "Copy failed. Use the browser address bar.",
    });
  }

  function printPage() {
    if (typeof window !== "undefined") window.print();
  }

  const communityName = firstTruthy(record?.community_name, "GSN community");
  const status = safeStr(record?.status).toLowerCase() || "unknown";
  const active = status === "active";
  const relayAvailable = Boolean(record?.relay_available);
  const instantAvailable = Boolean(record?.instant_pulse_available);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F7FAFF 0%, #EEF5FF 50%, #F8FAFC 100%)",
      }}
    >
      <div style={pageShell()}>
        <PageTopNav
          sectionLabel="GSN verification"
          title="Community Verify"
          subtitle="Check whether this community exists in GSN and whether member confirmation can be requested safely."
          homeTo="/"
          homeLabel="Home"
          backTo="/"
          backLabel="Back"
        />

        <article style={paperCard()}>
          <TrustPaperWatermark name="home" color="#0B63D1" size={260} opacity={0.045} />
          <div style={{ position: "relative", zIndex: 1, padding: 22, display: "grid", gap: 16 }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 16,
                alignItems: "flex-start",
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "grid", gap: 6 }}>
                <span
                  style={{
                    color: "#0B63D1",
                    fontSize: 12,
                    fontWeight: 1000,
                    letterSpacing: 0.9,
                    textTransform: "uppercase",
                  }}
                >
                  Public Community Record
                </span>
                <h1
                  style={{
                    margin: 0,
                    color: "#061827",
                    fontSize: "clamp(30px, 7vw, 54px)",
                    lineHeight: 0.98,
                    fontWeight: 1000,
                    letterSpacing: 0,
                  }}
                >
                  {loading ? "Checking community" : communityName}
                </h1>
                <p style={{ ...helperText(), maxWidth: 680 }}>
                  This page verifies the community itself. It does not publish the member list,
                  raw phone numbers, or private sponsor details.
                </p>
              </div>
              <div
                aria-label="GSN Global Support Network"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  color: "#061827",
                  fontWeight: 1000,
                }}
              >
                <span style={{ fontSize: 36, lineHeight: 1 }}>GSN</span>
                <span style={{ width: 2, height: 38, background: "#D6AA45", transform: "skew(-14deg)" }} />
                <span style={{ fontSize: 13, lineHeight: 1.05 }}>
                  Global
                  <br />
                  Support
                  <br />
                  Network
                </span>
              </div>
            </header>

            {notice ? (
              <div
                role="status"
                style={{
                  ...sectionCard(notice.tone === "success" ? "#ECFDF3" : "#FEF2F2"),
                  color: notice.tone === "success" ? "#166534" : "#991B1B",
                  fontWeight: 1000,
                }}
              >
                {notice.text}
              </div>
            ) : null}

            {loading ? (
              <section style={sectionCard("#F7FAFF")}>
                <h2 style={sectionTitle()}>Loading community record</h2>
                <p style={helperText()}>GSN is checking the public community verification route.</p>
              </section>
            ) : error ? (
              <section style={sectionCard("#FEF2F2")}>
                <h2 style={sectionTitle()}>Community not found</h2>
                <p style={helperText()}>{error}</p>
                <PrimaryButton
                  debugId="community-verify.retry"
                  stableHeight={58}
                  onClick={() => void loadRecord()}
                  style={{ marginTop: 14 }}
                >
                  Try again
                </PrimaryButton>
              </section>
            ) : record ? (
              <>
                <section
                  style={{
                    ...sectionCard(active ? "#ECFDF3" : "#FFF7E6"),
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 16,
                    alignItems: "center",
                  }}
                >
                  <TrustPaperWatermark
                    name={active ? "check" : "alert"}
                    color={active ? "#2E9B62" : "#D6AA45"}
                    size={150}
                    opacity={0.08}
                  />
                  <div style={{ display: "grid", gap: 10 }}>
                    <span style={badgeStyle(active ? "good" : "warn")}>
                      <TrustPaperIcon name={active ? "check" : "alert"} size={18} />
                      {labelize(status)}
                    </span>
                    <h2 style={{ ...sectionTitle(), fontSize: "clamp(25px, 6vw, 42px)" }}>
                      {active ? "Community record is active" : "Community record needs caution"}
                    </h2>
                    <p style={{ ...helperText(), color: "#1F3145", maxWidth: 720 }}>
                      {active
                        ? "This community is visible in GSN. A reader may request member confirmation through the controlled relay when the policy allows it."
                        : "This community is visible, but its current status is not active. Ask for more evidence before relying on it."}
                    </p>
                  </div>
                  <div
                    style={{
                      width: 112,
                      height: 112,
                      borderRadius: 32,
                      display: "grid",
                      placeItems: "center",
                      color: "#FFFFFF",
                      background: "linear-gradient(135deg,#0B63D1,#073E83)",
                      boxShadow: "0 18px 34px rgba(6,24,39,0.16)",
                    }}
                  >
                    <TrustPaperIcon name="community" size={62} strokeWidth={1.8} />
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                    gap: 12,
                  }}
                >
                  <Stat label="Active members" value={asNumber(record.active_member_count)} icon="community" />
                  <StatusTile
                    label="Relay available"
                    value={relayAvailable ? "Yes" : "No"}
                    good={relayAvailable}
                    icon="shield"
                  />
                  <StatusTile
                    label="Instant pulse"
                    value={instantAvailable ? "Yes" : "No"}
                    good={instantAvailable}
                    icon="refresh"
                  />
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: 14,
                  }}
                >
                  <div style={sectionCard("#FFFFFF")}>
                    <h2 style={sectionTitle()}>Community identity</h2>
                    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                      <InfoRow label="Community name" value={communityName} />
                      <InfoRow label="Community ID" value={firstTruthy(record.community_code, record.community_id)} />
                      <InfoRow label="Status" value={labelize(record.status)} />
                    </div>
                  </div>
                  <div style={sectionCard("#F8FBFF")}>
                    <h2 style={sectionTitle()}>Public policy</h2>
                    <p style={{ ...helperText(), color: "#1F3145", marginTop: 10 }}>
                      {record.public_policy ||
                        "Member confirmation is available only through GSN relay when enabled. Private contact details are not publicly exposed."}
                    </p>
                  </div>
                </section>

                <section style={sectionCard("#ECFDF3")}>
                  <TrustPaperWatermark name="shield" color="#2E9B62" size={132} opacity={0.08} />
                  <h2 style={sectionTitle()}>What this community page proves</h2>
                  <ul style={{ ...helperText(), margin: "12px 0 0", paddingLeft: 20 }}>
                    <li>The community has a visible GSN record.</li>
                    <li>The community status can be checked publicly.</li>
                    <li>Member confirmation can be routed through GSN when available.</li>
                    <li>Private member contacts stay protected by default.</li>
                  </ul>
                </section>

                <section style={sectionCard("#FFFFFF")}>
                  <h2 style={sectionTitle()}>Public actions</h2>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                      marginTop: 14,
                    }}
                  >
                    <PrimaryButton debugId="community-verify.refresh" stableHeight={64} onClick={() => void loadRecord()}>
                      <TrustPaperIcon name="refresh" size={20} />
                      Refresh record
                    </PrimaryButton>
                    <SecondaryButton debugId="community-verify.copy-link" stableHeight={64} onClick={() => void copyLink()}>
                      <TrustPaperIcon name="copy" size={20} />
                      Copy public link
                    </SecondaryButton>
                    <SecondaryButton debugId="community-verify.print" stableHeight={64} onClick={printPage}>
                      <TrustPaperIcon name="document" size={20} />
                      Print / Save PDF
                    </SecondaryButton>
                  </div>
                </section>

                <details style={sectionCard("#F8FBFF")}>
                  <StableDisclosureSummary
                    debugId="community-verify.protected-detail"
                    stableHeight={52}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      fontWeight: 1000,
                      color: "#07172C",
                    }}
                  >
                    <span>Protected information not shown publicly</span>
                    <span style={badgeStyle("info")}>Open / close</span>
                  </StableDisclosureSummary>
                  <ul style={{ ...helperText(), margin: "14px 0 0", paddingLeft: 20 }}>
                    {(record.hidden_by_design || []).map((item) => (
                      <li key={item}>{labelize(item)}</li>
                    ))}
                    {(record.hidden_by_design || []).length === 0 ? (
                      <li>Private member contact details are not shown on this page.</li>
                    ) : null}
                  </ul>
                </details>
              </>
            ) : null}
          </div>
          <TrustPaperSecurityFooter text="Community-first verification: public community record, private member details protected." />
        </article>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(110px, 0.75fr) minmax(0, 1fr)",
        gap: 12,
        alignItems: "start",
        borderBottom: "1px dashed rgba(8,35,58,0.12)",
        paddingBottom: 9,
      }}
    >
      <span style={{ color: "#617085", fontWeight: 900, lineHeight: 1.28 }}>{label}</span>
      <strong style={{ color: "#07172C", fontWeight: 1000, lineHeight: 1.28 }}>{value}</strong>
    </div>
  );
}

function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ComponentProps<typeof TrustPaperIcon>["name"];
}) {
  return (
    <div style={sectionCard("#F7FAFF")}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#073E83", fontWeight: 1000 }}>
        <TrustPaperIcon name={icon} size={19} />
        {label}
      </span>
      <strong style={{ display: "block", marginTop: 14, color: "#07172C", fontSize: 32, fontWeight: 1000, lineHeight: 1 }}>
        {value}
      </strong>
    </div>
  );
}

function StatusTile({
  label,
  value,
  good,
  icon,
}: {
  label: string;
  value: string;
  good: boolean;
  icon: React.ComponentProps<typeof TrustPaperIcon>["name"];
}) {
  return (
    <div style={sectionCard(good ? "#ECFDF3" : "#FFF7E6")}>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: good ? "#166534" : "#92400E", fontWeight: 1000 }}>
        <TrustPaperIcon name={icon} size={19} />
        {label}
      </span>
      <strong style={{ display: "block", marginTop: 14, color: "#07172C", fontSize: 28, fontWeight: 1000, lineHeight: 1 }}>
        {value}
      </strong>
    </div>
  );
}
