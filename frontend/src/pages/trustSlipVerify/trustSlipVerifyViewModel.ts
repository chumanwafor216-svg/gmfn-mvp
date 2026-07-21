import { resolveSharedProfileImage } from "../../lib/profileImage";
import {
  publicCommunityMemberCredentialPath,
  publicFrontendUrl,
} from "../../lib/publicLinks";
import {
  getTrustBandLanguage,
  getTrustBandShortLabel,
  getTrustEvidenceLanguage,
  normalizeTrustBand,
} from "../../lib/trustBandLanguage";
import type { TrustSlipVerifyQuickAnswer } from "./TrustSlipVerifyPublicPaper";

type VerifyBannerTone = "success" | "warning" | "error" | "info";

type BuildTrustSlipVerifyViewModelArgs = {
  record: any;
  me: any;
  isAppRoute: boolean;
  holderName: string;
  communityLabel: string;
  visibleBand: string;
  visibleScore: number | null;
  resolvedCode: string;
  banner: {
    tone: VerifyBannerTone;
    title: string;
    detail: string;
  };
};

export type TrustSlipVerifyViewModel = {
  trustLimit: string;
  currency: string;
  cciReading: string;
  cciBand: string;
  sponsorCount: number | null;
  identityContext: Record<string, any>;
  communityContext: Record<string, any>;
  relationshipEvidenceSummary: Record<string, any>;
  cciExplainer: Record<string, any>;
  profileImageUrl: string | null;
  communityGlobalId: string;
  holderRole: string;
  activeMemberCount: string;
  activeCommunityCount: string;
  memberWitnessCount: string;
  membershipStrengthLabel: string;
  membershipRenewalStatusLabel: string;
  membershipValidUntil: string;
  nextWitnessRenewalAt: string;
  nextWitnessRenewalStatusLabel: string;
  membershipCurrentnessLabel: string;
  membershipCurrentnessScope: string;
  communityEvidenceCurrentnessLabel: string;
  communityEvidenceCurrentnessScope: string;
  communityActivityCount: string;
  communityActivityLatestAt: string;
  communityActivityCategories: string[];
  communityActivityLabel: string;
  identityStatusLabel: string;
  cciMeaning: string;
  phoneVerified: string;
  merchantVerifyActive: string;
  lastReleaseText: string;
  lastFullRepaymentText: string;
  daysSinceRepayment: string;
  snapshotLabel: string;
  riskFlags: string[];
  commitmentDiscipline: Record<string, any>;
  personalCommitmentDiscipline: Record<string, any>;
  contributionDiscipline: Record<string, any>;
  repaymentDiscipline: Record<string, any>;
  commitmentPlainLanguage: string;
  personalCommitmentPlainLanguage: string;
  commitmentSourceNote: string;
  hasBlockingState: boolean;
  fourDecisionQuestions: Array<{ title: string; answer: string }>;
  readerVerdict: string;
  verifyPath: string;
  verifyUrl: string;
  compactTrustLimit: string;
  publicEvidencePosture: string;
  publicEvidencePostureMeaning: string;
  publicEvidencePostureBoundary: string;
  visibleBandLabel: string;
  visibleBandMeaning: string;
  visibleEvidenceLabel: string;
  validNow: boolean;
  publicValidityLabel: string;
  quickTrustAnswers: TrustSlipVerifyQuickAnswer[];
  communityConfirmation: any;
  communityVerifyPath: string;
  communityRelayAvailable: boolean;
  communityPulseAvailable: boolean;
  communityConfirmationText: string;
  communityConfirmationRows: Array<[string, string]>;
  memberCredentialPath: string;
  statusLabel: string;
  issuedAtLabel: string;
  expiresAtLabel: string;
  systemNote: string;
  verificationState: string;
  verificationNote: string;
  recipientAccessRecord: {
    recipientLabel: string;
    purpose: string;
    scope: string;
    accessedAtLabel: string;
    status: string;
    note: string;
  };
};

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function firstNumberLike(...values: any[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || String(value).trim() === "") {
      continue;
    }
    const n = Number(value);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function firstStringList(...values: any[]): string[] {
  for (const value of values) {
    if (!Array.isArray(value)) continue;
    const items = value.map((item) => safeStr(item)).filter(Boolean);
    if (items.length) return items;
  }
  return [];
}

function safeDateTime(x: any): string {
  const raw = safeStr(x);
  if (!raw) return "";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

export function buildTrustSlipVerifyViewModel({
  record,
  me,
  isAppRoute,
  holderName,
  communityLabel,
  visibleBand,
  visibleScore,
  resolvedCode,
  banner,
}: BuildTrustSlipVerifyViewModelArgs): TrustSlipVerifyViewModel {
  const trustLimit = firstTruthy(record?.trust_limit, record?.trust_slip_limit);
  const bandLanguage = getTrustBandLanguage(visibleBand);
  const visibleBandLabel = getTrustBandShortLabel(visibleBand);
  const visibleBandKey = normalizeTrustBand(visibleBand);
  const visibleScoreIsThin = visibleScore === null || visibleScore <= 0;
  const hasRecordedSnapshot = Boolean(
    firstTruthy(record?.snapshot_version, record?.snapshot_checksum)
  );
  const visibleEventDepth = firstNumberLike(
    record?.event_count,
    record?.event_count_used,
    record?.trust_event_count,
    record?.events_count
  );
  const lowDataReading =
    visibleScoreIsThin && !hasRecordedSnapshot && !visibleEventDepth;
  const currency = firstTruthy(record?.currency);
  const cciReading = firstTruthy(
    record?.cci_score === null || record?.cci_score === undefined
      ? ""
      : String(record.cci_score),
    visibleScore === null ? "" : getTrustBandShortLabel(visibleBand)
  );
  const cciBand = firstTruthy(record?.cci_band, visibleBand);
  const sponsorCount = firstNumberLike(record?.sponsor_count);
  const identityContext = record?.identity_context || {};
  const communityContext = record?.community_context || {};
  const merchantSummary = record?.merchant_summary || {};
  const relationshipEvidenceSummary =
    record?.relationship_evidence_summary ||
    merchantSummary?.relationship_evidence_summary ||
    {};
  const cciExplainer = record?.cci_explainer || {};
  const profileImageUrl = resolveSharedProfileImage(
    isAppRoute ? me : null,
    record?.profile_image_url,
    identityContext?.profile_image_url
  );
  const communityGlobalId = firstTruthy(
    record?.community_global_id,
    record?.community_code,
    communityContext?.community_global_id,
    communityContext?.community_code
  );
  const holderRole = firstTruthy(record?.holder_role, communityContext?.holder_role, "member");
  const activeMemberCount = firstTruthy(
    record?.active_member_count,
    record?.community_member_count,
    communityContext?.active_member_count
  );
  const activeCommunityCount = firstTruthy(communityContext?.active_community_count);
  const memberWitnessCount = firstTruthy(
    record?.member_witness_count,
    communityContext?.member_witness_count
  );
  const membershipStrengthLabel = firstTruthy(
    record?.membership_strength_label,
    communityContext?.membership_strength_label
  );
  const membershipRenewalStatusLabel = firstTruthy(
    record?.membership_renewal_status_label,
    communityContext?.membership_renewal_status_label
  );
  const membershipValidUntil = firstTruthy(
    record?.membership_valid_until,
    communityContext?.membership_valid_until
  );
  const nextWitnessRenewalAt = firstTruthy(
    record?.next_witness_renewal_at,
    communityContext?.next_witness_renewal_at
  );
  const nextWitnessRenewalStatusLabel = firstTruthy(
    record?.next_witness_renewal_status_label,
    communityContext?.next_witness_renewal_status_label,
    "Not Started"
  );
  const membershipCurrentnessLabel = firstTruthy(
    record?.membership_currentness_label,
    communityContext?.membership_currentness_label,
    "Witness renewal not started"
  );
  const membershipCurrentnessScope = firstTruthy(
    record?.membership_currentness_scope,
    communityContext?.membership_currentness_scope,
    "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision."
  );
  const communityEvidenceCurrentnessLabel = firstTruthy(
    record?.community_evidence_currentness_label,
    communityContext?.community_evidence_currentness_label,
    "Active recorded Community ID"
  );
  const communityEvidenceCurrentnessScope = firstTruthy(
    record?.community_evidence_currentness_scope,
    communityContext?.community_evidence_currentness_scope,
    "This Community ID resolves to an active GSN community record. Parent community acknowledgement and member-level proof still need separate current scoped evidence."
  );
  const communityActivityCount = firstTruthy(
    record?.community_activity_count,
    communityContext?.community_activity_count
  );
  const communityActivityLatestAt = firstTruthy(
    record?.community_activity_latest_at,
    communityContext?.community_activity_latest_at
  );
  const communityActivityCategories = firstStringList(
    record?.community_activity_categories,
    communityContext?.community_activity_categories
  );
  const communityActivityLabel = firstTruthy(
    record?.community_activity_label,
    communityContext?.community_activity_label
  );
  const communityActivitySignal = communityActivityCount
    ? `${communityActivityCount} community activity event${
        communityActivityCount === "1" ? "" : "s"
      }${
        communityActivityCategories.length
          ? ` across ${communityActivityCategories.join(", ")}`
          : ""
      }`
    : "not shown";
  const relationshipEvidenceLabel = firstTruthy(
    relationshipEvidenceSummary?.summary_label,
    Array.isArray(relationshipEvidenceSummary?.rows)
      ? relationshipEvidenceSummary.rows[0]?.relationship_label
      : ""
  );
  const relationshipEvidenceCount = firstNumberLike(
    relationshipEvidenceSummary?.evidence_count
  );
  const identityStatusLabel = firstTruthy(
    record?.identity_status_label,
    identityContext?.identity_status_label
  );
  const cciMeaning = firstTruthy(
    record?.cci_public_meaning,
    cciExplainer?.public_meaning,
    cciExplainer?.meaning,
    cciExplainer?.plain_language
  );
  const phoneVerified =
    record?.phone_verified === true
      ? "Verified"
      : record?.phone_verified === false
        ? "Not verified or not shown"
        : "Not shown";
  const merchantVerifyActive =
    record?.merchant_verify_active === true
      ? "Active"
      : record?.merchant_verify_active === false
        ? "Inactive"
        : "Not stated";
  const lastReleaseText = safeDateTime(record?.last_release_at) || "Not shown";
  const lastFullRepaymentText =
    safeDateTime(record?.last_full_repayment_at) || "Not shown";
  const daysSinceRepayment = firstTruthy(record?.days_since_last_full_repayment);
  const snapshotLabel = hasRecordedSnapshot ? "Snapshot recorded" : "Snapshot not shown";
  const riskFlags = Array.isArray(record?.risk_flags) ? record.risk_flags : [];
  const commitmentDiscipline = record?.commitment_discipline || {};
  const personalCommitmentDiscipline = record?.personal_commitment_discipline || {};
  const contributionDiscipline = commitmentDiscipline?.contribution || {};
  const repaymentDiscipline = commitmentDiscipline?.repayment || {};
  const commitmentPlainLanguage = firstTruthy(commitmentDiscipline?.plain_language);
  const personalCommitmentPlainLanguage = firstTruthy(
    personalCommitmentDiscipline?.plain_language
  );
  const commitmentSourceNote = firstTruthy(
    commitmentDiscipline?.source_note,
    personalCommitmentDiscipline?.source_note
  );
  const verificationState = firstTruthy(
    record?.verification_status,
    record?.status,
    "Not stated"
  );
  const rawAccessRecord =
    record?.recipient_access_record ||
    record?.access_record ||
    record?.share_access_record ||
    record?.viewer_access_record ||
    {};
  const accessRecipientLabel = firstTruthy(
    record?.access_recipient_label,
    rawAccessRecord?.recipient_label,
    rawAccessRecord?.recipient,
    rawAccessRecord?.viewer_label,
    "Recipient not named"
  );
  const accessPurpose = firstTruthy(
    record?.access_purpose,
    rawAccessRecord?.purpose,
    rawAccessRecord?.share_purpose,
    "Purpose not recorded"
  );
  const accessScope = firstTruthy(
    record?.access_scope,
    rawAccessRecord?.scope,
    rawAccessRecord?.visibility_level,
    record?.visibility_level,
    "Public TrustSlip only"
  );
  const accessStatus = firstTruthy(
    record?.access_status,
    rawAccessRecord?.status,
    resolvedCode ? "Public code opened" : "Not recorded"
  );
  const accessRecordedAtLabel =
    safeDateTime(
      firstTruthy(
        record?.access_recorded_at,
        rawAccessRecord?.accessed_at,
        rawAccessRecord?.viewed_at,
        rawAccessRecord?.last_accessed_at
      )
    ) || "Not shown";
  const accessNote = firstTruthy(
    record?.access_note,
    rawAccessRecord?.note,
    "This records the public TrustSlip view only. Private Trust Passport access remains separate."
  );
  const hasBlockingState =
    record?.is_current === false ||
    record?.merchant_verify_active === false ||
    ["expired", "revoked", "frozen", "merchant_verify_inactive"].includes(
      safeStr(firstTruthy(record?.verification_status, record?.status, record?.state)).toLowerCase()
    );
  const evidenceStatus =
    lowDataReading || hasBlockingState
      ? "limited"
      : visibleBandKey === "C" || visibleBandKey === "D" || visibleBandKey === "E"
        ? "mixed"
        : "strong";
  const evidenceLanguage = getTrustEvidenceLanguage(evidenceStatus, {
    lowData: lowDataReading,
  });
  const publicEvidencePosture = lowDataReading
    ? {
        label: "Building history",
        plainMeaning:
          "This record is still building confirmed evidence. Use it as an early identity and community signal only.",
        boundary:
          "A thin record is not a bad record. Ask for recent events or live community confirmation before a serious decision.",
      }
    : {
        label: evidenceLanguage.label,
        plainMeaning: evidenceLanguage.plainMeaning,
        boundary:
          "Evidence status only. Guarantees, approvals, payment decisions, and character judgements remain separate decisions.",
      };
  const visibleBandMeaning = hasBlockingState
    ? "This public check needs a fresh or safer verification before anyone relies on it."
    : evidenceLanguage.implication;
  const fourDecisionQuestions = [
    {
      title: "Support, finance, contribution, or trade?",
      answer: hasBlockingState
        ? "Not from this TrustSlip alone. Ask for a fresh slip or live community confirmation."
        : `Use for low-risk decisions only. ${visibleBandLabel} means: ${bandLanguage.nextStep}`,
    },
    {
      title: "Do they follow through?",
      answer: safeStr(record?.last_full_repayment_at)
        ? `Some follow-through is visible. Last full repayment: ${lastFullRepaymentText}${
            daysSinceRepayment ? ` (${daysSinceRepayment} days ago)` : ""
          }.`
        : safeStr(record?.last_release_at)
          ? `A release is visible (${lastReleaseText}), but completed follow-through is not shown here.`
          : commitmentPlainLanguage
            ? commitmentPlainLanguage
            : personalCommitmentPlainLanguage
              ? personalCommitmentPlainLanguage
              : "Not enough follow-through evidence is visible on this public paper.",
    },
    {
      title: "Are they stable inside a real community?",
      answer:
    communityLabel !== "Not stated"
      ? `Community shown: ${communityLabel}. Phone: ${phoneVerified}. Member-witness strength: ${
          membershipStrengthLabel || "not shown"
        }. Evidence currentness: ${membershipCurrentnessLabel}. Community activity evidence: ${communityActivitySignal}. Sponsor count: ${
          sponsorCount === null ? "not shown" : sponsorCount
        }.`
      : "Community stability is not clear from this public paper.",
    },
    {
      title: "Is there checkable history behind the claim?",
      answer:
        snapshotLabel === "Snapshot recorded"
          ? `A saved TrustSlip snapshot exists. It shows the reading was recorded, not that every claim is guaranteed. Snapshot: ${firstTruthy(
              record?.snapshot_version,
              "shown"
            )}.`
          : "Snapshot metadata is not shown. Ask for the full Trust Passport if the risk is bigger.",
    },
  ];
  const readerVerdict = hasBlockingState
    ? "Do not rely on this TrustSlip by itself. Ask for a fresh TrustSlip or live community confirmation."
    : `This is a current public reading for ${holderName}. Use it as evidence, then match your risk to the record shown.`;

  const verifyPath = resolvedCode ? `/t/${encodeURIComponent(resolvedCode)}` : "";
  const verifyUrl = resolvedCode ? publicFrontendUrl(verifyPath) : "";
  const compactTrustLimit = trustLimit
    ? `${trustLimit}${currency ? ` ${currency}` : ""}`
    : "Not shown";
  const validNow = banner.tone === "success" && !hasBlockingState;
  const publicValidityLabel = validNow ? "VALID NOW" : banner.title;
  const quickTrustAnswers: TrustSlipVerifyQuickAnswer[] = [
    [
      "identity-card",
      "What are they known for here?",
      relationshipEvidenceCount && relationshipEvidenceLabel
        ? `${relationshipEvidenceLabel}. Raw inviter notes are not shown.`
        : holderRole && holderRole.toLowerCase() !== "member"
        ? `${holderRole} inside ${communityLabel}.`
        : communityActivityCount
          ? `Community activity is visible inside ${communityLabel}.`
          : "This paper shows identity and community scope, not a full profession record.",
    ],
    [
      "trust-shield",
      "Do records support trust?",
      safeStr(record?.last_full_repayment_at)
        ? "Some evidence is visible."
        : "Not enough evidence is visible.",
    ],
    [
      "community-building",
      "Is there a real community?",
      communityLabel !== "Not stated"
        ? communityActivityCount
          ? "Community context and activity evidence are visible."
          : "Community context is visible."
        : "Stability is not shown.",
    ],
    [
      "trust-shield",
      "What should you do next?",
      snapshotLabel === "Snapshot recorded"
        ? "Use this paper, then request live community confirmation for bigger risk."
        : "Ask for a fresh TrustSlip or full Trust Passport before bigger risk.",
    ],
  ];
  const communityConfirmation = record?.community_confirmation || null;
  const communityVerifyKey = firstTruthy(
    record?.community_code,
    communityConfirmation?.community_code,
    communityGlobalId,
    communityConfirmation?.community_id
  );
  const communityVerifyPath = communityVerifyKey
    ? `/verify/community/${encodeURIComponent(communityVerifyKey)}`
    : "";
  const derivedMemberCredentialPath = publicCommunityMemberCredentialPath({
    communityKey: communityVerifyKey,
    memberKey: firstTruthy(record?.gmfn_id, isAppRoute ? me?.gmfn_id : null),
  });
  const memberCredentialPath = firstTruthy(
    record?.member_credential_page,
    derivedMemberCredentialPath
  );
  const communityRelayAvailable = Boolean(communityConfirmation?.relay_available);
  const communityPulseAvailable = Boolean(
    communityConfirmation?.instant_pulse_available || communityRelayAvailable
  );
  const communityConfirmationText =
    firstTruthy(communityConfirmation?.plain_language) ||
    "Community confirmation is not available for this TrustSlip yet.";
  const communityConfirmationRows: Array<[string, string]> = [
    ["Community status", firstTruthy(communityConfirmation?.community_status, "Not shown")],
    [
      "Active members",
      firstTruthy(communityConfirmation?.active_member_count, activeMemberCount, "Not shown"),
    ],
    [
      "Eligible response pool",
      firstTruthy(communityConfirmation?.contactable_reference_count, "0"),
    ],
    [
      "Sponsor signals",
      firstTruthy(communityConfirmation?.sponsor_signal_count, sponsorCount, "0"),
    ],
    [
      "Last confirmation",
      safeDateTime(communityConfirmation?.last_community_confirmation) || "Not requested yet",
    ],
  ];

  return {
    trustLimit,
    visibleBandLabel,
    visibleBandMeaning,
    visibleEvidenceLabel: evidenceLanguage.label,
    currency,
    cciReading,
    cciBand,
    sponsorCount,
    identityContext,
    communityContext,
    relationshipEvidenceSummary,
    cciExplainer,
    profileImageUrl,
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
    membershipCurrentnessLabel,
    membershipCurrentnessScope,
    communityEvidenceCurrentnessLabel,
    communityEvidenceCurrentnessScope,
    communityActivityCount,
    communityActivityLatestAt,
    communityActivityCategories,
    communityActivityLabel,
    identityStatusLabel,
    cciMeaning,
    phoneVerified,
    merchantVerifyActive,
    lastReleaseText,
    lastFullRepaymentText,
    daysSinceRepayment,
    snapshotLabel,
    riskFlags,
    commitmentDiscipline,
    personalCommitmentDiscipline,
    contributionDiscipline,
    repaymentDiscipline,
    commitmentPlainLanguage,
    personalCommitmentPlainLanguage,
    commitmentSourceNote,
    hasBlockingState,
    fourDecisionQuestions,
    readerVerdict,
    verifyPath,
    verifyUrl,
    compactTrustLimit,
    publicEvidencePosture: publicEvidencePosture.label,
    publicEvidencePostureMeaning: publicEvidencePosture.plainMeaning,
    publicEvidencePostureBoundary: publicEvidencePosture.boundary,
    validNow,
    publicValidityLabel,
    quickTrustAnswers,
    communityConfirmation,
    communityVerifyPath,
    communityRelayAvailable,
    communityPulseAvailable,
    communityConfirmationText,
    communityConfirmationRows,
    memberCredentialPath,
    statusLabel: firstTruthy(
      record?.status,
      record?.verification_status,
      record?.state,
      "Record found"
    ),
    issuedAtLabel: safeDateTime(record?.issued_at) || "Not stated",
    expiresAtLabel: safeDateTime(record?.expires_at) || "Not stated",
    systemNote: firstTruthy(record?.message, record?.detail),
    verificationState,
    verificationNote: firstTruthy(record?.verification_note, record?.disclaimer),
    recipientAccessRecord: {
      recipientLabel: accessRecipientLabel,
      purpose: accessPurpose,
      scope: accessScope,
      accessedAtLabel: accessRecordedAtLabel,
      status: accessStatus,
      note: accessNote,
    },
  };
}
