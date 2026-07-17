import { buildGsnSnapshotPaper } from "./gsnSnapshotPaper";
import {
  getContextualEvidencePosture,
  normalizeTrustBand,
} from "./trustBandLanguage";

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
  holderRole?: string;
  communityEvidence?: string;
  witnessEvidence?: string;
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
  holderRole?: string;
  communityEvidence?: string;
  witnessEvidence?: string;
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
  holderRole?: string;
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

function compactShareLines(lines: Array<string | null | undefined | false>) {
  return lines
    .map((line) => String(line || "").trim())
    .filter(Boolean)
    .join("\n");
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

  return `${languageByBand[band]} - ${guidanceByBand[band]}`;
}

function friendlyScore(raw: string, band?: string): string {
  const text = String(raw || "").trim();
  if (!text || text === "-") {
    return "Not enough visible activity yet.";
  }

  const posture = getContextualEvidencePosture(text, band);
  return `${posture.label}. No public human score is shown.`;
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
      { label: "TrustSlip", value: params.trustSlipCode || "Not issued yet" },
    ],
    bodyLines: [
      cleanLine(
        "Local community reading",
        `${friendlyTrustBand(params.openTrustClass)} Evidence posture: ${friendlyScore(params.openTrustScore, params.openTrustClass)}`
      ),
      cleanLine(
        "Cross-community reading",
        `${friendlyConsistency(params.cciClass)} Evidence posture: ${friendlyScore(params.cciScore, params.cciClass)}`
      ),
      cleanLine("Continuity", params.continuityLabel),
      cleanLine("Next clean step", params.nextMoveLabel),
    ],
    privacyNote:
      "Privacy: identity and trust-reading fields only. Private documents and contacts are not shown.",
    limitationNote:
      "Limitation: identity snapshot only. Not legal identity proof, government ID, professional licence, bank approval, or a guarantee of future behaviour.",
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
      { label: "Evidence posture", value: friendlyScore(params.scoreText, params.classText) },
    ],
    bodyLines: [
      cleanLine("Reading", params.statusText),
      cleanLine("Why", params.whyText),
    ],
    privacyNote:
      "Privacy: consistency signals only. Private community records are not shown.",
    limitationNote:
      "Limitation: consistency evidence only. Not a character label, credit approval, bank guarantee, payment instruction, or automatic debit.",
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
      params.holderRole
        ? cleanLine("Known here as", `${params.holderRole} inside ${params.communityName}`)
        : "",
      params.communityEvidence
        ? cleanLine("Community evidence", params.communityEvidence)
        : "",
      params.witnessEvidence
        ? cleanLine("Witness route", params.witnessEvidence)
        : "",
      cleanLine("Portable trust reading", friendlyTrustBand(params.merchantBand)),
      cleanLine(
        "Trust-limit signal",
        `${params.merchantCurrency} ${params.merchantTrustLimit}`
      ),
      cleanLine("Cross-community reading", friendlyConsistency(params.cciBand)),
      cleanLine("Expires", params.expiresAt),
      cleanLine(
        "Reader boundary",
        "Evidence only. Check the current community record before money, goods, or credit."
      ),
    ],
    privacyNote:
      "Privacy: public TrustSlip signals only. The private Trust Passport is not shown.",
    limitationNote:
      "Limitation: TrustSlip is GSN evidence only. Not a bank guarantee, credit approval, payment instruction, legal promise, or automatic debit.",
  });
}

export function buildTrustSlipShareText(params: TrustSlipSnapshotParams) {
  return compactShareLines([
    "GSN TrustSlip",
    cleanLine("Holder", params.holderName || params.gmfnId),
    cleanLine("GSN ID", params.gmfnId),
    cleanLine("Community", params.communityName),
    params.holderRole
      ? cleanLine("Known here as", `${params.holderRole} inside this community`)
      : "",
    cleanLine("Reading", friendlyTrustBand(params.merchantBand)),
    params.communityEvidence
      ? cleanLine("Evidence", params.communityEvidence)
      : "",
    cleanLine("Expires", params.expiresAt),
    "Evidence only. Open the link to check the current public GSN record.",
    params.verifyUrl,
  ]);
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
      params.holderRole
        ? cleanLine("Known here as", `${params.holderRole} inside ${params.communityLabel}`)
        : "",
      params.communityEvidence
        ? cleanLine("Community evidence", params.communityEvidence)
        : "",
      params.witnessEvidence
        ? cleanLine("Witness route", params.witnessEvidence)
        : "",
      cleanLine("Visible trust reading", friendlyTrustBand(params.visibleBand)),
      cleanLine("Evidence posture", friendlyScore(params.visibleScore, params.visibleBand)),
      cleanLine("Verification", params.verificationStatus),
      cleanLine("Issued", params.issuedAt),
      cleanLine("Expires", params.expiresAt),
      cleanLine(
        "Reader boundary",
        "Evidence only. Check current status before lending, credit, money, or goods."
      ),
    ],
    privacyNote:
      "Privacy: permitted public TrustSlip fields only.",
    limitationNote:
      "Limitation: TrustSlip verification is GSN evidence only. Not a bank guarantee, credit approval, payment instruction, legal promise, or automatic debit.",
  });
}

export function buildTrustSlipVerifyShareText(
  params: TrustSlipVerifySnapshotParams
) {
  return compactShareLines([
    "GSN TrustSlip Verification",
    cleanLine("Holder", params.holderName || params.gmfnId),
    cleanLine("GSN ID", params.gmfnId),
    cleanLine("Community", params.communityLabel),
    params.holderRole
      ? cleanLine("Known here as", `${params.holderRole} inside this community`)
      : "",
    cleanLine("Status", params.verificationStatus),
    cleanLine("Reading", friendlyTrustBand(params.visibleBand)),
    params.communityEvidence
      ? cleanLine("Evidence", params.communityEvidence)
      : "",
    "Evidence only. Open the link to check the current public GSN record.",
    params.verifyUrl,
  ]);
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
      params.holderRole && params.holderRole.toLowerCase() !== "member"
        ? cleanLine("Known here as", `${params.holderRole} inside ${params.communityName}`)
        : "",
      cleanLine("Main reading", friendlyTrustBand(params.currentBand)),
      cleanLine("Evidence posture", friendlyScore(params.currentScore, params.currentBand)),
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
    ],
    privacyNote: "Privacy: private evidence is not included.",
    limitationNote:
      "Limitation: GSN evidence only. Not approval, guarantee, payment instruction, or auto-debit.",
  });
}

export function buildTrustPassportShareText(
  params: TrustPassportSnapshotParams
) {
  return compactShareLines([
    "GSN Trust Passport",
    cleanLine("Member", params.memberName || params.gmfnId),
    cleanLine("GSN ID", params.gmfnId),
    cleanLine("Community", params.communityName),
    params.holderRole && params.holderRole.toLowerCase() !== "member"
      ? cleanLine("Known here as", `${params.holderRole} inside this community`)
      : "",
    cleanLine("Main reading", friendlyTrustBand(params.currentBand)),
    params.communityActivitySummary
      ? cleanLine("Community evidence", params.communityActivitySummary)
      : "",
    cleanLine(
      "Witness currentness",
      params.membershipCurrentnessLabel || "Witness renewal not started"
    ),
    "Evidence only. Open the link to check the current public GSN record.",
    params.verifyUrl,
  ]);
}
