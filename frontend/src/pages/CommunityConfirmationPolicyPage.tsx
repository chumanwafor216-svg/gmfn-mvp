import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useLocation, useNavigate } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import PageTopNav from "../components/PageTopNav";
import { PrimaryButton, SecondaryButton } from "../components/StableButton";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { APP_ROUTES } from "../lib/appRoutes";
import {
  createCommunityMemberVerificationRequest,
  decideCommunityMemberVerificationRequest,
  decideCommunityDomainAffiliation,
  getCommunityDomainAffiliations,
  getCommunityMemberVerificationRequest,
  getCommunityMemberVerificationSummary,
  getCommunityConfirmationPolicy,
  getSelectedClanId,
  listCommunityExternalRegistrationEvidence,
  listClanMembers,
  recordCommunityExternalRegistrationEvidence,
  recordCommunityMemberVerification,
  requestCommunityDomainAffiliation,
  safeCopy,
  updateCommunityConfirmationContact,
  updateCommunityConfirmationPolicy,
  withdrawCommunityMemberVerification,
} from "../lib/api";
import {
  institutionalInnerCard,
  institutionalPageCard,
  institutionalSoftCard,
  institutionalStatTile,
} from "../lib/institutionalSurface";
import { buildGsnSnapshotPaper } from "../lib/gsnSnapshotPaper";
import { navigateWithOrigin } from "../lib/nav";
import { publicFrontendUrl } from "../lib/publicLinks";
import { revealElementWithoutJump } from "../lib/mobileRevealStability";

type Policy = {
  relay_enabled?: boolean | null;
  instant_pulse_enabled?: boolean | null;
  public_confirmation_enabled?: boolean | null;
  minimum_positive_responses?: number | null;
  maximum_relay_contacts?: number | null;
  response_window_seconds?: number | null;
  review_attention_after_hours?: number | null;
  review_overdue_after_hours?: number | null;
  active_member_count?: number | null;
  contactable_reference_count?: number | null;
  relay_available?: boolean | null;
};

type RelayContact = {
  user_id: number;
  display_name?: string | null;
  gsn_id?: string | null;
  profile_image_url?: string | null;
  phone_verified?: boolean | null;
  membership_role?: string | null;
  role_type?: string | null;
  active?: boolean | null;
  can_receive_relay_requests?: boolean | null;
  can_receive_instant_pulse?: boolean | null;
  standing_status?: string | null;
  receiving_requests?: boolean | null;
  member_opted_out?: boolean | null;
  plain_language?: string | null;
};

type Notice = {
  tone: "success" | "error";
  text: string;
};

type DomainAffiliation = {
  id: number;
  status: string;
  parentCommunityId?: number | null;
  parentCommunityName?: string | null;
  parentCommunityCode?: string | null;
  affiliateCommunityId?: number | null;
  affiliateCommunityName?: string | null;
  affiliateCommunityCode?: string | null;
  requestNote?: string | null;
  decisionNote?: string | null;
  requestedAt?: string | null;
  decidedAt?: string | null;
};

type ExternalRegistrationEvidenceRecord = {
  id: number;
  eventType: string;
  status: string;
  registrationType: string;
  registrationReferenceRecorded: boolean;
  registeredNameRecorded: boolean;
  issuingBody?: string | null;
  noteRecorded: boolean;
  evidenceFingerprint?: string | null;
  rawReferenceStored: boolean;
  verificationEffect: string;
  createdAt?: string | null;
};

type CommunityMember = {
  membershipId: number;
  userId: number;
  displayLabel: string;
  gsnId?: string | null;
  role?: string | null;
  joinedAt?: string | null;
};

type MemberWitnessItem = {
  id: number;
  status: string;
  verifierLabel?: string | null;
  verifierGsnId?: string | null;
  claimLabel?: string | null;
  validUntil?: string | null;
  withdrawnAt?: string | null;
};

type MemberWitnessSummary = {
  subjectUserId?: number | null;
  activeCount: number;
  totalCount: number;
  strengthLabel: string;
  publicLabel: string;
  renewalStatus?: string | null;
  renewalStatusLabel?: string | null;
  validUntil?: string | null;
  items: MemberWitnessItem[];
};

type MemberWitnessRequest = {
  id: number;
  communityId?: number | null;
  communityCode?: string | null;
  subjectUserId?: number | null;
  subjectGsnId?: string | null;
  subjectDisplayName?: string | null;
  verifierUserId?: number | null;
  verifierGsnId?: string | null;
  verifierDisplayName?: string | null;
  publicToken: string;
  oneTimeCode?: string | null;
  status: string;
  claimLabel?: string | null;
  requestNote?: string | null;
  responseNote?: string | null;
  expiresAt?: string | null;
  decidedAt?: string | null;
  approvalPath?: string | null;
};

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

function memberWitnessErrorMessage(error: any, fallback: string): string {
  const message = firstTruthy(error?.message, error?.detail);
  if (/current community witness standing/i.test(message)) {
    return (
      "This member cannot stand as a verifier yet. Choose a community admin or a member "
      + "who already has current witness standing in this community."
    );
  }
  if (/yearly member-witness limit/i.test(message)) {
    return (
      "This verifier has reached their yearly witness limit. Choose another member with "
      + "current witness standing."
    );
  }
  return firstTruthy(message, fallback);
}

function rowsOf<T = any>(value: any): T[] {
  if (Array.isArray(value)) return value as T[];
  if (Array.isArray(value?.items)) return value.items as T[];
  if (Array.isArray(value?.contacts)) return value.contacts as T[];
  if (Array.isArray(value?.data?.contacts)) return value.data.contacts as T[];
  return [];
}

