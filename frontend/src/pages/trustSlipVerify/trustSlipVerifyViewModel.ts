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


type DecisionPackEvidenceCategory = {
  key: string;
  label: string;
  status: string;
  evidenceCount: number | null;
  latestAt: string;
  decisionUse: string;
};

type DecisionPackPrivateReviewCategory = {
  key: string;
  label: string;
  status: string;
  decisionUse: string;
};

type DecisionPackDeclaredClaim = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackRecordPointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackHousingReferencePointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackGuaranteeOutcomePointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackFulfillmentOutcomePointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackCompletedWorkPointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackDemandRequestOutcomePointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackConfirmationPointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

type DecisionPackIssueResolutionPointer = {
  key: string;
  label: string;
  status: string;
  value: string;
  source: string;
  evidenceCount: number | null;
  decisionUse: string;
};

export type DecisionPackEvidenceExtractView = {
  source: string;
  sourceNote: string;
  evidenceScope: {
    readingScope: string;
    includedActiveCommunityCount: number | null;
    includesHolderLevelRecords: boolean;
    publicSummary: string;
    boundary: string;
  };
  categories: DecisionPackEvidenceCategory[];
  declaredClaims: DecisionPackDeclaredClaim[];
  declarationBoundaryNote: string;
  recordPointers: DecisionPackRecordPointer[];
  recordPointerBoundaryNote: string;
  housingReferencePointers: DecisionPackHousingReferencePointer[];
  housingReferenceBoundaryNote: string;
  guaranteeOutcomePointers: DecisionPackGuaranteeOutcomePointer[];
  guaranteeOutcomeBoundaryNote: string;
  fulfillmentOutcomePointers: DecisionPackFulfillmentOutcomePointer[];
  fulfillmentOutcomeBoundaryNote: string;
  completedWorkPointers: DecisionPackCompletedWorkPointer[];
  completedWorkBoundaryNote: string;
  demandRequestOutcomePointers: DecisionPackDemandRequestOutcomePointer[];
  demandRequestOutcomeBoundaryNote: string;
  confirmationPointers: DecisionPackConfirmationPointer[];
  confirmationPointerBoundaryNote: string;
  issueResolutionPointers: DecisionPackIssueResolutionPointer[];
  issueResolutionBoundaryNote: string;
  privateReviewRequired: DecisionPackPrivateReviewCategory[];
  boundaryNote: string;
};

type DecisionPackProfileSignal = {
  key: string;
  label: string;
  status: string;
  value: string;
  decisionUse: string;
};

