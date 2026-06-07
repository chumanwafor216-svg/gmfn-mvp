/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dashboardFile = "src/pages/DashboardPage.tsx";
const frameToolsFile = "src/components/PictureFrameToolsControl.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const dashboardSource = readFileSync(join(frontendRoot, dashboardFile), "utf8");
const frameToolsSource = readFileSync(join(frontendRoot, frameToolsFile), "utf8");
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const findings = [];
const expectedNativeFieldCount = 9;
const expectedMobileShellBreakdown = {
  top: 2,
  drawer: 25,
  pageTools: 8,
  bottom: 7,
};
const expectedMobileShellActionCount = Object.values(
  expectedMobileShellBreakdown
).reduce((sum, count) => sum + count, 0);

function lineAt(source, index) {
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

function assertContains(
  pattern,
  message,
  text = "Expected Dashboard pattern was not found."
) {
  if (pattern.test(dashboardSource)) return;
  findings.push({
    file: dashboardFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Dashboard app-shell pattern was not found."
) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern =
  /<(StableButton|StableDisclosureSummary)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(dashboardSource))) {
  const block = match[0];
  const tag = match[1];
  const id = debugIdFrom(block);
  actions.push({
    tag,
    id,
    line: lineAt(dashboardSource, match.index),
    block,
  });
}

const counts = {
  StableButton: actions.filter((action) => action.tag === "StableButton").length,
  StableDisclosureSummary: actions.filter(
    (action) => action.tag === "StableDisclosureSummary"
  ).length,
  PictureFrameToolsControl:
    dashboardSource.match(/<PictureFrameToolsControl\b/g)?.length || 0,
};
const frameToolRailActions = 3;
counts.EffectiveDashboardActionRoots =
  counts.StableButton +
  counts.StableDisclosureSummary +
  counts.PictureFrameToolsControl * (1 + frameToolRailActions);

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(dashboardSource))) {
  nativeFields.push({
    line: lineAt(dashboardSource, match.index),
    type: match[1],
  });
}

const expected = {
  StableButton: 52,
  StableDisclosureSummary: 1,
  PictureFrameToolsControl: 2,
  EffectiveDashboardActionRoots: 61,
};
const expectedWholeMobileRouteActionRoots =
  expected.EffectiveDashboardActionRoots + expectedMobileShellActionCount;

for (const [key, value] of Object.entries(expected)) {
  if (counts[key] === value) continue;
  findings.push({
    file: dashboardFile,
    line: 1,
    message: `Dashboard ${key} inventory changed from ${value} to ${counts[key]}. Update this page-level inventory intentionally after auditing the new/removed controls.`,
    text: JSON.stringify(counts),
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: dashboardFile,
    line: 1,
    message: `Dashboard native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message: "Every Dashboard stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^dashboard\./.test(action.id)) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message: "Dashboard stable actions must stay in the dashboard debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/style=/.test(action.block)) {
    findings.push({
      file: dashboardFile,
      line: action.line,
      message:
        "Every Dashboard stable action must declare route-local styling for phone geometry.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

assertContains(
  /id="most-used-apps"[\s\S]*?display: "none"[\s\S]*?debugId=\{`dashboard\.most-used-app\.\$\{app\.key\}`\}/,
  "Dashboard hidden most-used-apps source controls remain counted. Re-audit before exposing, removing, or moving this section."
);

assertContains(
  /debugId="dashboard\.market-wisdom\.open-focus-commitments"[\s\S]*?onClick=\{\(event\) =>[\s\S]*?openDashboardRoute\([\s\S]*?event,[\s\S]*?`\$\{DASHBOARD_TARGETS\.DASHBOARD\}#focus-commitments`[\s\S]*?\)[\s\S]*?\}[\s\S]*?Open Focus Commitments/,
  "Dashboard Focus Commitments action must stay caged to /app/dashboard#focus-commitments.",
  "The tested Dashboard Focus Commitments button must not route to Welcome, Inflow, or any non-dashboard target."
);

assertContains(
  /id="focus-commitments"[\s\S]*?Your Focus Commitments/,
  "Dashboard must keep the #focus-commitments landing section that the caged Focus Commitment action targets."
);

const frontToInnerOrder = [
  { label: "attention popup", pattern: /^dashboard\.attention-popup\./ },
  { label: "attention reminder", pattern: /^dashboard\.attention-reminder\./ },
  { label: "passport signal row", pattern: /^dashboard\.passport-signal\./ },
  { label: "trust detail", pattern: /^dashboard\.trust-detail\./ },
  { label: "trust actions", pattern: /^dashboard\.trust-action\./ },
  { label: "apps hub", pattern: /^dashboard\.apps\./ },
  { label: "spotlight", pattern: /^dashboard\.spotlight\./ },
  { label: "demand box", pattern: /^dashboard\.demand\./ },
  { label: "inbox", pattern: /^dashboard\.inbox\./ },
  { label: "market wisdom", pattern: /^dashboard\.market-wisdom\./ },
  { label: "most-used apps", pattern: /^dashboard\.most-used-app\./ },
  { label: "focus", pattern: /^dashboard\.focus\./ },
];
let previousSection = null;

for (const section of frontToInnerOrder) {
  const firstAction = actions.find((action) => section.pattern.test(action.id));
  if (!firstAction) {
    findings.push({
      file: dashboardFile,
      line: 1,
      message:
        "Dashboard front-to-inner action inventory is missing an expected section.",
      text: section.label,
    });
    continue;
  }

  if (previousSection && firstAction.line <= previousSection.line) {
    findings.push({
      file: dashboardFile,
      line: firstAction.line,
      message:
        "Dashboard front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: `${previousSection.label} at line ${previousSection.line}; ${section.label} at line ${firstAction.line}`,
    });
  }

  previousSection = { label: section.label, line: firstAction.line };
}

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(dashboardSource))) {
  findings.push({
    file: dashboardFile,
    line: lineAt(dashboardSource, match.index),
    message:
      "Dashboard page must not bypass shared stable primitives with raw action roots.",
    text: dashboardSource
      .slice(match.index, match.index + 160)
      .replace(/\s+/g, " "),
  });
}

