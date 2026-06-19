import React from "react";
import GSNBrandMark from "../../components/GSNBrandMark";
import { GsnLegacyIcon, type GsnIconName } from "../../components/GsnLegacyIcon";
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
  memberWitnessCount?: string | number | null;
  membershipStrengthLabel?: string | null;
  membershipRenewalStatusLabel?: string | null;
  membershipValidUntil?: string | null;
  nextWitnessRenewalAt?: string | null;
  nextWitnessRenewalStatusLabel?: string | null;
  memberCredentialPath?: string | null;
  communityActivityCount?: string | number | null;
  communityActivityLatestAt?: string | null;
  communityActivityCategories?: string[] | null;
  communityActivityLabel?: string | null;
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

function documentBrandWatermarkStyle(): React.CSSProperties {
  return {
    position: "absolute",
    top: -28,
    right: -10,
    opacity: 0.055,
    pointerEvents: "none",
  };
}

function documentIconBadge(name: GsnIconName, size = 34): React.ReactNode {
  const frameSize = size + 14;

  return (
    <span
      aria-hidden="true"
      style={{
        width: frameSize,
        height: frameSize,
        minWidth: frameSize,
        borderRadius: Math.max(16, Math.round(size * 0.52)),
        display: "inline-grid",
        placeItems: "center",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(248,251,255,0.76) 100%)",
        border: "1px solid rgba(20,52,83,0.12)",
        boxShadow:
          "0 14px 28px rgba(7,20,36,0.10), inset 0 1px 0 rgba(255,255,255,0.96)",
      }}
    >
      <GsnLegacyIcon
        name={name}
        size={size + 8}
        imageStyle={{
          filter: "drop-shadow(0 8px 10px rgba(7,20,36,0.18))",
          transform: "scale(1.06)",
        }}
      />
    </span>
  );
}

function documentSectionHeading(name: GsnIconName, label: string): React.ReactNode {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        minWidth: 0,
      }}
    >
      {documentIconBadge(name, 26)}
      <span style={sectionLabel()}>{label}</span>
    </div>
  );
}

function documentCardTitle(name: GsnIconName, label: string): React.ReactNode {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "#0B1F33",
        fontWeight: 900,
        fontSize: 15,
        lineHeight: 1.2,
      }}
    >
      {documentIconBadge(name, 24)}
      <span>{label}</span>
    </div>
  );
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
    letterSpacing: 0,
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
  memberWitnessCount,
  membershipStrengthLabel,
  membershipRenewalStatusLabel,
  membershipValidUntil,
  nextWitnessRenewalAt,
  nextWitnessRenewalStatusLabel,
  memberCredentialPath,
  communityActivityCount,
  communityActivityLatestAt,
  communityActivityCategories,
  communityActivityLabel,
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
        memberWitnessCount={memberWitnessCount}
        membershipStrengthLabel={membershipStrengthLabel}
        membershipRenewalStatusLabel={membershipRenewalStatusLabel}
        membershipValidUntil={membershipValidUntil}
        nextWitnessRenewalAt={nextWitnessRenewalAt}
        nextWitnessRenewalStatusLabel={nextWitnessRenewalStatusLabel}
        memberCredentialPath={memberCredentialPath}
        communityActivityCount={communityActivityCount}
        communityActivityLatestAt={communityActivityLatestAt}
        communityActivityCategories={communityActivityCategories}
        communityActivityLabel={communityActivityLabel}
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
        <div
          className="print-watermark"
          aria-hidden="true"
          style={documentBrandWatermarkStyle()}
        >
          <GSNBrandMark width={132} height={166} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          {documentSectionHeading("shield", "Verification summary")}
        </div>

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
            {documentSectionHeading("id", "Holder identity")}

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
            {documentSectionHeading("shield", "Visible trust reading")}

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
                <div style={sectionLabel()}>Trust limit signal</div>
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
                    This wider reading compares trust signals across community records.
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
          {documentSectionHeading("document", "Commitment and contribution record")}
          <div
            style={{
              marginTop: 12,
              display: "grid",
              gridTemplateColumns: compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            <div style={innerCard("#FFFFFF")}>
              {documentCardTitle("id", "Personal commitment")}
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
              {documentCardTitle("financeInstitution", "Contribution payment record")}
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
              {documentCardTitle("bank", "Repayment discipline")}
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
            {documentSectionHeading("qr", "Document reference")}
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Verification code: {resolvedCode || "Not available"}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Verification state: {verificationState}
            </div>
          </div>

          <div style={documentMetaCard("#F8FBFF")}>
            {documentSectionHeading("calendar", "Validity window")}
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
            {documentSectionHeading("check", "Follow-through evidence")}
            <div style={{ marginTop: 8, ...helperText(), color: "#0B1F33" }}>
              Last release: {lastReleaseText}
            </div>
            <div style={{ marginTop: 6, ...helperText(), color: "#0B1F33" }}>
              Last full repayment: {lastFullRepaymentText}
            </div>
          </div>

          <div style={documentMetaCard("#F8FBFF")}>
            {documentSectionHeading("lock", "Evidence controls")}
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
                "This checks current public validity only. Trust Passport gives the fuller explanation."}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
