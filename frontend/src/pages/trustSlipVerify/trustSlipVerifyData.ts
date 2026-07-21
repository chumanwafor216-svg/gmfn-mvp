import * as api from "../../lib/api";

export type TrustSlipVerifyRecord = {
  id?: number;
  code?: string | null;
  holder_name?: string | null;
  gmfn_id?: string | null;
  status?: string | null;
  verification_status?: string | null;
  state?: string | null;
  trust_band?: string | null;
  trust_class?: string | null;
  trust_score?: string | number | null;
  open_trust_band?: string | null;
  open_trust_class?: string | null;
  open_trust_score?: string | number | null;
  community_trust_band?: string | null;
  community_trust_class?: string | null;
  community_trust_score?: string | number | null;
  community_name?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  trust_limit?: string | number | null;
  trust_slip_limit?: string | number | null;
  currency?: string | null;
  cci_score?: string | number | null;
  cci_score_visibility?: string | null;
  cci_band?: string | null;
  cci_public_label?: string | null;
  cci_public_meaning?: string | null;
  cci_public_boundary?: string | null;
  sponsor_count?: string | number | null;
  profile_image_url?: string | null;
  identity_context?: Record<string, any> | null;
  community_context?: Record<string, any> | null;
  cci_explainer?: Record<string, any> | null;
  identity_verified?: boolean | null;
  identity_status_label?: string | null;
  community_global_id?: string | null;
  community_code?: string | null;
  holder_role?: string | null;
  community_member_count?: string | number | null;
  active_member_count?: string | number | null;
  total_member_count?: string | number | null;
  community_activity_count?: string | number | null;
  community_activity_latest_at?: string | null;
  community_activity_categories?: string[] | null;
  community_activity_label?: string | null;
  next_witness_renewal_at?: string | null;
  next_witness_renewal_status?: string | null;
  next_witness_renewal_status_label?: string | null;
  membership_currentness_label?: string | null;
  membership_currentness_scope?: string | null;
  community_evidence_currentness_status?: string | null;
  community_evidence_currentness_label?: string | null;
  community_evidence_currentness_scope?: string | null;
  member_credential_page?: string | null;
  phone_verified?: boolean | null;
  merchant_verify_active?: boolean | null;
  visibility_level?: string | null;
  last_release_at?: string | null;
  last_full_repayment_at?: string | null;
  days_since_last_full_repayment?: string | number | null;
  snapshot_version?: string | null;
  snapshot_checksum?: string | null;
  is_current?: boolean | null;
  risk_flags?: string[];
  commitment_discipline?: Record<string, any> | null;
  personal_commitment_discipline?: Record<string, any> | null;
  human_terms?: Record<string, string> | null;
  verification_note?: string | null;
  disclaimer?: string | null;
  issued_at?: string | null;
  expires_at?: string | null;
  valid?: boolean | null;
  verified?: boolean | null;
  recipient_access_record?: Record<string, any> | null;
  access_recipient_label?: string | null;
  access_purpose?: string | null;
  access_scope?: string | null;
  access_recorded_at?: string | null;
  access_status?: string | null;
  access_note?: string | null;
  message?: string | null;
  detail?: string | null;
  community_confirmation?: CommunityConfirmationSummary | null;
};

export type CommunityConfirmationSummary = {
  community_status?: string | null;
  community_name?: string | null;
  community_id?: string | number | null;
  community_code?: string | null;
  approval_type?: string | null;
  active_member_count?: string | number | null;
  contactable_reference_count?: string | number | null;
  sponsor_signal_count?: string | number | null;
  last_community_confirmation?: string | null;
  relay_available?: boolean | null;
  instant_pulse_available?: boolean | null;
  request_action?: string | null;
  plain_language?: string | null;
};

export type CommunityConfirmationOutcome = {
  public_token?: string | null;
  status?: string | null;
  mode?: string | null;
  visible_summary?: string | null;
  privacy_note?: string | null;
  decision_note?: string | null;
  requester_callback?: {
    requested?: boolean | null;
    channel?: string | null;
    contact_masked?: string | null;
    consent_recorded?: boolean | null;
    delivery_status?: string | null;
    delivery_note?: string | null;
    result_link_is_source_of_truth?: boolean | null;
  } | null;
  community_response?: {
    requests_sent?: number | null;
    active_member_count?: number | null;
    responses_received?: number | null;
    confirmed_known_count?: number | null;
    caution_count?: number | null;
    objection_count?: number | null;
    community_confidence?: string | null;
    private_contacts_exposed?: boolean | null;
  } | null;
};

