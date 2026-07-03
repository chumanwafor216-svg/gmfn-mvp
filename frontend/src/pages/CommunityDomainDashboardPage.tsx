import React, {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import { StableButton } from "../components/StableButton";
import {
  applyCommunityDomainActionReview,
  cancelCommunityDomainActionReview,
  createCommunityDomainPackageQuote,
  decideCommunityDomainActionReview,
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
  getCommunityDomainReadiness,
  getCommunityDomainRecordPrivacyMap,
  getCommunityDomainReviewerQueue,
  getCommunityDomainRolloutPlan,
  getCommunityDomainSetupPlan,
  getCommunityDomainSocialBridge,
  getCommunityDomainTrustRelayReadiness,
  getCommunityDomainTrustMobility,
  getCommunityDomainSubscriptionLifecycle,
  listCommunityDomainServiceSettings,
  listCommunityDomainActionReviews,
  listCommunityDomainNodeTree,
  listMyCommunityDomainMembershipRequests,
  listMyCommunityDomains,
  requestCommunityDomainMembership,
  reviseCommunityDomainActionReview,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";
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
type ServiceDetailKey = "readiness" | "local" | "boundaries" | "trust" | "evidence";
type MemberDetailKey = "readiness" | "placement";

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
    note: "Check exchange, privacy, configuration, compliance, and appeal boundaries.",
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
];

type DashboardPayload = {
  community_domain?: any;
  template?: any;
  viewer?: {
    user_id?: number;
    can_admin?: boolean;
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

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
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
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.13)",
    boxShadow:
      "0 20px 46px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    color: "#091B2E",
  };
}

function softCard(): React.CSSProperties {
  return {
    borderRadius: 18,
    background:
      "linear-gradient(180deg, rgba(248,251,255,0.995) 0%, rgba(236,243,250,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.12)",
    boxShadow: "0 14px 30px rgba(7,20,36,0.055)",
    padding: 14,
    color: "#091B2E",
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
  };
}

