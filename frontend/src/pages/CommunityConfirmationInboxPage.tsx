import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import {
  PrimaryButton,
  SecondaryButton,
  StableDisclosureSummary,
} from "../components/StableButton";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  addCommunityConfirmationReviewEvidence,
  assignCommunityConfirmationReviewCase,
  getCommunityConfirmationInbox,
  getCommunityConfirmationReviewCaseInbox,
  getCommunityConfirmationReviewEvidence,
  getMe,
  getMyCommunityConfirmationContactSettings,
  respondToCommunityConfirmation,
  safeCopy,
  scanCommunityConfirmationReviewSlaEvents,
  updateCommunityConfirmationReviewCase,
  updateMyCommunityConfirmationContactSetting,
} from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { navigateWithOrigin } from "../lib/nav";

type ConfirmationRow = {
  id: number;
  mode?: string | null;
  reasonType?: string | null;
  riskLevel?: string | null;
  communityId?: number | null;
  communityName?: string | null;
  subjectUserId?: number | null;
  subjectProfile?: {
    user_id?: number | null;
    display_name?: string | null;
    gmfn_id?: string | null;
    profile_image_url?: string | null;
    phone_verified?: boolean | null;
    membership_status?: string | null;
    membership_role?: string | null;
  } | null;
  createdAt?: string | null;
  expiresAt?: string | null;
  readerNote?: string | null;
  currentResponseCounts?: {
    positive_count?: number | null;
    caution_count?: number | null;
    objection_count?: number | null;
  } | null;
};

type ContactSetting = {
  communityId: number;
  communityName?: string | null;
  communityCode?: string | null;
  roleType?: string | null;
  active?: boolean | null;
  canReceiveRelayRequests?: boolean | null;
  canReceiveInstantPulse?: boolean | null;
  optedOutAt?: string | null;
  plainLanguage?: string | null;
};

type ReviewCaseRow = {
  reviewCaseId: number;
  requestId?: number | null;
  publicToken?: string | null;
  status?: string | null;
  reviewReason?: string | null;
  resolution?: string | null;
  trustImpact?: string | null;
  communityId?: number | null;
  communityName?: string | null;
  communityCode?: string | null;
  subjectUserId?: number | null;
  assignedToUserId?: number | null;
  requestStatus?: string | null;
  requestMode?: string | null;
  reasonType?: string | null;
  riskLevel?: string | null;
  visibleOutcome?: string | null;
  updatedAt?: string | null;
  createdAt?: string | null;
  reviewAgeHours?: number | null;
  reviewSlaStatus?: string | null;
  reviewSlaLabel?: string | null;
  reviewSlaMeaning?: string | null;
  reviewAttentionAfterHours?: number | null;
  reviewOverdueAfterHours?: number | null;
  trustReadingEffect?: {
    label?: string | null;
    meaning?: string | null;
    trust_delta?: string | null;
    trust_delta_label?: string | null;
  } | null;
};

type ReviewEvidenceRow = {
  evidenceId: number;
  reviewCaseId: number;
  evidenceType?: string | null;
  title?: string | null;
  body?: string | null;
  externalRef?: string | null;
  createdAt?: string | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

type EvidenceDraft = {
  evidenceType: string;
  title: string;
  body: string;
  externalRef: string;
};

type ReviewDraft = {
  resolution: string;
  trustImpact: string;
  note: string;
};

type AssignmentDraft = {
  assignedToUserId: string;
  note: string;
};

type ResponseOption = {
  type: string;
  label: string;
  meaning: string;
  reasonTag: string;
  tone: "positive" | "caution" | "negative";
};

const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    type: "known_here",
    label: "Known here",
    meaning: "Use this when you genuinely know this person in the community.",
    reasonTag: "direct_community_knowledge",
    tone: "positive",
  },
  {
    type: "active_here",
    label: "Active here",
    meaning: "Use this when they are currently active and reachable in the community.",
    reasonTag: "recent_active_presence",
    tone: "positive",
  },
  {
    type: "good_standing",
    label: "Good standing",
    meaning: "Use this only when you are comfortable for this low-risk check.",
    reasonTag: "acceptable_for_stated_risk",
    tone: "positive",
  },
  {
    type: "ask_more_evidence",
    label: "Ask for more evidence",
    meaning: "Use this when you cannot confirm enough from what you know.",
    reasonTag: "more_evidence_needed",
    tone: "caution",
  },
  {
    type: "known_but_caution",
    label: "Known, reduce risk",
    meaning: "Use this when you know them, but would reduce the amount or ask for lighter exposure.",
    reasonTag: "known_but_reduce_exposure",
    tone: "caution",
  },
  {
    type: "cannot_confirm_now",
    label: "Cannot confirm now",
    meaning: "Use this when you are not sure enough or cannot take responsibility right now.",
    reasonTag: "not_sure_enough_now",
    tone: "caution",
  },
  {
    type: "inactive",
    label: "Inactive",
    meaning: "Use this when they are not currently active in the community.",
    reasonTag: "not_currently_active",
    tone: "negative",
  },
  {
    type: "under_dispute",
    label: "Raise concern",
    meaning: "Use this only when there is a real issue that should go to admin review.",
    reasonTag: "real_concern_admin_review",
    tone: "negative",
  },
  {
    type: "not_known",
    label: "Not known enough",
    meaning: "Use this when you cannot honestly confirm this person.",
    reasonTag: "not_known_sufficiently",
    tone: "negative",
  },
];

const REVIEW_RESOLUTIONS = [
  {
    value: "confirmed_clean",
    label: "Confirmed clean",
    meaning: "Use when the review found no meaningful problem.",
  },
  {
    value: "resolved_with_caution",
    label: "Resolved with caution",
    meaning: "Use when the person is not rejected, but the reader should reduce risk.",
  },
  {
    value: "insufficient_evidence",
    label: "Insufficient evidence",
    meaning: "Use when the record is too thin for a stronger conclusion.",
  },
  {
    value: "concern_upheld",
    label: "Concern upheld",
    meaning: "Use when a real issue should affect the trust reading.",
  },
  {
    value: "dismissed",
    label: "Dismissed",
    meaning: "Use when the review should close without changing trust.",
  },
];

const REVIEW_TRUST_IMPACTS = [
  {
    value: "none",
    label: "No trust change",
    meaning: "Closes the review without moving the trust reading.",
  },
  {
    value: "positive",
    label: "Positive trust signal",
    meaning: "Use only when review confirms the person behaved well.",
  },
  {
    value: "caution",
    label: "Adds caution",
    meaning: "Use when evidence is thin or risk should be reduced.",
  },
  {
    value: "negative",
    label: "Negative trust signal",
    meaning: "Use only when a real concern is upheld.",
  },
];

const EVIDENCE_TYPES = [
  { value: "note", label: "Review note" },
  { value: "merchant_note", label: "Merchant note" },
  { value: "community_note", label: "Community note" },
  { value: "system_note", label: "System note" },
];

