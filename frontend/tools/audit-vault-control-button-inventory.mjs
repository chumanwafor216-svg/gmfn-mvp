/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const vaultControlFile = "src/pages/VaultControlPage.tsx";
const appLayoutFile = "src/layout/AppLayout.tsx";
const stableButtonFile = "src/components/StableButton.tsx";
const mediaFrameFile = "src/components/SpotlightMediaFrame.tsx";
const vaultControlSource = readFileSync(
  join(frontendRoot, vaultControlFile),
  "utf8"
);
const appLayoutSource = readFileSync(join(frontendRoot, appLayoutFile), "utf8");
const stableButtonSource = readFileSync(
  join(frontendRoot, stableButtonFile),
  "utf8"
);
const mediaFrameSource = readFileSync(join(frontendRoot, mediaFrameFile), "utf8");
const findings = [];

const expectedSourceActions = {
  PrimaryButton: 5,
  SecondaryButton: 8,
  SubtleButton: 2,
  StableButton: 3,
  StableCtaLink: 0,
  total: 18,
};
const expectedNativeFieldCount = 8;
const expectedFileInputActionRoots = 2;
const expectedMediaFrameInvocations = 2;
const expectedSharedMediaAudioActionTemplates = 1;
const expectedSocialTagActionTemplates = 1;
const expectedMobileTaskShellBreakdown = {
  top: 2,
  drawer: 6,
  pageTools: 6,
  bottom: 0,
};
const expectedMobileTaskShellActions = Object.values(
  expectedMobileTaskShellBreakdown
).reduce((sum, count) => sum + count, 0);
const expectedWholeRouteActionFamilies =
  expectedSourceActions.total +
  expectedFileInputActionRoots +
  expectedSharedMediaAudioActionTemplates +
  expectedSocialTagActionTemplates +
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

function assertVaultContains(
  pattern,
  message,
  text = "Expected Vault Control pattern was not found."
) {
  if (pattern.test(vaultControlSource)) return;
  findings.push({
    file: vaultControlFile,
    line: 1,
    message,
    text,
  });
}

