import React from "react";
import TrustSlipReaderBlock from "../../components/TrustSlipReaderBlock";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../../lib/institutionalSurface";
import TrustSlipVerifyResultCard from "./TrustSlipVerifyResultCard";

type BannerStyle = {
  bg: string;
  border: string;
  text: string;
};

type TrustSlipQuestion = {
  title: string;
  answer: string;
};

type TrustSlipVerifyPrivateEvidenceProps = {
  compact: boolean;
  bannerTitle: string;
  bannerDetail: string;
  bannerStyle: BannerStyle;
  loadError?: string;
  resolvedCode: string;
  statusLabel: string;
  holderName: string;
  gsnId: string;
  profileImageUrl?: string | null;
  communityLabel: string;
  communityGlobalId?: string | null;
  holderRole?: string | null;
  activeMemberCount?: string | number | null;
  activeCommunityCount?: string | number | null;
  sponsorCount?: string | number | null;
  phoneVerifiedRaw?: boolean | null;
  identityStatusLabel?: string | null;
  cciReading?: string | number | null;
  cciBand?: string | null;
  cciMeaning?: string | null;
  trustLimit?: string | number | null;
  currency?: string | null;
  readerVerdict?: string | null;
  questions: TrustSlipQuestion[];
  visibleBand: string;
  visibleScore: number | null;
  issuedAt?: string | null;
  expiresAt?: string | null;
  merchantVerifyActive: string;
  phoneVerified: string;
  contributionDiscipline: Record<string, any>;
  repaymentDiscipline: Record<string, any>;
  personalCommitmentDiscipline: Record<string, any>;
  commitmentPlainLanguage: string;
  personalCommitmentPlainLanguage: string;
  commitmentSourceNote: string;
  systemNote: string;
  verificationState: string;
  verifyPath: string;
  lastReleaseText: string;
  lastFullRepaymentText: string;
  snapshotLabel: string;
  riskFlags: string[];
  verificationNote: string;
};

function firstNumberLike(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

function countText(value: unknown): string {
  const n = firstNumberLike(value);
  return n === null ? "0" : String(n);
}

function safeDateTime(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 26,
    padding: 20,
    backdropFilter: "blur(6px)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 20,
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

function documentMetaCard(bg = "#F7FAFC"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(148,163,184,0.18)",
    background: bg,
    padding: 14,
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45)",
  };
}

function documentFrameStyle(): React.CSSProperties {
  return {
    position: "relative",
    overflow: "hidden",
    border: "1px solid rgba(148,163,184,0.2)",
    boxShadow:
      "0 20px 54px rgba(2,6,23,0.12), inset 0 1px 0 rgba(255,255,255,0.5)",
  };
}

function documentWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: 18,
    right: -16,
    transform: "rotate(-90deg)",
    transformOrigin: "top right",
    letterSpacing: 3.1,
    fontSize: 11,
    fontWeight: 900,
    color: "rgba(11,31,51,0.08)",
    pointerEvents: "none",
    textTransform: "uppercase",
  };
}

function documentFooterGrid(compact: boolean): React.CSSProperties {
  return {
    position: "relative",
    zIndex: 1,
    marginTop: 16,
    paddingTop: 14,
    borderTop: "1px solid rgba(148,163,184,0.2)",
    display: "grid",
    gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
    gap: 12,
  };
}

function documentFooterLabel(): React.CSSProperties {
  return {
    fontSize: 11,
    letterSpacing: 0.28,
    fontWeight: 900,
    textTransform: "uppercase",
    color: "#64748B",
  };
}

