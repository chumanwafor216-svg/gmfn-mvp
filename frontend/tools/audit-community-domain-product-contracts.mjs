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
  /checkCommunityDomainAvailability[\s\S]*listCommunityDomainTemplates[\s\S]*createCommunityDomainDraft[\s\S]*createCommunityDomainPackageQuote[\s\S]*getCommunityDomain[\s\S]*getCommunityDomainDashboard[\s\S]*listCommunityDomainServiceSettings[\s\S]*getCommunityDomainEconomicParticipation[\s\S]*getCommunityDomainNetworkPresence[\s\S]*listCommunityDomainRoles[\s\S]*getCommunityDomainGovernanceModel[\s\S]*getCommunityDomainReadiness[\s\S]*getCommunityDomainVerificationRequirements[\s\S]*getCommunityDomainActivationRequirements[\s\S]*listCommunityDomainNodes[\s\S]*listCommunityDomainNodeTree[\s\S]*getCommunityDomainNodeOperatingSummary[\s\S]*listCommunityDomainPolicies[\s\S]*community_node_id: params\.community_node_id/,
  "Frontend API layer must expose template, draft, quote, dashboard, service settings, economic participation, network presence, roles, governance model, readiness, verification requirements, activation requirements, hierarchy tree, node operating summary, and node-scoped policy helpers.",
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
