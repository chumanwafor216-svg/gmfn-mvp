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
const expectedStableButtonTemplateCount = 26;
const expectedNativeFieldCount = 0;
const expectedNextActionGuideItemCount = 12;
const expectedFrontQuickActionCount = 4;
const expectedSpotlightGuidedActionCount = 5;
const expectedGroupedLaneRowCount = 22;
const expectedExpandedRouteLocalActionTemplates = 40;
const expectedMobileShellBreakdown = {
  top: 2,
  drawer: 25,
  pageTools: 7,
  bottom: 5,
};
const expectedMobileShellActionCount = Object.values(
  expectedMobileShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeMobileRouteActionTemplates =
  expectedExpandedRouteLocalActionTemplates + expectedMobileShellActionCount;

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
  findings.push({
    file: communityFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Community Home app-shell pattern was not found."
) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text,
  });
}

function countIdsInBlock(pattern, label) {
  const block = source.match(pattern)?.[0] || "";
  if (!block) {
    findings.push({
      file: communityFile,
      line: 1,
      message: `Community Home ${label} block was not found for button counting.`,
      text: pattern.toString(),
    });
    return 0;
  }

  return (block.match(/\bid:\s*(?:"|ownerShopHandle\()/g) || []).length;
}

const actionPattern = /<StableButton\b[\s\S]*?(?:\/>|<\/StableButton>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(source))) {
  const block = match[0];
  actions.push({
    id: debugIdFrom(block),
    line: lineAt(match.index),
    block,
  });
}

const nativeFieldPattern = /<(input|select|textarea)\b[\s\S]*?(?:\/>|<\/(?:select|textarea)>)/g;
const nativeFields = [];
while ((match = nativeFieldPattern.exec(source))) {
  nativeFields.push({
    line: lineAt(match.index),
    type: match[1],
    block: match[0],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

if (actions.length !== expectedStableButtonTemplateCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home StableButton template inventory changed from ${expectedStableButtonTemplateCount} to ${actions.length}. Re-audit the new/removed button on phone before accepting this baseline.`,
    text: `StableButton count: ${actions.length}`,
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Every Community Home stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^community-home\./.test(action.id)) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Community Home stable actions must stay in the community-home debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: communityFile,
      line: action.line,
      message: "Community Home stable actions must declare route-local styling for phone geometry.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const frontToInnerOrder = [
  { label: "empty state", pattern: /^community-home\.empty\./ },
  { label: "visible marketplace summary", pattern: /^community-home\.summary\.visible-communities/ },
  { label: "community domain summary", pattern: /^community-home\.summary\.community-domain/ },
  { label: "finance summary", pattern: /^community-home\.finance-summary\./ },
  { label: "trust summary", pattern: /^community-home\.trust-summary\./ },
  { label: "notice board", pattern: /^community-home\.notice\./ },
  { label: "contact community", pattern: /^community-home\.contact\./ },
  { label: "front next actions", pattern: /^community-home\.next-action\./ },
  { label: "spotlight guided lane", pattern: /^community-home\.spotlight-guided\./ },
  { label: "grouped command lanes", pattern: /^community-home\.lane\./ },
  { label: "spotlight status", pattern: /^community-home\.spotlight-status\./ },
  { label: "community rows", pattern: /^community-home\.communities\./ },
];
let previousSection = null;

for (const section of frontToInnerOrder) {
  const firstAction = actions.find((action) => section.pattern.test(action.id));
  if (!firstAction) {
    findings.push({
      file: communityFile,
      line: 1,
      message: "Community Home front-to-inner action inventory is missing an expected section.",
      text: section.label,
    });
    continue;
  }

  if (previousSection && firstAction.line <= previousSection.line) {
    findings.push({
      file: communityFile,
      line: firstAction.line,
      message:
        "Community Home front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: `${previousSection.label} at line ${previousSection.line}; ${section.label} at line ${firstAction.line}`,
    });
  }

  previousSection = { label: section.label, line: firstAction.line };
}

const nextActionGuideItemCount = countIdsInBlock(
  /const communityNextActionItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?\n {2}\);/,
  "NextActionGuide item manifest"
);
const frontQuickActionCount = countIdsInBlock(
  /\{\[\s*\{[\s\S]*?id: "communities"[\s\S]*?id: "marketplace-tools"[\s\S]*?id: "subscriptions"[\s\S]*?id: "trust-finance"[\s\S]*?\]\.map\(\(item\) => \(/,
  "front command-lane grid"
);
const spotlightGuidedActionCount = countIdsInBlock(
  /const spotlightHandleItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?\n {2}\);/,
  "spotlight guided action manifest"
);
const groupedLaneRowCount =
  countIdsInBlock(
    /\{!collapsed\.communities \? \([\s\S]*?\]\.map\(\(item, index\) =>/,
    "communities grouped lane"
  ) +
  countIdsInBlock(
    /\{!collapsed\.marketplaceTools \? \([\s\S]*?\]\.map\(\(item, index\) =>/,
    "marketplace grouped lane"
  ) +
  countIdsInBlock(
    /\{!collapsed\.subscriptions \? \([\s\S]*?\]\.map\(\(item, index\) =>/,
    "subscriptions grouped lane"
  ) +
  countIdsInBlock(
    /\{!collapsed\.trustFinance \? \([\s\S]*?\]\.map\(\(item, index\) =>/,
    "trust and finance grouped lane"
  );

if (nextActionGuideItemCount !== expectedNextActionGuideItemCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home NextActionGuide item count changed from ${expectedNextActionGuideItemCount} to ${nextActionGuideItemCount}. Re-audit the inner guide buttons before accepting this baseline.`,
    text: `NextActionGuide items: ${nextActionGuideItemCount}`,
  });
}

if (frontQuickActionCount !== expectedFrontQuickActionCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home front quick-action button count changed from ${expectedFrontQuickActionCount} to ${frontQuickActionCount}.`,
    text: `Front quick actions: ${frontQuickActionCount}`,
  });
}

if (spotlightGuidedActionCount !== expectedSpotlightGuidedActionCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home spotlight guided action count changed from ${expectedSpotlightGuidedActionCount} to ${spotlightGuidedActionCount}.`,
    text: `Spotlight guided actions: ${spotlightGuidedActionCount}`,
  });
}

if (groupedLaneRowCount !== expectedGroupedLaneRowCount) {
  findings.push({
    file: communityFile,
    line: 1,
    message: `Community Home grouped lane row count changed from ${expectedGroupedLaneRowCount} to ${groupedLaneRowCount}.`,
    text: `Grouped lane rows: ${groupedLaneRowCount}`,
  });
}

assertContains(
  /const communityNextActionItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?id: "choose-community"[\s\S]*?id: "marketplace"[\s\S]*?id: "create-community"[\s\S]*?id: "join-community"[\s\S]*?id: "circle"[\s\S]*?id: "shop-control"[\s\S]*?id: "community-packages"[\s\S]*?id: "spotlight"[\s\S]*?id: "finance"[\s\S]*?id: "support"[\s\S]*?id: "trust"[\s\S]*?id: "notifications"/,
  "Community Home next-action guide must keep the full inner action manifest."
);

assertContains(
  /Community announcements[\s\S]*?debugId="community-home\.notice\.post"[\s\S]*?debugId="community-home\.notice\.policy\.members"[\s\S]*?debugId="community-home\.notice\.policy\.admins"[\s\S]*?CONTACT COMMUNITY[\s\S]*?debugId="community-home\.contact\.whatsapp-chat"[\s\S]*?debugId="community-home\.contact\.whatsapp-call"/,
  "Community Home communication protocol block must keep the Notice Board policy controls and Contact Community actions."
);

assertContains(
  /communityPackages: routeTarget\([\s\S]*?"shop"[\s\S]*?hash: OWNER_SHOP_HASHES\.communityPackage[\s\S]*?case "community-packages"[\s\S]*?routes\.communityPackages/,
  "Community Home marketplace-capacity guide item must open the Shop Control capacity lane."
);

assertContains(
  /\{\[\s*\{[\s\S]*?id: "communities"[\s\S]*?lane: "communities"[\s\S]*?id: "marketplace-tools"[\s\S]*?lane: "marketplaceTools"[\s\S]*?id: "subscriptions"[\s\S]*?lane: "subscriptions"[\s\S]*?id: "trust-finance"[\s\S]*?lane: "trustFinance"[\s\S]*?\]\.map\(\(item\) => \([\s\S]*?debugId=\{`community-home\.next-action\.\$\{item\.id\}`\}[\s\S]*?openActionLaneFromButton\(event, item\.lane as CollapseKey\)/,
  "Community Home front quick-action grid must keep exactly the four grouped command lanes before deeper tools."
);

assertContains(
  /createCommunity:\s*routeTarget\(\s*"clans"[\s\S]*?debugId="community-home\.empty\.create-community"[\s\S]*?openCommunityRoute\(event, routes\.createCommunity\)/,
  "Community Home empty-state Create New Community must open the authenticated existing-member create lane."
);

assertContains(
  /communityDomainPurchase:\s*"\/community-domain\/purchase"[\s\S]*?debugId="community-home\.empty\.purchase-community-domain"[\s\S]*?openCommunityRoute\(event, routes\.communityDomainPurchase\)/,
  "Community Home empty-state must expose the institutional Community Domain purchase path even when no marketplace community exists."
);

assertContains(
  /params\.delete\("guide"\);[\s\S]*?const remainingSearch = params\.toString\(\);[\s\S]*?search: remainingSearch \? `\?\$\{remainingSearch\}` : ""/,
  "Community Home guide cleanup must remove only the guide query param and preserve selected community context."
);

assertContains(
  /function openSelectedCommunityRoute\([\s\S]*?fallbackMessage = "Choose a community first[\s\S]*?if \(!selectedClanId\)[\s\S]*?showNotice\("error", fallbackMessage\)[\s\S]*?community-home-community-list[\s\S]*?navigateWithOrigin\(navigate, to, location\)/,
  "Community Home community-sensitive rows must refuse to navigate without selected community context."
);

assertContains(
  /debugId="community-home\.summary\.visible-communities"[\s\S]*?aria-expanded=\{!collapsed\.communities\}[\s\S]*?aria-controls="community-home-communities-panel"[\s\S]*?openCommunityHomeSection\([\s\S]*?"community-home-community-list"[\s\S]*?"communities"/,
  "Community Home visible-communities summary must be a real stable action that opens the community list, not a button-looking inert row."
);

assertContains(
  /listMyCommunityDomains[\s\S]*?const \[communityDomainCount, setCommunityDomainCount\] = useState<number \| null>\(null\)[\s\S]*?listMyCommunityDomains\(\)\.catch\(\(\) => \(\{ items: null \}\)\)[\s\S]*?setCommunityDomainCount\(Array\.isArray\(domainRows\) \? domainRows\.length : null\)[\s\S]*?Marketplaces and Community Domains[\s\S]*?debugId="community-home\.summary\.visible-communities"[\s\S]*?\{communityCountFromSummary\} community \{communityCountFromSummary === 1 \? "marketplace" : "marketplaces"\}[\s\S]*?Self-created or joined marketplace communities for local work\.[\s\S]*?debugId="community-home\.summary\.community-domain"[\s\S]*?communityDomainCount === null[\s\S]*?"Community Domains"[\s\S]*?`\$\{communityDomainCount\} community \$\{[\s\S]*?communityDomainCount === 1 \? "domain" : "domains"[\s\S]*?Institutional domains for schools, unions, churches, and markets\.[\s\S]*?openCommunityRoute\(event, routes\.communityDomain\)/,
  "Community Home summary must distinguish community marketplaces from institutional Community Domains and show the signed-in domain count when available."
);

assertContains(
  /debugId="community-home\.communities\.header-toggle"[\s\S]*?Your Community Marketplaces[\s\S]*?\{sortedClans\.length\} \{sortedClans\.length === 1 \? "marketplace" : "marketplaces"\}[\s\S]*?Marketplace workspace for this community[\s\S]*?Open Marketplace/,
  "Community Home opened list must label ordinary clan workspaces as Community Marketplaces, not generic Communities."
);

assertContains(
  /Loading your marketplace communities[\s\S]*?No marketplace communities yet[\s\S]*?visible marketplace communities[\s\S]*?marketplace communities will appear here[\s\S]*?Create marketplace community/,
  "Community Home empty and loading states must describe ordinary communities as marketplace communities."
);

assertContains(
  /id: "communities"[\s\S]*?lane: "communities"[\s\S]*?title: "Marketplaces"[\s\S]*?Marketplace communities[\s\S]*?title: "Choose marketplace"[\s\S]*?title: "Create marketplace"[\s\S]*?title: "Join marketplace"/,
  "Community Home grouped lane must show marketplace-community wording instead of generic Communities copy."
);

assertContains(
  /id: "choose-community"[\s\S]*?label: "Choose marketplace"[\s\S]*?Marketplace community list[\s\S]*?id: "marketplace"[\s\S]*?Select a marketplace community first[\s\S]*?id: "create-community"[\s\S]*?label: "Create marketplace"[\s\S]*?Create marketplace community[\s\S]*?id: "join-community"[\s\S]*?label: "Join marketplace"[\s\S]*?Join marketplace community[\s\S]*?continueLabel: "Choose marketplace"/,
  "Community Home next-action guide must use marketplace-community wording for ordinary community selection."
);

assertContains(
  /id: "community-packages"[\s\S]*?label: "Marketplace capacity"[\s\S]*?Choose one marketplace first, then open its capacity tools\.[\s\S]*?technical: "Marketplace capacity"[\s\S]*?routes\.communityPackages[\s\S]*?Choose a marketplace first, then open marketplace capacity\.[\s\S]*?title: "Marketplace capacity"[\s\S]*?Member places, shop blocks, ROSCA, meeting packs, and capacity upgrades\.[\s\S]*?capacity payments, and renewal checks/,
  "Community Home capacity lane must not expose ordinary marketplace capacity with old package wording."
);

if (/<div\s+style=\{communityToolRowStyle\(\)\}/.test(source)) {
  const index = source.search(/<div\s+style=\{communityToolRowStyle\(\)\}/);
  findings.push({
    file: communityFile,
    line: lineAt(index),
    message:
      "Community Home must not use plain divs with compact button geometry; convert them to StableButton or make them visibly inert.",
    text: source.slice(index, index + 180).replace(/\s+/g, " "),
  });
}

assertContains(
  /const spotlightHandleItems = useMemo<NextActionGuideItem\[]>\([\s\S]*?id: "spotlight-free"[\s\S]*?id: "spotlight-paid"[\s\S]*?id: "spotlight-repost"[\s\S]*?id: "spotlight-vault"[\s\S]*?id: "spotlight-shop-setup"/,
  "Community Home spotlight guided lane must keep the five spotlight-family inner choices."
);

assertContains(
  /debugId=\{`community-home\.lane\.communities\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`community-home\.lane\.marketplace-tools\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`community-home\.lane\.subscriptions\.\$\{item\.id\}`\}[\s\S]*?debugId=\{`community-home\.lane\.trust-finance\.\$\{item\.id\}`\}/,
  "Community Home grouped command lanes must stay traceable and ordered."
);

[
  ["owner-actions", "joinRequests", false],
  ["merchant-release", "merchantRelease", true],
  ["shop-gallery-tools", "shopGalleryTools", true],
  ["rosca", "rosca", false],
].forEach(([id, route, isOwnerHandle]) => {
  const idPattern = isOwnerHandle
    ? `id: ownerShopHandle\\("${id}"\\)\\.id`
    : `id: "${id}"`;
  assertContains(
    new RegExp(
      `${idPattern}[\\s\\S]*?openSelectedCommunityRoute\\([\\s\\S]*?routes\\.${route}`
    ),
    `Community Home compact tool row ${id} must use the selected-community route guard.`
  );
});

assertContains(
  /id: "trusted-circle"[\s\S]*?title: "Grow trusted circle"[\s\S]*?openCommunityNextAction\(event, "circle"\)/,
  "Community Home trusted-circle row must stay under Communities and use the guided First Circle route."
);

assertContains(
  /communityDomain:\s*"\/app\/community-domain"[\s\S]*?!collapsed\.subscriptions[\s\S]*?id: "community-domain"[\s\S]*?title: "Community Domain"[\s\S]*?detail: "Open institutional dashboard and access requests\."[\s\S]*?openCommunityRoute\(event, routes\.communityDomain\)[\s\S]*?debugId=\{`community-home\.lane\.subscriptions\.\$\{item\.id\}`\}/,
  "Community Home Community Domain row must live under Subscriptions and open the authenticated institutional dashboard."
);

[
  ["vault-control", "vaultControl"],
  ["spotlight-subscription", "subscriptionSpotlight"],
  ["paid-repost", "paidRepost"],
].forEach(([id, route]) => {
  assertContains(
    new RegExp(
      `id: ownerShopHandle\\("${id}"\\)\\.id[\\s\\S]*?openSelectedCommunityRoute\\([\\s\\S]*?routes\\.${route}`
    ),
    `Community Home subscription row ${id} must stay grouped under Subscriptions and use the selected-community route guard.`
  );
});

assertContains(
  /id: ownerShopHandle\("free-spotlight"\)\.id[\s\S]*?title: ownerShopHandle\("free-spotlight"\)\.label[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.freeSpotlight/,
  "Community Home Free Spotlight row must stay as the free Marketplace & Tools spotlight handle."
);

assertContains(
  /merchantRelease: routeTarget\([\s\S]*?"shop"[\s\S]*?hash: OWNER_SHOP_HASHES\.merchantRelease[\s\S]*?id: ownerShopHandle\("merchant-release"\)\.id[\s\S]*?routes\.merchantRelease/,
  "Community Home Merchant Release row must route to the Shop Control merchant release rail."
);

assertContains(
  /shopGalleryTools: routeTarget\([\s\S]*?"shop"[\s\S]*?hash: OWNER_SHOP_HASHES\.diaries[\s\S]*?id: ownerShopHandle\("shop-gallery-tools"\)\.id[\s\S]*?routes\.shopGalleryTools/,
  "Community Home Shop Gallery Tools row must route to the Shop Control gallery tools lane."
);

assertContains(
  /ROSCA_MARKETPLACE_HASH[\s\S]*?from "\.\.\/lib\/ownerShopHandles";[\s\S]*?rosca:\s*routeTarget\([\s\S]*?"marketplace"[\s\S]*?ROSCA_MARKETPLACE_HASH[\s\S]*?id: "rosca"[\s\S]*?title: "ROSCA"[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.rosca/,
  "Community Home ROSCA row must route into the Marketplace ROSCA section through the selected-community route guard."
);

assertContains(
  /id: "rosca"[\s\S]*?title: "ROSCA"[\s\S]*?detail: "Open contribution cycles for this community marketplace\."[\s\S]*?openSelectedCommunityRoute\([\s\S]*?routes\.rosca[\s\S]*?"Choose a community first, then open ROSCA in Marketplace\."/,
  "Community Home ROSCA row must keep its Marketplace wording and selected-community route explanation."
);

assertContains(
  /function communityQuickActionButton\([\s\S]*?height: isCompact \? 58 : 100[\s\S]*?minHeight: isCompact \? 58 : 100[\s\S]*?maxHeight: isCompact \? 58 : 100[\s\S]*?overflow: "hidden"[\s\S]*?function communityQuickActionIcon\([\s\S]*?width: 25,[\s\S]*?height: 25,[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?"repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?debugId=\{`community-home\.next-action\.\$\{item\.id\}`\}/,
  "Community Home front command-lane buttons must keep fixed phone geometry."
);

assertContains(
  /function communityToolRowStyle\(\): React\.CSSProperties \{[\s\S]*?height: 72,[\s\S]*?minHeight: 72,[\s\S]*?maxHeight: 72[\s\S]*?pointerEvents: "auto"[\s\S]*?transition: "none"/,
  "Community Home compact tool rows must keep fixed 72px phone geometry and no transition-driven movement."
);

assertLayoutContains(
  /if \(pathname\.startsWith\("\/app\/community"\)\) \{[\s\S]*?return uniqueNavItems\(\[[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?makeShopControlItem\(\)[\s\S]*?Demand Box[\s\S]*?Finance[\s\S]*?Notifications[\s\S]*?\]\);/,
  "Community Home page tools must keep the five route-local navigator actions: Public Shop, Shop Control, Demand Box, Finance, and Notifications."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Community Home mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Community Home mobile drawer must count close, grouped route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?pageActions\.map[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Community Home mobile Tools panel must count close, five page actions, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community Home"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?label: "Shop"[\s\S]*?makeProfileItem\(\)[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label\.toLowerCase\(\)/,
  "Community Home mobile bottom rail must count the five stable route anchors: Dashboard, Community Home, Marketplace, Shop, and Profile."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Community Home mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function drawerLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 56,[\s\S]*?minHeight: 56,[\s\S]*?maxHeight: 56[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"/,
  "Community Home mobile drawer buttons must keep fixed 56px geometry."
);

assertLayoutContains(
  /function actionsLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?pointerEvents: "auto"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Community Home mobile Tools panel buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function bottomNavItem\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 58,[\s\S]*?minHeight: 58,[\s\S]*?maxHeight: 58[\s\S]*?pointerEvents: "auto"[\s\S]*?opacity: disabled \? 0\.7 : 1/,
  "Community Home mobile bottom navigator buttons must keep fixed 58px geometry and active pointer targets."
);

assertLayoutContains(
  /function mainContent\(\s*isMobile: boolean,\s*taskMode: boolean\s*\): React\.CSSProperties \{[\s\S]*?const mobileBottomPadding = "calc\(16px \+ env\(safe-area-inset-bottom, 0px\)\)";[\s\S]*?function bottomNav\(\): React\.CSSProperties \{[\s\S]*?position: "relative"[\s\S]*?flexShrink: 0[\s\S]*?style=\{mainContent\(isMobile, !!taskMode\)\}[\s\S]*?\{showMobileBottomRail \?/,
  "Community Home mobile content must not double-reserve the bottom rail while the rail remains visible in normal layout flow."
);

if (/Awaiting issue/.test(source)) {
  findings.push({
    file: communityFile,
    line: lineAt(source.search(/Awaiting issue/)),
    message:
      "Community Home must not store or compare a stale placeholder as if it were a real GSN ID.",
    text: source
      .slice(source.search(/Awaiting issue/), source.search(/Awaiting issue/) + 160)
      .replace(/\s+/g, " "),
  });
}

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(source))) {
  findings.push({
    file: communityFile,
    line: lineAt(match.index),
    message: "Community Home page must not bypass shared stable primitives with raw action roots.",
    text: source.slice(match.index, match.index + 160).replace(/\s+/g, " "),
  });
}

if (findings.length > 0) {
  console.error("Community Home button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Community Home button inventory audit passed: ${actions.length} StableButton source templates, ` +
    `${nativeFields.length} native fields, ${nextActionGuideItemCount} NextActionGuide items, ` +
    `${frontQuickActionCount} front quick buttons, ${spotlightGuidedActionCount} spotlight guided buttons, ` +
    `${groupedLaneRowCount} grouped lane rows, ${expectedExpandedRouteLocalActionTemplates} expanded route-local action templates, ` +
    `${expectedMobileShellActionCount} mobile app-shell controls ` +
    `(${expectedMobileShellBreakdown.top} top, ${expectedMobileShellBreakdown.drawer} drawer, ` +
    `${expectedMobileShellBreakdown.pageTools} tools, ${expectedMobileShellBreakdown.bottom} bottom), ` +
    `${expectedWholeMobileRouteActionTemplates} whole-route mobile action templates total.`
);
