import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import {
  TrustPaperIcon,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
} from "../components/TrustPaperMarks";
import {
  getPublicCommunityVerification,
  requestPublicCommunityVerificationConfirmation,
  safeCopy,
} from "../lib/api";
import { publicFrontendUrl } from "../lib/publicLinks";

type CommunityVerifyRecord = {
  community_name?: string | null;
  community_id?: number | string | null;
  community_code?: string | null;
  status?: string | null;
  relay_available?: boolean | null;
  relay_availability?: string | null;
  public_record?: string | null;
  member_confirmation?: string | null;
  request_confirmation_available?: boolean | null;
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
    relay_available: Boolean(src.relay_available),
    relay_availability: firstTruthy(src.relay_availability),
    public_record: firstTruthy(src.public_record),
    member_confirmation: firstTruthy(src.member_confirmation),
    request_confirmation_available: Boolean(src.request_confirmation_available),
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
  const [requestingConfirmation, setRequestingConfirmation] = useState(false);
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
  const relayAvailability = firstTruthy(
    record?.relay_availability,
    relayAvailable ? "Available" : "Not available"
  );
  const publicRecord = firstTruthy(record?.public_record, "Verified in GSN");
  const memberConfirmation = firstTruthy(
    record?.member_confirmation,
    "By controlled request only"
  );
  const requestConfirmationAvailable = Boolean(record?.request_confirmation_available);

  async function requestConfirmation() {
    if (!requestConfirmationAvailable) {
      setNotice({
        tone: "error",
        text: "Controlled confirmation is not available for this community yet.",
      });
      return;
    }

    const requestKey = firstTruthy(record?.community_code, record?.community_id, keyText);
    if (!requestKey) {
      setNotice({
        tone: "error",
        text: "Community ID is missing. Refresh this public record first.",
      });
      return;
    }

    setRequestingConfirmation(true);
    try {
      const result = await requestPublicCommunityVerificationConfirmation(requestKey, {
        requester_external_label: "Public verification viewer",
      });
      setNotice({
        tone: "success",
        text:
          firstTruthy(result?.message) ||
          "Request sent through GSN controlled relay. Private member contacts were not exposed.",
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text:
          err?.message ||
          "Request could not be sent through the controlled relay. Try again from this page.",
      });
    } finally {
      setRequestingConfirmation(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #F7FAFF 0%, #EEF5FF 50%, #F8FAFC 100%)",
      }}
    >
      <div style={pageShell()}>
        <PageTopNav
          sectionLabel="Public verification"
          title="Community Verification"
          subtitle="Public community record"
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
                  Public community record
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
                  {loading ? "Checking community" : "Community Verification"}
                </h1>
                <p style={{ ...helperText(), maxWidth: 680 }}>
                  This page confirms the community exists in GSN. Private member details remain protected.
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
                    ...sectionCard("#F8FBFF"),
                    display: "grid",
                    gap: 14,
                  }}
                >
                  <TrustPaperWatermark
                    name="shield"
                    color="#0B63D1"
                    size={190}
                    opacity={0.08}
                  />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 14,
                      flexWrap: "wrap",
                    }}
                  >
                    <span style={badgeStyle(active ? "good" : "warn")}>
                      <TrustPaperIcon name={active ? "check" : "alert"} size={18} />
                      {active ? "Active" : labelize(status)}
                    </span>
                    <span style={badgeStyle(relayAvailable ? "good" : "warn")}>
                      <TrustPaperIcon name="shield" size={18} />
                      {relayAvailability}
                    </span>
                  </div>
                  <h2 style={{ ...sectionTitle(), fontSize: "clamp(26px, 6vw, 44px)" }}>
                    Verify this community before you rely on it.
                  </h2>
                  <p style={{ ...helperText(), color: "#1F3145", maxWidth: 720 }}>
                    This page confirms the community exists in GSN. The private member list, phone
                    numbers, sponsor details, and internal trust history are kept off this public page.
                  </p>
                </section>

                <section
                  style={{
                    ...sectionCard("#FFFFFF"),
                    padding: 0,
                  }}
                >
                  <div style={{ display: "grid", gap: 0 }}>
                    <InfoRow icon="community" label="Community name" value={communityName} />
                    <InfoRow
                      icon="document"
                      label="Community ID"
                      value={firstTruthy(record.community_code, record.community_id)}
                    />
                    <InfoRow icon="check" label="Status" value={labelize(record.status)} />
                    <InfoRow icon="shield" label="Public record" value={publicRecord} />
                    <InfoRow icon="community" label="Member confirmation" value={memberConfirmation} />
                    <InfoRow icon="refresh" label="Relay availability" value={relayAvailability} />
                  </div>
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
                    <SecondaryButton debugId="community-verify.copy-link" stableHeight={64} onClick={() => void copyLink()}>
                      <TrustPaperIcon name="copy" size={20} />
                      Copy verification link
                    </SecondaryButton>
                    <SecondaryButton debugId="community-verify.print" stableHeight={64} onClick={printPage}>
                      <TrustPaperIcon name="document" size={20} />
                      Save PDF
                    </SecondaryButton>
                    <PrimaryButton
                      debugId="community-verify.request-confirmation"
                      stableHeight={64}
                      busy={requestingConfirmation}
                      busyLabel="Sending request"
                      disabled={!requestConfirmationAvailable || requestingConfirmation}
                      onClick={() => void requestConfirmation()}
                    >
                      <TrustPaperIcon name="shield" size={20} />
                      Request confirmation
                    </PrimaryButton>
                  </div>
                </section>

                <section
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                    gap: 14,
                  }}
                >
                  <VisibilityCard
                    tone="show"
                    title="Show publicly"
                    items={[
                      "Community name",
                      "Community ID",
                      "Public status",
                      "Public verification state",
                      "Controlled request availability",
                    ]}
                  />
                  <VisibilityCard
                    tone="protect"
                    title="Keep protected"
                    items={
                      record.hidden_by_design?.length
                        ? record.hidden_by_design.map(labelize)
                        : [
                            "Full member list",
                            "Raw phone numbers",
                            "Sponsor details",
                            "Internal disputes",
                            "Private relay contacts",
                            "Internal trust history",
                          ]
                    }
                  />
                </section>

                <section style={sectionCard("#061827")}>
                  <TrustPaperWatermark name="shield" color="#D6AA45" size={150} opacity={0.09} />
                  <h2 style={{ ...sectionTitle(), color: "#F2C766" }}>Program logic</h2>
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <ProgramRule text="The public verification route returns whitelisted fields only." />
                    <ProgramRule text="Protected fields stay server-side unless the viewer is authorized." />
                    <ProgramRule text="Confirmation requests use controlled relay, not direct contact exposure." />
                  </div>
                  <SecondaryButton
                    debugId="community-verify.refresh"
                    stableHeight={56}
                    onClick={() => void loadRecord()}
                    style={{ marginTop: 16, color: "#FFFFFF", borderColor: "rgba(242,199,102,0.45)" }}
                  >
                    <TrustPaperIcon name="refresh" size={19} />
                    Refresh public record
                  </SecondaryButton>
                </section>
              </>
            ) : null}
          </div>
          <TrustPaperSecurityFooter text="Community-first verification: public community record, private member details protected." />
        </article>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ComponentProps<typeof TrustPaperIcon>["name"];
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "34px minmax(110px, 0.75fr) minmax(0, 1fr)",
        gap: 12,
        alignItems: "start",
        borderBottom: "1px solid rgba(8,35,58,0.1)",
        padding: "13px 16px",
      }}
    >
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          color: "#073E83",
          background: "#EAF3FF",
        }}
      >
        <TrustPaperIcon name={icon} size={17} />
      </span>
      <span style={{ color: "#617085", fontWeight: 900, lineHeight: 1.28 }}>{label}</span>
      <strong style={{ color: "#07172C", fontWeight: 1000, lineHeight: 1.28 }}>{value}</strong>
    </div>
  );
}

