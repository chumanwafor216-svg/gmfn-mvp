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
import { StableButton, StableCtaLink } from "../components/StableButton";
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

type ActivityMapLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type ActivityGroupReadinessItem = {
  node?: {
    id?: number | string | null;
    name?: string | null;
    node_type?: string | null;
    node_kind?: string | null;
  } | null;
  activity_group_status?: string | null;
  ready_for_activity_group_planning?: boolean;
  visibility_policy?: string | null;
  local_member_count?: number | string | null;
  local_facilitator_count?: number | string | null;
  local_policy_count?: number | string | null;
  review_record_count?: number | string | null;
  next_step?: string | null;
};

type MemberVerificationLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
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

type SocialBridgeLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type InstitutionalProfileLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type DelegationMapLane = {
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

type NetworkExchangeLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type RecordPrivacyLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type ConfigurationMapLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type ComplianceMapLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  count?: number | string | null;
  next_step?: string | null;
};

type AppealReadinessLane = {
  lane_key?: string | null;
  label?: string | null;
  status?: string | null;
  ready?: boolean;
  signal_count?: number | string | null;
  appeal_engine_status?: string | null;
  next_step?: string | null;
};

type ServiceSettingsProjectionItem = {
  module_key?: string | null;
  label?: string | null;
  summary?: string | null;
  enabled?: boolean;
  status?: string | null;
  source?: string | null;
  admin_visible?: boolean;
};

type EconomicParticipationLane = {
  lane_key?: string | null;
  label?: string | null;
  summary?: string | null;
  module_key?: string | null;
  status?: string | null;
  ready?: boolean;
  next_step?: string | null;
};

type NetworkPresenceLane = {
  lane_key?: string | null;
  label?: string | null;
  summary?: string | null;
  status?: string | null;
  ready?: boolean;
};

