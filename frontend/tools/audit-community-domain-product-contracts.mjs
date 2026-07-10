/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const frontendRoot = join(toolDir, "..");

const findings = [];

function readFromRoot(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFromFrontend(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(rootedPath, pattern, message, options = {}) {
  const text = options.frontend
    ? readFromFrontend(rootedPath)
    : readFromRoot(rootedPath);

  if (!pattern.test(text)) {
    findings.push({
      file: rootedPath,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertNotContains(rootedPath, pattern, message, options = {}) {
  const text = options.frontend
    ? readFromFrontend(rootedPath)
    : readFromRoot(rootedPath);

  text.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: rootedPath,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "docs/PROJECT_PROTOCOL.md",
  /Committee, Community, and Community Domain[\s\S]*?\*\*Committee\*\*[\s\S]*?future product language for the lightweight[\s\S]*?\*\*Community Domain\*\* means the institutional\/paid domain layer[\s\S]*?Purchase Community Domain[\s\S]*?Do not call the institutional object a `Community Package`/,
  "Project protocol must keep lightweight Committee compatibility and institutional Community Domain separate."
);

assertContains(
  "docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md",
  /Create Committee[\s\S]*?Purchase Community Domain[\s\S]*?Existing `Create Community` compatibility surfaces[\s\S]*?free\/self-created committee path must stay separate from[\s\S]*?institutional Community Domain SaaS path/,
  "Canonical skeleton must keep the lightweight committee path separate from the institutional Community Domain path."
);

assertContains(
  "docs/SCREEN_REGISTRY.md",
  /Pre-auth Screens[\s\S]*CommunityDomainPurchasePage[\s\S]*Authenticated Screens[\s\S]*CommunityDomainDashboardPage/,
  "Community Domain purchase and dashboard screens must remain registered before implementation."
);

assertContains(
  "src/App.tsx",
  /CommunityDomainDashboardPage[\s\S]*path="community-domain"[\s\S]*path="community-domains"[\s\S]*path="community-domain\/:communityDomainId"[\s\S]*path="community-domains\/:communityDomainId"/,
  "Authenticated app routes must expose the Community Domain dashboard without replacing Community Home.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /listMyCommunityDomains[\s\S]*lazy\([\s\S]*import\("\.\/communityDomainDashboard\/DomainSelectorPanel"\)[\s\S]*domainItems[\s\S]*setDomainItems[\s\S]*CommunityDomainSelectorPanel[\s\S]*domainItems=\{domainItems\}/,
  "Community Domain dashboard page must lazy-load a signed-in selector and pass the current user's domain memberships into it.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /FALLBACK_TEMPLATES[\s\S]*school_multi_branch[\s\S]*church_religious_body[\s\S]*union_professional_body[\s\S]*market_cooperative[\s\S]*family_town_union_diaspora[\s\S]*hospital_health_body[\s\S]*ngo_project_network[\s\S]*generic_association/,
  "Community Domain purchase fallback templates must include the approved society types, including NGO/project network for charity pilots.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /listMyCommunityDomains[\s\S]*errorDetailMessage[\s\S]*could not load your Community Domains[\s\S]*getCommunityDomainDashboard[\s\S]*errorDetailMessage[\s\S]*could not open this Community Domain dashboard[\s\S]*refreshQuote[\s\S]*errorDetailMessage[\s\S]*could not refresh the package quote/,
  "Community Domain dashboard selector, dashboard-load, and package quote failures must parse structured backend detail before falling back to plain recovery copy.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/DomainSelectorPanel.tsx",
  /No Community Domains yet[\s\S]*community-domain-dashboard\.empty\.purchase[\s\S]*community-domain-dashboard\.empty\.community-home[\s\S]*Your Community Domains[\s\S]*Domain: \{compactStatus\(itemDomain\.status\)\}[\s\S]*Verification: \{compactStatus\(itemDomain\.verification_status\)\}[\s\S]*Open dashboard/,
  "Lazy Community Domain selector panel must expose safe domain and verification status, opening links, and empty-state recovery.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /community-domain-dashboard\.selector\.open-|community-domain-dashboard\.empty\.purchase|community-domain-dashboard\.empty\.community-home/,
  "Community Domain dashboard parent must not own selector card or empty-state action rendering after handing domain memberships to the lazy selector panel.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/DashboardRecoveryPanel.tsx",
  /Cannot load domains[\s\S]*Your Community Domains could not be loaded[\s\S]*community-domain-dashboard\.error\.retry-selector[\s\S]*Try again[\s\S]*community-domain-dashboard\.error\.community-home[\s\S]*community-domain-dashboard\.error\.purchase/,
  "Lazy Community Domain dashboard recovery panel must describe selector load failures and offer retry, Community Home, and purchase recovery.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /getCommunityDomainDashboard[\s\S]*setupPrimaryActionHasLane[\s\S]*hasServicesLane[\s\S]*setupPrimaryActionLaneKey === "verification"[\s\S]*\? "modules"[\s\S]*primaryActionFallbackNote[\s\S]*authority verification is shown there as a readiness row[\s\S]*separate owner or admin path[\s\S]*Open the \{primaryActionLaneLabel\} lane[\s\S]*deeper changes still use[\s\S]*owner\/admin tools that check permissions[\s\S]*does not create payment steps[\s\S]*verify ownership/,
  "Community Domain dashboard page must use the scoped backend summary, route authority-verification readiness to Services instead of an unrelated lane, and keep payment, activation, and verification boundaries honest.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /backend-scoped tools|backend permissions/,
  "Community Domain dashboard user copy must not expose builder-facing backend language.",
  { frontend: true }
);

[
  "src/pages/CommunityDomainDashboardPage.tsx",
  "src/pages/communityDomainDashboard/AccessRequestsPanel.tsx",
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/DashboardRecoveryPanel.tsx",
  "src/pages/communityDomainDashboard/DomainSelectorPanel.tsx",
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/LaneSelectorPanel.tsx",
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/SetupIntelligenceCards.tsx",
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  "src/pages/communityDomainDashboard/StructurePreviewPanel.tsx",
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/statusLanguage.ts",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    /letterSpacing:\s*(?:"0\.[1-9][0-9]*em"|(?:0\.[1-9][0-9]*|[1-9][0-9.]*))/,
    "Community Domain surfaces must not use spaced-out micro-label typography.",
    { frontend: true }
  );
});

[
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
].forEach((relativePath) => {
  assertNotContains(
    relativePath,
    /gridTemplateColumns: "minmax\(0, 1fr\) auto"/,
    "Community Domain readiness status rows must stay stacked on phone instead of squeezing copy beside status pills.",
    { frontend: true }
  );
});

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /function statusBadge[\s\S]*compactStatus\(status\)\.toLowerCase\(\)[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\)"[\s\S]*justifySelf: "start"[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\) auto"/,
  "Community Domain node projection status rows must stay stacked while the projection-group header may keep its compact two-column disclosure layout.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /This view only shows local|This view only shows domain-boundary|This view only shows member placement|private member records|create records/,
  "Community Domain node projection boundary notes must stay concise and user-facing instead of returning to long legal-style lists.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /function laneDisplayLabel[\s\S]*key === "modules"[\s\S]*return "Services"[\s\S]*const primaryActionLaneLabel = laneDisplayLabel\(primaryActionLane, "work"\)[\s\S]*\{laneDisplayLabel\(selectedLane, "Community Domain setup"\)\}/,
  "Community Domain dashboard parent must show service language for primary and opened modules-lane labels without changing internal lane keys.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /Check exchange, privacy, setup, compliance, and appeal boundaries[\s\S]*Renewal period and payment step are not set up here/,
  "Community Domain dashboard visible notes must use setup wording for service boundaries and billing steps.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /Check exchange, privacy, configuration|not configured here/,
  "Community Domain dashboard visible copy must use setup language instead of configuration/configured wording.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /packageReviewActionLabel[\s\S]*Review package details[\s\S]*Review package quote[\s\S]*Why package details are owner-only[\s\S]*Why quote review is owner-only[\s\S]*Only a Community Domain owner or domain admin can review the package details[\s\S]*Only a Community Domain owner or domain admin can review the package quote/,
  "Community Domain dashboard billing action must not imply a non-admin can send an owner package or quote review request.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /billingIsActive[\s\S]*packageReviewActionLabel[\s\S]*Review package details[\s\S]*Billing status:[\s\S]*status\.billing_status \|\| selectedLane\?\.status[\s\S]*Quote details remain available for reference[\s\S]*Package quote:[\s\S]*\{packageReviewActionLabel\}/,
  "Community Domain dashboard billing lane must lead with dashboard billing state and keep package quote details as reference when billing is active.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/BillingReadinessPanels"\)[\s\S]*getCommunityDomainCapacityPlan[\s\S]*capacityPlan[\s\S]*CommunityDomainBillingReadinessPanels[\s\S]*subscriptionLifecycle=\{subscriptionLifecycle\}[\s\S]*capacityPlan=\{capacityPlan\}/,
  "Community Domain dashboard Billing lane must lazy-load read-only billing readiness panels and pass only raw billing/capacity maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /subscriptionReadyTotal|visibleSubscriptionLanes|blockedSubscriptionLanes|subscriptionPackage|subscriptionSummary|visibleCapacityLanes|attentionCapacityLanes/,
  "Community Domain dashboard parent must not precompute Billing lane subscription or capacity summaries, ready totals, lane lists, or attention lists before handing raw maps to the lazy Billing component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /function readinessLanes[\s\S]*function blockedLanes[\s\S]*function readyTotal[\s\S]*function attentionCapacityLanes[\s\S]*subscriptionLifecycle\?\.summary[\s\S]*subscriptionLifecycle\?\.package[\s\S]*readinessLanes\(subscriptionLifecycle\)[\s\S]*readinessLanes\(capacityPlan\)[\s\S]*attentionCapacityLanes\(visibleCapacityLanes\)/,
  "Lazy Community Domain Billing readiness component must derive subscription summary, package, lanes, blocked rows, ready total, and capacity attention lanes from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /BILLING_DETAIL_OPTIONS[\s\S]*key: "lifecycle"[\s\S]*key: "capacity"[\s\S]*activeBillingDetail[\s\S]*community-domain-billing\.detail\.\$\{option\.key\}[\s\S]*activeBillingDetail === "lifecycle"[\s\S]*Subscription lifecycle[\s\S]*activeBillingDetail === "capacity"[\s\S]*Package capacity/,
  "Community Domain Billing readiness panel must expose one focused billing packet at a time instead of dumping lifecycle and capacity together.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/statusLanguage.ts",
  /configured: "not set up yet"[\s\S]*connected: "not connected yet"[\s\S]*created: "not created yet"[\s\S]*recorded: "not recorded yet"[\s\S]*replace\(\s*\/\[-_\]\+\/g,\s*" "\s*\)[\s\S]*replace\(\s*\/\\s\+\/g,\s*" "\s*\)[\s\S]*normalized\.toLowerCase\(\) === "not configured"[\s\S]*return "not set up yet"[\s\S]*normalized\.match\(/,
  "Community Domain status language helper must normalize raw snake-case or hyphenated slice statuses before they reach user-facing panels.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/statusLanguage.ts",
  /not configured yet/,
  "Community Domain status language must use setup wording instead of configuration wording.",
  { frontend: true }
);

assertNotContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /\bin this slice\b/,
  "Community Domain backend summaries and boundaries must not send builder-language 'in this slice' copy to user-facing panels.",
);

assertNotContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /This endpoint|later endpoint/,
  "Community Domain backend summaries and boundaries must use user-facing 'view/action' language instead of endpoint language.",
);

assertContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /humanStatus[\s\S]*function compactStatus[\s\S]*return humanStatus\(value\)[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\)"[\s\S]*justifySelf: "start"/,
  "Community Domain Billing readiness rows must use shared human status language and stack phone text instead of squeezing copy beside status pills.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /gridTemplateColumns: "minmax\(0, 1fr\) auto"/,
  "Community Domain Billing readiness rows must not return to the two-column phone layout that squeezes copy into one-word lines.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /Package capacity[\s\S]*package_name[\s\S]*limits_source[\s\S]*primary_next_action[\s\S]*Capacity attention[\s\S]*Used:[\s\S]*Limit:[\s\S]*Remaining:[\s\S]*This view only shows package limits[\s\S]*does not raise limits, add\s+units, members, or shops, change pricing or billing, publish pages,\s+move money, or show private evidence/,
  "Community Domain dashboard Billing lane must show read-only package capacity without implying limit increases, writes, billing activation, pricing changes, money movement, publishing, or private evidence access.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /Owner[\s\S]*cleanText\(domain\.owner_user_id, "not recorded"\)[\s\S]*Domain status[\s\S]*Verification[\s\S]*Billing[\s\S]*Activation[\s\S]*Renewal[\s\S]*compactStatus\(renewalState\)[\s\S]*Community Domain engine[\s\S]*One institutional home for structure, rules, services, and trust[\s\S]*Structure[\s\S]*countValue\(counts\.nodes\)[\s\S]*Governance[\s\S]*countValue\(counts\.active_policies\)[\s\S]*Services[\s\S]*countValue\(moduleKeys\.length\)[\s\S]*Trust relay[\s\S]*compactStatus\(status\.verification_status\)[\s\S]*verification still depends on current status/,
  "Community Domain dashboard must show owner, domain, verification, billing, activation, and renewal facts, then present the existing domain as an operating engine without overclaiming verification.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /communityDomainOperatingStateCopy[\s\S]*Domain closed[\s\S]*Domain suspended[\s\S]*Domain expired[\s\S]*Waiting for activation[\s\S]*Active operating domain[\s\S]*Active, not verified[\s\S]*Draft setup[\s\S]*Operating state[\s\S]*Draft, waiting, active, expired, suspended, and closed domains get\s+different guidance[\s\S]*Payment, renewal, activation, and authority\s+verification remain separate/,
  "Community Domain dashboard must give state-specific guidance for draft, waiting, active, expired, suspended, and closed domains without merging payment, renewal, activation, or verification.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/LaneSelectorPanel"\)[\s\S]*activeLane[\s\S]*setActiveLane[\s\S]*selectedLane[\s\S]*CommunityDomainLaneSelectorPanel[\s\S]*lanes=\{lanes\}[\s\S]*activeLane=\{activeLane\}[\s\S]*onSelectLane=\{setActiveLane\}/,
  "Community Domain dashboard must keep lane state in the parent route while lazy-loading the Work lanes selector.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /community-domain-dashboard\.lane\.\$\{|onClick=\{\(\) => setActiveLane\(cleanText\(lane\.lane_key\)\)\}/,
  "Community Domain dashboard parent must not own lane button rendering after handing lanes, active lane, and selection handler to the lazy lane selector.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/LaneSelectorPanel.tsx",
  /function laneDisplayLabel[\s\S]*key === "modules"[\s\S]*return "Services"[\s\S]*Work lanes[\s\S]*lanes\.map[\s\S]*onSelectLane\(laneKey\)[\s\S]*debugId=\{`community-domain-dashboard\.lane\.\$\{laneKey\}`\}[\s\S]*stableHeight=\{58\}[\s\S]*compactStatus\(lane\.status\)[\s\S]*countValue\(lane\.count\)/,
  "Lazy Community Domain lane selector must preserve service-lane wording, stable lane debug ids, selected-lane switching, status text, and count badges.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/SetupIntelligenceCards"\)[\s\S]*getCommunityDomainReadiness[\s\S]*getCommunityDomainSetupPlan[\s\S]*CommunityDomainSetupIntelligenceCards[\s\S]*setupReadiness=\{setupReadiness\}[\s\S]*setupPlan=\{setupPlan\}/,
  "Community Domain dashboard must lazy-load setup intelligence cards and pass raw setup readiness and setup plan maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /visibleSetupReadinessItems|blockedSetupReadinessItems|visibleSetupPlanSteps|openSetupPlanSteps|SetupReadinessItem|SetupPlanStep/,
  "Community Domain dashboard parent must not precompute setup readiness blockers or setup plan steps before handing raw setup maps to the lazy setup intelligence component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/SetupIntelligenceCards.tsx",
  /function setupReadinessItems[\s\S]*function setupPlanSteps[\s\S]*blockedSetupReadinessItems[\s\S]*visibleSetupPlanSteps[\s\S]*openSetupPlanSteps[\s\S]*Setup readiness[\s\S]*checks ready[\s\S]*setup checks still need attention[\s\S]*This checklist only shows setup gaps[\s\S]*does not change membership,\s+billing, authority, payments, or private evidence/,
  "Lazy Community Domain setup intelligence component must derive setup readiness blockers from raw setup readiness and keep read-only boundary language.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/SetupIntelligenceCards.tsx",
  /Setup plan[\s\S]*steps complete[\s\S]*Current phase:[\s\S]*primary_next_action[\s\S]*missing item[\s\S]*admin guided[\s\S]*planning only[\s\S]*Planning only[\s\S]*This plan only shows next setup steps[\s\S]*does not change structure,\s+policy, billing, public pages, money, or private evidence/,
  "Lazy Community Domain setup intelligence component must derive setup plan steps from raw setup plan and avoid implying setup writes, authority verification, publishing, money movement, or private evidence access.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/SetupIntelligenceCards.tsx",
  /Readiness is not available yet[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\)"[\s\S]*Setup plan is not available yet[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\)"/,
  "Community Domain setup intelligence unavailable states and rows must be user-facing and phone-safe.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/SetupIntelligenceCards.tsx",
  /read-only setup (checklist|plan)|read-only readiness checklist|read-only setup plan|Read only|not loaded|"view only"|View only|gridTemplateColumns: "minmax\(0, 1fr\) auto"/,
  "Community Domain setup intelligence visible copy must avoid old read-only setup wording.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /dashboardRouteId[\s\S]*loadedReadinessLanes[\s\S]*loadingReadinessLanes[\s\S]*readinessLoadSequence[\s\S]*readinessLoadIds[\s\S]*readinessLoadPromises[\s\S]*resetReadinessLoadTracking[\s\S]*resetOptionalReadinessState[\s\S]*setDashboard\(null\)[\s\S]*setDashboardRouteId\(""\)[\s\S]*resetReadinessLoadTracking\(\)[\s\S]*resetOptionalReadinessState\(\)[\s\S]*setDashboardRouteId\(communityDomainId\)[\s\S]*loadReadinessPayloadsForLane[\s\S]*applyReadinessPayloadsForLane[\s\S]*cleanText\(dashboardRouteId\) !== cleanText\(communityDomainId\)[\s\S]*dashboardDomainId[\s\S]*cleanText\(dashboardDomainId\) !== cleanText\(communityDomainId\)[\s\S]*needsBaseReadiness[\s\S]*needsLaneReadiness[\s\S]*readinessDomainKey[\s\S]*viewerReadinessKey[\s\S]*baseReadinessCacheKey[\s\S]*laneReadinessCacheKey[\s\S]*loadOrReuseReadiness[\s\S]*readinessLoadPromises\.current\[cacheKey\][\s\S]*loadingKeys[\s\S]*requestId[\s\S]*setLoadingReadinessLanes[\s\S]*readinessLoadIds\.current\[key\] === requestId[\s\S]*isBaseReadinessLoading[\s\S]*isActiveLaneReadinessLoading[\s\S]*Loading setup intelligence/,
  "Community Domain dashboard must fetch base setup intelligence and active-lane readiness on demand, only after the dashboard route id and dashboard domain match the current route, with domain/viewer/lane-scoped in-flight reuse plus keyed and request-guarded loading state instead of eagerly loading every optional lane before the dashboard is usable.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /if \(!requestDomainId\)[\s\S]*setDashboard\(null\)[\s\S]*setDashboardRouteId\(""\)[\s\S]*setLoadingQueue\(false\)[\s\S]*reviewerQueueLoadSequence\.current \+= 1[\s\S]*membershipRequestLoadSequence\.current \+= 1[\s\S]*setReviewerQueue\(\[\]\)[\s\S]*setOwnMembershipRequests\(\[\]\)[\s\S]*setLoading\(true\)[\s\S]*setDashboardRouteId\(""\)[\s\S]*setLoadingQueue\(false\)[\s\S]*reviewerQueueLoadSequence\.current \+= 1[\s\S]*membershipRequestLoadSequence\.current \+= 1[\s\S]*setReviewerQueue\(\[\]\)[\s\S]*setOwnMembershipRequests\(\[\]\)/,
  "Community Domain dashboard resets must invalidate both access-review and applicant-status in-flight loads, and clear reviewer queue plus own membership-request state before rendering selector or refreshed dashboard states.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/ServiceReadinessPanels"\)[\s\S]*listCommunityDomainServiceSettings[\s\S]*getCommunityDomainEconomicParticipation[\s\S]*getCommunityDomainNetworkPresence[\s\S]*CommunityDomainServiceReadinessPanels[\s\S]*moduleScopeReadiness=\{moduleScopeReadiness\}[\s\S]*moduleKeys=\{moduleKeys\}[\s\S]*billingStatus=\{status\.billing_status\}[\s\S]*quote=\{quote\}[\s\S]*serviceSettingsProjection=\{serviceSettingsProjection\}[\s\S]*economicParticipation=\{economicParticipation\}[\s\S]*networkPresence=\{networkPresence\}/,
  "Community Domain dashboard Services lane must lazy-load the read-only service readiness panels and pass raw service maps plus billing/module context from the parent route.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /SERVICE_DETAIL_OPTIONS[\s\S]*key: "readiness"[\s\S]*key: "local"[\s\S]*key: "boundaries"[\s\S]*key: "trust"[\s\S]*key: "evidence"[\s\S]*activeServiceDetail[\s\S]*community-domain-dashboard\.service-detail\.\$\{option\.key\}[\s\S]*activeServiceDetail === "readiness"[\s\S]*CommunityDomainServiceReadinessPanels[\s\S]*activeServiceDetail === "local"[\s\S]*variant="services"[\s\S]*activeServiceDetail === "boundaries"[\s\S]*CommunityDomainServiceBoundaryPanels[\s\S]*activeServiceDetail === "trust"[\s\S]*variant="trustEvidence"[\s\S]*activeServiceDetail === "evidence"[\s\S]*CommunityDomainTrustEvidenceReadinessPanels/,
  "Community Domain dashboard Services lane must expose one focused service packet at a time instead of dumping readiness, local service maps, boundary panels, trust maps, and evidence readiness together.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /serviceReadinessRows|ServiceReadinessItem|ServiceReadinessRow|SERVICE_READINESS_KEYS|serviceReadinessStatus|serviceFallbackDetail|moduleLabel|visibleServiceSettingsItems|enabledServiceSettingsItems|optionalServiceSettingsItems|visibleEconomicParticipationLanes|blockedEconomicParticipationLanes|economicParticipationReadyTotal|economicParticipationTemplate|economicParticipationCounts|visibleNetworkPresenceLanes|blockedNetworkPresenceLanes|networkPresenceReadyTotal|networkPresenceIdentity|networkPresenceStatus/,
  "Community Domain dashboard parent must not precompute service readiness rows, service settings projection splits, economic participation readiness, or network presence readiness before handing raw maps to the lazy service readiness component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /SERVICE_READINESS_KEYS[\s\S]*"shops"[\s\S]*"spotlight"[\s\S]*"vault"[\s\S]*"verification"[\s\S]*"trust_centre"[\s\S]*"analytics"[\s\S]*function projectionItems[\s\S]*function readinessLanes[\s\S]*function blockedLanes[\s\S]*function readyTotal[\s\S]*function serviceReadinessRows[\s\S]*moduleScopeReadiness\?\.modules[\s\S]*moduleKeys[\s\S]*billingStatus[\s\S]*quote[\s\S]*visibleServiceReadinessRows[\s\S]*projectionItems\(serviceSettingsProjection\)[\s\S]*economicParticipation\?\.counts[\s\S]*economicParticipation\?\.template[\s\S]*readinessLanes\(economicParticipation\)[\s\S]*networkPresence\?\.identity[\s\S]*networkPresence\?\.status[\s\S]*readinessLanes\(networkPresence\)/,
  "Lazy Community Domain service readiness component must derive service readiness rows, service-setting splits, economic participation readiness, and network presence readiness from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /Service readiness[\s\S]*Billing[\s\S]*Settings[\s\S]*This view only shows service readiness[\s\S]*does not turn on services,\s+activate billing, grant permissions, publish Spotlight, create shops,\s+open vault links, or show private member records/,
  "Community Domain dashboard Services lane must use read-only module-scope readiness rows for core services, billing, and settings without implying activation or private-record writes.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/ServiceBoundaryPanels"\)[\s\S]*getCommunityDomainNetworkExchangeMap[\s\S]*getCommunityDomainRecordPrivacyMap[\s\S]*getCommunityDomainConfigurationMap[\s\S]*getCommunityDomainComplianceMap[\s\S]*getCommunityDomainAppealReadiness[\s\S]*CommunityDomainServiceBoundaryPanels[\s\S]*networkExchangeMap=\{networkExchangeMap\}[\s\S]*recordPrivacyMap=\{recordPrivacyMap\}[\s\S]*configurationMap=\{configurationMap\}[\s\S]*complianceMap=\{complianceMap\}[\s\S]*appealReadiness=\{appealReadiness\}/,
  "Community Domain dashboard Services lane must lazy-load service boundary readiness panels and pass only raw boundary maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /visible(?:NetworkExchange|RecordPrivacy|ConfigurationMap|ComplianceMap|AppealReadiness)Lanes|blocked(?:NetworkExchange|RecordPrivacy|ConfigurationMap|ComplianceMap|AppealReadiness)Lanes|(?:networkExchange|recordPrivacy|configurationMap|complianceMap)ReadyTotal|appealReadinessSignalTotal|(?:networkExchange|recordPrivacy|configurationMap|complianceMap|appealReadiness)Summary|linkedNetworkSocialCommunity/,
  "Community Domain dashboard parent must not precompute service boundary summaries, ready totals, lane lists, or blocked lists before handing raw maps to the lazy service boundary component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /function readinessLanes[\s\S]*function blockedLanes[\s\S]*function readyTotal[\s\S]*function signalTotal[\s\S]*networkExchangeMap\?\.summary[\s\S]*recordPrivacyMap\?\.summary[\s\S]*configurationMap\?\.summary[\s\S]*complianceMap\?\.summary[\s\S]*appealReadiness\?\.summary/,
  "Community Domain service boundary lazy component must derive summaries, lane lists, ready totals, blocked lanes, and appeal signal totals from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Network exchange readiness[\s\S]*primary_next_action[\s\S]*domain_exchange_status[\s\S]*cross_domain_discovery_status[\s\S]*active_affiliations[\s\S]*external_finance_status[\s\S]*outside-network planning only[\s\S]*does not open exchange,\s+discovery, finance, loans, money movement, or private records/,
  "Community Domain dashboard Services lane must keep outside-network planning copy concise while preserving exchange, finance, loan, money, and private-record boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Record privacy readiness[\s\S]*primary_next_action[\s\S]*public_url_status[\s\S]*marketplace_private_record_status[\s\S]*finance_private_record_status[\s\S]*cross_domain_record_sharing_status[\s\S]*privacy planning only[\s\S]*does not change access, publish\s+rosters or proof, share private records, or move money/,
  "Community Domain dashboard Services lane must keep record privacy copy concise while preserving access, roster, proof, private-record, and money boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Setup map[\s\S]*primary_next_action[\s\S]*configuration_mode[\s\S]*Special data model[\s\S]*custom_schema_status[\s\S]*Special billing[\s\S]*custom_billing_status[\s\S]*Services[\s\S]*default_modules[\s\S]*Dedicated setup[\s\S]*custom_tenant_status[\s\S]*Access rules[\s\S]*custom_permission_status[\s\S]*setup planning only[\s\S]*does not create special builds,\s+service settings, payments, records, or private data/,
  "Community Domain dashboard Services lane must keep setup map copy concise while preserving special-build, service-setting, payment, record, and privacy boundaries.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Review configuration boundaries|configuration checks are ready|read-only configuration map|Configuration checks needing attention|No blocked configuration check|template configuration|This configuration map is read-only configuration planning|module settings|appeal route/i,
  "Community Domain dashboard visible setup-boundary copy must use setup/service language instead of configuration/module language.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Compliance map[\s\S]*primary_next_action[\s\S]*compliance_engine_status[\s\S]*legal_advice_status[\s\S]*payment_compliance_status[\s\S]*cross_domain_record_sharing_status[\s\S]*compliance planning only[\s\S]*not legal advice or a\s+certificate[\s\S]*does not certify compliance, move money, or show\s+private records/,
  "Community Domain dashboard Services lane must keep compliance copy concise while preserving legal-advice, certification, money, and private-record boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /Appeal readiness[\s\S]*primary_next_action[\s\S]*appeal_engine_status[\s\S]*appeal_records_created[\s\S]*mediator_assignment_status[\s\S]*appeal_decision_status[\s\S]*fairness planning only[\s\S]*does not create appeals, decide\s+disputes, reverse payments, move money, or show private records/,
  "Community Domain dashboard Services lane must keep appeal readiness copy concise while preserving appeal, dispute, payment-reversal, money, and private-record boundaries.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /This view only shows (outside-network|privacy|setup|compliance|fairness)|trust records, proof, payment records, loans, guarantees|create special\s+builds, units, members, roles|create policy, decide reviews, create\s+payment or finance records|reopen membership, assign mediators, decide disputes/,
  "Community Domain Service Boundary notes must stay concise and user-facing instead of returning to long legal-style lists.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/ServiceBoundaryPanels.tsx",
  /GSN could not load the read-only (network exchange map|record privacy map|setup map|compliance map|appeal readiness view)/,
  "Community Domain Service Boundary load states must avoid old read-only map/view wording in visible fallback copy.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /visibleServiceSettingsItems[\s\S]*enabledServiceSettingsItems[\s\S]*optionalServiceSettingsItems[\s\S]*Service settings view[\s\S]*serviceSettingsProjection\?\.enabled_total[\s\S]*serviceSettingsProjection\?\.optional_total[\s\S]*This view only shows service template guidance[\s\S]*does not save\s+settings, turn on services, activate billing, grant permissions,\s+create shops, publish Spotlight, open vault links, or show private\s+records/,
  "Community Domain dashboard Services lane must show read-only service settings projection without implying persisted settings, module enablement/disablement, billing/domain activation, permission grants, shops, Spotlight, vault links, TrustSlips, Trust Passport writes, or private-record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /Included by this Community Domain template[\s\S]*not available yet[\s\S]*later adds it[\s\S]*planning only/,
  "Community Domain service readiness fallbacks must use included/available/add/planning wording.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /not loaded|"view only"|View only|configure it/,
  "Community Domain service readiness visible copy must use available/planning/add wording instead of loaded/view-only/configure wording.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/NodeProjectionGroups"\)[\s\S]*CommunityDomainNodeProjectionGroups[\s\S]*variant="services"[\s\S]*nodeServiceMap=\{nodeServiceMap\}[\s\S]*nodePrivacyMap=\{nodePrivacyMap\}[\s\S]*nodeAnalyticsMap=\{nodeAnalyticsMap\}[\s\S]*nodeCommunicationMap=\{nodeCommunicationMap\}[\s\S]*nodeVaultMap=\{nodeVaultMap\}/,
  "Community Domain dashboard Services lane must lazy-load the read-only service node projection group instead of carrying the full card dump in the main route chunk.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /groupKey="services-node-projections"[\s\S]*Local service planning[\s\S]*5 local service views are grouped here[\s\S]*Unit service map[\s\S]*Unit privacy map[\s\S]*Unit analytics map[\s\S]*Unit communication map[\s\S]*Unit vault map/,
  "Lazy Community Domain node projection component must preserve the grouped Services projection cards.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /Economic participation[\s\S]*primary_next_action[\s\S]*economicParticipationTemplate\.marketplace_role[\s\S]*Units[\s\S]*economicParticipationCounts\.nodes[\s\S]*economicParticipationCounts\.finance_records[\s\S]*This view only shows economic readiness[\s\S]*does not create shops,\s+listings, demand, Spotlight, vault links, payment steps, finance\s+records, billing changes, community links, or private member records/,
  "Community Domain dashboard Services lane must show read-only economic participation without implying marketplace/shop/listing/demand/Spotlight/vault creation, money movement, payment instructions, finance records, trust verification, billing/domain activation, social Community creation, or private activity exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /Network presence[\s\S]*primary_next_action[\s\S]*networkPresenceStatus\.public_url_status[\s\S]*networkPresenceStatus\.social_community_bridge_status[\s\S]*This view only shows public-presence readiness[\s\S]*does not publish a\s+public page, finalize the domain link, create outward links, verify the\s+domain, create marketplace or Spotlight exposure, activate billing, or\s+show private member records/,
  "Community Domain dashboard Services lane must show read-only network presence without implying public publishing, URL finalization, outward links, domain verification, marketplace exposure, Spotlight placement, vault links, social Community bridge creation, billing/domain activation, or private activity exposure.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/ServiceReadinessPanels.tsx",
  /GSN could not load the read-only (service settings view|economic participation view|network presence view)/,
  "Community Domain Service Readiness load states must avoid old read-only view wording in visible fallback copy.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /CommunityDomainNodeProjectionGroups[\s\S]*variant="structureFoundation"[\s\S]*nodeAutonomyMap=\{nodeAutonomyMap\}[\s\S]*nodeEconomicMap=\{nodeEconomicMap\}[\s\S]*nodeActivityMap=\{nodeActivityMap\}/,
  "Community Domain dashboard Structure lane must lazy-load the foundational node projection cards through the route-local node projection component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit authority map[\s\S]*locally_governed[\s\S]*needs_local_governance[\s\S]*local authority snapshot only[\s\S]*does not grant roles, change structure, activate billing, or show private member data/,
  "Community Domain dashboard Structure lane must keep node autonomy public copy short while preserving authority, structure, billing, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit economy map[\s\S]*marketplace_role[\s\S]*finance_records[\s\S]*local economy snapshot only[\s\S]*does not create shops, loans, finance records, payment steps, or private member data/,
  "Community Domain dashboard Structure lane must keep node economy public copy short while preserving shop, finance, payment, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit activity map[\s\S]*scheduled_activities[\s\S]*paid_activities[\s\S]*attendance_records[\s\S]*local activity snapshot only[\s\S]*does not create activities, attendance, payment steps, trust records, or private member data/,
  "Community Domain dashboard Structure lane must keep node activity public copy short while preserving activity, payment, trust, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /CommunityDomainNodeProjectionGroups[\s\S]*variant="trustEvidence"[\s\S]*nodeEvidenceAuthorityMap=\{nodeEvidenceAuthorityMap\}[\s\S]*nodeTrustMap=\{nodeTrustMap\}/,
  "Community Domain dashboard must lazy-load trust/evidence node projection cards through the route-local node projection component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit trust map[\s\S]*local_trust_ready[\s\S]*review_records[\s\S]*active_evidence_records[\s\S]*Trust records[\s\S]*trustslips[\s\S]*local trust snapshot only[\s\S]*does not publish proof, create trust records, move money, or show private member data/,
  "Community Domain dashboard must keep node trust public copy short while preserving proof, trust-record, money, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /CommunityDomainNodeProjectionGroups[\s\S]*variant="memberParticipation"[\s\S]*nodeParticipationMap=\{nodeParticipationMap\}/,
  "Community Domain dashboard Members lane must lazy-load node participation planning through the route-local node projection component.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/MemberReadinessPanels"\)[\s\S]*activeLane === "members"[\s\S]*CommunityDomainMemberReadinessPanels[\s\S]*placementSummary=\{placementSummary\}[\s\S]*memberVerificationMap=\{memberVerificationMap\}[\s\S]*CommunityDomainNodeProjectionGroups[\s\S]*variant="memberParticipation"/,
  "Community Domain dashboard Members lane must lazy-load placement and member-verification readiness panels, pass only raw placement/member verification maps from the parent route, and preserve the member participation projection order.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /MEMBER_DETAIL_OPTIONS[\s\S]*key: "readiness"[\s\S]*key: "placement"[\s\S]*activeMemberDetail[\s\S]*community-domain-dashboard\.member-detail\.\$\{option\.key\}[\s\S]*activeMemberDetail === "readiness"[\s\S]*CommunityDomainMemberReadinessPanels[\s\S]*activeMemberDetail === "placement"[\s\S]*variant="memberParticipation"/,
  "Community Domain dashboard Members lane must expose one focused member packet at a time instead of dumping member readiness and unit placement together.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /placementCounts|placementLanes|visibleNodePlacements|memberVerificationSummary|visibleMemberVerificationLanes|blockedMemberVerificationLanes|memberVerificationReadyTotal/,
  "Community Domain dashboard parent must not precompute Members lane placement or member verification summaries, ready totals, lane lists, or visible placement rows before handing raw maps to the lazy Members component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  /function readinessLanes[\s\S]*function readyTotal[\s\S]*function visibleNodePlacements[\s\S]*placementSummary\?\.counts[\s\S]*readinessLanes\(placementSummary\)[\s\S]*visibleNodePlacements\(placementSummary\)[\s\S]*memberVerificationMap\?\.summary[\s\S]*readinessLanes\(memberVerificationMap\)[\s\S]*readyTotal\(\s*memberVerificationMap,\s*visibleMemberVerificationLanes\s*\)/,
  "Lazy Community Domain Members readiness component must derive placement counts, placement lanes, visible placements, member verification summary, lane lists, blocked lanes, and ready total from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit participation map[\s\S]*active_node_memberships[\s\S]*unplaced_domain_members[\s\S]*multi_node_members[\s\S]*member-placement snapshot only[\s\S]*does not invite, add, place, or show members/,
  "Community Domain dashboard Members lane must keep node participation public copy short while preserving member-placement and roster boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit service map[\s\S]*Service options[\s\S]*template_module_count[\s\S]*local_services_ready[\s\S]*live_service_records[\s\S]*vault_links[\s\S]*local service snapshot only[\s\S]*does not turn on services, grant permissions, activate billing, or show private member data/,
  "Community Domain dashboard must keep node service public copy short while preserving service, permission, billing, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit privacy map[\s\S]*member_visible[\s\S]*Unit private[\s\S]*node_private[\s\S]*public_review_needed[\s\S]*cross_domain_shares[\s\S]*local privacy snapshot only[\s\S]*does not change access, publish rosters, or show protected records/,
  "Community Domain dashboard must keep node privacy public copy short while preserving access, roster, and protected-record boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit analytics map[\s\S]*local_analytics_ready[\s\S]*review_records[\s\S]*active_evidence_records[\s\S]*Marketplace signals[\s\S]*marketplace_metrics[\s\S]*local analytics snapshot only[\s\S]*does not create reports, tracking, finance signals, or private member data/,
  "Community Domain dashboard must keep node analytics public copy short while preserving report, tracking, finance, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /CommunityDomainNodeProjectionGroups[\s\S]*variant="structureBoundary"[\s\S]*nodeDomainBoundaryMap=\{nodeDomainBoundaryMap\}/,
  "Community Domain dashboard Structure lane must lazy-load node domain-boundary planning through the route-local node projection component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit boundary map[\s\S]*child_domain_candidate[\s\S]*affiliate_review_needed[\s\S]*public_urls_published[\s\S]*boundary snapshot only[\s\S]*does not create child domains, publish links, move members, or show private member data/,
  "Community Domain dashboard Structure lane must keep node boundary public copy short while preserving child-domain, link, member-transfer, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit evidence authority map[\s\S]*local_evidence_authority_ready[\s\S]*needs_local_evidence_issuer[\s\S]*public_evidence_review_needed[\s\S]*credentials_issued[\s\S]*local evidence-authority snapshot only[\s\S]*does not upload evidence, issue proof, or show private member data/,
  "Community Domain dashboard must keep node evidence-authority public copy short while preserving evidence, proof, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit communication map[\s\S]*local_communication_ready[\s\S]*public_notice_review_needed[\s\S]*notices_created[\s\S]*notifications_sent[\s\S]*local communication snapshot only[\s\S]*does not send messages, publish notices, or show member lists/,
  "Community Domain dashboard must keep node communication public copy short while preserving message, notice, and member-list boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit vault map[\s\S]*local_vault_ready[\s\S]*active_evidence_records[\s\S]*needs_vault_steward[\s\S]*Protected storage[\s\S]*storage_keys_exposed[\s\S]*local vault snapshot only[\s\S]*does not move files, grant access, publish proof, or show protected storage/,
  "Community Domain dashboard must keep node vault public copy short while preserving file, access, proof, and protected-storage boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit scheduled activity map[\s\S]*local_schedule_ready[\s\S]*attendance_records[\s\S]*payment_instructions_created[\s\S]*local schedule snapshot only[\s\S]*does not create events, reminders, attendance, payment steps, or private member data/,
  "Community Domain dashboard Structure lane must keep node schedule public copy short while preserving event, attendance, payment, and privacy boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /Unit paid activity map[\s\S]*local_paid_activity_ready[\s\S]*Payment steps[\s\S]*payment_instructions_created[\s\S]*ledger_entries_written[\s\S]*local payment snapshot only[\s\S]*does not create dues, receipts, ledger entries, loans, or money movement/,
  "Community Domain dashboard Structure lane must keep node paid-activity public copy short while preserving dues, receipt, ledger, loan, and money boundaries.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /CommunityDomainNodeProjectionGroups[\s\S]*variant="structureActivity"[\s\S]*nodeScheduledActivityMap=\{nodeScheduledActivityMap\}[\s\S]*nodePaidActivityMap=\{nodePaidActivityMap\}/,
  "Community Domain dashboard Structure lane must lazy-load scheduled and paid activity detail projections.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /visibleNode(?:Autonomy|Economic|Activity|Trust|Participation|Service|Privacy|Analytics|DomainBoundary|EvidenceAuthority|Communication|Vault|ScheduledActivity|PaidActivity)Rows|node(?:Autonomy|Economic|Activity|Trust|Participation|Service|Privacy|Analytics|DomainBoundary|EvidenceAuthority|Communication|Vault|ScheduledActivity|PaidActivity)(?:Counts|Gaps)/,
  "Community Domain dashboard parent must not precompute node projection counts, rows, or gaps before handing raw maps to the lazy projection component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /function nodeProjectionCounts[\s\S]*function nodeProjectionRows[\s\S]*function nodeProjectionGaps[\s\S]*nodeProjectionRows\(map\)\.filter[\s\S]*nodeProjectionGaps\(props\.nodeTrustMap,\s*"trust_status"[\s\S]*nodeProjectionGaps\([\s\S]*props\.nodePaidActivityMap,[\s\S]*"paid_activity_status"[\s\S]*nodeProjectionCounts\(props\.nodeServiceMap\)/,
  "Lazy Community Domain node projection component must derive counts, rows, and gap rows from raw node maps instead of receiving parent-precomputed projection data.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /groupKey="structure-activity-projections"[\s\S]*Activity detail planning[\s\S]*Unit views for scheduled activity and paid activity readiness[\s\S]*2 local activity views are grouped here[\s\S]*Unit scheduled activity map[\s\S]*Unit paid activity map/,
  "Lazy Community Domain node projection component must preserve the grouped Structure activity projection cards.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/NodeProjectionGroups.tsx",
  /GSN could not load the read-only|read-only view|Read-only unit|read-only planning|TrustSlips|Trust Passport entries|payment instructions|storage keys|payload|social Community/,
  "Community Domain node projection visible copy must avoid old read-only, technical TrustSlip/passport, storage-key, payload, and social-community wording.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/TrustEvidenceReadinessPanels"\)[\s\S]*getCommunityDomainEvidenceRecordReadiness[\s\S]*getCommunityDomainEvidenceReleaseReadiness[\s\S]*getCommunityDomainTrustRelayReadiness[\s\S]*getCommunityDomainNotificationScopeReadiness[\s\S]*getCommunityDomainTrustMobility[\s\S]*CommunityDomainTrustEvidenceReadinessPanels[\s\S]*evidenceRecordReadiness=\{evidenceRecordReadiness\}[\s\S]*evidenceReleaseReadiness=\{evidenceReleaseReadiness\}[\s\S]*trustRelayReadiness=\{trustRelayReadiness\}[\s\S]*notificationScopeReadiness=\{notificationScopeReadiness\}[\s\S]*trustMobility=\{trustMobility\}/,
  "Community Domain dashboard Services lane must lazy-load trust/evidence readiness panels and pass only raw readiness maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /evidenceRecordReadyTotal|visibleEvidenceRecordTypes|blockedEvidenceRecordTypes|evidenceRecordSummary|evidenceReleaseReadyTotal|visibleEvidenceReleaseLanes|blockedEvidenceReleaseLanes|evidenceReleaseSummary|trustRelayReadyTotal|visibleTrustRelayLanes|blockedTrustRelayLanes|trustRelaySummary|notificationScopeReadyTotal|visibleNotificationScopeLanes|blockedNotificationScopeLanes|notificationScopeSummary|trustMobilityReadyTotal|visibleTrustMobilityLanes|blockedTrustMobilityLanes|trustMobilitySummary/,
  "Community Domain dashboard parent must not precompute Trust/evidence summaries, ready totals, record types, lane lists, or blocked lists before handing raw maps to the lazy Trust/evidence component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /function readinessLanes[\s\S]*function blockedLanes[\s\S]*function readyTotal[\s\S]*function evidenceRecordTypes[\s\S]*function blockedEvidenceRecords[\s\S]*function computeEvidenceRecordReadyTotal[\s\S]*evidenceRecordReadiness\?\.summary[\s\S]*evidenceRecordTypes\(evidenceRecordReadiness\)[\s\S]*evidenceReleaseReadiness\?\.summary[\s\S]*readinessLanes\(evidenceReleaseReadiness\)[\s\S]*trustRelayReadiness\?\.summary[\s\S]*readinessLanes\(trustRelayReadiness\)[\s\S]*notificationScopeReadiness\?\.summary[\s\S]*readinessLanes\(notificationScopeReadiness\)[\s\S]*trustMobility\?\.summary[\s\S]*readinessLanes\(trustMobility\)/,
  "Lazy Community Domain Trust/evidence readiness component must derive summaries, record types, lanes, blocked rows, and ready totals from raw readiness maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /Evidence record readiness[\s\S]*primary_next_action[\s\S]*evidence_record_engine_status[\s\S]*record_type_count[\s\S]*evidence_records_created[\s\S]*review_evidence_metadata_count[\s\S]*This view only shows evidence-record readiness\. It does not create\s+records, upload files, issue credentials, publish proof, verify authority,\s+score trust, move money, or show private evidence/,
  "Community Domain dashboard Services lane must show read-only evidence record readiness without implying durable evidence writes, file upload, storage-key exposure, validity calculation, visibility-policy persistence, credentials, TrustSlips, Trust Passport writes, public proof, legal verification, money movement, billing activation, marketplace activity, social Community creation, private evidence exposure, or trust scoring.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /Evidence release readiness[\s\S]*primary_next_action[\s\S]*evidence_release_engine_status[\s\S]*evidence_releases_created[\s\S]*public_proofs_published[\s\S]*release_evidence_count[\s\S]*This view only shows public-release readiness\. It does not release\s+evidence, publish proof, create public links or QR codes, issue\s+credentials, share records, change permissions, score trust, move money,\s+or show private evidence/,
  "Community Domain dashboard Services lane must show read-only evidence release readiness without implying evidence release, file or storage-key exposure, public proof publishing, public URL or QR creation, credentials, TrustSlips, Trust Passport writes, cross-domain sharing, trust relay paths, legal verification, money movement, billing activation, marketplace activity, social Community creation, permission changes, private evidence exposure, or trust scoring.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /Trust relay readiness[\s\S]*primary_next_action[\s\S]*trust_relay_engine_status[\s\S]*relay_paths_created[\s\S]*bridge_member_candidates[\s\S]*open_relay_review_count[\s\S]*This view only shows relay readiness\. It does not create relay paths,\s+publish proof, repost Spotlight, create discovery or affiliations, share\s+private records, issue credentials, create marketplace activity, activate\s+billing, or move money/,
  "Community Domain dashboard Services lane must show read-only trust relay readiness without implying relay path creation, Spotlight reposting, proof publishing, cross-domain discovery, private evidence access, TrustSlip issuing, Trust Passport writes, credentials, marketplace activity, affiliations, billing activation, or money movement.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /Notification scope readiness[\s\S]*primary_next_action[\s\S]*notification_scope_engine_status[\s\S]*notification_policy_count[\s\S]*notifications_sent[\s\S]*This view only shows audience readiness\. It does not send messages,\s+create delivery jobs or audience lists, publish announcements, show\s+member lists, create marketplace records, move money, create trust\s+records, or show private records/,
  "Community Domain dashboard Services lane must show read-only notification scope readiness without implying notification delivery, jobs, email/SMS/WhatsApp/push sending, audience-list creation, public announcements, cross-domain broadcasts, member-list exposure, marketplace records, money movement, TrustSlips, Trust Passport writes, or private record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /Trust mobility readiness[\s\S]*primary_next_action[\s\S]*verification_status[\s\S]*review_evidence_records[\s\S]*relay_paths[\s\S]*This view only shows trust-mobility readiness\. It does not create trust\s+records, credentials, relay paths, public proof, outward links,\s+marketplace activity, separate communities, move money, or show\s+private records/,
  "Community Domain dashboard Services lane must show read-only trust mobility readiness without implying TrustSlips, Trust Passport writes, credentials, relay paths, evidence release, file or storage-key exposure, legal verification, proof publishing, outward links, money movement, billing, activation, marketplace activity, social Community creation, or private record exposure.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/TrustEvidenceReadinessPanels.tsx",
  /GSN could not load the read-only (evidence record readiness view|evidence release readiness view|trust relay readiness view|notification scope readiness view|trust mobility view)/,
  "Community Domain Trust/Evidence load states must avoid old read-only view wording in visible fallback copy.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/IdentityReadinessPanels"\)[\s\S]*CommunityDomainIdentityReadinessPanels[\s\S]*domain=\{domain\}[\s\S]*institutionalProfile=\{institutionalProfile\}[\s\S]*socialBridge=\{socialBridge\}[\s\S]*affiliationReadiness=\{affiliationReadiness\}/,
  "Community Domain dashboard Identity lane must lazy-load read-only identity readiness panels and pass only raw identity readiness maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /institutionalProfileReadyTotal|visibleInstitutionalProfileLanes|blockedInstitutionalProfileLanes|institutionalProfileSummary|institutionalProfileDetails|socialBridgeReadyTotal|visibleSocialBridgeLanes|blockedSocialBridgeLanes|socialBridgeSummary|linkedSocialCommunity|affiliationReadyTotal|visibleAffiliationLanes|blockedAffiliationLanes|affiliationSummary/,
  "Community Domain dashboard parent must not precompute Identity lane institutional profile, social bridge, or affiliation summaries, ready totals, lane lists, or blocked lists before handing raw maps to the lazy Identity component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /function readinessLanes[\s\S]*function blockedLanes[\s\S]*function readyTotal[\s\S]*institutionalProfile\?\.summary[\s\S]*institutionalProfile\?\.institutional_profile[\s\S]*readinessLanes\(institutionalProfile\)[\s\S]*socialBridge\?\.summary[\s\S]*socialBridge\?\.linked_community[\s\S]*readinessLanes\(socialBridge\)[\s\S]*affiliationReadiness\?\.summary[\s\S]*readinessLanes\(affiliationReadiness\)/,
  "Lazy Community Domain Identity readiness component must derive institutional profile, social bridge, and affiliation summaries, lanes, blocked rows, and ready totals from raw readiness maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /IDENTITY_DETAIL_OPTIONS[\s\S]*key: "identity"[\s\S]*key: "profile"[\s\S]*key: "bridge"[\s\S]*key: "affiliation"[\s\S]*activeIdentityDetail[\s\S]*community-domain-identity\.detail\.\$\{option\.key\}[\s\S]*activeIdentityDetail === "identity"[\s\S]*Domain identity[\s\S]*activeIdentityDetail === "profile"[\s\S]*Institutional profile[\s\S]*activeIdentityDetail === "bridge"[\s\S]*Community bridge readiness[\s\S]*activeIdentityDetail === "affiliation"[\s\S]*Affiliation readiness/,
  "Community Domain Identity readiness panel must expose one focused identity packet at a time instead of dumping identity, profile, bridge, and affiliation together.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /Domain identity[\s\S]*public-safe identity anchor[\s\S]*Code[\s\S]*domain\.domain_name[\s\S]*Owner[\s\S]*domain\.owner_user_id[\s\S]*Template[\s\S]*template\.label[\s\S]*Location[\s\S]*domain\.state[\s\S]*domain\.country[\s\S]*Public profile:[\s\S]*No public profile text is recorded yet[\s\S]*This summary shows public-safe identity only[\s\S]*does not show owner\s+contact details, private member lists, finance records, evidence files,\s+or verification proof/,
  "Community Domain dashboard Identity lane must show a public-safe identity summary without exposing owner contact, private members, finance, evidence, or verification proof.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /Affiliation readiness[\s\S]*primary_next_action[\s\S]*bridge_status[\s\S]*domain_affiliation_engine_status[\s\S]*approved_affiliations[\s\S]*pending_affiliations[\s\S]*This view only shows affiliation readiness[\s\S]*does not create parent\s+or child Community Domain links, approve requests, set community links,\s+copy or transfer members, inherit policy, activate billing, verify\s+authority, publish public links, create marketplace activity, move\s+money, create trust records, or show private records/,
  "Community Domain dashboard Identity lane must show read-only affiliation readiness without implying domain-domain affiliation creation, parent/child domain creation, affiliation decisions, social Community linking, member transfer, inherited policy, billing, verification, public URLs, marketplace activity, money movement, TrustSlips, Trust Passport writes, or private record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /Community bridge readiness[\s\S]*primary_next_action[\s\S]*bridge_status[\s\S]*upgrade_path_status[\s\S]*linked_member_count[\s\S]*This view only shows community bridge readiness[\s\S]*does not create or\s+upgrade an ordinary community, connect private records, decide\s+affiliations, copy or invite members, move marketplace activity,\s+activate billing, verify authority, merge records, or show private\s+member records/,
  "Community Domain dashboard Identity lane must show read-only social bridge readiness without implying social Community creation, Community upgrade, clan_id linking, affiliation writes or decisions, member copying/invites, marketplace movement, billing activation, authority verification, record merging, or private member exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /Institutional profile[\s\S]*primary_next_action[\s\S]*template_label[\s\S]*marketplace_role[\s\S]*active_member_count[\s\S]*active_policy_count[\s\S]*This view only shows institutional profile readiness[\s\S]*does not create\s+structures, members, policies, reviews, evidence, billing packages,\s+shops, payments, finance records, community links, verification,\s+activation, public pages, or private records/,
  "Community Domain dashboard Identity lane must show read-only institutional profile classification without implying custom schema, tenant, billing package, node/member/policy/review/evidence writes, marketplace/shop/payment/finance records, social Community links, verification, activation, publication, or private record exposure.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/IdentityReadinessPanels.tsx",
  /GSN could not load the read-only (institutional profile|community bridge view|affiliation readiness view)/,
  "Community Domain Identity load states must avoid old read-only profile/bridge/affiliation wording in visible fallback copy.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/BillingReadinessPanels.tsx",
  /Subscription lifecycle[\s\S]*primary_next_action[\s\S]*pricing_status[\s\S]*billing_status[\s\S]*renewal_status[\s\S]*This view only shows package, pricing, billing, and renewal status[\s\S]*does not take payment, issue receipts, activate or renew the domain,\s+move money, or show private records/,
  "Community Domain dashboard Billing lane must show read-only subscription lifecycle without implying quote acceptance, payment instruction, expected payment, payment records, invoices, receipts, billing activation, Community Domain activation, entitlements, renewal, suspension, reactivation, authority verification, money movement, or private record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/StructurePreviewPanel"\)[\s\S]*listCommunityDomainNodeTree[\s\S]*CommunityDomainStructurePreviewPanel[\s\S]*nodeTree=\{nodeTree\}/,
  "Community Domain dashboard Structure lane must lazy-load the compact read-only node-tree preview and pass the raw node tree from the parent route.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /STRUCTURE_DETAIL_OPTIONS[\s\S]*key: "preview"[\s\S]*key: "foundation"[\s\S]*key: "boundary"[\s\S]*key: "activity"[\s\S]*key: "planning"[\s\S]*activeStructureDetail[\s\S]*community-domain-dashboard\.structure-detail\.\$\{option\.key\}[\s\S]*activeStructureDetail === "preview"[\s\S]*CommunityDomainStructurePreviewPanel[\s\S]*activeStructureDetail === "foundation"[\s\S]*variant="structureFoundation"[\s\S]*activeStructureDetail === "boundary"[\s\S]*variant="structureBoundary"[\s\S]*activeStructureDetail === "activity"[\s\S]*variant="structureActivity"[\s\S]*activeStructureDetail === "planning"[\s\S]*CommunityDomainStructurePlanningPanels/,
  "Community Domain dashboard Structure lane must expose one focused institutional detail view at a time instead of dumping all Structure panels on first open.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /structurePreviewRows|visibleStructureRows/,
  "Community Domain dashboard parent must not precompute Structure preview rows before handing the raw node tree to the lazy Structure Preview component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePreviewPanel.tsx",
  /function structurePreviewRows[\s\S]*const roots = Array\.isArray\(nodes\) \? nodes : \[\][\s\S]*firstChildren\.slice\(0, 4\)[\s\S]*return rows\.slice\(0, 5\)[\s\S]*const visibleStructureRows = structurePreviewRows\(nodeTree\)/,
  "Lazy Community Domain Structure Preview component must derive compact preview rows from the raw node tree.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePreviewPanel.tsx",
  /Structure preview[\s\S]*shown from the Community Domain tree[\s\S]*No operating-unit structure has been mapped yet[\s\S]*does not create nodes, change parentage, place\s+members, grant roles,\s+activate billing, or verify a branch/,
  "Community Domain dashboard Structure lane must show a compact read-only node-tree preview without implying structure writes or authority changes.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/StructurePlanningPanels"\)[\s\S]*CommunityDomainStructurePlanningPanels[\s\S]*rolloutPlan=\{rolloutPlan\}[\s\S]*activityMap=\{activityMap\}[\s\S]*activityGroupReadiness=\{activityGroupReadiness\}/,
  "Community Domain dashboard Structure lane must lazy-load rollout, activity map, and activity-group readiness panels with raw maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /rolloutPlanCounts|visibleRolloutPhases|openRolloutPhases|visibleRolloutUnits|rolloutUnitsNeedingAttention|activityMapSummary|activityMapTemplate|visibleActivityMapLanes|blockedActivityMapLanes|activityMapReadyTotal|activityGroupSummary|visibleActivityGroups|blockedActivityGroups|activityGroupReadyTotal/,
  "Community Domain dashboard parent must not precompute Structure lane rollout, activity map, or activity-group summaries, ready totals, lane lists, or attention lists before handing raw maps to the lazy Structure Planning component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /function readinessLanes[\s\S]*function readyTotal[\s\S]*function openRolloutPhases[\s\S]*function rolloutUnitsNeedingAttention[\s\S]*function activityGroupRows[\s\S]*rolloutPlan\?\.counts[\s\S]*openRolloutPhases\(rolloutPlan\)[\s\S]*rolloutUnitsNeedingAttention\(rolloutPlan\)[\s\S]*activityMap\?\.summary[\s\S]*activityMap\?\.template[\s\S]*readinessLanes\(activityMap\)[\s\S]*activityGroupReadiness\?\.summary[\s\S]*activityGroupRows\(activityGroupReadiness\)/,
  "Lazy Community Domain Structure Planning component must derive rollout counts, rollout attention, activity map lanes, activity map ready totals, and activity-group rows from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /humanStatus[\s\S]*function compactStatus[\s\S]*return humanStatus\(value\)[\s\S]*gridTemplateColumns: "minmax\(0, 1fr\)"[\s\S]*justifySelf: "start"/,
  "Community Domain Structure planning rows must use shared human status language and stack phone text instead of squeezing copy beside maker-language status pills.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /statusBadge\("not_created_in_this_slice"\)|gridTemplateColumns: "minmax\(0, 1fr\) auto"/,
  "Community Domain Structure planning rows must not pass raw slice statuses into visible badges or return to two-column phone rows.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /Rollout plan[\s\S]*primary_next_action[\s\S]*Current phase:[\s\S]*First units[\s\S]*rolloutPlanCounts\.first_level_units[\s\S]*Ready units[\s\S]*rolloutPlanCounts\.ready_units[\s\S]*Units needing attention[\s\S]*This view only shows rollout steps and units needing attention[\s\S]*does not\s+change structure, membership, authority, billing, public pages, marketplace\s+activity, money, or private evidence/,
  "Community Domain dashboard Structure lane must show the backend rollout plan as read-only institutional onboarding guidance without implying structure writes, invitations, placements, policy creation, billing, publishing, marketplace activity, social Community creation, money movement, or private evidence access.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /Activity map[\s\S]*primary_next_action[\s\S]*activity_lane_count[\s\S]*active_operating_unit_count[\s\S]*active_policy_count[\s\S]*paid_activity_status[\s\S]*scheduled_activity_status[\s\S]*This view only shows activity planning[\s\S]*does not create activities,\s+payments, marketplace records, notifications, trust records, public proof,\s+money movement, or private member records/,
  "Community Domain dashboard Structure lane must show read-only activity map planning without implying activity/event/attendance/dues/payment/marketplace/notification/TrustSlip/Trust Passport/public proof/private-record writes.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/StructurePlanningPanels.tsx",
  /Group readiness[\s\S]*primary_next_action[\s\S]*activity_group_candidate_count[\s\S]*Units[\s\S]*activityGroupSummary\.node_count[\s\S]*Unit members[\s\S]*active_node_memberships[\s\S]*active_policies[\s\S]*review_records[\s\S]*activity_group_engine_status[\s\S]*activity_group_records_created[\s\S]*rosca_cycles_created[\s\S]*This view only shows group planning[\s\S]*does not create groups, ROSCA\s+cycles, attendance, payment records, marketplace records, notifications,\s+trust records, or private member records/,
  "Community Domain dashboard Structure lane must show read-only activity-group readiness without implying group/ROSCA/attendance/payment/marketplace/notification/TrustSlip/Trust Passport/private-member writes.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  /Member verification readiness[\s\S]*primary_next_action[\s\S]*active_member_count[\s\S]*members_with_gsn_id[\s\S]*members_without_unit_placement[\s\S]*open_member_review_count[\s\S]*credential_issuance_status[\s\S]*This view only shows member readiness[\s\S]*does not verify identity,\s+issue credentials, change members or roles, decide reviews, publish\s+proof, create trust records, move money, or show private member records/,
  "Community Domain dashboard Members lane must show read-only member verification readiness without implying KYC/credential/member/role/review/evidence/TrustSlip/Trust Passport writes or private record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /lazy\([\s\S]*import\("\.\/communityDomainDashboard\/GovernanceReadinessPanels"\)[\s\S]*reviewStatusCounts[\s\S]*governanceReviewCounts[\s\S]*governancePendingCount[\s\S]*governanceApprovedCount[\s\S]*institutionalOpenReviewCount[\s\S]*CommunityDomainGovernanceReadinessPanels[\s\S]*governanceAttentionCount=\{governanceAttentionCount\}[\s\S]*institutionalOpenReviewCount=\{institutionalOpenReviewCount\}[\s\S]*delegationMap=\{delegationMap\}[\s\S]*governanceCoverage=\{governanceCoverage\}/,
  "Community Domain dashboard Governance lane must lazy-load display-only governance readiness panels, keep personal reviewer-queue pressure distinct from institutional open-review pressure, and pass only raw delegation/coverage maps from the parent route.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /governanceCoverageCounts|visibleGovernanceCoverageNodes|governanceCoverageGaps|delegationMapSummary|visibleDelegationLanes|blockedDelegationLanes|delegationReadyTotal/,
  "Community Domain dashboard parent must not precompute Governance lane delegation or coverage summaries, ready totals, lane lists, or gap lists before handing raw maps to the lazy Governance component.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /function readinessLanes[\s\S]*function readyTotal[\s\S]*function governanceCoverageGaps[\s\S]*delegationMap\?\.summary[\s\S]*readinessLanes\(delegationMap\)[\s\S]*readyTotal\(delegationMap, visibleDelegationLanes\)[\s\S]*governanceCoverage\?\.counts[\s\S]*governanceCoverageGaps\(governanceCoverage\)/,
  "Lazy Community Domain Governance readiness component must derive delegation summary, lane lists, ready totals, blocked lanes, coverage counts, and coverage gaps from raw maps.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /GOVERNANCE_DETAIL_OPTIONS[\s\S]*key: "review"[\s\S]*key: "delegation"[\s\S]*key: "coverage"[\s\S]*activeGovernanceDetail[\s\S]*community-domain-governance\.detail\.\$\{option\.key\}[\s\S]*activeGovernanceDetail === "review"[\s\S]*Governance review pulse[\s\S]*activeGovernanceDetail === "delegation"[\s\S]*Delegation map[\s\S]*activeGovernanceDetail === "coverage"[\s\S]*Governance coverage/,
  "Community Domain Governance readiness panel must expose one focused governance packet at a time instead of dumping review pulse, delegation, and coverage together.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /reviewPulseRows[\s\S]*Needs review[\s\S]*Ready to apply[\s\S]*Access requests[\s\S]*Governance review pulse[\s\S]*Your open decisions show what you can handle now[\s\S]*This view only shows governance review pressure[\s\S]*does not decide reviews,\s+apply membership, assign roles, show private evidence, or bypass reviewer policy/,
  "Community Domain dashboard Governance lane must show a compact review pulse without deciding reviews, applying membership, or exposing private review evidence.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /Governance coverage[\s\S]*primary_next_action[\s\S]*local admins and policy coverage[\s\S]*Domain policies[\s\S]*governanceCoverageCounts\.domain_policies[\s\S]*Needs admin[\s\S]*governanceCoverageCounts\.needs_local_admin[\s\S]*Needs policy[\s\S]*governanceCoverageCounts\.needs_policy[\s\S]*This view only shows governance coverage[\s\S]*does not create policy,\s+assign roles, decide or apply reviews, verify authority, move money,\s+activate billing, publish a public page, create marketplace activity,\s+or show private review records/,
  "Community Domain dashboard Governance lane must show read-only governance coverage without implying policy creation, role assignment, review decisions, authority verification, billing, publishing, marketplace activity, social Community creation, or private review access.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /Delegation map[\s\S]*primary_next_action[\s\S]*central_authority_count[\s\S]*operating_units_with_local_admin[\s\S]*active_policy_count[\s\S]*open_review_count[\s\S]*This view only shows authority planning[\s\S]*does not assign roles, create\s+memberships or policies, decide or apply reviews, change inheritance,\s+verify authority, activate billing, publish public proof, create marketplace\s+activity, move money, or show private member records/,
  "Community Domain dashboard Governance lane must show read-only delegation authority without implying role assignment, node memberships, policy/review writes, inheritance changes, authority verification, billing, marketplace activity, social Community creation, proof publication, or private record exposure.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  /Your placement[\s\S]*Active operating-unit placements[\s\S]*This view only shows your placement[\s\S]*Admins still control placement,\s+role changes, and review decisions/,
  "Community Domain dashboard Members lane must show the current viewer's read-only placement summary without implying self-service placement or role changes.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/MemberReadinessPanels.tsx",
  /Member and role summary[\s\S]*safe domain-level counts[\s\S]*Active members[\s\S]*counts\.active_members[\s\S]*Role placements[\s\S]*counts\.active_node_memberships[\s\S]*Open reviews[\s\S]*counts\.open_reviews[\s\S]*refresh the dashboard[\s\S]*does not show private member lists, assign roles,\s+place members, decide reviews, or grant permissions/,
  "Community Domain dashboard Members lane must show a safe count-only fallback when the viewer placement view is not available.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /cancelCommunityDomainActionReview[\s\S]*reviseCommunityDomainActionReview[\s\S]*lazy\([\s\S]*import\("\.\/communityDomainDashboard\/DashboardRecoveryPanel"\)[\s\S]*requestDomainAccess[\s\S]*Requesting access from the Community Domain dashboard[\s\S]*must still be approved and applied before membership changes[\s\S]*community_domain_membership_request_pending[\s\S]*errorDetailActionReview[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*Review \$\{existingReviewId\} still needs owner\/admin resolution and apply[\s\S]*community_domain_member_already_active[\s\S]*activeMembershipRecoveryMessage\(\)[\s\S]*withdrawOwnMembershipRequest[\s\S]*cancelCommunityDomainActionReview[\s\S]*Applicant withdrew their own Community Domain access request[\s\S]*Access request withdrawn[\s\S]*community_domain_review_has_revision[\s\S]*errorDetailActionReview[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*Continue from review[\s\S]*instead of withdrawing the earlier request[\s\S]*reviseOwnMembershipRequest[\s\S]*Applicant updated their Community Domain access request[\s\S]*reviseCommunityDomainActionReview[\s\S]*Updated access request sent[\s\S]*must still be approved and applied before membership changes[\s\S]*community_domain_review_revision_exists[\s\S]*errorDetailActionReview[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*Continue from review[\s\S]*instead of creating another update[\s\S]*community_domain_member_already_active[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*activeMembershipRecoveryMessage\(\)[\s\S]*CommunityDomainDashboardRecoveryPanel[\s\S]*latestMembershipRequest=\{latestMembershipRequest\}[\s\S]*busyMembershipRequest=\{busyMembershipRequest\}[\s\S]*onRetry=\{loadDashboard\}[\s\S]*onRequestDomainAccess=\{requestDomainAccess\}[\s\S]*onReviseMembershipRequest=\{reviseOwnMembershipRequest\}[\s\S]*onWithdrawMembershipRequest=\{withdrawOwnMembershipRequest\}/,
  "Community Domain dashboard denied-access state must keep the real membership request, revision, and withdrawal paths in the parent while lazy-loading recovery UI without implying instant membership.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /listMyCommunityDomainMembershipRequests[\s\S]*actionReviewSortValue[\s\S]*updated_at[\s\S]*created_at[\s\S]*actionReviewIdValue[\s\S]*Number\(item\.id\)[\s\S]*compareActionReviewsNewest[\s\S]*actionReviewSortValue\(right\) - actionReviewSortValue\(left\)[\s\S]*actionReviewIdValue\(right\) - actionReviewIdValue\(left\)[\s\S]*latestRelevantMembershipRequest[\s\S]*pending_review[\s\S]*needs_changes[\s\S]*approved[\s\S]*supersededParentIds[\s\S]*parent_review_id[\s\S]*currentItems[\s\S]*!supersededParentIds\.has\(cleanText\(item\.id\)\)[\s\S]*sort\(compareActionReviewsNewest\)[\s\S]*allItems[\s\S]*sort\(compareActionReviewsNewest\)[\s\S]*loadOwnMembershipRequests[\s\S]*listMyCommunityDomainMembershipRequests[\s\S]*latestMembershipRequest = latestRelevantMembershipRequest\(ownMembershipRequests\)[\s\S]*CommunityDomainDashboardRecoveryPanel[\s\S]*latestMembershipRequest=\{latestMembershipRequest\}/,
  "Community Domain dashboard denied-access state must hand only the current user's own membership-request status to the recovery panel, prefer open request rows, sort deterministically by review freshness with review-id tie-breaking, and ignore superseded parent reviews once a child revision exists.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /membershipRequestStatusText|membershipRequestButtonLabel|Cannot open dashboard|Cannot load domains|community-domain-dashboard\.error\.request-membership/,
  "Community Domain dashboard parent must not own denied-access recovery copy or request button rendering after handing data and handlers to the lazy recovery panel.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/DashboardRecoveryPanel.tsx",
  /parent_review_id[\s\S]*required_approvals[\s\S]*approval_count[\s\S]*onReviseMembershipRequest[\s\S]*numericCount[\s\S]*isRevisionContinuation[\s\S]*fieldStyle[\s\S]*fontSize: 16[\s\S]*membershipRequestStatusText[\s\S]*membershipApprovalProgressText[\s\S]*An owner\/admin still needs to approve and apply[\s\S]*withdraw it before it is applied[\s\S]*needs changes before an owner\/admin can continue[\s\S]*Reviewer-private notes are not shown here[\s\S]*member title, invite reference, department, class, or relationship proof[\s\S]*owner\/admin review[\s\S]*cancelled[\s\S]*rejected[\s\S]*earlier request already has a follow-up record[\s\S]*continue from this revision instead of starting over[\s\S]*was withdrawn before membership was added[\s\S]*request access again[\s\S]*was applied before[\s\S]*current membership is no longer active[\s\S]*membershipApprovalProgressText[\s\S]*approvals are recorded[\s\S]*more needed before apply[\s\S]*membershipRequestButtonLabel[\s\S]*Working[\s\S]*Withdraw request[\s\S]*Send update above[\s\S]*Request access[\s\S]*latestMembershipRequestId[\s\S]*isMembershipRequestContinuation[\s\S]*canReviseMembershipRequest[\s\S]*needs_changes[\s\S]*cancelled[\s\S]*rejected[\s\S]*canWithdrawMembershipRequest[\s\S]*latestMembershipRequestStatus === "approved"[\s\S]*continuationNeedsRevision[\s\S]*requestAccessLocked[\s\S]*busyMembershipRequest[\s\S]*continuationNeedsRevision[\s\S]*useEffect\(\(\) => \{[\s\S]*setRevisionTitle\(""\)[\s\S]*setRevisionNote\(""\)[\s\S]*\}, \[latestMembershipRequestId\]\)[\s\S]*Cannot open dashboard[\s\S]*Cannot load domains[\s\S]*Your access request[\s\S]*Review \$\{reviewId\} - [\s\S]*Member title or proof label[\s\S]*Add the safe detail the owner\/admin should check[\s\S]*Add only details you can safely share with the Community Domain[\s\S]*community-domain-dashboard\.error\.revise-membership[\s\S]*onReviseMembershipRequest\(latestMembershipRequest[\s\S]*Send update[\s\S]*Try again[\s\S]*Community Home[\s\S]*Purchase path[\s\S]*community-domain-dashboard\.error\.request-membership[\s\S]*onWithdrawMembershipRequest\(latestMembershipRequest\)/,
  "Lazy Community Domain dashboard recovery panel must show denied-access recovery, own request status with approval progress, safe routes, 16px native revision fields, plain request-history separators, and real request-access, revision, or withdrawal actions without implying instant membership, trapping applied historical reviews in a retry loop, or locking approved-but-unapplied applicant withdrawal.",
  { frontend: true }
);

