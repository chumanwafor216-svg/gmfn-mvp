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
  PrimaryButton: 9,
  SecondaryButton: 14,
  StableCtaLink: 5,
  total: 28,
};
const expectedNativeFieldCount = 0;
const expectedSignedInShortcutCount = 7;
const expectedInstallPromptActions = 1;
const expectedMediaFrameInvocations = 2;
const expectedSharedMediaAudioActionTemplates = 1;
const expectedSocialTagActionTemplates = 2;
const expectedWholeRouteActionFamilies =
  expectedPageSourceActions.total +
  expectedSignedInShortcutCount +
  expectedInstallPromptActions +
  expectedSharedMediaAudioActionTemplates +
  expectedSocialTagActionTemplates;

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

function assertNotContains(pattern, message) {
  const match = shopGallerySource.match(pattern);
  if (!match) return;
  findings.push({
    file: shopGalleryFile,
    line: lineAt(shopGallerySource, match.index || 0),
    message,
    text: match[0].replace(/\s+/g, " ").slice(0, 260),
  });
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
  "shop-gallery.return-marketplace",
  "shop-gallery.public-shop.sign-in-follow",
  "shop-gallery.public-shop.following",
  "shop-gallery.public-shop.unfollow",
  "shop-gallery.public-shop.follow",
  "shop-gallery.share-shop",
  "shop-gallery.verify-shop.toggle",
  "shop-gallery.owner-contact.choose",
  "shop-gallery.verify-shop.close",
  "shop-gallery.verify-shop.request-trustslip",
  "shop-gallery.verify-shop.toggle-scan",
  "shop-gallery.verify-shop.open-community-record",
  "shop-gallery.owner-contact.whatsapp-chat",
  "shop-gallery.owner-contact.phone-call",
  "shop-gallery.spotlight.whatsapp-chat",
  "shop-gallery.spotlight.phone-call",
  "shop-gallery.spotlight.contact.choose",
  "shop-gallery.spotlight.view-details",
  "shop-gallery.ask-vault-access",
  "shop-gallery.copy-vault-request-link",
  "shop-gallery.reconnect-owner-shop",
  "shop-gallery.sign-in-reconnect-shop",
  "shop-gallery.open-marketplace-refresh",
  "shop-gallery.empty-ask-vault-access",
  "shop-gallery.empty-copy-shop-link",
  "shop-gallery.product.${productOpenId}.toggle",
  "shop-gallery.product.${productOpenId}.owner-share",
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
    message: `Public Shop owner shortcut inventory changed from ${expectedSignedInShortcutCount} to ${memberSurfaceLinkCount}. Re-audit the owner shortcut strip before accepting this baseline.`,
    text: memberSurfaceLinksBlock.replace(/\s+/g, " ").slice(0, 260),
  });
}

