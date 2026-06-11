import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import GSNBrandMark from "../../components/GSNBrandMark";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../../components/GsnRealisticIcon";
import { PrimaryButton, StableCtaLink } from "../../components/StableButton";
import {
  TrustPaperSeal,
  TrustPaperWatermark,
} from "../../components/TrustPaperMarks";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalStatTile,
} from "../../lib/institutionalSurface";

export type TrustSlipVerifyQuickAnswer = [Gsn3DIconKey, string, string];

type CommunityConfirmationResult = {
  requests_sent?: number | null;
  active_member_count?: number | null;
  responses_received?: number | null;
  confirmed_known_count?: number | null;
  community_confidence?: string | null;
};

type CommunityConfirmationOutcome = {
  visible_summary?: string | null;
  requester_callback?: {
    requested?: boolean | null;
    channel?: string | null;
    contact_masked?: string | null;
    delivery_status?: string | null;
    delivery_note?: string | null;
    result_link_is_source_of_truth?: boolean | null;
  } | null;
};

export type CommunityConfirmationCallbackDraft = {
  requesterExternalLabel?: string;
  callbackChannel?: "none" | "sms" | "whatsapp";
  callbackContact?: string;
  callbackConsent?: boolean;
};

type TrustSlipVerifyPublicPaperProps = {
  compact: boolean;
  validNow: boolean;
  publicValidityLabel: string;
  bannerDetail: string;
  profileImageUrl?: string | null;
  holderName: string;
  gsnId: string;
  communityLabel: string;
  visibleBand: string;
  visibleBandLabel: string;
  visibleBandMeaning: string;
  visibleEvidenceLabel: string;
  publicVisibleScore: string;
  compactTrustLimit: string;
  issuedAtLabel: string;
  expiresAtLabel: string;
  resolvedCode: string;
  verifyPath: string;
  verifyUrl: string;
  quickTrustAnswers: TrustSlipVerifyQuickAnswer[];
  communityRelayAvailable: boolean;
  communityPulseAvailable: boolean;
  communityConfirmationText: string;
  communityConfirmationRows: Array<[string, string]>;
  confirmationOutcome: CommunityConfirmationOutcome | null;
  confirmationResult: CommunityConfirmationResult | null;
  confirmationPublicPath: string;
  confirmationBusy: boolean;
  canRequestCommunityPulse: boolean;
  onRequestCommunityPulse: (draft?: CommunityConfirmationCallbackDraft) => void;
  publicActions: React.ReactNode;
};

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

function rowValue(rows: Array<[string, string]>, label: string): string {
  return rows.find(([name]) => name === label)?.[1] || "";
}

function positiveNumber(value: unknown): number {
  const n = Number(safeText(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function lockedActionFrame(compact: boolean): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateRows: "auto auto",
    gap: 10,
    alignSelf: "stretch",
    minHeight: compact ? 194 : 214,
    overflowAnchor: "none",
    transition: "none",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
  };
}

function fieldLabel(): React.CSSProperties {
  return {
    color: "#475569",
    fontSize: 11,
    fontWeight: 1000,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function textInput(): React.CSSProperties {
  return {
    width: "100%",
    minWidth: 0,
    boxSizing: "border-box",
    borderRadius: 14,
    border: "1px solid rgba(8,35,58,0.16)",
    background: "#FFFFFF",
    color: "#07172C",
    padding: "12px 13px",
    fontSize: 15,
    fontWeight: 800,
    outline: "none",
  };
}

function selectInput(): React.CSSProperties {
  return {
    ...textInput(),
    appearance: "auto",
  };
}

function statTile(
  bg = "#FFFFFF",
  border = "1px solid rgba(11,31,51,0.08)"
): React.CSSProperties {
  return {
    ...institutionalStatTile(
      bg,
      border === "1px solid rgba(11,31,51,0.08)"
        ? "1px solid rgba(37,78,119,0.12)"
        : border
    ),
    borderRadius: 16,
    padding: 12,
    minHeight: "auto",
  };
}

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 14,
    background: bg,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    letterSpacing: 0,
    fontWeight: 1000,
    textTransform: "uppercase",
    color: "#526579",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14,
    lineHeight: 1.55,
    fontWeight: 760,
  };
}

function paperStatusPill(status: string): React.CSSProperties {
  const text = safeText(status).toLowerCase();
  const positive =
    text.includes("strong") ||
    text.includes("valid") ||
    text.includes("verified") ||
    text.includes("active");
  const caution =
    text.includes("caution") ||
    text.includes("mixed") ||
    text.includes("limited") ||
    text.includes("pending") ||
    text.includes("not");

  return {
    borderRadius: 10,
    padding: "6px 10px",
    minHeight: 28,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: positive ? "#EEF9F1" : caution ? "#FFF7E6" : "#FEF2F2",
    color: positive ? "#166534" : caution ? "#92400E" : "#991B1B",
    border: `1px solid ${
      positive
        ? "rgba(46,155,98,0.2)"
        : caution
          ? "rgba(245,158,11,0.2)"
          : "rgba(220,38,38,0.2)"
    }`,
    fontSize: 12,
    fontWeight: 950,
    textAlign: "center",
  };
}

function publicVerifyPaperShell(compact: boolean): React.CSSProperties {
  return {
    ...institutionalPageCard("#FFFFFF"),
    borderRadius: compact ? 20 : 28,
    padding: 0,
    border: "1px solid rgba(37,78,119,0.16)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
    background: "#FFFFFF",
  };
}

function publicVerifyShell(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...publicVerifyPanel(bg),
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
  };
}