assertNotContains(
  "src/pages/communityDomainDashboard/DashboardRecoveryPanel.tsx",
  /latestMembershipRequestStatus === "applied"[\s\S]*\? onRetry/,
  "Applied historical membership reviews in the denied-access recovery panel must not force the request-access button to retry the dashboard instead of allowing reactivation intake.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/GovernanceReadinessPanels.tsx",
  /institutionalOpenReviewCount[\s\S]*reviewPulseRows[\s\S]*Needs review[\s\S]*Ready to apply[\s\S]*isAdmin[\s\S]*Institution open[\s\S]*institutionalOpenReviewCount[\s\S]*Access requests[\s\S]*Governance review pulse[\s\S]*Your open decisions show what you can handle now[\s\S]*Approved items may still need an authorized admin to apply them[\s\S]*reviewPulseRows\.map[\s\S]*You have no pending decision in your review queue[\s\S]*institutional review pressure[\s\S]*Another\s+eligible reviewer may need to decide[\s\S]*approved review may\s+still need apply/,
  "Lazy Community Domain Governance panel must distinguish the current admin's scoped reviewer queue from broader institutional open-review pressure, and must not show the institution-open badge to non-admin members as a false zero.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /applyCommunityDomainActionReview[\s\S]*decideCommunityDomainActionReview[\s\S]*getCommunityDomainReviewerQueue[\s\S]*listCommunityDomainActionReviews[\s\S]*lazy\([\s\S]*import\("\.\/communityDomainDashboard\/AccessRequestsPanel"\)[\s\S]*remainingAccessApprovalMessage[\s\S]*required_approvals[\s\S]*approval_count[\s\S]*more approvals before membership can be applied[\s\S]*isSelfServiceMembershipAccessRequest[\s\S]*requestedBy[\s\S]*subjectUser[\s\S]*targetUser[\s\S]*payloadUser[\s\S]*payloadHasRole[\s\S]*payloadHasStatus[\s\S]*payloadRole[\s\S]*payloadStatus[\s\S]*domain_member\.upsert[\s\S]*target_type[\s\S]*domain_member[\s\S]*previous_status[\s\S]*payloadHasRole[\s\S]*payloadRole === "member"[\s\S]*payloadHasStatus[\s\S]*payloadStatus === "active"[\s\S]*requestedBy === subjectUser[\s\S]*requestedBy === targetUser[\s\S]*requestedBy === payloadUser[\s\S]*accessRequestSortPriority[\s\S]*status === "approved"[\s\S]*status === "pending_review"[\s\S]*status === "pending"[\s\S]*sortMembershipAccessRequests[\s\S]*compareActionReviewsNewest\(left, right\)[\s\S]*membershipAccessRequests[\s\S]*sortMembershipAccessRequests\([\s\S]*filter\(isSelfServiceMembershipAccessRequest\)[\s\S]*loadAccessReviewItems[\s\S]*if \(!isAdmin\)[\s\S]*reviewerQueueLoadSequence\.current \+= 1[\s\S]*setReviewerQueue\(\[\]\)[\s\S]*getCommunityDomainReviewerQueue[\s\S]*status: "approved"[\s\S]*handleAccessRequestReviewError[\s\S]*community_domain_review_has_revision[\s\S]*Continue from review \$\{existingReviewId\} instead of acting on the earlier request[\s\S]*accessRequestApplyErrorMessage\(err, fallback\)[\s\S]*applyAfterApproval[\s\S]*decisionPayload\?\.action_review\?\.status !== "approved"[\s\S]*remainingAccessApprovalMessage\([\s\S]*decisionPayload\?\.action_review[\s\S]*refreshReviewerQueue[\s\S]*applyCommunityDomainActionReview[\s\S]*handleAccessRequestReviewError\([\s\S]*GSN could not process this Community Domain access request[\s\S]*declineAccessRequest[\s\S]*decision: "reject"[\s\S]*handleAccessRequestReviewError\([\s\S]*GSN could not decline this Community Domain access request[\s\S]*requestChangesForAccessRequest[\s\S]*decision: "needs_changes"[\s\S]*The applicant must update the request before membership can be approved or applied[\s\S]*sent back for updates[\s\S]*membership was not added[\s\S]*handleAccessRequestReviewError\([\s\S]*GSN could not send this Community Domain access request back for updates[\s\S]*applyApprovedAccessRequest[\s\S]*handleAccessRequestReviewError\([\s\S]*GSN could not add this approved Community Domain member[\s\S]*CommunityDomainAccessRequestsPanel[\s\S]*membershipAccessRequests=\{membershipAccessRequests\}[\s\S]*onApproveOnly=\{\(review\) => approveAccessRequest\(review, false\)\}[\s\S]*onRequestChanges=\{requestChangesForAccessRequest\}[\s\S]*onDecline=\{declineAccessRequest\}[\s\S]*onApproveAndApply=\{\(review\) => approveAccessRequest\(review, true\)\}[\s\S]*onApplyApproved=\{applyApprovedAccessRequest\}/,
  "Community Domain dashboard owner/admin view must keep access-review API decisions in the parent route, guard and invalidate access-review reads for non-admins, show only self-service membership access/reactivation requests in the access panel, expose approve/needs-changes/reject decision paths, translate superseded parent decision/apply errors into latest-revision guidance, and lazy-load the admin access request panel.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /nextDashboard\?\.viewer\?\.can_admin[\s\S]*queueRequestId = reviewerQueueLoadSequence\.current \+ 1[\s\S]*reviewerQueueLoadSequence\.current = queueRequestId[\s\S]*canApplyQueue[\s\S]*reviewerQueueLoadSequence\.current === queueRequestId[\s\S]*getCommunityDomainReviewerQueue\(requestDomainId\)[\s\S]*listCommunityDomainActionReviews\(requestDomainId, \{ status: "approved" \}\)[\s\S]*if \(!canApplyQueue\(\)\) return[\s\S]*setReviewerQueue\(mergeActionReviews\(pendingItems, approvedItems\)\)[\s\S]*catch[\s\S]*if \(canApplyQueue\(\)\)[\s\S]*setReviewerQueue\(\[\]\)/,
  "Community Domain dashboard initial admin access-review load must use the same reviewer-queue sequence guard as manual refreshes, so an older dashboard-load response cannot overwrite a newer access-request refresh.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /parsedErrorDetail[\s\S]*JSON\.parse\(message\)[\s\S]*errorDetailCode[\s\S]*community_domain_member_review_stale[\s\S]*errorDetailMessage[\s\S]*errorDetailActionReview[\s\S]*action_review[\s\S]*existing_action_review[\s\S]*accessRequestApplyErrorMessage[\s\S]*already out of date[\s\S]*active member[\s\S]*Refresh access requests[\s\S]*activeMembershipRecoveryMessage[\s\S]*already recorded as an active member[\s\S]*Try opening the dashboard again[\s\S]*handleAccessRequestReviewError[\s\S]*community_domain_review_has_revision[\s\S]*errorDetailActionReview\(err\)[\s\S]*refreshReviewerQueue\(\)[\s\S]*Continue from review[\s\S]*accessRequestApplyErrorMessage\(err, fallback\)[\s\S]*requestDomainAccess[\s\S]*errorDetailCode\(err\)[\s\S]*errorDetailMessage\(/,
  "Community Domain dashboard must parse structured backend errors from direct detail or serialized message text, extract scoped action-review pointers, translate stale membership apply failures into owner-facing recovery guidance, translate superseded parent access-request actions into latest-revision guidance, translate active-member applicant recovery into dashboard retry guidance, and keep duplicate access-request recovery copy reachable.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /setMessage\(\s*err\?\.message\s*\|\|/,
  "Community Domain dashboard user-facing errors must use structured backend detail helpers instead of raw backend message fallbacks.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /activeMembershipRecoveryMessage[\s\S]*already recorded as an active member[\s\S]*Try opening the dashboard again[\s\S]*requestDomainAccess[\s\S]*community_domain_member_already_active[\s\S]*loadDashboard\(\)[\s\S]*activeMembershipRecoveryMessage\(\)[\s\S]*withdrawOwnMembershipRequest[\s\S]*community_domain_member_already_active[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*activeMembershipRecoveryMessage\(\)[\s\S]*reviseOwnMembershipRequest[\s\S]*community_domain_member_already_active[\s\S]*loadOwnMembershipRequests\(requestDomainId\)[\s\S]*activeMembershipRecoveryMessage\(\)/,
  "Community Domain dashboard denied-access request, withdrawal, and revision paths must all recover active-member conflicts by reopening the dashboard or refreshing requester status where needed, then guiding the applicant back to the dashboard.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /loadAccessReviewItems[\s\S]*errorDetailMessage[\s\S]*could not load the Community Domain access requests[\s\S]*Approved from the Community Domain access requests before applying membership[\s\S]*Approved from the Community Domain access requests\. Membership still needs apply[\s\S]*Declined from the Community Domain access requests\. No membership change was applied[\s\S]*Asked for changes from the Community Domain access requests/,
  "Community Domain dashboard access-request feedback must describe the merged access-request list, not a standalone access queue.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /Community Domain access queue/,
  "Community Domain dashboard must not describe access requests as a separate access queue.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /reviewUserLabel|reviewRequesterLabel|Approve only|Approve \+ add member/,
  "Community Domain dashboard parent must not own access-request card labels or action-button rendering after handing reviews and handlers to the lazy access request panel.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/AccessRequestsPanel.tsx",
  /parent_review_id[\s\S]*subject_user_email[\s\S]*required_approvals[\s\S]*approval_count[\s\S]*onRequestChanges[\s\S]*numericCount[\s\S]*selectStyle[\s\S]*fontSize: 16[\s\S]*reviewUserLabel[\s\S]*reviewRequesterLabel[\s\S]*approvalProgressText[\s\S]*requiredApprovals[\s\S]*approvalCount[\s\S]*Approvals complete[\s\S]*more needed before this can be added[\s\S]*followUpText[\s\S]*reviewStatus === "approved"[\s\S]*Apply membership from this row[\s\S]*Decide from this row[\s\S]*Follow-up to review[\s\S]*applicant's updated request[\s\S]*earlier request as history[\s\S]*requestLabel[\s\S]*Follow-up request[\s\S]*Membership request[\s\S]*showAllRequests[\s\S]*decisionByReviewId[\s\S]*"approve" \| "needs_changes" \| "reject"[\s\S]*visibleAccessRequests[\s\S]*membershipAccessRequests\.slice\(0, 3\)[\s\S]*hiddenRequestCount[\s\S]*Access requests[\s\S]*Review people asking to enter this domain[\s\S]*still need a decision[\s\S]*approved membership change[\s\S]*Approving records the decision;[\s\S]*visibleAccessRequests\.map[\s\S]*needsChangesBusy[\s\S]*selectedDecision[\s\S]*followUp[\s\S]*recordDecision[\s\S]*onRequestChanges\(review\)[\s\S]*onDecline\(review\)[\s\S]*onApproveOnly\(review\)[\s\S]*approvalProgress[\s\S]*safe update[\s\S]*needs-changes status[\s\S]*general\s+update guidance[\s\S]*Private reviewer notes stay inside the[\s\S]*owner\/admin review record[\s\S]*membership is not added[\s\S]*Ask for changes[\s\S]*Record decision[\s\S]*Add approved member[\s\S]*Approve, add if ready[\s\S]*community-domain-dashboard\.access-request\.toggle-all[\s\S]*Show first 3 requests[\s\S]*Show \$\{hiddenRequestCount\} more request[\s\S]*No open access requests[\s\S]*waiting for this account[\s\S]*community-domain-dashboard\.access-request\.refresh/,
  "Lazy Community Domain access request panel must expose pending and approved-but-unapplied self-service access requests, label follow-up revisions separately from fresh membership requests, show status-aware follow-up revision context from parent_review_id, keep approve/needs-changes/reject decisions separate from apply, explain that ask-for-changes sends applicant-safe update guidance while private reviewer notes stay inside the owner/admin record, show approval progress for multi-approval policies, preserve a visible apply path after approve-only, avoid silently hiding more than three requests, and use truthful empty-state copy.",
  { frontend: true }
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _action_review_payload[\s\S]*requester = getattr\(row, "requester", None\)[\s\S]*subject = getattr\(row, "subject", None\)[\s\S]*requested_by_user_email[\s\S]*subject_user_email/,
  "Backend action-review payload must include scoped requester and subject identity labels for owner/admin review queues."
);

