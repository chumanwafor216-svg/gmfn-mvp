import { buildGsnSnapshotPaper } from "./gsnSnapshotPaper";
import { normalizeTrustBand } from "./trustBandLanguage";

type IdentityIntegritySnapshotParams = {
  displayName: string;
  gmfnId: string;
  communityLabel: string;
  trustSlipCode: string;
  openTrustClass: string;
  openTrustScore: string;
  cciClass: string;
  cciScore: string;
  continuityLabel: string;
  nextMoveLabel: string;
};

type CciSnapshotParams = {
  memberLabel: string;
  classText: string;
  scoreText: string;
  statusText: string;
  whyText: string;
};

type TrustSlipSnapshotParams = {
  holderName: string;
  gmfnId: string;
  communityName: string;
  communityRef: string;
  trustSlipCode: string;
  merchantBand: string;
  merchantTrustLimit: string;
  merchantCurrency: string;
  cciBand: string;
  expiresAt: string;
  verifyUrl: string;
  memberCredentialUrl?: string;
};

type TrustSlipVerifySnapshotParams = {
  holderName: string;
  gmfnId: string;
  communityLabel: string;
  trustSlipCode: string;
  visibleBand: string;
  visibleScore: string;
  verificationStatus: string;
  issuedAt: string;
  expiresAt: string;
  verifyUrl: string;
};

type TrustPassportSnapshotParams = {
  memberName: string;
  gmfnId: string;
  communityName: string;
  communityCode: string;
  currentBand: string;
  currentScore: string;
  openTrustClass: string;
  cciClass: string;
  communityActivitySummary?: string;
  communityActivityCategories?: string;
  communityActivityLatest?: string;
  membershipCurrentnessLabel?: string;
  membershipCurrentnessScope?: string;
  nextWitnessRenewalAt?: string;
  nextWitnessRenewalStatusLabel?: string;
  trustSlipCode: string;
  nextStepLabel: string;
  verifyUrl: string;
  memberCredentialUrl?: string;
};

function cleanLine(label: string, value: string) {
  const text = String(value || "").trim();
  return `${label}: ${text || "-"}`;
}

function friendlyTrustBand(raw: string): string {
  const text = String(raw || "").trim();
  const band = normalizeTrustBand(text);

  if (!band) {
    return text || "Building record - more evidence needed.";
  }

  const languageByBand: Record<string, string> = {
    A: "Strong record",
    B: "Good record",
    C: "Fair, growing record",
    D: "Early, limited record",
    E: "Very limited evidence",
    F: "No usable evidence yet",
  };
  const guidanceByBand: Record<string, string> = {
    A: "check current details.",
    B: "verify before bigger decisions.",
    C: "ask for context.",
    D: "use caution; ask for current evidence.",
    E: "do not rely on this alone.",
    F: "ask for stronger evidence first.",
  };

  return `${languageByBand[band]} (${band}) - ${guidanceByBand[band]}`;
}

function friendlyScore(raw: string): string {
  const text = String(raw || "").trim();
  if (!text || text === "-") {
    return "Not enough visible activity yet.";
  }

  return `${text} - signal only; not a character label.`;
}

function friendlyConsistency(raw: string): string {
  const text = String(raw || "").trim();
  const band = normalizeTrustBand(text);
  if (!band) return text || "Building consistency record.";

  if (band === "A" || band === "B") {
    return `${friendlyTrustBand(band)} Check current details.`;
  }
  if (band === "C") {
    return `${friendlyTrustBand(band)} Ask for context.`;
  }
  return `${friendlyTrustBand(band)} Ask for current evidence.`;
}

export function buildIdentityIntegritySnapshot(
  params: IdentityIntegritySnapshotParams
) {
  return buildGsnSnapshotPaper({
    title: "GSN Identity & Integrity Snapshot",
    purpose: "Check the member identity, community footprint, and next clean step.",
    reference: params.gmfnId,
    context: [
      { label: "Member", value: params.displayName },
      { label: "GSN ID", value: params.gmfnId },
      { label: "Community", value: params.communityLabel },
      { label: "TrustSlip", value: params.trustSlipCode || "Awaiting issue" },
    ],
    bodyLines: [
      cleanLine(
        "Local community reading",
        `${friendlyTrustBand(params.openTrustClass)} Score note: ${friendlyScore(params.openTrustScore)}`
      ),
      cleanLine(
        "Cross-community reading",
        `${friendlyConsistency(params.cciClass)} Score note: ${friendlyScore(params.cciScore)}`
      ),
      cleanLine("Continuity", params.continuityLabel),
      cleanLine("Next clean step", params.nextMoveLabel),
    ],
    privacyNote:
      "Privacy: identity and trust-reading fields only. Private documents and contacts are not shown.",
  });
}

export function buildCciSnapshot(params: CciSnapshotParams) {
  return buildGsnSnapshotPaper({
    title: "GSN Cross-Community Consistency Snapshot",
    purpose: "Check how consistent this member appears across community records.",
    reference: params.memberLabel,
    context: [
      { label: "Member", value: params.memberLabel },
      { label: "Consistency reading", value: friendlyConsistency(params.classText) },
      { label: "Score note", value: friendlyScore(params.scoreText) },
    ],
    bodyLines: [
      cleanLine("Reading", params.statusText),
      cleanLine("Why", params.whyText),
    ],
    privacyNote:
      "Privacy: consistency signals only. Private community records are not shown.",
  });
}

