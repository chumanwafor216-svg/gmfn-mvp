import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { PrimaryButton, StableCtaLink } from "../../components/StableButton";
import {
  TrustPaperBadgeIcon,
  TrustPaperIcon,
  TrustPaperSeal,
  TrustPaperSecurityFooter,
  TrustPaperWatermark,
  type TrustPaperIconName,
} from "../../components/TrustPaperMarks";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalStatTile,
} from "../../lib/institutionalSurface";

export type TrustSlipVerifyQuickAnswer = [TrustPaperIconName, string, string];

type CommunityConfirmationResult = {
  requests_sent?: number | null;
  active_member_count?: number | null;
  responses_received?: number | null;
  confirmed_known_count?: number | null;
  community_confidence?: string | null;
};

type CommunityConfirmationOutcome = {
  visible_summary?: string | null;
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
  onRequestCommunityPulse: () => void;
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
    gridTemplateRows: compact ? "56px minmax(128px, auto)" : "56px minmax(148px, auto)",
    gap: 10,
    alignSelf: "stretch",
    minHeight: compact ? 194 : 214,
    overflowAnchor: "none",
    transition: "none",
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 26,
    padding: 20,
    backdropFilter: "blur(6px)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
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
    letterSpacing: 0.5,
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

function publicVerifyShell(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...innerCard(bg),
    border: "1px solid rgba(37,78,119,0.14)",
    position: "relative",
    overflow: "hidden",
    boxShadow: "0 16px 34px rgba(15,23,42,0.08)",
  };
}

function paperMiniRow(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "28px minmax(0, 1fr)",
    gap: 9,
    alignItems: "start",
    color: "#334155",
    fontSize: 13,
    fontWeight: 850,
    lineHeight: 1.35,
  };
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
  const activeMemberCount = positiveNumber(rowValue(communityConfirmationRows, "Active members"));
  const eligibleResponsePool = positiveNumber(rowValue(communityConfirmationRows, "Eligible response pool"));
  const requestLockedReason = !canRequestCommunityPulse
    ? "This paper does not have a usable TrustSlip code yet. Refresh the TrustSlip before asking for live community confirmation."
    : !communityPulseAvailable && eligibleResponsePool <= 0
      ? `GSN can see ${activeMemberCount || "the"} active member${activeMemberCount === 1 ? "" : "s"}, but no eligible responders are set up for this public check yet. A community owner must enable confirmation contacts before this button can open.`
      : !communityPulseAvailable
        ? "Community confirmation is not enabled for this paper yet. Open the community record and check the public community status first."
        : "";

  return (
    <section
      className="print-trust-document"
      style={{
        ...pageCard("#FFFFFF"),
        padding: compact ? 14 : 20,
        border: "1px solid rgba(37,78,119,0.16)",
        boxShadow: "0 24px 60px rgba(15,23,42,0.12)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <TrustPaperWatermark
        name="shield"
        color="#0B63D1"
        size={260}
        opacity={0.026}
        style={{ top: 120, right: "44%", bottom: "auto" }}
      />
      <TrustPaperWatermark
        name="lock"
        color="#B7791F"
        size={220}
        opacity={0.035}
        style={{ top: 160, right: -70, bottom: "auto" }}
      />

      <header
        style={{
          display: "grid",
          gridTemplateColumns: compact ? "1fr" : "minmax(0, 1fr) auto",
          gap: 14,
          alignItems: "start",
        }}
      >
        <div>
          <div style={{ ...sectionLabel(), color: "#164E94" }}>
            GSN TrustSlip Verify
          </div>
          <p style={{ ...helperText(), margin: "6px 0 0", maxWidth: 680 }}>
            Public proof for quick checks, clear limits, and safer sharing.
          </p>
        </div>
        <div style={{ textAlign: compact ? "left" : "right", color: "#07172C" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              fontSize: 34,
              fontWeight: 1000,
              lineHeight: 1,
            }}
          >
            <TrustPaperIcon name="shield" size={30} color="#0B63D1" />
            GSN
          </div>
          <div style={{ marginTop: 4, color: "#B7791F", fontSize: 10, fontWeight: 1000 }}>
            OPEN - TRUST - IMPACT
          </div>
        </div>
      </header>

      <div
        style={{
          marginTop: 14,
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        <div style={publicVerifyShell("#F8FBFF")}>
          <TrustPaperWatermark
            name="shield"
            color="#0B63D1"
            size={190}
            opacity={0.03}
            style={{ top: 78, right: -54, bottom: "auto" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
            <span style={{ ...paperStatusPill("valid"), background: "#EAF7EE", color: "#166534" }}>
              A&nbsp;&nbsp; PUBLIC / SHAREABLE / PRINTABLE
            </span>
            <span style={paperStatusPill("limited")}>SEND / PRINT / SHARE</span>
          </div>
          <p style={{ ...helperText(), margin: "10px 0 0", fontSize: 13 }}>
            Plain-language proof for one question: can this person be considered right now?
          </p>

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
                <TrustPaperBadgeIcon name="shield" ok={validNow} />
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
                    <TrustPaperIcon name="qr" size={48} color="#94A3B8" />
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
                      <TrustPaperIcon name={icon} size={21} color="#0B63D1" />
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
                    <TrustPaperIcon name="community" size={22} color="#0B63D1" />
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
                          stableHeight={44}
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
                  <PrimaryButton
                    type="button"
                    onClick={onRequestCommunityPulse}
                    disabled={!communityPulseAvailable || !canRequestCommunityPulse}
                    busy={confirmationBusy}
                    busyLabel="Requesting..."
                    fullWidth
                    stableHeight={56}
                    debugId="trust-slip-verify.community-confirmation.request"
                  >
                    Request instant confirmation
                  </PrimaryButton>
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

      <TrustPaperSecurityFooter text="GSN Trust Architecture - Open trust. Real impact. Protect member privacy and integrity of GSN data." />
    </section>
  );
}
