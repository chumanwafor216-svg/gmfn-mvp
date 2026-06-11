/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopControlFile = "src/pages/ShopControlPage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const stableButtonFile = "src/components/StableButton.tsx";
const shopControlSource = readFileSync(
  join(frontendRoot, shopControlFile),
  "utf8"
);
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const stableButtonSource = readFileSync(
  join(frontendRoot, stableButtonFile),
  "utf8"
);
const findings = [];

const expectedSourceActions = {
  PrimaryButton: 11,
  SecondaryButton: 18,
  SubtleButton: 2,
  StableButton: 3,
  StableCtaLink: 5,
  total: 39,
};
const expectedNativeFieldCount = 24;
const expectedFileInputActionRoots = 2;
const expectedMobileTaskShellBreakdown = {
  top: 2,
  drawer: 5,
  pageTools: 5,
  bottom: 0,
};
const expectedMobileTaskShellActions = Object.values(
  expectedMobileTaskShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeRouteActionRoots =
  expectedSourceActions.total +
  expectedFileInputActionRoots +
  expectedMobileTaskShellActions;

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

function assertShopContains(
  pattern,
  message,
  text = "Expected Shop Control pattern was not found."
) {
  if (pattern.test(shopControlSource)) return;
  findings.push({
    file: shopControlFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Shop Control app-shell pattern was not found."
) {
  if (pattern.test(appLayoutSource)) return;
  findings.push({
    file: appLayoutFile,
    line: 1,
    message,
    text,
  });
}

function assertStableButtonContains(
  pattern,
  message,
  text = "Expected StableButton system-level pattern was not found."
) {
  if (pattern.test(stableButtonSource)) return;
  findings.push({
    file: stableButtonFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|SubtleButton|StableButton|StableCtaLink)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(shopControlSource))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(shopControlSource, match.index),
    block,
  });
}

const sourceCounts = {
  PrimaryButton: actions.filter((action) => action.tag === "PrimaryButton")
    .length,
  SecondaryButton: actions.filter((action) => action.tag === "SecondaryButton")
    .length,
  SubtleButton: actions.filter((action) => action.tag === "SubtleButton")
    .length,
  StableButton: actions.filter((action) => action.tag === "StableButton")
    .length,
  StableCtaLink: actions.filter((action) => action.tag === "StableCtaLink")
    .length,
};
sourceCounts.total = Object.values(sourceCounts).reduce(
  (sum, count) => sum + count,
  0
);

for (const [key, value] of Object.entries(expectedSourceActions)) {
  if (sourceCounts[key] === value) continue;
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control ${key} source action inventory changed from ${value} to ${sourceCounts[key]}. Re-audit the new or removed controls on phone before accepting this baseline.`,
    text: actions
      .map((action) => `${action.line}:${action.id || "missing-debugId"}`)
      .join(", "),
  });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(shopControlSource))) {
  nativeFields.push({
    line: lineAt(shopControlSource, match.index),
    type: match[1],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap or typing surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: shopControlFile,
      line: action.line,
      message: "Every Shop Control stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^shop-control\./.test(action.id)) {
    findings.push({
      file: shopControlFile,
      line: action.line,
      message: "Shop Control page actions must stay in the shop-control debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

}

const expectedActionOrder = [
  "shop-control.spotlight.setup.continue",
  "shop-control.spotlight.setup.cancel",
  "shop-control.spotlight.free-lane",
  "shop-control.spotlight.paid-lane",
  "shop-control.spotlight.media.image",
  "shop-control.spotlight.media.video",
  "shop-control.spotlight.media.both",
  "shop-control.spotlight.upload.preview",
  "shop-control.spotlight.upload.cancel",
  "shop-control.spotlight.preview.back",
  "shop-control.spotlight.preview.publish",
  "shop-control.spotlight.preview.cancel",
  "shop-control.hero-shortcut.${item.label.toLowerCase().replace(/\\s+/g, \"-\")}",
  "shop-control.vault.pay-1-slot",
  "shop-control.vault.pay-6-slots",
  "shop-control.vault.manage-offers",
  "shop-control.vault.create-link",
  "shop-control.verify.pay",
  "shop-control.verify.trust-slip",
  "shop-control.verify.public",
  "shop-control.subscription.open",
  "shop-control.subscription.publisher",
  "shop-control.package.extra-shop-block",
  "shop-control.package.extra-members",
  "shop-control.package.rosca-cycle",
  "shop-control.package.meeting-pack",
  "shop-control.rosca.start-cycle",
  "shop-control.rosca.record-payout",
  "shop-control.meeting.create-reminder",
  "shop-control.meeting.share-whatsapp",
  "shop-control.meeting.record-summary",
  "shop-control.details.save",
  "shop-control.details.manage-products",
  "shop-control.vault-layer.manage-offers",
  "shop-control.vault-layer.create-link",
  "shop-control.vault-link.${item.id}.copy",
  "shop-control.vault-link.${item.id}.open",
  "shop-control.vault-link.${item.id}.extend",
  "shop-control.vault-link.${item.id}.revoke",
];
let cursor = -1;

for (const debugId of expectedActionOrder) {
  const next = shopControlSource.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: shopControlFile,
      line: 1,
      message:
        "Shop Control front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: shopControlFile,
      line: lineAt(shopControlSource, next),
      message:
        "Shop Control front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

const rawActionPattern = /<(button|a|summary)\b|role="button"/g;
while ((match = rawActionPattern.exec(shopControlSource))) {
  findings.push({
    file: shopControlFile,
    line: lineAt(shopControlSource, match.index),
    message:
      "Shop Control must not bypass shared stable primitives with raw button, anchor, summary, or role=button controls.",
    text: shopControlSource
      .slice(match.index, match.index + 160)
      .replace(/\s+/g, " "),
  });
}

const fileInputActionRoots = [];
const fileInputPattern = /<input\b[\s\S]*?type="file"[\s\S]*?\/>/g;
while ((match = fileInputPattern.exec(shopControlSource))) {
  const block = match[0];
  if (/data-gmfn-action-root="true"/.test(block)) {
    fileInputActionRoots.push({
      line: lineAt(shopControlSource, match.index),
      id: block.match(/data-cta-id="([^"]+)"/)?.[1] || "",
      block,
    });
  }
}

if (fileInputActionRoots.length !== expectedFileInputActionRoots) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message: `Shop Control file-input action-root inventory changed from ${expectedFileInputActionRoots} to ${fileInputActionRoots.length}. Re-audit upload tap handling before accepting this baseline.`,
    text: fileInputActionRoots
      .map((field) => `${field.line}:${field.id || "missing-data-cta-id"}`)
      .join(", "),
  });
}

const expectedFileInputIds = [
  "shop-control.spotlight.image-file",
  "shop-control.spotlight.video-file",
];
for (const expectedId of expectedFileInputIds) {
  if (fileInputActionRoots.some((field) => field.id === expectedId)) continue;
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control spotlight upload fields must keep stable data-cta-id values.",
    text: expectedId,
  });
}

const allActionRootMarkers =
  shopControlSource.match(/data-gmfn-action-root|data-cta-id/g)?.length || 0;
if (allActionRootMarkers !== expectedFileInputActionRoots * 2) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control data-gmfn-action-root/data-cta-id markers must stay limited to the two audited file-upload controls.",
    text: `Found ${allActionRootMarkers} action-root marker attributes.`,
  });
}

assertShopContains(
  /const shopHeroShortcuts:[\s\S]*?icon: GsnIconName[\s\S]*?label: "Dashboard"[\s\S]*?icon: "chart"[\s\S]*?label: "Marketplace"[\s\S]*?icon: "shop"[\s\S]*?label: "Shop gallery"[\s\S]*?icon: "image"[\s\S]*?label: "Free spotlight"[\s\S]*?icon: "megaphone"[\s\S]*?label: "Subscription spotlight"[\s\S]*?icon: "card"[\s\S]*?label: "Paid Repost"[\s\S]*?icon: "refresh"[\s\S]*?label: "Vault"[\s\S]*?icon: "vault"[\s\S]*?\];/,
  "Shop Control hero shortcuts must keep Dashboard, Marketplace, Shop gallery, Free spotlight, Subscription spotlight, Paid Repost, and Vault in the audited order with 3D GSN icon names."
);

assertShopContains(
  /activeOwnerLayer === "products" \? \(\s*<section\s*id="shop-control-gallery-tools"/,
  "Shop Control overview must not expose the embedded product/gallery workspace before the owner opens Shop gallery."
);

if (
  /activeOwnerLayer === "overview"\s*\|\|\s*activeOwnerLayer === "products"\s*\?\s*\(\s*<section\s*id="shop-control-gallery-tools"/.test(
    shopControlSource
  )
) {
  findings.push({
    file: shopControlFile,
    line: 1,
    message:
      "Shop Control must not render Shop gallery tools on the plain overview.",
    text: "Render #shop-control-gallery-tools only when activeOwnerLayer is products.",
  });
}

assertShopContains(
  /debugId="shop-control\.package\.rosca-cycle"[\s\S]*?debugId="shop-control\.rosca\.start-cycle"[\s\S]*?debugId="shop-control\.rosca\.record-payout"/,
  "Shop Control must keep the ROSCA paid package action connected to the ROSCA cycle and payout controls."
);

assertShopContains(
  /debugId="shop-control\.package\.meeting-pack"[\s\S]*?debugId="shop-control\.meeting\.create-reminder"[\s\S]*?debugId="shop-control\.meeting\.share-whatsapp"[\s\S]*?debugId="shop-control\.meeting\.record-summary"/,
  "Shop Control meeting/reminder controls must keep reminder, WhatsApp share, and summary action roots together."
);

assertLayoutContains(
  /if \(pathname === "\/app\/shop-control"\) \{[\s\S]*?title: "Shop Control"[\s\S]*?actions: \[[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeDashboardItem\(\)[\s\S]*?\]/,
  "Shop Control task mode must keep Community, Marketplace, and Dashboard as its focused escape actions."
);

assertLayoutContains(
  /function shouldKeepBottomRailInTaskMode\(pathname: string\): boolean \{[\s\S]*?return \([\s\S]*?pathname === "\/app\/loans"[\s\S]*?\);[\s\S]*?\}[\s\S]*?const showMobileBottomRail =[\s\S]*?isMobile && \(!taskMode \|\| shouldKeepBottomRailInTaskMode\(location\.pathname\)\)/,
  "Shop Control focused-task mode must keep the mobile bottom rail hidden unless the route is explicitly allowlisted."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Shop Control mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Shop Control mobile drawer must count close, three focused route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?pageActions\.map[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Shop Control mobile Tools panel must count close, three focused route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Shop Control mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function drawerLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 42,[\s\S]*?minHeight: 42,[\s\S]*?maxHeight: 42[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"/,
  "Shop Control mobile drawer buttons must keep fixed 42px geometry."
);

assertLayoutContains(
  /function actionsLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?pointerEvents: "auto"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Shop Control mobile Tools panel buttons must keep fixed 44px geometry."
);

assertStableButtonContains(
  /const CLICK_DEBOUNCE_MS = 360[\s\S]*?const stableMovementLock: React\.CSSProperties = \{[\s\S]*?transform: "none"[\s\S]*?transition: "none"[\s\S]*?overflowAnchor: "none"/,
  "Shop Control depends on StableButton's debounce and movement lock for non-jumpy owner controls."
);

assertStableButtonContains(
  /data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?onPointerDownCapture=\{guardedPointerDownCapture\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onClick=\{handleClick\}/,
  "Shop Control stable buttons must keep action-root IDs and guarded pointer/click handling."
);

assertStableButtonContains(
  /<OriginLink[\s\S]*?data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?onPointerDownCapture=\{guardedPointerDownCapture\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onClickCapture=\{guardedClickCapture\}[\s\S]*?onClick=\{handleClick\}/,
  "Shop Control stable links must keep action-root IDs and guarded pointer/click handling."
);

if (findings.length > 0) {
  console.error("Shop Control button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Shop Control button inventory audit passed: ${sourceCounts.PrimaryButton} PrimaryButton, ` +
    `${sourceCounts.SecondaryButton} SecondaryButton, ` +
    `${sourceCounts.SubtleButton} SubtleButton, ` +
    `${sourceCounts.StableButton} StableButton, ` +
    `${sourceCounts.StableCtaLink} StableCtaLink, ` +
    `${nativeFields.length} native fields (${expectedFileInputActionRoots} file-input action roots), ` +
    `${expectedMobileTaskShellActions} focused mobile app-shell controls ` +
    `(${expectedMobileTaskShellBreakdown.top} top, ${expectedMobileTaskShellBreakdown.drawer} drawer, ` +
    `${expectedMobileTaskShellBreakdown.pageTools} tools, ${expectedMobileTaskShellBreakdown.bottom} bottom), ` +
    `${expectedWholeRouteActionRoots} whole-route mobile action roots total, ` +
    `plus ${expectedNativeFieldCount - expectedFileInputActionRoots} ordinary native fields.`
);
