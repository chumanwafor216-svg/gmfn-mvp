import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import CommunityNoticeModal from "../components/CommunityNoticeModal";
import PageTopNav from "../components/PageTopNav";
import { GsnRealisticIcon, type Gsn3DIconKey } from "../components/GsnRealisticIcon";
import PaymentProofSubmissionPanel from "../components/PaymentProofSubmissionPanel";
import { StableButton } from "../components/StableButton";
import {
  applyCommunityDomainActionReview,
  attemptCommunityDomainOutcomeConfirmationProviderSend,
  cancelCommunityDomainActionReview,
  checkCommunityDomainAvailability,
  correctCommunityDomainOutcomeConfirmationDeliveryReceipt,
  createClan,
  createCommunityDomainOutcomeConfirmationLink,
  createCommunityDomainNotice,
  createCommunityDomainPaymentInstruction,
  createCommunityDomainPackageQuote,
  deactivateCommunityDomainMember,
  decideCommunityDomainActionReview,
  delegateCommunityDomainSetupEditor,
  getAccessToken,
  getCommunityDomainActivityGroupReadiness,
  getCommunityDomainActivityMap,
  getCommunityDomainAppealReadiness,
  getCommunityDomainCapacityPlan,
  getCommunityDomainComplianceMap,
  getCommunityDomainConfigurationMap,
  getCommunityDomainActionReviewLineage,
  getCommunityDomainDashboard,
  getCommunityDomainDelegationMap,
  getCommunityDomainEconomicParticipation,
  getCommunityDomainEvidenceRecordReadiness,
  getCommunityDomainEvidenceReleaseReadiness,
  getCommunityDomainAffiliationReadiness,
  getCommunityDomainGovernanceCoverage,
  getCommunityDomainInstitutionalProfile,
  getCommunityDomainMemberVerificationMap,
  getCommunityDomainMemberPlacementSummary,
  getCommunityDomainModuleScopeReadiness,
  getCommunityDomainNodeActivityMap,
  getCommunityDomainNodeAnalyticsMap,
  getCommunityDomainNodeAutonomyMap,
  getCommunityDomainNodeCommunicationMap,
  getCommunityDomainNodeDomainBoundaryMap,
  getCommunityDomainNodeEconomicMap,
  getCommunityDomainNodeEvidenceAuthorityMap,
  getCommunityDomainNodeParticipationMap,
  getCommunityDomainNodePaidActivityMap,
  getCommunityDomainNodePrivacyMap,
  getCommunityDomainNodeScheduledActivityMap,
  getCommunityDomainNodeServiceMap,
  getCommunityDomainNodeTrustMap,
  getCommunityDomainNodeVaultMap,
  getCommunityDomainNetworkExchangeMap,
  getCommunityDomainNetworkPresence,
  getCommunityDomainNotificationScopeReadiness,
  getCommunityDomainActivityCatalogue,
  getCommunityDomainPeriodSummary,
  getCommunityDomainReadiness,
  getCommunityDomainRecordPrivacyMap,
  getCommunityDomainReviewerQueue,
  getCommunityDomainRolloutPlan,
  getCommunityDomainSetupPlan,
  getCommunityDomainSetupEvidence,
  getCommunityDomainSocialBridge,
  getCommunityDomainSponsorSummary,
  getCommunityDomainTrustRelayReadiness,
  getCommunityDomainTrustMobility,
  getCommunityDomainSubscriptionLifecycle,
  setSelectedClanId,
  listExpectedPayments,
  listCommunityDomainBeneficiaryOutcomes,
  listCommunityDomainPolicies,
  listCommunityDomainServiceSettings,
  listCommunityDomainActionReviews,
  listCommunityDomainActivities,
  listCommunityDomainMembers,
  listCommunityDomainNodeTree,
  listCommunityDomainNotices,
  listCommunityDomainOutcomeCorrectionReviews,
  listMyClans,
  listMyCommunityDomainMembershipRequests,
  listMyCommunityDomains,
  requestCommunityDomainMembership,
  recordCommunityDomainActivity,
  recordCommunityDomainBeneficiaryOutcome,
  recordCommunityDomainOutcomeConfirmationDeliveryReceipt,
  recordCommunityDomainOutcomeContactConsent,
  reviewCommunityDomainOutcomeCorrection,
  reviseCommunityDomainActionReview,
  selectClan,
  submitCommunityDomainSetupEvidence,
  updateCommunityDomainMemberStatus,
  updateCommunityDomainProfile,
  upsertCommunityDomainPolicy,
  withdrawCommunityDomainOutcomeContactConsent,
} from "../lib/api";
import { APP_ROUTES, routeWithCommunity } from "../lib/appRoutes";
import {
  communityPayInReady,
  getCommunityPayInSettlement,
  saveCommunityPayInSettlement,
  type CommunityMoneySettlement,
} from "../lib/communityMoney";
import { humanStatus } from "./communityDomainDashboard/statusLanguage";

const CommunityDomainNodeProjectionGroups = lazy(
  () => import("./communityDomainDashboard/NodeProjectionGroups")
);
const CommunityDomainStructurePlanningPanels = lazy(
  () => import("./communityDomainDashboard/StructurePlanningPanels")
);
const CommunityDomainStructurePreviewPanel = lazy(
  () => import("./communityDomainDashboard/StructurePreviewPanel")
);
const CommunityDomainSetupIntelligenceCards = lazy(
  () => import("./communityDomainDashboard/SetupIntelligenceCards")
);
const CommunityDomainMemberReadinessPanels = lazy(
  () => import("./communityDomainDashboard/MemberReadinessPanels")
);
const CommunityDomainGovernanceReadinessPanels = lazy(
  () => import("./communityDomainDashboard/GovernanceReadinessPanels")
);
const CommunityDomainBillingReadinessPanels = lazy(
  () => import("./communityDomainDashboard/BillingReadinessPanels")
);
const CommunityDomainIdentityReadinessPanels = lazy(
  () => import("./communityDomainDashboard/IdentityReadinessPanels")
);
const CommunityDomainServiceReadinessPanels = lazy(
  () => import("./communityDomainDashboard/ServiceReadinessPanels")
);
const CommunityDomainServiceBoundaryPanels = lazy(
  () => import("./communityDomainDashboard/ServiceBoundaryPanels")
);
const CommunityDomainTrustEvidenceReadinessPanels = lazy(
  () => import("./communityDomainDashboard/TrustEvidenceReadinessPanels")
);
const CommunityDomainAccessRequestsPanel = lazy(
  () => import("./communityDomainDashboard/AccessRequestsPanel")
);
const CommunityDomainSelectorPanel = lazy(
  () => import("./communityDomainDashboard/DomainSelectorPanel")
);
const CommunityDomainDashboardRecoveryPanel = lazy(
  () => import("./communityDomainDashboard/DashboardRecoveryPanel")
);
const CommunityDomainLaneSelectorPanel = lazy(
  () => import("./communityDomainDashboard/LaneSelectorPanel")
);

type DomainLane = {
  lane_key?: string;
  label?: string;
  status?: string;
  count?: number;
};

type StructureDetailKey = "preview" | "foundation" | "boundary" | "activity" | "planning";
type StructureDetailGroupKey = "map" | "readiness" | "rollout";
type ServiceDetailKey = "readiness" | "local" | "boundaries" | "trust" | "evidence";
type ServiceDetailGroupKey = "readiness" | "local" | "trust";
type MemberDetailKey = "readiness" | "placement" | "roster";
type MemberDetailGroupKey = "readiness" | "roster";
type MemberRosterTaskKey = "summary" | "members";
type GovernanceTaskKey =
  | "readiness"
  | "director_summary"
  | "sponsor_summary"
  | "real_life_record"
  | "access_requests";
type GovernanceTaskGroupKey = "readiness" | "reports" | "records";
type DirectorSummaryTaskKey = "overview" | "membership" | "evidence" | "delivery";
type SponsorSummaryTaskKey = "overview" | "evidence" | "delivery" | "export";
type SetupOverviewTaskKey = "notices" | "engine" | "next_setup" | "counts";
type SetupOverviewGroupKey = "action" | "reference";
type SetupNoticeTaskKey = "recent" | "post";
type OperatingSummaryTaskKey = "next_action" | "status" | "allowance" | "permissions";
type OperatingSummaryGroupKey = "action" | "reference";
type SetupWorkbenchTaskKey = "step" | "access";
type SetupAccessTaskKey = "summary" | "authority";
type SetupEditGroupKey = "foundation" | "people" | "services";
type BillingTaskKey = "payment_code" | "account" | "steps" | "readiness";
type BillingAccountTaskKey = "summary" | "setup";
type BillingPaymentTaskKey =
  | "reference"
  | "generate"
  | "credit_link"
  | "pay_account"
  | "proof";
type BillingPaymentGroupKey = "code" | "settlement" | "proof";
type RealLifeRecordTask = "activity" | "beneficiary_outcome";
type ActivityRecordTaskKey = "record" | "catalogue" | "recent";
type ActivityRecordStageKey = "person" | "activity" | "evidence";
type BeneficiaryOutcomeTaskKey = "record" | "recent";
type BeneficiaryOutcomeRecordStageKey = "person" | "change" | "proof";
type BeneficiaryOutcomeRecentPacketKey =
  | "summary"
  | "confirmation"
  | "contact"
  | "delivery"
  | "receipt";
type SetupStepKey =
  | "identity"
  | "payment"
  | "evidence"
  | "structure"
  | "members"
  | "governance"
  | "services"
  | "launch";

type CommunityDomainSetupDraft = {
  domain_name: string;
  display_name: string;
  domain_type: string;
  template_key: string;
  country: string;
  state: string;
  public_profile: string;
  authority_evidence_label: string;
  authority_evidence_reference: string;
  authority_evidence_note: string;
  structure_note: string;
  members_note: string;
  governance_note: string;
  services_note: string;
  feature_policy_json: string;
  saved_at?: string;
  expires_at?: string;
};

type SettlementCountryOption = {
  value: string;
  label: string;
  currency: string;
  hint: string;
};

type CommunityDomainPayInDraft = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  sortCode: string;
  routingNumber: string;
  iban: string;
  swiftBic: string;
  country: string;
  currency: string;
  note: string;
};

const SETTLEMENT_COUNTRY_OPTIONS: SettlementCountryOption[] = [
  { value: "GB", label: "United Kingdom", currency: "GBP", hint: "UK bank transfer" },
  { value: "NG", label: "Nigeria", currency: "NGN", hint: "Nigeria bank transfer" },
  { value: "US", label: "United States", currency: "USD", hint: "ACH or wire transfer" },
  { value: "EU", label: "Euro area", currency: "EUR", hint: "SEPA or IBAN transfer" },
  { value: "GH", label: "Ghana", currency: "GHS", hint: "Ghana bank transfer" },
  { value: "KE", label: "Kenya", currency: "KES", hint: "Kenya bank or mobile money" },
  { value: "ZA", label: "South Africa", currency: "ZAR", hint: "South Africa bank transfer" },
  { value: "CA", label: "Canada", currency: "CAD", hint: "Canadian bank transfer" },
  { value: "AU", label: "Australia", currency: "AUD", hint: "Australian bank transfer" },
  { value: "IN", label: "India", currency: "INR", hint: "India bank transfer" },
  { value: "AE", label: "United Arab Emirates", currency: "AED", hint: "UAE bank transfer" },
  { value: "UG", label: "Uganda", currency: "UGX", hint: "Uganda bank or mobile money" },
  { value: "TZ", label: "Tanzania", currency: "TZS", hint: "Tanzania bank or mobile money" },
  { value: "RW", label: "Rwanda", currency: "RWF", hint: "Rwanda bank transfer" },
  { value: "CM", label: "Cameroon", currency: "XAF", hint: "Central Africa bank transfer" },
  { value: "SN", label: "Senegal", currency: "XOF", hint: "West Africa bank transfer" },
  { value: "CI", label: "Cote d'Ivoire", currency: "XOF", hint: "West Africa bank transfer" },
  { value: "MA", label: "Morocco", currency: "MAD", hint: "Morocco bank transfer" },
  { value: "EG", label: "Egypt", currency: "EGP", hint: "Egypt bank transfer" },
  { value: "ET", label: "Ethiopia", currency: "ETB", hint: "Ethiopia bank transfer" },
  { value: "PK", label: "Pakistan", currency: "PKR", hint: "Pakistan bank transfer" },
  { value: "BD", label: "Bangladesh", currency: "BDT", hint: "Bangladesh bank transfer" },
  { value: "LK", label: "Sri Lanka", currency: "LKR", hint: "Sri Lanka bank transfer" },
  { value: "NP", label: "Nepal", currency: "NPR", hint: "Nepal bank transfer" },
  { value: "SG", label: "Singapore", currency: "SGD", hint: "Singapore bank transfer" },
  { value: "MY", label: "Malaysia", currency: "MYR", hint: "Malaysia bank transfer" },
  { value: "ID", label: "Indonesia", currency: "IDR", hint: "Indonesia bank transfer" },
  { value: "TH", label: "Thailand", currency: "THB", hint: "Thailand bank transfer" },
  { value: "PH", label: "Philippines", currency: "PHP", hint: "Philippines bank transfer" },
  { value: "VN", label: "Vietnam", currency: "VND", hint: "Vietnam bank transfer" },
  { value: "CN", label: "China", currency: "CNY", hint: "China bank transfer" },
  { value: "JP", label: "Japan", currency: "JPY", hint: "Japan bank transfer" },
  { value: "KR", label: "South Korea", currency: "KRW", hint: "South Korea bank transfer" },
  { value: "BR", label: "Brazil", currency: "BRL", hint: "Brazil bank transfer" },
  { value: "MX", label: "Mexico", currency: "MXN", hint: "Mexico bank transfer" },
  { value: "TR", label: "Turkey", currency: "TRY", hint: "Turkey bank transfer" },
  { value: "SA", label: "Saudi Arabia", currency: "SAR", hint: "Saudi Arabia bank transfer" },
];

type DomainFeaturePolicyMode =
  | "off"
  | "admin_only"
  | "delegated_admins"
  | "members_submit_admin_approves"
  | "members_direct"
  | "paid_or_quota";

type DomainFeaturePolicyKey =
  | "announcement_board"
  | "demand_box"
  | "spotlight"
  | "shop_diary"
  | "vault"
  | "marketplace_shops"
  | "member_invites"
  | "payments_contributions"
  | "rosca_cycles";

type DomainFeaturePolicyConfig = {
  version: number;
  features: Record<DomainFeaturePolicyKey, DomainFeaturePolicyMode>;
  spotlight: {
    free_slots: number;
    paid_after_slots: number;
    rotation_hours: number;
  };
};

type CommunityDomainNoticeItem = {
  notice_id?: string | number | null;
  event_id?: string | number | null;
  body?: string | null;
  title?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
  expiry_policy?: string | null;
  active_board_status?: string | null;
  is_archived?: boolean | null;
  posted_by_user_id?: string | number | null;
};

type CommunityDomainActivityDraft = {
  subject_user_id: string;
  activity_type: string;
  activity_label: string;
  quantity: string;
  measurement_unit: string;
  note: string;
  evidence_reference: string;
};

type CommunityDomainOutcomeDraft = {
  subject_user_id: string;
  programme_label: string;
  outcome_indicator: string;
  baseline_value: string;
  after_value: string;
  support_received: string;
  follow_up_state: string;
  outcome_state: string;
  beneficiary_confirmation: string;
  challenge_status: string;
  note: string;
  evidence_reference: string;
};

type BeneficiaryDeliveryReceiptDraft = {
  channel: string;
  delivery_status: string;
  consent_basis: string;
  note: string;
};

type BeneficiaryContactConsentDraft = {
  channel: string;
  destination_reference_status: string;
  destination_reference_label: string;
  consent_basis: string;
  note: string;
};

type BeneficiaryContactConsentWithdrawalDraft = {
  withdrawal_reason: string;
  note: string;
};

type BeneficiaryDeliveryReceiptCorrectionDraft = {
  decision: string;
  note: string;
};

function emptyCommunityDomainActivityDraft(): CommunityDomainActivityDraft {
  return {
    subject_user_id: "",
    activity_type: "attendance",
    activity_label: "",
    quantity: "",
    measurement_unit: "",
    note: "",
    evidence_reference: "",
  };
}

function emptyCommunityDomainOutcomeDraft(): CommunityDomainOutcomeDraft {
  return {
    subject_user_id: "",
    programme_label: "",
    outcome_indicator: "",
    baseline_value: "",
    after_value: "",
    support_received: "",
    follow_up_state: "completed",
    outcome_state: "not_enough_evidence",
    beneficiary_confirmation: "not_requested",
    challenge_status: "none",
    note: "",
    evidence_reference: "",
  };
}

function emptyBeneficiaryDeliveryReceiptDraft(): BeneficiaryDeliveryReceiptDraft {
  return {
    channel: "whatsapp",
    delivery_status: "manual_sent",
    consent_basis: "existing_relationship",
    note: "",
  };
}

function emptyBeneficiaryContactConsentDraft(): BeneficiaryContactConsentDraft {
  return {
    channel: "whatsapp",
    destination_reference_status: "admin_verified_off_platform",
    destination_reference_label: "",
    consent_basis: "beneficiary_consented",
    note: "",
  };
}

function emptyBeneficiaryContactConsentWithdrawalDraft(): BeneficiaryContactConsentWithdrawalDraft {
  return {
    withdrawal_reason: "beneficiary_withdrew_consent",
    note: "",
  };
}

function emptyBeneficiaryDeliveryReceiptCorrectionDraft(): BeneficiaryDeliveryReceiptCorrectionDraft {
  return {
    decision: "marked_incorrect",
    note: "",
  };
}

const BENEFICIARY_OUTCOME_STATE_OPTIONS = [
  { value: "not_enough_evidence", label: "Not enough evidence" },
  { value: "baseline_only", label: "Baseline only" },
  { value: "improved", label: "Improved" },
  { value: "unchanged", label: "Unchanged" },
  { value: "worsened", label: "Worsened" },
  { value: "follow_up_needed", label: "Follow-up needed" },
  { value: "challenged", label: "Challenged" },
];

const BENEFICIARY_FOLLOW_UP_STATE_OPTIONS = [
  { value: "completed", label: "Completed" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in_progress", label: "In progress" },
  { value: "not_started", label: "Not started" },
  { value: "missed", label: "Missed" },
  { value: "not_required", label: "Not required" },
];

const BENEFICIARY_CONFIRMATION_OPTIONS = [
  { value: "not_requested", label: "Not requested" },
  { value: "admin_recorded", label: "Admin recorded" },
  { value: "beneficiary_confirmed", label: "Beneficiary confirmed" },
  { value: "witness_confirmed", label: "Witness confirmed" },
  { value: "multi_party_confirmed", label: "Multi-party confirmed" },
  { value: "declined", label: "Declined" },
  { value: "disputed", label: "Disputed" },
];

const BENEFICIARY_CHALLENGE_STATUS_OPTIONS = [
  { value: "none", label: "No challenge" },
  { value: "challenged", label: "Challenged" },
  { value: "under_review", label: "Under review" },
  { value: "corrected", label: "Corrected" },
  { value: "resolved", label: "Resolved" },
  { value: "withdrawn", label: "Withdrawn" },
];

const BENEFICIARY_CORRECTION_DECISION_OPTIONS = [
  { value: "mark_corrected", label: "Mark corrected" },
  { value: "uphold_original", label: "Uphold original" },
  { value: "withdraw_original", label: "Withdraw original" },
  { value: "needs_follow_up", label: "Needs follow-up" },
  { value: "no_action", label: "No action yet" },
];

const BENEFICIARY_DELIVERY_CHANNEL_OPTIONS = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "copy_link", label: "Copied link" },
  { value: "other", label: "Other" },
];

const BENEFICIARY_DELIVERY_STATUS_OPTIONS = [
  { value: "manual_sent", label: "Shared manually" },
  { value: "manual_failed", label: "Manual share failed" },
  { value: "received_reported", label: "Recipient reported received" },
  { value: "opened_reported", label: "Recipient reported opened" },
];

const BENEFICIARY_DELIVERY_CONSENT_OPTIONS = [
  { value: "existing_relationship", label: "Existing relationship" },
  { value: "beneficiary_consented", label: "Beneficiary consented" },
  { value: "guardian_or_authorized_contact", label: "Guardian or authorized contact" },
  { value: "operational_notice", label: "Operational notice" },
  { value: "not_recorded", label: "Not recorded" },
];

const BENEFICIARY_DELIVERY_RECEIPT_CORRECTION_OPTIONS = [
  { value: "marked_incorrect", label: "Marked incorrect" },
  { value: "superseded_by_new_receipt", label: "Superseded by new receipt" },
  { value: "needs_follow_up", label: "Needs follow-up" },
  { value: "no_action", label: "No action yet" },
];

const BENEFICIARY_CONTACT_REFERENCE_STATUS_OPTIONS = [
  { value: "admin_verified_off_platform", label: "Admin verified offline" },
  { value: "beneficiary_provided", label: "Beneficiary provided" },
  {
    value: "guardian_or_authorized_contact_provided",
    label: "Authorized contact provided",
  },
  { value: "existing_relationship_record", label: "Existing relationship record" },
  { value: "not_recorded", label: "Not recorded" },
];

const BENEFICIARY_CONTACT_CONSENT_WITHDRAWAL_REASON_OPTIONS = [
  { value: "beneficiary_withdrew_consent", label: "Beneficiary withdrew consent" },
  { value: "guardian_withdrew_authority", label: "Guardian withdrew authority" },
  { value: "contact_no_longer_valid", label: "Contact no longer valid" },
  { value: "wrong_recipient", label: "Wrong recipient" },
  { value: "consent_expired", label: "Consent expired" },
  { value: "replaced_by_new_attestation", label: "Replaced by new attestation" },
  { value: "admin_error", label: "Admin error" },
];

const GOVERNANCE_TASK_OPTIONS: Array<{
  key: GovernanceTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review governance blockers, approvals, and setup health.",
  },
  {
    key: "director_summary",
    label: "Director summary",
    note: "Review owner/admin governance counts and action status.",
  },
  {
    key: "sponsor_summary",
    label: "Sponsor pack",
    note: "Review sponsor-safe evidence, delivery, and export material.",
  },
  {
    key: "real_life_record",
    label: "Record real life",
    note: "Capture activity or beneficiary outcome evidence.",
  },
  {
    key: "access_requests",
    label: "Access requests",
    note: "Review pending membership and access decisions.",
  },
];

const GOVERNANCE_TASK_GROUP_OPTIONS: Array<{
  key: GovernanceTaskGroupKey;
  label: string;
  note: string;
  defaultTask: GovernanceTaskKey;
  taskKeys: GovernanceTaskKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Governance health and setup blockers.",
    defaultTask: "readiness",
    taskKeys: ["readiness"],
  },
  {
    key: "reports",
    label: "Reports",
    note: "Director and sponsor-safe reporting.",
    defaultTask: "director_summary",
    taskKeys: ["director_summary", "sponsor_summary"],
  },
  {
    key: "records",
    label: "Records",
    note: "Real-life evidence capture and access requests.",
    defaultTask: "real_life_record",
    taskKeys: ["real_life_record", "access_requests"],
  },
];

const STRUCTURE_DETAIL_OPTIONS: Array<{
  key: StructureDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "preview",
    label: "Structure map",
    note: "Show the operating-unit tree first.",
  },
  {
    key: "foundation",
    label: "Foundation",
    note: "Review local authority, economy, and activity readiness.",
  },
  {
    key: "boundary",
    label: "Boundaries",
    note: "Check child-domain and public boundary readiness.",
  },
  {
    key: "activity",
    label: "Activities",
    note: "Inspect scheduled and paid activity readiness.",
  },
  {
    key: "planning",
    label: "Rollout",
    note: "Open rollout, activity map, and group planning.",
  },
];

const STRUCTURE_DETAIL_GROUP_OPTIONS: Array<{
  key: StructureDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: StructureDetailKey;
  detailKeys: StructureDetailKey[];
}> = [
  {
    key: "map",
    label: "Map",
    note: "Start with the operating-unit tree.",
    defaultDetail: "preview",
    detailKeys: ["preview"],
  },
  {
    key: "readiness",
    label: "Readiness",
    note: "Review foundation and boundary readiness.",
    defaultDetail: "foundation",
    detailKeys: ["foundation", "boundary"],
  },
  {
    key: "rollout",
    label: "Rollout",
    note: "Review activity readiness and rollout planning.",
    defaultDetail: "activity",
    detailKeys: ["activity", "planning"],
  },
];

const SERVICE_DETAIL_OPTIONS: Array<{
  key: ServiceDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review service, billing, settings, economy, and presence readiness.",
  },
  {
    key: "local",
    label: "Local maps",
    note: "Inspect service, privacy, analytics, communication, and vault maps.",
  },
  {
    key: "boundaries",
    label: "Boundaries",
    note: "Check exchange, privacy, setup, compliance, and appeal boundaries.",
  },
  {
    key: "trust",
    label: "Trust maps",
    note: "Review local evidence authority and trust readiness maps.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Open evidence records, release, relay, notices, and mobility readiness.",
  },
];

const SERVICE_DETAIL_GROUP_OPTIONS: Array<{
  key: ServiceDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: ServiceDetailKey;
  detailKeys: ServiceDetailKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review service, billing, settings, economy, and presence readiness.",
    defaultDetail: "readiness",
    detailKeys: ["readiness"],
  },
  {
    key: "local",
    label: "Local rules",
    note: "Review local service maps and operating boundaries.",
    defaultDetail: "local",
    detailKeys: ["local", "boundaries"],
  },
  {
    key: "trust",
    label: "Trust",
    note: "Review trust maps and evidence readiness.",
    defaultDetail: "trust",
    detailKeys: ["trust", "evidence"],
  },
];

const MEMBER_DETAIL_OPTIONS: Array<{
  key: MemberDetailKey;
  label: string;
  note: string;
}> = [
  {
    key: "readiness",
    label: "Member readiness",
    note: "Review placement, member counts, and verification readiness.",
  },
  {
    key: "placement",
    label: "Unit placement",
    note: "Inspect member participation readiness by operating unit.",
  },
  {
    key: "roster",
    label: "Roster control",
    note: "Review active and inactive members, then deactivate or restore carefully.",
  },
];

const MEMBER_DETAIL_GROUP_OPTIONS: Array<{
  key: MemberDetailGroupKey;
  label: string;
  note: string;
  defaultDetail: MemberDetailKey;
  detailKeys: MemberDetailKey[];
}> = [
  {
    key: "readiness",
    label: "Readiness",
    note: "Review member readiness and operating-unit placement before roster changes.",
    defaultDetail: "readiness",
    detailKeys: ["readiness", "placement"],
  },
  {
    key: "roster",
    label: "Roster",
    note: "Open roster control only when you need to deactivate or restore members.",
    defaultDetail: "roster",
    detailKeys: ["roster"],
  },
];

const MEMBER_ROSTER_TASK_OPTIONS: Array<{
  key: MemberRosterTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "summary",
    label: "Summary",
    note: "Check roster size, active public proof, and inactive history first.",
  },
  {
    key: "members",
    label: "Members",
    note: "Open the member rows only when you need to deactivate or restore someone.",
  },
];

const ACTIVITY_RECORD_STAGE_OPTIONS: Array<{
  key: ActivityRecordStageKey;
  label: string;
  note: string;
}> = [
  {
    key: "person",
    label: "Person",
    note: "Identify the member or beneficiary and the activity type.",
  },
  {
    key: "activity",
    label: "Activity",
    note: "Describe what happened and how much was recorded.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Add the evidence reference and record the Trust Event.",
  },
];

const BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS: Array<{
  key: BeneficiaryOutcomeRecordStageKey;
  label: string;
  note: string;
}> = [
  {
    key: "person",
    label: "Person",
    note: "Identify the beneficiary, programme, or case.",
  },
  {
    key: "change",
    label: "Change",
    note: "Capture the measured before-and-after outcome.",
  },
  {
    key: "proof",
    label: "Proof",
    note: "Record confirmation, challenge, and evidence details.",
  },
];

const BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS: Array<{
  key: BeneficiaryOutcomeRecentPacketKey;
  label: string;
  note: string;
}> = [
  {
    key: "summary",
    label: "Summary",
    note: "Review the outcome, response, review, and delivery status first.",
  },
  {
    key: "confirmation",
    label: "Confirm",
    note: "Create a beneficiary confirmation link or review a challenged response.",
  },
  {
    key: "contact",
    label: "Contact",
    note: "Record contact/consent evidence or consent withdrawal.",
  },
  {
    key: "delivery",
    label: "Delivery",
    note: "Review delivery readiness before any manual receipt is recorded.",
  },
  {
    key: "receipt",
    label: "Receipt",
    note: "Record or correct a manual delivery receipt.",
  },
];

const SETUP_STEP_OPTIONS: Array<{
  key: SetupStepKey;
  label: string;
  note: string;
}> = [
  {
    key: "identity",
    label: "Identity",
    note: "Name, type, location, and short public profile.",
  },
  {
    key: "payment",
    label: "Payment",
    note: "Generate or review the payment reference code in Billing.",
  },
  {
    key: "evidence",
    label: "Evidence",
    note: "Record authority evidence labels before formal verification.",
  },
  {
    key: "structure",
    label: "Structure",
    note: "Capture the first operating-unit notes.",
  },
  {
    key: "members",
    label: "Members",
    note: "Capture who should be placed or reviewed first.",
  },
  {
    key: "governance",
    label: "Governance",
    note: "Capture decision and reviewer notes.",
  },
  {
    key: "services",
    label: "Services",
    note: "Capture which services should be on first.",
  },
  {
    key: "launch",
    label: "Launch",
    note: "Check what is still blocking activation or verification.",
  },
];

const SETUP_EDIT_GROUP_OPTIONS: Array<{
  key: SetupEditGroupKey;
  label: string;
  note: string;
  defaultStep: SetupStepKey;
  stepKeys: SetupStepKey[];
}> = [
  {
    key: "foundation",
    label: "Foundation",
    note: "Correct identity, payment, or authority evidence first.",
    defaultStep: "identity",
    stepKeys: ["identity", "payment", "evidence"],
  },
  {
    key: "people",
    label: "People",
    note: "Adjust structure, member placement, or governance notes.",
    defaultStep: "structure",
    stepKeys: ["structure", "members", "governance"],
  },
  {
    key: "services",
    label: "Services",
    note: "Review which domain services should be available first.",
    defaultStep: "services",
    stepKeys: ["services"],
  },
];

const FEATURE_POLICY_OPTIONS: Array<{
  value: DomainFeaturePolicyMode;
  label: string;
}> = [
  { value: "off", label: "Not used here" },
  { value: "admin_only", label: "Admin only" },
  { value: "delegated_admins", label: "Admin + delegated editors" },
  { value: "members_submit_admin_approves", label: "Members submit, admin approves" },
  { value: "members_direct", label: "Members can post directly" },
  { value: "paid_or_quota", label: "Quota / paid after free use" },
];

const DOMAIN_FEATURE_POLICY_ROWS: Array<{
  key: DomainFeaturePolicyKey;
  label: string;
  note: string;
  defaultMode: DomainFeaturePolicyMode;
  icon: Gsn3DIconKey;
}> = [
  {
    key: "announcement_board",
    label: "Announcement Board",
    note: "Official notices for this domain.",
    defaultMode: "admin_only",
    icon: "spotlight-megaphone",
  },
  {
    key: "demand_box",
    label: "Demand Box",
    note: "Needs, support requests, and community help.",
    defaultMode: "members_submit_admin_approves",
    icon: "phone-contact",
  },
  {
    key: "spotlight",
    label: "Spotlight",
    note: "Rotating showcase inside this domain.",
    defaultMode: "admin_only",
    icon: "spotlight-megaphone",
  },
  {
    key: "shop_diary",
    label: "Shop Diary",
    note: "Domain or member shop updates.",
    defaultMode: "members_submit_admin_approves",
    icon: "shop-storefront",
  },
  {
    key: "vault",
    label: "Vault",
    note: "Private records and controlled access.",
    defaultMode: "admin_only",
    icon: "vault-safe",
  },
  {
    key: "marketplace_shops",
    label: "Marketplace Shops",
    note: "Buying, selling, and approved vendor visibility.",
    defaultMode: "members_submit_admin_approves",
    icon: "market-stall",
  },
  {
    key: "member_invites",
    label: "Member Invites",
    note: "Who can bring people into the domain.",
    defaultMode: "admin_only",
    icon: "join-person-plus",
  },
  {
    key: "payments_contributions",
    label: "Payments and Contributions",
    note: "Registrations, donations, event fees, seminar fees, and other money-in activity.",
    defaultMode: "admin_only",
    icon: "finance-wallet-card",
  },
  {
    key: "rosca_cycles",
    label: "ROSCA / Rotating Contributions",
    note: "Rotating contribution cycles and member contribution discipline.",
    defaultMode: "members_submit_admin_approves",
    icon: "repayment-schedule",
  },
];

const BILLING_PAYMENT_TASK_OPTIONS: Array<{
  key: BillingPaymentTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "reference",
    label: "Reference",
    note: "Review the latest exact payment code.",
  },
  {
    key: "generate",
    label: "Generate",
    note: "Open payment-code generation only when a new code is needed.",
  },
  {
    key: "credit_link",
    label: "Credit link",
    note: "Review the GSN record that connects this payment to the owner and domain.",
  },
  {
    key: "pay_account",
    label: "Pay account",
    note: "Check the official GSN account before money leaves the payer.",
  },
  {
    key: "proof",
    label: "Proof",
    note: "Upload payment proof after the bank or provider step is complete.",
  },
];

const BILLING_PAYMENT_GROUP_OPTIONS: Array<{
  key: BillingPaymentGroupKey;
  label: string;
  note: string;
  defaultTask: BillingPaymentTaskKey;
  taskKeys: BillingPaymentTaskKey[];
}> = [
  {
    key: "code",
    label: "Code",
    note: "Reference review and code generation.",
    defaultTask: "reference",
    taskKeys: ["reference", "generate"],
  },
  {
    key: "settlement",
    label: "Settlement",
    note: "Credit identity and official pay account.",
    defaultTask: "credit_link",
    taskKeys: ["credit_link", "pay_account"],
  },
  {
    key: "proof",
    label: "Proof",
    note: "Payment proof upload and review.",
    defaultTask: "proof",
    taskKeys: ["proof"],
  },
];

const SETUP_OVERVIEW_TASK_OPTIONS: Array<{
  key: SetupOverviewTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "next_setup",
    label: "Next setup",
    note: "Open the next practical setup action first.",
  },
  {
    key: "notices",
    label: "Notices",
    note: "Review or post official member-only notices.",
  },
  {
    key: "engine",
    label: "Engine",
    note: "Review the institutional engine facts for this domain.",
  },
  {
    key: "counts",
    label: "Counts",
    note: "Check structure, member, policy, and review totals.",
  },
];

const SETUP_OVERVIEW_GROUP_OPTIONS: Array<{
  key: SetupOverviewGroupKey;
  label: string;
  note: string;
  defaultTask: SetupOverviewTaskKey;
  taskKeys: SetupOverviewTaskKey[];
}> = [
  {
    key: "action",
    label: "Action",
    note: "Start with the next setup move or member-only notices.",
    defaultTask: "next_setup",
    taskKeys: ["next_setup", "notices"],
  },
  {
    key: "reference",
    label: "Reference",
    note: "Use engine facts and counts only when you need context.",
    defaultTask: "engine",
    taskKeys: ["engine", "counts"],
  },
];

const OPERATING_SUMMARY_TASK_OPTIONS: Array<{
  key: OperatingSummaryTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "next_action",
    label: "Do next",
    note: "Open the next safe live operating area or edit setup deliberately.",
  },
  {
    key: "status",
    label: "Status",
    note: "Review domain, billing, activation, and verification state.",
  },
  {
    key: "allowance",
    label: "Allowance",
    note: "Check package limits without changing paid features.",
  },
  {
    key: "permissions",
    label: "Permissions",
    note: "Review feature policy before changing live behaviour.",
  },
];

const OPERATING_SUMMARY_GROUP_OPTIONS: Array<{
  key: OperatingSummaryGroupKey;
  label: string;
  note: string;
  defaultTask: OperatingSummaryTaskKey;
  taskKeys: OperatingSummaryTaskKey[];
}> = [
  {
    key: "action",
    label: "Action",
    note: "Start with the next live move and current status.",
    defaultTask: "next_action",
    taskKeys: ["next_action", "status"],
  },
  {
    key: "reference",
    label: "Reference",
    note: "Use allowance and permissions only when you need context.",
    defaultTask: "allowance",
    taskKeys: ["allowance", "permissions"],
  },
];

const SETUP_NOTICE_TASK_OPTIONS: Array<{
  key: SetupNoticeTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "recent",
    label: "Recent",
    note: "Review official notices already posted for this selected domain.",
  },
  {
    key: "post",
    label: "Post",
    note: "Open the post action only when a new official notice is needed.",
  },
];

const SETUP_ACCESS_TASK_OPTIONS: Array<{
  key: SetupAccessTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "summary",
    label: "Summary",
    note: "Check who can edit this setup before changing authority.",
  },
  {
    key: "authority",
    label: "Authority",
    note: "Open delegation or access-request controls only when needed.",
  },
];

const BILLING_ACCOUNT_TASK_OPTIONS: Array<{
  key: BillingAccountTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "summary",
    label: "Summary",
    note: "Review the saved pay-in account before anyone sends money.",
  },
  {
    key: "setup",
    label: "Setup",
    note: "Open account setup only for the GSN platform admin editing step.",
  },
];

type DashboardPayload = {
  community_domain?: any;
  template?: any;
  viewer?: {
    user_id?: number;
    can_admin?: boolean;
    can_setup_edit?: boolean;
    setup_authority?: string;
  };
  status?: any;
  counts?: any;
  primary_next_action?: {
    action_key?: string;
    label?: string;
    route_hint?: string | null;
    requires_admin?: boolean;
  };
  lanes?: DomainLane[];
  package_quote?: any;
  boundary?: string;
};

type CommunityLinkClanRow = {
  id: number;
  name: string;
  marketplaceName: string;
  description: string;
  communityCode: string;
};

type ActionReviewItem = {
  id?: number | string;
  parent_review_id?: number | string | null;
  action_key?: string;
  requested_by_user_id?: number | string | null;
  requested_by_user_email?: string | null;
  requested_by_user_display_name?: string | null;
  subject_user_id?: number | string | null;
  subject_user_email?: string | null;
  subject_user_display_name?: string | null;
  target_type?: string | null;
  target_id?: string | number | null;
  status?: string | null;
  request_note?: string | null;
  payload?: {
    user_id?: number | string | null;
    role?: string | null;
    [key: string]: unknown;
  } | null;
  required_approvals?: number | string | null;
  approval_count?: number | string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type StructureNode = {
  id?: number | string;
  name?: string | null;
  node_type?: string | null;
  node_kind?: string | null;
  status?: string | null;
  depth?: number | string | null;
  child_count?: number | string | null;
  children?: StructureNode[];
};

type OperatingStateCopy = {
  heading: string;
  detail: string;
  nextStep: string;
  risk: string;
};

type SetupDomainNameCheckState = {
  status: "idle" | "ready" | "blocked";
  domainName: string;
  message: string;
};

const PILLAR_OF_HOPE_SETUP_PROFILE =
  "Pillar of Hope supports families in Aberdeen through Saturday community fitness with Snapfit Aberdeen, food support for families in need, low-cost household items, and health education seminars for women and families.";

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function communityLinkClanId(row: any): number {
  return Number(row?.id || row?.clan_id || row?.community_id || 0);
}

function normalizeCommunityLinkClanRow(row: any): CommunityLinkClanRow | null {
  const id = communityLinkClanId(row);
  if (!id) return null;
  const name = cleanText(row?.name || row?.display_name || row?.clan_name, `Community ${id}`);
  return {
    id,
    name,
    marketplaceName: cleanText(row?.marketplace_name, `${name} Marketplace`),
    description: cleanText(row?.description || row?.marketplace_description),
    communityCode: cleanText(row?.community_code || row?.gmfn_id || row?.clan_code),
  };
}

function normalizeCommunityLinkClanRows(payload: any): CommunityLinkClanRow[] {
  const raw: any[] = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload)
    ? payload
    : [];
  const seen = new Set<number>();
  return raw
    .map(normalizeCommunityLinkClanRow)
    .filter((row: CommunityLinkClanRow | null): row is CommunityLinkClanRow =>
      Boolean(row)
    )
    .filter((row: CommunityLinkClanRow) => {
      if (seen.has(row.id)) return false;
      seen.add(row.id);
      return true;
    });
}

function normalizedSetupText(value: unknown): string {
  return cleanText(value).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isPillarOfHopeDomain(domain: any, draft?: Partial<CommunityDomainSetupDraft> | null): boolean {
  const candidates = [
    domain?.domain_name,
    domain?.display_name,
    draft?.domain_name,
    draft?.display_name,
  ].map(normalizedSetupText);
  return candidates.some((value) => value === "pillar-of-hope" || value === "pillar-of-hope-demo");
}

function defaultDomainFeaturePolicyConfig(): DomainFeaturePolicyConfig {
  return {
    version: 1,
    features: DOMAIN_FEATURE_POLICY_ROWS.reduce(
      (features, row) => ({
        ...features,
        [row.key]: row.defaultMode,
      }),
      {} as Record<DomainFeaturePolicyKey, DomainFeaturePolicyMode>
    ),
    spotlight: {
      free_slots: 3,
      paid_after_slots: 5,
      rotation_hours: 24,
    },
  };
}

function isFeaturePolicyMode(value: unknown): value is DomainFeaturePolicyMode {
  return FEATURE_POLICY_OPTIONS.some((option) => option.value === value);
}

function boundedPositiveInt(value: unknown, fallback: number, max = 100): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 1) return fallback;
  return Math.min(max, Math.floor(numeric));
}

function parseDomainFeaturePolicy(value: unknown): DomainFeaturePolicyConfig {
  const base = defaultDomainFeaturePolicyConfig();
  let parsed: any = null;
  if (typeof value === "string" && value.trim()) {
    try {
      parsed = JSON.parse(value);
    } catch {
      parsed = null;
    }
  } else if (value && typeof value === "object") {
    parsed = value;
  }

  const incomingFeatures =
    parsed?.features && typeof parsed.features === "object" ? parsed.features : {};
  const features = DOMAIN_FEATURE_POLICY_ROWS.reduce((next, row) => {
    const mode = incomingFeatures[row.key];
    next[row.key] = isFeaturePolicyMode(mode) ? mode : row.defaultMode;
    return next;
  }, {} as Record<DomainFeaturePolicyKey, DomainFeaturePolicyMode>);

  return {
    version: 1,
    features,
    spotlight: {
      free_slots: boundedPositiveInt(parsed?.spotlight?.free_slots, base.spotlight.free_slots, 20),
      paid_after_slots: boundedPositiveInt(
        parsed?.spotlight?.paid_after_slots,
        base.spotlight.paid_after_slots,
        50
      ),
      rotation_hours: boundedPositiveInt(
        parsed?.spotlight?.rotation_hours,
        base.spotlight.rotation_hours,
        168
      ),
    },
  };
}

function lockedDomainFeaturePolicyFromPayload(
  payload: any
): { config: DomainFeaturePolicyConfig; loadedAt: string } | null {
  const rows = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.policies)
    ? payload.policies
    : [];
  const lockedRow = rows.find((row: any) => {
    return (
      cleanText(row?.policy_key) === "domain.feature_policy" &&
      cleanText(row?.status, "active") === "active"
    );
  });
  if (!lockedRow) return null;
  return {
    config: parseDomainFeaturePolicy(lockedRow.config),
    loadedAt: cleanText(lockedRow.updated_at || lockedRow.created_at),
  };
}

function serializeDomainFeaturePolicy(config: DomainFeaturePolicyConfig): string {
  return JSON.stringify(config);
}

function featurePolicyModeLabel(mode: DomainFeaturePolicyMode): string {
  return FEATURE_POLICY_OPTIONS.find((option) => option.value === mode)?.label || "Not set";
}

function featurePolicySummary(config: DomainFeaturePolicyConfig): string {
  const controlled = DOMAIN_FEATURE_POLICY_ROWS.map((row) => {
    const mode = featurePolicyModeLabel(config.features[row.key]);
    return `${row.label}: ${mode}`;
  });
  return [
    "Domain feature policy locked from setup.",
    "Community Domain is the governed professional marketplace form: ordinary marketplace behaviours stay available only as this domain permits them.",
    "This policy controls behaviour inside this registered domain; it does not remove member identity in other communities or automate tariffs, upgrades, member bands, paid slots, or outside publishing.",
    ...controlled,
    `Spotlight: ${config.spotlight.free_slots} free slots, paid after ${config.spotlight.paid_after_slots}, ${config.spotlight.rotation_hours}h rotation.`,
  ].join(" ");
}

function domainFeaturePolicyIsReady(value: unknown): boolean {
  const config = parseDomainFeaturePolicy(value);
  return DOMAIN_FEATURE_POLICY_ROWS.every((row) => isFeaturePolicyMode(config.features[row.key]));
}

function domainFeatureIsOff(
  config: DomainFeaturePolicyConfig,
  featureKey: DomainFeaturePolicyKey
): boolean {
  return config.features[featureKey] === "off";
}

function domainFeatureRouteEffect(featureKey: DomainFeaturePolicyKey): string {
  if (featureKey === "announcement_board") {
    return "Live route effect: Official Board posting is blocked when this is off.";
  }
  if (featureKey === "member_invites") {
    return "Live route effect: First Circle and member invite entry are blocked when this is off.";
  }
  if (featureKey === "marketplace_shops") {
    return "Live route effect: shop identity create/edit actions are blocked when this is off.";
  }
  if (featureKey === "shop_diary") {
    return "Live route effect: product, public gallery block, and shop content writes are blocked when this is off.";
  }
  if (featureKey === "payments_contributions") {
    return "Live route effect: linked payment-instruction and money-in routes are blocked when this is off; Community Domain subscription billing stays separate.";
  }
  if (featureKey === "rosca_cycles") {
    return "Live route effect: ROSCA cycle routes are blocked when this is off; paid ROSCA service access remains separate.";
  }
  if (featureKey === "spotlight") {
    return "Live route effect: Spotlight broadcast and paid Spotlight payment routes are blocked when this is off; paid credit pricing stays separate.";
  }
  if (featureKey === "demand_box") {
    return "Live route effect: new Demand Box requests are blocked when this is off; existing requests can still be read or closed.";
  }
  if (featureKey === "vault") {
    return "Live route effect: private Vault content and active Vault access-link creation are blocked when this is off; paid slot entitlement, expiry, and privacy rules stay separate.";
  }
  return "Planning rule only: recorded as the domain rule while this feature engine is connected.";
}

function communityDomainSetupDraftKey(domainId: unknown): string {
  return `gsn.community-domain.setup-draft.${cleanText(domainId, "unknown")}`;
}

function setupDraftFromDomain(domain: any): CommunityDomainSetupDraft {
  return {
    domain_name: cleanText(domain?.domain_name),
    display_name: cleanText(domain?.display_name),
    domain_type: cleanText(domain?.domain_type, "generic_association"),
    template_key: cleanText(domain?.template_key || domain?.domain_type, "generic_association"),
    country: cleanText(domain?.country),
    state: cleanText(domain?.state),
    public_profile: cleanText(domain?.public_profile),
    authority_evidence_label: "",
    authority_evidence_reference: "",
    authority_evidence_note: "",
    structure_note: "",
    members_note: "",
    governance_note: "",
    services_note: "",
    feature_policy_json: serializeDomainFeaturePolicy(defaultDomainFeaturePolicyConfig()),
  };
}

function normalizeSettlementCountryCode(value: unknown): string {
  const text = cleanText(value).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (
    text.includes("NIGERIA") ||
    text === "NG" ||
    text === "NGN"
  ) {
    return "NG";
  }
  if (text.includes("UNITEDSTATES") || text === "USA" || text === "US" || text === "USD") {
    return "US";
  }
  if (text.includes("EURO") || text === "EU" || text === "EUR") {
    return "EU";
  }
  if (text.includes("GHANA") || text === "GH" || text === "GHS") {
    return "GH";
  }
  if (text.includes("KENYA") || text === "KE" || text === "KES") {
    return "KE";
  }
  if (text.includes("SOUTHAFRICA") || text === "ZA" || text === "ZAR") {
    return "ZA";
  }
  if (text.includes("CANADA") || text === "CA" || text === "CAD") {
    return "CA";
  }
  if (text.includes("AUSTRALIA") || text === "AU" || text === "AUD") {
    return "AU";
  }
  if (text.includes("INDIA") || text === "IN" || text === "INR") {
    return "IN";
  }
  if (
    text.includes("UNITEDARABEMIRATES") ||
    text.includes("EMIRATES") ||
    text === "AE" ||
    text === "AED"
  ) {
    return "AE";
  }
  const optionMatch = SETTLEMENT_COUNTRY_OPTIONS.find((option) => {
    const label = option.label.toUpperCase().replace(/[^A-Z0-9]/g, "");
    return text === option.value || text === option.currency || text.includes(label);
  });
  if (optionMatch) {
    return optionMatch.value;
  }
  if (
    text.includes("UNITEDKINGDOM") ||
    text.includes("GREATBRITAIN") ||
    text.includes("SCOTLAND") ||
    text.includes("ENGLAND") ||
    text.includes("WALES") ||
    text.includes("NORTHERNIRELAND") ||
    text === "UK" ||
    text === "GB" ||
    text === "GBP"
  ) {
    return "GB";
  }
  return "GB";
}

function settlementCountryLabel(value: unknown): string {
  const code = normalizeSettlementCountryCode(value);
  return SETTLEMENT_COUNTRY_OPTIONS.find((option) => option.value === code)?.label || "United Kingdom";
}

function settlementCurrencyForCountry(value: unknown): string {
  const code = normalizeSettlementCountryCode(value);
  return SETTLEMENT_COUNTRY_OPTIONS.find((option) => option.value === code)?.currency || "GBP";
}

function settlementValueIsConfigured(value: unknown): boolean {
  const text = cleanText(value).toLowerCase();
  return Boolean(text) && !["to be assigned", "not configured", "pending"].includes(text);
}

function settlementField(settlement: any, snakeKey: string, camelKey: string): string {
  return cleanText(settlement?.[snakeKey] ?? settlement?.[camelKey]);
}

function settlementPaymentRows(settlement: any): Array<[string, string]> {
  if (!settlement || typeof settlement !== "object") return [];
  return [
    ["Bank", settlementField(settlement, "bank_name", "bankName")],
    ["Account name", settlementField(settlement, "account_name", "accountName")],
    ["Account number", settlementField(settlement, "account_number", "accountNumber")],
    ["Sort code", settlementField(settlement, "sort_code", "sortCode")],
    ["Routing number", settlementField(settlement, "routing_number", "routingNumber")],
    ["Bank code", settlementField(settlement, "bank_code", "bankCode")],
    ["Branch code", settlementField(settlement, "branch_code", "branchCode")],
    ["IBAN", settlementField(settlement, "iban", "iban")],
    ["SWIFT / BIC", settlementField(settlement, "swift_bic", "swiftBic")],
  ]
    .map(([label, value]) => [label, cleanText(value)] as [string, string])
    .filter(([, value]) => Boolean(value));
}

function storedPlatformAdminRole(): boolean {
  try {
    if (typeof window === "undefined") return false;
    return cleanText(window.localStorage.getItem("gmfn_role")).toLowerCase() === "admin";
  } catch {
    return false;
  }
}

function emptyCommunityDomainPayInDraft(
  country = "GB",
  currency = "GBP"
): CommunityDomainPayInDraft {
  const normalizedCountry = normalizeSettlementCountryCode(country);
  return {
    accountName: "",
    bankName: "",
    accountNumber: "",
    sortCode: "",
    routingNumber: "",
    iban: "",
    swiftBic: "",
    country: normalizedCountry,
    currency: cleanText(currency, settlementCurrencyForCountry(normalizedCountry)).toUpperCase(),
    note: "",
  };
}

function draftFromCommunityPayInSettlement(
  settlement: CommunityMoneySettlement | null,
  fallbackCountry = "GB",
  fallbackCurrency = "GBP"
): CommunityDomainPayInDraft {
  const normalizedCountry = normalizeSettlementCountryCode(settlement?.country || fallbackCountry);
  return {
    accountName: cleanText(settlement?.accountName),
    bankName: cleanText(settlement?.bankName),
    accountNumber: cleanText(settlement?.accountNumber),
    sortCode: cleanText(settlement?.sortCode),
    routingNumber: cleanText(settlement?.routingNumber || settlement?.achRoutingNumber),
    iban: cleanText(settlement?.iban),
    swiftBic: cleanText(settlement?.swiftBic),
    country: normalizedCountry,
    currency: cleanText(
      settlement?.currency,
      fallbackCurrency || settlementCurrencyForCountry(normalizedCountry)
    ).toUpperCase(),
    note: cleanText(settlement?.supportNote),
  };
}

function setupDraftBelongsToDomain(
  draft: CommunityDomainSetupDraft | null,
  domainDraft: CommunityDomainSetupDraft
): boolean {
  if (!draft) return false;
  const draftDomainName = normalizedSetupText(draft.domain_name);
  const domainName = normalizedSetupText(domainDraft.domain_name);
  const draftDisplayName = normalizedSetupText(draft.display_name);
  const displayName = normalizedSetupText(domainDraft.display_name);

  if (draftDomainName && domainName && draftDomainName !== domainName) return false;
  if (draftDisplayName && displayName && draftDisplayName !== displayName) return false;
  return true;
}

function normalizePillarOfHopeSetupDraft(
  domain: any,
  draft: CommunityDomainSetupDraft
): CommunityDomainSetupDraft {
  if (!isPillarOfHopeDomain(domain, draft)) return draft;
  return {
    ...draft,
    display_name: cleanText(draft.display_name, "Pillar of Hope"),
    domain_name: cleanText(draft.domain_name, "pillar-of-hope"),
    domain_type: "ngo_project_network",
    template_key: "ngo_project_network",
    country: "United Kingdom",
    state: "Scotland / Aberdeen",
    public_profile: PILLAR_OF_HOPE_SETUP_PROFILE,
    feature_policy_json: cleanText(
      draft.feature_policy_json,
      serializeDomainFeaturePolicy(defaultDomainFeaturePolicyConfig())
    ),
  };
}

function readCommunityDomainSetupDraft(domainId: unknown): CommunityDomainSetupDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(communityDomainSetupDraftKey(domainId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object"
      ? (parsed as CommunityDomainSetupDraft)
      : null;
  } catch {
    return null;
  }
}

function writeCommunityDomainSetupDraft(
  domainId: unknown,
  draft: CommunityDomainSetupDraft
): CommunityDomainSetupDraft {
  const now = new Date();
  const expires = new Date(now.getTime() + 48 * 60 * 60 * 1000);
  const next = {
    ...draft,
    saved_at: now.toISOString(),
    expires_at: expires.toISOString(),
  };
  if (typeof window !== "undefined") {
    window.localStorage.setItem(
      communityDomainSetupDraftKey(domainId),
      JSON.stringify(next)
    );
  }
  return next;
}

function setupDraftTimeLabel(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "Not saved yet";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  try {
    return date.toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return raw;
  }
}

function noticeDateLabel(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "";
  const date = new Date(raw);
  if (!Number.isFinite(date.getTime())) return raw;
  try {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return raw;
  }
}

function noticeExpiryLabel(item: CommunityDomainNoticeItem): string {
  if (cleanText(item?.expiry_policy).toLowerCase() === "pinned") return "Pinned";
  const expiresAt = noticeDateLabel(item?.expires_at);
  return expiresAt ? `Visible until ${expiresAt}` : "";
}

function limitWords(value: unknown, maxWords: number): string {
  const words = cleanText(value).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function setupDraftCompletion(
  draft: CommunityDomainSetupDraft,
  domainPayment: any,
  setupEvidenceItems: any[] = []
): {
  ready: number;
  total: number;
  labels: Array<[string, boolean]>;
} {
  const labels: Array<[string, boolean]> = [
    [
      "Identity",
      Boolean(
        cleanText(draft.display_name) &&
          cleanText(draft.domain_name) &&
          cleanText(draft.domain_type)
      ),
    ],
    ["Payment code", Boolean(domainPayment?.id || domainPayment?.reference_display)],
    [
      "Authority evidence",
      Boolean(
        setupEvidenceItems.length ||
        cleanText(draft.authority_evidence_label) ||
          cleanText(draft.authority_evidence_reference) ||
          cleanText(draft.authority_evidence_note)
      ),
    ],
    ["Structure note", Boolean(cleanText(draft.structure_note))],
    ["Members note", Boolean(cleanText(draft.members_note))],
    ["Governance note", Boolean(cleanText(draft.governance_note))],
    ["Services note", Boolean(cleanText(draft.services_note))],
    ["Feature policy", domainFeaturePolicyIsReady(draft.feature_policy_json)],
  ];
  return {
    ready: labels.filter(([, ready]) => ready).length,
    total: labels.length,
    labels,
  };
}

function numericCount(value: unknown): number | null {
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) {
    return null;
  }
  return Math.floor(count);
}

function parsedErrorDetail(err: any): any {
  if (err?.detail && typeof err.detail === "object") return err.detail;
  const message = cleanText(err?.message);
  if (!message) return null;
  try {
    const parsed = JSON.parse(message);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function errorDetailCode(err: any): string {
  const detail = parsedErrorDetail(err);
  const directCode = cleanText(detail?.code).toLowerCase();
  if (directCode) return directCode;
  const message = cleanText(err?.message);
  return message.includes("community_domain_member_review_stale")
    ? "community_domain_member_review_stale"
    : "";
}

function errorDetailMessage(err: any, fallback: string): string {
  const detail = parsedErrorDetail(err);
  return cleanText(detail?.message || err?.message, fallback);
}

function errorDetailActionReview(err: any): ActionReviewItem | null {
  const detail = parsedErrorDetail(err);
  const review = detail?.action_review || detail?.existing_action_review;
  return review && typeof review === "object" ? review : null;
}

function accessRequestApplyErrorMessage(err: any, fallback: string): string {
  if (errorDetailCode(err) === "community_domain_member_review_stale") {
    return (
      "This access request is already out of date because the person is now an "
      + "active member. Refresh access requests before taking another action."
    );
  }
  return errorDetailMessage(err, fallback);
}

function activeMembershipRecoveryMessage(): string {
  return (
    "You are already recorded as an active member of this Community Domain. "
    + "Try opening the dashboard again."
  );
}

function compactStatus(value: unknown): string {
  return humanStatus(value);
}

function setupDomainAvailabilityReasonText(reason: unknown): string {
  const key = cleanText(reason).toLowerCase();
  if (key === "domain_name_required") return "Enter the domain code before checking.";
  if (key === "invalid_domain_name") return "Use letters, numbers, spaces, or hyphens.";
  if (key === "reserved_domain_name") return "That domain code is reserved by GSN.";
  if (key === "domain_name_taken") {
    return "That domain code is already used by another Community Domain.";
  }
  return "That domain code is not available.";
}

function remainingAccessApprovalMessage(review: ActionReviewItem | null | undefined): string {
  const requiredApprovals = numericCount(review?.required_approvals);
  const approvalCount = numericCount(review?.approval_count) ?? 0;
  if (requiredApprovals && requiredApprovals > approvalCount) {
    const remainingApprovals = requiredApprovals - approvalCount;
    return remainingApprovals === 1
      ? "It still needs 1 more approval before membership can be applied."
      : `It still needs ${remainingApprovals} more approvals before membership can be applied.`;
  }
  return "It still needs another approval before membership can be applied.";
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function limitValue(value: unknown, fallback = "not set"): string {
  if (value === null || value === undefined || value === "") return fallback;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? String(numberValue) : cleanText(value, fallback);
}

function capacityLaneByKey(capacityPlan: any, laneKey: string): any | null {
  const lanes = Array.isArray(capacityPlan?.lanes) ? capacityPlan.lanes : [];
  return lanes.find((lane: any) => cleanText(lane?.lane_key) === laneKey) || null;
}

async function readOptional<T>(loader: () => Promise<T>): Promise<T | null> {
  try {
    return await loader();
  } catch {
    return null;
  }
}

function pageShell(): React.CSSProperties {
  return {
    minHeight: "100%",
    width: "100%",
    display: "grid",
    gap: 16,
    alignContent: "start",
    padding: "0 0 28px",
    boxSizing: "border-box",
  };
}

function heroCard(): React.CSSProperties {
  return {
    borderRadius: 26,
    background:
      "radial-gradient(circle at 88% 10%, rgba(214,170,69,0.16) 0%, rgba(214,170,69,0.00) 30%), linear-gradient(180deg, #071424 0%, #0D2640 54%, #173A5C 100%)",
    border: "1px solid rgba(214,228,242,0.16)",
    boxShadow:
      "0 26px 56px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.06)",
    padding: 18,
    color: "#F8FBFF",
    overflow: "hidden",
  };
}

function whiteCard(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.13)",
    boxShadow:
      "0 20px 46px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    color: "#091B2E",
    overflowWrap: "break-word",
  };
}

function softCard(): React.CSSProperties {
  return {
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
    overflowWrap: "break-word",
  };
}

function iconFrame(size = 48): React.CSSProperties {
  return {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: Math.max(14, Math.round(size * 0.34)),
    display: "grid",
    placeItems: "center",
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(238,246,253,0.96) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow:
      "0 12px 24px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.88)",
  };
}

function iconHeaderStyle(): React.CSSProperties {
  return {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    minWidth: 0,
  };
}

function sectionLabel(onDark = false): React.CSSProperties {
  return {
    fontSize: 12,
    color: onDark ? "#F3D06A" : "#506A82",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function helperText(onDark = false): React.CSSProperties {
  return {
    color: onDark ? "rgba(248,251,255,0.82)" : "#4F647A",
    fontSize: 14,
    lineHeight: 1.65,
    overflowWrap: "break-word",
  };
}

function officialBoardHeaderStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
    gap: 12,
    alignItems: "start",
  };
}

function officialBoardActionsStyle(): React.CSSProperties {
  return {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "flex-end",
    alignItems: "center",
    minWidth: 0,
    maxWidth: "100%",
  };
}

function commandGuidanceGrid(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
    gap: 10,
  };
}

function commandGuidanceTile(kind: "next" | "risk"): React.CSSProperties {
  const risk = kind === "risk";
  return {
    borderRadius: 18,
    border: risk ? "1px solid rgba(146,94,8,0.20)" : "1px solid rgba(9,27,46,0.11)",
    background: risk
      ? "linear-gradient(180deg, rgba(255,249,225,0.82) 0%, rgba(248,251,255,0.94) 100%)"
      : "linear-gradient(180deg, rgba(239,247,255,0.96) 0%, rgba(248,251,255,0.98) 100%)",
    padding: 12,
    display: "grid",
    gap: 6,
    minWidth: 0,
  };
}

function billingInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 48,
    borderRadius: 14,
    border: "1px solid rgba(9,27,46,0.16)",
    background: "#FFFFFF",
    color: "#091B2E",
    padding: "0 12px",
    fontSize: 16,
    fontWeight: 800,
    boxSizing: "border-box",
  };
}

function factTile(): React.CSSProperties {
  return {
    borderRadius: 999,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(214,228,242,0.16)",
    padding: "8px 10px",
    minHeight: 42,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minWidth: 0,
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    maxWidth: "100%",
    boxSizing: "border-box",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    lineHeight: 1.2,
  };
}

function billingStepCard(
  step: string,
  title: string,
  detail: string,
  status: string,
  active = false
): React.ReactNode {
  return (
    <div
      key={`${step}-${title}`}
      style={{
        display: "grid",
        gridTemplateColumns: "34px minmax(0, 1fr)",
        gap: 10,
        alignItems: "start",
        padding: 12,
        borderRadius: 16,
        border: active ? "1px solid rgba(12,79,168,0.22)" : "1px solid rgba(9,27,46,0.10)",
        background: active ? "rgba(233,243,255,0.76)" : "rgba(255,255,255,0.74)",
        minWidth: 0,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: 999,
          display: "grid",
          placeItems: "center",
          background: active ? "#0B63CE" : "#EEF4FB",
          color: active ? "#FFFFFF" : "#25415F",
          fontWeight: 950,
          fontSize: 13,
          boxShadow: active ? "0 8px 18px rgba(12,79,168,0.18)" : "none",
        }}
      >
        {step}
      </span>
      <span style={{ display: "grid", gap: 6, minWidth: 0 }}>
        <strong style={{ color: "#07172C", fontSize: 15, lineHeight: 1.18 }}>{title}</strong>
        <span style={{ ...helperText(), fontSize: 12.5, lineHeight: 1.45 }}>{detail}</span>
        <span style={{ ...statusBadge(status), justifySelf: "start" }}>{status}</span>
      </span>
    </div>
  );
}

function laneForAction(actionKey: unknown): string {
  const key = cleanText(actionKey).toLowerCase();
  if (!key || key.includes("setup") || key.includes("draft")) return "settings";
  if (key.includes("package") || key.includes("billing")) return "billing";
  if (key.includes("verify") || key.includes("verification")) return "verification";
  if (key.includes("review") || key.includes("governance")) return "governance";
  if (key.includes("member")) return "members";
  if (key.includes("module")) return "modules";
  if (key.includes("structure")) return "structure";
  return "structure";
}

function communityDomainOperatingStateCopy(status: {
  domain_status?: unknown;
  billing_status?: unknown;
  activation_status?: unknown;
  verification_status?: unknown;
}): OperatingStateCopy {
  const domainStatus = cleanText(status.domain_status, "draft").toLowerCase();
  const activationStatus = cleanText(status.activation_status).toLowerCase();
  const verificationStatus = cleanText(status.verification_status).toLowerCase();
  const waitingForActivation =
    domainStatus.includes("pending") ||
    activationStatus.includes("pending") ||
    activationStatus.includes("waiting");

  if (domainStatus.includes("closed")) {
    return {
      heading: "Domain closed",
      detail:
        "This Community Domain should be treated as closed. Authorized users may still need readable history, but normal operating actions should stay stopped.",
      nextStep: "Review owner/admin recovery before reopening any institutional work.",
      risk: "Do not present this domain as active, verified, renewable, or open for members.",
    };
  }

  if (domainStatus.includes("suspended")) {
    return {
      heading: "Domain suspended",
      detail:
        "This Community Domain is paused. History may remain visible to authorized users, but paid operating actions should not continue while suspension is unresolved.",
      nextStep: "Resolve the suspension or reactivation path before inviting more activity.",
      risk: "Do not treat suspended status as normal activation or verification.",
    };
  }

  if (domainStatus.includes("expired")) {
    return {
      heading: "Domain expired",
      detail:
        "The paid operating period appears expired. The domain may keep readable history, but active work should wait for renewal or reactivation.",
      nextStep: "Review renewal and billing before relying on this domain for live operations.",
      risk: "Do not accept expired status as proof that billing, renewal, or service access is current.",
    };
  }

  if (waitingForActivation) {
    return {
      heading: "Waiting for activation",
      detail:
        "The setup may be underway, but activation is not finished. A quote or payment instruction is still not the same as a live Community Domain.",
      nextStep: "Finish package, payment, activation, and authority checks in their separate owner/admin steps.",
      risk: "Do not call the institution active or verified until the live service record confirms it.",
    };
  }

  if (domainStatus.includes("active")) {
    if (verificationStatus === "verified") {
      return {
        heading: "Active operating domain",
        detail:
          "The domain is active and authority verification is recorded. Keep structure, members, governance, services, renewal, and evidence current.",
        nextStep: "Use readiness checks and operating areas to keep the system healthy.",
        risk: "Active still does not mean every service, payment, Trust Event, or evidence release is enabled.",
      };
    }
    return {
      heading: "Active, not verified",
      detail:
        "The domain can be operated by authorized members, but it must not be presented as a verified institution yet.",
      nextStep: "Run live domain work from the operating lanes. Use setup only to correct details or add verification evidence.",
      risk: "Do not let active billing or active setup language become a verification claim.",
    };
  }

  return {
    heading: "Draft setup",
    detail:
      "This Community Domain exists as a setup record. It is not launched, billed, activated, or verified yet.",
    nextStep: "Review package quote, structure, members, governance, services, and authority before launch.",
    risk: "Do not treat a draft as a live institution or a completed Community Domain.",
  };
}

function laneDisplayLabel(lane: any, fallback = "Lane"): string {
  const key = cleanText(lane?.lane_key).toLowerCase();
  const label = cleanText(lane?.label, fallback);
  if (key === "modules" || label.toLowerCase() === "modules") return "Services";
  if (key === "settings") return "Setup";
  return label;
}

function isCommunityDomainInSetup(status: any, domain: any): boolean {
  const domainStatus = compactStatus(status?.domain_status || domain?.status).toLowerCase();
  const billingStatus = compactStatus(status?.billing_status || domain?.billing_status).toLowerCase();
  const activationStatus = compactStatus(
    status?.activation_status || domain?.activation_status
  ).toLowerCase();
  return (
    domainStatus.includes("draft") ||
    billingStatus.includes("quote") ||
    activationStatus.includes("not active") ||
    activationStatus.includes("waiting")
  );
}

function isCommunityDomainOperational(status: any, domain: any): boolean {
  const domainStatus = compactStatus(status?.domain_status || domain?.status).toLowerCase();
  const billingStatus = compactStatus(status?.billing_status || domain?.billing_status).toLowerCase();
  const activationStatus = compactStatus(
    status?.activation_status || domain?.activation_status
  ).toLowerCase();
  const blockedDomain =
    domainStatus.includes("closed") ||
    domainStatus.includes("suspended") ||
    domainStatus.includes("expired");
  const billingReady =
    !billingStatus ||
    billingStatus.includes("active") ||
    billingStatus.includes("paid") ||
    billingStatus.includes("confirmed") ||
    billingStatus.includes("current");
  const activationReady =
    !activationStatus ||
    activationStatus.includes("active") ||
    activationStatus.includes("approved") ||
    activationStatus.includes("confirmed") ||
    activationStatus.includes("launched");
  const activationBlocked =
    activationStatus.includes("not active") ||
    activationStatus.includes("waiting") ||
    activationStatus.includes("pending");

  return (
    !blockedDomain &&
    domainStatus.includes("active") &&
    billingReady &&
    activationReady &&
    !activationBlocked
  );
}

function firstAvailableOperationalLaneKey(lanes: any[], status: any): string {
  const verificationStatus = compactStatus(status?.verification_status).toLowerCase();
  const preferredKeys =
    verificationStatus === "verified"
      ? ["members", "structure", "modules", "governance", "billing"]
      : ["modules", "members", "structure", "governance", "billing"];
  const laneKeys = lanes.map((lane) => cleanText(lane?.lane_key)).filter(Boolean);
  return (
    preferredKeys.find((key) => laneKeys.includes(key)) ||
    laneKeys.find((key) => key !== "settings") ||
    "settings"
  );
}

function setupStepForLane(laneKey: string): SetupStepKey {
  const key = cleanText(laneKey, "settings").toLowerCase();
  if (key === "billing") return "payment";
  if (key === "modules") return "services";
  if (key === "members") return "members";
  if (key === "governance") return "governance";
  if (key === "structure") return "structure";
  if (key === "verification" || key === "evidence") return "evidence";
  return "identity";
}

function setupStepPlaceholder(
  step: SetupStepKey,
  domain: any,
  draft: CommunityDomainSetupDraft
): string {
  const pillar = isPillarOfHopeDomain(domain, draft);
  if (pillar) {
    if (step === "structure") {
      return "Example: trustees, family support team, Saturday fitness, food support, household items, health seminars.";
    }
    if (step === "members") {
      return "Example: founder, trustees, volunteers, Snapfit partner contact, food-support coordinators.";
    }
    if (step === "governance") {
      return "Example: who approves members, notices, donations evidence, programme records, and service changes.";
    }
    return "Example: fitness, food support, household items, women's health seminars, notices, spotlight, records.";
  }

  if (step === "structure") {
    return "Example: main office, branches, departments, teams, programme groups, or service areas.";
  }
  if (step === "members") {
    return "Example: owner, first admins, staff, volunteers, coordinators, trusted community contacts.";
  }
  if (step === "governance") {
    return "Example: who can approve settings, members, evidence, notices, and major changes.";
  }
  return "Example: marketplace, notices, verification, records, analytics, vault, shop, spotlight.";
}

function reviewStatusCounts(items: ActionReviewItem[]): Record<string, number> {
  return items.reduce<Record<string, number>>((counts, item) => {
    const status = cleanText(item.status, "unknown").toLowerCase();
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function isSelfServiceMembershipAccessRequest(review: ActionReviewItem): boolean {
  const requestedBy = cleanText(review.requested_by_user_id);
  const subjectUser = cleanText(review.subject_user_id);
  const targetUser = cleanText(review.target_id);
  const payloadUser = cleanText(review.payload?.user_id);
  const payloadHasRole = Object.prototype.hasOwnProperty.call(review.payload || {}, "role");
  const payloadHasStatus = Object.prototype.hasOwnProperty.call(review.payload || {}, "status");
  const payloadRole = cleanText(review.payload?.role).toLowerCase();
  const payloadStatus = cleanText(review.payload?.status).toLowerCase();
  return (
    cleanText(review.action_key) === "domain_member.upsert" &&
    cleanText(review.target_type) === "domain_member" &&
    Object.prototype.hasOwnProperty.call(review.payload || {}, "previous_status") &&
    payloadHasRole &&
    payloadRole === "member" &&
    payloadHasStatus &&
    payloadStatus === "active" &&
    Boolean(requestedBy) &&
    requestedBy === subjectUser &&
    requestedBy === targetUser &&
    requestedBy === payloadUser
  );
}

function mergeActionReviews(...groups: ActionReviewItem[][]): ActionReviewItem[] {
  const byId = new Map<string, ActionReviewItem>();
  groups.flat().forEach((item) => {
    const id = cleanText(item.id);
    if (id) byId.set(id, item);
  });
  return Array.from(byId.values());
}

function actionReviewSortValue(item: ActionReviewItem): number {
  const updatedAt = Date.parse(cleanText(item.updated_at));
  if (Number.isFinite(updatedAt)) return updatedAt;
  const createdAt = Date.parse(cleanText(item.created_at));
  if (Number.isFinite(createdAt)) return createdAt;
  return 0;
}

function actionReviewIdValue(item: ActionReviewItem): number {
  const reviewId = Number(item.id);
  return Number.isFinite(reviewId) ? reviewId : 0;
}

function compareActionReviewsNewest(left: ActionReviewItem, right: ActionReviewItem): number {
  const timeDelta = actionReviewSortValue(right) - actionReviewSortValue(left);
  if (timeDelta !== 0) return timeDelta;
  return actionReviewIdValue(right) - actionReviewIdValue(left);
}

function latestRelevantMembershipRequest(items: ActionReviewItem[]): ActionReviewItem | null {
  const openStatuses = new Set(["pending", "pending_review", "needs_changes", "approved"]);
  const supersededParentIds = new Set(
    items.map((item) => cleanText(item.parent_review_id)).filter(Boolean)
  );
  const currentItems = items
    .filter((item) => !supersededParentIds.has(cleanText(item.id)))
    .sort(compareActionReviewsNewest);
  const allItems = [...items].sort(compareActionReviewsNewest);
  return (
    currentItems.find((item) =>
      openStatuses.has(cleanText(item.status).toLowerCase())
    ) ||
    currentItems[0] ||
    allItems.find((item) =>
      openStatuses.has(cleanText(item.status).toLowerCase())
    ) ||
    allItems[0] ||
    null
  );
}

function accessRequestSortPriority(item: ActionReviewItem): number {
  const status = cleanText(item.status).toLowerCase();
  if (status === "approved") return 0;
  if (status === "pending_review") return 1;
  if (status === "pending") return 2;
  return 3;
}

function sortMembershipAccessRequests(items: ActionReviewItem[]): ActionReviewItem[] {
  return [...items].sort((left, right) => {
    const priorityDelta =
      accessRequestSortPriority(left) - accessRequestSortPriority(right);
    if (priorityDelta !== 0) return priorityDelta;
    return compareActionReviewsNewest(left, right);
  });
}

export default function CommunityDomainDashboardPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const communityDomainId = cleanText(params.communityDomainId || params.id);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [dashboardRouteId, setDashboardRouteId] = useState("");
  const [domainItems, setDomainItems] = useState<any[]>([]);
  const [reviewerQueue, setReviewerQueue] = useState<ActionReviewItem[]>([]);
  const [ownMembershipRequests, setOwnMembershipRequests] = useState<ActionReviewItem[]>([]);
  const [membershipRequestLineage, setMembershipRequestLineage] = useState<ActionReviewItem[]>([]);
  const [loadingMembershipRequestLineage, setLoadingMembershipRequestLineage] =
    useState(false);
  const [placementSummary, setPlacementSummary] = useState<any | null>(null);
  const [domainMemberRows, setDomainMemberRows] = useState<any[]>([]);
  const [nodeTree, setNodeTree] = useState<StructureNode[]>([]);
  const [moduleScopeReadiness, setModuleScopeReadiness] = useState<any | null>(null);
  const [setupReadiness, setSetupReadiness] = useState<any | null>(null);
  const [setupPlan, setSetupPlan] = useState<any | null>(null);
  const [capacityPlan, setCapacityPlan] = useState<any | null>(null);
  const [governanceCoverage, setGovernanceCoverage] = useState<any | null>(null);
  const [delegationMap, setDelegationMap] = useState<any | null>(null);
  const [periodSummary, setPeriodSummary] = useState<any | null>(null);
  const [sponsorSummary, setSponsorSummary] = useState<any | null>(null);
  const [busySponsorExportCopy, setBusySponsorExportCopy] = useState(false);
  const [activityCatalogue, setActivityCatalogue] = useState<any[]>([]);
  const [activityRows, setActivityRows] = useState<any[]>([]);
  const [beneficiaryOutcomeRows, setBeneficiaryOutcomeRows] = useState<any[]>([]);
  const [beneficiaryCorrectionRows, setBeneficiaryCorrectionRows] = useState<any[]>([]);
  const [beneficiaryCorrectionDecisionByOutcomeId, setBeneficiaryCorrectionDecisionByOutcomeId] =
    useState<Record<string, string>>({});
  const [beneficiaryCorrectionNoteByOutcomeId, setBeneficiaryCorrectionNoteByOutcomeId] =
    useState<Record<string, string>>({});
  const [rolloutPlan, setRolloutPlan] = useState<any | null>(null);
  const [activityMap, setActivityMap] = useState<any | null>(null);
  const [activityGroupReadiness, setActivityGroupReadiness] = useState<any | null>(null);
  const [memberVerificationMap, setMemberVerificationMap] = useState<any | null>(null);
  const [networkExchangeMap, setNetworkExchangeMap] = useState<any | null>(null);
  const [recordPrivacyMap, setRecordPrivacyMap] = useState<any | null>(null);
  const [configurationMap, setConfigurationMap] = useState<any | null>(null);
  const [complianceMap, setComplianceMap] = useState<any | null>(null);
  const [appealReadiness, setAppealReadiness] = useState<any | null>(null);
  const [serviceSettingsProjection, setServiceSettingsProjection] = useState<any | null>(null);
  const [economicParticipation, setEconomicParticipation] = useState<any | null>(null);
  const [networkPresence, setNetworkPresence] = useState<any | null>(null);
  const [nodeAutonomyMap, setNodeAutonomyMap] = useState<any | null>(null);
  const [nodeEconomicMap, setNodeEconomicMap] = useState<any | null>(null);
  const [nodeActivityMap, setNodeActivityMap] = useState<any | null>(null);
  const [nodeTrustMap, setNodeTrustMap] = useState<any | null>(null);
  const [nodeParticipationMap, setNodeParticipationMap] = useState<any | null>(null);
  const [nodeServiceMap, setNodeServiceMap] = useState<any | null>(null);
  const [nodePrivacyMap, setNodePrivacyMap] = useState<any | null>(null);
  const [nodeAnalyticsMap, setNodeAnalyticsMap] = useState<any | null>(null);
  const [nodeDomainBoundaryMap, setNodeDomainBoundaryMap] = useState<any | null>(null);
  const [nodeEvidenceAuthorityMap, setNodeEvidenceAuthorityMap] = useState<any | null>(null);
  const [nodeCommunicationMap, setNodeCommunicationMap] = useState<any | null>(null);
  const [nodeVaultMap, setNodeVaultMap] = useState<any | null>(null);
  const [nodeScheduledActivityMap, setNodeScheduledActivityMap] = useState<any | null>(null);
  const [nodePaidActivityMap, setNodePaidActivityMap] = useState<any | null>(null);
  const [evidenceRecordReadiness, setEvidenceRecordReadiness] = useState<any | null>(null);
  const [evidenceReleaseReadiness, setEvidenceReleaseReadiness] = useState<any | null>(null);
  const [trustRelayReadiness, setTrustRelayReadiness] = useState<any | null>(null);
  const [notificationScopeReadiness, setNotificationScopeReadiness] = useState<any | null>(null);
  const [trustMobility, setTrustMobility] = useState<any | null>(null);
  const [institutionalProfile, setInstitutionalProfile] = useState<any | null>(null);
  const [socialBridge, setSocialBridge] = useState<any | null>(null);
  const [affiliationReadiness, setAffiliationReadiness] = useState<any | null>(null);
  const [subscriptionLifecycle, setSubscriptionLifecycle] = useState<any | null>(null);
  const [quote, setQuote] = useState<any | null>(null);
  const [domainPayment, setDomainPayment] = useState<any | null>(null);
  const [setupEvidence, setSetupEvidence] = useState<any | null>(null);
  const [setupEvidenceFile, setSetupEvidenceFile] = useState<File | null>(null);
  const [communityLinkClanRows, setCommunityLinkClanRows] = useState<CommunityLinkClanRow[]>([]);
  const [paymentClanIdDraft, setPaymentClanIdDraft] = useState("");
  const [creatingDomainMarketplace, setCreatingDomainMarketplace] = useState(false);
  const [quoteAmount, setQuoteAmount] = useState("");
  const [quoteCurrency, setQuoteCurrency] = useState("GBP");
  const [quoteNote, setQuoteNote] = useState("");
  const [billingSettlementCountry, setBillingSettlementCountry] = useState("GB");
  const [communityPayInSettlement, setCommunityPayInSettlement] =
    useState<CommunityMoneySettlement | null>(null);
  const [communityPayInDraft, setCommunityPayInDraft] =
    useState<CommunityDomainPayInDraft>(() => emptyCommunityDomainPayInDraft("GB", "GBP"));
  const [communityPayInLoading, setCommunityPayInLoading] = useState(false);
  const [communityPayInSaving, setCommunityPayInSaving] = useState(false);
  const [activeBillingTask, setActiveBillingTask] =
    useState<BillingTaskKey>("payment_code");
  const [activeBillingAccountTask, setActiveBillingAccountTask] =
    useState<BillingAccountTaskKey>("summary");
  const [activeBillingPaymentTask, setActiveBillingPaymentTask] =
    useState<BillingPaymentTaskKey>("reference");
  const [setupDraft, setSetupDraft] = useState<CommunityDomainSetupDraft>(
    () => setupDraftFromDomain(null)
  );
  const [activeSetupStep, setActiveSetupStep] = useState<SetupStepKey>("identity");
  const [setupCompletionSavedAt, setSetupCompletionSavedAt] = useState("");
  const [featurePolicyLockedAt, setFeaturePolicyLockedAt] = useState("");
  const [lockedFeaturePolicy, setLockedFeaturePolicy] =
    useState<DomainFeaturePolicyConfig | null>(null);
  const [lockedFeaturePolicyLoadedAt, setLockedFeaturePolicyLoadedAt] = useState("");
  const [activeLane, setActiveLane] = useState("settings");
  const [setupJourneyMode, setSetupJourneyMode] = useState<"setup" | "edit">(
    "setup"
  );
  const [setupWorkspaceOpen, setSetupWorkspaceOpen] = useState(false);
  const [activeSetupOverviewTask, setActiveSetupOverviewTask] =
    useState<SetupOverviewTaskKey>("next_setup");
  const [activeSetupNoticeTask, setActiveSetupNoticeTask] =
    useState<SetupNoticeTaskKey>("recent");
  const [activeOperatingSummaryTask, setActiveOperatingSummaryTask] =
    useState<OperatingSummaryTaskKey>("next_action");
  const [activeSetupWorkbenchTask, setActiveSetupWorkbenchTask] =
    useState<SetupWorkbenchTaskKey>("step");
  const [activeSetupAccessTask, setActiveSetupAccessTask] =
    useState<SetupAccessTaskKey>("summary");
  const [showAdvancedTools, setShowAdvancedTools] = useState(false);
  const [operatingAreaPickerOpen, setOperatingAreaPickerOpen] = useState(false);
  const [activeStructureDetail, setActiveStructureDetail] =
    useState<StructureDetailKey>("preview");
  const [activeServiceDetail, setActiveServiceDetail] =
    useState<ServiceDetailKey>("readiness");
  const [activeMemberDetail, setActiveMemberDetail] =
    useState<MemberDetailKey>("readiness");
  const [activeMemberRosterTask, setActiveMemberRosterTask] =
    useState<MemberRosterTaskKey>("summary");
  const [activeGovernanceTask, setActiveGovernanceTask] =
    useState<GovernanceTaskKey>("readiness");
  const [activeDirectorSummaryTask, setActiveDirectorSummaryTask] =
    useState<DirectorSummaryTaskKey>("overview");
  const [activeSponsorSummaryTask, setActiveSponsorSummaryTask] =
    useState<SponsorSummaryTaskKey>("overview");
  const [activeRealLifeRecordTask, setActiveRealLifeRecordTask] =
    useState<RealLifeRecordTask | null>(null);
  const [activeActivityRecordTask, setActiveActivityRecordTask] =
    useState<ActivityRecordTaskKey>("record");
  const [activeActivityRecordStage, setActiveActivityRecordStage] =
    useState<ActivityRecordStageKey>("person");
  const [activeBeneficiaryOutcomeTask, setActiveBeneficiaryOutcomeTask] =
    useState<BeneficiaryOutcomeTaskKey>("record");
  const [activeBeneficiaryOutcomeRecordStage, setActiveBeneficiaryOutcomeRecordStage] =
    useState<BeneficiaryOutcomeRecordStageKey>("person");
  const [
    beneficiaryOutcomeRecentPacketById,
    setBeneficiaryOutcomeRecentPacketById,
  ] = useState<Record<string, BeneficiaryOutcomeRecentPacketKey>>({});
  const [loadedReadinessLanes, setLoadedReadinessLanes] = useState<Record<string, boolean>>({});
  const [loadingReadinessLanes, setLoadingReadinessLanes] = useState<Record<string, boolean>>({});
  const readinessLoadSequence = useRef(0);
  const readinessLoadIds = useRef<Record<string, number>>({});
  const readinessLoadPromises = useRef<Record<string, Promise<any>>>({});
  const [loading, setLoading] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [busyQuote, setBusyQuote] = useState(false);
  const [busyDomainPayment, setBusyDomainPayment] = useState(false);
  const [busyProfileSave, setBusyProfileSave] = useState(false);
  const [busySetupDomainCheck, setBusySetupDomainCheck] = useState(false);
  const [busySetupEvidence, setBusySetupEvidence] = useState(false);
  const [busySetupEditorDelegate, setBusySetupEditorDelegate] = useState(false);
  const [setupEditorSubject, setSetupEditorSubject] = useState("");
  const [setupEditorNote, setSetupEditorNote] = useState("");
  const [setupEditorResult, setSetupEditorResult] = useState<any | null>(null);
  const [busyMembershipRequest, setBusyMembershipRequest] = useState(false);
  const [busyMemberStatusId, setBusyMemberStatusId] = useState<string | null>(null);
  const [busyActivityRecord, setBusyActivityRecord] = useState(false);
  const [activityDraft, setActivityDraft] = useState<CommunityDomainActivityDraft>(
    () => emptyCommunityDomainActivityDraft()
  );
  const [busyBeneficiaryOutcomeRecord, setBusyBeneficiaryOutcomeRecord] =
    useState(false);
  const [busyOutcomeConfirmationLinkId, setBusyOutcomeConfirmationLinkId] =
    useState("");
  const [beneficiaryDeliveryPackByOutcomeId, setBeneficiaryDeliveryPackByOutcomeId] =
    useState<Record<string, any>>({});
  const [beneficiaryDeliveryReceiptDraftByOutcomeId, setBeneficiaryDeliveryReceiptDraftByOutcomeId] =
    useState<Record<string, BeneficiaryDeliveryReceiptDraft>>({});
  const [beneficiaryContactConsentDraftByOutcomeId, setBeneficiaryContactConsentDraftByOutcomeId] =
    useState<Record<string, BeneficiaryContactConsentDraft>>({});
  const [beneficiaryContactConsentWithdrawalDraftByOutcomeId, setBeneficiaryContactConsentWithdrawalDraftByOutcomeId] =
    useState<Record<string, BeneficiaryContactConsentWithdrawalDraft>>({});
  const [beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId, setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId] =
    useState<Record<string, BeneficiaryDeliveryReceiptCorrectionDraft>>({});
  const [busyOutcomeDeliveryReceiptId, setBusyOutcomeDeliveryReceiptId] =
    useState("");
  const [busyOutcomeDeliveryReceiptCorrectionId, setBusyOutcomeDeliveryReceiptCorrectionId] =
    useState("");
  const [busyOutcomeContactConsentId, setBusyOutcomeContactConsentId] =
    useState("");
  const [busyOutcomeContactConsentWithdrawalId, setBusyOutcomeContactConsentWithdrawalId] =
    useState("");
  const [busyOutcomeProviderSendId, setBusyOutcomeProviderSendId] =
    useState("");
  const [busyOutcomeCorrectionReviewId, setBusyOutcomeCorrectionReviewId] =
    useState("");
  const [beneficiaryOutcomeDraft, setBeneficiaryOutcomeDraft] =
    useState<CommunityDomainOutcomeDraft>(() => emptyCommunityDomainOutcomeDraft());
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [setupDomainNameCheck, setSetupDomainNameCheck] =
    useState<SetupDomainNameCheckState>({
      status: "idle",
      domainName: "",
      message: "Check the domain code before saving a changed name.",
    });
  const [domainNotices, setDomainNotices] = useState<CommunityDomainNoticeItem[]>([]);
  const [domainNoticeFeatureMode, setDomainNoticeFeatureMode] =
    useState<DomainFeaturePolicyMode>("admin_only");
  const [domainNoticesLoading, setDomainNoticesLoading] = useState(false);
  const [domainNoticeModalOpen, setDomainNoticeModalOpen] = useState(false);
  const [domainNoticePosting, setDomainNoticePosting] = useState(false);
  const mountedRef = useRef(true);
  const activeCommunityDomainIdRef = useRef(communityDomainId);
  const commandSurfaceRef = useRef<HTMLElement | null>(null);
  const workSurfaceRef = useRef<HTMLElement | null>(null);
  const focusWorkSurfaceAfterOpenRef = useRef(false);
  const dashboardLoadSequence = useRef(0);
  const reviewerQueueLoadSequence = useRef(0);
  const membershipRequestLoadSequence = useRef(0);
  const membershipRequestLineageLoadSequence = useRef(0);

  useEffect(() => {
    activeCommunityDomainIdRef.current = communityDomainId;
  }, [communityDomainId]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      dashboardLoadSequence.current += 1;
      reviewerQueueLoadSequence.current += 1;
      membershipRequestLoadSequence.current += 1;
      membershipRequestLineageLoadSequence.current += 1;
    };
  }, []);

  const isCurrentDomainRequest = useCallback((domainId: string) => {
    return (
      mountedRef.current &&
      cleanText(activeCommunityDomainIdRef.current) === cleanText(domainId)
    );
  }, []);

  const loadLockedFeaturePolicy = useCallback(
    async (domainId = communityDomainId) => {
      const requestDomainId = cleanText(domainId);
      if (!requestDomainId || !getAccessToken()) {
        if (isCurrentDomainRequest(requestDomainId)) {
          setLockedFeaturePolicy(null);
          setLockedFeaturePolicyLoadedAt("");
          setFeaturePolicyLockedAt("");
        }
        return null;
      }

      try {
        const payload = await listCommunityDomainPolicies(requestDomainId);
        if (!isCurrentDomainRequest(requestDomainId)) return null;
        const locked = lockedDomainFeaturePolicyFromPayload(payload);
        setLockedFeaturePolicy(locked?.config || null);
        setLockedFeaturePolicyLoadedAt(locked?.loadedAt || "");
        setFeaturePolicyLockedAt(locked?.loadedAt || "");
        return locked;
      } catch {
        if (isCurrentDomainRequest(requestDomainId)) {
          setLockedFeaturePolicy(null);
          setLockedFeaturePolicyLoadedAt("");
          setFeaturePolicyLockedAt("");
        }
        return null;
      }
    },
    [communityDomainId, isCurrentDomainRequest]
  );

  const loadOwnMembershipRequests = useCallback(async (domainId = communityDomainId) => {
    const requestDomainId = cleanText(domainId);
    const requestId = membershipRequestLoadSequence.current + 1;
    membershipRequestLoadSequence.current = requestId;
    const canApply = () =>
      isCurrentDomainRequest(requestDomainId) &&
      membershipRequestLoadSequence.current === requestId;

    if (!requestDomainId || !getAccessToken()) {
      if (canApply()) {
        setOwnMembershipRequests([]);
      }
      return [];
    }
    try {
      const payload = await listMyCommunityDomainMembershipRequests(requestDomainId);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      if (canApply()) {
        setOwnMembershipRequests(items);
      }
      return items;
    } catch {
      if (canApply()) {
        setOwnMembershipRequests([]);
      }
      return [];
    }
  }, [communityDomainId, isCurrentDomainRequest]);

  const resetReadinessLoadTracking = useCallback(() => {
    setLoadedReadinessLanes({});
    setLoadingReadinessLanes({});
    readinessLoadSequence.current += 1;
    readinessLoadIds.current = {};
    readinessLoadPromises.current = {};
  }, []);

  const resetOptionalReadinessState = useCallback(() => {
    setPlacementSummary(null);
    setDomainMemberRows([]);
    setNodeTree([]);
    setModuleScopeReadiness(null);
    setSetupReadiness(null);
    setSetupPlan(null);
    setActiveSetupOverviewTask("next_setup");
    setActiveSetupNoticeTask("recent");
    setActiveOperatingSummaryTask("next_action");
    setActiveSetupWorkbenchTask("step");
    setActiveSetupAccessTask("summary");
    setActiveBillingTask("payment_code");
    setActiveBillingAccountTask("summary");
    setActiveBillingPaymentTask("reference");
    setOperatingAreaPickerOpen(false);
    setCapacityPlan(null);
    setGovernanceCoverage(null);
    setDelegationMap(null);
    setActiveGovernanceTask("readiness");
    setActiveMemberRosterTask("summary");
    setActiveDirectorSummaryTask("overview");
    setActiveSponsorSummaryTask("overview");
    setPeriodSummary(null);
    setSponsorSummary(null);
    setActivityCatalogue([]);
    setActivityRows([]);
    setActivityDraft(emptyCommunityDomainActivityDraft());
    setActiveRealLifeRecordTask(null);
    setActiveActivityRecordTask("record");
    setActiveActivityRecordStage("person");
    setActiveBeneficiaryOutcomeTask("record");
    setActiveBeneficiaryOutcomeRecordStage("person");
    setBeneficiaryOutcomeRows([]);
    setBeneficiaryOutcomeRecentPacketById({});
    setBeneficiaryOutcomeDraft(emptyCommunityDomainOutcomeDraft());
    setRolloutPlan(null);
    setActivityMap(null);
    setActivityGroupReadiness(null);
    setMemberVerificationMap(null);
    setNetworkExchangeMap(null);
    setRecordPrivacyMap(null);
    setConfigurationMap(null);
    setComplianceMap(null);
    setAppealReadiness(null);
    setServiceSettingsProjection(null);
    setEconomicParticipation(null);
    setNetworkPresence(null);
    setNodeAutonomyMap(null);
    setNodeEconomicMap(null);
    setNodeActivityMap(null);
    setNodeTrustMap(null);
    setNodeParticipationMap(null);
    setNodeServiceMap(null);
    setNodePrivacyMap(null);
    setNodeAnalyticsMap(null);
    setNodeDomainBoundaryMap(null);
    setNodeEvidenceAuthorityMap(null);
    setNodeCommunicationMap(null);
    setNodeVaultMap(null);
    setNodeScheduledActivityMap(null);
    setNodePaidActivityMap(null);
    setEvidenceRecordReadiness(null);
    setEvidenceReleaseReadiness(null);
    setTrustRelayReadiness(null);
    setNotificationScopeReadiness(null);
    setTrustMobility(null);
    setInstitutionalProfile(null);
    setSocialBridge(null);
    setAffiliationReadiness(null);
    setSubscriptionLifecycle(null);
    setSetupEvidence(null);
    setSetupEvidenceFile(null);
  }, []);

  const loadDashboard = useCallback(async () => {
    const requestDomainId = cleanText(communityDomainId);
    const requestId = dashboardLoadSequence.current + 1;
    dashboardLoadSequence.current = requestId;
    const canApply = () =>
      isCurrentDomainRequest(requestDomainId) &&
      dashboardLoadSequence.current === requestId;

    if (!requestDomainId) {
      setLoading(true);
      setDashboard(null);
      setDashboardRouteId("");
      setQuote(null);
      setLoadingQueue(false);
      reviewerQueueLoadSequence.current += 1;
      membershipRequestLoadSequence.current += 1;
      membershipRequestLineageLoadSequence.current += 1;
      setBusyQuote(false);
      setBusyMembershipRequest(false);
      setBusyReviewId(null);
      resetReadinessLoadTracking();
      setMessage("");
      setReviewerQueue([]);
      setOwnMembershipRequests([]);
      setMembershipRequestLineage([]);
      setLoadingMembershipRequestLineage(false);
      setDomainNotices([]);
      setDomainNoticeFeatureMode("admin_only");
      setDomainNoticesLoading(false);
      setDomainNoticeModalOpen(false);
      setDomainNoticePosting(false);
      setLockedFeaturePolicy(null);
      setLockedFeaturePolicyLoadedAt("");
      setFeaturePolicyLockedAt("");
      resetOptionalReadinessState();
      try {
        const payload = await listMyCommunityDomains();
        if (canApply()) {
          setDomainItems(Array.isArray(payload?.items) ? payload.items : []);
        }
      } catch (err: any) {
        if (canApply()) {
          setDomainItems([]);
          setMessage(
            errorDetailMessage(
              err,
              "GSN could not load your Community Domains. Check that you are signed in."
            )
          );
        }
      } finally {
        if (canApply()) {
          setLoading(false);
        }
      }
      return;
    }

    setLoading(true);
    setDashboardRouteId("");
    setQuote(null);
    setLoadingQueue(false);
    reviewerQueueLoadSequence.current += 1;
    membershipRequestLoadSequence.current += 1;
    membershipRequestLineageLoadSequence.current += 1;
    setBusyQuote(false);
    setBusyMembershipRequest(false);
    setBusyReviewId(null);
    resetReadinessLoadTracking();
    setMessage("");
    setDomainItems([]);
    setReviewerQueue([]);
    setOwnMembershipRequests([]);
    setMembershipRequestLineage([]);
    setLoadingMembershipRequestLineage(false);
    setDomainNotices([]);
    setDomainNoticeFeatureMode("admin_only");
    setDomainNoticesLoading(false);
    setDomainNoticeModalOpen(false);
    setDomainNoticePosting(false);
    setLockedFeaturePolicy(null);
    setLockedFeaturePolicyLoadedAt("");
    setFeaturePolicyLockedAt("");
    resetOptionalReadinessState();
    try {
      const payload = await getCommunityDomainDashboard(requestDomainId);
      if (!canApply()) return;
      const nextDashboard = (payload?.dashboard || null) as DashboardPayload | null;
      const nextSettlementCountry = normalizeSettlementCountryCode(
        nextDashboard?.community_domain?.country
      );
      setDashboard(nextDashboard);
      setDashboardRouteId(communityDomainId);
      setQuote(nextDashboard?.package_quote || null);
      setBillingSettlementCountry(nextSettlementCountry);
      setQuoteCurrency(nextSettlementCountry === "NG" ? "NGN" : "GBP");
      setActiveLane("settings");
      setSetupWorkspaceOpen(false);
      setShowAdvancedTools(false);
      setLoading(false);
      void loadLockedFeaturePolicy(requestDomainId);
      if (nextDashboard?.viewer?.can_admin) {
        const queueRequestId = reviewerQueueLoadSequence.current + 1;
        reviewerQueueLoadSequence.current = queueRequestId;
        const canApplyQueue = () =>
          canApply() && reviewerQueueLoadSequence.current === queueRequestId;
        try {
          const [pendingPayload, approvedPayload] = await Promise.all([
            getCommunityDomainReviewerQueue(requestDomainId),
            listCommunityDomainActionReviews(requestDomainId, { status: "approved" }),
          ]);
          if (!canApplyQueue()) return;
          const pendingItems = Array.isArray(pendingPayload?.items)
            ? pendingPayload.items
            : [];
          const approvedItems = Array.isArray(approvedPayload?.items)
            ? approvedPayload.items
            : [];
          setReviewerQueue(mergeActionReviews(pendingItems, approvedItems));
        } catch {
          if (canApplyQueue()) {
            setReviewerQueue([]);
          }
        }
      }
    } catch (err: any) {
      if (!canApply()) return;
      setDashboard(null);
      setDashboardRouteId("");
      resetReadinessLoadTracking();
      resetOptionalReadinessState();
      await loadOwnMembershipRequests(requestDomainId);
      if (!canApply()) return;
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not open this Community Domain dashboard. Check that you are signed in as an active domain member."
        )
      );
    } finally {
      if (canApply()) {
        setLoading(false);
      }
    }
  }, [
    communityDomainId,
    isCurrentDomainRequest,
    loadOwnMembershipRequests,
    loadLockedFeaturePolicy,
    resetOptionalReadinessState,
    resetReadinessLoadTracking,
  ]);

  const loadDomainNotices = useCallback(
    async (domainId = communityDomainId) => {
      const requestDomainId = cleanText(domainId);
      if (!requestDomainId || !dashboard) {
        setDomainNotices([]);
        setDomainNoticesLoading(false);
        return;
      }

      setDomainNoticesLoading(true);
      try {
        const payload = await listCommunityDomainNotices(requestDomainId, {
          limit: 3,
        }).catch(() => null);
        if (!isCurrentDomainRequest(requestDomainId)) return;
        const rows = Array.isArray(payload?.notices) ? payload.notices : [];
        setDomainNotices(rows);
        const mode = cleanText(payload?.feature_policy_mode, "admin_only");
        setDomainNoticeFeatureMode(
          isFeaturePolicyMode(mode) ? mode : "admin_only"
        );
      } finally {
        if (isCurrentDomainRequest(requestDomainId)) {
          setDomainNoticesLoading(false);
        }
      }
    },
    [communityDomainId, dashboard, isCurrentDomainRequest]
  );

  useEffect(() => {
    if (!dashboard || !communityDomainId) {
      setDomainNotices([]);
      setDomainNoticesLoading(false);
      return;
    }
    void loadDomainNotices(communityDomainId);
  }, [communityDomainId, dashboard, loadDomainNotices]);

  async function submitDomainNotice(
    body: string,
    options?: {
      expiry_policy?: "standard" | "urgent" | "event" | "pinned";
      expires_at?: string;
    }
  ) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    if (!requestDomainId) {
      setMessage("Open a Community Domain before posting a notice.");
      return;
    }
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can post an official notice.");
      return;
    }
    if (domainNoticeFeatureMode === "off") {
      setMessage(
        "Announcement Board is not used in this domain. Change Domain feature policy before posting notices."
      );
      return;
    }

    setDomainNoticePosting(true);
    try {
      await createCommunityDomainNotice(requestDomainId, { body, ...options });
      await loadDomainNotices(requestDomainId);
      setDomainNoticeModalOpen(false);
      setMessage("Official notice posted to this Community Domain only.");
    } catch (err: any) {
      setMessage(
        errorDetailMessage(err, "GSN could not post this Community Domain notice.")
      );
    } finally {
      setDomainNoticePosting(false);
    }
  }

  async function changeDomainMemberStatus(
    row: any,
    nextStatus: "active" | "inactive"
  ) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const userId = cleanText(row?.user_id);
    if (!requestDomainId || !userId) {
      setMessage("Open a Community Domain member before changing status.");
      return;
    }
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can change member status.");
      return;
    }

    const busyKey = `${requestDomainId}:${userId}`;
    setBusyMemberStatusId(busyKey);
    try {
      const payload =
        nextStatus === "inactive"
          ? await deactivateCommunityDomainMember(
              requestDomainId,
              userId,
              "Deactivated from Community Domain roster by an owner/admin."
            )
          : await updateCommunityDomainMemberStatus(requestDomainId, userId, {
              status: "active",
              status_note: "Reactivated in Community Domain roster by an owner/admin.",
            });
      const updatedMembership = payload?.membership || null;
      if (updatedMembership) {
        setDomainMemberRows((current) =>
          current.map((item) =>
            cleanText(item?.user_id) === cleanText(updatedMembership.user_id)
              ? updatedMembership
              : item
          )
        );
      }
      setLoadedReadinessLanes((current) => ({ ...current, members: false }));
      setMessage(
        nextStatus === "inactive"
          ? "Member deactivated. Public active-member proof will no longer pass for this domain."
          : "Member reactivated. Public active-member proof can pass again for this domain."
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not change this Community Domain member status."
        )
      );
    } finally {
      setBusyMemberStatusId(null);
    }
  }

  function updateActivityDraft(
    key: keyof CommunityDomainActivityDraft,
    value: string
  ) {
    setActivityDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitCommunityDomainActivityRecord() {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const subjectUserId = Number(activityDraft.subject_user_id || 0);
    if (!requestDomainId) {
      setMessage("Open a Community Domain before recording activity.");
      return;
    }
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can record activity.");
      return;
    }
    if (!Number.isFinite(subjectUserId) || subjectUserId <= 0) {
      setActiveActivityRecordStage("person");
      setMessage("Enter the GSN user id for the member or beneficiary this activity belongs to.");
      return;
    }

    setBusyActivityRecord(true);
    try {
      const recorded = await recordCommunityDomainActivity(requestDomainId, {
        subject_user_id: subjectUserId,
        activity_type: activityDraft.activity_type,
        activity_label: activityDraft.activity_label,
        quantity: activityDraft.quantity,
        measurement_unit: activityDraft.measurement_unit,
        evidence_strength: "admin_recorded",
        visibility: "director_safe",
        note: activityDraft.note,
        evidence_reference: activityDraft.evidence_reference,
      });
      const [periodPayload, sponsorPayload, activityPayload] = await Promise.all([
        readOptional(() => getCommunityDomainPeriodSummary(requestDomainId)),
        readOptional(() => getCommunityDomainSponsorSummary(requestDomainId)),
        readOptional(() => listCommunityDomainActivities(requestDomainId, { limit: 5 })),
      ]);
      setPeriodSummary(periodPayload || null);
      setSponsorSummary(sponsorPayload || null);
      setActivityRows(
        Array.isArray(activityPayload?.items)
          ? activityPayload.items
          : recorded?.activity
          ? [recorded.activity, ...activityRows].slice(0, 5)
          : activityRows
      );
      setActivityDraft(emptyCommunityDomainActivityDraft());
      setActiveActivityRecordStage("person");
      setMessage(
        "Activity recorded as a person-first Community Domain Trust Event. Beneficiary outcome proof still needs follow-up records."
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this Community Domain activity."
        )
      );
    } finally {
      setBusyActivityRecord(false);
    }
  }

  function updateBeneficiaryOutcomeDraft(
    key: keyof CommunityDomainOutcomeDraft,
    value: string
  ) {
    setBeneficiaryOutcomeDraft((current) => ({ ...current, [key]: value }));
  }

  async function submitCommunityDomainBeneficiaryOutcomeRecord() {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const subjectUserId = Number(beneficiaryOutcomeDraft.subject_user_id || 0);
    if (!requestDomainId) {
      setMessage("Open a Community Domain before recording a beneficiary outcome.");
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can record beneficiary outcomes."
      );
      return;
    }
    if (!Number.isFinite(subjectUserId) || subjectUserId <= 0) {
      setActiveBeneficiaryOutcomeRecordStage("person");
      setMessage("Enter the GSN user id for the beneficiary this outcome belongs to.");
      return;
    }
    if (!cleanText(beneficiaryOutcomeDraft.outcome_indicator)) {
      setActiveBeneficiaryOutcomeRecordStage("change");
      setMessage("Enter the outcome indicator being measured.");
      return;
    }
    if (!cleanText(beneficiaryOutcomeDraft.baseline_value)) {
      setActiveBeneficiaryOutcomeRecordStage("change");
      setMessage("Enter the baseline value before support.");
      return;
    }
    if (!cleanText(beneficiaryOutcomeDraft.after_value)) {
      setActiveBeneficiaryOutcomeRecordStage("change");
      setMessage("Enter the after value or current follow-up state.");
      return;
    }

    setBusyBeneficiaryOutcomeRecord(true);
    try {
      const recorded = await recordCommunityDomainBeneficiaryOutcome(requestDomainId, {
        subject_user_id: subjectUserId,
        programme_label: beneficiaryOutcomeDraft.programme_label,
        outcome_indicator: beneficiaryOutcomeDraft.outcome_indicator,
        baseline_value: beneficiaryOutcomeDraft.baseline_value,
        after_value: beneficiaryOutcomeDraft.after_value,
        support_received: beneficiaryOutcomeDraft.support_received,
        follow_up_state: beneficiaryOutcomeDraft.follow_up_state,
        outcome_state: beneficiaryOutcomeDraft.outcome_state,
        beneficiary_confirmation: beneficiaryOutcomeDraft.beneficiary_confirmation,
        admin_confirmation: "admin_recorded",
        challenge_status: beneficiaryOutcomeDraft.challenge_status,
        evidence_strength:
          beneficiaryOutcomeDraft.beneficiary_confirmation === "beneficiary_confirmed"
            ? "beneficiary_confirmed"
            : "admin_recorded",
        visibility: "director_safe",
        note: beneficiaryOutcomeDraft.note,
        evidence_reference: beneficiaryOutcomeDraft.evidence_reference,
      });
      const [periodPayload, sponsorPayload, outcomePayload] = await Promise.all([
        readOptional(() => getCommunityDomainPeriodSummary(requestDomainId)),
        readOptional(() => getCommunityDomainSponsorSummary(requestDomainId)),
        readOptional(() =>
          listCommunityDomainBeneficiaryOutcomes(requestDomainId, { limit: 5 })
        ),
      ]);
      setPeriodSummary(periodPayload || null);
      setSponsorSummary(sponsorPayload || null);
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items)
          ? outcomePayload.items
          : recorded?.outcome
          ? [recorded.outcome, ...beneficiaryOutcomeRows].slice(0, 5)
          : beneficiaryOutcomeRows
      );
      setBeneficiaryOutcomeDraft(emptyCommunityDomainOutcomeDraft());
      setActiveBeneficiaryOutcomeRecordStage("person");
      setMessage(
        "Beneficiary outcome recorded. It is evidence of baseline-to-after movement, not a final public sponsor report."
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this beneficiary outcome."
        )
      );
    } finally {
      setBusyBeneficiaryOutcomeRecord(false);
    }
  }

  async function createBeneficiaryOutcomeConfirmationLink(outcomeEventId: string) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const requestOutcomeId = cleanText(outcomeEventId);
    if (!requestDomainId || !requestOutcomeId) {
      setMessage("Open a beneficiary outcome before creating a confirmation link.");
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can create beneficiary confirmation links."
      );
      return;
    }

    setBusyOutcomeConfirmationLinkId(requestOutcomeId);
    try {
      const payload = await createCommunityDomainOutcomeConfirmationLink(
        requestDomainId,
        requestOutcomeId,
        {
          responder_type: "beneficiary",
          expires_in_days: 14,
          note: "Private beneficiary confirmation link generated by owner/admin.",
        }
      );
      const path = cleanText(payload?.public_path);
      const shareText = path ? `${window.location.origin}${path}` : "";
      const deliveryPack = payload?.delivery_pack || {};
      const preparedTemplate = cleanText(deliveryPack?.message_text);
      const preparedMessage = path
        ? preparedTemplate.replace(path, shareText || path)
        : preparedTemplate;
      if (deliveryPack?.delivery_event_id) {
        setBeneficiaryDeliveryPackByOutcomeId((current) => ({
          ...current,
          [requestOutcomeId]: deliveryPack,
        }));
      }
      const copyText = cleanText(preparedMessage, shareText);
      if (shareText && navigator?.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(copyText);
        } catch {
          // Clipboard access is browser-dependent; the message still shows the path.
        }
      }
      setMessage(
        copyText
          ? `Manual delivery pack prepared and copied if allowed. GSN did not send WhatsApp, SMS, or email: ${copyText}`
          : "Private confirmation link created. GSN did not send WhatsApp, SMS, or email."
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not create this beneficiary confirmation link."
        )
      );
    } finally {
      setBusyOutcomeConfirmationLinkId("");
    }
  }

  async function recordBeneficiaryOutcomeContactConsent(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    const contactDraft =
      beneficiaryContactConsentDraftByOutcomeId[outcomeEventId] ||
      emptyBeneficiaryContactConsentDraft();
    if (!requestDomainId || !outcomeEventId) {
      setMessage("Open a beneficiary outcome before recording contact consent.");
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can record contact and consent evidence."
      );
      return;
    }

    setBusyOutcomeContactConsentId(outcomeEventId);
    try {
      await recordCommunityDomainOutcomeContactConsent(
        requestDomainId,
        outcomeEventId,
        {
          channel: contactDraft.channel,
          destination_reference_status:
            contactDraft.destination_reference_status,
          destination_reference_label:
            cleanText(contactDraft.destination_reference_label) || undefined,
          consent_basis: contactDraft.consent_basis,
          note:
            cleanText(contactDraft.note) ||
            "Admin recorded contact and consent readiness for beneficiary confirmation.",
        }
      );
      const outcomePayload = await listCommunityDomainBeneficiaryOutcomes(
        requestDomainId,
        { limit: 5 }
      );
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items) ? outcomePayload.items : beneficiaryOutcomeRows
      );
      setMessage(
        `Contact/consent attestation recorded for ${compactStatus(
          contactDraft.channel
        )}. GSN stored no raw destination, did not send WhatsApp, SMS, or email, and provider send is still not ready.`
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this contact and consent attestation."
        )
      );
    } finally {
      setBusyOutcomeContactConsentId("");
    }
  }

  async function withdrawBeneficiaryOutcomeContactConsent(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    const latestContactConsent = item?.latest_contact_consent_record || {};
    const contactConsentEventId = cleanText(latestContactConsent?.event_id);
    const withdrawalDraft =
      beneficiaryContactConsentWithdrawalDraftByOutcomeId[outcomeEventId] ||
      emptyBeneficiaryContactConsentWithdrawalDraft();
    if (!requestDomainId || !outcomeEventId || !contactConsentEventId) {
      setMessage(
        "Record a contact/consent attestation before recording its withdrawal."
      );
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can record contact consent withdrawal."
      );
      return;
    }

    setBusyOutcomeContactConsentWithdrawalId(outcomeEventId);
    try {
      await withdrawCommunityDomainOutcomeContactConsent(
        requestDomainId,
        outcomeEventId,
        contactConsentEventId,
        {
          withdrawal_reason: withdrawalDraft.withdrawal_reason,
          replacement_required: true,
          note:
            cleanText(withdrawalDraft.note) ||
            "Admin recorded that the prior contact/consent attestation is no longer valid.",
        }
      );
      const outcomePayload = await listCommunityDomainBeneficiaryOutcomes(
        requestDomainId,
        { limit: 5 }
      );
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items) ? outcomePayload.items : beneficiaryOutcomeRows
      );
      setMessage(
        `Contact/consent withdrawal recorded as ${compactStatus(
          withdrawalDraft.withdrawal_reason
        )}. Provider send remains unavailable until a valid replacement attestation exists.`
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this contact consent withdrawal."
        )
      );
    } finally {
      setBusyOutcomeContactConsentWithdrawalId("");
    }
  }

  async function recordBeneficiaryOutcomeDeliveryReceipt(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    const receiptDraft =
      beneficiaryDeliveryReceiptDraftByOutcomeId[outcomeEventId] ||
      emptyBeneficiaryDeliveryReceiptDraft();
    const localDeliveryPack = beneficiaryDeliveryPackByOutcomeId[outcomeEventId] || {};
    const deliveryEventId = cleanText(
      localDeliveryPack?.delivery_event_id ||
        item?.latest_delivery_preparation?.event_id
    );
    if (!requestDomainId || !outcomeEventId || !deliveryEventId) {
      setMessage(
        "Create a beneficiary confirmation delivery pack before recording manual delivery."
      );
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can record beneficiary delivery receipts."
      );
      return;
    }

    setBusyOutcomeDeliveryReceiptId(outcomeEventId);
    try {
      await recordCommunityDomainOutcomeConfirmationDeliveryReceipt(
        requestDomainId,
        outcomeEventId,
        deliveryEventId,
        {
          channel: receiptDraft.channel,
          delivery_status: receiptDraft.delivery_status,
          consent_basis: receiptDraft.consent_basis,
          note:
            cleanText(receiptDraft.note) ||
            "Admin recorded a manual delivery status for the prepared confirmation text.",
        }
      );
      const outcomePayload = await listCommunityDomainBeneficiaryOutcomes(
        requestDomainId,
        { limit: 5 }
      );
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items) ? outcomePayload.items : beneficiaryOutcomeRows
      );
      setMessage(
        `Manual delivery receipt recorded as ${compactStatus(
          receiptDraft.delivery_status
        )} by ${compactStatus(
          receiptDraft.channel
        )} with consent basis ${compactStatus(
          receiptDraft.consent_basis
        )}. GSN still did not send WhatsApp, SMS, or email; this is an admin-stated delivery record.`
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this manual delivery receipt."
        )
      );
    } finally {
      setBusyOutcomeDeliveryReceiptId("");
    }
  }

  async function correctBeneficiaryOutcomeDeliveryReceipt(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    const latestDeliveryReceipt = item?.latest_delivery_receipt || null;
    const deliveryEventId = cleanText(
      latestDeliveryReceipt?.delivery_event_id ||
        item?.latest_delivery_preparation?.event_id
    );
    const receiptEventId = cleanText(latestDeliveryReceipt?.event_id);
    const correctionDraft =
      beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId[outcomeEventId] ||
      emptyBeneficiaryDeliveryReceiptCorrectionDraft();
    if (!requestDomainId || !outcomeEventId || !deliveryEventId || !receiptEventId) {
      setMessage(
        "Load a manual delivery receipt before recording a receipt correction."
      );
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can correct beneficiary delivery receipts."
      );
      return;
    }

    setBusyOutcomeDeliveryReceiptCorrectionId(outcomeEventId);
    try {
      await correctCommunityDomainOutcomeConfirmationDeliveryReceipt(
        requestDomainId,
        outcomeEventId,
        deliveryEventId,
        receiptEventId,
        {
          decision: correctionDraft.decision,
          correction_note:
            cleanText(correctionDraft.note) ||
            "Admin recorded a correction against the manual delivery receipt.",
        }
      );
      const outcomePayload = await listCommunityDomainBeneficiaryOutcomes(
        requestDomainId,
        { limit: 5 }
      );
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items) ? outcomePayload.items : beneficiaryOutcomeRows
      );
      setMessage(
        `Manual delivery receipt correction recorded as ${compactStatus(
          correctionDraft.decision
        )}. The original receipt remains in the audit trail; GSN still did not send WhatsApp, SMS, or email.`
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this manual delivery receipt correction."
        )
      );
    } finally {
      setBusyOutcomeDeliveryReceiptCorrectionId("");
    }
  }

  async function checkBeneficiaryOutcomeProviderSend(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    const localDeliveryPack = beneficiaryDeliveryPackByOutcomeId[outcomeEventId] || {};
    const deliveryEventId = cleanText(
      localDeliveryPack?.delivery_event_id ||
        item?.latest_delivery_preparation?.event_id
    );
    if (!requestDomainId || !outcomeEventId || !deliveryEventId) {
      setMessage(
        "Create a beneficiary confirmation delivery pack before checking provider send readiness."
      );
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can check provider send readiness."
      );
      return;
    }

    setBusyOutcomeProviderSendId(outcomeEventId);
    try {
      const payload = await attemptCommunityDomainOutcomeConfirmationProviderSend(
        requestDomainId,
        outcomeEventId,
        deliveryEventId
      );
      const sent = Boolean(payload?.external_channels_sent_by_gsn);
      setMessage(
        sent
          ? "Provider send returned as sent. Check delivery receipts before relying on it."
          : "Provider send is not recorded as sent. GSN did not send WhatsApp, SMS, or email."
      );
    } catch (err: any) {
      const detail = parsedErrorDetail(err);
      const readiness = detail?.provider_delivery_readiness || {};
      const missing = Array.isArray(readiness?.missing_components)
        ? readiness.missing_components.slice(0, 3).join(", ")
        : "";
      const contactConsentContract =
        readiness?.contact_consent_contract || {};
      const activeContactStatus = compactStatus(
        contactConsentContract?.active_contact_consent_status ||
          "not evaluated"
      );
      const contactConsentNote =
        contactConsentContract?.active_contact_consent_satisfied === true
          ? ` Contact/consent status: ${activeContactStatus}.`
          : ` Contact/consent is not provider-ready yet: ${activeContactStatus}.`;
      const blockedCheckNote = detail?.blocked_check_reused
        ? "The existing blocked readiness-check Trust Event was reused."
        : "It recorded only this blocked readiness check as a Trust Event.";
      const messageText =
        cleanText(detail?.code) === "provider_delivery_not_connected"
          ? `Provider send blocked: WhatsApp/SMS/email providers are not connected. GSN created no provider job and no external send. ${blockedCheckNote} Missing: ${
              missing || "provider send API, delivery webhook, retry queue"
            }.${contactConsentNote}`
          : errorDetailMessage(
              err,
              "GSN could not check provider send readiness."
            );
      setMessage(messageText);
      if (cleanText(detail?.code) === "provider_delivery_not_connected") {
        const outcomePayload = await listCommunityDomainBeneficiaryOutcomes(
          requestDomainId,
          { limit: 5 }
        );
        setBeneficiaryOutcomeRows(
          Array.isArray(outcomePayload?.items)
            ? outcomePayload.items
            : beneficiaryOutcomeRows
        );
      }
    } finally {
      setBusyOutcomeProviderSendId("");
    }
  }

  async function copySponsorExportPack() {
    const exportPack = sponsorSummary?.sponsor_export_pack || {};
    const copyText = cleanText(exportPack?.copy_text);
    if (!copyText) {
      setMessage("No sponsor-safe export pack is available yet.");
      return;
    }

    setBusySponsorExportCopy(true);
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setMessage(
          "Sponsor-safe evidence pack copied. GSN did not send or publish it; review the text before sharing."
        );
      } else {
        setMessage(
          `Clipboard access is not available here. Sponsor-safe evidence pack: ${copyText}`
        );
      }
    } catch {
      setMessage(
        `Clipboard access was blocked. Sponsor-safe evidence pack: ${copyText}`
      );
    } finally {
      setBusySponsorExportCopy(false);
    }
  }

  function updateBeneficiaryDeliveryReceiptDraft(
    outcomeEventId: string,
    key: keyof BeneficiaryDeliveryReceiptDraft,
    value: string
  ) {
    const outcomeKey = cleanText(outcomeEventId);
    if (!outcomeKey) return;
    setBeneficiaryDeliveryReceiptDraftByOutcomeId((current) => {
      const previous =
        current[outcomeKey] || emptyBeneficiaryDeliveryReceiptDraft();
      return {
        ...current,
        [outcomeKey]: {
          ...previous,
          [key]: value,
        },
      };
    });
  }

  function updateBeneficiaryContactConsentDraft(
    outcomeEventId: string,
    key: keyof BeneficiaryContactConsentDraft,
    value: string
  ) {
    const outcomeKey = cleanText(outcomeEventId);
    if (!outcomeKey) return;
    setBeneficiaryContactConsentDraftByOutcomeId((current) => {
      const previous =
        current[outcomeKey] || emptyBeneficiaryContactConsentDraft();
      return {
        ...current,
        [outcomeKey]: {
          ...previous,
          [key]: value,
        },
      };
    });
  }

  function updateBeneficiaryContactConsentWithdrawalDraft(
    outcomeEventId: string,
    key: keyof BeneficiaryContactConsentWithdrawalDraft,
    value: string
  ) {
    const outcomeKey = cleanText(outcomeEventId);
    if (!outcomeKey) return;
    setBeneficiaryContactConsentWithdrawalDraftByOutcomeId((current) => {
      const previous =
        current[outcomeKey] || emptyBeneficiaryContactConsentWithdrawalDraft();
      return {
        ...current,
        [outcomeKey]: {
          ...previous,
          [key]: value,
        },
      };
    });
  }

  function updateBeneficiaryCorrectionDecision(outcomeEventId: string, decision: string) {
    const key = cleanText(outcomeEventId);
    if (!key) return;
    setBeneficiaryCorrectionDecisionByOutcomeId((current) => ({
      ...current,
      [key]: decision,
    }));
  }

  function updateBeneficiaryCorrectionNote(outcomeEventId: string, note: string) {
    const key = cleanText(outcomeEventId);
    if (!key) return;
    setBeneficiaryCorrectionNoteByOutcomeId((current) => ({
      ...current,
      [key]: note,
    }));
  }

  async function submitBeneficiaryOutcomeCorrectionReview(item: any) {
    const requestDomainId = cleanText(domain?.id || communityDomainId);
    const outcomeEventId = cleanText(item?.event_id);
    if (!requestDomainId || !outcomeEventId) {
      setMessage("Open a beneficiary outcome before reviewing a challenge.");
      return;
    }
    if (!isAdmin) {
      setMessage(
        "Only a Community Domain owner or domain admin can review outcome corrections."
      );
      return;
    }
    const latestResponse = item?.latest_confirmation_response || {};
    const responseEventId = cleanText(latestResponse?.event_id);
    const decision =
      beneficiaryCorrectionDecisionByOutcomeId[outcomeEventId] || "mark_corrected";
    const reviewNote = beneficiaryCorrectionNoteByOutcomeId[outcomeEventId] || "";

    setBusyOutcomeCorrectionReviewId(outcomeEventId);
    try {
      await reviewCommunityDomainOutcomeCorrection(requestDomainId, outcomeEventId, {
        confirmation_response_event_id: responseEventId || undefined,
        decision,
        review_note: reviewNote,
      });
      const [periodPayload, sponsorPayload, outcomePayload, correctionPayload] =
        await Promise.all([
          readOptional(() => getCommunityDomainPeriodSummary(requestDomainId)),
          readOptional(() => getCommunityDomainSponsorSummary(requestDomainId)),
          readOptional(() =>
            listCommunityDomainBeneficiaryOutcomes(requestDomainId, { limit: 5 })
          ),
          readOptional(() =>
            listCommunityDomainOutcomeCorrectionReviews(requestDomainId, {
              limit: 5,
            })
          ),
        ]);
      setPeriodSummary(periodPayload || null);
      setSponsorSummary(sponsorPayload || null);
      setBeneficiaryOutcomeRows(
        Array.isArray(outcomePayload?.items) ? outcomePayload.items : beneficiaryOutcomeRows
      );
      setBeneficiaryCorrectionRows(
        Array.isArray(correctionPayload?.items)
          ? correctionPayload.items
          : beneficiaryCorrectionRows
      );
      setBeneficiaryCorrectionNoteByOutcomeId((current) => ({
        ...current,
        [outcomeEventId]: "",
      }));
      setMessage(
        "Correction review recorded as a separate Trust Event. The original outcome and the challenge response remain in the audit trail."
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not record this beneficiary outcome correction review."
        )
      );
    } finally {
      setBusyOutcomeCorrectionReviewId("");
    }
  }

  const loadReadinessPayloadsForLane = useCallback(
    async (laneKey: string, domainId: string, viewerUserId?: number | string | null) => {
      if (laneKey === "identity") {
        return Promise.all([
          readOptional(() => getCommunityDomainInstitutionalProfile(domainId)),
          readOptional(() => getCommunityDomainSocialBridge(domainId)),
          readOptional(() => getCommunityDomainAffiliationReadiness(domainId)),
        ]);
      }

      if (laneKey === "billing") {
        return Promise.all([
          readOptional(() => getCommunityDomainCapacityPlan(domainId)),
          readOptional(() => getCommunityDomainSubscriptionLifecycle(domainId)),
        ]);
      }

      if (laneKey === "structure") {
        return Promise.all([
          readOptional(() => listCommunityDomainNodeTree(domainId)),
          readOptional(() => getCommunityDomainRolloutPlan(domainId)),
          readOptional(() => getCommunityDomainActivityMap(domainId)),
          readOptional(() => getCommunityDomainActivityGroupReadiness(domainId)),
          readOptional(() => getCommunityDomainNodeAutonomyMap(domainId)),
          readOptional(() => getCommunityDomainNodeEconomicMap(domainId)),
          readOptional(() => getCommunityDomainNodeActivityMap(domainId)),
          readOptional(() => getCommunityDomainNodeDomainBoundaryMap(domainId)),
          readOptional(() => getCommunityDomainNodeScheduledActivityMap(domainId)),
          readOptional(() => getCommunityDomainNodePaidActivityMap(domainId)),
        ]);
      }

      if (laneKey === "modules") {
        return Promise.all([
          readOptional(() => getCommunityDomainModuleScopeReadiness(domainId)),
          readOptional(() => listCommunityDomainServiceSettings(domainId)),
          readOptional(() => getCommunityDomainEconomicParticipation(domainId)),
          readOptional(() => getCommunityDomainNetworkPresence(domainId)),
          readOptional(() => getCommunityDomainNodeServiceMap(domainId)),
          readOptional(() => getCommunityDomainNodePrivacyMap(domainId)),
          readOptional(() => getCommunityDomainNodeAnalyticsMap(domainId)),
          readOptional(() => getCommunityDomainNodeCommunicationMap(domainId)),
          readOptional(() => getCommunityDomainNodeVaultMap(domainId)),
          readOptional(() => getCommunityDomainNetworkExchangeMap(domainId)),
          readOptional(() => getCommunityDomainRecordPrivacyMap(domainId)),
          readOptional(() => getCommunityDomainConfigurationMap(domainId)),
          readOptional(() => getCommunityDomainComplianceMap(domainId)),
          readOptional(() => getCommunityDomainAppealReadiness(domainId)),
          readOptional(() => getCommunityDomainNodeEvidenceAuthorityMap(domainId)),
          readOptional(() => getCommunityDomainNodeTrustMap(domainId)),
          readOptional(() => getCommunityDomainEvidenceRecordReadiness(domainId)),
          readOptional(() => getCommunityDomainEvidenceReleaseReadiness(domainId)),
          readOptional(() => getCommunityDomainTrustRelayReadiness(domainId)),
          readOptional(() => getCommunityDomainNotificationScopeReadiness(domainId)),
          readOptional(() => getCommunityDomainTrustMobility(domainId)),
        ]);
      }

      if (laneKey === "governance") {
        return Promise.all([
          readOptional(() => getCommunityDomainGovernanceCoverage(domainId)),
          readOptional(() => getCommunityDomainDelegationMap(domainId)),
          readOptional(() => getCommunityDomainPeriodSummary(domainId)),
          readOptional(() => getCommunityDomainSponsorSummary(domainId)),
          readOptional(() => getCommunityDomainActivityCatalogue(domainId)),
          readOptional(() => listCommunityDomainActivities(domainId, { limit: 5 })),
          readOptional(() => listCommunityDomainBeneficiaryOutcomes(domainId, { limit: 5 })),
          readOptional(() =>
            listCommunityDomainOutcomeCorrectionReviews(domainId, { limit: 5 })
          ),
        ]);
      }

      if (laneKey === "members") {
        return Promise.all([
          readOptional(() => listCommunityDomainMembers(domainId)),
          readOptional(() => getCommunityDomainMemberVerificationMap(domainId)),
          readOptional(() => getCommunityDomainNodeParticipationMap(domainId)),
          viewerUserId
            ? readOptional(() =>
                getCommunityDomainMemberPlacementSummary(domainId, viewerUserId)
              )
            : Promise.resolve(null),
        ]);
      }

      return Promise.resolve([]);
    },
    []
  );

  const applyReadinessPayloadsForLane = useCallback((laneKey: string, payloads: any[]) => {
    if (laneKey === "identity") {
      const [institutionalProfilePayload, socialBridgePayload, affiliationReadinessPayload] =
        payloads;
      setInstitutionalProfile(institutionalProfilePayload?.institutional_profile || null);
      setSocialBridge(socialBridgePayload?.social_bridge || null);
      setAffiliationReadiness(affiliationReadinessPayload?.affiliation_readiness || null);
      return;
    }

    if (laneKey === "billing") {
      const [capacityPlanPayload, subscriptionPayload] = payloads;
      setCapacityPlan(capacityPlanPayload?.capacity_plan || null);
      setSubscriptionLifecycle(subscriptionPayload?.subscription_lifecycle || null);
      return;
    }

    if (laneKey === "structure") {
      const [
        treePayload,
        rolloutPlanPayload,
        activityMapPayload,
        activityGroupPayload,
        nodeAutonomyPayload,
        nodeEconomicPayload,
        nodeActivityPayload,
        nodeBoundaryPayload,
        nodeSchedulePayload,
        nodePaidPayload,
      ] = payloads;
      setNodeTree(Array.isArray(treePayload?.items) ? treePayload.items : []);
      setRolloutPlan(rolloutPlanPayload?.rollout_plan || null);
      setActivityMap(activityMapPayload?.activity_map || null);
      setActivityGroupReadiness(activityGroupPayload?.activity_group_readiness || null);
      setNodeAutonomyMap(nodeAutonomyPayload?.node_autonomy_map || null);
      setNodeEconomicMap(nodeEconomicPayload?.node_economic_map || null);
      setNodeActivityMap(nodeActivityPayload?.node_activity_map || null);
      setNodeDomainBoundaryMap(nodeBoundaryPayload?.node_domain_boundary_map || null);
      setNodeScheduledActivityMap(nodeSchedulePayload?.node_scheduled_activity_map || null);
      setNodePaidActivityMap(nodePaidPayload?.node_paid_activity_map || null);
      return;
    }

    if (laneKey === "modules") {
      const [
        moduleScopePayload,
        serviceSettingsPayload,
        economicPayload,
        networkPresencePayload,
        nodeServicePayload,
        nodePrivacyPayload,
        nodeAnalyticsPayload,
        nodeCommunicationPayload,
        nodeVaultPayload,
        networkExchangePayload,
        recordPrivacyPayload,
        configurationPayload,
        compliancePayload,
        appealPayload,
        nodeEvidenceAuthorityPayload,
        nodeTrustPayload,
        evidenceReadinessPayload,
        releaseReadinessPayload,
        relayReadinessPayload,
        notificationScopePayload,
        trustMobilityPayload,
      ] = payloads;
      setModuleScopeReadiness(moduleScopePayload?.module_scope_readiness || null);
      setServiceSettingsProjection(serviceSettingsPayload?.service_settings || null);
      setEconomicParticipation(economicPayload?.economic_participation || null);
      setNetworkPresence(networkPresencePayload?.network_presence || null);
      setNodeServiceMap(nodeServicePayload?.node_service_map || null);
      setNodePrivacyMap(nodePrivacyPayload?.node_privacy_map || null);
      setNodeAnalyticsMap(nodeAnalyticsPayload?.node_analytics_map || null);
      setNodeCommunicationMap(nodeCommunicationPayload?.node_communication_map || null);
      setNodeVaultMap(nodeVaultPayload?.node_vault_map || null);
      setNetworkExchangeMap(networkExchangePayload?.network_exchange_map || null);
      setRecordPrivacyMap(recordPrivacyPayload?.record_privacy_map || null);
      setConfigurationMap(configurationPayload?.configuration_map || null);
      setComplianceMap(compliancePayload?.compliance_map || null);
      setAppealReadiness(appealPayload?.appeal_readiness || null);
      setNodeEvidenceAuthorityMap(
        nodeEvidenceAuthorityPayload?.node_evidence_authority_map || null
      );
      setNodeTrustMap(nodeTrustPayload?.node_trust_map || null);
      setEvidenceRecordReadiness(evidenceReadinessPayload?.evidence_record_readiness || null);
      setEvidenceReleaseReadiness(
        releaseReadinessPayload?.evidence_release_readiness || null
      );
      setTrustRelayReadiness(relayReadinessPayload?.trust_relay_readiness || null);
      setNotificationScopeReadiness(
        notificationScopePayload?.notification_scope_readiness || null
      );
      setTrustMobility(trustMobilityPayload?.trust_mobility || null);
      return;
    }

    if (laneKey === "governance") {
      const [
        governanceCoveragePayload,
        delegationMapPayload,
        periodSummaryPayload,
        sponsorSummaryPayload,
        activityCataloguePayload,
        activityRowsPayload,
        beneficiaryOutcomeRowsPayload,
        beneficiaryCorrectionRowsPayload,
      ] = payloads;
      setGovernanceCoverage(governanceCoveragePayload?.governance_coverage || null);
      setDelegationMap(delegationMapPayload?.delegation_map || null);
      setPeriodSummary(periodSummaryPayload || null);
      setSponsorSummary(sponsorSummaryPayload || null);
      setActivityCatalogue(
        Array.isArray(activityCataloguePayload?.activity_catalogue)
          ? activityCataloguePayload.activity_catalogue
          : []
      );
      setActivityRows(Array.isArray(activityRowsPayload?.items) ? activityRowsPayload.items : []);
      setBeneficiaryOutcomeRows(
        Array.isArray(beneficiaryOutcomeRowsPayload?.items)
          ? beneficiaryOutcomeRowsPayload.items
          : []
      );
      setBeneficiaryCorrectionRows(
        Array.isArray(beneficiaryCorrectionRowsPayload?.items)
          ? beneficiaryCorrectionRowsPayload.items
          : []
      );
      return;
    }

    if (laneKey === "members") {
      const [
        memberListPayload,
        memberVerificationPayload,
        nodeParticipationPayload,
        placementPayload,
      ] = payloads;
      setDomainMemberRows(
        Array.isArray(memberListPayload?.items) ? memberListPayload.items : []
      );
      setMemberVerificationMap(memberVerificationPayload?.member_verification_map || null);
      setNodeParticipationMap(nodeParticipationPayload?.node_participation_map || null);
      setPlacementSummary(placementPayload?.placement_summary || null);
    }
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Community Domain";
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!communityDomainId || !dashboard || loading) return undefined;
    if (cleanText(dashboardRouteId) !== cleanText(communityDomainId)) return undefined;

    const dashboardDomainId =
      dashboard?.community_domain?.id ?? dashboard?.community_domain?.community_domain_id;
    if (
      dashboardDomainId !== undefined &&
      dashboardDomainId !== null &&
      cleanText(dashboardDomainId) !== cleanText(communityDomainId)
    ) {
      return undefined;
    }

    const laneKey = cleanText(activeLane, "structure");
    const needsBaseReadiness = !loadedReadinessLanes.__base;
    const needsLaneReadiness = !loadedReadinessLanes[laneKey];
    if (!needsBaseReadiness && !needsLaneReadiness) return undefined;
    const readinessDomainKey = cleanText(dashboardRouteId, communityDomainId);
    const viewerReadinessKey = cleanText(dashboard?.viewer?.user_id, "viewer");
    const baseReadinessCacheKey = `${readinessDomainKey}:__base`;
    const laneReadinessCacheKey = `${readinessDomainKey}:${viewerReadinessKey}:${laneKey}`;

    let cancelled = false;

    async function loadSelectedReadiness() {
      function loadOrReuseReadiness(cacheKey: string, loader: () => Promise<any>) {
        const existing = readinessLoadPromises.current[cacheKey];
        if (existing) return existing;
        const next = loader().finally(() => {
          if (readinessLoadPromises.current[cacheKey] === next) {
            delete readinessLoadPromises.current[cacheKey];
          }
        });
        readinessLoadPromises.current[cacheKey] = next;
        return next;
      }

      const loadingKeys = [
        ...(needsBaseReadiness ? ["__base"] : []),
        ...(needsLaneReadiness ? [laneKey] : []),
      ];
      const requestId = readinessLoadSequence.current + 1;
      readinessLoadSequence.current = requestId;
      loadingKeys.forEach((key) => {
        readinessLoadIds.current[key] = requestId;
      });
      setLoadingReadinessLanes((current) => ({
        ...current,
        ...(needsBaseReadiness ? { __base: true } : {}),
        ...(needsLaneReadiness ? { [laneKey]: true } : {}),
      }));
      const viewerUserId = dashboard?.viewer?.user_id;
      try {
        const [basePayloads, lanePayloads] = await Promise.all([
          needsBaseReadiness
            ? loadOrReuseReadiness(baseReadinessCacheKey, () =>
                Promise.all([
                  readOptional(() => getCommunityDomainReadiness(communityDomainId)),
                  readOptional(() => getCommunityDomainSetupPlan(communityDomainId)),
                ])
              )
            : Promise.resolve(null),
          needsLaneReadiness
            ? loadOrReuseReadiness(laneReadinessCacheKey, () =>
                loadReadinessPayloadsForLane(laneKey, communityDomainId, viewerUserId)
              )
            : Promise.resolve(null),
        ]);

        if (!cancelled) {
          if (basePayloads) {
            const [readinessPayload, setupPlanPayload] = basePayloads;
            setSetupReadiness(readinessPayload?.readiness || null);
            setSetupPlan(setupPlanPayload?.setup_plan || null);
          }

          if (lanePayloads) {
            applyReadinessPayloadsForLane(laneKey, lanePayloads);
          }

          setLoadedReadinessLanes((current) => ({
            ...current,
            ...(needsBaseReadiness ? { __base: true } : {}),
            ...(needsLaneReadiness ? { [laneKey]: true } : {}),
          }));
        }
      } finally {
        setLoadingReadinessLanes((current) => {
          const next = { ...current };
          loadingKeys.forEach((key) => {
            next[key] = false;
            if (readinessLoadIds.current[key] === requestId) {
              delete readinessLoadIds.current[key];
            }
          });
          return next;
        });
      }
    }

    loadSelectedReadiness().catch(() => {
      if (!cancelled) {
        setLoadedReadinessLanes((current) => ({
          ...current,
          ...(needsBaseReadiness ? { __base: true } : {}),
          ...(needsLaneReadiness ? { [laneKey]: true } : {}),
        }));
      }
    });

    return () => {
      cancelled = true;
    };
  }, [
    activeLane,
    applyReadinessPayloadsForLane,
    communityDomainId,
    dashboard,
    dashboardRouteId,
    loadedReadinessLanes,
    loadReadinessPayloadsForLane,
    loading,
  ]);

  const domain = useMemo(
    () => dashboard?.community_domain || {},
    [dashboard?.community_domain]
  );
  const template = useMemo(() => dashboard?.template || {}, [dashboard?.template]);
  const status = dashboard?.status || {};
  const counts = dashboard?.counts || {};
  const lanes = useMemo(() => {
    const rawLanes = Array.isArray(dashboard?.lanes) ? dashboard?.lanes || [] : [];
    return [
      {
        lane_key: "settings",
        label: "Settings",
        status: "Setup",
        count: 1,
      },
      ...rawLanes.filter((lane) => lane?.lane_key !== "settings"),
    ];
  }, [dashboard?.lanes]);
  const isAdmin = Boolean(dashboard?.viewer?.can_admin);
  const canEditPayInAccount = storedPlatformAdminRole();
  const canSetupEdit = Boolean(dashboard?.viewer?.can_setup_edit || isAdmin);
  const linkedDomainClanId = Number(domain?.clan_id || 0);
  const selectedDomainClanId = linkedDomainClanId;
  const paymentClanId = linkedDomainClanId || Number(paymentClanIdDraft || 0);
  const linkedDomainClanRow =
    communityLinkClanRows.find((row) => row.id === linkedDomainClanId) || null;
  const paymentClanRow =
    communityLinkClanRows.find((row) => row.id === paymentClanId) || null;
  const requestedLane = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return cleanText(
      params.get("lane") ||
        params.get("area") ||
        params.get("focus")
    ).toLowerCase();
  }, [location.search]);
  useEffect(() => {
    setPaymentClanIdDraft(linkedDomainClanId ? String(linkedDomainClanId) : "");
  }, [communityDomainId, linkedDomainClanId]);
  useEffect(() => {
    let alive = true;
    if (!getAccessToken()) {
      setCommunityLinkClanRows([]);
      return () => {
        alive = false;
      };
    }

    listMyClans()
      .then((payload) => {
        if (!alive) return;
        setCommunityLinkClanRows(normalizeCommunityLinkClanRows(payload));
      })
      .catch(() => {
        if (alive) setCommunityLinkClanRows([]);
      });

    return () => {
      alive = false;
    };
  }, [communityDomainId, linkedDomainClanId]);
  useEffect(() => {
    if (!requestedLane) return;
    const allowedLane = lanes.some((lane) => lane.lane_key === requestedLane);
    if (!allowedLane) return;

    setActiveLane((current) => (current === requestedLane ? current : requestedLane));
    setSetupWorkspaceOpen(true);
    setSetupJourneyMode("setup");
    setShowAdvancedTools(requestedLane !== "settings");
    focusWorkSurfaceAfterOpenRef.current = true;
  }, [lanes, requestedLane]);
  const latestMembershipRequest = latestRelevantMembershipRequest(ownMembershipRequests);
  const latestMembershipRequestId = cleanText(latestMembershipRequest?.id);
  const membershipAccessRequests = sortMembershipAccessRequests(
    reviewerQueue.filter(isSelfServiceMembershipAccessRequest)
  );
  const governanceReviewCounts = reviewStatusCounts(reviewerQueue);
  const governancePendingCount =
    (governanceReviewCounts.pending || 0) +
    (governanceReviewCounts.pending_review || 0);
  const governanceApprovedCount = governanceReviewCounts.approved || 0;
  const institutionalOpenReviewCount = Number(counts.open_reviews || 0);
  const governanceAttentionCount = isAdmin
    ? governancePendingCount
    : institutionalOpenReviewCount;
  const selectedLane = lanes.find((lane) => lane.lane_key === activeLane) || lanes[0];
  const selectedStructureDetail =
    STRUCTURE_DETAIL_OPTIONS.find((option) => option.key === activeStructureDetail) ||
    STRUCTURE_DETAIL_OPTIONS[0];
  const selectedServiceDetail =
    SERVICE_DETAIL_OPTIONS.find((option) => option.key === activeServiceDetail) ||
    SERVICE_DETAIL_OPTIONS[0];
  const selectedMemberDetail =
    MEMBER_DETAIL_OPTIONS.find((option) => option.key === activeMemberDetail) ||
    MEMBER_DETAIL_OPTIONS[0];
  const activeSetupOverviewGroup = useMemo<SetupOverviewGroupKey>(() => {
    if (activeSetupOverviewTask === "engine" || activeSetupOverviewTask === "counts") {
      return "reference";
    }
    return "action";
  }, [activeSetupOverviewTask]);
  const activeSetupOverviewGroupOption =
    SETUP_OVERVIEW_GROUP_OPTIONS.find(
      (group) => group.key === activeSetupOverviewGroup
    ) || SETUP_OVERVIEW_GROUP_OPTIONS[0];
  const activeSetupOverviewGroupTasks = SETUP_OVERVIEW_TASK_OPTIONS.filter((task) =>
    activeSetupOverviewGroupOption.taskKeys.includes(task.key)
  );
  const activeOperatingSummaryGroup = useMemo<OperatingSummaryGroupKey>(() => {
    if (
      activeOperatingSummaryTask === "allowance" ||
      activeOperatingSummaryTask === "permissions"
    ) {
      return "reference";
    }
    return "action";
  }, [activeOperatingSummaryTask]);
  const activeOperatingSummaryGroupOption =
    OPERATING_SUMMARY_GROUP_OPTIONS.find(
      (group) => group.key === activeOperatingSummaryGroup
    ) || OPERATING_SUMMARY_GROUP_OPTIONS[0];
  const activeOperatingSummaryGroupTasks = OPERATING_SUMMARY_TASK_OPTIONS.filter((task) =>
    activeOperatingSummaryGroupOption.taskKeys.includes(task.key)
  );
  const activeStructureDetailGroup = useMemo<StructureDetailGroupKey>(() => {
    if (activeStructureDetail === "foundation" || activeStructureDetail === "boundary") {
      return "readiness";
    }
    if (activeStructureDetail === "activity" || activeStructureDetail === "planning") {
      return "rollout";
    }
    return "map";
  }, [activeStructureDetail]);
  const activeStructureDetailGroupOption =
    STRUCTURE_DETAIL_GROUP_OPTIONS.find(
      (group) => group.key === activeStructureDetailGroup
    ) || STRUCTURE_DETAIL_GROUP_OPTIONS[0];
  const activeStructureGroupDetails = STRUCTURE_DETAIL_OPTIONS.filter((option) =>
    activeStructureDetailGroupOption.detailKeys.includes(option.key)
  );
  const activeServiceDetailGroup = useMemo<ServiceDetailGroupKey>(() => {
    if (activeServiceDetail === "local" || activeServiceDetail === "boundaries") {
      return "local";
    }
    if (activeServiceDetail === "trust" || activeServiceDetail === "evidence") {
      return "trust";
    }
    return "readiness";
  }, [activeServiceDetail]);
  const activeServiceDetailGroupOption =
    SERVICE_DETAIL_GROUP_OPTIONS.find((group) => group.key === activeServiceDetailGroup) ||
    SERVICE_DETAIL_GROUP_OPTIONS[0];
  const activeServiceGroupDetails = SERVICE_DETAIL_OPTIONS.filter((option) =>
    activeServiceDetailGroupOption.detailKeys.includes(option.key)
  );
  const activeMemberDetailGroup = useMemo<MemberDetailGroupKey>(() => {
    if (activeMemberDetail === "roster") {
      return "roster";
    }
    return "readiness";
  }, [activeMemberDetail]);
  const activeMemberDetailGroupOption =
    MEMBER_DETAIL_GROUP_OPTIONS.find((group) => group.key === activeMemberDetailGroup) ||
    MEMBER_DETAIL_GROUP_OPTIONS[0];
  const activeMemberGroupDetails = MEMBER_DETAIL_OPTIONS.filter((option) =>
    activeMemberDetailGroupOption.detailKeys.includes(option.key)
  );
  const activeDomainMemberCount = domainMemberRows.filter(
    (row) => cleanText(row?.status, "inactive").toLowerCase() === "active"
  ).length;
  const inactiveDomainMemberCount = Math.max(
    domainMemberRows.length - activeDomainMemberCount,
    0
  );
  const memberRosterSummaryRows: Array<[string, number]> = [
    ["Loaded members", domainMemberRows.length],
    ["Active proof", activeDomainMemberCount],
    ["Inactive history", inactiveDomainMemberCount],
  ];
  const domainInSetup = isCommunityDomainInSetup(status, domain);
  const domainOperational = isCommunityDomainOperational(status, domain);
  const pageTitle = domainInSetup
    ? "Community Domain setup"
    : "Community Domain dashboard";
  const setupStepIndex = Math.max(
    0,
    SETUP_STEP_OPTIONS.findIndex((option) => option.key === activeSetupStep)
  );
  const isBaseReadinessLoading = Boolean(loadingReadinessLanes.__base);
  const isActiveLaneReadinessLoading = Boolean(
    loadingReadinessLanes[cleanText(activeLane, "structure")]
  );
  const setupPrimaryAction = setupReadiness?.primary_next_action || dashboard?.primary_next_action;
  const setupPrimaryActionLaneKey = laneForAction(setupPrimaryAction?.action_key);
  const dashboardPrimaryActionLaneKey = laneForAction(dashboard?.primary_next_action?.action_key);
  const setupPrimaryActionHasLane = lanes.some((lane) => lane.lane_key === setupPrimaryActionLaneKey);
  const hasServicesLane = lanes.some((lane) => lane.lane_key === "modules");
  const primaryActionLaneKey = setupPrimaryActionHasLane
    ? setupPrimaryActionLaneKey
    : setupPrimaryActionLaneKey === "verification" && hasServicesLane
    ? "modules"
    : dashboardPrimaryActionLaneKey;
  const primaryActionLane =
    lanes.find((lane) => lane.lane_key === primaryActionLaneKey) || selectedLane;
  const primaryActionLaneLabel = laneDisplayLabel(primaryActionLane, "work");
  const operatingStateCopy = communityDomainOperatingStateCopy(status);
  const operationalLaneKey = firstAvailableOperationalLaneKey(lanes, status);
  const operationalLane =
    lanes.find((lane) => lane.lane_key === operationalLaneKey) || primaryActionLane;
  const operationalLaneLabel = laneDisplayLabel(operationalLane, "work");
  const mainActionLaneKey = domainOperational ? operationalLaneKey : primaryActionLaneKey;
  const mainActionLaneLabel = domainOperational ? operationalLaneLabel : primaryActionLaneLabel;
  const mainActionCopy = domainOperational
    ? operatingStateCopy.nextStep
    : cleanText(
        setupPrimaryAction?.label,
        "Review the current Community Domain setup state."
      );
  const otherToolsLaneKey =
    domainOperational
      ? operationalLaneKey
      : lanes.find((lane) => cleanText(lane.lane_key) !== "settings")?.lane_key ||
        primaryActionLaneKey;
  const showDomainWorkSurface =
    setupWorkspaceOpen || showAdvancedTools || setupJourneyMode === "edit";
  const showOtherDomainToolsEntry = setupJourneyMode === "edit";
  useEffect(() => {
    if (!showDomainWorkSurface || !focusWorkSurfaceAfterOpenRef.current) {
      return;
    }
    focusWorkSurfaceAfterOpenRef.current = false;
    window.requestAnimationFrame(() => {
      workSurfaceRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }, [activeLane, setupWorkspaceOpen, showAdvancedTools, showDomainWorkSurface]);
  const primaryActionFallbackNote =
    !setupPrimaryActionHasLane && setupPrimaryActionLaneKey === "verification" && hasServicesLane
      ? "GSN opens Services because authority verification is shown there as a readiness row. Actual authority verification still needs its separate owner or admin path."
      : "";
  const activeGovernanceTaskGroup = useMemo<GovernanceTaskGroupKey>(() => {
    if (
      activeGovernanceTask === "director_summary" ||
      activeGovernanceTask === "sponsor_summary"
    ) {
      return "reports";
    }
    if (
      activeGovernanceTask === "real_life_record" ||
      activeGovernanceTask === "access_requests"
    ) {
      return "records";
    }
    return "readiness";
  }, [activeGovernanceTask]);
  const activeGovernanceTaskGroupOption =
    GOVERNANCE_TASK_GROUP_OPTIONS.find((group) => group.key === activeGovernanceTaskGroup) ||
    GOVERNANCE_TASK_GROUP_OPTIONS[0];
  const activeGovernanceTaskOption =
    GOVERNANCE_TASK_OPTIONS.find((task) => task.key === activeGovernanceTask) ||
    GOVERNANCE_TASK_OPTIONS[0];
  const activeGovernanceGroupTasks = GOVERNANCE_TASK_OPTIONS.filter((task) =>
    activeGovernanceTaskGroupOption.taskKeys.includes(task.key)
  );
  const billingIsActive =
    cleanText(status.billing_status || selectedLane?.status).toLowerCase() === "active";
  const activeBillingPaymentGroup = useMemo<BillingPaymentGroupKey>(() => {
    if (activeBillingPaymentTask === "proof") {
      return "proof";
    }
    if (
      activeBillingPaymentTask === "credit_link" ||
      activeBillingPaymentTask === "pay_account"
    ) {
      return "settlement";
    }
    return "code";
  }, [activeBillingPaymentTask]);
  const activeBillingPaymentGroupOption =
    BILLING_PAYMENT_GROUP_OPTIONS.find((group) => group.key === activeBillingPaymentGroup) ||
    BILLING_PAYMENT_GROUP_OPTIONS[0];
  const activeBillingPaymentTaskOption =
    BILLING_PAYMENT_TASK_OPTIONS.find((task) => task.key === activeBillingPaymentTask) ||
    BILLING_PAYMENT_TASK_OPTIONS[0];
  const activeBillingPaymentGroupTasks = BILLING_PAYMENT_TASK_OPTIONS.filter((task) =>
    activeBillingPaymentGroupOption.taskKeys.includes(task.key)
  );
  const setupDraftDomainId = cleanText(domain?.id || communityDomainId);
  const setupEvidenceItems = Array.isArray(setupEvidence?.items)
    ? setupEvidence.items
    : [];
  const setupProgress = setupDraftCompletion(
    setupDraft,
    domainPayment,
    setupEvidenceItems
  );
  const featurePolicyDraft = useMemo(
    () => parseDomainFeaturePolicy(setupDraft.feature_policy_json),
    [setupDraft.feature_policy_json]
  );
  const effectiveFeaturePolicy = lockedFeaturePolicy || featurePolicyDraft;
  const featurePolicySourceLabel = lockedFeaturePolicy
    ? "Locked domain policy"
    : "Setup draft";
  const featurePolicySourceDetail = lockedFeaturePolicy
    ? "Actions use the active policy saved for this Community Domain. Edit the draft, then save and lock again to change live behaviour."
    : "Actions use this setup draft until the owner/admin locks a domain feature policy.";
  const memberInvitesPolicyMode = effectiveFeaturePolicy.features.member_invites;
  const memberInvitesOff = domainFeatureIsOff(effectiveFeaturePolicy, "member_invites");
  const paymentsContributionsPolicyMode =
    effectiveFeaturePolicy.features.payments_contributions;
  const paymentsContributionsOff = domainFeatureIsOff(
    effectiveFeaturePolicy,
    "payments_contributions"
  );
  const activeDomainPermissionFacts = DOMAIN_FEATURE_POLICY_ROWS.map((row) => [
    row.label,
    featurePolicyModeLabel(effectiveFeaturePolicy.features[row.key]),
  ]);
  const setupCurrentStep =
    SETUP_STEP_OPTIONS.find((option) => option.key === activeSetupStep) ||
    SETUP_STEP_OPTIONS[0];
  const activeSetupEditGroup = useMemo<SetupEditGroupKey>(() => {
    if (
      activeSetupStep === "structure" ||
      activeSetupStep === "members" ||
      activeSetupStep === "governance"
    ) {
      return "people";
    }
    if (activeSetupStep === "services") {
      return "services";
    }
    return "foundation";
  }, [activeSetupStep]);
  const activeSetupEditGroupOption =
    SETUP_EDIT_GROUP_OPTIONS.find((group) => group.key === activeSetupEditGroup) ||
    SETUP_EDIT_GROUP_OPTIONS[0];
  const activeSetupEditGroupSteps = SETUP_STEP_OPTIONS.filter(
    (option) =>
      option.key !== "launch" &&
      activeSetupEditGroupOption.stepKeys.includes(option.key)
  );
  const setupEditingLocked = !canSetupEdit;
  const setupEditLockMessage =
    "Only the owner/admin or an authorised setup editor can edit this setup.";
  const setupAccessLabel = setupEditingLocked
    ? "Needs owner approval"
    : isAdmin
    ? "Owner/admin editing"
    : "Setup editor";
  const showSetupAccessCard = setupJourneyMode === "edit" || setupEditingLocked;
  const showActiveDomainSettingsSummary =
    domainOperational && activeLane === "settings" && setupJourneyMode !== "edit";

  useEffect(() => {
    const domainId = cleanText(domain?.id || communityDomainId);
    if (!domainId || !dashboard) return;
    const domainDraft = setupDraftFromDomain(domain);
    const stored = readCommunityDomainSetupDraft(domainId);
    const safeStored = setupDraftBelongsToDomain(stored, domainDraft) ? stored : null;
    setSetupDraft(
      normalizePillarOfHopeSetupDraft(domain, {
        ...domainDraft,
        ...(safeStored || {}),
      })
    );
    setSetupDomainNameCheck({
      status: "idle",
      domainName: domainDraft.domain_name,
      message: "Check the domain code before saving identity setup.",
    });
    setSetupCompletionSavedAt("");
    setFeaturePolicyLockedAt("");
  }, [communityDomainId, dashboard, domain]);

  function updateSetupDraftField(
    key: keyof CommunityDomainSetupDraft,
    value: string
  ) {
    if (setupEditingLocked) {
      setMessage(setupEditLockMessage);
      return;
    }
    setSetupCompletionSavedAt("");
    if (key === "domain_name") {
      setSetupDomainNameCheck({
        status: "idle",
        domainName: value,
        message: "Check this domain code before saving it.",
      });
    }
    setSetupDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateFeaturePolicy(nextConfig: DomainFeaturePolicyConfig) {
    if (setupEditingLocked) {
      setMessage(setupEditLockMessage);
      return;
    }
    setSetupCompletionSavedAt("");
    setFeaturePolicyLockedAt("");
    setSetupDraft((current) => ({
      ...current,
      feature_policy_json: serializeDomainFeaturePolicy(nextConfig),
    }));
  }

  function updateFeaturePolicyMode(
    featureKey: DomainFeaturePolicyKey,
    mode: DomainFeaturePolicyMode
  ) {
    updateFeaturePolicy({
      ...featurePolicyDraft,
      features: {
        ...featurePolicyDraft.features,
        [featureKey]: mode,
      },
    });
  }

  function updateSpotlightPolicyNumber(
    key: keyof DomainFeaturePolicyConfig["spotlight"],
    value: string
  ) {
    const fallback = featurePolicyDraft.spotlight[key];
    updateFeaturePolicy({
      ...featurePolicyDraft,
      spotlight: {
        ...featurePolicyDraft.spotlight,
        [key]: boundedPositiveInt(value, fallback, key === "rotation_hours" ? 168 : 50),
      },
    });
  }

  function saveSetupProgress(): CommunityDomainSetupDraft | null {
    if (setupEditingLocked) {
      setMessage(setupEditLockMessage);
      return null;
    }
    const saved = writeCommunityDomainSetupDraft(setupDraftDomainId, setupDraft);
    setSetupDraft(saved);
    setMessage("Community Domain setup progress saved on this device for 48 hours.");
    return saved;
  }

  async function checkSetupDomainName() {
    if (setupEditingLocked) {
      setMessage(setupEditLockMessage);
      return false;
    }
    const requestedName = cleanText(setupDraft.domain_name);
    if (requestedName.length < 2) {
      setSetupDomainNameCheck({
        status: "blocked",
        domainName: requestedName,
        message: "Enter the domain code before checking it.",
      });
      return false;
    }

    setBusySetupDomainCheck(true);
    try {
      const result = await checkCommunityDomainAvailability(requestedName);
      const normalizedName = cleanText(result?.normalized_domain_name || requestedName);
      const isCurrentDomainName =
        normalizedSetupText(normalizedName) === normalizedSetupText(domain?.domain_name);
      const ready = Boolean(result?.available || isCurrentDomainName);
      const messageText = ready
        ? isCurrentDomainName
          ? "This domain code already belongs to this draft."
          : "This domain code is available."
        : setupDomainAvailabilityReasonText(result?.reason);

      setSetupDomainNameCheck({
        status: ready ? "ready" : "blocked",
        domainName: normalizedName,
        message: messageText,
      });
      setMessage(messageText);
      return ready;
    } catch (err: any) {
      const messageText =
        err?.message || "GSN could not check this domain code right now.";
      setSetupDomainNameCheck({
        status: "blocked",
        domainName: requestedName,
        message: messageText,
      });
      setMessage(messageText);
      return false;
    } finally {
      setBusySetupDomainCheck(false);
    }
  }

  async function saveOfficialProfile(): Promise<boolean> {
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can save official profile settings.");
      return false;
    }
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return false;

    setBusyProfileSave(true);
    try {
      const payload = await updateCommunityDomainProfile(requestDomainId, {
        domain_name: setupDraft.domain_name,
        display_name: setupDraft.display_name,
        domain_type: setupDraft.domain_type,
        template_key: setupDraft.template_key,
        country: setupDraft.country,
        state: setupDraft.state,
        public_profile: setupDraft.public_profile,
      });
      const updatedDomain = payload?.community_domain;
      if (updatedDomain) {
        setDashboard((current) =>
          current
            ? {
                ...current,
                community_domain: updatedDomain,
              }
            : current
        );
      }
      const saved = writeCommunityDomainSetupDraft(setupDraftDomainId, {
        ...setupDraft,
        ...(updatedDomain ? setupDraftFromDomain(updatedDomain) : {}),
        authority_evidence_label: setupDraft.authority_evidence_label,
        authority_evidence_reference: setupDraft.authority_evidence_reference,
        authority_evidence_note: setupDraft.authority_evidence_note,
        structure_note: setupDraft.structure_note,
        members_note: setupDraft.members_note,
        governance_note: setupDraft.governance_note,
        services_note: setupDraft.services_note,
        feature_policy_json: setupDraft.feature_policy_json,
      });
      setSetupDraft(saved);
      setMessage("Official Community Domain profile saved. Payment and verification are still separate.");
      return true;
    } catch (err: any) {
      setMessage(errorDetailMessage(err, "GSN could not save the Community Domain profile."));
      return false;
    } finally {
      setBusyProfileSave(false);
    }
  }

  const loadSetupEvidence = useCallback(async () => {
    if (!isAdmin) return null;
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return null;
    try {
      const payload = await getCommunityDomainSetupEvidence(requestDomainId);
      if (isCurrentDomainRequest(requestDomainId)) {
        setSetupEvidence(payload || null);
      }
      return payload;
    } catch {
      if (isCurrentDomainRequest(requestDomainId)) {
        setSetupEvidence(null);
      }
      return null;
    }
  }, [communityDomainId, isAdmin, isCurrentDomainRequest]);

  async function submitSetupEvidence() {
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can submit setup evidence.");
      return;
    }
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;
    const title = cleanText(
      setupDraft.authority_evidence_label || "Community Domain authority evidence"
    );
    const externalReference = cleanText(setupDraft.authority_evidence_reference);
    if (!setupEvidenceFile && !externalReference) {
      setMessage("Add an evidence file or a reference before submitting evidence.");
      return;
    }

    setBusySetupEvidence(true);
    try {
      const payload = await submitCommunityDomainSetupEvidence(requestDomainId, {
        evidence_type: "authority_document",
        title,
        description: setupDraft.authority_evidence_note,
        external_reference: externalReference,
        file: setupEvidenceFile,
      });
      if (isCurrentDomainRequest(requestDomainId)) {
        setSetupEvidence(payload || null);
        setSetupEvidenceFile(null);
      }
      const saved = saveSetupProgress();
      if (!saved) return;
      setMessage(
        "Community Domain setup evidence submitted for private review. This does not verify the domain yet."
      );
    } catch (err: any) {
      setMessage(errorDetailMessage(err, "GSN could not submit the setup evidence."));
    } finally {
      setBusySetupEvidence(false);
    }
  }

  async function delegateSetupEditor(action: "appoint" | "revoke" | "request") {
    if (action !== "request" && !isAdmin) {
      setMessage("Only the owner/admin can authorise or remove setup editors.");
      return;
    }
    const subject = cleanText(setupEditorSubject);
    if (subject.length < 2) {
      setMessage("Enter the GSN email, phone, GSN ID, or user id first.");
      return;
    }
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;

    setBusySetupEditorDelegate(true);
    try {
      const payload = await delegateCommunityDomainSetupEditor(requestDomainId, {
        subject,
        action,
        title: "Setup editor",
        note: setupEditorNote,
      });
      setSetupEditorResult(payload || null);
      setMessage(
        cleanText(
          payload?.message,
          action === "appoint"
            ? "Setup editor authority delegated."
            : action === "request"
            ? "Setup editor request sent for owner/admin approval."
            : "Setup editor authority removed."
        )
      );
      setSetupEditorNote("");
      await loadDashboard();
    } catch (err: any) {
      setMessage(errorDetailMessage(err, "GSN could not update setup editor authority."));
    } finally {
      setBusySetupEditorDelegate(false);
    }
  }

  function openSetupJourney(mode: "setup" | "edit") {
    focusWorkSurfaceAfterOpenRef.current = true;
    setSetupJourneyMode(mode);
    setActiveSetupOverviewTask("next_setup");
    setActiveSetupNoticeTask("recent");
    setActiveSetupAccessTask("summary");
    setActiveLane("settings");
    if (mode === "setup") {
      setActiveSetupStep(setupStepForLane(mainActionLaneKey));
    }
    setSetupWorkspaceOpen(true);
    setShowAdvancedTools(false);
    if (mode === "edit") {
      setMessage(
        setupEditingLocked
          ? "This setup is locked. Ask the owner/admin to authorise editing before changing it."
          : "Edit setup is open. Owner/admin authority, setup-editor authority, and changes are still recorded separately."
      );
      return;
    }
    setMessage("");
  }

  function selectGovernanceTask(task: GovernanceTaskKey) {
    setActiveGovernanceTask(task);
    if (task === "real_life_record") {
      setActiveRealLifeRecordTask((current) => current || "activity");
      setActiveActivityRecordTask("record");
      setActiveActivityRecordStage("person");
    }
  }

  function openRealLifeRecordTask(task: RealLifeRecordTask) {
    focusWorkSurfaceAfterOpenRef.current = true;
    setActiveGovernanceTask("real_life_record");
    setActiveRealLifeRecordTask(task);
    if (task === "activity") {
      setActiveActivityRecordTask("record");
      setActiveActivityRecordStage("person");
    } else {
      setActiveBeneficiaryOutcomeTask("record");
      setActiveBeneficiaryOutcomeRecordStage("person");
    }
    setSetupJourneyMode("setup");
    setSetupWorkspaceOpen(false);
    setShowAdvancedTools(true);
    setOperatingAreaPickerOpen(false);
    setActiveLane("governance");
    setMessage("");
  }

  function returnToDomainCommand() {
    setOperatingAreaPickerOpen(false);
    setShowAdvancedTools(false);
    setSetupWorkspaceOpen(false);
    setSetupJourneyMode("setup");
    setMessage("Returned to Domain command. Choose Marketplace or open one operating area.");
    window.requestAnimationFrame(() => {
      commandSurfaceRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
    });
  }

  function openMemberDashboard() {
    navigate(APP_ROUTES.DASHBOARD);
  }

  function openDomainCommunityHome() {
    const clanId = Number(selectedDomainClanId || 0);
    if (clanId) {
      setSelectedClanId(clanId);
    }
    navigate(routeWithCommunity(APP_ROUTES.COMMUNITY, clanId));
  }

  function openDomainMarketplace() {
    const clanId = Number(selectedDomainClanId || 0);
    if (!clanId) {
      setMessage(
        "GSN cannot open this Community Domain as a marketplace yet because it is not linked to a Community Home record."
      );
      return;
    }
    setSelectedClanId(clanId);
    navigate(routeWithCommunity(APP_ROUTES.MARKETPLACE, clanId));
  }

  async function createDedicatedDomainMarketplace() {
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can create the linked marketplace community.");
      return;
    }

    if (linkedDomainClanId) {
      setMessage("This Community Domain already has a linked marketplace community.");
      return;
    }

    const name = cleanText(domain?.display_name, cleanText(domain?.domain_name, "Community Domain"));
    if (!name) {
      setMessage("Save the Community Domain identity before creating its linked marketplace community.");
      return;
    }

    setCreatingDomainMarketplace(true);
    setMessage("");
    try {
      const created = await createClan({
        name,
        description:
          cleanText(domain?.public_profile) ||
          `Marketplace community for the ${name} Community Domain.`,
        marketplace_name: `${name} Marketplace`,
        marketplace_description: `Marketplace for ${name} Community Domain members.`,
      });
      const createdRow = normalizeCommunityLinkClanRow(created);
      if (!createdRow) {
        setMessage("GSN created the marketplace community, but could not read its id yet. Refresh this dashboard before generating the code.");
        return;
      }

      setCommunityLinkClanRows((current) => {
        const rest = current.filter((row) => row.id !== createdRow.id);
        return [createdRow, ...rest];
      });
      setPaymentClanIdDraft(String(createdRow.id));
      try {
        await selectClan(createdRow.id);
      } catch {
        setSelectedClanId(createdRow.id);
      }
      setMessage(
        `${createdRow.name} marketplace community is ready. Generate the payment code to link this Community Domain to that marketplace.`
      );
    } catch (err: any) {
      setMessage(
        errorDetailMessage(
          err,
          "GSN could not create the dedicated marketplace community. If it already exists, choose it from the list before generating the code."
        )
      );
    } finally {
      setCreatingDomainMarketplace(false);
    }
  }

  function openSetupPaymentLane() {
    const saved = saveSetupProgress();
    if (!saved) return;
    setSetupWorkspaceOpen(false);
    setShowAdvancedTools(true);
    setActiveBillingTask("payment_code");
    setActiveBillingPaymentTask("reference");
    setActiveLane("billing");
  }

  function openSetupFirstCircle() {
    if (memberInvitesOff) {
      setMessage(
        "Member Invites are off in this Community Domain policy. Turn Member Invites back on in Services before opening First Circle."
      );
      return;
    }
    const clanId = Number(selectedDomainClanId || 0);
    if (!clanId) {
      setMessage(
        "GSN cannot open invites yet because this Community Domain is not linked to a Community Home record."
      );
      return;
    }
    const saved = saveSetupProgress();
    if (!saved) return;
    setSetupCompletionSavedAt(cleanText(saved.saved_at, new Date().toISOString()));
    setSetupWorkspaceOpen(false);
    setSelectedClanId(clanId);
    try {
      window.localStorage.setItem(
        "gmfn.buildFirstCircle.communityDomainInviteContext.v1",
        JSON.stringify({
          domainId: cleanText(domain?.id || communityDomainId),
          clanId: cleanText(clanId),
          domainName: cleanText(domain?.display_name, "Community Domain"),
          domainCode: cleanText(domain?.domain_name),
          domainType: cleanText(domain?.domain_type),
          templateKey: cleanText(domain?.template_key || domain?.domain_type),
        })
      );
    } catch {
      // Storage is only a navigation fallback; route params remain authoritative.
    }
    const inviteParams = new URLSearchParams({
      mode: "community-domain",
      community_domain_id: cleanText(domain?.id || communityDomainId),
      community_domain_clan_id: cleanText(clanId),
      community_domain_name: cleanText(domain?.display_name, "Community Domain"),
      community_domain_code: cleanText(domain?.domain_name),
      domain_type: cleanText(domain?.domain_type),
      template_key: cleanText(domain?.template_key || domain?.domain_type),
    });
    navigate(`${APP_ROUTES.BUILD_FIRST_CIRCLE}?${inviteParams.toString()}`);
  }

  function moveSetupStep(direction: 1 | -1) {
    const index = SETUP_STEP_OPTIONS.findIndex((option) => option.key === activeSetupStep);
    const nextIndex = Math.min(
      SETUP_STEP_OPTIONS.length - 1,
      Math.max(0, (index < 0 ? 0 : index) + direction)
    );
    setActiveSetupStep(SETUP_STEP_OPTIONS[nextIndex].key);
  }

  async function lockDomainFeaturePolicy(
    savedDraft: CommunityDomainSetupDraft
  ): Promise<{ locked: boolean; message: string }> {
    if (!isAdmin) {
      return {
        locked: false,
        message:
          "Setup saved. Feature choices are still a draft until the owner/admin locks them for this domain.",
      };
    }
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) {
      return {
        locked: false,
        message: "Setup saved. GSN could not lock the feature policy because the domain was not resolved.",
      };
    }

    const config = parseDomainFeaturePolicy(savedDraft.feature_policy_json);
    setBusyProfileSave(true);
    try {
      await upsertCommunityDomainPolicy(requestDomainId, {
        policy_key: "domain.feature_policy",
        action_key: "domain.features.configure",
        scope_type: "domain",
        review_mode: "domain_admin_review",
        required_role: "domain_admin",
        status: "active",
        policy_summary: featurePolicySummary(config),
        config,
      });
      const lockedAt = new Date().toISOString();
      setLockedFeaturePolicy(config);
      setLockedFeaturePolicyLoadedAt(lockedAt);
      setFeaturePolicyLockedAt(lockedAt);
      return {
        locked: true,
        message:
          "Setup saved and feature policy locked. Payment activation and verification still need their separate admin checks.",
      };
    } catch (err: any) {
      return {
        locked: false,
        message: errorDetailMessage(
          err,
          "Setup saved, but GSN could not lock the feature policy. The owner/admin should try again before launch."
        ),
      };
    } finally {
      setBusyProfileSave(false);
    }
  }

  async function saveSetupStepAndContinue() {
    if (setupEditingLocked) {
      setMessage(setupEditLockMessage);
      return;
    }
    const isLastStep =
      activeSetupStep === SETUP_STEP_OPTIONS[SETUP_STEP_OPTIONS.length - 1].key;

    if (activeSetupStep === "identity") {
      const checkedName =
        setupDomainNameCheck.status === "ready" &&
        normalizedSetupText(setupDomainNameCheck.domainName) ===
          normalizedSetupText(setupDraft.domain_name);
      if (!checkedName) {
        setMessage("Check the domain name before saving this setup step.");
        setSetupDomainNameCheck({
          status: "blocked",
          domainName: setupDraft.domain_name,
          message: "Check this domain code first, then save and continue.",
        });
        return;
      }
      const saved = await saveOfficialProfile();
      if (!saved) return;
    } else {
      const saved = saveSetupProgress();
      if (!saved) return;
    }

    if (!isLastStep) {
      moveSetupStep(1);
      return;
    }

    const saved = saveSetupProgress();
    if (!saved) return;
    const policyResult = await lockDomainFeaturePolicy(saved);
    setSetupCompletionSavedAt(cleanText(saved.saved_at, new Date().toISOString()));
    setMessage(policyResult.message);
  }

  useEffect(() => {
    if (activeLane !== "settings" || activeSetupStep !== "evidence" || !isAdmin) {
      return;
    }
    void loadSetupEvidence();
  }, [activeLane, activeSetupStep, isAdmin, communityDomainId, loadSetupEvidence]);

  useEffect(() => {
    const requestDomainId = cleanText(communityDomainId);
    const numericDomainId = Number(requestDomainId || 0);
    const clanId = Number(selectedDomainClanId || 0);
    let alive = true;
    if (!["billing", "settings"].includes(activeLane) || !numericDomainId || !clanId) {
      if (activeLane === "billing") setDomainPayment(null);
      return () => {
        alive = false;
      };
    }

    listExpectedPayments({
      clan_id: clanId,
      expected_type: "community_domain_subscription",
      limit: 100,
    })
      .then((payload) => {
        if (!alive || !isCurrentDomainRequest(requestDomainId)) return;
        const items = Array.isArray(payload)
          ? payload
          : Array.isArray(payload?.items)
          ? payload.items
          : [];
        const match =
          items.find((item: any) => {
            const meta = item?.meta || item?.meta_json || {};
            return Number(meta?.community_domain_id || 0) === numericDomainId;
          }) || null;
        setDomainPayment(match);
      })
      .catch(() => {
        if (alive && isCurrentDomainRequest(requestDomainId)) {
          setDomainPayment(null);
        }
      });

    return () => {
      alive = false;
    };
  }, [activeLane, communityDomainId, isCurrentDomainRequest, selectedDomainClanId]);

  useEffect(() => {
    const clanId = Number(selectedDomainClanId || 0);
    let alive = true;
    if (activeLane !== "billing" || !clanId || !getAccessToken()) {
      setCommunityPayInLoading(false);
      if (!clanId) setCommunityPayInSettlement(null);
      return () => {
        alive = false;
      };
    }

    setCommunityPayInLoading(true);
    getCommunityPayInSettlement(clanId)
      .then((settlement) => {
        if (!alive) return;
        setCommunityPayInSettlement(settlement);
        if (settlement) {
          const nextCountry = normalizeSettlementCountryCode(settlement.country || billingSettlementCountry);
          const nextCurrency = cleanText(
            settlement.currency,
            settlementCurrencyForCountry(nextCountry)
          ).toUpperCase();
          setCommunityPayInDraft(
            draftFromCommunityPayInSettlement(settlement, nextCountry, nextCurrency)
          );
          setBillingSettlementCountry(nextCountry);
          setQuoteCurrency(nextCurrency);
        }
      })
      .catch(() => {
        if (alive) setCommunityPayInSettlement(null);
      })
      .finally(() => {
        if (alive) setCommunityPayInLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [activeLane, billingSettlementCountry, selectedDomainClanId]);

  function updateCommunityPayInDraft(
    key: keyof CommunityDomainPayInDraft,
    value: string
  ) {
    setCommunityPayInDraft((current) => {
      if (key === "country") {
        const nextCountry = normalizeSettlementCountryCode(value);
        return {
          ...current,
          country: nextCountry,
          currency: settlementCurrencyForCountry(nextCountry),
        };
      }
      return {
        ...current,
        [key]: key === "currency" ? value.toUpperCase().slice(0, 3) : value,
      };
    });
  }

  async function saveCommunityDomainPayInAccount() {
    const clanId = Number(selectedDomainClanId || 0);
    if (!clanId) {
      setMessage("Select the community that owns this Community Domain before saving a pay-in account.");
      return;
    }
    if (!canEditPayInAccount) {
      setMessage("Only a GSN platform admin can edit the official pay-in account during the pilot.");
      return;
    }
    if (
      !cleanText(communityPayInDraft.accountName) ||
      !cleanText(communityPayInDraft.bankName) ||
      !cleanText(communityPayInDraft.accountNumber)
    ) {
      setMessage("Enter account name, bank name, and account number before saving the pay-in account.");
      return;
    }

    setCommunityPayInSaving(true);
    setMessage("");
    try {
      const saved = await saveCommunityPayInSettlement({
        clanId,
        accountName: communityPayInDraft.accountName,
        bankName: communityPayInDraft.bankName,
        accountNumber: communityPayInDraft.accountNumber,
        sortCode: communityPayInDraft.sortCode,
        routingNumber: communityPayInDraft.routingNumber,
        iban: communityPayInDraft.iban,
        swiftBic: communityPayInDraft.swiftBic,
        country: communityPayInDraft.country,
        currency: communityPayInDraft.currency,
        note: communityPayInDraft.note,
      });
      setCommunityPayInSettlement(saved);
      const nextCountry = normalizeSettlementCountryCode(saved?.country || communityPayInDraft.country);
      const nextCurrency = cleanText(
        saved?.currency || communityPayInDraft.currency,
        settlementCurrencyForCountry(nextCountry)
      ).toUpperCase();
      setCommunityPayInDraft(
        draftFromCommunityPayInSettlement(saved, nextCountry, nextCurrency)
      );
      setBillingSettlementCountry(nextCountry);
      setQuoteCurrency(nextCurrency);
      setActiveBillingAccountTask("summary");
      setMessage(
        "Community pay-in account saved. Generate the next payment code for this area so the bank details match this account."
      );
    } catch (err: any) {
      setMessage(errorDetailMessage(err, "GSN could not save this Community pay-in account."));
    } finally {
      setCommunityPayInSaving(false);
    }
  }

  useEffect(() => {
    const requestDomainId = cleanText(communityDomainId);
    const reviewId = latestMembershipRequestId;
    const requestId = membershipRequestLineageLoadSequence.current + 1;
    membershipRequestLineageLoadSequence.current = requestId;
    const canApply = () =>
      isCurrentDomainRequest(requestDomainId) &&
      membershipRequestLineageLoadSequence.current === requestId;

    if (!requestDomainId || !reviewId || dashboard) {
      setMembershipRequestLineage([]);
      setLoadingMembershipRequestLineage(false);
      return;
    }

    setLoadingMembershipRequestLineage(true);
    getCommunityDomainActionReviewLineage(requestDomainId, reviewId)
      .then((payload) => {
        if (!canApply()) return;
        setMembershipRequestLineage(
          Array.isArray(payload?.items) ? payload.items : []
        );
      })
      .catch(() => {
        if (canApply()) {
          setMembershipRequestLineage([]);
        }
      })
      .finally(() => {
        if (canApply()) {
          setLoadingMembershipRequestLineage(false);
        }
      });
  }, [
    communityDomainId,
    dashboard,
    isCurrentDomainRequest,
    latestMembershipRequestId,
  ]);
  const packageReviewActionLabel = isAdmin
    ? billingIsActive
      ? "Review package details"
      : "Review package quote"
    : billingIsActive
    ? "Why package details are owner-only"
    : "Why quote review is owner-only";
  const domainPaymentMeta =
    domainPayment?.meta && typeof domainPayment.meta === "object"
      ? domainPayment.meta
      : domainPayment?.meta_json && typeof domainPayment.meta_json === "object"
      ? domainPayment.meta_json
      : {};
  const domainPaymentIntent =
    domainPayment?.payment_intent && typeof domainPayment.payment_intent === "object"
      ? domainPayment.payment_intent
      : domainPaymentMeta?.payment_intent && typeof domainPaymentMeta.payment_intent === "object"
      ? domainPaymentMeta.payment_intent
      : {};
  const domainPaymentSettlement =
    domainPayment?.settlement && typeof domainPayment.settlement === "object"
      ? domainPayment.settlement
      : domainPaymentMeta?.settlement && typeof domainPaymentMeta.settlement === "object"
      ? domainPaymentMeta.settlement
      : null;
  const domainPaymentSettlementCountry = normalizeSettlementCountryCode(
    domainPaymentSettlement?.country ||
      domainPaymentMeta?.settlement_country ||
      billingSettlementCountry
  );
  const domainPaymentSettlementLabel = cleanText(
    domainPaymentSettlement?.country_label,
    settlementCountryLabel(domainPaymentSettlementCountry)
  );
  const domainPaymentSettlementRows = settlementPaymentRows(domainPaymentSettlement);
  const domainPaymentSettlementReady =
    Boolean(domainPaymentSettlement) &&
    settlementValueIsConfigured(settlementField(domainPaymentSettlement, "bank_name", "bankName")) &&
    settlementValueIsConfigured(settlementField(domainPaymentSettlement, "account_name", "accountName")) &&
    settlementValueIsConfigured(settlementField(domainPaymentSettlement, "account_number", "accountNumber"));
  const domainPaymentReference = cleanText(
    domainPayment?.reference_display || domainPayment?.reference_normalized
  );
  const domainPaymentStatusRaw = cleanText(domainPayment?.status, "expected").toLowerCase();
  const domainPaymentStageRaw = cleanText(
    domainPayment?.payment_stage || domainPaymentMeta?.payment_stage
  ).toLowerCase();
  const domainPaymentStatusLabel = cleanText(
    domainPayment?.payment_status_label ||
      domainPaymentMeta?.payment_status_label ||
      compactStatus(domainPaymentStageRaw || domainPaymentStatusRaw || "expected"),
    "Expected"
  );
  const domainPaymentStatusSearch = `${domainPaymentStatusRaw} ${domainPaymentStageRaw} ${domainPaymentStatusLabel}`.toLowerCase();
  const domainPaymentConfirmed =
    Boolean(domainPayment?.confirmed_at) ||
    domainPaymentStatusRaw === "confirmed" ||
    domainPaymentStatusRaw === "applied" ||
    domainPaymentStageRaw === "completed";
  const domainPaymentProofUploaded = Boolean(
    domainPaymentMeta?.latest_payment_proof ||
      domainPaymentMeta?.proof_submitted_at ||
      domainPaymentMeta?.proof_status_text
  );
  const domainPaymentBankMatchLabel = domainPaymentConfirmed
    ? "Matched"
    : cleanText(
        domainPayment?.bank_match_status_label ||
          domainPaymentMeta?.bank_match_status_label ||
          (domainPaymentReference ? "Waiting" : "Not started"),
        domainPaymentReference ? "Waiting" : "Not started"
      );
  const domainPaymentProofLabel = domainPaymentProofUploaded
    ? "Uploaded"
    : cleanText(
        domainPayment?.proof_status_label ||
          domainPaymentMeta?.proof_status_label ||
          domainPaymentMeta?.proof_status_text ||
          "Not uploaded",
        "Not uploaded"
      );
  const communityPayInIsReady = communityPayInReady(communityPayInSettlement);
  const communityPayInRows = settlementPaymentRows(communityPayInSettlement);
  const communityPayInCountryLabel = settlementCountryLabel(
    communityPayInSettlement?.country || communityPayInDraft.country || billingSettlementCountry
  );
  const billingSequenceSteps = [
    {
      step: "1",
      title: "Review quote",
      detail: "Confirm package, amount, currency, billing cycle, and renewal terms before any payment action.",
      status: compactStatus(quote?.pricing_status || quote?.quote_status || "quote required"),
      active: !domainPayment,
    },
    {
      step: "2",
      title: "Generate payment code",
      detail: "Create one reference code for the agreed Community Domain quote. The code is not bank account details.",
      status: domainPaymentReference ? "Code generated" : "Code needed",
      active: !domainPaymentReference,
    },
    {
      step: "3",
      title: "Use your bank",
      detail: "Make the transfer through your own bank, app, or provider channel and use the exact code as the reference.",
      status: domainPaymentReference ? "Waiting for bank" : "Not started",
      active: Boolean(domainPaymentReference) && domainPaymentStatusSearch.includes("auth"),
    },
    {
      step: "4",
      title: "Upload proof",
      detail: "Attach the receipt or screenshot for finance review. Proof is evidence, not confirmation.",
      status: domainPaymentProofUploaded ? "Proof uploaded" : "Proof needed",
      active: Boolean(domainPaymentReference) && !domainPaymentProofUploaded && !domainPaymentConfirmed,
    },
    {
      step: "5",
      title: "Finance review",
      detail: "GSN confirms only after a real bank/provider match or approved finance review exists.",
      status: domainPaymentConfirmed ? "Completed" : "Pending review",
      active: domainPaymentProofUploaded && !domainPaymentConfirmed,
    },
  ];
  const renewalState = cleanText(quote?.renewal_policy?.status, "not set");

  const moduleKeys = useMemo(() => {
    const included = Array.isArray(quote?.included_modules) ? quote.included_modules : [];
    const templateModules = Array.isArray(template?.default_modules)
      ? template.default_modules
      : [];
    return Array.from(new Set([...included, ...templateModules])).slice(0, 8);
  }, [quote, template]);
  const quoteLimits =
    quote?.limits && typeof quote.limits === "object" ? quote.limits : {};
  const packageBillingBoundary =
    quote?.billing_boundary && typeof quote.billing_boundary === "object"
      ? quote.billing_boundary
      : capacityPlan?.billing_boundary && typeof capacityPlan.billing_boundary === "object"
      ? capacityPlan.billing_boundary
      : null;
  const packageCapacityFacts = [
    [
      "Members",
      limitValue(
        quoteLimits.included_members ?? capacityLaneByKey(capacityPlan, "members")?.limit
      ),
    ],
    [
      "Units",
      limitValue(quoteLimits.included_nodes ?? capacityLaneByKey(capacityPlan, "nodes")?.limit),
    ],
    [
      "Admins",
      limitValue(quoteLimits.included_admins ?? capacityLaneByKey(capacityPlan, "admins")?.limit),
    ],
    [
      "Shops",
      limitValue(quoteLimits.included_shops ?? capacityLaneByKey(capacityPlan, "shops")?.limit),
    ],
    [
      "Storage",
      `${limitValue(
        quoteLimits.included_storage_gb ?? capacityLaneByKey(capacityPlan, "storage")?.limit
      )} GB`,
    ],
  ];
  const packageTariffBoundaryText =
    cleanText(
      packageBillingBoundary?.plain_language,
      "Current pilot package allowance only. Extra member bands, paid feature tariffs, and per-domain pricing are not automated here yet; use Billing capacity review before selling or promising upgraded limits."
    );
  const packageBillingStatusFacts = [
    ["Pricing", packageBillingBoundary?.pricing_model_status],
    ["Paid upgrades", packageBillingBoundary?.paid_upgrade_status],
    ["Member bands", packageBillingBoundary?.member_band_status],
    ["Feature tariffs", packageBillingBoundary?.feature_tariff_status],
    ["Domain tariffs", packageBillingBoundary?.domain_tariff_status],
  ].map(([label, value]) => [label, cleanText(value, "not automated")]);
  const packageBillingAdminAction = cleanText(
    packageBillingBoundary?.admin_action_required,
    "Use manual finance and capacity review before promising upgraded limits."
  );
  const professionalMarketplaceFacts = [
    ["Model", "Governed professional marketplace"],
    ["Feature control", "Domain owner/admin decides what works here"],
    ["Member use", "Members use the normal marketplace tools this domain permits"],
    ["Outside domains", "Member identity and activity in other communities stay separate"],
    ["Expansion", "Extra bands and paid features still need manual capacity review"],
  ];

  async function loadAccessReviewItems(showLoading = false) {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;
    if (!isAdmin) {
      reviewerQueueLoadSequence.current += 1;
      setReviewerQueue([]);
      if (showLoading) setLoadingQueue(false);
      return;
    }
    const requestId = reviewerQueueLoadSequence.current + 1;
    reviewerQueueLoadSequence.current = requestId;
    const canApply = () =>
      isCurrentDomainRequest(requestDomainId) &&
      reviewerQueueLoadSequence.current === requestId;

    if (showLoading) setLoadingQueue(true);
    try {
      const [pendingPayload, approvedPayload] = await Promise.all([
        getCommunityDomainReviewerQueue(requestDomainId),
        listCommunityDomainActionReviews(requestDomainId, { status: "approved" }),
      ]);
      if (!canApply()) return;
      const pendingItems = Array.isArray(pendingPayload?.items)
        ? pendingPayload.items
        : [];
      const approvedItems = Array.isArray(approvedPayload?.items)
        ? approvedPayload.items
        : [];
      setReviewerQueue(mergeActionReviews(pendingItems, approvedItems));
    } catch (err: any) {
      if (canApply()) {
        setMessage(
          errorDetailMessage(
            err,
            "GSN could not load the Community Domain access requests."
          )
        );
      }
    } finally {
      if (showLoading && canApply()) setLoadingQueue(false);
    }
  }

  async function refreshQuote() {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;
    if (!isAdmin) {
      setMessage(
        billingIsActive
          ? "Only a Community Domain owner or domain admin can review the package details."
          : "Only a Community Domain owner or domain admin can review the package quote."
      );
      return;
    }

    setBusyQuote(true);
    setMessage("");
    try {
      const payload = await createCommunityDomainPackageQuote(requestDomainId);
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setQuote(payload?.quote || null);
      setActiveBillingTask("payment_code");
      setActiveBillingPaymentTask("reference");
      setActiveLane("billing");
      setMessage(
        billingIsActive
          ? "Package details refreshed. Billing is already shown as active here, but this refresh is still not payment confirmation, activation, or verification."
          : "Package quote refreshed. It is still not a payment instruction, payment confirmation, activation, or verification."
      );
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        setMessage(
          errorDetailMessage(err, "GSN could not refresh the package quote.")
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyQuote(false);
      }
    }
  }

  async function generateDomainPaymentInstruction() {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;
    if (!isAdmin) {
      setMessage("Only a Community Domain owner or domain admin can generate the payment code.");
      return;
    }
    const clanId = Number((dashboard?.community_domain as any)?.clan_id || paymentClanIdDraft || 0);
    const amount = Number(quoteAmount);
    if (!clanId) {
      setMessage(
        "Choose or create the dedicated marketplace community for this Community Domain before generating a payment code. GSN will not use the last selected marketplace automatically."
      );
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Enter the agreed quote amount before generating a payment code.");
      return;
    }

    setBusyDomainPayment(true);
    setMessage("");
    try {
      const payload = await createCommunityDomainPaymentInstruction(requestDomainId, {
        clan_id: clanId,
        amount: quoteAmount,
        currency: cleanText(quoteCurrency, "GBP").toUpperCase(),
        billing_cycle: "annual",
        quote_note: quoteNote,
        settlement_country: billingSettlementCountry,
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      const payment = {
        id: payload?.expected_payment_id,
        clan_id: clanId,
        expected_type: payload?.expected_type || "community_domain_subscription",
        amount: payload?.amount,
        currency: payload?.currency,
        reference_display: payload?.reference_display || payload?.reference,
        reference_normalized: payload?.reference_normalized,
        status: "expected",
        settlement: payload?.settlement || payload?.meta?.settlement || null,
        payment_intent: payload?.payment_intent || payload?.meta?.payment_intent || null,
        meta: payload?.meta || {},
        meta_json: payload?.meta || {},
      };
      setDomainPayment(payment);
      setPaymentClanIdDraft(String(clanId));
      if (payload?.community_domain) {
        setDashboard((prev) =>
          prev
            ? {
                ...prev,
                community_domain: payload.community_domain,
              }
            : prev
        );
      }
      setActiveBillingTask("payment_code");
      setActiveBillingPaymentTask("reference");
      setActiveLane("billing");
      setMessage(
        "Payment code generated. Use that exact code as the payment reference, then upload proof here for finance review."
      );
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        setMessage(
          errorDetailMessage(err, "GSN could not generate the Community Domain payment code.")
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyDomainPayment(false);
      }
    }
  }

  async function refreshReviewerQueue() {
    await loadAccessReviewItems(true);
  }

  async function handleAccessRequestReviewError(
    requestDomainId: string,
    err: any,
    fallback: string,
    staleAware = false
  ) {
    if (!isCurrentDomainRequest(requestDomainId)) return;
    const code = errorDetailCode(err);
    if (code === "community_domain_review_has_revision") {
      const existingReview = errorDetailActionReview(err);
      await refreshReviewerQueue();
      if (!isCurrentDomainRequest(requestDomainId)) return;
      const existingReviewId = cleanText(existingReview?.id);
      setMessage(
        existingReviewId
          ? `This access request already has a follow-up revision. Continue from review ${existingReviewId} instead of acting on the earlier request.`
          : "This access request already has a follow-up revision. Continue from the latest follow-up request instead of acting on the earlier request."
      );
      return;
    }
    setMessage(
      staleAware
        ? accessRequestApplyErrorMessage(err, fallback)
        : errorDetailMessage(err, fallback)
    );
  }

  async function approveAccessRequest(review: ActionReviewItem, applyAfterApproval: boolean) {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:${applyAfterApproval ? "apply" : "approve"}`);
    setMessage("");
    try {
      const decisionPayload = await decideCommunityDomainActionReview(
        requestDomainId,
        reviewId,
        {
          decision: "approve",
          decision_note: applyAfterApproval
            ? "Approved from the Community Domain access requests before applying membership."
            : "Approved from the Community Domain access requests. Membership still needs apply.",
        }
      );
      if (!isCurrentDomainRequest(requestDomainId)) return;
      if (applyAfterApproval) {
        if (decisionPayload?.action_review?.status !== "approved") {
          setMessage(
            `Access request ${reviewId} recorded. ${remainingAccessApprovalMessage(
              decisionPayload?.action_review
            )}`
          );
          await refreshReviewerQueue();
          return;
        }
        await applyCommunityDomainActionReview(requestDomainId, reviewId);
        if (!isCurrentDomainRequest(requestDomainId)) return;
        setMessage(
          `Access request ${reviewId} approved and applied. The member is now added only because the approved review was applied.`
        );
        await loadDashboard();
        return;
      }
      setMessage(
        decisionPayload?.action_review?.status === "approved"
          ? `Access request ${reviewId} approved. Use Add approved member when you are ready to apply the membership change.`
          : `Access request ${reviewId} recorded. ${remainingAccessApprovalMessage(
              decisionPayload?.action_review
            )}`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        await handleAccessRequestReviewError(
          requestDomainId,
          err,
          "GSN could not process this Community Domain access request.",
          true
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyReviewId(null);
      }
    }
  }

  async function declineAccessRequest(review: ActionReviewItem) {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:decline`);
    setMessage("");
    try {
      await decideCommunityDomainActionReview(requestDomainId, reviewId, {
        decision: "reject",
        decision_note:
          "Declined from the Community Domain access requests. No membership change was applied.",
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        `Access request ${reviewId} declined. No membership was added, and the request will no longer appear as pending.`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        await handleAccessRequestReviewError(
          requestDomainId,
          err,
          "GSN could not decline this Community Domain access request."
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyReviewId(null);
      }
    }
  }

  async function requestChangesForAccessRequest(review: ActionReviewItem) {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:needs_changes`);
    setMessage("");
    try {
      await decideCommunityDomainActionReview(requestDomainId, reviewId, {
        decision: "needs_changes",
        decision_note:
          "Asked for changes from the Community Domain access requests. The applicant must update the request before membership can be approved or applied.",
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        `Access request ${reviewId} was sent back for updates. The applicant can revise it, and membership was not added.`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        await handleAccessRequestReviewError(
          requestDomainId,
          err,
          "GSN could not send this Community Domain access request back for updates."
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyReviewId(null);
      }
    }
  }

  async function applyApprovedAccessRequest(review: ActionReviewItem) {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:apply`);
    setMessage("");
    try {
      await applyCommunityDomainActionReview(requestDomainId, reviewId);
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        `Approved access request ${reviewId} applied. The member was added only after the approved review was applied.`
      );
      await loadDashboard();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        await handleAccessRequestReviewError(
          requestDomainId,
          err,
          "GSN could not add this approved Community Domain member.",
          true
        );
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyReviewId(null);
      }
    }
  }

  async function requestDomainAccess() {
    const requestDomainId = cleanText(communityDomainId);
    if (!requestDomainId) return;
    if (!getAccessToken()) {
      setMessage("Sign in first so GSN can attach the Community Domain request to your account.");
      return;
    }

    setBusyMembershipRequest(true);
    try {
      const payload = await requestCommunityDomainMembership(requestDomainId, {
        request_note: "Requesting access from the Community Domain dashboard.",
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      const reviewId = payload?.action_review?.id;
      await loadOwnMembershipRequests(requestDomainId);
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        reviewId
          ? `Access request sent for owner/admin review. Review ${reviewId} must still be approved and applied before membership changes.`
          : "Access request sent for owner/admin review. It must still be approved and applied before membership changes."
      );
    } catch (err: any) {
      const code = errorDetailCode(err);
      const text = errorDetailMessage(
        err,
        "GSN could not send the Community Domain access request."
      );
      if (code === "community_domain_membership_request_pending") {
        const existingReview = errorDetailActionReview(err);
        await loadOwnMembershipRequests(requestDomainId);
        if (!isCurrentDomainRequest(requestDomainId)) return;
        const existingReviewId = cleanText(existingReview?.id);
        setMessage(
          existingReviewId
            ? `You already have an open access request for this Community Domain. Review ${existingReviewId} still needs owner/admin resolution and apply before membership changes.`
            : "You already have an open access request for this Community Domain. An owner/admin still needs to resolve and apply it before membership changes."
        );
      } else if (code === "community_domain_member_already_active") {
        await loadDashboard();
        if (isCurrentDomainRequest(requestDomainId)) {
          setMessage(activeMembershipRecoveryMessage());
        }
      } else {
        if (isCurrentDomainRequest(requestDomainId)) {
          setMessage(text);
        }
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyMembershipRequest(false);
      }
    }
  }

  async function withdrawOwnMembershipRequest(review: ActionReviewItem | null) {
    const requestDomainId = cleanText(communityDomainId);
    const reviewId = cleanText(review?.id);
    if (!requestDomainId || !reviewId) return;
    if (!getAccessToken()) {
      setMessage("Sign in first so GSN can withdraw the access request from your account.");
      return;
    }

    setBusyMembershipRequest(true);
    try {
      await cancelCommunityDomainActionReview(requestDomainId, reviewId, {
        cancel_note: "Applicant withdrew their own Community Domain access request.",
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      await loadOwnMembershipRequests(requestDomainId);
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        "Access request withdrawn. No membership was added, and you can send a fresh request when you are ready."
      );
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        const code = errorDetailCode(err);
        if (code === "community_domain_review_has_revision") {
          const existingReview = errorDetailActionReview(err);
          await loadOwnMembershipRequests(requestDomainId);
          if (!isCurrentDomainRequest(requestDomainId)) return;
          const existingReviewId = cleanText(existingReview?.id);
          setMessage(
            existingReviewId
              ? `This earlier access request already has a follow-up revision. Continue from review ${existingReviewId} instead of withdrawing the earlier request.`
              : "This earlier access request already has a follow-up revision. Continue from the latest revision instead of withdrawing the earlier request."
          );
        } else if (code === "community_domain_member_already_active") {
          await loadOwnMembershipRequests(requestDomainId);
          if (!isCurrentDomainRequest(requestDomainId)) return;
          setMessage(activeMembershipRecoveryMessage());
        } else {
          setMessage(
            errorDetailMessage(
              err,
              "GSN could not withdraw this Community Domain access request."
            )
          );
        }
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyMembershipRequest(false);
      }
    }
  }

  async function reviseOwnMembershipRequest(
    review: ActionReviewItem | null,
    fields: { title?: string | null; request_note?: string | null }
  ) {
    const requestDomainId = cleanText(communityDomainId);
    const reviewId = cleanText(review?.id);
    if (!requestDomainId || !reviewId) return;
    if (!getAccessToken()) {
      setMessage("Sign in first so GSN can update the access request from your account.");
      return;
    }

    const title = cleanText(fields.title);
    const requestNote =
      cleanText(fields.request_note) ||
      "Applicant updated their Community Domain access request.";

    setBusyMembershipRequest(true);
    try {
      const payload = await reviseCommunityDomainActionReview(
        requestDomainId,
        reviewId,
        {
          request_note: requestNote,
          payload: title ? { title } : undefined,
        }
      );
      if (!isCurrentDomainRequest(requestDomainId)) return;
      const revisionId = payload?.action_review?.id;
      await loadOwnMembershipRequests(requestDomainId);
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        revisionId
          ? `Updated access request sent for owner/admin review. Review ${revisionId} must still be approved and applied before membership changes.`
          : "Updated access request sent for owner/admin review. It must still be approved and applied before membership changes."
      );
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        const code = errorDetailCode(err);
        if (code === "community_domain_review_revision_exists") {
          const existingReview = errorDetailActionReview(err);
          await loadOwnMembershipRequests(requestDomainId);
          if (!isCurrentDomainRequest(requestDomainId)) return;
          const existingReviewId = cleanText(existingReview?.id);
          setMessage(
            existingReviewId
              ? `This access request already has a follow-up revision. Continue from review ${existingReviewId} instead of creating another update.`
              : "This access request already has a follow-up revision. Continue from the latest revision instead of creating another update."
          );
        } else if (code === "community_domain_member_already_active") {
          await loadOwnMembershipRequests(requestDomainId);
          if (!isCurrentDomainRequest(requestDomainId)) return;
          setMessage(activeMembershipRecoveryMessage());
        } else {
          setMessage(
            errorDetailMessage(
              err,
              "GSN could not update this Community Domain access request."
            )
          );
        }
      }
    } finally {
      if (isCurrentDomainRequest(requestDomainId)) {
        setBusyMembershipRequest(false);
      }
    }
  }

  const activityCatalogueOptions = activityCatalogue.length
    ? activityCatalogue
    : [
        { activity_type: "attendance", label: "Attendance" },
        {
          activity_type: "volunteer_service",
          label: "Volunteer service",
        },
        {
          activity_type: "support_delivered",
          label: "Support delivered",
        },
        {
          activity_type: "follow_up_completed",
          label: "Follow-up completed",
        },
      ];

  return (
    <main style={pageShell()}>
      <CommunityNoticeModal
        open={domainNoticeModalOpen}
        communityName={cleanText(domain.display_name, "this Community Domain")}
        busy={domainNoticePosting}
        onClose={() => setDomainNoticeModalOpen(false)}
        onSubmit={submitDomainNotice}
      />

      {!domainOperational ? (
        <PageTopNav
          sectionLabel="Community Domain"
          title={pageTitle}
          subtitle={
            domainInSetup
              ? "Create this Community Domain one step at a time."
              : "Operate this Community Domain without mixing setup, billing, and verification."
          }
          backTo={APP_ROUTES.COMMUNITY}
          backLabel="Back"
        />
      ) : null}

      {loading ? (
        <section style={whiteCard()}>
          <div style={sectionLabel()}>Loading</div>
          <div style={{ ...helperText(), marginTop: 8 }}>
            {communityDomainId
              ? "Opening the Community Domain dashboard..."
              : "Loading your Community Domains..."}
          </div>
        </section>
      ) : null}

      {!loading && message && !dashboard ? (
        <Suspense
          fallback={
            <section style={whiteCard()}>
              <div style={sectionLabel()}>Recovery</div>
              <div style={{ ...helperText(), marginTop: 8 }}>
                Loading recovery actions...
              </div>
            </section>
          }
        >
          <CommunityDomainDashboardRecoveryPanel
            communityDomainId={communityDomainId}
            message={message}
            latestMembershipRequest={latestMembershipRequest}
            membershipRequestLineage={membershipRequestLineage}
            loadingMembershipRequestLineage={loadingMembershipRequestLineage}
            busyMembershipRequest={busyMembershipRequest}
            onRetry={loadDashboard}
            onRequestDomainAccess={requestDomainAccess}
            onReviseMembershipRequest={reviseOwnMembershipRequest}
            onWithdrawMembershipRequest={withdrawOwnMembershipRequest}
          />
        </Suspense>
      ) : null}

      {!loading && !communityDomainId && !message ? (
        <section
          style={
            domainItems.length
              ? whiteCard()
              : {
                  ...whiteCard(),
                  padding: 0,
                  background: "transparent",
                  border: "none",
                  boxShadow: "none",
                }
          }
        >
          <Suspense
            fallback={
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Your Community Domains</div>
                <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                  Loading domain selector
                </h2>
                <div style={helperText()}>
                  GSN is loading the signed-in Community Domain selector.
                </div>
              </div>
            }
          >
            <CommunityDomainSelectorPanel domainItems={domainItems} />
          </Suspense>
        </section>
      ) : null}

      {!loading && communityDomainId && dashboard ? (
        <>
          <section style={heroCard()}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 16,
                alignItems: "start",
              }}
            >
              <div style={{ display: "grid", gap: 10, minWidth: 0 }}>
                <div style={sectionLabel(true)}>GSN / Community Domain</div>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "clamp(28px, 5vw, 46px)",
                    lineHeight: 1.02,
                    fontWeight: 950,
                    letterSpacing: 0,
                    overflowWrap: "break-word",
                  }}
                >
                  {cleanText(domain.display_name, "Community Domain")}
                </h1>
                <div style={helperText(true)}>
                  Domain code: <strong>{cleanText(domain.domain_name, "not recorded")}</strong>
                </div>
              </div>
              <div
                style={{
                  width: 76,
                  height: 76,
                  borderRadius: 24,
                  display: "grid",
                  placeItems: "center",
                  background:
                    "linear-gradient(180deg, rgba(255,255,255,0.13) 0%, rgba(255,255,255,0.06) 100%)",
                  border: "1px solid rgba(243,208,106,0.22)",
                  boxShadow: "0 16px 30px rgba(0,8,18,0.22)",
                }}
              >
                <GsnRealisticIcon name="community-building" size={62} decorative />
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 8,
                marginTop: 14,
              }}
            >
              {[
                ["Access", isAdmin ? "Owner/admin" : "Member"],
                ["Domain", compactStatus(status.domain_status)],
                ["Billing", compactStatus(status.billing_status)],
                ["Activation", compactStatus(status.activation_status)],
                ["Verification", compactStatus(status.verification_status)],
              ].map(([label, value]) => (
                <div key={label} style={factTile()}>
                  <div style={sectionLabel(true)}>{label}</div>
                  <div style={{ color: "#FFFFFF", fontSize: 14, fontWeight: 950, textTransform: "capitalize" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {domainOperational ? (
              <nav
                aria-label="Community Domain navigation"
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 138px), 1fr))",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <StableButton
                  type="button"
                  kind="secondary"
                  fullWidth
                  stableHeight={40}
                  debugId="community-domain-dashboard.nav.dashboard"
                  style={{ fontSize: 13, borderColor: "rgba(255,255,255,0.28)" }}
                  onClick={openMemberDashboard}
                >
                  Dashboard
                </StableButton>
                <StableButton
                  type="button"
                  kind="secondary"
                  fullWidth
                  stableHeight={40}
                  debugId="community-domain-dashboard.nav.community-home"
                  style={{ fontSize: 13, borderColor: "rgba(255,255,255,0.28)" }}
                  onClick={openDomainCommunityHome}
                >
                  Community Home
                </StableButton>
              </nav>
            ) : null}
          </section>

          <section
            ref={commandSurfaceRef}
            id="community-domain-official-board"
            style={whiteCard()}
          >
            <div style={{ display: "grid", gap: 12 }}>
              <div style={iconHeaderStyle()}>
                <span style={iconFrame(54)}>
                  <GsnRealisticIcon name="records-folder" size={42} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>
                    Domain command
                  </div>
                  <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                    {operatingStateCopy.heading}
                  </h2>
                  <div style={{ ...helperText(), marginTop: 8 }}>
                    {domainOperational
                      ? "Run one operating area at a time. Setup stays quiet unless details or evidence need attention."
                      : "Complete the next setup step. Billing, activation, and verification stay separate."}
                  </div>
                </div>
              </div>
              {domainOperational ? (
                <StableButton
                  type="button"
                  kind="primary"
                  fullWidth
                  debugId="community-domain-dashboard.open-marketplace"
                  onClick={openDomainMarketplace}
                >
                  Open Marketplace
                </StableButton>
              ) : null}
              {domainOperational ? (
                <StableButton
                  type="button"
                  kind="secondary"
                  fullWidth
                  debugId="community-domain-dashboard.operational-focus"
                  onClick={() => {
                    focusWorkSurfaceAfterOpenRef.current = true;
                    setSetupJourneyMode("setup");
                    setSetupWorkspaceOpen(false);
                    setShowAdvancedTools(true);
                    setOperatingAreaPickerOpen(false);
                    setActiveLane(operationalLaneKey);
                    setMessage("");
                  }}
                >
                  Open {operationalLaneLabel}
                </StableButton>
              ) : (
                <StableButton
                  type="button"
                  kind="primary"
                  fullWidth
                  debugId="community-domain-dashboard.setup-focus"
                  onClick={() => openSetupJourney("setup")}
                >
                  Continue setup
                </StableButton>
              )}
              {domainOperational && isAdmin ? (
                <StableButton
                  type="button"
                  kind="secondary"
                  fullWidth
                  stableHeight={46}
                  debugId="community-domain-dashboard.real-life-record-shortcut"
                  onClick={() => openRealLifeRecordTask("activity")}
                >
                  Record activity
                </StableButton>
              ) : null}
              <div style={commandGuidanceGrid()}>
                <div style={commandGuidanceTile("next")}>
                  <div style={sectionLabel()}>Do first</div>
                  <div style={{ ...helperText(), fontSize: 13, lineHeight: 1.5 }}>
                    {operatingStateCopy.nextStep}
                  </div>
                </div>
                <div style={commandGuidanceTile("risk")}>
                  <div style={sectionLabel()}>Boundary</div>
                  <div style={{ ...helperText(), fontSize: 13, lineHeight: 1.5 }}>
                    {operatingStateCopy.risk}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {message ? (
            <section style={whiteCard()}>
              <div style={sectionLabel()}>Action response</div>
              <div style={{ ...helperText(), marginTop: 8 }}>{message}</div>
            </section>
          ) : null}

          {showAdvancedTools && activeLane === "settings" && setupWorkspaceOpen ? (
            <>
          <section style={whiteCard()}>
            <div style={{ display: "grid", gap: 12 }}>
              <div style={iconHeaderStyle()}>
                <span style={iconFrame(54)}>
                  <GsnRealisticIcon name="records-folder" size={42} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Setup overview jobs</div>
                  <h2 style={{ margin: "6px 0 0", fontSize: 22, lineHeight: 1.12 }}>
                    Open one setup overview.
                  </h2>
                  <div style={{ ...helperText(), marginTop: 8 }}>
                    Choose the setup stage first. Current view:{" "}
                    <strong>{activeSetupOverviewGroupOption.label}</strong>.
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                  gap: 8,
                }}
              >
                {SETUP_OVERVIEW_GROUP_OPTIONS.map((group) => {
                  const selected = group.key === activeSetupOverviewGroup;
                  return (
                    <StableButton
                      key={group.key}
                      type="button"
                      kind={selected ? "primary" : "secondary"}
                      stableHeight={46}
                      fullWidth
                      aria-pressed={selected}
                      title={group.note}
                      debugId={`community-domain-dashboard.setup-overview-group.${group.key}`}
                      onClick={() => {
                        setActiveSetupOverviewTask(group.defaultTask);
                        if (group.defaultTask === "notices") {
                          setActiveSetupNoticeTask("recent");
                        }
                      }}
                    >
                      {group.label}
                    </StableButton>
                  );
                })}
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                {activeSetupOverviewGroupOption.note}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                  gap: 8,
                }}
              >
                {activeSetupOverviewGroupTasks.map((task) => {
                  const selected = task.key === activeSetupOverviewTask;
                  return (
                    <StableButton
                      key={task.key}
                      type="button"
                      kind={selected ? "primary" : "secondary"}
                      stableHeight={46}
                      fullWidth
                      aria-pressed={selected}
                      title={task.note}
                      debugId={`community-domain-dashboard.setup-overview.${task.key}`}
                      onClick={() => {
                        setActiveSetupOverviewTask(task.key);
                        if (task.key === "notices") {
                          setActiveSetupNoticeTask("recent");
                        }
                      }}
                    >
                      {task.label}
                    </StableButton>
                  );
                })}
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                {SETUP_OVERVIEW_TASK_OPTIONS.find(
                  (task) => task.key === activeSetupOverviewTask
                )?.note || "Choose the setup overview packet you need."}
              </div>
            </div>
          </section>

          {activeSetupOverviewTask === "notices" ? (
          <section style={whiteCard()}>
            <div style={officialBoardHeaderStyle()}>
              <div style={iconHeaderStyle()}>
                <span style={iconFrame(54)}>
                  <GsnRealisticIcon name="spotlight-megaphone" size={42} decorative />
                </span>
                <div style={{ minWidth: 0 }}>
                  <div style={sectionLabel()}>Official Board</div>
                  <h2
                    style={{
                      margin: "6px 0 0",
                      fontSize: 23,
                      lineHeight: 1.12,
                      overflowWrap: "break-word",
                    }}
                  >
                    Notices for this Community Domain only.
                  </h2>
                  <div style={{ ...helperText(), marginTop: 8 }}>
                    Official notices are capped at 50 words, have no comments
                    or reactions, and stay limited to active members of this
                    selected Community Domain.
                  </div>
                </div>
              </div>
              <div style={officialBoardActionsStyle()}>
                <span style={statusBadge("members only")}>Members only</span>
                <span style={statusBadge("no broadcast")}>No broadcast</span>
                <span
                  style={statusBadge(
                    domainNoticeFeatureMode === "off"
                      ? "off"
                      : featurePolicyModeLabel(domainNoticeFeatureMode)
                  )}
                >
                  {domainNoticeFeatureMode === "off"
                    ? "Off in settings"
                    : featurePolicyModeLabel(domainNoticeFeatureMode)}
                </span>
              </div>
            </div>

            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                  gap: 8,
                }}
              >
                {SETUP_NOTICE_TASK_OPTIONS.map((task) => {
                  const selected = task.key === activeSetupNoticeTask;
                  return (
                    <StableButton
                      key={task.key}
                      type="button"
                      kind={selected ? "primary" : "secondary"}
                      stableHeight={46}
                      debugId={`community-domain-dashboard.setup-notice.${task.key}`}
                      onClick={() => setActiveSetupNoticeTask(task.key)}
                    >
                      {task.label}
                    </StableButton>
                  );
                })}
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                {SETUP_NOTICE_TASK_OPTIONS.find(
                  (task) => task.key === activeSetupNoticeTask
                )?.note || "Choose the Official Board packet you need."}
              </div>
            </div>

            {activeSetupNoticeTask === "post" ? (
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                {domainNoticeFeatureMode === "off" ? (
                  <div style={softCard()}>
                    <div style={{ fontWeight: 950 }}>Announcement Board is off.</div>
                    <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                      This domain has chosen not to use official notices here.
                      Owner/admin can change this in Domain feature policy.
                    </div>
                  </div>
                ) : null}
                {isAdmin ? (
                  <div style={softCard()}>
                    <div style={{ fontWeight: 950 }}>Post an official notice.</div>
                    <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                      Use this only for a short member-only domain notice.
                      It does not open comments, reactions, or public broadcast.
                    </div>
                    <div style={{ marginTop: 10 }}>
                      <StableButton
                        type="button"
                        kind="secondary"
                        stableHeight={44}
                        debugId="community-domain-dashboard.notice.post"
                        disabled={domainNoticeFeatureMode === "off"}
                        onClick={() => setDomainNoticeModalOpen(true)}
                      >
                        {domainNoticeFeatureMode === "off" ? "Not used here" : "Post notice"}
                      </StableButton>
                    </div>
                  </div>
                ) : (
                  <div style={softCard()}>
                    <div style={{ fontWeight: 950 }}>Owner/admin action.</div>
                    <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                      Only a Community Domain owner or domain admin can post an
                      official notice.
                    </div>
                  </div>
                )}
              </div>
            ) : null}

            {activeSetupNoticeTask === "recent" ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {domainNoticeFeatureMode === "off" ? (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>Announcement Board is off.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    This domain has chosen not to use official notices here.
                    Owner/admin can change this in Domain feature policy.
                  </div>
                </div>
              ) : domainNoticesLoading ? (
                <div style={{ ...helperText(), fontSize: 13 }}>
                  Loading official Community Domain notices.
                </div>
              ) : domainNotices.length ? (
                domainNotices.map((item, index) => {
                  const body = limitWords(item.body || item.title, 50);
                  const when = noticeDateLabel(item.created_at);
                  const expiry = noticeExpiryLabel(item);
                  const key = cleanText(
                    item.notice_id || item.event_id || item.created_at || index,
                    String(index)
                  );

                  return (
                    <div key={key} style={softCard()}>
                      <div
                        style={{
                          color: "#091B2E",
                          fontSize: 15,
                          fontWeight: 950,
                          lineHeight: 1.35,
                          overflowWrap: "break-word",
                        }}
                      >
                        {body || "Official Community Domain notice"}
                      </div>
                      <div
                        style={{
                          marginTop: 8,
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={statusBadge("newest first")}>Newest first</span>
                        {when ? <span style={statusBadge("active")}>{when}</span> : null}
                        {expiry ? <span style={statusBadge("active")}>{expiry}</span> : null}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={softCard()}>
                  <div style={{ fontWeight: 950 }}>No official notices yet.</div>
                  <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                    When a domain owner or domain admin posts here, only members
                    of this Community Domain see the notice.
                  </div>
                </div>
              )}
            </div>
            ) : null}
          </section>
          ) : null}

          {activeSetupOverviewTask === "engine" ? (
          <section style={whiteCard()}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={sectionLabel()}>Community Domain engine</div>
                <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                  One institutional home for structure, rules, services, and trust.
                </h2>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                  gap: 10,
                }}
              >
                {[
                  [
                    "Structure",
                    `${countValue(counts.nodes)} nodes`,
                    "Branches, departments, classes, zones, or committees belong inside this domain.",
                    "community-building",
                  ],
                  [
                    "Governance",
                    `${countValue(counts.active_policies)} policies`,
                    "Rules and reviews control who can change members, structure, and evidence.",
                    "trust-shield",
                  ],
                  [
                    "Services",
                    `${countValue(moduleKeys.length)} services`,
                    "Shops, verification, analytics, vault, and other enabled services stay scoped here.",
                    "market-stall",
                  ],
                  [
                    "Trust relay",
                    compactStatus(status.verification_status),
                    "Evidence can travel with the domain, but verification still depends on current status.",
                    "certificate-seal",
                  ],
                ].map(([label, value, detail, icon]) => (
                  <div key={String(label)} style={softCard()}>
                    <div style={iconHeaderStyle()}>
                      <span style={iconFrame(42)}>
                        <GsnRealisticIcon
                          name={icon as Gsn3DIconKey}
                          size={32}
                          decorative
                        />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={sectionLabel()}>{String(label)}</div>
                        <div
                          style={{
                            marginTop: 5,
                            fontSize: 20,
                            lineHeight: 1.1,
                            fontWeight: 950,
                            textTransform: String(label) === "Trust relay" ? "capitalize" : "none",
                          }}
                        >
                          {String(value)}
                        </div>
                      </div>
                    </div>
                    <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                      {String(detail)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
          ) : null}

          {activeSetupOverviewTask === "next_setup" ? (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={iconHeaderStyle()}>
                  <span style={iconFrame(50)}>
                    <GsnRealisticIcon
                      name={domainOperational ? "market-stall" : "records-folder"}
                      size={39}
                      decorative
                    />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionLabel()}>
                      {domainOperational ? "Live next action" : "Next action"}
                    </div>
                    <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                      Open the {mainActionLaneLabel} area
                    </h2>
                  </div>
                </div>
                <div style={helperText()}>
                  {mainActionCopy} GSN opens the matching area here first; deeper
                  changes still use owner/admin tools that check permissions.
                </div>
                {primaryActionFallbackNote ? (
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    {primaryActionFallbackNote}
                  </div>
                ) : null}
                <StableButton
                  type="button"
                  kind="primary"
                  fullWidth
                  debugId="community-domain-dashboard.continue-setup"
                  onClick={() => {
                    focusWorkSurfaceAfterOpenRef.current = true;
                    setActiveLane(mainActionLaneKey);
                    if (domainOperational) {
                      setSetupWorkspaceOpen(false);
                      setShowAdvancedTools(true);
                      setSetupJourneyMode("setup");
                      setOperatingAreaPickerOpen(false);
                    } else {
                      setSetupWorkspaceOpen(true);
                      setShowAdvancedTools(false);
                    }
                  }}
                >
                  Open {mainActionLaneLabel}
                </StableButton>
              </div>
            </div>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={iconHeaderStyle()}>
                  <span style={iconFrame(50)}>
                    <GsnRealisticIcon name="community-building" size={39} decorative />
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={sectionLabel()}>Template</div>
                    <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                      {cleanText(template.label, "Institution")}
                    </h2>
                  </div>
                </div>
                <div style={helperText()}>
                  Marketplace role:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compactStatus(template.marketplace_role)}
                  </strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <span style={statusBadge(status.domain_status)}>
                    {compactStatus(status.domain_status)}
                  </span>
                  <span style={statusBadge(status.verification_status)}>
                    {compactStatus(status.verification_status)}
                  </span>
                </div>
              </div>
            </div>

            <Suspense
              fallback={
                <>
                  <div style={whiteCard()}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Setup readiness</div>
                      <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                        Loading readiness checks
                      </h2>
                      <div style={helperText()}>
                        GSN is loading the setup checklist while the main
                        Community Domain dashboard remains usable.
                      </div>
                    </div>
                  </div>
                  <div style={whiteCard()}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Setup plan</div>
                      <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                        Loading setup plan
                      </h2>
                      <div style={helperText()}>
                        GSN is loading the setup plan while the main
                        Community Domain dashboard remains usable.
                      </div>
                    </div>
                  </div>
                </>
              }
            >
              <CommunityDomainSetupIntelligenceCards
                isBaseReadinessLoading={isBaseReadinessLoading}
                setupReadiness={setupReadiness}
                setupPlan={setupPlan}
              />
            </Suspense>
          </section>
          ) : null}

          {activeSetupOverviewTask === "counts" ? (
          <section style={whiteCard()}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10,
              }}
            >
              {[
                ["Structure", counts.nodes],
                ["Members", counts.active_members],
                ["Role placements", counts.active_node_memberships],
                ["Policies", counts.active_policies],
                ["Open reviews", counts.open_reviews],
              ].map(([label, value]) => (
                <div key={String(label)} style={softCard()}>
                  <div style={sectionLabel()}>{String(label)}</div>
                  <div style={{ fontSize: 28, fontWeight: 950, marginTop: 4 }}>
                    {countValue(value)}
                  </div>
                </div>
              ))}
            </div>
          </section>
          ) : null}
            </>
          ) : null}

          {showDomainWorkSurface ? (
          <section
            ref={workSurfaceRef}
            data-testid="community-domain-dashboard.work-surface"
            style={{
              display: "grid",
              gridTemplateColumns: showAdvancedTools && operatingAreaPickerOpen
                ? "repeat(auto-fit, minmax(min(100%, 320px), 1fr))"
                : "minmax(0, 1fr)",
              gap: 12,
              alignItems: "start",
            }}
          >
            {showAdvancedTools && operatingAreaPickerOpen ? (
              <Suspense
                fallback={
                  <div style={whiteCard()}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Operating areas</div>
                      <div style={helperText()}>
                        Loading Community Domain operating areas...
                      </div>
                    </div>
                  </div>
                }
              >
                <CommunityDomainLaneSelectorPanel
                  lanes={lanes}
                  activeLane={activeLane}
                  onSelectLane={(laneKey) => {
                    setActiveLane(laneKey);
                    setOperatingAreaPickerOpen(false);
                  }}
                />
              </Suspense>
            ) : null}

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 12 }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fit, minmax(min(100%, 220px), 1fr))",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div style={iconHeaderStyle()}>
                    <span style={iconFrame(54)}>
                      <GsnRealisticIcon
                        name={
                          setupJourneyMode === "edit"
                            ? "identity-card"
                            : "records-folder"
                        }
                        size={42}
                        decorative
                      />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div style={sectionLabel()}>
                        {showAdvancedTools
                          ? domainOperational
                            ? "Live area"
                            : "Opened area"
                          : setupJourneyMode === "edit"
                          ? "Setup workbench"
                          : domainOperational
                          ? "Live domain actions"
                          : "Setup workbench"}
                      </div>
                      <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                        {setupJourneyMode === "edit" && activeLane === "settings"
                          ? "Edit Community Domain"
                          : !showAdvancedTools &&
                            activeLane === "settings" &&
                            !domainOperational
                          ? "Create Community Domain"
                          : laneDisplayLabel(selectedLane, "Community Domain area")}
                      </h2>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                      gap: 8,
                    }}
                  >
                    <StableButton
                      type="button"
                      kind="secondary"
                      fullWidth
                      stableHeight={44}
                      debugId="community-domain-dashboard.work-surface.back-to-command"
                      onClick={returnToDomainCommand}
                    >
                      Back to command
                    </StableButton>
                    {showAdvancedTools ? (
                      <StableButton
                        type="button"
                        kind={operatingAreaPickerOpen ? "secondary" : "primary"}
                        fullWidth
                        stableHeight={44}
                        debugId="community-domain-dashboard.operating-area-picker-toggle"
                        onClick={() =>
                          setOperatingAreaPickerOpen((current) => !current)
                        }
                      >
                        {operatingAreaPickerOpen ? "Hide areas" : "Change area"}
                      </StableButton>
                    ) : null}
                  </div>
                </div>
                {showAdvancedTools ? (
                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={helperText()}>
                      Current state:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(selectedLane?.status)}
                      </strong>
                      . Count: <strong>{countValue(selectedLane?.count)}</strong>.
                    </div>
                    <div style={{ ...helperText(), fontSize: 12.5 }}>
                      Boundary:{" "}
                      {domainOperational
                        ? "Operating view only. It does not verify ownership, confirm new payments, grant paid features, or expose private records."
                        : "Setup view only. It does not confirm payment, activate the domain, verify ownership, or expose private records."}
                    </div>
                  </div>
                ) : null}

                {isActiveLaneReadinessLoading && activeLane !== "billing" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Loading setup intelligence</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      GSN is loading the maps, readiness checks, and area
                      details for this Community Domain. The primary dashboard is
                      already available; write actions remain separate and permission
                      checked.
                    </div>
                  </div>
                ) : null}

                {!isActiveLaneReadinessLoading && showActiveDomainSettingsSummary ? (
                  <div style={{ ...softCard(), display: "grid", gap: 12 }}>
                    <div style={sectionLabel()}>Operating summary</div>
                    <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>
                      Open one active-domain question.
                    </h3>
                    <div style={{ ...helperText(), fontSize: 14 }}>
                      Choose the live stage first. Current view:{" "}
                      <strong>{activeOperatingSummaryGroupOption.label}</strong>.
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                        gap: 8,
                      }}
                    >
                      {OPERATING_SUMMARY_GROUP_OPTIONS.map((group) => {
                        const selected = group.key === activeOperatingSummaryGroup;
                        return (
                          <StableButton
                            key={group.key}
                            type="button"
                            kind={selected ? "primary" : "secondary"}
                            stableHeight={46}
                            fullWidth
                            aria-pressed={selected}
                            title={group.note}
                            debugId={`community-domain-dashboard.operating-summary-group.${group.key}`}
                            onClick={() =>
                              setActiveOperatingSummaryTask(group.defaultTask)
                            }
                          >
                            {group.label}
                          </StableButton>
                        );
                      })}
                    </div>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {activeOperatingSummaryGroupOption.note}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                        gap: 8,
                      }}
                    >
                      {activeOperatingSummaryGroupTasks.map((task) => {
                        const selected = task.key === activeOperatingSummaryTask;
                        return (
                          <StableButton
                            key={task.key}
                            type="button"
                            kind={selected ? "primary" : "secondary"}
                            stableHeight={46}
                            fullWidth
                            aria-pressed={selected}
                            title={task.note}
                            debugId={`community-domain-dashboard.operating-summary.${task.key}`}
                            onClick={() => setActiveOperatingSummaryTask(task.key)}
                          >
                            {task.label}
                          </StableButton>
                        );
                      })}
                    </div>
                    <div style={{ ...helperText(), fontSize: 13 }}>
                      {OPERATING_SUMMARY_TASK_OPTIONS.find(
                        (task) => task.key === activeOperatingSummaryTask
                      )?.note || "Choose the operating summary packet you need."}
                    </div>

                    {activeOperatingSummaryTask === "next_action" ? (
                      <>
                        <div style={{ ...helperText(), fontSize: 14 }}>
                          Pillar-style Community Domains should use live operating
                          areas first after activation. Use setup only when you
                          need to correct saved details, add authority evidence, or
                          prepare verification.
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Boundary: active does not mean verified. Verification
                          still needs authority evidence and review; tariff
                          upgrades, member bands, and paid feature changes still
                          need manual capacity/finance handling.
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                            gap: 8,
                          }}
                        >
                          <StableButton
                            type="button"
                            kind="primary"
                            debugId="community-domain-dashboard.settings-open-live-lane"
                            onClick={() => {
                              focusWorkSurfaceAfterOpenRef.current = true;
                              setShowAdvancedTools(true);
                              setOperatingAreaPickerOpen(false);
                              setSetupWorkspaceOpen(false);
                              setActiveLane(operationalLaneKey);
                              setSetupJourneyMode("setup");
                            }}
                          >
                            Open {operationalLaneLabel}
                          </StableButton>
                          <StableButton
                            type="button"
                            kind="secondary"
                            debugId="community-domain-dashboard.settings-edit-setup-details"
                            onClick={() => openSetupJourney("edit")}
                          >
                            Edit setup details
                          </StableButton>
                        </div>
                      </>
                    ) : null}

                    {activeOperatingSummaryTask === "status" ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                          gap: 8,
                        }}
                      >
                        <div style={statusBadge(status.domain_status)}>
                          Domain: {compactStatus(status.domain_status)}
                        </div>
                        <div style={statusBadge(status.billing_status)}>
                          Billing: {compactStatus(status.billing_status)}
                        </div>
                        <div style={statusBadge(status.activation_status)}>
                          Activation: {compactStatus(status.activation_status)}
                        </div>
                        <div style={statusBadge(status.verification_status)}>
                          Verification: {compactStatus(status.verification_status)}
                        </div>
                      </div>
                    ) : null}

                    {activeOperatingSummaryTask === "allowance" ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 12,
                          borderRadius: 18,
                          border: "1px solid rgba(214,170,69,0.28)",
                          background: "rgba(255,249,225,0.68)",
                        }}
                      >
                        <div style={sectionLabel()}>Package allowance</div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {packageCapacityFacts.map(([label, value]) => (
                            <div key={label} style={statusBadge("included")}>
                              {label}: {value}
                            </div>
                          ))}
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          {packageTariffBoundaryText}
                        </div>
                        <div style={{ ...helperText(), fontSize: 12.5 }}>
                          Summary only. This does not add members, sell extra
                          bands, grant paid features, confirm payment, or verify
                          the organisation.
                        </div>
                      </div>
                    ) : null}

                    {activeOperatingSummaryTask === "permissions" ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 12,
                          borderRadius: 18,
                          border: "1px solid rgba(9,27,46,0.10)",
                          background: "rgba(255,255,255,0.72)",
                        }}
                      >
                        <div style={sectionLabel()}>Domain permissions</div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 118px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {activeDomainPermissionFacts.map(([label, value]) => (
                            <div key={label} style={statusBadge("feature policy")}>
                              {label}: {value}
                            </div>
                          ))}
                        </div>
                        <div style={{ ...helperText(), fontSize: 12.5 }}>
                          Source: {featurePolicySourceLabel}. This summary only
                          explains the current policy; change live behaviour
                          through Edit setup details.
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {!isActiveLaneReadinessLoading &&
                activeLane === "settings" &&
                !showActiveDomainSettingsSummary ? (
                  <div style={{ ...softCard(), display: "grid", gap: 12 }}>
                    <div style={sectionLabel()}>
                      Step {setupStepIndex + 1} of {SETUP_STEP_OPTIONS.length}
                    </div>
                    <h3 style={{ margin: 0, fontSize: 22, lineHeight: 1.15 }}>
                      {setupCurrentStep.label}
                    </h3>
                    <div style={{ ...helperText(), fontSize: 14 }}>
                      {setupJourneyMode === "edit"
                        ? "Correct saved details only after owner/admin or setup-editor authority is clear."
                        : setupCurrentStep.note}
                    </div>
                    {showSetupAccessCard ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          ["step", "Setup step"],
                          ["access", "Access"],
                        ].map(([task, label]) => (
                          <StableButton
                            key={task}
                            type="button"
                            kind={
                              activeSetupWorkbenchTask === task
                                ? "primary"
                                : "secondary"
                            }
                            stableHeight={46}
                            debugId={`community-domain-dashboard.setup-workbench.${task}`}
                            onClick={() => {
                              const nextTask = task as SetupWorkbenchTaskKey;
                              setActiveSetupWorkbenchTask(nextTask);
                              if (nextTask === "access") {
                                setActiveSetupAccessTask("summary");
                              }
                            }}
                          >
                            {label}
                          </StableButton>
                        ))}
                      </div>
                    ) : null}

                    {showSetupAccessCard &&
                    activeSetupWorkbenchTask === "access" ? (
                      <div style={{ ...softCard(), display: "grid", gap: 8 }}>
                        <div style={iconHeaderStyle()}>
                          <span style={iconFrame(46)}>
                            <GsnRealisticIcon name="trust-shield" size={35} decorative />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Setup access</div>
                            <div style={{ ...statusBadge(setupAccessLabel), marginTop: 6 }}>
                              {setupAccessLabel}
                            </div>
                          </div>
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          {setupEditingLocked
                            ? "Ask the owner/admin to authorise setup editing. Members cannot change this setup by themselves."
                            : isAdmin
                            ? "You hold final owner/admin authority. You can authorise or remove one trusted setup editor."
                            : "You can edit setup, profile, and setup evidence only. Owner/admin authority remains above this role."}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {SETUP_ACCESS_TASK_OPTIONS.map((task) => {
                            const selected = task.key === activeSetupAccessTask;
                            return (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={selected ? "primary" : "secondary"}
                                stableHeight={46}
                                debugId={`community-domain-dashboard.setup-access.${task.key}`}
                                onClick={() => setActiveSetupAccessTask(task.key)}
                              >
                                {task.label}
                              </StableButton>
                            );
                          })}
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          {SETUP_ACCESS_TASK_OPTIONS.find(
                            (task) => task.key === activeSetupAccessTask
                          )?.note || "Choose the setup access packet you need."}
                        </div>
                        {activeSetupAccessTask === "summary" ? (
                          <div style={statusBadge(setupAccessLabel)}>
                            {setupEditingLocked
                              ? "Setup changes need owner/admin approval."
                              : isAdmin
                              ? "Owner/admin can keep editing and delegate one setup editor."
                              : "Setup editor can update setup details, not owner authority."}
                          </div>
                        ) : null}
                        {activeSetupAccessTask === "authority" && isAdmin ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Authorise setup editor</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Appoint a trusted GSN user by email, phone, GSN ID, or
                              user id. This grants limited setup editing only, and the
                              owner/admin can revoke or replace it.
                            </div>
                            <input
                              value={setupEditorSubject}
                              disabled={busySetupEditorDelegate}
                              onChange={(event) => setSetupEditorSubject(event.target.value)}
                              placeholder="editor@example.com, +447..., GMFN-U-..."
                              style={billingInputStyle()}
                            />
                            <textarea
                              value={setupEditorNote}
                              disabled={busySetupEditorDelegate}
                              onChange={(event) => setSetupEditorNote(event.target.value)}
                              placeholder="Optional note: who authorised this delegation."
                              style={{
                                ...billingInputStyle(),
                                minHeight: 78,
                                padding: 12,
                                resize: "vertical",
                              }}
                            />
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              <StableButton
                                type="button"
                                kind="primary"
                                debugId="community-domain-dashboard.setup-editor-appoint"
                                disabled={busySetupEditorDelegate}
                                onClick={() => {
                                  void delegateSetupEditor("appoint");
                                }}
                              >
                                {busySetupEditorDelegate ? "Updating..." : "Authorise editor"}
                              </StableButton>
                              <StableButton
                                type="button"
                                kind="secondary"
                                debugId="community-domain-dashboard.setup-editor-revoke"
                                disabled={busySetupEditorDelegate}
                                onClick={() => {
                                  void delegateSetupEditor("revoke");
                                }}
                              >
                                Remove editor
                              </StableButton>
                            </div>
                            {setupEditorResult?.membership ? (
                              <div style={statusBadge("authority recorded")}>
                                {cleanText(
                                  setupEditorResult.membership.user_display_name ||
                                    setupEditorResult.membership.user_email,
                                  "Editor"
                                )}
                                : {compactStatus(setupEditorResult.membership.role)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {activeSetupAccessTask === "authority" &&
                        !isAdmin &&
                        setupEditingLocked ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Request editing access</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Enter your GSN email, phone, GSN ID, or user id. GSN will
                              record a request for the owner/admin to approve and apply.
                            </div>
                            <input
                              value={setupEditorSubject}
                              disabled={busySetupEditorDelegate}
                              onChange={(event) => setSetupEditorSubject(event.target.value)}
                              placeholder="your email, phone, GMFN-U-..., or user id"
                              style={billingInputStyle()}
                            />
                            <textarea
                              value={setupEditorNote}
                              disabled={busySetupEditorDelegate}
                              onChange={(event) => setSetupEditorNote(event.target.value)}
                              placeholder="Optional note: why you need setup access."
                              style={{
                                ...billingInputStyle(),
                                minHeight: 78,
                                padding: 12,
                                resize: "vertical",
                              }}
                            />
                            <StableButton
                              type="button"
                              kind="primary"
                              debugId="community-domain-dashboard.setup-editor-request"
                              disabled={busySetupEditorDelegate}
                              onClick={() => {
                                void delegateSetupEditor("request");
                              }}
                            >
                              {busySetupEditorDelegate
                                ? "Sending..."
                                : "Ask owner to authorise editing"}
                            </StableButton>
                            {setupEditorResult?.action_review ? (
                              <div style={statusBadge("request sent")}>
                                Request: {compactStatus(setupEditorResult.action_review.status)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {activeSetupAccessTask === "authority" &&
                        !isAdmin &&
                        !setupEditingLocked ? (
                          <div style={softCard()}>
                            <div style={{ fontWeight: 950 }}>Limited editor access.</div>
                            <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                              You already have setup-editor access. Owner/admin
                              authority, billing activation, paid features, and
                              final verification stay outside this role.
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {(!showSetupAccessCard ||
                      activeSetupWorkbenchTask === "step") ? (
                      <>
                    {activeSetupStep === "identity" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 180px), 1fr))",
                            gap: 10,
                          }}
                        >
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Community name</span>
                            <input
                              value={setupDraft.display_name}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("display_name", event.target.value)
                              }
                              placeholder="Pillar of Hope"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Domain code</span>
                            <input
                              value={setupDraft.domain_name}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("domain_name", event.target.value)
                              }
                              placeholder="pillar-of-hope"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Type</span>
                            <input
                              value={setupDraft.domain_type}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("domain_type", event.target.value)
                              }
                              placeholder="ngo_project_network"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Template</span>
                            <input
                              value={setupDraft.template_key}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("template_key", event.target.value)
                              }
                              placeholder="ngo_project_network"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Country</span>
                            <input
                              value={setupDraft.country}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("country", event.target.value)
                              }
                              placeholder="United Kingdom"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>State / region</span>
                            <input
                              value={setupDraft.state}
                              disabled={setupEditingLocked}
                              onChange={(event) =>
                                updateSetupDraftField("state", event.target.value)
                              }
                              placeholder="Scotland / Aberdeen"
                              style={billingInputStyle()}
                            />
                          </label>
                        </div>
                        <div style={{ ...softCard(), display: "grid", gap: 10 }}>
                          <div style={iconHeaderStyle()}>
                            <span style={iconFrame(46)}>
                              <GsnRealisticIcon name="identity-card" size={35} decorative />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={sectionLabel()}>Name check</div>
                              <div style={helperText()}>
                                Check the domain code before saving identity setup.
                              </div>
                            </div>
                          </div>
                          <StableButton
                            type="button"
                            kind="primary"
                            fullWidth
                            debugId="community-domain-dashboard.setup-check-domain-name"
                            disabled={setupEditingLocked || busySetupDomainCheck || busyProfileSave}
                            onClick={() => {
                              void checkSetupDomainName();
                            }}
                          >
                            {busySetupDomainCheck ? "Checking..." : "Check domain name"}
                          </StableButton>
                          <div
                            style={statusBadge(
                              setupDomainNameCheck.status === "ready"
                                ? "available"
                                : setupDomainNameCheck.status === "blocked"
                                ? "blocked"
                                : "waiting"
                            )}
                          >
                            {setupDomainNameCheck.message}
                          </div>
                        </div>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={sectionLabel()}>Public profile</span>
                          <textarea
                            value={setupDraft.public_profile}
                            disabled={setupEditingLocked}
                            onChange={(event) =>
                              updateSetupDraftField("public_profile", event.target.value)
                            }
                            placeholder="Short public-safe description of this institution."
                            style={{
                              ...billingInputStyle(),
                              minHeight: 94,
                              padding: 12,
                              resize: "vertical",
                            }}
                          />
                        </label>
                      </div>
                    ) : null}

                    {activeSetupStep === "payment" ? (
                      <div style={{ ...softCard(), display: "grid", gap: 10 }}>
                        <div style={iconHeaderStyle()}>
                          <span style={iconFrame(46)}>
                            <GsnRealisticIcon name="finance-wallet-card" size={35} decorative />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Payment handoff</div>
                            <div style={helperText()}>
                              Payment lives in Billing. Generate the code there, use the
                              exact code for the bank transfer, then upload proof. The
                              domain becomes active only after finance reconciliation.
                            </div>
                          </div>
                        </div>
                        <div style={statusBadge(domainPayment ? "code generated" : "code needed")}>
                          {domainPayment
                            ? `Latest code: ${cleanText(
                                domainPayment.reference_display ||
                                  domainPayment.reference_normalized,
                                "available"
                              )}`
                            : "No Community Domain payment code loaded yet"}
                        </div>
                        <div
                          style={statusBadge(
                            paymentsContributionsOff
                              ? "Domain payments off"
                              : featurePolicyModeLabel(paymentsContributionsPolicyMode)
                          )}
                        >
                          Payments and Contributions:{" "}
                          {paymentsContributionsOff
                            ? "off for domain activity"
                            : featurePolicyModeLabel(paymentsContributionsPolicyMode)}
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          This setup payment is the Community Domain subscription
                          and remains available even when domain activity
                          payments are off. Registrations, donations, event fees,
                          seminar fees, and other member money-in activity must
                          follow the Payments and Contributions policy.
                        </div>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          debugId="community-domain-dashboard.setup-open-billing"
                          disabled={setupEditingLocked}
                          onClick={openSetupPaymentLane}
                        >
                          Open Billing
                        </StableButton>
                      </div>
                    ) : null}

                    {activeSetupStep === "evidence" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div style={{ ...softCard(), display: "grid", gap: 8 }}>
                          <div style={iconHeaderStyle()}>
                            <span style={iconFrame(46)}>
                              <GsnRealisticIcon name="certificate-seal" size={35} decorative />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={sectionLabel()}>Setup evidence</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Attach the authority record that proves who can set up this domain.
                              </div>
                            </div>
                          </div>
                        </div>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={sectionLabel()}>Evidence label</span>
                          <input
                            value={setupDraft.authority_evidence_label}
                            disabled={setupEditingLocked}
                            onChange={(event) =>
                              updateSetupDraftField(
                                "authority_evidence_label",
                                event.target.value
                              )
                            }
                            placeholder="Registration certificate, proprietor letter, board approval"
                            style={billingInputStyle()}
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={sectionLabel()}>Reference</span>
                          <input
                            value={setupDraft.authority_evidence_reference}
                            disabled={setupEditingLocked}
                            onChange={(event) =>
                              updateSetupDraftField(
                                "authority_evidence_reference",
                                event.target.value
                              )
                            }
                            placeholder="Certificate number, file label, approval date"
                            style={billingInputStyle()}
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={sectionLabel()}>Evidence note</span>
                          <textarea
                            value={setupDraft.authority_evidence_note}
                            disabled={setupEditingLocked}
                            onChange={(event) =>
                              updateSetupDraftField(
                                "authority_evidence_note",
                                event.target.value
                              )
                            }
                            placeholder="What this evidence proves and who should review it."
                            style={{
                              ...billingInputStyle(),
                              minHeight: 112,
                              padding: 12,
                              resize: "vertical",
                            }}
                          />
                        </label>
                        <label style={{ display: "grid", gap: 6 }}>
                          <span style={sectionLabel()}>Evidence file</span>
                          <input
                            type="file"
                            data-gmfn-action-root="true"
                            data-cta-id="community-domain-dashboard.setup-evidence-file"
                            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                            disabled={setupEditingLocked}
                            onChange={(event) =>
                              setSetupEvidenceFile(event.target.files?.[0] || null)
                            }
                            style={billingInputStyle()}
                          />
                        </label>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Submit a private registration, approval, or authority
                          document for setup review. This records evidence; it
                          does not verify the Community Domain by itself.
                        </div>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          debugId="community-domain-dashboard.setup-submit-evidence"
                          disabled={
                            setupEditingLocked ||
                            busySetupEvidence ||
                            (!setupEvidenceFile &&
                              !cleanText(setupDraft.authority_evidence_reference))
                          }
                          onClick={submitSetupEvidence}
                        >
                          {busySetupEvidence ? "Submitting..." : "Submit evidence"}
                        </StableButton>
                        <div style={{ ...softCard(), display: "grid", gap: 8 }}>
                          <div style={sectionLabel()}>Submitted setup evidence</div>
                          {setupEvidenceItems.length ? (
                            setupEvidenceItems.slice(0, 4).map((item: any) => (
                              <div
                                key={cleanText(item?.id || item?.storage_key || item?.title)}
                                style={{
                                  display: "grid",
                                  gap: 4,
                                  borderTop: "1px solid rgba(9,27,46,0.12)",
                                  paddingTop: 8,
                                }}
                              >
                                <strong>{cleanText(item?.title, "Evidence")}</strong>
                                <span style={{ ...helperText(), fontSize: 13 }}>
                                  {cleanText(item?.file_name || item?.external_reference, "Private setup record")}
                                </span>
                                <span style={{ ...helperText(), fontSize: 12 }}>
                                  Status: {compactStatus(item?.status || "submitted")}
                                </span>
                              </div>
                            ))
                          ) : (
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              No setup evidence has been submitted for this domain yet.
                            </div>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {["structure", "members", "governance", "services"].includes(
                      activeSetupStep
                    ) ? (
                      <label style={{ display: "grid", gap: 6 }}>
                        <span style={sectionLabel()}>
                          {activeSetupStep === "structure"
                            ? "Structure note"
                            : activeSetupStep === "members"
                            ? "Members note"
                            : activeSetupStep === "governance"
                            ? "Governance note"
                            : "Services note"}
                        </span>
                        <textarea
                          value={
                            activeSetupStep === "structure"
                              ? setupDraft.structure_note
                              : activeSetupStep === "members"
                              ? setupDraft.members_note
                              : activeSetupStep === "governance"
                              ? setupDraft.governance_note
                              : setupDraft.services_note
                          }
                          disabled={setupEditingLocked}
                          onChange={(event) =>
                            updateSetupDraftField(
                              activeSetupStep === "structure"
                                ? "structure_note"
                                : activeSetupStep === "members"
                                ? "members_note"
                                : activeSetupStep === "governance"
                                ? "governance_note"
                                : "services_note",
                              event.target.value
                            )
                          }
                          placeholder={
                            setupStepPlaceholder(activeSetupStep, domain, setupDraft)
                          }
                          style={{
                            ...billingInputStyle(),
                            minHeight: 130,
                            padding: 12,
                            resize: "vertical",
                          }}
                        />
                      </label>
                    ) : null}

                    {activeSetupStep === "services" ? (
                      <div style={{ ...softCard(), display: "grid", gap: 12 }}>
                        <div style={iconHeaderStyle()}>
                          <span style={iconFrame(48)}>
                            <GsnRealisticIcon name="vault-safe" size={36} decorative />
                          </span>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Domain feature policy</div>
                            <h3 style={{ margin: "4px 0 0", fontSize: 19, lineHeight: 1.15 }}>
                              Choose what this domain allows.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6, fontSize: 13 }}>
                              Normal marketplace behaviours stay available to the
                              domain. These settings record what the owner/admin
                              allows inside this governed marketplace.
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(214,170,69,0.30)",
                            background: "rgba(255,249,225,0.72)",
                            padding: 12,
                          }}
                        >
                          <div style={sectionLabel()}>Enforcement boundary</div>
                          <div style={{ ...helperText(), marginTop: 5, fontSize: 13 }}>
                            Live enforcement exists for notices, member invites,
                            marketplace shops, Shop Diary writes, payments and
                            contributions, ROSCA cycle routes, Spotlight
                            broadcast/payment routes, Demand Box posting, and
                            private Vault publishing/link creation. Paid Vault
                            slot entitlement, link expiry, and privacy controls
                            stay on their separate service rails.
                          </div>
                        </div>
                        <div
                          style={{
                            borderRadius: 16,
                            border: "1px solid rgba(9,27,46,0.10)",
                            background: "rgba(234,243,255,0.72)",
                            padding: 12,
                          }}
                        >
                          <div style={sectionLabel()}>Feature rule used</div>
                          <div style={{ marginTop: 4, fontWeight: 900, color: "#07172C" }}>
                            {featurePolicySourceLabel}
                          </div>
                          <div style={{ ...helperText(), marginTop: 5, fontSize: 13 }}>
                            {featurePolicySourceDetail}
                          </div>
                          {lockedFeaturePolicyLoadedAt ? (
                            <div
                              style={{
                                ...helperText(),
                                marginTop: 6,
                                fontSize: 12.5,
                                fontWeight: 820,
                              }}
                            >
                              Last locked: {setupDraftTimeLabel(lockedFeaturePolicyLoadedAt)}
                            </div>
                          ) : null}
                        </div>
                        <div style={{ display: "grid", gap: 10 }}>
                          {DOMAIN_FEATURE_POLICY_ROWS.map((row) => (
                            <div
                              key={row.key}
                              style={{
                                display: "grid",
                                gap: 8,
                                padding: 12,
                                borderRadius: 18,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "rgba(255,255,255,0.72)",
                              }}
                            >
                              <div style={iconHeaderStyle()}>
                                <span style={iconFrame(42)}>
                                  <GsnRealisticIcon name={row.icon} size={32} decorative />
                                </span>
                                <div style={{ minWidth: 0 }}>
                                  <strong>{row.label}</strong>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    {row.note}
                                  </div>
                                </div>
                              </div>
                              <select
                                value={featurePolicyDraft.features[row.key]}
                                disabled={setupEditingLocked}
                                onChange={(event) =>
                                  updateFeaturePolicyMode(
                                    row.key,
                                    event.target.value as DomainFeaturePolicyMode
                                  )
                                }
                                style={billingInputStyle()}
                              >
                                {FEATURE_POLICY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label}
                                  </option>
                                ))}
                              </select>
                              <div style={{ ...helperText(), fontSize: 12.5, fontWeight: 820 }}>
                                {domainFeatureRouteEffect(row.key)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gap: 10,
                            padding: 12,
                            borderRadius: 18,
                            border: "1px solid rgba(214,170,69,0.34)",
                            background: "rgba(255,249,225,0.72)",
                          }}
                        >
                          <div style={iconHeaderStyle()}>
                            <span style={iconFrame(42)}>
                              <GsnRealisticIcon name="spotlight-megaphone" size={32} decorative />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <strong>Spotlight slots</strong>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Planning numbers for the domain's own Spotlight
                                rotation. Broadcast/payment routes obey the
                                feature switch; paid credit pricing stays
                                separate.
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                              gap: 8,
                            }}
                          >
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={sectionLabel()}>Free slots</span>
                              <input
                                type="number"
                                min="1"
                                value={featurePolicyDraft.spotlight.free_slots}
                                disabled={setupEditingLocked}
                                onChange={(event) =>
                                  updateSpotlightPolicyNumber("free_slots", event.target.value)
                                }
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={sectionLabel()}>Paid after</span>
                              <input
                                type="number"
                                min="1"
                                value={featurePolicyDraft.spotlight.paid_after_slots}
                                disabled={setupEditingLocked}
                                onChange={(event) =>
                                  updateSpotlightPolicyNumber(
                                    "paid_after_slots",
                                    event.target.value
                                  )
                                }
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 5 }}>
                              <span style={sectionLabel()}>Rotation hours</span>
                              <input
                                type="number"
                                min="1"
                                value={featurePolicyDraft.spotlight.rotation_hours}
                                disabled={setupEditingLocked}
                                onChange={(event) =>
                                  updateSpotlightPolicyNumber(
                                    "rotation_hours",
                                    event.target.value
                                  )
                                }
                                style={billingInputStyle()}
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : null}

                    {activeSetupStep === "launch" ? (
                      <div style={{ display: "grid", gap: 10 }}>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {setupProgress.labels.map(([label, ready]) => (
                            <div key={label} style={statusBadge(ready ? "ready" : "needed")}>
                              {label}: {ready ? "ready" : "needed"}
                            </div>
                          ))}
                        </div>
                        <div style={helperText()}>
                          Setup progress: <strong>{setupProgress.ready}</strong> of{" "}
                          <strong>{setupProgress.total}</strong> checks ready.
                          Activation still requires confirmed payment; verification
                          still requires authority review.
                        </div>
                        {setupCompletionSavedAt ? (
                          <div style={{ ...softCard(), display: "grid", gap: 8 }}>
                            <div style={iconHeaderStyle()}>
                              <span style={iconFrame(46)}>
                                <GsnRealisticIcon name="records-folder" size={35} decorative />
                              </span>
                              <div style={{ minWidth: 0 }}>
                                <div style={sectionLabel()}>Setup saved</div>
                                <div style={helperText()}>
                                  Your setup record was saved. You can now invite the
                                  first trusted people or continue to payment.
                                </div>
                              </div>
                            </div>
                            <div style={statusBadge("saved")}>
                              Saved: {setupDraftTimeLabel(setupCompletionSavedAt)}
                            </div>
                            <div style={statusBadge(featurePolicyLockedAt ? "locked" : "draft")}>
                              Feature policy:{" "}
                              {featurePolicyLockedAt
                                ? `locked ${setupDraftTimeLabel(featurePolicyLockedAt)}`
                                : "draft until owner/admin lock"}
                            </div>
                          </div>
                        ) : null}
                        <div style={{ ...softCard(), display: "grid", gap: 10 }}>
                          <div style={iconHeaderStyle()}>
                            <span style={iconFrame(46)}>
                              <GsnRealisticIcon name="identity-card" size={35} decorative />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={sectionLabel()}>Edit saved setup</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                If a mistake was made, reopen the step, correct it,
                                then save again.
                              </div>
                            </div>
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {SETUP_EDIT_GROUP_OPTIONS.map((group) => {
                              const selected = group.key === activeSetupEditGroup;
                              return (
                                <StableButton
                                  key={group.key}
                                  type="button"
                                  kind={selected ? "primary" : "secondary"}
                                  stableHeight={46}
                                  title={group.note}
                                  debugId={`community-domain-dashboard.setup-edit-group.${group.key}`}
                                  disabled={setupEditingLocked}
                                  onClick={() => setActiveSetupStep(group.defaultStep)}
                                >
                                  {group.label}
                                </StableButton>
                              );
                            })}
                          </div>
                          <div style={{ ...helperText(), fontSize: 13 }}>
                            {activeSetupEditGroupOption.note}
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {activeSetupEditGroupSteps.map((option) => (
                              <StableButton
                                key={option.key}
                                type="button"
                                kind={option.key === activeSetupStep ? "primary" : "secondary"}
                                stableHeight={44}
                                title={option.note}
                                debugId={`community-domain-dashboard.setup-edit-step.${option.key}`}
                                disabled={setupEditingLocked}
                                onClick={() => setActiveSetupStep(option.key)}
                              >
                                {option.label}
                              </StableButton>
                            ))}
                          </div>
                        </div>
                        <div style={{ ...softCard(), display: "grid", gap: 10 }}>
                          <div style={iconHeaderStyle()}>
                            <span style={iconFrame(46)}>
                              <GsnRealisticIcon name="join-person-plus" size={35} decorative />
                            </span>
                            <div style={{ minWidth: 0 }}>
                              <div style={sectionLabel()}>Invite next</div>
                              <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.15 }}>
                                Build your first circle.
                              </h3>
                            </div>
                          </div>
                          <div style={helperText()}>
                            Share one group invite with the existing WhatsApp or
                            member group. Each person still enters with their own
                            GSN identity, then owner/admin approval decides access.
                          </div>
                          <div
                            style={statusBadge(
                              memberInvitesOff
                                ? "Member Invites off"
                                : featurePolicyModeLabel(memberInvitesPolicyMode)
                            )}
                          >
                            Member Invites:{" "}
                            {memberInvitesOff
                              ? "off in policy"
                              : featurePolicyModeLabel(memberInvitesPolicyMode)}
                          </div>
                          {memberInvitesOff ? (
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              First Circle is blocked by this domain policy. Open
                              Services and change Member Invites before sending
                              group invites.
                            </div>
                          ) : null}
                          <StableButton
                            type="button"
                            kind="primary"
                            fullWidth
                            disabled={
                              setupEditingLocked || !selectedDomainClanId || memberInvitesOff
                            }
                            debugId="community-domain-dashboard.setup-open-first-circle"
                            onClick={openSetupFirstCircle}
                          >
                            {memberInvitesOff ? "Member Invites off" : "Build first circle"}
                          </StableButton>
                          {!selectedDomainClanId ? (
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Invite opens after this domain is linked to a Community
                              Home record.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                        gap: 8,
                      }}
                    >
                      <StableButton
                        type="button"
                        kind="secondary"
                        debugId="community-domain-dashboard.setup-prev"
                        disabled={activeSetupStep === SETUP_STEP_OPTIONS[0].key}
                        onClick={() => moveSetupStep(-1)}
                      >
                        Back
                      </StableButton>
                      <StableButton
                        type="button"
                        kind="primary"
                        debugId="community-domain-dashboard.setup-save-and-continue"
                        disabled={setupEditingLocked || busyProfileSave}
                        onClick={() => {
                          void saveSetupStepAndContinue();
                        }}
                      >
                        {busyProfileSave
                          ? "Saving..."
                          : activeSetupStep ===
                              SETUP_STEP_OPTIONS[SETUP_STEP_OPTIONS.length - 1].key &&
                            setupCompletionSavedAt
                          ? "Setup saved"
                          : activeSetupStep ===
                            SETUP_STEP_OPTIONS[SETUP_STEP_OPTIONS.length - 1].key
                          ? "Save setup"
                          : "Save and continue"}
                      </StableButton>
                    </div>

                    <div style={{ ...helperText(), fontSize: 12 }}>
                      Last saved: {setupDraftTimeLabel(setupDraft.saved_at)}. Draft
                      window: {setupDraftTimeLabel(setupDraft.expires_at)}.
                    </div>
                      </>
                    ) : null}
                  </div>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "identity" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading identity readiness panels...
                      </div>
                    }
                  >
                    <CommunityDomainIdentityReadinessPanels
                      domain={domain}
                      template={template}
                      status={status}
                      renewalState={renewalState}
                      institutionalProfile={institutionalProfile}
                      socialBridge={socialBridge}
                      affiliationReadiness={affiliationReadiness}
                    />
                  </Suspense>
                ) : null}

                {activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={iconHeaderStyle()}>
                      <span style={iconFrame(48)}>
                        <GsnRealisticIcon name="finance-bank-building" size={36} decorative />
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={sectionLabel()}>Billing</div>
                        <h3 style={{ margin: "4px 0 0", fontSize: 20, lineHeight: 1.12 }}>
                          Code, account, proof.
                        </h3>
                        <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                          Generate one code, pay the shown account, then upload proof.
                        </div>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <span style={statusBadge(status.billing_status || selectedLane?.status)}>
                        Billing: {compactStatus(status.billing_status || selectedLane?.status)}
                      </span>
                      <span style={statusBadge(quote?.pricing_status || quote?.quote_status)}>
                        Quote: {compactStatus(quote?.pricing_status || quote?.quote_status)}
                      </span>
                      <span style={statusBadge(domainPaymentReference ? "code ready" : "code needed")}>
                        {domainPaymentReference ? "Code ready" : "Code needed"}
                      </span>
                    </div>
                    <div style={{ ...softCard(), marginTop: 12, display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Billing jobs</div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Open one billing job. Payment code and proof stay separate
                        from account setup, sequence steps, and readiness diagnostics.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {[
                          ["payment_code", "Code & proof"],
                          ["account", "Pay-in account"],
                          ["steps", "Steps"],
                          ["readiness", "Readiness"],
                        ].map(([task, label]) => (
                          <StableButton
                            key={task}
                            type="button"
                            kind={
                              activeBillingTask === task ? "primary" : "secondary"
                            }
                            stableHeight={46}
                            debugId={`community-domain-dashboard.billing-task.${task}`}
                            onClick={() => {
                              setActiveBillingTask(task as BillingTaskKey);
                              if (task === "payment_code") {
                                setActiveBillingPaymentTask("reference");
                              } else if (task === "account") {
                                setActiveBillingAccountTask("summary");
                              }
                            }}
                          >
                            {label}
                          </StableButton>
                        ))}
                      </div>
                    </div>
                    {activeBillingTask === "steps" ? (
                      <div
                        style={{
                          display: "grid",
                          gap: 9,
                          marginTop: 12,
                        }}
                      >
                        {billingSequenceSteps.map((item) =>
                          billingStepCard(
                            item.step,
                            item.title,
                            item.detail,
                            item.status,
                            item.active
                          )
                        )}
                      </div>
                    ) : null}
                    {activeBillingTask === "account" ? (
                    <div
                      style={{
                        ...softCard(),
                        marginTop: 12,
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          gap: 10,
                          flexWrap: "wrap",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={sectionLabel()}>Community pay-in account</div>
                          <h4 style={{ margin: "4px 0 0", fontSize: 16, lineHeight: 1.18 }}>
                            Shown to payers. Locked for editing.
                          </h4>
                        </div>
                        <span
                          style={statusBadge(
                            communityPayInLoading
                              ? "Loading"
                              : communityPayInIsReady
                              ? "Ready"
                              : "Not saved"
                          )}
                        >
                          {communityPayInLoading
                            ? "Loading"
                            : communityPayInIsReady
                            ? "Ready"
                            : "Not saved"}
                        </span>
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Use this account with the generated code. Editing is GSN-admin only.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 145px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {BILLING_ACCOUNT_TASK_OPTIONS.map((task) => {
                          const selected = task.key === activeBillingAccountTask;
                          return (
                            <StableButton
                              key={task.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={46}
                              debugId={`community-domain-dashboard.billing-account.${task.key}`}
                              onClick={() => {
                                setActiveBillingAccountTask(task.key);
                                if (task.key === "setup" && !communityPayInIsReady) {
                                  const nextCountry = normalizeSettlementCountryCode(
                                    billingSettlementCountry
                                  );
                                  setCommunityPayInDraft(
                                    emptyCommunityDomainPayInDraft(
                                      nextCountry,
                                      settlementCurrencyForCountry(nextCountry)
                                    )
                                  );
                                }
                              }}
                            >
                              {task.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {BILLING_ACCOUNT_TASK_OPTIONS.find(
                          (task) => task.key === activeBillingAccountTask
                        )?.note || "Choose the pay-in account packet you need."}
                      </div>
                      {activeBillingAccountTask === "summary" && communityPayInIsReady ? (
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              borderRadius: 12,
                              background: "rgba(255,255,255,0.82)",
                              border: "1px solid rgba(9,27,46,0.10)",
                              padding: "8px 10px",
                            }}
                          >
                            <div style={{ ...sectionLabel(), fontSize: 11 }}>Area</div>
                            <div
                              style={{
                                color: "#091B2E",
                                fontSize: 13,
                                fontWeight: 900,
                                marginTop: 3,
                              }}
                            >
                              {communityPayInCountryLabel}
                            </div>
                          </div>
                          {communityPayInRows.slice(0, 5).map(([label, value]) => (
                            <div
                              key={label}
                              style={{
                                borderRadius: 12,
                                background: "rgba(255,255,255,0.82)",
                                border: "1px solid rgba(9,27,46,0.10)",
                                padding: "8px 10px",
                              }}
                            >
                              <div style={{ ...sectionLabel(), fontSize: 11 }}>{label}</div>
                              <div
                                style={{
                                  color: "#091B2E",
                                  fontSize: 13,
                                  fontWeight: 900,
                                  marginTop: 3,
                                  overflowWrap: "anywhere",
                                }}
                              >
                                {value}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "summary" && !communityPayInIsReady ? (
                        <div style={{ ...helperText(), fontSize: 13, fontWeight: 820 }}>
                          No account is saved yet. Do not pay until GSN assigns one.
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "setup" && !canEditPayInAccount ? (
                        <div style={{ ...helperText(), fontSize: 12.5, fontWeight: 820 }}>
                          Edit locked. The account can be used for payment, but only GSN platform
                          admin can change it during the pilot.
                        </div>
                      ) : null}
                      {activeBillingAccountTask === "setup" && canEditPayInAccount ? (
                        <div style={{ display: "grid", gap: 10 }}>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 10,
                            }}
                          >
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Area</span>
                              <select
                                value={communityPayInDraft.country}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("country", event.target.value)
                                }
                                style={billingInputStyle()}
                              >
                                {SETTLEMENT_COUNTRY_OPTIONS.map((option) => (
                                  <option key={option.value} value={option.value}>
                                    {option.label} - {option.currency}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Currency</span>
                              <input
                                value={communityPayInDraft.currency}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("currency", event.target.value)
                                }
                                maxLength={3}
                                placeholder="GBP"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Bank</span>
                              <input
                                value={communityPayInDraft.bankName}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("bankName", event.target.value)
                                }
                                placeholder="Bank name"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Account name</span>
                              <input
                                value={communityPayInDraft.accountName}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("accountName", event.target.value)
                                }
                                placeholder="Account holder"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Account number</span>
                              <input
                                value={communityPayInDraft.accountNumber}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("accountNumber", event.target.value)
                                }
                                inputMode="numeric"
                                placeholder="Account number"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Sort code</span>
                              <input
                                value={communityPayInDraft.sortCode}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("sortCode", event.target.value)
                                }
                                placeholder="UK sort code"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>Routing number</span>
                              <input
                                value={communityPayInDraft.routingNumber}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("routingNumber", event.target.value)
                                }
                                placeholder="US/other routing"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>IBAN</span>
                              <input
                                value={communityPayInDraft.iban}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("iban", event.target.value)
                                }
                                placeholder="IBAN if used"
                                style={billingInputStyle()}
                              />
                            </label>
                            <label style={{ display: "grid", gap: 6 }}>
                              <span style={sectionLabel()}>SWIFT / BIC</span>
                              <input
                                value={communityPayInDraft.swiftBic}
                                onChange={(event) =>
                                  updateCommunityPayInDraft("swiftBic", event.target.value)
                                }
                                placeholder="SWIFT/BIC if used"
                                style={billingInputStyle()}
                              />
                            </label>
                          </div>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Finance note</span>
                            <textarea
                              value={communityPayInDraft.note}
                              onChange={(event) =>
                                updateCommunityPayInDraft("note", event.target.value)
                              }
                              placeholder="Instruction shown with this account"
                              style={{
                                ...billingInputStyle(),
                                minHeight: 92,
                                padding: "12px",
                                resize: "vertical",
                              }}
                            />
                          </label>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 8,
                            }}
                          >
                            <StableButton
                              type="button"
                              kind="primary"
                              fullWidth
                              disabled={communityPayInSaving}
                              debugId="community-domain-dashboard.pay-in-account-save"
                              onClick={saveCommunityDomainPayInAccount}
                            >
                              {communityPayInSaving ? "Saving account..." : "Save pay-in account"}
                            </StableButton>
                            <StableButton
                              type="button"
                              kind="secondary"
                              fullWidth
                              debugId="community-domain-dashboard.pay-in-account-close"
                              onClick={() => setActiveBillingAccountTask("summary")}
                            >
                              Close
                            </StableButton>
                          </div>
                        </div>
                      ) : null}
                    </div>
                    ) : null}
                    {activeBillingTask === "payment_code" ? (
                      <>
                    <StableButton
                      type="button"
                      kind="secondary"
                      fullWidth
                      disabled={busyQuote}
                      debugId="community-domain-dashboard.refresh-package-quote"
                      onClick={refreshQuote}
                      style={{ marginTop: 12 }}
                    >
                      {packageReviewActionLabel}
                    </StableButton>

                    <div
                      style={{
                        ...softCard(),
                        marginTop: 12,
                        display: "grid",
                        gap: 8,
                      }}
                    >
                      <div style={sectionLabel()}>Payment policy boundary</div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 8,
                        }}
                      >
                        <span style={statusBadge("Subscription billing")}>
                          Subscription billing: required
                        </span>
                        <span
                          style={statusBadge(
                            paymentsContributionsOff
                              ? "Domain payments off"
                              : featurePolicyModeLabel(paymentsContributionsPolicyMode)
                          )}
                        >
                          Payments and Contributions:{" "}
                          {paymentsContributionsOff
                            ? "off for domain activity"
                            : featurePolicyModeLabel(paymentsContributionsPolicyMode)}
                        </span>
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        This setup payment is the Community Domain subscription.
                        Do not use the Payments and Contributions setting to block this setup payment.
                        Use that setting for registrations,
                        donations, event fees, seminar fees, and other domain money-in.
                      </div>
                    </div>

                    <div style={{ ...softCard(), marginTop: 12, display: "grid", gap: 10 }}>
                      <div style={sectionLabel()}>Code & proof packets</div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        Choose the stage first. Reference, generation, credit link,
                        official pay account, and proof upload stay separate.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {BILLING_PAYMENT_GROUP_OPTIONS.map((group) => {
                          const selected = group.key === activeBillingPaymentGroup;
                          return (
                            <StableButton
                              key={group.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={44}
                              fullWidth
                              aria-pressed={selected}
                              title={group.note}
                              debugId={`community-domain-dashboard.billing-payment-group.${group.key}`}
                              onClick={() => setActiveBillingPaymentTask(group.defaultTask)}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {group.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      {activeBillingPaymentGroupTasks.length > 1 ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(9,27,46,0.08)",
                            paddingTop: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={sectionLabel()}>
                            {activeBillingPaymentGroupOption.label} packets
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {activeBillingPaymentGroupTasks.map((task) => {
                              const selected = task.key === activeBillingPaymentTask;
                              return (
                                <StableButton
                                  key={task.key}
                                  type="button"
                                  kind={selected ? "primary" : "secondary"}
                                  stableHeight={40}
                                  fullWidth
                                  aria-pressed={selected}
                                  title={task.note}
                                  debugId={`community-domain-dashboard.billing-payment.${task.key}`}
                                  onClick={() => setActiveBillingPaymentTask(task.key)}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  {task.label}
                                </StableButton>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {activeBillingPaymentTaskOption.note}
                      </div>
                    </div>

                    {activeBillingPaymentTask === "generate" &&
                    (!isAdmin || billingIsActive) ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Generate payment code</div>
                        <div style={{ ...helperText(), marginTop: 7 }}>
                          Payment-code generation is locked here because billing is
                          already active or this account does not have Community
                          Domain admin authority.
                        </div>
                      </div>
                    ) : null}

                    {activeBillingPaymentTask === "generate" &&
                    isAdmin &&
                    !billingIsActive ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Generate payment code</div>
                        <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                          Enter amount, area, and currency.
                        </div>
                        <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                          <div style={sectionLabel()}>Linked marketplace community</div>
                          {linkedDomainClanId ? (
                            <div style={{ ...helperText(), fontSize: 13, fontWeight: 820 }}>
                              Locked to{" "}
                              <strong>
                                {cleanText(
                                  linkedDomainClanRow?.name || paymentClanRow?.name,
                                  `Community ${linkedDomainClanId}`
                                )}
                              </strong>
                              . Marketplace, invite, shop, and member lists use this
                              linked community only.
                            </div>
                          ) : (
                            <>
                              <select
                                value={paymentClanIdDraft}
                                onChange={(event) =>
                                  setPaymentClanIdDraft(event.target.value)
                                }
                                style={billingInputStyle()}
                              >
                                <option value="">
                                  Choose the dedicated marketplace community
                                </option>
                                {communityLinkClanRows.map((row) => (
                                  <option key={row.id} value={String(row.id)}>
                                    {row.name}
                                    {row.communityCode ? ` - ${row.communityCode}` : ""}
                                  </option>
                                ))}
                              </select>
                              <div style={{ ...helperText(), fontSize: 12.5 }}>
                                Choose only the Community Home record that belongs to
                                this Community Domain. This step no longer borrows
                                the last marketplace selected on your phone.
                              </div>
                              {paymentClanRow ? (
                                <div
                                  style={{
                                    ...helperText(),
                                    fontSize: 12.5,
                                    fontWeight: 860,
                                  }}
                                >
                                  Payment code will link{" "}
                                  {cleanText(domain?.display_name, "this Community Domain")}{" "}
                                  to {paymentClanRow.name}.
                                </div>
                              ) : null}
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                disabled={creatingDomainMarketplace}
                                debugId="community-domain-dashboard.create-linked-marketplace"
                                onClick={createDedicatedDomainMarketplace}
                              >
                                {creatingDomainMarketplace
                                  ? "Creating marketplace..."
                                  : "Create dedicated marketplace"}
                              </StableButton>
                            </>
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: 12,
                            display: "grid",
                            gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 10,
                          }}
                        >
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Amount</span>
                            <input
                              value={quoteAmount}
                              onChange={(event) => setQuoteAmount(event.target.value)}
                              inputMode="decimal"
                              placeholder="Agreed quote"
                              style={billingInputStyle()}
                            />
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Area</span>
                            <select
                              value={billingSettlementCountry}
                              onChange={(event) => {
                                const nextCountry = normalizeSettlementCountryCode(
                                  event.target.value
                                );
                                setBillingSettlementCountry(nextCountry);
                                setQuoteCurrency(settlementCurrencyForCountry(nextCountry));
                              }}
                              style={billingInputStyle()}
                            >
                              {SETTLEMENT_COUNTRY_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label} - {option.currency}
                                </option>
                              ))}
                            </select>
                            <span style={{ ...helperText(), fontSize: 12 }}>
                              Currency follows the selected area. Bank details appear after code generation.
                            </span>
                          </label>
                          <label style={{ display: "grid", gap: 6 }}>
                            <span style={sectionLabel()}>Currency</span>
                            <input
                              value={quoteCurrency}
                              onChange={(event) => setQuoteCurrency(event.target.value.toUpperCase())}
                              maxLength={3}
                              placeholder="GBP"
                              style={billingInputStyle()}
                            />
                          </label>
                        </div>
                        <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
                          <span style={sectionLabel()}>Quote note</span>
                          <input
                            value={quoteNote}
                            onChange={(event) => setQuoteNote(event.target.value)}
                            placeholder="Optional note from the agreed quote"
                            style={billingInputStyle()}
                          />
                        </label>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          disabled={busyDomainPayment}
                          debugId="community-domain-dashboard.generate-payment-code"
                          onClick={generateDomainPaymentInstruction}
                          style={{ marginTop: 12 }}
                        >
                          {busyDomainPayment ? "Generating code..." : "Generate payment code"}
                        </StableButton>
                      </div>
                    ) : null}

                    {domainPayment && activeBillingPaymentTask !== "generate" ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Latest payment code</div>
                        <div style={{ ...helperText(), marginTop: 7, fontWeight: 900 }}>
                          {cleanText(
                            domainPayment.reference_display || domainPayment.reference_normalized,
                            "Payment code not shown"
                          )}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: 8,
                            marginTop: 10,
                          }}
                        >
                          <span style={statusBadge(`Payment: ${domainPaymentStatusLabel}`)}>
                            Payment: {domainPaymentStatusLabel}
                          </span>
                          <span style={statusBadge(`Bank match: ${domainPaymentBankMatchLabel}`)}>
                            Bank match: {domainPaymentBankMatchLabel}
                          </span>
                          <span style={statusBadge(`Proof: ${domainPaymentProofLabel}`)}>
                            Proof: {domainPaymentProofLabel}
                          </span>
                        </div>
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Amount:{" "}
                          <strong>
                            {cleanText(domainPayment.amount, "0")}{" "}
                            {cleanText(domainPayment.currency, quoteCurrency || "GBP")}
                          </strong>
                          . Finance confirms only after bank/provider reconciliation succeeds.
                        </div>
                        {activeBillingPaymentTask === "credit_link" ? (
                          <div
                            style={{
                              marginTop: 10,
                              borderRadius: 16,
                              border: "1px solid rgba(12,79,168,0.18)",
                              background: "#F1F7FF",
                              padding: "12px",
                              display: "grid",
                              gap: 9,
                            }}
                          >
                            <div style={sectionLabel()}>GSN credit link</div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {[
                                [
                                  "GSN ID",
                                  cleanText(
                                    domainPaymentIntent?.payer_gmfn_id,
                                    "Signed-in owner account"
                                  ),
                                ],
                                [
                                  "Community",
                                  cleanText(
                                    domainPaymentIntent?.community_name,
                                    `Community ${selectedDomainClanId || ""}`.trim()
                                  ),
                                ],
                                [
                                  "Domain",
                                  cleanText(
                                    domainPaymentIntent?.domain_display_name,
                                    cleanText(
                                      (dashboard?.community_domain as any)?.display_name,
                                      "Community Domain"
                                    )
                                  ),
                                ],
                                [
                                  "Record",
                                  cleanText(
                                    domainPaymentIntent?.expected_payment_id,
                                    domainPayment?.id
                                  ),
                                ],
                              ].map(([label, value]) => (
                                <div
                                  key={label}
                                  style={{
                                    borderRadius: 12,
                                    background: "rgba(255,255,255,0.82)",
                                    border: "1px solid rgba(9,27,46,0.10)",
                                    padding: "8px 10px",
                                  }}
                                >
                                  <div style={{ ...sectionLabel(), fontSize: 11 }}>{label}</div>
                                  <div
                                    style={{
                                      color: "#091B2E",
                                      fontSize: 13,
                                      fontWeight: 900,
                                      marginTop: 3,
                                      overflowWrap: "anywhere",
                                    }}
                                  >
                                    {cleanText(value, "Recorded")}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div style={{ ...helperText(), fontSize: 12.5, fontWeight: 820 }}>
                              Use only the payment code as the bank reference.
                            </div>
                          </div>
                        ) : null}
                        {activeBillingPaymentTask === "pay_account" ? (
                          <div
                            style={{
                              marginTop: 10,
                              borderRadius: 16,
                              border: domainPaymentSettlementReady
                                ? "1px solid rgba(22,101,52,0.22)"
                                : "1px solid rgba(146,64,14,0.24)",
                              background: domainPaymentSettlementReady
                                ? "rgba(240,253,244,0.88)"
                                : "rgba(255,247,237,0.92)",
                              padding: "12px",
                              display: "grid",
                              gap: 9,
                            }}
                          >
                            <div style={sectionLabel()}>
                              Official GSN account for {domainPaymentSettlementLabel}
                            </div>
                            {domainPaymentSettlementReady ? (
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns:
                                    "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                  gap: 8,
                                }}
                              >
                                {domainPaymentSettlementRows.map(([label, value]) => (
                                  <div
                                    key={label}
                                    style={{
                                      borderRadius: 12,
                                      background: "rgba(255,255,255,0.82)",
                                      border: "1px solid rgba(9,27,46,0.10)",
                                      padding: "8px 10px",
                                    }}
                                  >
                                    <div style={{ ...sectionLabel(), fontSize: 11 }}>
                                      {label}
                                    </div>
                                    <div
                                      style={{
                                        color: "#091B2E",
                                        fontSize: 13,
                                        fontWeight: 900,
                                        marginTop: 3,
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {value}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ ...helperText(), fontSize: 13, fontWeight: 850 }}>
                                Payment account is not ready for this area yet. Do not send
                                money until GSN finance gives an active account.
                              </div>
                            )}
                            {cleanText(domainPaymentSettlement?.support_note) ? (
                              <div style={{ ...helperText(), fontSize: 12.5 }}>
                                {cleanText(domainPaymentSettlement?.support_note)}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                        {activeBillingPaymentTask === "proof" ? (
                          <>
                            <div
                              style={{
                                marginTop: 10,
                                borderRadius: 16,
                                border: "1px solid rgba(12,79,168,0.18)",
                                background: "#F1F7FF",
                                color: "#25415F",
                                padding: "10px 12px",
                                fontSize: 13,
                                fontWeight: 820,
                                lineHeight: 1.45,
                              }}
                            >
                              Use this code as the payment reference in your own bank or
                              provider channel. If the bank asks for app approval, SMS OTP,
                              a one-time code, code generator, or biometric confirmation,
                              complete that with the bank first.
                            </div>
                            <div style={{ marginTop: 10 }}>
                              <PaymentProofSubmissionPanel
                                payment={domainPayment}
                                clanId={selectedDomainClanId}
                                title="Community Domain payment proof"
                                compact
                                debugIdPrefix="community-domain-payment-proof"
                                onUploaded={(updated) => {
                                  setDomainPayment({ ...domainPayment, ...updated });
                                  setMessage(
                                    "Community Domain payment proof uploaded for finance review. Activation still waits for reconciliation."
                                  );
                                }}
                                onNotice={(tone, text) => {
                                  if (tone === "success" || tone === "error") {
                                    setMessage(text);
                                  }
                                }}
                              />
                            </div>
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {!domainPayment && activeBillingPaymentTask !== "generate" ? (
                      <div style={{ ...softCard(), marginTop: 12 }}>
                        <div style={sectionLabel()}>Payment code needed</div>
                        <div style={{ ...helperText(), marginTop: 7 }}>
                          Generate the Community Domain payment code first. The
                          official pay account and proof upload appear after the
                          payment record exists.
                        </div>
                        <StableButton
                          type="button"
                          kind="primary"
                          fullWidth
                          debugId="community-domain-dashboard.open-generate-payment-code"
                          onClick={() => setActiveBillingPaymentTask("generate")}
                          style={{ marginTop: 12 }}
                        >
                          Open Generate
                        </StableButton>
                      </div>
                    ) : null}
                      </>
                    ) : null}
                  </div>
                ) : null}

                {activeLane === "billing" && activeBillingTask === "readiness" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Billing readiness details</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      This selected job shows the deeper lifecycle and capacity
                      diagnostics. Use the Code & proof or Pay-in account jobs
                      for the normal owner payment workflow.
                    </div>
                    <div style={{ marginTop: 12 }}>
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading billing readiness panels...
                          </div>
                        }
                      >
                        <CommunityDomainBillingReadinessPanels
                          subscriptionLifecycle={subscriptionLifecycle}
                          capacityPlan={capacityPlan}
                        />
                      </Suspense>
                    </div>
                  </div>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "modules" ? (
                  <>
                    <div
                      style={{
                        ...softCard(),
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={sectionLabel()}>Services focus</div>
                      <div style={helperText()}>
                        Choose the service stage first. Current view:{" "}
                        <strong>{selectedServiceDetail.label}</strong>.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {SERVICE_DETAIL_GROUP_OPTIONS.map((group) => {
                          const selected = group.key === activeServiceDetailGroup;
                          return (
                            <StableButton
                              key={group.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={48}
                              fullWidth
                              aria-pressed={selected}
                              title={group.note}
                              debugId={`community-domain-dashboard.service-group.${group.key}`}
                              onClick={() => setActiveServiceDetail(group.defaultDetail)}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {group.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      {activeServiceGroupDetails.length > 1 ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(9,27,46,0.08)",
                            paddingTop: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={sectionLabel()}>
                            {activeServiceDetailGroupOption.label} packets
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {activeServiceGroupDetails.map((option) => {
                              const selected = option.key === activeServiceDetail;
                              return (
                                <StableButton
                                  key={option.key}
                                  type="button"
                                  kind={selected ? "primary" : "secondary"}
                                  stableHeight={42}
                                  fullWidth
                                  aria-pressed={selected}
                                  title={option.note}
                                  debugId={`community-domain-dashboard.service-detail.${option.key}`}
                                  onClick={() => setActiveServiceDetail(option.key)}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  {option.label}
                                </StableButton>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {selectedServiceDetail.note}
                      </div>
                    </div>

                    <div
                      style={{
                        ...softCard(),
                        display: "grid",
                        gap: 10,
                        border: "1px solid rgba(214,170,69,0.34)",
                        background: "rgba(255,249,225,0.72)",
                      }}
                    >
                      <div style={iconHeaderStyle()}>
                        <span style={iconFrame(46)}>
                          <GsnRealisticIcon name="finance-bank-building" size={35} decorative />
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={sectionLabel()}>Domain rule</div>
                          <h3 style={{ margin: "4px 0 0", fontSize: 19, lineHeight: 1.15 }}>
                            Shared services, governed here.
                          </h3>
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gap: 8,
                          padding: 12,
                          borderRadius: 18,
                          border: "1px solid rgba(9,27,46,0.1)",
                          background: "rgba(255,255,255,0.7)",
                        }}
                      >
                        <div style={sectionLabel()}>Professional marketplace rule</div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Ordinary GSN marketplace behaviours stay available, but
                          this domain decides who may use each one here.
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {professionalMarketplaceFacts.map(([label, value]) => (
                            <div key={label} style={statusBadge("domain rule")}>
                              {label}: {value}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {packageCapacityFacts.map(([label, value]) => (
                          <div key={label} style={statusBadge("allowance")}>
                            {label}: {value}
                          </div>
                        ))}
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {packageTariffBoundaryText}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {packageBillingStatusFacts.map(([label, value]) => (
                          <div key={label} style={statusBadge("manual review")}>
                            {label}: {value}
                          </div>
                        ))}
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {packageBillingAdminAction} Feature policy controls who
                        can use Spotlight, Demand Box, shops, Shop Diary, Vault,
                        ROSCA, invites, and contribution tools here.
                      </div>
                    </div>

                    {activeServiceDetail === "readiness" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading service readiness panels...
                          </div>
                        }
                      >
                        <CommunityDomainServiceReadinessPanels
                          moduleScopeReadiness={moduleScopeReadiness}
                          moduleKeys={moduleKeys}
                          billingStatus={status.billing_status}
                          quote={quote}
                          serviceSettingsProjection={serviceSettingsProjection}
                          economicParticipation={economicParticipation}
                          networkPresence={networkPresence}
                        />
                      </Suspense>
                    ) : null}

                    {activeServiceDetail === "local" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading local service views...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="services"
                          nodeServiceMap={nodeServiceMap}
                          nodePrivacyMap={nodePrivacyMap}
                          nodeAnalyticsMap={nodeAnalyticsMap}
                          nodeCommunicationMap={nodeCommunicationMap}
                          nodeVaultMap={nodeVaultMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeServiceDetail === "boundaries" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading service boundary panels...
                          </div>
                        }
                      >
                        <CommunityDomainServiceBoundaryPanels
                          networkExchangeMap={networkExchangeMap}
                          recordPrivacyMap={recordPrivacyMap}
                          configurationMap={configurationMap}
                          complianceMap={complianceMap}
                          appealReadiness={appealReadiness}
                        />
                      </Suspense>
                    ) : null}

                    {activeServiceDetail === "trust" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading trust evidence views...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="trustEvidence"
                          nodeEvidenceAuthorityMap={nodeEvidenceAuthorityMap}
                          nodeTrustMap={nodeTrustMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeServiceDetail === "evidence" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading trust evidence readiness panels...
                          </div>
                        }
                      >
                        <CommunityDomainTrustEvidenceReadinessPanels
                          evidenceRecordReadiness={evidenceRecordReadiness}
                          evidenceReleaseReadiness={evidenceReleaseReadiness}
                          trustRelayReadiness={trustRelayReadiness}
                          notificationScopeReadiness={notificationScopeReadiness}
                          trustMobility={trustMobility}
                        />
                      </Suspense>
                    ) : null}
                  </>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <>
                    <div
                      style={{
                        ...softCard(),
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={sectionLabel()}>Structure focus</div>
                      <div style={helperText()}>
                        Choose the structure stage first. Current
                        view: <strong>{selectedStructureDetail.label}</strong>.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {STRUCTURE_DETAIL_GROUP_OPTIONS.map((group) => {
                          const selected = group.key === activeStructureDetailGroup;
                          return (
                            <StableButton
                              key={group.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={48}
                              fullWidth
                              aria-pressed={selected}
                              title={group.note}
                              debugId={`community-domain-dashboard.structure-group.${group.key}`}
                              onClick={() => setActiveStructureDetail(group.defaultDetail)}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {group.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      {activeStructureGroupDetails.length > 1 ? (
                        <div
                          style={{
                            borderTop: "1px solid rgba(9,27,46,0.08)",
                            paddingTop: 10,
                            display: "grid",
                            gap: 8,
                          }}
                        >
                          <div style={sectionLabel()}>
                            {activeStructureDetailGroupOption.label} packets
                          </div>
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 136px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {activeStructureGroupDetails.map((option) => {
                              const selected = option.key === activeStructureDetail;
                              return (
                                <StableButton
                                  key={option.key}
                                  type="button"
                                  kind={selected ? "primary" : "secondary"}
                                  stableHeight={42}
                                  fullWidth
                                  aria-pressed={selected}
                                  title={option.note}
                                  debugId={`community-domain-dashboard.structure-detail.${option.key}`}
                                  onClick={() => setActiveStructureDetail(option.key)}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  {option.label}
                                </StableButton>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {selectedStructureDetail.note}
                      </div>
                    </div>

                    {activeStructureDetail === "preview" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading structure map...
                          </div>
                        }
                      >
                        <CommunityDomainStructurePreviewPanel
                          nodeTree={nodeTree}
                        />
                      </Suspense>
                    ) : null}

                    {activeStructureDetail === "foundation" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading foundation views...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="structureFoundation"
                          nodeAutonomyMap={nodeAutonomyMap}
                          nodeEconomicMap={nodeEconomicMap}
                          nodeActivityMap={nodeActivityMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeStructureDetail === "boundary" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading boundary view...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="structureBoundary"
                          nodeDomainBoundaryMap={nodeDomainBoundaryMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeStructureDetail === "activity" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading activity detail views...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="structureActivity"
                          nodeScheduledActivityMap={nodeScheduledActivityMap}
                          nodePaidActivityMap={nodePaidActivityMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeStructureDetail === "planning" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading rollout planning...
                          </div>
                        }
                      >
                        <CommunityDomainStructurePlanningPanels
                          rolloutPlan={rolloutPlan}
                          activityMap={activityMap}
                          activityGroupReadiness={activityGroupReadiness}
                        />
                      </Suspense>
                    ) : null}
                  </>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "governance" ? (
                  <>
                    {isAdmin ? (
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="records-folder" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Governance jobs</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Choose the governance stage first.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Readiness, reports, and records stay separate so
                              the surface does not dump every control at once.
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {GOVERNANCE_TASK_GROUP_OPTIONS.map((group) => (
                            <StableButton
                              key={group.key}
                              type="button"
                              kind={
                                activeGovernanceTaskGroup === group.key
                                  ? "primary"
                                  : "secondary"
                              }
                              stableHeight={46}
                              debugId={`community-domain-dashboard.governance-group.${group.key}`}
                              onClick={() => selectGovernanceTask(group.defaultTask)}
                            >
                              {group.label}
                            </StableButton>
                          ))}
                        </div>
                        {activeGovernanceGroupTasks.length > 1 ? (
                          <div
                            style={{
                              borderTop: "1px solid rgba(9,27,46,0.08)",
                              paddingTop: 10,
                              display: "grid",
                              gap: 8,
                            }}
                          >
                            <div style={sectionLabel()}>
                              {activeGovernanceTaskGroupOption.label} jobs
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {activeGovernanceGroupTasks.map((task) => (
                                <StableButton
                                  key={task.key}
                                  type="button"
                                  kind={
                                    activeGovernanceTask === task.key
                                      ? "primary"
                                      : "secondary"
                                  }
                                  stableHeight={42}
                                  debugId={`community-domain-dashboard.governance-task.${task.key}`}
                                  onClick={() => selectGovernanceTask(task.key)}
                                >
                                  {task.label}
                                </StableButton>
                              ))}
                            </div>
                          </div>
                        ) : null}
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          {activeGovernanceTaskOption.note}
                        </div>
                      </div>
                    ) : null}

                    {activeGovernanceTask === "readiness" || !isAdmin ? (
                    <Suspense
                      fallback={
                        <div style={{ ...helperText(), marginTop: 4 }}>
                          Loading governance readiness panels...
                        </div>
                      }
                    >
                      <CommunityDomainGovernanceReadinessPanels
                        isAdmin={isAdmin}
                        membershipAccessRequests={membershipAccessRequests}
                        governanceAttentionCount={governanceAttentionCount}
                        institutionalOpenReviewCount={institutionalOpenReviewCount}
                        governanceApprovedCount={governanceApprovedCount}
                        delegationMap={delegationMap}
                        governanceCoverage={governanceCoverage}
                      />
                    </Suspense>
                    ) : null}

                    {isAdmin && activeGovernanceTask === "director_summary" ? (
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="records-folder" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Director period summary</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Recorded facts for this period.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              This report only counts records already in GSN. Missing activity or beneficiary records stay marked as not recorded.
                            </div>
                          </div>
                        </div>

                        {periodSummary ? (
                          (() => {
                            const membership = periodSummary?.membership_snapshot || {};
                            const movement = periodSummary?.member_movement || {};
                            const governance = periodSummary?.governance_summary || {};
                            const evidence = periodSummary?.evidence_summary || {};
                            const confirmations = periodSummary?.confirmation_summary || {};
                            const activityStatus = cleanText(
                              periodSummary?.activity_summary?.status,
                              "not_recorded"
                            );
                            const outcomeStatus = cleanText(
                              periodSummary?.beneficiary_outcome_summary?.status,
                              "not_recorded"
                            );
                            const periodStart = cleanText(periodSummary?.period?.start);
                            const periodEnd = cleanText(periodSummary?.period?.end);
                            const membershipTiles = [
                              ["Active members", membership.active_total ?? 0],
                              ["Added", movement.added ?? 0],
                              ["Removed", movement.removed_or_deactivated ?? 0],
                              ["Governance actions", governance.total ?? 0],
                            ];
                            const evidenceTiles = [
                              ["Evidence records", evidence.total ?? 0],
                              ["Confirmations", confirmations.requests_total ?? 0],
                            ];
                            const deliveryTiles = [
                              [
                                "Delivery packs",
                                evidence.beneficiary_confirmation_delivery_prepared ??
                                  0,
                              ],
                              [
                                "Manual receipts",
                                evidence.beneficiary_confirmation_delivery_receipts ??
                                  0,
                              ],
                              [
                                "Current receipts",
                                evidence.beneficiary_confirmation_delivery_receipts_current_uncorrected ??
                                  0,
                              ],
                              [
                                "Receipt corrections",
                                evidence.beneficiary_confirmation_delivery_receipt_corrections ??
                                  0,
                              ],
                              [
                                "Provider blocked",
                                evidence.beneficiary_confirmation_provider_send_blocked_checks ??
                                  0,
                              ],
                              [
                                "Contact consent",
                                evidence.beneficiary_contact_consent_records ?? 0,
                              ],
                              [
                                "Consent withdrawn",
                                evidence.beneficiary_contact_consent_withdrawals ??
                                  0,
                              ],
                            ];
                            const hasDeliveryEvidence = Boolean(
                              Number(
                                evidence.beneficiary_confirmation_delivery_prepared ??
                                  0
                              ) ||
                                Number(
                                  evidence.beneficiary_confirmation_delivery_receipts ??
                                    0
                                ) ||
                                Number(
                                  evidence.beneficiary_confirmation_delivery_receipts_current_uncorrected ??
                                    0
                                ) ||
                                Number(
                                  evidence.beneficiary_confirmation_delivery_receipt_corrections ??
                                    0
                                ) ||
                                Number(
                                  evidence.beneficiary_contact_consent_records ?? 0
                                ) ||
                                Number(
                                  evidence.beneficiary_contact_consent_withdrawals ??
                                    0
                                )
                            );
                            return (
                              <>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                  }}
                                >
                                  <span style={statusBadge("admin report")}>Admin report</span>
                                  <span style={statusBadge(activityStatus)}>
                                    Activity: {compactStatus(activityStatus)}
                                  </span>
                                  <span style={statusBadge(outcomeStatus)}>
                                    Outcomes: {compactStatus(outcomeStatus)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {[
                                    ["overview", "Overview"],
                                    ["membership", "Membership"],
                                    ["evidence", "Evidence"],
                                    ["delivery", "Delivery"],
                                  ].map(([task, label]) => (
                                    <StableButton
                                      key={task}
                                      type="button"
                                      kind={
                                        activeDirectorSummaryTask === task
                                          ? "primary"
                                          : "secondary"
                                      }
                                      stableHeight={44}
                                      debugId={`community-domain-dashboard.director-summary.${task}`}
                                      onClick={() =>
                                        setActiveDirectorSummaryTask(
                                          task as DirectorSummaryTaskKey
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {label}
                                    </StableButton>
                                  ))}
                                </div>
                                {activeDirectorSummaryTask === "overview" ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      borderRadius: 10,
                                      border: "1px solid rgba(9,27,46,0.1)",
                                      background: "#FFFFFF",
                                      padding: 12,
                                    }}
                                  >
                                    <div style={sectionLabel()}>Report boundary</div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Period: {periodStart || "default start"} to{" "}
                                      {periodEnd || "default end"}.
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      {periodSummary?.boundary ||
                                        "Every number should trace back to source records."}
                                    </div>
                                  </div>
                                ) : null}
                                {activeDirectorSummaryTask === "membership" ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                                      gap: 8,
                                    }}
                                  >
                                    {membershipTiles.map(([label, value]) => (
                                      <div
                                        key={String(label)}
                                        style={{
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.1)",
                                          background: "#FFFFFF",
                                          padding: "10px 12px",
                                        }}
                                      >
                                        <div style={{ ...helperText(), fontSize: 12 }}>
                                          {label}
                                        </div>
                                        <div
                                          style={{
                                            marginTop: 3,
                                            color: "#091B2E",
                                            fontSize: 20,
                                            fontWeight: 950,
                                            lineHeight: 1,
                                          }}
                                        >
                                          {String(value ?? 0)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {activeDirectorSummaryTask === "evidence" ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                                      gap: 8,
                                    }}
                                  >
                                    {evidenceTiles.map(([label, value]) => (
                                      <div
                                        key={String(label)}
                                        style={{
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.1)",
                                          background: "#FFFFFF",
                                          padding: "10px 12px",
                                        }}
                                      >
                                        <div style={{ ...helperText(), fontSize: 12 }}>
                                          {label}
                                        </div>
                                        <div
                                          style={{
                                            marginTop: 3,
                                            color: "#091B2E",
                                            fontSize: 20,
                                            fontWeight: 950,
                                            lineHeight: 1,
                                          }}
                                        >
                                          {String(value ?? 0)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {activeDirectorSummaryTask === "delivery" ? (
                                  <>
                                    <div
                                      style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                          "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                                        gap: 8,
                                      }}
                                    >
                                      {deliveryTiles.map(([label, value]) => (
                                        <div
                                          key={String(label)}
                                          style={{
                                            borderRadius: 10,
                                            border: "1px solid rgba(9,27,46,0.1)",
                                            background: "#FFFFFF",
                                            padding: "10px 12px",
                                          }}
                                        >
                                          <div
                                            style={{ ...helperText(), fontSize: 12 }}
                                          >
                                            {label}
                                          </div>
                                          <div
                                            style={{
                                              marginTop: 3,
                                              color: "#091B2E",
                                              fontSize: 20,
                                              fontWeight: 950,
                                              lineHeight: 1,
                                            }}
                                          >
                                            {String(value ?? 0)}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                {hasDeliveryEvidence ? (
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={sectionLabel()}>
                                      Delivery evidence
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      {Object.entries(
                                        evidence.beneficiary_confirmation_delivery_receipts_current_by_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-current-delivery-status-${label}`}
                                          style={statusBadge("current receipt")}
                                        >
                                          Current {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.beneficiary_confirmation_delivery_receipts_by_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-delivery-status-${label}`}
                                          style={statusBadge("manual receipt")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.beneficiary_confirmation_delivery_receipts_by_consent_basis ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-delivery-consent-${label}`}
                                          style={statusBadge("consent basis")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.beneficiary_confirmation_delivery_receipt_corrections_by_decision ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-delivery-correction-${label}`}
                                          style={statusBadge("receipt correction")}
                                        >
                                          Correction {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.beneficiary_contact_consent_by_reference_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-contact-consent-${label}`}
                                          style={statusBadge("contact consent")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.beneficiary_contact_consent_withdrawals_by_reason ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`period-contact-consent-withdrawal-${label}`}
                                          style={statusBadge("consent withdrawn")}
                                        >
                                          Withdrawn {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      GSN did not send WhatsApp, SMS, or email;
                                      these are prepared packs, contact/consent
                                      attestations, and admin-recorded manual
                                      receipts. Current receipts exclude receipts
                                      marked corrected, superseded, or under review.
                                    </div>
                                  </div>
                                ) : (
                                  <div style={helperText()}>
                                    No delivery evidence counts are recorded yet.
                                  </div>
                                )}
                                  </>
                                ) : null}
                              </>
                            );
                          })()
                        ) : (
                          <div style={helperText()}>
                            No period summary is loaded for this Governance view yet.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {isAdmin && activeGovernanceTask === "sponsor_summary" ? (
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="public-globe" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Sponsor-safe summary</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Aggregate evidence only.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              This view separates recorded, confirmed, and challenged evidence without exposing private beneficiary details.
                            </div>
                          </div>
                        </div>

                        {sponsorSummary ? (
                          (() => {
                            const evidence = sponsorSummary?.evidence_summary || {};
                            const activity = sponsorSummary?.activity_summary || {};
                            const outcomes =
                              sponsorSummary?.beneficiary_outcome_summary || {};
                            const challenges = sponsorSummary?.challenge_summary || {};
                            const exportPack =
                              sponsorSummary?.sponsor_export_pack || {};
                            const exportCopyText = cleanText(exportPack?.copy_text);
                            const externalDelivery =
                              sponsorSummary?.external_delivery_readiness || {};
                            const readiness = cleanText(
                              sponsorSummary?.sponsor_readiness,
                              "not_enough_recorded_evidence"
                            );
                            const sponsorTiles = [
                              ["Activities", evidence.activity_records ?? 0],
                              [
                                "Outcomes",
                                evidence.beneficiary_outcome_records ?? 0,
                              ],
                              [
                                "Confirmed",
                                evidence.beneficiary_confirmed_outcomes ?? 0,
                              ],
                              [
                                "Admin recorded",
                                evidence.admin_recorded_or_unconfirmed_outcomes ?? 0,
                              ],
                              [
                                "Challenged",
                                evidence.challenged_or_under_review_outcomes ?? 0,
                              ],
                              [
                                "Reviewed",
                                evidence.reviewed_challenge_outcomes ?? 0,
                              ],
                              [
                                "Unresolved",
                                evidence.unresolved_challenge_outcomes ?? 0,
                              ],
                              [
                                "Delivery packs",
                                evidence.confirmation_delivery_prepared_records ??
                                  0,
                              ],
                              [
                                "Manual receipts",
                                evidence.confirmation_delivery_receipt_records ??
                                  0,
                              ],
                              [
                                "Current receipts",
                                evidence.confirmation_delivery_receipts_current_uncorrected ??
                                  0,
                              ],
                              [
                                "Receipt corrections",
                                evidence.confirmation_delivery_receipt_corrections ??
                                  0,
                              ],
                              [
                                "Provider blocked",
                                evidence.confirmation_provider_send_blocked_checks ??
                                  0,
                              ],
                              [
                                "Contact consent",
                                evidence.contact_consent_records ?? 0,
                              ],
                              [
                                "Consent withdrawn",
                                evidence.contact_consent_withdrawals ?? 0,
                              ],
                              ["People reached", outcomes.subject_count ?? 0],
                            ];
                            const hasDeliveryEvidence = Boolean(
                              Number(
                                evidence.confirmation_delivery_prepared_records ??
                                  0
                              ) ||
                                Number(
                                  evidence.confirmation_delivery_receipt_records ??
                                    0
                                ) ||
                                Number(
                                  evidence.confirmation_delivery_receipts_current_uncorrected ??
                                    0
                                ) ||
                                Number(
                                  evidence.confirmation_delivery_receipt_corrections ??
                                    0
                                ) ||
                                Number(evidence.contact_consent_records ?? 0) ||
                                Number(
                                  evidence.contact_consent_withdrawals ?? 0
                                )
                            );
                            return (
                              <>
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                  }}
                                >
                                  <span style={statusBadge(readiness)}>
                                    {compactStatus(readiness)}
                                  </span>
                                  <span style={statusBadge(activity.status)}>
                                    Activity: {compactStatus(activity.status)}
                                  </span>
                                  <span style={statusBadge(outcomes.status)}>
                                    Outcomes: {compactStatus(outcomes.status)}
                                  </span>
                                  <span style={statusBadge(challenges.status)}>
                                    Challenges: {compactStatus(challenges.status)}
                                  </span>
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {[
                                    ["overview", "Overview"],
                                    ["evidence", "Evidence"],
                                    ["delivery", "Delivery"],
                                    ["export", "Export"],
                                  ].map(([task, label]) => (
                                    <StableButton
                                      key={task}
                                      type="button"
                                      kind={
                                        activeSponsorSummaryTask === task
                                          ? "primary"
                                          : "secondary"
                                      }
                                      stableHeight={44}
                                      debugId={`community-domain-dashboard.sponsor-summary.${task}`}
                                      onClick={() =>
                                        setActiveSponsorSummaryTask(
                                          task as SponsorSummaryTaskKey
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {label}
                                    </StableButton>
                                  ))}
                                </div>
                                {activeSponsorSummaryTask === "overview" ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      borderRadius: 10,
                                      border: "1px solid rgba(9,27,46,0.1)",
                                      background: "#FFFFFF",
                                      padding: 12,
                                    }}
                                  >
                                    <div style={sectionLabel()}>Pack boundary</div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      {cleanText(
                                        sponsorSummary?.plain_language,
                                        "Sponsor-safe summary aggregates recorded facts only."
                                      )}
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      {cleanText(
                                        evidence.privacy,
                                        "Private beneficiary details are omitted."
                                      )}
                                    </div>
                                  </div>
                                ) : null}
                                {activeSponsorSummaryTask === "evidence" ? (
                                  <>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 128px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {sponsorTiles.map(([label, value]) => (
                                    <div
                                      key={String(label)}
                                      style={{
                                        borderRadius: 10,
                                        border: "1px solid rgba(9,27,46,0.1)",
                                        background: "#FFFFFF",
                                        padding: "10px 12px",
                                      }}
                                    >
                                      <div style={{ ...helperText(), fontSize: 12 }}>
                                        {label}
                                      </div>
                                      <div
                                        style={{
                                          marginTop: 3,
                                          color: "#091B2E",
                                          fontSize: 20,
                                          fontWeight: 950,
                                          lineHeight: 1,
                                        }}
                                      >
                                        {String(value ?? 0)}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                {Array.isArray(outcomes.top_indicators) &&
                                outcomes.top_indicators.length ? (
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={sectionLabel()}>Top indicators</div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      {outcomes.top_indicators
                                        .slice(0, 4)
                                        .map((item: any) => (
                                          <span
                                            key={cleanText(item?.label)}
                                            style={statusBadge("indicator")}
                                          >
                                            {cleanText(item?.label)}:{" "}
                                            {cleanText(item?.count, "0")}
                                          </span>
                                        ))}
                                    </div>
                                  </div>
                                ) : null}
                                  </>
                                ) : null}
                                {activeSponsorSummaryTask === "export" ? (
                                  exportCopyText ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      borderRadius: 10,
                                      border: "1px solid rgba(191,147,62,0.28)",
                                      background: "rgba(191,147,62,0.08)",
                                      padding: 12,
                                    }}
                                  >
                                    <div style={sectionLabel()}>
                                      Sponsor export pack
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Copy-ready text prepared from this
                                      sponsor-safe summary. It omits private
                                      beneficiary detail and is not sent by GSN.
                                    </div>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={busySponsorExportCopy}
                                      debugId="community-domain-dashboard.copy-sponsor-export-pack"
                                      onClick={() => {
                                        void copySponsorExportPack();
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busySponsorExportCopy
                                        ? "Copying pack..."
                                      : "Copy sponsor pack"}
                                    </StableButton>
                                  </div>
                                  ) : (
                                    <div style={helperText()}>
                                      No copy-ready sponsor export pack is available yet.
                                    </div>
                                  )
                                ) : null}
                                {activeSponsorSummaryTask === "delivery" ? (
                                  <>
                                {hasDeliveryEvidence ? (
                                  <div style={{ display: "grid", gap: 6 }}>
                                    <div style={sectionLabel()}>
                                      Delivery evidence
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      {Object.entries(
                                        evidence.confirmation_delivery_receipts_current_by_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-current-delivery-status-${label}`}
                                          style={statusBadge("current receipt")}
                                        >
                                          Current {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.confirmation_delivery_receipts_by_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-delivery-status-${label}`}
                                          style={statusBadge("manual receipt")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.confirmation_delivery_receipts_by_consent_basis ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-delivery-consent-${label}`}
                                          style={statusBadge("consent basis")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.confirmation_delivery_receipt_corrections_by_decision ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-delivery-correction-${label}`}
                                          style={statusBadge("receipt correction")}
                                        >
                                          Correction {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.contact_consent_by_reference_status ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-contact-consent-${label}`}
                                          style={statusBadge("contact consent")}
                                        >
                                          {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                      {Object.entries(
                                        evidence.contact_consent_withdrawals_by_reason ||
                                          {}
                                      ).map(([label, value]) => (
                                        <span
                                          key={`sponsor-contact-consent-withdrawal-${label}`}
                                          style={statusBadge("consent withdrawn")}
                                        >
                                          Withdrawn {compactStatus(label)}:{" "}
                                          {cleanText(value, "0")}
                                        </span>
                                      ))}
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      GSN did not send external messages. These
                                      counts show prepared packs,
                                      contact/consent attestations, and
                                      admin-recorded manual delivery receipts
                                      only. Provider blocked checks are readiness
                                      checks, not sends. Current receipts exclude
                                      receipts marked corrected, superseded, or
                                      under review.
                                    </div>
                                  </div>
                                ) : (
                                  <div style={helperText()}>
                                    No delivery evidence counts are recorded yet.
                                  </div>
                                )}
                                {externalDelivery?.status ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gap: 8,
                                      borderRadius: 10,
                                      border: "1px solid rgba(171,86,48,0.28)",
                                      background: "rgba(171,86,48,0.08)",
                                      padding: 12,
                                    }}
                                  >
                                    <div style={sectionLabel()}>
                                      Provider delivery readiness
                                    </div>
                                    <div
                                      style={{
                                        display: "flex",
                                        flexWrap: "wrap",
                                        gap: 8,
                                      }}
                                    >
                                      <span style={statusBadge(externalDelivery.status)}>
                                        {compactStatus(externalDelivery.status)}
                                      </span>
                                      <span style={statusBadge("not sent")}>
                                        GSN sent:{" "}
                                        {externalDelivery.external_channels_sent_by_gsn
                                          ? "yes"
                                          : "no"}
                                      </span>
                                      <span style={statusBadge("provider")}>
                                        Send engine:{" "}
                                        {compactStatus(
                                          externalDelivery.provider_send_engine_status
                                        )}
                                      </span>
                                    </div>
                                    {Array.isArray(
                                      externalDelivery.missing_components
                                    ) &&
                                    externalDelivery.missing_components.length ? (
                                      <div
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: 8,
                                        }}
                                      >
                                        {externalDelivery.missing_components
                                          .slice(0, 4)
                                          .map((item: any) => (
                                            <span
                                              key={cleanText(item)}
                                              style={statusBadge("needed")}
                                            >
                                              {cleanText(item)}
                                            </span>
                                        ))}
                                      </div>
                                    ) : null}
                                    {externalDelivery.provider_setup_contract ? (
                                      <div
                                        style={{
                                          display: "grid",
                                          gap: 6,
                                          borderTop:
                                            "1px solid rgba(171,86,48,0.18)",
                                          paddingTop: 8,
                                        }}
                                      >
                                        <div style={sectionLabel()}>
                                          Provider setup contract
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                          }}
                                        >
                                          <span style={statusBadge("not configured")}>
                                            {compactStatus(
                                              externalDelivery
                                                .provider_setup_contract?.status ||
                                                "not_configured"
                                            )}
                                          </span>
                                          {(
                                            externalDelivery.provider_setup_contract
                                              ?.send_lift_conditions || []
                                          )
                                            .slice(0, 3)
                                            .map((item: any) => (
                                              <span
                                                key={cleanText(item)}
                                                style={statusBadge("required")}
                                              >
                                                {cleanText(item)}
                                              </span>
                                            ))}
                                        </div>
                                        <div
                                          style={{ ...helperText(), fontSize: 13 }}
                                        >
                                          {cleanText(
                                            externalDelivery.provider_setup_contract
                                              ?.truth_gate,
                                            "Provider sending may only be marked ready after provider send, webhook, consent, retry, and receipt mapping are tested."
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                    {externalDelivery.contact_consent_contract ? (
                                      <div
                                        style={{
                                          display: "grid",
                                          gap: 6,
                                          borderTop:
                                            "1px solid rgba(171,86,48,0.18)",
                                          paddingTop: 8,
                                        }}
                                      >
                                        <div style={sectionLabel()}>
                                          Contact and consent gate
                                        </div>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexWrap: "wrap",
                                            gap: 8,
                                          }}
                                        >
                                          <span style={statusBadge("not connected")}>
                                            {compactStatus(
                                              externalDelivery
                                                .contact_consent_contract?.status ||
                                                "not_connected"
                                            )}
                                          </span>
                                          <span style={statusBadge("blocked")}>
                                            {compactStatus(
                                              externalDelivery
                                                .contact_consent_contract
                                                ?.provider_send_blocker ||
                                                "missing contact preference and consent gate"
                                            )}
                                          </span>
                                          <span style={statusBadge("blocked")}>
                                            {compactStatus(
                                              externalDelivery
                                                .contact_consent_contract
                                                ?.active_contact_consent_status ||
                                                "not evaluated"
                                            )}
                                          </span>
                                        </div>
                                        <div
                                          style={{ ...helperText(), fontSize: 13 }}
                                        >
                                          {cleanText(
                                            externalDelivery.contact_consent_contract
                                              ?.active_contact_consent_boundary,
                                            "Provider sending must stay blocked unless the latest contact/consent status is active attestation."
                                          )}
                                        </div>
                                        <div
                                          style={{ ...helperText(), fontSize: 13 }}
                                        >
                                          {cleanText(
                                            externalDelivery.contact_consent_contract
                                              ?.minimum_send_rule,
                                            "Do not attempt provider delivery until the selected channel has a verified destination and an active consent or legal authority basis."
                                          )}
                                        </div>
                                        <div
                                          style={{ ...helperText(), fontSize: 13 }}
                                        >
                                          {cleanText(
                                            externalDelivery.contact_consent_contract
                                              ?.privacy_boundary,
                                            "This readiness view does not store beneficiary phone numbers, email addresses, provider destinations, or consent records."
                                          )}
                                        </div>
                                      </div>
                                    ) : null}
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      {cleanText(
                                        externalDelivery.boundary,
                                        "GSN can prepare manual delivery text, but provider sending is not connected."
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={helperText()}>
                                    No provider delivery readiness details are loaded yet.
                                  </div>
                                )}
                                  </>
                                ) : null}
                              </>
                            );
                          })()
                        ) : (
                          <div style={helperText()}>
                            No sponsor-safe summary is loaded for this Governance view yet.
                          </div>
                        )}
                      </div>
                    ) : null}

                    {isAdmin && activeGovernanceTask === "real_life_record" ? (
                      <>
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="certificate-seal" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Record from real life</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Choose the one record task you are doing now.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Activity says work happened. Beneficiary outcome says what changed for a person or case.
                            </div>
                          </div>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                            gap: 8,
                          }}
                        >
                          <StableButton
                            type="button"
                            kind={
                              activeRealLifeRecordTask === "activity"
                                ? "primary"
                                : "secondary"
                            }
                            stableHeight={46}
                            debugId="community-domain-dashboard.real-life-record.activity-inline"
                            onClick={() => {
                              setActiveRealLifeRecordTask("activity");
                              setActiveActivityRecordTask("record");
                              setActiveActivityRecordStage("person");
                            }}
                          >
                            Activity
                          </StableButton>
                          <StableButton
                            type="button"
                            kind={
                              activeRealLifeRecordTask === "beneficiary_outcome"
                                ? "primary"
                                : "secondary"
                            }
                            stableHeight={46}
                            debugId="community-domain-dashboard.real-life-record.beneficiary-outcome-inline"
                            onClick={() => {
                              setActiveRealLifeRecordTask("beneficiary_outcome");
                              setActiveBeneficiaryOutcomeTask("record");
                              setActiveBeneficiaryOutcomeRecordStage("person");
                            }}
                          >
                            Beneficiary outcome
                          </StableButton>
                        </div>
                      </div>

                      {activeRealLifeRecordTask === "activity" ? (
                      <div
                        id="community-domain-activity-record-panel"
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="certificate-seal" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Activity catalogue</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Record one real activity.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Use this when an admin has a real attendance, service, support, contribution, or project record to preserve.
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {[
                            ["record", "Record"],
                            ["catalogue", "Catalogue"],
                            ["recent", "Recent"],
                          ].map(([task, label]) => (
                            <StableButton
                              key={task}
                              type="button"
                              kind={
                                activeActivityRecordTask === task
                                  ? "primary"
                                  : "secondary"
                              }
                              stableHeight={44}
                              debugId={`community-domain-dashboard.activity-task.${task}`}
                              onClick={() => {
                                const nextTask = task as ActivityRecordTaskKey;
                                setActiveActivityRecordTask(nextTask);
                                if (nextTask === "record") {
                                  setActiveActivityRecordStage("person");
                                }
                              }}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {label}
                            </StableButton>
                          ))}
                        </div>

                        {activeActivityRecordTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {ACTIVITY_RECORD_STAGE_OPTIONS.map((stage) => {
                                const selected =
                                  stage.key === activeActivityRecordStage;
                                return (
                                  <StableButton
                                    key={stage.key}
                                    type="button"
                                    kind={selected ? "primary" : "secondary"}
                                    stableHeight={42}
                                    fullWidth
                                    aria-pressed={selected}
                                    title={stage.note}
                                    debugId={`community-domain-dashboard.activity-record-stage.${stage.key}`}
                                    onClick={() =>
                                      setActiveActivityRecordStage(stage.key)
                                    }
                                    style={{
                                      justifyContent: "center",
                                      fontSize: 13,
                                      textTransform: "none",
                                    }}
                                  >
                                    {stage.label}
                                  </StableButton>
                                );
                              })}
                            </div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              {ACTIVITY_RECORD_STAGE_OPTIONS.find(
                                (stage) => stage.key === activeActivityRecordStage
                              )?.note || "Choose the capture step you need."}
                            </div>

                            {activeActivityRecordStage === "person" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={activityDraft.subject_user_id}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "subject_user_id",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Subject user id"
                                    inputMode="numeric"
                                    style={billingInputStyle()}
                                  />
                                  <select
                                    value={activityDraft.activity_type}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "activity_type",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {activityCatalogueOptions.map((item) => (
                                      <option
                                        key={cleanText(item?.activity_type)}
                                        value={cleanText(item?.activity_type)}
                                      >
                                        {cleanText(item?.label, item?.activity_type)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.activity-record-next.activity"
                                  onClick={() =>
                                    setActiveActivityRecordStage("activity")
                                  }
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: activity
                                </StableButton>
                              </div>
                            ) : null}

                            {activeActivityRecordStage === "activity" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={activityDraft.activity_label}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "activity_label",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Activity label"
                                    style={billingInputStyle()}
                                  />
                                  <input
                                    value={activityDraft.quantity}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "quantity",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Quantity"
                                    inputMode="decimal"
                                    style={billingInputStyle()}
                                  />
                                  <input
                                    value={activityDraft.measurement_unit}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "measurement_unit",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Unit, e.g. hours"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.activity-record-next.evidence"
                                  onClick={() =>
                                    setActiveActivityRecordStage("evidence")
                                  }
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: evidence
                                </StableButton>
                              </div>
                            ) : null}

                            {activeActivityRecordStage === "evidence" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  value={activityDraft.evidence_reference}
                                  disabled={busyActivityRecord}
                                  onChange={(event) =>
                                    updateActivityDraft(
                                      "evidence_reference",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Evidence reference"
                                  style={billingInputStyle()}
                                />
                                <textarea
                                  value={activityDraft.note}
                                  disabled={busyActivityRecord}
                                  onChange={(event) =>
                                    updateActivityDraft("note", event.target.value)
                                  }
                                  placeholder="Short note about what happened."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 78,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <StableButton
                                    type="button"
                                    kind="primary"
                                    stableHeight={46}
                                    disabled={busyActivityRecord}
                                    debugId="community-domain-dashboard.activity-record"
                                    onClick={() => {
                                      void submitCommunityDomainActivityRecord();
                                    }}
                                  >
                                    {busyActivityRecord
                                      ? "Recording..."
                                      : "Record activity"}
                                  </StableButton>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Creates an admin-recorded Trust Event for the subject user. It does not prove final beneficiary outcomes.
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {activeActivityRecordTask === "catalogue" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Activity catalogue</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Use one catalogue type when recording a real activity.
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {activityCatalogueOptions.map((item) => (
                                <div
                                  key={cleanText(item?.activity_type)}
                                  style={{
                                    borderRadius: 10,
                                    border: "1px solid rgba(9,27,46,0.1)",
                                    background: "#FFFFFF",
                                    padding: "10px 12px",
                                  }}
                                >
                                  <div style={sectionLabel()}>
                                    {cleanText(item?.label, item?.activity_type)}
                                  </div>
                                  <div style={{ ...helperText(), fontSize: 12 }}>
                                    {cleanText(item?.activity_type)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {activeActivityRecordTask === "recent" ? (
                          activityRows.length ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Recent records</div>
                            {activityRows.slice(0, 5).map((item) => (
                              <div
                                key={cleanText(item?.event_id)}
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 8,
                                  alignItems: "center",
                                  padding: "8px 0",
                                  borderTop: "1px solid rgba(9,27,46,0.1)",
                                }}
                              >
                                <strong style={{ color: "#091B2E", fontSize: 14 }}>
                                  {cleanText(item?.activity_label, item?.activity_type)}
                                </strong>
                                <span style={statusBadge(item?.evidence_strength)}>
                                  {compactStatus(item?.evidence_strength)}
                                </span>
                                <span style={statusBadge("subject")}>
                                  Subject {cleanText(item?.subject_user_id)}
                                </span>
                              </div>
                            ))}
                          </div>
                          ) : (
                          <div style={helperText()}>
                            No activity records are loaded for this Community Domain yet.
                          </div>
                          )
                        ) : null}
                      </div>
                      ) : null}

                      {activeRealLifeRecordTask === "beneficiary_outcome" ? (
                      <div
                        id="community-domain-beneficiary-outcome-record-panel"
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="records-folder" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Beneficiary outcomes</div>
                            <h3
                              style={{
                                margin: "3px 0 0",
                                fontSize: 20,
                                lineHeight: 1.16,
                              }}
                            >
                              Record baseline to after.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Use this when a beneficiary, member, or case has a before-and-after result worth preserving for directors or sponsors.
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {[
                            ["record", "Record"],
                            ["recent", "Recent"],
                          ].map(([task, label]) => (
                            <StableButton
                              key={task}
                              type="button"
                              kind={
                                activeBeneficiaryOutcomeTask === task
                                  ? "primary"
                                  : "secondary"
                              }
                              stableHeight={44}
                              debugId={`community-domain-dashboard.beneficiary-outcome-task.${task}`}
                              onClick={() => {
                                const nextTask = task as BeneficiaryOutcomeTaskKey;
                                setActiveBeneficiaryOutcomeTask(nextTask);
                                if (nextTask === "record") {
                                  setActiveBeneficiaryOutcomeRecordStage("person");
                                }
                              }}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {label}
                            </StableButton>
                          ))}
                        </div>

                        {activeBeneficiaryOutcomeTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 120px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.map(
                                (stage) => {
                                  const selected =
                                    stage.key === activeBeneficiaryOutcomeRecordStage;
                                  return (
                                    <StableButton
                                      key={stage.key}
                                      type="button"
                                      kind={selected ? "primary" : "secondary"}
                                      stableHeight={42}
                                      fullWidth
                                      aria-pressed={selected}
                                      title={stage.note}
                                      debugId={`community-domain-dashboard.beneficiary-outcome-record-stage.${stage.key}`}
                                      onClick={() =>
                                        setActiveBeneficiaryOutcomeRecordStage(
                                          stage.key
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {stage.label}
                                    </StableButton>
                                  );
                                }
                              )}
                            </div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.find(
                                (stage) =>
                                  stage.key === activeBeneficiaryOutcomeRecordStage
                              )?.note || "Choose the capture step you need."}
                            </div>

                            {activeBeneficiaryOutcomeRecordStage === "person" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <input
                                    value={beneficiaryOutcomeDraft.subject_user_id}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "subject_user_id",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Beneficiary user id"
                                    inputMode="numeric"
                                    style={billingInputStyle()}
                                  />
                                  <input
                                    value={beneficiaryOutcomeDraft.programme_label}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "programme_label",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Programme or case label"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.beneficiary-outcome-record-next.change"
                                  onClick={() =>
                                    setActiveBeneficiaryOutcomeRecordStage("change")
                                  }
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: change
                                </StableButton>
                              </div>
                            ) : null}

                            {activeBeneficiaryOutcomeRecordStage === "change" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <input
                                  value={beneficiaryOutcomeDraft.outcome_indicator}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "outcome_indicator",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Measured indicator"
                                  style={billingInputStyle()}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.baseline_value}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "baseline_value",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Baseline before support."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.after_value}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "after_value",
                                      event.target.value
                                    )
                                  }
                                  placeholder="After value or current follow-up result."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <textarea
                                  value={beneficiaryOutcomeDraft.support_received}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "support_received",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Support received from this Community Domain."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.beneficiary-outcome-record-next.proof"
                                  onClick={() =>
                                    setActiveBeneficiaryOutcomeRecordStage("proof")
                                  }
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 13,
                                    textTransform: "none",
                                  }}
                                >
                                  Next: proof
                                </StableButton>
                              </div>
                            ) : null}

                            {activeBeneficiaryOutcomeRecordStage === "proof" ? (
                              <div style={{ display: "grid", gap: 10 }}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <select
                                    value={beneficiaryOutcomeDraft.outcome_state}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "outcome_state",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_OUTCOME_STATE_OPTIONS.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={beneficiaryOutcomeDraft.follow_up_state}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "follow_up_state",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_FOLLOW_UP_STATE_OPTIONS.map(
                                      (item) => (
                                        <option key={item.value} value={item.value}>
                                          {item.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <select
                                    value={
                                      beneficiaryOutcomeDraft.beneficiary_confirmation
                                    }
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "beneficiary_confirmation",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_CONFIRMATION_OPTIONS.map((item) => (
                                      <option key={item.value} value={item.value}>
                                        {item.label}
                                      </option>
                                    ))}
                                  </select>
                                  <select
                                    value={beneficiaryOutcomeDraft.challenge_status}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "challenge_status",
                                        event.target.value
                                      )
                                    }
                                    style={billingInputStyle()}
                                  >
                                    {BENEFICIARY_CHALLENGE_STATUS_OPTIONS.map(
                                      (item) => (
                                        <option key={item.value} value={item.value}>
                                          {item.label}
                                        </option>
                                      )
                                    )}
                                  </select>
                                  <input
                                    value={beneficiaryOutcomeDraft.evidence_reference}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    onChange={(event) =>
                                      updateBeneficiaryOutcomeDraft(
                                        "evidence_reference",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Evidence reference"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <textarea
                                  value={beneficiaryOutcomeDraft.note}
                                  disabled={busyBeneficiaryOutcomeRecord}
                                  onChange={(event) =>
                                    updateBeneficiaryOutcomeDraft(
                                      "note",
                                      event.target.value
                                    )
                                  }
                                  placeholder="Private admin note."
                                  style={{
                                    ...billingInputStyle(),
                                    minHeight: 72,
                                    padding: 12,
                                    resize: "vertical",
                                  }}
                                />
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <StableButton
                                    type="button"
                                    kind="primary"
                                    stableHeight={46}
                                    disabled={busyBeneficiaryOutcomeRecord}
                                    debugId="community-domain-dashboard.beneficiary-outcome-record"
                                    onClick={() => {
                                      void submitCommunityDomainBeneficiaryOutcomeRecord();
                                    }}
                                  >
                                    {busyBeneficiaryOutcomeRecord
                                      ? "Recording..."
                                      : "Record outcome"}
                                  </StableButton>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Creates a before-and-after Trust Event. Sponsor reports still need aggregation and privacy review.
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </>
                        ) : null}

                        {activeBeneficiaryOutcomeTask === "recent" ? (
                          beneficiaryOutcomeRows.length ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Recent outcomes</div>
                            {beneficiaryOutcomeRows.slice(0, 5).map((item) => {
                              const outcomeEventId = cleanText(item?.event_id);
                              const latestResponse =
                                item?.latest_confirmation_response || null;
                              const latestReview =
                                item?.latest_correction_review || null;
                              const latestDeliveryPreparation =
                                item?.latest_delivery_preparation || null;
                              const latestDeliveryReceipt =
                                item?.latest_delivery_receipt || null;
                              const latestProviderSendBlockedCheck =
                                item?.latest_provider_send_blocked_check || null;
                              const latestContactConsent =
                                item?.latest_contact_consent_record || null;
                              const latestContactConsentWithdrawal =
                                item?.latest_contact_consent_withdrawal || null;
                              const contactConsentStatus =
                                item?.contact_consent_status || {};
                              const localDeliveryPack =
                                beneficiaryDeliveryPackByOutcomeId[
                                  outcomeEventId
                                ] || null;
                              const selectedDeliveryReceiptDraft =
                                beneficiaryDeliveryReceiptDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryDeliveryReceiptDraft();
                              const selectedContactConsentDraft =
                                beneficiaryContactConsentDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryContactConsentDraft();
                              const selectedContactConsentWithdrawalDraft =
                                beneficiaryContactConsentWithdrawalDraftByOutcomeId[
                                  outcomeEventId
                                ] || emptyBeneficiaryContactConsentWithdrawalDraft();
                              const selectedDeliveryReceiptCorrectionDraft =
                                beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId[
                                  outcomeEventId
                                ] ||
                                emptyBeneficiaryDeliveryReceiptCorrectionDraft();
                              const canWithdrawContactConsent =
                                Boolean(latestContactConsent?.event_id) &&
                                cleanText(contactConsentStatus?.status) ===
                                  "active_attestation";
                              const contactConsentStatusName = cleanText(
                                contactConsentStatus?.status
                              );
                              const currentProviderDeliveryReadiness =
                                item?.current_provider_delivery_readiness || {};
                              const currentProviderContactStatus = compactStatus(
                                currentProviderDeliveryReadiness
                                  ?.active_contact_consent_status ||
                                  "not evaluated"
                              );
                              const preparedDeliveryContactStatus = compactStatus(
                                latestDeliveryPreparation
                                  ?.active_contact_consent_status ||
                                  "not recorded at preparation"
                              );
                              const canRecordManualDelivery =
                                Boolean(
                                  localDeliveryPack?.delivery_event_id ||
                                    latestDeliveryPreparation?.event_id
                                ) &&
                                !latestDeliveryReceipt &&
                                contactConsentStatus?.manual_delivery_allowed !== false;
                              const manualDeliveryBlockedByConsent =
                                Boolean(
                                  localDeliveryPack?.delivery_event_id ||
                                    latestDeliveryPreparation?.event_id
                                ) &&
                                !latestDeliveryReceipt &&
                                contactConsentStatus?.manual_delivery_allowed === false;
                              const manualDeliveryBlockedText =
                                contactConsentStatusName === "not_recorded"
                                  ? "Manual delivery receipt is blocked until contact/consent is recorded. Record contact/consent before recording delivery."
                                  : "Manual delivery receipt is blocked until an active contact/consent attestation exists. Record replacement contact/consent before recording delivery.";
                              const responseChallengeStatus = cleanText(
                                latestResponse?.challenge_status
                              );
                              const needsCorrectionReview =
                                responseChallengeStatus === "challenged" ||
                                responseChallengeStatus === "under_review";
                              const selectedCorrectionDecision =
                                beneficiaryCorrectionDecisionByOutcomeId[
                                  outcomeEventId
                                ] || "mark_corrected";
                              const selectedCorrectionNote =
                                beneficiaryCorrectionNoteByOutcomeId[
                                  outcomeEventId
                                ] || "";
                              const activeOutcomeRecentPacket =
                                beneficiaryOutcomeRecentPacketById[
                                  outcomeEventId
                                ] || "summary";
                              const activeOutcomeRecentPacketOption =
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS.find(
                                  (packet) =>
                                    packet.key === activeOutcomeRecentPacket
                                ) ||
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS[0];
                              return (
                              <div
                                key={outcomeEventId}
                                style={{
                                  display: "grid",
                                  gap: 6,
                                  padding: "8px 0",
                                  borderTop: "1px solid rgba(9,27,46,0.1)",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 8,
                                    alignItems: "center",
                                  }}
                                >
                                  <strong style={{ color: "#091B2E", fontSize: 14 }}>
                                    {cleanText(
                                      item?.outcome_indicator,
                                      item?.programme_label || "Outcome"
                                    )}
                                  </strong>
                                  <span style={statusBadge(item?.outcome_state)}>
                                    {compactStatus(item?.outcome_state)}
                                  </span>
                                  <span style={statusBadge(item?.beneficiary_confirmation)}>
                                    {compactStatus(item?.beneficiary_confirmation)}
                                  </span>
                                  <span style={statusBadge("subject")}>
                                    Subject {cleanText(item?.subject_user_id)}
                                  </span>
                                  {latestResponse ? (
                                    <span
                                      style={statusBadge(
                                        latestResponse?.challenge_status ||
                                          latestResponse?.response_type
                                      )}
                                    >
                                      Response:{" "}
                                      {compactStatus(latestResponse?.response_type)}
                                    </span>
                                  ) : null}
                                  {latestReview ? (
                                    <span
                                      style={statusBadge(
                                        latestReview?.challenge_status_after ||
                                          latestReview?.decision
                                      )}
                                    >
                                      Review: {compactStatus(latestReview?.decision)}
                                    </span>
                                  ) : null}
                                  {latestDeliveryReceipt ? (
                                    <span
                                      style={statusBadge(
                                        latestDeliveryReceipt?.delivery_status
                                      )}
                                    >
                                      Delivery:{" "}
                                      {compactStatus(
                                        latestDeliveryReceipt?.delivery_status
                                      )}
                                    </span>
                                  ) : null}
                                  {latestContactConsent ? (
                                    <span
                                      style={statusBadge(
                                        latestContactConsent?.consent_basis ||
                                          "contact_consent"
                                      )}
                                    >
                                      Contact:{" "}
                                      {compactStatus(
                                        latestContactConsent?.consent_basis
                                      )}
                                    </span>
                                  ) : null}
                                  {latestContactConsentWithdrawal ? (
                                    <span
                                      style={statusBadge(
                                        latestContactConsentWithdrawal?.withdrawal_reason ||
                                          "contact_consent_withdrawn"
                                      )}
                                    >
                                      Consent withdrawn:{" "}
                                      {compactStatus(
                                        latestContactConsentWithdrawal?.withdrawal_reason
                                      )}
                                    </span>
                                  ) : null}
                                </div>
                                <div style={{ ...helperText(), fontSize: 13 }}>
                                  {cleanText(item?.baseline_value, "Baseline not shown")}
                                  {" -> "}
                                  {cleanText(item?.after_value, "After value not shown")}
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 112px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS.map(
                                    (packet) => {
                                      const selected =
                                        packet.key === activeOutcomeRecentPacket;
                                      return (
                                        <StableButton
                                          key={packet.key}
                                          type="button"
                                          kind={selected ? "primary" : "secondary"}
                                          stableHeight={38}
                                          fullWidth
                                          aria-pressed={selected}
                                          title={packet.note}
                                          debugId={`community-domain-dashboard.beneficiary-outcome-recent-packet.${packet.key}`}
                                          onClick={() => {
                                            setBeneficiaryOutcomeRecentPacketById(
                                              (current) => ({
                                                ...current,
                                                [outcomeEventId]: packet.key,
                                              })
                                            );
                                          }}
                                          style={{
                                            justifyContent: "center",
                                            fontSize: 12,
                                            textTransform: "none",
                                          }}
                                        >
                                          {packet.label}
                                        </StableButton>
                                      );
                                    }
                                  )}
                                </div>
                                <div style={{ ...helperText(), fontSize: 13 }}>
                                  {activeOutcomeRecentPacketOption.note}
                                </div>
                                {activeOutcomeRecentPacket === "summary" ? (
                                  <>
                                    {latestResponse?.correction_note ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Correction note:{" "}
                                        {cleanText(latestResponse?.correction_note)}
                                      </div>
                                    ) : null}
                                    {latestReview ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Latest review marked this as{" "}
                                        {compactStatus(
                                          latestReview?.challenge_status_after
                                        )}
                                        . The original outcome was not rewritten.
                                      </div>
                                    ) : null}
                                    {latestDeliveryReceipt ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Manual delivery receipt:{" "}
                                        {compactStatus(
                                          latestDeliveryReceipt?.channel
                                        )}{" "}
                                        marked as{" "}
                                        {compactStatus(
                                          latestDeliveryReceipt?.delivery_status
                                        )}
                                        {latestDeliveryReceipt?.consent_basis ? (
                                          <>
                                            {" "}
                                            with consent basis{" "}
                                            {compactStatus(
                                              latestDeliveryReceipt?.consent_basis
                                            )}
                                          </>
                                        ) : null}
                                        {latestDeliveryReceipt?.contact_consent_event_id ? (
                                          <>
                                            {" "}
                                            backed by contact/consent record{" "}
                                            {cleanText(
                                              latestDeliveryReceipt?.contact_consent_event_id
                                            )}
                                          </>
                                        ) : null}
                                        . GSN did not send the external message.
                                      </div>
                                    ) : null}
                                    {latestDeliveryReceipt?.latest_correction ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Receipt correction:{" "}
                                        {compactStatus(
                                          latestDeliveryReceipt?.latest_correction
                                            ?.decision
                                        )}{" "}
                                        marked this receipt as{" "}
                                        {compactStatus(
                                          latestDeliveryReceipt
                                            ?.receipt_correction_status
                                        )}
                                        . The original manual receipt remains in the
                                        audit trail.
                                      </div>
                                    ) : null}
                                    {latestProviderSendBlockedCheck ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Provider send blocked:{" "}
                                        {compactStatus(
                                          latestProviderSendBlockedCheck?.blocked_reason ||
                                            "provider_delivery_not_connected"
                                        )}
                                        . GSN recorded this readiness check only; no
                                        provider job, no send attempt, and no external
                                        message was created.
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" &&
                                needsCorrectionReview ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedCorrectionDecision}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryCorrectionDecision(
                                          outcomeEventId,
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                    >
                                      {BENEFICIARY_CORRECTION_DECISION_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedCorrectionNote}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryCorrectionNote(
                                          outcomeEventId,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Review note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeCorrectionReviewId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-correction-review"
                                      onClick={() => {
                                        void submitBeneficiaryOutcomeCorrectionReview(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeCorrectionReviewId ===
                                      outcomeEventId
                                        ? "Recording review..."
                                        : "Review challenge"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" ? (
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    stableHeight={38}
                                    disabled={
                                      busyOutcomeConfirmationLinkId ===
                                      outcomeEventId
                                    }
                                    debugId="community-domain-dashboard.beneficiary-outcome-confirmation-link"
                                    onClick={() => {
                                      void createBeneficiaryOutcomeConfirmationLink(
                                        outcomeEventId
                                      );
                                    }}
                                    style={{
                                      justifyContent: "center",
                                      fontSize: 13,
                                      textTransform: "none",
                                    }}
                                  >
                                    {busyOutcomeConfirmationLinkId ===
                                    outcomeEventId
                                      ? "Creating link..."
                                      : "Create confirmation link"}
                                  </StableButton>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" && isAdmin ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedContactConsentDraft.channel}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "channel",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent channel"
                                    >
                                      {BENEFICIARY_DELIVERY_CHANNEL_OPTIONS.filter(
                                        (option) =>
                                          option.value === "whatsapp" ||
                                          option.value === "sms" ||
                                          option.value === "email"
                                      ).map((option) => (
                                        <option
                                          key={option.value}
                                          value={option.value}
                                        >
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                    <select
                                      value={
                                        selectedContactConsentDraft.destination_reference_status
                                      }
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "destination_reference_status",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact reference status"
                                    >
                                      {BENEFICIARY_CONTACT_REFERENCE_STATUS_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={
                                        selectedContactConsentDraft.destination_reference_label
                                      }
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "destination_reference_label",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Reference label, not phone/email"
                                      style={billingInputStyle()}
                                    />
                                    <select
                                      value={selectedContactConsentDraft.consent_basis}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "consent_basis",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent basis"
                                    >
                                      {BENEFICIARY_DELIVERY_CONSENT_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedContactConsentDraft.note}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Consent note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeContactConsentId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-consent"
                                      onClick={() => {
                                        void recordBeneficiaryOutcomeContactConsent(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeContactConsentId ===
                                      outcomeEventId
                                        ? "Recording consent..."
                                        : "Record contact/consent"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin &&
                                canWithdrawContactConsent ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={
                                        selectedContactConsentWithdrawalDraft.withdrawal_reason
                                      }
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentWithdrawalDraft(
                                          outcomeEventId,
                                          "withdrawal_reason",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Contact consent withdrawal reason"
                                    >
                                      {BENEFICIARY_CONTACT_CONSENT_WITHDRAWAL_REASON_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedContactConsentWithdrawalDraft.note}
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryContactConsentWithdrawalDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Withdrawal note"
                                      style={billingInputStyle()}
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeContactConsentWithdrawalId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-consent-withdrawal"
                                      onClick={() => {
                                        void withdrawBeneficiaryOutcomeContactConsent(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeContactConsentWithdrawalId ===
                                      outcomeEventId
                                        ? "Recording withdrawal..."
                                        : "Record consent withdrawal"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "delivery" &&
                                manualDeliveryBlockedByConsent ? (
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    {manualDeliveryBlockedText}
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "delivery" &&
                                latestDeliveryPreparation ? (
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Current provider readiness contact/consent:{" "}
                                    <strong>{currentProviderContactStatus}</strong>.
                                    Prepared delivery recorded contact/consent as{" "}
                                    <strong>{preparedDeliveryContactStatus}</strong>.
                                    GSN still has not sent WhatsApp, SMS, or email.
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "delivery" &&
                                !manualDeliveryBlockedByConsent &&
                                !latestDeliveryPreparation &&
                                !localDeliveryPack ? (
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    No delivery pack is prepared for this outcome yet.
                                    Use Confirm to create the private confirmation
                                    link and delivery text before delivery checks.
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "delivery" &&
                                localDeliveryPack &&
                                !latestDeliveryPreparation ? (
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    A delivery pack is prepared in this session.
                                    GSN still has not sent WhatsApp, SMS, or email.
                                    Open Receipt after manual delivery happens.
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                canRecordManualDelivery ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedDeliveryReceiptDraft.channel}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "channel",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery channel"
                                    >
                                      {BENEFICIARY_DELIVERY_CHANNEL_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <select
                                      value={
                                        selectedDeliveryReceiptDraft.delivery_status
                                      }
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "delivery_status",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery status"
                                    >
                                      {BENEFICIARY_DELIVERY_STATUS_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedDeliveryReceiptDraft.note}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "note",
                                          event.target.value
                                        )
                                      }
                                      placeholder="Delivery note"
                                      style={billingInputStyle()}
                                    />
                                    <select
                                      value={
                                        selectedDeliveryReceiptDraft.consent_basis
                                      }
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) =>
                                        updateBeneficiaryDeliveryReceiptDraft(
                                          outcomeEventId,
                                          "consent_basis",
                                          event.target.value
                                        )
                                      }
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery consent basis"
                                    >
                                      {BENEFICIARY_DELIVERY_CONSENT_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeProviderSendId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-provider-send-check"
                                      onClick={() => {
                                        void checkBeneficiaryOutcomeProviderSend(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeProviderSendId ===
                                      outcomeEventId
                                        ? "Checking provider..."
                                        : "Check provider send"}
                                    </StableButton>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeDeliveryReceiptId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-receipt"
                                      onClick={() => {
                                        void recordBeneficiaryOutcomeDeliveryReceipt(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeDeliveryReceiptId ===
                                      outcomeEventId
                                        ? "Recording delivery..."
                                        : "Record manual receipt"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                !canRecordManualDelivery &&
                                !latestDeliveryReceipt ? (
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Manual receipt is not ready yet. Prepare a
                                    confirmation link and keep active contact/consent
                                    evidence before recording delivery.
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                latestDeliveryReceipt ? (
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "repeat(auto-fit, minmax(min(100%, 170px), 1fr))",
                                      gap: 8,
                                      alignItems: "center",
                                    }}
                                  >
                                    <select
                                      value={selectedDeliveryReceiptCorrectionDraft.decision}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) => {
                                        const nextDecision = event.target.value;
                                        setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]: {
                                              ...selectedDeliveryReceiptCorrectionDraft,
                                              decision: nextDecision,
                                            },
                                          })
                                        );
                                      }}
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery receipt correction decision"
                                    >
                                      {BENEFICIARY_DELIVERY_RECEIPT_CORRECTION_OPTIONS.map(
                                        (option) => (
                                          <option
                                            key={option.value}
                                            value={option.value}
                                          >
                                            {option.label}
                                          </option>
                                        )
                                      )}
                                    </select>
                                    <input
                                      value={selectedDeliveryReceiptCorrectionDraft.note}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      onChange={(event) => {
                                        const nextNote = event.target.value;
                                        setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]: {
                                              ...selectedDeliveryReceiptCorrectionDraft,
                                              note: nextNote,
                                            },
                                          })
                                        );
                                      }}
                                      style={billingInputStyle()}
                                      aria-label="Manual delivery receipt correction note"
                                      placeholder="Correction note"
                                    />
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={38}
                                      disabled={
                                        busyOutcomeDeliveryReceiptCorrectionId ===
                                        outcomeEventId
                                      }
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-receipt-correction"
                                      onClick={() => {
                                        void correctBeneficiaryOutcomeDeliveryReceipt(
                                          item
                                        );
                                      }}
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {busyOutcomeDeliveryReceiptCorrectionId ===
                                      outcomeEventId
                                        ? "Recording correction..."
                                        : "Record receipt correction"}
                                    </StableButton>
                                  </div>
                                ) : null}
                              </div>
                              );
                            })}
                          </div>
                          ) : (
                          <div style={helperText()}>
                            No beneficiary outcome records are loaded for this Community Domain yet.
                          </div>
                          )
                        ) : null}
                      </div>
                      ) : null}
                      </>
                    ) : null}

                    {isAdmin && activeGovernanceTask === "access_requests" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...softCard(), display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Access requests</div>
                            <div style={{ ...helperText(), marginTop: 2 }}>
                              Loading access request controls...
                            </div>
                          </div>
                        }
                      >
                        <CommunityDomainAccessRequestsPanel
                          embedded
                          membershipAccessRequests={membershipAccessRequests}
                          loadingQueue={loadingQueue}
                          busyReviewId={busyReviewId}
                          onApproveOnly={(review) => approveAccessRequest(review, false)}
                          onRequestChanges={requestChangesForAccessRequest}
                          onDecline={declineAccessRequest}
                          onApproveAndApply={(review) => approveAccessRequest(review, true)}
                          onApplyApproved={applyApprovedAccessRequest}
                          onRefresh={refreshReviewerQueue}
                          onOpenInvite={openSetupFirstCircle}
                        />
                      </Suspense>
                    ) : null}
                  </>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "members" ? (
                  <>
                    <div
                      style={{
                        ...softCard(),
                        display: "grid",
                        gap: 10,
                      }}
                    >
                      <div style={sectionLabel()}>Members focus</div>
                      <div style={helperText()}>
                        Choose the member stage first. Current view:{" "}
                        <strong>{activeMemberDetailGroupOption.label}</strong>{" "}
                        / <strong>{selectedMemberDetail.label}</strong>.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {MEMBER_DETAIL_GROUP_OPTIONS.map((group) => {
                          const selected = group.key === activeMemberDetailGroup;
                          return (
                            <StableButton
                              key={group.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={46}
                              fullWidth
                              aria-pressed={selected}
                              title={group.note}
                              debugId={`community-domain-dashboard.member-group.${group.key}`}
                              onClick={() => {
                                setActiveMemberDetail(group.defaultDetail);
                                if (group.defaultDetail === "roster") {
                                  setActiveMemberRosterTask("summary");
                                }
                              }}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {group.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {activeMemberDetailGroupOption.note}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 148px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {activeMemberGroupDetails.map((option) => {
                          const selected = option.key === activeMemberDetail;
                          return (
                            <StableButton
                              key={option.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={48}
                              fullWidth
                              aria-pressed={selected}
                              title={option.note}
                              debugId={`community-domain-dashboard.member-detail.${option.key}`}
                              onClick={() => {
                                setActiveMemberDetail(option.key);
                                if (option.key === "roster") {
                                  setActiveMemberRosterTask("summary");
                                }
                              }}
                              style={{
                                justifyContent: "center",
                                fontSize: 13,
                                textTransform: "none",
                              }}
                            >
                              {option.label}
                            </StableButton>
                          );
                        })}
                      </div>
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {selectedMemberDetail.note}
                      </div>
                    </div>

                    {activeMemberDetail === "readiness" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading member readiness panels...
                          </div>
                        }
                      >
                        <CommunityDomainMemberReadinessPanels
                          placementSummary={placementSummary}
                          counts={counts}
                          memberVerificationMap={memberVerificationMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeMemberDetail === "placement" ? (
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading member placement view...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="memberParticipation"
                          nodeParticipationMap={nodeParticipationMap}
                        />
                      </Suspense>
                    ) : null}

                    {activeMemberDetail === "roster" ? (
                      <div
                        style={{
                          ...softCard(),
                          display: "grid",
                          gap: 12,
                        }}
                      >
                        <div style={iconHeaderStyle()}>
                          <div style={iconFrame(44)}>
                            <GsnRealisticIcon name="join-person-plus" size={34} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={sectionLabel()}>Roster control</div>
                            <h3 style={{ margin: "3px 0 0", fontSize: 20, lineHeight: 1.16 }}>
                              Member status and public proof.
                            </h3>
                            <div style={{ ...helperText(), marginTop: 6 }}>
                              Deactivate members who no longer belong. Their record remains in history, but public active-member verification stops passing.
                            </div>
                          </div>
                        </div>

                        {!isAdmin ? (
                          <div style={{ ...helperText(), marginTop: 2 }}>
                            Only a Community Domain owner or domain admin can change roster status.
                          </div>
                        ) : null}

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                            gap: 8,
                          }}
                        >
                          {MEMBER_ROSTER_TASK_OPTIONS.map((task) => {
                            const selected = task.key === activeMemberRosterTask;
                            return (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={selected ? "primary" : "secondary"}
                                stableHeight={44}
                                fullWidth
                                aria-pressed={selected}
                                title={task.note}
                                debugId={`community-domain-dashboard.member-roster.${task.key}`}
                                onClick={() => setActiveMemberRosterTask(task.key)}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {task.label}
                              </StableButton>
                            );
                          })}
                        </div>
                        <div style={{ ...helperText(), fontSize: 13 }}>
                          {MEMBER_ROSTER_TASK_OPTIONS.find(
                            (task) => task.key === activeMemberRosterTask
                          )?.note || "Choose the roster packet you need."}
                        </div>

                        {activeMemberRosterTask === "summary" ? (
                          <div style={{ display: "grid", gap: 10 }}>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {memberRosterSummaryRows.map(([label, value]) => (
                                <div
                                  key={label}
                                  style={{
                                    border: "1px solid rgba(9,27,46,0.1)",
                                    borderRadius: 16,
                                    background: "rgba(255,255,255,0.66)",
                                    padding: "10px 12px",
                                    minHeight: 68,
                                    display: "grid",
                                    alignContent: "center",
                                    gap: 3,
                                  }}
                                >
                                  <span style={{ ...helperText(), fontSize: 12 }}>
                                    {label}
                                  </span>
                                  <strong style={{ color: "#091B2E", fontSize: 22 }}>
                                    {value}
                                  </strong>
                                </div>
                              ))}
                            </div>
                            <div style={helperText()}>
                              Active members can pass public active-member proof for this domain.
                              Inactive rows stay in history but should not pass that public check.
                            </div>
                          </div>
                        ) : null}

                        {activeMemberRosterTask === "members" ? (
                          <div style={{ display: "grid", gap: 8 }}>
                            {domainMemberRows.length ? (
                              domainMemberRows.map((row) => {
                                const userId = cleanText(row?.user_id);
                                const rowKey = cleanText(row?.id, userId);
                                const statusText = cleanText(row?.status, "inactive").toLowerCase();
                                const activeMember = statusText === "active";
                                const busy = busyMemberStatusId === `${cleanText(domain?.id || communityDomainId)}:${userId}`;
                                const roleText = compactStatus(row?.role || "member");
                                const label =
                                  cleanText(row?.user_display_name) ||
                                  cleanText(row?.user_email) ||
                                  (userId ? `Member ${userId}` : "Domain member");
                                return (
                                  <div
                                    key={rowKey}
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns:
                                        "minmax(0, 1fr) minmax(min(100%, 136px), auto)",
                                      gap: 10,
                                      alignItems: "center",
                                      padding: "10px 0",
                                      borderTop: "1px solid rgba(9,27,46,0.1)",
                                    }}
                                  >
                                    <div style={{ minWidth: 0 }}>
                                      <div
                                        style={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: 8,
                                          alignItems: "center",
                                        }}
                                      >
                                        <strong
                                          style={{
                                            color: "#091B2E",
                                            fontSize: 15,
                                            overflowWrap: "anywhere",
                                          }}
                                        >
                                          {label}
                                        </strong>
                                        <span
                                          style={{
                                            borderRadius: 999,
                                            padding: "4px 8px",
                                            fontSize: 12,
                                            fontWeight: 900,
                                            background: activeMember ? "#ECFDF3" : "#FFF7E6",
                                            color: activeMember ? "#166534" : "#92400E",
                                            border: `1px solid ${
                                              activeMember
                                                ? "rgba(46,155,98,0.22)"
                                                : "rgba(245,158,11,0.28)"
                                            }`,
                                          }}
                                        >
                                          {compactStatus(statusText)}
                                        </span>
                                      </div>
                                      <div style={{ ...helperText(), fontSize: 13, marginTop: 4 }}>
                                        {roleText}
                                        {cleanText(row?.title) ? ` - ${cleanText(row.title)}` : ""}
                                      </div>
                                    </div>
                                    {isAdmin ? (
                                      <StableButton
                                        type="button"
                                        kind={activeMember ? "secondary" : "primary"}
                                        stableHeight={44}
                                        disabled={busy}
                                        debugId={`community-domain-dashboard.member-status.${rowKey}`}
                                        onClick={() =>
                                          void changeDomainMemberStatus(
                                            row,
                                            activeMember ? "inactive" : "active"
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {busy
                                          ? "Saving"
                                          : activeMember
                                            ? "Deactivate"
                                            : "Reactivate"}
                                      </StableButton>
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              <div style={helperText()}>
                                No Community Domain members were returned for this roster view.
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </>
                ) : null}

              </div>
            </div>
          </section>
          ) : null}

          {showOtherDomainToolsEntry ? (
            <section style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Other domain tools</div>
                <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.12 }}>
                  {domainOperational ? "More operating tools." : "More tools."}
                </h2>
                <div style={helperText()}>
                  {domainOperational
                    ? "Open only when you need another operating area, notices, access, or deeper checks."
                    : "Open only when you need notices, access, or deeper checks."}
                </div>
                <StableButton
                  type="button"
                  kind={showAdvancedTools ? "secondary" : "primary"}
                  fullWidth
                  debugId="community-domain-dashboard.advanced-tools-toggle"
                  onClick={() =>
                    setShowAdvancedTools((current) => {
                      const next = !current;
                      if (next) {
                        focusWorkSurfaceAfterOpenRef.current = true;
                        setSetupWorkspaceOpen(false);
                        setOperatingAreaPickerOpen(false);
                        setSetupJourneyMode("setup");
                        setActiveLane(cleanText(otherToolsLaneKey, primaryActionLaneKey));
                      }
                      return next;
                    })
                  }
                >
                  {showAdvancedTools
                    ? "Hide areas"
                    : domainOperational
                      ? "Open operating areas"
                      : "Open service areas"}
                </StableButton>
              </div>
            </section>
          ) : null}

        </>
      ) : null}
    </main>
  );
}
