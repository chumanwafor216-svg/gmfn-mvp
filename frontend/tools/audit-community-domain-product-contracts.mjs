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
  /Community versus Community Domain[\s\S]*?\*\*Community\*\*[\s\S]*?\*\*Community Domain\*\*[\s\S]*?Purchase Community Domain[\s\S]*?Do not call the institutional object a `Community Package`/,
  "Project protocol must keep lightweight Community and institutional Community Domain separate."
);

assertContains(
  "docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md",
  /Create Community[\s\S]*?Purchase Community Domain[\s\S]*?free social entry path separate from the institutional SaaS\s+entry path/,
  "Canonical skeleton must keep the two entry paths separate."
);

assertContains(
  "docs/SCREEN_REGISTRY.md",
  /Pre-auth Screens[\s\S]*CommunityDomainPurchasePage[\s\S]*Authenticated Screens[\s\S]*CommunityDomainDashboardPage/,
  "Community Domain purchase and dashboard screens must remain registered before implementation."
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
  /checkCommunityDomainAvailability[\s\S]*listCommunityDomainTemplates[\s\S]*getCommunityDomainTemplateOperatingBlueprint[\s\S]*createCommunityDomainDraft[\s\S]*createCommunityDomainPackageQuote[\s\S]*getCommunityDomain[\s\S]*getCommunityDomainDashboard[\s\S]*getCommunityDomainOperatingMap[\s\S]*getCommunityDomainTemplateFit[\s\S]*getCommunityDomainSetupPlan[\s\S]*getCommunityDomainCapacityPlan[\s\S]*getCommunityDomainRolloutPlan[\s\S]*getCommunityDomainRolloutTree[\s\S]*getCommunityDomainNodeAutonomyMap[\s\S]*getCommunityDomainNodeEconomicMap[\s\S]*getCommunityDomainNodeActivityMap[\s\S]*getCommunityDomainNodeTrustMap[\s\S]*getCommunityDomainNodeParticipationMap[\s\S]*getCommunityDomainNodeServiceMap[\s\S]*getCommunityDomainNodePrivacyMap[\s\S]*getCommunityDomainNodeAnalyticsMap[\s\S]*getCommunityDomainNodeDomainBoundaryMap[\s\S]*getCommunityDomainNodeEvidenceAuthorityMap[\s\S]*getCommunityDomainNodeCommunicationMap[\s\S]*getCommunityDomainNodeVaultMap[\s\S]*getCommunityDomainNodeScheduledActivityMap[\s\S]*getCommunityDomainNodePaidActivityMap[\s\S]*getCommunityDomainGovernanceCoverage[\s\S]*getCommunityDomainAnalytics[\s\S]*getCommunityDomainEvidenceMap[\s\S]*getCommunityDomainEvidenceRecordReadiness[\s\S]*getCommunityDomainTrustMobility[\s\S]*getCommunityDomainSubscriptionLifecycle[\s\S]*getCommunityDomainSocialBridge[\s\S]*getCommunityDomainAffiliationReadiness[\s\S]*getCommunityDomainInstitutionalProfile[\s\S]*getCommunityDomainDelegationMap[\s\S]*getCommunityDomainIdentityContext[\s\S]*getCommunityDomainActivityMap[\s\S]*getCommunityDomainActivityGroupReadiness[\s\S]*getCommunityDomainMemberVerificationMap[\s\S]*getCommunityDomainNetworkExchangeMap[\s\S]*getCommunityDomainRecordPrivacyMap[\s\S]*getCommunityDomainConfigurationMap[\s\S]*getCommunityDomainComplianceMap[\s\S]*getCommunityDomainAppealReadiness[\s\S]*listCommunityDomainServiceSettings[\s\S]*getCommunityDomainModuleScopeReadiness[\s\S]*getCommunityDomainEconomicParticipation[\s\S]*getCommunityDomainNetworkPresence[\s\S]*listCommunityDomainRoles[\s\S]*getCommunityDomainGovernanceModel[\s\S]*getCommunityDomainReadiness[\s\S]*getCommunityDomainVerificationRequirements[\s\S]*getCommunityDomainActivationRequirements[\s\S]*listCommunityDomainNodes[\s\S]*listCommunityDomainNodeTree[\s\S]*getCommunityDomainNodeOperatingSummary[\s\S]*listCommunityDomainPolicies[\s\S]*community_node_id: params\.community_node_id/,
  "Frontend API layer must expose template, template operating blueprint, draft, quote, dashboard, operating map, template fit, setup plan, capacity plan, rollout plan, rollout tree, node autonomy map, node economic map, node activity map, node trust map, node participation map, node service map, node privacy map, node analytics map, node domain-boundary map, node evidence-authority map, node communication map, node vault map, node scheduled activity map, node paid activity map, governance coverage, analytics, evidence map, trust mobility, subscription lifecycle, social bridge, affiliation readiness, institutional profile, delegation map, identity context, activity map, activity group readiness, member verification map, network exchange map, record privacy map, configuration map, compliance map, appeal readiness, service settings, module scope readiness, economic participation, network presence, roles, governance model, readiness, verification requirements, activation requirements, hierarchy tree, node operating summary, and node-scoped policy helpers.",
  { frontend: true }
);

