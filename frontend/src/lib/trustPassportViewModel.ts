import {
  getTrustBandLanguage,
  getTrustBandShortLabel,
  getTrustEvidenceLanguage,
  normalizeTrustBand,
  type TrustEvidenceLanguage,
  type TrustBandLanguage,
} from "./trustBandLanguage";

export type TrustQuestionStatus =
  | "Strong"
  | "Mixed"
  | "Check first"
  | "Evidence still building"
  | "Stable"
  | "Needs current activity"
  | "Strong checkable history"
  | "Moderate checkable history"
  | "Building checkable history";

export type TrustQuestionLine = {
  title: string;
  status: TrustQuestionStatus;
  meaning: string;
};

export type TrustPassportViewModel = {
  identity: {
    displayName: string;
    profileImageUrl: string;
    gmfnId: string;
    communityName: string;
    communityId: string;
    holderRole: string;
    activeMemberCount: string;
    phoneRecorded: boolean;
    phoneVerified: boolean;
    bankRecorded: boolean;
    bankVerified: boolean | null;
    bankVerificationLabel: string;
    passportRecorded: boolean;
    officialIdRecorded: boolean;
    passportVerified: boolean;
    passportVerificationLabel: string;
    communityIdentityConfirmed: boolean;
    communityIdentityLabel: string;
    communityActivityCount: string;
    communityActivityLatestAt: string;
    communityActivityCategories: string[];
    communityActivityLabel: string;
    membershipCurrentnessLabel: string;
    membershipCurrentnessScope: string;
    nextWitnessRenewalAt: string;
    nextWitnessRenewalStatusLabel: string;
    identityVerified: boolean | null;
    identityStatusLabel: string;
    membershipStatus: "active" | "pending" | "inactive";
    identityContinuity: "clean" | "mixed" | "unclear";
  };
  verdict: {
    band: string;
    score: string;
    label: string;
    interpretation: string;
    evidenceStatus: "strong" | "mixed" | "limited";
    evidenceLabel: string;
    evidenceMeaning: string;
    evidenceLanguage: TrustEvidenceLanguage;
    lowData: boolean;
    bandLanguage: TrustBandLanguage;
  };
  trustQuestions: TrustQuestionLine[];
  reasons: {
    helpsTrust: string[];
    createsPressure: string[];
  };
  outputs: {
    trustSlipStatus: string;
    trustSlipCode: string;
    canVerify: boolean;
    verifyUrl: string;
  };
  technicalDetail: {
    localTrustReason: string;
    crossCommunityReason: string;
    standingScore: string;
    eventCount: string;
    trustLimit: string;
    activeClans: string;
    counterparties: string;
    riskLevel: string;
    rawBreakdownRows: Array<[string, string]>;
  };
};

export type TrustPassportViewModelInput = {
  displayName: string;
  profileImageUrl?: string | null;
  gmfnId: string;
  communityName: string;
  communityId: string;
  holderRole?: string | null;
  activeMemberCount?: string | number | null;
  phoneRecorded?: boolean | null;
  phoneVerified?: boolean | null;
  bankRecorded?: boolean | null;
  bankVerified?: boolean | null;
  bankVerificationLabel?: string | null;
  passportRecorded?: boolean | null;
  officialIdRecorded?: boolean | null;
  passportVerified?: boolean | null;
  passportVerificationLabel?: string | null;
  identityEvidenceScore?: string | number | null;
  identityEvidenceLabel?: string | null;
  communityIdentityConfirmed?: boolean | null;
  communityIdentityLabel?: string | null;
  communityActivityCount?: string | number | null;
  communityActivityLatestAt?: string | null;
  communityActivityCategories?: string[] | null;
  communityActivityLabel?: string | null;
  membershipCurrentnessLabel?: string | null;
  membershipCurrentnessScope?: string | null;
  nextWitnessRenewalAt?: string | null;
  nextWitnessRenewalStatusLabel?: string | null;
  identityVerified?: boolean | null;
  identityStatusLabel?: string | null;
  hasSelectedCommunity?: boolean;
  band: string;
  score: string;
  localTrustReason?: string;
  crossCommunityReason?: string;
  latestReason?: string | null;
  latestNote?: string | null;
  eventCount?: string | number | null;
  recentEventCount?: number | null;
  trustLimit?: string;
  trustCurrency?: string;
  activeClans?: string | number | null;
  counterparties?: string | number | null;
  sponsorCount?: string | number | null;
  riskLevel?: string | null;
  riskFlags?: string[];
  trustSlipStatus?: string;
  trustSlipCode?: string;
  verifyUrl?: string;
  lastFullRepaymentAt?: string | null;
  lastReleaseAt?: string | null;
  rawBreakdownRows?: Array<[string, string]>;
  isExpiredOrInactive?: boolean;
};

