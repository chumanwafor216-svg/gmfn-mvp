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
const companionSettings = readFrontend("src/components/CompanionSettingsPanel.tsx");

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

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /!isCompact \|\| !hasGsnId[\s\S]*?!isCompact[\s\S]*?Open your community list when you need it[\s\S]*?isCompact \? "Attention" : "What needs my attention"[\s\S]*?!isCompact[\s\S]*?Open Notifications to see and act on every item[\s\S]*?isCompact \? "Shop & trust" : "Shop \/ TrustSlip"[\s\S]*?isCompact \? "Account" : "Settings \/ Official GSN"/,
  "Phone My GSN must hide repeated helper explanations and use short section labels while preserving the desktop guidance."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /See your identity, communities, shop, trust, and account in one place[\s\S]*?Create or join a community to see it here[\s\S]*?Use Shop Control to change products[\s\S]*?Use Trust Passport for your private record[\s\S]*?Account settings and GSN links[\s\S]*?Open the related page if you need the full details/,
  "My GSN desktop guidance must use direct member language instead of internal ownership, handoff, footprint, or source-page wording."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /\{!isCompact \|\| showIdentityGuideSurface \? \([\s\S]*?data-my-gsn-route-heading="true"/,
  "Phone My GSN member-home must rely on the authenticated shell title while desktop and Identity Guide keep the route heading."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const flattenCompactMemberHomeFrame = isCompact && showMemberHomeSummary[\s\S]*?data-my-gsn-member-frame=\{flattenCompactMemberHomeFrame \? "flat-phone" : "full"\}[\s\S]*?padding: 0[\s\S]*?background: "transparent"[\s\S]*?data-my-gsn-navy-frame=\{flattenCompactMemberHomeFrame \? "compact" : "full"\}[\s\S]*?flattenCompactMemberHomeFrame \? \{ padding: 12 \}[\s\S]*?marginTop: isCompact \? 0 : 18/,
  "Default phone My GSN must flatten the redundant outer frame and orphaned heading gap while desktop and Identity Guide retain the full frame."
);


assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /debugId="my-gmfn\.selected-community\.open"[\s\S]*?Open community[\s\S]*?data-my-gsn-more="secondary"[\s\S]*?open=\{!isCompact \|\| memberHomeMoreOpen\}[\s\S]*?debugId="my-gmfn\.guide\.open"[\s\S]*?data-my-gsn-activity-note="quiet"/,
  "Phone My GSN must keep one selected-community continuation and collapse shop, trust, settings, help, links, and quiet activity behind More."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /\{activeTab === "guide" \? \([\s\S]*?\) : activeTab === "settings" \|\| !isCompact \? \([\s\S]*?data-my-gsn-settings-editor="true"[\s\S]*?<CompanionSettingsPanel compact=\{isCompact\} \/>[\s\S]*?\) : null\}/,
  "Default phone My GSN must omit the full settings editor while More > Settings, the explicit settings route, and desktop access remain intact."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /data-my-gsn-settings-editor="true"[\s\S]*?gridTemplateColumns: isCompact \? "1fr" : "minmax\(0, 1\.05fr\) 320px"[\s\S]*?\{!isCompact \? \([\s\S]*?data-my-gsn-current-reading="desktop-summary"[\s\S]*?Current reading[\s\S]*?\) : null\}/,
  "Phone Settings must omit the duplicate Current reading summary while desktop retains it and every editable control remains on the primary form."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /data-my-gsn-settings-editor="true"[\s\S]*?\{!isCompact \? \([\s\S]*?data-my-gsn-settings-intro="desktop-only"[\s\S]*?\) : null\}[\s\S]*?data-my-gsn-profile-name-help=\{isCompact \? "compact" : "full"\}[\s\S]*?"The name people see across GSN\."[\s\S]*?data-my-gsn-reading-mode-help="desktop-only"[\s\S]*?data-my-gsn-unread-label=\{isCompact \? "compact" : "full"\}[\s\S]*?"Show unread items first"[\s\S]*?data-my-gsn-direct-action-label=\{isCompact \? "compact" : "full"\}[\s\S]*?"Open the destination directly"[\s\S]*?data-my-gsn-tone-help="desktop-only"/,
  "Phone Settings must skip duplicate introductions, keep one short display-name explanation, and use concise checkbox labels while desktop keeps the fuller guidance."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /<CompanionSettingsPanel compact=\{isCompact\} \/>/,
  "My GSN Settings must pass the existing phone breakpoint into Companion Mode."
);
assertContains(
  "frontend/src/components/CompanionSettingsPanel.tsx",
  companionSettings,
  /type CompanionSettingsPanelProps = \{[\s\S]*?compact\?: boolean;[\s\S]*?data-companion-settings-panel=\{compact \? "compact" : "full"\}[\s\S]*?open=\{!compact \|\| controlsOpen\}[\s\S]*?debugId="companion-settings\.toggle"[\s\S]*?display: compact \? "flex" : "none"[\s\S]*?data-companion-settings-controls="true"/,
  "Phone Companion Mode must default to one compact disclosure while desktop remains expanded and the original controls stay mounted."
);

assertContains(
  "frontend/src/components/CompanionSettingsPanel.tsx",
  companionSettings,
  /data-companion-settings-controls="true"[\s\S]*?\{!compact \? \([\s\S]*?data-companion-expanded-intro="desktop-only"[\s\S]*?\) : null\}[\s\S]*?\{statusText \|\| !compact \? \([\s\S]*?data-companion-sound-permission="desktop-only"[\s\S]*?data-companion-control-label="reminder-level"[\s\S]*?"Reminder level"[\s\S]*?data-companion-control-label="sound"[\s\S]*?"Sound"[\s\S]*?"All reminders"[\s\S]*?data-companion-control-label="spoken-reminders"[\s\S]*?"Spoken reminders"[\s\S]*?data-companion-help="spoken-reminders"[\s\S]*?"Spoken reminders for important alerts\."[\s\S]*?data-companion-help="system-notifications"[\s\S]*?"Get reminders when GSN is not open\."[\s\S]*?data-companion-control-label="daily-limit"[\s\S]*?"Daily reminder limit"[\s\S]*?data-companion-control-label="repeat-after"[\s\S]*?"Repeat after \(minutes\)"/,
  "Expanded phone Companion Mode must skip the duplicate preamble and use plain-language labels while desktop retains its fuller guidance."
);
assertContains(
  "frontend/src/components/CompanionSettingsPanel.tsx",
  companionSettings,
  /activeCompactSection[\s\S]*?toggleCompactSection[\s\S]*?data-companion-compact-secondary-sections="true"[\s\S]*?Sound & notifications[\s\S]*?Timing & limits[\s\S]*?data-companion-compact-section-controls="alerts"[\s\S]*?activeCompactSection === "alerts"[\s\S]*?data-companion-compact-section-controls="timing"[\s\S]*?activeCompactSection === "timing"/,
  "Expanded phone Companion Mode must keep reminder level visible while sound/notification and timing/limit controls wait behind two mutually exclusive summary rows."
);





assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const memberHomeHasMultipleCommunities = Math\.max\(memberCommunityRows\.length, memberCommunityCount\) > 1[\s\S]*?\{!isCompact \|\| memberHomeHasMultipleCommunities \? \([\s\S]*?debugId="my-gmfn\.communities\.toggle"[\s\S]*?Switch community[\s\S]*?\{communitiesOpen && \(!isCompact \|\| memberHomeHasMultipleCommunities\) \? \(/,
  "Phone My GSN must omit the redundant portfolio control for one community while preserving multi-community switching and desktop access."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /\{!isCompact \|\| memberHomeHasMultipleCommunities \|\| !selectedCommunityForShop \? \([\s\S]*?data-my-gsn-community-count="true"[\s\S]*?data-my-gsn-selected-community-card="true"[\s\S]*?minHeight: isCompact \? 72 : 92[\s\S]*?\{!isCompact \? memberHomeIconBadge\("community", true, true\) : null\}/,
  "One-community phone My GSN must omit the repeated active count while multi-community phone and desktop keep the richer selected-community treatment."
);
assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const flattenCompactSingleCommunity =[\s\S]*?isCompact && Boolean\(selectedCommunityForShop\) && !memberHomeHasMultipleCommunities;[\s\S]*?data-my-gsn-selected-community-mode=\{[\s\S]*?flattenCompactSingleCommunity \? "flat-single" : "card"[\s\S]*?flattenCompactSingleCommunity[\s\S]*?\? \{ marginTop: 10, minWidth: 0 \}[\s\S]*?\.\.\.memberHomeCard\(true\)[\s\S]*?\{!flattenCompactSingleCommunity \? \([\s\S]*?Selected community/,
  "One-community phone My GSN must remove the nested selected-community card and duplicate label without changing multi-community or desktop presentation."
);


assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /const memberHomeIdentityFacts:[\s\S]*?isCompact\s*\?[\s\S]*?\["id", "GSN ID"[\s\S]*?\["phone", "Phone"[\s\S]*?:[\s\S]*?\["id", "GSN ID"[\s\S]*?\["copy", "Handle"[\s\S]*?\["phone", "Phone"/,
  "Phone My GSN identity must expose only GSN ID and Phone while desktop keeps Handle visible."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /data-my-gsn-identity-fact=\{label\}[\s\S]*?minHeight: isCompact \? 60 : 90[\s\S]*?\{!isCompact \? memberHomeIconBadge\(icon, true, label === "GSN ID"\) : null\}/,
  "Phone My GSN identity facts must use text-first compact cards while desktop retains the richer fact icons."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /\{isCompact \? \([\s\S]*?data-my-gsn-identity-heading="text-only"[\s\S]*?My identity[\s\S]*?: \([\s\S]*?data-my-gsn-identity-heading="full"[\s\S]*?memberHomeSectionKicker\("id", "My identity", false, true\)[\s\S]*?marginTop: isCompact \? 6 : 8/,
  "Default phone My GSN identity heading must be text-first while desktop retains the richer identity badge."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  memberHomeBranch,
  /gridTemplateColumns: "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?memberHomeIdentityFacts\.map[\s\S]*?!isCompact \? <div[\s\S]*?renderCopyHandleAction\(\)[\s\S]*?data-my-gsn-more="secondary"[\s\S]*?data-my-gsn-handle-utility="secondary"[\s\S]*?renderCopyHandleAction\(true\)/,
  "Phone My GSN must move the handle and its copy action into More > Account without removing the desktop utility."
);

assertContains(
  "frontend/src/pages/MyGMFNAndIPage.tsx",
  myGsn,
  /function memberHomePointerLink\(compact = false, primary = false\)[\s\S]*?minHeight: compact \? 52 : 98[\s\S]*?justifyContent: compact \? "center" : "flex-start"/,
  "Phone My GSN attention handoffs must stay compact instead of rendering as oversized secondary tiles."
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
