/* global console, document, getComputedStyle, HTMLInputElement, localStorage, location, Node, process, URL, window */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.GSN_AUDIT_BASE_URL || "http://127.0.0.1:5180";
const routePath = "/app/community-domain/13";
const purchaseRoutePath = "/community-domain/purchase?demo=pillar-of-hope";
const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = join(frontendRoot, "screenshots");
mkdirSync(screenshotDir, { recursive: true });
const handledApiPaths = [];
let domainListScenario = "owned";
let dashboardScenario = "active";

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function isApiRequest(url) {
  const parsed = new URL(url);
  const apiPathPrefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/community-pay-in-accounts/",
    "/community-domains/",
    "/community-domains",
    "/bank/",
    "/notifications",
    "/identity",
    "/trust",
  ];

  return (
    url.includes("localhost:8000") ||
    url.includes("127.0.0.1:8000") ||
    url.includes("127.0.0.1:8012") ||
    apiPathPrefixes.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix)
    )
  );
}

function readinessMap(label, status = "ready") {
  return {
    primary_next_action: { label: `Review ${label}` },
    ready_total: 1,
    summary: {
      status,
      engine_status: status,
      verification_status: status,
      active_member_count: 12,
      active_policy_count: 3,
      review_records: 2,
      active_evidence_records: 2,
    },
    lanes: [
      {
        lane_key: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_ready`,
        label,
        ready: true,
        status,
        next_step: `Keep ${label.toLowerCase()} current.`,
      },
      {
        lane_key: `${label.toLowerCase().replace(/[^a-z0-9]+/g, "_")}_attention`,
        label: `${label} review`,
        ready: false,
        status: "needs_review",
        next_step: `Review ${label.toLowerCase()} before wider use.`,
      },
    ],
  };
}

function nodeMap(label, statusKey, status = "ready") {
  return {
    primary_next_action: { label: `Review ${label}` },
    counts: {
      locally_governed: 2,
      local_economy_ready: 2,
      local_activity_ready: 2,
      local_service_ready: 2,
      member_visible: 2,
      local_analytics_ready: 2,
      local_evidence_authority_ready: 2,
      local_trust_ready: 2,
      local_participation_ready: 2,
      local_schedule_ready: 2,
      local_paid_activity_ready: 2,
      review_records: 2,
      active_evidence_records: 2,
      trustslips: 0,
    },
    template: {
      template_key: "community_association",
      marketplace_role: "local_market_ready",
    },
    flat_nodes: [
      {
        node: { id: 1, name: "North branch" },
        [statusKey]: status,
        next_step: `Keep ${label.toLowerCase()} reviewed.`,
      },
      {
        node: { id: 2, name: "Youth committee" },
        [statusKey]: "needs_review",
        next_step: `Review ${label.toLowerCase()} before opening.`,
      },
    ],
  };
}

const dashboardPayload = {
  community_domain: {
    id: 13,
    clan_id: 1,
    domain_name: "pillar-of-hope",
    display_name: "Pillar of Hope",
    status: "active",
    verification_status: "verified",
    billing_status: "active",
    activation_status: "active",
  },
  viewer: {
    user_id: 1,
    can_admin: true,
    role: "owner",
  },
  template: {
    key: "community_association",
    label: "Community association",
    default_modules: ["structure", "governance", "members", "services", "billing"],
  },
  status: {
    domain_status: "active",
    billing_status: "active",
    activation_status: "active",
    verification_status: "verified",
  },
  counts: {
    nodes: 4,
    active_policies: 3,
    members: 12,
    active_members: 12,
    active_node_memberships: 9,
    open_reviews: 2,
  },
  lanes: [
    {
      lane_key: "settings",
      label: "Setup",
      status: "active",
      count: 1,
      summary: "Setup details are saved.",
    },
    {
      lane_key: "modules",
      label: "Services",
      status: "active",
      count: 5,
      summary: "Run service readiness and boundaries.",
    },
    {
      lane_key: "structure",
      label: "Structure",
      status: "active",
      count: 4,
      summary: "Review operating units.",
    },
    {
      lane_key: "governance",
      label: "Governance",
      status: "review",
      count: 2,
      summary: "Review decisions and policies.",
    },
    {
      lane_key: "members",
      label: "Members",
      status: "active",
      count: 12,
      summary: "Review placement and readiness.",
    },
    {
      lane_key: "billing",
      label: "Billing",
      status: "active",
      count: 1,
      summary: "Billing is active.",
    },
  ],
  package_quote: {
    quote_status: "accepted",
    pricing_status: "pilot_quote_accepted",
    package_name: "Community Domain Starter",
    included_members: 50,
    included_nodes: 8,
    included_admins: 3,
    included_shops: 2,
    included_storage_gb: 5,
    billing_boundary: {
      plain_language: "Current pilot package allowance only.",
    },
  },
  primary_next_action: {
    label: "Open Services",
    action_key: "services.review",
  },
};

function currentDashboardPayload() {
  const payload = JSON.parse(JSON.stringify(dashboardPayload));
  if (dashboardScenario === "draft") {
    payload.community_domain.status = "draft";
    payload.community_domain.verification_status = "not_verified";
    payload.community_domain.billing_status = "quote_pending";
    payload.community_domain.activation_status = "not_active";
    payload.status.domain_status = "draft";
    payload.status.verification_status = "not_verified";
    payload.status.billing_status = "quote_pending";
    payload.status.activation_status = "not_active";
    payload.package_quote.quote_status = "draft";
    payload.package_quote.pricing_status = "quote_pending";
    payload.primary_next_action = {
      label: "Continue setup",
      action_key: "setup.continue",
    };
    payload.lanes = payload.lanes.map((lane) =>
      lane.lane_key === "settings"
        ? { ...lane, status: "draft", summary: "Setup is still being prepared." }
        : { ...lane, status: "waiting", count: 0 }
    );
  }
  return payload;
}

const moduleScopeReadiness = {
  module_scope_readiness: {
    ...readinessMap("Services"),
    modules: [
      { module_key: "shops", label: "Shops", status: "ready", ready: true },
      { module_key: "spotlight", label: "Spotlight", status: "ready", ready: true },
      { module_key: "vault", label: "Vault", status: "needs_review", ready: false },
    ],
  },
};

const serviceSettings = {
  service_settings: {
    enabled_total: 3,
    optional_total: 2,
    items: [
      { service_key: "shops", label: "Shops", status: "enabled" },
      { service_key: "vault", label: "Vault", status: "optional" },
    ],
  },
};

const rolloutPlan = {
  rollout_plan: {
    primary_next_action: { label: "Review rollout plan" },
    rollout_phase: "pilot_ready",
    counts: {
      first_level_units: 2,
      ready_units: 1,
      active_members: 12,
      active_policies: 3,
    },
    phases: [
      { phase_key: "pilot", label: "Pilot", status: "open", completed: false },
    ],
    rollout_units: [
      { node: { id: 1, name: "North branch" }, ready_for_pilot: true },
      { node: { id: 2, name: "Youth committee" }, ready_for_pilot: false },
    ],
  },
};

const activityMap = {
  activity_map: {
    ...readinessMap("Activity"),
    summary: {
      activity_lane_count: 3,
      active_operating_unit_count: 2,
      active_member_count: 12,
      active_policy_count: 3,
      paid_activity_status: "planning",
      scheduled_activity_status: "ready",
    },
    template: { marketplace_role: "local_market_ready" },
  },
};

const activityGroupReadiness = {
  activity_group_readiness: {
    primary_next_action: { label: "Review group readiness" },
    summary: {
      activity_group_candidate_count: 2,
      node_count: 2,
      active_node_memberships: 8,
      active_policies: 3,
      review_records: 2,
      activity_group_engine_status: "planning",
      activity_group_records_created: 0,
      rosca_cycles_created: 0,
    },
    flat_groups: [
      {
        node: { id: 1, name: "North branch" },
        ready_for_activity_group_planning: true,
        activity_group_status: "ready",
      },
      {
        node: { id: 2, name: "Youth committee" },
        ready_for_activity_group_planning: false,
        activity_group_status: "needs_review",
      },
    ],
  },
};

const memberVerificationMap = {
  member_verification_map: {
    ...readinessMap("Member verification"),
    summary: {
      active_member_count: 12,
      members_with_gsn_id: 11,
      members_without_unit_placement: 1,
      open_member_review_count: 2,
      verification_status: "ready",
      credential_issuance_status: "planning",
      active_node_membership_count: 9,
    },
  },
};

const placementSummary = {
  placement_summary: {
    domain_role: "owner",
    counts: { active_node_placements: 2 },
    node_placements: [
      {
        id: 1,
        community_node_id: 1,
        community_node_name: "North branch",
        role: "admin",
        status: "active",
      },
    ],
    lanes: [
      { lane_key: "placement", label: "Placement", state: "active", ready: true },
    ],
  },
};

function pathPayload(pathname) {
  const dashboard = currentDashboardPayload();

  if (pathname.endsWith("/auth/me") || pathname.endsWith("/users/me")) {
    return {
      id: 1,
      email: "audit@gsn.local",
      name: "Audit Owner",
      role: "admin",
      gsn_id: "GMFN-U-0B5A2953",
    };
  }

  if (pathname.includes("/community-domains/availability")) {
    return {
      domain_name: "pillar-of-hope-demo",
      normalized_domain_name: "pillar-of-hope-demo",
      available: true,
      reason: null,
    };
  }

  if (pathname.includes("/community-domains/13/dashboard")) {
    return { dashboard };
  }
  if (pathname.includes("/community-domains/13/readiness")) {
    return { readiness: readinessMap("Community Domain readiness") };
  }
  if (pathname.includes("/community-domains/13/setup-plan")) {
    return { setup_plan: readinessMap("Setup plan") };
  }
  if (pathname.includes("/community-domains/13/capacity-plan")) {
    return {
      capacity_plan: {
        package_name: "Community Domain Starter",
        billing_boundary: { plain_language: "Current pilot package allowance only." },
        lanes: [{ lane_key: "members", label: "Members", used: 12, limit: 50 }],
      },
    };
  }
  if (pathname.includes("/community-domains/13/subscription-lifecycle")) {
    return { subscription_lifecycle: readinessMap("Subscription") };
  }
  if (pathname.includes("/community-domains/13/rollout-tree")) {
    return { items: [{ id: 1, name: "Pillar of Hope", children: [] }] };
  }
  if (pathname.includes("/community-domains/13/rollout-plan")) return rolloutPlan;
  if (pathname.includes("/community-domains/13/activity-map")) return activityMap;
  if (pathname.includes("/community-domains/13/activity-group-readiness")) {
    return activityGroupReadiness;
  }

  if (pathname.includes("/community-domains/13/node-autonomy-map")) {
    return { node_autonomy_map: nodeMap("Unit authority", "autonomy_status") };
  }
  if (pathname.includes("/community-domains/13/node-economic-map")) {
    return { node_economic_map: nodeMap("Unit economy", "economy_status") };
  }
  if (pathname.includes("/community-domains/13/node-activity-map")) {
    return { node_activity_map: nodeMap("Unit activity", "activity_status") };
  }
  if (pathname.includes("/community-domains/13/node-domain-boundary-map")) {
    return { node_domain_boundary_map: nodeMap("Unit boundary", "domain_boundary_status") };
  }
  if (pathname.includes("/community-domains/13/node-scheduled-activity-map")) {
    return { node_scheduled_activity_map: nodeMap("Unit schedule", "schedule_status") };
  }
  if (pathname.includes("/community-domains/13/node-paid-activity-map")) {
    return { node_paid_activity_map: nodeMap("Unit paid activity", "paid_activity_status") };
  }
  if (pathname.includes("/community-domains/13/node-service-map")) {
    return { node_service_map: nodeMap("Unit service", "service_status") };
  }
  if (pathname.includes("/community-domains/13/node-privacy-map")) {
    return { node_privacy_map: nodeMap("Unit privacy", "privacy_status") };
  }
  if (pathname.includes("/community-domains/13/node-analytics-map")) {
    return { node_analytics_map: nodeMap("Unit analytics", "analytics_status") };
  }
  if (pathname.includes("/community-domains/13/node-communication-map")) {
    return { node_communication_map: nodeMap("Unit communication", "communication_status") };
  }
  if (pathname.includes("/community-domains/13/node-vault-map")) {
    return { node_vault_map: nodeMap("Unit vault", "vault_status") };
  }
  if (pathname.includes("/community-domains/13/node-evidence-authority-map")) {
    return {
      node_evidence_authority_map: nodeMap("Unit evidence authority", "evidence_authority_status"),
    };
  }
  if (pathname.includes("/community-domains/13/node-trust-map")) {
    return { node_trust_map: nodeMap("Unit trust", "trust_status") };
  }
  if (pathname.includes("/community-domains/13/node-participation-map")) {
    return { node_participation_map: nodeMap("Unit participation", "participation_status") };
  }

  if (pathname.includes("/community-domains/13/module-scope-readiness")) {
    return moduleScopeReadiness;
  }
  if (pathname.includes("/community-domains/13/service-settings")) return serviceSettings;
  if (pathname.includes("/community-domains/13/economic-participation")) {
    return { economic_participation: readinessMap("Economy") };
  }
  if (pathname.includes("/community-domains/13/network-presence")) {
    return { network_presence: readinessMap("Presence") };
  }
  if (pathname.includes("/community-domains/13/network-exchange-map")) {
    return { network_exchange_map: readinessMap("Exchange") };
  }
  if (pathname.includes("/community-domains/13/record-privacy-map")) {
    return { record_privacy_map: readinessMap("Privacy") };
  }
  if (pathname.includes("/community-domains/13/configuration-map")) {
    return { configuration_map: readinessMap("Setup") };
  }
  if (pathname.includes("/community-domains/13/compliance-map")) {
    return { compliance_map: readinessMap("Compliance") };
  }
  if (pathname.includes("/community-domains/13/appeal-readiness")) {
    return { appeal_readiness: readinessMap("Appeals") };
  }
  if (pathname.includes("/community-domains/13/evidence-record-readiness")) {
    return {
      evidence_record_readiness: {
        ...readinessMap("Evidence records"),
        record_types: [
          { record_type: "attendance", label: "Attendance", readiness_status: "ready" },
        ],
      },
    };
  }
  if (pathname.includes("/community-domains/13/evidence-release-readiness")) {
    return { evidence_release_readiness: readinessMap("Evidence release") };
  }
  if (pathname.includes("/community-domains/13/trust-relay-readiness")) {
    return { trust_relay_readiness: readinessMap("Trust relay") };
  }
  if (pathname.includes("/community-domains/13/notification-scope-readiness")) {
    return { notification_scope_readiness: readinessMap("Notification scope") };
  }
  if (pathname.includes("/community-domains/13/trust-mobility")) {
    return { trust_mobility: readinessMap("Trust mobility") };
  }
  if (pathname.includes("/community-domains/13/governance-coverage")) {
    return { governance_coverage: readinessMap("Governance") };
  }
  if (pathname.includes("/community-domains/13/delegation-map")) {
    return { delegation_map: readinessMap("Delegation") };
  }
  if (pathname.includes("/community-domains/13/member-verification-map")) {
    return memberVerificationMap;
  }
  if (pathname.includes("/community-domains/13/placement-summary")) {
    return placementSummary;
  }
  if (pathname.includes("/community-domains/13/beneficiary-outcomes")) {
    return {
      items: [
        {
          event_id: "outcome-audit-1",
          subject_user_id: 7,
          programme_label: "Skills support",
          outcome_indicator: "Training completion",
          outcome_state: "improved",
          beneficiary_confirmation: "beneficiary_confirmed",
          baseline_value: "Not enrolled",
          after_value: "Completed first cohort",
          latest_contact_consent_record: {
            event_id: "contact-audit-1",
            consent_basis: "beneficiary_consented",
          },
          contact_consent_status: {
            status: "active_attestation",
            manual_delivery_allowed: true,
          },
          latest_delivery_preparation: {
            event_id: "delivery-audit-1",
            active_contact_consent_status: "active_attestation",
          },
          latest_delivery_receipt: {
            event_id: "receipt-audit-1",
            delivery_event_id: "delivery-audit-1",
            channel: "whatsapp",
            delivery_status: "manual_sent",
            consent_basis: "beneficiary_consented",
            contact_consent_event_id: "contact-audit-1",
          },
        },
      ],
    };
  }
  if (pathname.includes("/community-domains/13/notices")) return { items: [] };
  if (pathname.includes("/community-domains/13/package-quote")) {
    return { quote: dashboard.package_quote };
  }
  if (pathname.includes("/community-domains/13/")) return {};
  if (pathname.includes("/community-domains/my")) {
    if (domainListScenario === "empty") {
      return { items: [] };
    }
    return {
      items: [
        {
          community_domain: dashboard.community_domain,
          membership: { role: "owner", status: "active" },
          viewer: { can_admin: true },
          dashboard_path: routePath,
        },
      ],
    };
  }
  if (pathname.includes("/clans/me")) {
    return {
      items: [
        {
          id: 1,
          clan_id: 1,
          name: "Audit Community",
          status: "active",
          role: "admin",
          member_role: "admin",
        },
      ],
    };
  }
  if (pathname.includes("/bank/expected")) return { items: [] };
  if (pathname.includes("/community-pay-in-accounts/1")) {
    return { configured: true, settlement: { bank_name: "Audit Bank" } };
  }

  return { items: [], results: [], data: [] };
}

async function mockApi(route) {
  const url = route.request().url();
  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  const pathname = new URL(url).pathname;
  handledApiPaths.push(pathname);
  await route.fulfill(json(pathPayload(pathname)));
}

function pageAudit() {
  const viewportW = window.innerWidth;
  const viewportH = window.innerHeight;
  const scrollingElement = document.scrollingElement || document.documentElement;
  const bodyText = document.body?.textContent || "";

  function parseColor(value) {
    const match = String(value || "").match(/rgba?\(([^)]+)\)/);
    if (!match) return null;
    const parts = match[1].split(",").map((part) => Number.parseFloat(part.trim()));
    return {
      r: parts[0],
      g: parts[1],
      b: parts[2],
      a: parts.length > 3 ? parts[3] : 1,
    };
  }

  function luminance(color) {
    const [r, g, b] = [color.r, color.g, color.b].map((channel) => {
      const value = channel / 255;
      return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function contrast(first, second) {
    const a = luminance(first);
    const b = luminance(second);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function backgroundFor(element) {
    let node = element;
    while (node && node.nodeType === 1) {
      const styles = getComputedStyle(node);
      if (styles.backgroundImage && styles.backgroundImage !== "none") return null;
      const color = parseColor(styles.backgroundColor);
      if (color && color.a > 0.35) return color;
      node = node.parentElement;
    }
    return parseColor(getComputedStyle(document.body).backgroundColor) || {
      r: 255,
      g: 255,
      b: 255,
      a: 1,
    };
  }

  const lowContrast = [];
  const overflow = [];

  for (const element of Array.from(document.querySelectorAll("body *"))) {
    const styles = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (
      rect.width <= 2 ||
      rect.height <= 2 ||
      styles.display === "none" ||
      styles.visibility === "hidden" ||
      Number(styles.opacity || 1) <= 0.05
    ) {
      continue;
    }

    const directText = Array.from(element.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent || "")
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    const explicitLabel =
      element.getAttribute("aria-label") ||
      element.getAttribute("placeholder") ||
      (element instanceof HTMLInputElement ? element.value : "");
    const label = (directText || explicitLabel || element.tagName)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 90);

    const isInVisibleVerticalRange = rect.bottom > 0 && rect.top < viewportH;
    const isFullyOffscreen = rect.right <= 0 || rect.left >= viewportW;
    if (
      (rect.left < -8 || rect.right > viewportW + 8) &&
      !isFullyOffscreen &&
      isInVisibleVerticalRange &&
      !["svg", "g", "path"].includes(element.tagName.toLowerCase())
    ) {
      overflow.push({
        tag: element.tagName,
        label,
        left: Math.round(rect.left),
        right: Math.round(rect.right),
        width: Math.round(rect.width),
      });
    }

    if (
      !isInVisibleVerticalRange ||
      !directText ||
      element.closest("button:disabled, [aria-disabled='true']")
    ) {
      continue;
    }

    const foreground = parseColor(styles.color);
    const background = backgroundFor(element);
    const fontSize = Number.parseFloat(styles.fontSize || "16");
    if (!foreground || !background || fontSize < 10) continue;

    const ratio = contrast(foreground, background);
    const weight = Number.parseInt(styles.fontWeight || "400", 10);
    const required = fontSize >= 24 || (fontSize >= 18 && weight >= 700) ? 3 : 4.5;
    if (ratio < required && ratio < 3) {
      lowContrast.push({
        tag: element.tagName,
        label,
        ratio: Number(ratio.toFixed(2)),
        top: Math.round(rect.top),
      });
    }
  }

  return {
    path: location.pathname + location.search,
    viewportW,
    viewportH,
    scrollW: scrollingElement.scrollWidth,
    scrollH: scrollingElement.scrollHeight,
    bodyText,
    horizontalOverflow: scrollingElement.scrollWidth > viewportW + 2,
    overflow: overflow.slice(0, 10),
    lowContrast: lowContrast.slice(0, 10),
  };
}

async function clickByDebugId(page, debugId) {
  await page.locator(`[data-cta-id="${debugId}"]`).first().click({ timeout: 10000 });
  await page.waitForTimeout(250);
}

async function isDebugVisible(page, debugId) {
  return page.locator(`[data-cta-id="${debugId}"]`).first().isVisible().catch(() => false);
}

async function firstViewportActionFinding(page, debugId, label) {
  return page.evaluate(
    ({ debugId: targetDebugId, label: targetLabel }) => {
      const element = document.querySelector(`[data-cta-id="${targetDebugId}"]`);
      if (!element) {
        return `${targetLabel} primary action is missing.`;
      }
      const rect = element.getBoundingClientRect();
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      if (!visible) {
        return `${targetLabel} primary action is not visible.`;
      }
      if (rect.top < 0 || rect.bottom > window.innerHeight) {
        return `${targetLabel} primary action is not fully inside the first viewport: top ${Math.round(
          rect.top
        )}, bottom ${Math.round(rect.bottom)}, viewport ${window.innerHeight}.`;
      }
      return "";
    },
    { debugId, label }
  );
}

async function viewportElementFinding(page, selector, label) {
  return page.evaluate(
    ({ targetSelector, targetLabel }) => {
      const element = document.querySelector(targetSelector);
      if (!element) {
        return `${targetLabel} is missing.`;
      }
      const rect = element.getBoundingClientRect();
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom > 0 &&
        rect.top < window.innerHeight;

      if (!visible) {
        return `${targetLabel} is not visible after the action.`;
      }
      if (rect.top < -2 || rect.top > Math.min(180, window.innerHeight * 0.24)) {
        return `${targetLabel} did not receive focus after the action: top ${Math.round(
          rect.top
        )}, viewport ${window.innerHeight}.`;
      }
      return "";
    },
    { targetSelector: selector, targetLabel: label }
  );
}

function normalized(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
const findings = [];
const pageErrors = [];

page.on("pageerror", (error) => pageErrors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") pageErrors.push(message.text());
});

await page.route("**/*", mockApi);
await page.addInitScript(() => {
  localStorage.setItem("access_token", "audit-token");
  localStorage.setItem("gmfn_auth_token", "audit-token");
  localStorage.setItem("token", "audit-token");
  localStorage.setItem("gmfn_role", "admin");
  localStorage.setItem("gmfn_current_id", "GMFN-U-0B5A2953");
  localStorage.setItem("gmfn_selected_clan_id", "1");
  localStorage.setItem("selected_clan_id", "1");
});

try {
  await page.goto(`${baseUrl}${purchaseRoutePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByText("Purchase Community Domain", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("2. Availability", { exact: true }).waitFor({ timeout: 10000 });

  let audit = await page.evaluate(pageAudit);
  if (await isDebugVisible(page, "community-domain-purchase.check-domain")) {
    findings.push("Purchase page demo still exposes the pre-check form after availability is returned.");
  }
  if (!(await isDebugVisible(page, "community-domain-purchase.create-draft"))) {
    findings.push("Purchase page availability review does not show the Create draft action.");
  }
  const purchaseReviewAction = await firstViewportActionFinding(
    page,
    "community-domain-purchase.create-draft",
    "Purchase page availability review"
  );
  if (purchaseReviewAction) findings.push(purchaseReviewAction);
  const purchaseText = normalized(audit.bodyText);
  for (const label of ["Available", "Domain details", "3. Draft & quote", "4. Payment"]) {
    if (!purchaseText.includes(label)) {
      findings.push(`Purchase page availability review is missing ${label}.`);
    }
  }
  const exposedEngineCards = await Promise.all(
    ["Governance", "Trust record", "Network reach", "Opportunity"].map((label) =>
      page.getByText(label, { exact: true }).first().isVisible().catch(() => false)
    )
  );
  if (exposedEngineCards.some(Boolean)) {
    findings.push("Purchase page mobile hero still exposes the four engine explanation cards.");
  }
  if (await isDebugVisible(page, "community-domain-purchase.open-create-community")) {
    findings.push("Purchase page mobile exposes the Committee alternative before opening Other paths.");
  }
  if (await isDebugVisible(page, "community-domain-purchase.lookup-existing-domain")) {
    findings.push("Purchase page mobile exposes the existing-domain lookup before opening Other paths.");
  }
  if (!(await isDebugVisible(page, "community-domain-purchase.other-paths"))) {
    findings.push("Purchase page mobile does not expose the collapsed Other paths drawer.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Purchase page mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }
  if (audit.lowContrast.length) {
    findings.push(`Purchase page possible low contrast: ${JSON.stringify(audit.lowContrast)}`);
  }
  await clickByDebugId(page, "community-domain-purchase.other-paths");
  if (!(await isDebugVisible(page, "community-domain-purchase.open-create-community"))) {
    findings.push("Purchase page Other paths drawer does not reveal the free Committee path.");
  }
  if (!(await isDebugVisible(page, "community-domain-purchase.lookup-existing-domain"))) {
    findings.push("Purchase page Other paths drawer does not reveal existing-domain lookup.");
  }

  domainListScenario = "empty";
  await page.goto(`${baseUrl}/app/community-domain`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  await page.getByText("Choose a Path", { exact: true }).waitFor({
    timeout: 10000,
  });
  if (!(await isDebugVisible(page, "community-domain-dashboard.selector.free-committee"))) {
    findings.push("Community Domain selector empty state does not expose the free Committee path.");
  }
  audit = await page.evaluate(pageAudit);
  if (!(await isDebugVisible(page, "community-domain-dashboard.selector.setup-new"))) {
    findings.push("Community Domain selector empty state does not expose the buy-domain path.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.selector.my-domains"))) {
    findings.push("Community Domain selector empty state does not expose My Domains as a quick action.");
  }
  const selectorFirstAction = await firstViewportActionFinding(
    page,
    "community-domain-dashboard.selector.free-committee",
    "Community Domain selector"
  );
  if (selectorFirstAction) findings.push(selectorFirstAction);
  if (await isDebugVisible(page, "community-domain-dashboard.selector.find-edit-domain")) {
    findings.push("Community Domain selector exposes edit lookup before the user chooses edit.");
  }
  if (await isDebugVisible(page, "community-domain-dashboard.empty.purchase")) {
    findings.push("Community Domain selector empty state repeats a second purchase action.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Community Domain selector mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }
  await clickByDebugId(page, "community-domain-dashboard.selector.edit-existing-focus");
  if (!(await isDebugVisible(page, "community-domain-dashboard.selector.find-edit-domain"))) {
    findings.push("Community Domain selector edit path does not reveal the domain lookup.");
  }
  await clickByDebugId(page, "community-domain-dashboard.selector.back-to-choice");
  if (await isDebugVisible(page, "community-domain-dashboard.selector.find-edit-domain")) {
    findings.push("Community Domain selector keeps edit lookup visible after returning to choices.");
  }

  dashboardScenario = "draft";
  domainListScenario = "owned";
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByText("Domain command", { exact: true }).waitFor({ timeout: 10000 });
  audit = await page.evaluate(pageAudit);
  let commandText = normalized(audit.bodyText);
  if (!commandText.includes("Complete the next setup step")) {
    findings.push("Draft Community Domain command does not show setup-first guidance.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.command-guidance-toggle"))) {
    findings.push("Draft Community Domain command does not expose an open-close guidance control.");
  }
  if (commandText.includes("Do first") || commandText.includes("Boundary")) {
    findings.push("Draft Community Domain command shows read-only guidance before the user opens it.");
  }
  await clickByDebugId(page, "community-domain-dashboard.command-guidance-toggle");
  audit = await page.evaluate(pageAudit);
  commandText = normalized(audit.bodyText);
  if (!commandText.includes("Do first") || !commandText.includes("Boundary")) {
    findings.push("Draft Community Domain command guidance does not open the first action and boundary notes.");
  }
  await page.waitForTimeout(450);
  await clickByDebugId(page, "community-domain-dashboard.command-guidance-toggle");
  audit = await page.evaluate(pageAudit);
  commandText = normalized(audit.bodyText);
  if (commandText.includes("Do first") || commandText.includes("Boundary")) {
    findings.push("Draft Community Domain command guidance does not close after reading.");
  }
  const draftFirstAction = await firstViewportActionFinding(
    page,
    "community-domain-dashboard.setup-focus",
    "Draft Community Domain dashboard"
  );
  if (draftFirstAction) findings.push(draftFirstAction);
  if (await isDebugVisible(page, "community-domain-dashboard.advanced-tools-toggle")) {
    findings.push("Draft Community Domain dashboard exposes Other domain tools before setup is opened.");
  }
  if (await isDebugVisible(page, "community-domain-dashboard.lane.modules")) {
    findings.push("Draft Community Domain dashboard exposes operating areas before setup is opened.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Draft Community Domain dashboard mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }
  await clickByDebugId(page, "community-domain-dashboard.setup-focus");
  await page.getByRole("heading", { name: "Create Community Domain" }).waitFor({ timeout: 10000 });
  await page
    .locator('[data-cta-id="community-domain-dashboard.setup-check-domain-name"]')
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  const draftSetupSurfaceFinding = await viewportElementFinding(
    page,
    '[data-testid="community-domain-dashboard.work-surface"]',
    "Draft Community Domain setup workbench"
  );
  if (draftSetupSurfaceFinding) findings.push(draftSetupSurfaceFinding);
  audit = await page.evaluate(pageAudit);
  const draftSetupText = normalized(audit.bodyText);
  if (draftSetupText.includes("Create / setup")) {
    findings.push("Draft Community Domain setup workbench still shows the old repeated Create / setup label.");
  }
  if (!draftSetupText.includes("Setup workbench")) {
    findings.push("Draft Community Domain setup workbench does not show the guided setup label.");
  }
  if (!draftSetupText.includes("Step 1 of")) {
    findings.push("Draft Community Domain setup workbench does not show one setup step at a time.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.setup-check-domain-name"))) {
    findings.push("Draft Community Domain setup workbench does not show the first setup task.");
  }
  if (draftSetupText.includes("Other domain tools")) {
    findings.push("Draft Community Domain setup workbench exposes Other domain tools during the primary setup journey.");
  }
  if (
    draftSetupText.includes("Official Board") ||
    draftSetupText.includes("Community Domain engine") ||
    draftSetupText.includes("Work lanes") ||
    draftSetupText.includes("Operating areas")
  ) {
    findings.push("Draft Community Domain setup workbench exposes advanced dashboard blocks during setup.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Draft Community Domain setup workbench mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }

  dashboardScenario = "active";
  domainListScenario = "owned";
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByText("Domain command", { exact: true }).waitFor({ timeout: 10000 });

  audit = await page.evaluate(pageAudit);
  commandText = normalized(audit.bodyText);
  if (!commandText.includes("Run one operating area at a time")) {
    findings.push("Domain command does not show the focused operating-area guidance.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.command-guidance-toggle"))) {
    findings.push("Domain command does not expose an open-close guidance control.");
  }
  if (commandText.includes("Do first") || commandText.includes("Boundary")) {
    findings.push("Domain command shows read-only guidance before the user opens it.");
  }
  await clickByDebugId(page, "community-domain-dashboard.command-guidance-toggle");
  audit = await page.evaluate(pageAudit);
  commandText = normalized(audit.bodyText);
  if (!commandText.includes("Do first") || !commandText.includes("Boundary")) {
    findings.push("Domain command guidance does not open the first action and boundary notes.");
  }
  await page.waitForTimeout(450);
  await clickByDebugId(page, "community-domain-dashboard.command-guidance-toggle");
  audit = await page.evaluate(pageAudit);
  commandText = normalized(audit.bodyText);
  if (commandText.includes("Do first") || commandText.includes("Boundary")) {
    findings.push("Domain command guidance does not close after reading.");
  }
  const dashboardFirstAction = await firstViewportActionFinding(
    page,
    "community-domain-dashboard.open-marketplace",
    "Community Domain dashboard"
  );
  if (dashboardFirstAction) findings.push(dashboardFirstAction);
  if (!commandText.includes("Open Marketplace")) {
    findings.push("Active Community Domain dashboard does not expose Marketplace as the primary handoff.");
  }
  if (!commandText.includes("Open Members")) {
    findings.push("Active Community Domain dashboard does not expose the deterministic Open Members live-area shortcut.");
  }
  if (commandText.includes("Open operating areas")) {
    findings.push("Active Community Domain dashboard exposes broad Open operating areas wording on the first command surface.");
  }
  if (!commandText.includes("Record activity")) {
    findings.push("Active Community Domain dashboard does not expose the deterministic Record activity shortcut.");
  }
  if (commandText.includes("Record from real life")) {
    findings.push("Active Community Domain dashboard exposes broad Record from real life wording on the first command surface.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.nav.dashboard"))) {
    findings.push("Active Community Domain dashboard does not expose the Dashboard route escape.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.nav.community-home"))) {
    findings.push("Active Community Domain dashboard does not expose the Community Home route escape.");
  }
  if (commandText.includes("Edit setup details")) {
    findings.push("Active Community Domain dashboard exposes setup editing on the first command surface.");
  }
  if (commandText.includes("Other domain tools")) {
    findings.push("Active Community Domain dashboard exposes Other domain tools before operating areas are opened.");
  }
  if (commandText.includes("Safe next step")) {
    findings.push("Generic Safe next step card is visible on initial Community Domain surface.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Initial mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }
  await page.screenshot({
    path: join(screenshotDir, "community-domain-active-initial-390x844.png"),
    fullPage: false,
  });

  await page.goto(`${baseUrl}${routePath}?lane=settings`, {
    waitUntil: "networkidle",
    timeout: 15000,
  });
  await page.getByText("Operating summary", { exact: true }).waitFor({ timeout: 10000 });
  audit = await page.evaluate(pageAudit);
  let settingsSummaryText = normalized(audit.bodyText);
  if (
    settingsSummaryText.includes(
      "Pillar-style Community Domains should use live operating areas first after activation"
    ) ||
    settingsSummaryText.includes("Boundary: active does not mean verified")
  ) {
    findings.push("Active Community Domain settings summary exposes operating notes before the user opens them.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.operating-summary-notes-toggle"))) {
    findings.push("Active Community Domain settings summary does not expose an open-close notes control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.operating-summary-notes-toggle");
  audit = await page.evaluate(pageAudit);
  settingsSummaryText = normalized(audit.bodyText);
  if (
    !settingsSummaryText.includes(
      "Pillar-style Community Domains should use live operating areas first after activation"
    ) ||
    !settingsSummaryText.includes("Boundary: active does not mean verified")
  ) {
    findings.push("Active Community Domain settings summary notes do not open when requested.");
  }
  await page.waitForTimeout(450);
  await clickByDebugId(page, "community-domain-dashboard.operating-summary-notes-toggle");
  audit = await page.evaluate(pageAudit);
  settingsSummaryText = normalized(audit.bodyText);
  if (
    settingsSummaryText.includes(
      "Pillar-style Community Domains should use live operating areas first after activation"
    ) ||
    settingsSummaryText.includes("Boundary: active does not mean verified")
  ) {
    findings.push("Active Community Domain settings summary notes do not close after reading.");
  }
  await clickByDebugId(page, "community-domain-dashboard.operating-summary-group.reference");
  await clickByDebugId(page, "community-domain-dashboard.operating-summary.permissions");
  await page.getByText("Domain permissions", { exact: true }).waitFor({ timeout: 10000 });

  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByText("Domain command", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.operational-focus");
  await page.getByText("Live area", { exact: true }).waitFor({ timeout: 10000 });
  if (!(await isDebugVisible(page, "community-domain-dashboard.work-surface.back-to-command"))) {
    findings.push("Opened Community Domain work surface does not expose Back to command.");
  }
  audit = await page.evaluate(pageAudit);
  if (normalized(audit.bodyText).includes("Close areas")) {
    findings.push("Opened Community Domain work surface still exposes duplicate Close areas control.");
  }
  let liveAreaText = normalized(audit.bodyText);
  if (liveAreaText.includes("Operating view only. It does not verify ownership")) {
    findings.push("Opened Community Domain work surface exposes area boundary notes before the user opens them.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.work-surface.notes-toggle"))) {
    findings.push("Opened Community Domain work surface does not expose an open-close area notes control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.work-surface.notes-toggle");
  audit = await page.evaluate(pageAudit);
  liveAreaText = normalized(audit.bodyText);
  if (!liveAreaText.includes("Operating view only. It does not verify ownership")) {
    findings.push("Opened Community Domain work surface notes do not open when requested.");
  }
  await page.waitForTimeout(450);
  await clickByDebugId(page, "community-domain-dashboard.work-surface.notes-toggle");
  audit = await page.evaluate(pageAudit);
  liveAreaText = normalized(audit.bodyText);
  if (liveAreaText.includes("Operating view only. It does not verify ownership")) {
    findings.push("Opened Community Domain work surface notes do not close after reading.");
  }
  await clickByDebugId(page, "community-domain-dashboard.work-surface.back-to-command");
  await page.getByText("Returned to Domain command.", { exact: false }).waitFor({ timeout: 10000 });
  if (await isDebugVisible(page, "community-domain-dashboard.work-surface.back-to-command")) {
    findings.push("Back to command did not close the opened Community Domain work surface.");
  }
  const commandReturnFinding = await viewportElementFinding(
    page,
    "#community-domain-official-board",
    "Community Domain command return"
  );
  if (commandReturnFinding) findings.push(commandReturnFinding);
  await clickByDebugId(page, "community-domain-dashboard.operational-focus");
  await page.getByText("Live area", { exact: true }).waitFor({ timeout: 10000 });

  await clickByDebugId(page, "community-domain-dashboard.operating-area-picker-toggle");
  await page.getByText("Operating areas", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.lane.modules");
  await page.getByText("Services focus", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.service-group.local");
  await page.getByText("Local service planning", { exact: true }).waitFor({ timeout: 10000 });
  if (await page.getByText("Marketplace rule", { exact: true }).isVisible().catch(() => false)) {
    findings.push("Community Domain Services local maps still expose the marketplace/package rule card.");
  }
  if (await isDebugVisible(page, "community-domain-dashboard.service-detail.boundaries")) {
    findings.push("Community Domain Services packet buttons are visible before Change packet is opened.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.service-packet-toggle"))) {
    findings.push("Community Domain Services multi-packet groups do not expose a Change packet control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.service-packet-toggle");
  await clickByDebugId(page, "community-domain-dashboard.service-detail.boundaries");
  if (!(await page.getByText("Marketplace rule", { exact: true }).isVisible().catch(() => false))) {
    findings.push("Community Domain Services Boundaries packet does not expose the marketplace/package rule card.");
  }
  if (await isDebugVisible(page, "community-domain-dashboard.service-detail.local")) {
    findings.push("Community Domain Services packet buttons stay visible after a packet is selected.");
  }
  await page.getByText("Boundary packet", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-service-boundary.focus.privacy");
  await page.getByText("Record privacy readiness", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.service-group.trust");
  await clickByDebugId(page, "community-domain-dashboard.service-packet-toggle");
  await clickByDebugId(page, "community-domain-dashboard.service-detail.evidence");
  await page.getByText("Trust and evidence packet", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain.trust-evidence.focus.release");
  await page.getByText("Evidence release readiness", { exact: true }).waitFor({ timeout: 10000 });

  await clickByDebugId(page, "community-domain-dashboard.operating-area-picker-toggle");
  await page.getByText("Operating areas", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.lane.structure");
  await page.getByText("Structure focus", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.structure-group.rollout");
  if (await isDebugVisible(page, "community-domain-dashboard.structure-detail.planning")) {
    findings.push("Community Domain Structure packet buttons are visible before Change packet is opened.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.structure-packet-toggle"))) {
    findings.push("Community Domain Structure multi-packet groups do not expose a Change packet control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.structure-packet-toggle");
  await clickByDebugId(page, "community-domain-dashboard.structure-detail.planning");
  if (await isDebugVisible(page, "community-domain-dashboard.structure-detail.activity")) {
    findings.push("Community Domain Structure packet buttons stay visible after a packet is selected.");
  }
  await page.getByText("Planning packet", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain.structure-planning.focus.groups");
  await page.getByText("Group readiness", { exact: true }).waitFor({ timeout: 10000 });

  await clickByDebugId(page, "community-domain-dashboard.operating-area-picker-toggle");
  await page.getByText("Operating areas", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.lane.members");
  await page.getByText("Members focus", { exact: true }).waitFor({ timeout: 10000 });
  if (await isDebugVisible(page, "community-domain-dashboard.member-detail.placement")) {
    findings.push("Community Domain Members packet buttons are visible before Change packet is opened.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.member-packet-toggle"))) {
    findings.push("Community Domain Members multi-packet groups do not expose a Change packet control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.member-packet-toggle");
  await clickByDebugId(page, "community-domain-dashboard.member-detail.placement");
  if (await isDebugVisible(page, "community-domain-dashboard.member-detail.readiness")) {
    findings.push("Community Domain Members packet buttons stay visible after a packet is selected.");
  }
  await clickByDebugId(page, "community-domain-dashboard.member-group.roster");
  await page.getByText("Member status and public proof.", { exact: true }).waitFor({
    timeout: 10000,
  });
  await clickByDebugId(page, "community-domain-dashboard.member-roster.members");
  await page
    .getByText("No Community Domain members were returned for this roster view.", { exact: true })
    .waitFor({ timeout: 10000 });

  await clickByDebugId(page, "community-domain-dashboard.operating-area-picker-toggle");
  await page.getByText("Operating areas", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.lane.governance");
  await page.getByText("Governance jobs", { exact: true }).waitFor({ timeout: 10000 });
  await clickByDebugId(page, "community-domain-dashboard.governance-group.records");
  if (await isDebugVisible(page, "community-domain-dashboard.governance-task.access_requests")) {
    findings.push("Community Domain Governance job buttons are visible before Change job is opened.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.governance-task-toggle"))) {
    findings.push("Community Domain Governance multi-job groups do not expose a Change job control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.governance-task-toggle");
  await clickByDebugId(page, "community-domain-dashboard.governance-task.real_life_record");
  if (await isDebugVisible(page, "community-domain-dashboard.governance-task.access_requests")) {
    findings.push("Community Domain Governance job buttons stay visible after a job is selected.");
  }
  await page
    .getByTestId("community-domain-dashboard.work-surface")
    .getByText("Record from real life", { exact: true })
    .waitFor({ timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.real-life-record.beneficiary-outcome-inline"
    )
  ) {
    findings.push(
      "Community Domain real-life record types are visible before Change record type is opened."
    );
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.real-life-record.type-toggle"))) {
    findings.push("Community Domain real-life record type switcher is missing.");
  }
  if (await isDebugVisible(page, "community-domain-dashboard.activity-record-stage.evidence")) {
    findings.push("Community Domain Activity record steps are visible before Change step is opened.");
  }
  if (!(await isDebugVisible(page, "community-domain-dashboard.activity-record-stage-toggle"))) {
    findings.push("Community Domain Activity record staged capture is missing a Change step control.");
  }
  await clickByDebugId(page, "community-domain-dashboard.activity-record-stage-toggle");
  await clickByDebugId(page, "community-domain-dashboard.activity-record-stage.evidence");
  await page.getByPlaceholder("Evidence reference").waitFor({ timeout: 10000 });
  if (await isDebugVisible(page, "community-domain-dashboard.activity-record-stage.person")) {
    findings.push("Community Domain Activity record step buttons stay visible after selecting a step.");
  }
  await clickByDebugId(page, "community-domain-dashboard.real-life-record.type-toggle");
  await clickByDebugId(
    page,
    "community-domain-dashboard.real-life-record.beneficiary-outcome-inline"
  );
  if (await isDebugVisible(page, "community-domain-dashboard.real-life-record.activity-inline")) {
    findings.push("Community Domain real-life record types stay visible after selecting a type.");
  }
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-record-stage.proof"
    )
  ) {
    findings.push(
      "Community Domain Beneficiary outcome record steps are visible before Change step is opened."
    );
  }
  if (
    !(await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-record-stage-toggle"
    ))
  ) {
    findings.push(
      "Community Domain Beneficiary outcome staged capture is missing a Change step control."
    );
  }
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-record-stage-toggle"
  );
  await clickByDebugId(page, "community-domain-dashboard.beneficiary-outcome-record-stage.proof");
  await page.getByText("Record outcome", { exact: true }).waitFor({ timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-record-stage.person"
    )
  ) {
    findings.push(
      "Community Domain Beneficiary outcome record step buttons stay visible after selecting a step."
    );
  }
  await clickByDebugId(page, "community-domain-dashboard.beneficiary-outcome-task.recent");
  await page.getByText("Recent outcomes", { exact: true }).waitFor({ timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-recent-packet.receipt"
    )
  ) {
    findings.push(
      "Community Domain Recent outcome packet buttons are visible before Change packet is opened."
    );
  }
  if (
    !(await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-recent-packet-toggle"
    ))
  ) {
    findings.push(
      "Community Domain Recent outcome packets are missing a Change packet control."
    );
  }
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-recent-packet-toggle"
  );
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-recent-packet.contact"
  );
  await page
    .locator(
      '[data-cta-id="community-domain-dashboard.beneficiary-outcome-contact-consent"]'
    )
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-contact-consent-withdrawal"
    )
  ) {
    findings.push(
      "Community Domain Contact packet shows consent withdrawal before Change contact action is opened."
    );
  }
  if (
    !(await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-contact-action-toggle"
    ))
  ) {
    findings.push(
      "Community Domain Contact packet is missing a Change contact action control."
    );
  }
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-contact-action-toggle"
  );
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-contact-action.withdraw"
  );
  await page
    .locator(
      '[data-cta-id="community-domain-dashboard.beneficiary-outcome-contact-consent-withdrawal"]'
    )
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-contact-consent"
    )
  ) {
    findings.push(
      "Community Domain Contact packet still shows record contact/consent after selecting withdrawal."
    );
  }
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-recent-packet-toggle"
  );
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-recent-packet.receipt"
  );
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-delivery-receipt-correction"
    )
  ) {
    findings.push(
      "Community Domain Receipt packet shows the correction form before Open receipt form."
    );
  }
  if (
    !(await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-receipt-form-toggle"
    ))
  ) {
    findings.push(
      "Community Domain Receipt packet is missing an Open receipt form control."
    );
  }
  await clickByDebugId(
    page,
    "community-domain-dashboard.beneficiary-outcome-receipt-form-toggle"
  );
  await page
    .locator(
      '[data-cta-id="community-domain-dashboard.beneficiary-outcome-delivery-receipt-correction"]'
    )
    .first()
    .waitFor({ state: "visible", timeout: 10000 });
  if (
    await isDebugVisible(
      page,
      "community-domain-dashboard.beneficiary-outcome-recent-packet.summary"
    )
  ) {
    findings.push(
      "Community Domain Recent outcome packet buttons stay visible after selecting a packet."
    );
  }

  audit = await page.evaluate(pageAudit);
  const finalText = normalized(audit.bodyText);
  if (finalText.includes("Safe next step") || finalText.includes("Review this lane first")) {
    findings.push("Generic lane filler text returned after opening focused packets.");
  }
  if (audit.horizontalOverflow || audit.overflow.length) {
    findings.push(`Focused packet mobile overflow: ${JSON.stringify(audit.overflow)}`);
  }
  if (audit.lowContrast.length) {
    findings.push(`Focused packet possible low contrast: ${JSON.stringify(audit.lowContrast)}`);
  }
  if (audit.scrollH > audit.viewportH * 7) {
    findings.push(
      `Focused Community Domain surface is too long: ${audit.scrollH}px on ${audit.viewportH}px viewport`
    );
  }
  await page.screenshot({
    path: join(screenshotDir, "community-domain-focused-lane-390x844.png"),
    fullPage: false,
  });
} catch (error) {
  let debugText = "";
  try {
    debugText = normalized(await page.locator("body").textContent({ timeout: 2000 })).slice(0, 1800);
  } catch {
    debugText = "Body text was not readable.";
  }
  findings.push(
    `Community Domain mobile visual audit failed: ${error.message}. API paths: ${[
      ...new Set(handledApiPaths),
    ].join(", ")}. Body: ${debugText}`
  );
}

await browser.close();

if (pageErrors.length) {
  findings.push(`Console/page errors: ${pageErrors.slice(0, 6).join(" | ")}`);
}

if (findings.length) {
  console.error("Community Domain mobile visual audit found review items:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log("Community Domain mobile visual audit passed.");