function VisibilityCard({
  tone,
  title,
  items,
}: {
  tone: "show" | "protect";
  title: string;
  items: string[];
}) {
  const show = tone === "show";
  return (
    <div style={sectionCard(show ? "#ECFDF3" : "#FFF7E6")}>
      <h2
        style={{
          margin: 0,
          display: "flex",
          alignItems: "center",
          gap: 9,
          color: show ? "#166534" : "#92400E",
          fontSize: 18,
          fontWeight: 1000,
          textTransform: "uppercase",
          letterSpacing: 0.8,
        }}
      >
        <TrustPaperIcon name={show ? "check" : "lock"} size={20} />
        {title}
      </h2>
      <div style={{ display: "grid", gap: 9, marginTop: 14 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#1F3145",
              fontWeight: 900,
              lineHeight: 1.25,
            }}
          >
            <TrustPaperIcon name={show ? "check" : "lock"} size={16} />
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function ProgramRule({ text }: { text: string }) {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        color: "#FFFFFF",
        fontSize: 14,
        fontWeight: 850,
        lineHeight: 1.35,
      }}
    >
      <span style={{ color: "#F2C766", flex: "0 0 auto" }}>
        <TrustPaperIcon name="check" size={17} />
      </span>
      {text}
    </span>
  );
}
