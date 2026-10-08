/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

function readRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function readFrontend(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function lineAt(text, index) {
  return text.slice(0, index).split(/\r?\n/).length;
}

function fail(file, text, index, message, detail = "Expected ownership guard was not found.") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(text, index) : 1,
    message,
    detail: String(detail).replace(/\s+/g, " ").slice(0, 280),
  });
}

function assertContains(file, text, pattern, message) {
  pattern.lastIndex = 0;
  if (pattern.test(text)) return;
  fail(file, text, -1, message, pattern.toString());
}

function assertNotContains(file, text, pattern, message) {
  pattern.lastIndex = 0;
  const match = pattern.exec(text);
  if (!match) return;
  fail(file, text, match.index, message, match[0]);
}

function assertScript(packageText, scriptName, toolName) {
  assertContains(
    "frontend/package.json",
    packageText,
    new RegExp(`"${scriptName}":\\s*"node tools/${toolName}"`),
    `${scriptName} must stay registered so this boundary remains discoverable.`
  );
}

const contract = readRepo("docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md");
const readme = readRepo("README.md");
const projectProtocol = readRepo("docs/PROJECT_PROTOCOL.md");
const skeleton = readRepo("docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md");
const packageText = readFrontend("package.json");
const appRoutes = readFrontend("src/lib/appRoutes.ts");
const app = readFrontend("src/App.tsx");
const appLayout = readFrontend("src/layout/AppLayout.tsx");
const myGsn = readFrontend("src/pages/MyGMFNAndIPage.tsx");

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /One surface -> one primary human job -> one primary action[\s\S]*?One capability -> one canonical home[\s\S]*?Simple surface\. Deep system[\s\S]*?Progressive disclosure before deletion[\s\S]*?Contextual before permanent[\s\S]*?Operator machinery stays with operators/,
  "Contract must preserve the accepted S0 doctrine."
);

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /Dashboard[\s\S]*?Compact orientation and the highest-priority pointer[\s\S]*?My GSN \/ Profile[\s\S]*?Durable identity orientation[\s\S]*?Marketplace[\s\S]*?One-community needs, Shops & Services discovery[\s\S]*?TrustSlip[\s\S]*?purpose-limited portable evidence[\s\S]*?Public Verify[\s\S]*?Recipient verification result/,
  "Contract must record the approved canonical ownership map."
);

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /Authenticated Shop navigation[\s\S]*?Shop Control \/ owner operations[\s\S]*?Public Shop[\s\S]*?Public supply\/offers/,
  "Contract must record the repository-qualified Shop split."
);

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /Attention[\s\S]*?Notifications \/ What Matters Now[\s\S]*?Demand[\s\S]*?DemandBox[\s\S]*?Spotlight[\s\S]*?Spotlight \/ Shop Control[\s\S]*?TrustSlip[\s\S]*?TrustSlip holder[\s\S]*?Communities[\s\S]*?Community Home[\s\S]*?Commerce Evidence[\s\S]*?ProtectedTrade/,
  "Contract must record canonical owners for high-risk duplicate clusters."
);

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /unique actions[\s\S]*?TrustEvents[\s\S]*?ProtectedTrade outcomes[\s\S]*?DemandBox lineage[\s\S]*?TrustSlip code\/link\/QR[\s\S]*?public verification[\s\S]*?community governance[\s\S]*?mobile and accessibility paths[\s\S]*?privacy explanations[\s\S]*?evidence-not-endorsement/,
  "Contract must preserve the accepted preservation checklist."
);

assertContains(
  "docs/GSN_SURFACE_OWNERSHIP_CONTRACT.md",
  contract,
  /recovered My GSN Identity\/Profile behaviour[\s\S]*?TrustSlip existing-code recovery[\s\S]*?Dashboard TrustSlip `Unavailable` truthfulness[\s\S]*?Dashboard Market Wisdom[\s\S]*?O1\/O2\/O3\/O4 backend boundaries[\s\S]*?Public Verify functionality[\s\S]*?ProtectedTrade derived outcome truth/,
  "Contract must record the temporary freeze list."
);