function clean(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function numberValue(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function hasText(value: unknown): boolean {
  return clean(value).length > 0;
}

function unique(values: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    const text = clean(value);
    if (!text || seen.has(text)) continue;
    seen.add(text);
    out.push(text);
  }
  return out;
}

export function buildTrustPassportViewModel(
  input: TrustPassportViewModelInput
): TrustPassportViewModel {
  const band = normalizeTrustBand(input.band) || clean(input.band, "Not shown");
  const bandLanguage = getTrustBandLanguage(band);
  const scoreNumber = numberValue(input.score);
  const eventCountNumber = numberValue(input.eventCount);
  const recentEventCount = numberValue(input.recentEventCount);
  const sponsorCount = numberValue(input.sponsorCount);
  const activeClans = numberValue(input.activeClans);
  const counterparties = numberValue(input.counterparties);
  const riskLevel = clean(input.riskLevel, "Unknown");
  const weakBand = ["D", "E", "F"].includes(normalizeTrustBand(band));
  const identityEvidenceScore = numberValue(input.identityEvidenceScore);
  const lowData =
    scoreNumber <= 0 &&
    eventCountNumber <= 0 &&
    recentEventCount <= 0 &&
    !hasText(input.lastFullRepaymentAt) &&
    !hasText(input.lastReleaseAt) &&
    identityEvidenceScore < 35;
  const evidenceStatus: "strong" | "mixed" | "limited" =
    lowData || weakBand
      ? "limited"
      : ["C"].includes(normalizeTrustBand(band))
        ? "mixed"
        : "strong";
  const evidenceLanguage = getTrustEvidenceLanguage(evidenceStatus, { lowData });
  const label = lowData
    ? evidenceLanguage.label
    : getTrustBandShortLabel(band);

  const interpretation = lowData
    ? evidenceLanguage.plainMeaning
    : bandLanguage.plainMeaning;

  const phoneVerified = input.phoneVerified === true;
  const phoneRecorded = input.phoneRecorded === true || phoneVerified;
  const bankVerified =
    typeof input.bankVerified === "boolean" ? input.bankVerified : null;
  const bankRecorded = input.bankRecorded === true || bankVerified === true;
  const passportVerified = input.passportVerified === true;
  const passportRecorded = input.passportRecorded === true || passportVerified;
  const officialIdRecorded = input.officialIdRecorded === true || passportRecorded;
  const communityIdentityConfirmed = input.communityIdentityConfirmed === true;
  const communityActivityCount = numberValue(input.communityActivityCount);
  const communityActivityCategories = Array.isArray(input.communityActivityCategories)
    ? unique(input.communityActivityCategories)
    : [];
  const communityActivityLabel = clean(
    input.communityActivityLabel,
    communityActivityCount > 0
      ? "Community activity recorded"
      : "No community activity recorded yet"
  );
  const membershipCurrentnessLabel = clean(
    input.membershipCurrentnessLabel,
    "Witness renewal not started"
  );
  const membershipCurrentnessScope = clean(
    input.membershipCurrentnessScope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const nextWitnessRenewalAt = clean(input.nextWitnessRenewalAt);
  const nextWitnessRenewalStatusLabel = clean(
    input.nextWitnessRenewalStatusLabel,
    "Not Started"
  );
  const nextWitnessRenewalText = nextWitnessRenewalAt
    ? ` Next witness renewal: ${nextWitnessRenewalAt} (${nextWitnessRenewalStatusLabel}).`
    : "";
  const identityVerified =
    typeof input.identityVerified === "boolean" ? input.identityVerified : null;
  const membershipStatus =
    input.hasSelectedCommunity === false ? "pending" : "active";
  const identityContinuity =
    phoneVerified && activeClans > 1
      ? "clean"
      : phoneRecorded || bankRecorded || officialIdRecorded
        ? "unclear"
        : "mixed";

  const hasRepayment = hasText(input.lastFullRepaymentAt);
  const hasRelease = hasText(input.lastReleaseAt);
  const hasVerifyCode = hasText(input.trustSlipCode);
  const hasRiskFlags = Array.isArray(input.riskFlags) && input.riskFlags.length > 0;
  const highRisk = ["high", "critical", "severe"].includes(riskLevel.toLowerCase());

  const supportStatus: TrustQuestionStatus = lowData
    ? "Evidence still building"
    : weakBand
      ? "Check first"
      : "Mixed";
  const contributionStatus: TrustQuestionStatus =
    eventCountNumber > 0 ? (weakBand ? "Mixed" : "Strong") : "Evidence still building";
  const financeStatus: TrustQuestionStatus =
    hasRepayment ? "Strong" : hasRelease || highRisk ? "Check first" : "Evidence still building";
  const tradeStatus: TrustQuestionStatus =
    counterparties > 0 ? (weakBand ? "Mixed" : "Strong") : "Evidence still building";
  const followThroughStatus: TrustQuestionStatus =
    hasRepayment ? "Strong" : eventCountNumber > 0 ? "Mixed" : "Evidence still building";
  const communityStatus: TrustQuestionStatus =
    activeClans > 0 && communityActivityCount > 0 && !weakBand
      ? "Stable"
      : activeClans > 0
        ? "Needs current activity"
        : "Evidence still building";
  const historyStatus: TrustQuestionStatus =
    hasVerifyCode && eventCountNumber > 0
      ? "Strong checkable history"
      : hasVerifyCode || eventCountNumber > 0
        ? "Moderate checkable history"
        : "Building checkable history";

  const trustQuestions: TrustQuestionLine[] = [
    {
      title: "Identity evidence",
      status: phoneVerified && (bankVerified || passportVerified || communityIdentityConfirmed)
        ? "Strong"
        : phoneRecorded || bankRecorded || officialIdRecorded
          ? "Mixed"
          : "Check first",
      meaning: phoneVerified
        ? "The phone is verified. Recorded bank or ID evidence can strengthen this identity, but provider verification still matters for serious decisions."
        : phoneRecorded || bankRecorded || officialIdRecorded
          ? "Identity evidence is recorded, but some evidence is not verified yet. Treat this as progress, not final confirmation."
          : "Identity is only partly visible. Ask for stronger identity evidence before relying on this record.",
    },
    {
      title: "Support trust",
      status: supportStatus,
      meaning:
        supportStatus === "Evidence still building"
          ? "This screen does not yet show enough support history for serious reliance."
          : "Use the grade, recent behaviour, and community confirmation before offering support.",
    },
    {
      title: "Contribution / discipline",
      status: contributionStatus,
      meaning:
        contributionStatus === "Evidence still building"
          ? "Contribution or pooled-activity discipline is not visible enough yet."
          : "There is visible activity, but you should still check whether commitments were completed on time.",
    },
    {
      title: "Finance discipline",
      status: financeStatus,
      meaning: hasRepayment
        ? "Completed repayment evidence is visible."
        : "Repayment or support follow-through is not complete enough on this screen. Ask for more evidence before money, credit, or goods.",
    },
    {
      title: "Trade / merchant trust",
      status: tradeStatus,
      meaning:
        tradeStatus === "Evidence still building"
          ? "Marketplace or merchant evidence is not enough yet."
          : "Trade evidence exists, but you should still match the risk to the evidence shown.",
    },
    {
      title: "Follow-through",
      status: followThroughStatus,
      meaning: hasRepayment
        ? "There is evidence that a commitment was closed properly."
        : "The screen does not yet prove that promises are being closed consistently.",
    },
    {
      title: "Community stability",
      status: communityStatus,
      meaning:
        activeClans > 0
          ? communityActivityCount > 0
            ? `This person has ${communityActivityCount} broad community activity event${
                communityActivityCount === 1 ? "" : "s"
              } recorded inside this community. Witness currentness: ${membershipCurrentnessLabel}.${nextWitnessRenewalText} Activity depth supports judgement, but it is not a guarantee.`
            : `A community link is visible. Witness currentness: ${membershipCurrentnessLabel}.${nextWitnessRenewalText} Stability still depends on active standing, role, member/sponsor confirmation, and activity evidence.`
          : "A stable active community base is not visible enough yet.",
    },
    {
      title: "Checkable history",
      status: historyStatus,
      meaning:
        historyStatus === "Building checkable history"
          ? "There is not enough visible history behind the claim yet."
          : "Some checkable trail exists. For bigger risk, inspect the Trust Events and TrustSlip verification.",
    },
  ];

  const helpsTrust = unique([
    phoneVerified ? "phone identity is verified" : "",
    !phoneVerified && phoneRecorded ? "phone number is recorded against this identity" : "",
    bankVerified ? "bank destination is verified" : "",
    !bankVerified && bankRecorded ? "bank or wallet details are recorded" : "",
    communityIdentityConfirmed ? "active community membership is recorded for this person" : "",
    communityActivityCount > 0
      ? `${communityActivityCount} community activity event${
          communityActivityCount === 1 ? "" : "s"
        } recorded in this community`
      : "",
    communityActivityCategories.length
      ? `community activity categories: ${communityActivityCategories.join(", ")}`
      : "",
    `witness currentness: ${membershipCurrentnessLabel}`,
    nextWitnessRenewalAt
      ? `next witness renewal: ${nextWitnessRenewalAt} (${nextWitnessRenewalStatusLabel})`
      : "",
    passportVerified ? "official ID verification is visible" : "",
    !passportVerified && officialIdRecorded ? "official ID evidence is recorded for review" : "",
    hasRepayment ? "completed repayment evidence is visible" : "",
    hasVerifyCode ? "TrustSlip verification code is available" : "",
    activeClans > 0 ? "active community membership is visible" : "",
    sponsorCount > 0 ? "sponsor signals are visible" : "",
    counterparties > 0 ? "counterparty activity is visible" : "",
  ]);

  const createsPressure = unique([
    lowData ? "limited evidence so far" : "",
    weakBand ? "visible evidence still needs strengthening" : "",
    recentEventCount <= 0 ? "no recent Trust Events are visible" : "",
    communityActivityCount <= 0 ? "no community-scoped activity evidence is visible yet" : "",
    membershipCurrentnessLabel.toLowerCase().includes("current")
      ? ""
      : `witness currentness needs care: ${membershipCurrentnessLabel}`,
    nextWitnessRenewalStatusLabel.toLowerCase() === "renewal due"
      ? `next witness renewal is due: ${nextWitnessRenewalAt || "date not shown"}`
      : "",
    eventCountNumber <= 0 ? "no event-depth is visible" : "",
    phoneRecorded && !phoneVerified ? "phone is recorded but not network-verified yet" : "",
    bankRecorded && !bankVerified ? "bank details are recorded but not provider-verified yet" : "",
    officialIdRecorded && !passportVerified ? "official ID evidence is recorded but not provider-verified yet" : "",
    !hasRepayment ? "repayment follow-through is not shown" : "",
    sponsorCount <= 0 ? "sponsor quality is not shown" : "",
    highRisk ? `capacity risk is ${riskLevel.toLowerCase()}` : "",
    hasRiskFlags ? "risk flags are visible" : "",
    input.isExpiredOrInactive ? "TrustSlip is expired or inactive" : "",
  ]);

  return {
    identity: {
      displayName: clean(input.displayName, "Member"),
      profileImageUrl: clean(input.profileImageUrl),
      gmfnId: clean(input.gmfnId, "Awaiting issue"),
      communityName: clean(input.communityName, "No current community"),
      communityId: clean(input.communityId, "Awaiting issue"),
      holderRole: clean(input.holderRole, "member"),
      activeMemberCount: clean(input.activeMemberCount, "Not shown"),
      phoneRecorded,
      phoneVerified,
      bankRecorded,
      bankVerified,
      bankVerificationLabel: clean(
        input.bankVerificationLabel,
        bankVerified ? "Bank details recorded" : "Bank check not connected yet"
      ),
      passportRecorded,
      officialIdRecorded,
      passportVerified,
      passportVerificationLabel: clean(
        input.passportVerificationLabel,
        "Passport check not connected yet"
      ),
      communityIdentityConfirmed,
      communityIdentityLabel: clean(
        input.communityIdentityLabel,
        communityIdentityConfirmed
          ? "Active community membership recorded"
          : "Community membership record not shown"
      ),
      communityActivityCount: String(communityActivityCount),
      communityActivityLatestAt: clean(input.communityActivityLatestAt),
      communityActivityCategories,
      communityActivityLabel,
      membershipCurrentnessLabel,
      membershipCurrentnessScope,
      nextWitnessRenewalAt,
      nextWitnessRenewalStatusLabel,
      identityVerified,
      identityStatusLabel: clean(input.identityStatusLabel, "Identity status not shown"),
      membershipStatus,
      identityContinuity,
    },
    verdict: {
      band,
      score: clean(input.score, "Not shown"),
      label,
      interpretation,
      evidenceStatus,
      evidenceLabel: evidenceLanguage.label,
      evidenceMeaning: evidenceLanguage.plainMeaning,
      evidenceLanguage,
      lowData,
      bandLanguage,
    },
    trustQuestions,
    reasons: {
      helpsTrust: helpsTrust.length ? helpsTrust : ["no positive evidence is visible yet"],
      createsPressure: createsPressure.length ? createsPressure : ["no pressure signals are shown"],
    },
    outputs: {
      trustSlipStatus: clean(input.trustSlipStatus, "Pending"),
      trustSlipCode: clean(input.trustSlipCode),
      canVerify: hasVerifyCode || hasText(input.verifyUrl),
      verifyUrl: clean(input.verifyUrl),
    },
    technicalDetail: {
      localTrustReason: clean(input.localTrustReason, "Local community trust reason is not shown yet."),
      crossCommunityReason: clean(
        input.crossCommunityReason,
        "Cross-community consistency reason is not shown yet."
      ),
      standingScore: clean(input.score, "Not shown"),
      eventCount: clean(input.eventCount, "0"),
      trustLimit: `${clean(input.trustLimit, "0.00")} ${clean(input.trustCurrency)}`.trim(),
      activeClans: clean(input.activeClans, "0"),
      counterparties: clean(input.counterparties, "0"),
      riskLevel,
      rawBreakdownRows: input.rawBreakdownRows || [],
    },
  };
}
