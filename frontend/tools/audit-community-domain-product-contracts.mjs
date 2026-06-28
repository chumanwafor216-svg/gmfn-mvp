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
  /checkCommunityDomainAvailability[\s\S]*listCommunityDomainTemplates[\s\S]*createCommunityDomainDraft[\s\S]*createCommunityDomainPackageQuote[\s\S]*listCommunityDomainNodes[\s\S]*listCommunityDomainPolicies[\s\S]*community_node_id: params\.community_node_id/,
  "Frontend API layer must expose template, draft, quote, hierarchy, and node-scoped policy helpers.",
  { frontend: true }
);

assertContains(
  "src/lib/api.ts",
  /getCommunityDomainReviewerQueue[\s\S]*getCommunityDomainActionReviewSummary[\s\S]*reviseCommunityDomainActionReview[\s\S]*applyCommunityDomainActionReview[\s\S]*addCommunityDomainActionReviewEvidence/,
  "Frontend API layer must expose action-review governance helpers.",
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