type NodeProjectionItem = {
  node?: {
    id?: number | string | null;
    name?: string | null;
    node_type?: string | null;
    node_kind?: string | null;
    parent_node_id?: number | string | null;
    status?: string | null;
  } | null;
  autonomy_status?: string | null;
  economy_status?: string | null;
  activity_status?: string | null;
  trust_status?: string | null;
  participation_status?: string | null;
  service_status?: string | null;
  privacy_status?: string | null;
  analytics_status?: string | null;
  domain_boundary_status?: string | null;
  evidence_authority_status?: string | null;
  communication_status?: string | null;
  vault_status?: string | null;
  schedule_status?: string | null;
  paid_activity_status?: string | null;
  locally_operable?: boolean;
  ready_for_local_economy?: boolean;
  ready_for_local_activity?: boolean;
  ready_for_local_trust?: boolean;
  ready_for_local_participation?: boolean;
  ready_for_local_services?: boolean;
  ready_for_local_analytics?: boolean;
  ready_for_child_domain_review?: boolean;
  ready_for_local_evidence_authority?: boolean;
  ready_for_local_communication?: boolean;
  ready_for_local_vault?: boolean;
  ready_for_local_schedule?: boolean;
  ready_for_local_paid_activity?: boolean;
  safe_default_visibility?: boolean;
  recommended_boundary?: string | null;
  visibility_policy?: string | null;
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
    if (!communityDomainId) {
      setLoading(true);
      setDashboard(null);
      setDashboardRouteId("");
      resetReadinessLoadTracking();
      setMessage("");
      setOwnMembershipRequests([]);
      resetOptionalReadinessState();
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
    setDashboardRouteId("");
    resetReadinessLoadTracking();
    setMessage("");
    setDomainItems([]);
    setReviewerQueue([]);
    setOwnMembershipRequests([]);
    resetOptionalReadinessState();
    try {
      const payload = await getCommunityDomainDashboard(communityDomainId);
      const nextDashboard = (payload?.dashboard || null) as DashboardPayload | null;
      setDashboard(nextDashboard);
      setDashboardRouteId(communityDomainId);
      setQuote(nextDashboard?.package_quote || null);
      setActiveLane(laneForAction(nextDashboard?.primary_next_action?.action_key));
      setLoading(false);
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
      setDashboardRouteId("");
      resetReadinessLoadTracking();
      resetOptionalReadinessState();
      await loadOwnMembershipRequests();
      setMessage(
        err?.message ||
          "GSN could not open this Community Domain dashboard. Check that you are signed in as an active domain member."
      );
    } finally {
      setLoading(false);
    }
  }, [
    communityDomainId,
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
  const nodeAutonomyCounts = nodeAutonomyMap?.counts || {};
  const visibleNodeAutonomyRows: NodeProjectionItem[] = Array.isArray(
    nodeAutonomyMap?.flat_nodes
  )
    ? nodeAutonomyMap.flat_nodes
    : [];
  const nodeAutonomyGaps = visibleNodeAutonomyRows.filter((item) => {
    const statusText = cleanText(item.autonomy_status).toLowerCase();
    return statusText.includes("needs") || statusText.includes("parent_controlled");
  });
  const nodeEconomicCounts = nodeEconomicMap?.counts || {};
  const visibleNodeEconomicRows: NodeProjectionItem[] = Array.isArray(
    nodeEconomicMap?.flat_nodes
  )
    ? nodeEconomicMap.flat_nodes
    : [];
  const nodeEconomicGaps = visibleNodeEconomicRows.filter((item) => {
    const statusText = cleanText(item.economy_status).toLowerCase();
    return statusText.includes("needs") || statusText.includes("governance");
  });
  const nodeActivityCounts = nodeActivityMap?.counts || {};
  const visibleNodeActivityRows: NodeProjectionItem[] = Array.isArray(
    nodeActivityMap?.flat_nodes
  )
    ? nodeActivityMap.flat_nodes
    : [];
  const nodeActivityGaps = visibleNodeActivityRows.filter((item) => {
    const statusText = cleanText(item.activity_status).toLowerCase();
    return statusText.includes("needs") || statusText.includes("governance");
  });
  const nodeTrustCounts = nodeTrustMap?.counts || {};
  const visibleNodeTrustRows: NodeProjectionItem[] = Array.isArray(nodeTrustMap?.flat_nodes)
    ? nodeTrustMap.flat_nodes
    : [];
  const nodeTrustGaps = visibleNodeTrustRows.filter((item) => {
    const statusText = cleanText(item.trust_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("governance") ||
      statusText.includes("review") ||
      statusText.includes("evidence")
    );
  });
  const nodeParticipationCounts = nodeParticipationMap?.counts || {};
  const visibleNodeParticipationRows: NodeProjectionItem[] = Array.isArray(
    nodeParticipationMap?.flat_nodes
  )
    ? nodeParticipationMap.flat_nodes
    : [];
  const nodeParticipationGaps = visibleNodeParticipationRows.filter((item) => {
    const statusText = cleanText(item.participation_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("empty") ||
      statusText.includes("admin_only")
    );
  });
  const nodeServiceCounts = nodeServiceMap?.counts || {};
  const visibleNodeServiceRows: NodeProjectionItem[] = Array.isArray(
    nodeServiceMap?.flat_nodes
  )
    ? nodeServiceMap.flat_nodes
    : [];
  const nodeServiceGaps = visibleNodeServiceRows.filter((item) => {
    const statusText = cleanText(item.service_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("governance") ||
      statusText.includes("no_template")
    );
  });
  const nodePrivacyCounts = nodePrivacyMap?.counts || {};
  const visibleNodePrivacyRows: NodeProjectionItem[] = Array.isArray(
    nodePrivacyMap?.flat_nodes
  )
    ? nodePrivacyMap.flat_nodes
    : [];
  const nodePrivacyGaps = visibleNodePrivacyRows.filter((item) => {
    const statusText = cleanText(item.privacy_status).toLowerCase();
    return statusText.includes("review") || statusText.includes("unknown");
  });
  const nodeAnalyticsCounts = nodeAnalyticsMap?.counts || {};
  const visibleNodeAnalyticsRows: NodeProjectionItem[] = Array.isArray(
    nodeAnalyticsMap?.flat_nodes
  )
    ? nodeAnalyticsMap.flat_nodes
    : [];
  const nodeAnalyticsGaps = visibleNodeAnalyticsRows.filter((item) => {
    const statusText = cleanText(item.analytics_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("inactive") ||
      statusText.includes("review")
    );
  });
  const nodeDomainBoundaryCounts = nodeDomainBoundaryMap?.counts || {};
  const visibleNodeDomainBoundaryRows: NodeProjectionItem[] = Array.isArray(
    nodeDomainBoundaryMap?.flat_nodes
  )
    ? nodeDomainBoundaryMap.flat_nodes
    : [];
  const nodeDomainBoundaryGaps = visibleNodeDomainBoundaryRows.filter((item) => {
    const statusText = cleanText(item.domain_boundary_status).toLowerCase();
    return (
      statusText.includes("candidate") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
  const nodeEvidenceAuthorityCounts = nodeEvidenceAuthorityMap?.counts || {};
  const visibleNodeEvidenceAuthorityRows: NodeProjectionItem[] = Array.isArray(
    nodeEvidenceAuthorityMap?.flat_nodes
  )
    ? nodeEvidenceAuthorityMap.flat_nodes
    : [];
  const nodeEvidenceAuthorityGaps = visibleNodeEvidenceAuthorityRows.filter((item) => {
    const statusText = cleanText(item.evidence_authority_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
  const nodeCommunicationCounts = nodeCommunicationMap?.counts || {};
  const visibleNodeCommunicationRows: NodeProjectionItem[] = Array.isArray(
    nodeCommunicationMap?.flat_nodes
  )
    ? nodeCommunicationMap.flat_nodes
    : [];
  const nodeCommunicationGaps = visibleNodeCommunicationRows.filter((item) => {
    const statusText = cleanText(item.communication_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
  const nodeVaultCounts = nodeVaultMap?.counts || {};
  const visibleNodeVaultRows: NodeProjectionItem[] = Array.isArray(
    nodeVaultMap?.flat_nodes
  )
    ? nodeVaultMap.flat_nodes
    : [];
  const nodeVaultGaps = visibleNodeVaultRows.filter((item) => {
    const statusText = cleanText(item.vault_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
  const nodeScheduledActivityCounts = nodeScheduledActivityMap?.counts || {};
  const visibleNodeScheduledActivityRows: NodeProjectionItem[] = Array.isArray(
    nodeScheduledActivityMap?.flat_nodes
  )
    ? nodeScheduledActivityMap.flat_nodes
    : [];
  const nodeScheduledActivityGaps = visibleNodeScheduledActivityRows.filter((item) => {
    const statusText = cleanText(item.schedule_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
  const nodePaidActivityCounts = nodePaidActivityMap?.counts || {};
  const visibleNodePaidActivityRows: NodeProjectionItem[] = Array.isArray(
    nodePaidActivityMap?.flat_nodes
  )
    ? nodePaidActivityMap.flat_nodes
    : [];
  const nodePaidActivityGaps = visibleNodePaidActivityRows.filter((item) => {
    const statusText = cleanText(item.paid_activity_status).toLowerCase();
    return (
      statusText.includes("needs") ||
      statusText.includes("review") ||
      statusText.includes("inactive")
    );
  });
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
  const delegationMapSummary = delegationMap?.summary || {};
  const visibleDelegationLanes: DelegationMapLane[] = Array.isArray(delegationMap?.lanes)
    ? delegationMap.lanes
    : [];
  const blockedDelegationLanes = visibleDelegationLanes.filter((lane) => !lane.ready);
  const delegationReadyTotal =
    typeof delegationMap?.ready_total === "number"
      ? delegationMap.ready_total
      : visibleDelegationLanes.filter((lane) => lane.ready).length;
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
  const activityMapSummary = activityMap?.summary || {};
  const activityMapTemplate = activityMap?.template || {};
  const visibleActivityMapLanes: ActivityMapLane[] = Array.isArray(activityMap?.lanes)
    ? activityMap.lanes
    : [];
  const blockedActivityMapLanes = visibleActivityMapLanes.filter((lane) => !lane.ready);
  const activityMapReadyTotal =
    typeof activityMap?.ready_total === "number"
      ? activityMap.ready_total
      : visibleActivityMapLanes.filter((lane) => lane.ready).length;
  const activityGroupSummary = activityGroupReadiness?.summary || {};
  const visibleActivityGroups: ActivityGroupReadinessItem[] = Array.isArray(
    activityGroupReadiness?.flat_groups
  )
    ? activityGroupReadiness.flat_groups
    : [];
  const blockedActivityGroups = visibleActivityGroups.filter(
    (group) => !group.ready_for_activity_group_planning
  );
  const activityGroupReadyTotal = visibleActivityGroups.filter(
    (group) => group.ready_for_activity_group_planning
  ).length;
  const memberVerificationSummary = memberVerificationMap?.summary || {};
  const visibleMemberVerificationLanes: MemberVerificationLane[] = Array.isArray(
    memberVerificationMap?.lanes
  )
    ? memberVerificationMap.lanes
    : [];
  const blockedMemberVerificationLanes = visibleMemberVerificationLanes.filter(
    (lane) => !lane.ready
  );
  const memberVerificationReadyTotal =
    typeof memberVerificationMap?.ready_total === "number"
      ? memberVerificationMap.ready_total
      : visibleMemberVerificationLanes.filter((lane) => lane.ready).length;
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
  const networkExchangeSummary = networkExchangeMap?.summary || {};
  const linkedNetworkSocialCommunity = networkExchangeMap?.linked_social_community || {};
  const visibleNetworkExchangeLanes: NetworkExchangeLane[] = Array.isArray(
    networkExchangeMap?.lanes
  )
    ? networkExchangeMap.lanes
    : [];
  const blockedNetworkExchangeLanes = visibleNetworkExchangeLanes.filter(
    (lane) => !lane.ready
  );
  const networkExchangeReadyTotal =
    typeof networkExchangeMap?.ready_total === "number"
      ? networkExchangeMap.ready_total
      : visibleNetworkExchangeLanes.filter((lane) => lane.ready).length;
  const recordPrivacySummary = recordPrivacyMap?.summary || {};
  const visibleRecordPrivacyLanes: RecordPrivacyLane[] = Array.isArray(
    recordPrivacyMap?.lanes
  )
    ? recordPrivacyMap.lanes
    : [];
  const blockedRecordPrivacyLanes = visibleRecordPrivacyLanes.filter(
    (lane) => !lane.ready
  );
  const recordPrivacyReadyTotal =
    typeof recordPrivacyMap?.ready_total === "number"
      ? recordPrivacyMap.ready_total
      : visibleRecordPrivacyLanes.filter((lane) => lane.ready).length;
  const configurationMapSummary = configurationMap?.summary || {};
  const configurationMapBlueprint = configurationMap?.blueprint || {};
  const visibleConfigurationMapLanes: ConfigurationMapLane[] = Array.isArray(
    configurationMap?.lanes
  )
    ? configurationMap.lanes
    : [];
  const blockedConfigurationMapLanes = visibleConfigurationMapLanes.filter(
    (lane) => !lane.ready
  );
  const configurationMapReadyTotal =
    typeof configurationMap?.ready_total === "number"
      ? configurationMap.ready_total
      : visibleConfigurationMapLanes.filter((lane) => lane.ready).length;
  const complianceMapSummary = complianceMap?.summary || {};
  const visibleComplianceMapLanes: ComplianceMapLane[] = Array.isArray(
    complianceMap?.lanes
  )
    ? complianceMap.lanes
    : [];
  const blockedComplianceMapLanes = visibleComplianceMapLanes.filter(
    (lane) => !lane.ready
  );
  const complianceMapReadyTotal =
    typeof complianceMap?.ready_total === "number"
      ? complianceMap.ready_total
      : visibleComplianceMapLanes.filter((lane) => lane.ready).length;
  const appealReadinessSummary = appealReadiness?.summary || {};
  const visibleAppealReadinessLanes: AppealReadinessLane[] = Array.isArray(
    appealReadiness?.lanes
  )
    ? appealReadiness.lanes
    : [];
  const blockedAppealReadinessLanes = visibleAppealReadinessLanes.filter(
    (lane) => !lane.ready
  );
  const appealReadinessSignalTotal = visibleAppealReadinessLanes.reduce(
    (total, lane) => total + Number(lane.signal_count || 0),
    0
  );
  const visibleServiceSettingsItems: ServiceSettingsProjectionItem[] = Array.isArray(
    serviceSettingsProjection?.items
  )
    ? serviceSettingsProjection.items
    : [];
  const enabledServiceSettingsItems = visibleServiceSettingsItems.filter(
    (item) => item.enabled
  );
  const optionalServiceSettingsItems = visibleServiceSettingsItems.filter(
    (item) => !item.enabled
  );
  const economicParticipationCounts = economicParticipation?.counts || {};
  const economicParticipationTemplate = economicParticipation?.template || {};
  const visibleEconomicParticipationLanes: EconomicParticipationLane[] = Array.isArray(
    economicParticipation?.lanes
  )
    ? economicParticipation.lanes
    : [];
  const blockedEconomicParticipationLanes = visibleEconomicParticipationLanes.filter(
    (lane) => !lane.ready
  );
  const economicParticipationReadyTotal =
    typeof economicParticipation?.ready_total === "number"
      ? economicParticipation.ready_total
      : visibleEconomicParticipationLanes.filter((lane) => lane.ready).length;
  const networkPresenceIdentity = networkPresence?.identity || {};
  const networkPresenceStatus = networkPresence?.status || {};
  const visibleNetworkPresenceLanes: NetworkPresenceLane[] = Array.isArray(
    networkPresence?.lanes
  )
    ? networkPresence.lanes
    : [];
  const blockedNetworkPresenceLanes = visibleNetworkPresenceLanes.filter(
    (lane) => !lane.ready
  );
  const networkPresenceReadyTotal =
    typeof networkPresence?.ready_total === "number"
      ? networkPresence.ready_total
      : visibleNetworkPresenceLanes.filter((lane) => lane.ready).length;
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
  const institutionalProfileSummary = institutionalProfile?.summary || {};
  const institutionalProfileDetails = institutionalProfile?.institutional_profile || {};
  const visibleInstitutionalProfileLanes: InstitutionalProfileLane[] = Array.isArray(
    institutionalProfile?.lanes
  )
    ? institutionalProfile.lanes
    : [];
  const blockedInstitutionalProfileLanes = visibleInstitutionalProfileLanes.filter(
    (lane) => !lane.ready
  );
  const institutionalProfileReadyTotal =
    typeof institutionalProfile?.ready_total === "number"
      ? institutionalProfile.ready_total
      : visibleInstitutionalProfileLanes.filter((lane) => lane.ready).length;
  const socialBridgeSummary = socialBridge?.summary || {};
  const linkedSocialCommunity = socialBridge?.linked_community || {};
  const visibleSocialBridgeLanes: SocialBridgeLane[] = Array.isArray(socialBridge?.lanes)
    ? socialBridge.lanes
    : [];
  const blockedSocialBridgeLanes = visibleSocialBridgeLanes.filter(
    (lane) => !lane.ready
  );
  const socialBridgeReadyTotal =
    typeof socialBridge?.ready_total === "number"
      ? socialBridge.ready_total
      : visibleSocialBridgeLanes.filter((lane) => lane.ready).length;
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
                  {isBaseReadinessLoading && !setupReadiness
                    ? "Loading readiness checks"
                    : setupReadiness
                    ? `${countValue(setupReadiness.ready_total)} of ${countValue(
                        setupReadiness.total
                      )} checks ready`
                    : "Readiness is not loaded"}
                </h2>
                <div style={helperText()}>
                  {isBaseReadinessLoading && !setupReadiness
                    ? "GSN is loading the read-only setup checklist while the main Community Domain dashboard remains usable."
                    : setupReadiness
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
                  {isBaseReadinessLoading && !setupPlan
                    ? "Loading setup plan"
                    : setupPlan
                    ? `${countValue(setupPlan.completed_steps)} of ${countValue(
                        visibleSetupPlanSteps.length
                      )} steps complete`
                    : "Setup plan is not loaded"}
                </h2>
                <div style={helperText()}>
                  {isBaseReadinessLoading && !setupPlan
                    ? "GSN is loading the read-only setup plan while the main Community Domain dashboard remains usable."
                    : setupPlan
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
                      institutionalProfileReadyTotal={institutionalProfileReadyTotal}
                      visibleInstitutionalProfileLanes={visibleInstitutionalProfileLanes}
                      blockedInstitutionalProfileLanes={blockedInstitutionalProfileLanes}
                      institutionalProfileSummary={institutionalProfileSummary}
                      institutionalProfileDetails={institutionalProfileDetails}
                      socialBridge={socialBridge}
                      socialBridgeReadyTotal={socialBridgeReadyTotal}
                      visibleSocialBridgeLanes={visibleSocialBridgeLanes}
                      blockedSocialBridgeLanes={blockedSocialBridgeLanes}
                      socialBridgeSummary={socialBridgeSummary}
                      linkedSocialCommunity={linkedSocialCommunity}
                      affiliationReadiness={affiliationReadiness}
                      affiliationReadyTotal={affiliationReadyTotal}
                      visibleAffiliationLanes={visibleAffiliationLanes}
                      blockedAffiliationLanes={blockedAffiliationLanes}
                      affiliationSummary={affiliationSummary}
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
                      subscriptionReadyTotal={subscriptionReadyTotal}
                      visibleSubscriptionLanes={visibleSubscriptionLanes}
                      blockedSubscriptionLanes={blockedSubscriptionLanes}
                      subscriptionPackage={subscriptionPackage}
                      subscriptionSummary={subscriptionSummary}
                      capacityPlan={capacityPlan}
                      visibleCapacityLanes={visibleCapacityLanes}
                      attentionCapacityLanes={attentionCapacityLanes}
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
                        serviceReadinessRows={serviceReadinessRows}
                        serviceSettingsProjection={serviceSettingsProjection}
                        visibleServiceSettingsItems={visibleServiceSettingsItems}
                        enabledServiceSettingsItems={enabledServiceSettingsItems}
                        optionalServiceSettingsItems={optionalServiceSettingsItems}
                        economicParticipation={economicParticipation}
                        economicParticipationReadyTotal={economicParticipationReadyTotal}
                        visibleEconomicParticipationLanes={visibleEconomicParticipationLanes}
                        blockedEconomicParticipationLanes={blockedEconomicParticipationLanes}
                        economicParticipationTemplate={economicParticipationTemplate}
                        economicParticipationCounts={economicParticipationCounts}
                        networkPresence={networkPresence}
                        networkPresenceReadyTotal={networkPresenceReadyTotal}
                        visibleNetworkPresenceLanes={visibleNetworkPresenceLanes}
                        blockedNetworkPresenceLanes={blockedNetworkPresenceLanes}
                        networkPresenceIdentity={networkPresenceIdentity}
                        networkPresenceStatus={networkPresenceStatus}
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
                            nodeServiceCounts={nodeServiceCounts}
                            visibleNodeServiceRows={visibleNodeServiceRows}
                            nodeServiceGaps={nodeServiceGaps}
                            nodePrivacyMap={nodePrivacyMap}
                            nodePrivacyCounts={nodePrivacyCounts}
                            visibleNodePrivacyRows={visibleNodePrivacyRows}
                            nodePrivacyGaps={nodePrivacyGaps}
                            nodeAnalyticsMap={nodeAnalyticsMap}
                            nodeAnalyticsCounts={nodeAnalyticsCounts}
                            visibleNodeAnalyticsRows={visibleNodeAnalyticsRows}
                            nodeAnalyticsGaps={nodeAnalyticsGaps}
                            nodeCommunicationMap={nodeCommunicationMap}
                            nodeCommunicationCounts={nodeCommunicationCounts}
                            visibleNodeCommunicationRows={visibleNodeCommunicationRows}
                            nodeCommunicationGaps={nodeCommunicationGaps}
                            nodeVaultMap={nodeVaultMap}
                            nodeVaultCounts={nodeVaultCounts}
                            visibleNodeVaultRows={visibleNodeVaultRows}
                            nodeVaultGaps={nodeVaultGaps}
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
                        networkExchangeReadyTotal={networkExchangeReadyTotal}
                        visibleNetworkExchangeLanes={visibleNetworkExchangeLanes}
                        blockedNetworkExchangeLanes={blockedNetworkExchangeLanes}
                        networkExchangeSummary={networkExchangeSummary}
                        linkedNetworkSocialCommunity={linkedNetworkSocialCommunity}
                        recordPrivacyMap={recordPrivacyMap}
                        recordPrivacyReadyTotal={recordPrivacyReadyTotal}
                        visibleRecordPrivacyLanes={visibleRecordPrivacyLanes}
                        blockedRecordPrivacyLanes={blockedRecordPrivacyLanes}
                        recordPrivacySummary={recordPrivacySummary}
                        configurationMap={configurationMap}
                        configurationMapReadyTotal={configurationMapReadyTotal}
                        visibleConfigurationMapLanes={visibleConfigurationMapLanes}
                        blockedConfigurationMapLanes={blockedConfigurationMapLanes}
                        configurationMapSummary={configurationMapSummary}
                        configurationMapBlueprint={configurationMapBlueprint}
                        complianceMap={complianceMap}
                        complianceMapReadyTotal={complianceMapReadyTotal}
                        visibleComplianceMapLanes={visibleComplianceMapLanes}
                        blockedComplianceMapLanes={blockedComplianceMapLanes}
                        complianceMapSummary={complianceMapSummary}
                        appealReadiness={appealReadiness}
                        appealReadinessSignalTotal={appealReadinessSignalTotal}
                        visibleAppealReadinessLanes={visibleAppealReadinessLanes}
                        blockedAppealReadinessLanes={blockedAppealReadinessLanes}
                        appealReadinessSummary={appealReadinessSummary}
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
                        nodeEvidenceAuthorityCounts={nodeEvidenceAuthorityCounts}
                        visibleNodeEvidenceAuthorityRows={visibleNodeEvidenceAuthorityRows}
                        nodeEvidenceAuthorityGaps={nodeEvidenceAuthorityGaps}
                        nodeTrustMap={nodeTrustMap}
                        nodeTrustCounts={nodeTrustCounts}
                        visibleNodeTrustRows={visibleNodeTrustRows}
                        nodeTrustGaps={nodeTrustGaps}
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
                        evidenceRecordReadyTotal={evidenceRecordReadyTotal}
                        visibleEvidenceRecordTypes={visibleEvidenceRecordTypes}
                        blockedEvidenceRecordTypes={blockedEvidenceRecordTypes}
                        evidenceRecordSummary={evidenceRecordSummary}
                        evidenceReleaseReadiness={evidenceReleaseReadiness}
                        evidenceReleaseReadyTotal={evidenceReleaseReadyTotal}
                        visibleEvidenceReleaseLanes={visibleEvidenceReleaseLanes}
                        blockedEvidenceReleaseLanes={blockedEvidenceReleaseLanes}
                        evidenceReleaseSummary={evidenceReleaseSummary}
                        trustRelayReadiness={trustRelayReadiness}
                        trustRelayReadyTotal={trustRelayReadyTotal}
                        visibleTrustRelayLanes={visibleTrustRelayLanes}
                        blockedTrustRelayLanes={blockedTrustRelayLanes}
                        trustRelaySummary={trustRelaySummary}
                        notificationScopeReadiness={notificationScopeReadiness}
                        notificationScopeReadyTotal={notificationScopeReadyTotal}
                        visibleNotificationScopeLanes={visibleNotificationScopeLanes}
                        blockedNotificationScopeLanes={blockedNotificationScopeLanes}
                        notificationScopeSummary={notificationScopeSummary}
                        trustMobility={trustMobility}
                        trustMobilityReadyTotal={trustMobilityReadyTotal}
                        visibleTrustMobilityLanes={visibleTrustMobilityLanes}
                        blockedTrustMobilityLanes={blockedTrustMobilityLanes}
                        trustMobilitySummary={trustMobilitySummary}
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
                      visibleStructureRows={visibleStructureRows}
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
                      nodeAutonomyCounts={nodeAutonomyCounts}
                      visibleNodeAutonomyRows={visibleNodeAutonomyRows}
                      nodeAutonomyGaps={nodeAutonomyGaps}
                      nodeEconomicMap={nodeEconomicMap}
                      nodeEconomicCounts={nodeEconomicCounts}
                      visibleNodeEconomicRows={visibleNodeEconomicRows}
                      nodeEconomicGaps={nodeEconomicGaps}
                      nodeActivityMap={nodeActivityMap}
                      nodeActivityCounts={nodeActivityCounts}
                      visibleNodeActivityRows={visibleNodeActivityRows}
                      nodeActivityGaps={nodeActivityGaps}
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
                      nodeDomainBoundaryCounts={nodeDomainBoundaryCounts}
                      visibleNodeDomainBoundaryRows={visibleNodeDomainBoundaryRows}
                      nodeDomainBoundaryGaps={nodeDomainBoundaryGaps}
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
                      nodeScheduledActivityCounts={nodeScheduledActivityCounts}
                      visibleNodeScheduledActivityRows={visibleNodeScheduledActivityRows}
                      nodeScheduledActivityGaps={nodeScheduledActivityGaps}
                      nodePaidActivityMap={nodePaidActivityMap}
                      nodePaidActivityCounts={nodePaidActivityCounts}
                      visibleNodePaidActivityRows={visibleNodePaidActivityRows}
                      nodePaidActivityGaps={nodePaidActivityGaps}
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
                      rolloutPlanCounts={rolloutPlanCounts}
                      openRolloutPhases={openRolloutPhases}
                      rolloutUnitsNeedingAttention={rolloutUnitsNeedingAttention}
                      activityMap={activityMap}
                      activityMapReadyTotal={activityMapReadyTotal}
                      visibleActivityMapLanes={visibleActivityMapLanes}
                      blockedActivityMapLanes={blockedActivityMapLanes}
                      activityMapSummary={activityMapSummary}
                      activityMapTemplate={activityMapTemplate}
                      activityGroupReadiness={activityGroupReadiness}
                      activityGroupReadyTotal={activityGroupReadyTotal}
                      visibleActivityGroups={visibleActivityGroups}
                      blockedActivityGroups={blockedActivityGroups}
                      activityGroupSummary={activityGroupSummary}
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
                      delegationReadyTotal={delegationReadyTotal}
                      visibleDelegationLanes={visibleDelegationLanes}
                      blockedDelegationLanes={blockedDelegationLanes}
                      delegationMapSummary={delegationMapSummary}
                      governanceCoverage={governanceCoverage}
                      governanceCoverageCounts={governanceCoverageCounts}
                      governanceCoverageGaps={governanceCoverageGaps}
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
                      placementCounts={placementCounts}
                      visibleNodePlacements={visibleNodePlacements}
                      placementLanes={placementLanes}
                      counts={counts}
                      memberVerificationMap={memberVerificationMap}
                      memberVerificationReadyTotal={memberVerificationReadyTotal}
                      visibleMemberVerificationLanes={visibleMemberVerificationLanes}
                      blockedMemberVerificationLanes={blockedMemberVerificationLanes}
                      memberVerificationSummary={memberVerificationSummary}
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
                          nodeParticipationCounts={nodeParticipationCounts}
                          visibleNodeParticipationRows={visibleNodeParticipationRows}
                          nodeParticipationGaps={nodeParticipationGaps}
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