const REVIEW_STATUS_FILTERS = [
  { value: "open", label: "Open" },
  { value: "in_review", label: "In review" },
  { value: "resolved", label: "Resolved" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All cases" },
];

const REVIEW_SCOPE_FILTERS = [
  { value: "all_visible", label: "All visible" },
  { value: "assigned_to_me", label: "Assigned to me" },
  { value: "unassigned", label: "Unassigned" },
];

const REVIEW_SORT_OPTIONS = [
  { value: "urgency", label: "Urgency first" },
  { value: "recent", label: "Most recent" },
];

const REVIEW_LIMIT_OPTIONS = [10, 20, 50, 100];

function safeStr(value: any): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function positiveQueryNumber(search: string, key: string): number | null {
  const value = Number(new URLSearchParams(search || "").get(key) || 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

function queryOptionValue(
  search: string,
  key: string,
  allowed: Array<{ value: string }>,
  fallback: string
): string {
  const raw = safeStr(new URLSearchParams(search || "").get(key));
  return allowed.some((item) => item.value === raw) ? raw : fallback;
}

function rowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function safeDateTime(value: any): string {
  const raw = safeStr(value);
  if (!raw) return "Not shown";
  const d = new Date(raw);
  if (!Number.isFinite(d.getTime())) return raw;
  return d.toLocaleString();
}

function normalizeRow(raw: any): ConfirmationRow | null {
  const src = raw?.item || raw?.request || raw;
  const id = Number(src?.id || src?.request_id || 0);
  if (!Number.isFinite(id) || id <= 0) return null;

  return {
    id,
    mode: firstTruthy(src?.mode),
    reasonType: firstTruthy(src?.reason_type),
    riskLevel: firstTruthy(src?.risk_level),
    communityId: Number(src?.community_id || 0) || null,
    communityName: firstTruthy(src?.community_name),
    subjectUserId: Number(src?.subject_user_id || 0) || null,
    subjectProfile: src?.subject_profile || null,
    createdAt: firstTruthy(src?.created_at),
    expiresAt: firstTruthy(src?.expires_at),
    readerNote: firstTruthy(src?.reader_note),
    currentResponseCounts: src?.current_response_counts || null,
  };
}

function normalizeSetting(raw: any): ContactSetting | null {
  const src = raw?.item || raw?.setting || raw;
  const communityId = Number(src?.community_id || 0);
  if (!Number.isFinite(communityId) || communityId <= 0) return null;
  return {
    communityId,
    communityName: firstTruthy(src?.community_name),
    communityCode: firstTruthy(src?.community_code),
    roleType: firstTruthy(src?.role_type),
    active: Boolean(src?.active),
    canReceiveRelayRequests: Boolean(src?.can_receive_relay_requests),
    canReceiveInstantPulse: Boolean(src?.can_receive_instant_pulse),
    optedOutAt: firstTruthy(src?.opted_out_at),
    plainLanguage: firstTruthy(src?.plain_language),
  };
}

function normalizeReviewCase(raw: any): ReviewCaseRow | null {
  const src = raw?.item || raw?.review_case || raw;
  const reviewCaseId = Number(src?.review_case_id || src?.id || 0);
  if (!Number.isFinite(reviewCaseId) || reviewCaseId <= 0) return null;
  return {
    reviewCaseId,
    requestId: Number(src?.request_id || 0) || null,
    publicToken: firstTruthy(src?.public_token),
    status: firstTruthy(src?.status),
    reviewReason: firstTruthy(src?.review_reason),
    resolution: firstTruthy(src?.resolution),
    trustImpact: firstTruthy(src?.trust_impact),
    communityId: Number(src?.community_id || 0) || null,
    communityName: firstTruthy(src?.community_name),
    communityCode: firstTruthy(src?.community_code),
    subjectUserId: Number(src?.subject_user_id || 0) || null,
    assignedToUserId: Number(src?.assigned_to_user_id || 0) || null,
    requestStatus: firstTruthy(src?.request_status),
    requestMode: firstTruthy(src?.request_mode),
    reasonType: firstTruthy(src?.reason_type),
    riskLevel: firstTruthy(src?.risk_level),
    visibleOutcome: firstTruthy(src?.visible_outcome),
    updatedAt: firstTruthy(src?.updated_at),
    createdAt: firstTruthy(src?.created_at),
    reviewAgeHours: Number.isFinite(Number(src?.review_age_hours))
      ? Number(src?.review_age_hours)
      : null,
    reviewSlaStatus: firstTruthy(src?.review_sla_status),
    reviewSlaLabel: firstTruthy(src?.review_sla_label),
    reviewSlaMeaning: firstTruthy(src?.review_sla_meaning),
    reviewAttentionAfterHours: Number.isFinite(Number(src?.review_attention_after_hours))
      ? Number(src?.review_attention_after_hours)
      : null,
    reviewOverdueAfterHours: Number.isFinite(Number(src?.review_overdue_after_hours))
      ? Number(src?.review_overdue_after_hours)
      : null,
    trustReadingEffect: src?.trust_reading_effect || null,
  };
}

function normalizeReviewEvidence(raw: any): ReviewEvidenceRow | null {
  const src = raw?.item || raw?.evidence || raw;
  const evidenceId = Number(src?.evidence_id || src?.id || 0);
  const reviewCaseId = Number(src?.review_case_id || 0);
  if (!Number.isFinite(evidenceId) || evidenceId <= 0) return null;
  if (!Number.isFinite(reviewCaseId) || reviewCaseId <= 0) return null;
  return {
    evidenceId,
    reviewCaseId,
    evidenceType: firstTruthy(src?.evidence_type),
    title: firstTruthy(src?.title),
    body: firstTruthy(src?.body),
    externalRef: firstTruthy(src?.external_ref),
    createdAt: firstTruthy(src?.created_at),
  };
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalPageCard(bg),
    borderRadius: 24,
    padding: 20,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    ...institutionalSoftCard(bg),
    borderRadius: 20,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalInnerCard(bg),
    borderRadius: 18,
    padding: 15,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function statTile(bg = "#FFFFFF"): React.CSSProperties {
  return {
    ...institutionalStatTile(bg),
    borderRadius: 18,
    border: "1px solid rgba(37,78,119,0.12)",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    color: "#39526C",
    fontSize: 12,
    fontWeight: 1000,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#526579",
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.5,
  };
}

function pillStyle(tone: ResponseOption["tone"] | "neutral"): React.CSSProperties {
  const positive = tone === "positive";
  const caution = tone === "caution";
  const negative = tone === "negative";
  return {
    borderRadius: 999,
    padding: "6px 10px",
    background: positive
      ? "#EEF9F1"
      : caution
      ? "#FFF7E6"
      : negative
      ? "#FEF2F2"
      : "#F8FBFF",
    border: `1px solid ${
      positive
        ? "rgba(46,155,98,0.22)"
        : caution
        ? "rgba(245,158,11,0.22)"
        : negative
        ? "rgba(220,38,38,0.22)"
        : "rgba(37,78,119,0.14)"
    }`,
    color: positive ? "#166534" : caution ? "#92400E" : negative ? "#991B1B" : "#39526C",
    fontSize: 12,
    fontWeight: 950,
  };
}

function responseCategoryLabel(tone: ResponseOption["tone"]): string {
  if (tone === "positive") return "Can confirm";
  if (tone === "caution") return "Need caution";
  return "Cannot support";
}

function responseActionLabel(option: ResponseOption): string {
  if (option.tone === "positive") return `Record: ${option.label}`;
  if (option.tone === "caution") return "Record caution";
  return "Record objection";
}

function reasonLabel(value?: string | null): string {
  const text = safeStr(value).replace(/_/g, " ");
  return text ? text[0].toUpperCase() + text.slice(1) : "Reason not stated";
}

function subjectName(row: ConfirmationRow): string {
  return firstTruthy(
    row.subjectProfile?.display_name,
    row.subjectProfile?.gmfn_id,
    row.subjectUserId ? `Member #${row.subjectUserId}` : "",
    "Member"
  );
}

function subjectInitials(row: ConfirmationRow): string {
  const name = subjectName(row);
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function reviewStatusLabel(row: ReviewCaseRow): string {
  const status = safeStr(row.status).replace(/_/g, " ");
  return status ? status[0].toUpperCase() + status.slice(1) : "Review case";
}

function reviewTrustLabel(row: ReviewCaseRow): string {
  return firstTruthy(
    row.trustReadingEffect?.label,
    row.trustImpact ? `Trust impact: ${row.trustImpact}` : "",
    "Trust impact not set yet"
  );
}

function reviewSlaTone(row: ReviewCaseRow): "positive" | "caution" | "negative" | "neutral" {
  const status = safeStr(row.reviewSlaStatus);
  if (status === "fresh" || status === "closed") return "positive";
  if (status === "overdue") return "negative";
  if (status === "needs_attention") return "caution";
  return "neutral";
}

function reviewSlaLabel(row: ReviewCaseRow): string {
  const age =
    typeof row.reviewAgeHours === "number" && Number.isFinite(row.reviewAgeHours)
      ? ` (${row.reviewAgeHours}h)`
      : "";
  return `${firstTruthy(row.reviewSlaLabel, "Age not shown")}${age}`;
}

function defaultReviewDraft(row?: ReviewCaseRow | null): ReviewDraft {
  const currentResolution = safeStr(row?.resolution);
  const currentImpact = safeStr(row?.trustImpact);
  return {
    resolution: currentResolution || "insufficient_evidence",
    trustImpact: currentImpact || "caution",
    note: "",
  };
}

function defaultEvidenceDraft(): EvidenceDraft {
  return {
    evidenceType: "note",
    title: "",
    body: "",
    externalRef: "",
  };
}

function defaultAssignmentDraft(row?: ReviewCaseRow): AssignmentDraft {
  return {
    assignedToUserId: row?.assignedToUserId ? String(row.assignedToUserId) : "",
    note: "",
  };
}

function CommunityConfirmationInboxPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const focusedRequestId = positiveQueryNumber(location.search, "request_id");
  const focusedReviewCaseId = positiveQueryNumber(location.search, "case_id");
  const initialReviewStatusFilter = queryOptionValue(
    location.search,
    "status",
    REVIEW_STATUS_FILTERS,
    "open"
  );
  const initialReviewScopeFilter = queryOptionValue(
    location.search,
    "scope",
    REVIEW_SCOPE_FILTERS,
    "all_visible"
  );
  const initialReviewSort = queryOptionValue(
    location.search,
    "sort",
    REVIEW_SORT_OPTIONS,
    "urgency"
  );
  const [isCompact, setIsCompact] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth <= 820
  );
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<ConfirmationRow[]>([]);
  const [reviewCases, setReviewCases] = useState<ReviewCaseRow[]>([]);
  const [reviewCaseAvailableCount, setReviewCaseAvailableCount] = useState(0);
  const [reviewCasesLoading, setReviewCasesLoading] = useState(true);
  const [settings, setSettings] = useState<ContactSetting[]>([]);
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [responseNotes, setResponseNotes] = useState<Record<number, string>>({});
  const [reviewDrafts, setReviewDrafts] = useState<Record<number, ReviewDraft>>({});
  const [reviewEvidence, setReviewEvidence] = useState<Record<number, ReviewEvidenceRow[]>>({});
  const [evidenceDrafts, setEvidenceDrafts] = useState<Record<number, EvidenceDraft>>({});
  const [assignmentDrafts, setAssignmentDrafts] = useState<Record<number, AssignmentDraft>>({});
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [reviewStatusFilter, setReviewStatusFilter] = useState(initialReviewStatusFilter);
  const [reviewScopeFilter, setReviewScopeFilter] = useState(initialReviewScopeFilter);
  const [reviewSort, setReviewSort] = useState(initialReviewSort);
  const [reviewCommunityFilter, setReviewCommunityFilter] = useState("");
  const [reviewLimit, setReviewLimit] = useState(20);
  const [reviewOffset, setReviewOffset] = useState(0);
  const [reviewNextOffset, setReviewNextOffset] = useState<number | null>(null);
  const [reviewPreviousOffset, setReviewPreviousOffset] = useState<number | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [reviewSlaScanSummary, setReviewSlaScanSummary] = useState<any | null>(null);

  const pendingCount = rows.length;
  const instantCount = rows.filter((row) => row.mode === "instant_pulse").length;
  const relayCount = rows.filter((row) => row.mode !== "instant_pulse").length;
  const focusedRows = useMemo(() => {
    if (!focusedRequestId) return rows;
    return [...rows].sort((a, b) => {
      const aMatch = a.id === focusedRequestId ? 0 : 1;
      const bMatch = b.id === focusedRequestId ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [focusedRequestId, rows]);
  const visibleReviewCases = useMemo(() => {
    if (!focusedReviewCaseId) return reviewCases;
    return [...reviewCases].sort((a, b) => {
      const aMatch = a.reviewCaseId === focusedReviewCaseId ? 0 : 1;
      const bMatch = b.reviewCaseId === focusedReviewCaseId ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [focusedReviewCaseId, reviewCases]);
  const reviewCaseCount = reviewCases.length;
  const visibleReviewCaseCount = visibleReviewCases.length;
  const reviewCaseTotalAvailable = Math.max(reviewCaseAvailableCount, reviewCaseCount);
  const reviewPageStart = reviewCaseTotalAvailable > 0 ? reviewOffset + 1 : 0;
  const reviewPageEnd =
    reviewCaseTotalAvailable > 0 ? reviewOffset + visibleReviewCaseCount : 0;
  const canManageRelayPolicy = settings.some(
    (setting) => String(setting.roleType || "").toLowerCase() === "admin"
  );
  const canScanReviewSla =
    currentUserRole === "admin" || (canManageRelayPolicy && !!reviewCommunityFilter);

  const queueText = useMemo(() => {
    return [
      "GSN instant community confirmation inbox",
      `Pending requests: ${pendingCount}`,
      `Instant pulse: ${instantCount}`,
      `Relay: ${relayCount}`,
      `Review cases visible: ${visibleReviewCaseCount} of ${reviewCaseTotalAvailable}`,
    ].join("\n");
  }, [instantCount, pendingCount, relayCount, reviewCaseTotalAvailable, visibleReviewCaseCount]);

  async function loadInbox() {
    setLoading(true);
    try {
      const result = await getCommunityConfirmationInbox();
      setRows(
        rowsOf<any>(result)
          .map((row) => normalizeRow(row))
          .filter(Boolean) as ConfirmationRow[]
      );
    } catch {
      setNotice({
        tone: "error",
        text: "Community confirmation inbox could not be loaded yet.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadSettings() {
    setSettingsLoading(true);
    try {
      const result = await getMyCommunityConfirmationContactSettings();
      setSettings(
        rowsOf<any>(result)
          .map((row) => normalizeSetting(row))
          .filter(Boolean) as ContactSetting[]
      );
    } catch {
      setNotice({
        tone: "error",
        text: "Community confirmation contact settings could not be loaded yet.",
      });
    } finally {
      setSettingsLoading(false);
    }
  }

  async function loadReviewCases(options?: {
    status?: string;
    scope?: string;
    sort?: string;
    communityId?: string | null;
    limit?: number;
    offset?: number;
  }) {
    setReviewCasesLoading(true);
    const status = firstTruthy(options?.status, reviewStatusFilter, "open");
    const scope = firstTruthy(options?.scope, reviewScopeFilter, "all_visible");
    const sort = firstTruthy(options?.sort, reviewSort, "urgency");
    const communityRaw =
      options && Object.prototype.hasOwnProperty.call(options, "communityId")
        ? safeStr(options.communityId)
        : safeStr(reviewCommunityFilter);
    const communityId = Number(communityRaw || 0);
    const limit = Number(options?.limit || reviewLimit || 20);
    const offset = Number(
      options && Object.prototype.hasOwnProperty.call(options, "offset")
        ? options.offset
        : reviewOffset
    );
    try {
      const result = await getCommunityConfirmationReviewCaseInbox({
        status,
        scope,
        sort,
        community_id:
          Number.isFinite(communityId) && communityId > 0 ? communityId : undefined,
        limit,
        offset: Number.isFinite(offset) && offset > 0 ? offset : undefined,
      });
      setReviewCases(
        rowsOf<any>(result)
          .map((row) => normalizeReviewCase(row))
          .filter(Boolean) as ReviewCaseRow[]
      );
      setReviewCaseAvailableCount(Number(result?.total_available || result?.total || 0) || 0);
      setReviewOffset(Number(result?.offset || 0) || 0);
      setReviewNextOffset(
        result?.next_offset === null || result?.next_offset === undefined
          ? null
          : Number(result.next_offset)
      );
      setReviewPreviousOffset(
        result?.previous_offset === null || result?.previous_offset === undefined
          ? null
          : Number(result.previous_offset)
      );
    } catch {
      setNotice({
        tone: "error",
        text: "Community confirmation review cases could not be loaded yet.",
      });
    } finally {
      setReviewCasesLoading(false);
    }
  }

  async function loadCurrentUser() {
    try {
      const result = await getMe();
      const userId = Number(result?.id || result?.user_id || 0);
      setCurrentUserId(Number.isFinite(userId) && userId > 0 ? userId : null);
      setCurrentUserRole(safeStr(result?.role || result?.user_role).toLowerCase());
    } catch {
      setCurrentUserId(null);
      setCurrentUserRole("");
    }
  }

  async function scanReviewSlaEvents() {
    const key = "review-sla-scan";
    const communityId = Number(safeStr(reviewCommunityFilter) || 0);
    setBusyKey(key);
    try {
      const result = await scanCommunityConfirmationReviewSlaEvents({
        community_id:
          Number.isFinite(communityId) && communityId > 0 ? communityId : undefined,
        limit: reviewLimit,
      });
      setReviewSlaScanSummary(result || null);
      const eventsRecorded = Number(result?.events_recorded || 0);
      const notificationsCreated = Number(result?.notifications_created || 0);
      setNotice({
        tone: "success",
        text: `SLA audit scan complete. ${eventsRecorded} trust-event marker${eventsRecorded === 1 ? "" : "s"} and ${notificationsCreated} reviewer notification${notificationsCreated === 1 ? "" : "s"} created.`,
      });
      await loadReviewCases({ offset: reviewOffset });
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not run the review SLA scan. Use a community ID if you are scanning as a community admin.",
      });
    } finally {
      setBusyKey("");
    }
  }

  function draftForReview(row: ReviewCaseRow): ReviewDraft {
    return reviewDrafts[row.reviewCaseId] || defaultReviewDraft(row);
  }

  function updateReviewDraft(
    reviewCaseId: number,
    patch: Partial<ReviewDraft>
  ) {
    setReviewDrafts((prev) => ({
      ...prev,
      [reviewCaseId]: {
        ...(prev[reviewCaseId] || defaultReviewDraft()),
        ...patch,
      },
    }));
  }

  function evidenceDraftForReview(row: ReviewCaseRow): EvidenceDraft {
    return evidenceDrafts[row.reviewCaseId] || defaultEvidenceDraft();
  }

  function updateEvidenceDraft(
    reviewCaseId: number,
    patch: Partial<EvidenceDraft>
  ) {
    setEvidenceDrafts((prev) => ({
      ...prev,
      [reviewCaseId]: {
        ...(prev[reviewCaseId] || defaultEvidenceDraft()),
        ...patch,
      },
    }));
  }

  function assignmentDraftForReview(row: ReviewCaseRow): AssignmentDraft {
    return assignmentDrafts[row.reviewCaseId] || defaultAssignmentDraft(row);
  }

  function updateAssignmentDraft(
    reviewCaseId: number,
    patch: Partial<AssignmentDraft>
  ) {
    setAssignmentDrafts((prev) => ({
      ...prev,
      [reviewCaseId]: {
        ...(prev[reviewCaseId] || defaultAssignmentDraft()),
        ...patch,
      },
    }));
  }

  async function assignReviewCase(
    row: ReviewCaseRow,
    assignedToUserId: number | null,
    fallbackNote: string
  ) {
    const key = `review-${row.reviewCaseId}-assign`;
    const note = safeStr(assignmentDraftForReview(row).note || fallbackNote).slice(0, 500);
    setBusyKey(key);
    try {
      await assignCommunityConfirmationReviewCase(row.reviewCaseId, {
        assigned_to_user_id: assignedToUserId,
        assignment_note: note || null,
      });
      setNotice({
        tone: "success",
        text: assignedToUserId
          ? "Review case assigned and recorded in the trust trail."
          : "Review case released back to the review queue.",
      });
      setAssignmentDrafts((prev) => {
        const next = { ...prev };
        delete next[row.reviewCaseId];
        return next;
      });
      await loadReviewCases();
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not update this review assignment yet.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function assignReviewCaseFromDraft(row: ReviewCaseRow) {
    const draft = assignmentDraftForReview(row);
    const targetUserId = Number(safeStr(draft.assignedToUserId));
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      setNotice({
        tone: "error",
        text: "Enter a valid reviewer user ID before assigning this case.",
      });
      return;
    }
    await assignReviewCase(row, targetUserId, "Reviewer assigned from the review inbox.");
  }

  async function loadReviewEvidence(row: ReviewCaseRow) {
    const key = `review-${row.reviewCaseId}-evidence-load`;
    setBusyKey(key);
    try {
      const result = await getCommunityConfirmationReviewEvidence(row.reviewCaseId);
      setReviewEvidence((prev) => ({
        ...prev,
        [row.reviewCaseId]: rowsOf<any>(result)
          .map((item) => normalizeReviewEvidence(item))
          .filter(Boolean) as ReviewEvidenceRow[],
      }));
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not load review evidence yet.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function addReviewEvidence(row: ReviewCaseRow) {
    const draft = evidenceDraftForReview(row);
    const title = safeStr(draft.title);
    if (!title) {
      setNotice({ tone: "error", text: "Add a short evidence title first." });
      return;
    }
    const key = `review-${row.reviewCaseId}-evidence-add`;
    setBusyKey(key);
    try {
      await addCommunityConfirmationReviewEvidence(row.reviewCaseId, {
        evidence_type: draft.evidenceType || "note",
        title: title.slice(0, 160),
        body: safeStr(draft.body).slice(0, 1000) || null,
        external_ref: safeStr(draft.externalRef).slice(0, 160) || null,
      });
      setEvidenceDrafts((prev) => ({
        ...prev,
        [row.reviewCaseId]: defaultEvidenceDraft(),
      }));
      setNotice({
        tone: "success",
        text: "Review evidence added. It stays internal to GSN review.",
      });
      await loadReviewEvidence(row);
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not add this review evidence yet.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function resolveReviewCase(row: ReviewCaseRow) {
    const draft = draftForReview(row);
    const key = `review-${row.reviewCaseId}-resolve`;
    setBusyKey(key);
    try {
      await updateCommunityConfirmationReviewCase(row.reviewCaseId, {
        status: "resolved",
        resolution: draft.resolution,
        trust_impact: draft.trustImpact,
        resolution_note: safeStr(draft.note).slice(0, 500) || null,
      });
      setNotice({
        tone: "success",
        text: "Review case resolved and recorded in the trust trail.",
      });
      setReviewDrafts((prev) => {
        const next = { ...prev };
        delete next[row.reviewCaseId];
        return next;
      });
      await loadReviewCases();
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not resolve this review case yet.",
      });
    } finally {
      setBusyKey("");
    }
  }

  useEffect(() => {
    void loadInbox();
    void loadSettings();
    void loadCurrentUser();
    void loadReviewCases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const hasReviewQuery =
      location.search.includes("case_id=") ||
      location.search.includes("status=") ||
      location.search.includes("scope=") ||
      location.search.includes("sort=");
    if (!hasReviewQuery) return;
    const status = queryOptionValue(
      location.search,
      "status",
      REVIEW_STATUS_FILTERS,
      "open"
    );
    const scope = queryOptionValue(
      location.search,
      "scope",
      REVIEW_SCOPE_FILTERS,
      "all_visible"
    );
    const sort = queryOptionValue(location.search, "sort", REVIEW_SORT_OPTIONS, "urgency");
    setReviewStatusFilter(status);
    setReviewScopeFilter(scope);
    setReviewSort(sort);
    setReviewOffset(0);
    void loadReviewCases({ status, scope, sort, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetId = focusedRequestId
      ? `community-confirmation-request-${focusedRequestId}`
      : focusedReviewCaseId
        ? `community-confirmation-review-case-${focusedReviewCaseId}`
        : "";
    if (!targetId) return;
    const timer = window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({
        block: "center",
        behavior: "auto",
      });
    }, 140);
    return () => window.clearTimeout(timer);
  }, [
    focusedRequestId,
    focusedReviewCaseId,
    loading,
    reviewCasesLoading,
    rows.length,
    reviewCases.length,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    function handleResize() {
      setIsCompact(window.innerWidth <= 820);
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 2600);
    return () => window.clearTimeout(timer);
  }, [notice]);

  async function answer(row: ConfirmationRow, option: ResponseOption) {
    if (!row.id) {
      setNotice({ tone: "error", text: "This request is missing its request number." });
      return;
    }

    const key = `${row.id}-${option.type}`;
    setBusyKey(key);
    try {
      await respondToCommunityConfirmation(row.id, {
        response_type: option.type,
        response_reason: option.reasonTag,
        response_note: safeStr(responseNotes[row.id]).slice(0, 500) || null,
      });
      setRows((prev) => prev.filter((item) => item.id !== row.id));
      setResponseNotes((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });
      setNotice({
        tone: "success",
        text: "Your community confirmation response was recorded.",
      });
      await loadReviewCases();
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not record this response yet. Try again from this inbox.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function updateRelaySetting(
    setting: ContactSetting,
    payload: {
      can_receive_relay_requests?: boolean;
      can_receive_instant_pulse?: boolean;
      opted_out?: boolean;
    }
  ) {
    const key = `setting-${setting.communityId}`;
    setBusyKey(key);
    try {
      const updated = await updateMyCommunityConfirmationContactSetting(
        setting.communityId,
        payload
      );
      const normalized = normalizeSetting(updated);
      if (normalized) {
        setSettings((prev) =>
          prev.map((item) => (item.communityId === normalized.communityId ? normalized : item))
        );
      }
      setNotice({ tone: "success", text: "Your relay availability was updated." });
      await loadInbox();
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not update your relay availability yet.",
      });
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: isCompact ? 36 : 56 }}>
      <PageTopNav
        sectionLabel="Community confirmation"
        title="Confirmation Inbox"
        subtitle="Answer only when you genuinely know the member inside this community."
        homeTo={APP_ROUTES.DASHBOARD}
        homeLabel="Dashboard"
        backTo={APP_ROUTES.TRUST_SLIP}
        backLabel="TrustSlip"
      />

      <ExplainToggle
        label="What this inbox does"
        what="This inbox lets eligible community members answer a live TrustSlip confirmation request."
        why="A public TrustSlip can say someone belongs to a community, but a reader may need stronger reassurance for this specific decision."
        next="Use the safest true answer. GSN shows only aggregate results outside; it does not publish your private contact details or your individual vote."
        tone="blue"
        style={{ marginTop: 16 }}
      />

      {notice ? (
        <div
          style={{
            marginTop: 14,
            ...innerCard(notice.tone === "success" ? "#EEF9F1" : "#FEF2F2"),
            color: notice.tone === "success" ? "#166534" : "#991B1B",
            fontWeight: 900,
          }}
        >
          {notice.text}
        </div>
      ) : null}

      <section
        style={{
          marginTop: 16,
          ...pageCard("#FFFFFF"),
          background:
            "linear-gradient(135deg, rgba(7,23,44,0.98) 0%, rgba(16,52,84,0.95) 100%)",
          color: "#FFFFFF",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ color: "#F2C766", fontSize: 12, fontWeight: 1000, textTransform: "uppercase" }}>
              Instant community confirmation
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: isCompact ? 30 : 42, lineHeight: 1, fontWeight: 1000 }}>
              Answer the live community check.
            </h1>
            <p style={{ margin: "12px 0 0", color: "#D7E2EF", fontSize: 16, fontWeight: 800, lineHeight: 1.5 }}>
              This is not a guarantee. It is a privacy-safe response signal that helps an outside reader decide whether to ask for more evidence, reduce risk, proceed carefully, or step back.
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(2, minmax(0, 1fr))" : "1fr",
              gap: 10,
              minWidth: isCompact ? "auto" : 190,
            }}
          >
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>Pending</div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 28, fontWeight: 1000 }}>{pendingCount}</div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>Instant</div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 28, fontWeight: 1000 }}>{instantCount}</div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>Relay</div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 28, fontWeight: 1000 }}>{relayCount}</div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>Review</div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 28, fontWeight: 1000 }}>{reviewCaseCount}</div>
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: 14, ...softCard("#F8FBFF") }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div style={sectionLabel()}>Response rule</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#07172C" }}>
              Respond from what you personally and honestly know. Do not answer from pressure, friendship, fear, or guesswork.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <SecondaryButton
              type="button"
              onClick={() => void loadInbox()}
              busy={loading}
              busyLabel="Refreshing..."
              stableHeight={44}
              minWidth={120}
              debugId="community-confirmation-inbox.refresh"
            >
              Refresh
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                safeCopy(queueText);
                setNotice({ tone: "success", text: "Inbox summary copied." });
              }}
              stableHeight={44}
              minWidth={120}
              debugId="community-confirmation-inbox.copy-summary"
            >
              Copy summary
            </SecondaryButton>
          </div>
        </div>
      </section>

      <details style={{ marginTop: 14, ...softCard("#FFFFFF") }} open={!isCompact && reviewCaseCount > 0}>
        <StableDisclosureSummary
          debugId="community-confirmation-inbox.review-cases.toggle"
          stableHeight={56}
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
            color: "#07172C",
            fontWeight: 1000,
          }}
        >
          <span>
            Review cases
            <span style={{ marginLeft: 8, ...pillStyle(visibleReviewCaseCount ? "caution" : "neutral") }}>
              {visibleReviewCaseCount}
              {reviewCaseTotalAvailable > visibleReviewCaseCount
                ? ` / ${reviewCaseTotalAvailable}`
                : ""}
            </span>
          </span>
          <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 22 }}>
            +
          </span>
        </StableDisclosureSummary>

        <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <p style={{ margin: 0, ...helperText() }}>
              These are confirmation cases that need checking before they become a clean trust signal. Keep the public paper simple; keep the sensitive review work here.
            </p>
            <SecondaryButton
              type="button"
              onClick={() => void loadReviewCases()}
              busy={reviewCasesLoading}
              busyLabel="Refreshing..."
              stableHeight={44}
              minWidth={120}
              debugId="community-confirmation-inbox.review-cases.refresh"
            >
              Refresh cases
            </SecondaryButton>
          </div>

          <details style={innerCard("#FFFDF6")}>
            <StableDisclosureSummary
              debugId="community-confirmation-inbox.review-cases.sla-scan-toggle"
              stableHeight={52}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
                color: "#07172C",
                fontWeight: 1000,
              }}
            >
              <span>Record overdue review markers</span>
              <span aria-hidden="true" style={{ color: "#D6AA45", fontSize: 20 }}>
                +
              </span>
            </StableDisclosureSummary>
            <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
              <p style={{ margin: 0, ...helperText() }}>
                This checks active review cases and records missing attention or overdue
                markers into the Trust Event trail. It does not change a trust score,
                close a case, or expose private community contacts.
              </p>
              {currentUserRole !== "admin" ? (
                <p style={{ margin: 0, ...helperText(), color: "#9A6A00", fontWeight: 800 }}>
                  Community admins should enter a Community ID before scanning. Platform
                  admins can scan all visible communities.
                </p>
              ) : null}
              {reviewSlaScanSummary ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(5, minmax(0, 1fr))",
                    gap: 8,
                  }}
                >
                  {[
                    ["Scanned", reviewSlaScanSummary.scanned],
                    ["Overdue", reviewSlaScanSummary.overdue_cases],
                    ["Needs attention", reviewSlaScanSummary.needs_attention_cases],
                    ["Events recorded", reviewSlaScanSummary.events_recorded],
                    ["Reviewer notices", reviewSlaScanSummary.notifications_created],
                  ].map(([label, value]) => (
                    <div key={String(label)} style={innerCard("#FFFFFF")}>
                      <div style={{ ...helperText(), fontWeight: 900 }}>{label}</div>
                      <div style={{ marginTop: 4, color: "#07172C", fontSize: 22, fontWeight: 1000 }}>
                        {Number(value || 0)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <PrimaryButton
                  type="button"
                  onClick={() => void scanReviewSlaEvents()}
                  disabled={!canScanReviewSla}
                  busy={busyKey === "review-sla-scan"}
                  busyLabel="Scanning..."
                  stableHeight={46}
                  minWidth={180}
                  debugId="community-confirmation-inbox.review-cases.scan-sla"
                >
                  Run SLA scan
                </PrimaryButton>
                <SecondaryButton
                  type="button"
                  onClick={() => setReviewSlaScanSummary(null)}
                  stableHeight={46}
                  minWidth={120}
                  debugId="community-confirmation-inbox.review-cases.clear-sla-scan"
                >
                  Clear result
                </SecondaryButton>
              </div>
            </div>
          </details>

          <div
            style={{
              ...innerCard("#F8FBFF"),
              display: "grid",
              gridTemplateColumns: isCompact
                ? "1fr"
                : "1.1fr 1fr 1fr 1fr 0.8fr auto",
              gap: 10,
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
              Case status
              <select
                value={reviewStatusFilter}
                onChange={(event) => {
                  const next = event.target.value;
                  setReviewStatusFilter(next);
                  void loadReviewCases({ status: next, offset: 0 });
                }}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(37,78,119,0.18)",
                  padding: "0 12px",
                  color: "#07172C",
                  fontWeight: 900,
                }}
              >
                {REVIEW_STATUS_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
              Case scope
              <select
                value={reviewScopeFilter}
                onChange={(event) => {
                  const next = event.target.value;
                  setReviewScopeFilter(next);
                  void loadReviewCases({ scope: next, offset: 0 });
                }}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(37,78,119,0.18)",
                  padding: "0 12px",
                  color: "#07172C",
                  fontWeight: 900,
                }}
              >
                {REVIEW_SCOPE_FILTERS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
              Sort
              <select
                value={reviewSort}
                onChange={(event) => {
                  const next = event.target.value;
                  setReviewSort(next);
                  void loadReviewCases({ sort: next, offset: 0 });
                }}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(37,78,119,0.18)",
                  padding: "0 12px",
                  color: "#07172C",
                  fontWeight: 900,
                }}
              >
                {REVIEW_SORT_OPTIONS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
              Community ID
              <input
                value={reviewCommunityFilter}
                onChange={(event) => setReviewCommunityFilter(event.target.value)}
                inputMode="numeric"
                placeholder="Optional"
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(37,78,119,0.18)",
                  padding: "0 12px",
                  color: "#07172C",
                  fontWeight: 900,
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
              Limit
              <select
                value={reviewLimit}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setReviewLimit(next);
                  void loadReviewCases({ limit: next, offset: 0 });
                }}
                style={{
                  minHeight: 46,
                  borderRadius: 14,
                  border: "1px solid rgba(37,78,119,0.18)",
                  padding: "0 12px",
                  color: "#07172C",
                  fontWeight: 900,
                }}
              >
                {REVIEW_LIMIT_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <PrimaryButton
                type="button"
                onClick={() => void loadReviewCases({ offset: 0 })}
                busy={reviewCasesLoading}
                busyLabel="Applying..."
                stableHeight={46}
                minWidth={120}
                debugId="community-confirmation-inbox.review-cases.apply-filters"
              >
                Apply
              </PrimaryButton>
              {reviewCommunityFilter ? (
                <SecondaryButton
                  type="button"
                  onClick={() => {
                    setReviewCommunityFilter("");
                    void loadReviewCases({ communityId: "", offset: 0 });
                  }}
                  stableHeight={46}
                  minWidth={110}
                  debugId="community-confirmation-inbox.review-cases.clear-community-filter"
                >
                  Clear
                </SecondaryButton>
              ) : null}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "center",
            }}
          >
            <p style={{ margin: 0, ...helperText() }}>
              Showing review cases {reviewPageStart}-{reviewPageEnd} of{" "}
              {reviewCaseTotalAvailable}. Urgent open work stays first unless you choose
              a different sort.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <SecondaryButton
                type="button"
                onClick={() => {
                  if (reviewPreviousOffset !== null) {
                    void loadReviewCases({ offset: reviewPreviousOffset });
                  }
                }}
                disabled={reviewPreviousOffset === null || reviewCasesLoading}
                stableHeight={44}
                minWidth={110}
                debugId="community-confirmation-inbox.review-cases.previous-page"
              >
                Previous
              </SecondaryButton>
              <PrimaryButton
                type="button"
                onClick={() => {
                  if (reviewNextOffset !== null) {
                    void loadReviewCases({ offset: reviewNextOffset });
                  }
                }}
                disabled={reviewNextOffset === null || reviewCasesLoading}
                stableHeight={44}
                minWidth={110}
                debugId="community-confirmation-inbox.review-cases.next-page"
              >
                Next
              </PrimaryButton>
            </div>
          </div>

          {reviewCasesLoading ? (
            <div style={innerCard("#F8FBFF")}>Loading review cases...</div>
          ) : visibleReviewCases.length === 0 ? (
            <div style={innerCard("#F8FBFF")}>
              <div style={{ color: "#07172C", fontWeight: 1000 }}>
                No matching review cases.
              </div>
              <p style={{ margin: "8px 0 0", ...helperText() }}>
                Change the status, scope, or community filter if you need to inspect another set of cases.
              </p>
            </div>
          ) : (
            visibleReviewCases.map((row) => {
              const isFocusedReviewCase = focusedReviewCaseId === row.reviewCaseId;
              return (
              <article
                id={`community-confirmation-review-case-${row.reviewCaseId}`}
                key={row.reviewCaseId}
                style={{
                  ...innerCard(isFocusedReviewCase ? "#FFF8E6" : "#F8FBFF"),
                  border: isFocusedReviewCase
                    ? "2px solid rgba(214,170,69,0.78)"
                    : "1px solid rgba(37,78,119,0.12)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pillStyle("caution")}>{reviewStatusLabel(row)}</span>
                      <span style={pillStyle("neutral")}>{reasonLabel(row.reasonType)}</span>
                      <span style={pillStyle(row.riskLevel === "high" ? "negative" : "caution")}>
                        Risk: {firstTruthy(row.riskLevel, "not stated")}
                      </span>
                      <span style={pillStyle(row.requestStatus === "closed" ? "positive" : "neutral")}>
                        Request: {firstTruthy(row.requestStatus, "not shown")}
                      </span>
                      <span style={pillStyle(reviewSlaTone(row))}>
                        {reviewSlaLabel(row)}
                      </span>
                      {isFocusedReviewCase ? (
                        <span style={pillStyle("positive")}>Opened from notification</span>
                      ) : null}
                    </div>
                    <h2 style={{ margin: "12px 0 0", color: "#07172C", fontSize: 20, fontWeight: 1000 }}>
                      Case #{row.reviewCaseId} for request #{firstTruthy(row.requestId, "not shown")}
                    </h2>
                    <p style={{ margin: "8px 0 0", ...helperText() }}>
                      Community: {firstTruthy(row.communityName, row.communityCode, row.communityId, "Not shown")}. Review reason: {firstTruthy(row.reviewReason, "Not stated")}.
                    </p>
                    <p style={{ margin: "8px 0 0", ...helperText(), color: "#07172C" }}>
                      {reviewTrustLabel(row)}
                      {row.trustReadingEffect?.meaning ? `: ${row.trustReadingEffect.meaning}` : ""}
                    </p>
                    {row.reviewSlaMeaning ? (
                      <p style={{ margin: "8px 0 0", ...helperText() }}>
                        Review timing: {row.reviewSlaMeaning}
                        {row.reviewAttentionAfterHours && row.reviewOverdueAfterHours
                          ? ` Policy: attention after ${row.reviewAttentionAfterHours}h, overdue after ${row.reviewOverdueAfterHours}h.`
                          : ""}
                      </p>
                    ) : null}
                    <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap", ...helperText(), fontSize: 13 }}>
                      <span>Subject: {firstTruthy(row.subjectUserId, "not shown")}</span>
                      <span>Assigned: {firstTruthy(row.assignedToUserId, "not assigned")}</span>
                      <span>Updated: {safeDateTime(row.updatedAt || row.createdAt)}</span>
                    </div>
                  </div>
                  <div style={{ display: "grid", gap: 8, minWidth: isCompact ? "auto" : 190 }}>
                    <PrimaryButton
                      type="button"
                      onClick={() =>
                        row.publicToken
                          ? navigateWithOrigin(
                              navigate,
                              `/community-confirmations/public/${encodeURIComponent(row.publicToken)}`,
                              location
                            )
                          : setNotice({
                              tone: "error",
                              text: "This review case does not have a public outcome link yet.",
                            })
                      }
                      stableHeight={46}
                      minWidth={180}
                      debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.open-outcome`}
                    >
                      Open outcome paper
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => {
                        safeCopy(
                          [
                            `Review case: ${row.reviewCaseId}`,
                            `Request: ${firstTruthy(row.requestId, "not shown")}`,
                            `Status: ${firstTruthy(row.status, "not shown")}`,
                            `Trust effect: ${reviewTrustLabel(row)}`,
                          ].join("\n")
                        );
                        setNotice({ tone: "success", text: "Review case summary copied." });
                      }}
                      stableHeight={46}
                      minWidth={180}
                      debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.copy`}
                    >
                      Copy case summary
                    </SecondaryButton>
                  </div>
                  <details style={{ gridColumn: "1 / -1", ...innerCard("#FFFFFF") }}>
                    <StableDisclosureSummary
                      debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.assignment-toggle`}
                      stableHeight={48}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        color: "#07172C",
                        fontWeight: 1000,
                      }}
                    >
                      <span>
                        Assignment
                        <span style={{ marginLeft: 8, ...pillStyle(row.assignedToUserId ? "positive" : "caution") }}>
                          {row.assignedToUserId ? `User ${row.assignedToUserId}` : "Unassigned"}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 20 }}>
                        +
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      <p style={{ margin: 0, ...helperText() }}>
                        Assigning a case makes the reviewer responsible for the next action. GSN records the assignment as an internal trust event, but it does not expose private community contacts.
                        Only platform or community admins can assign or release cases.
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <div style={innerCard("#F8FBFF")}>
                          <div style={sectionLabel()}>Current handler</div>
                          <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                            {row.assignedToUserId ? `Assigned to user ${row.assignedToUserId}` : "Not assigned yet"}
                          </div>
                          <p style={{ margin: "8px 0 0", ...helperText() }}>
                            {currentUserId
                              ? `You are signed in as user ${currentUserId}.`
                              : "GSN could not read your signed-in user number yet."}
                          </p>
                        </div>
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Assignment note
                          <textarea
                            value={assignmentDraftForReview(row).note}
                            onChange={(event) =>
                              updateAssignmentDraft(row.reviewCaseId, {
                                note: event.target.value,
                              })
                            }
                            placeholder="Short internal reason for claiming, assigning, or releasing this case."
                            rows={3}
                            maxLength={500}
                            style={{
                              width: "100%",
                              boxSizing: "border-box",
                              borderRadius: 16,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: 12,
                              color: "#07172C",
                              fontWeight: 800,
                              resize: "vertical",
                            }}
                          />
                        </label>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact
                            ? "1fr"
                            : "repeat(3, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <PrimaryButton
                          type="button"
                          debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.assignment-claim`}
                          onClick={() =>
                            currentUserId
                              ? void assignReviewCase(
                                  row,
                                  currentUserId,
                                  "Reviewer claimed this case from the review inbox."
                                )
                              : setNotice({
                                  tone: "error",
                                  text: "GSN could not identify your signed-in user yet.",
                                })
                          }
                          disabled={Boolean(busyKey) || !currentUserId || row.assignedToUserId === currentUserId}
                          busy={busyKey === `review-${row.reviewCaseId}-assign`}
                          busyLabel="Claiming..."
                          stableHeight={48}
                          minWidth={160}
                        >
                          Claim review
                        </PrimaryButton>
                        <SecondaryButton
                          type="button"
                          onClick={() =>
                            void assignReviewCase(
                              row,
                              null,
                              "Reviewer released this case back to the queue."
                            )
                          }
                          disabled={Boolean(busyKey) || !row.assignedToUserId}
                          busy={busyKey === `review-${row.reviewCaseId}-assign`}
                          busyLabel="Releasing..."
                          stableHeight={48}
                          minWidth={160}
                          debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.assignment-release`}
                        >
                          Release review
                        </SecondaryButton>
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Assign by user ID
                          <input
                            value={assignmentDraftForReview(row).assignedToUserId}
                            onChange={(event) =>
                              updateAssignmentDraft(row.reviewCaseId, {
                                assignedToUserId: event.target.value.replace(/[^\d]/g, ""),
                              })
                            }
                            inputMode="numeric"
                            placeholder="Reviewer user ID"
                            style={{
                              minHeight: 48,
                              borderRadius: 14,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: "0 12px",
                              color: "#07172C",
                              fontWeight: 900,
                            }}
                          />
                        </label>
                      </div>
                      <SecondaryButton
                        type="button"
                        onClick={() => void assignReviewCaseFromDraft(row)}
                        disabled={Boolean(busyKey)}
                        busy={busyKey === `review-${row.reviewCaseId}-assign`}
                        busyLabel="Assigning..."
                        stableHeight={48}
                        minWidth={190}
                        debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.assignment-manual`}
                      >
                        Assign reviewer
                      </SecondaryButton>
                    </div>
                  </details>
                  <details style={{ gridColumn: "1 / -1", ...innerCard("#FFFFFF") }}>
                    <StableDisclosureSummary
                      debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.evidence-toggle`}
                      stableHeight={48}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        color: "#07172C",
                        fontWeight: 1000,
                      }}
                    >
                      <span>
                        Internal review evidence
                        <span style={{ marginLeft: 8, ...pillStyle("neutral") }}>
                          {(reviewEvidence[row.reviewCaseId] || []).length}
                        </span>
                      </span>
                      <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 20 }}>
                        +
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <p style={{ margin: 0, ...helperText() }}>
                          Evidence here is internal review material. It should explain why a case is resolved, not expose private responder contacts.
                        </p>
                        <SecondaryButton
                          type="button"
                          onClick={() => void loadReviewEvidence(row)}
                          disabled={Boolean(busyKey)}
                          busy={busyKey === `review-${row.reviewCaseId}-evidence-load`}
                          busyLabel="Loading..."
                          stableHeight={44}
                          minWidth={150}
                          debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.evidence-refresh`}
                        >
                          Load evidence
                        </SecondaryButton>
                      </div>
                      {(reviewEvidence[row.reviewCaseId] || []).length ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {(reviewEvidence[row.reviewCaseId] || []).map((item) => (
                            <div key={item.evidenceId} style={innerCard("#F8FBFF")}>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <span style={pillStyle("neutral")}>
                                  {reasonLabel(item.evidenceType)}
                                </span>
                                <span style={pillStyle("neutral")}>
                                  {safeDateTime(item.createdAt)}
                                </span>
                              </div>
                              <div style={{ marginTop: 8, color: "#07172C", fontWeight: 1000 }}>
                                {firstTruthy(item.title, "Untitled evidence")}
                              </div>
                              {item.body ? (
                                <p style={{ margin: "6px 0 0", ...helperText() }}>{item.body}</p>
                              ) : null}
                              {item.externalRef ? (
                                <p style={{ margin: "6px 0 0", ...helperText(), fontSize: 12 }}>
                                  Reference: {item.externalRef}
                                </p>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={innerCard("#F8FBFF")}>
                          No internal evidence loaded for this case yet.
                        </div>
                      )}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : "180px minmax(0, 1fr)",
                          gap: 10,
                        }}
                      >
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Evidence type
                          <select
                            value={evidenceDraftForReview(row).evidenceType}
                            onChange={(event) =>
                              updateEvidenceDraft(row.reviewCaseId, {
                                evidenceType: event.target.value,
                              })
                            }
                            style={{
                              minHeight: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: "0 12px",
                              color: "#07172C",
                              fontWeight: 900,
                            }}
                          >
                            {EVIDENCE_TYPES.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Evidence title
                          <input
                            value={evidenceDraftForReview(row).title}
                            onChange={(event) =>
                              updateEvidenceDraft(row.reviewCaseId, {
                                title: event.target.value,
                              })
                            }
                            placeholder="Short factual title"
                            maxLength={160}
                            style={{
                              minHeight: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: "0 12px",
                              color: "#07172C",
                              fontWeight: 900,
                            }}
                          />
                        </label>
                      </div>
                      <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                        Evidence note
                        <textarea
                          value={evidenceDraftForReview(row).body}
                          onChange={(event) =>
                            updateEvidenceDraft(row.reviewCaseId, {
                              body: event.target.value,
                            })
                          }
                          placeholder="Add the factual review context. Do not include private phone numbers."
                          rows={3}
                          maxLength={1000}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            borderRadius: 16,
                            border: "1px solid rgba(37,78,119,0.18)",
                            padding: 12,
                            color: "#07172C",
                            fontWeight: 800,
                            resize: "vertical",
                          }}
                        />
                      </label>
                      <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                        Optional internal reference
                        <input
                          value={evidenceDraftForReview(row).externalRef}
                          onChange={(event) =>
                            updateEvidenceDraft(row.reviewCaseId, {
                              externalRef: event.target.value,
                            })
                          }
                          placeholder="Internal note ID, ticket, or source reference"
                          maxLength={160}
                          style={{
                            minHeight: 46,
                            borderRadius: 14,
                            border: "1px solid rgba(37,78,119,0.18)",
                            padding: "0 12px",
                            color: "#07172C",
                            fontWeight: 900,
                          }}
                        />
                      </label>
                      <PrimaryButton
                        type="button"
                        onClick={() => void addReviewEvidence(row)}
                        disabled={Boolean(busyKey)}
                        busy={busyKey === `review-${row.reviewCaseId}-evidence-add`}
                        busyLabel="Adding..."
                        stableHeight={48}
                        minWidth={180}
                        debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.evidence-add`}
                      >
                        Add evidence
                      </PrimaryButton>
                    </div>
                  </details>
                  <details style={{ gridColumn: "1 / -1", ...innerCard("#FFFFFF") }}>
                    <StableDisclosureSummary
                      debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.resolve-toggle`}
                      stableHeight={48}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 10,
                        alignItems: "center",
                        color: "#07172C",
                        fontWeight: 1000,
                      }}
                    >
                      <span>Resolve this case</span>
                      <span aria-hidden="true" style={{ color: "#0B63D1", fontSize: 20 }}>
                        +
                      </span>
                    </StableDisclosureSummary>
                    <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                      <p style={{ margin: 0, ...helperText() }}>
                        Only resolve this when you have enough review evidence. A resolved case can affect the member's trust reading; a dismissed case should use no trust change.
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                          gap: 10,
                        }}
                      >
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Resolution
                          <select
                            value={draftForReview(row).resolution}
                            onChange={(event) =>
                              updateReviewDraft(row.reviewCaseId, {
                                resolution: event.target.value,
                                trustImpact:
                                  event.target.value === "confirmed_clean"
                                    ? "positive"
                                    : event.target.value === "concern_upheld"
                                    ? "negative"
                                    : event.target.value === "dismissed"
                                    ? "none"
                                    : draftForReview(row).trustImpact,
                              })
                            }
                            style={{
                              minHeight: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: "0 12px",
                              color: "#07172C",
                              fontWeight: 900,
                            }}
                          >
                            {REVIEW_RESOLUTIONS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span style={{ color: "#526579", fontSize: 12 }}>
                            {
                              REVIEW_RESOLUTIONS.find(
                                (item) => item.value === draftForReview(row).resolution
                              )?.meaning
                            }
                          </span>
                        </label>
                        <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                          Trust reading effect
                          <select
                            value={draftForReview(row).trustImpact}
                            onChange={(event) =>
                              updateReviewDraft(row.reviewCaseId, {
                                trustImpact: event.target.value,
                              })
                            }
                            style={{
                              minHeight: 46,
                              borderRadius: 14,
                              border: "1px solid rgba(37,78,119,0.18)",
                              padding: "0 12px",
                              color: "#07172C",
                              fontWeight: 900,
                            }}
                          >
                            {REVIEW_TRUST_IMPACTS.map((item) => (
                              <option key={item.value} value={item.value}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                          <span style={{ color: "#526579", fontSize: 12 }}>
                            {
                              REVIEW_TRUST_IMPACTS.find(
                                (item) => item.value === draftForReview(row).trustImpact
                              )?.meaning
                            }
                          </span>
                        </label>
                      </div>
                      <label style={{ display: "grid", gap: 6, ...helperText(), color: "#07172C" }}>
                        Resolution note
                        <textarea
                          value={draftForReview(row).note}
                          onChange={(event) =>
                            updateReviewDraft(row.reviewCaseId, {
                              note: event.target.value,
                            })
                          }
                          placeholder="State the plain reason for the outcome. Keep it factual."
                          rows={3}
                          maxLength={500}
                          style={{
                            width: "100%",
                            boxSizing: "border-box",
                            borderRadius: 16,
                            border: "1px solid rgba(37,78,119,0.18)",
                            padding: 12,
                            color: "#07172C",
                            fontWeight: 800,
                            resize: "vertical",
                          }}
                        />
                      </label>
                      <PrimaryButton
                        type="button"
                        onClick={() => void resolveReviewCase(row)}
                        disabled={Boolean(busyKey)}
                        busy={busyKey === `review-${row.reviewCaseId}-resolve`}
                        busyLabel="Resolving..."
                        stableHeight={48}
                        minWidth={190}
                        debugId={`community-confirmation-inbox.review-cases.${row.reviewCaseId}.resolve`}
                      >
                        Resolve review
                      </PrimaryButton>
                    </div>
                  </details>
                </div>
              </article>
              );
            })
          )}
        </div>
      </details>

      <section style={{ marginTop: 14, ...softCard("#FFFFFF") }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            <div style={sectionLabel()}>Your relay availability</div>
            <div style={{ marginTop: 6, ...helperText(), color: "#07172C" }}>
              Choose whether GSN may send you community confirmation requests. This does not expose your phone number publicly.
            </div>
          </div>
          <SecondaryButton
            type="button"
            onClick={() => void loadSettings()}
            busy={settingsLoading}
            busyLabel="Refreshing..."
            stableHeight={44}
            minWidth={140}
            debugId="community-confirmation-inbox.settings.refresh"
          >
            Refresh settings
          </SecondaryButton>
          {canManageRelayPolicy ? (
            <PrimaryButton
              type="button"
              onClick={() =>
                navigateWithOrigin(
                  navigate,
                  APP_ROUTES.COMMUNITY_CONFIRMATION_POLICY,
                  location
                )
              }
              stableHeight={44}
              minWidth={160}
              debugId="community-confirmation-inbox.open-policy"
            >
              Manage policy
            </PrimaryButton>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {settingsLoading ? (
            <div style={innerCard("#F8FBFF")}>Loading your relay settings...</div>
          ) : settings.length === 0 ? (
            <div style={innerCard("#F8FBFF")}>
              You are not listed as a relay contact in any active community yet.
            </div>
          ) : (
            settings.map((setting) => {
              const enabled =
                setting.active &&
                setting.canReceiveRelayRequests &&
                !setting.optedOutAt;
              return (
                <div key={setting.communityId} style={innerCard(enabled ? "#F4FBF7" : "#FEF2F2")}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ color: "#07172C", fontWeight: 1000 }}>
                        {firstTruthy(setting.communityName, `Community ${setting.communityId}`)}
                      </div>
                      <div style={{ marginTop: 4, ...helperText(), fontSize: 13 }}>
                        {firstTruthy(setting.communityCode, setting.roleType, "Community relay contact")}
                      </div>
                    </div>
                    <span style={pillStyle(enabled ? "positive" : "negative")}>
                      {enabled ? "Receiving requests" : "Not receiving"}
                    </span>
                  </div>
                  <p style={{ margin: "10px 0 0", ...helperText(), fontSize: 13 }}>
                    {setting.plainLanguage ||
                      "Control whether this community may ask you to confirm another member."}
                  </p>
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr", gap: 8 }}>
                    {enabled ? (
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          void updateRelaySetting(setting, { opted_out: true })
                        }
                        disabled={Boolean(busyKey)}
                        busy={busyKey === `setting-${setting.communityId}`}
                        busyLabel="Updating..."
                        stableHeight={46}
                        debugId={`community-confirmation-inbox.settings.${setting.communityId}.opt-out`}
                      >
                        Stop receiving
                      </SecondaryButton>
                    ) : (
                      <PrimaryButton
                        type="button"
                        onClick={() =>
                          void updateRelaySetting(setting, { opted_out: false })
                        }
                        disabled={Boolean(busyKey)}
                        busy={busyKey === `setting-${setting.communityId}`}
                        busyLabel="Updating..."
                        stableHeight={46}
                        debugId={`community-confirmation-inbox.settings.${setting.communityId}.opt-in`}
                      >
                        Start receiving
                      </PrimaryButton>
                    )}
                    <SecondaryButton
                      type="button"
                      onClick={() =>
                        void updateRelaySetting(setting, {
                          can_receive_relay_requests: true,
                          can_receive_instant_pulse: !setting.canReceiveInstantPulse,
                        })
                      }
                      disabled={Boolean(busyKey) || !enabled}
                      busy={busyKey === `setting-${setting.communityId}`}
                      busyLabel="Updating..."
                      stableHeight={46}
                      debugId={`community-confirmation-inbox.settings.${setting.communityId}.toggle-instant`}
                    >
                      Instant pulse {setting.canReceiveInstantPulse ? "on" : "off"}
                    </SecondaryButton>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      <section style={{ marginTop: 14, display: "grid", gap: 12 }}>
        {loading ? (
          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>Loading community confirmation requests...</div>
          </div>
        ) : rows.length === 0 ? (
          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#07172C", fontSize: 20, fontWeight: 1000 }}>
              No community confirmation requests need your answer.
            </div>
            <p style={{ margin: "8px 0 0", ...helperText() }}>
              When someone requests a TrustSlip community check and you are eligible to respond, it will appear here.
            </p>
          </div>
        ) : (
          focusedRows.map((row) => {
            const counts = row.currentResponseCounts || {};
            const isFocusedRequest = focusedRequestId === row.id;
            return (
              <article
                id={`community-confirmation-request-${row.id}`}
                key={row.id}
                style={{
                  ...innerCard(isFocusedRequest ? "#FFF8E6" : "#FFFFFF"),
                  border: isFocusedRequest
                    ? "2px solid rgba(214,170,69,0.78)"
                    : "1px solid rgba(37,78,119,0.12)",
                }}
              >
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={pillStyle(row.mode === "instant_pulse" ? "caution" : "neutral")}>
                        {row.mode === "instant_pulse" ? "Instant pulse" : "Relay request"}
                      </span>
                      <span style={pillStyle("neutral")}>{reasonLabel(row.reasonType)}</span>
                      <span style={pillStyle(row.riskLevel === "high" ? "negative" : "caution")}>
                        Risk: {firstTruthy(row.riskLevel, "not stated")}
                      </span>
                      {isFocusedRequest ? (
                        <span style={pillStyle("positive")}>Opened from notification</span>
                      ) : null}
                    </div>
                    <div
                      style={{
                        marginTop: 12,
                        display: "grid",
                        gridTemplateColumns: "58px minmax(0, 1fr)",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 58,
                          height: 58,
                          borderRadius: 18,
                          overflow: "hidden",
                          display: "grid",
                          placeItems: "center",
                          background: "#EAF3FF",
                          border: "1px solid rgba(11,99,209,0.16)",
                          color: "#0B63D1",
                          fontWeight: 1000,
                        }}
                      >
                        {row.subjectProfile?.profile_image_url ? (
                          <img
                            src={row.subjectProfile.profile_image_url}
                            alt={`${subjectName(row)} profile`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          subjectInitials(row)
                        )}
                      </div>
                      <div>
                        <h2 style={{ margin: 0, color: "#07172C", fontSize: 22, fontWeight: 1000 }}>
                          Confirm {subjectName(row)}
                        </h2>
                        <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={pillStyle("neutral")}>
                            GSN ID: {firstTruthy(row.subjectProfile?.gmfn_id, "Not shown")}
                          </span>
                          <span style={pillStyle(row.subjectProfile?.phone_verified ? "positive" : "caution")}>
                            Phone {row.subjectProfile?.phone_verified ? "verified" : "not shown"}
                          </span>
                          <span style={pillStyle(row.subjectProfile?.membership_status === "active" ? "positive" : "caution")}>
                            Membership: {firstTruthy(row.subjectProfile?.membership_status, "not shown")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: "12px 0 0", ...helperText() }}>
                      Community: {firstTruthy(row.communityName, row.communityId, "Not shown")}. {row.readerNote || "Respond only if you genuinely know this member."}
                    </p>
                    <div style={{ marginTop: 10, display: "grid", gap: 5, ...helperText() }}>
                      <span>Created: {safeDateTime(row.createdAt)}</span>
                      <span>Expires: {safeDateTime(row.expiresAt)}</span>
                      <span>
                        Current aggregate: {counts.positive_count || 0} positive, {counts.caution_count || 0} caution, {counts.objection_count || 0} objection
                      </span>
                    </div>
                    <div style={{ marginTop: 12, ...innerCard("#F8FBFF") }}>
                      <label
                        htmlFor={`community-confirmation-note-${row.id}`}
                        style={{ color: "#07172C", fontWeight: 1000, display: "block" }}
                      >
                        Private context for GSN review
                      </label>
                      <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
                        Optional. This note is not shown on the public TrustSlip outcome. It helps GSN understand your answer if there is a later dispute.
                      </p>
                      <textarea
                        id={`community-confirmation-note-${row.id}`}
                        value={responseNotes[row.id] || ""}
                        onChange={(event) =>
                          setResponseNotes((prev) => ({
                            ...prev,
                            [row.id]: event.target.value.slice(0, 500),
                          }))
                        }
                        maxLength={500}
                        placeholder="Example: I saw them at the last meeting, but I would keep the release small."
                        style={{
                          width: "100%",
                          minHeight: 92,
                          resize: "vertical",
                          boxSizing: "border-box",
                          borderRadius: 16,
                          border: "1px solid rgba(37,78,119,0.18)",
                          padding: 12,
                          color: "#07172C",
                          fontSize: 14,
                          fontWeight: 800,
                          lineHeight: 1.45,
                          background: "#FFFFFF",
                          outline: "none",
                        }}
                      />
                      <div style={{ marginTop: 6, color: "#617085", fontSize: 12, fontWeight: 800 }}>
                        {(responseNotes[row.id] || "").length}/500 characters
                      </div>
                    </div>
                  </div>
                  <SecondaryButton
                    type="button"
                    onClick={() => navigateWithOrigin(navigate, APP_ROUTES.TRUST_SLIP, location)}
                    stableHeight={44}
                    minWidth={140}
                    debugId={`community-confirmation-inbox.${row.id}.open-trust-slip`}
                  >
                    Open TrustSlip
                  </SecondaryButton>
                </div>

                <div
                  style={{
                    marginTop: 14,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "repeat(2, minmax(0, 1fr))",
                    gap: 10,
                  }}
                >
                  {RESPONSE_OPTIONS.map((option) => {
                    const key = `${row.id}-${option.type}`;
                    const positive = option.tone === "positive";
                    return (
                      <div
                        key={option.type}
                        style={{
                          ...innerCard(
                            positive
                              ? "#F4FBF7"
                              : option.tone === "caution"
                                ? "#FFFBEB"
                                : "#FEF2F2"
                          ),
                          display: "grid",
                          gap: 8,
                          alignContent: "space-between",
                          minHeight: isCompact ? 0 : 174,
                        }}
                      >
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <span style={pillStyle(option.tone)}>
                            {responseCategoryLabel(option.tone)}
                          </span>
                        </div>
                        <div style={{ color: "#07172C", fontWeight: 1000, fontSize: 16 }}>
                          {option.label}
                        </div>
                        <p style={{ margin: 0, ...helperText(), fontSize: 13 }}>
                          {option.meaning}
                        </p>
                        {positive ? (
                          <PrimaryButton
                            type="button"
                            onClick={() => void answer(row, option)}
                            disabled={Boolean(busyKey)}
                            busy={busyKey === key}
                            busyLabel="Recording..."
                            fullWidth
                            stableHeight={46}
                            debugId={`community-confirmation-inbox.${row.id}.${option.type}`}
                          >
                            {responseActionLabel(option)}
                          </PrimaryButton>
                        ) : (
                          <SecondaryButton
                            type="button"
                            onClick={() => void answer(row, option)}
                            disabled={Boolean(busyKey)}
                            busy={busyKey === key}
                            busyLabel="Recording..."
                            fullWidth
                            stableHeight={46}
                            debugId={`community-confirmation-inbox.${row.id}.${option.type}`}
                          >
                            {responseActionLabel(option)}
                          </SecondaryButton>
                        )}
                      </div>
                    );
                  })}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}

export default CommunityConfirmationInboxPage;
