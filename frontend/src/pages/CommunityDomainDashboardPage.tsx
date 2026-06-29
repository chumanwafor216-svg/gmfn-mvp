import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageTopNav from "../components/PageTopNav";
import { GsnRealisticIcon } from "../components/GsnRealisticIcon";
import { StableButton, StableCtaLink } from "../components/StableButton";
import {
  applyCommunityDomainActionReview,
  createCommunityDomainPackageQuote,
  decideCommunityDomainActionReview,
  getAccessToken,
  getCommunityDomainCapacityPlan,
  getCommunityDomainDashboard,
  getCommunityDomainEvidenceRecordReadiness,
  getCommunityDomainEvidenceReleaseReadiness,
  getCommunityDomainAffiliationReadiness,
  getCommunityDomainGovernanceCoverage,
  getCommunityDomainMemberPlacementSummary,
  getCommunityDomainModuleScopeReadiness,
  getCommunityDomainNotificationScopeReadiness,
  getCommunityDomainReadiness,
  getCommunityDomainReviewerQueue,
  getCommunityDomainRolloutPlan,
  getCommunityDomainSetupPlan,
  getCommunityDomainTrustRelayReadiness,
  getCommunityDomainTrustMobility,
  getCommunityDomainSubscriptionLifecycle,
  listCommunityDomainActionReviews,
  listCommunityDomainNodeTree,
  listMyCommunityDomainMembershipRequests,
  listMyCommunityDomains,
  requestCommunityDomainMembership,
} from "../lib/api";
import { APP_ROUTES } from "../lib/appRoutes";

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

type ServiceReadinessItem = {
  module_key?: string | null;
  label?: string | null;
  summary?: string | null;
  enabled_by_template?: boolean;
  module_scope_status?: string | null;
  ready_for_future_module_scope?: boolean;
  next_step?: string | null;
  route_hint?: string | null;
  requires_admin?: boolean;
};

type SetupReadinessItem = {
  lane_key?: string | null;
  label?: string | null;
  state?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
  route_hint?: string | null;
  requires_admin?: boolean;
};

type SetupPlanStep = {
  step_key?: string | null;
  label?: string | null;
  completed?: boolean;
  missing_items?: unknown[];
  route_hint?: string | null;
  admin_action_route_hint?: string | null;
  requires_admin?: boolean;
};

type CapacityPlanLane = {
  lane_key?: string | null;
  label?: string | null;
  metered?: boolean;
  used?: number | string | null;
  limit?: number | string | null;
  remaining?: number | string | null;
  usage_percent?: number | string | null;
  status?: string | null;
  summary?: string | null;
};

type GovernanceCoverageNode = {
  node?: {
    id?: number | string | null;
    name?: string | null;
    parent_node_id?: number | string | null;
  } | null;
  governance_status?: string | null;
  ready_for_delegation?: boolean;
  local_policy_count?: number | string | null;
  inherited_policy_count?: number | string | null;
  effective_policy_count?: number | string | null;
  local_admin_count?: number | string | null;
  open_review_count?: number | string | null;
  next_step?: string | null;
};

type RolloutPlanPhase = {
  phase_key?: string | null;
  label?: string | null;
  completed?: boolean;
  status?: string | null;
  next_step?: string | null;
  detail?: Record<string, unknown> | null;
  requires_admin?: boolean;
};

type RolloutPlanUnit = {
  node?: {
    id?: number | string | null;
    name?: string | null;
  } | null;
  status?: string | null;
  ready_for_pilot?: boolean;
  member_count?: number | string | null;
  admin_count?: number | string | null;
  next_step?: string | null;
};

type EvidenceRecordReadinessType = {
  record_type?: string | null;
  label?: string | null;
  readiness_status?: string | null;
  ready_for_future_evidence_record?: boolean;
  active_policy_count?: number | string | null;
  review_record_count?: number | string | null;
  review_evidence_metadata_count?: number | string | null;
  evidence_record_status?: string | null;
  file_upload_status?: string | null;
  credential_status?: string | null;
  trustslip_status?: string | null;
  trust_passport_status?: string | null;
  next_step?: string | null;
};

type EvidenceReleaseReadinessLane = {
  lane_key?: string | null;
  label?: string | null;
  audience?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  release_status?: string | null;
  currentness_status?: string | null;
  public_url_status?: string | null;
  credential_status?: string | null;
  trustslip_status?: string | null;
  trust_passport_status?: string | null;
  next_step?: string | null;
};

type TrustRelayReadinessLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  source_domain_status?: string | null;
  bridge_member_status?: string | null;
  destination_domain_status?: string | null;
  relay_path_status?: string | null;
  next_step?: string | null;
};

type NotificationScopeReadinessLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  notification_scope_record_status?: string | null;
  notification_job_status?: string | null;
  notification_delivery_status?: string | null;
  audience_list_status?: string | null;
  public_announcement_status?: string | null;
  cross_domain_broadcast_status?: string | null;
  member_list_status?: string | null;
  next_step?: string | null;
};

