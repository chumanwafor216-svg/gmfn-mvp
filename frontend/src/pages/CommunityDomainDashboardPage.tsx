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
  createCommunityDomainPackageQuote,
  decideCommunityDomainActionReview,
  getAccessToken,
  getCommunityDomainActivityGroupReadiness,
  getCommunityDomainActivityMap,
  getCommunityDomainAppealReadiness,
  getCommunityDomainCapacityPlan,
  getCommunityDomainComplianceMap,
  getCommunityDomainConfigurationMap,
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
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";

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

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
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
    letterSpacing: 0.5,
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
      risk: "Do not call the institution active or verified until the backend status proves it.",
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

function mergeActionReviews(...groups: ActionReviewItem[][]): ActionReviewItem[] {
  const byId = new Map<string, ActionReviewItem>();
  groups.flat().forEach((item) => {
    const id = cleanText(item.id);
    if (id) byId.set(id, item);
  });
  return Array.from(byId.values());
}

export default function CommunityDomainDashboardPage() {
  const params = useParams();
  const communityDomainId = cleanText(params.communityDomainId || params.id);
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [dashboardRouteId, setDashboardRouteId] = useState("");
  const [domainItems, setDomainItems] = useState<any[]>([]);
  const [reviewerQueue, setReviewerQueue] = useState<ActionReviewItem[]>([]);
  const [ownMembershipRequests, setOwnMembershipRequests] = useState<ActionReviewItem[]>([]);
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

  useEffect(() => {
    activeCommunityDomainIdRef.current = communityDomainId;
  }, [communityDomainId]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      dashboardLoadSequence.current += 1;
      reviewerQueueLoadSequence.current += 1;
      membershipRequestLoadSequence.current += 1;
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
      setBusyQuote(false);
      setBusyMembershipRequest(false);
      setBusyReviewId(null);
      resetReadinessLoadTracking();
      setMessage("");
      setOwnMembershipRequests([]);
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
            err?.message ||
              "GSN could not load your Community Domains. Check that you are signed in."
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
    setBusyQuote(false);
    setBusyMembershipRequest(false);
    setBusyReviewId(null);
    resetReadinessLoadTracking();
    setMessage("");
    setDomainItems([]);
    setReviewerQueue([]);
    setOwnMembershipRequests([]);
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
        } catch {
          if (canApply()) {
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
        err?.message ||
          "GSN could not open this Community Domain dashboard. Check that you are signed in as an active domain member."
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
  const latestMembershipRequest = ownMembershipRequests[0] || null;
  const membershipAccessRequests = reviewerQueue.filter(
    (review) => cleanText(review.action_key) === "domain_member.upsert"
  );
  const governanceReviewCounts = reviewStatusCounts(reviewerQueue);
  const governancePendingCount =
    (governanceReviewCounts.pending || 0) +
    (governanceReviewCounts.pending_review || 0);
  const governanceApprovedCount = governanceReviewCounts.approved || 0;
  const governanceAttentionCount = isAdmin
    ? governancePendingCount
    : Number(counts.open_reviews || 0);
  const selectedLane = lanes.find((lane) => lane.lane_key === activeLane) || lanes[0];
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
      ? "GSN opens Services because authority verification is shown there as a read-only readiness row. Actual authority verification still needs its separate owner/admin path."
      : "";
  const billingIsActive =
    cleanText(status.billing_status || selectedLane?.status).toLowerCase() === "active";
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
        setMessage(err?.message || "GSN could not load the Community Domain review queue.");
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
        setMessage(err?.message || "GSN could not refresh the package quote.");
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
            ? "Approved from the Community Domain access queue before applying membership."
            : "Approved from the Community Domain access queue. Membership still needs apply.",
        }
      );
      if (!isCurrentDomainRequest(requestDomainId)) return;
      if (applyAfterApproval) {
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
          : `Access request ${reviewId} recorded. It may need another approval before membership can be applied.`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        setMessage(
          err?.message ||
            "GSN could not process this Community Domain access request."
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
          "Declined from the Community Domain access queue. No membership change was applied.",
      });
      if (!isCurrentDomainRequest(requestDomainId)) return;
      setMessage(
        `Access request ${reviewId} declined. No membership was added, and the request will no longer appear as pending.`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      if (isCurrentDomainRequest(requestDomainId)) {
        setMessage(
          err?.message ||
            "GSN could not decline this Community Domain access request."
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
        setMessage(
          err?.message ||
            "GSN could not add this approved Community Domain member."
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
      const detail = err?.detail;
      const code = detail?.code || "";
      const text =
        detail?.message ||
        err?.message ||
        "GSN could not send the Community Domain access request.";
      if (code === "community_domain_membership_request_pending") {
        await loadOwnMembershipRequests(requestDomainId);
        if (!isCurrentDomainRequest(requestDomainId)) return;
        setMessage(
          "You already have a pending access request for this Community Domain. An owner/admin still needs to approve and apply it."
        );
      } else if (code === "community_domain_member_already_active") {
        if (isCurrentDomainRequest(requestDomainId)) {
          setMessage(
            "You are already recorded as an active member. Try opening the dashboard again."
          );
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
            busyMembershipRequest={busyMembershipRequest}
            onRetry={loadDashboard}
            onRequestDomainAccess={requestDomainAccess}
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
                        GSN is loading the read-only setup checklist while the main
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
                        GSN is loading the read-only setup plan while the main
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
                      GSN is loading the read-only maps, readiness checks, and lane
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
                        : "Quote details are still required before a payment instruction exists."}{" "}
                      Renewal period and payment instruction are not configured here.
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
                      >
                        <Suspense
                          fallback={
                            <div style={{ ...helperText(), marginTop: 4 }}>
                              Loading local service projections...
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
                      </CommunityDomainServiceReadinessPanels>
                    </Suspense>

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
                    <Suspense
                      fallback={
                        <div style={{ ...helperText(), marginTop: 4 }}>
                          Loading trust evidence projections...
                        </div>
                      }
                    >
                      <CommunityDomainNodeProjectionGroups
                        variant="trustEvidence"
                        nodeEvidenceAuthorityMap={nodeEvidenceAuthorityMap}
                        nodeTrustMap={nodeTrustMap}
                      />
                    </Suspense>

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
                  </>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading structure preview...
                      </div>
                    }
                  >
                    <CommunityDomainStructurePreviewPanel
                      nodeTree={nodeTree}
                    />
                  </Suspense>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading local structure projections...
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

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading domain-boundary projection...
                      </div>
                    }
                  >
                    <CommunityDomainNodeProjectionGroups
                      variant="structureBoundary"
                      nodeDomainBoundaryMap={nodeDomainBoundaryMap}
                    />
                  </Suspense>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading activity detail projections...
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

                {!isActiveLaneReadinessLoading && activeLane === "structure" ? (
                  <Suspense
                    fallback={
                      <div style={{ ...helperText(), marginTop: 4 }}>
                        Loading structure planning panels...
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
                      governanceApprovedCount={governanceApprovedCount}
                      delegationMap={delegationMap}
                      governanceCoverage={governanceCoverage}
                    />
                  </Suspense>
                ) : null}

                {!isActiveLaneReadinessLoading && activeLane === "members" ? (
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
                    >
                      <Suspense
                        fallback={
                          <div style={{ ...helperText(), marginTop: 4 }}>
                            Loading member placement projection...
                          </div>
                        }
                      >
                        <CommunityDomainNodeProjectionGroups
                          variant="memberParticipation"
                          nodeParticipationMap={nodeParticipationMap}
                        />
                      </Suspense>
                    </CommunityDomainMemberReadinessPanels>
                  </Suspense>
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
                This dashboard does not create payment instructions, confirm payment,
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