assertContains(
  "src/lib/api.ts",
  /listMyCommunityDomains[\s\S]*\/community-domains\/my[\s\S]*getCommunityDomain\(/,
  "Frontend API layer must expose the signed-in Community Domain selector before single-domain reads.",
  { frontend: true }
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/my"[\s\S]*def list_my_community_domains[\s\S]*CommunityDomainMembership\.user_id == int\(current_user\.id\)[\s\S]*CommunityDomainMembership\.status == "active"[\s\S]*private member lists[\s\S]*payment instructions[\s\S]*verification authority[\s\S]*@router\.get\("\/\{community_domain_id\}"/,
  "Backend route must list only the current user's active Community Domain memberships before the single-domain route."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_user_can_list_own_active_community_domains_without_private_records[\s\S]*\/community-domains\/my[\s\S]*dashboard_path[\s\S]*test_my_community_domains_hides_inactive_and_unrelated_domains[\s\S]*Hidden Inactive Domain" not in outsider_list\.text/,
  "Backend tests must prove the current-user Community Domain selector hides unrelated and inactive domains."
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /draftActionLabel[\s\S]*Draft request created[\s\S]*\/app\/community-domain\/[\s\S]*Open domain dashboard/,
  "Community Domain purchase page must hand signed-in owners to the authenticated domain dashboard after draft creation.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /hasCreatedDraft[\s\S]*draftFormLocked[\s\S]*hasCreatedDraft \|\| busy === "draft"[\s\S]*disabled=\{hasCreatedDraft \|\| busy === "draft"\}[\s\S]*disabled=\{hasCreatedDraft \|\| busy === "draft"\}[\s\S]*disabled=\{hasCreatedDraft \|\| busy === "draft"\}[\s\S]*disabled=\{busy === "availability" \|\| draftFormLocked\}[\s\S]*Draft created/,
  "Community Domain purchase page must lock form inputs after draft creation or while the draft request is being created so the visible form cannot drift away from the created draft.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /draftActionLabel[\s\S]*Check name first[\s\S]*Choose another name[\s\S]*Sign in to create draft[\s\S]*if \(!availability\)[\s\S]*Check an available domain name before creating a draft request[\s\S]*if \(!availability\.available\)[\s\S]*Choose an available domain name before creating a draft request[\s\S]*if \(!isSignedIn\)[\s\S]*\/login\?force=1/,
  "Community Domain purchase draft action must explain missing availability before sending the owner to sign in.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /DOMAIN_ENGINE_POINTS[\s\S]*Governance[\s\S]*one owned home with clear roles and branches[\s\S]*Trust record[\s\S]*Preserve member, shop, service, and evidence history under one domain[\s\S]*Network reach[\s\S]*carry trust across the wider GSN network[\s\S]*Opportunity[\s\S]*Turn community-created value into visible, trusted opportunity/,
  "Community Domain purchase page must present the domain as an institutional engine for governance, trust records, network reach, and opportunity.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /PURCHASE_DRAFT_STORAGE_KEY[\s\S]*readPurchaseDraftSnapshot[\s\S]*savePurchaseDraftSnapshot[\s\S]*clearPurchaseDraftSnapshot[\s\S]*Your Community Domain draft was restored after sign-in[\s\S]*Check the name before creating the draft[\s\S]*if \(!isSignedIn\)[\s\S]*savePurchaseDraftSnapshot[\s\S]*\/login\?force=1[\s\S]*clearPurchaseDraftSnapshot/,
  "Community Domain purchase sign-in handoff must restore form details without preserving stale availability.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /function availabilityReasonText[\s\S]*reserved by GSN[\s\S]*Use letters, numbers, spaces, or hyphens[\s\S]*already in use[\s\S]*availabilityReasonText\(result\?\.reason\)[\s\S]*Reason: <strong>\{availabilityReasonText\(availability\.reason\)\}<\/strong>/,
  "Community Domain purchase availability errors must translate backend reason codes into plain user guidance.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /schools, unions, churches, markets, and other\s+recognized organizations[\s\S]*free self-created path remains a\s+Committee\/community entry[\s\S]*Committee path[\s\S]*Create a free Committee[\s\S]*lightweight group created by members[\s\S]*paid institutional Community Domains[\s\S]*Create free Committee/,
  "Community Domain purchase page must visibly separate the lightweight Committee/community path from the paid institutional Community Domain path.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /Create Community|Create a free community|Free social\/community start|normal GSN community|paid institutional domain purchase path|live social Community/,
  "Community Domain purchase page must not blur the Committee/community compatibility path with the institutional Community Domain purchase path.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /\/app\/community-domain[\s\S]*community-domain-purchase\.open-my-domains[\s\S]*Open my Community Domains[\s\S]*Sign in to open domains/,
  "Community Domain purchase page must let returning signed-in owners or members recover the authenticated domain selector.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /lookupCommunityDomainByName[\s\S]*handleFindExistingDomain[\s\S]*Existing domain code[\s\S]*community-domain-purchase\.lookup-existing-domain[\s\S]*Find domain[\s\S]*community-domain-purchase\.open-found-domain[\s\S]*Open or request access[\s\S]*Sign in to request access/,
  "Community Domain purchase screen must let users find an existing domain by code without implying instant membership.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /community-domain-purchase\.sign-in|Sign in as existing member/,
  "Community Domain purchase page must not show a second competing sign-in action inside the returning-owner panel.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /backend status proves it/,
  "Community Domain purchase user copy must not expose builder-facing backend language.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH = 980[\s\S]*window\.innerWidth <= COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH[\s\S]*setIsCompact\(window\.innerWidth <= COMMUNITY_DOMAIN_PURCHASE_COMPACT_WIDTH\)/,
  "Community Domain purchase page must use a phone-safe compact breakpoint before the status aside can squeeze card text into one-word columns.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /aside style=\{\{ display: "grid", gap: 12, minWidth: 0 \}\}[\s\S]*overflowWrap: "normal"[\s\S]*wordBreak: "normal"[\s\S]*hyphens: "none"[\s\S]*Payment instructions, confirmation, and activation are separate/,
  "Community Domain purchase payment/draft status cards must stay readable and avoid narrow word-stacking.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainPurchasePage.tsx",
  /letterSpacing:\s*(?:"0\.[1-9][0-9]*em"|(?:0\.[1-9][0-9]*|[1-9][0-9.]*))/,
  "Community Domain purchase page must not use spaced-out micro-label typography.",
  { frontend: true }
);

assertNotContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /backend status proves it/,
  "Community Domain dashboard user copy must not expose builder-facing backend language.",
  { frontend: true }
);

