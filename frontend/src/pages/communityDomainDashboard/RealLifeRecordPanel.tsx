// Lazy UI shell receives parent-owned workflow state through one data prop; parent and audits keep behavioral coverage.
import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { GsnRealisticIcon } from "../../components/GsnRealisticIcon";
import { StableButton } from "../../components/StableButton";

type BeneficiaryOutcomeConfirmationActionKey = "link" | "review";
type BeneficiaryOutcomeContactActionKey = "record" | "withdraw";

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
type GovernanceTaskKey =
  | "readiness"
  | "director_summary"
  | "sponsor_summary"
  | "real_life_record"
  | "access_requests";

type StateSetter<T> = React.Dispatch<React.SetStateAction<T>>;
type AsyncAction = () => void | Promise<void>;
type RowAction<Row> = (item: Row) => void | Promise<void>;
type PanelStyleFactory = (onDark?: boolean) => React.CSSProperties;
type StatusStyleFactory = (status?: string | number | null) => React.CSSProperties;
type UnknownRecord = Record<string, unknown>;
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

const ACTIVITY_RECORD_TASK_OPTIONS: Array<{
  key: ActivityRecordTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "record",
    label: "Record",
    note: "Capture one real activity in staged steps.",
  },
  {
    key: "catalogue",
    label: "Catalogue",
    note: "Review valid activity types before recording.",
  },
  {
    key: "recent",
    label: "Recent",
    note: "Review the latest activity records only when needed.",
  },
];

const CHURCH_ACTIVITY_PRESET_PACK: Array<{
  key: string;
  label: string;
  activityType: string;
  activityLabel: string;
  unit: string;
  note: string;
}> = [
  {
    key: "programme_attendance",
    label: "Programme attendance",
    activityType: "church_programme_attendance",
    activityLabel: "Church programme attendance",
    unit: "attendance",
    note: "Record that attendance happened for a service, programme, fellowship, class, or ministry meeting. Keep spiritual or counselling details outside GSN.",
  },
  {
    key: "pastoral_follow_up",
    label: "Pastoral follow-up",
    activityType: "pastoral_follow_up",
    activityLabel: "Pastoral or welfare follow-up",
    unit: "follow-up",
    note: "Record that an appointed pastor, minister, or welfare officer followed up. GSN preserves the workflow memory; the church keeps pastoral judgement.",
  },
  {
    key: "member_belonging",
    label: "Member belonging",
    activityType: "member_belonging_check",
    activityLabel: "Member belonging check",
    unit: "check",
    note: "Record a belonging, department, fellowship, or participation check without exposing private member history publicly.",
  },
  {
    key: "department_service",
    label: "Department service",
    activityType: "department_service",
    activityLabel: "Department or ministry service",
    unit: "duty",
    note: "Record service-team duty for ministry order, handover, and department coordination.",
  },
  {
    key: "contribution_memory",
    label: "Contribution memory",
    activityType: "contribution_memory",
    activityLabel: "Contribution memory",
    unit: "record",
    note: "Record church-held contribution memory only. This is not GSN payment confirmation, settlement proof, or impact proof.",
  },
];