function factTile(): React.CSSProperties {
  return {
    borderRadius: 16,
    background: "rgba(255,255,255,0.10)",
    border: "1px solid rgba(214,228,242,0.16)",
    padding: 12,
    minHeight: 74,
    display: "grid",
    alignContent: "center",
    gap: 5,
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
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

function laneForAction(actionKey: unknown): string {
  const key = cleanText(actionKey).toLowerCase();
  if (key.includes("package") || key.includes("billing")) return "billing";
  if (key.includes("verify") || key.includes("verification")) return "verification";
  if (key.includes("review") || key.includes("governance")) return "governance";
  if (key.includes("member")) return "members";
  if (key.includes("module")) return "modules";
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
        nextStep: "Use the readiness and work lanes to keep the operating system healthy.",
        risk: "Active still does not mean every service, payment, Trust Event, or evidence release is enabled.",
      };
    }
    return {
      heading: "Active, not verified",
      detail:
        "The domain can be operated by authorized members, but it must not be presented as a verified institution yet.",
      nextStep: "Continue setup while keeping authority verification separate from billing and activation.",
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
  return label;
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
  const [nodeTree, setNodeTree] = useState<StructureNode[]>([]);
  const [moduleScopeReadiness, setModuleScopeReadiness] = useState<any | null>(null);
  const [setupReadiness, setSetupReadiness] = useState<any | null>(null);
  const [setupPlan, setSetupPlan] = useState<any | null>(null);
  const [capacityPlan, setCapacityPlan] = useState<any | null>(null);
  const [governanceCoverage, setGovernanceCoverage] = useState<any | null>(null);
  const [delegationMap, setDelegationMap] = useState<any | null>(null);
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
  const [activeLane, setActiveLane] = useState("structure");
  const [activeStructureDetail, setActiveStructureDetail] =
    useState<StructureDetailKey>("preview");
  const [activeServiceDetail, setActiveServiceDetail] =
    useState<ServiceDetailKey>("readiness");
  const [activeMemberDetail, setActiveMemberDetail] =
    useState<MemberDetailKey>("readiness");
  const [loadedReadinessLanes, setLoadedReadinessLanes] = useState<Record<string, boolean>>({});
  const [loadingReadinessLanes, setLoadingReadinessLanes] = useState<Record<string, boolean>>({});
  const readinessLoadSequence = useRef(0);
  const readinessLoadIds = useRef<Record<string, number>>({});
  const readinessLoadPromises = useRef<Record<string, Promise<any>>>({});
  const [loading, setLoading] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [busyQuote, setBusyQuote] = useState(false);
  const [busyMembershipRequest, setBusyMembershipRequest] = useState(false);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const mountedRef = useRef(true);
  const activeCommunityDomainIdRef = useRef(communityDomainId);
  const dashboardLoadSequence = useRef(0);
  const reviewerQueueLoadSequence = useRef(0);
  const membershipRequestLoadSequence = useRef(0);
  const membershipRequestLineageLoadSequence = useRef(0);

  useEffect(() => {
    activeCommunityDomainIdRef.current = communityDomainId;
  }, [communityDomainId]);

  useEffect(() => {
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
    setNodeTree([]);
    setModuleScopeReadiness(null);
    setSetupReadiness(null);
    setSetupPlan(null);
    setCapacityPlan(null);
    setGovernanceCoverage(null);
    setDelegationMap(null);
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
    resetOptionalReadinessState();
    try {
      const payload = await getCommunityDomainDashboard(requestDomainId);
      if (!canApply()) return;
      const nextDashboard = (payload?.dashboard || null) as DashboardPayload | null;
      setDashboard(nextDashboard);
      setDashboardRouteId(communityDomainId);
      setQuote(nextDashboard?.package_quote || null);
      setActiveLane(laneForAction(nextDashboard?.primary_next_action?.action_key));
      setLoading(false);
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
    resetOptionalReadinessState,
    resetReadinessLoadTracking,
  ]);

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
        ]);
      }

      if (laneKey === "members") {
        return Promise.all([
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
      const [governanceCoveragePayload, delegationMapPayload] = payloads;
      setGovernanceCoverage(governanceCoveragePayload?.governance_coverage || null);
      setDelegationMap(delegationMapPayload?.delegation_map || null);
      return;
    }

    if (laneKey === "members") {
      const [memberVerificationPayload, nodeParticipationPayload, placementPayload] = payloads;
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
            if (readinessLoadIds.current[key] === requestId) {
              next[key] = false;
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

  const domain = dashboard?.community_domain || {};
  const template = useMemo(() => dashboard?.template || {}, [dashboard?.template]);
  const status = dashboard?.status || {};
  const counts = dashboard?.counts || {};
  const lanes = Array.isArray(dashboard?.lanes) ? dashboard?.lanes || [] : [];
  const isAdmin = Boolean(dashboard?.viewer?.can_admin);
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
  const primaryActionFallbackNote =
    !setupPrimaryActionHasLane && setupPrimaryActionLaneKey === "verification" && hasServicesLane
      ? "GSN opens Services because authority verification is shown there as a readiness row. Actual authority verification still needs its separate owner or admin path."
      : "";
  const billingIsActive =
    cleanText(status.billing_status || selectedLane?.status).toLowerCase() === "active";

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
  const operatingStateCopy = communityDomainOperatingStateCopy(status);
  const renewalState = cleanText(quote?.renewal_policy?.status, "not set");

  const moduleKeys = useMemo(() => {
    const included = Array.isArray(quote?.included_modules) ? quote.included_modules : [];
    const templateModules = Array.isArray(template?.default_modules)
      ? template.default_modules
      : [];
    return Array.from(new Set([...included, ...templateModules])).slice(0, 8);
  }, [quote, template]);

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

  return (
    <main style={pageShell()}>
      <PageTopNav
        sectionLabel="Community Domain"
        title="Institutional dashboard"
        subtitle="Operate the domain after it exists. Keep setup, payment, and verification separate."
        homeTo={APP_ROUTES.DASHBOARD}
        homeLabel="Dashboard"
        backTo={APP_ROUTES.COMMUNITY}
        backLabel="Community Home"
      />

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
        <section style={whiteCard()}>
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
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(132px, 1fr))",
                gap: 10,
                marginTop: 16,
              }}
            >
              {[
                ["Owner", cleanText(domain.owner_user_id, "not recorded")],
                ["Domain status", compactStatus(status.domain_status)],
                ["Verification", compactStatus(status.verification_status)],
                ["Billing", compactStatus(status.billing_status)],
                ["Activation", compactStatus(status.activation_status)],
                ["Renewal", compactStatus(renewalState)],
              ].map(([label, value]) => (
                <div key={label} style={factTile()}>
                  <div style={sectionLabel(true)}>{label}</div>
                  <div style={{ color: "#FFFFFF", fontSize: 16, fontWeight: 950, textTransform: "capitalize" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={whiteCard()}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <div style={sectionLabel()}>Operating state</div>
                <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                  {operatingStateCopy.heading}
                </h2>
                <div style={{ ...helperText(), marginTop: 8 }}>
                  {operatingStateCopy.detail}
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(136px, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  ["Domain", status.domain_status],
                  ["Activation", status.activation_status],
                  ["Billing", status.billing_status],
                  ["Renewal", renewalState],
                ].map(([label, value]) => (
                  <div key={String(label)} style={statusBadge(value)}>
                    {String(label)}: {compactStatus(value)}
                  </div>
                ))}
              </div>
              <div
                style={{
                  borderRadius: 16,
                  border: "1px solid rgba(146,94,8,0.18)",
                  background: "rgba(255,247,226,0.64)",
                  padding: 12,
                }}
              >
                <div style={{ fontWeight: 950 }}>{operatingStateCopy.nextStep}</div>
                <div style={{ ...helperText(), marginTop: 5, fontSize: 13 }}>
                  {operatingStateCopy.risk}
                </div>
              </div>
              <div style={{ ...helperText(), fontSize: 13 }}>
                Draft, waiting, active, expired, suspended, and closed domains get
                different guidance here. Payment, renewal, activation, and authority
                verification remain separate.
              </div>
            </div>
          </section>

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
                  ],
                  [
                    "Governance",
                    `${countValue(counts.active_policies)} policies`,
                    "Rules and reviews control who can change members, structure, and evidence.",
                  ],
                  [
                    "Services",
                    `${countValue(moduleKeys.length)} services`,
                    "Shops, verification, analytics, vault, and other enabled services stay scoped here.",
                  ],
                  [
                    "Trust relay",
                    compactStatus(status.verification_status),
                    "Evidence can travel with the domain, but verification still depends on current status.",
                  ],
                ].map(([label, value, detail]) => (
                  <div key={String(label)} style={softCard()}>
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
                    <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                      {String(detail)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 12,
            }}
          >
            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Next action</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  Open the {primaryActionLaneLabel} lane
                </h2>
                <div style={helperText()}>
                  {cleanText(
                    setupPrimaryAction?.label,
                    "Review the current Community Domain setup state."
                  )}{" "}
                  GSN opens the matching lane here first; deeper changes still use
                  owner/admin tools that check permissions.
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
                  onClick={() => setActiveLane(primaryActionLaneKey)}
                >
                  Open {primaryActionLaneLabel}
                </StableButton>
              </div>
            </div>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Template</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  {cleanText(template.label, "Institution")}
                </h2>
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

          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              gap: 12,
              alignItems: "start",
            }}
          >
            <Suspense
              fallback={
                <div style={whiteCard()}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <div style={sectionLabel()}>Work lanes</div>
                    <div style={helperText()}>
                      Loading Community Domain work lanes...
                    </div>
                  </div>
                </div>
              }
            >
              <CommunityDomainLaneSelectorPanel
                lanes={lanes}
                activeLane={activeLane}
                onSelectLane={setActiveLane}
              />
            </Suspense>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={sectionLabel()}>Opened lane</div>
                <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                  {laneDisplayLabel(selectedLane, "Community Domain setup")}
                </h2>
                <div style={helperText()}>
                  Current state:{" "}
                  <strong style={{ textTransform: "capitalize" }}>
                    {compactStatus(selectedLane?.status)}
                  </strong>
                  . Count: <strong>{countValue(selectedLane?.count)}</strong>.
                </div>

                {isActiveLaneReadinessLoading ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Loading setup intelligence</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      GSN is loading the maps, readiness checks, and lane
                      details for this Community Domain. The primary dashboard is
                      already available; write actions remain separate and permission
                      checked.
                    </div>
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

                {!isActiveLaneReadinessLoading && activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Package and renewal</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Billing status:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(status.billing_status || selectedLane?.status)}
                      </strong>
                      .{" "}
                      {billingIsActive
                        ? "Quote details remain available for reference, but this lane is no longer asking for a quote before setup continues."
                        : "Quote details are still required before a payment step exists."}{" "}
                      Renewal period and payment step are not configured here.
                    </div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Package quote:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(quote?.pricing_status || quote?.quote_status)}
                      </strong>
                      .
                    </div>
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
                  </div>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "billing" ? (
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
                        Open one service packet at a time. Current view:{" "}
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
                        {SERVICE_DETAIL_OPTIONS.map((option) => {
                          const selected = option.key === activeServiceDetail;
                          return (
                            <StableButton
                              key={option.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={48}
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
                      <div style={{ ...helperText(), fontSize: 13 }}>
                        {selectedServiceDetail.note}
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
                        Open one institutional structure view at a time. Current
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
                        {STRUCTURE_DETAIL_OPTIONS.map((option) => {
                          const selected = option.key === activeStructureDetail;
                          return (
                            <StableButton
                              key={option.key}
                              type="button"
                              kind={selected ? "primary" : "secondary"}
                              stableHeight={48}
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
                        Open one member packet at a time. Current view:{" "}
                        <strong>{selectedMemberDetail.label}</strong>.
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fit, minmax(min(100%, 148px), 1fr))",
                          gap: 8,
                        }}
                      >
                        {MEMBER_DETAIL_OPTIONS.map((option) => {
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
                              onClick={() => setActiveMemberDetail(option.key)}
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
                  </>
                ) : null}

                {!isActiveLaneReadinessLoading &&
                activeLane !== "billing" &&
                activeLane !== "modules" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Safe next step</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Use this lane to review setup state first. Creation, member changes,
                      policy decisions, payment, and verification remain separate actions
                      with owner/admin permission checks.
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </section>

          {isAdmin ? (
            <Suspense
              fallback={
                <section style={whiteCard()}>
                  <div style={sectionLabel()}>Access requests</div>
                  <div style={{ ...helperText(), marginTop: 8 }}>
                    Loading access request controls...
                  </div>
                </section>
              }
            >
              <CommunityDomainAccessRequestsPanel
                membershipAccessRequests={membershipAccessRequests}
                loadingQueue={loadingQueue}
                busyReviewId={busyReviewId}
                onApproveOnly={(review) => approveAccessRequest(review, false)}
                onRequestChanges={requestChangesForAccessRequest}
                onDecline={declineAccessRequest}
                onApproveAndApply={(review) => approveAccessRequest(review, true)}
                onApplyApproved={applyApprovedAccessRequest}
                onRefresh={refreshReviewerQueue}
              />
            </Suspense>
          ) : null}

          {message ? (
            <section style={whiteCard()}>
              <div style={sectionLabel()}>Action response</div>
              <div style={{ ...helperText(), marginTop: 8 }}>{message}</div>
            </section>
          ) : null}

          <section style={whiteCard()}>
            <div style={{ display: "grid", gap: 8 }}>
              <div style={sectionLabel()}>Boundary</div>
              <div style={helperText()}>
                This dashboard does not create payment steps, confirm payment,
                activate billing, activate a Community Domain, verify ownership, expose
                private finance records, or expose private member evidence.
              </div>
            </div>
          </section>
        </>
      ) : null}
    </main>
  );
}
