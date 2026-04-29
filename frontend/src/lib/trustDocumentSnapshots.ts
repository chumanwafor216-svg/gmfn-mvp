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

function joinSnapshot(lines: Array<string | null | undefined | false>) {
  return lines.filter(Boolean).join("\n");
}

export function buildIdentityIntegritySnapshot(
  params: IdentityIntegritySnapshotParams
) {
  return joinSnapshot([
    "GSN Identity & Integrity snapshot",
    cleanLine("Member", params.displayName),
    cleanLine("GMFN ID", params.gmfnId),
    cleanLine("Community", params.communityLabel),
    cleanLine("TrustSlip", params.trustSlipCode || "Awaiting issue"),
    cleanLine("Open Trust", `${params.openTrustClass} / ${params.openTrustScore}`),
    cleanLine("CCI", `${params.cciClass} / ${params.cciScore}`),
    cleanLine("Continuity", params.continuityLabel),
    cleanLine("Next clean step", params.nextMoveLabel),
  ]);
}

export function buildCciSnapshot(params: CciSnapshotParams) {
  return joinSnapshot([
    "GSN CCI snapshot",
    cleanLine("Member", params.memberLabel),
    cleanLine("CCI class", params.classText),
    cleanLine("CCI score", params.scoreText),
    cleanLine("Reading", params.statusText),
    cleanLine("Why", params.whyText),
  ]);
}

export function buildTrustSlipSnapshot(params: TrustSlipSnapshotParams) {
  return joinSnapshot([
    "GSN TrustSlip snapshot",
    cleanLine("Holder", params.holderName),
    cleanLine("GMFN ID", params.gmfnId),
    cleanLine("Community", params.communityName),
    cleanLine("Community ref", params.communityRef),
    cleanLine("TrustSlip code", params.trustSlipCode),
    cleanLine("Portable band", params.merchantBand),
    cleanLine(
      "Trust limit",
      `${params.merchantCurrency} ${params.merchantTrustLimit}`
    ),
    cleanLine("CCI band", params.cciBand),
    cleanLine("Expires", params.expiresAt),
    cleanLine("Verify link", params.verifyUrl),
  ]);
}

export function buildTrustSlipVerifySnapshot(
  params: TrustSlipVerifySnapshotParams
) {
  return joinSnapshot([
    "GSN TrustSlip verification snapshot",
    cleanLine("Holder", params.holderName),
    cleanLine("GMFN ID", params.gmfnId),
    cleanLine("Community", params.communityLabel),
    cleanLine("TrustSlip code", params.trustSlipCode),
    cleanLine("Visible band", params.visibleBand),
    cleanLine("Visible score", params.visibleScore),
    cleanLine("Verification", params.verificationStatus),
    cleanLine("Issued", params.issuedAt),
    cleanLine("Expires", params.expiresAt),
    cleanLine("Verify link", params.verifyUrl),
  ]);
}

export function buildTrustPassportSnapshot(
  params: TrustPassportSnapshotParams
) {
  return joinSnapshot([
    "GSN Trust Passport snapshot",
    cleanLine("Member", params.memberName),
    cleanLine("GMFN ID", params.gmfnId),
    cleanLine("Community", params.communityName),
    cleanLine("Community code", params.communityCode),
    cleanLine("Trust band", params.currentBand),
    cleanLine("Trust score", params.currentScore),
    cleanLine("Open Trust", params.openTrustClass),
    cleanLine("CCI", params.cciClass),
    cleanLine("TrustSlip code", params.trustSlipCode),
    cleanLine("Next clean step", params.nextStepLabel),
    cleanLine("TrustSlip verify", params.verifyUrl),
  ]);
}