assertContains(
  "src/pages/LoginPage.tsx",
  /function safeAppReturnTarget\(value: unknown\): string \{[\s\S]*target === "\/app" \|\| target\.startsWith\("\/app\/"\)[\s\S]*const nextTarget = safeAppReturnTarget\(searchParams\.get\("next"\)\);[\s\S]*if \(nextTarget\) return nextTarget;[\s\S]*nav\(publishRecoveryTarget\(\) \|\| redirectTarget/,
  "Login must preserve authenticated /app continuations such as the Community Domain selector after sign-in.",
  { frontend: true }
);

assertContains(
  "docs/SCREEN_SPECS.md",
  /## SignUpChoicePage[\s\S]*Purchase Community Domain card[\s\S]*Purchase Community Domain goes to CommunityDomainPurchasePage[\s\S]*must not be\s+merged into ordinary Create Community/,
  "Sign-up choice must expose Purchase Community Domain as a separate institutional path."
);

assertContains(
  "docs/SCREEN_SPECS.md",
  /## CommunityDomainPurchasePage[\s\S]*domain name availability result[\s\S]*Do not say `Verified Community Domain` unless backend status proves[\s\S]*Payment instruction generation must be separated from payment confirmation\s+and domain activation/,
  "Community Domain purchase screen contract must separate draft, payment instruction, activation, and verification."
);

assertContains(
  "docs/SCREEN_SPECS.md",
  /## CommunityDomainDashboardPage[\s\S]*institutional operating surface[\s\S]*one opened lane at a time[\s\S]*Payment, package quote, and renewal status must not be shown as verification/,
  "Community Domain dashboard contract must preserve guided operation and verification boundaries."
);

assertContains(
  "docs/COMMUNITY_DOMAIN_IMPLEMENTATION_PLAN_2026-06-28.md",
  /Society-Fit Template Framework[\s\S]*School[\s\S]*Church \/ religious body[\s\S]*Union \/ professional body[\s\S]*Market \/ cooperative[\s\S]*templates are presets, not separate schemas/,
  "Implementation plan must keep templates as presets that fit real institutions without schema forks."
);

assertContains(
  "docs/COMMUNITY_DOMAIN_IMPLEMENTATION_PLAN_2026-06-28.md",
  /Open Product Decisions[\s\S]*Should the public URL be `\/domains\/:name` or `\/community-domains\/:name`/,
  "Public Community Domain URL remains an open decision and must not be silently finalized."
);

assertContains(
  "src/lib/api.ts",
  /checkCommunityDomainAvailability[\s\S]*listCommunityDomainTemplates[\s\S]*getCommunityDomainTemplateOperatingBlueprint[\s\S]*createCommunityDomainDraft[\s\S]*createCommunityDomainPackageQuote[\s\S]*getCommunityDomain[\s\S]*getCommunityDomainDashboard[\s\S]*getCommunityDomainOperatingMap[\s\S]*getCommunityDomainTemplateFit[\s\S]*getCommunityDomainSetupPlan[\s\S]*getCommunityDomainCapacityPlan[\s\S]*getCommunityDomainRolloutPlan[\s\S]*getCommunityDomainRolloutTree[\s\S]*getCommunityDomainNodeAutonomyMap[\s\S]*getCommunityDomainNodeEconomicMap[\s\S]*getCommunityDomainNodeActivityMap[\s\S]*getCommunityDomainNodeTrustMap[\s\S]*getCommunityDomainNodeParticipationMap[\s\S]*getCommunityDomainNodeServiceMap[\s\S]*getCommunityDomainNodePrivacyMap[\s\S]*getCommunityDomainNodeAnalyticsMap[\s\S]*getCommunityDomainNodeDomainBoundaryMap[\s\S]*getCommunityDomainNodeEvidenceAuthorityMap[\s\S]*getCommunityDomainNodeCommunicationMap[\s\S]*getCommunityDomainNodeVaultMap[\s\S]*getCommunityDomainNodeScheduledActivityMap[\s\S]*getCommunityDomainNodePaidActivityMap[\s\S]*getCommunityDomainGovernanceCoverage[\s\S]*getCommunityDomainAnalytics[\s\S]*getCommunityDomainEvidenceMap[\s\S]*getCommunityDomainEvidenceRecordReadiness[\s\S]*getCommunityDomainEvidenceReleaseReadiness[\s\S]*getCommunityDomainTrustRelayReadiness[\s\S]*getCommunityDomainNotificationScopeReadiness[\s\S]*getCommunityDomainTrustMobility[\s\S]*getCommunityDomainSubscriptionLifecycle[\s\S]*getCommunityDomainSocialBridge[\s\S]*getCommunityDomainAffiliationReadiness[\s\S]*getCommunityDomainInstitutionalProfile[\s\S]*getCommunityDomainDelegationMap[\s\S]*getCommunityDomainIdentityContext[\s\S]*getCommunityDomainActivityMap[\s\S]*getCommunityDomainActivityGroupReadiness[\s\S]*getCommunityDomainMemberVerificationMap[\s\S]*getCommunityDomainNetworkExchangeMap[\s\S]*getCommunityDomainRecordPrivacyMap[\s\S]*getCommunityDomainConfigurationMap[\s\S]*getCommunityDomainComplianceMap[\s\S]*getCommunityDomainAppealReadiness[\s\S]*listCommunityDomainServiceSettings[\s\S]*getCommunityDomainModuleScopeReadiness[\s\S]*getCommunityDomainEconomicParticipation[\s\S]*getCommunityDomainNetworkPresence[\s\S]*listCommunityDomainRoles[\s\S]*getCommunityDomainGovernanceModel[\s\S]*getCommunityDomainReadiness[\s\S]*getCommunityDomainVerificationRequirements[\s\S]*getCommunityDomainActivationRequirements[\s\S]*listCommunityDomainNodes[\s\S]*listCommunityDomainNodeTree[\s\S]*getCommunityDomainNodeOperatingSummary[\s\S]*listCommunityDomainPolicies[\s\S]*community_node_id: params\.community_node_id/,
  "Frontend API layer must expose template, template operating blueprint, draft, quote, dashboard, operating map, template fit, setup plan, capacity plan, rollout plan, rollout tree, node autonomy map, node economic map, node activity map, node trust map, node participation map, node service map, node privacy map, node analytics map, node domain-boundary map, node evidence-authority map, node communication map, node vault map, node scheduled activity map, node paid activity map, governance coverage, analytics, evidence map, trust mobility, subscription lifecycle, social bridge, affiliation readiness, institutional profile, delegation map, identity context, activity map, activity group readiness, member verification map, network exchange map, record privacy map, configuration map, compliance map, appeal readiness, service settings, module scope readiness, economic participation, network presence, roles, governance model, readiness, verification requirements, activation requirements, hierarchy tree, node operating summary, and node-scoped policy helpers.",
  { frontend: true }
);

assertContains(
  "src/lib/api.ts",
  /listCommunityDomainActionReviews[\s\S]*user_id\?: number \| string \| null[\s\S]*user_id: params\.user_id \|\| undefined[\s\S]*getCommunityDomainReviewerQueue[\s\S]*community_node_id\?: number \| string \| null[\s\S]*include_descendants\?: boolean \| null[\s\S]*include_decided\?: boolean \| null[\s\S]*community_node_id: params\.community_node_id \|\| undefined[\s\S]*include_descendants: params\.include_descendants \? true : undefined[\s\S]*getCommunityDomainActionReviewSummary[\s\S]*reviseCommunityDomainActionReview[\s\S]*applyCommunityDomainActionReview[\s\S]*addCommunityDomainActionReviewEvidence/,
  "Frontend API layer must expose action-review governance helpers, including member-filtered action-review listing and node-filtered reviewer queues.",
  { frontend: true }
);

assertContains(
  "src/lib/api.ts",
  /listCommunityDomainMembers[\s\S]*getCommunityDomainMemberPlacementSummary[\s\S]*upsertCommunityDomainMember/,
  "Frontend API layer must expose member placement summary between member listing and member write helpers.",
  { frontend: true }
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_policy_listing_can_be_scoped_to_one_community_node[\s\S]*bool_scoped_policy[\s\S]*"community_node_id": True[\s\S]*bool_scoped_policy\.status_code == 422[\s\S]*community_node_id[\s\S]*assert scoped_payload\["total"\] == 1[\s\S]*assert missing_node_policies\.status_code == 404/,
  "Backend tests must prove node-scoped policy filtering for institutional hierarchy and reject boolean node-scope ids before they can coerce to numeric ids."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/templates"[\s\S]*def list_community_domain_templates[\s\S]*COMMUNITY_DOMAIN_TEMPLATE_PRESETS[\s\S]*do not create a Community Domain[\s\S]*separate schemas/,
  "Backend route must expose public Community Domain template presets without creation, activation, verification, or schema forks."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_community_domain_templates_are_public_presets_not_activation[\s\S]*\/community-domains\/templates[\s\S]*school_multi_branch[\s\S]*market_cooperative[\s\S]*db\.query\(CommunityDomain\)\.count\(\) == 0/,
  "Backend tests must prove template catalog presets are public and do not create records."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /COMMUNITY_DOMAIN_TEMPLATE_ALIASES[\s\S]*"union": "professional_union"[\s\S]*"market_association": "market_cooperative"[\s\S]*def _clean_template_key[\s\S]*lower\(\)[\s\S]*re\.sub\(r"\[\\s-\]\+"[\s\S]*def _domain_payload[\s\S]*resolved_template = _community_domain_template_for_key[\s\S]*"resolved_template"[\s\S]*"template_key": resolved_template\["template_key"\][\s\S]*def _community_domain_template_for_key[\s\S]*_clean_template_key\(template_key, "generic_association"\)[\s\S]*COMMUNITY_DOMAIN_TEMPLATE_ALIASES\.get\(key, key\)[\s\S]*def _community_domain_template_for_key_or_none[\s\S]*_clean_template_key\(template_key\)[\s\S]*COMMUNITY_DOMAIN_TEMPLATE_ALIASES\.get\(key, key\)[\s\S]*def create_community_domain_draft[\s\S]*domain_type = _clean_template_key\(payload\.domain_type, "generic_association"\)[\s\S]*template_key = _clean_template_key\(payload\.template_key, domain_type\)[\s\S]*_community_domain_template_for_key_or_none\(template_key\)[\s\S]*community_domain_template_not_supported[\s\S]*Choose a supported Community Domain template before[\s\S]*domain_type_template = _community_domain_template_for_key_or_none\(domain_type\)[\s\S]*community_domain_type_not_supported[\s\S]*community_domain_template_mismatch[\s\S]*CommunityDomain\(/,
  "Backend draft creation must normalize Community Domain template/type identifiers, preserve known aliases, expose resolved template metadata, and reject unsupported templates, unsupported domain types, and mismatched approved type/template pairs before creating institutional records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_community_domain_draft_is_not_a_live_social_community[\s\S]*for field_name, field_value in \([\s\S]*"domain_name", True[\s\S]*"display_name", False[\s\S]*"domain_type", True[\s\S]*"template_key", False[\s\S]*"country", True[\s\S]*"state", False[\s\S]*"public_profile", True[\s\S]*rejected_bool_draft\.status_code == 422[\s\S]*Dominion College Abuja[\s\S]*db\.query\(CommunityDomain\)\.one\(\)[\s\S]*test_community_domain_draft_normalizes_template_type_aliases[\s\S]*Market Association[\s\S]*market-association[\s\S]*data\["domain_type"\] == "market_association"[\s\S]*data\["template_key"\] == "market_association"[\s\S]*data\["resolved_template"\]\["template_key"\] == "market_cooperative"[\s\S]*test_community_domain_draft_rejects_unsupported_template[\s\S]*\/community-domains\/drafts[\s\S]*invented_society_schema[\s\S]*response\.status_code == 422[\s\S]*community_domain_template_not_supported[\s\S]*db\.query\(CommunityDomain\)\.count\(\) == 0[\s\S]*test_community_domain_draft_rejects_unsupported_domain_type[\s\S]*invented_school_body[\s\S]*community_domain_type_not_supported[\s\S]*db\.query\(CommunityNode\)\.count\(\) == 0[\s\S]*test_community_domain_draft_rejects_mismatched_type_and_template[\s\S]*school[\s\S]*market_cooperative[\s\S]*community_domain_template_mismatch[\s\S]*expected_template_key"\] == "school_multi_branch"[\s\S]*db\.query\(CommunityDomainMembership\)\.count\(\) == 0/,
  "Backend tests must prove draft creation rejects boolean institutional text fields, template/type identifier normalization works for approved aliases, resolved template metadata is explicit, and unsupported templates, unsupported domain types, and mismatched approved type/template pairs cannot create draft domains, root nodes, or owner memberships."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /COMMUNITY_DOMAIN_TEMPLATE_OPERATING_BLUEPRINTS[\s\S]*school_multi_branch[\s\S]*market_cooperative[\s\S]*family_town_union_diaspora[\s\S]*hospital_health_body[\s\S]*ngo_project_network[\s\S]*uses_generic_fallback[\s\S]*does not create a Community Domain[\s\S]*separate schemas[\s\S]*@router\.get\("\/templates\/\{template_key\}\/operating-blueprint"/,
  "Backend route must expose public Community Domain template operating blueprints without creation, activation, verification, payment, marketplace, social Community, or schema-fork side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_template_operating_blueprint_is_public_planning_not_creation[\s\S]*market_cooperative\/operating-blueprint[\s\S]*market_line[\s\S]*line_admin[\s\S]*db\.query\(CommunityDomainActionReview\)\.count\(\) == 0/,
  "Backend tests must prove the market template blueprint is public planning guidance and does not create domain, hierarchy, policy, review, or social Community records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_template_operating_blueprint_distinguishes_school_and_rejects_unknown[\s\S]*school_multi_branch\/operating-blueprint[\s\S]*school\/operating-blueprint[\s\S]*School Multi Branch\/operating-blueprint[\s\S]*union\/operating-blueprint[\s\S]*market_association\/operating-blueprint[\s\S]*does-not-exist\/operating-blueprint[\s\S]*union_professional_body[\s\S]*market_cooperative[\s\S]*school_association/,
  "Backend tests must prove template operating blueprints distinguish society types, normalize label-shaped keys, support domain-type and legacy alias lookup, and reject unknown templates."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_all_public_templates_have_specific_operating_blueprints[\s\S]*family_town_union_diaspora[\s\S]*hospital_health_body[\s\S]*ngo_project_network[\s\S]*uses_generic_fallback"\] is False[\s\S]*db\.query\(CommunityDomainActionReview\)\.count\(\) == 0/,
  "Backend tests must prove every public built-in Community Domain template has a specific operating blueprint and no creation side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.post\("\/\{community_domain_id\}\/package-quote"[\s\S]*def create_community_domain_package_quote[\s\S]*_require_domain_admin_scope[\s\S]*does not create a payment instruction[\s\S]*verify ownership/,
  "Backend route must expose a scoped Community Domain package quote without payment, activation, or verification side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_owner_can_preview_community_domain_package_quote_without_activation[\s\S]*\/package-quote[\s\S]*pilot_quote_required[\s\S]*price_amount"\] is None[\s\S]*domain\.status == "draft"/,
  "Backend tests must prove package quote preview is not payment, activation, or verification."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_cannot_preview_community_domain_package_quote[\s\S]*\/package-quote[\s\S]*response\.status_code == 403[\s\S]*owner or domain admin/,
  "Backend tests must prove package quote preview is owner/admin scoped."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_dashboard_payload[\s\S]*does not create a payment instruction[\s\S]*private member evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/dashboard"[\s\S]*def get_community_domain_dashboard[\s\S]*_require_domain_member_scope/,
  "Backend route must expose a scoped Community Domain dashboard summary without payment, activation, verification, or private-record leakage."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_admin_dashboard_summary_guides_next_action_without_activation[\s\S]*\/dashboard[\s\S]*package_quote[\s\S]*pilot_quote_required[\s\S]*domain_row\.status == "draft"/,
  "Backend tests must prove admin dashboard summary includes quote guidance without activation."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /REVIEWER_QUEUE_PENDING_STATUSES = \("pending", "pending_review"\)[\s\S]*def _community_domain_dashboard_payload[\s\S]*CommunityDomainActionReview\.status\.in_\(REVIEWER_QUEUE_PENDING_STATUSES\)[\s\S]*def _community_domain_operating_map_payload[\s\S]*CommunityDomainActionReview\.status\.in_\(REVIEWER_QUEUE_PENDING_STATUSES\)[\s\S]*def list_community_domain_reviewer_queue[\s\S]*CommunityDomainActionReview\.status\.in_\(REVIEWER_QUEUE_PENDING_STATUSES\)/,
  "Backend dashboard, operating-map, and reviewer-queue next-action lists must not count needs_changes as pending reviewer work."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_dashboard_guidance_excludes_needs_changes_from_reviewer_queue[\s\S]*review_row\.status = "needs_changes"[\s\S]*dashboard\["counts"\]\["open_reviews"\] == 0[\s\S]*readiness\["counts"\]\["open_reviews"\] == 0[\s\S]*operating_map\["counts"\]\["open_reviews"\] == 0[\s\S]*review_row\.status == "needs_changes"/,
  "Backend tests must prove needs_changes remains recorded without driving dashboard reviewer-queue guidance."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_dashboard_payload[\s\S]*billing_status = "active" if status == "active" else "quote_required"[\s\S]*"lane_key": "billing"[\s\S]*"status": billing_status[\s\S]*"billing_status": billing_status/,
  "Backend dashboard billing status must reflect an active Community Domain instead of always showing quote_required."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_dashboard_guidance_excludes_needs_changes_from_reviewer_queue[\s\S]*domain\.status = "active"[\s\S]*dashboard\["status"\]\["billing_status"\] == "active"[\s\S]*dashboard_lanes\["billing"\]\["status"\] == "active"/,
  "Backend tests must prove active Community Domain dashboards do not keep showing quote-required billing state."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_dashboard_hides_quote_and_outsider_is_rejected[\s\S]*\/dashboard[\s\S]*outsider_dashboard\.status_code == 403[\s\S]*"package_quote" not in dashboard/,
  "Backend tests must prove member dashboard hides quote details and rejects outsiders."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /MEMBERSHIP_REQUEST_OPEN_STATUSES[\s\S]*"needs_changes"[\s\S]*"approved"[\s\S]*class CommunityDomainMembershipRequestIn[\s\S]*request_note[\s\S]*def _self_service_membership_review_ids_with_applied_descendant[\s\S]*_clean_role\(row\.status\) != "applied"[\s\S]*ancestor_ids\.add\(parent_id\)[\s\S]*@router\.post\(\s*"\/\{community_domain_id\}\/membership-requests"[\s\S]*def request_community_domain_membership[\s\S]*existing_request_candidates[\s\S]*self_service_request_candidates[\s\S]*_is_self_service_domain_membership_review_for_user[\s\S]*applied_descendant_ancestor_ids[\s\S]*_self_service_membership_review_ids_with_applied_descendant[\s\S]*_clean_role\(row\.status\) in MEMBERSHIP_REQUEST_OPEN_STATUSES[\s\S]*int\(row\.id\) not in applied_descendant_ancestor_ids[\s\S]*already has an open Community Domain[\s\S]*_membership_request_status_payload\(existing_request\)[\s\S]*action_key="domain_member\.upsert"[\s\S]*previous_status[\s\S]*"none"[\s\S]*requested_by_user_id=int\(current_user\.id\)[\s\S]*subject_user_id=int\(current_user\.id\)[\s\S]*target_type="domain_member"[\s\S]*"action_review": _membership_request_status_payload\(row\)[\s\S]*does not add the member[\s\S]*approve and apply/,
  "Backend route must let an authenticated outsider request Community Domain membership as a governance review, snapshot that no previous membership existed, block duplicate self-service open reviews through approved-but-unapplied status, avoid exposing generic or reviewer-private governance rows as create/duplicate response details, release superseded parents after an applied descendant, and avoid auto-membership or side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_request_domain_membership_without_auto_membership[\s\S]*rejected_bool_request_note[\s\S]*"request_note": True[\s\S]*rejected_bool_request_note\.status_code == 422[\s\S]*rejected_bool_title[\s\S]*"title": False[\s\S]*rejected_bool_title\.status_code == 422[\s\S]*\/membership-requests[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(review\)[\s\S]*domain_member\.upsert[\s\S]*community_domain_membership_request_pending[\s\S]*_assert_applicant_membership_status_payload_is_scoped\([\s\S]*duplicate\.json\(\)\["detail"\]\["action_review"\][\s\S]*db\.query\(CommunityDomainMembership\)\.count\(\) == 1[\s\S]*\/decision[\s\S]*duplicate_after_approval[\s\S]*community_domain_membership_request_pending[\s\S]*\/apply[\s\S]*community_domain_member_already_active/,
  "Backend tests must prove Community Domain membership requests reject boolean note/title fields, do not create membership until an admin approves and applies the review, create/duplicate applicant responses hide reviewer-private fields, and approved-but-unapplied reviews still block duplicate requests."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_generic_self_targeted_review_does_not_block_membership_request[\s\S]*requested_by_user_id=owner\.id[\s\S]*subject_user_id=requester\.id[\s\S]*target_type="domain_member"[\s\S]*payload_json=json\.dumps[\s\S]*"status": "active"[\s\S]*\/membership-requests[\s\S]*self_service_review\["id"\] != generic_review_id[\s\S]*previous_status"\] == "none"[\s\S]*community_domain_membership_request_pending[\s\S]*duplicate_detail\["action_review"\]\["id"\] == self_service_review\["id"\][\s\S]*duplicate_detail\["action_review"\]\["id"\] != generic_review_id[\s\S]*\[row\.status for row in rows\] == \["pending", "pending"\]/,
  "Backend tests must prove generic self-targeted domain-member governance reviews do not block self-service membership requests or leak back as duplicate-request action-review details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_self_targeted_non_access_review_with_previous_status_is_not_membership_request[\s\S]*requested_by_user_id=requester\.id[\s\S]*subject_user_id=requester\.id[\s\S]*target_type="domain_member"[\s\S]*"role": "admin"[\s\S]*"status": "active"[\s\S]*"previous_status": "none"[\s\S]*incomplete_review[\s\S]*"user_id": requester\.id[\s\S]*"previous_status": "none"[\s\S]*corrupt_bool_review[\s\S]*requested_by_user_id=owner\.id[\s\S]*"user_id": True[\s\S]*corrupt_float_review[\s\S]*requested_by_user_id=owner\.id[\s\S]*"user_id": owner\.id \+ 0\.5[\s\S]*corrupt_bool_previous_status_review[\s\S]*"user_id": requester\.id[\s\S]*"role": "member"[\s\S]*"status": "active"[\s\S]*"previous_status": True[\s\S]*corrupt_float_previous_status_review[\s\S]*"previous_status": 1\.5[\s\S]*corrupt_unknown_previous_status_review[\s\S]*"previous_status": "invented"[\s\S]*owner_requests[\s\S]*owner_requests\.json\(\)\["total"\] == 0[\s\S]*\/membership-requests\/my[\s\S]*own_requests\.json\(\)\["total"\] == 0[\s\S]*\/membership-requests[\s\S]*self_service_review\["id"\] != role_review_id[\s\S]*self_service_review\["id"\] != incomplete_review_id[\s\S]*self_service_review\["id"\] != corrupt_bool_review_id[\s\S]*self_service_review\["id"\] != corrupt_float_review_id[\s\S]*self_service_review\["id"\] != corrupt_bool_previous_status_review_id[\s\S]*self_service_review\["id"\] != corrupt_float_previous_status_review_id[\s\S]*self_service_review\["id"\] != corrupt_unknown_previous_status_review_id[\s\S]*self_service_review\["payload"\]\["role"\] == "member"[\s\S]*self_service_review\["payload"\]\["status"\] == "active"/,
  "Backend tests must prove self-targeted domain-member role, incomplete governance, corrupt boolean/float-payload, or unknown previous-status rows are not misclassified as self-service membership access requests merely because they carry previous_status."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def apply_community_domain_action_review[\s\S]*action_key == "domain_member\.upsert"[\s\S]*expected_previous_status[\s\S]*previous_status[\s\S]*if "previous_status" in payload[\s\S]*current_previous_status[\s\S]*membership is not None[\s\S]*else "none"[\s\S]*expected_previous_status != current_previous_status[\s\S]*community_domain_member_review_stale[\s\S]*no longer matches/,
  "Backend apply must reject stale self-service membership reviews only when the review explicitly snapshots a previous status and the member's current status no longer matches it."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_stale_domain_membership_request_cannot_apply_after_direct_add[\s\S]*previous_status[\s\S]*none[\s\S]*\/members[\s\S]*Directly added member[\s\S]*\/apply[\s\S]*community_domain_member_review_stale[\s\S]*review_row\.status == "approved"[\s\S]*review_row\.applied_at is None/,
  "Backend tests must prove approved self-service membership requests cannot overwrite direct active membership created before apply."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_inactive_domain_member_can_request_reactivation_with_status_snapshot[\s\S]*status": "inactive"[\s\S]*previous_status[\s\S]*inactive[\s\S]*\/apply[\s\S]*created"\] is False[\s\S]*membership"\]\["status"\] == "active"[\s\S]*review_row\.status == "applied"/,
  "Backend tests must prove inactive members can request reactivation with an inactive previous-status snapshot instead of being treated as never having existed."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /MEMBERSHIP_STATUS_VALUES = \{"active", "inactive", "suspended", "archived"\}[\s\S]*MEMBERSHIP_STATUS_SNAPSHOT_VALUES = \{"none", \*MEMBERSHIP_STATUS_VALUES\}[\s\S]*def _optional_payload_user_id[\s\S]*raw_value = payload\.get\("user_id"\)[\s\S]*isinstance\(raw_value, bool\)[\s\S]*isinstance\(raw_value, float\)[\s\S]*return None[\s\S]*def _optional_payload_previous_status[\s\S]*"previous_status" not in payload[\s\S]*isinstance\(raw_value, bool\)[\s\S]*return None[\s\S]*previous_status = _clean_role\(raw_value, ""\)[\s\S]*previous_status in MEMBERSHIP_STATUS_SNAPSHOT_VALUES[\s\S]*def _is_self_service_domain_membership_review_for_user[\s\S]*domain_member\.upsert[\s\S]*payload_user_id = _optional_payload_user_id\(payload\)[\s\S]*payload_user_id is None[\s\S]*return False[\s\S]*previous_status = _optional_payload_previous_status\(payload\)[\s\S]*previous_status is None[\s\S]*return False[\s\S]*"role" in payload[\s\S]*_clean_role\(payload\.get\("role"\)\) == "member"[\s\S]*"status" in payload[\s\S]*_clean_role\(payload\.get\("status"\)\) == "active"[\s\S]*def _normalize_self_service_membership_revision_payload[\s\S]*previous_status = _optional_payload_previous_status\(previous_payload\)[\s\S]*community_domain_membership_revision_scope_mismatch[\s\S]*valid previous membership status snapshot[\s\S]*_domain_membership_for_user[\s\S]*current_previous_status[\s\S]*community_domain_member_already_active[\s\S]*community_domain_member_review_stale[\s\S]*proposed_payload = dict[\s\S]*_reject_non_text_payload_fields[\s\S]*"role"[\s\S]*"status"[\s\S]*"previous_status"[\s\S]*"title"[\s\S]*community_domain_membership_revision_scope_mismatch[\s\S]*Self-service membership request revisions cannot change the reviewed previous membership status[\s\S]*def revise_community_domain_action_review[\s\S]*_get_action_review_or_404[\s\S]*is_self_service_membership_revision[\s\S]*if not is_self_service_membership_revision[\s\S]*_require_domain_member_scope[\s\S]*existing_revision_payload = \([\s\S]*_membership_request_status_payload\(existing_revision\)[\s\S]*if is_self_service_membership_revision[\s\S]*else _action_review_payload[\s\S]*subject_user_id = \([\s\S]*int\(current_user\.id\)[\s\S]*target_type = \([\s\S]*"domain_member"[\s\S]*target_id = \([\s\S]*str\(int\(current_user\.id\)\)[\s\S]*previous_action_review_payload = \([\s\S]*_membership_request_status_payload\(row\)[\s\S]*if is_self_service_membership_revision[\s\S]*else _action_review_payload[\s\S]*action_review_payload = \([\s\S]*_membership_request_status_payload\(revision\)[\s\S]*if is_self_service_membership_revision[\s\S]*else _action_review_payload\(revision\)/,
  "Backend revision route must let non-member applicants revise only their own self-service membership request after needs-changes, reject boolean/float/corrupt payload user ids and require known previous-status snapshots during self-service classification, require self-service revision text fields to be text, block stale/already-active membership snapshots, keep generic review revisions member/admin-scoped, fix the target to the requester, and scope self-service applicant revision and duplicate-revision responses away from reviewer-private fields."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /POLICY_REVIEW_COUNT_MAX = 25[\s\S]*POLICY_STATUS_VALUES = \{"active", "inactive", "archived"\}[\s\S]*POLICY_SCOPE_TYPE_VALUES = \{"domain", "node"\}[\s\S]*POLICY_REVIEW_MODE_VALUES = \{[\s\S]*"domain_admin_review"[\s\S]*"node_admin_review"[\s\S]*"required_role_review"[\s\S]*"multi_reviewer_review"[\s\S]*def _reject_bool_identifier[\s\S]*isinstance\(value, bool\)[\s\S]*must be an integer id, not a boolean[\s\S]*isinstance\(value, float\)[\s\S]*must be an integer id, not a float[\s\S]*def _reject_bool_integer[\s\S]*isinstance\(value, bool\)[\s\S]*must be an integer, not a boolean[\s\S]*isinstance\(value, float\)[\s\S]*must be an integer, not a float[\s\S]*def _reject_non_bool[\s\S]*not isinstance\(value, bool\)[\s\S]*must be a boolean[\s\S]*def _reject_invalid_policy_count_config[\s\S]*normalized = dict\(value\)[\s\S]*"min_reviewers"[\s\S]*"min_approvals"[\s\S]*raw_value is None[\s\S]*isinstance\(raw_value, bool\)[\s\S]*isinstance\(raw_value, float\)[\s\S]*must be a positive integer[\s\S]*count_value = int\(raw_value\)[\s\S]*count_value < 1[\s\S]*count_value > POLICY_REVIEW_COUNT_MAX[\s\S]*must be at most \{POLICY_REVIEW_COUNT_MAX\}[\s\S]*normalized\[key\] = count_value[\s\S]*class CommunityNodeCreateIn[\s\S]*field_validator\("parent_node_id", mode="before"\)[\s\S]*field_validator\("sort_order", mode="before"\)[\s\S]*field_validator\("inherits_parent_policy", mode="before"\)[\s\S]*_reject_non_bool\(value, "inherits_parent_policy"\)[\s\S]*class CommunityDomainMemberUpsertIn[\s\S]*field_validator\("user_id", mode="before"\)[\s\S]*class CommunityNodeMemberUpsertIn[\s\S]*field_validator\("user_id", mode="before"\)[\s\S]*class CommunityDomainPolicyUpsertIn[\s\S]*field_validator\("community_node_id", mode="before"\)[\s\S]*field_validator\("config", mode="before"\)[\s\S]*_reject_invalid_policy_count_config\(value\)[\s\S]*class CommunityDomainActionReviewCreateIn[\s\S]*field_validator\("community_node_id", "policy_id", "subject_user_id", mode="before"\)[\s\S]*class CommunityDomainActionReviewRevisionIn[\s\S]*field_validator\("subject_user_id", mode="before"\)[\s\S]*def _normalize_policy_status_value[\s\S]*status not in POLICY_STATUS_VALUES[\s\S]*community_domain_policy_status_invalid[\s\S]*def _normalize_policy_scope_type_value[\s\S]*scope_type not in POLICY_SCOPE_TYPE_VALUES[\s\S]*community_domain_policy_scope_type_invalid[\s\S]*def _normalize_policy_review_mode_value[\s\S]*review_mode not in POLICY_REVIEW_MODE_VALUES[\s\S]*community_domain_policy_review_mode_invalid[\s\S]*def _required_review_approvals[\s\S]*maximum=POLICY_REVIEW_COUNT_MAX[\s\S]*def upsert_community_domain_policy[\s\S]*policy\.scope_type = _normalize_policy_scope_type_value\(payload\.scope_type\)[\s\S]*policy\.review_mode = _normalize_policy_review_mode_value\(payload\.review_mode\)[\s\S]*policy\.status = _normalize_policy_status_value\(payload\.status\)/,
  "Backend Community Domain request models must reject boolean/float top-level identifiers, node sort-order, non-boolean node inheritance flags, malformed/non-positive/over-limit policy reviewer-count config fields, invented policy lifecycle statuses, invented policy scope types, and invented policy review modes before Pydantic or Python can coerce them, while normalizing valid numeric-string policy counts before saving and sharing the same reviewer-count max used at runtime."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_owner_adds_domain_member_and_places_member_inside_node[\s\S]*boolean_parent[\s\S]*"parent_node_id": True[\s\S]*boolean_parent\.status_code == 422[\s\S]*float_parent[\s\S]*"parent_node_id": 1\.0[\s\S]*float_parent\.status_code == 422[\s\S]*boolean_sort_order[\s\S]*"sort_order": True[\s\S]*boolean_sort_order\.status_code == 422[\s\S]*float_sort_order[\s\S]*"sort_order": 1\.0[\s\S]*float_sort_order\.status_code == 422[\s\S]*invalid_inherits_parent_policy[\s\S]*"inherits_parent_policy": field_value[\s\S]*inherits_parent_policy must be a boolean[\s\S]*for field_name, field_value in \([\s\S]*"name", True[\s\S]*"node_type", False[\s\S]*"node_kind", True[\s\S]*"description", False[\s\S]*"visibility_policy", True[\s\S]*"status", False[\s\S]*boolean_node_text\.status_code == 422[\s\S]*invalid_node_status[\s\S]*"status": "pending"[\s\S]*community_domain_node_status_invalid[\s\S]*boolean_domain_member[\s\S]*"user_id": True[\s\S]*boolean_domain_member\.status_code == 422[\s\S]*float_domain_member[\s\S]*"user_id": 1\.0[\s\S]*float_domain_member\.status_code == 422[\s\S]*boolean_domain_member_role[\s\S]*"role": True[\s\S]*boolean_domain_member_role\.status_code == 422[\s\S]*boolean_domain_member_status[\s\S]*"status": False[\s\S]*boolean_domain_member_status\.status_code == 422[\s\S]*invalid_domain_member_status[\s\S]*"status": "pending"[\s\S]*community_domain_member_status_invalid[\s\S]*boolean_domain_member_title[\s\S]*"title": True[\s\S]*boolean_domain_member_title\.status_code == 422[\s\S]*boolean_node_member[\s\S]*"user_id": True[\s\S]*boolean_node_member\.status_code == 422[\s\S]*float_node_member[\s\S]*"user_id": 1\.0[\s\S]*float_node_member\.status_code == 422[\s\S]*boolean_node_member_role[\s\S]*"role": True[\s\S]*boolean_node_member_role\.status_code == 422[\s\S]*boolean_node_member_status[\s\S]*"status": False[\s\S]*boolean_node_member_status\.status_code == 422[\s\S]*invalid_node_member_status[\s\S]*"status": "pending"[\s\S]*community_domain_member_status_invalid[\s\S]*boolean_node_member_title[\s\S]*"title": True[\s\S]*boolean_node_member_title\.status_code == 422[\s\S]*"user_id": teacher\.id[\s\S]*CommunityDomainMembership\)\.count\(\) == 2[\s\S]*CommunityNodeMembership\)\.count\(\) == 1/,
  "Backend tests must prove node creation rejects boolean/float parent and sort-order fields, non-boolean inheritance flags, and invented initial node statuses, and direct domain/node member upserts reject boolean/float identifiers, invalid membership statuses, and member text fields before they can target row id 1, coerce floats, stringify booleans, or save invented lifecycle states."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_admin_records_policy_and_decides_domain_action_review[\s\S]*rejected_bool_min_reviewers[\s\S]*"min_reviewers": True[\s\S]*rejected_bool_min_reviewers\.status_code == 422[\s\S]*config\.min_reviewers must be a positive integer[\s\S]*rejected_bool_min_approvals[\s\S]*"min_approvals": False[\s\S]*rejected_bool_min_approvals\.status_code == 422[\s\S]*config\.min_approvals must be a positive integer[\s\S]*rejected_float_min_reviewers[\s\S]*"min_reviewers": 1\.5[\s\S]*rejected_float_min_reviewers\.status_code == 422[\s\S]*config\.min_reviewers must be a positive integer[\s\S]*rejected_float_min_approvals[\s\S]*"min_approvals": 1\.5[\s\S]*rejected_float_min_approvals\.status_code == 422[\s\S]*config\.min_approvals must be a positive integer[\s\S]*rejected_zero_min_reviewers[\s\S]*"min_reviewers": 0[\s\S]*status_code == 422[\s\S]*rejected_negative_min_approvals[\s\S]*"min_approvals": -1[\s\S]*status_code == 422[\s\S]*rejected_null_min_reviewers[\s\S]*"min_reviewers": None[\s\S]*status_code == 422[\s\S]*rejected_text_min_approvals[\s\S]*"min_approvals": "two"[\s\S]*status_code == 422[\s\S]*rejected_high_min_reviewers[\s\S]*"min_reviewers": 26[\s\S]*status_code == 422[\s\S]*config\.min_reviewers must be at most 25[\s\S]*rejected_high_min_approvals[\s\S]*"min_approvals": "26"[\s\S]*status_code == 422[\s\S]*config\.min_approvals must be at most 25[\s\S]*for field_name, field_value in \([\s\S]*"policy_key", True[\s\S]*"action_key", False[\s\S]*"scope_type", True[\s\S]*"review_mode", False[\s\S]*"required_role", True[\s\S]*"policy_summary", False[\s\S]*rejected_bool_policy_field\.status_code == 422[\s\S]*rejected_invalid_policy_status[\s\S]*"status": "pending"[\s\S]*community_domain_policy_status_invalid[\s\S]*rejected_invalid_policy_scope[\s\S]*"scope_type": "district"[\s\S]*community_domain_policy_scope_type_invalid[\s\S]*rejected_invalid_policy_review_mode[\s\S]*"review_mode": "committee_vote"[\s\S]*community_domain_policy_review_mode_invalid[\s\S]*"config": \{"min_reviewers": "1"\}[\s\S]*policy\["config"\] == \{"min_reviewers": 1\}[\s\S]*listed_policies\.json\(\)\["total"\] == 1[\s\S]*rejected_bool_decision[\s\S]*"decision": True[\s\S]*rejected_bool_decision\.status_code == 422[\s\S]*rejected_bool_decision_note[\s\S]*"decision_note": False[\s\S]*rejected_bool_decision_note\.status_code == 422[\s\S]*"decision": "approve"[\s\S]*"decision_note": "Evidence accepted\."/,
  "Backend tests must prove Community Domain policy config rejects boolean/float/null/non-positive/nonnumeric/over-limit reviewer-count settings, invented policy lifecycle statuses, invented policy scope types, and invented policy review modes, normalizes valid numeric-string counts before saving a valid governance policy, rejects policy text fields, and decision requests reject boolean decision/note fields before approving a review."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_requester_can_revise_needs_changes_action_review[\s\S]*decision": "needs_changes"[\s\S]*community_domain_review_append_closed[\s\S]*rejected_bool_subject_revision[\s\S]*"subject_user_id": True[\s\S]*status_code == 422[\s\S]*rejected_bool_target_type_revision[\s\S]*"target_type": True[\s\S]*status_code == 422[\s\S]*rejected_bool_target_id_revision[\s\S]*"target_id": True[\s\S]*status_code == 422[\s\S]*rejected_bool_request_note_revision[\s\S]*"request_note": False[\s\S]*status_code == 422[\s\S]*rejected_bool_title_revision[\s\S]*"title": True[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*\/revision[\s\S]*Added the title[\s\S]*duplicate_revision[\s\S]*community_domain_review_revision_exists[\s\S]*stale_parent_comment_after_revision[\s\S]*community_domain_review_append_closed[\s\S]*stale_parent_evidence_after_revision[\s\S]*community_domain_review_append_closed[\s\S]*revision_comment[\s\S]*action_review_id"\] == revision\["id"\][\s\S]*revision_evidence[\s\S]*Child revision context note[\s\S]*action_review_id"\] == revision\["id"\][\s\S]*parent_activity_types == \{"review_created", "decision"\}[\s\S]*revision_activity_data\["total"\] == 3[\s\S]*"comment"[\s\S]*"evidence"[\s\S]*item\["action_review_id"\] == revision\["id"\][\s\S]*lineage_data\["latest_review_id"\] == revision\["id"\][\s\S]*comments\[0\]\.action_review_id == rows\[1\]\.id[\s\S]*evidence\[0\]\.action_review_id == rows\[1\]\.id/,
  "Backend tests must prove generic needs-changes action reviews reject boolean revision subject ids, target fields, request notes, and member-action revision text fields, stay closed on the parent after revision, comments/evidence continue on the child row, row activity remains scoped to the row where the event happened, and lineage still points from parent to child."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_revise_own_needs_changes_membership_request_only[\s\S]*\/membership-requests[\s\S]*decision": "needs_changes"[\s\S]*needs_changes_status = client\.get[\s\S]*status": "needs_changes"[\s\S]*needs_changes_data\["total"\] == 1[\s\S]*needs_changes_item\["id"\] == review\["id"\][\s\S]*_assert_applicant_membership_status_payload_is_scoped\(needs_changes_item\)[\s\S]*"Please add your member title" not in needs_changes_status\.text[\s\S]*"decision_note" not in needs_changes_status\.text[\s\S]*community_domain_membership_request_pending[\s\S]*wrong_target[\s\S]*community_domain_membership_revision_scope_mismatch[\s\S]*rejected_bool_title[\s\S]*"title": True[\s\S]*invalid_action_review_payload[\s\S]*rejected_bool_previous_status[\s\S]*"previous_status": False[\s\S]*invalid_action_review_payload[\s\S]*\/revision[\s\S]*Returning union member[\s\S]*_assert_applicant_membership_status_payload_is_scoped\([\s\S]*revision_data\["previous_action_review"\][\s\S]*_assert_applicant_membership_status_payload_is_scoped\(revision\)[\s\S]*revision\["status"\] == "pending"[\s\S]*revision\["subject_user_id"\] == requester\.id[\s\S]*revision\["target_id"\] == str\(requester\.id\)[\s\S]*"previous_status": "none"[\s\S]*queue_after_revision = client\.get[\s\S]*reviewer-queue[\s\S]*queue_items = queue_after_revision\.json\(\)\["items"\][\s\S]*\[item\["id"\] for item in queue_items\] == \[revision\["id"\]\][\s\S]*queue_items\[0\]\["parent_review_id"\] == review\["id"\]/,
  "Backend tests must prove a non-member applicant can see their own needs-changes membership request without reviewer-private notes, cannot create a duplicate instead, cannot revise the request into another user's membership, cannot use boolean self-service revision text fields, receives scoped self-service revision responses, and sends the child revision back to the reviewer queue instead of the parent."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_cannot_revise_membership_request_after_direct_activation[\s\S]*decision": "needs_changes"[\s\S]*\/members[\s\S]*Directly activated member[\s\S]*\/revision[\s\S]*community_domain_member_already_active[\s\S]*len\(review_rows\) == 1[\s\S]*review_rows\[0\]\.status == "needs_changes"/,
  "Backend tests must prove self-service membership revisions are blocked after the applicant has already been directly activated, without creating a stale child review."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_continues_cancelled_membership_revision_without_forking_parent[\s\S]*decision": "needs_changes"[\s\S]*\/revision[\s\S]*First revision title[\s\S]*decide_parent[\s\S]*Wrong row\.[\s\S]*community_domain_review_has_revision[\s\S]*decide_parent_detail\["existing_action_review"\]\["id"\] == \([\s\S]*first_revision\["id"\][\s\S]*apply_parent[\s\S]*community_domain_review_has_revision[\s\S]*apply_parent_detail\["existing_action_review"\]\["id"\] == \([\s\S]*first_revision\["id"\][\s\S]*cancel_parent[\s\S]*Trying to cancel the superseded parent[\s\S]*community_domain_review_has_revision[\s\S]*cancel_parent_detail\["existing_action_review"\]\["id"\] == \([\s\S]*first_revision\["id"\][\s\S]*_assert_applicant_membership_status_payload_is_scoped\([\s\S]*cancel_parent_detail\["existing_action_review"\][\s\S]*\/cancel[\s\S]*Need to correct the title again[\s\S]*\/membership-requests[\s\S]*community_domain_membership_request_pending[\s\S]*action-reviews\/\{first_revision\['id'\]\}\/revision[\s\S]*Corrected revision title[\s\S]*duplicate_revision[\s\S]*community_domain_review_revision_exists[\s\S]*duplicate_revision_detail\["existing_action_review"\]\["id"\] == \([\s\S]*continued_revision\["id"\][\s\S]*_assert_applicant_membership_status_payload_is_scoped\([\s\S]*duplicate_revision_detail\["existing_action_review"\][\s\S]*root_lineage[\s\S]*child_lineage[\s\S]*latest_lineage[\s\S]*latest_review_id"\] == continued_revision\["id"\][\s\S]*lineage_data\["total"\] == 3[\s\S]*review\["id"\][\s\S]*first_revision\["id"\][\s\S]*continued_revision\["id"\][\s\S]*"decision_note" not in root_lineage\.text[\s\S]*"policy_key" not in root_lineage\.text[\s\S]*\[row\.status for row in rows\] == \[[\s\S]*"needs_changes"[\s\S]*"cancelled"[\s\S]*"pending"[\s\S]*rows\[2\]\.parent_review_id == rows\[1\]\.id[\s\S]*CommunityDomainActionReviewDecision\)\.count\(\) == 1/,
  "Backend tests must prove cancelled child membership revisions continue from the child instead of forking, deciding, applying, or cancelling the needs-changes parent or allowing a duplicate membership request, both parent-cancel and duplicate self-service revision errors hide reviewer-private fields while pointing to the child record, and applicant lineage remains readable/private-field-safe across the three-row parent-child-grandchild chain."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def get_community_domain_action_review_lineage[\s\S]*_get_action_review_or_404[\s\S]*can_view_as_self_service_requester = all\([\s\S]*_is_self_service_domain_membership_review_for_user[\s\S]*user_id=int\(current_user\.id\)[\s\S]*if not can_view_as_self_service_requester:[\s\S]*_require_domain_member_scope[\s\S]*community_domain_review_lineage_not_visible[\s\S]*items = \([\s\S]*_membership_request_status_payload\(item\) for item in lineage[\s\S]*if can_view_as_self_service_requester[\s\S]*else \[_action_review_payload\(item\) for item in lineage\]/,
  "Backend lineage route must let a non-member applicant read only their own self-service membership request chain while keeping generic lineage member/admin-scoped and applicant payloads reviewer-private-field free."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _latest_action_review_revision[\s\S]*parent_review_id == int\(review_id\)[\s\S]*created_at\.desc\(\)[\s\S]*id\.desc\(\)[\s\S]*def _raise_if_action_review_has_revision[\s\S]*community_domain_review_has_revision[\s\S]*Continue from the revision instead of acting on the[\s\S]*"existing_action_review": _action_review_payload\(existing_revision\)[\s\S]*def decide_community_domain_action_review[\s\S]*_raise_if_action_review_has_revision\([\s\S]*def apply_community_domain_action_review[\s\S]*_raise_if_action_review_has_revision\(/,
  "Backend decision and apply routes must block superseded parent action reviews once a follow-up revision exists and point admins to the latest child review before mutating decision or applied state."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_read_own_membership_request_lineage_without_private_review_fields[\s\S]*\/membership-requests[\s\S]*decision": "needs_changes"[\s\S]*Reviewer-private: add your title first[\s\S]*\/revision[\s\S]*Added title for lineage review[\s\S]*\/lineage[\s\S]*parent_lineage\.status_code == 200[\s\S]*parent_lineage_data\["root_review_id"\] == review\["id"\][\s\S]*parent_lineage_data\["latest_review_id"\] == revision\["id"\][\s\S]*_assert_applicant_membership_status_payload_is_scoped\(item\)[\s\S]*"Reviewer-private" not in parent_lineage\.text[\s\S]*"decision_note" not in parent_lineage\.text[\s\S]*"decisions" not in parent_lineage\.text[\s\S]*"policy_key" not in parent_lineage\.text[\s\S]*child_lineage\.status_code == 200[\s\S]*hidden_lineage\.status_code == 403/,
  "Backend tests must prove non-member applicants can read their own self-service membership request lineage from either parent or child without reviewer-private fields, while unrelated outsiders remain blocked."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_rejected_action_review_cannot_receive_late_decision_or_apply_but_can_be_revised[\s\S]*other_member = _seed_user[\s\S]*\(other_member, "member"\)[\s\S]*decision": "reject"[\s\S]*\/revision[\s\S]*Added the missing context[\s\S]*duplicate_revision[\s\S]*community_domain_review_revision_exists[\s\S]*parent_lineage[\s\S]*child_lineage[\s\S]*parent_lineage\.status_code == 200[\s\S]*child_lineage\.status_code == 200[\s\S]*root_review_id"\] == review\["id"\][\s\S]*latest_review_id"\] == revision\["id"\][\s\S]*requested_review_id"\] == requested_review_id[\s\S]*lineage_data\["total"\] == 2[\s\S]*review\["id"\][\s\S]*revision\["id"\][\s\S]*admin_lineage[\s\S]*admin_lineage\.status_code == 200[\s\S]*hidden_lineage[\s\S]*hidden_lineage\.status_code == 403[\s\S]*community_domain_review_lineage_not_visible/,
  "Backend tests must prove generic member-submitted action-review lineage remains readable to the requester from parent or child, readable to scoped admins, and hidden from unrelated members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_reviewer_queue_tracks_pending_membership_revision_not_needs_changes_parent[\s\S]*decision": "needs_changes"[\s\S]*reviewer-queue[\s\S]*queue_after_needs_changes\.json\(\)\["total"\] == 0[\s\S]*\/revision[\s\S]*Queue revision applicant[\s\S]*queue_after_revision[\s\S]*queue_data\["total"\] == 1[\s\S]*queue_data\["items"\]\[0\]\["id"\] == revision\["id"\][\s\S]*parent_review_id[\s\S]*pending reviews this user is currently allowed to decide[\s\S]*decision": "approve"[\s\S]*queue_after_approval[\s\S]*action-reviews\?status=approved[\s\S]*queue_after_approval\.json\(\)\["total"\] == 0[\s\S]*approved_data\["total"\] == 1[\s\S]*approved_data\["items"\]\[0\]\["id"\] == revision\["id"\][\s\S]*approved_data\["items"\]\[0\]\["parent_review_id"\] == review\["id"\][\s\S]*\[row\.status for row in rows\] == \["needs_changes", "approved"\]/,
  "Backend tests must prove the reviewer queue hides needs-changes parent membership requests, shows the pending child revision that owner/admins can actually decide, and then moves approved-but-unapplied child revisions to the approved action-review list instead of leaving them in the pending queue."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_applied_membership_revision_parent_does_not_block_later_reactivation[\s\S]*decision": "needs_changes"[\s\S]*\/revision[\s\S]*Applied revision member[\s\S]*\/apply[\s\S]*"status": "inactive"[\s\S]*created"\] is False[\s\S]*\/membership-requests[\s\S]*reactivation\.status_code == 201[\s\S]*previous_status"\] == "inactive"[\s\S]*\/membership-requests\/my[\s\S]*my_request_items\[0\]\["id"\] == reactivation_review\["id"\][\s\S]*my_request_items\[0\]\["status"\] == "pending"[\s\S]*revision\["id"\] in \{item\["id"\] for item in my_request_items\}[\s\S]*\[row\.status for row in rows\] == \[[\s\S]*"needs_changes"[\s\S]*"applied"[\s\S]*"pending"/,
  "Backend tests must prove an applied child membership revision releases its superseded needs-changes parent so a later inactive member can request reactivation, and requester status lists the new pending reactivation ahead of applied history."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def cancel_community_domain_action_review[\s\S]*_get_action_review_or_404[\s\S]*is_self_service_membership_cancel[\s\S]*_is_self_service_domain_membership_review_for_user[\s\S]*if not is_self_service_membership_cancel[\s\S]*_require_domain_member_scope[\s\S]*is_requester[\s\S]*community_domain_review_cancel_forbidden[\s\S]*existing_revision[\s\S]*parent_review_id == int\(row\.id\)[\s\S]*community_domain_review_has_revision[\s\S]*Continue from the revision instead[\s\S]*"existing_action_review": _membership_request_status_payload\([\s\S]*existing_revision[\s\S]*cancellable_statuses[\s\S]*"needs_changes"[\s\S]*"approved"[\s\S]*is_self_service_membership_cancel and is_requester[\s\S]*else \{"pending", "pending_review"\}[\s\S]*community_domain_review_not_cancellable[\s\S]*cannot be cancelled in its current status[\s\S]*row\.status = "cancelled"[\s\S]*row\.decision = "cancel"[\s\S]*action_review_payload = \([\s\S]*_membership_request_status_payload\(row\)[\s\S]*if is_self_service_membership_cancel and is_requester[\s\S]*else _action_review_payload\(row\)[\s\S]*Action review cancelled before application/,
  "Backend cancel route must let applicants withdraw only their own pending, needs-changes, or approved-but-unapplied self-service membership request, block direct cancellation of a superseded parent request once a follow-up revision exists, point applicants to the existing child through a scoped payload, scope applicant cancel responses away from reviewer-private fields, and keep generic action-review cancellation member/admin-scoped."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_action_review_comments_follow_review_visibility[\s\S]*rejected_bool_comment[\s\S]*"body": False[\s\S]*rejected_bool_comment\.status_code == 422[\s\S]*Please review this with the attached office records[\s\S]*Received\. I will check the branch list[\s\S]*comments_data\["total"\] == 2[\s\S]*late_comment[\s\S]*community_domain_review_append_closed[\s\S]*denied_comment[\s\S]*community_domain_review_comment_forbidden[\s\S]*CommunityDomainActionReviewComment\)\.count\(\) == 2/,
  "Backend tests must prove action-review comments reject boolean bodies before storing append-only discussion records, while valid requester/admin comments, late-comment blocking, visibility, and write counts still hold."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_action_review_evidence_records_metadata_without_file_upload[\s\S]*for field_name, field_value in \([\s\S]*"evidence_type", False[\s\S]*"title", True[\s\S]*"description", False[\s\S]*"file_name", True[\s\S]*"content_type", False[\s\S]*"storage_key", True[\s\S]*"external_reference", False[\s\S]*"checksum", True[\s\S]*rejected_bool_evidence\.status_code == 422[\s\S]*Branch register extract[\s\S]*Admin desk reference[\s\S]*evidence_data\["total"\] == 2[\s\S]*late_evidence[\s\S]*community_domain_review_append_closed[\s\S]*denied_evidence[\s\S]*community_domain_review_evidence_forbidden[\s\S]*CommunityDomainActionReviewEvidence\)\.count\(\) == 2/,
  "Backend tests must prove action-review evidence metadata rejects boolean evidence type/title/description/file/storage/reference/checksum fields before recording evidence metadata, while valid requester/admin metadata, late-evidence blocking, visibility, and write counts still hold."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_requester_can_cancel_pending_action_review[\s\S]*rejected_bool_cancel_note[\s\S]*"cancel_note": True[\s\S]*rejected_bool_cancel_note\.status_code == 422[\s\S]*community_domain_review_cancel_forbidden[\s\S]*"cancel_note": "Submitted by mistake\."[\s\S]*data\["status"\] == "cancelled"[\s\S]*data\["decision"\] == "cancel"[\s\S]*second_cancel[\s\S]*community_domain_review_not_cancellable/,
  "Backend tests must prove action-review cancellation rejects boolean cancel notes before mutating review status, while requester-only cancellation and post-cancel non-cancellability still hold."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_admin_cancelled_action_review_cannot_apply_but_requester_can_revise[\s\S]*\/cancel[\s\S]*Duplicate pending request[\s\S]*community_domain_review_not_approved[\s\S]*community_domain_review_revision_forbidden[\s\S]*\/revision[\s\S]*Resubmitted with clearer role context[\s\S]*previous_action_review"\]\["status"\] == "cancelled"[\s\S]*duplicate_revision[\s\S]*community_domain_review_revision_exists[\s\S]*cancelled_parent_comment[\s\S]*community_domain_review_append_closed[\s\S]*cancelled_parent_evidence[\s\S]*community_domain_review_append_closed[\s\S]*revision_comment[\s\S]*action_review_id"\] == revision\["id"\][\s\S]*revision_evidence[\s\S]*Cancelled review child context[\s\S]*action_review_id"\] == revision\["id"\][\s\S]*"review_status_changed"[\s\S]*revision_activity_data\["total"\] == 3[\s\S]*"comment"[\s\S]*"evidence"[\s\S]*item\["action_review_id"\] == revision\["id"\][\s\S]*comments\[0\]\.action_review_id == rows\[1\]\.id[\s\S]*evidence\[0\]\.action_review_id == rows\[1\]\.id/,
  "Backend tests must prove generic cancelled action-review parents stay closed after child revision, comments/evidence continue on the child row, parent activity keeps the cancellation status event, and child activity carries only child-row context."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_cancel_own_pending_membership_request[\s\S]*\/membership-requests[\s\S]*\/cancel[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(cancelled_review\)[\s\S]*"status"\] == "cancelled"[\s\S]*requested_again[\s\S]*status_code == 201[\s\S]*\[row\.status for row in rows\] == \["cancelled", "pending"\][\s\S]*rows\[0\]\.decision == "cancel"[\s\S]*rows\[0\]\.decided_by_user_id == requester\.id[\s\S]*CommunityDomainMembership\)\.count\(\) == 1/,
  "Backend tests must prove non-member applicants can withdraw their own pending membership request, cancel responses hide reviewer-private fields, cancelled requests release the duplicate guard, and cancellation does not create membership."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_cancel_own_needs_changes_membership_request[\s\S]*decision": "needs_changes"[\s\S]*"status"\] == "needs_changes"[\s\S]*\/cancel[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(cancelled_review\)[\s\S]*"status"\] == "cancelled"[\s\S]*requested_again[\s\S]*status_code == 201[\s\S]*\[row\.status for row in rows\] == \["cancelled", "pending"\][\s\S]*rows\[0\]\.decision == "cancel"[\s\S]*CommunityDomainMembership\)\.count\(\) == 1/,
  "Backend tests must prove non-member applicants can withdraw their own needs-changes membership request, cancel responses hide reviewer-private fields, cancelled requests release the duplicate guard, and cancellation does not create membership."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_outsider_can_cancel_own_approved_unapplied_membership_request[\s\S]*decision": "approve"[\s\S]*"status"\] == "approved"[\s\S]*\/cancel[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(cancelled_review\)[\s\S]*"status"\] == "cancelled"[\s\S]*before application[\s\S]*\/apply[\s\S]*apply_cancelled\.status_code == 409[\s\S]*community_domain_review_not_approved[\s\S]*requested_again\.status_code == 201[\s\S]*\[row\.status for row in rows\] == \["cancelled", "pending"\][\s\S]*rows\[0\]\.decision == "cancel"[\s\S]*approval_decisions[\s\S]*\{decision\.decision for decision in approval_decisions\} == \{"approve"\}[\s\S]*CommunityDomainMembership\)\.count\(\) == 1/,
  "Backend tests must prove non-member applicants can withdraw their own approved-but-unapplied membership request, cancel responses hide reviewer-private fields while stored decision history remains, block later apply of that cancelled review, release the duplicate guard, and avoid membership creation."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _membership_request_status_payload[\s\S]*_action_review_payload\(row\)[\s\S]*"decision"[\s\S]*"decision_note"[\s\S]*"decided_by_user_id"[\s\S]*"applied_by_user_id"[\s\S]*"policy_id"[\s\S]*"policy_key"[\s\S]*"recusal_count"[\s\S]*"decisions"[\s\S]*payload\.pop[\s\S]*"action_review": _membership_request_status_payload\(existing_request\)[\s\S]*@router\.get\(\s*"\/\{community_domain_id\}\/membership-requests\/my"[\s\S]*def list_my_community_domain_membership_requests[\s\S]*requested_by_user_id == int\(current_user\.id\)[\s\S]*subject_user_id == int\(current_user\.id\)[\s\S]*target_type == "domain_member"[\s\S]*target_id == str\(int\(current_user\.id\)\)[\s\S]*candidate_rows[\s\S]*_is_self_service_domain_membership_review_for_user[\s\S]*_membership_request_status_payload\(row\) for row in rows[\s\S]*own Community Domain membership requests only[\s\S]*does not show the reviewer queue[\s\S]*reviewer identities[\s\S]*decision notes[\s\S]*or grant membership/,
  "Backend must expose a requester-only and self-service-only Community Domain membership-request status route without exposing reviewer queues, reviewer identities, decision notes, decision records, governance policy identifiers, generic governance reviews, or granting membership."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /APPLICANT_MEMBERSHIP_STATUS_PRIVATE_KEYS[\s\S]*"decision"[\s\S]*"decision_note"[\s\S]*"decided_by_user_id"[\s\S]*"applied_by_user_id"[\s\S]*"policy_id"[\s\S]*"policy_key"[\s\S]*"recusal_count"[\s\S]*"decisions"[\s\S]*_assert_applicant_membership_status_payload_is_scoped[\s\S]*test_outsider_can_track_only_own_domain_membership_request[\s\S]*"config": \{"min_reviewers": 2\}[\s\S]*generic_self_review[\s\S]*payload_json=json\.dumps[\s\S]*\/membership-requests\/my[\s\S]*own Community Domain membership requests only[\s\S]*reviewer identities[\s\S]*decision notes[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(my_review\)[\s\S]*required_approvals"\] == 2[\s\S]*approval_count"\] == 0[\s\S]*generic_self_review_id[\s\S]*First approval, still needs one more reviewer[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(pending_review_item\)[\s\S]*pending_review_item\["status"\] == "pending_review"[\s\S]*pending_review_item\["approval_count"\] == 1[\s\S]*pending_review_item\["required_approvals"\] == 2[\s\S]*other_requests\.json\(\)\["total"\] == 0[\s\S]*db\.query\(CommunityDomainMembership\)[\s\S]*== 0[\s\S]*_assert_applicant_membership_status_payload_is_scoped\(rejected_item\)[\s\S]*review_row\.status == "rejected"[\s\S]*generic_row\.status == "pending"/,
  "Backend tests must prove non-members can track only their own self-service Community Domain membership-request status, applicant status payloads carry approval progress for multi-approval policies, reviewer-private fields and governance policy identifiers stay hidden, generic self-targeted governance reviews stay hidden, and status tracking does not create membership."
);

assertContains(
  "src/lib/api.ts",
  /CommunityDomainMembershipRequestPayload[\s\S]*requestCommunityDomainMembership[\s\S]*\/membership-requests[\s\S]*request_note[\s\S]*title/,
  "Frontend API layer must expose the real Community Domain membership request route.",
  { frontend: true }
);

assertContains(
  "src/lib/api.ts",
  /listMyCommunityDomainMembershipRequests[\s\S]*\/membership-requests\/my[\s\S]*status: params\.status/,
  "Frontend API layer must expose the requester-only Community Domain membership request status route.",
  { frontend: true }
);

assertContains(
  "src/pages/CommunityDomainDashboardPage.tsx",
  /getCommunityDomainActionReviewLineage[\s\S]*membershipRequestLineage[\s\S]*loadingMembershipRequestLineage[\s\S]*membershipRequestLineageLoadSequence[\s\S]*setMembershipRequestLineage\(\[\]\)[\s\S]*getCommunityDomainActionReviewLineage\(requestDomainId, reviewId\)[\s\S]*Array\.isArray\(payload\?\.items\)[\s\S]*membershipRequestLineage=\{membershipRequestLineage\}[\s\S]*loadingMembershipRequestLineage=\{loadingMembershipRequestLineage\}/,
  "Community Domain denied-access recovery must load applicant-safe membership request lineage and pass it to the recovery panel without stale cross-domain results.",
  { frontend: true }
);

assertContains(
  "src/pages/communityDomainDashboard/DashboardRecoveryPanel.tsx",
  /membershipRequestLineage\?: ActionReviewItem\[\][\s\S]*loadingMembershipRequestLineage\?: boolean[\s\S]*membershipHistoryStepLabel[\s\S]*visibleMembershipRequestHistory = membershipRequestLineage\.slice\(-4\)[\s\S]*Request history[\s\S]*Checking request history[\s\S]*Review \$\{reviewId\} - [\s\S]*compactStatus\(item\.status\)/,
  "Community Domain recovery panel must show compact applicant request history without adding another major action or exposing reviewer-private notes.",
  { frontend: true }
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _public_domain_entry_payload[\s\S]*dashboard_path[\s\S]*membership_request_route[\s\S]*Public-safe Community Domain lookup only[\s\S]*@router\.get\("\/lookup"[\s\S]*def lookup_community_domain_by_name[\s\S]*normalize_domain_name[\s\S]*community_domain_not_found[\s\S]*does not prove verification/,
  "Backend route must expose a public-safe Community Domain lookup by code without private records or membership side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_public_domain_lookup_returns_safe_entry_without_membership[\s\S]*\/community-domains\/lookup[\s\S]*dashboard_path[\s\S]*membership_request_route[\s\S]*"owner_user_id" not in entry[\s\S]*db\.query\(CommunityDomainMembership\)\.count\(\) == 1[\s\S]*db\.query\(CommunityDomainActionReview\)\.count\(\) == 0[\s\S]*test_public_domain_lookup_rejects_unknown_or_invalid_code/,
  "Backend tests must prove domain-code lookup is public-safe, has no membership side effects, and rejects unknown or invalid codes."
);

assertContains(
  "src/lib/api.ts",
  /lookupCommunityDomainByName[\s\S]*\/community-domains\/lookup[\s\S]*domain_name/,
  "Frontend API layer must expose public-safe Community Domain lookup by code.",
  { frontend: true }
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_operating_map_payload[\s\S]*does not create a payment instruction[\s\S]*\/domains\/:name[\s\S]*\/community-domains\/:name[\s\S]*private member evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/operating-map"[\s\S]*def get_community_domain_operating_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose a scoped read-only Community Domain operating map without payment, activation, verification, public URL finalization, marketplace, social Community, money, or private-record leakage."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_operating_map_aggregates_domain_package_without_side_effects[\s\S]*\/operating-map[\s\S]*review_activation_requirements[\s\S]*create marketplace activity[\s\S]*db\.query\(Clan\)\.count\(\) == 0/,
  "Backend tests must prove the operating map aggregates the package without activation, public publication, marketplace, social Community, or other side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_operating_map_but_admin_routes_are_hidden[\s\S]*\/operating-map[\s\S]*outsider_map\.status_code == 403[\s\S]*lanes\["members"\]\["route_hint"\] is None[\s\S]*lanes\["verification"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read the operating map while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_template_fit_payload[\s\S]*read-only comparison[\s\S]*does[\s\S]*not create nodes[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/template-fit"[\s\S]*def get_community_domain_template_fit[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain template fit without node, member, role, policy, review, billing, verification, marketplace, social Community, money, publication, or private-evidence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_template_fit_compares_actual_domain_to_blueprint_without_writes[\s\S]*\/template-fit[\s\S]*market_line[\s\S]*market_section[\s\S]*node_member\.upsert[\s\S]*after_counts == before_counts/,
  "Backend tests must prove template fit compares actual domain setup to the selected blueprint without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_template_fit_but_admin_next_action_is_hidden[\s\S]*\/template-fit[\s\S]*outsider_fit\.status_code == 403[\s\S]*ask_domain_admin_to_review_template_fit/,
  "Backend tests must prove members can read template fit while outsiders are rejected and admin next action is hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_setup_plan_payload[\s\S]*read-only ordering guidance[\s\S]*does not create nodes[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/setup-plan"[\s\S]*def get_community_domain_setup_plan[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain setup plan without node, member, role, policy, review, verification, billing, activation, marketplace, social Community, money, publication, or private-evidence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_setup_plan_orders_template_fit_gaps_without_writes[\s\S]*\/setup-plan[\s\S]*setup_phase"\] == "structure"[\s\S]*after_counts == before_counts/,
  "Backend tests must prove setup plan orders template-fit gaps without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_setup_plan_but_admin_actions_are_hidden[\s\S]*\/setup-plan[\s\S]*outsider_plan\.status_code == 403[\s\S]*admin_action_route_hint"\] is None/,
  "Backend tests must prove members can read setup plan while outsider access is rejected and admin action routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_capacity_plan_payload[\s\S]*pilot package allowances[\s\S]*meter live shop usage[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/capacity-plan"[\s\S]*def get_community_domain_capacity_plan[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain capacity plan without limit, node, member, role, shop, storage, policy, review, billing, pricing, verification, marketplace, social Community, money, publication, or private-evidence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_capacity_plan_projects_package_usage_without_writes[\s\S]*\/capacity-plan[\s\S]*near_limit_lanes"\] == \["nodes"\][\s\S]*not_metered_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove capacity plan projects package usage and unmetered allowances without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_capacity_plan_but_admin_routes_are_hidden[\s\S]*\/capacity-plan[\s\S]*outsider_plan\.status_code == 403[\s\S]*lanes\["members"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read capacity plan while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_rollout_plan_payload[\s\S]*read-only institutional onboarding guidance[\s\S]*does not create nodes[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/rollout-plan"[\s\S]*def get_community_domain_rollout_plan[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain rollout plan without node, member, role, policy, review, verification, billing, activation, marketplace, social Community, money, publication, or private-evidence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_rollout_plan_projects_first_units_without_writes[\s\S]*\/rollout-plan[\s\S]*ready_for_pilot[\s\S]*needs_local_admin[\s\S]*after_counts == before_counts/,
  "Backend tests must prove rollout plan projects first rollout units without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_rollout_plan_but_admin_actions_are_hidden[\s\S]*\/rollout-plan[\s\S]*outsider_plan\.status_code == 403[\s\S]*admin_action_route_hint"\] is None/,
  "Backend tests must prove members can read rollout plan while outsiders are rejected and admin action routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_rollout_tree_payload[\s\S]*read-only recursive view[\s\S]*does not create nodes[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/rollout-tree"[\s\S]*def get_community_domain_rollout_tree[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain rollout tree without node, member, role, policy, review, status, verification, billing, marketplace, social Community, money, publication, or private-evidence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_rollout_tree_projects_recursive_units_without_writes[\s\S]*\/rollout-tree[\s\S]*Phone Accessories Section[\s\S]*needs_local_admin[\s\S]*after_counts == before_counts/,
  "Backend tests must prove rollout tree projects recursive rollout readiness without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_rollout_tree_but_admin_actions_are_hidden[\s\S]*\/rollout-tree[\s\S]*outsider_tree\.status_code == 403[\s\S]*admin_action_route_hint"\] is None/,
  "Backend tests must prove members can read rollout tree while outsiders are rejected and admin action routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_autonomy_map_payload[\s\S]*read-only local autonomy projection[\s\S]*does not grant local authority[\s\S]*change inheritance[\s\S]*create separate Community Domains[\s\S]*@router\.get\("\/\{community_domain_id\}\/node-autonomy-map"[\s\S]*def get_community_domain_node_autonomy_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node autonomy map without local-authority, role, policy, inheritance, node-splitting, separate-domain, billing, marketplace, finance, money, proof, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_autonomy_map_projects_local_unit_autonomy_without_writes[\s\S]*\/node-autonomy-map[\s\S]*locally_governed[\s\S]*locally_administered[\s\S]*parent_controlled[\s\S]*needs_local_governance[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node autonomy map projects local unit autonomy without authority, role, policy, inheritance, node, domain, billing, marketplace, finance, money, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_autonomy_map_but_admin_counts_are_hidden[\s\S]*\/node-autonomy-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_admin_count"\] is None/,
  "Backend tests must prove members can read node autonomy map while outsiders are rejected and admin-only autonomy counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_economic_map_payload[\s\S]*read-only local economy[\s\S]*does not create a marketplace[\s\S]*payment instruction[\s\S]*finance record[\s\S]*private member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/node-economic-map"[\s\S]*def get_community_domain_node_economic_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node economic map without marketplace, shop, listing, demand, spotlight, vault, payment, finance, loan, ledger, separate-domain, trust, proof, or private-activity side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_economic_map_projects_local_unit_economy_without_writes[\s\S]*\/node-economic-map[\s\S]*local_economy_ready[\s\S]*needs_local_admin[\s\S]*needs_participants[\s\S]*governance_needed[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node economic map projects local-unit economic readiness without marketplace, payment, finance, trust, node, domain, or private-activity writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_economic_map_but_admin_counts_are_hidden[\s\S]*\/node-economic-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_admin_count"\] is None/,
  "Backend tests must prove members can read node economic map while outsiders are rejected and admin-only local economy counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_activity_map_payload[\s\S]*read-only local activity[\s\S]*does not create events[\s\S]*paid activities[\s\S]*payment instructions[\s\S]*private member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/node-activity-map"[\s\S]*def get_community_domain_node_activity_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node activity map without event, travel, dues, attendance, payment, evidence, trust, finance, or private-activity side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_activity_map_projects_local_unit_activity_without_writes[\s\S]*\/node-activity-map[\s\S]*local_activity_ready[\s\S]*needs_local_admin[\s\S]*needs_participants[\s\S]*governance_needed[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node activity map projects local-unit activity readiness without event, payment, evidence, trust, finance, node, domain, or private-activity writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_activity_map_but_admin_counts_are_hidden[\s\S]*\/node-activity-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_admin_count"\] is None/,
  "Backend tests must prove members can read node activity map while outsiders are rejected and admin-only local activity counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_trust_map_payload[\s\S]*read-only local trust[\s\S]*upload evidence[\s\S]*show storage keys[\s\S]*issue TrustSlips[\s\S]*Trust Passport entries[\s\S]*private member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/node-trust-map"[\s\S]*def get_community_domain_node_trust_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node trust map without evidence upload, private payload, credential, TrustSlip, Trust Passport, identity, proof, finance, money, or private-activity side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_trust_map_projects_local_unit_trust_without_writes[\s\S]*\/node-trust-map[\s\S]*local_trust_ready[\s\S]*review_needed[\s\S]*evidence_needed[\s\S]*governance_needed[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node trust map projects local trust readiness without writing evidence, credentials, TrustSlips, Trust Passport entries, finance records, money movement, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_trust_map_but_admin_counts_are_hidden[\s\S]*\/node-trust-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"evidence_record_count"\] is None/,
  "Backend tests must prove members can read node trust map while outsiders are rejected and admin-only evidence counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_participation_map_payload[\s\S]*read-only member[\s\S]*placement planning[\s\S]*invite members[\s\S]*place[\s\S]*members[\s\S]*show member lists[\s\S]*private member activity[\s\S]*issue TrustSlips[\s\S]*Trust Passport entries/,
  "Backend helper must keep Community Domain node participation map read-only without invite, membership, role, placement, social Community, roster, marketplace, finance, TrustSlip, Trust Passport, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-participation-map"[\s\S]*def get_community_domain_node_participation_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_participation_map_payload/,
  "Backend route must expose scoped Community Domain node participation map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_participation_map_projects_member_placement_without_writes[\s\S]*\/node-participation-map[\s\S]*ready_local_circle[\s\S]*needs_local_admin[\s\S]*admin_only[\s\S]*empty_unit[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node participation map projects local member placement without writing invites, members, roles, placements, social Communities, marketplace, finance, trust, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_participation_map_but_admin_counts_are_hidden[\s\S]*\/node-participation-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node participation map while outsiders are rejected and admin-only placement counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_service_map_payload[\s\S]*Local service readiness item[\s\S]*does not enable[\s\S]*services[\s\S]*save settings[\s\S]*activate billing[\s\S]*grant permissions[\s\S]*create events[\s\S]*create notifications[\s\S]*create shops[\s\S]*create vault[\s\S]*private[\s\S]*member activity[\s\S]*Community Domain node service map is read-only local service[\s\S]*TrustSlips[\s\S]*Trust Passport entries/,
  "Backend helper must keep Community Domain node service map read-only without module enablement, settings persistence, billing, permission, event, notification, shop, vault, marketplace, finance, TrustSlip, Trust Passport, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-service-map"[\s\S]*def get_community_domain_node_service_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_service_map_payload/,
  "Backend route must expose scoped Community Domain node service map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_service_map_projects_local_service_readiness_without_writes[\s\S]*\/node-service-map[\s\S]*local_services_ready[\s\S]*needs_local_admin[\s\S]*needs_participants[\s\S]*governance_needed[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node service map projects local service readiness without writing modules, settings, billing, permissions, events, notifications, shops, vaults, marketplace, finance, trust, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_service_map_but_admin_counts_are_hidden[\s\S]*\/node-service-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node service map while outsiders are rejected and admin-only service readiness counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_privacy_map_payload[\s\S]*read-only local privacy[\s\S]*does not change permissions[\s\S]*publish hierarchy[\s\S]*(?:expose|show) member lists[\s\S]*(?:expose|show) node rosters[\s\S]*(?:expose|show) storage[\s\S]*share records across institutions[\s\S]*Trust Passport entries/,
  "Backend helper must keep Community Domain node privacy map read-only without permission, publication, roster, storage, cross-domain sharing, marketplace, finance, TrustSlip, Trust Passport, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-privacy-map"[\s\S]*def get_community_domain_node_privacy_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_privacy_map_payload/,
  "Backend route must expose scoped Community Domain node privacy map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_privacy_map_projects_local_visibility_without_permission_writes[\s\S]*\/node-privacy-map[\s\S]*member_visible[\s\S]*node_private[\s\S]*admin_restricted[\s\S]*public_review_needed[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node privacy map projects local visibility without writing permissions, publication, rosters, evidence exposure, marketplace, finance, trust, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_privacy_map_but_admin_counts_are_hidden[\s\S]*\/node-privacy-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node privacy map while outsiders are rejected and admin-only visibility counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_analytics_map_payload[\s\S]*read-only local analytics[\s\S]*does not create telemetry[\s\S]*export reports[\s\S]*live dashboards[\s\S]*marketplace metrics[\s\S]*finance metrics[\s\S]*storage keys[\s\S]*Trust Passport entries[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node analytics map read-only without telemetry, reports, live dashboards, marketplace metrics, finance metrics, storage keys, Trust Passport, TrustSlip, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-analytics-map"[\s\S]*def get_community_domain_node_analytics_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_analytics_map_payload/,
  "Backend route must expose scoped Community Domain node analytics map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_analytics_map_projects_local_signals_without_writes[\s\S]*\/node-analytics-map[\s\S]*local_analytics_ready[\s\S]*needs_membership_signal[\s\S]*needs_governance_signal[\s\S]*needs_review_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node analytics map projects local signals without writing telemetry, reports, dashboards, marketplace metrics, finance metrics, Trust Passport, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_analytics_map_but_admin_counts_are_hidden[\s\S]*\/node-analytics-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node analytics map while outsiders are rejected and admin-only analytics counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_domain_boundary_map_payload[\s\S]*read-only child-domain[\s\S]*create child Community Domains[\s\S]*create affiliate links[\s\S]*publish public URLs[\s\S]*activate billing[\s\S]*split hierarchy[\s\S]*transfer members[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node domain-boundary map read-only without child-domain, affiliate, URL publication, billing, hierarchy split, member transfer, marketplace, finance, TrustSlip, Trust Passport, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-domain-boundary-map"[\s\S]*def get_community_domain_node_domain_boundary_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_domain_boundary_map_payload/,
  "Backend route must expose scoped Community Domain node domain-boundary map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_domain_boundary_map_projects_child_domain_candidates_without_writes[\s\S]*\/node-domain-boundary-map[\s\S]*child_domain_candidate[\s\S]*affiliate_review_needed[\s\S]*internal_operating_unit[\s\S]*parent_domain_unit[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node domain-boundary map projects child-domain candidates without writing child domains, affiliations, billing, public URLs, member moves, marketplace, finance, trust, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_domain_boundary_map_but_admin_counts_are_hidden[\s\S]*\/node-domain-boundary-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node domain-boundary map while outsiders are rejected and admin-only boundary counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_evidence_authority_map_payload[\s\S]*read-only local evidence authority[\s\S]*upload evidence[\s\S]*verify evidence[\s\S]*publish public evidence[\s\S]*show storage keys[\s\S]*issue credentials[\s\S]*Trust Passport entries[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node evidence-authority map read-only without upload, verification, publication, storage-key, credential, TrustSlip, Trust Passport, marketplace, finance, legal-authority, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-evidence-authority-map"[\s\S]*def get_community_domain_node_evidence_authority_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_evidence_authority_map_payload/,
  "Backend route must expose scoped Community Domain node evidence-authority map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_evidence_authority_map_projects_local_evidence_authority_without_writes[\s\S]*\/node-evidence-authority-map[\s\S]*local_evidence_authority_ready[\s\S]*public_evidence_review_needed[\s\S]*needs_local_evidence_issuer[\s\S]*needs_evidence_policy[\s\S]*needs_evidence_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node evidence-authority map projects local authority without writing evidence, verification, credentials, Trust Passport, marketplace, finance, legal authority, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_evidence_authority_map_but_admin_counts_are_hidden[\s\S]*\/node-evidence-authority-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node evidence-authority map while outsiders are rejected and admin-only evidence authority counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_communication_map_payload[\s\S]*read-only local communication[\s\S]*create notices[\s\S]*send notifications[\s\S]*publish announcements[\s\S]*schedule meetings[\s\S]*emergency notices[\s\S]*show member lists[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node communication map read-only without notices, notifications, announcements, meetings, events, reminders, emergency notices, member-list exposure, marketplace, finance, TrustSlip, Trust Passport, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-communication-map"[\s\S]*def get_community_domain_node_communication_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_communication_map_payload/,
  "Backend route must expose scoped Community Domain node communication map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_communication_map_projects_local_notice_readiness_without_writes[\s\S]*\/node-communication-map[\s\S]*local_communication_ready[\s\S]*public_notice_review_needed[\s\S]*needs_local_communicator[\s\S]*needs_audience_signal[\s\S]*needs_communication_policy[\s\S]*needs_notice_review_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node communication map projects local notice readiness without writing notices, notifications, announcements, meetings, events, emergency notices, trust, marketplace, finance, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_communication_map_but_admin_counts_are_hidden[\s\S]*\/node-communication-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node communication map while outsiders are rejected and admin-only communication counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_vault_map_payload[\s\S]*read-only local vault[\s\S]*upload files[\s\S]*download files[\s\S]*create vault links[\s\S]*show storage keys[\s\S]*show member lists[\s\S]*Trust Passport entries[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node vault map read-only without file upload, download, vault-link, storage-key, member-list, permission, external-reader, TrustSlip, Trust Passport, marketplace, finance, proof, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-vault-map"[\s\S]*def get_community_domain_node_vault_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_vault_map_payload/,
  "Backend route must expose scoped Community Domain node vault map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_vault_map_projects_local_document_readiness_without_writes[\s\S]*\/node-vault-map[\s\S]*local_vault_ready[\s\S]*public_vault_review_needed[\s\S]*needs_vault_steward[\s\S]*needs_vault_audience[\s\S]*needs_vault_policy[\s\S]*needs_document_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node vault map projects local document readiness without writing files, links, permissions, storage keys, public proof, Trust Passport, marketplace, finance, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_vault_map_but_admin_counts_are_hidden[\s\S]*\/node-vault-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node vault map while outsiders are rejected and admin-only vault counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_scheduled_activity_map_payload[\s\S]*read-only local schedule[\s\S]*create events[\s\S]*create meetings[\s\S]*create calendar entries[\s\S]*record attendance[\s\S]*send reminders[\s\S]*send notifications[\s\S]*payment instructions[\s\S]*Trust Passport entries[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node scheduled activity map read-only without event, meeting, calendar, attendance, reminder, notification, payment, evidence, TrustSlip, Trust Passport, marketplace, finance, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-scheduled-activity-map"[\s\S]*def get_community_domain_node_scheduled_activity_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_scheduled_activity_map_payload/,
  "Backend route must expose scoped Community Domain node scheduled activity map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_scheduled_activity_map_projects_local_schedule_readiness_without_writes[\s\S]*\/node-scheduled-activity-map[\s\S]*local_schedule_ready[\s\S]*public_schedule_review_needed[\s\S]*needs_activity_coordinator[\s\S]*needs_schedule_audience[\s\S]*needs_schedule_policy[\s\S]*needs_attendance_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node scheduled activity map projects local schedule readiness without writing events, meetings, calendars, attendance, notifications, payments, trust, marketplace, finance, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_scheduled_activity_map_but_admin_counts_are_hidden[\s\S]*\/node-scheduled-activity-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node scheduled activity map while outsiders are rejected and admin-only schedule counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_paid_activity_map_payload[\s\S]*read-only local payment[\s\S]*create dues[\s\S]*create levies[\s\S]*create tickets[\s\S]*create travel fees[\s\S]*create contributions[\s\S]*create payment instructions[\s\S]*write ledger entries[\s\S]*move money[\s\S]*Trust Passport entries[\s\S]*private member activity/,
  "Backend helper must keep Community Domain node paid activity map read-only without dues, levies, tickets, travel fees, contributions, invoices, payment instructions, receipts, bank matches, ledger entries, money movement, loans, TrustSlip, Trust Passport, marketplace, finance, or private-activity side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/node-paid-activity-map"[\s\S]*def get_community_domain_node_paid_activity_map[\s\S]*_require_domain_member_scope[\s\S]*_community_domain_node_paid_activity_map_payload/,
  "Backend route must expose scoped Community Domain node paid activity map to active domain members."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_paid_activity_map_projects_local_payment_readiness_without_writes[\s\S]*\/node-paid-activity-map[\s\S]*local_paid_activity_ready[\s\S]*public_payment_review_needed[\s\S]*needs_payment_steward[\s\S]*needs_payer_audience[\s\S]*needs_paid_activity_policy[\s\S]*needs_finance_review_signal[\s\S]*after_counts == before_counts/,
  "Backend tests must prove node paid activity map projects local payment readiness without writing dues, tickets, contributions, payment instructions, ledgers, money movement, trust, marketplace, finance, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_paid_activity_map_but_admin_counts_are_hidden[\s\S]*\/node-paid-activity-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"local_member_count"\] is None/,
  "Backend tests must prove members can read node paid activity map while outsiders are rejected and admin-only paid activity counts are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_governance_coverage_payload[\s\S]*read-only hierarchy projection[\s\S]*does[\s\S]*not create policy[\s\S]*verify legal or institutional authority[\s\S]*@router\.get\("\/\{community_domain_id\}\/governance-coverage"[\s\S]*def get_community_domain_governance_coverage[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain governance coverage without policy, role, review, authority, billing, marketplace, social Community, money, publication, or private-review side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_governance_coverage_projects_recursive_policy_fit_without_writes[\s\S]*\/governance-coverage[\s\S]*governed_by_inheritance[\s\S]*needs_policy[\s\S]*after_counts == before_counts/,
  "Backend tests must prove governance coverage projects recursive local/inherited/missing policy fit without writing records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_governance_coverage_but_admin_actions_are_hidden[\s\S]*\/governance-coverage[\s\S]*outsider_coverage\.status_code == 403[\s\S]*admin_action_route_hint"\] is None/,
  "Backend tests must prove members can read governance coverage while outsiders are rejected and admin action routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_analytics_payload[\s\S]*read-only aggregate snapshot[\s\S]*does[\s\S]*not create nodes[\s\S]*meter live marketplace\/shop\/finance[\s\S]*private member[\s\S]*@router\.get\("\/\{community_domain_id\}\/analytics"[\s\S]*def get_community_domain_analytics[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain analytics without node, member, role, policy, review, authority, billing, marketplace/shop/finance metering, publication, social Community, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_analytics_projects_aggregate_domain_snapshot_without_private_records[\s\S]*\/analytics[\s\S]*not_metered_in_this_slice[\s\S]*meter live marketplace\/shop\/finance usage[\s\S]*after_counts == before_counts/,
  "Backend tests must prove analytics projects aggregate structure/member/governance/module counts without writing records or claiming live economic metering."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_analytics_but_admin_routes_are_hidden[\s\S]*\/analytics[\s\S]*outsider_analytics\.status_code == 403[\s\S]*lanes\["membership"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read analytics while outsiders are rejected and admin-only route hints are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_evidence_map_payload[\s\S]*read-only evidence readiness[\s\S]*does not upload evidence[\s\S]*create TrustSlips[\s\S]*private member[\s\S]*@router\.get\("\/\{community_domain_id\}\/evidence-map"[\s\S]*def get_community_domain_evidence_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain evidence map without upload, files, credentials, TrustSlip, Trust Passport, relay, authority, publication, billing, marketplace, social Community, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_evidence_map_projects_safe_evidence_readiness_without_private_records[\s\S]*\/evidence-map[\s\S]*not_connected_in_this_slice[\s\S]*branch-register\.pdf" not in str\(evidence_map\)[\s\S]*after_counts == before_counts/,
  "Backend tests must prove evidence map projects safe evidence readiness without writing records or exposing private file/storage evidence details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_evidence_map_but_admin_routes_are_hidden[\s\S]*\/evidence-map[\s\S]*outsider_map\.status_code == 403[\s\S]*lanes\["authority_evidence"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read evidence map while outsiders are rejected and admin-only route hints are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_evidence_record_readiness_payload[\s\S]*read-only durable evidence[\s\S]*does not create CommunityDomainEvidenceRecord[\s\S]*upload files[\s\S]*show storage keys[\s\S]*issue credentials[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/evidence-record-readiness"[\s\S]*def get_community_domain_evidence_record_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain evidence record readiness without evidence-record rows, file uploads, storage keys, credentials, TrustSlips, Trust Passport entries, proof publication, authority verification, billing, marketplace, social Community, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_evidence_record_readiness_projects_future_records_without_writes[\s\S]*\/evidence-record-readiness[\s\S]*evidence_record_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*CommunityDomainEvidenceRecord[\s\S]*private\/evidence\/domain-registration\.pdf" not in str\(readiness\)[\s\S]*after_counts == before_counts/,
  "Backend tests must prove evidence record readiness projects future durable record types without writing records or exposing private file/storage evidence details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_evidence_record_readiness_but_admin_counts_are_hidden[\s\S]*\/evidence-record-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"active_policy_count"\] is None/,
  "Backend tests must prove members can read evidence record readiness while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_evidence_release_readiness_payload[\s\S]*read-only public-safe[\s\S]*does not release evidence[\s\S]*(?:expose|show) storage keys[\s\S]*publish public proof[\s\S]*create public[\s\S]*URLs[\s\S]*issue TrustSlips[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/evidence-release-readiness"[\s\S]*def get_community_domain_evidence_release_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain evidence release readiness without evidence release, files, storage keys, public proof, URLs, QR codes, credentials, TrustSlips, Trust Passport entries, cross-domain sharing, trust relay paths, authority verification, billing, marketplace, social Community, permission, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_evidence_release_readiness_projects_public_safe_release_without_writes[\s\S]*\/evidence-release-readiness[\s\S]*evidence_release_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*public_proofs_published[\s\S]*private\/evidence\/public-safe-line-summary\.pdf" not in str\(readiness\)[\s\S]*after_counts == before_counts/,
  "Backend tests must prove evidence release readiness projects public-safe release boundaries without writing records or exposing private file/storage evidence details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_evidence_release_readiness_but_admin_counts_are_hidden[\s\S]*\/evidence-release-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"release_policy_count"\] is None/,
  "Backend tests must prove members can read evidence release readiness while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_trust_relay_readiness_payload[\s\S]*read-only relay path[\s\S]*does not create trust relay path records[\s\S]*source-domain\/bridge-member\/destination-domain rows[\s\S]*repost[\s\S]*Spotlight[\s\S]*cross-domain discovery[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/trust-relay-readiness"[\s\S]*def get_community_domain_trust_relay_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain trust relay readiness without relay path rows, source/bridge/destination rows, Spotlight reposts, proof publication, cross-domain discovery, directories, private record sharing, files, storage keys, TrustSlips, Trust Passport entries, credentials, marketplace activity, affiliations, billing, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_trust_relay_readiness_projects_relay_path_without_writes[\s\S]*\/trust-relay-readiness[\s\S]*trust_relay_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*relay_paths_created[\s\S]*private\/evidence\/trust-relay-bridge\.pdf" not in str\(readiness\)[\s\S]*after_counts == before_counts/,
  "Backend tests must prove trust relay readiness projects source/bridge/destination path ingredients without writing relay records or exposing private file/storage evidence details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_trust_relay_readiness_but_admin_counts_are_hidden[\s\S]*\/trust-relay-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"relay_policy_count"\] is None/,
  "Backend tests must prove members can read trust relay readiness while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_notification_scope_readiness_payload[\s\S]*read-only[\s\S]*notification scope[\s\S]*does not send[\s\S]*notifications[\s\S]*create notification jobs[\s\S]*emails[\s\S]*SMS[\s\S]*WhatsApp[\s\S]*push notifications[\s\S]*audience lists[\s\S]*public announcements[\s\S]*cross-domain[\s\S]*broadcasts[\s\S]*show member lists[\s\S]*@router\.get\("\/\{community_domain_id\}\/notification-scope-readiness"[\s\S]*def get_community_domain_notification_scope_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain notification scope readiness without sending notifications, creating jobs, delivery, audience lists, announcements, broadcasts, member-list exposure, marketplace activity, money, trust, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_notification_scope_readiness_projects_audiences_without_sending[\s\S]*\/notification-scope-readiness[\s\S]*notification_scope_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*notification_jobs_created[\s\S]*notifications_sent[\s\S]*audience_lists_created[\s\S]*after_counts == before_counts/,
  "Backend tests must prove notification scope readiness projects future audience boundaries without sending notifications, creating jobs, audience lists, announcements, broadcasts, trust, marketplace, finance, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_notification_scope_readiness_but_admin_counts_are_hidden[\s\S]*\/notification-scope-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"notification_policy_count"\] is None/,
  "Backend tests must prove members can read notification scope readiness while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_trust_mobility_payload[\s\S]*read-only portability planning[\s\S]*does not create TrustSlips[\s\S]*write Trust Passport[\s\S]*show storage keys[\s\S]*create a social Community[\s\S]*@router\.get\("\/\{community_domain_id\}\/trust-mobility"[\s\S]*def get_community_domain_trust_mobility[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain trust mobility without TrustSlip, Trust Passport, credential, relay, evidence release, public proof, outward link, billing, marketplace, social Community, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_trust_mobility_projects_portability_readiness_without_issuing_records[\s\S]*\/trust-mobility[\s\S]*not_connected_in_this_slice[\s\S]*trusted-trader-attestation\.pdf" not in str\(trust_mobility\)[\s\S]*after_counts == before_counts/,
  "Backend tests must prove trust mobility projects portability readiness without issuing TrustSlips, writing passport records, or exposing private file/storage evidence details."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_trust_mobility_but_admin_routes_are_hidden[\s\S]*\/trust-mobility[\s\S]*outsider_mobility\.status_code == 403[\s\S]*lanes\["trustslip_bridge"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read trust mobility while outsiders are rejected and admin-only route hints are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_subscription_lifecycle_payload[\s\S]*read-only billing planning[\s\S]*does not create a quote acceptance[\s\S]*create a payment[\s\S]*instruction[\s\S]*renew a domain[\s\S]*private finance[\s\S]*@router\.get\("\/\{community_domain_id\}\/subscription-lifecycle"[\s\S]*def get_community_domain_subscription_lifecycle[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain subscription lifecycle without quote acceptance, payment instruction, expected payment, invoice, receipt, billing account, entitlement, renewal, suspension, reactivation, money, or private-finance side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_subscription_lifecycle_projects_billing_plan_without_payment_writes[\s\S]*\/subscription-lifecycle[\s\S]*not_created_in_this_slice[\s\S]*not_recorded_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove subscription lifecycle projects billing setup without payment, billing, renewal, activation, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_subscription_lifecycle_but_admin_routes_are_hidden[\s\S]*\/subscription-lifecycle[\s\S]*outsider_lifecycle\.status_code == 403[\s\S]*lanes\["payment_instruction"\]\["route_hint"\] is None/,
  "Backend tests must prove members can read subscription lifecycle while outsiders are rejected and admin-only route hints are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_social_bridge_payload[\s\S]*read-only relationship planning[\s\S]*does not create a social Community[\s\S]*upgrade an[\s\S]*existing Community[\s\S]*set clan_id[\s\S]*private member records[\s\S]*@router\.get\("\/\{community_domain_id\}\/social-bridge"[\s\S]*def get_community_domain_social_bridge[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain social bridge without social Community creation, upgrade, clan_id linking, affiliation writes, member copying, marketplace movement, billing, verification, or private-member side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_social_bridge_projects_linked_community_without_upgrade_writes[\s\S]*\/social-bridge[\s\S]*clan_to_clan_only[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove social bridge projects linked lightweight Community and clan affiliation status without upgrade, link, affiliation, member, review, or marketplace writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_social_bridge_but_linked_community_details_are_hidden[\s\S]*\/social-bridge[\s\S]*outsider_bridge\.status_code == 403[\s\S]*"status": "hidden_for_member"/,
  "Backend tests must prove members can read social bridge while outsiders are rejected and linked social Community details are hidden from non-admins."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_affiliation_readiness_payload[\s\S]*read-only parent\/child[\s\S]*clan-to-clan[\s\S]*does not create domain-domain[\s\S]*create parent Community Domains[\s\S]*create child Community[\s\S]*transfer members[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/affiliation-readiness"[\s\S]*def get_community_domain_affiliation_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain affiliation readiness without domain-domain affiliation, parent/child domain creation, affiliation decisions, clan linking, member transfer, billing, verification, marketplace, money, TrustSlip, Trust Passport, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_affiliation_readiness_projects_parent_child_clan_links_without_writes[\s\S]*\/affiliation-readiness[\s\S]*clan_affiliation_projection_only[\s\S]*domain_affiliation_records_created[\s\S]*after_counts == before_counts/,
  "Backend tests must prove affiliation readiness projects existing clan affiliation rows without writing domain-domain affiliations, parent domains, child domains, billing, public URLs, member transfers, or trust records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_affiliation_readiness_but_admin_details_are_hidden[\s\S]*\/affiliation-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"status_counts"\] is None/,
  "Backend tests must prove members can read affiliation readiness while outsiders are rejected and admin-only affiliation counts/details are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_institutional_profile_payload[\s\S]*read-only package[\s\S]*classification[\s\S]*custom schema[\s\S]*custom billing package[\s\S]*private member\/review\/evidence exposure[\s\S]*@router\.get\("\/\{community_domain_id\}\/institutional-profile"[\s\S]*def get_community_domain_institutional_profile[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain institutional profile without custom schema, custom tenant, custom billing, structure, membership, policy, review, evidence, marketplace, social-community, verification, activation, publication, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_institutional_profile_projects_real_world_package_without_writes[\s\S]*\/institutional-profile[\s\S]*market_cooperative[\s\S]*configuration_not_schema_fork[\s\S]*after_counts == before_counts/,
  "Backend tests must prove institutional profile projects real-world package posture without node, member, policy, review, evidence, marketplace, billing, verification, activation, or schema writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_institutional_profile_but_admin_counts_are_hidden[\s\S]*\/institutional-profile[\s\S]*outsider_profile\.status_code == 403[\s\S]*"active_policy_count"[\s\S]*is None/,
  "Backend tests must prove members can read institutional profile while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_delegation_map_payload[\s\S]*read-only authority projection[\s\S]*does not assign roles[\s\S]*create node memberships[\s\S]*change inheritance[\s\S]*private member\/review\/evidence records[\s\S]*@router\.get\("\/\{community_domain_id\}\/delegation-map"[\s\S]*def get_community_domain_delegation_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain delegation map without role assignment, node membership, policy, review, inheritance, verification, billing, marketplace, social-community, publication, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_delegation_map_projects_authority_without_permission_writes[\s\S]*\/delegation-map[\s\S]*covered_by_domain_or_local_policy[\s\S]*after_counts == before_counts/,
  "Backend tests must prove delegation map projects central/local authority and policy coverage without role, membership, policy, review, inheritance, verification, billing, marketplace, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_delegation_map_but_admin_details_are_hidden[\s\S]*\/delegation-map[\s\S]*outsider_delegation\.status_code == 403[\s\S]*"central_authority_count"[\s\S]*is None/,
  "Backend tests must prove members can read delegation map while outsiders are rejected and admin-only counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_identity_context_payload[\s\S]*open_reviews = \[[\s\S]*_action_review_matches_user_filter\(review, user_id=user_id\)[\s\S]*read-only current-member[\s\S]*does not issue a GSN\/GMFN ID[\s\S]*merge[\s\S]*identities[\s\S]*other domain names[\s\S]*@router\.get\("\/\{community_domain_id\}\/identity-context"[\s\S]*def get_community_domain_identity_context[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain current-member identity context, refine member-action review counts against payload user identity, and avoid ID issuing, identity merging, user creation, membership writes, social-community joins, shop, money, Trust Passport, TrustSlip, marketplace, verification, billing, or cross-domain/private-record exposure."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_identity_context_projects_one_member_across_domain_and_social_contexts_without_writes[\s\S]*other_review[\s\S]*review_row\.target_id = str\(owner\.id\)[\s\S]*\/identity-context[\s\S]*single_identity_rule[\s\S]*current_domain_open_member_reviews": 0[\s\S]*lanes\["open_member_reviews"\]\["count"\] == 0[\s\S]*json\.loads\(review_row\.payload_json or "\{\}"\)\["user_id"\] == other_member\.id[\s\S]*after_counts == before_counts/,
  "Backend tests must prove identity context projects one member across domain, node, and linked social contexts, excludes mismatched member-action target drift from the wrong member's open-review count, and does not perform identity, membership, social-community, shop, trust, marketplace, or finance writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_identity_context_rejects_outsider_and_does_not_issue_missing_gsn_id[\s\S]*\/identity-context[\s\S]*outsider_context\.status_code == 403[\s\S]*"gsn_id": None/,
  "Backend tests must prove identity context rejects outsiders and does not issue or repair a missing GSN/GMFN ID during read-only projection."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_activity_map_payload[\s\S]*read-only operating-activity[\s\S]*dues[\s\S]*travel[\s\S]*payment instructions[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/activity-map"[\s\S]*def get_community_domain_activity_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain activity map without activity/event/attendance, paid activity, payment, marketplace, notification, TrustSlip, Trust Passport, public proof, or private-record side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_delegation_map_payload[\s\S]*\["pending", "pending_review", "needs_changes", "approved"\][\s\S]*"review_queue"[\s\S]*route_suffix="\/action-reviews"[\s\S]*review_open_delegated_reviews[\s\S]*def _community_domain_activity_map_payload[\s\S]*\["pending", "pending_review", "needs_changes", "approved"\][\s\S]*review_open_activity_related_reviews[\s\S]*\/action-reviews[\s\S]*def _community_domain_member_verification_map_payload[\s\S]*\["pending", "pending_review", "needs_changes", "approved"\][\s\S]*resolve_open_member_reviews[\s\S]*\/action-reviews/,
  "Backend broad open-review readiness surfaces must route admins to the action-review list, not the pending-only reviewer queue, when their counts include needs_changes or approved reviews."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_activity_map_projects_template_activity_without_paid_activity_writes[\s\S]*\/activity-map[\s\S]*paid_activity_status[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove activity map projects template activity lanes and paid-activity boundaries without event, payment, marketplace, trust, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_activity_map_but_admin_activity_counts_are_hidden[\s\S]*\/activity-map[\s\S]*outsider_activity\.status_code == 403[\s\S]*"active_policy_count"[\s\S]*is None/,
  "Backend tests must prove members can read activity map while outsiders are rejected and admin-only activity counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_activity_group_readiness_payload[\s\S]*read-only group planning[\s\S]*does not create activity groups[\s\S]*create ROSCA cycles[\s\S]*create payment instructions[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/activity-group-readiness"[\s\S]*def get_community_domain_activity_group_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain activity group readiness without activity-group, ROSCA, meeting, attendance, payment, marketplace, money, TrustSlip, Trust Passport, or private-member side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_activity_group_readiness_projects_group_like_units_without_writes[\s\S]*\/activity-group-readiness[\s\S]*activity_group_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*does not create activity groups[\s\S]*after_counts == before_counts/,
  "Backend tests must prove activity group readiness projects group-like nodes without writing activity groups, ROSCA cycles, meetings, payments, trust, marketplace, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_activity_group_readiness_but_admin_counts_are_hidden[\s\S]*\/activity-group-readiness[\s\S]*outsider_map\.status_code == 403[\s\S]*"active_node_memberships"\] is None/,
  "Backend tests must prove members can read activity group readiness while outsiders are rejected and admin-only group counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_member_verification_map_payload[\s\S]*member_review_count[\s\S]*_member_action_target_type_filter\(\)[\s\S]*open_member_review_count[\s\S]*_member_action_target_type_filter\(\)[\s\S]*read-only readiness[\s\S]*does not perform KYC[\s\S]*issue credentials[\s\S]*private member\/review\/evidence records[\s\S]*@router\.get\("\/\{community_domain_id\}\/member-verification-map"[\s\S]*def get_community_domain_member_verification_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain member verification map, normalize member target types in aggregate review counts, and avoid KYC, credential, membership, role, policy, review, evidence, TrustSlip, Trust Passport, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_verification_map_projects_institutional_readiness_without_credentials[\s\S]*legacy_target_review[\s\S]*legacy_review_row\.subject_user_id is None[\s\S]*legacy_review_row\.target_type = " Domain_Member "[\s\S]*\/member-verification-map[\s\S]*"member_review_count": 2[\s\S]*"open_member_review_count": 2[\s\S]*legacy_review_row\.target_type == " Domain_Member "[\s\S]*after_counts == before_counts/,
  "Backend tests must prove member verification map projects institutional readiness, counts legacy-cased member target rows, and does not perform credential, membership, role, review, evidence, trust, money, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_member_verification_map_but_admin_counts_are_hidden[\s\S]*\/member-verification-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"members_with_gsn_id"[\s\S]*is None/,
  "Backend tests must prove members can read member verification map while outsiders are rejected and admin-only verification counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_network_exchange_map_payload[\s\S]*read-only outside-network[\s\S]*does not create domain-to-domain exchange[\s\S]*cross-domain discovery[\s\S]*private member[\s\S]*@router\.get\("\/\{community_domain_id\}\/network-exchange-map"[\s\S]*def get_community_domain_network_exchange_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain network exchange map without domain-to-domain exchange, discovery, marketplace, trust, finance, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_network_exchange_map_projects_outward_readiness_without_exchange_writes[\s\S]*\/network-exchange-map[\s\S]*domain_exchange_status[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove network exchange map projects outside-network readiness without affiliation, discovery, marketplace, trust, finance, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_network_exchange_map_but_exchange_counts_are_hidden[\s\S]*\/network-exchange-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"linked_social_member_count"[\s\S]*is None/,
  "Backend tests must prove members can read network exchange map while outsiders are rejected and admin-only exchange counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_record_privacy_map_payload[\s\S]*read-only privacy planning[\s\S]*does not change permissions[\s\S]*show member lists[\s\S]*share records across institutions[\s\S]*@router\.get\("\/\{community_domain_id\}\/record-privacy-map"[\s\S]*def get_community_domain_record_privacy_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain record privacy map without permission, member-list, evidence, marketplace, finance, discovery, directory, sharing, or money side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_record_privacy_map_projects_record_boundaries_without_permission_writes[\s\S]*\/record-privacy-map[\s\S]*cross_domain_record_sharing_status[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove record privacy map projects record boundaries without permission, evidence, review, marketplace, finance, sharing, or money writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_record_privacy_map_but_admin_record_counts_are_hidden[\s\S]*\/record-privacy-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"visibility_policy_counts"[\s\S]*is None/,
  "Backend tests must prove members can read record privacy map while outsiders are rejected and admin-only record counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_configuration_map_payload[\s\S]*read-only configuration[\s\S]*does not create a custom schema[\s\S]*custom billing package[\s\S]*per-client code fork[\s\S]*@router\.get\("\/\{community_domain_id\}\/configuration-map"[\s\S]*def get_community_domain_configuration_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain configuration map without custom schema, tenant, billing, permissions, fields, code, module, payment, marketplace, trust, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_configuration_map_projects_template_adjustment_without_schema_writes[\s\S]*\/configuration-map[\s\S]*configuration_mode[\s\S]*template_preset_configuration[\s\S]*after_counts == before_counts/,
  "Backend tests must prove configuration map projects template adjustment without schema, tenant, billing, node, member, policy, review, evidence, module, payment, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_configuration_map_but_admin_configuration_counts_are_hidden[\s\S]*\/configuration-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"observed_node_kinds"[\s\S]*is None/,
  "Backend tests must prove members can read configuration map while outsiders are rejected and admin-only configuration counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_compliance_map_payload[\s\S]*read-only compliance planning[\s\S]*not legal advice[\s\S]*does not certify compliance[\s\S]*does not create payment instructions[\s\S]*share records across institutions[\s\S]*@router\.get\("\/\{community_domain_id\}\/compliance-map"[\s\S]*def get_community_domain_compliance_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain compliance map without legal, verification, policy, review, payment, marketplace, finance, sharing, trust, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_compliance_map_projects_operational_risk_without_compliance_writes[\s\S]*\/compliance-map[\s\S]*compliance_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove compliance map projects operational risk without compliance, authority, payment, marketplace, finance, trust, sharing, or private-record writes."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_compliance_map_but_admin_risk_counts_are_hidden[\s\S]*\/compliance-map[\s\S]*outsider_map\.status_code == 403[\s\S]*"open_review_count"[\s\S]*is None/,
  "Backend tests must prove members can read compliance map while outsiders are rejected and admin-only risk counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_appeal_readiness_payload[\s\S]*read-only fairness and dispute[\s\S]*does not create[\s\S]*appeals[\s\S]*assign mediators[\s\S]*reverse payments[\s\S]*private member\/review\/evidence\/finance records[\s\S]*@router\.get\("\/\{community_domain_id\}\/appeal-readiness"[\s\S]*def get_community_domain_appeal_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain appeal readiness without appeal, mediator, dispute decision, role, evidence, content, access, node, payment, money, trust, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_appeal_readiness_projects_dispute_paths_without_appeal_writes[\s\S]*\/appeal-readiness[\s\S]*appeal_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*does not create appeals[\s\S]*after_counts == before_counts/,
  "Backend tests must prove appeal readiness projects dispute paths without writing appeal records, mediator assignments, decisions, money movement, trust records, or private data."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_appeal_readiness_but_admin_counts_are_hidden[\s\S]*\/appeal-readiness[\s\S]*outsider_map\.status_code == 403[\s\S]*"active_policy_count"\] is None/,
  "Backend tests must prove members can read appeal readiness while outsiders are rejected and admin-only appeal counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_service_settings_payload[\s\S]*does not save settings[\s\S]*enable or disable services[\s\S]*grant permissions[\s\S]*@router\.get\("\/\{community_domain_id\}\/service-settings"[\s\S]*def list_community_domain_service_settings[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain service settings without module, billing, activation, permission, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_service_settings_are_template_projection_without_activation[\s\S]*\/service-settings[\s\S]*enable or disable services[\s\S]*domain\.status == "draft"/,
  "Backend tests must prove service settings are template projections without activation or persistence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_service_settings_but_outsider_is_rejected[\s\S]*\/service-settings[\s\S]*outsider_settings\.status_code == 403[\s\S]*admin_visible"\] is False/,
  "Backend tests must prove members can read service settings while outsiders are rejected and admin visibility is separated."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_module_scope_readiness_payload[\s\S]*service readiness is planning guidance[\s\S]*does not create CommunityDomainModuleScope[\s\S]*save settings[\s\S]*activate billing[\s\S]*grant permissions[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/module-scope-readiness"[\s\S]*def get_community_domain_module_scope_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain module scope readiness without module-scope records, settings persistence, module enablement, billing, permissions, shops, vaults, events, notifications, TrustSlip, Trust Passport, private activity, or money side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_module_scope_readiness_projects_template_modules_without_writes[\s\S]*\/module-scope-readiness[\s\S]*module_scope_engine_status[\s\S]*not_connected_in_this_slice[\s\S]*CommunityDomainModuleScope[\s\S]*after_counts == before_counts/,
  "Backend tests must prove module scope readiness projects template module scoping without writing settings, module-scope records, billing, permissions, service records, trust records, or private activity."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_module_scope_readiness_but_admin_counts_are_hidden[\s\S]*\/module-scope-readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"active_policy_count"\] is None/,
  "Backend tests must prove members can read module scope readiness while outsiders are rejected and admin-only module scope counts/routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_economic_participation_payload[\s\S]*does not create a marketplace[\s\S]*private[\s\S]*member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/economic-participation"[\s\S]*def get_community_domain_economic_participation[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain economic participation without marketplace, shop, listing, demand, spotlight, vault, money, payment, finance, verification, activation, social-community, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_economic_participation_projects_market_fit_without_marketplace_writes[\s\S]*\/economic-participation[\s\S]*core_template[\s\S]*finance_support[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove economic participation projects market fit without marketplace, shop, finance, verification, review, or social Community side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_economic_participation_but_admin_routes_are_hidden[\s\S]*\/economic-participation[\s\S]*outsider_economic\.status_code == 403[\s\S]*"route_hint"\] is None/,
  "Backend tests must prove members can read economic participation while outsiders are rejected and admin-only route hints are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_network_presence_payload[\s\S]*does not publish a public page[\s\S]*\/domains\/:name[\s\S]*\/community-domains\/:name[\s\S]*private[\s\S]*member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/network-presence"[\s\S]*def get_community_domain_network_presence[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain network presence without publishing, URL finalization, outward links, verification, marketplace exposure, Spotlight, vault links, social Community bridge, activation, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_network_presence_projects_public_readiness_without_publishing[\s\S]*\/network-presence[\s\S]*open_product_decision[\s\S]*\/domains\/:name[\s\S]*\/community-domains\/:name[\s\S]*db\.query\(Clan\)\.count\(\) == 0/,
  "Backend tests must prove network presence projects public readiness without publishing, finalizing URL format, verification, outward links, or social Community side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_network_presence_but_admin_routes_and_profile_are_hidden[\s\S]*\/network-presence[\s\S]*outsider_presence\.status_code == 403[\s\S]*"public_profile"\] is None/,
  "Backend tests must prove members can read network presence while admin route hints and profile details are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_role_projection_payload[\s\S]*does not create roles[\s\S]*grant permissions[\s\S]*@router\.get\("\/\{community_domain_id\}\/roles"[\s\S]*def list_community_domain_roles[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain roles without role creation, assignment, permission, membership, billing, verification, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_roles_projection_counts_domain_and_node_roles_without_granting_permissions[\s\S]*\/roles[\s\S]*domain_admin[\s\S]*trader[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove role projection counts domain and node roles without governance side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_roles_projection_but_outsider_is_rejected[\s\S]*\/roles[\s\S]*outsider_roles\.status_code == 403[\s\S]*admin_visible"\] is False/,
  "Backend tests must prove members can read role projection while outsiders are rejected and admin visibility is separated."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_governance_model_payload[\s\S]*does not create policy[\s\S]*private review details[\s\S]*@router\.get\("\/\{community_domain_id\}\/governance-model"[\s\S]*def get_community_domain_governance_model[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain governance model without policy, review, authority, verification, money, billing, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_governance_model_projects_policy_and_review_shape_without_deciding[\s\S]*\/governance-model[\s\S]*node_admin_review[\s\S]*multi_reviewer[\s\S]*CommunityDomainActionReviewDecision[\s\S]*count\(\) == 0/,
  "Backend tests must prove governance model projection summarizes policy and review shape without deciding or applying reviews."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_governance_model_but_outsider_is_rejected[\s\S]*\/governance-model[\s\S]*outsider_model\.status_code == 403[\s\S]*admin_visible"\] is False/,
  "Backend tests must prove members can read governance model while outsiders are rejected and admin visibility is separated."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /COMMUNITY_DOMAIN_ACTIVATION_REQUIREMENT_PRESETS[\s\S]*"authority_verification"[\s\S]*"route_suffix": "\/verification-requirements"[\s\S]*def _community_domain_readiness_payload[\s\S]*verify_authority[\s\S]*\/verification-requirements[\s\S]*create a payment instruction[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/readiness"[\s\S]*def get_community_domain_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain readiness without setup, payment, activation, verification, permission, or privacy side effects, and authority-verification guidance must point at the real verification-requirements route."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_readiness_projection_guides_package_setup_without_activation[\s\S]*\/readiness[\s\S]*blocked_lanes"\] == \["billing", "verification"\][\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove readiness guides package setup without activation, payment, verification, or review side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_readiness_but_admin_routes_are_hidden[\s\S]*\/readiness[\s\S]*outsider_readiness\.status_code == 403[\s\S]*"route_hint": None/,
  "Backend tests must prove members can read readiness while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_verification_requirements_payload[\s\S]*\/verification-requirements[\s\S]*does not upload evidence[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/verification-requirements"[\s\S]*def get_community_domain_verification_requirements[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain verification requirements without evidence, verification, activation, billing, or privacy side effects, and its next-action guidance must point at the real verification-requirements route."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_verification_requirements_project_type_specific_authority_without_verifying[\s\S]*\/verification-requirements[\s\S]*primary_next_action[\s\S]*\/verification-requirements[\s\S]*market_authority_letter[\s\S]*endswith\(\s*"\/verification-requirements"[\s\S]*verification_status == "unverified"[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove verification requirements are type-specific guidance without verification or review side effects, and route hints must stay on the real verification-requirements route."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_verification_requirements_but_admin_routes_are_hidden[\s\S]*\/verification-requirements[\s\S]*outsider_requirements\.status_code == 403[\s\S]*"route_hint": None/,
  "Backend tests must prove members can read verification requirements while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_activation_requirements_payload[\s\S]*create a payment instruction[\s\S]*activate the Community Domain[\s\S]*@router\.get\("\/\{community_domain_id\}\/activation-requirements"[\s\S]*def get_community_domain_activation_requirements[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain activation requirements without payment, billing, activation, verification, membership, policy, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_activation_requirements_project_setup_blockers_without_activation[\s\S]*\/activation-requirements[\s\S]*package_quote[\s\S]*billing_activation[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove activation requirements show launch blockers without activation, payment, verification, or review side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_activation_requirements_but_admin_routes_are_hidden[\s\S]*\/activation-requirements[\s\S]*outsider_requirements\.status_code == 403[\s\S]*"route_hint": None/,
  "Backend tests must prove members can read activation requirements while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /@router\.get\("\/\{community_domain_id\}\/nodes\/tree"[\s\S]*def list_community_domain_node_tree[\s\S]*_require_domain_member_scope[\s\S]*Read-only structure tree[\s\S]*grant roles[\s\S]*separate Community Domain/,
  "Backend route must expose scoped read-only Community Domain node tree without structure, role, activation, verification, or domain-creation side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_community_domain_node_tree_returns_nested_structure_without_writes[\s\S]*\/nodes\/tree[\s\S]*outsider_response\.status_code == 403[\s\S]*child_count[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove node tree nesting, outsider rejection, and no write side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_operating_summary_payload[\s\S]*private review details[\s\S]*@router\.get\("\/\{community_domain_id\}\/nodes\/\{community_node_id\}\/operating-summary"[\s\S]*def get_community_domain_node_operating_summary[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node operating summary without child-node, membership, role, policy, review, billing, branch-verification, domain-creation, or privacy side effects."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_node_operating_summary_payload[\s\S]*CommunityDomainActionReview\.status\.in_\(\s*\[\s*"pending",\s*"pending_review",\s*"approved"\s*\][\s\S]*Review local decisions or approved changes that still need apply[\s\S]*\/action-reviews\?community_node_id=\{int\(node\.id\)\}&include_descendants=true[\s\S]*review_local_action_reviews[\s\S]*def _community_domain_member_placement_summary_payload[\s\S]*CommunityDomainActionReview\.status\.in_\(\s*\[\s*"pending",\s*"pending_review",\s*"approved"\s*\][\s\S]*Review decisions or approved changes involving this member[\s\S]*\/action-reviews\?user_id=\{user_id\}[\s\S]*review_member_action_reviews[\s\S]*def _node_lifecycle_impact_summary[\s\S]*open_review_statuses = \{"pending", "pending_review", "approved"\}/,
  "Backend node operating, member placement, and node lifecycle impact summaries must not treat needs_changes requester follow-up as open reviewer-queue work, and approved-but-unapplied work must route to action-review list views instead of the pending-only reviewer queue."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _member_action_target_type_filter[\s\S]*func\.lower\(func\.trim\(CommunityDomainActionReview\.target_type\)\)[\s\S]*sorted\(MEMBER_ACTION_REVIEW_TARGET_TYPES\)[\s\S]*def _optional_payload_user_id[\s\S]*isinstance\(raw_value, bool\)[\s\S]*def _action_review_matches_user_filter[\s\S]*subject_matches[\s\S]*target_matches[\s\S]*MEMBER_ACTION_REVIEW_KEYS[\s\S]*payload_user_id[\s\S]*return payload_user_id == desired_user_id[\s\S]*def list_community_domain_action_reviews[\s\S]*user_id: Optional\[int\] = Query\(default=None, ge=1\)[\s\S]*if user_id is not None[\s\S]*_get_user_or_404\(db, int\(user_id\)\)[\s\S]*CommunityDomainActionReview\.subject_user_id == int\(user_id\)[\s\S]*_member_action_target_type_filter\(\)[\s\S]*CommunityDomainActionReview\.target_id == str\(int\(user_id\)\)[\s\S]*_action_review_matches_user_filter\(row, user_id=int\(user_id\)\)[\s\S]*"user_id": int\(user_id\) if user_id is not None else None[\s\S]*Optional[\s\S]*node and user filters narrow the admin-visible record list/,
  "Backend action-review list route must support an admin-only member/user filter, normalize member target types in the SQL prefilter, treat boolean payload user ids as unusable legacy data, and refine member-action rows against payload user identity so member placement summaries can link to records involving the member without falling back to the pending-only reviewer queue or leaking mismatched target rows."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _payload_int[\s\S]*raw_value = payload\.get\(key\)[\s\S]*isinstance\(raw_value, bool\)[\s\S]*isinstance\(raw_value, float\)[\s\S]*invalid_action_review_payload[\s\S]*value = int\(raw_value\)[\s\S]*def _reject_non_text_payload_fields[\s\S]*key not in payload[\s\S]*not isinstance\(payload\.get\(key\), str\)[\s\S]*invalid_action_review_payload[\s\S]*must be text[\s\S]*def _normalize_member_status_value[\s\S]*status = _clean_role\(value, default\)[\s\S]*status not in MEMBERSHIP_STATUS_VALUES[\s\S]*community_domain_member_status_invalid[\s\S]*def _ensure_member_action_review_target_matches[\s\S]*require_payload_user_id: bool = False[\s\S]*_reject_non_text_payload_fields[\s\S]*"role"[\s\S]*"status"[\s\S]*"previous_status"[\s\S]*"title"[\s\S]*"status" in payload[\s\S]*_normalize_member_status_value\(payload\.get\("status"\)\)[\s\S]*if payload\.get\("user_id"\) is None:[\s\S]*if require_payload_user_id:[\s\S]*_payload_int\(payload, "user_id"\)[\s\S]*return[\s\S]*payload_user_id = _payload_int[\s\S]*def decide_community_domain_action_review[\s\S]*decision == "approve"[\s\S]*require_payload_user_id=\(row_action_key == "domain_member\.upsert"\)/,
  "Backend action-review member payload validation must reject boolean and float user ids, require member text/snapshot payload fields to be text, reject invalid member lifecycle statuses before the missing-payload-user early return, and require a usable payload user_id before marking domain-member upsert reviews approved."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def list_community_domain_reviewer_queue[\s\S]*community_node_id: Optional\[int\] = Query\(default=None, ge=1\)[\s\S]*include_descendants: bool = Query\(default=False\)[\s\S]*_get_node_or_404[\s\S]*node_scope_ids = _descendant_node_ids[\s\S]*if node is not None[\s\S]*CommunityDomainActionReview\.community_node_id\.in_\(node_scope_ids\)[\s\S]*"community_node_id": int\(node\.id\) if node is not None else None[\s\S]*"community_node_ids": node_scope_ids[\s\S]*Optional node filters narrow the queue before[\s\S]*reviewer authorization is checked/,
  "Backend reviewer queue must honor community_node_id/include_descendants filters before reviewer authorization, so node-scoped queue route hints are not decorative."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_operating_summary_rolls_up_branch_without_writes[\s\S]*\/operating-summary[\s\S]*node_member\.role_change[\s\S]*private review details[\s\S]*CommunityDomainActionReviewDecision[\s\S]*count\(\) == 0/,
  "Backend tests must prove node operating summary rolls up branch members, policy, and reviews without deciding reviews or showing private records."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_and_member_summaries_exclude_needs_changes_from_review_queue_guidance[\s\S]*review_row\.status = "needs_changes"[\s\S]*\/operating-summary[\s\S]*\/status-impact[\s\S]*\/placement-summary[\s\S]*open_action_reviews"\] == 0[\s\S]*open_action_review_count"\] == 0[\s\S]*open_reviews"\] == 0[\s\S]*review_row\.status == "needs_changes"/,
  "Backend tests must prove node operating summaries, node status-impact snapshots, and member placement summaries keep needs_changes rows recorded without driving local reviewer-queue guidance."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /NODE_STATUS_VALUES = \{"active", "inactive", "archived"\}[\s\S]*def _normalize_node_status_value[\s\S]*status not in NODE_STATUS_VALUES[\s\S]*community_domain_node_status_invalid[\s\S]*def _ensure_node_accepts_action_review_request[\s\S]*requested_status = _normalize_node_status_value[\s\S]*def _normalize_node_status_review_payload[\s\S]*requested_status = _normalize_node_status_value[\s\S]*def create_community_domain_node[\s\S]*status=_normalize_node_status_value\(payload\.status\)[\s\S]*def update_community_domain_node_status[\s\S]*requested_status = _normalize_node_status_value\(payload\.status\)[\s\S]*def apply_community_domain_action_review[\s\S]*action_key == "node\.status\.update"[\s\S]*requested_status = _normalize_node_status_value/,
  "Backend node creation, direct node-status updates, node-status reviews, and approved-review apply must share the same active/inactive/archived node status contract instead of saving invented lifecycle states."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _reject_non_text_node_status_payload_fields[\s\S]*_reject_non_text_payload_fields[\s\S]*"new_status"[\s\S]*"status"[\s\S]*"previous_status"[\s\S]*"status_note"[\s\S]*"note"[\s\S]*def _ensure_node_accepts_action_review_request[\s\S]*_reject_non_text_node_status_payload_fields\(payload\)[\s\S]*def _ensure_node_status_review_target_matches[\s\S]*raw_payload_node_id = review_payload\.get\("community_node_id"\)[\s\S]*isinstance\(raw_payload_node_id, bool\)[\s\S]*isinstance\(\s*raw_payload_node_id, float[\s\S]*invalid_action_review_payload[\s\S]*payload_node_id = int\(raw_payload_node_id or 0\)[\s\S]*community_domain_node_status_target_mismatch[\s\S]*def _normalize_node_status_review_payload[\s\S]*_reject_non_text_node_status_payload_fields\(review_payload\)[\s\S]*def apply_community_domain_action_review[\s\S]*action_key == "node\.status\.update"[\s\S]*_reject_non_text_node_status_payload_fields\(payload\)[\s\S]*_ensure_node_status_review_target_matches/,
  "Backend node-status action-review validation and apply must reject boolean/float payload community_node_id, require previous-status snapshots and status/note fields to be text, and avoid Python's True/False coercion, float truncation, or stringification."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_status_review_request_rejects_root_invalid_status_and_target_mismatch[\s\S]*bool_scope_review[\s\S]*"community_node_id": True[\s\S]*bool_scope_review\.status_code == 422[\s\S]*bool_status_review[\s\S]*"status": True[\s\S]*bool_status_review\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*bool_status_note[\s\S]*"status_note": True[\s\S]*bool_status_note\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*float_status_note[\s\S]*"status_note": 1\.5[\s\S]*float_status_note\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*bool_payload_node[\s\S]*"community_node_id": True[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*float_payload_node[\s\S]*"community_node_id": branch_id \+ 0\.5[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*mismatched_review/,
  "Backend tests must prove boolean top-level and boolean/float payload node-status ids/status/note fields are rejected before Pydantic coercion, float truncation, stringification, or target-mismatch handling."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_admin_can_close_node_without_deleting_descendants[\s\S]*bool_status[\s\S]*"status": True[\s\S]*bool_status\.status_code == 422[\s\S]*bool_status_note[\s\S]*"status_note": True[\s\S]*bool_status_note\.status_code == 422[\s\S]*missing_note[\s\S]*community_domain_node_status_note_required[\s\S]*closed = client\.patch[\s\S]*"status_note": "Branch paused after the term ended\."[\s\S]*lifecycle_record\["payload"\]/,
  "Backend tests must prove the direct node-status endpoint rejects boolean status and status_note request fields before creating an applied lifecycle record."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_apply_rejects_legacy_node_status_review_target_mismatch[\s\S]*payload\["status_note"\] = True[\s\S]*bool_note_apply[\s\S]*bool_note_apply\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*payload\["status_note"\] = 1\.5[\s\S]*float_note_apply[\s\S]*float_note_apply\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*payload\["previous_status"\] = False[\s\S]*bool_previous_status_apply[\s\S]*bool_previous_status_apply\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*payload\["community_node_id"\] = node_id \+ 0\.5[\s\S]*float_payload_node_apply[\s\S]*float_payload_node_apply\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*payload\["previous_status"\] = "active"[\s\S]*mismatched_target_apply[\s\S]*community_domain_node_status_target_mismatch[\s\S]*mismatched_payload_apply[\s\S]*community_domain_node_status_target_mismatch[\s\S]*review_row\.status == "approved"[\s\S]*review_row\.applied_at is None/,
  "Backend tests must prove apply rejects legacy approved node-status review boolean/float notes, boolean previous-status snapshot, and float payload-node-id payloads before target matching or status application, while target-mismatch legacy rows remain approved and unapplied."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_and_member_summaries_route_approved_work_to_action_review_list[\s\S]*mismatched_review[\s\S]*mismatched_review_row\.target_id = str\(trader\.id\)[\s\S]*\/operating-summary[\s\S]*\/placement-summary[\s\S]*\/action-reviews\?user_id=\{trader\.id\}[\s\S]*\/action-reviews\/reviewer-queue[\s\S]*open_by_status"\] == \{"approved": 2\}[\s\S]*review_local_action_reviews[\s\S]*\/action-reviews\?community_node_id=\{line_id\}&include_descendants=true[\s\S]*review_member_action_reviews[\s\S]*\/action-reviews\?user_id=\{trader\.id\}[\s\S]*filtered_payload\["total"\] == 1[\s\S]*items"\]\[0\]\["id"\] == review_id[\s\S]*other_filtered_payload\["total"\] == 1[\s\S]*items"\]\[0\]\["id"\] == mismatched_review_id[\s\S]*scoped_queue\.json\(\)\["total"\] == 0/,
  "Backend tests must prove approved-but-unapplied node/member work remains visible through action-review list route hints, mismatched member-action target drift is excluded from the wrong member, and the pending-only reviewer queue stays empty."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_domain_member_review_rejects_numeric_target_mismatch[\s\S]*rejected_bool_action_key[\s\S]*"action_key": True[\s\S]*rejected_bool_action_key\.status_code == 422[\s\S]*rejected_bool_subject[\s\S]*"subject_user_id": True[\s\S]*rejected_bool_subject\.status_code == 422[\s\S]*rejected_bool_target_type[\s\S]*"target_type": True[\s\S]*rejected_bool_target_type\.status_code == 422[\s\S]*rejected_bool_target_id[\s\S]*"target_id": True[\s\S]*rejected_bool_target_id\.status_code == 422[\s\S]*rejected_bool_request_note[\s\S]*"request_note": False[\s\S]*rejected_bool_request_note\.status_code == 422[\s\S]*rejected_bool_payload[\s\S]*"user_id": True[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_float_payload[\s\S]*"user_id": 1\.5[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_bool_role[\s\S]*"role": True[\s\S]*status_code == 422[\s\S]*rejected_bool_status[\s\S]*"status": False[\s\S]*status_code == 422[\s\S]*rejected_invalid_status[\s\S]*"status": "pending"[\s\S]*community_domain_member_status_invalid[\s\S]*rejected_bool_title[\s\S]*"title": True[\s\S]*status_code == 422[\s\S]*rejected_float_title[\s\S]*"title": 1\.5[\s\S]*status_code == 422[\s\S]*rejected_bool_missing_user_role[\s\S]*"role": True[\s\S]*Missing user id should not bypass bool role[\s\S]*status_code == 422[\s\S]*missing_user_review_response[\s\S]*"Missing payload user id"[\s\S]*rejected_missing_user_decision[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_create[\s\S]*missing_user_row\.status == "pending"[\s\S]*missing_user_decision_count == 0/,
  "Backend tests must prove boolean top-level member-action keys, subject ids, target fields, request notes, boolean/float payload user ids, invalid member statuses, and payload member text fields are rejected instead of being coerced, truncated, stringified, or saved as invented lifecycle states, including when payload.user_id is missing, and domain-member approval cannot mark a payload without user_id as approved."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_member_upsert_review_rejects_member_target_mismatch[\s\S]*rejected_bool_payload_user[\s\S]*"user_id": True[\s\S]*rejected_bool_payload_user\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_float_payload_user[\s\S]*"user_id": 1\.5[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_invalid_payload_status[\s\S]*"status": "pending"[\s\S]*community_domain_member_status_invalid[\s\S]*rejected_bool_missing_user_role[\s\S]*"role": True[\s\S]*Missing user id should not bypass bool role[\s\S]*status_code == 422[\s\S]*for field_name, field_value in \([\s\S]*\("role", True\)[\s\S]*\("status", False\)[\s\S]*\("previous_status", False\)[\s\S]*\("title", True\)[\s\S]*rejected_bool_member_payload\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*test_node_member_upsert_revision_rejects_member_target_mismatch[\s\S]*rejected_bool_revision_payload_user[\s\S]*"user_id": True[\s\S]*rejected_bool_revision_payload_user\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_bool_revision_payload_field\.status_code == 422[\s\S]*invalid_action_review_payload/,
  "Backend tests must prove node-member upsert action-review create and revision paths reject boolean/float payload user ids, invalid member statuses, and member text/snapshot fields, including when payload.user_id is missing, before member placement can be approved or applied."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_member_review_rejects_subject_user_mismatch_with_label_target[\s\S]*node_member\.role_change[\s\S]*target_id": "maths-chair"[\s\S]*rejected_bool_payload_user[\s\S]*"user_id": True[\s\S]*rejected_bool_payload_user\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_bool_missing_user_role[\s\S]*"role": True[\s\S]*Missing user id should not bypass bool role[\s\S]*status_code == 422[\s\S]*for field_name, field_value in \([\s\S]*\("role", True\)[\s\S]*\("status", False\)[\s\S]*\("previous_status", False\)[\s\S]*\("title", True\)[\s\S]*rejected_bool_payload_field\.status_code == 422[\s\S]*invalid_action_review_payload/,
  "Backend tests must prove node-member role-change action-review creation rejects boolean payload user ids and member text/snapshot fields even when payload.user_id is missing and the target is a label-style local role slot."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_member_role_change_revision_rejects_bool_payload_fields[\s\S]*node_member\.role_change[\s\S]*target_id": "maths-chair"[\s\S]*needs_changes[\s\S]*rejected_bool_revision_payload_user[\s\S]*"user_id": True[\s\S]*rejected_bool_revision_payload_user\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*rejected_float_revision_payload_user[\s\S]*"user_id": 1\.5[\s\S]*status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*for field_name, field_value in \([\s\S]*\("role", True\)[\s\S]*\("status", False\)[\s\S]*\("previous_status", False\)[\s\S]*\("title", True\)[\s\S]*rejected_bool_revision_payload_field\.status_code == 422[\s\S]*invalid_action_review_payload[\s\S]*revision\["target_id"\] == "maths-chair"/,
  "Backend tests must prove node-member role-change action-review revisions reject boolean/float payload user ids and member text/snapshot fields while preserving label-style local role targets."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_action_user_filter_matches_legacy_normalized_target_type[\s\S]*review_row\.subject_user_id is None[\s\S]*review_row\.target_type = " Node_Member "[\s\S]*bool_payload_review_row\.payload_json = json\.dumps[\s\S]*"user_id": True[\s\S]*\/placement-summary[\s\S]*\/action-reviews\?user_id=\{trader\.id\}[\s\S]*open_by_status"\] == \{"approved": 2\}[\s\S]*filtered_payload\["total"\] == 2[\s\S]*items_by_id\[review_id\]\["target_type"\] == " Node_Member "[\s\S]*items_by_id\[bool_payload_review_id\]\["payload"\]\["user_id"\] is True/,
  "Backend tests must prove member action-review user filters normalize legacy target_type casing/spacing and treat boolean payload user ids as unusable legacy data before payload-user refinement."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_reviewer_queue_filters_by_community_node_id[\s\S]*North Line[\s\S]*South Line[\s\S]*\/action-reviews\/reviewer-queue[\s\S]*\?community_node_id=\{north_id\}[\s\S]*params=\{"community_node_id": south_id\}[\s\S]*\{item\["id"\] for item in full_items\} == \{north_review_id, south_review_id\}[\s\S]*north_payload\["community_node_id"\] == north_id[\s\S]*north_payload\["community_node_ids"\] == \[north_id\][\s\S]*south_payload\["community_node_id"\] == south_id[\s\S]*south_payload\["items"\]\[0\]\["id"\] == south_review_id/,
  "Backend tests must prove reviewer queue community_node_id filtering returns only the requested node's pending review while the unfiltered queue still shows all decidable reviews."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_operating_summary_but_admin_routes_are_hidden[\s\S]*\/operating-summary[\s\S]*outsider_summary\.status_code == 403[\s\S]*"route_hint"\] is None/,
  "Backend tests must prove members can read node operating summary while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_member_placement_summary_payload[\s\S]*show other domains[\s\S]*@router\.get\("\/\{community_domain_id\}\/members\/\{user_id\}\/placement-summary"[\s\S]*def get_community_domain_member_placement_summary[\s\S]*view another member placement summary/,
  "Backend route must expose scoped read-only member placement summary without membership, role, review, verification, billing, cross-domain, directory, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_placement_summary_projects_roles_without_writes[\s\S]*domain_member\.upsert[\s\S]*\/placement-summary[\s\S]*\/action-reviews\?user_id=\{teacher\.id\}[\s\S]*filtered_payload\["user_id"\] == teacher\.id[\s\S]*filtered_payload\["total"\] == 1[\s\S]*filtered_payload\["items"\]\[0\]\["id"\] == review_id[\s\S]*review_member_action_reviews[\s\S]*private review details[\s\S]*CommunityDomainActionReviewDecision[\s\S]*count\(\) == 0/,
  "Backend tests must prove member placement summary projects roles and reviews without deciding reviews or showing private records, and that its member-specific action-review route hint has a real filtered backend list."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_own_placement_summary_but_not_other_members[\s\S]*\/placement-summary[\s\S]*view another member placement summary[\s\S]*"route_hint"\] is None/,
  "Backend tests must prove members can read only their own placement summary while admin-only route hints stay hidden."
);

assertNotContains(
  "docs/SCREEN_SPECS.md",
  /## CommunityDomainPurchasePage[\s\S]*Verified Community Domain by default/,
  "Community Domain purchase screen must not imply verified status by default."
);

if (findings.length > 0) {
  console.error("Community Domain product contract audit failed:");
  for (const finding of findings) {
    const loc = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.error(`- ${loc} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Community Domain product contract audit passed.");