assertContains(
  "README.md",
  readme,
  /For surface simplification, route ownership, duplicate capability placement, or ordinary-member\/operator separation work, also read `docs\/GSN_SURFACE_OWNERSHIP_CONTRACT\.md`/,
  "README must make the surface ownership contract discoverable."
);

assertContains(
  "docs/PROJECT_PROTOCOL.md",
  projectProtocol,
  /docs\/GSN_SURFACE_OWNERSHIP_CONTRACT\.md[\s\S]*?one surface, one primary human job, one primary action/,
  "Project protocol must reference the surface ownership contract."
);

assertContains(
  "docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md",
  skeleton,
  /For simplification and duplicate-surface decisions, `docs\/GSN_SURFACE_OWNERSHIP_CONTRACT\.md` records the current ownership contract/,
  "Canonical skeleton must point simplification decisions to the ownership contract."
);

assertScript(packageText, "audit:surface-ownership", "audit-surface-ownership-contract.mjs");
assertScript(packageText, "audit:entry-auth", "audit-entry-auth-contracts.mjs");
assertScript(packageText, "audit:trust-passport-trustslip-boundary", "audit-trust-passport-trustslip-boundary.mjs");
assertScript(packageText, "audit:demand-box-front-package", "audit-demand-box-front-package.mjs");
assertScript(packageText, "audit:admin-route-guards", "audit-admin-route-guards.mjs");
assertScript(packageText, "audit:community-domain-product-contracts", "audit-community-domain-product-contracts.mjs");

assertContains(
  "frontend/src/lib/appRoutes.ts",
  appRoutes,
  /PROFILE:\s*"\/app\/my-gmfn-and-i"[\s\S]*?SETTINGS:\s*"\/app\/my-gmfn-and-i\?tab=settings"/,
  "Profile canonical destination must remain the My GSN member home."
);

assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="\/profile" element=\{<PreserveRedirect to=\{APP_ROUTES\.PROFILE\} \/>\} \/>[\s\S]*?<Route path="profile" element=\{<PreserveRedirect to=\{APP_ROUTES\.PROFILE\} \/>\} \/>/,
  "/profile and /app/profile compatibility routes must resolve to the canonical Profile destination."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const activeTab = requestedTab === "settings" \? "settings" : requestedTab === "guide" \? "guide" : "home";[\s\S]*?const showMemberHomeSummary =\s*isAppRoute && activeTab === "home";[\s\S]*?const showIdentityGuideSurface =\s*isAppRoute && activeTab === "guide";/,
  "My GSN must keep member-home and identity guide as explicit route-state branches."
);

const memberHomeStart = myGsn.indexOf('data-my-gsn-member-home="true"');
const identityGridStart = myGsn.indexOf('data-my-gsn-identity-status-grid="true"', memberHomeStart);
const memberHomeBranch =
  memberHomeStart >= 0 && identityGridStart > memberHomeStart
    ? myGsn.slice(memberHomeStart, identityGridStart)
    : "";
if (!memberHomeBranch) {
  fail(
    "frontend/src/pages/MyGMFNAndIPage.tsx",
    myGsn,
    memberHomeStart,
    "Default My GSN member-home contract must remain discoverable before the shared identity grid."
  );
}

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const shouldShowAttentionSummary =[\s\S]*?memberOpportunityStillLoading \|\| attentionSourceUnavailable \|\| attentionSignalCount > 0/,
  "My GSN attention summary must stay conditional on loading, source failure, or real attention signals."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /data-my-gsn-member-home-mode="personal-orientation"[\s\S]*?data-my-gsn-personal-orientation="true"[\s\S]*?data-my-gsn-community-portfolio="true"[\s\S]*?data-my-gsn-canonical-pointers="true"[\s\S]*?data-my-gsn-phase1-order="attention-shop-trust-settings"[\s\S]*?data-my-gsn-phase2-attention="conditional"/,
  "Default My GSN must be personal orientation plus Phase 2 compact sections with actionable-only attention, not a personal super-dashboard."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /(?=[\s\S]*APP_ROUTES\.NOTIFICATIONS)(?=[\s\S]*my-gmfn\.attention\.demand-box)(?=[\s\S]*data-my-gsn-community-row="true")(?=[\s\S]*my-gmfn\.shop\.manage)(?=[\s\S]*my-gmfn\.evidence\.trust-passport)(?=[\s\S]*APP_ROUTES\.TRUST_SLIP)(?=[\s\S]*my-gmfn\.settings\.open)/,
  "Default My GSN compact sections must keep Notifications, DemandBox, Community Home, Shop Control, Trust Passport, TrustSlip, and Settings reachable."
);

assertNotContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /data-my-gmfn\.member-home\.attention\.|<div style=\{sectionLabel\(\)\}>Discover<\/div>|Ask through DemandBox|<div style=\{sectionLabel\(\)\}>Offer<\/div>|<div style=\{sectionLabel\(\)\}>Act<\/div>/,
  "Default My GSN must not reintroduce detailed attention, Discover, Ask, Offer, or Act mini-engines."
);

assertContains(
  "frontend/src/layout/AppLayout.tsx",
  appLayout,
  /function makeGuideItem\(\)[\s\S]*?label: "Guide \/ Help"[\s\S]*?to: "\/app\/my-gmfn-and-i\?tab=guide"[\s\S]*?function makeProfileItem\(\)[\s\S]*?label: "Profile"[\s\S]*?to: APP_ROUTES\.PROFILE[\s\S]*?tab !== "guide" && tab !== "settings"/,
  "App layout Profile navigation must open My GSN member home while Guide / Help stays explicit."
);

assertContains(
  "frontend/src/layout/AppLayout.tsx",
  appLayout,
  /function makeShopGalleryItem[\s\S]*?label: "Public Shop"[\s\S]*?function makeShopControlItem\(\)[\s\S]*?label: "Shop Control"[\s\S]*?to: "\/app\/shop-control"/,
  "Public Shop and Shop Control must remain separate navigation concepts."
);

assertContains(
  "frontend/src/layout/AppLayout.tsx",
  appLayout,
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community Home"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?\.\.\.makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?label: "Shop"[\s\S]*?makeProfileItem\(\)/,
  "Ordinary mobile bottom navigation must remain focused on Dashboard, Community Home, Marketplace, Shop, and Profile."
);

const mobileBottomBlock =
  appLayout.match(/const mobileBottomItems[\s\S]*?\}, \[myShopGalleryDisabled, myShopGalleryTo\]\);/)?.[0] || "";
assertNotContains(
  "frontend/src/layout/AppLayout.tsx",
  mobileBottomBlock,
  /makeAdminItem|command-center|Command Center|Admin Tools|TRUST_ANALYTICS|SYSTEM_OPERATIONS/,
  "Command Center analytics must not enter ordinary mobile bottom navigation."
);

assertContains(
  "frontend/src/App.tsx",
  app,
  /path="community-domain"[\s\S]*?element=\{<CommunityDomainDashboardPage \/>/,
  "Community Domain must remain an explicit operator/admin route family."
);
assertContains(
  "frontend/src/App.tsx",
  app,
  /path="command-center"[\s\S]*?<RequireAuth requireRole="adminOrClanAdmin">/,
  "Command Center must remain behind the operator/admin route guard."
);

assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="demand-box" element=\{<DemandBoxPage \/>\} \/>/,
  "DemandBox must remain the canonical authenticated request/need surface."
);

assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-slip" element=\{<TrustSlipPage \/>\} \/>/,
  "Trust Passport and holder TrustSlip must remain separate authenticated surfaces."
);
assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="\/trust-slips\/verify\/:code" element=\{<TrustSlipVerifyPage \/>/,
  "Public TrustSlip Verify must remain a public recipient verification route."
);

assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="shop-control" element=\{<ShopControlPage \/>/,
  "Owner Shop Control must remain a separate owner operations surface."
);
assertContains(
  "frontend/src/App.tsx",
  app,
  /<Route path="\/shop\/:gmfnId" element=\{<ShopGalleryPage \/>/,
  "Public Shop Gallery must remain a separate public supply/offers surface."
);

if (findings.length > 0) {
  console.error("Surface ownership contract audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    console.error(`  ${finding.detail}`);
  }
  process.exit(1);
}

console.log(
  "Surface ownership contract audit passed: Profile/My GSN, member-home attention, Community Domain/Command Center, DemandBox, Shop, Trust Passport, TrustSlip, and Public Verify ownership boundaries remain caged."
);