function assertLayoutContains(
  pattern,
  message,
  text = "Expected Vault Control app-shell pattern was not found."
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

function assertMediaFrameContains(
  pattern,
  message,
  text = "Expected SpotlightMediaFrame pattern was not found."
) {
  if (pattern.test(mediaFrameSource)) return;
  findings.push({
    file: mediaFrameFile,
    line: 1,
    message,
    text,
  });
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|SubtleButton|StableButton|StableCtaLink)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(vaultControlSource))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(vaultControlSource, match.index),
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
    file: vaultControlFile,
    line: 1,
    message: `Vault Control ${key} source action inventory changed from ${value} to ${sourceCounts[key]}. Re-audit the new or removed control families on phone before accepting this baseline.`,
    text: actions
      .map((action) => `${action.line}:${action.id || "missing-debugId"}`)
      .join(", "),
  });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(vaultControlSource))) {
  nativeFields.push({
    line: lineAt(vaultControlSource, match.index),
    type: match[1],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: vaultControlFile,
    line: 1,
    message: `Vault Control native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap or typing surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: vaultControlFile,
      line: action.line,
      message: "Every Vault Control stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^vault-control\./.test(action.id)) {
    findings.push({
      file: vaultControlFile,
      line: action.line,
      message: "Vault Control page actions must stay in the vault-control debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedActionOrder = [
  "vault-control.panel.${panel}.toggle",
  "vault-control.payment-slot.${slot}",
  "vault-control.confirm-quote",
  "vault-control.generate-payment-code",
  "vault-control.copy-payment-details",
  "vault-control.check-payment-status",
  "vault-control.block-slot.${slotNumber}.select",
  "vault-control.selected-block.locked",
  "vault-control.selected-block.edit",
  "vault-control.selected-block.hide",
  "vault-control.selected-block.add",
  "vault-control.link.create-or-replace",
  "vault-control.link.copy",
  "vault-control.link.social-share",
  "vault-control.link.open-private-view",
  "vault-control.link.extend",
  "vault-control.link.revoke",
  "vault-control.editor.save",
  "vault-control.editor.close",
];
let cursor = -1;

for (const debugId of expectedActionOrder) {
  const next = vaultControlSource.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: vaultControlFile,
      line: 1,
      message:
        "Vault Control front-to-inner action inventory is missing an expected action family.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: vaultControlFile,
      line: lineAt(vaultControlSource, next),
      message:
        "Vault Control front-to-inner action order changed. Re-audit phone button flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

const rawActionPattern = /<(button|a|summary)\b|role="button"/g;
while ((match = rawActionPattern.exec(vaultControlSource))) {
  findings.push({
    file: vaultControlFile,
    line: lineAt(vaultControlSource, match.index),
    message:
      "Vault Control must not bypass shared stable primitives with raw button, anchor, summary, or role=button controls.",
    text: vaultControlSource
      .slice(match.index, match.index + 160)
      .replace(/\s+/g, " "),
  });
}

const fileInputActionRoots = [];
const fileInputPattern = /<input\b[\s\S]*?type="file"[\s\S]*?\/>/g;
while ((match = fileInputPattern.exec(vaultControlSource))) {
  const block = match[0];
  if (/data-gmfn-action-root="true"/.test(block)) {
    fileInputActionRoots.push({
      line: lineAt(vaultControlSource, match.index),
      id: block.match(/data-cta-id="([^"]+)"/)?.[1] || "",
      block,
    });
  }
}

if (fileInputActionRoots.length !== expectedFileInputActionRoots) {
  findings.push({
    file: vaultControlFile,
    line: 1,
    message: `Vault Control file-input action-root inventory changed from ${expectedFileInputActionRoots} to ${fileInputActionRoots.length}. Re-audit upload tap handling before accepting this baseline.`,
    text: fileInputActionRoots
      .map((field) => `${field.line}:${field.id || "missing-data-cta-id"}`)
      .join(", "),
  });
}

const expectedFileInputIds = [
  "vault-control.editor.image-file",
  "vault-control.editor.video-file",
];
for (const expectedId of expectedFileInputIds) {
  if (fileInputActionRoots.some((field) => field.id === expectedId)) continue;
  findings.push({
    file: vaultControlFile,
    line: 1,
    message:
      "Vault Control editor upload fields must keep stable data-cta-id values.",
    text: expectedId,
  });
}

const allActionRootMarkers =
  vaultControlSource.match(/data-gmfn-action-root|data-cta-id/g)?.length || 0;
if (allActionRootMarkers !== expectedFileInputActionRoots * 2) {
  findings.push({
    file: vaultControlFile,
    line: 1,
    message:
      "Vault Control data-gmfn-action-root/data-cta-id markers must stay limited to the two audited editor upload controls.",
    text: `Found ${allActionRootMarkers} action-root marker attributes.`,
  });
}

const mediaFrameInvocationCount =
  vaultControlSource.match(/<SpotlightMediaFrame\b/g)?.length || 0;
if (mediaFrameInvocationCount !== expectedMediaFrameInvocations) {
  findings.push({
    file: vaultControlFile,
    line: 1,
    message: `Vault Control media frame invocation inventory changed from ${expectedMediaFrameInvocations} to ${mediaFrameInvocationCount}. Re-audit private block media and editor preview audio controls before accepting this baseline.`,
    text: "Expected selected-block media frame and editor-preview media frame.",
  });
}

assertVaultContains(
  /role="radiogroup"[\s\S]*?\[1, 2, 3, 4, 5, 6\]\.map\(\(slot\)[\s\S]*?role="radio"[\s\S]*?debugId=\{`vault-control\.payment-slot\.\$\{slot\}`\}/,
  "Vault Control payment slot chooser must keep one audited radiogroup action family for slots 1-6."
);

assertVaultContains(
  /vaultInnerSlots\.map\(\(item, index\)[\s\S]*?const slotNumber = index \+ 1[\s\S]*?debugId=\{`vault-control\.block-slot\.\$\{slotNumber\}\.select`\}/,
  "Vault Control private block chooser must keep one audited action family for block slots 1-6."
);

assertVaultContains(
  /import SocialTagShareButton from "\.\.\/components\/SocialTagShareButton";[\s\S]*?function buildVaultSocialShareTarget\(\)[\s\S]*?buildVaultInvitePackage\(selectedBlockLinkUrl, selectedBlockPrimaryLink\)[\s\S]*?<SocialTagShareButton[\s\S]*?target=\{buildVaultSocialShareTarget\(\)\}[\s\S]*?disabled=\{!selectedBlockLinkUrl\}[\s\S]*?buttonLabel="Share block"[\s\S]*?debugId="vault-control\.link\.social-share"/,
  "Vault Control private block social sharing must stay owner-issued, disabled until a private link exists, and use the shared Vault invite package."
);

assertVaultContains(
  /<SpotlightMediaFrame[\s\S]*?alt=\{firstTruthy\(selectedProduct\.name, `Vault block #\$\{selectedSlot\}`\)\}[\s\S]*?showAudioUnlock=\{Boolean\(selectedProduct\.video_url\)\}[\s\S]*?<SpotlightMediaFrame[\s\S]*?alt=\{firstTruthy\(productName, "Vault preview"\)\}[\s\S]*?showVideoControls[\s\S]*?showAudioUnlock/,
  "Vault Control must keep media frames for selected private block playback and editor preview playback."
);

assertLayoutContains(
  /if \(pathname === "\/app\/vault-control"\) \{[\s\S]*?title: "Vault Control"[\s\S]*?actions: \[[\s\S]*?makeShopControlItem\(\)[\s\S]*?makeCommunityItem\(\)[\s\S]*?makeMarketplaceItem\(\)[\s\S]*?makeDashboardItem\(\)[\s\S]*?\]/,
  "Vault Control task mode must keep Shop Control, Community, Marketplace, and Dashboard as its focused escape actions."
);

assertLayoutContains(
  /if \(pathname === "\/app\/vault-control"\) \{[\s\S]*?section: "Focused task"[\s\S]*?page: "Vault Control"/,
  "Vault Control app shell metadata must keep the page in focused-task mode."
);

assertLayoutContains(
  /function shouldKeepBottomRailInTaskMode\(pathname: string\): boolean \{[\s\S]*?return \([\s\S]*?pathname === "\/app\/loans"[\s\S]*?\);[\s\S]*?\}[\s\S]*?const showMobileBottomRail =[\s\S]*?isMobile && \(!taskMode \|\| shouldKeepBottomRailInTaskMode\(location\.pathname\)\)/,
  "Vault Control focused-task mode must keep the mobile bottom rail hidden unless the route is explicitly allowlisted."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.open-navigation"[\s\S]*?debugId="app-layout\.mobile\.open-tools"/,
  "Vault Control mobile route surface must count the two fixed top navigator buttons: Menu and Tools."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-navigation"[\s\S]*?mobileDrawerGroups\.map[\s\S]*?debugId=\{`app-layout\.drawer\.\$\{group\.title\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.drawer\.logout"/,
  "Vault Control mobile drawer must count close, four focused route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /debugId="app-layout\.mobile\.close-tools"[\s\S]*?pageActions\.map[\s\S]*?debugId=\{`app-layout\.page-action\.\$\{item\.label\.toLowerCase\(\)[\s\S]*?debugId="app-layout\.page-action\.logout"/,
  "Vault Control mobile Tools panel must count close, four focused route links, and logout as part of the outer navigator surface."
);

assertLayoutContains(
  /function mobileIconButton\(\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?overflow: "hidden"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function MobileTopIcon/,
  "Vault Control mobile top Menu and Tools buttons must keep fixed 44px geometry."
);

assertLayoutContains(
  /function drawerLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 42,[\s\S]*?minHeight: 42,[\s\S]*?maxHeight: 42[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"/,
  "Vault Control mobile drawer buttons must keep fixed 42px geometry."
);

assertLayoutContains(
  /function actionsLink\(active = false, disabled = false\): React\.CSSProperties[\s\S]*?height: 44,[\s\S]*?minHeight: 44,[\s\S]*?maxHeight: 44[\s\S]*?pointerEvents: "auto"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?textOverflow: "ellipsis"/,
  "Vault Control mobile Tools panel buttons must keep fixed 44px geometry."
);

assertStableButtonContains(
  /const CLICK_DEBOUNCE_MS = 360[\s\S]*?const stableMovementLock: React\.CSSProperties = \{[\s\S]*?transform: "none"[\s\S]*?transition: "none"[\s\S]*?overflowAnchor: "none"/,
  "Vault Control depends on StableButton's debounce and movement lock for non-jumpy owner controls."
);

assertStableButtonContains(
  /data-gmfn-action-root="true"[\s\S]*?data-cta-id=\{resolvedDebugId\}[\s\S]*?onPointerDownCapture=\{guardedPointerDownCapture\}[\s\S]*?onPointerDown=\{guardedPointerDown\}[\s\S]*?onClick=\{handleClick\}/,
  "Vault Control stable buttons must keep action-root IDs and guarded pointer/click handling."
);

assertMediaFrameContains(
  /<SecondaryButton[\s\S]*?data-media-control="true"[\s\S]*?onClick=\{toggleAudio\}[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="spotlight-media-frame\.toggle-audio"/,
  "Vault Control media frames rely on the shared fixed-height 52px audio unlock button."
);

if (findings.length > 0) {
  console.error("Vault Control button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Vault Control button inventory audit passed: ${sourceCounts.PrimaryButton} PrimaryButton, ` +
    `${sourceCounts.SecondaryButton} SecondaryButton, ` +
    `${sourceCounts.SubtleButton} SubtleButton, ` +
    `${sourceCounts.StableButton} StableButton, ` +
    `${sourceCounts.StableCtaLink} StableCtaLink, ` +
    `${nativeFields.length} native fields (${expectedFileInputActionRoots} file-input action roots), ` +
    `${mediaFrameInvocationCount} media-frame invocation families, ` +
    `${expectedSharedMediaAudioActionTemplates} shared media audio action template, ` +
    `${expectedSocialTagActionTemplates} social tag action template, ` +
    `${expectedMobileTaskShellActions} focused mobile app-shell controls ` +
    `(${expectedMobileTaskShellBreakdown.top} top, ${expectedMobileTaskShellBreakdown.drawer} drawer, ` +
    `${expectedMobileTaskShellBreakdown.pageTools} tools, ${expectedMobileTaskShellBreakdown.bottom} bottom), ` +
    `${expectedWholeRouteActionFamilies} whole-route mobile action families total, ` +
    `plus ${expectedNativeFieldCount - expectedFileInputActionRoots} ordinary native fields.`
);