const SCHOOL_ACTIVITY_PRESET_PACK: Array<{
  key: string;
  label: string;
  activityType: string;
  activityLabel: string;
  unit: string;
  note: string;
}> = [
  {
    key: "parent_notice_follow_up",
    label: "Parent notice follow-up",
    activityType: "school_notice_ack_follow_up",
    activityLabel: "Parent notice follow-up",
    unit: "follow-up",
    note: "Record that school staff followed up a parent or guardian about an official notice, circular, meeting, or fee reminder. WhatsApp may carry the prompt; GSN keeps the school record.",
  },
  {
    key: "school_fee_follow_up",
    label: "School fee follow-up",
    activityType: "school_fee_follow_up",
    activityLabel: "School fee follow-up",
    unit: "fee status",
    note: "Record a bursar or admin fee follow-up status. This is not bank confirmation until finance review, receipt, or school bank evidence supports it.",
  },
  {
    key: "student_arrival",
    label: "Student arrival",
    activityType: "student_arrival_record",
    activityLabel: "Student arrival record",
    unit: "arrival",
    note: "Record that authorized school staff marked a student as arrived. The student does not need a phone; the staff member is the accountable actor.",
  },
  {
    key: "student_dismissal",
    label: "Student dismissal",
    activityType: "student_dismissal_record",
    activityLabel: "Student dismissal record",
    unit: "dismissal",
    note: "Record that authorized school staff marked a student as dismissed or approved to leave. Parent notification remains a bridge/log unless a delivery provider is connected.",
  },
  {
    key: "school_shop_supply",
    label: "School shop / supplies",
    activityType: "school_shop_supply_notice",
    activityLabel: "School shop or supply notice",
    unit: "notice",
    note: "Record a school shop, books, uniforms, forms, or approved-vendor notice without turning official school communication into open chat.",
  },
];
const CHURCH_ATTENDANCE_FOLLOW_UP_ROUTE_STEPS = ["Call", "Text", "WhatsApp", "Visit", "Escalate"];
const CHURCH_ATTENDANCE_FOLLOW_UP_OUTCOMES = [
  "Reached",
  "No answer",
  "Message left",
  "Visit planned",
  "Escalated",
];
const CHURCH_FOLLOW_UP_ROUTE_NOTE_PREFIX = "Follow-up route:";
const CHURCH_FOLLOW_UP_OUTCOME_NOTE_PREFIX = "Follow-up outcome:";
const CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX = "Follow-up owner:";
const CHURCH_FOLLOW_UP_NEXT_DATE_NOTE_PREFIX = "Next follow-up date:";
const BENEFICIARY_OUTCOME_TASK_OPTIONS: Array<{
  key: BeneficiaryOutcomeTaskKey;
  label: string;
  note: string;
}> = [
  {
    key: "record",
    label: "Record",
    note: "Capture one before-and-after beneficiary outcome.",
  },
  {
    key: "recent",
    label: "Recent",
    note: "Review recent outcome records one view at a time.",
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

type CommunityDomainActivityDraft = {
  subject_user_id: string;
  community_node_id: string;
  activity_type: string;
  activity_label: string;
  quantity: string;
  measurement_unit: string;
  note: string;
  evidence_reference: string;
  follow_up_due_at: string;
};

type CommunityDomainAttendanceSessionDraft = {
  programme_label: string;
  method: "qr" | "bluetooth_proximity" | "staff_scan";
  window_minutes: string;
  note: string;
};

type CommunityDomainResponseChannelDraft = {
  title: string;
  source_kind: "meeting" | "church_service" | "programme" | "workshop" | "announcement" | "demand_box" | "other";
  prompt: string;
  related_label: string;
  window_days: string;
  allow_private_follow_up: boolean;
  note: string;
};

type ResponseChannelRow = {
  event_id?: string | number | null;
  title?: string | number | null;
  public_path?: string | number | null;
  response_count?: string | number | null;
  by_type?: Record<string, number>;
  private_follow_up_count?: string | number | null;
  active?: boolean | null;
  boundary?: string | number | null;
  [key: string]: unknown;
};

type AttendanceFollowUpSnapshot = {
  expected_member_count?: string | number | null;
  present_member_count?: string | number | null;
  follow_up_needed_count?: string | number | null;
  follow_up_candidate_user_ids?: Array<string | number> | null;
  follow_up_status?: string | number | null;
  next_step?: string | number | null;
  boundary?: string | number | null;
  [key: string]: unknown;
};
type AttendanceSessionRow = {
  event_id?: string | number | null;
  programme_label?: string | number | null;
  public_path?: string | number | null;
  checkin_count?: string | number | null;
  attendance_method?: string | number | null;
  attendance_expires_at?: string | number | null;
  active?: boolean | null;
  follow_up_snapshot?: AttendanceFollowUpSnapshot | null;
  boundary?: string | number | null;
  [key: string]: unknown;
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

type ActivityCatalogueOption = {
  activity_type?: string;
  label?: string;
  measurement_unit?: string | number | null;
  evidence_strength?: string | number | null;
  [key: string]: unknown;
};

type ActivityRecordRow = ActivityCatalogueOption & {
  event_id?: string | number | null;
  activity_label?: string;
  quantity?: string | number | null;
  created_at?: string | number | null;
  subject_user_id?: string | number | null;
  note?: string | number | null;
  evidence_reference?: string | number | null;
  follow_up_due_at?: string | number | null;
  follow_up_due_date?: string | number | null;
  follow_up_queue_status?: string | number | null;
};

type ActivityAttentionSummary = {
  overdue: number;
  dueToday: number;
  queueTotal: number;
  rowTotal: number;
  scanLimit: number;
  scannedActivityTotal: number;
  scanWindowExhausted: boolean;
  resolvedReferenceTotal: number;
  resolvedReferenceScanScope: string;
  resolvedReferenceScannedActivityTotal: number;
  resolvedReferenceScanWindowExhausted: boolean;
};
type BeneficiaryOutcomeRelatedRecord = {
  event_id?: string | number | null;
  channel?: string | number | null;
  challenge_status?: string | number | null;
  challenge_status_after?: string | number | null;
  consent_basis?: string | number | null;
  contact_consent_event_id?: string | number | null;
  correction_note?: string | number | null;
  decision?: string | number | null;
  delivery_event_id?: string | number | null;
  delivery_status?: string | number | null;
  latest_correction?: BeneficiaryOutcomeRelatedRecord | null;
  receipt_correction_status?: string | number | null;
  response_type?: string | number | null;
  blocked_reason?: string | number | null;
  active_contact_consent_status?: string | number | null;
  manual_delivery_allowed?: boolean | null;
  status?: string | number | null;
  withdrawal_reason?: string | number | null;
  [key: string]: unknown;
};

type BeneficiaryOutcomeRow = {
  event_id?: string | number | null;
  latest_confirmation_response?: BeneficiaryOutcomeRelatedRecord | null;
  latest_correction_review?: BeneficiaryOutcomeRelatedRecord | null;
  latest_delivery_preparation?: BeneficiaryOutcomeRelatedRecord | null;
  latest_delivery_receipt?: BeneficiaryOutcomeRelatedRecord | null;
  latest_provider_send_blocked_check?: BeneficiaryOutcomeRelatedRecord | null;
  latest_contact_consent_record?: BeneficiaryOutcomeRelatedRecord | null;
  latest_contact_consent_withdrawal?: BeneficiaryOutcomeRelatedRecord | null;
  contact_consent_status?: BeneficiaryOutcomeRelatedRecord | null;
  current_provider_delivery_readiness?: BeneficiaryOutcomeRelatedRecord | null;
  privacy_position?: string | number | null;
  privacy_status?: string | number | null;
  visibility?: string | number | null;
  challenge_status?: string | number | null;
  currentness_label?: string | number | null;
  review_currentness_label?: string | number | null;
  follow_up_due_at?: string | number | null;
  outcome_indicator?: string;
  programme_label?: string;
  outcome_state?: string | number | null;
  beneficiary_confirmation?: string | number | null;
  baseline_value?: string | number | null;
  after_value?: string | number | null;
  [key: string]: unknown;
};

export type RealLifeRecordPanelData = {
  activeActivityRecordStage: ActivityRecordStageKey;
  activeActivityRecordTask: ActivityRecordTaskKey;
  activeBeneficiaryOutcomeRecordStage: BeneficiaryOutcomeRecordStageKey;
  activeBeneficiaryOutcomeTask: BeneficiaryOutcomeTaskKey;
  activeGovernanceTask: GovernanceTaskKey;
  activeRealLifeRecordTask: RealLifeRecordTask | null;
  activityCatalogueOptions: ActivityCatalogueOption[];
  activityDraft: CommunityDomainActivityDraft;
  activityRecordStageChooserOpen: boolean;
  activityRecordTaskChooserOpen: boolean;
  activityRows: ActivityRecordRow[];
  activityAttentionRows: ActivityRecordRow[];
  activityAttentionSummary: ActivityAttentionSummary | null;
  attendanceSessionCopied: boolean;
  attendanceSessionDraft: CommunityDomainAttendanceSessionDraft;
  attendanceSessionRows: AttendanceSessionRow[];
  domainMemberRows: UnknownRecord[];
  domainNotices: UnknownRecord[];
  domainNoticesLoading: boolean;
  schoolFeeExpectedPaymentRows: UnknownRecord[];
  schoolFeeExpectedPaymentSummary: UnknownRecord | null;
  schoolGuardianContactRows: UnknownRecord[];
  schoolGuardianContactSummary: UnknownRecord | null;
  responseChannelCopied: boolean;
  responseChannelDraft: CommunityDomainResponseChannelDraft;
  responseChannelRows: ResponseChannelRow[];
  beneficiaryContactConsentDraftByOutcomeId: Record<string, BeneficiaryContactConsentDraft>;
  beneficiaryContactConsentWithdrawalDraftByOutcomeId: Record<string, BeneficiaryContactConsentWithdrawalDraft>;
  beneficiaryCorrectionDecisionByOutcomeId: Record<string, string>;
  beneficiaryCorrectionNoteByOutcomeId: Record<string, string>;
  beneficiaryDeliveryPackByOutcomeId: Record<string, BeneficiaryOutcomeRelatedRecord>;
  beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId: Record<string, BeneficiaryDeliveryReceiptCorrectionDraft>;
  beneficiaryDeliveryReceiptDraftByOutcomeId: Record<string, BeneficiaryDeliveryReceiptDraft>;
  beneficiaryOutcomeConfirmationActionById: Record<string, BeneficiaryOutcomeConfirmationActionKey>;
  beneficiaryOutcomeConfirmationActionChooserOpenById: Record<string, boolean>;
  beneficiaryOutcomeConfirmationActionOpenById: Record<string, boolean>;
  beneficiaryOutcomeContactActionById: Record<string, BeneficiaryOutcomeContactActionKey>;
  beneficiaryOutcomeContactActionChooserOpenById: Record<string, boolean>;
  beneficiaryOutcomeContactActionOpenById: Record<string, boolean>;
  beneficiaryOutcomeDeliveryNotesOpenById: Record<string, boolean>;
  beneficiaryOutcomeDraft: CommunityDomainOutcomeDraft;
  beneficiaryOutcomeReceiptFormOpenById: Record<string, boolean>;
  beneficiaryOutcomeRecentPacketById: Record<string, BeneficiaryOutcomeRecentPacketKey>;
  beneficiaryOutcomeRecentPacketChooserOpenById: Record<string, boolean>;
  beneficiaryOutcomeRecordStageChooserOpen: boolean;
  beneficiaryOutcomeRows: BeneficiaryOutcomeRow[];
  beneficiaryOutcomeSummaryDetailsOpenById: Record<string, boolean>;
  beneficiaryOutcomeTaskChooserOpen: boolean;
  billingInputStyle: () => React.CSSProperties;
  domainType: string;
  templateKey: string;
  busyActivityRecord: boolean;
  busyAttendanceSession: boolean;
  busySchoolFeeExpectedPayment: boolean;
  busySchoolGuardianContact: boolean;
  busyBeneficiaryOutcomeRecord: boolean;
  busyOutcomeConfirmationLinkId: string;
  busyOutcomeContactConsentId: string;
  busyOutcomeContactConsentWithdrawalId: string;
  busyOutcomeCorrectionReviewId: string;
  busyOutcomeDeliveryReceiptCorrectionId: string;
  busyOutcomeDeliveryReceiptId: string;
  busyOutcomeProviderSendId: string;
  busyResponseChannel: boolean;
  checkBeneficiaryOutcomeProviderSend: RowAction<BeneficiaryOutcomeRow>;
  cleanText: (value: unknown, fallback?: string) => string;
  compactStatus: (value: unknown) => string;
  correctBeneficiaryOutcomeDeliveryReceipt: RowAction<BeneficiaryOutcomeRow>;
  acknowledgeDomainNotice: (noticeEventId: string) => void | Promise<void>;
  copyLatestAttendanceLink: AsyncAction;
  copyLatestResponseLink: AsyncAction;
  createSchoolFeeExpectedPayment: (payload: {
    subject_user_id: string;
    amount: string;
    currency: string;
    term_label: string;
    fee_label: string;
    due_at?: string | null;
    campus_label?: string | null;
    note?: string | null;
  }) => void | Promise<void>;
  bulkOpenSchoolFeeExpectedPayments: (payload: {
    amount: string;
    currency: string;
    term_label: string;
    fee_label: string;
    due_at?: string | null;
    campus_label?: string | null;
    note?: string | null;
  }) => void | Promise<void>;
  logSchoolFeePaymentProof: (payload: {
    expected_payment_id: string;
    proof_source: string;
    proof_status: string;
    proof_reference?: string | null;
    amount_reported?: string | null;
    note?: string | null;
  }) => void | Promise<void>;
  recordSchoolGuardianContact: (payload: {
    subject_user_id: string;
    guardian_label: string;
    relationship: string;
    channel: string;
    destination_reference_status: string;
    destination_reference_label?: string | null;
    contact_status: string;
    consent_basis: string;
    notification_scope: string;
    note?: string | null;
  }) => void | Promise<void>;
  createBeneficiaryOutcomeConfirmationLink: (outcomeEventId: string) => void | Promise<void>;
  emptyBeneficiaryContactConsentDraft: () => BeneficiaryContactConsentDraft;
  emptyBeneficiaryContactConsentWithdrawalDraft: () => BeneficiaryContactConsentWithdrawalDraft;
  emptyBeneficiaryDeliveryReceiptCorrectionDraft: () => BeneficiaryDeliveryReceiptCorrectionDraft;
  emptyBeneficiaryDeliveryReceiptDraft: () => BeneficiaryDeliveryReceiptDraft;
  helperText: PanelStyleFactory;
  iconFrame: (size?: number) => React.CSSProperties;
  iconHeaderStyle: PanelStyleFactory;
  isAdmin: boolean;
  latestAttendancePublicUrl: string;
  latestResponsePublicUrl: string;
  noticeDateLabel: (value: unknown) => string;
  openMemberRoster: AsyncAction;
  realLifeRecordTypeChooserOpen: boolean;
  recordBeneficiaryOutcomeContactConsent: RowAction<BeneficiaryOutcomeRow>;
  recordBeneficiaryOutcomeDeliveryReceipt: RowAction<BeneficiaryOutcomeRow>;
  sectionLabel: PanelStyleFactory;
  generateAttendanceSession: AsyncAction;
  recordAdminAttendanceCheckin: (subjectUserId: string) => void | Promise<void>;
  recordAdminAttendanceCardCheckin: (cardCode: string) => void | Promise<void>;
  recordSchoolAttendanceParentNotification: (payload: {
    subject_user_id: string;
    channel: string;
    delivery_status: string;
    destination_reference_status?: string | null;
    destination_reference_label?: string | null;
    note?: string | null;
  }) => void | Promise<void>;
  generateResponseChannel: AsyncAction;
  shareLatestResponseViaWhatsApp: AsyncAction;
  setActiveActivityRecordStage: StateSetter<ActivityRecordStageKey>;
  setActiveActivityRecordTask: StateSetter<ActivityRecordTaskKey>;
  setActiveBeneficiaryOutcomeRecordStage: StateSetter<BeneficiaryOutcomeRecordStageKey>;
  setActiveBeneficiaryOutcomeTask: StateSetter<BeneficiaryOutcomeTaskKey>;
  setActiveRealLifeRecordTask: StateSetter<RealLifeRecordTask | null>;
  setActivityRecordStageChooserOpen: StateSetter<boolean>;
  setActivityRecordTaskChooserOpen: StateSetter<boolean>;
  setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId: StateSetter<Record<string, BeneficiaryDeliveryReceiptCorrectionDraft>>;
  setBeneficiaryOutcomeConfirmationActionById: StateSetter<Record<string, BeneficiaryOutcomeConfirmationActionKey>>;
  setBeneficiaryOutcomeConfirmationActionChooserOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeConfirmationActionOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeContactActionById: StateSetter<Record<string, BeneficiaryOutcomeContactActionKey>>;
  setBeneficiaryOutcomeContactActionChooserOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeContactActionOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeDeliveryNotesOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeReceiptFormOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeRecentPacketById: StateSetter<Record<string, BeneficiaryOutcomeRecentPacketKey>>;
  setBeneficiaryOutcomeRecentPacketChooserOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeRecordStageChooserOpen: StateSetter<boolean>;
  setBeneficiaryOutcomeSummaryDetailsOpenById: StateSetter<Record<string, boolean>>;
  setBeneficiaryOutcomeTaskChooserOpen: StateSetter<boolean>;
  setRealLifeRecordTypeChooserOpen: StateSetter<boolean>;
  softCard: PanelStyleFactory;
  statusBadge: StatusStyleFactory;
  subjectReferenceLabel: (item: ActivityRecordRow | BeneficiaryOutcomeRow) => string;
  submitBeneficiaryOutcomeCorrectionReview: RowAction<BeneficiaryOutcomeRow>;
  submitCommunityDomainActivityRecord: AsyncAction;
  submitCommunityDomainBeneficiaryOutcomeRecord: AsyncAction;
  updateActivityDraft: (key: keyof CommunityDomainActivityDraft, value: string) => void;
  updateAttendanceSessionDraft: (
    key: keyof CommunityDomainAttendanceSessionDraft,
    value: string
  ) => void;
  updateResponseChannelDraft: (
    key: keyof CommunityDomainResponseChannelDraft,
    value: string | boolean
  ) => void;
  updateBeneficiaryContactConsentDraft: (
    outcomeEventId: string,
    key: keyof BeneficiaryContactConsentDraft,
    value: string
  ) => void;
  updateBeneficiaryContactConsentWithdrawalDraft: (
    outcomeEventId: string,
    key: keyof BeneficiaryContactConsentWithdrawalDraft,
    value: string
  ) => void;
  updateBeneficiaryCorrectionDecision: (outcomeEventId: string, decision: string) => void;
  updateBeneficiaryCorrectionNote: (outcomeEventId: string, note: string) => void;
  updateBeneficiaryDeliveryReceiptDraft: (
    outcomeEventId: string,
    key: keyof BeneficiaryDeliveryReceiptDraft,
    value: string
  ) => void;
  updateBeneficiaryOutcomeDraft: (key: keyof CommunityDomainOutcomeDraft, value: string) => void;
  withdrawBeneficiaryOutcomeContactConsent: RowAction<BeneficiaryOutcomeRow>;
};

type Props = {
  data: RealLifeRecordPanelData;
};

export default function CommunityDomainRealLifeRecordPanel({ data }: Props) {
  const {
    activeActivityRecordStage,
    activeActivityRecordTask,
    activeBeneficiaryOutcomeRecordStage,
    activeBeneficiaryOutcomeTask,
    activeGovernanceTask,
    activeRealLifeRecordTask,
    activityCatalogueOptions,
    activityDraft,
    activityRecordStageChooserOpen,
    activityRecordTaskChooserOpen,
    activityRows,
    activityAttentionRows,
    activityAttentionSummary,
    attendanceSessionCopied,
    attendanceSessionDraft,
    attendanceSessionRows,
    domainMemberRows,
    domainNotices,
    domainNoticesLoading,
    schoolFeeExpectedPaymentRows,
    schoolFeeExpectedPaymentSummary,
    schoolGuardianContactRows,
    schoolGuardianContactSummary,
    responseChannelCopied,
    responseChannelDraft,
    responseChannelRows,
    beneficiaryContactConsentDraftByOutcomeId,
    beneficiaryContactConsentWithdrawalDraftByOutcomeId,
    beneficiaryCorrectionDecisionByOutcomeId,
    beneficiaryCorrectionNoteByOutcomeId,
    beneficiaryDeliveryPackByOutcomeId,
    beneficiaryDeliveryReceiptCorrectionDraftByOutcomeId,
    beneficiaryDeliveryReceiptDraftByOutcomeId,
    beneficiaryOutcomeConfirmationActionById,
    beneficiaryOutcomeConfirmationActionChooserOpenById,
    beneficiaryOutcomeConfirmationActionOpenById,
    beneficiaryOutcomeContactActionById,
    beneficiaryOutcomeContactActionChooserOpenById,
    beneficiaryOutcomeContactActionOpenById,
    beneficiaryOutcomeDeliveryNotesOpenById,
    beneficiaryOutcomeDraft,
    beneficiaryOutcomeReceiptFormOpenById,
    beneficiaryOutcomeRecentPacketById,
    beneficiaryOutcomeRecentPacketChooserOpenById,
    beneficiaryOutcomeRecordStageChooserOpen,
    beneficiaryOutcomeRows,
    beneficiaryOutcomeSummaryDetailsOpenById,
    beneficiaryOutcomeTaskChooserOpen,
    billingInputStyle,
    domainType,
    templateKey,
    busyActivityRecord,
    busyAttendanceSession,
    busySchoolFeeExpectedPayment,
    busySchoolGuardianContact,
    busyBeneficiaryOutcomeRecord,
    busyOutcomeConfirmationLinkId,
    busyOutcomeContactConsentId,
    busyOutcomeContactConsentWithdrawalId,
    busyOutcomeCorrectionReviewId,
    busyOutcomeDeliveryReceiptCorrectionId,
    busyOutcomeDeliveryReceiptId,
    busyOutcomeProviderSendId,
    busyResponseChannel,
    acknowledgeDomainNotice,
    checkBeneficiaryOutcomeProviderSend,
    cleanText,
    compactStatus,
    correctBeneficiaryOutcomeDeliveryReceipt,
    copyLatestAttendanceLink,
    copyLatestResponseLink,
    createSchoolFeeExpectedPayment,
    bulkOpenSchoolFeeExpectedPayments,
    logSchoolFeePaymentProof,
    recordSchoolGuardianContact,
    createBeneficiaryOutcomeConfirmationLink,
    emptyBeneficiaryContactConsentDraft,
    emptyBeneficiaryContactConsentWithdrawalDraft,
    emptyBeneficiaryDeliveryReceiptCorrectionDraft,
    emptyBeneficiaryDeliveryReceiptDraft,
    helperText,
    iconFrame,
    iconHeaderStyle,
    isAdmin,
    latestAttendancePublicUrl,
    latestResponsePublicUrl,
    openMemberRoster,
    noticeDateLabel,
    realLifeRecordTypeChooserOpen,
    recordBeneficiaryOutcomeContactConsent,
    recordBeneficiaryOutcomeDeliveryReceipt,
    sectionLabel,
    generateAttendanceSession,
    recordAdminAttendanceCheckin,
    recordAdminAttendanceCardCheckin,
    recordSchoolAttendanceParentNotification,
    generateResponseChannel,
    shareLatestResponseViaWhatsApp,
    setActiveActivityRecordStage,
    setActiveActivityRecordTask,
    setActiveBeneficiaryOutcomeRecordStage,
    setActiveBeneficiaryOutcomeTask,
    setActiveRealLifeRecordTask,
    setActivityRecordStageChooserOpen,
    setActivityRecordTaskChooserOpen,
    setBeneficiaryDeliveryReceiptCorrectionDraftByOutcomeId,
    setBeneficiaryOutcomeConfirmationActionById,
    setBeneficiaryOutcomeConfirmationActionChooserOpenById,
    setBeneficiaryOutcomeConfirmationActionOpenById,
    setBeneficiaryOutcomeContactActionById,
    setBeneficiaryOutcomeContactActionChooserOpenById,
    setBeneficiaryOutcomeContactActionOpenById,
    setBeneficiaryOutcomeDeliveryNotesOpenById,
    setBeneficiaryOutcomeReceiptFormOpenById,
    setBeneficiaryOutcomeRecentPacketById,
    setBeneficiaryOutcomeRecentPacketChooserOpenById,
    setBeneficiaryOutcomeRecordStageChooserOpen,
    setBeneficiaryOutcomeSummaryDetailsOpenById,
    setBeneficiaryOutcomeTaskChooserOpen,
    setRealLifeRecordTypeChooserOpen,
    softCard,
    statusBadge,
    subjectReferenceLabel,
    submitBeneficiaryOutcomeCorrectionReview,
    submitCommunityDomainActivityRecord,
    submitCommunityDomainBeneficiaryOutcomeRecord,
    updateActivityDraft,
    updateAttendanceSessionDraft,
    updateResponseChannelDraft,
    updateBeneficiaryContactConsentDraft,
    updateBeneficiaryContactConsentWithdrawalDraft,
    updateBeneficiaryCorrectionDecision,
    updateBeneficiaryCorrectionNote,
    updateBeneficiaryDeliveryReceiptDraft,
    updateBeneficiaryOutcomeDraft,
    withdrawBeneficiaryOutcomeContactConsent,
  } = data;

  const activeActivityRecordTaskOption =
    ACTIVITY_RECORD_TASK_OPTIONS.find((task) => task.key === activeActivityRecordTask) ||
    ACTIVITY_RECORD_TASK_OPTIONS[0];
  const activeBeneficiaryOutcomeTaskOption =
    BENEFICIARY_OUTCOME_TASK_OPTIONS.find(
      (task) => task.key === activeBeneficiaryOutcomeTask
    ) || BENEFICIARY_OUTCOME_TASK_OPTIONS[0];
  const domainWorkflowKey = cleanText(templateKey || domainType).toLowerCase();
  const isChurchWorkflow =
    domainWorkflowKey === "church_religious_body" || domainWorkflowKey === "religious_body";
  const isSchoolWorkflow =
    domainWorkflowKey === "school_multi_branch" || domainWorkflowKey === "school";
  const latestAttendanceSession = attendanceSessionRows[0] || null;
  const latestAttendanceActive = Boolean(latestAttendanceSession?.active);
  const latestAttendanceCount = cleanText(latestAttendanceSession?.checkin_count, "0");
  const latestAttendanceFollowUpSnapshot =
    latestAttendanceSession?.follow_up_snapshot &&
    typeof latestAttendanceSession.follow_up_snapshot === "object"
      ? latestAttendanceSession.follow_up_snapshot
      : null;
  const latestAttendanceExpectedCount = cleanText(
    latestAttendanceFollowUpSnapshot?.expected_member_count,
    "0"
  );
  const latestAttendancePresentCount = cleanText(
    latestAttendanceFollowUpSnapshot?.present_member_count,
    latestAttendanceCount
  );
  const latestAttendanceFollowUpCount = cleanText(
    latestAttendanceFollowUpSnapshot?.follow_up_needed_count,
    "0"
  );
  const latestAttendanceFollowUpCandidateIds = Array.isArray(
    latestAttendanceFollowUpSnapshot?.follow_up_candidate_user_ids
  )
    ? latestAttendanceFollowUpSnapshot.follow_up_candidate_user_ids
        .map((candidateId) => cleanText(candidateId))
        .filter(Boolean)
    : [];
  const activeSchoolAttendanceMembers = domainMemberRows
    .filter((row) => cleanText(row?.status, "inactive").toLowerCase() === "active")
    .slice(0, 75);
  const latestAttendanceVisibleCandidateIds = latestAttendanceFollowUpCandidateIds.slice(0, 12);
  const latestAttendanceHiddenCandidateCount = Math.max(
    latestAttendanceFollowUpCandidateIds.length - latestAttendanceVisibleCandidateIds.length,
    0
  );
  const latestAttendanceEvidenceReference = cleanText(latestAttendanceSession?.event_id)
    ? `attendance-session:${cleanText(latestAttendanceSession?.event_id)}`
    : "";
  const latestResponseChannel = responseChannelRows[0] || null;
  const latestResponseActive = Boolean(latestResponseChannel?.active);
  const latestResponseCount = cleanText(latestResponseChannel?.response_count, "0");
  const latestResponseFollowUpCount = cleanText(latestResponseChannel?.private_follow_up_count, "0");
  const churchPastoralFollowUpPreset =
    CHURCH_ACTIVITY_PRESET_PACK.find((preset) => preset.key === "pastoral_follow_up") || CHURCH_ACTIVITY_PRESET_PACK[0];
  const [churchFollowUpSourceCue, setChurchFollowUpSourceCue] = React.useState<{
    eventId: string;
    subjectLabel: string;
    nextDate: string;
    owner: string;
    communityNodeId: string;
    evidenceReference: string;
  } | null>(null);

  const [schoolStaffScanSubjectUserId, setSchoolStaffScanSubjectUserId] = React.useState("");
  const [schoolStaffScanCardCode, setSchoolStaffScanCardCode] = React.useState("");
  const [schoolParentNotificationChannel, setSchoolParentNotificationChannel] = React.useState("gsn");
  const [schoolParentNotificationStatus, setSchoolParentNotificationStatus] = React.useState("prepared");
  const [schoolParentNotificationLabel, setSchoolParentNotificationLabel] = React.useState("Parent/guardian on file");
  const [schoolStaffScanBusy, setSchoolStaffScanBusy] = React.useState(false);
  const [schoolStaffScanMessage, setSchoolStaffScanMessage] = React.useState("");
  const [schoolAttendanceCardSheetCopied, setSchoolAttendanceCardSheetCopied] = React.useState(false);
  const [schoolFeeTrackerCopied, setSchoolFeeTrackerCopied] = React.useState(false);
  const [schoolGuardianContactSheetCopied, setSchoolGuardianContactSheetCopied] = React.useState(false);
  const [schoolNoticeAckBusyId, setSchoolNoticeAckBusyId] = React.useState("");
  const [schoolNoticeAckMessage, setSchoolNoticeAckMessage] = React.useState("");
  const [schoolNoticeSheetCopied, setSchoolNoticeSheetCopied] = React.useState(false);
  const [schoolPilotReadinessCopied, setSchoolPilotReadinessCopied] = React.useState(false);
  const [schoolFeeSubjectUserId, setSchoolFeeSubjectUserId] = React.useState("");
  const [schoolFeeAmount, setSchoolFeeAmount] = React.useState("");
  const [schoolFeeCurrency, setSchoolFeeCurrency] = React.useState("NGN");
  const [schoolFeeTermLabel, setSchoolFeeTermLabel] = React.useState("Current term");
  const [schoolFeeCampusLabel, setSchoolFeeCampusLabel] = React.useState("");
  const [schoolFeeProofExpectedPaymentId, setSchoolFeeProofExpectedPaymentId] = React.useState("");
  const [schoolFeeProofSource, setSchoolFeeProofSource] = React.useState("bank_transfer_slip");
  const [schoolFeeProofReference, setSchoolFeeProofReference] = React.useState("");
  const [schoolFeeProofAmount, setSchoolFeeProofAmount] = React.useState("");
  const [schoolGuardianSubjectUserId, setSchoolGuardianSubjectUserId] = React.useState("");
  const [schoolGuardianLabel, setSchoolGuardianLabel] = React.useState("Parent/guardian");
  const [schoolGuardianRelationship, setSchoolGuardianRelationship] = React.useState("parent");
  const [schoolGuardianChannel, setSchoolGuardianChannel] = React.useState("whatsapp");
  const [schoolGuardianReferenceLabel, setSchoolGuardianReferenceLabel] = React.useState("Parent WhatsApp on file");
  const [schoolFeeMessage, setSchoolFeeMessage] = React.useState("");

  const selectedSchoolAttendanceMember =
    activeSchoolAttendanceMembers.find(
      (row) => cleanText(row?.user_id) === cleanText(schoolStaffScanSubjectUserId)
    ) || null;
  const selectedSchoolAttendanceCardCode = cleanText(
    selectedSchoolAttendanceMember?.attendance_card_code
  );
  const schoolAttendanceCardRows = activeSchoolAttendanceMembers.filter((row) => cleanText(row?.attendance_card_code));
  const visibleSchoolAttendanceCardRows = schoolAttendanceCardRows.slice(0, 6);
  const schoolAttendanceCardMissingTotal = Math.max(
    activeSchoolAttendanceMembers.length - schoolAttendanceCardRows.length,
    0
  );

  const visibleSchoolNoticeRows = domainNotices.slice(0, 4);
  const visibleSchoolFeeRows = schoolFeeExpectedPaymentRows.slice(0, 8);
  const visibleSchoolGuardianContactRows = schoolGuardianContactRows.slice(0, 4);
  const schoolGuardianContactActiveCount = schoolGuardianContactRows.filter(
    (row) => cleanText(row?.contact_status) === "active_attestation"
  ).length;
  const schoolGuardianCoverageTotal = cleanText(
    schoolGuardianContactSummary?.active_member_total,
    cleanText(activeSchoolAttendanceMembers.length)
  );
  const schoolGuardianCoverageReady = cleanText(
    schoolGuardianContactSummary?.active_member_with_active_contact_total,
    cleanText(schoolGuardianContactActiveCount)
  );
  const schoolGuardianCoverageMissing = cleanText(
    schoolGuardianContactSummary?.active_member_missing_active_contact_total,
    "0"
  );
  const schoolGuardianMissingIds = Array.isArray(
    schoolGuardianContactSummary?.missing_active_contact_subject_user_ids
  )
    ? schoolGuardianContactSummary?.missing_active_contact_subject_user_ids
        .map((value) => cleanText(value))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const selectedSchoolParentNotificationContact =
    schoolGuardianContactRows.find(
      (row) =>
        cleanText(row?.subject_user_id) === cleanText(schoolStaffScanSubjectUserId) &&
        cleanText(row?.channel) === cleanText(schoolParentNotificationChannel) &&
        cleanText(row?.contact_status) !== "withdrawn"
    ) ||
    schoolGuardianContactRows.find(
      (row) =>
        cleanText(row?.subject_user_id) === cleanText(schoolStaffScanSubjectUserId) &&
        cleanText(row?.contact_status) !== "withdrawn"
    ) ||
    null;
  const selectedSchoolParentNotificationContactLabel = cleanText(
    selectedSchoolParentNotificationContact?.destination_reference_label ||
      selectedSchoolParentNotificationContact?.guardian_label
  );
  const schoolFeeStatusCounts = schoolFeeExpectedPaymentRows.reduce<{
    pending: number;
    partial: number;
    confirmed: number;
    proofUploaded: number;
  }>(
    (counts, row) => {
      const status = cleanText(row?.status, "expected").toLowerCase();
      if (status === "confirmed" || status === "applied") counts.confirmed += 1;
      else if (status === "partial") counts.partial += 1;
      else counts.pending += 1;
      const meta = row?.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
        ? (row.meta as UnknownRecord)
        : {};
      if (meta.latest_payment_proof && status !== "confirmed" && status !== "applied") {
        counts.proofUploaded += 1;
      }
      return counts;
    },
    { pending: 0, partial: 0, confirmed: 0, proofUploaded: 0 }
  );
  const schoolFeeCoverageTotal = cleanText(
    schoolFeeExpectedPaymentSummary?.active_member_total,
    cleanText(activeSchoolAttendanceMembers.length)
  );
  const schoolFeeCoverageReady = cleanText(
    schoolFeeExpectedPaymentSummary?.active_member_with_expected_payment_total,
    cleanText(schoolFeeExpectedPaymentRows.length)
  );
  const schoolFeeCoverageMissing = cleanText(
    schoolFeeExpectedPaymentSummary?.active_member_missing_expected_payment_total,
    "0"
  );
  const schoolFeeProofCoverageReady = cleanText(
    schoolFeeExpectedPaymentSummary?.active_member_with_proof_total,
    cleanText(schoolFeeStatusCounts.proofUploaded)
  );
  const schoolFeeMissingIds = Array.isArray(
    schoolFeeExpectedPaymentSummary?.missing_expected_payment_subject_user_ids
  )
    ? schoolFeeExpectedPaymentSummary?.missing_expected_payment_subject_user_ids
        .map((value) => cleanText(value))
        .filter(Boolean)
        .slice(0, 8)
    : [];

  const schoolPilotReadinessRows = [
    {
      label: "Active roster",
      value: `${activeSchoolAttendanceMembers.length} loaded`,
      ready: activeSchoolAttendanceMembers.length > 0,
      next: activeSchoolAttendanceMembers.length > 0 ? "Roster can drive school setup." : "Load active students/members first.",
    },
    {
      label: "Attendance cards",
      value: `${schoolAttendanceCardRows.length}/${activeSchoolAttendanceMembers.length}`,
      ready: activeSchoolAttendanceMembers.length > 0 && schoolAttendanceCardMissingTotal === 0,
      next: schoolAttendanceCardMissingTotal === 0 ? "Card sheet is ready for staff scanning." : "Refresh roster or generate missing card codes before printing.",
    },
    {
      label: "Guardian contacts",
      value: `${schoolGuardianCoverageReady}/${schoolGuardianCoverageTotal}`,
      ready: cleanText(schoolGuardianCoverageMissing) === "0" && cleanText(schoolGuardianCoverageTotal) !== "0",
      next: cleanText(schoolGuardianCoverageMissing) === "0" ? "Contact reference coverage is complete." : "Record active contact references for missing students.",
    },
    {
      label: "Fee tracking",
      value: `${schoolFeeCoverageReady}/${schoolFeeCoverageTotal}`,
      ready: cleanText(schoolFeeCoverageMissing) === "0" && cleanText(schoolFeeCoverageTotal) !== "0",
      next: cleanText(schoolFeeCoverageMissing) === "0" ? "Expected-payment rows are opened." : "Open missing fee rows before testing follow-up.",
    },
    {
      label: "Official notices",
      value: `${domainNotices.length} loaded`,
      ready: domainNotices.length > 0,
      next: domainNotices.length > 0 ? "Notice acknowledgement can be tested." : "Post at least one notice on the Announcement Board.",
    },
  ];
  const schoolPilotReadyCount = schoolPilotReadinessRows.filter((row) => row.ready).length;
  const schoolPilotReadinessStatus = schoolPilotReadyCount === schoolPilotReadinessRows.length ? "Pilot ready" : `${schoolPilotReadyCount}/${schoolPilotReadinessRows.length} ready`;

  async function copySchoolPilotReadinessSheet() {
    const lines = [
      "GSN school pilot readiness sheet",
      "Boundary: this readiness sheet reports setup status inside GSN only. It is not proof of parent consent, message delivery, fee payment, attendance, or bank reconciliation.",
      `Summary\t${schoolPilotReadinessStatus}`,
      "Area\tStatus\tValue\tNext step",
      ...schoolPilotReadinessRows.map((row) => [
        row.label,
        row.ready ? "ready" : "needs setup",
        row.value,
        row.next,
      ].join("\t")),
    ];
    const copyText = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setSchoolPilotReadinessCopied(true);
        setSchoolFeeMessage("School pilot readiness sheet copied. Review before sending or printing.");
        window.setTimeout(() => setSchoolPilotReadinessCopied(false), 1600);
      } else {
        setSchoolFeeMessage(`Clipboard is not available. School pilot readiness sheet: ${copyText}`);
      }
    } catch {
      setSchoolFeeMessage(`Clipboard access was blocked. School pilot readiness sheet: ${copyText}`);
    }
  }
  async function copySchoolNoticeAcknowledgementSheet() {
    if (!domainNotices.length) {
      setSchoolNoticeAckMessage("No school notices are loaded to copy yet.");
      return;
    }
    const lines = [
      "GSN school notice acknowledgement sheet",
      "Boundary: this sheet records GSN notice acknowledgement status only. It is not WhatsApp delivery proof, not parent read confirmation, and not proof that a paper circular reached home.",
      "Notice\tStatus\tAcknowledged\tNeeds follow-up\tViewer acknowledged\tPublic QR\tEvent ID",
      ...domainNotices.map((notice) => {
        const summary = notice?.acknowledgement_summary && typeof notice.acknowledgement_summary === "object" && !Array.isArray(notice.acknowledgement_summary)
          ? (notice.acknowledgement_summary as UnknownRecord)
          : {};
        return [
          cleanText(notice?.body, "Official school notice"),
          cleanText(notice?.active_board_status, "active"),
          cleanText(summary?.acknowledged_count, "0"),
          cleanText(summary?.not_acknowledged_count, "0"),
          summary?.viewer_acknowledged ? "yes" : "no",
          cleanText(notice?.public_path) ? "yes" : "no",
          cleanText(notice?.event_id || notice?.notice_id, "-"),
        ].join("\t");
      }),
    ];
    const copyText = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setSchoolNoticeSheetCopied(true);
        setSchoolNoticeAckMessage("Notice acknowledgement sheet copied. Review before sending or printing.");
        window.setTimeout(() => setSchoolNoticeSheetCopied(false), 1600);
      } else {
        setSchoolNoticeAckMessage(`Clipboard is not available. Notice acknowledgement sheet: ${copyText}`);
      }
    } catch {
      setSchoolNoticeAckMessage(`Clipboard access was blocked. Notice acknowledgement sheet: ${copyText}`);
    }
  }
  async function submitSchoolNoticeAcknowledgement(noticeEventId: string) {
    const cleanNoticeEventId = cleanText(noticeEventId);
    if (!cleanNoticeEventId) {
      setSchoolNoticeAckMessage("Choose a notice before acknowledging.");
      return;
    }
    setSchoolNoticeAckBusyId(cleanNoticeEventId);
    setSchoolNoticeAckMessage("");
    try {
      await acknowledgeDomainNotice(cleanNoticeEventId);
      setSchoolNoticeAckMessage("Notice acknowledged in GSN. This does not prove WhatsApp delivery.");
    } finally {
      setSchoolNoticeAckBusyId("");
    }
  }

  async function submitSchoolFeeExpectedPayment() {
    const cleanSubjectUserId = cleanText(schoolFeeSubjectUserId);
    const cleanAmount = cleanText(schoolFeeAmount);
    if (!cleanSubjectUserId) {
      setSchoolFeeMessage("Choose a student/member before opening fee tracking.");
      return;
    }
    if (!cleanAmount) {
      setSchoolFeeMessage("Enter the fee amount first.");
      return;
    }
    setSchoolFeeMessage("");
    await createSchoolFeeExpectedPayment({
      subject_user_id: cleanSubjectUserId,
      amount: cleanAmount,
      currency: cleanText(schoolFeeCurrency, "NGN"),
      term_label: cleanText(schoolFeeTermLabel, "Current term"),
      fee_label: "School fees",
      campus_label: cleanText(schoolFeeCampusLabel) || null,
      note: "Opened from school governance packet. Confirmation still requires finance review or bank/provider match.",
    });
    setSchoolFeeMessage("Fee tracking submitted. Check the status row below after GSN refreshes the list.");
  }

  async function submitBulkSchoolFeeExpectedPayments() {
    const cleanAmount = cleanText(schoolFeeAmount);
    if (!cleanAmount) {
      setSchoolFeeMessage("Enter the fee amount first.");
      return;
    }
    setSchoolFeeMessage("");
    await bulkOpenSchoolFeeExpectedPayments({
      amount: cleanAmount,
      currency: cleanText(schoolFeeCurrency, "NGN"),
      term_label: cleanText(schoolFeeTermLabel, "Current term"),
      fee_label: "School fees",
      campus_label: cleanText(schoolFeeCampusLabel) || null,
      note: "Bulk opened from school governance packet. Confirmation still requires finance review or bank/provider match.",
    });
    setSchoolFeeMessage("Bulk fee setup submitted. Existing rows will not be duplicated.");
  }

  async function submitSchoolFeePaymentProofLog() {
    const cleanExpectedPaymentId = cleanText(schoolFeeProofExpectedPaymentId);
    if (!cleanExpectedPaymentId) {
      setSchoolFeeMessage("Choose the fee row before logging proof.");
      return;
    }
    setSchoolFeeMessage("");
    await logSchoolFeePaymentProof({
      expected_payment_id: cleanExpectedPaymentId,
      proof_source: cleanText(schoolFeeProofSource, "bank_transfer_slip"),
      proof_status: "submitted",
      proof_reference: cleanText(schoolFeeProofReference) || null,
      amount_reported: cleanText(schoolFeeProofAmount) || null,
      note: "Logged from school governance packet. Proof still requires finance review or bank/provider reconciliation.",
    });
    setSchoolFeeMessage("Payment proof logged for finance review. This is not bank confirmation.");
  }

  async function copySchoolFeeTrackerSheet() {
    if (!schoolFeeExpectedPaymentRows.length) {
      setSchoolFeeMessage("No school-fee tracker rows are loaded to copy yet.");
      return;
    }
    const lines = [
      "GSN school-fee tracker sheet",
      "Boundary: this sheet is a bursar follow-up view from GSN expected-payment rows. It is not a receipt, bank confirmation, or legal proof that a parent has paid.",
      `Summary\tPending ${schoolFeeStatusCounts.pending}\tPartial ${schoolFeeStatusCounts.partial}\tProof ${schoolFeeStatusCounts.proofUploaded}\tConfirmed ${schoolFeeStatusCounts.confirmed}\tCoverage ${schoolFeeCoverageReady}/${schoolFeeCoverageTotal}`,
      "Student/member\tUser ID\tStatus\tAmount\tTerm\tCampus\tReference\tProof status\tProof reference",
      ...schoolFeeExpectedPaymentRows.map((row) => {
        const meta = row?.meta && typeof row.meta === "object" && !Array.isArray(row.meta)
          ? (row.meta as UnknownRecord)
          : {};
        const latestProof = meta.latest_payment_proof && typeof meta.latest_payment_proof === "object" && !Array.isArray(meta.latest_payment_proof)
          ? (meta.latest_payment_proof as UnknownRecord)
          : {};
        const studentLabel =
          cleanText(row?.student_display_name) ||
          cleanText(row?.student_email) ||
          (cleanText(row?.subject_user_id) ? `Member ${cleanText(row?.subject_user_id)}` : "Student/member");
        const amountLabel = `${cleanText(row?.currency, "NGN")} ${cleanText(row?.amount, "0")}`;
        return [
          studentLabel,
          cleanText(row?.subject_user_id, "-"),
          cleanText(row?.payment_status_label, cleanText(row?.status, "Expected")),
          amountLabel,
          cleanText(row?.term_label, "Current term"),
          cleanText(row?.campus_label, "-"),
          cleanText(row?.reference_display || row?.reference, "-"),
          cleanText(latestProof.proof_status || latestProof.status, "none"),
          cleanText(latestProof.proof_reference || latestProof.reference, "-"),
        ].join("\t");
      }),
    ];
    const copyText = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setSchoolFeeTrackerCopied(true);
        setSchoolFeeMessage("School-fee tracker copied for bursar follow-up. Review before sending or printing.");
        window.setTimeout(() => setSchoolFeeTrackerCopied(false), 1600);
      } else {
        setSchoolFeeMessage(`Clipboard is not available. School-fee tracker: ${copyText}`);
      }
    } catch {
      setSchoolFeeMessage(`Clipboard access was blocked. School-fee tracker: ${copyText}`);
    }
  }
  async function copySchoolGuardianContactSheet() {
    if (!schoolGuardianContactRows.length) {
      setSchoolFeeMessage("No parent/guardian contact rows are loaded to copy yet.");
      return;
    }
    const lines = [
      "GSN school parent/guardian contact sheet",
      "Boundary: this sheet is an internal school contact-reference register from GSN. It is not parent identity verification, consent proof, WhatsApp delivery proof, or confirmation that a message was read.",
      `Summary\tActive contacts ${schoolGuardianContactActiveCount}\tCoverage ${schoolGuardianCoverageReady}/${schoolGuardianCoverageTotal}\tMissing active contacts ${schoolGuardianCoverageMissing}`,
      "Student/member ID\tGuardian label\tRelationship\tChannel\tReference label\tContact status\tConsent basis\tNotification scope",
      ...schoolGuardianContactRows.map((row) => [
        cleanText(row?.subject_user_id, "-"),
        cleanText(row?.guardian_label, "Parent/guardian"),
        cleanText(row?.relationship, "-"),
        cleanText(row?.channel, "manual"),
        cleanText(row?.destination_reference_label, "Reference on file"),
        cleanText(row?.contact_status, "on_file_unverified"),
        cleanText(row?.consent_basis, "-"),
        cleanText(row?.notification_scope, "-"),
      ].join("\t")),
    ];
    const copyText = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setSchoolGuardianContactSheetCopied(true);
        setSchoolFeeMessage("Parent/guardian contact sheet copied. Review before sending or printing.");
        window.setTimeout(() => setSchoolGuardianContactSheetCopied(false), 1600);
      } else {
        setSchoolFeeMessage(`Clipboard is not available. Parent/guardian contact sheet: ${copyText}`);
      }
    } catch {
      setSchoolFeeMessage(`Clipboard access was blocked. Parent/guardian contact sheet: ${copyText}`);
    }
  }
  async function submitSchoolGuardianContact() {
    const cleanSubjectUserId = cleanText(schoolGuardianSubjectUserId);
    if (!cleanSubjectUserId) {
      setSchoolFeeMessage("Choose a student/member before recording a parent or guardian contact.");
      return;
    }
    setSchoolFeeMessage("");
    await recordSchoolGuardianContact({
      subject_user_id: cleanSubjectUserId,
      guardian_label: cleanText(schoolGuardianLabel, "Parent/guardian"),
      relationship: cleanText(schoolGuardianRelationship, "parent"),
      channel: cleanText(schoolGuardianChannel, "whatsapp"),
      destination_reference_status: "admin_verified_off_platform",
      destination_reference_label: cleanText(schoolGuardianReferenceLabel) || null,
      contact_status: "active_attestation",
      consent_basis: "guardian_or_authorized_contact",
      notification_scope: "school_attendance_fee_and_notice_follow_up",
      note: "Recorded from school governance packet. Provider delivery still requires a connected bridge and delivery receipts.",
    });
    setSchoolFeeMessage("Parent/guardian contact reference recorded. This is not delivery proof.");
  }

  async function copySchoolAttendanceCardSheet() {
    if (!schoolAttendanceCardRows.length) {
      setSchoolStaffScanMessage("No attendance card rows are loaded to copy yet.");
      return;
    }
    const lines = [
      "GSN attendance card sheet",
      "Boundary: these codes identify active GSN roster rows for signed-in staff scanning only. They are not public student records, attendance proof, parent notification, or payment proof.",
      "Student/member	User ID	Attendance card code",
      ...schoolAttendanceCardRows.map((row) => {
        const userId = cleanText(row?.user_id);
        const studentLabel =
          cleanText(row?.user_display_name) ||
          cleanText(row?.user_email) ||
          (userId ? `Member ${userId}` : "Student/member");
        return `${studentLabel}	${userId || "-"}	${cleanText(row?.attendance_card_code)}`;
      }),
    ];
    const copyText = lines.join("\n");
    try {
      if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(copyText);
        setSchoolAttendanceCardSheetCopied(true);
        setSchoolStaffScanMessage("Attendance card sheet copied. Review before printing or sharing with staff.");
        window.setTimeout(() => setSchoolAttendanceCardSheetCopied(false), 1600);
      } else {
        setSchoolStaffScanMessage(`Clipboard is not available. Card sheet: ${copyText}`);
      }
    } catch {
      setSchoolStaffScanMessage(`Clipboard access was blocked. Card sheet: ${copyText}`);
    }
  }

  async function submitSchoolStaffScanCardAttendance() {
    const cleanCardCode = cleanText(schoolStaffScanCardCode || selectedSchoolAttendanceCardCode);
    if (!cleanCardCode) {
      setSchoolStaffScanMessage("Scan, paste, or select a student ID card code first.");
      return;
    }
    setSchoolStaffScanBusy(true);
    setSchoolStaffScanMessage("");
    try {
      await recordAdminAttendanceCardCheckin(cleanCardCode);
      setSchoolStaffScanCardCode("");
      setSchoolStaffScanMessage("Attendance card recorded for this student/member.");
    } catch (error) {
      setSchoolStaffScanMessage("GSN could not record attendance from this card code.");
    } finally {
      setSchoolStaffScanBusy(false);
    }
  }

  async function submitSchoolParentNotificationLog() {
    const cleanSubjectUserId = cleanText(schoolStaffScanSubjectUserId);
    if (!cleanSubjectUserId) {
      setSchoolStaffScanMessage("Choose a student/member before logging parent notification.");
      return;
    }
    setSchoolStaffScanBusy(true);
    setSchoolStaffScanMessage("");
    try {
      const destinationLabel =
        cleanText(schoolParentNotificationLabel) ||
        selectedSchoolParentNotificationContactLabel ||
        null;
      await recordSchoolAttendanceParentNotification({
        subject_user_id: cleanSubjectUserId,
        channel: cleanText(schoolParentNotificationChannel, "gsn"),
        delivery_status: cleanText(schoolParentNotificationStatus, "prepared"),
        destination_reference_status: destinationLabel ? "on_file" : "not_recorded",
        destination_reference_label: destinationLabel,
        note: selectedSchoolParentNotificationContact
          ? "Parent notification log recorded from the school governance packet using the roster guardian contact reference. Delivery proof is external unless a provider is connected."
          : "Parent notification log recorded from the school governance packet. Delivery proof is external unless a provider is connected.",
      });
      setSchoolStaffScanMessage("Parent notification log recorded. This is not delivery proof.");
    } catch (error) {
      setSchoolStaffScanMessage("GSN could not record this parent notification log.");
    } finally {
      setSchoolStaffScanBusy(false);
    }
  }

  async function submitSchoolStaffScanAttendance() {
    const cleanSubjectUserId = cleanText(schoolStaffScanSubjectUserId);
    if (!cleanSubjectUserId) {
      setSchoolStaffScanMessage("Enter a student or member user ID first.");
      return;
    }
    setSchoolStaffScanBusy(true);
    setSchoolStaffScanMessage("");
    try {
      await recordAdminAttendanceCheckin(cleanSubjectUserId);
      setSchoolStaffScanMessage("Attendance record submitted for this student/member ID.");
    } catch (error) {
      setSchoolStaffScanMessage("GSN could not record this attendance from the school packet.");
    } finally {
      setSchoolStaffScanBusy(false);
    }
  }

  function prepareSchoolStaffAttendanceWindowPreset(preset: "arrival" | "dismissal") {
    const isDismissal = preset === "dismissal";
    updateAttendanceSessionDraft("programme_label", isDismissal ? "School dismissal" : "School morning arrival");
    updateAttendanceSessionDraft("method", "staff_scan");
    updateAttendanceSessionDraft("window_minutes", "120");
    updateAttendanceSessionDraft(
      "note",
      isDismissal
        ? "Staff-scanned dismissal window for students. Students do not need phones; parent notification is recorded separately until a provider is connected."
        : "Staff-scanned arrival window for students. Students do not need phones; parent notification is recorded separately until a provider is connected."
    );
  }

  function prepareSchoolStaffAttendanceWindow() {
    prepareSchoolStaffAttendanceWindowPreset("arrival");
  }

  function applySchoolActivityPreset(preset: (typeof SCHOOL_ACTIVITY_PRESET_PACK)[number]) {
    updateActivityDraft("activity_type", preset.activityType);
    updateActivityDraft("activity_label", preset.activityLabel);
    updateActivityDraft("measurement_unit", preset.unit);
    updateActivityDraft("note", preset.note);
    updateActivityDraft("follow_up_due_at", "");
    setChurchFollowUpSourceCue(null);
    setActiveRealLifeRecordTask("activity");
    setActiveActivityRecordTask("record");
    setActiveActivityRecordStage("person");
    setActivityRecordTaskChooserOpen(false);
    setActivityRecordStageChooserOpen(false);
  }
  function applyChurchActivityPreset(
    preset: (typeof CHURCH_ACTIVITY_PRESET_PACK)[number],
    subjectUserId = "",
    evidenceReference = "",
    communityNodeId = "",
    sourceCue: typeof churchFollowUpSourceCue = null
  ) {
    const cleanSubjectUserId = cleanText(subjectUserId);
    const cleanEvidenceReference = cleanText(evidenceReference);
    const cleanCommunityNodeId = cleanText(communityNodeId);
    updateActivityDraft("activity_type", preset.activityType);
    updateActivityDraft("activity_label", preset.activityLabel);
    updateActivityDraft("measurement_unit", preset.unit);
    updateActivityDraft("note", preset.note);
    updateActivityDraft("follow_up_due_at", "");
    if (cleanSubjectUserId) {
      updateActivityDraft("subject_user_id", cleanSubjectUserId);
    }
    if (cleanEvidenceReference) {
      updateActivityDraft("evidence_reference", cleanEvidenceReference);
    }
    if (cleanCommunityNodeId) {
      updateActivityDraft("community_node_id", cleanCommunityNodeId);
    } else {
      updateActivityDraft("community_node_id", "");
    }
    setChurchFollowUpSourceCue(sourceCue);
    setActiveRealLifeRecordTask("activity");
    setActiveActivityRecordTask("record");
    setActiveActivityRecordStage("person");
    setActivityRecordTaskChooserOpen(false);
    setActivityRecordStageChooserOpen(false);
  }

  function applyChurchFollowUpRouteNote(route: string) {
    const cleanRoute = cleanText(route);
    if (!cleanRoute) {
      return;
    }
    const existingNote = String(activityDraft.note || "");
    const noteWithoutPreviousRoute = existingNote
      .split("\n")
      .filter(
        (line) =>
          !line.trim().startsWith(CHURCH_FOLLOW_UP_ROUTE_NOTE_PREFIX)
      )
      .join("\n")
      .trim();
    const routeLine = `${CHURCH_FOLLOW_UP_ROUTE_NOTE_PREFIX} ${cleanRoute}`;
    updateActivityDraft(
      "note",
      noteWithoutPreviousRoute ? `${routeLine}\n${noteWithoutPreviousRoute}` : routeLine
    );
  }

  function applyChurchFollowUpOutcomeNote(outcome: string) {
    const cleanOutcome = cleanText(outcome);
    if (!cleanOutcome) {
      return;
    }
    const existingNote = String(activityDraft.note || "");
    const noteWithoutPreviousOutcome = existingNote
      .split("\n")
      .filter(
        (line) =>
          !line.trim().startsWith(CHURCH_FOLLOW_UP_OUTCOME_NOTE_PREFIX)
      )
      .join("\n")
      .trim();
    const outcomeLine = `${CHURCH_FOLLOW_UP_OUTCOME_NOTE_PREFIX} ${cleanOutcome}`;
    updateActivityDraft(
      "note",
      noteWithoutPreviousOutcome
        ? `${outcomeLine}\n${noteWithoutPreviousOutcome}`
        : outcomeLine
    );
  }

  function churchFollowUpNoteValue(prefix: string) {
    const matchingLine = String(activityDraft.note || "")
      .split("\n")
      .find((line) => line.trim().startsWith(prefix));
    return matchingLine ? matchingLine.trim().slice(prefix.length).trim() : "";
  }

  function updateChurchFollowUpNoteLine(prefix: string, value: string) {
    const cleanValue = cleanText(value);
    const noteWithoutPreviousLine = String(activityDraft.note || "")
      .split("\n")
      .filter((line) => !line.trim().startsWith(prefix))
      .join("\n")
      .trim();
    const nextLine = cleanValue ? `${prefix} ${cleanValue}` : "";
    updateActivityDraft(
      "note",
      nextLine && noteWithoutPreviousLine
        ? `${nextLine}\n${noteWithoutPreviousLine}`
        : nextLine || noteWithoutPreviousLine
    );
  }

  function updateChurchFollowUpNextDate(value: string) {
    updateActivityDraft("follow_up_due_at", cleanText(value));
    updateChurchFollowUpNoteLine(CHURCH_FOLLOW_UP_NEXT_DATE_NOTE_PREFIX, value);
  }

  function churchFollowUpRowNoteValue(item: ActivityRecordRow, prefix: string) {
    const matchingLine = cleanText(item?.note)
      .split("\n")
      .find((line) => line.trim().startsWith(prefix));
    return matchingLine ? matchingLine.trim().slice(prefix.length).trim() : "";
  }

  function churchFollowUpNextDateValue(item: ActivityRecordRow) {
    const queueDate = cleanText(item?.follow_up_due_date).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(queueDate)) {
      return queueDate;
    }
    const structuredDate = cleanText(item?.follow_up_due_at).slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(structuredDate)) {
      return structuredDate;
    }
    return churchFollowUpRowNoteValue(item, CHURCH_FOLLOW_UP_NEXT_DATE_NOTE_PREFIX);
  }

  function churchFollowUpTodayIsoDate() {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function churchFollowUpDueStatus(item: ActivityRecordRow) {
    const queueStatus = cleanText(item?.follow_up_queue_status).toLowerCase();
    if (queueStatus === "overdue_before_cutoff") {
      return "Overdue";
    }
    if (queueStatus === "due_on_cutoff") {
      return "Due today";
    }
    const nextDate = churchFollowUpNextDateValue(item);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) {
      return "";
    }
    const today = churchFollowUpTodayIsoDate();
    if (nextDate < today) {
      return "Overdue";
    }
    if (nextDate === today) {
      return "Due today";
    }
    return "";
  }

  function churchFollowUpRecentAttentionSummary(): { overdue: number; dueToday: number } {
    if (activityAttentionSummary) {
      return {
        overdue: activityAttentionSummary.overdue,
        dueToday: activityAttentionSummary.dueToday,
      };
    }
    return activityAttentionRows.reduce<{ overdue: number; dueToday: number }>(
      (summary, item) => {
        if (cleanText(item?.activity_type) !== churchPastoralFollowUpPreset.activityType) {
          return summary;
        }
        const dueStatus = churchFollowUpDueStatus(item);
        if (dueStatus === "Overdue") {
          summary.overdue += 1;
        }
        if (dueStatus === "Due today") {
          summary.dueToday += 1;
        }
        return summary;
      },
      { overdue: 0, dueToday: 0 }
    );
  }

  function churchFollowUpAttentionItems() {
    return activityAttentionRows
      .filter(
        (item) =>
          cleanText(item?.activity_type) === churchPastoralFollowUpPreset.activityType &&
          Boolean(churchFollowUpDueStatus(item))
      )
      .sort((left, right) => {
        const leftDate = churchFollowUpNextDateValue(left);
        const rightDate = churchFollowUpNextDateValue(right);
        const dateOrder = leftDate.localeCompare(rightDate);
        if (dateOrder !== 0) {
          return dateOrder;
        }
        return cleanText(right?.event_id).localeCompare(cleanText(left?.event_id));
      })
      .slice(0, 5);
  }

  function churchFollowUpAttentionQueueNote(displayedCount: number): string {
    const queueTotal = activityAttentionSummary?.queueTotal ?? displayedCount;
    const rowTotal = activityAttentionSummary?.rowTotal ?? displayedCount;
    const resolvedReferenceTotal = activityAttentionSummary?.resolvedReferenceTotal ?? 0;
    const resolvedReferenceScanScope = activityAttentionSummary?.resolvedReferenceScanScope ?? "";
    const resolvedReferenceScannedActivityTotal = activityAttentionSummary?.resolvedReferenceScannedActivityTotal ?? 0;
    const resolvedReferenceScanWindowExhausted = activityAttentionSummary?.resolvedReferenceScanWindowExhausted ?? false;
    const scanLimit = activityAttentionSummary?.scanLimit ?? 0;
    const scannedActivityTotal = activityAttentionSummary?.scannedActivityTotal ?? 0;
    const scanWindowExhausted = activityAttentionSummary?.scanWindowExhausted ?? false;
    const shownTotal = Math.min(displayedCount, rowTotal || displayedCount, queueTotal || displayedCount);
    const recordWord = queueTotal === 1 ? "record" : "records";
    const parts = [
      `Showing ${shownTotal} of ${queueTotal || shownTotal} due or overdue pastoral follow-up ${recordWord} from the admin due queue.`,
    ];
    if (scanLimit > 0) {
      const scannedText = scannedActivityTotal > 0 ? `${scannedActivityTotal} of up to ${scanLimit}` : `up to ${scanLimit}`;
      parts.push(`Scanned ${scannedText} admin activity records for this queue.`);
    }
    if (scanWindowExhausted) {
      parts.push("The scan window was full, so older admin activity records may sit outside this queue.");
    }
    if (resolvedReferenceTotal > 0) {
      parts.push(
        `${resolvedReferenceTotal} due ${resolvedReferenceTotal === 1 ? "record has" : "records have"} already been hidden because a later update referenced ${resolvedReferenceTotal === 1 ? "it" : "them"}.`
      );
    }
    if (resolvedReferenceScanScope === "domain_activity_scan") {
      parts.push("Node-filtered due rows use a domain-wide resolved-record scan, so domain-level updates can clear branch cues.");
    }
    if (resolvedReferenceScanWindowExhausted) {
      const resolvedScannedText = resolvedReferenceScannedActivityTotal > 0 ? `${resolvedReferenceScannedActivityTotal} records` : "the bounded activity window";
      parts.push(`The resolved-record scan checked ${resolvedScannedText}, so older due or resolving records may need manual review.`);
    }
    parts.push("This cue has not sent a reminder.");
    return parts.join(" ");
  }

  function applyChurchRecentFollowUpRecordUpdate(item: ActivityRecordRow) {
    const subjectUserId = cleanText(item?.subject_user_id);
    const existingReference = cleanText(item?.evidence_reference);
    const eventId = cleanText(item?.event_id);
    const communityNodeId = cleanText(item?.community_node_id);
    const recordReference = eventId ? `activity-record:${eventId}` : "";
    const evidenceReference = [existingReference, recordReference]
      .filter(Boolean)
      .join("; ")
      .slice(0, 512);
    applyChurchActivityPreset(
      churchPastoralFollowUpPreset,
      subjectUserId,
      evidenceReference,
      communityNodeId,
      {
        eventId,
        subjectLabel: subjectReferenceLabel(item),
        nextDate: churchFollowUpNextDateValue(item),
        owner: churchFollowUpRowNoteValue(
          item,
          CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX
        ),
        communityNodeId,
        evidenceReference,
      }
    );
  }

  function churchFollowUpRecentDetails(item: ActivityRecordRow) {
    return [
      { label: "Owner", value: churchFollowUpRowNoteValue(item, CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX) },
      { label: "Route", value: churchFollowUpRowNoteValue(item, CHURCH_FOLLOW_UP_ROUTE_NOTE_PREFIX) },
      { label: "Outcome", value: churchFollowUpRowNoteValue(item, CHURCH_FOLLOW_UP_OUTCOME_NOTE_PREFIX) },
      { label: "Next", value: churchFollowUpNextDateValue(item) },
    ].filter((detail) => Boolean(detail.value));
  }

  return (
    <>
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
                        <div style={{ display: "grid", gap: 8 }}>
                          <div style={{ ...helperText(), fontSize: 13 }}>
                            Current record type:{" "}
                            <strong>
                              {activeRealLifeRecordTask === "beneficiary_outcome"
                                ? "Beneficiary outcome"
                                : "Activity"}
                            </strong>
                            .
                          </div>
                          <StableButton
                            type="button"
                            kind="secondary"
                            fullWidth
                            stableHeight={42}
                            debugId="community-domain-dashboard.real-life-record.type-toggle"
                            aria-expanded={realLifeRecordTypeChooserOpen}
                            aria-controls="community-domain-real-life-record-types"
                            onClick={() =>
                              setRealLifeRecordTypeChooserOpen((current) => !current)
                            }
                            style={{
                              justifyContent: "center",
                              fontSize: 13,
                              textTransform: "none",
                            }}
                          >
                            {realLifeRecordTypeChooserOpen
                              ? "Close record types"
                              : "Change record type"}
                          </StableButton>
                          {realLifeRecordTypeChooserOpen ? (
                            <div
                              id="community-domain-real-life-record-types"
                              data-debug-id="community-domain-dashboard.real-life-record.type-panel"
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
                                  setActivityRecordTaskChooserOpen(false);
                                  setActiveActivityRecordStage("person");
                                  setActivityRecordStageChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                  setRealLifeRecordTypeChooserOpen(false);
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
                                  setChurchFollowUpSourceCue(null);
                                  setActiveRealLifeRecordTask("beneficiary_outcome");
                                  setActiveBeneficiaryOutcomeTask("record");
                                  setBeneficiaryOutcomeTaskChooserOpen(false);
                                  setActiveBeneficiaryOutcomeRecordStage("person");
                                  setActivityRecordStageChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                  setRealLifeRecordTypeChooserOpen(false);
                                }}
                              >
                                Beneficiary outcome
                              </StableButton>
                            </div>
                          ) : null}
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

                        {activeActivityRecordTask === "record" &&
                        activeActivityRecordStage === "activity" ? (
                          <div
                            data-debug-id="community-domain-dashboard.source-activity-draft-summary"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {[
                              [
                                "Source activity",
                                cleanText(
                                  activityDraft.activity_label,
                                  "No activity label selected yet"
                                ),
                              ],
                              ["Evidence state", "Draft only"],
                              ["Confirmation", "Not requested yet"],
                              ["Boundary", "Not confirmed evidence"],
                            ].map(([label, value]) => (
                              <div
                                key={label}
                                style={{
                                  borderRadius: 12,
                                  border: "1px solid rgba(9,27,46,0.1)",
                                  background: "#FFFFFF",
                                  padding: "9px 10px",
                                  minWidth: 0,
                                }}
                              >
                                <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                  {label}
                                </div>
                                <div
                                  style={{
                                    color: "#091B2E",
                                    fontSize: 13,
                                    fontWeight: 900,
                                    lineHeight: 1.2,
                                    overflowWrap: "anywhere",
                                  }}
                                >
                                  {value}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {isChurchWorkflow &&
                        activeActivityRecordTask === "record" &&
                        activityDraft.activity_type === churchPastoralFollowUpPreset.activityType &&
                        churchFollowUpSourceCue ? (
                          <div
                            data-debug-id="community-domain-dashboard.activity-record-follow-up-source-cue"
                            style={{
                              display: "grid",
                              gap: 8,
                              borderRadius: 12,
                              border: "1px solid rgba(199,164,74,0.34)",
                              background: "rgba(199,164,74,0.1)",
                              padding: 12,
                            }}
                          >
                            <div style={sectionLabel()}>Closing follow-up cue</div>
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 6,
                              }}
                            >
                              <span style={statusBadge("subject")}>
                                {churchFollowUpSourceCue.subjectLabel}
                              </span>
                              {churchFollowUpSourceCue.nextDate ? (
                                <span style={statusBadge("follow_up")}>
                                  Due: {churchFollowUpSourceCue.nextDate}
                                </span>
                              ) : null}
                              {churchFollowUpSourceCue.owner ? (
                                <span style={statusBadge("follow_up")}>
                                  Owner: {churchFollowUpSourceCue.owner}
                                </span>
                              ) : null}
                              {churchFollowUpSourceCue.communityNodeId ? (
                                <span style={statusBadge("follow_up")}>
                                  Node: {churchFollowUpSourceCue.communityNodeId}
                                </span>
                              ) : null}
                              {churchFollowUpSourceCue.eventId ? (
                                <span style={statusBadge("follow_up")}>
                                  Source: {churchFollowUpSourceCue.eventId}
                                </span>
                              ) : null}
                            </div>
                            <div style={{ ...helperText(), fontSize: 12 }}>
                              Record what happened and the next safe step. Do not paste private counselling or safeguarding detail here.
                            </div>
                          </div>
                        ) : null}


                        {isSchoolWorkflow ? (
                          <div
                            data-debug-id="community-domain-dashboard.school-workflow-packet"
                            style={{
                              display: "grid",
                              gap: 8,
                              borderRadius: 12,
                              border: "1px solid rgba(199,164,74,0.28)",
                              background: "rgba(199,164,74,0.08)",
                              padding: 12,
                            }}
                          >
                            <div style={sectionLabel()}>School governance packet</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Use these presets for parent notice follow-up, fee follow-up, staff-scanned student arrival and dismissal, and school shop or supply notices. WhatsApp can carry prompts; GSN keeps the official school record.
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-pilot-readiness"
                              style={{
                                display: "grid",
                                gap: 8,
                                borderRadius: 10,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 10,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={sectionLabel()}>Pilot readiness</div>
                                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                                  <span style={statusBadge(schoolPilotReadyCount === schoolPilotReadinessRows.length ? "confirmed" : "pending")}>{schoolPilotReadinessStatus}</span>
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    stableHeight={30}
                                    debugId="community-domain-dashboard.school-pilot-readiness-copy"
                                    onClick={copySchoolPilotReadinessSheet}
                                    style={{ fontSize: 11, padding: "0 10px" }}
                                  >
                                    {schoolPilotReadinessCopied ? "Copied" : "Copy Readiness"}
                                  </StableButton>
                                </div>
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                  gap: 6,
                                }}
                              >
                                {schoolPilotReadinessRows.map((row) => (
                                  <div
                                    key={row.label}
                                    style={{
                                      display: "grid",
                                      gap: 4,
                                      borderRadius: 8,
                                      border: "1px solid rgba(9,27,46,0.08)",
                                      background: row.ready ? "rgba(28,95,59,0.08)" : "rgba(107,74,0,0.08)",
                                      padding: 8,
                                      minWidth: 0,
                                    }}
                                  >
                                    <div style={{ display: "flex", justifyContent: "space-between", gap: 6, flexWrap: "wrap" }}>
                                      <strong style={{ color: "#091B2E", fontSize: 12 }}>{row.label}</strong>
                                      <span style={statusBadge(row.ready ? "confirmed" : "pending")}>{row.ready ? "Ready" : "Setup"}</span>
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 12 }}>{row.value}</div>
                                  </div>
                                ))}
                              </div>
                              <div style={{ ...helperText(), fontSize: 12 }}>
                                This readiness view only reports setup status. It does not prove attendance, payment, parent consent, or message delivery.
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
                              {SCHOOL_ACTIVITY_PRESET_PACK.map((preset) => (
                                <StableButton
                                  key={preset.key}
                                  type="button"
                                  kind={
                                    activityDraft.activity_type === preset.activityType
                                      ? "primary"
                                      : "secondary"
                                  }
                                  stableHeight={44}
                                  disabled={busyActivityRecord}
                                  debugId={`community-domain-dashboard.school-workflow.${preset.key}`}
                                  onClick={() => applySchoolActivityPreset(preset)}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 12,
                                    textTransform: "none",
                                  }}
                                >
                                  {preset.label}
                                </StableButton>
                              ))}
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-adoption-boundary"
                              style={{
                                borderRadius: 10,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 10,
                                color: "#42526E",
                                fontSize: 12,
                                lineHeight: 1.45,
                              }}
                            >
                              Keep WhatsApp as a bridge, not the destination. GSN should hold acknowledgement, fee status, attendance record, and school shop or service visibility so parents have a reason to enter the school community.
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-notice-acknowledgement"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                                  <div style={sectionLabel()}>Parent notice acknowledgement</div>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Track who acknowledged official school notices inside GSN. This is not WhatsApp delivery proof, but it gives admin a clean follow-up list.
                                  </div>
                                </div>
                                <span style={statusBadge(domainNoticesLoading ? "loading" : "notice")}>
                                  {domainNoticesLoading ? "Loading" : `${visibleSchoolNoticeRows.length} notices`}
                                </span>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={30}
                                  disabled={!domainNotices.length || domainNoticesLoading}
                                  debugId="community-domain-dashboard.school-notice-sheet-copy"
                                  onClick={copySchoolNoticeAcknowledgementSheet}
                                  style={{ fontSize: 11, padding: "0 10px" }}
                                >
                                  {schoolNoticeSheetCopied ? "Copied" : "Copy Notice Sheet"}
                                </StableButton>
                              </div>
                              {visibleSchoolNoticeRows.length ? (
                                <div style={{ display: "grid", gap: 8 }}>
                                  {visibleSchoolNoticeRows.map((notice) => {
                                    const eventId = cleanText(notice?.event_id);
                                    const summary = notice?.acknowledgement_summary && typeof notice.acknowledgement_summary === "object" && !Array.isArray(notice.acknowledgement_summary)
                                      ? (notice.acknowledgement_summary as UnknownRecord)
                                      : {};
                                    const acknowledgedCount = cleanText(summary?.acknowledged_count, "0");
                                    const followUpCount = cleanText(summary?.not_acknowledged_count, "0");
                                    const viewerAcknowledged = Boolean(summary?.viewer_acknowledged);
                                    const publicPath = cleanText(notice?.public_path);
                                    return (
                                      <div
                                        key={eventId || cleanText(notice?.notice_id) || cleanText(notice?.body)}
                                        style={{
                                          display: "grid",
                                          gap: 8,
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.08)",
                                          padding: 10,
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                          <strong style={{ color: "#091B2E", fontSize: 13, lineHeight: 1.35 }}>
                                            {cleanText(notice?.body, "Official school notice")}
                                          </strong>
                                          <span style={statusBadge(cleanText(summary?.follow_up_status, "follow_up_needed"))}>
                                            Follow-up: {followUpCount}
                                          </span>
                                        </div>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                          <span style={statusBadge("acknowledged")}>Ack: {acknowledgedCount}</span>
                                          <span style={statusBadge(cleanText(notice?.active_board_status, "active"))}>
                                            {cleanText(notice?.active_board_status, "active")}
                                          </span>
                                          {publicPath ? <span style={statusBadge("public")}>Public QR on</span> : null}
                                        </div>
                                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                          <StableButton
                                            type="button"
                                            kind={viewerAcknowledged ? "secondary" : "primary"}
                                            stableHeight={38}
                                            disabled={!eventId || viewerAcknowledged || schoolNoticeAckBusyId === eventId}
                                            busy={schoolNoticeAckBusyId === eventId}
                                            debugId="community-domain-dashboard.school-notice-acknowledge"
                                            onClick={() => submitSchoolNoticeAcknowledgement(eventId)}
                                            style={{ fontSize: 12 }}
                                          >
                                            {viewerAcknowledged ? "Acknowledged" : "Acknowledge"}
                                          </StableButton>
                                          <StableButton
                                            type="button"
                                            kind="secondary"
                                            stableHeight={38}
                                            disabled={busyActivityRecord}
                                            debugId="community-domain-dashboard.school-notice-follow-up-preset"
                                            onClick={() => {
                                              const preset = SCHOOL_ACTIVITY_PRESET_PACK.find((item) => item.key === "parent_notice_follow_up") || SCHOOL_ACTIVITY_PRESET_PACK[0];
                                              applySchoolActivityPreset(preset);
                                            }}
                                            style={{ fontSize: 12 }}
                                          >
                                            Follow-up Preset
                                          </StableButton>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  No official school notices loaded yet. Use the Announcement Board to post the first notice.
                                </div>
                              )}
                              {schoolNoticeAckMessage ? (
                                <div style={{ ...helperText(), fontSize: 12, color: "#6B4A00" }}>
                                  {schoolNoticeAckMessage}
                                </div>
                              ) : null}
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-fee-tracker"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={sectionLabel()}>School-fee tracker</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Open an expected payment for a student/member. GSN can track proof and finance status, but this is not bank confirmation until review or reconciliation happens.
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                                  gap: 8,
                                  alignItems: "end",
                                }}
                              >
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Student/member</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-fee-member-select"
                                    value={schoolFeeSubjectUserId}
                                    disabled={busySchoolFeeExpectedPayment || !activeSchoolAttendanceMembers.length}
                                    onChange={(event) => setSchoolFeeSubjectUserId(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="">
                                      {activeSchoolAttendanceMembers.length ? "Select from roster" : "No active roster loaded"}
                                    </option>
                                    {activeSchoolAttendanceMembers.map((row) => {
                                      const userId = cleanText(row?.user_id);
                                      const label =
                                        cleanText(row?.user_display_name) ||
                                        cleanText(row?.user_email) ||
                                        (userId ? `Member ${userId}` : "Domain member");
                                      return userId ? (
                                        <option key={`fee-${userId}`} value={userId}>
                                          {label} - ID {userId}
                                        </option>
                                      ) : null;
                                    })}
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Amount</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-amount"
                                    value={schoolFeeAmount}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeAmount(event.target.value)}
                                    placeholder="e.g. 50000"
                                    inputMode="decimal"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Currency</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-currency"
                                    value={schoolFeeCurrency}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeCurrency(event.target.value.toUpperCase())}
                                    placeholder="NGN"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Term</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-term"
                                    value={schoolFeeTermLabel}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeTermLabel(event.target.value)}
                                    placeholder="2026 first term"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Campus</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-campus"
                                    value={schoolFeeCampusLabel}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeCampusLabel(event.target.value)}
                                    placeholder="Campus 3"
                                    style={billingInputStyle()}
                                  />
                                </label>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={42}
                                  disabled={busySchoolFeeExpectedPayment}
                                  busy={busySchoolFeeExpectedPayment}
                                  debugId="community-domain-dashboard.school-fee-open"
                                  onClick={submitSchoolFeeExpectedPayment}
                                  style={{ fontSize: 12 }}
                                >
                                  Open Fee Tracking
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={42}
                                  debugId="community-domain-dashboard.school-fee-open-roster"
                                  onClick={openMemberRoster}
                                  style={{ fontSize: 12 }}
                                >
                                  Open Roster
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={42}
                                  disabled={busySchoolFeeExpectedPayment || schoolFeeCoverageMissing === "0"}
                                  busy={busySchoolFeeExpectedPayment}
                                  debugId="community-domain-dashboard.school-fee-bulk-open-missing"
                                  onClick={submitBulkSchoolFeeExpectedPayments}
                                  style={{ fontSize: 12 }}
                                >
                                  Open Missing Fee Rows
                                </StableButton>
                              </div>
                              <div
                                data-debug-id="community-domain-dashboard.school-fee-proof-log"
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                                  gap: 8,
                                  alignItems: "end",
                                  borderRadius: 10,
                                  border: "1px solid rgba(177,132,31,0.22)",
                                  background: "#FFF8E8",
                                  padding: 10,
                                }}
                              >
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Proof row</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-fee-proof-row"
                                    value={schoolFeeProofExpectedPaymentId}
                                    disabled={busySchoolFeeExpectedPayment || !schoolFeeExpectedPaymentRows.length}
                                    onChange={(event) => setSchoolFeeProofExpectedPaymentId(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="">Select fee row</option>
                                    {schoolFeeExpectedPaymentRows.map((row) => {
                                      const rowId = cleanText(row?.id);
                                      const label =
                                        cleanText(row?.student_display_name) ||
                                        cleanText(row?.student_email) ||
                                        (cleanText(row?.subject_user_id) ? `Member ${cleanText(row?.subject_user_id)}` : "Student/member");
                                      return rowId ? (
                                        <option key={`fee-proof-${rowId}`} value={rowId}>
                                          {label} - {cleanText(row?.currency, "NGN")} {cleanText(row?.amount, "0")}
                                        </option>
                                      ) : null;
                                    })}
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Proof source</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-fee-proof-source"
                                    value={schoolFeeProofSource}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeProofSource(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="bank_transfer_slip">Bank transfer slip</option>
                                    <option value="whatsapp_screenshot">WhatsApp screenshot</option>
                                    <option value="cash_receipt">Cash receipt</option>
                                    <option value="pos_receipt">POS receipt</option>
                                    <option value="teller">Bank teller</option>
                                    <option value="manual_note">Manual note</option>
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Proof ref</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-proof-reference"
                                    value={schoolFeeProofReference}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeProofReference(event.target.value)}
                                    placeholder="Slip, teller, or chat ref"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Amount seen</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-fee-proof-amount"
                                    value={schoolFeeProofAmount}
                                    disabled={busySchoolFeeExpectedPayment}
                                    onChange={(event) => setSchoolFeeProofAmount(event.target.value)}
                                    placeholder="e.g. 25000"
                                    inputMode="decimal"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={42}
                                  disabled={busySchoolFeeExpectedPayment || !schoolFeeExpectedPaymentRows.length}
                                  busy={busySchoolFeeExpectedPayment}
                                  debugId="community-domain-dashboard.school-fee-proof-log-submit"
                                  onClick={submitSchoolFeePaymentProofLog}
                                  style={{ fontSize: 12 }}
                                >
                                  Log Proof
                                </StableButton>
                                <div style={{ ...helperText(), fontSize: 12, gridColumn: "1 / -1" }}>
                                  Proof changes the row to finance review only. It is not a receipt and not bank confirmation.
                                </div>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                <span style={statusBadge("pending")}>Pending: {schoolFeeStatusCounts.pending}</span>
                                <span style={statusBadge("partial")}>Partial: {schoolFeeStatusCounts.partial}</span>
                                <span style={statusBadge("proof")}>Proof: {schoolFeeStatusCounts.proofUploaded}</span>
                                <span style={statusBadge("confirmed")}>Confirmed: {schoolFeeStatusCounts.confirmed}</span>
                                <span style={statusBadge(schoolFeeCoverageMissing === "0" ? "confirmed" : "pending")}>
                                  Coverage: {schoolFeeCoverageReady}/{schoolFeeCoverageTotal}
                                </span>
                                <span style={statusBadge("proof")}>Proof coverage: {schoolFeeProofCoverageReady}/{schoolFeeCoverageTotal}</span>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={30}
                                  disabled={!schoolFeeExpectedPaymentRows.length}
                                  debugId="community-domain-dashboard.school-fee-tracker-copy"
                                  onClick={copySchoolFeeTrackerSheet}
                                  style={{ fontSize: 11, padding: "0 10px" }}
                                >
                                  {schoolFeeTrackerCopied ? "Copied" : "Copy Fee Sheet"}
                                </StableButton>
                              </div>
                              <div style={{ ...helperText(), fontSize: 12, color: schoolFeeCoverageMissing === "0" ? "#1C5F3B" : "#6B4A00" }}>
                                {schoolFeeCoverageMissing === "0"
                                  ? "Every tracked active student/member currently has a school-fee expected-payment row."
                                  : `Missing fee setup: ${schoolFeeCoverageMissing}${schoolFeeMissingIds.length ? ` - IDs ${schoolFeeMissingIds.join(", ")}` : ""}.`}
                              </div>
                              {visibleSchoolFeeRows.length ? (
                                <div style={{ display: "grid", gap: 6 }}>
                                  {visibleSchoolFeeRows.map((row) => {
                                    const id = cleanText(row?.id || row?.reference_display || row?.reference);
                                    const studentLabel =
                                      cleanText(row?.student_display_name) ||
                                      cleanText(row?.student_email) ||
                                      (cleanText(row?.subject_user_id) ? `Member ${cleanText(row?.subject_user_id)}` : "Student/member");
                                    const amountLabel = `${cleanText(row?.currency, "NGN")} ${cleanText(row?.amount, "0")}`;
                                    return (
                                      <div
                                        key={id || `${studentLabel}-${amountLabel}`}
                                        style={{
                                          display: "grid",
                                          gap: 4,
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.08)",
                                          padding: 8,
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                          <strong style={{ color: "#091B2E", fontSize: 13 }}>{studentLabel}</strong>
                                          <span style={statusBadge(cleanText(row?.status, "expected"))}>
                                            {cleanText(row?.payment_status_label, cleanText(row?.status, "Expected"))}
                                          </span>
                                        </div>
                                        <div style={{ ...helperText(), fontSize: 12 }}>
                                          {amountLabel} - {cleanText(row?.term_label, "Current term")} - Ref: {cleanText(row?.reference_display, "not opened")}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  No school-fee expected payments loaded yet.
                                </div>
                              )}
                              {schoolFeeMessage ? (
                                <div style={{ ...helperText(), fontSize: 12, color: "#6B4A00" }}>
                                  {schoolFeeMessage}
                                </div>
                              ) : null}
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-guardian-contact"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={sectionLabel()}>Parent/guardian contact reference</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Record who the school may contact for attendance, fee, and notice follow-up. This is not parent identity verification and does not send WhatsApp by itself.
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                                  gap: 8,
                                  alignItems: "end",
                                }}
                              >
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Student/member</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-guardian-member-select"
                                    value={schoolGuardianSubjectUserId}
                                    disabled={busySchoolGuardianContact || !activeSchoolAttendanceMembers.length}
                                    onChange={(event) => setSchoolGuardianSubjectUserId(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="">
                                      {activeSchoolAttendanceMembers.length ? "Select from roster" : "No active roster loaded"}
                                    </option>
                                    {activeSchoolAttendanceMembers.map((row) => {
                                      const userId = cleanText(row?.user_id);
                                      const label =
                                        cleanText(row?.user_display_name) ||
                                        cleanText(row?.user_email) ||
                                        (userId ? `Member ${userId}` : "Domain member");
                                      return userId ? (
                                        <option key={`guardian-${userId}`} value={userId}>
                                          {label} - ID {userId}
                                        </option>
                                      ) : null;
                                    })}
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Guardian label</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-guardian-label"
                                    value={schoolGuardianLabel}
                                    disabled={busySchoolGuardianContact}
                                    onChange={(event) => setSchoolGuardianLabel(event.target.value)}
                                    placeholder="Mrs Kanu"
                                    style={billingInputStyle()}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Relationship</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-guardian-relationship"
                                    value={schoolGuardianRelationship}
                                    disabled={busySchoolGuardianContact}
                                    onChange={(event) => setSchoolGuardianRelationship(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="parent">Parent</option>
                                    <option value="guardian">Guardian</option>
                                    <option value="family_representative">Family representative</option>
                                    <option value="authorized_pickup">Authorized pickup</option>
                                    <option value="sponsor">Sponsor</option>
                                    <option value="other">Other</option>
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Channel</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-guardian-channel"
                                    value={schoolGuardianChannel}
                                    disabled={busySchoolGuardianContact}
                                    onChange={(event) => setSchoolGuardianChannel(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="whatsapp">WhatsApp</option>
                                    <option value="email">Email</option>
                                    <option value="sms">SMS</option>
                                    <option value="phone">Phone</option>
                                    <option value="paper">Paper</option>
                                    <option value="gsn">GSN</option>
                                    <option value="manual">Manual</option>
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Reference label</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-guardian-reference"
                                    value={schoolGuardianReferenceLabel}
                                    disabled={busySchoolGuardianContact}
                                    onChange={(event) => setSchoolGuardianReferenceLabel(event.target.value)}
                                    placeholder="Parent WhatsApp on file"
                                    style={billingInputStyle()}
                                  />
                                </label>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={42}
                                  disabled={busySchoolGuardianContact}
                                  busy={busySchoolGuardianContact}
                                  debugId="community-domain-dashboard.school-guardian-contact-record"
                                  onClick={submitSchoolGuardianContact}
                                  style={{ fontSize: 12 }}
                                >
                                  Record Contact
                                </StableButton>
                                <span style={statusBadge("proof")}>Active contacts: {schoolGuardianContactActiveCount}</span>
                                <span style={statusBadge(schoolGuardianCoverageMissing === "0" ? "confirmed" : "pending")}>
                                  Coverage: {schoolGuardianCoverageReady}/{schoolGuardianCoverageTotal}
                                </span>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={30}
                                  disabled={!schoolGuardianContactRows.length}
                                  debugId="community-domain-dashboard.school-guardian-contact-copy"
                                  onClick={copySchoolGuardianContactSheet}
                                  style={{ fontSize: 11, padding: "0 10px" }}
                                >
                                  {schoolGuardianContactSheetCopied ? "Copied" : "Copy Contact Sheet"}
                                </StableButton>
                              </div>
                              <div style={{ ...helperText(), fontSize: 12, color: schoolGuardianCoverageMissing === "0" ? "#1C5F3B" : "#6B4A00" }}>
                                {schoolGuardianCoverageMissing === "0"
                                  ? "Every tracked active student/member currently has an active contact reference."
                                  : `Missing active contact: ${schoolGuardianCoverageMissing}${schoolGuardianMissingIds.length ? ` - IDs ${schoolGuardianMissingIds.join(", ")}` : ""}.`}
                              </div>
                              {visibleSchoolGuardianContactRows.length ? (
                                <div style={{ display: "grid", gap: 6 }}>
                                  {visibleSchoolGuardianContactRows.map((row) => {
                                    const rowId = cleanText(row?.event_id);
                                    return (
                                      <div
                                        key={rowId || `${cleanText(row?.subject_user_id)}-${cleanText(row?.guardian_label)}`}
                                        style={{
                                          display: "grid",
                                          gap: 4,
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.08)",
                                          padding: 8,
                                        }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                                          <strong style={{ color: "#091B2E", fontSize: 13 }}>
                                            {cleanText(row?.guardian_label, "Parent/guardian")}
                                          </strong>
                                          <span style={statusBadge(cleanText(row?.contact_status, "on_file_unverified"))}>
                                            {cleanText(row?.channel, "manual")}
                                          </span>
                                        </div>
                                        <div style={{ ...helperText(), fontSize: 12 }}>
                                          Student/member ID {cleanText(row?.subject_user_id, "-")} - {cleanText(row?.destination_reference_label, "Reference on file")}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  No parent/guardian contact references recorded yet.
                                </div>
                              )}
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.school-staff-attendance"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={sectionLabel()}>Staff-scanned attendance</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                For schools where students cannot carry phones. Open a staff-scan window, then record arrival by student/member user ID. This does not send parent WhatsApp yet.
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={40}
                                  disabled={busyAttendanceSession}
                                  debugId="community-domain-dashboard.school-staff-attendance-prepare"
                                  onClick={prepareSchoolStaffAttendanceWindow}
                                  style={{ fontSize: 12 }}
                                >
                                  Prepare Arrival Window
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={40}
                                  disabled={busyAttendanceSession}
                                  debugId="community-domain-dashboard.school-staff-attendance-prepare-dismissal"
                                  onClick={() => prepareSchoolStaffAttendanceWindowPreset("dismissal")}
                                  style={{ fontSize: 12 }}
                                >
                                  Prepare Dismissal Window
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={40}
                                  disabled={busyAttendanceSession || attendanceSessionDraft.method !== "staff_scan"}
                                  busy={busyAttendanceSession && attendanceSessionDraft.method === "staff_scan"}
                                  debugId="community-domain-dashboard.school-staff-attendance-open"
                                  onClick={generateAttendanceSession}
                                  style={{ fontSize: 12 }}
                                >
                                  Open Staff Window
                                </StableButton>
                              </div>
                              <div style={{ ...helperText(), fontSize: 12 }}>
                                Prepared window: {attendanceSessionDraft.method === "staff_scan" ? cleanText(attendanceSessionDraft.programme_label, "School staff window") : "Choose arrival or dismissal first"}. Parent notification remains a separate school log until a provider is connected.
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 190px), 1fr))",
                                  gap: 8,
                                  alignItems: "end",
                                }}
                              >
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Choose active student/member</span>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-staff-attendance-member-select"
                                    value={schoolStaffScanSubjectUserId}
                                    disabled={schoolStaffScanBusy || busyAttendanceSession || !activeSchoolAttendanceMembers.length}
                                    onChange={(event) => setSchoolStaffScanSubjectUserId(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="">
                                      {activeSchoolAttendanceMembers.length ? "Select from roster" : "No active roster loaded"}
                                    </option>
                                    {activeSchoolAttendanceMembers.map((row) => {
                                      const userId = cleanText(row?.user_id);
                                      const label =
                                        cleanText(row?.user_display_name) ||
                                        cleanText(row?.user_email) ||
                                        (userId ? `Member ${userId}` : "Domain member");
                                      return userId ? (
                                        <option key={userId} value={userId}>
                                          {label} - ID {userId}
                                        </option>
                                      ) : null;
                                    })}
                                  </select>
                                </label>
                                <label style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                  <span style={sectionLabel()}>Or enter user ID</span>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-staff-attendance-subject"
                                    value={schoolStaffScanSubjectUserId}
                                    disabled={schoolStaffScanBusy || busyAttendanceSession}
                                    onChange={(event) => setSchoolStaffScanSubjectUserId(event.target.value)}
                                    placeholder="e.g. 1024"
                                    style={billingInputStyle()}
                                  />
                                </label>
                              </div>
                              <div
                                data-debug-id="community-domain-dashboard.school-attendance-card-preview"
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  borderRadius: 10,
                                  border: "1px solid rgba(9,27,46,0.08)",
                                  background: "rgba(9,27,46,0.03)",
                                  padding: 10,
                                }}
                              >
                                <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                                  {selectedSchoolAttendanceCardCode ? (
                                    <div
                                      style={{
                                        width: 96,
                                        height: 96,
                                        borderRadius: 10,
                                        background: "#FFFFFF",
                                        display: "grid",
                                        placeItems: "center",
                                        border: "1px solid rgba(9,27,46,0.08)",
                                        flex: "0 0 auto",
                                      }}
                                    >
                                      <QRCodeSVG value={selectedSchoolAttendanceCardCode} size={76} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                                    </div>
                                  ) : null}
                                  <div style={{ display: "grid", gap: 6, minWidth: 0, flex: "1 1 220px" }}>
                                    <div style={sectionLabel()}>Student ID card code</div>
                                    <div style={{ ...helperText(), fontSize: 12 }}>
                                      {selectedSchoolAttendanceCardCode
                                        ? selectedSchoolAttendanceCardCode
                                        : "Select a roster member to preview the printable GSN attendance code."}
                                    </div>
                                    <input
                                      data-debug-id="community-domain-dashboard.school-staff-attendance-card-code"
                                      value={schoolStaffScanCardCode}
                                      disabled={schoolStaffScanBusy || busyAttendanceSession}
                                      onChange={(event) => setSchoolStaffScanCardCode(event.target.value)}
                                      placeholder="Scan or paste card code"
                                      style={billingInputStyle()}
                                    />
                                  </div>
                                </div>
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  The QR/code identifies the GSN roster member only. Staff must be signed in to record it; it does not publish student details or message parents by itself.
                                </div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                  <span style={statusBadge(schoolAttendanceCardMissingTotal === 0 ? "confirmed" : "pending")}>
                                    Cards ready: {schoolAttendanceCardRows.length}/{activeSchoolAttendanceMembers.length}
                                  </span>
                                  <span style={statusBadge("proof")}>No student phone required</span>
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    stableHeight={30}
                                    disabled={!schoolAttendanceCardRows.length}
                                    debugId="community-domain-dashboard.school-attendance-card-sheet-copy"
                                    onClick={copySchoolAttendanceCardSheet}
                                    style={{ fontSize: 11, padding: "0 10px" }}
                                  >
                                    {schoolAttendanceCardSheetCopied ? "Copied" : "Copy Card Sheet"}
                                  </StableButton>
                                </div>
                                {schoolAttendanceCardMissingTotal ? (
                                  <div style={{ ...helperText(), fontSize: 12, color: "#6B4A00" }}>
                                    Missing card codes for {schoolAttendanceCardMissingTotal} active roster row(s). Refresh roster before printing cards.
                                  </div>
                                ) : null}
                                {visibleSchoolAttendanceCardRows.length ? (
                                  <div
                                    data-debug-id="community-domain-dashboard.school-attendance-card-sheet"
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
                                      gap: 8,
                                    }}
                                  >
                                    {visibleSchoolAttendanceCardRows.map((row) => {
                                      const userId = cleanText(row?.user_id);
                                      const cardCode = cleanText(row?.attendance_card_code);
                                      const studentLabel =
                                        cleanText(row?.user_display_name) ||
                                        cleanText(row?.user_email) ||
                                        (userId ? `Member ${userId}` : "Student/member");
                                      return cardCode ? (
                                        <div
                                          key={`attendance-card-${cardCode}`}
                                          style={{
                                            display: "grid",
                                            gridTemplateColumns: "58px minmax(0, 1fr)",
                                            gap: 8,
                                            alignItems: "center",
                                            borderRadius: 8,
                                            border: "1px solid rgba(9,27,46,0.08)",
                                            background: "#FFFFFF",
                                            padding: 8,
                                            minHeight: 74,
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 58,
                                              height: 58,
                                              display: "grid",
                                              placeItems: "center",
                                              borderRadius: 8,
                                              border: "1px solid rgba(9,27,46,0.08)",
                                              background: "#FFFFFF",
                                            }}
                                          >
                                            <QRCodeSVG value={cardCode} size={48} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                                          </div>
                                          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
                                            <strong style={{ color: "#091B2E", fontSize: 12, overflowWrap: "anywhere" }}>
                                              {studentLabel}
                                            </strong>
                                            <span style={{ ...helperText(), fontSize: 11, overflowWrap: "anywhere" }}>
                                              ID {userId || "-"} - {cardCode}
                                            </span>
                                          </div>
                                        </div>
                                      ) : null;
                                    })}
                                  </div>
                                ) : null}
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={42}
                                  disabled={schoolStaffScanBusy || busyAttendanceSession || !latestAttendanceSession}
                                  busy={schoolStaffScanBusy}
                                  debugId="community-domain-dashboard.school-staff-attendance-record"
                                  onClick={submitSchoolStaffScanAttendance}
                                  style={{ fontSize: 12 }}
                                >
                                  Record Arrival
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={42}
                                  disabled={schoolStaffScanBusy || busyAttendanceSession || !latestAttendanceSession || !(schoolStaffScanCardCode || selectedSchoolAttendanceCardCode)}
                                  busy={schoolStaffScanBusy}
                                  debugId="community-domain-dashboard.school-staff-attendance-card-record"
                                  onClick={submitSchoolStaffScanCardAttendance}
                                  style={{ fontSize: 12 }}
                                >
                                  Record Card Scan
                                </StableButton>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={42}
                                  debugId="community-domain-dashboard.school-staff-attendance-open-roster"
                                  onClick={openMemberRoster}
                                  style={{ fontSize: 12 }}
                                >
                                  Open Roster
                                </StableButton>
                              </div>
                              <div
                                data-debug-id="community-domain-dashboard.school-parent-notification-log"
                                style={{
                                  display: "grid",
                                  gap: 10,
                                  borderRadius: 10,
                                  border: "1px solid rgba(9,27,46,0.08)",
                                  background: "#FFFFFF",
                                  padding: 10,
                                }}
                              >
                                <div style={sectionLabel()}>Parent notification log</div>
                                <div style={{ ...helperText(), fontSize: 12 }}>
                                  Record that staff prepared or sent a parent prompt outside GSN. This is not WhatsApp, SMS, or email delivery proof.
                                </div>
                                <div style={{ ...helperText(), fontSize: 12, color: selectedSchoolParentNotificationContact ? "#1C5F3B" : "#6B4A00" }}>
                                  {selectedSchoolParentNotificationContact
                                    ? `Roster contact: ${selectedSchoolParentNotificationContactLabel || "reference on file"}`
                                    : "No roster contact matched for the selected student/channel yet."}
                                </div>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  <select
                                    data-debug-id="community-domain-dashboard.school-parent-notification-channel"
                                    value={schoolParentNotificationChannel}
                                    disabled={schoolStaffScanBusy || busyAttendanceSession}
                                    onChange={(event) => setSchoolParentNotificationChannel(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="gsn">GSN prompt</option>
                                    <option value="whatsapp">WhatsApp outside GSN</option>
                                    <option value="email">Email outside GSN</option>
                                    <option value="sms">SMS outside GSN</option>
                                    <option value="phone">Phone call</option>
                                    <option value="paper">Paper note</option>
                                    <option value="manual">Manual log</option>
                                  </select>
                                  <select
                                    data-debug-id="community-domain-dashboard.school-parent-notification-status"
                                    value={schoolParentNotificationStatus}
                                    disabled={schoolStaffScanBusy || busyAttendanceSession}
                                    onChange={(event) => setSchoolParentNotificationStatus(event.target.value)}
                                    style={billingInputStyle()}
                                  >
                                    <option value="prepared">Prepared</option>
                                    <option value="sent_outside_gsn">Sent outside GSN</option>
                                    <option value="acknowledged_by_parent">Acknowledged by parent</option>
                                    <option value="failed">Failed</option>
                                    <option value="not_sent">Not sent</option>
                                  </select>
                                  <input
                                    data-debug-id="community-domain-dashboard.school-parent-notification-label"
                                    value={schoolParentNotificationLabel}
                                    disabled={schoolStaffScanBusy || busyAttendanceSession}
                                    onChange={(event) => setSchoolParentNotificationLabel(event.target.value)}
                                    placeholder="Parent/guardian reference"
                                    style={billingInputStyle()}
                                  />
                                </div>
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  stableHeight={40}
                                  disabled={schoolStaffScanBusy || busyAttendanceSession || !latestAttendanceSession || !schoolStaffScanSubjectUserId}
                                  busy={schoolStaffScanBusy}
                                  debugId="community-domain-dashboard.school-parent-notification-log-submit"
                                  onClick={submitSchoolParentNotificationLog}
                                  style={{ fontSize: 12 }}
                                >
                                  Log Parent Prompt
                                </StableButton>
                              </div>
                              <div style={{ ...helperText(), fontSize: 12 }}>
                                Latest window: {latestAttendanceSession ? cleanText(latestAttendanceSession.programme_label, "Attendance window") : "None opened yet"}. Recorded: {latestAttendanceCount}.
                              </div>
                              {schoolStaffScanMessage ? (
                                <div style={{ ...helperText(), fontSize: 12, color: "#6B4A00" }}>
                                  {schoolStaffScanMessage}
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                        {isChurchWorkflow ? (
                          <div
                            data-debug-id="community-domain-dashboard.church-workflow-packet"
                            style={{
                              display: "grid",
                              gap: 8,
                              borderRadius: 12,
                              border: "1px solid rgba(199,164,74,0.28)",
                              background: "rgba(199,164,74,0.08)",
                              padding: 12,
                            }}
                          >
                            <div style={sectionLabel()}>Church workflow packet</div>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Use these presets for pastoral care, welfare follow-up, member belonging, department handover, programme attendance, and contribution memory. GSN records the workflow memory only; the church keeps authority, privacy, and pastoral judgement.
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns:
                                  "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                                gap: 8,
                              }}
                            >
                              {CHURCH_ACTIVITY_PRESET_PACK.map((preset) => (
                                <StableButton
                                  key={preset.key}
                                  type="button"
                                  kind={
                                    activityDraft.activity_type === preset.activityType
                                      ? "primary"
                                      : "secondary"
                                  }
                                  stableHeight={44}
                                  disabled={busyActivityRecord}
                                  debugId={`community-domain-dashboard.church-workflow.${preset.key}`}
                                  onClick={() => applyChurchActivityPreset(preset)}
                                  style={{
                                    justifyContent: "center",
                                    fontSize: 12,
                                    textTransform: "none",
                                  }}
                                >
                                  {preset.label}
                                </StableButton>
                              ))}
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.church-live-attendance-qr"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                                  <div style={sectionLabel()}>Live attendance QR</div>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Open attendance for the current service or programme. Members scan the QR from a phone or screen and GSN records one signed-in presence check-in per member.
                                  </div>
                                </div>
                                {latestAttendanceSession ? (
                                  <span style={statusBadge(latestAttendanceActive ? "active" : "closed")}>
                                    {latestAttendanceActive ? "Open" : "Closed"} - {latestAttendanceCount} checked in
                                  </span>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                                  gap: 8,
                                }}
                              >
                                <input
                                  value={attendanceSessionDraft.programme_label}
                                  disabled={busyAttendanceSession}
                                  onChange={(event) =>
                                    updateAttendanceSessionDraft("programme_label", event.target.value)
                                  }
                                  placeholder="Service or programme name"
                                  style={billingInputStyle()}
                                />
                                <select
                                  value={attendanceSessionDraft.method}
                                  disabled={busyAttendanceSession}
                                  onChange={(event) =>
                                    updateAttendanceSessionDraft(
                                      "method",
                                      event.target.value === "bluetooth_proximity" ? "bluetooth_proximity" : "qr"
                                    )
                                  }
                                  style={billingInputStyle()}
                                >
                                  <option value="qr">QR check-in</option>
                                  <option value="bluetooth_proximity">Proximity record</option>
                                </select>
                                <input
                                  value={attendanceSessionDraft.window_minutes}
                                  disabled={busyAttendanceSession}
                                  onChange={(event) =>
                                    updateAttendanceSessionDraft("window_minutes", event.target.value)
                                  }
                                  placeholder="Window minutes"
                                  inputMode="numeric"
                                  style={billingInputStyle()}
                                />
                              </div>
                              <textarea
                                value={attendanceSessionDraft.note}
                                disabled={busyAttendanceSession}
                                onChange={(event) =>
                                  updateAttendanceSessionDraft("note", event.target.value)
                                }
                                placeholder="Internal note"
                                rows={2}
                                style={{ ...billingInputStyle(), resize: "vertical", minHeight: 70 }}
                              />
                              <StableButton
                                type="button"
                                kind="primary"
                                stableHeight={44}
                                disabled={busyAttendanceSession}
                                busy={busyAttendanceSession}
                                busyLabel="Opening..."
                                debugId="community-domain-dashboard.church-live-attendance-open"
                                onClick={generateAttendanceSession}
                                style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
                              >
                                Open Live Attendance QR
                              </StableButton>
                              {latestAttendanceSession && latestAttendancePublicUrl ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    gap: 10,
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                    <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                      Latest scan link
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 12, overflowWrap: "anywhere" }}>
                                      {latestAttendancePublicUrl}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.church-live-attendance-copy"
                                        onClick={copyLatestAttendanceLink}
                                        style={{ fontSize: 12, textTransform: "none" }}
                                      >
                                        {attendanceSessionCopied ? "Copied" : "Copy Link"}
                                      </StableButton>
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.church-live-attendance-open-page"
                                        onClick={() => window.open(latestAttendancePublicUrl, "_blank", "noopener,noreferrer")}
                                        style={{ fontSize: 12, textTransform: "none" }}
                                      >
                                        Open Page
                                      </StableButton>
                                    </div>
                                  </div>
                                  <div style={{ borderRadius: 14, border: "1px solid rgba(9,27,46,0.1)", padding: 8, background: "#FFFFFF" }}>
                                    <QRCodeSVG value={latestAttendancePublicUrl} size={104} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                                  </div>
                                </div>
                              ) : null}
                              {latestAttendanceFollowUpSnapshot ? (
                                <div
                                  data-debug-id="community-domain-dashboard.church-attendance-follow-up-snapshot"
                                  style={{
                                    display: "grid",
                                    gap: 8,
                                    borderRadius: 12,
                                    border: "1px solid rgba(9,27,46,0.1)",
                                    background: "#F8FBFF",
                                    padding: 10,
                                  }}
                                >
                                  <div style={sectionLabel()}>Care follow-up snapshot</div>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 112px), 1fr))",
                                      gap: 8,
                                    }}
                                  >
                                    {[
                                      ["Members", latestAttendanceExpectedCount],
                                      ["Present", latestAttendancePresentCount],
                                      ["Follow-up", latestAttendanceFollowUpCount],
                                    ].map(([summaryLabel, summaryValue]) => (
                                      <div
                                        key={summaryLabel}
                                        style={{
                                          borderRadius: 10,
                                          border: "1px solid rgba(9,27,46,0.08)",
                                          background: "#FFFFFF",
                                          padding: "8px 9px",
                                        }}
                                      >
                                        <div style={{ ...sectionLabel(), fontSize: 10 }}>{summaryLabel}</div>
                                        <div style={{ color: "#091B2E", fontWeight: 900, fontSize: 15 }}>
                                          {summaryValue}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {latestAttendanceFollowUpCandidateIds.length ? (
                                    <div
                                      data-debug-id="community-domain-dashboard.church-attendance-follow-up-candidate-ids"
                                      style={{
                                        display: "grid",
                                        gap: 6,
                                        borderRadius: 10,
                                        border: "1px solid rgba(9,27,46,0.08)",
                                        background: "#FFFFFF",
                                        padding: "8px 9px",
                                      }}
                                    >
                                      <div style={{ ...sectionLabel(), fontSize: 10 }}>Private candidate IDs</div>
                                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                        {latestAttendanceVisibleCandidateIds.map((candidateId) => (
                                          <StableButton
                                            key={candidateId}
                                            type="button"
                                            kind="secondary"
                                            stableHeight={28}
                                            debugId="community-domain-dashboard.church-attendance-follow-up-candidate-select"
                                            onClick={() =>
                                              applyChurchActivityPreset(
                                                churchPastoralFollowUpPreset,
                                                candidateId,
                                                latestAttendanceEvidenceReference
                                              )
                                            }
                                            style={{
                                              borderRadius: 999,
                                              border: "1px solid rgba(185,143,46,0.28)",
                                              background: "#FFF8E3",
                                              color: "#091B2E",
                                              fontSize: 11,
                                              fontWeight: 800,
                                              padding: "4px 7px",
                                              textTransform: "none",
                                            }}
                                          >
                                            {candidateId}
                                          </StableButton>
                                        ))}
                                        {latestAttendanceHiddenCandidateCount ? (
                                          <span style={{ ...helperText(), fontSize: 11 }}>
                                            +{latestAttendanceHiddenCandidateCount} more
                                          </span>
                                        ) : null}
                                      </div>
                                      <StableButton
                                        kind="secondary"
                                        stableHeight={34}
                                        debugId="community-domain-dashboard.church-attendance-follow-up-review-roster"
                                        onClick={openMemberRoster}
                                        style={{ justifySelf: "start", fontSize: 12, textTransform: "none" }}
                                      >
                                        Review Roster
                                      </StableButton>
                                    </div>
                                  ) : null}
                                  <div
                                    data-debug-id="community-domain-dashboard.church-attendance-follow-up-route"
                                    style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                                  >
                                    {CHURCH_ATTENDANCE_FOLLOW_UP_ROUTE_STEPS.map((step) => (
                                      <span
                                        key={step}
                                        style={{
                                          borderRadius: 999,
                                          border: "1px solid rgba(9,27,46,0.1)",
                                          background: "#FFFFFF",
                                          color: "#35445A",
                                          fontSize: 11,
                                          fontWeight: 800,
                                          padding: "4px 7px",
                                        }}
                                      >
                                        {step}
                                      </span>
                                    ))}
                                  </div>
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    stableHeight={34}
                                    disabled={busyActivityRecord}
                                    debugId="community-domain-dashboard.church-attendance-record-follow-up"
                                    onClick={() =>
                                      applyChurchActivityPreset(
                                        churchPastoralFollowUpPreset,
                                        "",
                                        latestAttendanceEvidenceReference
                                      )
                                    }
                                    style={{ justifySelf: "start", fontSize: 12, textTransform: "none" }}
                                  >
                                    Record Follow-up
                                  </StableButton>
                                  <div style={{ ...helperText(), fontSize: 12 }}>
                                    {cleanText(
                                      latestAttendanceFollowUpSnapshot.next_step,
                                      "Use the private church roster to resolve the candidate user IDs for welcome-team care checks. Do not publish an absence list."
                                    )}
                                  </div>
                                  <div style={{ ...helperText(), fontSize: 11 }}>
                                    {cleanText(
                                      latestAttendanceFollowUpSnapshot.boundary,
                                      "Admin-only snapshot. It shows private candidate IDs without member names or contact details, and it does not replace pastoral judgement."
                                    )}
                                  </div>
                                </div>
                              ) : null}
                              <div style={{ ...helperText(), fontSize: 12 }}>
                                Bluetooth is only an explicit proximity record when the browser supports it. QR remains the standard live attendance path.
                              </div>
                            </div>
                            <div
                              data-debug-id="community-domain-dashboard.church-response-qr"
                              style={{
                                display: "grid",
                                gap: 10,
                                borderRadius: 12,
                                border: "1px solid rgba(9,27,46,0.1)",
                                background: "#FFFFFF",
                                padding: 12,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                                <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                                  <div style={sectionLabel()}>Response QR</div>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Open a QR after a service, meeting, or announcement so members can send questions, comments, needs, suggestions, and private follow-up requests into GSN.
                                  </div>
                                </div>
                                {latestResponseChannel ? (
                                  <span style={statusBadge(latestResponseActive ? "active" : "closed")}>
                                    {latestResponseActive ? "Open" : "Closed"} - {latestResponseCount} responses
                                  </span>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  display: "grid",
                                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 160px), 1fr))",
                                  gap: 8,
                                }}
                              >
                                <input
                                  value={responseChannelDraft.title}
                                  disabled={busyResponseChannel}
                                  onChange={(event) =>
                                    updateResponseChannelDraft("title", event.target.value)
                                  }
                                  placeholder="Response box name"
                                  style={billingInputStyle()}
                                />
                                <select
                                  value={responseChannelDraft.source_kind}
                                  disabled={busyResponseChannel}
                                  onChange={(event) =>
                                    updateResponseChannelDraft("source_kind", event.target.value)
                                  }
                                  style={billingInputStyle()}
                                >
                                  <option value="church_service">Church service</option>
                                  <option value="meeting">Meeting</option>
                                  <option value="programme">Programme</option>
                                  <option value="workshop">Workshop</option>
                                  <option value="announcement">Announcement</option>
                                  <option value="demand_box">DemandBox</option>
                                </select>
                                <input
                                  value={responseChannelDraft.window_days}
                                  disabled={busyResponseChannel}
                                  onChange={(event) =>
                                    updateResponseChannelDraft("window_days", event.target.value)
                                  }
                                  placeholder="Open days"
                                  inputMode="numeric"
                                  style={billingInputStyle()}
                                />
                              </div>
                              <textarea
                                value={responseChannelDraft.prompt}
                                disabled={busyResponseChannel}
                                onChange={(event) =>
                                  updateResponseChannelDraft("prompt", event.target.value)
                                }
                                placeholder="Prompt shown to members"
                                rows={2}
                                style={{ ...billingInputStyle(), resize: "vertical", minHeight: 70 }}
                              />
                              <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 13, color: "#24364A", lineHeight: 1.35 }}>
                                <input
                                  type="checkbox"
                                  checked={Boolean(responseChannelDraft.allow_private_follow_up)}
                                  disabled={busyResponseChannel}
                                  onChange={(event) =>
                                    updateResponseChannelDraft("allow_private_follow_up", event.target.checked)
                                  }
                                />
                                Allow members to request private organiser follow-up.
                              </label>
                              <StableButton
                                type="button"
                                kind="primary"
                                stableHeight={44}
                                disabled={busyResponseChannel}
                                busy={busyResponseChannel}
                                busyLabel="Opening..."
                                debugId="community-domain-dashboard.church-response-open"
                                onClick={generateResponseChannel}
                                style={{ justifyContent: "center", fontSize: 13, textTransform: "none" }}
                              >
                                Open Response QR
                              </StableButton>
                              {latestResponseChannel && latestResponsePublicUrl ? (
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "minmax(0, 1fr) auto",
                                    gap: 10,
                                    alignItems: "center",
                                  }}
                                >
                                  <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                                    <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                      Latest response link
                                    </div>
                                    <div style={{ ...helperText(), fontSize: 12, overflowWrap: "anywhere" }}>
                                      {latestResponsePublicUrl}
                                    </div>
                                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.church-response-copy"
                                        onClick={copyLatestResponseLink}
                                        style={{ fontSize: 12, textTransform: "none" }}
                                      >
                                        {responseChannelCopied ? "Copied" : "Copy Link"}
                                      </StableButton>
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.church-response-whatsapp"
                                        onClick={shareLatestResponseViaWhatsApp}
                                        style={{ fontSize: 12, textTransform: "none" }}
                                      >
                                        WhatsApp Link
                                      </StableButton>
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.church-response-open-page"
                                        onClick={() => window.open(latestResponsePublicUrl, "_blank", "noopener,noreferrer")}
                                        style={{ fontSize: 12, textTransform: "none" }}
                                      >
                                        Open Page
                                      </StableButton>
                                    </div>
                                  </div>
                                  <div style={{ borderRadius: 14, border: "1px solid rgba(9,27,46,0.1)", padding: 8, background: "#FFFFFF" }}>
                                    <QRCodeSVG value={latestResponsePublicUrl} size={104} bgColor="#FFFFFF" fgColor="#07172C" level="M" marginSize={1} />
                                  </div>
                                </div>
                              ) : null}
                              <div style={{ ...helperText(), fontSize: 12 }}>
                                Latest private follow-up requests: {latestResponseFollowUpCount}. WhatsApp carries the link only; GSN keeps the official response record.
                              </div>
                            </div>
                          </div>
                        ) : null}

                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current activity view:{" "}
                          <strong>{activeActivityRecordTaskOption.label}</strong>.{" "}
                          {activeActivityRecordTaskOption.note}
                        </div>
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          stableHeight={42}
                          debugId="community-domain-dashboard.activity-task-toggle"
                          aria-expanded={activityRecordTaskChooserOpen}
                          aria-controls="community-domain-activity-record-packets"
                          onClick={() =>
                            setActivityRecordTaskChooserOpen((current) => !current)
                          }
                          style={{
                            justifyContent: "center",
                            fontSize: 13,
                            textTransform: "none",
                          }}
                        >
                          {activityRecordTaskChooserOpen
                            ? "Close activity views"
                            : "Change activity view"}
                        </StableButton>
                        {activityRecordTaskChooserOpen ? (
                          <div
                            id="community-domain-activity-record-packets"
                            data-debug-id="community-domain-dashboard.activity-task-panel"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {ACTIVITY_RECORD_TASK_OPTIONS.map((task) => (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={
                                  activeActivityRecordTask === task.key
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={44}
                                debugId={`community-domain-dashboard.activity-task.${task.key}`}
                                onClick={() => {
                                  setActiveActivityRecordTask(task.key);
                                  if (task.key === "record") {
                                    setActiveActivityRecordStage("person");
                                  }
                                  setActivityRecordTaskChooserOpen(false);
                                  setActivityRecordStageChooserOpen(false);
                                }}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {task.label}
                              </StableButton>
                            ))}
                          </div>
                        ) : null}

                        {activeActivityRecordTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Current step:{" "}
                                <strong>
                                  {ACTIVITY_RECORD_STAGE_OPTIONS.find(
                                    (stage) => stage.key === activeActivityRecordStage
                                  )?.label || "Person"}
                                </strong>
                                .{" "}
                                {ACTIVITY_RECORD_STAGE_OPTIONS.find(
                                  (stage) => stage.key === activeActivityRecordStage
                                )?.note || "Follow the next action to continue."}
                              </div>
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                stableHeight={42}
                                debugId="community-domain-dashboard.activity-record-stage-toggle"
                                aria-expanded={activityRecordStageChooserOpen}
                                aria-controls="community-domain-activity-record-stages"
                                onClick={() =>
                                  setActivityRecordStageChooserOpen(
                                    (current) => !current
                                  )
                                }
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {activityRecordStageChooserOpen
                                  ? "Close steps"
                                  : "Change step"}
                              </StableButton>
                              {activityRecordStageChooserOpen ? (
                                <div
                                  id="community-domain-activity-record-stages"
                                  data-debug-id="community-domain-dashboard.activity-record-stage-panel"
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
                                        onClick={() => {
                                          setActiveActivityRecordStage(stage.key);
                                          setActivityRecordStageChooserOpen(false);
                                        }}
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
                              ) : null}
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
                                  <input
                                    value={activityDraft.community_node_id}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateActivityDraft(
                                        "community_node_id",
                                        event.target.value
                                      )
                                    }
                                    placeholder="Community node id (optional)"
                                    inputMode="numeric"
                                    style={billingInputStyle()}
                                  />
                                  <select
                                    value={activityDraft.activity_type}
                                    disabled={busyActivityRecord}
                                    onChange={(event) => {
                                      const nextActivityType = event.target.value;
                                      updateActivityDraft(
                                        "activity_type",
                                        nextActivityType
                                      );
                                      if (nextActivityType !== churchPastoralFollowUpPreset.activityType) {
                                        setChurchFollowUpSourceCue(null);
                                      }
                                    }}
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
                                {activityDraft.evidence_reference ? (
                                  <div
                                    data-debug-id="community-domain-dashboard.activity-record-source-reference-preview"
                                    style={{
                                      borderRadius: 10,
                                      border: "1px solid rgba(9,27,46,0.08)",
                                      background: "#FFFFFF",
                                      padding: "8px 10px",
                                    }}
                                  >
                                    <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                      Source reference
                                    </div>
                                    <div
                                      style={{
                                        ...helperText(),
                                        fontSize: 12,
                                        overflowWrap: "anywhere",
                                      }}
                                    >
                                      {activityDraft.evidence_reference}
                                    </div>
                                  </div>
                                ) : null}
                                <StableButton
                                  type="button"
                                  kind="primary"
                                  stableHeight={44}
                                  debugId="community-domain-dashboard.activity-record-next.activity"
                                  onClick={() => {
                                    setActiveActivityRecordStage("activity");
                                    setActivityRecordStageChooserOpen(false);
                                  }}
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
                                    style={{ ...billingInputStyle(), fontSize: 14 }}
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
                                  onClick={() => {
                                    setActiveActivityRecordStage("evidence");
                                    setActivityRecordStageChooserOpen(false);
                                  }}
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
                                {isChurchWorkflow &&
                                activityDraft.activity_type === churchPastoralFollowUpPreset.activityType ? (
                                  <div
                                    data-debug-id="community-domain-dashboard.activity-record-follow-up-route-picker"
                                    style={{ display: "grid", gap: 6 }}
                                  >
                                    <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                      Follow-up route
                                    </div>
                                    <div
                                      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                                    >
                                      {CHURCH_ATTENDANCE_FOLLOW_UP_ROUTE_STEPS.map((step) => {
                                        const routeLine = `${CHURCH_FOLLOW_UP_ROUTE_NOTE_PREFIX} ${step}`;
                                        return (
                                          <StableButton
                                            key={step}
                                            type="button"
                                            kind={
                                              activityDraft.note.includes(routeLine)
                                                ? "primary"
                                                : "secondary"
                                            }
                                            stableHeight={34}
                                            disabled={busyActivityRecord}
                                            debugId={`community-domain-dashboard.activity-record-follow-up-route.${step.toLowerCase()}`}
                                            onClick={() => applyChurchFollowUpRouteNote(step)}
                                            style={{ fontSize: 12, textTransform: "none" }}
                                          >
                                            {step}
                                          </StableButton>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                                {isChurchWorkflow &&
                                activityDraft.activity_type === churchPastoralFollowUpPreset.activityType ? (
                                  <div
                                    data-debug-id="community-domain-dashboard.activity-record-follow-up-outcome-picker"
                                    style={{ display: "grid", gap: 6 }}
                                  >
                                    <div style={{ ...sectionLabel(), fontSize: 10 }}>
                                      Follow-up outcome
                                    </div>
                                    <div
                                      style={{ display: "flex", flexWrap: "wrap", gap: 6 }}
                                    >
                                      {CHURCH_ATTENDANCE_FOLLOW_UP_OUTCOMES.map((outcome) => {
                                        const outcomeLine = `${CHURCH_FOLLOW_UP_OUTCOME_NOTE_PREFIX} ${outcome}`;
                                        return (
                                          <StableButton
                                            key={outcome}
                                            type="button"
                                            kind={
                                              activityDraft.note.includes(outcomeLine)
                                                ? "primary"
                                                : "secondary"
                                            }
                                            stableHeight={34}
                                            disabled={busyActivityRecord}
                                            debugId={`community-domain-dashboard.activity-record-follow-up-outcome.${outcome
                                              .toLowerCase()
                                              .replace(/\s+/g, "-")}`}
                                            onClick={() => applyChurchFollowUpOutcomeNote(outcome)}
                                            style={{ fontSize: 12, textTransform: "none" }}
                                          >
                                            {outcome}
                                          </StableButton>
                                        );
                                      })}
                                    </div>
                                  </div>
                                ) : null}
                                {isChurchWorkflow &&
                                activityDraft.activity_type === churchPastoralFollowUpPreset.activityType ? (
                                  <input
                                    data-debug-id="community-domain-dashboard.activity-record-follow-up-owner"
                                    value={churchFollowUpNoteValue(
                                      CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX
                                    )}
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateChurchFollowUpNoteLine(
                                        CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX,
                                        event.target.value
                                      )
                                    }
                                    placeholder="Follow-up owner or team"
                                    style={billingInputStyle()}
                                  />
                                ) : null}
                                {isChurchWorkflow &&
                                activityDraft.activity_type === churchPastoralFollowUpPreset.activityType ? (
                                  <input
                                    data-debug-id="community-domain-dashboard.activity-record-follow-up-next-date"
                                    type="date"
                                    value={
                                      activityDraft.follow_up_due_at ||
                                      churchFollowUpNoteValue(
                                        CHURCH_FOLLOW_UP_NEXT_DATE_NOTE_PREFIX
                                      )
                                    }
                                    disabled={busyActivityRecord}
                                    onChange={(event) =>
                                      updateChurchFollowUpNextDate(event.target.value)
                                    }
                                    aria-label="Next follow-up date"
                                    style={billingInputStyle()}
                                  />
                                ) : null}
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
                            <div
                              data-debug-id="community-domain-dashboard.activity-recent-records"
                              style={{ display: "grid", gap: 8 }}
                            >
                              <div style={sectionLabel()}>Recent records</div>
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Recorded activity evidence is kept separate from confirmation and beneficiary outcome proof.
                              </div>
                              {(() => {
                                const followUpAttention = churchFollowUpRecentAttentionSummary();
                                const followUpAttentionItems = churchFollowUpAttentionItems();
                                const attentionTotal = followUpAttention.overdue + followUpAttention.dueToday;
                                return attentionTotal ? (
                                  <div
                                    data-debug-id="community-domain-dashboard.activity-recent-follow-up-attention-summary"
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: 8,
                                      alignItems: "center",
                                      padding: "8px 0",
                                      borderTop: "1px solid rgba(9,27,46,0.1)",
                                      borderBottom: "1px solid rgba(9,27,46,0.1)",
                                    }}
                                  >
                                    <strong style={{ color: "#091B2E", fontSize: 14 }}>
                                      Follow-up attention
                                    </strong>
                                    {followUpAttention.overdue ? (
                                      <span style={statusBadge("Overdue")}>
                                        Overdue: {followUpAttention.overdue}
                                      </span>
                                    ) : null}
                                    {followUpAttention.dueToday ? (
                                      <span style={statusBadge("Due today")}>
                                        Due today: {followUpAttention.dueToday}
                                      </span>
                                    ) : null}
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      stableHeight={40}
                                      debugId="community-domain-dashboard.activity-recent-follow-up-record-update"
                                      onClick={() =>
                                        applyChurchActivityPreset(churchPastoralFollowUpPreset)
                                      }
                                    >
                                      Record follow-up update
                                    </StableButton>
                                    {followUpAttentionItems.length ? (
                                      <div
                                        data-debug-id="community-domain-dashboard.activity-recent-follow-up-attention-queue"
                                        style={{
                                          display: "grid",
                                          flexBasis: "100%",
                                          gap: 6,
                                        }}
                                      >
                                        {followUpAttentionItems.map((item) => {
                                          const followUpDueStatus = churchFollowUpDueStatus(item);
                                          const nextDate = churchFollowUpNextDateValue(item);
                                          const owner = churchFollowUpRowNoteValue(
                                            item,
                                            CHURCH_FOLLOW_UP_OWNER_NOTE_PREFIX
                                          );
                                          return (
                                            <div
                                              key={cleanText(item?.event_id)}
                                              data-debug-id="community-domain-dashboard.activity-recent-follow-up-attention-queue-row"
                                              style={{
                                                display: "flex",
                                                flexWrap: "wrap",
                                                gap: 6,
                                                alignItems: "center",
                                                paddingTop: 6,
                                                borderTop: "1px solid rgba(9,27,46,0.08)",
                                              }}
                                            >
                                              <span style={statusBadge(followUpDueStatus)}>
                                                {followUpDueStatus}
                                              </span>
                                              <strong style={{ color: "#091B2E", fontSize: 13 }}>
                                                {subjectReferenceLabel(item)}
                                              </strong>
                                              {nextDate ? (
                                                <span style={statusBadge("follow_up")}>
                                                  Next: {nextDate}
                                                </span>
                                              ) : null}
                                              {owner ? (
                                                <span style={statusBadge("follow_up")}>
                                                  Owner: {owner}
                                                </span>
                                              ) : null}
                                              <StableButton
                                                type="button"
                                                kind="secondary"
                                                stableHeight={36}
                                                debugId="community-domain-dashboard.activity-recent-follow-up-attention-row-record-update"
                                                onClick={() =>
                                                  applyChurchRecentFollowUpRecordUpdate(item)
                                                }
                                              >
                                                Record this update
                                              </StableButton>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <span
                                      style={{
                                        ...helperText(),
                                        flexBasis: "100%",
                                        fontSize: 12,
                                      }}
                                    >
                                      {churchFollowUpAttentionQueueNote(followUpAttentionItems.length)}
                                    </span>
                                  </div>
                                ) : null;
                              })()}
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
                                    {subjectReferenceLabel(item)}
                                  </span>
                                  {cleanText(item?.activity_type) ===
                                  churchPastoralFollowUpPreset.activityType
                                    ? (() => {
                                        const followUpDetails = churchFollowUpRecentDetails(item);
                                        const followUpDueStatus = churchFollowUpDueStatus(item);
                                        return followUpDetails.length || followUpDueStatus ? (
                                          <div
                                            data-debug-id="community-domain-dashboard.activity-recent-follow-up-details"
                                            style={{
                                              display: "flex",
                                              flexBasis: "100%",
                                              flexWrap: "wrap",
                                              gap: 6,
                                            }}
                                          >
                                            {followUpDueStatus ? (
                                              <span
                                                data-debug-id="community-domain-dashboard.activity-recent-follow-up-due-status"
                                                style={statusBadge(followUpDueStatus)}
                                              >
                                                {followUpDueStatus}
                                              </span>
                                            ) : null}
                                            {followUpDetails.map((detail) => (
                                              <span
                                                key={detail.label}
                                                style={statusBadge("follow_up")}
                                              >
                                                {detail.label}: {detail.value}
                                              </span>
                                            ))}
                                            {followUpDueStatus ? (
                                              <StableButton
                                                type="button"
                                                kind="secondary"
                                                stableHeight={36}
                                                debugId="community-domain-dashboard.activity-recent-follow-up-row-record-update"
                                                onClick={() =>
                                                  applyChurchRecentFollowUpRecordUpdate(item)
                                                }
                                              >
                                                Record this update
                                              </StableButton>
                                            ) : null}
                                          </div>
                                        ) : null;
                                      })()
                                    : null}
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

                        <div style={{ ...helperText(), fontSize: 13 }}>
                          Current outcome view:{" "}
                          <strong>{activeBeneficiaryOutcomeTaskOption.label}</strong>.{" "}
                          {activeBeneficiaryOutcomeTaskOption.note}
                        </div>
                        <StableButton
                          type="button"
                          kind="secondary"
                          fullWidth
                          stableHeight={42}
                          debugId="community-domain-dashboard.beneficiary-outcome-task-toggle"
                          aria-expanded={beneficiaryOutcomeTaskChooserOpen}
                          aria-controls="community-domain-beneficiary-outcome-packets"
                          onClick={() =>
                            setBeneficiaryOutcomeTaskChooserOpen((current) => !current)
                          }
                          style={{
                            justifyContent: "center",
                            fontSize: 13,
                            textTransform: "none",
                          }}
                        >
                          {beneficiaryOutcomeTaskChooserOpen
                            ? "Close outcome views"
                            : "Change outcome view"}
                        </StableButton>
                        {beneficiaryOutcomeTaskChooserOpen ? (
                          <div
                            id="community-domain-beneficiary-outcome-packets"
                            data-debug-id="community-domain-dashboard.beneficiary-outcome-task-panel"
                            style={{
                              display: "grid",
                              gridTemplateColumns:
                                "repeat(auto-fit, minmax(min(100%, 150px), 1fr))",
                              gap: 8,
                            }}
                          >
                            {BENEFICIARY_OUTCOME_TASK_OPTIONS.map((task) => (
                              <StableButton
                                key={task.key}
                                type="button"
                                kind={
                                  activeBeneficiaryOutcomeTask === task.key
                                    ? "primary"
                                    : "secondary"
                                }
                                stableHeight={44}
                                debugId={`community-domain-dashboard.beneficiary-outcome-task.${task.key}`}
                                onClick={() => {
                                  setActiveBeneficiaryOutcomeTask(task.key);
                                  if (task.key === "record") {
                                    setActiveBeneficiaryOutcomeRecordStage("person");
                                  }
                                  setBeneficiaryOutcomeTaskChooserOpen(false);
                                  setBeneficiaryOutcomeRecordStageChooserOpen(false);
                                }}
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {task.label}
                              </StableButton>
                            ))}
                          </div>
                        ) : null}

                        {activeBeneficiaryOutcomeTask === "record" ? (
                          <>
                            <div
                              style={{
                                display: "grid",
                                gap: 8,
                              }}
                            >
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Current step:{" "}
                                <strong>
                                  {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.find(
                                    (stage) =>
                                      stage.key === activeBeneficiaryOutcomeRecordStage
                                  )?.label || "Person"}
                                </strong>
                                .{" "}
                                {BENEFICIARY_OUTCOME_RECORD_STAGE_OPTIONS.find(
                                  (stage) =>
                                    stage.key === activeBeneficiaryOutcomeRecordStage
                                )?.note || "Follow the next action to continue."}
                              </div>
                              <StableButton
                                type="button"
                                kind="secondary"
                                fullWidth
                                stableHeight={42}
                                debugId="community-domain-dashboard.beneficiary-outcome-record-stage-toggle"
                                aria-expanded={beneficiaryOutcomeRecordStageChooserOpen}
                                aria-controls="community-domain-beneficiary-outcome-record-stages"
                                onClick={() =>
                                  setBeneficiaryOutcomeRecordStageChooserOpen(
                                    (current) => !current
                                  )
                                }
                                style={{
                                  justifyContent: "center",
                                  fontSize: 13,
                                  textTransform: "none",
                                }}
                              >
                                {beneficiaryOutcomeRecordStageChooserOpen
                                  ? "Close steps"
                                  : "Change step"}
                              </StableButton>
                              {beneficiaryOutcomeRecordStageChooserOpen ? (
                                <div
                                  id="community-domain-beneficiary-outcome-record-stages"
                                  data-debug-id="community-domain-dashboard.beneficiary-outcome-record-stage-panel"
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
                                        stage.key ===
                                        activeBeneficiaryOutcomeRecordStage;
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
                                          onClick={() => {
                                            setActiveBeneficiaryOutcomeRecordStage(
                                              stage.key
                                            );
                                            setBeneficiaryOutcomeRecordStageChooserOpen(
                                              false
                                            );
                                          }}
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
                              ) : null}
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
                                  onClick={() => {
                                    setActiveBeneficiaryOutcomeRecordStage("change");
                                    setBeneficiaryOutcomeRecordStageChooserOpen(
                                      false
                                    );
                                  }}
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
                                  onClick={() => {
                                    setActiveBeneficiaryOutcomeRecordStage("proof");
                                    setBeneficiaryOutcomeRecordStageChooserOpen(
                                      false
                                    );
                                  }}
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
                              const outcomeRecentPacketChooserOpen = Boolean(
                                beneficiaryOutcomeRecentPacketChooserOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeRecentPacketOption =
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS.find(
                                  (packet) =>
                                    packet.key === activeOutcomeRecentPacket
                                ) ||
                                BENEFICIARY_OUTCOME_RECENT_PACKET_OPTIONS[0];
                              const outcomeSummaryDetailCount = [
                                latestResponse?.correction_note,
                                latestReview,
                                latestDeliveryReceipt,
                                latestDeliveryReceipt?.latest_correction,
                                latestProviderSendBlockedCheck,
                              ].filter(Boolean).length;
                              const outcomeSummaryDetailsOpen = Boolean(
                                beneficiaryOutcomeSummaryDetailsOpenById[
                                  outcomeEventId
                                ]
                              );
                              const requestedOutcomeConfirmationAction =
                                beneficiaryOutcomeConfirmationActionById[
                                  outcomeEventId
                                ] ||
                                (needsCorrectionReview ? "review" : "link");
                              const activeOutcomeConfirmationAction =
                                requestedOutcomeConfirmationAction === "review" &&
                                needsCorrectionReview
                                  ? "review"
                                  : "link";
                              const outcomeConfirmationActionChooserOpen =
                                Boolean(
                                  beneficiaryOutcomeConfirmationActionChooserOpenById[
                                    outcomeEventId
                                  ]
                                );
                              const outcomeConfirmationActionOpen = Boolean(
                                beneficiaryOutcomeConfirmationActionOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeConfirmationActionLabel =
                                activeOutcomeConfirmationAction === "review"
                                  ? "Review challenge"
                                  : "Create confirmation link";
                              const activeOutcomeConfirmationActionNote =
                                activeOutcomeConfirmationAction === "review"
                                  ? "Resolve the beneficiary challenge before treating this outcome as settled."
                                  : "Prepare one private confirmation link for the beneficiary response.";
                              const requestedOutcomeContactAction =
                                beneficiaryOutcomeContactActionById[
                                  outcomeEventId
                                ] || "record";
                              const activeOutcomeContactAction =
                                requestedOutcomeContactAction === "withdraw" &&
                                canWithdrawContactConsent
                                  ? "withdraw"
                                  : "record";
                              const outcomeContactActionChooserOpen = Boolean(
                                beneficiaryOutcomeContactActionChooserOpenById[
                                  outcomeEventId
                                ]
                              );
                              const outcomeContactActionOpen = Boolean(
                                beneficiaryOutcomeContactActionOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeContactActionLabel =
                                activeOutcomeContactAction === "withdraw"
                                  ? "Withdraw consent"
                                  : "Record contact/consent";
                              const activeOutcomeContactActionNote =
                                activeOutcomeContactAction === "withdraw"
                                  ? "Use this only when the beneficiary or authorized contact withdraws consent."
                                  : "Record or replace contact/consent evidence without exposing private contact details.";
                              const outcomeReceiptFormOpen = Boolean(
                                beneficiaryOutcomeReceiptFormOpenById[
                                  outcomeEventId
                                ]
                              );
                              const canOpenOutcomeReceiptForm =
                                canRecordManualDelivery ||
                                Boolean(latestDeliveryReceipt);
                              const activeOutcomeReceiptTaskLabel =
                                latestDeliveryReceipt
                                  ? "Record receipt correction"
                                  : canRecordManualDelivery
                                    ? "Record manual receipt"
                                    : "Wait for delivery readiness";
                              const activeOutcomeReceiptTaskNote =
                                latestDeliveryReceipt
                                  ? "Use this only to correct an existing receipt; the original stays in the audit trail."
                                  : canRecordManualDelivery
                                    ? "Open this after manual delivery has happened and record one receipt outcome."
                                    : "Prepare a confirmation link and keep active contact/consent evidence before recording delivery.";
                              const outcomeDeliveryNotesOpen = Boolean(
                                beneficiaryOutcomeDeliveryNotesOpenById[
                                  outcomeEventId
                                ]
                              );
                              const activeOutcomeDeliveryTaskLabel =
                                manualDeliveryBlockedByConsent
                                  ? "Resolve contact/consent first"
                                  : latestDeliveryPreparation
                                    ? "Delivery readiness recorded"
                                    : localDeliveryPack && !latestDeliveryPreparation
                                      ? "Session delivery pack ready"
                                      : "Prepare delivery pack";
                              const activeOutcomeDeliveryTaskNote =
                                manualDeliveryBlockedByConsent
                                  ? manualDeliveryBlockedText
                                  : latestDeliveryPreparation
                                    ? "Review readiness before recording any manual receipt."
                                    : localDeliveryPack && !latestDeliveryPreparation
                                      ? "GSN has prepared local delivery text in this session only."
                                      : "Use Confirm to create the private confirmation link and delivery text first.";
                              const outcomePrivacyLabel = cleanText(
                                item?.privacy_position ||
                                  item?.privacy_status ||
                                  item?.visibility,
                                "Private by default"
                              );
                              const outcomeChallengeLabel = compactStatus(
                                latestResponse?.challenge_status ||
                                  item?.challenge_status ||
                                  "No challenge recorded"
                              );
                              const outcomeCurrentnessLabel = cleanText(
                                item?.currentness_label ||
                                  item?.review_currentness_label ||
                                  (item?.follow_up_due_at
                                    ? `Review due ${noticeDateLabel(
                                        item?.follow_up_due_at
                                      )}`
                                    : ""),
                                "Current window"
                              );
                              const outcomeConsentLabel = compactStatus(
                                contactConsentStatus?.status ||
                                  latestContactConsent?.consent_basis ||
                                  "Not recorded"
                              );
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
                                    {subjectReferenceLabel(item)}
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
                                  data-debug-id="community-domain-dashboard.beneficiary-outcome-privacy-currentness-summary"
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(min(100%, 132px), 1fr))",
                                    gap: 8,
                                  }}
                                >
                                  {[
                                    ["Privacy", outcomePrivacyLabel],
                                    ["Challenge", outcomeChallengeLabel],
                                    ["Currentness", outcomeCurrentnessLabel],
                                    ["Consent", outcomeConsentLabel],
                                  ].map(([label, value]) => (
                                    <div
                                      key={label}
                                      style={{
                                        border: "1px solid rgba(9,27,46,0.1)",
                                        borderRadius: 16,
                                        padding: "8px 10px",
                                        background: "rgba(255,255,255,0.76)",
                                        minWidth: 0,
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
                                          lineHeight: 1.25,
                                        }}
                                      >
                                        {value}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                                <div style={{ display: "grid", gap: 8 }}>
                                  <div style={{ ...helperText(), fontSize: 13 }}>
                                    Current view:{" "}
                                    <strong>
                                      {activeOutcomeRecentPacketOption.label}
                                    </strong>
                                    . {activeOutcomeRecentPacketOption.note}
                                  </div>
                                  <StableButton
                                    type="button"
                                    kind="secondary"
                                    fullWidth
                                    stableHeight={38}
                                    debugId="community-domain-dashboard.beneficiary-outcome-recent-packet-toggle"
                                    aria-expanded={outcomeRecentPacketChooserOpen}
                                    aria-controls={`community-domain-beneficiary-outcome-recent-packets-${outcomeEventId}`}
                                    onClick={() =>
                                      setBeneficiaryOutcomeRecentPacketChooserOpenById(
                                        (current) => ({
                                          ...current,
                                          [outcomeEventId]: !current[outcomeEventId],
                                        })
                                      )
                                    }
                                    style={{
                                      justifyContent: "center",
                                      fontSize: 13,
                                      textTransform: "none",
                                    }}
                                  >
                                    {outcomeRecentPacketChooserOpen
                                      ? "Close views"
                                      : "Change view"}
                                  </StableButton>
                                  {outcomeRecentPacketChooserOpen ? (
                                    <div
                                      id={`community-domain-beneficiary-outcome-recent-packets-${outcomeEventId}`}
                                      data-debug-id="community-domain-dashboard.beneficiary-outcome-recent-packet-panel"
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
                                              kind={
                                                selected ? "primary" : "secondary"
                                              }
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
                                                setBeneficiaryOutcomeRecentPacketChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeSummaryDetailsOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeReceiptFormOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeDeliveryNotesOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
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
                                  ) : null}
                                </div>
                                {activeOutcomeRecentPacket === "summary" ? (
                                  <>
                                    <div style={{ display: "grid", gap: 8 }}>
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Summary details:{" "}
                                        <strong>
                                          {outcomeSummaryDetailCount
                                            ? `${outcomeSummaryDetailCount} recorded`
                                            : "none recorded"}
                                        </strong>
                                        . Keep this closed unless you need the
                                        audit context for this outcome.
                                      </div>
                                      {outcomeSummaryDetailCount ? (
                                        <StableButton
                                          type="button"
                                          kind="secondary"
                                          fullWidth
                                          stableHeight={38}
                                          debugId="community-domain-dashboard.beneficiary-outcome-summary-details-toggle"
                                          aria-expanded={outcomeSummaryDetailsOpen}
                                          aria-controls={`community-domain-beneficiary-outcome-summary-details-${outcomeEventId}`}
                                          onClick={() =>
                                            setBeneficiaryOutcomeSummaryDetailsOpenById(
                                              (current) => ({
                                                ...current,
                                                [outcomeEventId]:
                                                  !outcomeSummaryDetailsOpen,
                                              })
                                            )
                                          }
                                          style={{
                                            justifyContent: "center",
                                            fontSize: 13,
                                            textTransform: "none",
                                          }}
                                        >
                                          {outcomeSummaryDetailsOpen
                                            ? "Close summary details"
                                            : "Open summary details"}
                                        </StableButton>
                                      ) : null}
                                    </div>
                                    {outcomeSummaryDetailsOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-summary-details-${outcomeEventId}`}
                                        style={{ display: "grid", gap: 6 }}
                                      >
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
                                      </div>
                                    ) : null}
                                  </>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current confirmation task:{" "}
                                      <strong>
                                        {activeOutcomeConfirmationActionLabel}
                                      </strong>
                                      . {activeOutcomeConfirmationActionNote}
                                    </div>
                                    {needsCorrectionReview ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-confirmation-action-toggle"
                                        aria-expanded={
                                          outcomeConfirmationActionChooserOpen
                                        }
                                        aria-controls={`community-domain-beneficiary-outcome-confirmation-actions-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeConfirmationActionChooserOpen
                                          ? "Close confirmation actions"
                                          : "Change confirmation action"}
                                      </StableButton>
                                    ) : null}
                                    {needsCorrectionReview &&
                                    outcomeConfirmationActionChooserOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-confirmation-actions-${outcomeEventId}`}
                                        data-debug-id="community-domain-dashboard.beneficiary-outcome-confirmation-action-panel"
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                          gap: 8,
                                        }}
                                      >
                                        {[
                                          ["review", "Review challenge"],
                                          ["link", "Create link"],
                                        ].map(([action, label]) => {
                                          const actionKey =
                                            action as BeneficiaryOutcomeConfirmationActionKey;
                                          return (
                                            <StableButton
                                              key={actionKey}
                                              type="button"
                                              kind={
                                                activeOutcomeConfirmationAction ===
                                                actionKey
                                                  ? "primary"
                                                  : "secondary"
                                              }
                                              stableHeight={38}
                                              fullWidth
                                              aria-pressed={
                                                activeOutcomeConfirmationAction ===
                                                actionKey
                                              }
                                              debugId={`community-domain-dashboard.beneficiary-outcome-confirmation-action.${actionKey}`}
                                              onClick={() => {
                                                setBeneficiaryOutcomeConfirmationActionById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: actionKey,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeConfirmationActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                              }}
                                              style={{
                                                justifyContent: "center",
                                                fontSize: 13,
                                                textTransform: "none",
                                              }}
                                            >
                                              {label}
                                            </StableButton>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-confirmation-action-form-toggle"
                                      aria-expanded={outcomeConfirmationActionOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeConfirmationActionOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeConfirmationActionOpen
                                        ? "Close confirmation action"
                                        : "Open confirmation action"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "confirmation" &&
                                activeOutcomeConfirmationAction === "review" &&
                                outcomeConfirmationActionOpen &&
                                needsCorrectionReview ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
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
                                {activeOutcomeRecentPacket === "confirmation" &&
                                activeOutcomeConfirmationAction === "link" &&
                                outcomeConfirmationActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-confirmation-action-form-${outcomeEventId}`}
                                    style={{ display: "grid", gap: 8 }}
                                  >
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
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current contact task:{" "}
                                      <strong>
                                        {activeOutcomeContactActionLabel}
                                      </strong>
                                      . {activeOutcomeContactActionNote}
                                    </div>
                                    {canWithdrawContactConsent ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-contact-action-toggle"
                                        aria-expanded={
                                          outcomeContactActionChooserOpen
                                        }
                                        aria-controls={`community-domain-beneficiary-outcome-contact-actions-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeContactActionChooserOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeContactActionChooserOpen
                                          ? "Close contact actions"
                                          : "Change contact action"}
                                      </StableButton>
                                    ) : null}
                                    {canWithdrawContactConsent &&
                                    outcomeContactActionChooserOpen ? (
                                      <div
                                        id={`community-domain-beneficiary-outcome-contact-actions-${outcomeEventId}`}
                                        data-debug-id="community-domain-dashboard.beneficiary-outcome-contact-action-panel"
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fit, minmax(min(100%, 155px), 1fr))",
                                          gap: 8,
                                        }}
                                      >
                                        {[
                                          [
                                            "record",
                                            "Record contact/consent",
                                          ],
                                          ["withdraw", "Withdraw consent"],
                                        ].map(([action, label]) => {
                                          const actionKey =
                                            action as BeneficiaryOutcomeContactActionKey;
                                          return (
                                            <StableButton
                                              key={actionKey}
                                              type="button"
                                              kind={
                                                activeOutcomeContactAction ===
                                                actionKey
                                                  ? "primary"
                                                  : "secondary"
                                              }
                                              stableHeight={38}
                                              fullWidth
                                              aria-pressed={
                                                activeOutcomeContactAction ===
                                                actionKey
                                              }
                                              debugId={`community-domain-dashboard.beneficiary-outcome-contact-action.${actionKey}`}
                                              onClick={() => {
                                                setBeneficiaryOutcomeContactActionById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: actionKey,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionChooserOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                                setBeneficiaryOutcomeContactActionOpenById(
                                                  (current) => ({
                                                    ...current,
                                                    [outcomeEventId]: false,
                                                  })
                                                );
                                              }}
                                              style={{
                                                justifyContent: "center",
                                                fontSize: 13,
                                                textTransform: "none",
                                              }}
                                            >
                                              {label}
                                            </StableButton>
                                          );
                                        })}
                                      </div>
                                    ) : null}
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-contact-action-form-toggle"
                                      aria-expanded={outcomeContactActionOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeContactActionOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeContactActionOpen
                                        ? "Close contact action"
                                        : "Open contact action"}
                                    </StableButton>
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "contact" &&
                                isAdmin &&
                                activeOutcomeContactAction === "record" &&
                                outcomeContactActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
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
                                canWithdrawContactConsent &&
                                activeOutcomeContactAction === "withdraw" &&
                                outcomeContactActionOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-contact-action-form-${outcomeEventId}`}
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
                                (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current delivery task:{" "}
                                      <strong>
                                        {activeOutcomeDeliveryTaskLabel}
                                      </strong>
                                      . {activeOutcomeDeliveryTaskNote}
                                    </div>
                                    <StableButton
                                      type="button"
                                      kind="secondary"
                                      fullWidth
                                      stableHeight={38}
                                      debugId="community-domain-dashboard.beneficiary-outcome-delivery-notes-toggle"
                                      aria-expanded={outcomeDeliveryNotesOpen}
                                      aria-controls={`community-domain-beneficiary-outcome-delivery-notes-${outcomeEventId}`}
                                      onClick={() =>
                                        setBeneficiaryOutcomeDeliveryNotesOpenById(
                                          (current) => ({
                                            ...current,
                                            [outcomeEventId]:
                                              !current[outcomeEventId],
                                          })
                                        )
                                      }
                                      style={{
                                        justifyContent: "center",
                                        fontSize: 13,
                                        textTransform: "none",
                                      }}
                                    >
                                      {outcomeDeliveryNotesOpen
                                        ? "Close delivery notes"
                                        : "Open delivery notes"}
                                    </StableButton>
                                  </div>
                                )}
                                {activeOutcomeRecentPacket === "delivery" &&
                                outcomeDeliveryNotesOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-delivery-notes-${outcomeEventId}`}
                                    style={{ display: "grid", gap: 6 }}
                                  >
                                    {manualDeliveryBlockedByConsent ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        {manualDeliveryBlockedText}
                                      </div>
                                    ) : null}
                                    {latestDeliveryPreparation ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        Current provider readiness contact/consent:{" "}
                                        <strong>{currentProviderContactStatus}</strong>.
                                        Prepared delivery recorded contact/consent as{" "}
                                        <strong>{preparedDeliveryContactStatus}</strong>.
                                        GSN still has not sent WhatsApp, SMS, or email.
                                      </div>
                                    ) : null}
                                    {!manualDeliveryBlockedByConsent &&
                                    !latestDeliveryPreparation &&
                                    !localDeliveryPack ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        No delivery pack is prepared for this outcome yet.
                                        Use Confirm to create the private confirmation
                                        link and delivery text before delivery checks.
                                      </div>
                                    ) : null}
                                    {localDeliveryPack &&
                                    !latestDeliveryPreparation ? (
                                      <div style={{ ...helperText(), fontSize: 13 }}>
                                        A delivery pack is prepared in this session.
                                        GSN still has not sent WhatsApp, SMS, or email.
                                        Open Receipt after manual delivery happens.
                                      </div>
                                    ) : null}
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" ? (
                                  <div style={{ display: "grid", gap: 8 }}>
                                    <div style={{ ...helperText(), fontSize: 13 }}>
                                      Current receipt task:{" "}
                                      <strong>
                                        {activeOutcomeReceiptTaskLabel}
                                      </strong>
                                      . {activeOutcomeReceiptTaskNote}
                                    </div>
                                    {canOpenOutcomeReceiptForm ? (
                                      <StableButton
                                        type="button"
                                        kind="secondary"
                                        fullWidth
                                        stableHeight={38}
                                        debugId="community-domain-dashboard.beneficiary-outcome-receipt-form-toggle"
                                        aria-expanded={outcomeReceiptFormOpen}
                                        aria-controls={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
                                        onClick={() =>
                                          setBeneficiaryOutcomeReceiptFormOpenById(
                                            (current) => ({
                                              ...current,
                                              [outcomeEventId]:
                                                !current[outcomeEventId],
                                            })
                                          )
                                        }
                                        style={{
                                          justifyContent: "center",
                                          fontSize: 13,
                                          textTransform: "none",
                                        }}
                                      >
                                        {outcomeReceiptFormOpen
                                          ? "Close receipt form"
                                          : "Open receipt form"}
                                      </StableButton>
                                    ) : null}
                                  </div>
                                ) : null}
                                {activeOutcomeRecentPacket === "receipt" &&
                                canRecordManualDelivery &&
                                outcomeReceiptFormOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
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
                                latestDeliveryReceipt &&
                                outcomeReceiptFormOpen ? (
                                  <div
                                    id={`community-domain-beneficiary-outcome-receipt-form-${outcomeEventId}`}
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
    </>
  );
}