export function buildTrustSlipSnapshot(params: TrustSlipSnapshotParams) {
  return buildGsnSnapshotPaper({
    title: "GSN TrustSlip Snapshot",
    purpose: "Check this portable GSN trust summary before relying on it.",
    reference: params.trustSlipCode || params.gmfnId,
    link: params.verifyUrl,
    context: [
      { label: "Holder", value: params.holderName },
      { label: "GSN ID", value: params.gmfnId },
      { label: "Community", value: params.communityName },
      { label: "Community ref", value: params.communityRef },
      { label: "TrustSlip code", value: params.trustSlipCode },
    ],
    bodyLines: [
      cleanLine("Portable trust reading", friendlyTrustBand(params.merchantBand)),
      cleanLine(
        "Trust limit signal",
        `${params.merchantCurrency} ${params.merchantTrustLimit}`
      ),
      cleanLine("Cross-community reading", friendlyConsistency(params.cciBand)),
      cleanLine("Expires", params.expiresAt),
      cleanLine("Verify link", params.verifyUrl),
      params.memberCredentialUrl
        ? cleanLine("Member credential link", params.memberCredentialUrl)
        : "",
      cleanLine(
        "Reader boundary",
        "Use this as decision evidence beside current community records. It is not an instruction to release money or goods."
      ),
    ],
    privacyNote:
      "Privacy: public TrustSlip signals only. The private Trust Passport is not shown.",
    limitationNote:
      "Limitation: TrustSlip is GSN evidence only. Not a bank guarantee, credit approval, payment instruction, legal promise, or automatic debit.",
  });
}

export function buildTrustSlipVerifySnapshot(
  params: TrustSlipVerifySnapshotParams
) {
  return buildGsnSnapshotPaper({
    title: "GSN TrustSlip Verification Snapshot",
    purpose: "Check the TrustSlip code shown here.",
    reference: params.trustSlipCode || params.gmfnId,
    link: params.verifyUrl,
    context: [
      { label: "Holder", value: params.holderName },
      { label: "GSN ID", value: params.gmfnId },
      { label: "Community", value: params.communityLabel },
      { label: "TrustSlip code", value: params.trustSlipCode },
    ],
    bodyLines: [
      cleanLine("Visible trust reading", friendlyTrustBand(params.visibleBand)),
      cleanLine("Score note", friendlyScore(params.visibleScore)),
      cleanLine("Verification", params.verificationStatus),
      cleanLine("Issued", params.issuedAt),
      cleanLine("Expires", params.expiresAt),
      cleanLine("Verify link", params.verifyUrl),
      cleanLine(
        "Reader boundary",
        "Check current status and supporting community records before relying on it. This is not approval to lend, sell on credit, or release money."
      ),
    ],
    privacyNote:
      "Privacy: permitted public TrustSlip fields only.",
    limitationNote:
      "Limitation: TrustSlip verification is GSN evidence only. Not a bank guarantee, credit approval, payment instruction, legal promise, or automatic debit.",
  });
}

export function buildTrustPassportSnapshot(
  params: TrustPassportSnapshotParams
) {
  return buildGsnSnapshotPaper({
    title: "GSN Trust Passport Snapshot",
    purpose: "Short trust summary for your decision.",
    reference: params.gmfnId,
    link: params.verifyUrl,
    context: [
      { label: "Member", value: params.memberName || params.gmfnId },
      { label: "GSN ID", value: params.gmfnId },
      { label: "Community", value: params.communityName },
      { label: "TrustSlip", value: params.trustSlipCode },
    ],
    bodyLines: [
      cleanLine("Main reading", friendlyTrustBand(params.currentBand)),
      cleanLine("Score", friendlyScore(params.currentScore)),
      cleanLine("Community reading", friendlyTrustBand(params.openTrustClass)),
      cleanLine("Wider-network reading", friendlyConsistency(params.cciClass)),
      cleanLine("Community activity", params.communityActivitySummary || "Not shown"),
      params.communityActivityCategories
        ? cleanLine("Activity categories", params.communityActivityCategories)
        : "",
      params.communityActivityLatest
        ? cleanLine("Latest community activity", params.communityActivityLatest)
        : "",
      cleanLine(
        "Witness currentness",
        params.membershipCurrentnessLabel || "Witness renewal not started"
      ),
      params.membershipCurrentnessScope
        ? cleanLine("Currentness note", params.membershipCurrentnessScope)
        : "",
      params.nextWitnessRenewalAt
        ? cleanLine(
            "Next witness renewal",
            `${params.nextWitnessRenewalAt} (${params.nextWitnessRenewalStatusLabel || "Not Started"})`
          )
        : "",
      cleanLine("Next step", params.nextStepLabel),
      params.memberCredentialUrl
        ? cleanLine("Member credential link", params.memberCredentialUrl)
        : "",
    ],
    privacyNote: "Privacy: private evidence is not included.",
    limitationNote:
      "Limitation: GSN record only. Not a bank guarantee, credit approval, payment instruction, or automatic debit authority.",
  });
}