assertContains(
  /const memberSurfaceLinks = useMemo\([\s\S]*?label: "Dashboard"[\s\S]*?debugId: "shop-gallery\.member-nav\.dashboard"[\s\S]*?label: "Community Home"[\s\S]*?debugId: "shop-gallery\.member-nav\.community"[\s\S]*?label: "Marketplace"[\s\S]*?debugId: "shop-gallery\.member-nav\.marketplace"[\s\S]*?label: "Public Shop"[\s\S]*?debugId: "shop-gallery\.member-nav\.public-shop"[\s\S]*?label: "Finance"[\s\S]*?debugId: "shop-gallery\.member-nav\.finance"[\s\S]*?label: "Loans"[\s\S]*?debugId: "shop-gallery\.member-nav\.loans"[\s\S]*?label: "Trust"[\s\S]*?debugId: "shop-gallery\.member-nav\.trust"/,
  "Public Shop owner shortcut strip must keep Dashboard, Community Home, Marketplace, Public Shop, Finance, Loans, and Trust in the audited order."
);

assertContains(
  /<OwnerOnlySurfaceNav[\s\S]*?label="Your shop shortcuts"[\s\S]*?ariaLabel="Your Public Shop shortcuts"[\s\S]*?links=\{memberSurfaceLinks\}[\s\S]*?requireOwnerMatch=\{true\}/,
  "Public Shop owner shortcut strip must use owner-facing language and stay hidden from ordinary visitors and non-owner signed-in members through OwnerOnlySurfaceNav."
);

assertContains(
  /Public shop page\. Check seller evidence before trade\./,
  "Public Shop brand bar must keep the public-page guidance short and user-facing."
);

assertContains(
  /Public listing\. Verify current evidence before goods, credit, or money move\./,
  "Public Shop signboard must keep the trade warning concise and user-facing."
);

assertContains(
  /function ReferenceShopSignboardVisual[\s\S]*?width: compact \? 92 : 204[\s\S]*?height: compact \? 92 : 194[\s\S]*?borderRadius: compact \? 24 : 32/,
  "Public Shop compact signboard illustration must stay large enough to avoid dead space inside the hero tile."
);

assertContains(
  /gridTemplateColumns: isCompact \? "96px minmax\(0, 1fr\)" : "220px minmax\(0, 1fr\)"[\s\S]*?data-public-shop-signboard-icon="true"[\s\S]*?width: isCompact \? 92 : 206[\s\S]*?height: isCompact \? 92 : 206[\s\S]*?borderRadius: isCompact \? 24 : "50%"[\s\S]*?gridRow: isCompact \? "1 \/ span 3" : undefined[\s\S]*?overflow: "hidden"/,
  "Public Shop signboard mobile icon must reserve its own rail and stay clipped inside its tile."
);

assertContains(
  /data-public-shop-signboard-content="true"[\s\S]*?display: isCompact \? "contents" : "grid"[\s\S]*?gridColumn: isCompact \? "1 \/ -1" : undefined/,
  "Public Shop compact signboard facts must break out to a full-width row instead of staying cramped beside the hero icon."
);

assertContains(
  /shopFollowState\.isOwner[\s\S]*?display: isCompact \? "none" : "grid"[\s\S]*?debugId="shop-gallery\.public-shop\.sign-in-follow"/,
  "Public Shop compact signboard must not place the follow button between identity and facts on phones."
);

assertContains(
  /display: isCompact \? "none" : "block"[\s\S]*?Follow to keep this shop in your GSN updates/,
  "Public Shop compact signboard must hide repeated follow-helper copy on phones."
);

assertNotContains(
  /Open this public shop, then check the seller and current evidence before you act\./,
  "Public Shop must not restore the repeated long public-shop warning."
);

assertContains(
  /const marketplaceMemberShopsPath = routeWithCommunity\([\s\S]*?`\$\{APP_ROUTES\.MARKETPLACE\}#marketplace-members-shops`[\s\S]*?ownerSurfaceCommunityId[\s\S]*?<StableCtaLink[\s\S]*?to=\{marketplaceMemberShopsPath\}[\s\S]*?stableHeight=\{isCompact \? 44 : 50\}[\s\S]*?debugId="shop-gallery\.return-marketplace"[\s\S]*?Back to Marketplace/,
  "Public Shop visitors must have a fixed-height Back to Marketplace action that returns to the member shops section without exposing owner shortcuts."
);

assertFileContains(
  ownerSurfaceNavFile,
  ownerSurfaceNavSource,
  /links\.map\(\(link\) => \([\s\S]*?<StableCtaLink[\s\S]*?stableHeight=\{compact \? 38 : 52\}[\s\S]*?debugId=\{link\.debugId\}/,
  "OwnerOnlySurfaceNav links must keep fixed-height stable route buttons."
);

assertContains(
  /<GsnInstallPrompt[\s\S]*?tone="light"[\s\S]*?compact=\{isCompact\}[\s\S]*?surface="public-shop"/,
  "Public Shop must keep the phone-screen install prompt for WhatsApp/shared-link visitors."
);

assertFileContains(
  installPromptFile,
  installPromptSource,
  /<PrimaryButton[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId=\{`gsn-install\.\$\{surface\}\.setup`\}/,
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
  /<SpotlightMediaFrame[\s\S]*?audioUnlockLabel="Sound on"[\s\S]*?audioUnlockOffLabel="Muted"[\s\S]*?audioUnlockErrorLabel="Play"[\s\S]*?audioUnlockStyle=\{\{[\s\S]*?minWidth: isCompact \? 34 : 38[\s\S]*?width: isCompact \? 34 : 38[\s\S]*?minHeight: isCompact \? 34 : 38/,
  "Public Shop mini Spotlight media audio control must stay icon-only and fixed-size."
);

assertContains(
  /visibleProducts\.map\(\(product, index\) => \{[\s\S]*?<SpotlightMediaFrame[\s\S]*?showVideoControls=\{isProductOpen\}[\s\S]*?showAudioUnlock=\{hasVideoStory\}[\s\S]*?audioUnlockLabel="Sound on"[\s\S]*?audioUnlockOffLabel="Muted"[\s\S]*?audioUnlockErrorLabel="Play"[\s\S]*?minWidth: diaryMediaControlHeight[\s\S]*?width: diaryMediaControlHeight[\s\S]*?minHeight: diaryMediaControlHeight/,
  "Public Shop diary media audio controls must stay icon-only, fixed-size, and tied to each product card."
);

assertFileContains(
  mediaFrameFile,
  mediaFrameSource,
  /<SecondaryButton[\s\S]*?data-media-control="true"[\s\S]*?stableHeight=\{52\}[\s\S]*?debugId="spotlight-media-frame\.toggle-audio"[\s\S]*?title=\{audioUnlocked \? "Turn video sound off" : "Turn video sound on"\}/,
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
  /gridTemplateColumns: isCompact[\s\S]*?"repeat\(3, minmax\(0, 1fr\)\)"[\s\S]*?debugId="shop-gallery\.share-shop"[\s\S]*?stableHeight=\{isCompact \? 46 : 54\}[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle"[\s\S]*?stableHeight=\{isCompact \? 46 : 54\}[\s\S]*?debugId="shop-gallery\.owner-contact\.choose"/,
  "Public Shop signboard Share, Verify, and WhatsApp controls must keep fixed phone geometry."
);

assertContains(
  /id="public-shop-owner-contact-panel"[\s\S]*?padding: isCompact \? "8px" : "12px"[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"minmax\(0, 0\.78fr\) minmax\(0, 1\.22fr\)"[\s\S]*?Contact owner[\s\S]*?WhatsApp[\s\S]*?Choose chat or call\.[\s\S]*?stableHeight=\{isCompact \? 40 : 48\}[\s\S]*?debugId="shop-gallery\.owner-contact\.whatsapp-chat"[\s\S]*?<span>Chat<\/span>[\s\S]*?stableHeight=\{isCompact \? 40 : 48\}[\s\S]*?debugId="shop-gallery\.owner-contact\.phone-call"[\s\S]*?<span>Call<\/span>/,
  "Public Shop owner contact panel must stay a compact chooser opened from the single WhatsApp surface button."
);

assertNotContains(
  /<span>WhatsApp chat<\/span>|<span>Call phone<\/span>|Pick chat or a direct call\./,
  "Public Shop must not expose the old busy contact-panel labels; the main surface stays one WhatsApp button and the opened chooser stays Chat/Call."
);

assertContains(
  /className="public-shop-section public-shop-spotlight"[\s\S]*?debugId="shop-gallery\.spotlight\.whatsapp-chat"[\s\S]*?<span>Chat<\/span>[\s\S]*?debugId="shop-gallery\.spotlight\.phone-call"[\s\S]*?<span>Call<\/span>[\s\S]*?debugId="shop-gallery\.spotlight\.contact\.choose"[\s\S]*?WhatsApp/,
  "Public Shop Spotlight must use one WhatsApp contact handle that opens Chat/Call for the active Spotlight owner."
);

assertContains(
  /className="public-shop-section public-shop-spotlight"[\s\S]*?miniSpotlightView\.priceLabel[\s\S]*?miniSpotlightView\.availabilityLabel[\s\S]*?debugId="shop-gallery\.spotlight\.view-details"[\s\S]*?>\s*View details\s*<\/StableCtaLink>/,
  "Public Shop Spotlight must show product price/availability facts and expose a full View Details path for the active Spotlight item."
);

assertNotContains(
  /shop-gallery\.open-spotlight-preview|debugId="shop-gallery\.spotlight\.whatsapp"|isCompact \? "Open" : "Explore"/,
  "Public Shop Spotlight must not show the old Open/Explore redirect action; Spotlight visitors should contact the active media owner instead."
);

assertContains(
  /debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.toggle`\}[\s\S]*?width: diaryActionWidth[\s\S]*?maxWidth: diaryActionWidth[\s\S]*?showBlockPlacementAction \? \([\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.owner-share`\}[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.paid-placement`\}[\s\S]*?display: isProductOpen \? "inline-flex" : "none"[\s\S]*?debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.contact`\}[\s\S]*?display: isProductOpen \? "inline-flex" : "none"/,
  "Public Shop product action dock must keep one always-available open/close control, hide block social sharing from visitors, and reveal owner Share, Paid Repost, and Contact only inside the opened diary card."
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
  /className="public-shop-section public-shop-spotlight"[\s\S]*?height: isCompact \? "auto" : undefined[\s\S]*?minHeight: isCompact \? 360 : undefined[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"1fr"[\s\S]*?gridRow: isCompact \? "2" : "1"[\s\S]*?miniSpotlightView\.categoryLabel[\s\S]*?WebkitLineClamp: isCompact \? 3 : 3[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)"[\s\S]*?stableHeight=\{isCompact \? 44 : 52\}[\s\S]*?View details[\s\S]*?gridRow: "1"/,
  "Public Shop Spotlight phone layout must reserve visible room for product title, description, category, owner/community, price/availability, contact, and View details instead of compressing everything into a tiny side rail."
);

assertContains(
  /className="public-shop-section public-shop-spotlight"[\s\S]*?isCompact[\s\S]*?"linear-gradient\(135deg, #061827 0%, #082A4C 100%\)"[\s\S]*?gridTemplateColumns: isCompact[\s\S]*?"1fr"/,
  "Public Shop Spotlight compact card must keep a stacked product-information layout on phone."
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
    `${expectedSocialTagActionTemplates} social tag action template, ` +
    `${expectedWholeRouteActionFamilies} whole-route action template families total.`
);
