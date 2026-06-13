import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import {
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

function communityVerifyIconBadge(
  name: Gsn3DIconKey,
  size = 42,
  tone: "navy" | "blue" | "green" | "amber" = "navy"
): React.ReactElement {
  const palette = {
    navy: {
      color: "#EAF3FF",
      background:
        "radial-gradient(circle at 35% 24%, rgba(244,208,106,0.20) 0%, rgba(244,208,106,0.00) 34%), linear-gradient(180deg, rgba(28,76,122,0.98) 0%, rgba(7,28,47,0.98) 100%)",
      border: "1px solid rgba(196,216,238,0.22)",
    },
    blue: {
      color: "#EAF3FF",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #2367D1 0%, #0B3E78 100%)",
      border: "1px solid rgba(123,161,204,0.28)",
    },
    green: {
      color: "#ECFDF5",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #2E9B62 0%, #12653C 100%)",
      border: "1px solid rgba(167,243,208,0.28)",
    },
    amber: {
      color: "#FFF7E6",
      background:
        "radial-gradient(circle at 35% 24%, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.00) 34%), linear-gradient(180deg, #D6AA45 0%, #9A6817 100%)",
      border: "1px solid rgba(252,211,77,0.30)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size >= 34 ? 13 : 11,
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 9px 18px rgba(2,6,23,0.20), inset 0 1px 0 rgba(255,255,255,0.12)",
        ...palette,
      }}
    >
      <GsnRealisticIcon
        name={name}
        size={Math.max(30, Math.round(size * 0.9))}
        decorative
        imageStyle={{ width: "96%", height: "96%" }}
      />
    </span>
  );
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
      text: copied
        ? "GSN community verification link copied."
        : "Copy failed. Use the browser address bar.",
    });
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
                    fontSize: "clamp(28px, 6vw, 44px)",
                    lineHeight: 1.02,
                    fontWeight: 1000,
                    letterSpacing: 0,
                  }}
                >
                  {loading ? "Checking community" : "Community Verification"}
                </h1>
                <p style={{ ...helperText(), maxWidth: 680 }}>
                  Public QR check for community identity only.
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
                    gap: 12,
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
                      {communityVerifyIconBadge("trust-shield", 40, active ? "green" : "amber")}
                      {active ? "Active" : labelize(status)}
                    </span>
                    <span style={badgeStyle(relayAvailable ? "good" : "warn")}>
                      {communityVerifyIconBadge("public-globe", 40, relayAvailable ? "green" : "amber")}
                      {relayAvailability}
                    </span>
                  </div>
                  <h2 style={{ ...sectionTitle(), fontSize: "clamp(26px, 6vw, 44px)" }}>
                    {communityName}
                  </h2>
                  <p style={{ ...helperText(), color: "#1F3145", maxWidth: 720 }}>
                    This QR page confirms the community record only. It does not open member
                    records, contact details, or private trust history.
                  </p>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 10,
                    }}
                  >
                    <InfoTile
                      icon="records-folder"
                      label="Community ID"
                      value={firstTruthy(record.community_code, record.community_id)}
                    />
                    <InfoTile icon="trust-shield" label="Status" value={labelize(record.status)} />
                    <InfoTile icon="public-globe" label="Public record" value={publicRecord} />
                    <InfoTile icon="phone-contact" label="Relay" value={relayAvailability} />
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
                      gap: 12,
                    }}
                  >
                    <PrimaryButton
                      debugId="community-verify.request-confirmation"
                      stableHeight={58}
                      busy={requestingConfirmation}
                      busyLabel="Sending request"
                      disabled={!requestConfirmationAvailable || requestingConfirmation}
                      onClick={() => void requestConfirmation()}
                    >
                      {communityVerifyIconBadge("trust-shield", 42, "blue")}
                      Request confirmation
                    </PrimaryButton>
                    <SecondaryButton debugId="community-verify.copy-link" stableHeight={58} onClick={() => void copyLink()}>
                      {communityVerifyIconBadge("public-globe", 38, "navy")}
                      Copy link
                    </SecondaryButton>
                  </div>
                  <div
                    style={{
                      borderRadius: 18,
                      background: "#061827",
                      color: "#FFFFFF",
                      padding: 14,
                      display: "grid",
                      gap: 6,
                    }}
                  >
                    <h2 style={{ margin: 0, color: "#F2C766", fontSize: 18, fontWeight: 1000 }}>
                      Privacy protection
                    </h2>
                    <p style={{ ...helperText(), color: "#FFFFFF" }}>
                      Public viewers see the community record only. Confirmation requests go
                      through GSN controlled relay.
                    </p>
                  </div>
                  <SecondaryButton
                    debugId="community-verify.refresh"
                    stableHeight={52}
                    onClick={() => void loadRecord()}
                  >
                    {communityVerifyIconBadge("records-folder", 36, "navy")}
                    Refresh
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

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: Gsn3DIconKey;
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        minHeight: 92,
        borderRadius: 18,
        background: "#FFFFFF",
        border: "1px solid rgba(8,35,58,0.10)",
        padding: 12,
        display: "grid",
        gap: 8,
        alignContent: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {communityVerifyIconBadge(icon, 34)}
        <span style={{ color: "#617085", fontSize: 13, fontWeight: 900, lineHeight: 1.2 }}>
          {label}
        </span>
      </div>
      <strong style={{ color: "#07172C", fontSize: 17, fontWeight: 1000, lineHeight: 1.2 }}>
        {value}
      </strong>
    </div>
  );
}
