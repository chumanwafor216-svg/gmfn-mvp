import { buildGsnSnapshotPaper, gsnGeneratedAt } from "./gsnSnapshotPaper";
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
  trustSlipCode: string;
  nextStepLabel: string;
  verifyUrl: string;
};

function cleanLine(label: string, value: string) {
  const text = String(value || "").trim();
  return `${label}: ${text || "-"}`;
}

function friendlyTrustBand(raw: string): string {
  const text = String(raw || "").trim();
  const band = normalizeTrustBand(text);

  if (!band) {
    return text || "Building record - more proof needed.";
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
    D: "use caution; ask for current proof.",
    E: "do not rely on this alone.",
    F: "ask for stronger proof first.",
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
  return `${friendlyTrustBand(band)} Ask for current confirmation.`;
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
        "Trust limit",
        `${params.merchantCurrency} ${params.merchantTrustLimit}`
      ),
      cleanLine("Cross-community reading", friendlyConsistency(params.cciBand)),
      cleanLine("Expires", params.expiresAt),
      cleanLine("Verify link", params.verifyUrl),
    ],
    privacyNote:
      "Privacy: public TrustSlip signals only. The private Trust Passport is not shown.",
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
    ],
    privacyNote:
      "Privacy: permitted public TrustSlip fields only.",
  });
}

export function buildTrustPassportSnapshot(
  params: TrustPassportSnapshotParams
) {
  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "",
    "Title: GSN Trust Passport Snapshot",
    "Purpose: Short trust summary for your decision.",
    `Generated (UTC): ${gsnGeneratedAt()}`,
    `Reference: ${params.gmfnId || "-"}`,
    "",
    "GSN record context",
    cleanLine("Member", params.memberName || params.gmfnId),
    cleanLine("GSN ID", params.gmfnId),
    cleanLine("Community", params.communityName),
    cleanLine("TrustSlip", params.trustSlipCode),
    "",
    "Record details",
    cleanLine("Main reading", friendlyTrustBand(params.currentBand)),
    cleanLine("Score", friendlyScore(params.currentScore)),
    cleanLine("Community reading", friendlyTrustBand(params.openTrustClass)),
    cleanLine("Wider-network reading", friendlyConsistency(params.cciClass)),
    cleanLine("Next step", params.nextStepLabel),
    "",
    params.verifyUrl ? `Verification / action link: ${params.verifyUrl}` : "",
    "Privacy: private evidence is not included.",
    "Limitation: GSN record only. Not a bank guarantee, approval, or automatic debit.",
    "",
    "Footer: GSN. Trusted marketplace. Real people. Real value.",
  ]
    .filter((line, index, lines) => {
      if (line !== "") return true;
      return lines[index - 1] !== "";
    })
    .join("\n");
}