export type DecisionPackProfileView = {
  accessPurpose: string;
  recipientQuestion: string;
  communityConfirmationPrompt: {
    reasonType: string;
    question: string;
    boundary: string;
  };
  relevantSignals: DecisionPackProfileSignal[];
  gapsToCheck: Array<{
    key: string;
    label: string;
    reason: string;
    nextStep: string;
  }>;
  recommendedChecks: string[];
  evidenceExtract: DecisionPackEvidenceExtractView;
  basisNote: string;
  boundaryNote: string;
};

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
  evidenceScope: Record<string, any>;
  evidenceScopeSummary: string;
  evidenceScopeBoundary: string;
  evidenceScopeReadingScope: string;
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
  decisionPackProfile: DecisionPackProfileView;
  recipientAccessRecord: {
    recipientLabel: string;
    purpose: string;
    scope: string;
    accessedAtLabel: string;
    status: string;
    note: string;
    focus: string;
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


function stringList(value: any): string[] {
  return Array.isArray(value) ? value.map((item) => safeStr(item)).filter(Boolean) : [];
}

function normalizeDecisionPackEvidenceExtract(raw: any): DecisionPackEvidenceExtractView {
  const source = raw && typeof raw === "object" ? raw : {};
  const categories = Array.isArray(source.categories) ? source.categories : [];
  const privateReviewRequired = Array.isArray(source.private_review_required)
    ? source.private_review_required
    : [];
  const declaredClaims = Array.isArray(source.declared_claims) ? source.declared_claims : [];
  const recordPointers = Array.isArray(source.record_pointers) ? source.record_pointers : [];
  const housingReferencePointers = Array.isArray(source.housing_reference_pointers) ? source.housing_reference_pointers : [];
  const guaranteeOutcomePointers = Array.isArray(source.guarantee_outcome_pointers) ? source.guarantee_outcome_pointers : [];
  const fulfillmentOutcomePointers = Array.isArray(source.fulfillment_outcome_pointers) ? source.fulfillment_outcome_pointers : [];
  const completedWorkPointers = Array.isArray(source.completed_work_pointers) ? source.completed_work_pointers : [];
  const demandRequestOutcomePointers = Array.isArray(source.demand_request_outcome_pointers) ? source.demand_request_outcome_pointers : [];
  const confirmationPointers = Array.isArray(source.confirmation_pointers) ? source.confirmation_pointers : [];
  const issueResolutionPointers = Array.isArray(source.issue_resolution_pointers) ? source.issue_resolution_pointers : [];
  const evidenceScope = source.evidence_scope && typeof source.evidence_scope === "object" ? source.evidence_scope : {};
  return {
    source: firstTruthy(source.source, "trust_events_redacted_extract"),
    sourceNote: firstTruthy(
      source.source_note,
      "Aggregated from public-safe TrustEvent categories only. Raw TrustEvents are not exposed."
    ),
    evidenceScope: {
      readingScope: firstTruthy(evidenceScope.reading_scope, "primary_only"),
      includedActiveCommunityCount: firstNumberLike(evidenceScope.included_active_community_count),
      includesHolderLevelRecords: evidenceScope.includes_holder_level_records === true,
      publicSummary: firstTruthy(
        evidenceScope.public_summary,
        "Purpose evidence is currently anchored to the primary community plus holder-level records."
      ),
      boundary: firstTruthy(
        evidenceScope.boundary,
        "This Decision Pack may include holder-level records, but it does not mean every community gives the same judgement."
      ),
    },
    categories: categories
      .map((category: any) => ({
        key: firstTruthy(category?.key, category?.label),
        label: firstTruthy(category?.label, "Evidence category"),
        status: firstTruthy(category?.status, "not_shown"),
        evidenceCount: firstNumberLike(category?.evidence_count),
        latestAt: safeDateTime(category?.latest_at),
        decisionUse: firstTruthy(
          category?.decision_use,
          "Use this as a public pointer only; ask for direct confirmation before relying on it."
        ),
      }))
      .filter((category: DecisionPackEvidenceCategory) => category.key || category.label)
      .slice(0, 6),
    declaredClaims: declaredClaims
      .map((claim: any) => ({
        key: firstTruthy(claim?.key, claim?.label),
        label: firstTruthy(claim?.label, "Declared work/service claim"),
        status: firstTruthy(claim?.status, "not_shown"),
        value: firstTruthy(
          claim?.value,
          "No structured work/service claim is visible for this Decision Pack yet."
        ),
        source: firstTruthy(claim?.source, "decision_pack_extract"),
        evidenceCount: firstNumberLike(claim?.evidence_count),
        decisionUse: firstTruthy(
          claim?.decision_use,
          "Use this as a claim pointer only; ask for direct confirmation before relying on it."
        ),
      }))
      .filter((claim: DecisionPackDeclaredClaim) => claim.key || claim.label)
      .slice(0, 4),
    declarationBoundaryNote: firstTruthy(
      source.declaration_boundary_note,
      "Declared shop, listing, or trade records are evidence pointers only. They do not prove licence, insurance, work quality, or future performance."
    ),
    recordPointers: recordPointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Connected record pointer"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No connected financial/support record pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "decision_pack_extract"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as a record pointer only; review private evidence or ask for confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackRecordPointer) => pointer.key || pointer.label)
      .slice(0, 4),
    recordPointerBoundaryNote: firstTruthy(
      source.record_pointer_boundary_note,
      "Connected financial/support records are evidence pointers only. They do not prove creditworthiness, legal tenancy status, rent payment, bank approval, or future repayment."
    ),
    housingReferencePointers: housingReferencePointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Housing reference readiness"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No housing-reference readiness pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "repayments+pool_events+community_confirmation"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as housing-context evidence only; ask for landlord/reference confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackHousingReferencePointer) => pointer.key || pointer.label)
      .slice(0, 4),
    housingReferenceBoundaryNote: firstTruthy(
      source.housing_reference_boundary_note,
      "Housing-reference readiness pointers are aggregate housing-context evidence only. They do not expose landlords, accommodation providers, addresses, rent amounts, payment references, private witness notes, allegations, legal tenancy status, right-to-rent checks, affordability decisions, tenancy approval, guaranteed rent, or future conduct guarantees."
    ),
    guaranteeOutcomePointers: guaranteeOutcomePointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Guarantee/support outcome pointer"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No guarantee/support outcome pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "loan_guarantors+loans"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as support-context evidence only; ask for private context or live confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackGuaranteeOutcomePointer) => pointer.key || pointer.label)
      .slice(0, 4),
    guaranteeOutcomeBoundaryNote: firstTruthy(
      source.guarantee_outcome_boundary_note,
      "Guarantee/support outcome pointers are aggregate support-context evidence only. They do not expose borrower or guarantor identities, amounts, payment references, private notes, bank guarantees, loan approvals, cash custody, or future support promises."
    ),
    fulfillmentOutcomePointers: fulfillmentOutcomePointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Fulfilment/correction outcome pointer"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No protected-trade fulfilment or correction outcome pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "protected_trade_records"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as protected-trade outcome context only; ask for private context or live confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackFulfillmentOutcomePointer) => pointer.key || pointer.label)
      .slice(0, 4),
    fulfillmentOutcomeBoundaryNote: firstTruthy(
      source.fulfillment_outcome_boundary_note,
      "Fulfilment/correction outcome pointers are aggregate protected-trade evidence only. They do not expose trade codes, buyer or seller identities, item details, amounts, payment references, private notes, escrow, payout approval, delivery guarantees, product-quality proof, or future performance promises."
    ),
    completedWorkPointers: completedWorkPointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Completed work/customer confirmation"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No completed-work or customer-confirmation pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "trust_events+marketplace_reviews"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as completed-work context only; ask for private context or live confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackCompletedWorkPointer) => pointer.key || pointer.label)
      .slice(0, 4),
    completedWorkBoundaryNote: firstTruthy(
      source.completed_work_boundary_note,
      "Completed-work/customer-confirmation pointers are aggregate work-outcome evidence only. They do not expose customer identities, reviewer identities, review text, notes, addresses, item details, prices, ratings by person, private metadata, licences, insurance, home-safety approval, or future work quality."
    ),
    demandRequestOutcomePointers: demandRequestOutcomePointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Demand Box request outcomes"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No Demand Box request outcome pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "marketplace_requests"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as requester-side demand history only; ask for response, quote, job, or customer confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackDemandRequestOutcomePointer) => pointer.key || pointer.label)
      .slice(0, 4),
    demandRequestOutcomeBoundaryNote: firstTruthy(
      source.demand_request_outcome_boundary_note,
      "Demand Box request-outcome pointers are aggregate requester-side demand evidence only. They do not expose requester identities, responder identities, request titles, descriptions, areas, phone numbers, quotes, addresses, prices, private notes, Demand Box codes, or proof that the holder responded to, was hired for, or completed work."
    ),
    confirmationPointers: confirmationPointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Community witness outcome"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No community witness outcome is visible for this Decision Pack reason yet."
        ),
        source: firstTruthy(pointer?.source, "community_confirmation_requests"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as aggregate witness context only; ask for live confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackConfirmationPointer) => pointer.key || pointer.label)
      .slice(0, 4),
    confirmationPointerBoundaryNote: firstTruthy(
      source.confirmation_pointer_boundary_note,
      "Community witness outcomes are aggregate evidence pointers only. They do not expose responders, private notes, licences, guarantees, approvals, or final decisions."
    ),
    issueResolutionPointers: issueResolutionPointers
      .map((pointer: any) => ({
        key: firstTruthy(pointer?.key, pointer?.label),
        label: firstTruthy(pointer?.label, "Issue resolution pointer"),
        status: firstTruthy(pointer?.status, "not_shown"),
        value: firstTruthy(
          pointer?.value,
          "No issue-resolution pointer is visible for this Decision Pack yet."
        ),
        source: firstTruthy(pointer?.source, "community_confirmation_reviews"),
        evidenceCount: firstNumberLike(pointer?.evidence_count),
        decisionUse: firstTruthy(
          pointer?.decision_use,
          "Use this as aggregate review status only; ask for private context or live confirmation before relying."
        ),
      }))
      .filter((pointer: DecisionPackIssueResolutionPointer) => pointer.key || pointer.label)
      .slice(0, 4),
    issueResolutionBoundaryNote: firstTruthy(
      source.issue_resolution_boundary_note,
      "Issue-resolution pointers are aggregate review-status evidence only. They do not expose allegations, private notes, legal findings, defamatory detail, or final suitability decisions."
    ),
    privateReviewRequired: privateReviewRequired
      .map((category: any) => ({
        key: firstTruthy(category?.key, category?.label),
        label: firstTruthy(category?.label, "Private evidence category"),
        status: firstTruthy(category?.status, "private_review_required"),
        decisionUse: firstTruthy(
          category?.decision_use,
          "Ask for the full Trust Passport or live community confirmation if this sensitive evidence matters."
        ),
      }))
      .filter((category: DecisionPackPrivateReviewCategory) => category.key || category.label)
      .slice(0, 6),
    boundaryNote: firstTruthy(
      source.boundary_note,
      "This extract shows public-safe category counts only. It is not a raw event timeline, score, approval, guarantee, repayment history, or dispute disclosure."
    ),
  };
}
function normalizeDecisionPackProfile(
  raw: any,
  fallbackPurpose: string,
  fallbackQuestion: string,
  fallbackFocus: string
): DecisionPackProfileView {
  const source = raw && typeof raw === "object" ? raw : {};
  const rawSignals = Array.isArray(source.relevant_signals) ? source.relevant_signals : [];
  const rawGaps = Array.isArray(source.gaps_to_check) ? source.gaps_to_check : [];
  const prompt = source.community_confirmation_prompt && typeof source.community_confirmation_prompt === "object"
    ? source.community_confirmation_prompt
    : {};
  const relevantSignals = rawSignals
    .map((signal: any) => ({
      key: firstTruthy(signal?.key, signal?.label),
      label: firstTruthy(signal?.label, "Evidence signal"),
      status: firstTruthy(signal?.status, "not_shown"),
      value: firstTruthy(signal?.value, "Not shown on this public paper."),
      decisionUse: firstTruthy(
        signal?.decision_use,
        signal?.decisionUse,
        "Ask for live community confirmation if this signal matters."
      ),
    }))
    .filter((signal: DecisionPackProfileSignal) => signal.key || signal.label)
    .slice(0, 6);
  const gapsToCheck = rawGaps
    .map((gap: any) => ({
      key: firstTruthy(gap?.key, gap?.label),
      label: firstTruthy(gap?.label, "Evidence gap"),
      reason: firstTruthy(gap?.reason, "This signal is not fully shown on the public paper."),
      nextStep: firstTruthy(gap?.next_step, gap?.nextStep, "Resolve this before relying on the paper."),
    }))
    .filter((gap: { key: string; label: string }) => gap.key || gap.label)
    .slice(0, 4);

  return {
    accessPurpose: firstTruthy(source.access_purpose, fallbackPurpose, "Decision Pack"),
    recipientQuestion: firstTruthy(
      source.recipient_question,
      fallbackQuestion,
      "Can I make a better decision with this evidence?"
    ),
    communityConfirmationPrompt: {
      reasonType: firstTruthy(prompt.reason_type, prompt.reasonType, "community_standing_check"),
      question: firstTruthy(
        prompt.question,
        "Ask current community witnesses the purpose-specific question before relying."
      ),
      boundary: firstTruthy(
        prompt.boundary,
        "Responses are community witness evidence only; they are not licences, guarantees, approvals, or final decisions."
      ),
    },
    relevantSignals: relevantSignals.length
      ? relevantSignals
      : [
          {
            key: "decision_focus",
            label: "Evidence focus",
            status: "context",
            value: fallbackFocus || "Current public TrustSlip evidence and next verification step.",
            decisionUse: "Use this as a pointer to what to inspect, not as automatic approval.",
          },
        ],
    gapsToCheck,
    recommendedChecks: stringList(source.recommended_checks).slice(0, 4),
    evidenceExtract: normalizeDecisionPackEvidenceExtract(source.evidence_extract),
    basisNote: firstTruthy(
      source.basis_note,
      "Generated from public TrustSlip signals already visible to the recipient; no private Trust Passport contents are exposed."
    ),
    boundaryNote: firstTruthy(
      source.boundary_note,
      "This profile highlights relevant evidence and gaps. It does not score the person, guarantee future behaviour, or make the decision for the recipient."
    ),
  };
}export function buildTrustSlipVerifyViewModel({
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
  const merchantView = record?.merchant_view || {};
  const evidenceScope =
    record?.evidence_scope ||
    merchantView?.evidence_scope ||
    merchantSummary?.evidence_scope ||
    merchantView?.merchant_summary?.evidence_scope ||
    {};
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
  const activeCommunityCount = firstTruthy(
    record?.active_clan_count,
    record?.active_community_count,
    evidenceScope?.active_community_count,
    communityContext?.active_community_count
  );
  const activeCommunityNumber = firstNumberLike(activeCommunityCount) || 0;
  const evidenceScopeReadingScope = firstTruthy(
    evidenceScope?.reading_scope,
    activeCommunityNumber > 1 ? "primary_plus_wider" : "primary_only"
  );
  const evidenceScopeSummary = firstTruthy(
    evidenceScope?.public_summary,
    activeCommunityNumber > 1
      ? `Primary anchor: ${communityLabel}. Wider context: ${activeCommunityCount} active community contexts.`
      : `Primary anchor: ${communityLabel}. Wider context is still building.`
  );
  const evidenceScopeBoundary = firstTruthy(
    evidenceScope?.boundary,
    "The TrustSlip has one primary community anchor. Wider-network or aggregate readings must be read as supporting context, not as proof that every community gives the same judgement."
  );
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
    "General Decision Pack"
  );
  const rawAccessScope = firstTruthy(
    record?.access_scope,
    rawAccessRecord?.scope,
    rawAccessRecord?.visibility_level,
    record?.visibility_level,
    "Public TrustSlip only"
  );
  const machineAccessScopeLabels = new Map([
    ["public_decision_pack", "Public Decision Pack"],
    ["decision_pack", "Decision Pack"],
    ["public_trustslip", "Public TrustSlip"],
    ["public_trust_slip", "Public TrustSlip"],
    ["standard", "Standard public view"],
  ]);
  const accessScope = firstTruthy(
    machineAccessScopeLabels.get(rawAccessScope.toLowerCase()),
    rawAccessScope
  );
  const rawAccessStatus = firstTruthy(record?.access_status, rawAccessRecord?.status);
  const machineAccessStatuses = new Set([
    "public_context_from_link",
    "backend_access_recorded",
    "backend_access_context_only",
    "access_recorded",
  ]);
  const accessStatus = machineAccessStatuses.has(rawAccessStatus.toLowerCase())
    ? `Shared to support ${accessPurpose}.`
    : firstTruthy(rawAccessStatus, resolvedCode ? "Public code opened" : "Not recorded");
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
    "This public Decision Pack reduces uncertainty; it does not eliminate risk or make the decision for the recipient. Private Trust Passport access remains separate."
  );
  const accessFocus = firstTruthy(
    record?.decision_pack_focus,
    rawAccessRecord?.focus,
    "Current public identity, community standing, evidence currentness, and the next verification step."
  );
  const decisionPackProfile = normalizeDecisionPackProfile(
    record?.decision_pack_profile,
    accessPurpose,
    accessNote,
    accessFocus
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
      "What evidence scope is shown?",
      relationshipEvidenceCount && relationshipEvidenceLabel
        ? `${relationshipEvidenceLabel}. Raw inviter notes are not shown.`
        : holderRole && holderRole.toLowerCase() !== "member"
        ? `Primary role: ${holderRole} inside ${communityLabel}. ${evidenceScopeSummary}`
        : communityActivityCount
          ? `Primary community activity is visible inside ${communityLabel}. ${evidenceScopeSummary}`
          : `${evidenceScopeSummary} This paper is not a full profession record.`,
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
    evidenceScope,
    evidenceScopeSummary,
    evidenceScopeBoundary,
    evidenceScopeReadingScope,
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
    decisionPackProfile,
    recipientAccessRecord: {
      recipientLabel: accessRecipientLabel,
      purpose: accessPurpose,
      scope: accessScope,
      accessedAtLabel: accessRecordedAtLabel,
      status: accessStatus,
      note: accessNote,
      focus: accessFocus,
    },
  };
}