export type VerifyBannerTone = "success" | "warning" | "error" | "info";

export type VerifyBanner = {
  tone: VerifyBannerTone;
  title: string;
  detail: string;
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

function firstBoolean(...values: any[]): boolean | null {
  for (const value of values) {
    if (typeof value === "boolean") return value;
    const text = safeStr(value).toLowerCase();
    if (text === "true") return true;
    if (text === "false") return false;
  }
  return null;
}

function positiveNumber(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function normalizeTrustSlipVerification(
  raw: any,
  fallbackCode: string
): TrustSlipVerifyRecord | null {
  if (!raw) return null;

  const src = raw?.item || raw?.trust_slip || raw?.verification || raw;
  const merchantView = src?.merchant_view || {};
  const merchantSummary = merchantView?.merchant_summary || src?.merchant_summary || {};
  const evidenceSummary = src?.evidence_summary || merchantView?.evidence_summary || {};
  const identityContext = src?.identity_context || merchantView?.identity_context || {};
  const communityContext = src?.community_context || merchantView?.community_context || {};
  const cciExplainer =
    src?.cci_explainer || merchantView?.cci_explainer || merchantSummary?.cci_explainer || {};

  return {
    id: positiveNumber(firstTruthy(src?.id, src?.trust_slip_id)) || undefined,
    code: firstTruthy(src?.code, src?.trust_slip_code, fallbackCode),
    holder_name: firstTruthy(
      src?.holder_name,
      src?.display_name,
      merchantView?.display_name,
      merchantSummary?.display_name,
      src?.name,
      src?.member_name
    ),
    gmfn_id: firstTruthy(
      src?.gmfn_id,
      src?.holder_gmfn_id,
      merchantView?.gmfn_id,
      merchantSummary?.gmfn_id
    ),
    status: firstTruthy(src?.status),
    verification_status: firstTruthy(src?.verification_status, src?.effective_status),
    state: firstTruthy(src?.state),
    trust_band: firstTruthy(src?.trust_band, src?.band, merchantView?.band, src?.trust_class),
    trust_class: firstTruthy(src?.trust_class, src?.trust_band),
    trust_score: firstNumberLike(src?.trust_score, src?.cci_score, merchantView?.cci_score),
    open_trust_band: firstTruthy(
      src?.open_trust_band,
      src?.community_trust_band,
      src?.trust_band,
      src?.band,
      merchantView?.band,
      src?.open_trust_class
    ),
    open_trust_class: firstTruthy(
      src?.open_trust_class,
      src?.community_trust_class,
      src?.open_trust_band
    ),
    open_trust_score: firstNumberLike(
      src?.open_trust_score,
      src?.community_trust_score,
      src?.cci_score,
      merchantView?.cci_score
    ),
    community_trust_band: firstTruthy(src?.community_trust_band, src?.open_trust_band),
    community_trust_class: firstTruthy(src?.community_trust_class, src?.open_trust_class),
    community_trust_score: firstNumberLike(
      src?.community_trust_score,
      src?.open_trust_score,
      src?.cci_score,
      merchantView?.cci_score
    ),
    community_name: firstTruthy(
      src?.community_name,
      src?.community,
      merchantView?.community,
      merchantSummary?.community,
      src?.clan_name,
      src?.marketplace_name
    ),
    clan_name: firstTruthy(src?.clan_name),
    marketplace_name: firstTruthy(src?.marketplace_name),
    trust_limit: firstTruthy(
      src?.trust_limit,
      src?.trust_slip_limit,
      merchantView?.trust_limit,
      merchantSummary?.trust_limit
    ),
    trust_slip_limit: firstTruthy(
      src?.trust_slip_limit,
      src?.trust_limit,
      merchantView?.trust_limit,
      merchantSummary?.trust_limit
    ),
    currency: firstTruthy(src?.currency, merchantView?.currency, merchantSummary?.currency),
    cci_score: firstNumberLike(src?.cci_score, merchantView?.cci_score, merchantSummary?.cci_score),
    cci_score_visibility: firstTruthy(src?.cci_score_visibility, merchantView?.cci_score_visibility),
    cci_band: firstTruthy(src?.cci_band, merchantView?.cci_band, merchantSummary?.cci_band),
    cci_public_label: firstTruthy(
      src?.cci_public_label,
      merchantView?.cci_public_label,
      merchantSummary?.cci_public_label,
      cciExplainer?.public_label
    ),
    cci_public_meaning: firstTruthy(
      src?.cci_public_meaning,
      merchantView?.cci_public_meaning,
      merchantSummary?.cci_public_meaning,
      cciExplainer?.public_meaning
    ),
    cci_public_boundary: firstTruthy(
      src?.cci_public_boundary,
      merchantView?.cci_public_boundary,
      merchantSummary?.cci_public_boundary,
      cciExplainer?.public_boundary
    ),
    sponsor_count: firstNumberLike(
      src?.sponsor_count,
      merchantView?.sponsor_count,
      merchantSummary?.sponsor_count
    ),
    profile_image_url: firstTruthy(
      src?.profile_image_url,
      merchantView?.profile_image_url,
      merchantSummary?.profile_image_url,
      identityContext?.profile_image_url
    ),
    identity_context: identityContext,
    community_context: communityContext,
    cci_explainer: cciExplainer,
    identity_verified: firstBoolean(src?.identity_verified, identityContext?.identity_verified),
    identity_status_label: firstTruthy(
      src?.identity_status_label,
      merchantView?.identity_status_label,
      merchantSummary?.identity_status_label,
      identityContext?.identity_status_label
    ),
    community_global_id: firstTruthy(
      src?.community_global_id,
      src?.community_code,
      merchantView?.community_global_id,
      merchantSummary?.community_global_id,
      communityContext?.community_global_id,
      communityContext?.community_code
    ),
    community_code: firstTruthy(src?.community_code, communityContext?.community_code),
    holder_role: firstTruthy(
      src?.holder_role,
      merchantView?.holder_role,
      merchantSummary?.holder_role,
      communityContext?.holder_role
    ),
    community_member_count: firstNumberLike(
      src?.community_member_count,
      src?.active_member_count,
      merchantView?.active_member_count,
      merchantSummary?.active_member_count,
      communityContext?.active_member_count
    ),
    active_member_count: firstNumberLike(
      src?.active_member_count,
      merchantView?.active_member_count,
      merchantSummary?.active_member_count,
      communityContext?.active_member_count
    ),
    total_member_count: firstNumberLike(
      src?.total_member_count,
      communityContext?.total_member_count
    ),
    community_activity_count: firstNumberLike(
      src?.community_activity_count,
      merchantView?.community_activity_count,
      merchantSummary?.community_activity_count,
      communityContext?.community_activity_count
    ),
    community_activity_latest_at: firstTruthy(
      src?.community_activity_latest_at,
      merchantView?.community_activity_latest_at,
      merchantSummary?.community_activity_latest_at,
      communityContext?.community_activity_latest_at
    ),
    community_activity_categories: Array.isArray(src?.community_activity_categories)
      ? src.community_activity_categories
      : Array.isArray(merchantView?.community_activity_categories)
        ? merchantView.community_activity_categories
        : Array.isArray(merchantSummary?.community_activity_categories)
          ? merchantSummary.community_activity_categories
          : Array.isArray(communityContext?.community_activity_categories)
            ? communityContext.community_activity_categories
            : [],
    community_activity_label: firstTruthy(
      src?.community_activity_label,
      merchantView?.community_activity_label,
      merchantSummary?.community_activity_label,
      communityContext?.community_activity_label
    ),
    next_witness_renewal_at: firstTruthy(
      src?.next_witness_renewal_at,
      merchantView?.next_witness_renewal_at,
      merchantSummary?.next_witness_renewal_at,
      communityContext?.next_witness_renewal_at
    ),
    next_witness_renewal_status: firstTruthy(
      src?.next_witness_renewal_status,
      merchantView?.next_witness_renewal_status,
      merchantSummary?.next_witness_renewal_status,
      communityContext?.next_witness_renewal_status
    ),
    next_witness_renewal_status_label: firstTruthy(
      src?.next_witness_renewal_status_label,
      merchantView?.next_witness_renewal_status_label,
      merchantSummary?.next_witness_renewal_status_label,
      communityContext?.next_witness_renewal_status_label
    ),
    membership_currentness_label: firstTruthy(
      src?.membership_currentness_label,
      merchantView?.membership_currentness_label,
      merchantSummary?.membership_currentness_label,
      communityContext?.membership_currentness_label
    ),
    membership_currentness_scope: firstTruthy(
      src?.membership_currentness_scope,
      merchantView?.membership_currentness_scope,
      merchantSummary?.membership_currentness_scope,
      communityContext?.membership_currentness_scope
    ),
    community_evidence_currentness_status: firstTruthy(
      src?.community_evidence_currentness_status,
      merchantView?.community_evidence_currentness_status,
      merchantSummary?.community_evidence_currentness_status,
      communityContext?.community_evidence_currentness_status
    ),
    community_evidence_currentness_label: firstTruthy(
      src?.community_evidence_currentness_label,
      merchantView?.community_evidence_currentness_label,
      merchantSummary?.community_evidence_currentness_label,
      communityContext?.community_evidence_currentness_label
    ),
    community_evidence_currentness_scope: firstTruthy(
      src?.community_evidence_currentness_scope,
      merchantView?.community_evidence_currentness_scope,
      merchantSummary?.community_evidence_currentness_scope,
      communityContext?.community_evidence_currentness_scope
    ),
    member_credential_page: firstTruthy(
      src?.member_credential_page,
      merchantView?.member_credential_page,
      merchantSummary?.member_credential_page,
      communityContext?.member_credential_page
    ),
    phone_verified: firstBoolean(
      src?.phone_verified,
      merchantView?.phone_verified,
      merchantSummary?.phone_verified
    ),
    merchant_verify_active: firstBoolean(
      src?.merchant_verify_active,
      merchantView?.merchant_verify_active
    ),
    visibility_level: firstTruthy(src?.visibility_level, merchantView?.visibility_level),
    last_release_at: firstTruthy(src?.last_release_at, merchantView?.last_release_at),
    last_full_repayment_at: firstTruthy(
      src?.last_full_repayment_at,
      merchantView?.last_full_repayment_at
    ),
    days_since_last_full_repayment: firstNumberLike(
      src?.days_since_last_full_repayment,
      merchantView?.days_since_last_full_repayment
    ),
    snapshot_version: firstTruthy(src?.snapshot_version),
    snapshot_checksum: firstTruthy(src?.snapshot_checksum),
    is_current: firstBoolean(src?.is_current, merchantView?.is_current),
    risk_flags: Array.isArray(src?.risk_flags)
      ? src.risk_flags
      : Array.isArray(merchantView?.risk_flags)
        ? merchantView.risk_flags
        : [],
    commitment_discipline:
      src?.commitment_discipline || evidenceSummary?.commitment_discipline || null,
    personal_commitment_discipline:
      src?.personal_commitment_discipline ||
      evidenceSummary?.personal_commitment_discipline ||
      null,
    human_terms: src?.human_terms || evidenceSummary?.human_terms || null,
    verification_note: firstTruthy(src?.verification_note),
    disclaimer: firstTruthy(src?.disclaimer, merchantView?.disclaimer),
    issued_at: firstTruthy(src?.issued_at, src?.created_at),
    expires_at: firstTruthy(src?.expires_at, src?.expiry_at),
    valid:
      typeof src?.valid === "boolean"
        ? src.valid
        : typeof src?.is_valid === "boolean"
          ? src.is_valid
          : null,
    verified:
      typeof src?.verified === "boolean"
        ? src.verified
        : typeof src?.is_verified === "boolean"
          ? src.is_verified
          : null,
    recipient_access_record:
      src?.recipient_access_record ||
      src?.access_record ||
      src?.share_access_record ||
      src?.viewer_access_record ||
      null,
    access_recipient_label: firstTruthy(
      src?.access_recipient_label,
      src?.recipient_label,
      src?.recipient,
      src?.recipient_name,
      src?.viewer_label,
      src?.viewer_name,
      src?.recipient_access_record?.recipient_label,
      src?.access_record?.recipient_label,
      src?.share_access_record?.recipient_label,
      src?.viewer_access_record?.recipient_label
    ),
    access_purpose: firstTruthy(
      src?.access_purpose,
      src?.purpose,
      src?.share_purpose,
      src?.intended_purpose,
      src?.recipient_access_record?.purpose,
      src?.access_record?.purpose,
      src?.share_access_record?.purpose,
      src?.viewer_access_record?.purpose
    ),
    access_scope: firstTruthy(
      src?.access_scope,
      src?.scope,
      src?.share_scope,
      src?.visibility_level,
      src?.recipient_access_record?.scope,
      src?.access_record?.scope,
      src?.share_access_record?.scope,
      src?.viewer_access_record?.scope
    ),
    access_recorded_at: firstTruthy(
      src?.access_recorded_at,
      src?.accessed_at,
      src?.viewed_at,
      src?.last_accessed_at,
      src?.recipient_access_record?.accessed_at,
      src?.recipient_access_record?.viewed_at,
      src?.access_record?.accessed_at,
      src?.access_record?.viewed_at,
      src?.share_access_record?.accessed_at,
      src?.viewer_access_record?.accessed_at
    ),
    access_status: firstTruthy(
      src?.access_status,
      src?.recipient_access_record?.status,
      src?.access_record?.status,
      src?.share_access_record?.status,
      src?.viewer_access_record?.status
    ),
    access_note: firstTruthy(
      src?.access_note,
      src?.recipient_access_record?.note,
      src?.access_record?.note,
      src?.share_access_record?.note,
      src?.viewer_access_record?.note
    ),
    message: firstTruthy(src?.message),
    detail: firstTruthy(src?.detail, src?.description),
    community_confirmation:
      src?.community_confirmation ||
      merchantView?.community_confirmation ||
      merchantSummary?.community_confirmation ||
      null,
  };
}

export async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

export function deriveBanner(record: TrustSlipVerifyRecord | null): VerifyBanner {
  if (!record) {
    return {
      tone: "error",
      title: "No usable TrustSlip record was found",
      detail:
        "The supplied TrustSlip code did not return a usable verification record from the available verification source.",
    };
  }

  const statusText = [
    safeStr(record.status),
    safeStr(record.verification_status),
    safeStr(record.state),
  ]
    .join(" ")
    .toLowerCase();

  const expiresAt = safeStr(record.expires_at);
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired =
    expiresDate && Number.isFinite(expiresDate.getTime())
      ? expiresDate.getTime() < Date.now()
      : false;

  if (record.is_current === false) {
    return {
      tone: "warning",
      title: "Needs fresh TrustSlip",
      detail:
        "This public paper has been replaced by a newer TrustSlip. Ask the holder to share the latest QR or code before relying on it.",
    };
  }

  if (isExpired || statusText.includes("expired")) {
    return {
      tone: "warning",
      title: "Needs fresh TrustSlip",
      detail:
        "The verification window has ended. Ask the holder to refresh or generate a current TrustSlip before relying on it.",
    };
  }

  if (
    record.valid === false ||
    record.verified === false ||
    statusText.includes("revoked") ||
    statusText.includes("invalid") ||
    statusText.includes("rejected")
  ) {
    return {
      tone: "error",
      title: "Not valid now",
      detail:
        "Do not rely on this public paper. Ask for a new TrustSlip or stronger community confirmation.",
    };
  }

  if (
    statusText.includes("pending") ||
    statusText.includes("preparing") ||
    statusText.includes("processing")
  ) {
    return {
      tone: "warning",
      title: "Waiting for confirmation",
      detail:
        "The record exists, but it is not fully confirmed yet. Treat it as limited evidence.",
    };
  }

  return {
    tone: "success",
    title: "Valid now",
    detail:
      "This code points to a current public TrustSlip. Use it as evidence, not as a guarantee.",
  };
}