export default function TrustSlipVerifyPrivateEvidence({
  compact,
  bannerTitle,
  bannerDetail,
  bannerStyle,
  loadError,
  resolvedCode,
  statusLabel,
  holderName,
  gsnId,
  profileImageUrl,
  communityLabel,
  communityGlobalId,
  holderRole,
  activeMemberCount,
  activeCommunityCount,
  sponsorCount,
  phoneVerifiedRaw,
  identityStatusLabel,
  cciReading,
  cciBand,
  cciMeaning,
  trustLimit,
  currency,
  readerVerdict,
  questions,
  visibleBand,
  visibleScore,
  issuedAt,
  expiresAt,
  merchantVerifyActive,
  phoneVerified,
  contributionDiscipline,
  repaymentDiscipline,
  personalCommitmentDiscipline,
  commitmentPlainLanguage,
  personalCommitmentPlainLanguage,
  commitmentSourceNote,
  systemNote,
  verificationState,
  verifyPath,
  lastReleaseText,
  lastFullRepaymentText,
  snapshotLabel,
  riskFlags,
  verificationNote,
}: TrustSlipVerifyPrivateEvidenceProps) {
  return (
    <>
      <TrustSlipVerifyResultCard
        bannerTitle={bannerTitle}
        bannerDetail={bannerDetail}
        bannerStyle={bannerStyle}
        compact={compact}
        loadError={loadError}
        resolvedCode={resolvedCode}
        statusLabel={statusLabel}
      />

      <TrustSlipReaderBlock
        compact={compact}
        holderName={holderName}
        gmfnId={gsnId}
        profileImageUrl={profileImageUrl}
        communityName={communityLabel}
        communityGlobalId={communityGlobalId}
        holderRole={holderRole}
        activeMemberCount={activeMemberCount}
        activeCommunityCount={activeCommunityCount}
        sponsorCount={sponsorCount}
        phoneVerified={phoneVerifiedRaw}
        identityStatusLabel={identityStatusLabel}
        cciScore={cciReading}
        cciBand={cciBand}
        cciMeaning={cciMeaning}
        trustLimit={trustLimit}
        currency={currency}
        readerVerdict={readerVerdict}
        questions={questions}
      />

      <section
        className="print-trust-document"
        style={{ ...pageCard("#FFFFFF"), ...documentFrameStyle() }}
      >
        <div className="print-watermark" aria-hidden style={documentWatermarkStyle()}>
          GSN Verify
        </div>
        <div style={sectionLabel()}>Verification summary</div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={innerCard("#FCFEFF")}>
            <div style={sectionLabel()}>Holder identity</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div style={sectionLabel()}>Holder</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                  }}
                >
                  {holderName}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>GSN ID</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.25,
                    wordBreak: "break-word",
                  }}
                >
                  {gsnId}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Community</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 16,
                    lineHeight: 1.25,
                  }}
                >
                  {communityLabel}
                </div>
              </div>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={sectionLabel()}>Visible trust reading</div>

            <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <div style={statTile()}>
                <div style={sectionLabel()}>Visible band</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {visibleBand}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Visible score</div>
                <div
                  style={{
                    marginTop: 8,
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 18,
                    lineHeight: 1.25,
                  }}
                >
                  {visibleScore === null ? "-" : String(Math.round(visibleScore))}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Issued / expires</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Issued: {safeDateTime(issuedAt) || "-"}
                  </div>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Expires: {safeDateTime(expiresAt) || "Not stated"}
                  </div>
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Trust limit</div>
                <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
                  {trustLimit || "Not shown"} {currency}
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Cross-community consistency / sponsor signal</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Consistency reading: {cciReading || "Not shown"}{" "}
                    {cciBand ? `/ ${cciBand}` : ""}
                  </div>
                  <div style={{ ...helperText(), color: "#64748B" }}>
                    CCI is the internal label for this wider consistency reading.
                  </div>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Sponsor count: {sponsorCount === null ? "Not shown" : sponsorCount}
                  </div>
                  <div style={{ ...helperText(), color: "#64748B" }}>
                    Sponsor quality is not shown on this public view.
                  </div>
                </div>
              </div>

              <div style={statTile()}>
                <div style={sectionLabel()}>Verification controls</div>
                <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Merchant verify: {merchantVerifyActive}
                  </div>
                  <div style={{ ...helperText(), color: "#0B1F33" }}>
                    Phone: {phoneVerified}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 14, ...softCard("#FFFFFF") }}>
          <div style={sectionLabel()}>Commitment and contribution record</div>
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
                Personal commitment
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Commitments recorded:{" "}
                  {countText(personalCommitmentDiscipline?.distinct_commitment_count)}
                </div>
                <div style={helperText()}>
                  Check-ins: {countText(personalCommitmentDiscipline?.checkin_count)}
                </div>
                <div style={helperText()}>
                  Milestones: {countText(personalCommitmentDiscipline?.milestone_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(personalCommitmentDiscipline?.completed_count)}
                </div>
                <div style={helperText()}>
                  Missed/replanned:{" "}
                  {countText(personalCommitmentDiscipline?.missed_reported_count)}
                </div>
              </div>
            </div>

            <div style={innerCard("#F8FBFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
                Contribution payment record
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Expected: {countText(contributionDiscipline?.expected_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(contributionDiscipline?.confirmed_count)}
                </div>
                <div style={helperText()}>
                  Part paid: {countText(contributionDiscipline?.partial_count)}
                </div>
                <div style={helperText()}>
                  Still open: {countText(contributionDiscipline?.outstanding_count)}
                </div>
                <div style={helperText()}>
                  Expired or defaulted:{" "}
                  {countText(contributionDiscipline?.expired_or_defaulted_count)}
                </div>
                <div style={helperText()}>On-time rate and cycle position: not shown yet</div>
                <div style={helperText()}>
                  Post-benefit contribution after support: not shown in this public view
                </div>
              </div>
            </div>

            <div style={innerCard("#FFFFFF")}>
              <div style={{ color: "#0B1F33", fontWeight: 900, fontSize: 15 }}>
                Repayment discipline
              </div>
              <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                <div style={helperText()}>
                  Expected: {countText(repaymentDiscipline?.expected_count)}
                </div>
                <div style={helperText()}>
                  Completed: {countText(repaymentDiscipline?.confirmed_count)}
                </div>
                <div style={helperText()}>
                  Part paid: {countText(repaymentDiscipline?.partial_count)}
                </div>
                <div style={helperText()}>
                  Still open: {countText(repaymentDiscipline?.outstanding_count)}
                </div>
                <div style={helperText()}>
                  Expired or defaulted:{" "}
                  {countText(repaymentDiscipline?.expired_or_defaulted_count)}
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: 12, ...innerCard("#F8FBFF") }}>
            <div style={sectionLabel()}>In plain language</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {commitmentPlainLanguage ||
                personalCommitmentPlainLanguage ||
                "This public view does not yet show recorded contribution or repayment expectations. Ask for the fuller Trust Passport before taking a bigger risk."}
            </div>
            <div style={{ marginTop: 8, ...helperText() }}>
              Note: Personal commitments show member-recorded discipline. Expected payments
              show contribution or repayment evidence.
            </div>
            {personalCommitmentPlainLanguage && commitmentPlainLanguage ? (
              <div style={{ marginTop: 8, ...helperText() }}>
                Additional personal commitment signal: {personalCommitmentPlainLanguage}
              </div>
            ) : null}
            {commitmentSourceNote ? (
              <div style={{ marginTop: 8, ...helperText() }}>
                Source note: {commitmentSourceNote}
              </div>
            ) : null}
          </div>
        </div>

        {systemNote ? (
          <div style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
            <div style={sectionLabel()}>System note</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              {systemNote}
            </div>
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: compact ? "1fr" : "1fr 1fr",
            gap: 12,
          }}
        >
          <div style={documentMetaCard("#FFFFFF")}>
            <div style={sectionLabel()}>Document reference</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Verification code: {resolvedCode || "Not available"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Verification state: {verificationState}
            </div>
          </div>

          <div style={documentMetaCard("#F8FBFF")}>
            <div style={sectionLabel()}>Validity window</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Issued: {safeDateTime(issuedAt) || "Not stated"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Expires: {safeDateTime(expiresAt) || "Not stated"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Public verify path: {verifyPath || "Not available"}
            </div>
          </div>

          <div style={documentMetaCard("#FFFFFF")}>
            <div style={sectionLabel()}>Follow-through evidence</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Last release: {lastReleaseText}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Last full repayment: {lastFullRepaymentText}
            </div>
          </div>

          <div style={documentMetaCard("#F8FBFF")}>
            <div style={sectionLabel()}>Evidence controls</div>
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Snapshot: {snapshotLabel}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Risk flags: {riskFlags.length ? riskFlags.join(", ") : "None shown"}
            </div>
          </div>
        </div>

        <div style={documentFooterGrid(compact)}>
          <div>
            <div style={documentFooterLabel()}>Verification control</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Code: {resolvedCode || "Not available"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#0B1F33" }}>
              Public path: {verifyPath || "Not available"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Validity window</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Issued: {safeDateTime(issuedAt) || "Not stated"}
            </div>
            <div style={{ marginTop: 4, ...helperText(), color: "#0B1F33" }}>
              Expires: {safeDateTime(expiresAt) || "Not stated"}
            </div>
          </div>

          <div>
            <div style={documentFooterLabel()}>Verification note</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              {verificationNote ||
                "This confirms current public validity only. Trust Passport gives the fuller explanation."}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