assertContains(
  "src/lib/api.ts",
  /getCommunityDomainReviewerQueue[\s\S]*getCommunityDomainActionReviewSummary[\s\S]*reviseCommunityDomainActionReview[\s\S]*applyCommunityDomainActionReview[\s\S]*addCommunityDomainActionReviewEvidence/,
  "Frontend API layer must expose action-review governance helpers.",
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
  /test_policy_listing_can_be_scoped_to_one_community_node[\s\S]*community_node_id[\s\S]*assert scoped_payload\["total"\] == 1[\s\S]*assert missing_node_policies\.status_code == 404/,
  "Backend tests must prove node-scoped policy filtering for institutional hierarchy."
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
  /test_template_operating_blueprint_distinguishes_school_and_rejects_unknown[\s\S]*school_multi_branch\/operating-blueprint[\s\S]*school\/operating-blueprint[\s\S]*does-not-exist\/operating-blueprint[\s\S]*school_association/,
  "Backend tests must prove template operating blueprints distinguish society types, support domain-type lookup, and reject unknown templates."
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
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_dashboard_hides_quote_and_outsider_is_rejected[\s\S]*\/dashboard[\s\S]*outsider_dashboard\.status_code == 403[\s\S]*"package_quote" not in dashboard/,
  "Backend tests must prove member dashboard hides quote details and rejects outsiders."
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
  /def _community_domain_node_trust_map_payload[\s\S]*read-only local trust[\s\S]*upload evidence[\s\S]*expose storage keys[\s\S]*issue TrustSlips[\s\S]*Trust Passport entries[\s\S]*private member activity[\s\S]*@router\.get\("\/\{community_domain_id\}\/node-trust-map"[\s\S]*def get_community_domain_node_trust_map[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_node_participation_map_payload[\s\S]*read-only member[\s\S]*placement planning[\s\S]*invite members[\s\S]*place[\s\S]*members[\s\S]*expose member lists[\s\S]*private member activity[\s\S]*issue TrustSlips[\s\S]*Trust Passport entries/,
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
  /def _community_domain_node_service_map_payload[\s\S]*Read-only local service readiness item[\s\S]*does not enable[\s\S]*modules[\s\S]*persist settings[\s\S]*activate billing[\s\S]*grant permissions[\s\S]*create events[\s\S]*create notifications[\s\S]*create shops[\s\S]*create vault[\s\S]*private[\s\S]*member activity[\s\S]*Community Domain node service map is read-only local service[\s\S]*TrustSlips[\s\S]*Trust Passport entries/,
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
  /def _community_domain_node_privacy_map_payload[\s\S]*read-only local privacy[\s\S]*does not change permissions[\s\S]*publish hierarchy[\s\S]*expose member lists[\s\S]*expose node rosters[\s\S]*expose storage[\s\S]*share records across institutions[\s\S]*Trust Passport entries/,
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
  /def _community_domain_node_evidence_authority_map_payload[\s\S]*read-only local evidence authority[\s\S]*upload evidence[\s\S]*verify evidence[\s\S]*publish public evidence[\s\S]*expose storage keys[\s\S]*issue credentials[\s\S]*Trust Passport entries[\s\S]*private member activity/,
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
  /def _community_domain_node_communication_map_payload[\s\S]*read-only local communication[\s\S]*create notices[\s\S]*send notifications[\s\S]*publish announcements[\s\S]*schedule meetings[\s\S]*emergency notices[\s\S]*expose member lists[\s\S]*private member activity/,
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
  /def _community_domain_node_vault_map_payload[\s\S]*read-only local vault[\s\S]*upload files[\s\S]*download files[\s\S]*create vault links[\s\S]*expose storage keys[\s\S]*expose member lists[\s\S]*Trust Passport entries[\s\S]*private member activity/,
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
  /def _community_domain_evidence_record_readiness_payload[\s\S]*read-only durable evidence[\s\S]*does not create CommunityDomainEvidenceRecord[\s\S]*upload files[\s\S]*expose storage keys[\s\S]*issue credentials[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/evidence-record-readiness"[\s\S]*def get_community_domain_evidence_record_readiness[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_trust_mobility_payload[\s\S]*read-only portability planning[\s\S]*does not create TrustSlips[\s\S]*write Trust Passport[\s\S]*expose storage keys[\s\S]*create a social Community[\s\S]*@router\.get\("\/\{community_domain_id\}\/trust-mobility"[\s\S]*def get_community_domain_trust_mobility[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_identity_context_payload[\s\S]*read-only current-member[\s\S]*does not issue a GSN\/GMFN ID[\s\S]*merge[\s\S]*identities[\s\S]*other domain names[\s\S]*@router\.get\("\/\{community_domain_id\}\/identity-context"[\s\S]*def get_community_domain_identity_context[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain current-member identity context without ID issuing, identity merging, user creation, membership writes, social-community joins, shop, money, Trust Passport, TrustSlip, marketplace, verification, billing, or cross-domain/private-record exposure."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_identity_context_projects_one_member_across_domain_and_social_contexts_without_writes[\s\S]*\/identity-context[\s\S]*single_identity_rule[\s\S]*after_counts == before_counts/,
  "Backend tests must prove identity context projects one member across domain, node, and linked social contexts without identity, membership, social-community, shop, trust, marketplace, or finance writes."
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
  /def _community_domain_member_verification_map_payload[\s\S]*read-only readiness[\s\S]*does not perform KYC[\s\S]*issue credentials[\s\S]*private member\/review\/evidence records[\s\S]*@router\.get\("\/\{community_domain_id\}\/member-verification-map"[\s\S]*def get_community_domain_member_verification_map[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain member verification map without KYC, credential, membership, role, policy, review, evidence, TrustSlip, Trust Passport, money, or private-record side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_verification_map_projects_institutional_readiness_without_credentials[\s\S]*\/member-verification-map[\s\S]*credential_issuance_status[\s\S]*not_connected_in_this_slice[\s\S]*after_counts == before_counts/,
  "Backend tests must prove member verification map projects institutional readiness without credentials, membership, role, review, evidence, trust, money, or private-record writes."
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
  /def _community_domain_record_privacy_map_payload[\s\S]*read-only privacy planning[\s\S]*does not change permissions[\s\S]*expose member lists[\s\S]*share records across institutions[\s\S]*@router\.get\("\/\{community_domain_id\}\/record-privacy-map"[\s\S]*def get_community_domain_record_privacy_map[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_service_settings_payload[\s\S]*does not persist settings[\s\S]*grant permissions[\s\S]*@router\.get\("\/\{community_domain_id\}\/service-settings"[\s\S]*def list_community_domain_service_settings[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain service settings without module, billing, activation, permission, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_service_settings_are_template_projection_without_activation[\s\S]*\/service-settings[\s\S]*enable or disable modules[\s\S]*domain\.status == "draft"/,
  "Backend tests must prove service settings are template projections without activation or persistence side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_service_settings_but_outsider_is_rejected[\s\S]*\/service-settings[\s\S]*outsider_settings\.status_code == 403[\s\S]*admin_visible"\] is False/,
  "Backend tests must prove members can read service settings while outsiders are rejected and admin visibility is separated."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_module_scope_readiness_payload[\s\S]*read-only module scope[\s\S]*does not create CommunityDomainModuleScope[\s\S]*persist settings[\s\S]*activate billing[\s\S]*grant permissions[\s\S]*Trust Passport entries[\s\S]*@router\.get\("\/\{community_domain_id\}\/module-scope-readiness"[\s\S]*def get_community_domain_module_scope_readiness[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_governance_model_payload[\s\S]*does not create policy[\s\S]*private review payloads[\s\S]*@router\.get\("\/\{community_domain_id\}\/governance-model"[\s\S]*def get_community_domain_governance_model[\s\S]*_require_domain_member_scope/,
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
  /def _community_domain_readiness_payload[\s\S]*create a payment instruction[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/readiness"[\s\S]*def get_community_domain_readiness[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain readiness without setup, payment, activation, verification, permission, or privacy side effects."
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
  /def _community_domain_verification_requirements_payload[\s\S]*does not upload evidence[\s\S]*private evidence[\s\S]*@router\.get\("\/\{community_domain_id\}\/verification-requirements"[\s\S]*def get_community_domain_verification_requirements[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain verification requirements without evidence, verification, activation, billing, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_verification_requirements_project_type_specific_authority_without_verifying[\s\S]*\/verification-requirements[\s\S]*market_authority_letter[\s\S]*verification_status == "unverified"[\s\S]*CommunityDomainActionReview[\s\S]*count\(\) == 0/,
  "Backend tests must prove verification requirements are type-specific guidance without verification or review side effects."
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
  /def _community_domain_node_operating_summary_payload[\s\S]*private review payloads[\s\S]*@router\.get\("\/\{community_domain_id\}\/nodes\/\{community_node_id\}\/operating-summary"[\s\S]*def get_community_domain_node_operating_summary[\s\S]*_require_domain_member_scope/,
  "Backend route must expose scoped read-only Community Domain node operating summary without child-node, membership, role, policy, review, billing, branch-verification, domain-creation, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_node_operating_summary_rolls_up_branch_without_writes[\s\S]*\/operating-summary[\s\S]*node_member\.role_change[\s\S]*private review payloads[\s\S]*CommunityDomainActionReviewDecision[\s\S]*count\(\) == 0/,
  "Backend tests must prove node operating summary rolls up branch members, policy, and reviews without deciding reviews or exposing private payloads."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_can_read_node_operating_summary_but_admin_routes_are_hidden[\s\S]*\/operating-summary[\s\S]*outsider_summary\.status_code == 403[\s\S]*"route_hint"\] is None/,
  "Backend tests must prove members can read node operating summary while outsiders are rejected and admin-only routes are hidden."
);

assertContains(
  "gmfn_backend/app/api/routes/community_domains.py",
  /def _community_domain_member_placement_summary_payload[\s\S]*expose other domains[\s\S]*@router\.get\("\/\{community_domain_id\}\/members\/\{user_id\}\/placement-summary"[\s\S]*def get_community_domain_member_placement_summary[\s\S]*view another member placement summary/,
  "Backend route must expose scoped read-only member placement summary without membership, role, review, verification, billing, cross-domain, directory, or privacy side effects."
);

assertContains(
  "gmfn_backend/tests/test_community_domains.py",
  /test_member_placement_summary_projects_roles_without_writes[\s\S]*\/placement-summary[\s\S]*domain_member\.upsert[\s\S]*private review payloads[\s\S]*CommunityDomainActionReviewDecision[\s\S]*count\(\) == 0/,
  "Backend tests must prove member placement summary projects roles and reviews without deciding reviews or exposing private payloads."
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
