/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const shopGalleryFile = "src/pages/ShopGalleryPage.tsx";
const ownerSurfaceNavFile = "src/components/OwnerOnlySurfaceNav.tsx";
const installPromptFile = "src/components/GsnInstallPrompt.tsx";
const mediaFrameFile = "src/components/SpotlightMediaFrame.tsx";
const shopGallerySource = readFileSync(
  join(frontendRoot, shopGalleryFile),
  "utf8"
);
const ownerSurfaceNavSource = readFileSync(
  join(frontendRoot, ownerSurfaceNavFile),
  "utf8"
);
const installPromptSource = readFileSync(
  join(frontendRoot, installPromptFile),
  "utf8"
);
const mediaFrameSource = readFileSync(join(frontendRoot, mediaFrameFile), "utf8");
const findings = [];

const expectedPageSourceActions = {
  PrimaryButton: 8,
  SecondaryButton: 12,
  StableCtaLink: 3,
  total: 23,
};
const expectedNativeFieldCount = 0;
const expectedSignedInShortcutCount = 5;
const expectedInstallPromptActions = 1;
const expectedMediaFrameInvocations = 2;
const expectedSharedMediaAudioActionTemplates = 1;
const expectedWholeRouteActionFamilies =
  expectedPageSourceActions.total +
  expectedSignedInShortcutCount +
  expectedInstallPromptActions +
  expectedSharedMediaAudioActionTemplates;

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

function assertFileContains(
  file,
  source,
  pattern,
  message,
  text = "Expected pattern was not found."
) {
  if (pattern.test(source)) return;
  findings.push({
    file,
    line: 1,
    message,
    text,
  });
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  assertFileContains(shopGalleryFile, shopGallerySource, pattern, message, text);
}

const actionPattern =
  /<(PrimaryButton|SecondaryButton|StableCtaLink)\b[\s\S]*?(?:\/>|<\/\1>)/g;
const actions = [];
let match;

while ((match = actionPattern.exec(shopGallerySource))) {
  const block = match[0];
  actions.push({
    tag: match[1],
    id: debugIdFrom(block),
    line: lineAt(shopGallerySource, match.index),
    block,
  });
}

const sourceCounts = {
  PrimaryButton: actions.filter((action) => action.tag === "PrimaryButton")
    .length,
  SecondaryButton: actions.filter((action) => action.tag === "SecondaryButton")
    .length,
  StableCtaLink: actions.filter((action) => action.tag === "StableCtaLink")
    .length,
};
sourceCounts.total = Object.values(sourceCounts).reduce(
  (sum, count) => sum + count,
  0
);

for (const [key, value] of Object.entries(expectedPageSourceActions)) {
  if (sourceCounts[key] === value) continue;
  findings.push({
    file: shopGalleryFile,
    line: 1,
    message: `Public Shop ${key} source action inventory changed from ${value} to ${sourceCounts[key]}. Re-audit the new or removed action on phone before accepting this baseline.`,
    text: actions.map((action) => `${action.line}:${action.id || "missing-debugId"}`).join(", "),
  });
}

const nativeFields = [];
const nativeFieldPattern = /<(input|select|textarea)\b/g;
while ((match = nativeFieldPattern.exec(shopGallerySource))) {
  nativeFields.push({
    line: lineAt(shopGallerySource, match.index),
    type: match[1],
  });
}

if (nativeFields.length !== expectedNativeFieldCount) {
  findings.push({
    file: shopGalleryFile,
    line: 1,
    message: `Public Shop native field inventory changed from ${expectedNativeFieldCount} to ${nativeFields.length}. Re-audit every input/select/textarea as a mobile tap surface before accepting this baseline.`,
    text: nativeFields.map((field) => `${field.line}:${field.type}`).join(", "),
  });
}