type TrustMobilityLane = {
  lane_key?: string | null;
  label?: string | null;
  summary?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type AffiliationReadinessLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type SubscriptionLifecycleLane = {
  lane_key?: string | null;
  label?: string | null;
  summary?: string | null;
  status?: string | null;
  ready?: boolean;
  next_step?: string | null;
};

const MODULE_LABELS: Record<string, string> = {
  governance: "Governance",
  members: "Members",
  departments: "Structure",
  shops: "Shops",
  marketplace: "Marketplace",
  spotlight: "Spotlight",
  vault: "Vault",
  verification: "Verification",
  trust_centre: "Trust Centre",
  analytics: "Analytics",
  billing: "Billing",
  settings: "Settings",
};

const SERVICE_READINESS_KEYS = [
  "shops",
  "spotlight",
  "vault",
  "verification",
  "trust_centre",
  "analytics",
] as const;

type ServiceReadinessRow = {
  key: string;
  label: string;
  status: string;
  detail: string;
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

function moduleLabel(moduleKey: unknown): string {
  const key = cleanText(moduleKey);
  return MODULE_LABELS[key] || key.replace(/_/g, " ").replace(/\b\w/g, (x) => x.toUpperCase());
}

function serviceReadinessStatus(item: ServiceReadinessItem | undefined, fallbackEnabled: boolean): string {
  const status = cleanText(item?.module_scope_status).toLowerCase();
  if (!item) return fallbackEnabled ? "template listed" : "not listed";
  if (status === "ready_for_future_module_scope") return "planning ready";
  if (status === "needs_operating_units") return "needs structure";
  if (status === "needs_node_participants") return "needs placements";
  if (status === "needs_domain_policy") return "needs domain policy";
  if (status === "needs_scope_policy") return "needs service policy";
  if (status === "needs_review_signal") return "needs review signal";
  if (status === "optional_module_not_enabled") return "optional, not included";
  return compactStatus(status || (item.ready_for_future_module_scope ? "planning ready" : "not ready"));
}

function serviceFallbackDetail(serviceKey: string, fallbackEnabled: boolean): string {
  if (fallbackEnabled) {
    return "Listed by this Community Domain template. Readiness details are not loaded yet.";
  }
  return "Not included by the current template unless an owner later chooses to configure it.";
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

function reviewUserLabel(review: ActionReviewItem): string {
  return cleanText(
    review.subject_user_display_name ||
      review.subject_user_email ||
      review.requested_by_user_display_name ||
      review.requested_by_user_email ||
      review.payload?.user_id ||
      review.subject_user_id ||
      review.target_id,
    "member"
  );
}

function reviewRequesterLabel(review: ActionReviewItem): string {
  return cleanText(
    review.requested_by_user_display_name ||
      review.requested_by_user_email ||
      review.requested_by_user_id,
    "unknown"
  );
}

function membershipRequestStatusText(review: ActionReviewItem | null): string {
  const status = cleanText(review?.status, "pending").toLowerCase();
  const reviewId = cleanText(review?.id);
  const reviewLabel = reviewId ? ` Review ${reviewId}` : "";
  if (status === "pending" || status === "pending_review") {
    return `${reviewLabel} is pending. An owner/admin still needs to approve and apply it before membership changes.`;
  }
  if (status === "approved") {
    return `${reviewLabel} is approved, but membership still has to be applied by an owner/admin before this dashboard opens.`;
  }
  if (status === "applied") {
    return `${reviewLabel} has been applied. Try opening the dashboard again so GSN can refresh your membership view.`;
  }
  if (status === "rejected") {
    return `${reviewLabel} was declined. You can request again when you have clearer community proof or owner guidance.`;
  }
  return `${reviewLabel} is marked ${compactStatus(status)}. This status does not grant dashboard access by itself.`;
}

function membershipRequestButtonLabel(
  review: ActionReviewItem | null,
  busy: boolean
): string {
  if (busy) return "Sending request...";
  const status = cleanText(review?.status).toLowerCase();
  if (status === "pending" || status === "pending_review") return "Request pending";
  if (status === "approved") return "Approved, waiting to add";
  if (status === "applied") return "Try dashboard again";
  if (status === "rejected") return "Request again";
  return "Request access";
}

function structurePreviewRows(nodes: StructureNode[]): Array<{
  node: StructureNode;
  level: number;
}> {
  const roots = Array.isArray(nodes) ? nodes : [];
  const firstRoot = roots[0];
  if (!firstRoot) return [];
  const rows = [{ node: firstRoot, level: 0 }];
  const firstChildren = Array.isArray(firstRoot.children) ? firstRoot.children : [];
  firstChildren.slice(0, 4).forEach((node) => rows.push({ node, level: 1 }));
  if (rows.length < 5) {
    roots.slice(1, 5 - rows.length + 1).forEach((node) => {
      rows.push({ node, level: 0 });
    });
  }
  return rows.slice(0, 5);
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
  const [rolloutPlan, setRolloutPlan] = useState<any | null>(null);
  const [evidenceRecordReadiness, setEvidenceRecordReadiness] = useState<any | null>(null);
  const [evidenceReleaseReadiness, setEvidenceReleaseReadiness] = useState<any | null>(null);
  const [trustRelayReadiness, setTrustRelayReadiness] = useState<any | null>(null);
  const [notificationScopeReadiness, setNotificationScopeReadiness] = useState<any | null>(null);
  const [trustMobility, setTrustMobility] = useState<any | null>(null);
  const [affiliationReadiness, setAffiliationReadiness] = useState<any | null>(null);
  const [subscriptionLifecycle, setSubscriptionLifecycle] = useState<any | null>(null);
  const [quote, setQuote] = useState<any | null>(null);
  const [activeLane, setActiveLane] = useState("structure");
  const [loading, setLoading] = useState(true);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [busyQuote, setBusyQuote] = useState(false);
  const [busyMembershipRequest, setBusyMembershipRequest] = useState(false);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadOwnMembershipRequests = useCallback(async () => {
    if (!communityDomainId || !getAccessToken()) {
      setOwnMembershipRequests([]);
      return [];
    }
    try {
      const payload = await listMyCommunityDomainMembershipRequests(communityDomainId);
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setOwnMembershipRequests(items);
      return items;
    } catch {
      setOwnMembershipRequests([]);
      return [];
    }
  }, [communityDomainId]);

  const loadDashboard = useCallback(async () => {
    if (!communityDomainId) {
      setLoading(true);
      setMessage("");
      setOwnMembershipRequests([]);
      setPlacementSummary(null);
      setNodeTree([]);
      setModuleScopeReadiness(null);
      setSetupReadiness(null);
      setSetupPlan(null);
      setCapacityPlan(null);
      setGovernanceCoverage(null);
      setRolloutPlan(null);
      setEvidenceRecordReadiness(null);
      setEvidenceReleaseReadiness(null);
      setTrustRelayReadiness(null);
      setNotificationScopeReadiness(null);
      setTrustMobility(null);
      setAffiliationReadiness(null);
      setSubscriptionLifecycle(null);
      try {
        const payload = await listMyCommunityDomains();
        setDomainItems(Array.isArray(payload?.items) ? payload.items : []);
      } catch (err: any) {
        setDomainItems([]);
        setMessage(
          err?.message ||
            "GSN could not load your Community Domains. Check that you are signed in."
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setMessage("");
    setDomainItems([]);
    setReviewerQueue([]);
    setOwnMembershipRequests([]);
    setPlacementSummary(null);
    setNodeTree([]);
    setModuleScopeReadiness(null);
    setSetupReadiness(null);
    setSetupPlan(null);
    setCapacityPlan(null);
    setGovernanceCoverage(null);
    setRolloutPlan(null);
    setEvidenceRecordReadiness(null);
    setEvidenceReleaseReadiness(null);
    setTrustRelayReadiness(null);
    setNotificationScopeReadiness(null);
    setTrustMobility(null);
    setAffiliationReadiness(null);
    setSubscriptionLifecycle(null);
    try {
      const payload = await getCommunityDomainDashboard(communityDomainId);
      const nextDashboard = (payload?.dashboard || null) as DashboardPayload | null;
      setDashboard(nextDashboard);
      setQuote(nextDashboard?.package_quote || null);
      setActiveLane(laneForAction(nextDashboard?.primary_next_action?.action_key));
      try {
        const treePayload = await listCommunityDomainNodeTree(communityDomainId);
        setNodeTree(Array.isArray(treePayload?.items) ? treePayload.items : []);
      } catch {
        setNodeTree([]);
      }
      try {
        const readinessPayload = await getCommunityDomainReadiness(communityDomainId);
        setSetupReadiness(readinessPayload?.readiness || null);
      } catch {
        setSetupReadiness(null);
      }
      try {
        const setupPlanPayload = await getCommunityDomainSetupPlan(communityDomainId);
        setSetupPlan(setupPlanPayload?.setup_plan || null);
      } catch {
        setSetupPlan(null);
      }
      try {
        const capacityPlanPayload = await getCommunityDomainCapacityPlan(communityDomainId);
        setCapacityPlan(capacityPlanPayload?.capacity_plan || null);
      } catch {
        setCapacityPlan(null);
      }
      try {
        const subscriptionPayload = await getCommunityDomainSubscriptionLifecycle(
          communityDomainId
        );
        setSubscriptionLifecycle(subscriptionPayload?.subscription_lifecycle || null);
      } catch {
        setSubscriptionLifecycle(null);
      }
      try {
        const governanceCoveragePayload = await getCommunityDomainGovernanceCoverage(
          communityDomainId
        );
        setGovernanceCoverage(governanceCoveragePayload?.governance_coverage || null);
      } catch {
        setGovernanceCoverage(null);
      }
      try {
        const rolloutPlanPayload = await getCommunityDomainRolloutPlan(communityDomainId);
        setRolloutPlan(rolloutPlanPayload?.rollout_plan || null);
      } catch {
        setRolloutPlan(null);
      }
      try {
        const readinessPayload = await getCommunityDomainModuleScopeReadiness(communityDomainId);
        setModuleScopeReadiness(readinessPayload?.module_scope_readiness || null);
      } catch {
        setModuleScopeReadiness(null);
      }
      try {
        const evidenceReadinessPayload = await getCommunityDomainEvidenceRecordReadiness(
          communityDomainId
        );
        setEvidenceRecordReadiness(
          evidenceReadinessPayload?.evidence_record_readiness || null
        );
      } catch {
        setEvidenceRecordReadiness(null);
      }
      try {
        const releaseReadinessPayload = await getCommunityDomainEvidenceReleaseReadiness(
          communityDomainId
        );
        setEvidenceReleaseReadiness(
          releaseReadinessPayload?.evidence_release_readiness || null
        );
      } catch {
        setEvidenceReleaseReadiness(null);
      }
      try {
        const relayReadinessPayload = await getCommunityDomainTrustRelayReadiness(
          communityDomainId
        );
        setTrustRelayReadiness(relayReadinessPayload?.trust_relay_readiness || null);
      } catch {
        setTrustRelayReadiness(null);
      }
      try {
        const notificationScopePayload = await getCommunityDomainNotificationScopeReadiness(
          communityDomainId
        );
        setNotificationScopeReadiness(
          notificationScopePayload?.notification_scope_readiness || null
        );
      } catch {
        setNotificationScopeReadiness(null);
      }
      try {
        const trustMobilityPayload = await getCommunityDomainTrustMobility(communityDomainId);
        setTrustMobility(trustMobilityPayload?.trust_mobility || null);
      } catch {
        setTrustMobility(null);
      }
      try {
        const affiliationReadinessPayload = await getCommunityDomainAffiliationReadiness(
          communityDomainId
        );
        setAffiliationReadiness(
          affiliationReadinessPayload?.affiliation_readiness || null
        );
      } catch {
        setAffiliationReadiness(null);
      }
      const viewerUserId = nextDashboard?.viewer?.user_id;
      if (viewerUserId) {
        try {
          const placementPayload = await getCommunityDomainMemberPlacementSummary(
            communityDomainId,
            viewerUserId
          );
          setPlacementSummary(placementPayload?.placement_summary || null);
        } catch {
          setPlacementSummary(null);
        }
      }
      if (nextDashboard?.viewer?.can_admin) {
        try {
          const [pendingPayload, approvedPayload] = await Promise.all([
            getCommunityDomainReviewerQueue(communityDomainId),
            listCommunityDomainActionReviews(communityDomainId, { status: "approved" }),
          ]);
          const pendingItems = Array.isArray(pendingPayload?.items)
            ? pendingPayload.items
            : [];
          const approvedItems = Array.isArray(approvedPayload?.items)
            ? approvedPayload.items
            : [];
          setReviewerQueue(mergeActionReviews(pendingItems, approvedItems));
        } catch {
          setReviewerQueue([]);
        }
      }
    } catch (err: any) {
      setDashboard(null);
      setPlacementSummary(null);
      setNodeTree([]);
      setModuleScopeReadiness(null);
      setSetupReadiness(null);
      setSetupPlan(null);
      setCapacityPlan(null);
      setGovernanceCoverage(null);
      setRolloutPlan(null);
      setEvidenceRecordReadiness(null);
      setEvidenceReleaseReadiness(null);
      setTrustRelayReadiness(null);
      setNotificationScopeReadiness(null);
      setTrustMobility(null);
      setAffiliationReadiness(null);
      setSubscriptionLifecycle(null);
      await loadOwnMembershipRequests();
      setMessage(
        err?.message ||
          "GSN could not open this Community Domain dashboard. Check that you are signed in as an active domain member."
      );
    } finally {
      setLoading(false);
    }
  }, [communityDomainId, loadOwnMembershipRequests]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.title = "GSN | Community Domain";
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const domain = dashboard?.community_domain || {};
  const template = useMemo(() => dashboard?.template || {}, [dashboard?.template]);
  const status = dashboard?.status || {};
  const counts = dashboard?.counts || {};
  const lanes = Array.isArray(dashboard?.lanes) ? dashboard?.lanes || [] : [];
  const isAdmin = Boolean(dashboard?.viewer?.can_admin);
  const latestMembershipRequest = ownMembershipRequests[0] || null;
  const latestMembershipRequestStatus = cleanText(latestMembershipRequest?.status).toLowerCase();
  const requestAccessLocked =
    busyMembershipRequest ||
    latestMembershipRequestStatus === "pending" ||
    latestMembershipRequestStatus === "pending_review" ||
    latestMembershipRequestStatus === "approved";
  const membershipAccessRequests = reviewerQueue.filter(
    (review) => cleanText(review.action_key) === "domain_member.upsert"
  );
  const placementCounts = placementSummary?.counts || {};
  const placementLanes = Array.isArray(placementSummary?.lanes)
    ? placementSummary.lanes
    : [];
  const visibleNodePlacements = Array.isArray(placementSummary?.node_placements)
    ? placementSummary.node_placements.slice(0, 3)
    : [];
  const visibleStructureRows = structurePreviewRows(nodeTree);
  const governanceReviewCounts = reviewStatusCounts(reviewerQueue);
  const governancePendingCount =
    (governanceReviewCounts.pending || 0) +
    (governanceReviewCounts.pending_review || 0);
  const governanceApprovedCount = governanceReviewCounts.approved || 0;
  const governanceAttentionCount = isAdmin
    ? governancePendingCount
    : Number(counts.open_reviews || 0);
  const selectedLane = lanes.find((lane) => lane.lane_key === activeLane) || lanes[0];
  const visibleSetupReadinessItems: SetupReadinessItem[] = Array.isArray(setupReadiness?.items)
    ? setupReadiness.items
    : [];
  const blockedSetupReadinessItems = visibleSetupReadinessItems.filter((item) => !item.ready);
  const visibleSetupPlanSteps: SetupPlanStep[] = Array.isArray(setupPlan?.steps)
    ? setupPlan.steps
    : [];
  const openSetupPlanSteps = visibleSetupPlanSteps.filter((step) => !step.completed);
  const visibleCapacityLanes: CapacityPlanLane[] = Array.isArray(capacityPlan?.lanes)
    ? capacityPlan.lanes
    : [];
  const attentionCapacityLanes = visibleCapacityLanes.filter((lane) => {
    const statusText = cleanText(lane.status).toLowerCase();
    return statusText.includes("near") || statusText.includes("over");
  });
  const governanceCoverageCounts = governanceCoverage?.counts || {};
  const visibleGovernanceCoverageNodes: GovernanceCoverageNode[] = Array.isArray(
    governanceCoverage?.flat_nodes
  )
    ? governanceCoverage.flat_nodes
    : [];
  const governanceCoverageGaps = visibleGovernanceCoverageNodes.filter((item) => {
    const statusText = cleanText(item.governance_status).toLowerCase();
    return statusText.includes("needs") || statusText.includes("inactive");
  });
  const rolloutPlanCounts = rolloutPlan?.counts || {};
  const visibleRolloutPhases: RolloutPlanPhase[] = Array.isArray(rolloutPlan?.phases)
    ? rolloutPlan.phases
    : [];
  const openRolloutPhases = visibleRolloutPhases.filter((phase) => !phase.completed);
  const visibleRolloutUnits: RolloutPlanUnit[] = Array.isArray(rolloutPlan?.rollout_units)
    ? rolloutPlan.rollout_units
    : [];
  const rolloutUnitsNeedingAttention = visibleRolloutUnits.filter(
    (unit) => !unit.ready_for_pilot
  );
  const subscriptionSummary = subscriptionLifecycle?.summary || {};
  const subscriptionPackage = subscriptionLifecycle?.package || {};
  const visibleSubscriptionLanes: SubscriptionLifecycleLane[] = Array.isArray(
    subscriptionLifecycle?.lanes
  )
    ? subscriptionLifecycle.lanes
    : [];
  const blockedSubscriptionLanes = visibleSubscriptionLanes.filter(
    (lane) => !lane.ready
  );
  const subscriptionReadyTotal =
    typeof subscriptionLifecycle?.ready_total === "number"
      ? subscriptionLifecycle.ready_total
      : visibleSubscriptionLanes.filter((lane) => lane.ready).length;
  const evidenceRecordSummary = evidenceRecordReadiness?.summary || {};
  const visibleEvidenceRecordTypes: EvidenceRecordReadinessType[] = Array.isArray(
    evidenceRecordReadiness?.record_types
  )
    ? evidenceRecordReadiness.record_types
    : [];
  const blockedEvidenceRecordTypes = visibleEvidenceRecordTypes.filter(
    (record) => !record.ready_for_future_evidence_record
  );
  const evidenceRecordReadyTotal =
    typeof evidenceRecordReadiness?.ready_total === "number"
      ? evidenceRecordReadiness.ready_total
      : visibleEvidenceRecordTypes.filter((record) => record.ready_for_future_evidence_record)
          .length;
  const evidenceReleaseSummary = evidenceReleaseReadiness?.summary || {};
  const visibleEvidenceReleaseLanes: EvidenceReleaseReadinessLane[] = Array.isArray(
    evidenceReleaseReadiness?.lanes
  )
    ? evidenceReleaseReadiness.lanes
    : [];
  const blockedEvidenceReleaseLanes = visibleEvidenceReleaseLanes.filter(
    (lane) => !lane.ready
  );
  const evidenceReleaseReadyTotal =
    typeof evidenceReleaseReadiness?.ready_total === "number"
      ? evidenceReleaseReadiness.ready_total
      : visibleEvidenceReleaseLanes.filter((lane) => lane.ready).length;
  const trustRelaySummary = trustRelayReadiness?.summary || {};
  const visibleTrustRelayLanes: TrustRelayReadinessLane[] = Array.isArray(
    trustRelayReadiness?.lanes
  )
    ? trustRelayReadiness.lanes
    : [];
  const blockedTrustRelayLanes = visibleTrustRelayLanes.filter((lane) => !lane.ready);
  const trustRelayReadyTotal =
    typeof trustRelayReadiness?.ready_total === "number"
      ? trustRelayReadiness.ready_total
      : visibleTrustRelayLanes.filter((lane) => lane.ready).length;
  const notificationScopeSummary = notificationScopeReadiness?.summary || {};
  const visibleNotificationScopeLanes: NotificationScopeReadinessLane[] = Array.isArray(
    notificationScopeReadiness?.lanes
  )
    ? notificationScopeReadiness.lanes
    : [];
  const blockedNotificationScopeLanes = visibleNotificationScopeLanes.filter(
    (lane) => !lane.ready
  );
  const notificationScopeReadyTotal =
    typeof notificationScopeReadiness?.ready_total === "number"
      ? notificationScopeReadiness.ready_total
      : visibleNotificationScopeLanes.filter((lane) => lane.ready).length;
  const trustMobilitySummary = trustMobility?.summary || {};
  const visibleTrustMobilityLanes: TrustMobilityLane[] = Array.isArray(trustMobility?.lanes)
    ? trustMobility.lanes
    : [];
  const blockedTrustMobilityLanes = visibleTrustMobilityLanes.filter(
    (lane) => !lane.ready
  );
  const trustMobilityReadyTotal =
    typeof trustMobility?.ready_total === "number"
      ? trustMobility.ready_total
      : visibleTrustMobilityLanes.filter((lane) => lane.ready).length;
  const affiliationSummary = affiliationReadiness?.summary || {};
  const visibleAffiliationLanes: AffiliationReadinessLane[] = Array.isArray(
    affiliationReadiness?.lanes
  )
    ? affiliationReadiness.lanes
    : [];
  const blockedAffiliationLanes = visibleAffiliationLanes.filter(
    (lane) => !lane.ready
  );
  const affiliationReadyTotal =
    typeof affiliationReadiness?.ready_total === "number"
      ? affiliationReadiness.ready_total
      : visibleAffiliationLanes.filter((lane) => lane.ready).length;
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

  const serviceReadinessRows = useMemo(() => {
    const readinessItems: ServiceReadinessItem[] = Array.isArray(moduleScopeReadiness?.modules)
      ? moduleScopeReadiness.modules
      : [];
    const byKey = new Map(
      readinessItems
        .map((item) => [cleanText(item.module_key), item] as const)
        .filter(([key]) => Boolean(key))
    );
    const listedKeys = new Set(moduleKeys.map((key) => cleanText(key)));
    const serviceRows: ServiceReadinessRow[] = SERVICE_READINESS_KEYS.map((serviceKey) => {
      const item = byKey.get(serviceKey);
      const fallbackEnabled = listedKeys.has(serviceKey);
      return {
        key: serviceKey,
        label: cleanText(item?.label, moduleLabel(serviceKey)),
        status: serviceReadinessStatus(item, fallbackEnabled),
        detail: cleanText(
          item?.next_step || item?.summary,
          serviceFallbackDetail(serviceKey, fallbackEnabled)
        ),
      };
    });

    serviceRows.push({
      key: "billing",
      label: "Billing",
      status: compactStatus(status.billing_status || quote?.pricing_status || quote?.quote_status),
      detail: billingIsActive
        ? "Billing is shown as active here, but payment instructions and renewals remain separate owner/admin work."
        : "Package, payment instruction, activation, and renewal are still separate from service readiness.",
    });
    serviceRows.push({
      key: "settings",
      label: "Settings",
      status: moduleScopeReadiness ? "read only" : "not loaded",
      detail: moduleScopeReadiness
        ? "Settings are shown as planning status here. This page does not enable services or grant permissions."
        : "Service settings could not be loaded for this view. No setting has been changed.",
    });

    return serviceRows;
  }, [billingIsActive, moduleKeys, moduleScopeReadiness, quote, status.billing_status]);

  async function loadAccessReviewItems(showLoading = false) {
    if (!communityDomainId) return;
    if (showLoading) setLoadingQueue(true);
    try {
      const [pendingPayload, approvedPayload] = await Promise.all([
        getCommunityDomainReviewerQueue(communityDomainId),
        listCommunityDomainActionReviews(communityDomainId, { status: "approved" }),
      ]);
      const pendingItems = Array.isArray(pendingPayload?.items)
        ? pendingPayload.items
        : [];
      const approvedItems = Array.isArray(approvedPayload?.items)
        ? approvedPayload.items
        : [];
      setReviewerQueue(mergeActionReviews(pendingItems, approvedItems));
    } catch (err: any) {
      setMessage(err?.message || "GSN could not load the Community Domain review queue.");
    } finally {
      if (showLoading) setLoadingQueue(false);
    }
  }

  async function refreshQuote() {
    if (!communityDomainId) return;
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
      const payload = await createCommunityDomainPackageQuote(communityDomainId);
      setQuote(payload?.quote || null);
      setActiveLane("billing");
      setMessage(
        billingIsActive
          ? "Package details refreshed. Billing is already shown as active here, but this refresh is still not payment confirmation, activation, or verification."
          : "Package quote refreshed. It is still not a payment instruction, payment confirmation, activation, or verification."
      );
    } catch (err: any) {
      setMessage(err?.message || "GSN could not refresh the package quote.");
    } finally {
      setBusyQuote(false);
    }
  }

  async function refreshReviewerQueue() {
    await loadAccessReviewItems(true);
  }

  async function approveAccessRequest(review: ActionReviewItem, applyAfterApproval: boolean) {
    if (!communityDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:${applyAfterApproval ? "apply" : "approve"}`);
    setMessage("");
    try {
      const decisionPayload = await decideCommunityDomainActionReview(
        communityDomainId,
        reviewId,
        {
          decision: "approve",
          decision_note: applyAfterApproval
            ? "Approved from the Community Domain access queue before applying membership."
            : "Approved from the Community Domain access queue. Membership still needs apply.",
        }
      );
      if (applyAfterApproval) {
        await applyCommunityDomainActionReview(communityDomainId, reviewId);
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
      setMessage(
        err?.message ||
          "GSN could not process this Community Domain access request."
      );
    } finally {
      setBusyReviewId(null);
    }
  }

  async function declineAccessRequest(review: ActionReviewItem) {
    if (!communityDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:decline`);
    setMessage("");
    try {
      await decideCommunityDomainActionReview(communityDomainId, reviewId, {
        decision: "reject",
        decision_note:
          "Declined from the Community Domain access queue. No membership change was applied.",
      });
      setMessage(
        `Access request ${reviewId} declined. No membership was added, and the request will no longer appear as pending.`
      );
      await refreshReviewerQueue();
    } catch (err: any) {
      setMessage(
        err?.message ||
          "GSN could not decline this Community Domain access request."
      );
    } finally {
      setBusyReviewId(null);
    }
  }

  async function applyApprovedAccessRequest(review: ActionReviewItem) {
    if (!communityDomainId || !review.id) return;
    const reviewId = String(review.id);
    setBusyReviewId(`${reviewId}:apply`);
    setMessage("");
    try {
      await applyCommunityDomainActionReview(communityDomainId, reviewId);
      setMessage(
        `Approved access request ${reviewId} applied. The member was added only after the approved review was applied.`
      );
      await loadDashboard();
    } catch (err: any) {
      setMessage(
        err?.message ||
          "GSN could not add this approved Community Domain member."
      );
    } finally {
      setBusyReviewId(null);
    }
  }

  async function requestDomainAccess() {
    if (!communityDomainId) return;
    if (!getAccessToken()) {
      setMessage("Sign in first so GSN can attach the Community Domain request to your account.");
      return;
    }

    setBusyMembershipRequest(true);
    try {
      const payload = await requestCommunityDomainMembership(communityDomainId, {
        request_note: "Requesting access from the Community Domain dashboard.",
      });
      const reviewId = payload?.action_review?.id;
      await loadOwnMembershipRequests();
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
        await loadOwnMembershipRequests();
        setMessage(
          "You already have a pending access request for this Community Domain. An owner/admin still needs to approve and apply it."
        );
      } else if (code === "community_domain_member_already_active") {
        setMessage(
          "You are already recorded as an active member. Try opening the dashboard again."
        );
      } else {
        setMessage(text);
      }
    } finally {
      setBusyMembershipRequest(false);
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
        <section style={whiteCard()}>
          <div style={sectionLabel()}>
            {communityDomainId ? "Cannot open dashboard" : "Cannot load domains"}
          </div>
          <h2 style={{ margin: "8px 0 6px", fontSize: 24, lineHeight: 1.1 }}>
            {communityDomainId
              ? "This Community Domain is not available here."
              : "Your Community Domains could not be loaded."}
          </h2>
          <div style={helperText()}>{message}</div>
          {latestMembershipRequest ? (
            <div
              style={{
                marginTop: 12,
                borderRadius: 16,
                border: "1px solid rgba(146,94,8,0.22)",
                background: "rgba(255,247,226,0.72)",
                padding: 12,
              }}
            >
              <div style={sectionLabel()}>Your access request</div>
              <div style={{ ...helperText(), marginTop: 6 }}>
                {membershipRequestStatusText(latestMembershipRequest)}
              </div>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
            <StableButton
              type="button"
              kind="primary"
              debugId={
                communityDomainId
                  ? "community-domain-dashboard.error.retry-dashboard"
                  : "community-domain-dashboard.error.retry-selector"
              }
              onClick={loadDashboard}
            >
              Try again
            </StableButton>
            <StableCtaLink
              to={APP_ROUTES.COMMUNITY}
              kind="secondary"
              debugId="community-domain-dashboard.error.community-home"
            >
              Community Home
            </StableCtaLink>
            <StableCtaLink
              to="/community-domain/purchase"
              kind="soft"
              debugId="community-domain-dashboard.error.purchase"
            >
              Purchase path
            </StableCtaLink>
            {communityDomainId ? (
              <StableButton
                type="button"
                kind="secondary"
                debugId="community-domain-dashboard.error.request-membership"
                disabled={requestAccessLocked}
                onClick={
                  latestMembershipRequestStatus === "applied"
                    ? loadDashboard
                    : requestDomainAccess
                }
              >
                {membershipRequestButtonLabel(
                  latestMembershipRequest,
                  busyMembershipRequest
                )}
              </StableButton>
            ) : null}
          </div>
        </section>
      ) : null}

      {!loading && !communityDomainId && !message ? (
        <section style={whiteCard()}>
          {domainItems.length > 0 ? (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={sectionLabel()}>Your Community Domains</div>
              <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                Choose a domain to operate.
              </h2>
              <div style={helperText()}>
                These are active Community Domain memberships attached to your signed-in
                account. Opening one keeps payment, activation, and verification
                boundaries separate.
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 240px), 1fr))",
                  gap: 12,
                }}
              >
                {domainItems.map((item) => {
                  const itemDomain = item?.community_domain || {};
                  const itemMembership = item?.membership || {};
                  const path =
                    cleanText(item?.dashboard_path) ||
                    `/app/community-domain/${encodeURIComponent(String(itemDomain.id))}`;
                  return (
                    <div key={cleanText(itemDomain.id, path)} style={softCard()}>
                      <div style={{ display: "grid", gap: 8 }}>
                        <div style={sectionLabel()}>
                          {item?.viewer?.can_admin ? "Owner/admin" : "Member"}
                        </div>
                        <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.14 }}>
                          {cleanText(itemDomain.display_name, "Community Domain")}
                        </h3>
                        <div style={helperText()}>
                          Code: <strong>{cleanText(itemDomain.domain_name, "not recorded")}</strong>
                          <br />
                          Role:{" "}
                          <strong style={{ textTransform: "capitalize" }}>
                            {compactStatus(itemMembership.role)}
                          </strong>
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          <span style={statusBadge(itemDomain.status)}>
                            Domain: {compactStatus(itemDomain.status)}
                          </span>
                          <span style={statusBadge(itemDomain.verification_status)}>
                            Verification: {compactStatus(itemDomain.verification_status)}
                          </span>
                        </div>
                        <StableCtaLink
                          to={path}
                          kind="primary"
                          fullWidth
                          debugId={`community-domain-dashboard.selector.open-${cleanText(
                            itemDomain.id,
                            "domain"
                          )}`}
                        >
                          Open dashboard
                        </StableCtaLink>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={sectionLabel()}>No Community Domains yet</div>
              <h2 style={{ margin: 0, fontSize: 26, lineHeight: 1.1 }}>
                Start from the purchase path.
              </h2>
              <div style={helperText()}>
                This account does not have an active Community Domain membership to
                open here. You can check a domain name or return to Community Home.
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <StableCtaLink
                  to="/community-domain/purchase"
                  kind="primary"
                  debugId="community-domain-dashboard.empty.purchase"
                >
                  Check domain name
                </StableCtaLink>
                <StableCtaLink
                  to={APP_ROUTES.COMMUNITY}
                  kind="secondary"
                  debugId="community-domain-dashboard.empty.community-home"
                >
                  Community Home
                </StableCtaLink>
              </div>
            </div>
          )}
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

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Setup readiness</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  {setupReadiness
                    ? `${countValue(setupReadiness.ready_total)} of ${countValue(
                        setupReadiness.total
                      )} checks ready`
                    : "Readiness is not loaded"}
                </h2>
                <div style={helperText()}>
                  {setupReadiness
                    ? `${countValue(
                        setupReadiness.blocked_total
                      )} setup checks still need attention before this domain should be treated as fully ready.`
                    : "GSN could not load the read-only setup checklist for this view."}
                </div>
                {blockedSetupReadinessItems.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {blockedSetupReadinessItems.slice(0, 3).map((item) => (
                      <div
                        key={cleanText(item.lane_key, cleanText(item.label, "setup-check"))}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "minmax(0, 1fr) auto",
                          gap: 10,
                          alignItems: "center",
                          borderRadius: 14,
                          border: "1px solid rgba(146,94,8,0.16)",
                          background: "rgba(255,247,226,0.62)",
                          padding: "10px 10px 10px 12px",
                        }}
                      >
                        <span style={{ minWidth: 0 }}>
                          <span style={{ display: "block", fontWeight: 950 }}>
                            {cleanText(item.label, "Setup check")}
                          </span>
                          <span
                            style={{
                              display: "block",
                              color: "#4F647A",
                              fontSize: 12.5,
                              lineHeight: 1.45,
                              marginTop: 3,
                            }}
                          >
                            {cleanText(item.next_step, "Review this setup area before launch.")}
                          </span>
                        </span>
                        <span style={statusBadge(item.state)}>{compactStatus(item.state)}</span>
                      </div>
                    ))}
                  </div>
                ) : setupReadiness ? (
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    No setup blocker is visible in the read-only readiness checklist.
                  </div>
                ) : null}
                <div style={{ ...helperText(), fontSize: 13 }}>
                  This checklist does not create nodes, add members, assign roles,
                  decide reviews, create payment instructions, activate billing,
                  activate the domain, verify authority, or expose private evidence.
                </div>
              </div>
            </div>

            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Setup plan</div>
                <h2 style={{ margin: 0, fontSize: 23, lineHeight: 1.12 }}>
                  {setupPlan
                    ? `${countValue(setupPlan.completed_steps)} of ${countValue(
                        visibleSetupPlanSteps.length
                      )} steps complete`
                    : "Setup plan is not loaded"}
                </h2>
                <div style={helperText()}>
                  {setupPlan
                    ? `Current phase: ${compactStatus(setupPlan.setup_phase)}. ${cleanText(
                        setupPlan.primary_next_action?.label,
                        "Review the next setup step with a Community Domain admin."
                      )}.`
                    : "GSN could not load the read-only setup plan for this view."}
                </div>
                {openSetupPlanSteps.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {openSetupPlanSteps.slice(0, 3).map((step) => {
                      const missingCount = Array.isArray(step.missing_items)
                        ? step.missing_items.length
                        : 0;
                      return (
                        <div
                          key={cleanText(step.step_key, cleanText(step.label, "setup-step"))}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "minmax(0, 1fr) auto",
                            gap: 10,
                            alignItems: "center",
                            borderRadius: 14,
                            border: "1px solid rgba(9,27,46,0.10)",
                            background: "rgba(255,255,255,0.72)",
                            padding: "10px 10px 10px 12px",
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontWeight: 950 }}>
                              {cleanText(step.label, compactStatus(step.step_key || "Setup step"))}
                            </span>
                            <span
                              style={{
                                display: "block",
                                color: "#4F647A",
                                fontSize: 12.5,
                                lineHeight: 1.45,
                                marginTop: 3,
                              }}
                            >
                              {missingCount
                                ? `${countValue(missingCount)} missing item${
                                    missingCount === 1 ? "" : "s"
                                  } before this step is complete.`
                                : "This step still needs owner/admin review before completion is relied on."}
                            </span>
                          </span>
                          <span style={statusBadge(step.requires_admin ? "admin guided" : "read only")}>
                            {step.requires_admin ? "Admin" : "Read only"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : setupPlan ? (
                  <div style={{ ...helperText(), fontSize: 13 }}>
                    No open setup step is visible in the read-only setup plan.
                  </div>
                ) : null}
                <div style={{ ...helperText(), fontSize: 13 }}>
                  This setup plan does not create nodes, add members, assign
                  roles, create policy, decide reviews, activate billing, verify
                  authority, publish a public page, move money, or expose private
                  evidence.
                </div>
              </div>
            </div>
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
            <div style={whiteCard()}>
              <div style={{ display: "grid", gap: 10 }}>
                <div style={sectionLabel()}>Work lanes</div>
                {lanes.map((lane) => {
                  const selected = lane.lane_key === activeLane;
                  return (
                    <StableButton
                      key={cleanText(lane.lane_key, lane.label)}
                      type="button"
                      kind="secondary"
                      onClick={() => setActiveLane(cleanText(lane.lane_key))}
                      debugId={`community-domain-dashboard.lane.${cleanText(lane.lane_key)}`}
                      fullWidth
                      stableHeight={58}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        justifyContent: "stretch",
                        gap: 10,
                        alignItems: "center",
                        borderRadius: 16,
                        border: selected
                          ? "1px solid rgba(12,79,168,0.34)"
                          : "1px solid rgba(9,27,46,0.10)",
                        background: selected
                          ? "linear-gradient(180deg, rgba(12,79,168,0.11) 0%, rgba(12,79,168,0.05) 100%)"
                          : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,247,252,0.98) 100%)",
                        color: "#091B2E",
                        padding: "10px 12px",
                        textAlign: "left",
                        cursor: "pointer",
                        boxSizing: "border-box",
                      }}
                    >
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: "block", fontWeight: 950, fontSize: 14 }}>
                          {laneDisplayLabel(lane, "Lane")}
                        </span>
                        <span
                          style={{
                            display: "block",
                            color: "#4F647A",
                            fontSize: 12.5,
                            marginTop: 3,
                            textTransform: "capitalize",
                          }}
                        >
                          {compactStatus(lane.status)}
                        </span>
                      </span>
                      <span style={statusBadge(lane.status)}>{countValue(lane.count)}</span>
                    </StableButton>
                  );
                })}
              </div>
            </div>

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

                {activeLane === "identity" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Domain identity</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      This lane shows the public-safe identity anchor for this
                      Community Domain. It helps members confirm they are working
                      inside the right institution before structure, billing,
                      services, or trust evidence are used.
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(128px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["Code", cleanText(domain.domain_name, "not recorded")],
                        ["Owner", cleanText(domain.owner_user_id, "not recorded")],
                        ["Template", cleanText(template.label, "Institution")],
                        [
                          "Location",
                          cleanText(
                            [domain.state, domain.country].filter(Boolean).join(", "),
                            "not recorded"
                          ),
                        ],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={statusBadge(value)}>
                          {String(label)}: {String(value)}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
                      <span style={statusBadge(status.domain_status)}>
                        Domain: {compactStatus(status.domain_status)}
                      </span>
                      <span style={statusBadge(status.verification_status)}>
                        Verification: {compactStatus(status.verification_status)}
                      </span>
                      <span style={statusBadge(renewalState)}>
                        Renewal: {compactStatus(renewalState)}
                      </span>
                    </div>
                    {domain.public_profile ? (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        Public profile: {cleanText(domain.public_profile)}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        No public profile text is recorded yet for this domain.
                      </div>
                    )}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This identity view does not expose owner contact details,
                      private member lists, finance records, evidence files, or
                      verification proof.
                    </div>
                  </div>
                ) : null}

                {activeLane === "identity" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Affiliation readiness</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {affiliationReadiness
                        ? `${cleanText(
                            affiliationReadiness.primary_next_action?.label,
                            "Review affiliation readiness"
                          )}. ${affiliationReadyTotal} of ${visibleAffiliationLanes.length} affiliation checks are ready.`
                        : "GSN could not load the read-only affiliation readiness view for this Community Domain."}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["Bridge", compactStatus(affiliationSummary.bridge_status)],
                        [
                          "Affiliation engine",
                          compactStatus(
                            affiliationSummary.domain_affiliation_engine_status
                          ),
                        ],
                        [
                          "Approved",
                          affiliationSummary.approved_affiliations == null
                            ? "admin only"
                            : countValue(affiliationSummary.approved_affiliations),
                        ],
                        [
                          "Pending",
                          affiliationSummary.pending_affiliations == null
                            ? "admin only"
                            : countValue(affiliationSummary.pending_affiliations),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          style={{
                            borderRadius: 14,
                            background: "#F7FAFF",
                            border: "1px solid rgba(9,27,46,0.08)",
                            padding: 10,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                            {label}
                          </div>
                          <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {blockedAffiliationLanes.length ? (
                      <div style={{ ...helperText(), marginTop: 9 }}>
                        Affiliation checks needing attention:{" "}
                        <strong>
                          {blockedAffiliationLanes
                            .slice(0, 3)
                            .map((lane) =>
                              cleanText(lane.label, lane.lane_key || "affiliation check")
                            )
                            .join(", ")}
                        </strong>
                        .
                      </div>
                    ) : affiliationReadiness ? (
                      <div style={{ ...helperText(), marginTop: 9 }}>
                        No blocked affiliation lane is visible, but domain-to-domain affiliation
                        is still not connected here.
                      </div>
                    ) : null}
                    {visibleAffiliationLanes.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {visibleAffiliationLanes.slice(0, 4).map((lane) => (
                          <div
                            key={cleanText(
                              lane.lane_key,
                              cleanText(lane.label, "affiliation")
                            )}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(lane.label, "Affiliation check")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  marginTop: 3,
                                }}
                              >
                                {cleanText(
                                  lane.next_step,
                                  "Keep this as affiliation planning until a real domain relationship path exists."
                                )}
                              </span>
                            </span>
                            <span style={statusBadge(lane.status)}>
                              {compactStatus(lane.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This affiliation view is read-only parent and child affiliation planning.
                      It does not create domain-domain affiliations, create parent Community
                      Domains, create child Community Domains, approve or reject affiliation
                      requests, set social Community links, copy or transfer members, inherit
                      policy, activate billing, verify authority, publish public URLs, create
                      marketplace activity, move money, issue TrustSlips, write Trust Passport
                      entries, or expose private member, node, evidence, review, marketplace,
                      finance, or affiliate records.
                    </div>
                  </div>
                ) : null}

                {activeLane === "billing" ? (
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

                {activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Subscription lifecycle</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {subscriptionLifecycle
                        ? `${cleanText(
                            subscriptionLifecycle.primary_next_action?.label,
                            "Review subscription setup"
                          )}. ${subscriptionReadyTotal} of ${visibleSubscriptionLanes.length} billing checks are ready.`
                        : "GSN could not load the read-only subscription lifecycle view for this Community Domain."}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        [
                          "Package",
                          cleanText(subscriptionPackage.package_name, "not selected"),
                        ],
                        [
                          "Pricing",
                          compactStatus(subscriptionPackage.pricing_status),
                        ],
                        [
                          "Billing",
                          compactStatus(subscriptionSummary.billing_status),
                        ],
                        [
                          "Renewal",
                          compactStatus(subscriptionSummary.renewal_status),
                        ],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          style={{
                            borderRadius: 14,
                            background: "#F7FAFF",
                            border: "1px solid rgba(9,27,46,0.08)",
                            padding: 10,
                            minWidth: 0,
                          }}
                        >
                          <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                            {label}
                          </div>
                          <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                    {blockedSubscriptionLanes.length ? (
                      <div style={{ ...helperText(), marginTop: 9 }}>
                        Billing checks needing attention:{" "}
                        <strong>
                          {blockedSubscriptionLanes
                            .slice(0, 3)
                            .map((lane) =>
                              cleanText(lane.label, lane.lane_key || "billing check")
                            )
                            .join(", ")}
                        </strong>
                        .
                      </div>
                    ) : subscriptionLifecycle ? (
                      <div style={{ ...helperText(), marginTop: 9 }}>
                        No blocked billing lane is visible, but payment and renewal automation are
                        still not connected here.
                      </div>
                    ) : null}
                    {visibleSubscriptionLanes.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {visibleSubscriptionLanes.slice(0, 4).map((lane) => (
                          <div
                            key={cleanText(
                              lane.lane_key,
                              cleanText(lane.label, "subscription")
                            )}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(lane.label, "Subscription check")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  marginTop: 3,
                                }}
                              >
                                {cleanText(
                                  lane.next_step,
                                  cleanText(
                                    lane.summary,
                                    "Keep billing as planning until a real payment path exists."
                                  )
                                )}
                              </span>
                            </span>
                            <span style={statusBadge(lane.status)}>
                              {compactStatus(lane.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This subscription lifecycle view is read-only billing planning. It does not
                      create quote acceptance, create payment instruction, create expected payment,
                      record payment, confirm payment, create invoices, create receipts, activate
                      billing, activate the Community Domain, create entitlements, renew a domain,
                      suspend a domain, reactivate a domain, verify authority, move money, or
                      expose private finance, member, evidence, or review records.
                    </div>
                  </div>
                ) : null}

                {activeLane === "billing" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Capacity plan</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {capacityPlan
                        ? `${cleanText(
                            capacityPlan.package_name,
                            "Community Domain package"
                          )} uses ${cleanText(
                            capacityPlan.limits_source,
                            "recorded package allowance"
                          )}. ${cleanText(
                            capacityPlan.primary_next_action?.label,
                            "Review setup before relying on capacity."
                          )}.`
                        : "GSN could not load the read-only capacity plan for this view."}
                    </div>
                    {attentionCapacityLanes.length ? (
                      <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                        Capacity attention:{" "}
                        <strong>
                          {attentionCapacityLanes
                            .map((lane) => cleanText(lane.label, lane.lane_key || "capacity"))
                            .join(", ")}
                        </strong>
                        .
                      </div>
                    ) : capacityPlan ? (
                      <div style={{ ...helperText(), marginTop: 7, fontSize: 13 }}>
                        No near-limit or over-limit package lane is visible.
                      </div>
                    ) : null}
                    {visibleCapacityLanes.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {visibleCapacityLanes.slice(0, 5).map((lane) => {
                          const used = lane.metered ? countValue(lane.used) : "not metered";
                          const limit = lane.limit == null ? "not set" : countValue(lane.limit);
                          const remaining =
                            lane.remaining == null ? "not metered" : countValue(lane.remaining);
                          return (
                            <div
                              key={cleanText(lane.lane_key, cleanText(lane.label, "capacity"))}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(lane.label, "Capacity lane")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  Used: {used}. Limit: {limit}. Remaining: {remaining}.
                                </span>
                              </span>
                              <span style={statusBadge(lane.status)}>
                                {compactStatus(lane.status)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This capacity view does not increase limits, create nodes,
                      add members, assign roles, create shops, meter live shop
                      usage, meter storage usage, change pricing, activate
                      billing, verify authority, move money, publish a public
                      page, or expose private evidence.
                    </div>
                  </div>
                ) : null}

                {activeLane === "modules" ? (
                  <>
                    <div style={softCard()}>
                      <div style={sectionLabel()}>Service readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        Shops, Spotlight, Vault, Verification, Trust Centre, Analytics, Billing,
                        and Settings are shown as scoped planning rows for this Community Domain.
                      </div>
                      {moduleScopeReadiness?.primary_next_action?.label ? (
                        <div style={{ ...helperText(), marginTop: 7 }}>
                          Next owner/admin step:{" "}
                          <strong>{moduleScopeReadiness.primary_next_action.label}</strong>.
                        </div>
                      ) : null}
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {serviceReadinessRows.map((row) => (
                          <div
                            key={row.key}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {row.label}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  marginTop: 3,
                                }}
                              >
                                {row.detail}
                              </span>
                            </span>
                            <span style={statusBadge(row.status)}>{row.status}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This readiness view does not enable services, activate billing, grant
                        permissions, publish Spotlight, create shops, open vault links, write Trust
                        Passport records, or expose private member activity.
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Evidence record readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        {evidenceRecordReadiness
                          ? `${cleanText(
                              evidenceRecordReadiness.primary_next_action?.label,
                              "Review evidence record readiness"
                            )}. ${evidenceRecordReadyTotal} of ${visibleEvidenceRecordTypes.length} record types are ready for future evidence records.`
                          : "GSN could not load the read-only evidence record readiness view for this Community Domain."}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {[
                          [
                            "Record engine",
                            compactStatus(evidenceRecordSummary.evidence_record_engine_status),
                          ],
                          ["Record types", countValue(evidenceRecordSummary.record_type_count)],
                          [
                            "Records created",
                            countValue(evidenceRecordSummary.evidence_records_created),
                          ],
                          [
                            "Evidence notes",
                            evidenceRecordSummary.review_evidence_metadata_count == null
                              ? "admin only"
                              : countValue(evidenceRecordSummary.review_evidence_metadata_count),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: 14,
                              background: "#F7FAFF",
                              border: "1px solid rgba(9,27,46,0.08)",
                              padding: 10,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                              {label}
                            </div>
                            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blockedEvidenceRecordTypes.length ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Evidence record types needing attention:{" "}
                          <strong>
                            {blockedEvidenceRecordTypes
                              .slice(0, 3)
                              .map((record) =>
                                cleanText(record.label, record.record_type || "record type")
                              )
                              .join(", ")}
                          </strong>
                          .
                        </div>
                      ) : evidenceRecordReadiness ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          No blocked evidence record type is visible, but durable evidence records
                          are still not being created here.
                        </div>
                      ) : null}
                      {visibleEvidenceRecordTypes.length ? (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {visibleEvidenceRecordTypes.slice(0, 4).map((record) => (
                            <div
                              key={cleanText(
                                record.record_type,
                                cleanText(record.label, "evidence record")
                              )}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(record.label, "Evidence record type")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  {cleanText(
                                    record.next_step,
                                    "Keep this as planning readiness until durable evidence records exist."
                                  )}
                                </span>
                              </span>
                              <span style={statusBadge(record.readiness_status)}>
                                {compactStatus(record.readiness_status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This evidence record view is read-only planning. It does not create
                        CommunityDomainEvidenceRecord rows, upload files, expose storage keys,
                        calculate validity windows, persist visibility policy, issue credentials,
                        issue TrustSlips, write Trust Passport entries, publish public proof,
                        verify legal authority, move money, activate billing, create marketplace
                        activity, create a social Community, expose private member evidence, or
                        score trust.
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Evidence release readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        {evidenceReleaseReadiness
                          ? `${cleanText(
                              evidenceReleaseReadiness.primary_next_action?.label,
                              "Review evidence release readiness"
                            )}. ${evidenceReleaseReadyTotal} of ${visibleEvidenceReleaseLanes.length} release checks are ready.`
                          : "GSN could not load the read-only evidence release readiness view for this Community Domain."}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {[
                          [
                            "Release engine",
                            compactStatus(evidenceReleaseSummary.evidence_release_engine_status),
                          ],
                          [
                            "Releases made",
                            countValue(evidenceReleaseSummary.evidence_releases_created),
                          ],
                          [
                            "Public proofs",
                            countValue(evidenceReleaseSummary.public_proofs_published),
                          ],
                          [
                            "Release evidence",
                            evidenceReleaseSummary.release_evidence_count == null
                              ? "admin only"
                              : countValue(evidenceReleaseSummary.release_evidence_count),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: 14,
                              background: "#F7FAFF",
                              border: "1px solid rgba(9,27,46,0.08)",
                              padding: 10,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                              {label}
                            </div>
                            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blockedEvidenceReleaseLanes.length ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Evidence release checks needing attention:{" "}
                          <strong>
                            {blockedEvidenceReleaseLanes
                              .slice(0, 3)
                              .map((lane) => cleanText(lane.label, lane.lane_key || "release check"))
                              .join(", ")}
                          </strong>
                          .
                        </div>
                      ) : evidenceReleaseReadiness ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          No blocked evidence release lane is visible, but public proof is still
                          not being released here.
                        </div>
                      ) : null}
                      {visibleEvidenceReleaseLanes.length ? (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {visibleEvidenceReleaseLanes.slice(0, 4).map((lane) => (
                            <div
                              key={cleanText(
                                lane.lane_key,
                                cleanText(lane.label, "evidence release")
                              )}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(lane.label, "Evidence release check")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  {cleanText(
                                    lane.next_step,
                                    "Keep this as public-safe planning until a real release path exists."
                                  )}
                                </span>
                              </span>
                              <span style={statusBadge(lane.status)}>
                                {compactStatus(lane.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This evidence release view is read-only public-safe proof planning. It
                        does not release evidence, expose files, expose storage keys, publish
                        public proof, create public URLs, create QR codes, issue credentials,
                        issue TrustSlips, write Trust Passport entries, share records across
                        domains, create trust relay paths, verify legal authority, move money,
                        activate billing, create marketplace activity, create a social Community,
                        change permissions, expose private member evidence, or score trust.
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Trust relay readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        {trustRelayReadiness
                          ? `${cleanText(
                              trustRelayReadiness.primary_next_action?.label,
                              "Review trust relay readiness"
                            )}. ${trustRelayReadyTotal} of ${visibleTrustRelayLanes.length} relay checks are ready.`
                          : "GSN could not load the read-only trust relay readiness view for this Community Domain."}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {[
                          ["Relay engine", compactStatus(trustRelaySummary.trust_relay_engine_status)],
                          ["Relay paths", countValue(trustRelaySummary.relay_paths_created)],
                          ["Bridge members", countValue(trustRelaySummary.bridge_member_candidates)],
                          ["Open reviews", countValue(trustRelaySummary.open_relay_review_count)],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: 14,
                              background: "#F7FAFF",
                              border: "1px solid rgba(9,27,46,0.08)",
                              padding: 10,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                              {label}
                            </div>
                            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blockedTrustRelayLanes.length ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Relay checks needing attention:{" "}
                          <strong>
                            {blockedTrustRelayLanes
                              .slice(0, 3)
                              .map((lane) => cleanText(lane.label, lane.lane_key || "relay check"))
                              .join(", ")}
                          </strong>
                          .
                        </div>
                      ) : trustRelayReadiness ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          No blocked relay readiness lane is visible, but relay publishing is still
                          not connected here.
                        </div>
                      ) : null}
                      {visibleTrustRelayLanes.length ? (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {visibleTrustRelayLanes.slice(0, 4).map((lane) => (
                            <div
                              key={cleanText(lane.lane_key, cleanText(lane.label, "trust relay"))}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(lane.label, "Trust relay check")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  {cleanText(
                                    lane.next_step,
                                    "Keep this relay check as planning context until a real relay path exists."
                                  )}
                                </span>
                              </span>
                              <span style={statusBadge(lane.status)}>
                                {compactStatus(lane.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This trust relay view is read-only planning. It does not create relay paths,
                        record source-domain, bridge-member, or destination-domain rows, publish
                        proof, repost Spotlight, create cross-domain discovery, share private
                        records, expose evidence files, expose storage keys, issue TrustSlips,
                        write Trust Passport entries, create credentials, create marketplace
                        activity, create affiliations, activate billing, or move money.
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Notification scope readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        {notificationScopeReadiness
                          ? `${cleanText(
                              notificationScopeReadiness.primary_next_action?.label,
                              "Review notification scope readiness"
                            )}. ${notificationScopeReadyTotal} of ${visibleNotificationScopeLanes.length} audience checks are ready.`
                          : "GSN could not load the read-only notification scope readiness view for this Community Domain."}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {[
                          [
                            "Scope engine",
                            compactStatus(notificationScopeSummary.notification_scope_engine_status),
                          ],
                          [
                            "Members",
                            countValue(notificationScopeSummary.active_member_count),
                          ],
                          [
                            "Scope policies",
                            notificationScopeSummary.notification_policy_count == null
                              ? "admin only"
                              : countValue(notificationScopeSummary.notification_policy_count),
                          ],
                          [
                            "Notifications sent",
                            countValue(notificationScopeSummary.notifications_sent),
                          ],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: 14,
                              background: "#F7FAFF",
                              border: "1px solid rgba(9,27,46,0.08)",
                              padding: 10,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                              {label}
                            </div>
                            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blockedNotificationScopeLanes.length ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Notification scope checks needing attention:{" "}
                          <strong>
                            {blockedNotificationScopeLanes
                              .slice(0, 3)
                              .map((lane) =>
                                cleanText(lane.label, lane.lane_key || "notification check")
                              )
                              .join(", ")}
                          </strong>
                          .
                        </div>
                      ) : notificationScopeReadiness ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          No blocked notification scope lane is visible, but notification delivery
                          is still not connected here.
                        </div>
                      ) : null}
                      {visibleNotificationScopeLanes.length ? (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {visibleNotificationScopeLanes.slice(0, 4).map((lane) => (
                            <div
                              key={cleanText(
                                lane.lane_key,
                                cleanText(lane.label, "notification scope")
                              )}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(lane.label, "Notification scope check")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  {cleanText(
                                    lane.next_step,
                                    "Keep this as audience planning until a real notification path exists."
                                  )}
                                </span>
                              </span>
                              <span style={statusBadge(lane.status)}>
                                {compactStatus(lane.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This notification scope view is read-only audience planning. It does not
                        send notifications, create notification jobs, send emails, send SMS, send
                        WhatsApp messages, send push notifications, create audience lists, publish
                        public announcements, create cross-domain broadcasts, expose member lists,
                        create marketplace records, move money, issue TrustSlips, write Trust
                        Passport entries, or expose private member, review, evidence, marketplace,
                        or finance records.
                      </div>
                    </div>

                    <div style={softCard()}>
                      <div style={sectionLabel()}>Trust mobility readiness</div>
                      <div style={{ ...helperText(), marginTop: 7 }}>
                        {trustMobility
                          ? `${cleanText(
                              trustMobility.primary_next_action?.label,
                              "Review trust mobility readiness"
                            )}. ${trustMobilityReadyTotal} of ${visibleTrustMobilityLanes.length} portability checks are ready.`
                          : "GSN could not load the read-only trust mobility view for this Community Domain."}
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {[
                          [
                            "Authority",
                            compactStatus(trustMobilitySummary.verification_status),
                          ],
                          ["Members", countValue(trustMobilitySummary.active_members)],
                          ["Evidence", countValue(trustMobilitySummary.review_evidence_records)],
                          ["Relay paths", countValue(trustMobilitySummary.relay_paths)],
                        ].map(([label, value]) => (
                          <div
                            key={String(label)}
                            style={{
                              borderRadius: 14,
                              background: "#F7FAFF",
                              border: "1px solid rgba(9,27,46,0.08)",
                              padding: 10,
                              minWidth: 0,
                            }}
                          >
                            <div style={{ color: "#617085", fontSize: 12, fontWeight: 850 }}>
                              {label}
                            </div>
                            <div style={{ color: "#07172C", fontWeight: 950, marginTop: 4 }}>
                              {value}
                            </div>
                          </div>
                        ))}
                      </div>
                      {blockedTrustMobilityLanes.length ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          Trust mobility checks needing attention:{" "}
                          <strong>
                            {blockedTrustMobilityLanes
                              .slice(0, 3)
                              .map((lane) => cleanText(lane.label, lane.lane_key || "mobility check"))
                              .join(", ")}
                          </strong>
                          .
                        </div>
                      ) : trustMobility ? (
                        <div style={{ ...helperText(), marginTop: 9 }}>
                          No blocked trust mobility lane is visible, but portability bridges are
                          still not connected here.
                        </div>
                      ) : null}
                      {visibleTrustMobilityLanes.length ? (
                        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                          {visibleTrustMobilityLanes.slice(0, 4).map((lane) => (
                            <div
                              key={cleanText(
                                lane.lane_key,
                                cleanText(lane.label, "trust mobility")
                              )}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "minmax(0, 1fr) auto",
                                gap: 10,
                                alignItems: "center",
                                borderRadius: 14,
                                border: "1px solid rgba(9,27,46,0.10)",
                                background: "rgba(255,255,255,0.72)",
                                padding: "10px 10px 10px 12px",
                              }}
                            >
                              <span style={{ minWidth: 0 }}>
                                <span style={{ display: "block", fontWeight: 950 }}>
                                  {cleanText(lane.label, "Trust mobility check")}
                                </span>
                                <span
                                  style={{
                                    display: "block",
                                    color: "#4F647A",
                                    fontSize: 12.5,
                                    lineHeight: 1.45,
                                    marginTop: 3,
                                  }}
                                >
                                  {cleanText(
                                    lane.next_step,
                                    cleanText(
                                      lane.summary,
                                      "Keep portability as planning until a real bridge exists."
                                    )
                                  )}
                                </span>
                              </span>
                              <span style={statusBadge(lane.status)}>
                                {compactStatus(lane.status)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        This trust mobility view is read-only portability planning. It does not
                        create TrustSlips, write Trust Passport entries, create credentials, create
                        trust relay paths, release evidence, expose files, expose storage keys,
                        verify legal or institutional authority, publish proof, create outward
                        links, move money, activate billing, activate the Community Domain, create
                        marketplace activity, create a social Community, or expose private member,
                        finance, evidence, or review records.
                      </div>
                    </div>
                  </>
                ) : null}

                {activeLane === "structure" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Structure preview</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Root institution and first operating units, shown from the
                      read-only Community Domain tree.
                    </div>
                    {visibleStructureRows.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {visibleStructureRows.map(({ node, level }) => (
                          <div
                            key={`${cleanText(node.id)}:${cleanText(node.name)}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                              marginLeft: level ? 12 : 0,
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(node.name, level ? "Operating unit" : "Root institution")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  marginTop: 3,
                                  textTransform: "capitalize",
                                }}
                              >
                                {level ? "Operating unit" : "Root"} -{" "}
                                {compactStatus(node.node_type || node.node_kind)}
                              </span>
                            </span>
                            <span style={statusBadge(node.status)}>
                              {compactStatus(node.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        No operating-unit structure has been mapped yet. Owners and
                        domain admins still need to add branches, departments,
                        lines, classes, or committees through scoped structure tools.
                      </div>
                    )}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This preview does not create nodes, change parentage, place
                      members, grant roles, activate billing, or verify a branch.
                    </div>
                  </div>
                ) : null}

                {activeLane === "structure" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Rollout plan</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {rolloutPlan
                        ? `${cleanText(
                            rolloutPlan.primary_next_action?.label,
                            "Review Community Domain rollout plan"
                          )}. Current phase: ${compactStatus(rolloutPlan.rollout_phase)}.`
                        : "GSN could not load the read-only rollout plan for this view."}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["First units", rolloutPlanCounts.first_level_units],
                        ["Ready units", rolloutPlanCounts.ready_units],
                        ["Members", rolloutPlanCounts.active_members],
                        ["Policies", rolloutPlanCounts.active_policies],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}
                        >
                          {String(label)}: {countValue(value)}
                        </div>
                      ))}
                    </div>
                    {openRolloutPhases.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {openRolloutPhases.slice(0, 3).map((phase) => (
                          <div
                            key={cleanText(phase.phase_key, cleanText(phase.label, "phase"))}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(phase.label, "Rollout phase")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  marginTop: 3,
                                }}
                              >
                                {cleanText(
                                  phase.next_step,
                                  "Review this rollout phase before wider launch."
                                )}
                              </span>
                            </span>
                            <span style={statusBadge(phase.status || "open")}>
                              {compactStatus(phase.status || "open")}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : rolloutPlan ? (
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        No open rollout phase is visible in the read-only rollout plan.
                      </div>
                    ) : null}
                    {rolloutUnitsNeedingAttention.length ? (
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        Units needing attention:{" "}
                        <strong>
                          {rolloutUnitsNeedingAttention
                            .slice(0, 3)
                            .map((unit) => cleanText(unit.node?.name, "Operating unit"))
                            .join(", ")}
                        </strong>
                        .
                      </div>
                    ) : rolloutPlan ? (
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        No first rollout unit is marked as needing local admin or
                        pilot member attention.
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This rollout view does not create nodes, invite members,
                      add members, assign admins, place members, create policy,
                      open reviews, verify authority, activate billing, activate
                      the Community Domain, publish a public page, create
                      marketplace activity, create a social Community, move
                      money, or expose private evidence.
                    </div>
                  </div>
                ) : null}

                {activeLane === "governance" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Governance review pulse</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {isAdmin
                        ? "Open decisions and approved-but-unapplied reviews are shown from the scoped reviewer queue."
                        : "Open decisions are handled by owner/admin reviewers. This lane shows whether the domain has visible review attention."}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["Needs review", governanceAttentionCount],
                        ["Ready to apply", isAdmin ? governanceApprovedCount : 0],
                        ["Access requests", isAdmin ? membershipAccessRequests.length : 0],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          style={statusBadge(Number(value) > 0 ? "attention" : "quiet")}
                        >
                          {String(label)}: {countValue(value)}
                        </div>
                      ))}
                    </div>
                    {isAdmin && membershipAccessRequests.length ? (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        The access-request panel below keeps approve, decline, and apply
                        as separate actions so membership changes only after an approved
                        review is applied.
                      </div>
                    ) : (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        {isAdmin
                          ? "No membership access request currently needs action from this account."
                          : "You can see review pressure here, but decision queues and private review details stay with authorized reviewers."}
                      </div>
                    )}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This summary does not decide reviews, apply membership,
                      assign roles, expose private evidence, or bypass reviewer policy.
                    </div>
                  </div>
                ) : null}

                {activeLane === "governance" ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Governance coverage</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      {governanceCoverage
                        ? `${cleanText(
                            governanceCoverage.primary_next_action?.label,
                            "Review Community Domain governance coverage"
                          )}. This shows whether operating units have local admins and policy coverage.`
                        : "GSN could not load the read-only governance coverage map for this view."}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["Domain policies", governanceCoverageCounts.domain_policies],
                        ["Local policies", governanceCoverageCounts.node_scoped_policies],
                        ["Needs admin", governanceCoverageCounts.needs_local_admin],
                        ["Needs policy", governanceCoverageCounts.needs_policy],
                      ].map(([label, value]) => (
                        <div
                          key={String(label)}
                          style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}
                        >
                          {String(label)}: {countValue(value)}
                        </div>
                      ))}
                    </div>
                    {governanceCoverageGaps.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {governanceCoverageGaps.slice(0, 3).map((item) => (
                          <div
                            key={`${cleanText(item.node?.id)}:${cleanText(
                              item.node?.name,
                              "governance-node"
                            )}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: "10px 10px 10px 12px",
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(item.node?.name, "Operating unit")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  lineHeight: 1.45,
                                  marginTop: 3,
                                }}
                              >
                                {cleanText(
                                  item.next_step,
                                  "Review local admin and policy coverage."
                                )}
                              </span>
                            </span>
                            <span style={statusBadge(item.governance_status)}>
                              {compactStatus(item.governance_status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : governanceCoverage ? (
                      <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                        No local-admin or policy coverage gap is visible in the
                        read-only governance map.
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This coverage view does not create policy, assign roles,
                      create reviews, decide reviews, apply reviews, verify legal
                      or institutional authority, move money, activate billing,
                      publish a public page, create marketplace activity, create
                      a social Community, or expose private review payloads.
                    </div>
                  </div>
                ) : null}

                {activeLane === "members" && placementSummary ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Your placement</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      Domain role:{" "}
                      <strong style={{ textTransform: "capitalize" }}>
                        {compactStatus(placementSummary.domain_role)}
                      </strong>
                      . Active operating-unit placements:{" "}
                      <strong>{countValue(placementCounts.active_node_placements)}</strong>.
                    </div>
                    {visibleNodePlacements.length ? (
                      <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                        {visibleNodePlacements.map((placement: any) => (
                          <div
                            key={`${cleanText(placement.community_node_id)}:${cleanText(
                              placement.id
                            )}`}
                            style={{
                              display: "grid",
                              gridTemplateColumns: "minmax(0, 1fr) auto",
                              gap: 10,
                              alignItems: "center",
                              borderRadius: 14,
                              border: "1px solid rgba(9,27,46,0.10)",
                              background: "rgba(255,255,255,0.72)",
                              padding: 10,
                            }}
                          >
                            <span style={{ minWidth: 0 }}>
                              <span style={{ display: "block", fontWeight: 950 }}>
                                {cleanText(placement.community_node_name, "Operating unit")}
                              </span>
                              <span
                                style={{
                                  display: "block",
                                  color: "#4F647A",
                                  fontSize: 12.5,
                                  marginTop: 3,
                                  textTransform: "capitalize",
                                }}
                              >
                                {compactStatus(placement.role)}
                              </span>
                            </span>
                            <span style={statusBadge(placement.status)}>
                              {compactStatus(placement.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ ...helperText(), marginTop: 10 }}>
                        You are recorded at the domain level, but no branch, line,
                        department, class, or committee placement is active yet.
                      </div>
                    )}
                    {placementLanes.length ? (
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                          gap: 8,
                          marginTop: 10,
                        }}
                      >
                        {placementLanes.slice(0, 4).map((lane: any) => (
                          <div key={cleanText(lane.lane_key, lane.label)} style={statusBadge(lane.state)}>
                            {laneDisplayLabel(lane, "Placement")}
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This is read-only. Admins still control placement, role changes,
                      and review decisions through scoped Community Domain tools.
                    </div>
                  </div>
                ) : null}

                {activeLane === "members" && !placementSummary ? (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>Member and role summary</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      GSN could not load this viewer's placement projection, so
                      this lane is showing only safe domain-level counts from the
                      dashboard summary.
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))",
                        gap: 8,
                        marginTop: 10,
                      }}
                    >
                      {[
                        ["Active members", counts.active_members],
                        ["Role placements", counts.active_node_memberships],
                        ["Open reviews", counts.open_reviews],
                      ].map(([label, value]) => (
                        <div key={String(label)} style={statusBadge(Number(value) > 0 ? "recorded" : "not recorded")}>
                          {String(label)}: {countValue(value)}
                        </div>
                      ))}
                    </div>
                    <div style={{ ...helperText(), marginTop: 10 }}>
                      If placement details are needed, refresh the dashboard or
                      ask a Community Domain admin to review member placement.
                    </div>
                    <div style={{ ...helperText(), marginTop: 10, fontSize: 13 }}>
                      This fallback does not expose private member lists, assign
                      roles, place members, decide reviews, or grant permissions.
                    </div>
                  </div>
                ) : null}

                {activeLane !== "billing" && activeLane !== "modules" ? (
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
            <section style={whiteCard()}>
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div style={sectionLabel()}>Access requests</div>
                  <h2 style={{ margin: "6px 0 0", fontSize: 24, lineHeight: 1.12 }}>
                    Review people asking to enter this domain.
                  </h2>
                  <div style={{ ...helperText(), marginTop: 8 }}>
                    These are pending membership-change reviews from the existing
                    governance queue. Approving records the decision; approving and
                    adding applies the approved review so membership changes.
                  </div>
                </div>

                {membershipAccessRequests.length > 0 ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {membershipAccessRequests.slice(0, 3).map((review) => {
                      const reviewId = cleanText(review.id, "review");
                      const reviewStatus = cleanText(review.status).toLowerCase();
                      const isApprovedReview = reviewStatus === "approved";
                      const approveBusy = busyReviewId === `${reviewId}:approve`;
                      const applyBusy = busyReviewId === `${reviewId}:apply`;
                      const declineBusy = busyReviewId === `${reviewId}:decline`;
                      return (
                        <div key={reviewId} style={softCard()}>
                          <div style={{ display: "grid", gap: 8 }}>
                            <div style={sectionLabel()}>Membership request</div>
                            <h3 style={{ margin: 0, fontSize: 19, lineHeight: 1.14 }}>
                              User {reviewUserLabel(review)} wants access.
                            </h3>
                            <div style={{ ...helperText(), fontSize: 13 }}>
                              Requested by{" "}
                              <strong>{reviewRequesterLabel(review)}</strong>
                              . Target role:{" "}
                              <strong style={{ textTransform: "capitalize" }}>
                                {compactStatus(review.payload?.role || "member")}
                              </strong>
                              . Status:{" "}
                              <strong style={{ textTransform: "capitalize" }}>
                                {compactStatus(review.status)}
                              </strong>
                              .
                            </div>
                            {review.request_note ? (
                              <div style={{ ...helperText(), fontSize: 13 }}>
                                Note: {cleanText(review.request_note)}
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
                              {!isApprovedReview ? (
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  fullWidth
                                  disabled={Boolean(busyReviewId)}
                                  debugId={`community-domain-dashboard.access-request.approve-${reviewId}`}
                                  onClick={() => approveAccessRequest(review, false)}
                                >
                                  {approveBusy ? "Approving..." : "Approve only"}
                                </StableButton>
                              ) : null}
                              {!isApprovedReview ? (
                                <StableButton
                                  type="button"
                                  kind="secondary"
                                  fullWidth
                                  disabled={Boolean(busyReviewId)}
                                  debugId={`community-domain-dashboard.access-request.decline-${reviewId}`}
                                  onClick={() => declineAccessRequest(review)}
                                >
                                  {declineBusy ? "Declining..." : "Decline"}
                                </StableButton>
                              ) : null}
                              <StableButton
                                type="button"
                                kind="primary"
                                fullWidth
                                disabled={Boolean(busyReviewId)}
                                debugId={`community-domain-dashboard.access-request.approve-apply-${reviewId}`}
                                onClick={() =>
                                  isApprovedReview
                                    ? applyApprovedAccessRequest(review)
                                    : approveAccessRequest(review, true)
                                }
                              >
                                {applyBusy
                                  ? "Adding..."
                                  : isApprovedReview
                                  ? "Add approved member"
                                  : "Approve + add member"}
                              </StableButton>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div style={softCard()}>
                    <div style={sectionLabel()}>No pending access requests</div>
                    <div style={{ ...helperText(), marginTop: 7 }}>
                      The current reviewer queue has no pending membership requests
                      this account can decide.
                    </div>
                  </div>
                )}

                <StableButton
                  type="button"
                  kind="secondary"
                  fullWidth
                  disabled={loadingQueue}
                  debugId="community-domain-dashboard.access-request.refresh"
                  onClick={refreshReviewerQueue}
                >
                  {loadingQueue ? "Refreshing requests..." : "Refresh requests"}
                </StableButton>
              </div>
            </section>
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