function publicVerifyHero(compact: boolean): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    display: "grid",
    gridTemplateColumns: compact ? "128px minmax(0, 1fr)" : "190px minmax(0, 1fr)",
    gap: compact ? 14 : 24,
    alignItems: "center",
    minHeight: compact ? 176 : 220,
    padding: compact ? "22px 20px 30px" : "34px 44px 42px",
    background: "linear-gradient(135deg, #061827 0%, #082A48 100%)",
    color: "#FFFFFF",
  };
}

function officialPaperWatermark(compact: boolean): React.ReactNode {
  return (
    <div
      className="print-watermark"
      aria-hidden="true"
      style={{
        position: "absolute",
        top: compact ? -34 : -42,
        right: compact ? -54 : -26,
        opacity: 0.055,
        pointerEvents: "none",
        transform: "rotate(-7deg)",
        zIndex: 0,
      }}
    >
      <GSNBrandMark width={compact ? 132 : 190} height={compact ? 166 : 238} />
    </div>
  );
}

function publicVerifyPanel(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: 14,
    background: bg,
    border: "1px solid rgba(37,78,119,0.11)",
    boxShadow: "0 10px 26px rgba(7,23,44,0.05)",
  };
}

function paperMiniRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "34px minmax(0, 1fr)",
    gap: 10,
    alignItems: "start",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.35,
  };
}

function paperIconBadge(
  name: Gsn3DIconKey,
  tone: "trust" | "warning" | "neutral" = "trust",
  size = 32
): React.ReactNode {
  const meta = {
    trust: {
      color: "#7A4A00",
      bg: "rgba(255,255,255,0.97)",
      border: "rgba(226,192,106,0.36)",
    },
    warning: {
      color: "#8A4B08",
      bg: "linear-gradient(180deg, #FFFDF6 0%, #FFF7DB 100%)",
      border: "rgba(217,149,36,0.24)",
    },
    neutral: {
      color: "#0B63D1",
      bg: "rgba(255,255,255,0.97)",
      border: "rgba(13,95,168,0.14)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: 11,
        display: "inline-grid",
        placeItems: "center",
        color: meta.color,
        background: meta.bg,
        border: `1px solid ${meta.border}`,
        boxShadow:
          "0 8px 16px rgba(7,23,44,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <GsnRealisticIcon
        name={name}
        size={Math.max(28, Math.round(size * 0.88))}
        decorative
        imageStyle={{ width: "96%", height: "96%" }}
      />
    </span>
  );
}

function paperDataRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) auto",
    gap: 10,
    alignItems: "center",
    padding: "8px 0",
    borderBottom: "1px solid rgba(216,227,238,0.72)",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
  };
}