for (const action of actions) {
  if (!action.id) {
    findings.push({
      file: shopGalleryFile,
      line: action.line,
      message: "Every Public Shop stable action must carry a debugId.",
      text: action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/^shop-gallery\./.test(action.id)) {
    findings.push({
      file: shopGalleryFile,
      line: action.line,
      message: "Public Shop page actions must stay in the shop-gallery debug namespace.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (!/stableHeight=/.test(action.block)) {
    findings.push({
      file: shopGalleryFile,
      line: action.line,
      message: "Every Public Shop stable action must declare a stableHeight for phone geometry.",
      text: action.id || action.block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

const expectedActionOrder = [
  "shop-gallery.share-shop",
  "shop-gallery.verify-shop.toggle",
  "shop-gallery.owner-contact.choose",
  "shop-gallery.verify-shop.close",
  "shop-gallery.verify-shop.request-trustslip",
  "shop-gallery.verify-shop.toggle-scan",
  "shop-gallery.verify-shop.open-community-record",
  "shop-gallery.owner-contact.whatsapp-chat",
  "shop-gallery.owner-contact.phone-call",
  "shop-gallery.open-spotlight-preview",
  "shop-gallery.spotlight.whatsapp",
  "shop-gallery.ask-vault-access",
  "shop-gallery.copy-vault-shop-link",
  "shop-gallery.reconnect-owner-shop",
  "shop-gallery.sign-in-reconnect-shop",
  "shop-gallery.open-marketplace-refresh",
  "shop-gallery.empty-ask-vault-access",
  "shop-gallery.empty-copy-shop-link",
  "shop-gallery.product.${productOpenId}.toggle",
  "shop-gallery.product.${productOpenId}.share",
  "shop-gallery.product.${productOpenId}.paid-placement",
  "shop-gallery.product.${productOpenId}.contact",
  "shop-gallery.toggle-all-products",
];
let cursor = -1;

for (const debugId of expectedActionOrder) {
  const next = shopGallerySource.indexOf(debugId, cursor + 1);
  if (next === -1) {
    findings.push({
      file: shopGalleryFile,
      line: 1,
      message: "Public Shop front-to-inner action inventory is missing an expected action.",
      text: debugId,
    });
    continue;
  }

  if (next < cursor) {
    findings.push({
      file: shopGalleryFile,
      line: lineAt(shopGallerySource, next),
      message:
        "Public Shop front-to-inner action order changed. Re-audit phone flow before accepting this reorder.",
      text: debugId,
    });
  }

  cursor = next;
}

const memberSurfaceLinksBlock =
  shopGallerySource.match(/const memberSurfaceLinks = useMemo\([\s\S]*?\n\s{2}\);/)?.[0] ||
  "";
const memberSurfaceLinkCount = (memberSurfaceLinksBlock.match(/debugId: /g) || [])
  .length;

if (memberSurfaceLinkCount !== expectedSignedInShortcutCount) {
  findings.push({
    file: shopGalleryFile,
    line: 1,
    message: `Public Shop signed-in shortcut inventory changed from ${expectedSignedInShortcutCount} to ${memberSurfaceLinkCount}. Re-audit the signed-in shortcut strip before accepting this baseline.`,
    text: memberSurfaceLinksBlock.replace(/\s+/g, " ").slice(0, 260),
  });
}

assertContains(
  /const memberSurfaceLinks = useMemo\([\s\S]*?label: "Dashboard"[\s\S]*?debugId: "shop-gallery\.member-nav\.dashboard"[\s\S]*?label: "Community Home"[\s\S]*?debugId: "shop-gallery\.member-nav\.community"[\s\S]*?label: "Marketplace"[\s\S]*?debugId: "shop-gallery\.member-nav\.marketplace"[\s\S]*?label: "Paid Repost"[\s\S]*?debugId: "shop-gallery\.member-nav\.paid-placement"[\s\S]*?label: "My Shop"[\s\S]*?debugId: "shop-gallery\.member-nav\.my-shop"/,
  "Public Shop signed-in shortcut strip must keep Dashboard, Community Home, Marketplace, Paid Repost, and My Shop in the audited order."
);

assertContains(
  /<OwnerOnlySurfaceNav[\s\S]*?label="Public Shop shortcuts"[\s\S]*?ariaLabel="Public Shop signed-in shortcuts"[\s\S]*?links=\{memberSurfaceLinks\}[\s\S]*?requireOwnerMatch=\{false\}/,
  "Public Shop shortcut strip must stay hidden from ordinary visitors but visible to signed-in members through OwnerOnlySurfaceNav."
);

assertFileContains(
  ownerSurfaceNavFile,
  ownerSurfaceNavSource,
  /links\.map\(\(link\) => \([\s\S]*?<StableCtaLink[\s\S]*?stableHeight=\{compact \? 38 : 42\}[\s\S]*?debugId=\{link\.debugId\}/,
  "OwnerOnlySurfaceNav links must keep fixed-height stable route buttons."
);

assertContains(
  /<GsnInstallPrompt[\s\S]*?tone="light"[\s\S]*?compact=\{isCompact\}[\s\S]*?surface="public-shop"/,
  "Public Shop must keep the phone-screen install prompt for WhatsApp/shared-link visitors."
);

assertFileContains(
  installPromptFile,
  installPromptSource,
  /<PrimaryButton[\s\S]*?stableHeight=\{compact \? 42 : 46\}[\s\S]*?debugId=\{`gsn-install\.\$\{surface\}\.setup`\}/,
  "GsnInstallPrompt must keep one fixed-height install/setup action."
);

const mediaFrameInvocationCount =
  (shopGallerySource.match(/<SpotlightMediaFrame\b/g) || []).length;
if (mediaFrameInvocationCount !== expectedMediaFrameInvocations) {
  findings.push({
    file: shopGalleryFile,
    line: 1,
    message: `Public Shop media-frame invocation count changed from ${expectedMediaFrameInvocations} to ${mediaFrameInvocationCount}. Re-audit audio/video tap behavior before accepting this baseline.`,
    text: `SpotlightMediaFrame invocations: ${mediaFrameInvocationCount}`,
  });
}

assertContains(
  /<SpotlightMediaFrame[\s\S]*?audioUnlockLabel="🔊"[\s\S]*?audioUnlockOffLabel="🔇"[\s\S]*?audioUnlockErrorLabel="▶️"[\s\S]*?audioUnlockStyle=\{\{[\s\S]*?minWidth: isCompact \? 34 : 38[\s\S]*?width: isCompact \? 34 : 38[\s\S]*?minHeight: isCompact \? 34 : 38/,
  "Public Shop mini Spotlight media audio control must stay icon-only and fixed-size."
);

assertContains(
  /visibleProducts\.map\(\(product, index\) => \{[\s\S]*?<SpotlightMediaFrame[\s\S]*?showVideoControls=\{isProductOpen\}[\s\S]*?showAudioUnlock=\{hasVideoStory\}[\s\S]*?audioUnlockLabel="🔊"[\s\S]*?audioUnlockOffLabel="🔇"[\s\S]*?audioUnlockErrorLabel="▶️"[\s\S]*?minWidth: diaryMediaControlHeight[\s\S]*?width: diaryMediaControlHeight[\s\S]*?minHeight: diaryMediaControlHeight/,
  "Public Shop diary media audio controls must stay icon-only, fixed-size, and tied to each product card."
);

assertFileContains(
  mediaFrameFile,
  mediaFrameSource,
  /<SecondaryButton[\s\S]*?data-media-control="true"[\s\S]*?stableHeight=\{42\}[\s\S]*?debugId="spotlight-media-frame\.toggle-audio"[\s\S]*?title=\{audioUnlocked \? "Turn video sound off" : "Turn video sound on"\}/,
  "Shared SpotlightMediaFrame audio button must remain a stable media-control action."
);

assertContains(
  /function isInteractiveCardTarget\(target: EventTarget \| null\): boolean \{[\s\S]*?target\.closest\("button,a,input,select,textarea,\[role='button'\],\[data-media-control='true'\]"\)/,
  "Public Shop diary card taps must ignore buttons, links, fields, and media controls so audio/share/contact taps do not close the card."
);

assertContains(
  /onClick=\{\(event\) => \{[\s\S]*?if \(isInteractiveCardTarget\(event\.target\)\) return;[\s\S]*?if \(!isProductOpen\) \{[\s\S]*?setOpenProductId\(productOpenId\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?setOpenProductId\(null\);[\s\S]*?\}\}[\s\S]*?onDoubleClick=\{\(event\) => \{/,
  "Public Shop diary blocks must open on a single tap of the card body, with double-click left only as a fallback."
);

assertContains(
  /stableHeight=\{isCompact \? 46 : 54\}[\s\S]*?debugId="shop-gallery\.share-shop"[\s\S]*?stableHeight=\{isCompact \? 46 : 54\}[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?stableHeight=\{isCompact \? 46 : 54\}[\s\S]*?debugId="shop-gallery\.owner-contact\.choose"/,
  "Public Shop signboard Share, Verify, and WhatsApp buttons must keep fixed phone geometry."
);

assertContains(
  /debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.toggle`\}[\s\S]*?width: diaryActionWidth[\s\S]*?maxWidth: diaryActionWidth[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.share`\}[\s\S]*?display: isProductOpen \? "inline-flex" : "none"[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.paid-placement`\}[\s\S]*?display: isProductOpen \? "inline-flex" : "none"[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.contact`\}[\s\S]*?display: isProductOpen \? "inline-flex" : "none"/,
  "Public Shop product action dock must keep one always-available open/close control and reveal Share, Paid Repost, and Contact only inside the opened diary card."
);

assertContains(
  /className="shop-diary-card"[\s\S]*?minHeight: isProductOpen[\s\S]*?aspectRatio: isProductOpen[\s\S]*?gridColumn: isProductOpen \? "1 \/ -1" : undefined[\s\S]*?cursor: isProductOpen \? "zoom-out" : "zoom-in"/,
  "Public Shop diary cards must keep stable opened/closed geometry instead of resizing from loose content."
);

assertContains(
  /className="public-shop-section public-shop-spotlight"[\s\S]*?border: "1px solid rgba\(255,255,255,0\.92\)"[\s\S]*?linear-gradient\(135deg, #FFFFFF 0%, #F7FBFF 56%, #EEF6FF 100%\)/,
  "Public Shop Spotlight must keep polished white brand framing instead of cream/brown framing."
);

assertContains(
  /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?border: "1px solid rgba\(255,255,255,0\.92\)"[\s\S]*?linear-gradient\(135deg, #FFFFFF 0%, #F7FBFF 56%, #EEF6FF 100%\)[\s\S]*?Shop Diaries/,
  "Public Shop Diaries section must keep polished white brand framing."
);

assertContains(
  /className="shop-diary-card"[\s\S]*?border: "1px solid rgba\(255,255,255,0\.92\)"[\s\S]*?0 0 0 4px rgba\(255,255,255,0\.42\)/,
  "Public Shop diary cards must keep white product-frame borders instead of heavy dark outlines."
);

const rawActionPattern =
  /<(button|a|summary)\b|role="button"|data-gmfn-action-root|data-cta-id/g;
while ((match = rawActionPattern.exec(shopGallerySource))) {
  findings.push({
    file: shopGalleryFile,
    line: lineAt(shopGallerySource, match.index),
    message:
      "Public Shop page must not bypass shared stable primitives with raw action roots.",
    text: shopGallerySource
      .slice(match.index, match.index + 160)
      .replace(/\s+/g, " "),
  });
}

if (findings.length > 0) {
  console.error("Public Shop button inventory audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  `Public Shop button inventory audit passed: ${sourceCounts.total} page stable action templates ` +
    `(${sourceCounts.PrimaryButton} PrimaryButton, ${sourceCounts.SecondaryButton} SecondaryButton, ` +
    `${sourceCounts.StableCtaLink} StableCtaLink), ${nativeFields.length} native fields, ` +
    `${expectedSignedInShortcutCount} signed-in shortcut route links, ` +
    `${expectedInstallPromptActions} install prompt action, ` +
    `${expectedMediaFrameInvocations} media-frame invocation families, ` +
    `${expectedSharedMediaAudioActionTemplates} shared audio action template, ` +
    `${expectedWholeRouteActionFamilies} whole-route action template families total.`
);
