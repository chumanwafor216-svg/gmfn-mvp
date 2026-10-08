/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const communityFile = "src/pages/CommunityHomePage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const source = readFileSync(join(frontendRoot, communityFile), "utf8");
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const findings = [];
const expectedStableButtonTemplateCount = 33;
const expectedNativeFieldCount = 0;
const expectedNextActionGuideItemCount = 3;
const expectedMobileShellBreakdown = { top: 2, drawer: 25, pageTools: 8, bottom: 5 };
const expectedExpandedRouteLocalActionTemplates = 33;
const expectedMobileShellActionCount = Object.values(expectedMobileShellBreakdown).reduce((sum, count) => sum + count, 0);
const expectedWholeMobileRouteActionTemplates = expectedExpandedRouteLocalActionTemplates + expectedMobileShellActionCount;

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function debugIdFrom(block) {
  return (
    block.match(/debugId="([^"]+)"/)?.[1] ||
    block.match(/debugId=\{`([^`]+)`\}/)?.[1] ||
    block.match(/debugId=\{([^}]+)\}/)?.[1] ||
    ""
  ).replace(/\s+/g, " ");
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({ file: communityFile, line: 1, message, text });
}

function assertNotContains(pattern, message, text = "Forbidden pattern was found.") {
  if (!pattern.test(source)) return;
  findings.push({ file: communityFile, line: 1, message, text });
}

function assertLayoutContains(pattern, message, text = "Expected Community Home app-shell pattern was not found.") {
  if (pattern.test(appLayoutSource)) return;
  findings.push({ file: appLayoutFile, line: 1, message, text });
}

const actions = [];
let match;
const actionPattern = /<StableButton\b[\s\S]*?(?:\/>|<\/StableButton>)/g;
while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({ id: debugIdFrom(block), line: lineAt(match.index), block });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b[\s\S]*?(?:\/>|<\/(?:select|textarea)>)/g;
while ((match = nativeFieldPattern.exec(source))) {
  nativeFields.push({ line: lineAt(match.index), type: match[1], block: match[0] });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({ file: communityFile, line: 1, message: `Community Home native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}.`, text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", ") });
}
if (actions.length !== expectedStableButtonTemplateCount) {
  findings.push({ file: communityFile, line: 1, message: `Community Home StableButton template inventory changed from ${expectedStableButtonTemplateCount} to ${actions.length}.`, text: `StableButton count: ${actions.length}` });
}

for (const action of actions) {
  if (!action.id) findings.push({ file: communityFile, line: action.line, message: "Every Community Home stable action must carry a debugId.", text: action.block.replace(/\s+/g, " ").slice(0, 220) });
  if (!/^community-home\./.test(action.id)) findings.push({ file: communityFile, line: action.line, message: "Community Home stable actions must stay in the community-home debug namespace.", text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220) });
  if (!/style=/.test(action.block)) findings.push({ file: communityFile, line: action.line, message: "Community Home stable actions must declare route-local styling for phone geometry.", text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220) });
}

for (const section of [
  { label: "empty state", pattern: /^community-home\.empty\./ },
  { label: "route-param switch", pattern: /^community-home\.route-param\./ },
  { label: "bulletin", pattern: /^community-home\.bulletin\./ },
  { label: "attention", pattern: /^community-home\.attention\./ },
  { label: "go to", pattern: /^community-home\.goto\./ },
  { label: "switch", pattern: /^community-home\.switch\./ },
  { label: "admin", pattern: /^community-home\.admin\./ },
]) {
  if (actions.some((action) => section.pattern.test(action.id))) continue;
  findings.push({ file: communityFile, line: 1, message: "Community Home Phase 1 action inventory is missing an expected section.", text: section.label });
}

const nextActionGuideBlock = source.match(/const communityNextActionItems = useMemo<NextActionGuideItem\[\]>\([\s\S]*?\n {2}\);/)?.[0] || "";
const nextActionGuideItemCount = (nextActionGuideBlock.match(/\bid:\s*"/g) || []).length;
if (nextActionGuideItemCount !== expectedNextActionGuideItemCount) {
  findings.push({ file: communityFile, line: 1, message: `Community Home NextActionGuide item count changed from ${expectedNextActionGuideItemCount} to ${nextActionGuideItemCount}.`, text: `NextActionGuide items: ${nextActionGuideItemCount}` });
}

assertContains(/useParams<\{ clanId\?: string \}>\(\)[\s\S]*?routeClanIdFromParam\(routeParams\.clanId\)[\s\S]*?listMyClans\(\)[\s\S]*?requestedMatch[\s\S]*?This community is not available to your account/s, "Community Home route param must reconcile against listMyClans instead of silently rendering the stored selected community.");
assertContains(/getCommunityReference\(selectedClan\)[\s\S]*?getCommunityMemberCount\(selectedClan\)[\s\S]*?data-debug-id="community-home\.identity-card"[\s\S]*?selectedCommunityReference[\s\S]*?selectedCommunityRoleLabel[\s\S]*?selectedCommunityStatusLabel/s, "Community Home first screen must be selected-community identity with reference, role, and status.");
assertContains(/id="community-home-bulletin"[\s\S]*?renderCommunityBulletinPulse\(\)[\s\S]*?renderCommunityBulletinPrimaryNotice\(primaryCommunityNotice\)/s, "Community Home Bulletin must remain immediately available after identity.");
assertContains(/const communityAttentionItems = useMemo\([\s\S]*?noticeSupportsAvailability[\s\S]*?noticeOwnAcknowledged[\s\S]*?canManageCommunityNoticeSettings && pendingCommunityNoticeReviewCount > 0/s, "Community Home attention strip must be based on real selected-community notice actions only.");
assertContains(/debugId="community-home\.goto\.marketplace"[\s\S]*?debugId="community-home\.goto\.shop-control"[\s\S]*?debugId="community-home\.goto\.finance"[\s\S]*?debugId="community-home\.goto\.support"[\s\S]*?debugId="community-home\.goto\.trust"/s, "Community Home Go to group must stay compact and route to owning surfaces.");
assertContains(/debugId="community-home\.switch\.toggle"[\s\S]*?aria-controls="community-home-communities-panel"[\s\S]*?sortedClans\.map/s, "Community Home switching must be a compact disclosure over selectable user communities.");
assertContains(/canAdmin: Boolean\(item\?\.viewer\?\.can_admin[\s\S]*?const canManageCommunityDomain = Boolean\(selectedCommunityDomainRow\?\.canAdmin\)[\s\S]*?debugId="community-home\.admin\.toggle"/s, "Community Home admin area must use selected-domain can_admin before exposing Community Domain controls.");
assertContains(/profileSettings: APP_ROUTES\.SETTINGS[\s\S]*?communityHomeNeedsDisplayName[\s\S]*?openCommunityRoute\(event, routes\.profileSettings\)[\s\S]*?Add display name/s, "Community Home missing-display-name handoff must route to Settings/My GSN identity setup.");
assertContains(/showNotice\("success", "Spotlight now lives in Shop Control\."\)[\s\S]*?params\.delete\("guide"\)/s, "Community Home stale Spotlight guide query must be stripped and redirected conceptually to Shop Control.");

assertNotContains(/getPoolMeSummary|poolSummary|netMoneyPosition|financeNeedsReview|moneyPositionLabel|moneyPositionDetail/, "Community Home must not fetch or synthesize cumulative finance status in Phase 1.");
assertNotContains(/Payments (?:Â|Ã|·) No action shown/, "Community Home must not show the stale Payments mojibake/passive finance copy.");
assertNotContains(/debugId="community-home\.(?:lane|spotlight-guided|spotlight-status|summary\.visible|selected\.open-marketplace)/, "Community Home must not render the old grouped lane or Spotlight launcher debug surfaces.");
assertNotContains(/communitySpotlightFetch|listMarketplaceBroadcasts|getMarketplaceBroadcasts/, "Community Home must not fetch live Spotlight media or feed data.");
assertNotContains(/CommunityMarketplaceSpotlight|CommunityShopControlPanel/, "Community Home must not revive stale embedded Spotlight/Shop Control components.");
assertNotContains(/OWNER_SHOP_HANDLES|OWNER_SHOP_HASHES|PAID_REPOST_HASH|resolveCurrentOwnerShop|openGuidedSpotlightFamily|handleSpotlightHandle|openCommunityNextAction/, "Community Home must not keep dead owner-shop/Spotlight helper source after Phase 2 cleanup.");
assertNotContains(/case "(?:spotlight|spotlight-free|spotlight-paid|spotlight-repost|spotlight-vault|spotlight-shop-setup|community-packages)"/, "Community Home next-action resolver must not keep old specialist Spotlight/Vault/Package cases.");

assertLayoutContains(/debugId=\{`app-layout\.drawer\.\$\{group\.debugKey\}\.\$\{item\.label\.toLowerCase\(\)\.replace[\s\S]*?debugId="app-layout\.drawer\.logout"[\s\S]*?debugId=\{`app-layout\.bottom-nav\./, "App shell mobile drawer/bottom navigation model changed; re-audit route-local button counts.");

const routeLocalExpandedActionCount = actions.length;
if (routeLocalExpandedActionCount !== expectedExpandedRouteLocalActionTemplates) {
  findings.push({ file: communityFile, line: 1, message: `Community Home expanded route-local action count changed from ${expectedExpandedRouteLocalActionTemplates} to ${routeLocalExpandedActionCount}.`, text: `Route-local expanded actions: ${routeLocalExpandedActionCount}` });
}
const wholeRouteActionCount = routeLocalExpandedActionCount + expectedMobileShellActionCount;
if (wholeRouteActionCount !== expectedWholeMobileRouteActionTemplates) {
  findings.push({ file: communityFile, line: 1, message: `Community Home whole mobile route action count changed from ${expectedWholeMobileRouteActionTemplates} to ${wholeRouteActionCount}.`, text: `Route-local ${routeLocalExpandedActionCount}; shell ${expectedMobileShellActionCount}; breakdown ${JSON.stringify(expectedMobileShellBreakdown)}` });
}

if (findings.length > 0) {
  console.error("Community Home button inventory audit failed:");
  for (const finding of findings) console.error(`- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`);
  process.exit(1);
}
console.log("Community Home button inventory audit passed.");