if (
  !/<PictureFrameToolsControl[\s\S]*?label="Frame tools"[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"[\s\S]*?<PictureFrameToolsControl[\s\S]*?label="Picture frame"[\s\S]*?label: "Upload"[\s\S]*?label: "Change"[\s\S]*?label: "Remove"/.test(
    dashboardSource
  )
) {
  findings.push({
    file: dashboardFile,
    line: 1,
    message:
      "Dashboard must keep both front passport and inner picture-frame controls with Upload, Change, and Remove.",
    text: "Expected both PictureFrameToolsControl action sets.",
  });
}

if (!/debugId="picture-frame-tools\.toggle"/.test(frameToolsSource)) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame tools must expose a stable toggle debug ID.",
    text: "Expected picture-frame-tools.toggle.",
  });
}

if (
  !/data-cta-id=\{`picture-frame-tools\.action\.\$\{action\.label\.toLowerCase\(\)\}`\}/.test(
    frameToolsSource
  )
) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame file labels must expose stable rail action IDs.",
    text: "Expected lower-case picture-frame-tools action data-cta-id.",
  });
}

if (
  !/debugId=\{`picture-frame-tools\.action\.\$\{action\.label\}`\}/.test(
    frameToolsSource
  )
) {
  findings.push({
    file: frameToolsFile,
    line: 1,
    message: "Shared picture-frame buttons must expose stable rail action debug IDs.",
    text: "Expected picture-frame-tools.action.${action.label}.",
  });
}

assertLayoutContains(
  /if \(pathname === "\/app\/dashboard"\) \{[\s\S]*?return uniqueNavItems\(\[[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?label: "Finance"[\s\S]*?label: "Notifications"[\s\S]*?label: "Trust Passport"[\s\S]*?\]\);/,
  "Dashboard page tools must keep the six route-local navigator actions: Community Home, Marketplace, Public Shop, Finance, Notifications, and Trust Passport."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Dashboard mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Dashboard mobile drawer must count close, grouped route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?pageActions\.map[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Dashboard mobile Tools panel must count close, six page actions, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /const mobileBottomItems = useMemo<NavLinkItem\[\]>\(\(\) => \{[\s\S]*?makeDashboardItem\(\)[\s\S]*?label: "Community"[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?makeFinanceItem\(\)[\s\S]*?makeLoansItem\("Loans"\)[\s\S]*?label: "Trust"[\s\S]*?debugId=\{`app-layout\.bottom-nav\.\$\{item\.label\.toLowerCase\(\)/,
  "Dashboard mobile bottom rail must count the seven normal route buttons: Dashboard, Community, Marketplace, Public Shop, Finance, Loans, and Trust."
);

assertLayoutContains(
  /function buildPrimaryItems\([\s\S]*?makeDashboardItem\(\)[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeShopGalleryItem\(myShopGalleryTo, myShopGalleryDisabled\)[\s\S]*?makeShopControlItem\(\)[\s\S]*?makeFinanceItem\(\)[\s\S]*?makeLoansItem\(\)[\s\S]*?makeTrustPassportItem\(\)[\s\S]*?if \(canUseAdminTools\) \{[\s\S]*?items\.push\(makeAdminItem\(\)\)/,
  "Dashboard normal-member drawer baseline must keep eight primary items, with Admin Tools added only for admin-capable users."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Dashboard mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function drawerLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 42,[\s\S]*?minHeight: 42,[\s\S]*?maxHeight: 42[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"/,
  "Dashboard mobile drawer buttons must keep fixed 42px geometry."
);

assertLayoutContains(
  /function actionsLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?pointerEvents: "auto"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Dashboard mobile Tools panel buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function bottomNavItem\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 42,[\s\S]*?minHeight: 42,[\s\S]*?maxHeight: 42[\s\S]*?pointerEvents: "auto"[\s\S]*?opacity: disabled \? 0\.7 : 1/,
  "Dashboard mobile bottom navigator buttons must keep fixed 42px geometry and active pointer targets."
);

assertLayoutContains(
  /function mainContent\([\s\S]*?bottomNavReservePx: number[\s\S]*?bottomRailReserve \+ 16[\s\S]*?const showMobileBottomRail =[\s\S]*?showMobileBottomRail \? mobileBottomNavReservePx : 0[\s\S]*?\{showMobileBottomRail \?/,
  "Dashboard mobile content must reserve the measured bottom rail height so page controls cannot sit under the bottom-nav tap targets."
);

if (findings.length > 0) {
  console.error("Dashboard button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Dashboard button inventory audit passed: ${counts.StableButton} StableButton, ` +
    `${counts.StableDisclosureSummary} StableDisclosureSummary, ` +
    `${counts.PictureFrameToolsControl} PictureFrameToolsControl, ` +
    `${nativeFields.length} native fields, ` +
    `${counts.EffectiveDashboardActionRoots} effective dashboard action roots, ` +
    `${expectedMobileShellActionCount} mobile app-shell controls ` +
    `(${expectedMobileShellBreakdown.top} top, ${expectedMobileShellBreakdown.drawer} drawer, ` +
    `${expectedMobileShellBreakdown.pageTools} tools, ${expectedMobileShellBreakdown.bottom} bottom), ` +
    `${expectedWholeMobileRouteActionRoots} whole-route mobile effective action controls total, ` +
    `plus ${expectedNativeFieldCount} native fields.`
);