export default function TrustSlipVerifyPublicPaper({
  compact,
  validNow,
  publicValidityLabel,
  bannerDetail,
  profileImageUrl,
  holderName,
  gsnId,
  communityLabel,
  visibleBand,
  visibleBandLabel,
  visibleBandMeaning,
  visibleEvidenceLabel,
  publicVisibleScore,
  compactTrustLimit,
  issuedAtLabel,
  expiresAtLabel,
  resolvedCode,
  verifyPath,
  verifyUrl,
  quickTrustAnswers,
  communityRelayAvailable,
  communityPulseAvailable,
  communityConfirmationText,
  communityConfirmationRows,
  confirmationOutcome,
  confirmationResult,
  confirmationPublicPath,
  confirmationBusy,
  canRequestCommunityPulse,
  onRequestCommunityPulse,
  publicActions,
}: TrustSlipVerifyPublicPaperProps) {
  const [requesterLabel, setRequesterLabel] = useState("");
  const [callbackChannel, setCallbackChannel] =
    useState<CommunityConfirmationCallbackDraft["callbackChannel"]>("none");
  const [callbackContact, setCallbackContact] = useState("");
  const [callbackConsent, setCallbackConsent] = useState(false);
  const activeMemberCount = positiveNumber(rowValue(communityConfirmationRows, "Active members"));
  const eligibleResponsePool = positiveNumber(rowValue(communityConfirmationRows, "Eligible response pool"));
  const requestLockedReason = !canRequestCommunityPulse
    ? "This paper does not have a usable TrustSlip code yet. Refresh the TrustSlip before asking for live community confirmation."
    : !communityPulseAvailable && eligibleResponsePool <= 0
      ? `GSN can see ${activeMemberCount || "the"} active member${activeMemberCount === 1 ? "" : "s"}, but no eligible responders are set up for this public check yet. A community owner must enable confirmation contacts before this button can open.`
      : !communityPulseAvailable
        ? "Community confirmation is not enabled for this paper yet. Open the community record and check the public community status first."
        : "";
  const callbackNeedsConsent = callbackChannel !== "none" && safeText(callbackContact);
  const callbackBlocked = Boolean(callbackNeedsConsent && !callbackConsent);
  const requesterCallback = confirmationOutcome?.requester_callback || null;

  return (
    <section
      className="print-trust-document"
      style={publicVerifyPaperShell(compact)}
    >
      {officialPaperWatermark(compact)}
      <header style={publicVerifyHero(compact)}>
        <TrustPaperWatermark
          name="globe"
          color="#EAF3FF"
          size={compact ? 180 : 260}
          opacity={0.09}
          style={{ top: compact ? 12 : 8, right: compact ? -78 : -42, bottom: "auto" }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "grid",
            gridTemplateColumns: "54px minmax(0, 1fr)",
            gap: 10,
            alignItems: "center",
            borderRight: "1px solid rgba(255,255,255,0.16)",
            paddingRight: compact ? 10 : 20,
          }}
        >
          <span
            aria-hidden
            style={{
              width: 54,
              height: 54,
              borderRadius: 12,
              border: "1px solid rgba(246,215,122,0.55)",
              color: "#F6D77A",
              display: "grid",
              placeItems: "center",
            }}
          >
            <GsnRealisticIcon name="trust-shield" size={46} decorative />
          </span>
          <div
            style={{
              color: "#FFFFFF",
              fontSize: compact ? 13 : 17,
              lineHeight: 1.08,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Global<br />Support<br />Network
          </div>
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: 26,
              padding: "5px 12px",
              borderRadius: 8,
              background: "rgba(246,215,122,0.14)",
              color: "#F6D77A",
              fontSize: compact ? 10 : 12,
              fontWeight: 1000,
              textTransform: "uppercase",
            }}
          >
            Public verification paper
          </div>
          <h1
            style={{
              margin: "12px 0 0",
              color: "#FFFFFF",
              fontSize: compact ? 36 : 58,
              lineHeight: 1,
              fontWeight: 1000,
              fontFamily: "Georgia, 'Times New Roman', serif",
            }}
          >
            TrustSlip Verify
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: 520,
              color: "#DCE8F4",
              fontSize: compact ? 15 : 20,
              lineHeight: 1.35,
              fontWeight: 760,
            }}
          >
            A public GSN trust check for identity, support, trade, and careful decision-making.
          </p>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 12,
              alignItems: "center",
              color: "#F6D77A",
              fontWeight: 1000,
              textTransform: "uppercase",
              fontSize: compact ? 12 : 15,
            }}
          >
            <span style={{ color: "#FFFFFF" }}>GSN</span>
            <span>Open</span>
            <span>Trust</span>
            <span>Impact</span>
          </div>
        </div>
      </header>

      <div
        style={{
          padding: compact ? "0 14px 16px" : "0 36px 26px",
          transform: "translateY(-24px)",
          marginBottom: -12,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={publicVerifyShell("#F8FBFF")}>
          <TrustPaperWatermark
            name={validNow ? "shield" : "lock"}
            color="#FFFFFF"
            size={170}
            opacity={0.12}
            style={{ top: 0, right: -44, bottom: "auto" }}
          />
          <div
            style={{
              borderRadius: 16,
              minHeight: compact ? 90 : 112,
              padding: compact ? "16px 18px" : "20px 28px",
              background: validNow
                ? "linear-gradient(135deg, #166534 0%, #2E9B62 100%)"
                : "linear-gradient(135deg, #7C2D12 0%, #8B2C13 100%)",
              color: "#FFFFFF",
              boxShadow: "0 16px 34px rgba(124,45,18,0.22)",
              display: "grid",
              gridTemplateColumns: compact ? "54px minmax(0, 1fr)" : "84px minmax(0, 1fr) 86px",
              gap: compact ? 14 : 18,
              alignItems: "center",
            }}
          >
            <span
              aria-hidden
              style={{
                width: compact ? 54 : 70,
                height: compact ? 54 : 70,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.18)",
              }}
            >
              <GsnRealisticIcon
                name="trust-shield"
                size={compact ? 44 : 58}
                decorative
              />
            </span>
            <div
              style={{
                fontSize: compact ? 20 : 30,
                lineHeight: 1.12,
                fontWeight: 1000,
                textTransform: "uppercase",
              }}
            >
              {publicValidityLabel}
            </div>
            {!compact ? (
              <GsnRealisticIcon
                name={validNow ? "trust-shield" : "vault-safe"}
                size={70}
                decorative
              />
            ) : null}
          </div>

          <div
            style={{
              ...publicVerifyPanel("#FFF8E8"),
              marginTop: 14,
              borderLeft: "4px solid #D6AA45",
              display: "grid",
              gridTemplateColumns: compact ? "44px minmax(0, 1fr)" : "64px minmax(0, 1fr)",
              gap: 14,
              alignItems: "center",
            }}
          >
            <span
              aria-hidden
              style={{
                width: compact ? 44 : 58,
                height: compact ? 44 : 58,
                borderRadius: 999,
                display: "grid",
                placeItems: "center",
                color: "#B7791F",
                border: "2px solid rgba(214,170,69,0.45)",
              }}
            >
              <GsnRealisticIcon
                name="records-folder"
                size={compact ? 38 : 48}
                decorative
              />
            </span>
            <div>
              <div style={{ color: "#07172C", fontSize: compact ? 17 : 21, fontWeight: 1000 }}>
                Use with care.
              </div>
              <p
                style={{
                  margin: "5px 0 0",
                  color: "#334155",
                  fontSize: compact ? 14 : 16,
                  lineHeight: 1.35,
                  fontWeight: 850,
                }}
              >
                Ask the holder to refresh their TrustSlip in GSN and share the new public code or QR before relying on it.
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "0.92fr 1fr",
              gap: 12,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <div>
                  <div style={{ ...sectionLabel(), color: "#0B63D1" }}>GSN TrustSlip Verify</div>
                  <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    Public Verification Summary
                  </div>
                </div>
                <TrustPaperSeal compact />
              </div>

              <div
                style={{
                  marginTop: 12,
                  borderRadius: 14,
                  padding: "12px 14px",
                  background: validNow ? "#EAF7EE" : "#FFF7E6",
                  color: validNow ? "#166534" : "#92400E",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontWeight: 1000,
                }}
              >
                {paperIconBadge("trust-shield", validNow ? "trust" : "warning", 38)}
                <span>
                  {publicValidityLabel}
                  <span style={{ display: "block", fontSize: 12, fontWeight: 850 }}>
                    {validNow ? "This TrustSlip is currently valid." : bannerDetail}
                  </span>
                </span>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "54px 1fr", gap: 10 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: "#EAF3FF",
                    overflow: "hidden",
                    position: "relative",
                    display: "grid",
                    placeItems: "center",
                    color: "#0B63D1",
                    fontWeight: 1000,
                  }}
                >
                  {profileImageUrl ? (
                    <img
                      src={profileImageUrl}
                      alt={`${holderName} profile`}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : (
                    holderName.slice(0, 2).toUpperCase()
                  )}
                </div>
                <div>
                  <div style={{ ...sectionLabel(), color: "#64748B" }}>Holder</div>
                  <div style={{ color: "#07172C", fontWeight: 1000 }}>{holderName}</div>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 800 }}>
                    GSN ID: {gsnId}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 12, fontWeight: 800 }}>
                    Community: {communityLabel}
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Trust reading</div>
                  <div style={{ marginTop: 6, color: "#A62626", fontSize: 28, fontWeight: 1000 }}>
                    Grade {visibleBand}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    {visibleBandLabel}
                  </div>
                  <div style={{ marginTop: 4, color: "#64748B", fontSize: 11, fontWeight: 760 }}>
                    {visibleBandMeaning}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Visible score</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontSize: 24, fontWeight: 1000 }}>
                    {publicVisibleScore}
                  </div>
                  <div style={{ color: "#64748B", fontSize: 11, fontWeight: 800 }}>
                    {visibleEvidenceLabel}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Trust limit</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                    {compactTrustLimit}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Validity</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {issuedAtLabel} issued
                  </div>
                  <div style={{ color: "#07172C", fontSize: 13, fontWeight: 950 }}>
                    {expiresAtLabel} expires
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 92px", gap: 10 }}>
                <div style={{ display: "grid", gap: 5, color: "#334155", fontSize: 12, fontWeight: 850 }}>
                  <span>Code: {resolvedCode || "Not available"}</span>
                  <span>Public link: {verifyPath || "Not available"}</span>
                </div>
                <div
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(37,78,119,0.16)",
                    background: "#FFFFFF",
                    padding: 6,
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  {verifyUrl ? (
                    <QRCodeSVG value={verifyUrl} size={78} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                  ) : (
                    <GsnRealisticIcon name="qr-record" size={58} decorative />
                  )}
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Public reader view</div>
              <h3 style={{ margin: "8px 0 0", color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                Quick trust answers
              </h3>
              <p style={{ ...helperText(), margin: "4px 0 0", fontSize: 12 }}>
                Plain-language summary for quick decisions.
              </p>

              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {quickTrustAnswers.map(([icon, title, answer]) => (
                  <div key={title} style={{ ...innerCard("#FFFFFF"), padding: 10 }}>
                    <div style={paperMiniRow()}>
                      {paperIconBadge(icon, "neutral")}
                      <div>
                        <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 13 }}>{title}</div>
                        <div style={{ marginTop: 3, color: "#64748B", fontWeight: 800, fontSize: 12 }}>
                          {answer}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, ...innerCard("#F8FBFF"), padding: 12 }}>
                <div style={{ ...sectionLabel(), color: "#07172C" }}>At a glance</div>
                {[
                  ["Visible band", visibleBand],
                  ["Visible score", publicVisibleScore],
                  ["Trust limit", compactTrustLimit],
                  ["Issued", issuedAtLabel],
                  ["Expires", expiresAtLabel],
                  ["Verification code", resolvedCode || "Not available"],
                ].map(([label, value]) => (
                  <div key={label} style={paperDataRow()}>
                    <span>{label}</span>
                    <strong style={{ color: "#07172C", textAlign: "right" }}>{value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              ...innerCard("#FFFFFF"),
              border: "1px solid rgba(216,227,238,0.9)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <TrustPaperWatermark
              name="community"
              color="#0B63D1"
              size={170}
              opacity={0.028}
              style={{ top: 24, right: -48, bottom: "auto" }}
            />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                <div>
                  <div style={{ ...sectionLabel(), color: "#0B63D1" }}>Instant community confirmation</div>
                  <h3 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                    Ask the community to confirm now.
                  </h3>
                </div>
                <span style={paperStatusPill(communityRelayAvailable ? "active" : "limited")}>
                  Live check {communityRelayAvailable ? "available" : "not available"}
                </span>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) minmax(260px, 0.72fr)",
                  gap: 12,
                }}
              >
                <div style={{ ...documentMetaCard("#F8FBFF"), position: "relative", overflow: "hidden" }}>
                  <TrustPaperWatermark
                    name="shield"
                    color="#2E9B62"
                    size={120}
                    opacity={0.035}
                    style={{ top: 18, right: 12, bottom: "auto" }}
                  />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ color: "#07172C", fontWeight: 1000 }}>
                      Response-based verification
                    </div>
                    <p style={{ margin: "8px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                      {communityConfirmationText}
                    </p>
                    <div style={{ marginTop: 10, color: "#64748B", fontSize: 12, fontWeight: 800, lineHeight: 1.4 }}>
                      GSN returns counts and outcome only. It does not publish member phone numbers.
                    </div>
                  </div>
                </div>

                <div style={{ ...documentMetaCard("#FFFFFF"), display: "grid", gap: 8 }}>
                  {communityConfirmationRows.map(([label, value]) => (
                    <div key={label} style={paperDataRow()}>
                      <span>{label}</span>
                      <strong style={{ color: "#07172C", textAlign: "right" }}>{value}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div
                style={{
                  marginTop: 12,
                  display: "grid",
                  gridTemplateColumns: compact ? "1fr" : "minmax(0, 0.76fr) minmax(260px, 0.42fr)",
                  gap: 12,
                  alignItems: "stretch",
                }}
              >
                <div style={{ ...documentMetaCard("#FFFFFF"), border: "1px solid rgba(11,99,209,0.14)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#07172C", fontWeight: 1000 }}>
                    {paperIconBadge("community-building", "trust", 38)}
                    Instant confirmation result
                  </div>
                  {confirmationOutcome ? (
                    <>
                      <p style={{ margin: "8px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                        {confirmationOutcome.visible_summary ||
                          "Community responses will appear as an aggregate result when members answer."}
                      </p>
                      <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <span style={paperStatusPill(firstTruthy(confirmationResult?.community_confidence, "Pending"))}>
                          Confidence: {firstTruthy(confirmationResult?.community_confidence, "Pending")}
                        </span>
                        <span style={paperStatusPill("limited")}>
                          Sent: {confirmationResult?.requests_sent ?? 0}
                        </span>
                        <span style={paperStatusPill("limited")}>
                          Responses: {confirmationResult?.responses_received ?? 0} of{" "}
                          {confirmationResult?.active_member_count ?? 0}
                        </span>
                        <span style={paperStatusPill("active")}>
                          Confirmed: {confirmationResult?.confirmed_known_count ?? 0}
                        </span>
                      </div>
                      {confirmationPublicPath ? (
                        <StableCtaLink
                          to={confirmationPublicPath}
                          kind="soft"
                          stableHeight={52}
                          debugId="trust-slip-verify.community-confirmation.open-outcome"
                          style={{ marginTop: 10, width: "100%" }}
                        >
                          Open public outcome paper
                        </StableCtaLink>
                      ) : null}
                    </>
                  ) : (
                    <p style={{ margin: "8px 0 0", color: "#64748B", fontWeight: 850, lineHeight: 1.45 }}>
                      {requestLockedReason ||
                        "No live community confirmation has been requested from this paper yet."}
                    </p>
                  )}
                </div>

                <div style={lockedActionFrame(compact)}>
                  <div
                    style={{
                      ...documentMetaCard("#F8FBFF"),
                      border: "1px solid rgba(11,99,209,0.14)",
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div>
                      <div style={{ color: "#07172C", fontWeight: 1000 }}>
                        Result return channel
                      </div>
                      <p style={{ margin: "6px 0 0", color: "#64748B", fontWeight: 850, lineHeight: 1.45 }}>
                        GSN creates the result link first. Add SMS or WhatsApp only when you want a return notice later.
                      </p>
                    </div>

                    <label style={{ display: "grid", gap: 6 }}>
                      <span style={fieldLabel()}>Requester label</span>
                      <input
                        value={requesterLabel}
                        onChange={(event) => setRequesterLabel(event.target.value)}
                        placeholder="Merchant counter check"
                        maxLength={120}
                        style={textInput()}
                      />
                    </label>

                    <div style={{ display: "grid", gridTemplateColumns: compact ? "1fr" : "0.62fr 1fr", gap: 8 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={fieldLabel()}>Optional return</span>
                        <select
                          value={callbackChannel}
                          onChange={(event) => {
                            const next = event.target.value as CommunityConfirmationCallbackDraft["callbackChannel"];
                            setCallbackChannel(next);
                            if (next === "none") {
                              setCallbackConsent(false);
                              setCallbackContact("");
                            }
                          }}
                          style={selectInput()}
                        >
                          <option value="none">Result link only</option>
                          <option value="sms">SMS later</option>
                          <option value="whatsapp">WhatsApp later</option>
                        </select>
                      </label>

                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={fieldLabel()}>Business number</span>
                        <input
                          value={callbackContact}
                          onChange={(event) => setCallbackContact(event.target.value)}
                          placeholder="Preferably +E164 format"
                          disabled={callbackChannel === "none"}
                          maxLength={64}
                          style={{
                            ...textInput(),
                            opacity: callbackChannel === "none" ? 0.62 : 1,
                          }}
                        />
                      </label>
                    </div>

                    {callbackChannel !== "none" ? (
                      <label
                        style={{
                          display: "flex",
                          gap: 8,
                          alignItems: "flex-start",
                          color: "#334155",
                          fontSize: 12,
                          fontWeight: 850,
                          lineHeight: 1.4,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={callbackConsent}
                          onChange={(event) => setCallbackConsent(event.target.checked)}
                          style={{ marginTop: 2 }}
                        />
                        <span>
                          I agree that this business number can receive this confirmation result when SMS or WhatsApp delivery is configured.
                        </span>
                      </label>
                    ) : null}

                    {requesterCallback?.requested ? (
                      <div style={paperStatusPill("limited")}>
                        {firstTruthy(requesterCallback.channel, "Callback")} captured, contact {firstTruthy(requesterCallback.contact_masked, "masked")}. {firstTruthy(requesterCallback.delivery_status, "not configured")}
                      </div>
                    ) : null}
                  </div>

                  <PrimaryButton
                    type="button"
                    onClick={() =>
                      onRequestCommunityPulse({
                        requesterExternalLabel: requesterLabel,
                        callbackChannel,
                        callbackContact,
                        callbackConsent,
                      })
                    }
                    busy={confirmationBusy}
                    busyLabel="Requesting..."
                    fullWidth
                    stableHeight={56}
                    debugId="trust-slip-verify.community-confirmation.request"
                    disabled={Boolean(requestLockedReason) || callbackBlocked}
                  >
                    Request instant confirmation
                  </PrimaryButton>
                  {callbackBlocked ? (
                    <div style={{ ...documentMetaCard("#FFF7E6"), border: "1px solid rgba(245,158,11,0.24)" }}>
                      <div style={{ color: "#92400E", fontWeight: 1000, fontSize: 13 }}>
                        Consent needed
                      </div>
                      <p style={{ margin: "7px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                        Keep result-link only, or tick consent before adding a return number.
                      </p>
                    </div>
                  ) : null}
                  {requestLockedReason ? (
                    <div
                      style={{
                        ...documentMetaCard("#FFF7E6"),
                        border: "1px solid rgba(245,158,11,0.24)",
                      }}
                    >
                      <div style={{ color: "#92400E", fontWeight: 1000, fontSize: 13 }}>
                        Why this is locked
                      </div>
                      <p style={{ margin: "7px 0 0", color: "#334155", fontWeight: 850, lineHeight: 1.45 }}>
                        {requestLockedReason}
                      </p>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {publicActions}
        </div>
      </div>

      <footer
        style={{
          position: "relative",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: compact ? "58px minmax(0, 1fr)" : "86px minmax(0, 1fr) 80px",
          gap: 18,
          alignItems: "center",
          padding: compact ? "18px 22px" : "24px 44px",
          background: "linear-gradient(135deg, #061827 0%, #082A48 100%)",
          color: "#FFFFFF",
        }}
      >
        <span
          aria-hidden
          style={{
            width: 58,
            height: 58,
            borderRadius: 14,
            border: "1px solid rgba(246,215,122,0.5)",
            color: "#F6D77A",
            display: "grid",
            placeItems: "center",
          }}
        >
          <GsnRealisticIcon name="trust-shield" size={50} decorative />
        </span>
        <div>
          <div style={{ color: "#F6D77A", fontSize: compact ? 15 : 18, fontWeight: 1000 }}>
            GSN Trust Architecture
          </div>
          <div style={{ marginTop: 4, color: "#DCE8F4", fontSize: compact ? 13 : 16, lineHeight: 1.35, fontWeight: 780 }}>
            public evidence first, private detail protected, decision left with the reader.
          </div>
        </div>
        {!compact ? <GsnRealisticIcon name="public-globe" size={66} decorative /> : null}
      </footer>
    </section>
  );
}