function dateLabel(value: any): string {
  const text = safeStr(value);
  if (!text) return "Not set";
  const parsed = new Date(text);
  if (Number.isNaN(parsed.getTime())) return text;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function hoursLabel(value: number | null | undefined): string {
  const hours = Number(value || 0);
  if (!Number.isFinite(hours) || hours <= 0) return "Not set";
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? "" : "s"}`;
  return `${hours} hour${hours === 1 ? "" : "s"}`;
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
    borderRadius: 22,
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

function fieldStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 52,
    borderRadius: 16,
    border: "1px solid rgba(37,78,119,0.18)",
    background: "#FFFFFF",
    color: "#07172C",
    font: "inherit",
    fontSize: 16,
    fontWeight: 850,
    padding: "12px 14px",
    outline: "none",
    boxSizing: "border-box",
  };
}

function statusPill(active: boolean, label: string): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "7px 10px",
    background: active ? "#EEF9F1" : "#FEF2F2",
    border: `1px solid ${active ? "rgba(46,155,98,0.22)" : "rgba(220,38,38,0.22)"}`,
    color: active ? "#166534" : "#991B1B",
    fontSize: label.length > 14 ? 11 : 12,
    fontWeight: 950,
    whiteSpace: "nowrap",
  };
}

function statusTone(status: string): "green" | "gold" | "red" | "blue" {
  const normalized = safeStr(status).toLowerCase();
  if (normalized === "approved") return "green";
  if (normalized === "pending") return "gold";
  if (normalized === "rejected" || normalized === "revoked") return "red";
  return "blue";
}

function iconTile(
  name: GsnIconName,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "navy",
  size = 17
) {
  const palette = {
    navy: {
      color: "#0B2D4A",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(13,95,168,0.14)",
    },
    blue: {
      color: "#0B63D1",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(29,95,212,0.18)",
    },
    gold: {
      color: "#7A4A00",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(214,170,69,0.32)",
    },
    green: {
      color: "#065F46",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(34,197,94,0.18)",
    },
    red: {
      color: "#991B1B",
      background: "rgba(255,255,255,0.96)",
      border: "1px solid rgba(239,68,68,0.18)",
    },
  }[tone];

  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        borderRadius: 12,
        display: "inline-grid",
        placeItems: "center",
        flex: "0 0 auto",
        boxShadow:
          "0 8px 16px rgba(2,6,23,0.08), inset 0 1px 0 rgba(255,255,255,0.96)",
        ...palette,
      }}
    >
      <GsnLegacyIcon name={name} size={Math.max(24, Math.round(size * 1.55))} />
    </span>
  );
}

function labelWithIcon(
  name: GsnIconName,
  label: React.ReactNode,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "blue"
) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {iconTile(name, tone, 16)}
      <span>{label}</span>
    </span>
  );
}

function sectionLabelWithIcon(
  name: GsnIconName,
  label: string,
  tone: "navy" | "blue" | "gold" | "green" | "red" = "blue"
) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      {iconTile(name, tone, 16)}
      <span style={sectionLabel()}>{label}</span>
    </div>
  );
}

function statusPillWithIcon(active: boolean, label: string, icon: GsnIconName) {
  return (
    <span style={{ ...statusPill(active, label), display: "inline-flex", alignItems: "center", gap: 7 }}>
      {iconTile(icon, active ? "green" : "red", 14)}
      <span>{label}</span>
    </span>
  );
}

function MeaningTile({
  icon,
  label,
  title,
  text,
  tone = "info",
}: {
  icon: GsnIconName;
  label: string;
  title: string;
  text: string;
  tone?: "good" | "warn" | "info";
}) {
  const palette =
    tone === "good"
      ? { background: "#EEF9F1", color: "#166534", iconTone: "green" as const }
      : tone === "warn"
        ? { background: "#FFF7E0", color: "#7A4A00", iconTone: "gold" as const }
        : { background: "#F8FBFF", color: "#073E83", iconTone: "blue" as const };

  return (
    <div
      style={{
        ...innerCard(palette.background),
        minHeight: 132,
        display: "grid",
        alignContent: "start",
        gap: 8,
      }}
    >
      <div style={{ color: palette.color, fontWeight: 1000 }}>
        {labelWithIcon(icon, label, palette.iconTone)}
      </div>
      <strong style={{ color: "#07172C", fontSize: 16, fontWeight: 1000, lineHeight: 1.2 }}>
        {title}
      </strong>
      <p style={{ margin: 0, ...helperText(), fontSize: 13 }}>
        {text}
      </p>
    </div>
  );
}

function normalizeDomainAffiliation(raw: any): DomainAffiliation | null {
  const id = Number(raw?.id || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  const parent = raw?.parent_community || raw?.parentCommunity || {};
  const affiliate = raw?.affiliate_community || raw?.affiliateCommunity || {};
  return {
    id,
    status: firstTruthy(raw?.status, "pending").toLowerCase(),
    parentCommunityId: Number(parent?.id || raw?.parent_clan_id || raw?.parentCommunityId || 0) || null,
    parentCommunityName: firstTruthy(parent?.name, raw?.parent_community_name),
    parentCommunityCode: firstTruthy(parent?.community_code, raw?.parent_community_code),
    affiliateCommunityId:
      Number(affiliate?.id || raw?.affiliate_clan_id || raw?.affiliateCommunityId || 0) || null,
    affiliateCommunityName: firstTruthy(affiliate?.name, raw?.affiliate_community_name),
    affiliateCommunityCode: firstTruthy(affiliate?.community_code, raw?.affiliate_community_code),
    requestNote: firstTruthy(raw?.request_note, raw?.requestNote),
    decisionNote: firstTruthy(raw?.decision_note, raw?.decisionNote),
    requestedAt: firstTruthy(raw?.created_at, raw?.requested_at, raw?.requestedAt),
    decidedAt: firstTruthy(raw?.decided_at, raw?.decidedAt),
  };
}

function normalizeExternalRegistrationEvidence(
  raw: any
): ExternalRegistrationEvidenceRecord | null {
  const id = Number(raw?.id || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    eventType: firstTruthy(raw?.event_type, raw?.eventType),
    status: firstTruthy(raw?.status, "recorded").toLowerCase(),
    registrationType: firstTruthy(raw?.registration_type, raw?.registrationType, "CAC"),
    registrationReferenceRecorded: Boolean(
      raw?.registration_reference_recorded ?? raw?.registrationReferenceRecorded
    ),
    registeredNameRecorded: Boolean(raw?.registered_name_recorded ?? raw?.registeredNameRecorded),
    issuingBody: firstTruthy(raw?.issuing_body, raw?.issuingBody),
    noteRecorded: Boolean(raw?.note_recorded ?? raw?.noteRecorded),
    evidenceFingerprint: firstTruthy(raw?.evidence_fingerprint, raw?.evidenceFingerprint),
    rawReferenceStored: Boolean(raw?.raw_reference_stored ?? raw?.rawReferenceStored),
    verificationEffect: firstTruthy(raw?.verification_effect, raw?.verificationEffect, "none"),
    createdAt: firstTruthy(raw?.created_at, raw?.createdAt),
  };
}

function normalizeContact(raw: any): RelayContact | null {
  const userId = Number(raw?.user_id || raw?.userId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  return {
    user_id: userId,
    display_name: firstTruthy(raw?.display_name, raw?.displayName),
    gsn_id: firstTruthy(raw?.gsn_id, raw?.gmfn_id, raw?.gmfnId),
    profile_image_url: firstTruthy(raw?.profile_image_url, raw?.profileImageUrl),
    phone_verified: Boolean(raw?.phone_verified),
    membership_role: firstTruthy(raw?.membership_role),
    role_type: firstTruthy(raw?.role_type),
    active: Boolean(raw?.active),
    can_receive_relay_requests: Boolean(raw?.can_receive_relay_requests),
    can_receive_instant_pulse: Boolean(raw?.can_receive_instant_pulse),
    standing_status: firstTruthy(raw?.standing_status),
    receiving_requests: Boolean(raw?.receiving_requests),
    member_opted_out: Boolean(raw?.member_opted_out),
    plain_language: firstTruthy(raw?.plain_language),
  };
}

function normalizeMember(raw: any): CommunityMember | null {
  const userId = Number(raw?.user_id || raw?.userId || 0);
  const membershipId = Number(raw?.id || raw?.membership_id || raw?.membershipId || 0);
  if (!Number.isFinite(userId) || userId <= 0) return null;
  const gsnId = firstTruthy(raw?.gmfn_id, raw?.gsn_id, raw?.gmfnId, raw?.gsnId);
  const role = firstTruthy(raw?.role, raw?.membership_role);
  return {
    membershipId: Number.isFinite(membershipId) && membershipId > 0 ? membershipId : userId,
    userId,
    displayLabel: firstTruthy(raw?.display_name, raw?.name, gsnId, `Member ${userId}`),
    gsnId,
    role,
    joinedAt: firstTruthy(raw?.created_at, raw?.joined_at),
  };
}

function normalizeWitnessItem(raw: any): MemberWitnessItem | null {
  const id = Number(raw?.id || 0);
  if (!Number.isFinite(id) || id <= 0) return null;
  return {
    id,
    status: firstTruthy(raw?.status, "active").toLowerCase(),
    verifierLabel: firstTruthy(raw?.verifier_display_name, raw?.verifierDisplayName),
    verifierGsnId: firstTruthy(raw?.verifier_gsn_id, raw?.verifierGsnId),
    claimLabel: firstTruthy(raw?.claim_label, raw?.claimLabel),
    validUntil: firstTruthy(raw?.valid_until, raw?.validUntil),
    withdrawnAt: firstTruthy(raw?.withdrawn_at, raw?.withdrawnAt),
  };
}

function normalizeWitnessSummary(raw: any): MemberWitnessSummary {
  const source = raw?.verification_summary || raw?.summary || raw || {};
  return {
    subjectUserId: Number(source?.subject_user_id || raw?.membership?.user_id || 0) || null,
    activeCount: Number(source?.active_verification_count || source?.activeCount || 0) || 0,
    totalCount: Number(source?.total_verification_count || source?.totalCount || 0) || 0,
    strengthLabel: firstTruthy(
      source?.strength_label,
      source?.strengthLabel,
      "Joined / witness not started"
    ),
    publicLabel: firstTruthy(
      source?.public_label,
      source?.publicLabel,
      "Active community member; witness evidence limited"
    ),
    renewalStatus: firstTruthy(source?.renewal_status, source?.renewalStatus),
    renewalStatusLabel: firstTruthy(source?.renewal_status_label, source?.renewalStatusLabel),
    validUntil: firstTruthy(source?.valid_until, source?.validUntil),
    items: rowsOf<any>(source?.items).map(normalizeWitnessItem).filter(Boolean) as MemberWitnessItem[],
  };
}

function normalizeWitnessRequest(raw: any): MemberWitnessRequest | null {
  const source = raw?.request || raw || {};
  const id = Number(source?.id || 0);
  const publicToken = firstTruthy(source?.public_token, source?.publicToken);
  if (!Number.isFinite(id) || id <= 0 || !publicToken) return null;
  return {
    id,
    communityId: Number(source?.community_id || source?.communityId || 0) || null,
    communityCode: firstTruthy(source?.community_code, source?.communityCode),
    subjectUserId: Number(source?.subject_user_id || source?.subjectUserId || 0) || null,
    subjectGsnId: firstTruthy(source?.subject_gsn_id, source?.subjectGsnId),
    subjectDisplayName: firstTruthy(source?.subject_display_name, source?.subjectDisplayName),
    verifierUserId: Number(source?.verifier_user_id || source?.verifierUserId || 0) || null,
    verifierGsnId: firstTruthy(source?.verifier_gsn_id, source?.verifierGsnId),
    verifierDisplayName: firstTruthy(source?.verifier_display_name, source?.verifierDisplayName),
    publicToken,
    oneTimeCode: firstTruthy(source?.one_time_code, source?.oneTimeCode),
    status: firstTruthy(source?.status, "pending").toLowerCase(),
    claimLabel: firstTruthy(source?.claim_label, source?.claimLabel),
    requestNote: firstTruthy(source?.request_note, source?.requestNote),
    responseNote: firstTruthy(source?.response_note, source?.responseNote),
    expiresAt: firstTruthy(source?.expires_at, source?.expiresAt),
    decidedAt: firstTruthy(source?.decided_at, source?.decidedAt),
    approvalPath: firstTruthy(source?.approval_path, source?.approvalPath),
  };
}

function CommunityConfirmationPolicyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCompact, setIsCompact] = useState(() =>
    typeof window === "undefined" ? false : window.innerWidth <= 820
  );
  const [communityId] = useState(() => {
    const params = new URLSearchParams(location.search);
    return Number(params.get("community_id") || params.get("clan_id") || getSelectedClanId() || 0);
  });
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [busyKey, setBusyKey] = useState("");
  const [community, setCommunity] = useState<any>(null);
  const [policy, setPolicy] = useState<Policy>({});
  const [contacts, setContacts] = useState<RelayContact[]>([]);
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [affiliationLoading, setAffiliationLoading] = useState(false);
  const [externalRegistrationLoading, setExternalRegistrationLoading] = useState(false);
  const [memberVerificationLoading, setMemberVerificationLoading] = useState(false);
  const [incomingAffiliations, setIncomingAffiliations] = useState<DomainAffiliation[]>([]);
  const [outgoingAffiliations, setOutgoingAffiliations] = useState<DomainAffiliation[]>([]);
  const [externalRegistrationRecords, setExternalRegistrationRecords] = useState<
    ExternalRegistrationEvidenceRecord[]
  >([]);
  const [parentCommunityKey, setParentCommunityKey] = useState("");
  const [externalRegistrationType, setExternalRegistrationType] = useState("CAC");
  const [externalRegistrationReference, setExternalRegistrationReference] = useState("");
  const [externalRegisteredName, setExternalRegisteredName] = useState("");
  const [externalIssuingBody, setExternalIssuingBody] = useState("Corporate Affairs Commission");
  const [externalRegistrationNote, setExternalRegistrationNote] = useState("");
  const [selectedSubjectUserId, setSelectedSubjectUserId] = useState("");
  const [memberWitnessSummary, setMemberWitnessSummary] =
    useState<MemberWitnessSummary | null>(null);
  const [memberWitnessClaim, setMemberWitnessClaim] = useState("");
  const [memberWitnessNote, setMemberWitnessNote] = useState("");
  const [memberWitnessRequestLoading, setMemberWitnessRequestLoading] = useState(false);
  const [memberWitnessRequest, setMemberWitnessRequest] = useState<MemberWitnessRequest | null>(null);
  const [memberWitnessApprovalCode, setMemberWitnessApprovalCode] = useState("");
  const [memberWitnessResponseNote, setMemberWitnessResponseNote] = useState("");
  const policyLoadSeqRef = useRef(0);
  const policyLoadContextRef = useRef("");
  const affiliationsLoadSeqRef = useRef(0);
  const affiliationsLoadContextRef = useRef("");
  const externalRegistrationLoadSeqRef = useRef(0);
  const externalRegistrationLoadContextRef = useRef("");
  const membersLoadSeqRef = useRef(0);
  const membersLoadContextRef = useRef("");
  const memberWitnessSummaryLoadSeqRef = useRef(0);
  const memberWitnessSummaryContextRef = useRef("");
  const memberWitnessRequestLoadSeqRef = useRef(0);
  const memberWitnessRequestContextRef = useRef("");

  const memberWitnessRequestToken = useMemo(() => {
    return firstTruthy(new URLSearchParams(location.search).get("member_witness_request"));
  }, [location.search]);
  const memberWitnessFocus = useMemo(() => {
    return location.hash === "#member-witness" || Boolean(memberWitnessRequestToken);
  }, [location.hash, memberWitnessRequestToken]);

  const copyText = useMemo(() => {
    return buildGsnSnapshotPaper({
      title: "GSN Community Confirmation Policy Summary",
      purpose:
        "Internal policy summary for controlled community confirmation, relay, and review routing.",
      reference: `community-policy-${communityId || "pending"}`,
      context: [
        {
          label: "Community",
          value: firstTruthy(community?.name, communityId ? `Community ${communityId}` : ""),
        },
        { label: "Request routing", value: policy.relay_enabled ? "on" : "off" },
        {
          label: "Instant confirmation",
          value: policy.instant_pulse_enabled ? "on" : "off",
        },
        {
          label: "Review attention",
          value: hoursLabel(policy.review_attention_after_hours || 24),
        },
        {
          label: "Review overdue",
          value: hoursLabel(policy.review_overdue_after_hours || 72),
        },
      ],
      bodyLines: [
        `Contactable references: ${policy.contactable_reference_count || 0}`,
        `Incoming domain affiliation requests: ${incomingAffiliations.length}`,
        `Outgoing domain affiliation requests: ${outgoingAffiliations.length}`,
        `External registration evidence records: ${externalRegistrationRecords.length}`,
        `Active member candidates: ${members.length}`,
        "Reader boundary: this summary explains internal confirmation policy and routing. It is not public membership proof, parent-domain approval, or transaction authority.",
      ],
      privacyNote:
        "Privacy: private contacts, raw member lists, responder notes, phone numbers, and private witness details are not included in this copied policy paper.",
      limitationNote:
        "Limitation: internal policy summary only. Not public verification, credit approval, payment confirmation, payout approval, or authority to release goods or money.",
    });
  }, [
    community,
    communityId,
    externalRegistrationRecords.length,
    incomingAffiliations.length,
    members.length,
    outgoingAffiliations.length,
    policy,
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
    const timer = window.setTimeout(() => setNotice(null), 2800);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const loadPolicy = useCallback(async () => {
    const contextKey = `${communityId || 0}:${memberWitnessFocus ? "witness" : "policy"}`;
    const loadSeq = policyLoadSeqRef.current + 1;
    policyLoadSeqRef.current = loadSeq;
    policyLoadContextRef.current = contextKey;
    if (!communityId) {
      setCommunity(null);
      setPolicy({});
      setContacts([]);
      setLoading(false);
      return;
    }
    if (memberWitnessFocus) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const result = await getCommunityConfirmationPolicy(communityId);
      if (
        policyLoadSeqRef.current !== loadSeq ||
        policyLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setCommunity(result?.community || null);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
    } catch {
      if (
        policyLoadSeqRef.current !== loadSeq ||
        policyLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setNotice({
        tone: "error",
        text: "GSN could not load this relay policy. You may need community admin access.",
      });
    } finally {
      if (
        policyLoadSeqRef.current === loadSeq &&
        policyLoadContextRef.current === contextKey
      ) {
        setLoading(false);
      }
    }
  }, [communityId, memberWitnessFocus]);

  const loadAffiliations = useCallback(async () => {
    const contextKey = `${communityId || 0}:${memberWitnessFocus ? "witness" : "policy"}`;
    const loadSeq = affiliationsLoadSeqRef.current + 1;
    affiliationsLoadSeqRef.current = loadSeq;
    affiliationsLoadContextRef.current = contextKey;
    if (!communityId || memberWitnessFocus) {
      setIncomingAffiliations([]);
      setOutgoingAffiliations([]);
      setAffiliationLoading(false);
      return;
    }
    setAffiliationLoading(true);
    setIncomingAffiliations([]);
    setOutgoingAffiliations([]);
    try {
      const result = await getCommunityDomainAffiliations(communityId);
      if (
        affiliationsLoadSeqRef.current !== loadSeq ||
        affiliationsLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setIncomingAffiliations(
        rowsOf<any>(result?.incoming)
          .map((row) => normalizeDomainAffiliation(row))
          .filter(Boolean) as DomainAffiliation[]
      );
      setOutgoingAffiliations(
        rowsOf<any>(result?.outgoing)
          .map((row) => normalizeDomainAffiliation(row))
          .filter(Boolean) as DomainAffiliation[]
      );
    } catch {
      if (
        affiliationsLoadSeqRef.current !== loadSeq ||
        affiliationsLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setIncomingAffiliations([]);
      setOutgoingAffiliations([]);
      setNotice({
        tone: "error",
        text: "GSN could not load domain affiliation records for this community.",
      });
    } finally {
      if (
        affiliationsLoadSeqRef.current === loadSeq &&
        affiliationsLoadContextRef.current === contextKey
      ) {
        setAffiliationLoading(false);
      }
    }
  }, [communityId, memberWitnessFocus]);

  const loadExternalRegistrationRecords = useCallback(async () => {
    const contextKey = `${communityId || 0}:${memberWitnessFocus ? "witness" : "policy"}`;
    const loadSeq = externalRegistrationLoadSeqRef.current + 1;
    externalRegistrationLoadSeqRef.current = loadSeq;
    externalRegistrationLoadContextRef.current = contextKey;
    if (!communityId || memberWitnessFocus) {
      setExternalRegistrationRecords([]);
      setExternalRegistrationLoading(false);
      return;
    }
    setExternalRegistrationLoading(true);
    setExternalRegistrationRecords([]);
    try {
      const result = await listCommunityExternalRegistrationEvidence(communityId, 10);
      if (
        externalRegistrationLoadSeqRef.current !== loadSeq ||
        externalRegistrationLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setExternalRegistrationRecords(
        rowsOf<any>(result)
          .map((row) => normalizeExternalRegistrationEvidence(row))
          .filter(Boolean) as ExternalRegistrationEvidenceRecord[]
      );
    } catch {
      if (
        externalRegistrationLoadSeqRef.current !== loadSeq ||
        externalRegistrationLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setExternalRegistrationRecords([]);
      setNotice({
        tone: "error",
        text: "GSN could not load external registration evidence for this community.",
      });
    } finally {
      if (
        externalRegistrationLoadSeqRef.current === loadSeq &&
        externalRegistrationLoadContextRef.current === contextKey
      ) {
        setExternalRegistrationLoading(false);
      }
    }
  }, [communityId, memberWitnessFocus]);

  const loadMembers = useCallback(async () => {
    const contextKey = String(communityId || 0);
    const loadSeq = membersLoadSeqRef.current + 1;
    membersLoadSeqRef.current = loadSeq;
    membersLoadContextRef.current = contextKey;
    if (!communityId) {
      setMembers([]);
      return;
    }
    try {
      const result = await listClanMembers(communityId);
      if (
        membersLoadSeqRef.current !== loadSeq ||
        membersLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setMembers(
        rowsOf<any>(result)
          .map((row) => normalizeMember(row))
          .filter(Boolean) as CommunityMember[]
      );
    } catch {
      if (
        membersLoadSeqRef.current !== loadSeq ||
        membersLoadContextRef.current !== contextKey
      ) {
        return;
      }
      setMembers([]);
      setNotice({
        tone: "error",
        text: "GSN could not load active community members for witness records.",
      });
    }
  }, [communityId]);

  const loadMemberWitnessSummary = useCallback(
    async (subjectUserId: string | number = selectedSubjectUserId) => {
      if (!communityId) return;
      const subjectId = Number(subjectUserId || 0);
      const contextKey = `${communityId || 0}:${subjectId || 0}`;
      const loadSeq = memberWitnessSummaryLoadSeqRef.current + 1;
      memberWitnessSummaryLoadSeqRef.current = loadSeq;
      memberWitnessSummaryContextRef.current = contextKey;
      if (!Number.isFinite(subjectId) || subjectId <= 0) {
        setMemberWitnessSummary(null);
        setMemberVerificationLoading(false);
        return;
      }
      setMemberVerificationLoading(true);
      try {
        const result = await getCommunityMemberVerificationSummary(communityId, subjectId);
        if (
          memberWitnessSummaryLoadSeqRef.current !== loadSeq ||
          memberWitnessSummaryContextRef.current !== contextKey
        ) {
          return;
        }
        setMemberWitnessSummary(normalizeWitnessSummary(result));
      } catch (err: any) {
        if (
          memberWitnessSummaryLoadSeqRef.current !== loadSeq ||
          memberWitnessSummaryContextRef.current !== contextKey
        ) {
          return;
        }
        setMemberWitnessSummary(null);
        setNotice({
          tone: "error",
          text: firstTruthy(
            err?.message,
            "GSN could not load this member's witness-strength summary."
          ),
        });
      } finally {
        if (
          memberWitnessSummaryLoadSeqRef.current === loadSeq &&
          memberWitnessSummaryContextRef.current === contextKey
        ) {
          setMemberVerificationLoading(false);
        }
      }
    },
    [communityId, selectedSubjectUserId]
  );

  const loadMemberWitnessRequest = useCallback(
    async (token: string = memberWitnessRequestToken) => {
      const requestToken = safeStr(token);
      const contextKey = `${communityId || 0}:${requestToken}`;
      const loadSeq = memberWitnessRequestLoadSeqRef.current + 1;
      memberWitnessRequestLoadSeqRef.current = loadSeq;
      memberWitnessRequestContextRef.current = contextKey;
      if (!communityId || !requestToken) {
        setMemberWitnessRequest(null);
        setMemberWitnessRequestLoading(false);
        return;
      }
      setMemberWitnessRequestLoading(true);
      setMemberWitnessRequest(null);
      try {
        const result = await getCommunityMemberVerificationRequest(communityId, requestToken);
        if (
          memberWitnessRequestLoadSeqRef.current !== loadSeq ||
          memberWitnessRequestContextRef.current !== contextKey
        ) {
          return;
        }
        const normalized = normalizeWitnessRequest(result);
        setMemberWitnessRequest(normalized);
        if (normalized?.subjectUserId) {
          setSelectedSubjectUserId(String(normalized.subjectUserId));
          await loadMemberWitnessSummary(normalized.subjectUserId);
        }
      } catch (err: any) {
        if (
          memberWitnessRequestLoadSeqRef.current !== loadSeq ||
          memberWitnessRequestContextRef.current !== contextKey
        ) {
          return;
        }
        setMemberWitnessRequest(null);
        setNotice({
          tone: "error",
          text: firstTruthy(err?.message, "GSN could not load this witness request."),
        });
      } finally {
        if (
          memberWitnessRequestLoadSeqRef.current === loadSeq &&
          memberWitnessRequestContextRef.current === contextKey
        ) {
          setMemberWitnessRequestLoading(false);
        }
      }
    },
    [communityId, loadMemberWitnessSummary, memberWitnessRequestToken]
  );

  useEffect(() => {
    void loadPolicy();
  }, [loadPolicy]);

  useEffect(() => {
    void loadAffiliations();
  }, [loadAffiliations]);

  useEffect(() => {
    void loadExternalRegistrationRecords();
  }, [loadExternalRegistrationRecords]);

  useEffect(() => {
    void loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (memberWitnessRequestToken) void loadMemberWitnessRequest(memberWitnessRequestToken);
  }, [loadMemberWitnessRequest, memberWitnessRequestToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (location.hash !== "#member-witness" && !memberWitnessRequestToken) return;

    const timer = window.setTimeout(() => {
      const targetId = memberWitnessRequestToken
        ? "member-witness-request-review"
        : "member-witness";
      const target = document.getElementById(targetId);
      if (target) {
        revealElementWithoutJump(target, {
          surface: "community-confirmation-policy",
          targetId,
          reason: "member-witness",
        });
      }
    }, loading || memberWitnessRequestLoading ? 260 : 90);

    return () => window.clearTimeout(timer);
  }, [
    loading,
    location.hash,
    memberWitnessRequestLoading,
    memberWitnessRequestToken,
    members.length,
  ]);

  async function patchPolicy(
    key: string,
    payload: Parameters<typeof updateCommunityConfirmationPolicy>[1]
  ) {
    if (!communityId) return;
    setBusyKey(key);
    try {
      const result = await updateCommunityConfirmationPolicy(communityId, payload);
      setCommunity(result?.community || community);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
      setNotice({ tone: "success", text: "Community relay policy updated." });
    } catch {
      setNotice({ tone: "error", text: "GSN could not update this relay policy yet." });
    } finally {
      setBusyKey("");
    }
  }

  async function patchContact(
    contact: RelayContact,
    payload: Parameters<typeof updateCommunityConfirmationContact>[2]
  ) {
    if (!communityId) return;
    const key = `contact-${contact.user_id}`;
    setBusyKey(key);
    try {
      const result = await updateCommunityConfirmationContact(
        communityId,
        contact.user_id,
        payload
      );
      setCommunity(result?.community || community);
      setPolicy(result?.policy || {});
      setContacts(
        rowsOf<any>(result?.contacts || result)
          .map((row) => normalizeContact(row))
          .filter(Boolean) as RelayContact[]
      );
      setNotice({ tone: "success", text: "Relay contact rule updated." });
    } catch {
      setNotice({
        tone: "error",
        text: "GSN could not update this contact. Member opt-out cannot be overridden here.",
      });
    } finally {
      setBusyKey("");
    }
  }

  async function requestAffiliation() {
    if (!communityId) return;
    const parentKey = safeStr(parentCommunityKey);
    if (!parentKey) {
      setNotice({
        tone: "error",
        text: "Enter the parent Community ID before sending the affiliation request.",
      });
      return;
    }
    setBusyKey("domain-affiliation-request");
    try {
      const result = await requestCommunityDomainAffiliation(communityId, {
        parent_community_key: parentKey,
        request_note:
          "Admin requested parent-domain acknowledgement from the community confirmation policy page.",
      });
      setParentCommunityKey("");
      setNotice({
        tone: "success",
        text: firstTruthy(result?.message, "Affiliation request sent to the parent community."),
      });
      await loadAffiliations();
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: firstTruthy(err?.message, "GSN could not send this affiliation request yet."),
      });
    } finally {
      setBusyKey("");
    }
  }

  async function decideAffiliation(
    row: DomainAffiliation,
    decision: "approve" | "reject" | "revoke"
  ) {
    if (!communityId) return;
    const key = `domain-affiliation-${decision}-${row.id}`;
    const decisionLabel =
      decision === "approve"
        ? "acknowledgement"
        : decision === "reject"
          ? "rejection"
          : "revocation";
    setBusyKey(key);
    try {
      const result = await decideCommunityDomainAffiliation(communityId, row.id, {
        decision,
        decision_note: `Parent community admin recorded this affiliation ${decisionLabel}.`,
      });
      setNotice({
        tone: "success",
        text: firstTruthy(result?.message, `Affiliation ${decisionLabel} recorded.`),
      });
      await loadAffiliations();
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: firstTruthy(err?.message, "GSN could not update this affiliation request yet."),
      });
    } finally {
      setBusyKey("");
    }
  }

  async function recordExternalRegistrationEvidence() {
    if (!communityId) return;
    const registrationType = safeStr(externalRegistrationType) || "CAC";
    const registrationReference = safeStr(externalRegistrationReference);
    const registeredName = safeStr(externalRegisteredName);
    const issuingBody = safeStr(externalIssuingBody);
    const note = safeStr(externalRegistrationNote);

    if (!registrationReference && !registeredName && !issuingBody && !note) {
      setNotice({
        tone: "error",
        text: "Record at least one external registration detail before saving.",
      });
      return;
    }

    setBusyKey("external-registration-record");
    try {
      const result = await recordCommunityExternalRegistrationEvidence(communityId, {
        registration_type: registrationType,
        registration_reference: registrationReference || undefined,
        registered_name: registeredName || undefined,
        issuing_body: issuingBody || undefined,
        note: note || undefined,
      });
      const record = normalizeExternalRegistrationEvidence(result?.record);
      setExternalRegistrationRecords((current) => {
        const withoutDuplicate = current.filter((item) => item.id !== record?.id);
        return record ? [record, ...withoutDuplicate].slice(0, 10) : current;
      });
      setExternalRegistrationReference("");
      setExternalRegisteredName("");
      setExternalRegistrationNote("");
      setNotice({
        tone: "success",
        text: firstTruthy(
          result?.message,
          "External registration evidence recorded as support only, not verification."
        ),
      });
      await loadExternalRegistrationRecords();
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: firstTruthy(
          err?.message,
          "GSN could not record this external registration evidence yet."
        ),
      });
    } finally {
      setBusyKey("");
    }
  }

  async function recordMemberWitness() {
    if (!communityId) return;
    const subjectId = Number(selectedSubjectUserId || 0);
    if (!Number.isFinite(subjectId) || subjectId <= 0) {
      setNotice({
        tone: "error",
        text: "Choose an active member before recording a witness confirmation.",
      });
      return;
    }
    setBusyKey("member-witness-record");
    try {
      const result = await recordCommunityMemberVerification(communityId, {
        subject_user_id: subjectId,
        claim_label: memberWitnessClaim || "Known active community member",
        verification_note:
          memberWitnessNote ||
          "Member witness recorded from the community confirmation policy page.",
      });
      setMemberWitnessSummary(normalizeWitnessSummary(result));
      setMemberWitnessClaim("");
      setMemberWitnessNote("");
      setNotice({
        tone: "success",
        text: firstTruthy(result?.message, "Member witness confirmation recorded."),
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: memberWitnessErrorMessage(
          err,
          "GSN could not record this witness confirmation yet."
        ),
      });
    } finally {
      setBusyKey("");
    }
  }

  async function createMemberWitnessRequest() {
    if (!communityId) return;
    const verifierId = Number(selectedSubjectUserId || 0);
    if (!Number.isFinite(verifierId) || verifierId <= 0) {
      setNotice({
        tone: "error",
        text: "Choose the active member you want to ask for a witness response.",
      });
      return;
    }
    setBusyKey("member-witness-request");
    try {
      const result = await createCommunityMemberVerificationRequest(communityId, {
        verifier_user_id: verifierId,
        claim_label: memberWitnessClaim || "Known active community member",
        request_note:
          memberWitnessNote ||
          "Member asked a known community member to stand for them from the policy page.",
      });
      const normalized = normalizeWitnessRequest(result);
      setMemberWitnessRequest(normalized);
      setNotice({
        tone: "success",
        text: firstTruthy(result?.message, "Witness request created. Share the link and code with the verifier."),
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: memberWitnessErrorMessage(
          err,
          "GSN could not create this witness request yet."
        ),
      });
    } finally {
      setBusyKey("");
    }
  }

  async function withdrawMemberWitness(row: MemberWitnessItem) {
    if (!communityId) return;
    const key = `member-witness-withdraw-${row.id}`;
    setBusyKey(key);
    try {
      const result = await withdrawCommunityMemberVerification(communityId, row.id, {
        reason: "Witness confirmation withdrawn from the community confirmation policy page.",
      });
      setMemberWitnessSummary(normalizeWitnessSummary(result));
      setNotice({
        tone: "success",
        text: firstTruthy(result?.message, "Member witness confirmation withdrawn."),
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: firstTruthy(err?.message, "GSN could not withdraw this witness confirmation yet."),
      });
    } finally {
      setBusyKey("");
    }
  }

  const relayOn = Boolean(policy.relay_enabled);
  const instantOn = Boolean(policy.instant_pulse_enabled);
  const publicOn = Boolean(policy.public_confirmation_enabled);
  const latestOutgoing = outgoingAffiliations[0] || null;
  const selectedMember =
    members.find((member) => String(member.userId) === String(selectedSubjectUserId)) || null;
  const canShareMemberWitnessRequest = Boolean(memberWitnessRequest?.oneTimeCode);
  const memberWitnessApprovalUrl = useMemo(() => {
    if (!memberWitnessRequest?.approvalPath) return "";
    return publicFrontendUrl(memberWitnessRequest.approvalPath);
  }, [memberWitnessRequest?.approvalPath]);

  async function copyMemberCredentialLink() {
    if (!selectedMember?.gsnId) {
      setNotice({
        tone: "error",
        text: "This member does not have a visible GSN ID for a public credential link yet.",
      });
      return;
    }
    const communityKey = firstTruthy(community?.community_code, communityId);
    const link = publicFrontendUrl(
      `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(
        selectedMember.gsnId
      )}`
    );
    const ok = await safeCopy(link);
    setNotice({
      tone: ok ? "success" : "error",
      text: ok
        ? "Public member credential link copied."
        : "GSN could not copy the credential link. Open the credential page and copy the browser link manually.",
    });
  }

  async function copyMemberWitnessRequestLink() {
    if (!memberWitnessRequest?.approvalPath || !memberWitnessApprovalUrl) {
      setNotice({
        tone: "error",
        text: "Create or open a witness request before copying its response link.",
      });
      return;
    }
    const ok = await safeCopy(memberWitnessApprovalUrl);
    setNotice({
      tone: ok ? "success" : "error",
      text: ok
        ? "Witness response link copied."
        : "GSN could not copy the witness response link yet.",
    });
  }

  async function copyMemberWitnessRequestCode() {
    if (!memberWitnessRequest?.oneTimeCode) {
      setNotice({
        tone: "error",
        text: "This witness request does not have a visible one-time code.",
      });
      return;
    }
    const ok = await safeCopy(memberWitnessRequest.oneTimeCode);
    setNotice({
      tone: ok ? "success" : "error",
      text: ok ? "One-time witness code copied." : "GSN could not copy the one-time code yet.",
    });
  }

  async function shareMemberWitnessRequestPackage() {
    if (!memberWitnessApprovalUrl || !memberWitnessRequest?.oneTimeCode) {
      setNotice({
        tone: "error",
        text: "Create a witness request before sharing its response package.",
      });
      return;
    }
    const text = [
      "GSN member witness request",
      `Community: ${firstTruthy(community?.name, memberWitnessRequest.communityCode, communityId)}`,
      `Member asking: ${firstTruthy(memberWitnessRequest.subjectDisplayName, memberWitnessRequest.subjectGsnId, "GSN member")}`,
      `One-time code: ${memberWitnessRequest.oneTimeCode}`,
      "Open the link while signed in as the assigned verifier.",
      memberWitnessApprovalUrl,
    ].join("\n");

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        await navigator.share({
          title: "GSN witness request",
          text,
          url: memberWitnessApprovalUrl,
        });
        setNotice({ tone: "success", text: "Witness request opened in your share options." });
        return;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") return;
    }

    const ok = await safeCopy(text);
    setNotice({
      tone: ok ? "success" : "error",
      text: ok
        ? "Witness request package copied."
        : "GSN could not open sharing or copy the witness request package yet.",
    });
  }

  async function decideMemberWitnessRequest(decision: "approve" | "decline") {
    if (!communityId || !memberWitnessRequest?.publicToken) return;
    const code = safeStr(memberWitnessApprovalCode);
    if (!code) {
      setNotice({
        tone: "error",
        text: "Enter the one-time witness code before deciding this request.",
      });
      return;
    }
    const key = `member-witness-request-${decision}`;
    setBusyKey(key);
    try {
      const result = await decideCommunityMemberVerificationRequest(
        communityId,
        memberWitnessRequest.publicToken,
        {
          decision,
          one_time_code: code,
          response_note: memberWitnessResponseNote || undefined,
        }
      );
      const normalized = normalizeWitnessRequest(result);
      setMemberWitnessRequest(normalized);
      if (result?.verification_summary) {
        setMemberWitnessSummary(normalizeWitnessSummary(result));
      }
      setMemberWitnessApprovalCode("");
      setMemberWitnessResponseNote("");
      setNotice({
        tone: "success",
        text: firstTruthy(
          result?.message,
          decision === "approve"
            ? "Witness response recorded."
            : "Witness request declined."
        ),
      });
    } catch (err: any) {
      setNotice({
        tone: "error",
        text: memberWitnessErrorMessage(
          err,
          "GSN could not decide this witness request yet."
        ),
      });
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div style={{ maxWidth: 1120, margin: "0 auto", paddingBottom: isCompact ? 36 : 56 }}>
      <PageTopNav
        sectionLabel={memberWitnessFocus ? "Community witness" : "Community confirmation"}
        title={memberWitnessFocus ? "Member Witness" : "Instant Confirmation Policy"}
        subtitle={
          memberWitnessFocus
            ? "Ask known members to stand for you, or respond to a witness request."
            : "Choose who may answer live community confirmation requests."
        }
        homeTo={APP_ROUTES.DASHBOARD}
        homeLabel="Dashboard"
        backTo={memberWitnessFocus ? APP_ROUTES.OPEN_TRUST : APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX}
        backLabel={memberWitnessFocus ? "Trust Passport" : "Inbox"}
      />

      <ExplainToggle
        label="How this works"
        what={
          memberWitnessFocus
            ? "A member witness is a known community member standing for another member."
            : "A TrustSlip may say community confirmation is available."
        }
        why={
          memberWitnessFocus
            ? "It turns human trust into a recorded community signal without exposing private notes publicly."
            : "This page controls who can answer and how many answers are enough."
        }
        next={
          memberWitnessFocus
            ? "Choose a member, create a request, and share the QR or one-time code with the assigned verifier."
            : "Admins set routing. The result still comes from member responses."
        }
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
              {labelWithIcon(
                "shield",
                memberWitnessFocus ? "Member witness" : "Community control",
                "gold"
              )}
            </div>
            <h1 style={{ margin: "8px 0 0", fontSize: isCompact ? 30 : 42, lineHeight: 1, fontWeight: 1000 }}>
              {memberWitnessFocus
                ? memberWitnessRequestToken
                  ? "Respond to a witness request"
                  : "Ask a known member to stand for you"
                : "Who can answer for this community?"}
            </h1>
            <p style={{ margin: "12px 0 0", color: "#D7E2EF", fontSize: 16, fontWeight: 800, lineHeight: 1.5 }}>
              {memberWitnessFocus
                ? firstTruthy(
                    community?.name,
                    communityId
                      ? `Community ${communityId}`
                      : "Choose the community before asking for witness evidence."
                  )
                : firstTruthy(
                    community?.name,
                    communityId ? `Community ${communityId}` : "Choose a community first"
                  )}
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "repeat(3, minmax(0, 1fr))" : "1fr",
              gap: 10,
              minWidth: isCompact ? "auto" : 210,
            }}
          >
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon(
                  memberWitnessFocus ? "certificate" : "megaphone",
                  memberWitnessFocus ? "Task" : "Requests",
                  "gold"
                )}
              </div>
              <div
                style={{
                  marginTop: 4,
                  color: memberWitnessFocus ? "#B7F7CA" : relayOn ? "#B7F7CA" : "#FECACA",
                  fontSize: 24,
                  fontWeight: 1000,
                }}
              >
                {memberWitnessFocus
                  ? memberWitnessRequestToken
                    ? "Respond"
                    : "Ask"
                  : relayOn ? "On" : "Off"}
              </div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon(
                  "community",
                  memberWitnessFocus ? "Community" : "Contacts",
                  "gold"
                )}
              </div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                {memberWitnessFocus ? "Scoped" : policy.contactable_reference_count || 0}
              </div>
            </div>
            <div style={statTile("rgba(255,255,255,0.08)")}>
              <div style={{ ...sectionLabel(), color: "#B9C7D8" }}>
                {labelWithIcon("user", "Members", "gold")}
              </div>
              <div style={{ marginTop: 4, color: "#FFFFFF", fontSize: 24, fontWeight: 1000 }}>
                {memberWitnessFocus ? members.length || "Loading" : policy.active_member_count || 0}
              </div>
            </div>
          </div>
        </div>
      </section>

      {!communityId ? (
        <section style={{ marginTop: 14, ...softCard("#FEF2F2") }}>
          <div style={{ color: "#991B1B", fontWeight: 1000 }}>
            {labelWithIcon("alert", "No active community is selected.", "red")}
          </div>
          <p style={{ margin: "8px 0 0", ...helperText() }}>
            {memberWitnessFocus
              ? "Open Community and choose the community before asking for witness evidence."
              : "Open Community and choose the community before managing instant confirmation."}
          </p>
          <SecondaryButton
            type="button"
            onClick={() => navigateWithOrigin(navigate, APP_ROUTES.COMMUNITY, location)}
            stableHeight={48}
            minWidth={160}
            style={{ marginTop: 12 }}
            debugId="community-confirmation-policy.open-community"
          >
            {labelWithIcon("community", "Open Community", "blue")}
          </SecondaryButton>
        </section>
      ) : null}

      {memberWitnessFocus && (memberWitnessRequestToken || memberWitnessRequestLoading) ? (
        <section id="member-witness-request-review" style={{ marginTop: 14, ...softCard("#EEF9F1") }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div>
              <div style={{ color: "#07172C", fontWeight: 1000 }}>
                {labelWithIcon("certificate", "Witness request review", "green")}
              </div>
              <p style={{ margin: "8px 0 0", ...helperText(), fontSize: 13 }}>
                Respond only if you personally know this member inside this community.
                The one-time code must come from the member who asked. This records
                one witness event, not a guarantee for every claim.
              </p>
            </div>
            {memberWitnessRequest ? (
              <span
                style={{
                  ...statusPill(memberWitnessRequest.status === "approved", memberWitnessRequest.status),
                  background:
                    memberWitnessRequest.status === "pending"
                      ? "#FFF7E0"
                      : memberWitnessRequest.status === "declined"
                        ? "#FEF2F2"
                        : "#EEF9F1",
                  color:
                    memberWitnessRequest.status === "pending"
                      ? "#7A4A00"
                      : memberWitnessRequest.status === "declined"
                        ? "#991B1B"
                        : "#166534",
                }}
              >
                {memberWitnessRequest.status}
              </span>
            ) : null}
          </div>

          {memberWitnessRequestLoading ? (
            <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
              Loading witness request...
            </div>
          ) : memberWitnessRequest ? (
            <>
              <div
                style={{
                  marginTop: 10,
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                  gap: 8,
                }}
              >
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Member asking</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                    {firstTruthy(
                      memberWitnessRequest.subjectDisplayName,
                      memberWitnessRequest.subjectGsnId,
                      "Member"
                    )}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Verifier</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                    {firstTruthy(
                      memberWitnessRequest.verifierDisplayName,
                      memberWitnessRequest.verifierGsnId,
                      "Assigned member"
                    )}
                  </div>
                </div>
                <div style={statTile("#FFFFFF")}>
                  <div style={sectionLabel()}>Expires</div>
                  <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                    {dateLabel(memberWitnessRequest.expiresAt)}
                  </div>
                </div>
              </div>

              {memberWitnessRequest.status === "pending" ? (
                <>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 0.65fr) minmax(0, 1fr)",
                      gap: 8,
                    }}
                  >
                    <input
                      value={memberWitnessApprovalCode}
                      onChange={(event) => setMemberWitnessApprovalCode(event.target.value)}
                      placeholder="One-time code"
                      style={fieldStyle()}
                      aria-label="One-time witness response code"
                      data-field-id="community-confirmation-policy.member-witness.request-code"
                    />
                    <input
                      value={memberWitnessResponseNote}
                      onChange={(event) => setMemberWitnessResponseNote(event.target.value)}
                      placeholder="Optional response note"
                      style={fieldStyle()}
                      aria-label="Witness response note"
                      data-field-id="community-confirmation-policy.member-witness.request-note"
                    />
                  </div>
                  <div
                    style={{
                      marginTop: 10,
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                      gap: 8,
                    }}
                  >
                    <PrimaryButton
                      type="button"
                      onClick={() => void decideMemberWitnessRequest("approve")}
                      disabled={Boolean(busyKey)}
                      busy={busyKey === "member-witness-request-approve"}
                      busyLabel="Recording..."
                      stableHeight={50}
                      debugId="community-confirmation-policy.member-witness.request.approve"
                    >
                      {labelWithIcon("check", "Record witness", "navy")}
                    </PrimaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => void decideMemberWitnessRequest("decline")}
                      disabled={Boolean(busyKey)}
                      busy={busyKey === "member-witness-request-decline"}
                      busyLabel="Declining..."
                      stableHeight={50}
                      debugId="community-confirmation-policy.member-witness.request.decline"
                    >
                      {labelWithIcon("lock", "Decline", "red")}
                    </SecondaryButton>
                    <SecondaryButton
                      type="button"
                      onClick={() => void copyMemberWitnessRequestLink()}
                      disabled={Boolean(busyKey)}
                      stableHeight={50}
                      debugId="community-confirmation-policy.member-witness.request.copy-link"
                    >
                      {labelWithIcon("copy", "Copy link", "green")}
                    </SecondaryButton>
                  </div>
                </>
              ) : (
                <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
                  This request is {memberWitnessRequest.status}. Current member
                  strength is shown below when GSN can load it.
                </div>
              )}
            </>
          ) : (
            <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
              This request link could not be opened inside the selected community.
            </div>
          )}
        </section>
      ) : null}

      <section
        style={{
          display: memberWitnessFocus ? "none" : undefined,
          marginTop: 14,
          ...softCard("#FFFFFF"),
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div>
            {sectionLabelWithIcon("shield", "Policy switches", "blue")}
            <div style={{ marginTop: 6, ...helperText(), color: "#07172C" }}>
              Turn request routing and quick answers on or off.
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: isCompact ? 24 : 0 }}>
            <SecondaryButton
              type="button"
              onClick={() => void loadPolicy()}
              busy={loading}
              busyLabel="Refreshing..."
              stableHeight={52}
              fullWidth={false}
              minWidth={120}
              debugId="community-confirmation-policy.refresh"
            >
              {labelWithIcon("refresh", "Refresh", "blue")}
            </SecondaryButton>
            <SecondaryButton
              type="button"
              onClick={() => {
                safeCopy(copyText);
                setNotice({ tone: "success", text: "Relay policy summary copied." });
              }}
              stableHeight={52}
              fullWidth={false}
              minWidth={120}
              debugId="community-confirmation-policy.copy"
            >
              {labelWithIcon("copy", "Copy summary", "blue")}
            </SecondaryButton>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {[
            {
              key: "relay",
              title: "Confirmation requests",
              text: "Allow controlled live confirmation requests through GSN.",
              active: relayOn,
              payload: { relay_enabled: !relayOn },
            },
            {
              key: "instant",
              title: "Instant confirmation",
              text: "Allow quick community answers for low-risk checks.",
              active: instantOn,
              payload: { instant_pulse_enabled: !instantOn },
            },
            {
              key: "public",
              title: "Public community signal",
              text: "Let public trust papers say live confirmation is available.",
              active: publicOn,
              payload: { public_confirmation_enabled: !publicOn },
            },
          ].map((item) => (
            <div key={item.key} style={innerCard(item.active ? "#F4FBF7" : "#FEF2F2")}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
                <div style={{ color: "#07172C", fontWeight: 1000 }}>
                  {labelWithIcon(item.key === "relay" ? "megaphone" : item.key === "instant" ? "spark" : "globe", item.title, item.active ? "green" : "red")}
                </div>
                {statusPillWithIcon(item.active, item.active ? "On" : "Off", item.active ? "check" : "alert")}
              </div>
              <p style={{ margin: "8px 0 12px", ...helperText(), fontSize: 13 }}>
                {item.text}
              </p>
              <SecondaryButton
                type="button"
                onClick={() => void patchPolicy(item.key, item.payload)}
                disabled={!communityId || Boolean(busyKey)}
                busy={busyKey === item.key}
                busyLabel="Saving..."
                fullWidth
                stableHeight={isCompact ? 52 : 46}
                debugId={`community-confirmation-policy.${item.key}`}
              >
                {labelWithIcon(item.active ? "lock" : "check", `Turn ${item.active ? "off" : "on"}`, item.active ? "red" : "green")}
              </SecondaryButton>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 12,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          <div style={innerCard("#F8FBFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("check", "Minimum positive answers", "green")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Two answers are stronger than one.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[1, 2, 3].map((value) => (
                <SecondaryButton
                  key={value}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`min-${value}`, {
                      minimum_positive_responses: value,
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `min-${value}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={72}
                  debugId={`community-confirmation-policy.minimum-${value}`}
                >
                  {value}
                </SecondaryButton>
              ))}
            </div>
          </div>
          <div style={innerCard("#F8FBFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("calendar", "Response window", "blue")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Short for quick checks. Longer for formal review.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["5 min", 300],
                ["1 day", 86400],
                ["3 days", 259200],
              ].map(([label, seconds]) => (
                <SecondaryButton
                  key={String(seconds)}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`window-${seconds}`, {
                      response_window_seconds: Number(seconds),
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `window-${seconds}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={88}
                  debugId={`community-confirmation-policy.window-${seconds}`}
                >
                  {String(label)}
                </SecondaryButton>
              ))}
            </div>
          </div>
          <div style={innerCard("#FFFDF5")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("alert", "Review timing", "gold")}
            </div>
            <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
              Cases need attention after {hoursLabel(policy.review_attention_after_hours || 24)} and become overdue after {hoursLabel(policy.review_overdue_after_hours || 72)}.
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {[
                ["1d / 3d", 24, 72],
                ["2d / 5d", 48, 120],
                ["3d / 7d", 72, 168],
              ].map(([label, attentionHours, overdueHours]) => (
                <SecondaryButton
                  key={String(label)}
                  type="button"
                  onClick={() =>
                    void patchPolicy(`review-sla-${attentionHours}-${overdueHours}`, {
                      review_attention_after_hours: Number(attentionHours),
                      review_overdue_after_hours: Number(overdueHours),
                    })
                  }
                  disabled={!communityId || Boolean(busyKey)}
                  busy={busyKey === `review-sla-${attentionHours}-${overdueHours}`}
                  stableHeight={isCompact ? 48 : 42}
                  minWidth={88}
                  debugId={`community-confirmation-policy.review-sla-${attentionHours}-${overdueHours}`}
                >
                  {String(label)}
                </SecondaryButton>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          display: memberWitnessFocus ? "none" : undefined,
          marginTop: 14,
          ...softCard("#FFFDF5"),
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
            {sectionLabelWithIcon("certificate", "Community ID Domain affiliation", "gold")}
            <h2 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 24, fontWeight: 1000 }}>
              Link this group to a parent community
            </h2>
            <p style={{ margin: "8px 0 0", ...helperText() }}>
              Names can be copied. A parent Community ID Domain must acknowledge the group before
              GSN shows it as a parent-domain acknowledged affiliate.
            </p>
          </div>
          <SecondaryButton
            type="button"
            onClick={() => void loadAffiliations()}
            busy={affiliationLoading}
            busyLabel="Refreshing..."
            stableHeight={52}
            minWidth={128}
            debugId="community-confirmation-policy.domain-affiliations.refresh"
          >
            {labelWithIcon("refresh", "Refresh", "blue")}
          </SecondaryButton>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <MeaningTile
            icon="certificate"
            label="Community ID"
            title="Names are not enough"
            text="Use the parent Community ID as the anchor. A familiar name alone can be copied or misused."
            tone="info"
          />
          <MeaningTile
            icon="lock"
            label="Pending request"
            title="Not public record yet"
            text="A requested affiliation stays private workflow evidence until the parent domain accepts or rejects it."
            tone="warn"
          />
          <MeaningTile
            icon="community"
            label="Acknowledged affiliate"
            title="Group acknowledged"
            text="Acknowledgement says the parent domain accepts this group. It does not verify every person, shop, line, payment, or loan claim inside it."
            tone="good"
          />
        </div>

        {!memberWitnessFocus && (memberWitnessRequest || memberWitnessRequestToken || memberWitnessRequestLoading) ? (
          <div style={{ marginTop: 14, ...innerCard("#EEF9F1") }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "start",
              }}
            >
              <div>
                <div style={{ color: "#07172C", fontWeight: 1000 }}>
                  {labelWithIcon("certificate", "Witness request review", "green")}
                </div>
                <p style={{ margin: "8px 0 0", ...helperText(), fontSize: 13 }}>
                  A verifier uses this lane to respond to a request from a member they
                  personally know. The one-time code must come from the member who asked.
                  This records one witness event; it is not parent-domain
                  approval or a guarantee for every claim.
                </p>
              </div>
              {memberWitnessRequest ? (
                <span
                  style={{
                    ...statusPill(memberWitnessRequest.status === "approved", memberWitnessRequest.status),
                    background:
                      memberWitnessRequest.status === "pending"
                        ? "#FFF7E0"
                        : memberWitnessRequest.status === "declined"
                          ? "#FEF2F2"
                          : "#EEF9F1",
                    color:
                      memberWitnessRequest.status === "pending"
                        ? "#7A4A00"
                        : memberWitnessRequest.status === "declined"
                          ? "#991B1B"
                          : "#166534",
                  }}
                >
                  {memberWitnessRequest.status}
                </span>
              ) : null}
            </div>

            {memberWitnessRequestLoading ? (
              <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
                Loading witness request...
              </div>
            ) : memberWitnessRequest ? (
              <>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div style={statTile("#FFFFFF")}>
                    <div style={sectionLabel()}>Member asking</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                      {firstTruthy(
                        memberWitnessRequest.subjectDisplayName,
                        memberWitnessRequest.subjectGsnId,
                        "Member"
                      )}
                    </div>
                  </div>
                  <div style={statTile("#FFFFFF")}>
                    <div style={sectionLabel()}>Verifier</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                      {firstTruthy(
                        memberWitnessRequest.verifierDisplayName,
                        memberWitnessRequest.verifierGsnId,
                        "Assigned member"
                      )}
                    </div>
                  </div>
                  <div style={statTile("#FFFFFF")}>
                    <div style={sectionLabel()}>Expires</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                      {dateLabel(memberWitnessRequest.expiresAt)}
                    </div>
                  </div>
                </div>

                {memberWitnessRequestToken && memberWitnessRequest.status === "pending" ? (
                  <>
                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 0.65fr) minmax(0, 1fr)",
                        gap: 8,
                      }}
                    >
                      <input
                        value={memberWitnessApprovalCode}
                        onChange={(event) => setMemberWitnessApprovalCode(event.target.value)}
                        placeholder="One-time code"
                        style={fieldStyle()}
                        aria-label="One-time witness response code"
                        data-field-id="community-confirmation-policy.member-witness.request-code"
                      />
                      <input
                        value={memberWitnessResponseNote}
                        onChange={(event) => setMemberWitnessResponseNote(event.target.value)}
                        placeholder="Optional response note"
                        style={fieldStyle()}
                        aria-label="Witness response note"
                        data-field-id="community-confirmation-policy.member-witness.request-note"
                      />
                    </div>
                    <div
                      style={{
                        marginTop: 10,
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <PrimaryButton
                        type="button"
                        onClick={() => void decideMemberWitnessRequest("approve")}
                        disabled={Boolean(busyKey)}
                        busy={busyKey === "member-witness-request-approve"}
                        busyLabel="Recording..."
                        stableHeight={50}
                        debugId="community-confirmation-policy.member-witness.request.approve"
                      >
                        {labelWithIcon("check", "Record witness", "navy")}
                      </PrimaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => void decideMemberWitnessRequest("decline")}
                        disabled={Boolean(busyKey)}
                        busy={busyKey === "member-witness-request-decline"}
                        busyLabel="Declining..."
                        stableHeight={50}
                        debugId="community-confirmation-policy.member-witness.request.decline"
                      >
                        {labelWithIcon("lock", "Decline", "red")}
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() => void copyMemberWitnessRequestLink()}
                        disabled={Boolean(busyKey)}
                        stableHeight={50}
                        debugId="community-confirmation-policy.member-witness.request.copy-link"
                      >
                        {labelWithIcon("copy", "Copy link", "green")}
                      </SecondaryButton>
                    </div>
                  </>
                ) : (
                  <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
                    {memberWitnessRequestToken
                      ? `This request is ${memberWitnessRequest.status}. Current member strength is shown below when GSN can load it.`
                      : "The request is ready to share. The assigned verifier must open the link and enter the one-time code before GSN records their witness."}
                  </div>
                )}
              </>
            ) : (
              <div style={{ marginTop: 10, ...innerCard("#FFFFFF") }}>
                This request link could not be opened inside the selected community.
              </div>
            )}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) minmax(0, 1fr)",
            gap: 10,
          }}
        >
          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("community", "Ask parent domain", "gold")}
            </div>
            <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
              Enter the parent Community ID, not a market or church name.
            </p>
            <input
              value={parentCommunityKey}
              onChange={(event) => setParentCommunityKey(event.target.value)}
              placeholder="Example: GSN-C-000001"
              style={fieldStyle()}
              aria-label="Parent Community ID"
              data-field-id="community-confirmation-policy.parent-community-id"
            />
            <PrimaryButton
              type="button"
              onClick={() => void requestAffiliation()}
              disabled={!communityId || Boolean(busyKey)}
              busy={busyKey === "domain-affiliation-request"}
              busyLabel="Sending..."
              fullWidth
              stableHeight={52}
              style={{ marginTop: 10 }}
              debugId="community-confirmation-policy.domain-affiliation.request"
            >
              {labelWithIcon("navigation", "Send request", "navy")}
            </PrimaryButton>
            {latestOutgoing ? (
              <div style={{ marginTop: 10, ...innerCard("#F8FBFF") }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <strong style={{ color: "#07172C" }}>
                    {firstTruthy(latestOutgoing.parentCommunityName, "Parent community")}
                  </strong>
                  <span
                    style={{
                      ...statusPill(true, latestOutgoing.status || "pending"),
                      color: statusTone(latestOutgoing.status) === "green" ? "#166534" : "#7A4A00",
                      background:
                        statusTone(latestOutgoing.status) === "green" ? "#EEF9F1" : "#FFF7E0",
                    }}
                  >
                    {latestOutgoing.status}
                  </span>
                </div>
                <p style={{ margin: "6px 0 0", ...helperText(), fontSize: 13 }}>
                  {firstTruthy(latestOutgoing.parentCommunityCode, "Community ID not shown")} - requested{" "}
                  {dateLabel(latestOutgoing.requestedAt)}
                </p>
              </div>
            ) : null}

            <div style={{ marginTop: 10, ...innerCard("#FFFCF2") }}>
              <div style={{ color: "#07172C", fontWeight: 1000 }}>
                {labelWithIcon("certificate", "External registration evidence", "gold")}
              </div>
              <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
                Record CAC or company-registration evidence as support for review. This does not
                verify leadership, membership, consent, or public Community ID ownership.
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isCompact ? "1fr" : "0.65fr 1fr",
                  gap: 8,
                }}
              >
                <input
                  value={externalRegistrationType}
                  onChange={(event) => setExternalRegistrationType(event.target.value)}
                  placeholder="Type, e.g. CAC"
                  style={fieldStyle()}
                  aria-label="External registration type"
                  data-field-id="community-confirmation-policy.external-registration.type"
                />
                <input
                  value={externalIssuingBody}
                  onChange={(event) => setExternalIssuingBody(event.target.value)}
                  placeholder="Issuing body"
                  style={fieldStyle()}
                  aria-label="External registration issuing body"
                  data-field-id="community-confirmation-policy.external-registration.issuing-body"
                />
              </div>
              <input
                value={externalRegistrationReference}
                onChange={(event) => setExternalRegistrationReference(event.target.value)}
                placeholder="Registration reference. GSN stores a fingerprint, not this raw text."
                style={{ ...fieldStyle(), marginTop: 8 }}
                aria-label="External registration reference"
                data-field-id="community-confirmation-policy.external-registration.reference"
              />
              <input
                value={externalRegisteredName}
                onChange={(event) => setExternalRegisteredName(event.target.value)}
                placeholder="Registered name. GSN stores a fingerprint, not this raw text."
                style={{ ...fieldStyle(), marginTop: 8 }}
                aria-label="External registered name"
                data-field-id="community-confirmation-policy.external-registration.registered-name"
              />
              <textarea
                value={externalRegistrationNote}
                onChange={(event) => setExternalRegistrationNote(event.target.value)}
                placeholder="Optional review note. Keep it short and factual."
                style={{ ...fieldStyle(), marginTop: 8, minHeight: 82, resize: "none" }}
                aria-label="External registration evidence note"
                data-field-id="community-confirmation-policy.external-registration.note"
              />
              <PrimaryButton
                type="button"
                onClick={() => void recordExternalRegistrationEvidence()}
                disabled={!communityId || Boolean(busyKey)}
                busy={busyKey === "external-registration-record"}
                busyLabel="Recording..."
                fullWidth
                stableHeight={52}
                style={{ marginTop: 10 }}
                debugId="community-confirmation-policy.external-registration.record"
              >
                {labelWithIcon("check", "Record evidence", "navy")}
              </PrimaryButton>
              <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                {externalRegistrationLoading ? (
                  <div style={innerCard("#FFFFFF")}>Loading external registration evidence...</div>
                ) : externalRegistrationRecords.length === 0 ? (
                  <div style={innerCard("#FFFFFF")}>
                    No external registration evidence has been recorded for this community yet.
                  </div>
                ) : (
                  externalRegistrationRecords.slice(0, 3).map((row) => (
                    <article key={row.id} style={innerCard("#FFFFFF")}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          gap: 8,
                          flexWrap: "wrap",
                        }}
                      >
                        <strong style={{ color: "#07172C" }}>
                          {row.registrationType} evidence
                        </strong>
                        <span
                          style={{
                            ...statusPill(true, "support only"),
                            color: "#7A4A00",
                            background: "#FFF7E0",
                          }}
                        >
                          no verification effect
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 0", ...helperText(), fontSize: 13 }}>
                        Fingerprint: {firstTruthy(row.evidenceFingerprint, "not shown")} -{" "}
                        {dateLabel(row.createdAt)}
                      </p>
                      <p style={{ margin: "6px 0 0", ...helperText(), fontSize: 12 }}>
                        Reference recorded: {row.registrationReferenceRecorded ? "yes" : "no"}.
                        Registered name recorded: {row.registeredNameRecorded ? " yes" : " no"}.
                        Raw reference stored: {row.rawReferenceStored ? " yes" : " no"}.
                      </p>
                    </article>
                  ))
                )}
              </div>
            </div>
          </div>

          <div style={innerCard("#FFFFFF")}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("shield", "Requests to this domain", "blue")}
            </div>
            <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
              Acknowledge only groups this community is willing to stand behind publicly.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {affiliationLoading ? (
                <div style={innerCard("#F8FBFF")}>Loading domain affiliation requests...</div>
              ) : incomingAffiliations.length === 0 ? (
                <div style={innerCard("#F8FBFF")}>No groups have requested this parent domain yet.</div>
              ) : (
                incomingAffiliations.map((row) => {
                  const status = safeStr(row.status) || "pending";
                  const approved = status === "approved";
                  const pending = status === "pending";
                  return (
                    <article key={row.id} style={innerCard("#F8FBFF")}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                        <strong style={{ color: "#07172C" }}>
                          {firstTruthy(row.affiliateCommunityName, `Group ${row.affiliateCommunityId || row.id}`)}
                        </strong>
                        <span
                          style={{
                            ...statusPill(true, status),
                            color: approved ? "#166534" : pending ? "#7A4A00" : "#991B1B",
                            background: approved ? "#EEF9F1" : pending ? "#FFF7E0" : "#FEF2F2",
                          }}
                        >
                          {status}
                        </span>
                      </div>
                      <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
                        {firstTruthy(row.affiliateCommunityCode, "Community ID not shown")} - requested{" "}
                        {dateLabel(row.requestedAt)}
                      </p>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: isCompact ? "1fr" : approved ? "1fr" : "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        {pending ? (
                          <>
                            <PrimaryButton
                              type="button"
                              onClick={() => void decideAffiliation(row, "approve")}
                              disabled={!communityId || Boolean(busyKey)}
                              busy={busyKey === `domain-affiliation-approve-${row.id}`}
                              busyLabel="Acknowledging..."
                              stableHeight={48}
                              debugId={`community-confirmation-policy.domain-affiliation.${row.id}.approve`}
                            >
                              {labelWithIcon("check", "Acknowledge", "navy")}
                            </PrimaryButton>
                            <SecondaryButton
                              type="button"
                              onClick={() => void decideAffiliation(row, "reject")}
                              disabled={!communityId || Boolean(busyKey)}
                              busy={busyKey === `domain-affiliation-reject-${row.id}`}
                              busyLabel="Rejecting..."
                              stableHeight={48}
                              debugId={`community-confirmation-policy.domain-affiliation.${row.id}.reject`}
                            >
                              {labelWithIcon("lock", "Reject", "red")}
                            </SecondaryButton>
                          </>
                        ) : approved ? (
                          <SecondaryButton
                            type="button"
                            onClick={() => void decideAffiliation(row, "revoke")}
                            disabled={!communityId || Boolean(busyKey)}
                            busy={busyKey === `domain-affiliation-revoke-${row.id}`}
                            busyLabel="Revoking..."
                            stableHeight={48}
                            debugId={`community-confirmation-policy.domain-affiliation.${row.id}.revoke`}
                          >
                            {labelWithIcon("lock", "Revoke public link", "red")}
                          </SecondaryButton>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      <section id="member-witness" style={{ marginTop: 14, ...softCard("#F7FAFF") }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
            gap: 12,
            alignItems: "start",
          }}
        >
          <div>
            {sectionLabelWithIcon(
              "shield",
              memberWitnessFocus ? "Member witness request" : "Member witness records",
              "green"
            )}
            <h2 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 24, fontWeight: 1000 }}>
              {memberWitnessFocus
                ? "Ask a known member to stand for you"
                : "Stand for a known member"}
            </h2>
            <p style={{ margin: "8px 0 0", ...helperText() }}>
              {memberWitnessFocus
                ? "Choose an active member who knows you inside this community, then send a QR or one-time-code request. GSN records nothing until they respond."
                : "This records that the signed-in verifier knows this person inside the selected community. It is human trust, digitally recorded."}
            </p>
          </div>
          <SecondaryButton
            type="button"
            onClick={() => void loadMembers()}
            busy={memberVerificationLoading}
            busyLabel="Refreshing..."
            stableHeight={52}
            minWidth={128}
            debugId="community-confirmation-policy.member-witness.refresh-members"
          >
            {labelWithIcon("refresh", "Refresh", "blue")}
          </SecondaryButton>
        </div>

        <div
          style={{
            marginTop: 14,
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 0.95fr) minmax(0, 1.05fr)",
            gap: 10,
          }}
        >
          <div
            style={{
              gridColumn: "1 / -1",
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 8,
              order: memberWitnessFocus ? 3 : 0,
            }}
          >
            <MeaningTile
              icon="lock"
              label="Request"
              title="Not evidence yet"
              text="A witness request is only an ask. GSN records nothing until the assigned verifier responds with the one-time code."
              tone="warn"
            />
            <MeaningTile
              icon="shield"
              label="Witness response"
              title="One witness event"
              text="A recorded response says this verifier stands for this member inside this community. It does not prove every shop, payment, or loan claim."
              tone="good"
            />
            <MeaningTile
              icon="certificate"
              label="Public credential"
              title="Use credential link"
              text="The public member credential is the safer evidence to share. It shows aggregate strength without exposing private verifier notes."
              tone="info"
            />
          </div>

          <div style={{ ...innerCard("#FFFFFF"), order: memberWitnessFocus ? 1 : 0 }}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon(
                "user",
                memberWitnessFocus ? "Choose witness" : "Choose member",
                "green"
              )}
            </div>
            <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
              {memberWitnessFocus
                ? "Pick an active member who knows you inside this community, then ask them to stand for you with a one-time response."
                : "Pick an active member. You can stand for them directly, or ask that same member to stand for you with a one-time response."}
            </p>
            <select
              value={selectedSubjectUserId}
              onChange={(event) => {
                const nextValue = event.target.value;
                setSelectedSubjectUserId(nextValue);
                setMemberWitnessSummary(null);
                if (nextValue) void loadMemberWitnessSummary(nextValue);
              }}
              style={fieldStyle()}
              aria-label="Member for witness"
              data-field-id="community-confirmation-policy.member-witness.subject"
            >
              <option value="">Choose active member</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.displayLabel}
                  {member.gsnId ? ` - ${member.gsnId}` : ""}
                </option>
              ))}
            </select>

            <div
              style={{
                marginTop: 10,
                display: "grid",
                gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                gap: 8,
              }}
            >
              <SecondaryButton
                type="button"
                onClick={() => void loadMemberWitnessSummary()}
                disabled={!selectedSubjectUserId || Boolean(busyKey)}
                busy={memberVerificationLoading}
                busyLabel="Checking..."
                stableHeight={50}
                debugId="community-confirmation-policy.member-witness.check"
              >
                {labelWithIcon("shield", "Check strength", "blue")}
              </SecondaryButton>
              {memberWitnessFocus ? (
                <>
                  <PrimaryButton
                    type="button"
                    onClick={() => void createMemberWitnessRequest()}
                    disabled={!selectedSubjectUserId || Boolean(busyKey)}
                    busy={busyKey === "member-witness-request"}
                    busyLabel="Creating..."
                    stableHeight={50}
                    debugId="community-confirmation-policy.member-witness.request"
                  >
                    {labelWithIcon("certificate", "Ask for witness", "navy")}
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => void recordMemberWitness()}
                    disabled={!selectedSubjectUserId || Boolean(busyKey)}
                    busy={busyKey === "member-witness-record"}
                    busyLabel="Recording..."
                    stableHeight={50}
                    debugId="community-confirmation-policy.member-witness.record"
                  >
                    {labelWithIcon("check", "Stand for member", "green")}
                  </SecondaryButton>
                </>
              ) : (
                <>
                  <PrimaryButton
                    type="button"
                    onClick={() => void recordMemberWitness()}
                    disabled={!selectedSubjectUserId || Boolean(busyKey)}
                    busy={busyKey === "member-witness-record"}
                    busyLabel="Recording..."
                    stableHeight={50}
                    debugId="community-confirmation-policy.member-witness.record"
                  >
                    {labelWithIcon("check", "Stand for member", "navy")}
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => void createMemberWitnessRequest()}
                    disabled={!selectedSubjectUserId || Boolean(busyKey)}
                    busy={busyKey === "member-witness-request"}
                    busyLabel="Creating..."
                    stableHeight={50}
                    debugId="community-confirmation-policy.member-witness.request"
                  >
                    {labelWithIcon("certificate", "Ask for witness", "gold")}
                  </SecondaryButton>
                </>
              )}
              <SecondaryButton
                type="button"
                onClick={() => void copyMemberCredentialLink()}
                disabled={!selectedMember?.gsnId || Boolean(busyKey)}
                stableHeight={50}
                debugId="community-confirmation-policy.member-witness.copy-public-credential"
              >
                {labelWithIcon("copy", "Copy credential link", "green")}
              </SecondaryButton>
            </div>

            <input
              value={memberWitnessClaim}
              onChange={(event) => setMemberWitnessClaim(event.target.value)}
              placeholder="Optional: shop line, role, or how you know them"
              style={{ ...fieldStyle(), marginTop: 10 }}
              aria-label="Member witness claim"
              data-field-id="community-confirmation-policy.member-witness.claim"
            />
            <textarea
              value={memberWitnessNote}
              onChange={(event) => setMemberWitnessNote(event.target.value)}
              placeholder="Optional note. Keep it short and factual."
              style={{ ...fieldStyle(), marginTop: 10, minHeight: 92, resize: "none" }}
              aria-label="Member witness note"
              data-field-id="community-confirmation-policy.member-witness.note"
            />
            <p style={{ margin: "10px 0 0", ...helperText(), fontSize: 13 }}>
              Share the QR and one-time code with the member who will answer.
              GSN records nothing until that person opens the response page and submits their answer.
            </p>
            {memberWitnessRequest && canShareMemberWitnessRequest ? (
              <div style={{ marginTop: 10, ...innerCard("#F8FBFF") }}>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) 132px",
                    gap: 12,
                    alignItems: "start",
                  }}
                >
                  <div>
                    <div style={{ color: "#07172C", fontWeight: 1000 }}>
                      {labelWithIcon("certificate", "Request ready", "gold")}
                    </div>
                    <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
                      Share this with the member who will answer. The QR opens the response page,
                      and the one-time code lets GSN record their witness safely.
                    </p>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      <div style={statTile("#FFFFFF")}>
                        <div style={sectionLabel()}>One-time code</div>
                        <div
                          style={{
                            marginTop: 6,
                            color: "#07172C",
                            fontSize: 24,
                            fontWeight: 1000,
                            letterSpacing: 1.5,
                          }}
                        >
                          {firstTruthy(memberWitnessRequest.oneTimeCode, "Not shown")}
                        </div>
                      </div>
                      <div style={statTile("#FFFFFF")}>
                        <div style={sectionLabel()}>Verifier</div>
                        <div style={{ marginTop: 6, color: "#07172C", fontWeight: 1000 }}>
                          {firstTruthy(
                            memberWitnessRequest.verifierDisplayName,
                            memberWitnessRequest.verifierGsnId,
                            "Assigned member"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {memberWitnessApprovalUrl ? (
                    <div
                      style={{
                        width: isCompact ? 132 : "100%",
                        justifySelf: isCompact ? "start" : "end",
                        borderRadius: 18,
                        padding: 10,
                        background: "#FFFFFF",
                        border: "1px solid rgba(37,78,119,0.14)",
                        boxShadow: "0 10px 24px rgba(2,6,23,0.08)",
                      }}
                    >
                      <QRCodeSVG
                        value={memberWitnessApprovalUrl}
                        size={110}
                        bgColor="#FFFFFF"
                        fgColor="#07172C"
                        level="M"
                        includeMargin
                      />
                      <div style={{ marginTop: 4, ...sectionLabel(), textAlign: "center" }}>
                        Scan to respond
                      </div>
                    </div>
                  ) : null}
                </div>
                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  <PrimaryButton
                    type="button"
                    onClick={() => void shareMemberWitnessRequestPackage()}
                    disabled={!memberWitnessApprovalUrl || !memberWitnessRequest.oneTimeCode || Boolean(busyKey)}
                    stableHeight={48}
                    debugId="community-confirmation-policy.member-witness.share-request-package"
                  >
                    {labelWithIcon("navigation", "Share package", "navy")}
                  </PrimaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => void copyMemberWitnessRequestLink()}
                    disabled={!memberWitnessApprovalUrl || Boolean(busyKey)}
                    stableHeight={48}
                    debugId="community-confirmation-policy.member-witness.copy-request-link"
                  >
                    {labelWithIcon("copy", "Copy response link", "green")}
                  </SecondaryButton>
                  <SecondaryButton
                    type="button"
                    onClick={() => void copyMemberWitnessRequestCode()}
                    disabled={!memberWitnessRequest.oneTimeCode || Boolean(busyKey)}
                    stableHeight={48}
                    debugId="community-confirmation-policy.member-witness.copy-request-code"
                  >
                    {labelWithIcon("lock", "Copy one-time code", "blue")}
                  </SecondaryButton>
                </div>
              </div>
            ) : null}
          </div>

          <div style={{ ...innerCard("#FFFFFF"), order: memberWitnessFocus ? 2 : 0 }}>
            <div style={{ color: "#07172C", fontWeight: 1000 }}>
              {labelWithIcon("certificate", "Current witness strength", "gold")}
            </div>
            {selectedMember ? (
              <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
                {selectedMember.displayLabel}
                {selectedMember.gsnId ? ` - ${selectedMember.gsnId}` : ""}. Role:{" "}
                {firstTruthy(selectedMember.role, "member")}.
              </p>
            ) : (
              <p style={{ margin: "8px 0 10px", ...helperText(), fontSize: 13 }}>
                Choose a member to see witness strength.
              </p>
            )}

            {memberVerificationLoading ? (
              <div style={innerCard("#F8FBFF")}>Loading member witness strength...</div>
            ) : memberWitnessSummary ? (
              <>
                <p style={{ margin: "0 0 10px", ...helperText(), fontSize: 13 }}>
                  Witness strength is current only while the witness records remain active and
                  inside their validity window. Expired, withdrawn, or disputed witness records
                  should be treated as weaker evidence until renewed.
                </p>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div style={statTile("#F8FBFF")}>
                    <div style={sectionLabel()}>Strength</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontSize: 20, fontWeight: 1000 }}>
                      {memberWitnessSummary.strengthLabel}
                    </div>
                  </div>
                  <div style={statTile("#F8FBFF")}>
                    <div style={sectionLabel()}>Active witnesses</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontSize: 20, fontWeight: 1000 }}>
                      {memberWitnessSummary.activeCount}
                    </div>
                  </div>
                  <div style={statTile("#F8FBFF")}>
                    <div style={sectionLabel()}>Public label</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontSize: 16, fontWeight: 1000 }}>
                      {memberWitnessSummary.publicLabel}
                    </div>
                  </div>
                  <div style={statTile("#F8FBFF")}>
                    <div style={sectionLabel()}>Valid until</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontSize: 16, fontWeight: 1000 }}>
                      {dateLabel(memberWitnessSummary.validUntil)}
                    </div>
                  </div>
                  <div style={statTile("#F8FBFF")}>
                    <div style={sectionLabel()}>Renewal</div>
                    <div style={{ marginTop: 6, color: "#07172C", fontSize: 16, fontWeight: 1000 }}>
                      {firstTruthy(memberWitnessSummary.renewalStatusLabel, "Not Started")}
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                  {memberWitnessSummary.items.length === 0 ? (
                    <div style={innerCard("#F8FBFF")}>
                      No member witness confirmations have been recorded for this person yet.
                    </div>
                  ) : (
                    memberWitnessSummary.items.slice(0, 4).map((row) => {
                      const active = row.status === "active" && !row.withdrawnAt;
                      return (
                        <article key={row.id} style={innerCard(active ? "#F8FBFF" : "#FEF2F2")}>
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 8,
                              flexWrap: "wrap",
                            }}
                          >
                            <strong style={{ color: "#07172C" }}>
                              {firstTruthy(row.verifierLabel, row.verifierGsnId, `Witness ${row.id}`)}
                            </strong>
                            <span style={statusPill(active, active ? "active" : row.status)}>
                              {active ? "active" : row.status}
                            </span>
                          </div>
                          <p style={{ margin: "6px 0 10px", ...helperText(), fontSize: 13 }}>
                            {firstTruthy(row.claimLabel, "Known active community member")} - valid until{" "}
                            {dateLabel(row.validUntil)}
                          </p>
                          {active ? (
                            <SecondaryButton
                              type="button"
                              onClick={() => void withdrawMemberWitness(row)}
                              disabled={Boolean(busyKey)}
                              busy={busyKey === `member-witness-withdraw-${row.id}`}
                              busyLabel="Withdrawing..."
                              stableHeight={46}
                              debugId={`community-confirmation-policy.member-witness.${row.id}.withdraw`}
                            >
                              {labelWithIcon("lock", "Withdraw witness", "red")}
                            </SecondaryButton>
                          ) : null}
                        </article>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div style={innerCard("#F8FBFF")}>
                No member selected. This lane records member-backed witness evidence, not
                paid parent-domain affiliation.
              </div>
            )}
          </div>
        </div>
      </section>

      <section
        style={{
          display: memberWitnessFocus ? "none" : undefined,
          marginTop: 14,
          ...softCard("#F8FBFF"),
        }}
      >
        {sectionLabelWithIcon("community", "Eligible response pool", "blue")}
        <h2 style={{ margin: "6px 0 0", color: "#07172C", fontSize: 24, fontWeight: 1000 }}>
          People allowed to answer confirmation requests
        </h2>
        <p style={{ margin: "8px 0 0", ...helperText() }}>
          These members may receive GSN relay requests. Public papers never show private contacts or raw votes.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
          {loading ? (
            <div style={innerCard("#FFFFFF")}>Loading relay contacts...</div>
          ) : contacts.length === 0 ? (
            <div style={innerCard("#FFFFFF")}>
              No relay contacts are currently listed for this community.
            </div>
          ) : (
            contacts.map((contact) => {
              const receiving = Boolean(contact.receiving_requests);
              const key = `contact-${contact.user_id}`;
              return (
                <article key={contact.user_id} style={innerCard("#FFFFFF")}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1fr) auto",
                      gap: 12,
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "grid", gridTemplateColumns: "56px minmax(0, 1fr)", gap: 12, alignItems: "center" }}>
                      <div
                        style={{
                          width: 56,
                          height: 56,
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
                        {contact.profile_image_url ? (
                          <img
                            src={contact.profile_image_url}
                            alt={`${firstTruthy(contact.display_name, "Member")} profile`}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          <GsnLegacyIcon name="user" size={34} />
                        )}
                      </div>
                      <div>
                        <div style={{ color: "#07172C", fontSize: 18, fontWeight: 1000 }}>
                          {firstTruthy(contact.display_name, `Member ${contact.user_id}`)}
                        </div>
                        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {statusPillWithIcon(receiving, receiving ? "Receiving" : "Paused", receiving ? "check" : "lock")}
                          {statusPillWithIcon(Boolean(contact.phone_verified), contact.phone_verified ? "Phone verified" : "Phone not shown", "phone")}
                          {statusPillWithIcon(!contact.member_opted_out, contact.member_opted_out ? "Member opted out" : "Opted in", contact.member_opted_out ? "lock" : "check")}
                        </div>
                        <p style={{ margin: "8px 0 0", ...helperText(), fontSize: 13 }}>
                          {firstTruthy(contact.gsn_id, contact.role_type, contact.membership_role, "GSN relay contact")}
                        </p>
                      </div>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: isCompact ? "1fr" : "1fr 1fr",
                        gap: 8,
                        minWidth: isCompact ? "auto" : 260,
                      }}
                    >
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          void patchContact(contact, {
                            active: !receiving,
                            can_receive_relay_requests: !receiving,
                          })
                        }
                        disabled={!communityId || Boolean(busyKey) || Boolean(contact.member_opted_out)}
                        busy={busyKey === key}
                        busyLabel="Saving..."
                        stableHeight={isCompact ? 52 : 46}
                        debugId={`community-confirmation-policy.contact.${contact.user_id}.relay`}
                      >
                        {labelWithIcon(receiving ? "lock" : "megaphone", receiving ? "Pause requests" : "Allow requests", receiving ? "red" : "green")}
                      </SecondaryButton>
                      <SecondaryButton
                        type="button"
                        onClick={() =>
                          void patchContact(contact, {
                            can_receive_instant_pulse: !contact.can_receive_instant_pulse,
                            can_receive_relay_requests: true,
                            active: true,
                          })
                        }
                        disabled={!communityId || Boolean(busyKey) || Boolean(contact.member_opted_out)}
                        busy={busyKey === key}
                        busyLabel="Saving..."
                        stableHeight={isCompact ? 52 : 46}
                        debugId={`community-confirmation-policy.contact.${contact.user_id}.instant`}
                      >
                        {labelWithIcon("spark", `Instant ${contact.can_receive_instant_pulse ? "on" : "off"}`, contact.can_receive_instant_pulse ? "green" : "gold")}
                      </SecondaryButton>
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </div>
      </section>

      <section
        style={{
          display: memberWitnessFocus ? "none" : undefined,
          marginTop: 14,
          ...pageCard("#07172C"),
          color: "#FFFFFF",
        }}
      >
        <div style={{ color: "#F2C766", fontWeight: 1000 }}>
          {labelWithIcon("lock", "Privacy rule", "gold")}
        </div>
        <p style={{ margin: "8px 0 0", color: "#D7E2EF", fontWeight: 800, lineHeight: 1.5 }}>
          GSN can ask eligible members, but public readers see only the controlled outcome. Private contacts and raw votes stay protected.
        </p>
        <PrimaryButton
          type="button"
          onClick={() => navigateWithOrigin(navigate, APP_ROUTES.COMMUNITY_CONFIRMATION_INBOX, location)}
          stableHeight={50}
          minWidth={180}
          style={{ marginTop: 14 }}
          debugId="community-confirmation-policy.open-inbox"
        >
          {labelWithIcon("navigation", "Open responder inbox", "navy")}
        </PrimaryButton>
      </section>
    </div>
  );
}

export default CommunityConfirmationPolicyPage;
